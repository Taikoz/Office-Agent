"""Runs of the past days (read-only): the evening report and the history of one ticket."""

from __future__ import annotations

import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterator

from .config import EXCLUDED, PROJECTS
from .game import Game


def runs(game: Game, days: float) -> Iterator[dict[str, Any]]:
    """Every subagent run touched in the last `days` (excluded projects skipped), with its outcome."""
    now = time.time()
    for project in PROJECTS.iterdir() if PROJECTS.exists() else []:
        if not project.is_dir() or any(x in project.name for x in EXCLUDED):
            continue
        for path in project.glob("*/subagents/agent-*.jsonl"):
            if now - path.stat().st_mtime > days * 86_400:
                continue
            yield run_info(game, path)


def run_info(game: Game, path: Path) -> dict[str, Any]:
    info, r = game.status(path), game.run(path)
    kinds = [e["kind"] for e in r.all_events()]
    return {"session": path.parent.parent.name, "id": info["id"], "type": info["type"], "description": info["description"],
            "ticket": info["ticket"], "status": info["status"], "first": r.first, "last": r.last or path.stat().st_mtime,
            "mr": r.mr_url, "tests": r.tests, "files": len(r.files), "errors": r.errors, "cost": round(r.cost, 2),
            "verify": "to_verify" in kinds, "asks": kinds.count("ask"), "lastError": info.get("lastError", "")}


def report(game: Game, day: str) -> dict[str, Any]:
    """What the agents did on `day` (YYYY-MM-DD, local time)."""
    start = datetime.strptime(day, "%Y-%m-%d").timestamp()
    end = (datetime.fromtimestamp(start) + timedelta(days=1)).timestamp()
    items = sorted((r for r in runs(game, (time.time() - start) / 86_400 + 1)
                    if r["last"] >= start and (r["first"] or r["last"]) < end), key=lambda r: r["first"] or 0)
    done = [r for r in items if r["status"] == "done"]
    return {
        "day": day, "runs": items,
        "delivered": done,
        "mrs": [r for r in items if r["mr"]],
        "verified": sorted({r["ticket"] for r in items if r["verify"] and r["ticket"]}),
        "stuck": [r for r in items if r["status"] in ("blocked", "gone")],
        "active": [r for r in items if r["status"] in ("working", "asking")],
        "questions": sum(r["asks"] for r in items),
        "seconds": round(sum(((r["last"] or 0) - (r["first"] or r["last"] or 0)) for r in items)),
        "cost": round(sum(r["cost"] for r in items), 2),
    }


def ticket(game: Game, ticket_id: str) -> list[dict[str, Any]]:
    """Every agent run on one ticket over the last 30 days, oldest first."""
    return sorted((r for r in runs(game, 30) if r["ticket"] == ticket_id or ticket_id in (r["description"] or "")),
                  key=lambda r: r["first"] or 0)


def search(game: Game, query: str, days: float = 7) -> list[dict[str, Any]]:
    """Runs whose edited files, shell commands, mission or ticket contain `query` (case-insensitive), newest first."""
    q = query.lower()
    now, out = time.time(), []
    for project in PROJECTS.iterdir() if PROJECTS.exists() else []:
        if not project.is_dir() or any(x in project.name for x in EXCLUDED):
            continue
        for path in project.glob("*/subagents/agent-*.jsonl"):
            if now - path.stat().st_mtime > days * 86_400:
                continue
            r = game.run(path)
            files = [f for f in r.files if q in f.lower()]
            commands = [c for c, _ in r.commands if q in c.lower()]
            info = run_info(game, path)
            meta = q in f"{info['description']} {info['ticket'] or ''}".lower()
            if files or commands or meta:
                out.append({**info, "matchFiles": files[:6], "matchCommands": commands[-4:]})
    return sorted(out, key=lambda r: -(r["last"] or 0))[:40]
