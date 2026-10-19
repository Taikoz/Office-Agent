"""Agents waiting for a permission in their terminal (local).

The PermissionRequest hook (bin/office.py hook-permission) leaves one file per dialog in WAITING: the session, the tool
and a key of its input. The wait belongs to the transcript (main session or subagent) whose tool call with that key is
still open, and ends when the call gets its result (allowed, denied or interrupted). Without a matching call (a record
not written yet), the hook's agent_id, else the main session, waits for at most GRACE seconds, while its
transcript does not move. A shell command allowed but still running keeps its call open: found in the process list,
it no longer waits.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from .config import SAFE_ID, STATE_DIR, excluded

WAITING = STATE_DIR / "waiting"
MAX_AGE = 86_400
GRACE = 30  # an assistant record is written before its permission dialog: unmatched later, the dialog is answered


def call_key(name: str, data: dict[str, Any]) -> str:
    """Same key for a tool call in the transcript and in the hook: its tool and its main argument."""
    main = next((data[k] for k in ("command", "file_path", "notebook_path", "url", "pattern", "skill") if isinstance(data.get(k), str)), None)
    raw = main if main is not None else json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(f"{name}\0{raw}".encode()).hexdigest()[:16]


def probe(tool: str, data: dict[str, Any]) -> str:
    """The longest plain piece of a shell command (no quote, no backslash: the shell quotes them), to find it running."""
    cmd = str(data.get("command", "")) if tool == "Bash" else ""
    parts = re.findall(r"[^'\"\\\n$`]{8,}", cmd)
    return max(parts, key=len)[:80].strip() if parts else ""


def running(probes: set[str]) -> set[str]:
    """The probes found in the command line of a running process (`ps`; nothing found where it is missing)."""
    if not probes or sys.platform == "win32":
        return set()
    try:
        out = subprocess.run(["ps", "-ax", "-o", "command="], capture_output=True, text=True, timeout=3).stdout
    except (OSError, subprocess.SubprocessError):
        return set()
    return {p for p in probes if p in out}


def record(e: dict[str, Any], now: float | None = None) -> Path | None:
    """Keep one permission dialog from the hook's event; None when it is not one."""
    session, tool = str(e.get("session_id", "")), str(e.get("tool_name", ""))
    if not SAFE_ID.match(session) or not tool or excluded(str(e.get("cwd", ""))):
        return None
    data = e.get("tool_input") if isinstance(e.get("tool_input"), dict) else {}
    from .transcripts import describe_tool  # not at the top: the hook imports this module alone, as light as possible
    key = call_key(tool, data)
    agent = str(e.get("agent_id") or "")
    item = {"session": session, "agent": agent if SAFE_ID.match(agent) else "", "tool": tool, "key": key, "probe": probe(tool, data),
            "detail": describe_tool(tool, data)[:120], "cwd": str(e.get("cwd", "")), "created": now or time.time()}
    WAITING.mkdir(parents=True, exist_ok=True)
    path = WAITING / f"{session}-{key}.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(item, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)
    return path


def pending(now: float | None = None) -> dict[str, list[dict[str, Any]]]:
    """The dialogs of the last 24 h by session (older files are removed)."""
    now = now or time.time()
    out: dict[str, list[dict[str, Any]]] = {}
    for path in WAITING.glob("*.json") if WAITING.exists() else []:
        try:
            item = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if now - float(item.get("created", 0)) > MAX_AGE:
            path.unlink(missing_ok=True)
            continue
        out.setdefault(str(item.get("session", "")), []).append({**item, "path": str(path)})
    return out


def assign(items: list[dict[str, Any]], open_keys: dict[str, set[str]], mtimes: dict[str, float], now: float | None = None) -> dict[str, dict[str, Any]]:
    """Which transcript waits on which dialog: {"" (main session) or agent id: dialog}. A dialog already answered is
    removed, so that the same command run again later (allowed by then) is not taken for a wait.

    open_keys: open tool calls' keys per transcript; mtimes: last write per transcript (same ids)."""
    now = now or time.time()
    out: dict[str, dict[str, Any]] = {}
    busy = running({i["probe"] for i in items if i.get("probe") and now - float(i.get("created", 0)) > 3})
    for item in sorted(items, key=lambda i: i.get("created", 0)):
        owner = next((who for who, keys in open_keys.items() if item.get("key") in keys), None)
        if owner is not None and item.get("probe") in busy:  # allowed, and running
            owner = forget(item)
        elif owner is None:  # its call is not in a transcript yet (or already answered: the transcript moved since)
            who = item.get("agent") if item.get("agent") in mtimes else ""
            created = float(item.get("created", 0))
            # its agent unknown: any transcript of the session that moved may hold the answer
            moved = mtimes[who] > created + 2 if who else any(m > created + 2 for m in mtimes.values())
            owner = forget(item) if who not in mtimes or moved or now - created > GRACE else who
        if owner is not None:
            out[owner] = {k: item.get(k) for k in ("tool", "detail", "created")}
    return out


def forget(item: dict[str, Any]) -> None:
    """An answered dialog: its file goes."""
    if item.get("path"):
        Path(item["path"]).unlink(missing_ok=True)
