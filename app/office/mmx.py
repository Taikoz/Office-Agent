"""MMX memory, read-only, plus approve/apply of proposals on the user's click."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

from .config import MMX, MMX_LABELS

MMX_CACHE: dict[str, Any] = {"stamp": None, "data": None}


def mmx_files() -> dict[str, Path]:
    """Map each MMX module to its file, as declared by INDEX.json (read-only)."""
    if MMX is None:
        return {}
    try:
        modules = json.loads((MMX / "INDEX.json").read_text(encoding="utf-8")).get("modules", {})
    except (OSError, ValueError):
        return {}
    return {mod: MMX / rel for mod, rel in modules.items() if isinstance(rel, str) and ".." not in rel}


def mmx_storage() -> dict[str, Any]:
    """Return what MMX stores (entries per module) and the proposals waiting for approval (cached on mtime)."""
    if MMX is None:
        return {"stamp": 0.0, "modules": [], "pending": [], "disabled": True}
    files = mmx_files()
    paths = [*files.values(), MMX / "staging" / "PROPOSALS.json"]
    stamp = max((f.stat().st_mtime for f in paths if f.exists()), default=0.0)
    if MMX_CACHE["stamp"] == stamp:
        return MMX_CACHE["data"]
    keys = ("id", "t", "d", "tags", "p", "st", "s", "c", "r", "created", "updated")
    modules = []
    for mod, path in files.items():
        try:
            entries = json.loads(path.read_text(encoding="utf-8")).get("entries", [])
        except (OSError, ValueError):
            entries = []
        modules.append({"id": mod, "label": MMX_LABELS.get(mod, mod),
                        "entries": [{k: e.get(k) for k in keys} for e in entries if isinstance(e, dict)]})
    try:
        proposals = json.loads((MMX / "staging" / "PROPOSALS.json").read_text(encoding="utf-8")).get("proposals", [])
    except (OSError, ValueError):
        proposals = []
    pending = [{"id": p.get("proposal_id"), "op": p.get("op"), "target": p.get("target_id"), "reason": p.get("reason"),
                "d": (p.get("after") or {}).get("d") or (p.get("before") or {}).get("d"), "created": p.get("created"),
                "status": p.get("status")}
               for p in proposals if isinstance(p, dict) and p.get("status") in ("pending", "approved")]
    data = {"stamp": stamp, "modules": modules, "pending": pending}
    MMX_CACHE.update(stamp=stamp, data=data)
    return data


PROPOSAL_RE = re.compile(r"^PR-\d{4}$")
MMX_LOCK = threading.Lock()


def mmx_validate(ids: list[str]) -> tuple[bool, str]:
    """Approve then apply MMX proposals through mmx.py, on the user's click in the page."""
    if MMX is None:
        return False, "mémoire MMX non configurée (clé « mmx » de ~/.claude/agent-office.json)"
    with MMX_LOCK:
        statuses = {p["id"]: p["status"] for p in mmx_storage()["pending"]}
        if not ids or any(not PROPOSAL_RE.match(i) or i not in statuses for i in ids):
            return False, "proposition inconnue ou déjà traitée"
        try:
            return run_mmx(ids, statuses)
        except (OSError, subprocess.SubprocessError) as err:
            return False, f"mmx.py n'a pas pu tourner : {err}"


def run_mmx(ids: list[str], statuses: dict[str, str]) -> tuple[bool, str]:
    """Run mmx.py approve (pending ones only) then apply; stop at the first failure."""
    tool = [sys.executable, "-I", str(MMX / "tools" / "mmx.py")]
    out = []
    to_approve = [i for i in ids if statuses[i] == "pending"]
    for cmd in ([[*tool, "approve", *to_approve]] if to_approve else []) + [[*tool, "apply", *ids]]:
        run = subprocess.run(cmd, cwd=MMX, capture_output=True, text=True, timeout=60)
        out.append((run.stdout + run.stderr).strip())
        if run.returncode:
            return False, "\n".join(out)
    return True, "\n".join(out)
