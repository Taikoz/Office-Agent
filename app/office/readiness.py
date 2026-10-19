"""ChiefOS → 🧭 Process → Tickets: is a ticket ready to be handed to an agent? (YouTrack read-only, local)

A score out of 100 from what the ticket says: a real description, acceptance criteria, steps to reproduce (a bug) or
a mockup (a feature), concrete pointers (files, endpoints, components), a known project, links; minus the open questions
("TBD", "à définir", a question mark) and a ticket too big for one mission. Then a chance of success from history: the
agents' tickets of the last DAYS are scored the same way, and the delivered share of those with a close score (and on
the same project) says how such a ticket usually ends. Ticket texts are cached on disk (STATE_DIR/readiness.json).
"""

from __future__ import annotations

import json
import re
import threading
import time
from pathlib import Path
from typing import Any

from . import config

DAYS = 30
TTL = 900                 # seconds before a ticket's text is fetched again
MAX_FETCH = 25            # ticket texts fetched per computation (the rest next time)
CRITERIA = re.compile(r"crit[eè]res? d.acceptation|acceptance criteria|definition of done|\bDoD\b|\bAC\s*[:\d]|- \[ \]|\bgiven\b.*\bwhen\b.*\bthen\b|étant donné|\bdoit\b|\bdevrait\b|\bshould\b|\bmust\b|attendu\s*:", re.I | re.S)
REPRO = re.compile(r"étapes|steps to reproduce|reproduire|\brepro\b|comportement attendu|expected|actual|obtenu|constat", re.I)
VISUAL = re.compile(r"figma|maquette|mockup|capture|screenshot|\.png|\.jpg|wireframe|design", re.I)
POINTERS = re.compile(r"`[^`]{2,}`|\b[\w-]+/[\w./-]+\.\w{1,5}\b|/api/[\w/{}-]+|\b[A-Z][a-z]+(?:[A-Z][a-z]+){1,}\b|\b\w+\(\)")
OPEN = re.compile(r"\bTBD\b|\bTODO\b|à définir|à voir|à préciser|à confirmer|\?\?|on ne sait pas|pas clair|\bmaybe\b|peut-être", re.I)
BUILDERS = ("feature-builder", "tech-lead")  # the agents whose missions start from a ticket and end with an MR
TAGS = re.compile(r"<[^>]+>|!\[[^\]]*\]\([^)]*\)")

_lock = threading.Lock()


def _path() -> Path:
    return config.STATE_DIR / "readiness.json"


def _load() -> dict[str, Any]:
    try:
        data = json.loads(_path().read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _save(data: dict[str, Any]) -> None:
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = _path().with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(_path())


def score(summary: str, description: str, kind: str = "", projects: list[str] = (), links: int = 0) -> dict[str, Any]:
    """The readiness of one ticket: score 0..100 and what helps / what is missing."""
    desc = TAGS.sub(" ", description or "")
    text = f"{summary}\n{desc}"
    plus, minus, pts = [], [], 0
    n = len(desc.strip())
    if n >= 200:
        pts += 25; plus.append("description détaillée")
    elif n >= 60:
        pts += 12; minus.append("description courte")
    else:
        minus.append("description vide ou presque")
    if CRITERIA.search(desc):
        pts += 20; plus.append("critères d'acceptation")
    else:
        minus.append("pas de critère d'acceptation (ce qui doit marcher à la fin)")
    bug = "bug" in kind.lower()
    if bug:
        if REPRO.search(desc):
            pts += 15; plus.append("étapes pour reproduire")
        else:
            minus.append("bug sans étapes pour reproduire ni comportement attendu")
    elif VISUAL.search(desc):
        pts += 10; plus.append("maquette / capture")
    else:
        pts += 5
    found = len(set(POINTERS.findall(desc)))
    if found >= 2:
        pts += 15; plus.append(f"{found} repères concrets (fichiers, endpoints, composants)")
    elif found:
        pts += 7
    else:
        minus.append("aucun repère concret (fichier, endpoint, composant)")
    low = text.lower()
    known = [p for p in projects if len(p) >= 4 and p.lower() in low] or re.findall(r"^\[([\w .-]{3,30})\]", summary.strip())
    if known:
        pts += 15; plus.append(f"projet nommé : {known[0]}")
    else:
        minus.append("projet / dépôt non nommé")
    if links:
        pts += 5; plus.append("tickets liés")
    opened = OPEN.findall(text) + re.findall(r"\?\s*$", desc, re.M)
    if opened:
        pts -= min(20, 8 * len(opened)); minus.append(f"{len(opened)} question(s) ouverte(s) / TBD")
    if n > 6000 or desc.count("\n- ") + desc.count("\n* ") > 25:
        pts -= 10; minus.append("ticket très gros : le découper en plusieurs missions")
    return {"score": max(0, min(100, pts + 5)), "plus": plus, "minus": minus}


def _fetch(yt: Any, tid: str) -> dict[str, Any] | None:
    try:
        issue = yt.call("GET", f"/issues/{tid}?fields=idReadable,summary,description,updated,links(issues(idReadable)),customFields(name,value(name))")
    except Exception:  # noqa: BLE001 - yt.py raises its own errors (network, auth)
        return None
    fields = {c["name"]: (c.get("value") or {}) for c in issue.get("customFields", [])}
    kind = fields.get("Type")
    return {"summary": issue.get("summary", ""), "description": (issue.get("description") or "")[:12000], "kind": kind.get("name", "") if isinstance(kind, dict) else "",
            "links": sum(len(lk.get("issues") or []) for lk in issue.get("links") or []), "updated": issue.get("updated"), "at": time.time()}


def projects() -> list[str]:
    """The repositories the agents work in (from Claude Code's project folders)."""
    from .history import project_name
    root = config.PROJECTS
    return sorted({project_name(p.name) for p in root.iterdir() if p.is_dir()} - {"", "repos"}) if root.exists() else []


def readiness(tickets: Any, game: Any, extra: list[str] = ()) -> dict[str, Any]:
    """The backlog's tickets (and `extra` ids) scored, with a chance of success learnt from the agents' past tickets."""
    from .process import work_items
    if not getattr(tickets, "enabled", False) or tickets.yt is None:
        return {"enabled": False, "items": []}
    with _lock:
        cache = _load()
        texts = cache.setdefault("tickets", {})
        backlog = tickets.backlog()
        ids = [b["id"] for b in backlog] + [i for i in extra if config.TICKET_RE.fullmatch(i)]
        items = work_items(game, DAYS)
        done_by_ticket: dict[str, list[bool]] = {}
        proj_by_ticket: dict[str, str] = {}
        for it in items:
            if it["ticket"] and it["type"] in BUILDERS:  # delivered = it ended with an MR
                done_by_ticket.setdefault(it["ticket"], []).append(bool(it["done"] and it["mr"]))
                proj_by_ticket.setdefault(it["ticket"], (it["projects"] or [""])[0])
        fetched = 0
        for tid in [*ids, *done_by_ticket]:
            hit = texts.get(tid)
            if (hit is None or time.time() - hit.get("at", 0) > TTL * (20 if tid not in ids else 1)) and fetched < MAX_FETCH:
                fresh = _fetch(tickets.yt, tid)
                fetched += 1
                if fresh:
                    texts[tid] = fresh
        _save(cache)
    projs = projects()
    scored = lambda tid: score(texts[tid]["summary"], texts[tid]["description"], texts[tid]["kind"], projs, texts[tid]["links"])  # noqa: E731
    # history: each past ticket's score and how its missions ended (delivered if its last run was delivered)
    past = [(scored(t)["score"], any(runs), proj_by_ticket.get(t, "")) for t, runs in done_by_ticket.items() if t in texts]
    base = round(100 * sum(d for _, d, _ in past) / len(past)) if past else None
    out = []
    for b in [*backlog, *({"id": i, "summary": texts.get(i, {}).get("summary", ""), "state": ""} for i in extra if i in texts)]:
        tid = b["id"]
        if tid not in texts:
            out.append({**b, "score": None})
            continue
        r = scored(tid)
        close = [d for s, d, _ in past if abs(s - r["score"]) <= 15]
        chance = round(100 * sum(close) / len(close)) if len(close) >= 3 else None
        out.append({**b, "kind": texts[tid]["kind"], **r, "chance": chance, "similar": len(close)})
    out.sort(key=lambda x: (x.get("score") is None, x.get("score") or 0))
    buckets = []
    for lo, hi, label in ((0, 40, "flou (< 40)"), (40, 70, "moyen (40-69)"), (70, 101, "prêt (≥ 70)")):
        b = [d for s, d, _ in past if lo <= s < hi]
        buckets.append({"label": label, "n": len(b), "rate": round(100 * sum(b) / len(b)) if b else None})
    return {"enabled": True, "items": out, "base": base, "past": len(past), "buckets": buckets}


def known_scores() -> dict[str, int]:
    """The score of every ticket whose text is cached (no fetch): for the failures' causes."""
    texts = _load().get("tickets", {})
    projs = projects()
    return {tid: score(t["summary"], t["description"], t["kind"], projs, t["links"])["score"] for tid, t in texts.items() if isinstance(t, dict) and "summary" in t}
