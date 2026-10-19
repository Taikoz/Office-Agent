"""ChiefOS → 🧭 Process → Process: are the delivery rules of CLAUDE.md followed? (read-only, local)

A rule: when an agent of type `when` delivered (on a project matching `project`, with an MR when `mr`), an agent of type
`then` must have worked on the same ticket or the same MR afterwards. Its default list follows the user's CLAUDE.md
(feature front → e2e tests, feature → security audit, MR → review); `process_rules` in ~/.claude/agent-office.json
replaces it. A ticket waits GRACE after the delivery before it is called missing. Plus: no Claude attribution in a
commit, an MR or a ticket comment. A missing step can be ignored (STATE_DIR/process.json) or launched from the page.
"""

from __future__ import annotations

import json
import re
import time
import zlib
from pathlib import Path
from typing import Any

from . import config, usage

DAYS = 30
GRACE = 2 * 3600
DEFAULT_RULES = [
    {"id": "guardian", "label": "Feature front → tests e2e", "when": ["feature-builder", "tech-lead"], "project": "front", "then": "guardian-test-writer"},
    {"id": "security", "label": "Feature livrée → audit sécurité", "when": ["feature-builder", "tech-lead"], "then": "security-auditor"},
    {"id": "review", "label": "MR ouverte → review", "when": ["feature-builder", "tech-lead"], "mr": True, "then": "mr-reviewer"},
]


def rules() -> list[dict[str, Any]]:
    custom = config.CFG.get("process_rules")
    if isinstance(custom, list) and custom:
        out = []
        for i, r in enumerate(custom):
            if isinstance(r, dict) and r.get("when") and r.get("then"):
                when = r["when"] if isinstance(r["when"], list) else [r["when"]]
                out.append({"id": str(r.get("id") or f"rule{i}"), "label": str(r.get("label") or f"{when[0]} → {r['then']}"), "when": [str(w) for w in when],
                            "then": str(r["then"]), "project": str(r.get("project") or ""), "mr": bool(r.get("mr"))})
        return out
    return DEFAULT_RULES


def _state_path() -> Path:
    return config.STATE_DIR / "process.json"


def _state() -> dict[str, Any]:
    try:
        data = json.loads(_state_path().read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def ignore(key: str) -> dict[str, Any]:
    """Never call this missing step again (a ticket with no front, a fix that needs no review…)."""
    data = _state()
    ignored = data.setdefault("ignored", {})
    ignored[key[:200]] = time.time()
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    _state_path().write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return {"ok": True}


def _mr_iid(url: str | None) -> str:
    """project path + MR number (numbers repeat from one repository to another)."""
    m = re.search(r"https?://[^/]+/(.+?)/-/merge_requests/(\d+)", url or "")
    return f"{m.group(1)}!{m.group(2)}" if m else ""


def work_items(game: Any, days: float = DAYS) -> list[dict[str, Any]]:
    """The subagent runs and the main sessions run as an agent (`claude --agent x`), in one shape."""
    items = []
    for r in usage.agent_runs(game, days):
        u = r["usage"]
        items.append({"type": r["type"], "ticket": r["ticket"] or u.get("ticket"), "projects": r["repos"] or [r["project"]], "first": r["first"] or r["last"],
                      "last": r["last"], "done": r["status"] == "done", "mr": r["mr"] or next(iter(u.get("mrCreated") or []), None),
                      "mrRead": [x for x in [r.get("mrSeen"), *(u.get("mrRead") or [])] if x], "description": r["description"], "session": r["session"], "id": r["id"]})
    now = time.time()
    for u in usage.summaries(days):
        if u["sub"] or not u["agent"]:
            continue
        mr = next(iter(u.get("mrCreated") or []), None)
        repo = re.search(r"/([^/]+)/-/merge_requests/", mr or "")
        items.append({"type": u["agent"], "ticket": u.get("ticket"), "projects": [repo.group(1) if repo else u["project"]], "first": u["first"] or u["last"], "last": u["last"],
                      "done": now - (u["last"] or 0) > 900, "mr": next(iter(u.get("mrCreated") or []), None), "mrRead": u.get("mrRead") or [],
                      "description": f"session claude --agent {u['agent']}", "session": u["session"], "id": u["id"]})
    return items


def _matches(item: dict[str, Any], project: str) -> bool:
    if not project:
        return True
    p = project.lower()
    return any(p in (x or "").lower() for x in item["projects"]) or p in (item["description"] or "").lower()


def compliance(game: Any, days: float = DAYS) -> dict[str, Any]:
    items = work_items(game, days)
    ignored = _state().get("ignored", {})
    now, out = time.time(), []
    for rule in rules():
        ok, missing, waiting = 0, [], 0
        seen: set[str] = set()
        for it in sorted((i for i in items if i["type"] in rule["when"] and i["done"] and _matches(i, rule.get("project", ""))), key=lambda i: -(i["last"] or 0)):
            if rule.get("mr") and not it["mr"]:
                continue
            ref = it["ticket"] or it["mr"]
            if not ref or ref in seen:  # one check per ticket (several runs on it: the latest)
                continue
            seen.add(ref)
            iid = _mr_iid(it["mr"])
            follow = [o for o in items if o["type"] == rule["then"] and (o["last"] or 0) >= (it["first"] or 0) - 3600
                      and ((it["ticket"] and (o["ticket"] == it["ticket"] or it["ticket"] in (o["description"] or "")))
                           or (iid and any(_mr_iid(u) == iid for u in [o["mr"], *o["mrRead"]]))
                           or (it["mr"] and it["mr"] in (o["description"] or "")))]
            key = f"{rule['id']}|{ref}"
            if follow:
                ok += 1
            elif key in ignored:
                continue
            elif now - (it["last"] or 0) < GRACE:
                waiting += 1
            else:
                missing.append({"key": key, "ticket": it["ticket"], "mr": it["mr"], "project": it["projects"][0] if it["projects"] else "",
                                "by": it["type"], "at": it["last"], "description": (it["description"] or "")[:140]})
        total = ok + len(missing)
        out.append({**rule, "ok": ok, "waiting": waiting, "missing": missing[:30], "rate": round(100 * ok / total) if total else None})
    attributions = []
    for u in usage.summaries(days):
        for cmd in u.get("attributions") or []:
            key = f"attr|{u['id']}|{zlib.crc32(cmd.encode()):08x}"
            if key not in ignored:
                attributions.append({"key": key, "project": u["project"], "agent": u["agent"] or "session principale", "at": u["last"], "command": cmd[:200]})
    return {"days": days, "rules": out, "attributions": sorted(attributions, key=lambda a: -(a["at"] or 0))[:30],
            "custom": bool(config.CFG.get("process_rules"))}
