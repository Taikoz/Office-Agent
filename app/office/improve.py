"""ChiefOS → 🧭 Process: one entry point for its tabs (cached TTL seconds each) and its actions.

Tabs: process (process.py), tickets (readiness.py), agents (agentversions.py), failures (failures.py),
context and models (efficiency.py), permissions (permissions.py), mmx (mmxhygiene.py).
"""

from __future__ import annotations

import threading
import time
from typing import Any

from . import agentversions, efficiency, failures, mmxhygiene, permissions, process, readiness

TTL = 300
TABS = ("process", "tickets", "agents", "failures", "context", "models", "permissions", "mmx")
_cache: dict[str, tuple[float, Any]] = {}
_locks = {t: threading.Lock() for t in TABS}


def get(tab: str, game: Any, tickets: Any, force: bool = False) -> dict[str, Any]:
    if tab not in TABS:
        raise ValueError("onglet inconnu")
    with _locks[tab]:
        hit = _cache.get(tab)
        if not force and hit and time.time() - hit[0] < TTL:
            return hit[1]
        data = {
            "process": lambda: process.compliance(game),
            "tickets": lambda: readiness.readiness(tickets, game),
            "agents": lambda: agentversions.versions(game),
            "failures": lambda: failures.failures(game, readiness.known_scores()),
            "context": lambda: efficiency.context(),
            "models": lambda: efficiency.models(game),
            "permissions": lambda: permissions.overview(),
            "mmx": lambda: mmxhygiene.hygiene(),
        }[tab]()
        data = {**data, "at": time.time()}
        _cache[tab] = (time.time(), data)
        return data


def forget(tab: str) -> None:
    _cache.pop(tab, None)


def act(data: dict[str, Any]) -> dict[str, Any]:
    """The page's actions: ignore a missing step, add / remove a permission rule, propose an MMX archive, an agent diff."""
    action = str(data.get("action", ""))
    if action == "ignore":
        forget("process")
        return process.ignore(str(data.get("key", "")))
    if action == "perm-add":
        forget("permissions")
        return permissions.add(str(data.get("rule", "")), bool(data.get("confirm")))
    if action == "perm-remove":
        forget("permissions")
        return permissions.remove(str(data.get("rule", "")))
    if action == "mmx-archive":
        forget("mmx")
        return mmxhygiene.propose_archive(str(data.get("id", "")), str(data.get("reason", "")) or "Hygiène MMX (Agent Office)")
    if action == "agent-diff":
        return agentversions.diff(str(data.get("agent", ""))[:80], str(data.get("hash", ""))[:20])
    return {"ok": False, "error": "action inconnue"}
