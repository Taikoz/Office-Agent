"""YouTrack ticket states, fetched in the background through yt.py (read-only)."""

from __future__ import annotations

import sys
import threading
import time
import urllib.parse
from typing import Any

from .config import CFG, YT_TOOLS

BACKLOG_QUERIES: list[str] = CFG["youtrack_backlog_query"]  # one or several queries, results merged
BACKLOG_STATES = ("Submitted", "Open", "To Do", "Reopened", "Backlog")
BACKLOG_FRESH = 300


class TicketStates:
    """Cache of YouTrack states, fetched in the background through yt.py (read-only)."""

    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled = bool(enabled and YT_TOOLS and (YT_TOOLS / "yt.py").exists())
        self.cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self.lock = threading.Lock()
        self.yt = None
        self.backlog_cache: tuple[float, list[dict[str, Any]]] = (0.0, [])
        if enabled:
            sys.path.insert(0, str(YT_TOOLS))
            try:
                import yt
                self.yt = yt
            except ImportError:
                self.enabled = False

    def backlog(self) -> list[dict[str, Any]]:
        """My open tickets not started yet (Submitted, Open…), newest first; refreshed in the background every 5 min."""
        if self.enabled and BACKLOG_QUERIES and time.time() - self.backlog_cache[0] > BACKLOG_FRESH:
            self.backlog_cache = (time.time(), self.backlog_cache[1])
            threading.Thread(target=self.fetch_backlog, daemon=True).start()
        return self.backlog_cache[1]

    def fetch_backlog(self) -> None:
        issues: dict[str, dict[str, Any]] = {}
        for raw in BACKLOG_QUERIES:
            query = urllib.parse.quote(raw)
            try:
                found = self.yt.call("GET", f"/issues?query={query}&$top=40&fields=idReadable,summary,updated,customFields(name,value(name))")
            except Exception:
                return
            issues.update((i["idReadable"], i) for i in found)
        out = []
        for issue in issues.values():
            fields = {c["name"]: (c.get("value") or {}) for c in issue.get("customFields", [])}
            state = fields.get("State")
            state = state.get("name") if isinstance(state, dict) else None
            if state in BACKLOG_STATES:
                out.append({"id": issue["idReadable"], "summary": issue.get("summary", ""), "state": state, "updated": issue.get("updated")})
        self.backlog_cache = (time.time(), sorted(out, key=lambda i: -(i["updated"] or 0)))

    def base_url(self) -> str | None:
        """YouTrack web URL, for links to the tickets."""
        return self.yt.base_url() if self.yt else None

    def get(self, ids: set[str]) -> dict[str, dict[str, Any]]:
        """Return known states and refresh stale ones in the background."""
        now = time.time()
        stale = [i for i in ids if now - self.cache.get(i, (0, {}))[0] > 120]
        if self.enabled and stale:
            with self.lock:
                for i in stale:
                    self.cache[i] = (now, self.cache.get(i, (0, {}))[1])
            threading.Thread(target=self.fetch, args=(stale,), daemon=True).start()
        return {i: self.cache[i][1] for i in ids if i in self.cache and self.cache[i][1]}

    def fetch(self, ids: list[str]) -> None:
        """Fetch summary and state of each ticket."""
        for issue_id in ids:
            try:
                issue = self.yt.call("GET", f"/issues/{issue_id}?fields=summary,customFields(name,value(name))")
            except Exception:
                continue
            fields = {c["name"]: (c.get("value") or {}) for c in issue.get("customFields", [])}
            state = fields.get("State")
            with self.lock:
                self.cache[issue_id] = (time.time(), {
                    "summary": issue.get("summary", ""),
                    "state": state.get("name") if isinstance(state, dict) else None,
                })
