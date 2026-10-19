"""ChiefOS → 📚 Leçons: the agents learn from their past missions, with the user's consent.

    mission → lessons harvested → the user validates → added to the next missions' prompts → effect measured

Harvest (local; GitLab read-only with the user's token): the errors that keep coming back and what fixed them
(insights.py), the questions asked twice to the chief and his answer (questions.py), the remarks that come back in the
reviews of the agents' MRs, the CI jobs that broke on those MRs before going green, the user's corrections. Each one is a
*pending* lesson: nothing is used before the user validates it (and may rewrite it, or narrow it to an agent / a project).

Injection: the plugin's PreToolUse(Agent) hook (bin/office.py) appends to the subagent's prompt the few active lessons
that fit its agent type, its project and its mission (MAX_INJECT, MAX_CHARS), and logs it in LOG. This module is imported
by that hook: keep its top-level imports light.

Effect: an error lesson works when the error comes back much less after it was validated; a FAQ when the question is not
asked again; a review / CI lesson when the remark / the job does not come back. A lesson never used in IDLE_DAYS is
proposed for archiving. Everything stays on this machine: a user's lessons are their own (never in a repository).
State: STATE_DIR/lessons.json (the lessons), STATE_DIR/lessons-injected.jsonl (written by the hook only).
"""

from __future__ import annotations

import hashlib
import json
import re
import threading
import time
from datetime import date, datetime
from pathlib import Path
from typing import Any

from . import config

MARK = "## Leçons des missions précédentes (Agent Office)"
ID_RE = re.compile(r"\[(L-\d{4})\]")
MAX_INJECT, MAX_CHARS = 5, 1500
HARVEST_TTL = 1800          # seconds between two harvests
REVIEW_MRS = 15             # MRs of the agents read for reviews and CI (newest)
IDLE_DAYS = 30
SETTLE_DAYS = 2             # before that, a lesson is too new to judge
KIND = {"error": "erreur", "faq": "question", "review": "revue", "ci": "CI", "correction": "correction"}
GENERIC = {"", "main", "general-purpose", "Explore", "Plan", "claude", "agent", "fork"}
WORD_RE = re.compile(r"[a-zà-ÿ][a-zà-ÿ0-9_-]{3,}")
STOP = set("""avec dans pour plus sans sous vers cette ces les des une est sont fait faire tout tous comme quoi quand alors
aussi encore merci bien très juste nous vous elle ils leur qui que quel quelle faut voir the and with from that this what
have just make sure then also into your about there their them they should would could which when where file code""".split())

_lock = threading.RLock()
_harvest = {"at": 0.0, "running": False, "error": "", "review": [], "ci": []}


def _path() -> Path:
    return config.STATE_DIR / "lessons.json"  # read at call time (the tests move STATE_DIR)


def _log_path() -> Path:
    return config.STATE_DIR / "lessons-injected.jsonl"


def load() -> dict[str, Any]:
    try:
        data = json.loads(_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    lessons = [x for x in data.get("lessons", []) if isinstance(x, dict) and x.get("id")] if isinstance(data, dict) else []
    return {"lessons": lessons, "seq": int(data.get("seq", 0) or 0) if isinstance(data, dict) else 0}


def save(data: dict[str, Any]) -> None:
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _path().with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(_path())


def words(text: str) -> set[str]:
    return {w for w in WORD_RE.findall(text.lower()) if w not in STOP}


def _h(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()[:10]


def _today() -> str:
    return date.today().isoformat()


# ---------- harvest ----------

def _main(counter_share: float, top: list[str]) -> str:
    """The agent / project a lesson is narrowed to: the one behind 70 % of the cases or more, else everyone."""
    return top[0] if top and counter_share >= 0.7 and top[0] not in GENERIC else ""


def from_insights() -> list[dict[str, Any]]:
    """Error lessons (with their fix, or the AI remedy) and correction lessons (the AI rules, else the quotes)."""
    from . import insights
    res, _ = insights.latest()
    ai = insights.state()["ai"]
    out = []
    for it in res.get("items", []):
        text_ai = ai.get(it["key"]) or {}
        if it["kind"] == "error":
            fix = f" Ce qui a marché : `{it['fix'][:140]}`." if it.get("fix") else ""
            text = text_ai.get("remedy") or f"Erreur déjà vue {it['count']} fois avec `{it['tool']}` : « {it['signature']} ».{fix} L'éviter d'emblée."
            out.append({"key": it["key"], "kind": "error", "text": text,
                        "scope": {"agent": _main(it.get("agentShare", 0), it.get("agents", [])), "project": _main(it.get("projectShare", 0), it.get("projects", []))},
                        "trigger": {"tool": it["tool"], "sig": it["signature"]}, "words": sorted(words(f"{it['tool']} {it['signature']}"))[:12],
                        "evidence": {"count": it["count"], "days": it["days"], "examples": it.get("samples", [])[:2]}})
        elif it["kind"] == "corrections":
            rules = text_ai.get("rules") or []
            if rules:
                for r in rules[:3]:
                    out.append({"key": f"cor:{_h(r)}", "kind": "correction", "text": r, "scope": {"agent": "", "project": ""}, "trigger": {},
                                "words": sorted(words(r))[:12], "evidence": {"count": it["count"], "days": it["days"], "examples": [x["text"] for x in it["samples"][:3]]}})
            else:
                for x in [x for x in it["samples"] if len(x["text"].split()) >= 6][:5]:  # "non fait tout" teaches nothing
                    out.append({"key": f"cor:{_h(x['text'])}", "kind": "correction", "text": f"Correction de l'utilisateur : « {x['text']} »",
                                "scope": {"agent": "", "project": x.get("project", "")}, "trigger": {}, "words": sorted(words(x["text"]))[:12],
                                "evidence": {"count": 1, "days": [x["day"]], "examples": [x["text"]]}})
    return out


def _similar(a: set[str], b: set[str], threshold: float) -> bool:
    return bool(a and b) and len(a & b) / len(a | b) >= threshold


def from_answers() -> list[dict[str, Any]]:
    """A question asked twice or more (on different missions) with the chief's latest answer: a FAQ."""
    from .questions import answered
    groups: list[dict[str, Any]] = []
    for q in sorted(answered(30), key=lambda q: q.get("answered") or q["created"]):
        kw = words(str(q.get("question", "")))
        g = next((g for g in groups if _similar(kw, g["kw"], 0.5)), None)
        if g:
            g["items"].append(q)
        else:
            groups.append({"kw": kw, "items": [q]})
    out = []
    for g in groups:
        if len(g["items"]) < 2:
            continue
        last = g["items"][-1]
        agents = [str(q.get("from") or "") for q in g["items"]]
        cwd = str(last.get("cwd") or "")
        out.append({"key": f"faq:{_h(' '.join(sorted(g['kw'])))}", "kind": "faq",
                    "text": f"Question déjà tranchée par le chef ({len(g['items'])} fois) : « {str(last['question'])[:200]} » → « {str(last['answer'])[:300]} ». Ne pas la reposer : appliquer cette réponse.",
                    "scope": {"agent": agents[-1] if len(set(agents)) == 1 and agents[-1] not in GENERIC else "", "project": project_of(cwd)},
                    "trigger": {"question": sorted(g["kw"])[:12]}, "words": sorted(g["kw"])[:12],
                    "evidence": {"count": len(g["items"]), "days": sorted({datetime.fromtimestamp(q["created"]).date().isoformat() for q in g["items"]}),
                                 "examples": [str(q["question"])[:160] for q in g["items"][-2:]]}})
    return out


def _mr_targets(game: Any) -> list[tuple[str, str, int, str]]:
    """(url, project path, iid, agent type) of the agents' MRs over 30 days, newest first."""
    from .history import runs
    from .pipelines import MR_URL
    seen, out = set(), []
    for r in sorted(runs(game, 30), key=lambda r: -(r["last"] or 0)):
        m = MR_URL.match(r.get("mr") or "")
        if m and r["mr"] not in seen:
            seen.add(r["mr"])
            out.append((r["mr"], m["path"], int(m["iid"]), r["type"]))
    return out[:REVIEW_MRS]


def from_gitlab(game: Any) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Review remarks (inline, not system, not LGTM) and CI breakages (a failed pipeline before a green one) of the
    agents' MRs, through the GitLab API with the user's read-only token. Returns (raw remarks, raw CI breakages)."""
    from urllib.parse import quote
    from . import gitlab
    from .insights import error_signature
    conf = gitlab.load()
    if not conf:
        return [], []
    remarks, breaks = [], []
    for url, path, iid, agent in _mr_targets(game):
        pid = quote(path, safe="")
        project = path.rsplit("/", 1)[-1]
        try:
            for d in gitlab.api(conf, f"/projects/{pid}/merge_requests/{iid}/discussions", {"per_page": 100}):
                n = (d.get("notes") or [{}])[0]
                body = (n.get("body") or "").strip()
                if n.get("system") or not n.get("position") or not body or "lgtm" in body.lower()[:20]:
                    continue
                remarks.append({"mr": url, "project": project, "agent": agent, "text": re.split(r"(?<=[.!?])\s|\n", body)[0][:220],
                                "day": str(n.get("created_at", ""))[:10], "file": (n.get("position") or {}).get("new_path", "")})
            pipes = gitlab.api(conf, f"/projects/{pid}/merge_requests/{iid}/pipelines", {"per_page": 10})
            green = next((p for p in pipes if p.get("status") == "success"), None)
            red = next((p for p in pipes if p.get("status") == "failed" and (not green or p["id"] < green["id"])), None)
            if red:
                jobs = gitlab.api(conf, f"/projects/{pid}/pipelines/{red['id']}/jobs", {"scope[]": "failed", "per_page": 3})
                for j in jobs[:1]:
                    log = gitlab.tail(gitlab.api(conf, f"/projects/{pid}/jobs/{j['id']}/trace", raw=True), 60)
                    breaks.append({"mr": url, "project": project, "agent": agent, "job": j.get("name", ""), "stage": j.get("stage", ""),
                                   "sig": error_signature(log), "day": str(red.get("created_at", ""))[:10], "fixed": bool(green)})
        except gitlab.GitLabError:
            continue
    return remarks, breaks


def review_lessons(remarks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """A remark that comes back in two MRs or more of the same project."""
    groups: list[dict[str, Any]] = []
    for r in remarks:
        kw = words(r["text"])
        g = next((g for g in groups if g["project"] == r["project"] and _similar(kw, g["kw"], 0.3)), None)
        if g:
            g["items"].append(r); g["kw"] |= kw
        else:
            groups.append({"project": r["project"], "kw": kw, "items": [r]})
    out = []
    for g in groups:
        if len({r["mr"] for r in g["items"]}) < 2:
            continue
        first = g["items"][0]
        out.append({"key": f"rev:{g['project']}:{_h(first['text'])}", "kind": "review",
                    "text": f"En revue sur {g['project']}, remarque revenue {len(g['items'])} fois : « {first['text']} ». Le vérifier avant d'ouvrir la MR.",
                    "scope": {"agent": "", "project": g["project"]}, "trigger": {"review": sorted(g["kw"])[:12]}, "words": sorted(g["kw"])[:12],
                    "evidence": {"count": len(g["items"]), "days": sorted({r["day"] for r in g["items"]}), "examples": [r["mr"] for r in g["items"][:3]]}})
    return out


def ci_lessons(breaks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """A CI job that broke on an agent's MR (then went green): run it locally before pushing."""
    groups: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    for b in breaks:
        groups.setdefault((b["project"], b["job"], b["sig"]), []).append(b)
    out = []
    for (project, job, sig), items in groups.items():
        out.append({"key": f"ci:{project}:{job}:{_h(sig)}", "kind": "ci",
                    "text": f"Sur {project}, le job CI « {job} » a déjà cassé une MR d'agent ({sig or 'voir le log'}). Le reproduire en local avant de pousser.",
                    "scope": {"agent": "", "project": project}, "trigger": {"job": job, "sig": sig}, "words": sorted(words(f"{job} {sig}"))[:12],
                    "evidence": {"count": len(items), "days": sorted({b["day"] for b in items}), "examples": [b["mr"] for b in items[:3]]}})
    return out


POLISH = (
    "Tu reformules des leçons destinées à des agents IA qui codent. Pour chaque leçon, écris UNE consigne en français, "
    "impérative, concrète, au plus 30 mots, sans inventer ce qui n'est pas dans le texte (garder commandes et noms exacts). "
    'Réponds uniquement par un objet JSON {"<id>": "<consigne>"}.'
)


def polish(data: dict[str, Any]) -> int:
    """Claude Haiku rewrites the pending lessons not rewritten yet (one call, if the ideas' AI switch is on and a call is left)."""
    from . import insights, quips
    if not insights.state()["aiOn"]:
        return 0
    todo = [x for x in data["lessons"] if x["status"] == "pending" and not x.get("polished")][:12]
    if not todo or not insights.book_ai():
        return 0
    text, _ = quips.ask(POLISH, "\n".join(f"[{x['id']}] ({KIND.get(x['kind'], x['kind'])}) {insights.redact(x['text'])}" for x in todo), need_on=False)
    if not text:
        insights.refund_ai()
        return 0
    try:
        got = json.loads(text[text.index("{"): text.rindex("}") + 1])
    except ValueError:
        return 0
    n = 0
    for x in todo:
        new = got.get(x["id"]) if isinstance(got, dict) else None
        if isinstance(new, str) and new.strip():
            x.update(text=new.strip()[:400], polished=True)
            n += 1
    return n


def harvest(game: Any = None, network: bool = True) -> dict[str, Any]:
    """New pending lessons from every source; the evidence of the pending ones already known is refreshed. A lesson
    already rejected, active or archived is never proposed again."""
    found = from_insights() + from_answers()
    errors = []
    if network and game is not None:
        try:
            remarks, breaks = from_gitlab(game)
            _harvest.update(review=remarks, ci=breaks)
            found += review_lessons(remarks) + ci_lessons(breaks)
        except Exception as err:  # GitLab down, a strange answer: the local lessons still come
            errors.append(f"GitLab : {err}")
    with _lock:
        data = load()
        known = {x["key"]: x for x in data["lessons"]}
        added = 0
        for f in found:
            old = known.get(f["key"])
            if old:
                if old["status"] == "pending" and not old.get("edited"):
                    old["evidence"] = f["evidence"]
                continue
            data["seq"] += 1
            data["lessons"].append({**f, "id": f"L-{data['seq']:04d}", "status": "pending", "created": time.time()})
            added += 1
        polished = polish(data)
        save(data)
    _harvest.update(at=time.time(), error="; ".join(errors))
    return {"added": added, "polished": polished, "error": _harvest["error"]}


def harvest_async(game: Any, force: bool = False) -> None:
    if _harvest["running"] or (not force and time.time() - _harvest["at"] < HARVEST_TTL):
        return
    _harvest["running"] = True

    def run() -> None:
        try:
            harvest(game)
        except Exception as err:  # never kill the server for a harvest
            _harvest.update(at=time.time(), error=str(err))
        finally:
            _harvest["running"] = False

    threading.Thread(target=run, daemon=True).start()


# ---------- the user's decisions ----------

def decide(lesson_id: str, action: str, fields: dict[str, Any] | None = None) -> dict[str, Any]:
    """approve (with the edited text / scope), reject, archive, restore, edit."""
    fields = fields or {}
    with _lock:
        data = load()
        x = next((x for x in data["lessons"] if x["id"] == lesson_id), None)
        if not x:
            return {"error": "leçon introuvable"}
        if "text" in fields and str(fields["text"]).strip():
            x["text"] = str(fields["text"]).strip()[:600]
            x["edited"] = True
        for k in ("agent", "project"):
            if k in fields:
                x.setdefault("scope", {})[k] = re.sub(r"[^\w.:-]", "", str(fields[k]))[:60]
        if action == "approve":
            x.update(status="active", decided=time.time(), decidedDay=_today())
        elif action == "reject":
            x.update(status="rejected", decided=time.time())
        elif action == "archive":
            x.update(status="archived", archived=time.time())
        elif action == "restore":
            x.update(status="active")
        elif action != "edit":
            return {"error": "action inconnue"}
        save(data)
        return {"ok": True, "lesson": x}


# ---------- injection (bin/office.py, PreToolUse(Agent)) ----------

def project_of(cwd: str) -> str:
    return Path(cwd).name if cwd else ""


def canon(project: str) -> str:
    """Office-Agent, office-agent, .claude, -claude (a transcript folder) compare equal."""
    return re.sub(r"[^a-z0-9]", "", project.lower())


def select(agent: str, prompt: str, cwd: str, data: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """The active lessons for this mission: scope (agent type, project) first, then the words shared with the mission;
    an error / correction lesson of the right scope always counts, a lesson that does not work comes last."""
    data = data or load()
    project, mission = canon(project_of(cwd)), words(prompt)
    scored = []
    for x in data["lessons"]:
        if x.get("status") != "active":
            continue
        sc = x.get("scope") or {}
        if sc.get("agent") and sc["agent"] != agent:
            continue
        if sc.get("project") and canon(sc["project"]) != project:
            continue
        shared = len(mission & set(x.get("words") or []))
        score = shared * 2 + (3 if sc.get("agent") else 0) + (2 if sc.get("project") else 0) + (1 if x["kind"] in ("error", "correction", "faq") else 0)
        score -= 4 if x.get("effect") == "ko" else 0
        if score > 0:
            scored.append((score, x))
    out, size = [], 0
    for _, x in sorted(scored, key=lambda t: -t[0]):
        line = f"- [{x['id']}] {x['text']}"
        if len(out) >= MAX_INJECT or size + len(line) > MAX_CHARS:
            break
        out.append(x)
        size += len(line)
    return out


def block(chosen: list[dict[str, Any]]) -> str:
    return "\n\n" + MARK + "\nTirées des missions précédentes et validées par l'utilisateur ; à appliquer quand elles s'appliquent :\n" + \
        "\n".join(f"- [{x['id']}] {x['text']}" for x in chosen)


def hook_output(event: dict[str, Any]) -> dict[str, Any] | None:
    """For the PreToolUse(Agent) hook: the subagent's input with the lessons appended, or None (nothing fits, or
    already done, or turned off). Logs what was given."""
    if not config.CFG.get("lessons", True) or event.get("tool_name") not in ("Agent", "Task"):
        return None
    inp = dict(event.get("tool_input") or {})
    prompt = str(inp.get("prompt") or "")
    if not prompt or MARK in prompt:
        return None
    agent = str(inp.get("subagent_type") or "general-purpose")
    cwd = str(event.get("cwd") or "")
    chosen = select(agent, f"{inp.get('description', '')} {prompt}", cwd)
    if not chosen:
        return None
    inp["prompt"] = prompt + block(chosen)
    try:
        config.STATE_DIR.mkdir(parents=True, exist_ok=True)
        with _log_path().open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"t": time.time(), "agent": agent, "project": project_of(cwd), "ids": [x["id"] for x in chosen],
                                 "mission": str(inp.get("description") or prompt[:80])[:120]}, ensure_ascii=False) + "\n")
    except OSError:
        pass
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "updatedInput": inp}}


def injections(days: float = 60) -> list[dict[str, Any]]:
    out, since = [], time.time() - days * 86_400
    try:
        with _log_path().open(encoding="utf-8") as fh:
            for line in fh:
                try:
                    r = json.loads(line)
                except ValueError:
                    continue
                if isinstance(r, dict) and r.get("t", 0) >= since:
                    out.append(r)
    except OSError:
        pass
    return out


# ---------- effect ----------

def measure(data: dict[str, Any]) -> None:
    """Sets effect (new, ok, ko, idle, used) and a short note on each active lesson."""
    from . import insights
    from .questions import answered
    _, summs = insights.latest()
    inj = injections()
    asked = answered(60)
    now = time.time()
    for x in data["lessons"]:
        if x.get("status") != "active":
            continue
        uses = [r for r in inj if x["id"] in r.get("ids", [])]
        x["injections"], x["lastInjected"] = len(uses), max((r["t"] for r in uses), default=None)
        x["agentsUsed"] = sorted({r["agent"] for r in uses})
        x["usesBy"] = {a: sum(1 for r in uses if r["agent"] == a) for a in x["agentsUsed"]}
        since_day, days = x.get("decidedDay") or _today(), (now - (x.get("decided") or now)) / 86_400
        before = (x.get("evidence") or {}).get("count", 0)
        trig = x.get("trigger") or {}
        after: int | None = None
        if x["kind"] == "error" and trig.get("sig"):
            after = insights.error_hits(summs, trig["tool"], trig["sig"], since_day)
        elif x["kind"] == "faq":
            kw = set(trig.get("question") or [])
            after = sum(1 for q in asked if q["created"] >= (x.get("decided") or now) and _similar(words(str(q.get("question", ""))), kw, 0.5))
        elif x["kind"] == "review":
            kw = set(trig.get("review") or [])
            after = sum(1 for r in _harvest["review"] if r["day"] >= since_day and r["project"] == (x.get("scope") or {}).get("project") and _similar(words(r["text"]), kw, 0.3))
        elif x["kind"] == "ci":
            after = sum(1 for b in _harvest["ci"] if b["day"] >= since_day and b["job"] == trig.get("job") and b["sig"] == trig.get("sig"))
        x["after"] = after
        if days < SETTLE_DAYS:
            x["effect"], x["note"] = "new", "trop récente pour juger"
        elif after is not None and before:
            rate_before, rate_after = before / 14, after / max(days, 1)
            ok = rate_after <= 0.4 * rate_before
            x["effect"] = "ok" if ok else "ko"
            x["note"] = f"{before} fois en 14 j avant → {after} depuis ({int(days)} j)"
        elif days >= IDLE_DAYS and not uses:
            x["effect"], x["note"] = "idle", f"jamais donnée à un agent en {IDLE_DAYS} j : à archiver ?"
        else:
            x["effect"], x["note"] = ("used", f"donnée {len(uses)} fois") if uses else ("new", "pas encore donnée")


def expertise(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Per agent type: the lessons it knows (its own + the shared ones it was given), the ones that work, a level."""
    per: dict[str, dict[str, Any]] = {}
    for x in data["lessons"]:
        if x.get("status") != "active":
            continue
        for agent in {(x.get("scope") or {}).get("agent") or "", *x.get("agentsUsed", [])} - {""}:
            b = per.setdefault(agent, {"agent": agent, "known": 0, "working": 0, "given": 0})
            b["known"] += 1; b["working"] += x.get("effect") == "ok"; b["given"] += (x.get("usesBy") or {}).get(agent, 0)
    for b in per.values():
        b["level"] = 1 + b["working"] // 2 + b["known"] // 5
    return sorted(per.values(), key=lambda b: (-b["level"], -b["known"]))


def overview(game: Any = None) -> dict[str, Any]:
    """What the page shows; starts a harvest in the background when the last one is old."""
    if game is not None:
        harvest_async(game)
    with _lock:
        data = load()
        try:
            measure(data)
        except Exception as err:  # a broken transcript must not hide the lessons
            _harvest["error"] = f"mesure : {err}"
        save(data)
    today = _today()
    return {"lessons": sorted(data["lessons"], key=lambda x: (x["status"] != "pending", -(x.get("decided") or x.get("created") or 0))),
            "expertise": expertise(data), "learnedToday": sum(1 for x in data["lessons"] if x.get("decidedDay") == today and x["status"] == "active"),
            "harvest": {"at": _harvest["at"], "running": _harvest["running"], "error": _harvest["error"]},
            "inject": bool(config.CFG.get("lessons", True))}

