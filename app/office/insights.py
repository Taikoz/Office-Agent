"""ChiefOS → 💡 Idées: what the transcripts of the last DAYS say about the way we work (read-only, local).

- recurring tasks: the same chain of 3 to 5 steps (shell commands reduced to their shape, skills, agents, MCP tools) in
  MIN_SESSIONS sessions or more, on MIN_DAYS days or more, mostly done by hand (outside a named agent or skill) → an
  agent / skill / hook to write; when an existing one seems to cover it, "you have X but did it by hand";
- recurring requests: first prompts of the main sessions that look alike, on several days, with no skill or agent used;
- recurring errors: the same tool and the same error (paths, numbers, quoted text taken out), and the command that
  usually fixed it;
- corrections: the user's "non", "pas ça", "annule"… right after the agent acted.

Nothing is ever created: a proposal opens as a draft in Blueprints. Everything is computed here; Claude Haiku
(quips.ask, off by default, at most AI_DAILY calls a day) only writes the name, the reason and the steps of the
proposals from a short digest (counts and a few examples, never a transcript), cached per proposal.
State: STATE_DIR/insights.json (dismissed, AI texts), STATE_DIR/insights-cache.json (one summary per transcript).
"""

from __future__ import annotations

import json
import re
import shlex
import threading
import time
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any

from . import config, quips
from .claudefiles import list_files
from .history import project_name
from .transcripts import decode, text_of

DAYS = 14
MIN_SESSIONS, MIN_DAYS = 3, 3          # a task: in 3 sessions or more, on 3 days or more
ERR_MIN, ERR_SESSIONS = 3, 2           # an error: 3 times or more, in 2 sessions or more
FIX_MIN = 3                            # corrections from the user over DAYS
COVERED = 0.6                          # share of occurrences inside a named agent / skill: its own routine, not a proposal
TTL = 600                              # seconds before the transcripts are read again
DISMISS_DAYS = 30
AI_DAILY = 3
GENERIC = {"", "general-purpose", "Explore", "Plan", "claude", "agent", "fork", "statusline-setup", "claude-code-guide"}
NOISE = {"cd", "ls", "cat", "head", "tail", "grep", "rg", "find", "sed", "awk", "wc", "echo", "printf", "pwd", "true", "sleep",
         "export", "set", "sort", "uniq", "cut", "tr", "xargs", "jq", "test", "[", "[[", "which", "file", "stat", "date", "diff",
         "less", "nl", "tee", "mkdir", "touch", "realpath", "dirname", "basename", "env", "source", ".", "for", "do", "done",
         "if", "then", "fi", "while", "else", "read", "git status", "git log", "git diff", "git show", "git branch", "git rev-parse"}
RUNNERS = {"python", "python3", "node", "bash", "sh", "zsh", "uv", "npx", "poetry", "pipenv", "bun", "deno", "timeout", "sudo", "time", "nice"}
QUIET_TOOLS = {"Read", "Grep", "Glob", "Edit", "Write", "MultiEdit", "NotebookEdit", "TodoWrite", "TaskCreate", "TaskUpdate", "TaskList",
               "TaskGet", "ToolSearch", "ExitPlanMode", "EnterPlanMode", "SubagentHandback"}
CORRECTION_RE = re.compile(
    r"^(non\b|nan\b|no\b|nope\b|pas (ça|ca|comme ça|comme ca)|stop\b|arr[eê]te|annule|ne (fais|touche|modifie|change|supprime) pas|"
    r"c'est (faux|pas (ça|ca|bon))|tu as oublié|t'as oublié|oublie pas|faux\b|wrong\b|don'?t\b|that'?s not|undo\b|revert\b|"
    r"pourquoi (tu|as-tu)|je t'ai dit|j'ai dit|encore\b)", re.I)
IGNORED_ERRORS = ("user doesn't want", "user rejected", "interrupted", "user denied", "was rejected", "has not been read yet",
                  "file has been modified since", "string to replace not found", "found multiple matches")
ERR_LINE_RE = re.compile(r"error|failed|failure|not found|denied|no such|exception|traceback|fatal|cannot|can't|invalid|refused|"
                         r"timed? ?out|forbidden|unauthori[sz]ed|missing|unknown|erreur|échec|introuvable", re.I)
STOP = set("""avec dans pour plus sans sous vers chez cette ces les des une est sont fait faire peux peut veux mettre
mets tout tous toutes ceux celle celui comme quoi quand alors aussi encore merci bien très tres juste moi nous vous elle elles
ils leur leurs mon mes ton tes son ses notre votre qui que quel quelle quels quelles faut fais voir regarde stp please the and
with from that this what have just make sure then also into your about there their them they http https www com fichier
fichiers code projet repo depuis après avant ici avoir être sera était""".split())
IS_ERROR, TOOL_USE_ID, USER = re.compile(rb'"is_error":\s*true'), re.compile(rb'"tool_use_id":\s*"([^"]+)"'), re.compile(rb'"type":\s*"user"')
WORD_RE = re.compile(r"[a-zà-ÿ][a-zà-ÿ0-9_-]{3,}")

_lock = threading.Lock()
_result: dict[str, Any] | None = None
_summs: list[dict[str, Any]] = []
_at = 0.0
_ai_running = False


def _state_path() -> Path:
    return config.STATE_DIR / "insights.json"  # read at call time (the tests move STATE_DIR)


def _cache_path() -> Path:
    return config.STATE_DIR / "insights-cache.json"


def _load(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _save(path: Path, data: dict[str, Any]) -> None:
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def state() -> dict[str, Any]:
    s = _load(_state_path())
    today = date.today().isoformat()
    ai_day = s.get("aiDay") if s.get("aiDay") == today else today
    return {"dismissed": {k: float(v) for k, v in (s.get("dismissed") or {}).items() if isinstance(v, (int, float))},
            "ai": s.get("ai") if isinstance(s.get("ai"), dict) else {}, "aiOn": bool(s.get("aiOn")),
            "aiDay": ai_day, "aiUsed": int(s.get("aiUsed", 0) or 0) if s.get("aiDay") == today else 0}


# ---------- reducing what was done to its shape ----------

def _words(cmd: str) -> list[str]:
    try:
        return shlex.split(cmd, comments=True)
    except ValueError:
        return cmd.split()


def command_tokens(cmd: str) -> list[tuple[str, str]]:
    """The meaningful steps of a shell command as (shape, example): `cd x && python3 -I tools/gl.py mr-create --title "…"`
    → [("gl.py mr-create", "python3 -I tools/gl.py mr-create --title …")]. Reading commands (ls, cat, grep…) are left out."""
    out = []
    cmd = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?[^\n]*\n.*?(\n\1\s*(\n|$)|$)", "\n", cmd, flags=re.S)  # heredoc bodies
    cmd = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "Q", cmd)  # quoted text (python -c "…", messages)
    for seg in re.split(r"&&|\|\||;|\n|\|", cmd):
        words = [w for w in _words(seg.strip()) if not re.match(r"^[A-Z_][A-Z0-9_]*=", w)]
        while words and Path(words[0]).name in RUNNERS:
            words = words[1:]
            while words and words[0].startswith("-") and words[0] not in ("-m", "-c"):
                words = words[1:]
            if words and words[0] == "-m" and len(words) > 1:
                words = words[1:]
            elif words and words[0] == "-c":
                words = []
            if words and words[0] == "run" and len(words) > 1:  # uv run x, poetry run x
                words = words[1:]
        if not words:
            continue
        prog = Path(words[0]).name
        sub = next((w for w in words[1:3] if not w.startswith("-")), "")
        shape = f"{prog} {sub}" if sub and re.fullmatch(r"[a-z][a-z0-9_:-]{1,24}", sub) else prog
        if prog in NOISE or shape in NOISE or not re.fullmatch(r"[\w.+-]{1,40}", prog):
            continue
        out.append((shape, seg.strip()[:160]))
    return out


def error_signature(text: str) -> str:
    """The shape of an error: its telling line, without paths, quoted text, ids nor numbers."""
    stamp = re.compile(r"^\d{4}-\d\d-\d\dT[\d:.]+Z\s+\d+[OE]\+?\s*")  # GitLab job logs: time and stream before each line
    clock = re.compile(r"^\[?\d\d:\d\d:\d\d(\.\d+)?\]?\s*")  # a time at the start of a log line
    lines = [clock.sub("", stamp.sub("", ln)).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln and not ln.startswith("Exit code")]
    line = next((ln for ln in lines if ERR_LINE_RE.search(ln)), lines[0] if lines else "")
    s = line.lower()
    s = re.sub(r"https?://\S+", "<url>", s)
    s = re.sub(r"(['\"`]).*?\1", "…", s)
    s = re.sub(r"(~|\.{0,2}/)?[\w.-]*/[\w./-]+", "<path>", s)
    s = re.sub(r"\b[0-9a-f]{7,}\b", "#", s)
    s = re.sub(r"\d+", "N", s)
    s = re.sub(r"([=*#~-])\1+", r"\1\1", s)
    return re.sub(r"\s+", " ", s).strip(" :.-")[:90]


def _tool_token(name: str, data: dict[str, Any]) -> list[tuple[str, str]]:
    if name == "Bash":
        return command_tokens(str(data.get("command", "")))
    if name == "Skill":
        return [(f"skill:{data.get('skill', '')}", "")]
    if name == "Agent":
        return [(f"agent:{data.get('subagent_type') or 'general-purpose'}", str(data.get("description", ""))[:120])]
    if name.startswith("mcp__"):
        parts = name.split("__")
        return [(f"{parts[1] if len(parts) > 2 else 'mcp'}:{parts[-1]}", "")]
    if name in QUIET_TOOLS:
        return []
    return [(name, "")]


# ---------- one transcript ----------

def summarize(path: Path) -> dict[str, Any]:
    """What one transcript did: its steps in order (with the agent / skill they ran under), skills and agents used,
    errors (shape, signature, sample, fix), the user's corrections, the first prompt of a main session."""
    sub = path.parent.name == "subagents"
    meta = _load(path.with_suffix(".meta.json")) if sub else {}
    ctx = str(meta.get("agentType") or "") if sub else ""
    steps: list[list[str]] = []
    examples: dict[str, str] = {}
    used: set[str] = set()
    errors: list[list[str]] = []
    corrections: list[str] = []
    calls: dict[str, tuple[str, str]] = {}   # tool_use id → (shape, command)
    failed: list[list[Any]] = []             # errors waiting for their fix: [index in errors, program, calls left]
    prompt, first_ts, skill = "", None, ""
    with path.open("rb") as fh:
        for line in fh:
            if b'"tool_use"' in line and b'"assistant"' in line:
                rec = decode(line)
                if not rec or rec.get("type") != "assistant":
                    continue
                first_ts = first_ts or rec.get("timestamp")
                for c in (rec.get("message") or {}).get("content") or []:
                    if not isinstance(c, dict) or c.get("type") != "tool_use":
                        continue
                    name, data = c.get("name", ""), c.get("input") or {}
                    if name == "Skill":
                        skill = str(data.get("skill", ""))
                        used.add(f"skill:{skill}")
                    if name == "Agent" and (data.get("subagent_type") or "") not in GENERIC:
                        used.add(f"agent:{data.get('subagent_type')}")
                    toks = _tool_token(name, data if isinstance(data, dict) else {})
                    for shape, ex in toks:
                        if not steps or steps[-1][0] != shape:
                            steps.append([shape, ctx or (f"skill:{skill}" if skill else "")])
                        if ex and shape not in examples:
                            examples[shape] = ex
                    calls[c.get("id", "")] = (toks[0][0] if toks else name, str(data.get("command", ""))[:160] if name == "Bash" else "")
            elif b'"tool_result"' in line:
                if IS_ERROR.search(line):
                    rec = decode(line)
                    for c in ((rec or {}).get("message") or {}).get("content") or []:
                        if not isinstance(c, dict) or c.get("type") != "tool_result" or not c.get("is_error"):
                            continue
                        text = text_of(c.get("content")) if not isinstance(c.get("content"), str) else c["content"]
                        if any(x in text.lower() for x in IGNORED_ERRORS):
                            continue
                        shape, cmd = calls.get(c.get("tool_use_id", ""), ("?", ""))
                        sig = error_signature(text)
                        if not sig:
                            continue
                        errors.append([shape, sig, text.strip()[:200], ""])
                        if cmd and shape not in ("Bash", "?"):
                            failed.append([len(errors) - 1, shape.split()[0], 8])
                else:
                    for tid in TOOL_USE_ID.findall(line):
                        shape, cmd = calls.get(tid.decode(), ("", ""))
                        for f in failed:
                            f[2] -= 1
                            if cmd and shape.split()[0] == f[1] and not errors[f[0]][3]:
                                errors[f[0]][3] = cmd
                        failed = [f for f in failed if f[2] > 0 and not errors[f[0]][3]]
            elif USER.search(line) and len(line) < 40_000:
                rec = decode(line)
                msg = (rec or {}).get("message") or {}
                if rec is None or rec.get("isMeta") or msg.get("role") != "user":
                    continue
                text = text_of(msg.get("content")).strip()
                if not text or text.startswith(("<", "[Request interrupted", "Caveat:")):
                    continue
                first_ts = first_ts or rec.get("timestamp")
                if not prompt:
                    prompt = text[:400]
                elif not sub and CORRECTION_RE.match(text):
                    corrections.append(text[:160])
                skill = ""  # a new request: the skill of the last one is over
            elif not sub and not ctx and b'"agent-setting"' in line:
                ctx = str((decode(line) or {}).get("agentSetting") or "")
    try:
        day = datetime.fromisoformat(str(first_ts).replace("Z", "+00:00")).astimezone().date().isoformat() if first_ts else ""
    except ValueError:
        day = ""
    session = path.parent.parent.name if sub else path.stem
    return {"session": session, "project": project_name((path.parent.parent.parent if sub else path.parent).name),
            "sub": sub, "agent": ctx, "day": day or datetime.fromtimestamp(path.stat().st_mtime).date().isoformat(),
            "prompt": "" if sub else prompt, "steps": steps, "examples": examples, "used": sorted(used),
            "errors": errors, "corrections": corrections}


def transcripts(days: float = DAYS) -> list[Path]:
    now, out = time.time(), []
    root = config.PROJECTS
    for project in root.iterdir() if root.exists() else []:
        if not project.is_dir() or any(x in project.name for x in config.EXCLUDED):
            continue
        for path in [*project.glob("*.jsonl"), *project.glob("*/subagents/agent-*.jsonl")]:
            try:
                if now - path.stat().st_mtime <= days * 86_400:
                    out.append(path)
            except OSError:
                continue
    return out


def summaries(days: float = DAYS) -> list[dict[str, Any]]:
    """One summary per transcript, read again only when its size or date changed (cache on disk)."""
    cache, fresh = _load(_cache_path()), {}
    out = []
    for path in transcripts(days):
        try:
            st = path.stat()
        except OSError:
            continue
        key, sig = str(path), [st.st_size, round(st.st_mtime, 3)]
        hit = cache.get(key)
        if isinstance(hit, dict) and hit.get("sig") == sig:
            summ = hit["summary"]
        else:
            try:
                summ = summarize(path)
            except OSError:
                continue
        fresh[key] = {"sig": sig, "summary": summ}
        out.append(summ)
    _save(_cache_path(), fresh)
    return out


# ---------- across transcripts ----------

def _kw(text: str) -> set[str]:
    return {w for w in WORD_RE.findall(text.lower()) if w not in STOP and not w.isdigit()}


def _shape_words(shapes: list[str]) -> set[str]:
    return {w for s in shapes for w in re.split(r"[\s.:_/-]+", s.lower()) if len(w) >= 3 and w not in {"py", "python", "python3", "run", "mcp", "skill", "agent"}}


COMMON = {"git", "add", "get", "set", "list", "new", "show", "make", "install", "run", "test", "tests", "file", "files", "code", "check", "update"}


def _existing(words: set[str], files: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The skill / agent / command whose name and description share the most words with the task (2 at least, the
    common ones such as git, add, test not counted)."""
    words = words - COMMON
    best, score = None, 1
    for f in files:
        doc = set(re.split(r"[^a-zà-ÿ0-9]+", f"{f['name']} {f['name'].replace('-', ' ')} {f['description']}".lower()))
        n = len(words & doc)
        if n > score:
            best, score = f, n
    return {"kind": best["kind"], "name": best["name"], "scope": best["scope"]} if best else None


def recurring_tasks(summs: list[dict[str, Any]], files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grams: dict[tuple[str, ...], dict[str, Any]] = {}
    examples: dict[str, str] = {}
    for s in summs:
        examples.update({k: v for k, v in s["examples"].items() if k not in examples})
        shapes = [x[0] for x in s["steps"]]
        seen: set[tuple[str, ...]] = set()
        for n in (3, 4, 5):
            for i in range(len(shapes) - n + 1):
                g = tuple(shapes[i:i + n])
                if g in seen or len(set(g)) < 2:
                    continue
                seen.add(g)
                b = grams.setdefault(g, {"sessions": set(), "days": set(), "projects": Counter(), "ctx": Counter(), "n": 0})
                b["sessions"].add(s["session"]); b["days"].add(s["day"]); b["projects"][s["project"]] += 1; b["n"] += 1
                b["ctx"][s["steps"][i][1] if s["steps"][i][1] not in GENERIC else ""] += 1
    cands = [(g, b) for g, b in grams.items() if len(b["sessions"]) >= MIN_SESSIONS and len(b["days"]) >= MIN_DAYS]
    cands.sort(key=lambda x: (-len(x[1]["sessions"]), -len(x[0])))
    chosen: list[tuple[tuple[str, ...], dict[str, Any]]] = []
    for g, b in cands:
        if any(len(set(g) & set(c)) / min(len(set(g)), len(set(c))) >= 0.5 for c, _ in chosen):
            continue
        named = sum(v for k, v in b["ctx"].items() if k)
        if named / b["n"] >= COVERED:
            continue  # the routine of an agent / skill that already exists
        chosen.append((g, b))
        if len(chosen) >= 6:
            break
    out = []
    for g, b in chosen:
        out.append({"key": "task:" + " > ".join(g), "kind": "task", "steps": list(g), "examples": [examples.get(x, "") for x in g],
                    "count": b["n"], "sessions": len(b["sessions"]), "days": sorted(b["days"]), "projects": [p for p, _ in b["projects"].most_common(3)],
                    "existing": _existing(_shape_words(list(g)), files)})
    return out


def recurring_requests(summs: list[dict[str, Any]], files: list[dict[str, Any]]) -> list[dict[str, Any]]:
    mains = [s for s in summs if not s["sub"] and s["prompt"] and not s["agent"]]
    groups: list[dict[str, Any]] = []
    for s in mains:
        kw = _kw(re.sub(r"\b[A-Z][A-Z0-9]+-\d+\b|https?://\S+", " ", s["prompt"]))
        if len(kw) < 2:
            continue
        g = max(groups, key=lambda g: len(kw & g["kw"]) / len(kw | g["kw"]), default=None)
        if g and len(kw & g["kw"]) / len(kw | g["kw"]) >= 0.35:
            g["items"].append(s); g["count"].update(kw)
        else:
            groups.append({"kw": kw, "items": [s], "count": Counter(kw)})
    out = []
    for g in groups:
        sessions, days = {s["session"] for s in g["items"]}, {s["day"] for s in g["items"]}
        if len(sessions) < MIN_SESSIONS or len(days) < MIN_DAYS:
            continue
        if sum(1 for s in g["items"] if s["used"]) / len(g["items"]) >= COVERED:
            continue
        top = [w for w, _ in g["count"].most_common(5)]
        out.append({"key": "ask:" + " ".join(sorted(top[:4])), "kind": "request", "words": top, "prompts": [s["prompt"][:160] for s in g["items"][-3:]],
                    "count": len(g["items"]), "sessions": len(sessions), "days": sorted(days),
                    "projects": [p for p, _ in Counter(s["project"] for s in g["items"]).most_common(3)], "existing": _existing(set(top), files)})
    return sorted(out, key=lambda x: -x["count"])[:5]


def recurring_errors(summs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], dict[str, Any]] = {}
    for s in summs:
        for shape, sig, sample, fix in s["errors"]:
            b = groups.setdefault((shape, sig), {"n": 0, "sessions": set(), "days": set(), "samples": [], "fixes": Counter(), "projects": Counter(), "agents": Counter()})
            b["n"] += 1; b["sessions"].add(s["session"]); b["days"].add(s["day"]); b["projects"][s["project"]] += 1; b["agents"][s["agent"]] += 1
            if fix:
                b["fixes"][fix] += 1
            if len(b["samples"]) < 3:
                b["samples"].append(sample)
    out = [{"key": f"err:{shape}|{sig}", "kind": "error", "tool": shape, "signature": sig, "count": b["n"], "sessions": len(b["sessions"]),
            "days": sorted(b["days"]), "samples": b["samples"], "fix": b["fixes"].most_common(1)[0][0] if b["fixes"] else "",
            "projects": [p for p, _ in b["projects"].most_common(3)], "projectShare": b["projects"].most_common(1)[0][1] / b["n"],
            "agents": [a for a, _ in b["agents"].most_common(3)], "agentShare": b["agents"].most_common(1)[0][1] / b["n"]}
           for (shape, sig), b in groups.items() if b["n"] >= ERR_MIN and len(b["sessions"]) >= ERR_SESSIONS]
    return sorted(out, key=lambda x: -x["count"])[:8]


def corrections(summs: list[dict[str, Any]]) -> dict[str, Any] | None:
    items = sorted(((s["day"], s["project"], c) for s in summs for c in s["corrections"]), reverse=True)
    if len(items) < FIX_MIN:
        return None
    return {"key": "fix:corrections", "kind": "corrections", "count": len(items), "days": sorted({d for d, _, _ in items}),
            "samples": [{"day": d, "project": p, "text": t} for d, p, t in items[:8]],
            "projects": [p for p, _ in Counter(p for _, p, _ in items).most_common(3)]}


def error_hits(summs: list[dict[str, Any]], tool: str, sig: str, since: str) -> int:
    """How many times an error (tool + signature) happened on `since` (YYYY-MM-DD) or later: lessons.py measures with it."""
    return sum(1 for s in summs if s["day"] >= since for t, g, _, _ in s["errors"] if t == tool and g == sig)


def latest() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """The last computed insights and the transcripts' summaries they come from (recomputed every TTL seconds)."""
    insights()
    with _lock:
        return _result or {"items": []}, _summs


def compute(days: float = DAYS) -> dict[str, Any]:
    global _summs
    summs = summaries(days)
    _summs = summs
    files = list_files()
    items = [*recurring_tasks(summs, files), *recurring_requests(summs, files), *recurring_errors(summs)]
    fix = corrections(summs)
    if fix:
        items.append(fix)
    return {"at": time.time(), "days": days, "transcripts": len(summs), "items": items}


# ---------- what the page gets ----------

def insights(force: bool = False) -> dict[str, Any]:
    """The proposals (dismissed ones left out), with the AI texts already written; recomputed every TTL seconds."""
    global _result, _at
    with _lock:
        if force or _result is None or time.time() - _at > TTL:
            _result, _at = compute(), time.time()
        res = _result
    s = state()
    now = time.time()
    items = [{**it, "ai": s["ai"].get(it["key"])} for it in res["items"] if s["dismissed"].get(it["key"], 0) < now]
    if s["aiOn"] and any(not it["ai"] for it in items):
        _write_async(items)
    return {**res, "items": items, "aiOn": s["aiOn"], "aiUsed": s["aiUsed"], "aiMax": AI_DAILY, "aiBusy": _ai_running, "engine": quips.engine()}


def dismiss(key: str, days: float = DISMISS_DAYS) -> dict[str, Any]:
    with _lock:
        s = _load(_state_path())
        d = s.setdefault("dismissed", {})
        d[str(key)[:300]] = time.time() + days * 86_400
        s["dismissed"] = {k: v for k, v in d.items() if v > time.time()}
        _save(_state_path(), s)
    return {"ok": True}


def set_ai(on: bool) -> dict[str, Any]:
    with _lock:
        s = _load(_state_path())
        s["aiOn"] = bool(on)
        _save(_state_path(), s)
    return {"aiOn": bool(on), "engine": quips.engine()}


SYSTEM = (
    "Tu aides un développeur qui fait coder des agents Claude Code. On te donne, extrait de ses transcripts des deux "
    "dernières semaines, des tâches qui reviennent, des erreurs qui reviennent et ses corrections. Pour chaque élément, "
    "en français, concret, sans inventer ce qui n'est pas dans les données :\n"
    "- tâche ou demande : propose UN outil à écrire (type : skill, agent, hook ou command), un nom en kebab-case, "
    "pourquoi (1 phrase, avec le nombre de fois), une description de déclenchement (1 phrase « Quand… »), et 3 à 7 étapes ; "
    "si un outil existant est cité, dis s'il suffit de l'utiliser (type : existing).\n"
    "- erreur : la cause probable (1 phrase) et le remède (1 phrase : hook de garde, ligne de CLAUDE.md, commande à "
    "corriger, dépendance à installer…).\n"
    "- corrections : 1 à 3 règles à ajouter au CLAUDE.md pour éviter ces corrections.\n"
    'Réponds uniquement par un objet JSON : {"<key>": {"type": "...", "name": "...", "why": "...", "description": "...", '
    '"steps": ["..."], "cause": "...", "remedy": "...", "rules": ["..."]}} avec seulement les champs utiles à chaque élément.'
)


SECRET_RE = re.compile(r"(?i)((?:token|key|secret|password|passwd|authorization|bearer|cookie)[\"']?\s*[:=]?\s*(?:bearer\s+)?)\S+|\b[A-Za-z0-9_\-+/]{32,}={0,2}")


def redact(text: str) -> str:
    return SECRET_RE.sub(lambda m: f"{m.group(1)}•••" if m.group(1) else "•••", text)


def digest(items: list[dict[str, Any]]) -> str:
    """The short text sent to the model: counts and a few clipped examples (secrets masked), never a transcript."""
    lines = []
    for it in items:
        head = f"[{it['key'][:200]}] {it['kind']}, {it['count']} fois, {len(it['days'])} jours, projets : {', '.join(it['projects'])}"
        if it["kind"] == "task":
            body = "étapes : " + " → ".join(f"{s}{f' (ex. {e[:100]})' if e else ''}" for s, e in zip(it["steps"], it["examples"]))
        elif it["kind"] == "request":
            body = "demandes : " + " | ".join(p[:140] for p in it["prompts"])
        elif it["kind"] == "error":
            body = f"outil : {it['tool']} ; erreur : {it['signature']} ; exemple : {it['samples'][0][:180]}" + (f" ; corrigé par : {it['fix'][:140]}" if it["fix"] else "")
        else:
            body = "corrections : " + " | ".join(x["text"][:120] for x in it["samples"][:6])
        if it.get("existing"):
            body += f" ; existant proche : {it['existing']['kind']} {it['existing']['name']}"
        lines.append(f"{head}\n{redact(body)}")
    return "\n\n".join(lines)


def book_ai() -> bool:
    """Takes one of the day's AI_DAILY calls (shared by the ideas and the lessons); False when none is left."""
    with _lock:
        s = state()
        if s["aiUsed"] >= AI_DAILY:
            return False
        raw = _load(_state_path())
        raw.update(aiDay=s["aiDay"], aiUsed=s["aiUsed"] + 1)
        _save(_state_path(), raw)
    return True


def refund_ai() -> None:
    with _lock:
        raw = _load(_state_path())
        raw["aiUsed"] = max(0, int(raw.get("aiUsed", 1)) - 1)
        _save(_state_path(), raw)


def write_ai(items: list[dict[str, Any]]) -> dict[str, Any]:
    """One model call for the items without text yet (8 at most), if the day's budget allows."""
    todo = [it for it in items if not it.get("ai")][:8]
    if not todo:
        return {"written": 0}
    if not book_ai():
        return {"error": "limit"}
    text, why = quips.ask(SYSTEM, digest(todo), need_on=False)
    if not text:
        refund_ai()
        return {"error": why}
    try:
        got = json.loads(text[text.index("{"): text.rindex("}") + 1])
    except ValueError:
        return {"error": "failed"}
    keys = {it["key"][:200]: it["key"] for it in todo}
    with _lock:
        raw = _load(_state_path())
        ai = raw.setdefault("ai", {})
        n = 0
        for k, v in got.items() if isinstance(got, dict) else []:
            full = keys.get(k) or keys.get(k.strip("[]"))
            if full and isinstance(v, dict):
                ai[full] = {f: (v[f][:400] if isinstance(v[f], str) else [str(x)[:200] for x in v[f]][:8])
                            for f in ("type", "name", "why", "description", "steps", "cause", "remedy", "rules") if isinstance(v.get(f), (str, list))}
                n += 1
        if len(ai) > 200:
            raw["ai"] = dict(list(ai.items())[-200:])
        _save(_state_path(), raw)
    return {"written": n}


def _write_async(items: list[dict[str, Any]]) -> None:
    global _ai_running
    if _ai_running or state()["aiUsed"] >= AI_DAILY:
        return
    _ai_running = True

    def run() -> None:
        global _ai_running
        try:
            write_ai(items)
        finally:
            _ai_running = False

    threading.Thread(target=run, daemon=True).start()

