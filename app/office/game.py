"""Agent Office game layer: scene events, bosses, XP, achievements, employee of the week and daily quests.

Everything is recomputed from the Claude Code transcripts (read-only), the security audit journal and MMX,
so there is no score to store and nothing to reset. Transcripts are parsed incrementally (byte offset per file).
"""

from __future__ import annotations

import json
import math
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable

from .config import TO_VERIFY_RE
from .pricing import usd

TEST_CMD = re.compile(r"pytest|vitest|jest\b|playwright test|npm (run )?test|make (unit-)?tests?\b|go test|cargo test")
PASSED = re.compile(r"(\d+) passed")
FAILED = re.compile(r"(\d+) failed")
FAILED_LINE = re.compile(r"^FAILED ", re.M)
GIT = r"\bgit\b(?:\s+-[cC]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+"  # git, then global options (-c k=v, -C dir, --no-pager…)
PUSH = re.compile(GIT + r"push\b")
MR = re.compile(r"mr-create|glab mr create")
COMMIT = re.compile(GIT + r"commit\b")
TO_VERIFY = TO_VERIFY_RE
EVENTS_KEPT = 12
MR_URL = re.compile(r"https?://[^\s\"')]+/-/merge_requests/\d+")
ASK = re.compile(r"agent-office/ask\.py")
EDIT_TOOLS = ("Edit", "Write", "NotebookEdit", "MultiEdit")

# XP: outcomes, never raw activity (tokens, tool count), so a looping agent does not score
XP_DONE, XP_CLEAN, XP_SPEED, XP_TESTS, XP_TESTS_CAP = 100, 50, 30, 20, 5
XP_PUSH, XP_MR, XP_VERIFY, XP_BOSS = 30, 50, 40, 60
XP_FINDING = {"critical": 40, "high": 40, "medium": 15}


def level_of(xp: int) -> dict[str, int]:
    """Level L starts at 50·(L-1)² XP."""
    lvl = int(math.sqrt(max(0, xp) / 50)) + 1
    return {"xp": xp, "level": lvl, "from": 50 * (lvl - 1) ** 2, "to": 50 * lvl ** 2}


def epoch(ts: Any) -> float | None:
    """ISO timestamp → epoch seconds."""
    if not ts:
        return None
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def flat(content: Any) -> str:
    """Flatten a tool_result content to text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text")
    return ""


class Run:
    """Incrementally parsed subagent transcript: counters and game events."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.reset()

    def reset(self) -> None:
        self.offset = 0
        self.first: float | None = None
        self.last: float | None = None
        self.errors = self.tools = 0
        self.events: list[dict[str, Any]] = []
        self.ev_count = 0
        self.pending: dict[str, tuple[str, float | None]] = {}
        self.fail_now = self.fail_peak = 0
        # cost: one entry per API response (a response spans several records sharing message.id)
        self.seen: set[str] = set()
        self.cost = 0.0
        self.cost_days: dict[str, float] = {}
        self.usage_hours: dict[int, int] = {}  # hour (epoch // 3600) -> tokens processed (input + cache writes + output)
        self.files: dict[str, None] = {}  # edited files, in order
        self.commands: list[tuple[str, float | None]] = []  # last shell commands, for the search
        self.mr_url: str | None = None   # MR opened by this run
        self.mr_seen: str | None = None  # last MR read (reviewers)
        self.tests: dict[str, Any] | None = None
        # progress = a code edit or a test run; a long stretch of tools without one smells like a loop
        self.progress_t: float | None = None
        self.since_progress = 0

    def update(self) -> None:
        size = self.path.stat().st_size
        if size < self.offset:
            self.reset()
        if size == self.offset:
            return
        with self.path.open("rb") as fh:
            fh.seek(self.offset)
            raw = fh.read()
        cut = raw.rfind(b"\n") + 1
        self.offset += cut
        for line in raw[:cut].split(b"\n"):
            try:
                rec = json.loads(line) if line.strip() else None
            except ValueError:
                continue
            if isinstance(rec, dict):
                self.feed(rec)

    def emit(self, kind: str, t: float | None, n: int = 0) -> None:
        self.ev_count += 1
        self.events.append({"i": self.ev_count, "kind": kind, "t": t, "n": n})

    def feed(self, rec: dict[str, Any]) -> None:
        t = epoch(rec.get("timestamp"))
        if t:
            self.first = self.first or t
            self.last = t
        msg = rec.get("message") or {}
        if rec.get("type") == "assistant" and msg.get("usage") and (not msg.get("id") or msg["id"] not in self.seen):
            self.seen.add(msg.get("id", ""))
            if msg.get("model", "").startswith("claude"):
                cost = usd(msg["model"], msg["usage"])
                self.cost += cost
                day = datetime.fromtimestamp(t).strftime("%Y-%m-%d") if t else "?"
                self.cost_days[day] = self.cost_days.get(day, 0.0) + cost
                u = msg["usage"]
                n = sum((u.get(k, 0) or 0) for k in ("input_tokens", "cache_creation_input_tokens", "output_tokens"))
                if t:
                    self.usage_hours[int(t // 3600)] = self.usage_hours.get(int(t // 3600), 0) + n
        content = msg.get("content")
        if not isinstance(content, list):
            return
        for c in content:
            if not isinstance(c, dict):
                continue
            if rec.get("type") == "assistant" and c.get("type") == "tool_use":
                self.tools += 1
                self.since_progress += 1
                inp = c.get("input") or {}
                if c.get("name") in EDIT_TOOLS and inp.get("file_path"):
                    self.files[str(inp["file_path"])] = None
                    self.progress_t, self.since_progress = t, 0
                if c.get("name") == "Bash":
                    cmd = str(inp.get("command", ""))
                    self.pending[c.get("id", "")] = (cmd, t)
                    self.commands = [*self.commands[-149:], (cmd[:200], t)]
                    if TEST_CMD.search(cmd):
                        self.progress_t, self.since_progress = t, 0
                    if ASK.search(cmd):
                        self.emit("ask", t)
            elif rec.get("type") == "user" and c.get("type") == "tool_result":
                err = bool(c.get("is_error"))
                self.errors += err
                call = self.pending.pop(c.get("tool_use_id", ""), None)
                if call:
                    self.classify(call[0], flat(c.get("content")), err, t)

    def classify(self, cmd: str, out: str, err: bool, t: float | None) -> None:
        urls = MR_URL.findall(out)
        if urls:
            self.mr_seen = urls[-1]
        if TEST_CMD.search(cmd):
            passed = PASSED.findall(out)
            failed = FAILED.findall(out)
            n_fail = int(failed[-1]) if failed else len(FAILED_LINE.findall(out)) or (1 if err else 0)
            if n_fail:
                self.tests = {"ok": False, "n": n_fail, "t": t}
                self.fail_now = n_fail
                self.fail_peak = max(self.fail_peak, n_fail)
                self.emit("tests_fail", t, n_fail)
            elif passed or not err:
                self.tests = {"ok": True, "n": int(passed[-1]) if passed else 0, "t": t}
                self.emit("tests_pass", t, int(passed[-1]) if passed else 0)
                if self.fail_peak:
                    self.emit("boss_defeated", t, self.fail_peak)
                self.fail_now = self.fail_peak = 0
            return
        if err:
            return
        if MR.search(cmd):
            self.mr_url = urls[-1] if urls else self.mr_url
            self.emit("mr", t)
        elif PUSH.search(cmd):
            self.emit("push", t)
        elif COMMIT.search(cmd):
            self.emit("commit", t)
        if TO_VERIFY.search(cmd):
            self.emit("to_verify", t)

    # ----- views -----
    def all_events(self) -> list[dict[str, Any]]:
        return self.events

    def scene(self) -> dict[str, Any]:
        """What the office needs for one agent: its latest events and its boss."""
        boss = {"hp": self.fail_now, "max": self.fail_peak} if self.fail_now else None
        files = list(self.files)
        return {"evCount": self.ev_count, "events": self.events[-EVENTS_KEPT:], "boss": boss,
                "cost": round(self.cost, 4), "files": files[-12:], "fileCount": len(files), "mr": self.mr_url,
                "mrSeen": self.mr_seen, "tests": self.tests, "first": self.first, "last": self.last,
                "progressT": self.progress_t, "sinceProgress": self.since_progress,
                "timeline": [e for e in self.events if e["kind"] in ("tests_fail", "tests_pass", "mr", "push", "ask", "to_verify")][-40:]}


ACHIEVEMENTS = [
    # id, name, description, metric, target
    ("first_done", "Premier livrable", "Un agent livre son premier run.", "done", 1),
    ("clean", "Sans faute", "Un run livré sans aucune erreur d'outil (10 outils mini).", "clean", 1),
    ("speedrun", "Speedrun", "Un run livré en moins de 5 min (5 outils mini).", "speed", 1),
    ("shipped", "Expédié", "Première merge request ouverte par un agent.", "mr", 1),
    ("green", "Tout vert", "10 passages de tests au vert.", "tests_pass", 10),
    ("phoenix", "Phénix", "Des tests rouges repassés au vert dans le même run (boss vaincu).", "boss_defeated", 1),
    ("hunter", "Chasseur", "Une faille haute ou critique trouvée par un audit.", "finding", 1),
    ("elephant", "Mémoire d'éléphant", "10 fiches dans MMX.", "mmx", 10),
    ("spring", "Ménage de printemps", "5 tickets passés en To Verify.", "to_verify", 5),
    ("marathon", "Marathon", "Un run livré après plus d'une heure de travail.", "marathon", 1),
    ("team", "Équipe complète", "5 spécialités différentes dans une même session.", "team", 1),
    ("centurion", "Centurion", "100 runs d'agents.", "runs", 100),
]


class Game:
    """Aggregates every subagent run (excluded projects skipped) into the game state."""

    def __init__(self, projects: Path, excluded: tuple[str, ...], status: Callable[[Path], dict[str, Any]],
                 audit_log: Path, mmx: Callable[[], dict[str, Any]]) -> None:
        self.projects, self.excluded, self.status_fn = projects, excluded, status
        self.audit_log, self.mmx = audit_log, mmx
        self.runs: dict[Path, Run] = {}
        self.status_cache: dict[Path, tuple[float, dict[str, Any]]] = {}
        self.cache: tuple[float, dict[str, Any]] | None = None

    def run(self, path: Path) -> Run:
        r = self.runs.get(path)
        if r is None:
            r = self.runs[path] = Run(path)
        r.update()
        return r

    def agent(self, path: Path) -> dict[str, Any]:
        return self.run(path).scene()

    def status(self, path: Path) -> dict[str, Any]:
        mtime = path.stat().st_mtime
        hit = self.status_cache.get(path)
        if hit and hit[0] == mtime and time.time() - mtime > 900:  # settled runs only; live ones can still change status
            return hit[1]
        info = self.status_fn(path)
        self.status_cache[path] = (mtime, info)
        return info

    def findings(self, detail: bool = False) -> list[dict[str, Any]]:
        try:
            log = json.loads(self.audit_log.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return []
        modes = {a.get("id"): a.get("mode") for a in log.get("audits", []) if isinstance(a, dict)}
        out = []
        for f in log.get("findings", []):
            if isinstance(f, dict) and f.get("severity") in XP_FINDING:
                kind = "audit-security-code" if modes.get(f.get("audit")) == "repo" else "security-auditor"
                item = {"type": kind, "severity": f["severity"], "t": epoch(f.get("date"))}
                if detail:
                    item.update(id=str(f.get("id", "")), repo=f.get("repo"), file=f.get("file"), vulnerability=f.get("vulnerability"))
                out.append(item)
        return out

    def totals(self) -> tuple[dict[str, float], dict[int, int]]:
        """Over the last 8 days, main sessions and subagents: estimated $ per day (API-equivalent) and tokens per hour."""
        days: dict[str, float] = {}
        hours: dict[int, int] = {}
        now = time.time()
        for project in self.projects.iterdir() if self.projects.exists() else []:
            if not project.is_dir() or any(x in project.name for x in self.excluded):
                continue
            for path in [*project.glob("*.jsonl"), *project.glob("*/subagents/agent-*.jsonl")]:
                if now - path.stat().st_mtime > 8 * 86_400:
                    continue
                r = self.run(path)
                for day, cost in r.cost_days.items():
                    days[day] = days.get(day, 0.0) + cost
                for hour, n in r.usage_hours.items():
                    hours[hour] = hours.get(hour, 0) + n
        return days, hours

    def state(self) -> dict[str, Any]:
        if self.cache and time.time() - self.cache[0] < 5:
            return self.cache[1]
        now = time.time()
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
        xp: dict[str, int] = {}
        week: dict[str, int] = {}
        hits: dict[str, list[float]] = {k: [] for k in ("done", "clean", "speed", "mr", "tests_pass", "boss_defeated",
                                                         "to_verify", "marathon", "runs", "finding", "team")}
        teams: dict[str, set[str]] = {}
        quests = {"done": 0, "mr": 0, "pass": 0, "fail": 0, "verify": 0}
        durations: dict[str, list[float]] = {}
        mr_week: list[float] = []
        for project in self.projects.iterdir() if self.projects.exists() else []:
            if not project.is_dir() or any(x in project.name for x in self.excluded):
                continue
            for path in project.glob("*/subagents/agent-*.jsonl"):
                r, info = self.run(path), self.status(path)
                kind, done = info["type"], info["status"] == "done"
                end = r.last or path.stat().st_mtime
                secs = (r.last - r.first) if r.first and r.last else 0
                gained = 0
                hits["runs"].append(r.first or end)
                team = teams.setdefault(path.parent.parent.name, set())
                team.add(kind)
                if len(team) == 5:
                    hits["team"].append(end)
                if done:
                    if secs > 30 and now - end < 30 * 86_400:
                        durations.setdefault(kind, []).append(secs)
                    gained += XP_DONE
                    hits["done"].append(end)
                    quests["done"] += end >= today
                    if r.errors == 0 and r.tools >= 10:
                        gained += XP_CLEAN
                        hits["clean"].append(end)
                    if secs < 300 and r.tools >= 5:
                        gained += XP_SPEED
                        hits["speed"].append(end)
                    if secs > 3600:
                        hits["marathon"].append(end)
                n_pass = 0
                for ev in r.all_events():
                    t = ev["t"] or end
                    k = ev["kind"]
                    if k == "tests_pass":
                        n_pass += 1
                        gained += XP_TESTS if n_pass <= XP_TESTS_CAP else 0
                        quests["pass"] += t >= today
                    elif k == "tests_fail":
                        quests["fail"] += t >= today
                    elif k == "push":
                        gained += XP_PUSH
                    elif k == "mr":
                        gained += XP_MR
                        if now - t < 7 * 86_400:
                            mr_week.append(t)
                        quests["mr"] += t >= today
                    elif k == "to_verify":
                        gained += XP_VERIFY
                        quests["verify"] += t >= today
                    elif k == "boss_defeated":
                        gained += XP_BOSS
                    if k in hits:
                        hits[k].append(t)
                xp[kind] = xp.get(kind, 0) + gained
                if now - end < 7 * 86_400:
                    week[kind] = week.get(kind, 0) + gained
        for f in self.findings():
            gained = XP_FINDING[f["severity"]]
            xp[f["type"]] = xp.get(f["type"], 0) + gained
            if f["t"] and now - f["t"] < 7 * 86_400:
                week[f["type"]] = week.get(f["type"], 0) + gained
            if f["severity"] in ("critical", "high"):
                hits["finding"].append(f["t"] or now)
        mmx = self.mmx()
        mmx_count = sum(len(m["entries"]) for m in mmx.get("modules", []))
        achievements = []
        for aid, name, desc, metric, target in ACHIEVEMENTS:
            if metric == "mmx":
                n, at = mmx_count, None
            else:
                times = sorted(hits[metric])
                n, at = len(times), times[target - 1] if len(times) >= target else None
            achievements.append({"id": aid, "name": name, "desc": desc, "n": min(n, target), "target": target,
                                 "unlocked": n >= target, "at": at})
        best = max(week.items(), key=lambda kv: kv[1], default=None)
        days, hours = self.totals()
        h_now = int(now // 3600)
        window = lambda end, n: sum(hours.get(h, 0) for h in range(end - n + 1, end + 1))  # noqa: E731
        week_keys = {datetime.fromtimestamp(now - i * 86_400).strftime("%Y-%m-%d") for i in range(7)}
        state = {
            "xp": {k: level_of(v) for k, v in xp.items()},
            "achievements": achievements,
            "cost": {"today": round(days.get(datetime.fromtimestamp(now).strftime("%Y-%m-%d"), 0.0), 2),
                     "week": round(sum(v for k, v in days.items() if k in week_keys), 2)},
            "usage": {"h5": window(h_now, 5), "h5Prev": window(h_now - 24, 5), "d7": window(h_now, 7 * 24),
                      "hourly": [hours.get(h, 0) for h in range(h_now - 23, h_now + 1)]},
            "today": {"pass": quests["pass"], "fail": quests["fail"]},
            "durations": {k: sorted(v)[len(v) // 2] for k, v in durations.items() if len(v) >= 3},  # median of the delivered runs, 30 days
            "week": {"mr": len(mr_week), "lastMr": max(mr_week, default=None)},
            "alerts": [f for f in self.findings(detail=True) if f["severity"] in ("critical", "high") and f["t"] and now - f["t"] < 3 * 86_400],
            "employee": {"type": best[0], "xp": best[1]} if best and best[1] > 0 else None,
            "quests": [
                {"id": "deliver", "label": "Livrer 3 runs", "n": min(quests["done"], 3), "target": 3},
                {"id": "mr", "label": "Ouvrir une MR", "n": min(quests["mr"], 1), "target": 1},
                {"id": "green", "label": "Journée sans test rouge", "n": int(quests["pass"] > 0 and not quests["fail"]), "target": 1,
                 "failed": quests["fail"] > 0},
                {"id": "verify", "label": "2 tickets en To Verify", "n": min(quests["verify"], 2), "target": 2},
                {"id": "mmx", "label": "Inbox MMX vide", "n": int(not mmx.get("pending")), "target": 1},
            ],
        }
        self.cache = (time.time(), state)
        return state
