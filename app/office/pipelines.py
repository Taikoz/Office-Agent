"""GitLab state of the MRs opened by agents (head pipeline, merged or not), fetched in the background through gl.py (read-only)."""

from __future__ import annotations

import re
import sys
import threading
import time
from typing import Any

from .config import GL_TOOLS

MR_URL = re.compile(r"^https://(?P<host>[^/]+)/(?P<path>.+?)/-/merge_requests/(?P<iid>\d+)$")
FRESH = 60  # seconds before a state is fetched again


class Pipelines:
    def __init__(self) -> None:
        self.cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self.lock = threading.Lock()
        self.gl = None
        if GL_TOOLS and (GL_TOOLS / "gl.py").exists():
            sys.path.insert(0, str(GL_TOOLS))
            try:
                import gl
                self.gl = gl
            except ImportError:
                pass

    def get(self, urls: set[str]) -> dict[str, dict[str, Any]]:
        """Known states; stale ones are refreshed in the background."""
        now = time.time()
        stale = [u for u in urls if MR_URL.match(u) and now - self.cache.get(u, (0, {}))[0] > FRESH]
        if self.gl and stale:
            with self.lock:
                for u in stale:
                    self.cache[u] = (now, self.cache.get(u, (0, {}))[1])
            threading.Thread(target=self.fetch, args=(stale,), daemon=True).start()
        return {u: self.cache[u][1] for u in urls if u in self.cache and self.cache[u][1]}

    def fetch(self, urls: list[str]) -> None:
        for url in urls:
            m = MR_URL.match(url)
            try:
                mr = self.gl.call(m["host"], "GET", f"/projects/{self.gl.encoded(m['path'])}/merge_requests/{m['iid']}")
            except Exception:
                continue
            pipe = mr.get("head_pipeline") or {}
            with self.lock:
                self.cache[url] = (time.time(), {"state": mr.get("state"), "ci": pipe.get("status"), "ciUrl": pipe.get("web_url"),
                                                 "draft": mr.get("draft")})
