"""Live view: main sessions active in the window, each with its subagents and game state."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from . import game
from .config import AUDIT_LOG, CLEAR_MARK, EXCLUDED, PROJECTS
from .mmx import mmx_storage
from .questions import pending_questions
from .transcripts import chief_state, first_prompt, subagent

GAME = game.Game(PROJECTS, EXCLUDED, lambda p: subagent(p, time.time()), AUDIT_LOG, mmx_storage)


def sessions(window: float) -> list[dict[str, Any]]:
    """List main sessions active within the window, each with its subagents."""
    now = time.time()
    cutoff = CLEAR_MARK.stat().st_mtime if CLEAR_MARK.exists() else 0.0
    questions = pending_questions()
    out = []
    for project in PROJECTS.iterdir() if PROJECTS.exists() else []:
        if not project.is_dir() or any(x in project.name for x in EXCLUDED):
            continue
        for main in project.glob("*.jsonl"):
            sub_dir = project / main.stem / "subagents"
            subs = sorted(sub_dir.glob("agent-*.jsonl")) if sub_dir.exists() else []
            latest = max([main.stat().st_mtime, *(s.stat().st_mtime for s in subs)])
            if now - latest > window or latest <= cutoff:
                continue
            prompt, first = first_prompt(main)
            agents = [{**subagent(s, now, questions), "game": GAME.agent(s)} for s in subs if cutoff < s.stat().st_mtime and now - s.stat().st_mtime <= window]
            out.append({
                "id": main.stem,
                "project": Path(first.get("cwd") or project.name).name,
                "cwd": first.get("cwd") or "",
                "title": (first.get("slug") or prompt[:60] or main.stem[:8]),
                "prompt": prompt[:200],
                "chief": {**chief_state(main, now, questions), "game": GAME.agent(main)},
                "agents": sorted(agents, key=lambda a: a.get("started") or ""),
                "updated": latest,
            })
    return sorted(out, key=lambda s: -s["updated"])
