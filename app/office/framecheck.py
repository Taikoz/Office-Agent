"""Can a page be shown inside another one? For the ChiefOS browser: many sites forbid it (X-Frame-Options, CSP
frame-ancestors), and the page cannot read those headers itself. Only the response headers are looked at; nothing of
the page is returned. Token-protected (routes.py), so another website cannot make this server fetch addresses."""

from __future__ import annotations

import ipaddress
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

TIMEOUT = 5
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def verdict(headers: Any) -> tuple[bool, str]:
    """(embeddable, reason) from the response headers."""
    xfo = (headers.get("X-Frame-Options") or "").strip().upper()
    if xfo in ("DENY", "SAMEORIGIN") or xfo.startswith("ALLOW-FROM"):
        return False, f"X-Frame-Options: {xfo}"
    csp = " ".join(headers.get_all("Content-Security-Policy") or []) if hasattr(headers, "get_all") else headers.get("Content-Security-Policy", "")
    m = re.search(r"frame-ancestors\s+([^;]*)", csp or "", re.I)
    if m and "*" not in m.group(1).split():
        return False, f"frame-ancestors {m.group(1).strip()}"
    return True, ""


def public_host(host: str) -> bool:
    """True when every address the name resolves to is on the internet: this server never probes this machine, the
    internal network nor the cloud metadata address (169.254.169.254) for a page."""
    try:
        infos = socket.getaddrinfo(host, None)
    except (OSError, UnicodeError):
        return False
    return bool(infos) and all(ipaddress.ip_address(i[4][0].split("%")[0]).is_global for i in infos)


class _PublicRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> Any:
        target = urllib.parse.urlparse(newurl)
        if target.scheme not in ("http", "https") or not public_host(target.hostname or ""):
            raise urllib.error.URLError("redirection vers une adresse interne refusée")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_PublicRedirects)


def check(url: str) -> dict[str, Any]:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return {"embeddable": False, "reason": "adresse invalide"}
    if not public_host(parsed.hostname or ""):  # not fetched: the frame tries it, the page offers a real tab
        return {"embeddable": None, "reason": "adresse locale ou interne : non vérifiée", "final": url}
    hit = _cache.get(url)
    if hit and time.time() - hit[0] < 600:
        return hit[1]
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AgentOffice", "Accept": "text/html"})
    try:
        with _opener.open(req, timeout=TIMEOUT) as r:
            ok, why = verdict(r.headers)
            out = {"embeddable": ok, "reason": why, "final": r.geturl()}
    except urllib.error.HTTPError as err:
        ok, why = verdict(err.headers)
        out = {"embeddable": ok, "reason": why or f"HTTP {err.code}", "final": url}
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as err:
        out = {"embeddable": None, "reason": f"injoignable ({getattr(err, 'reason', err)})", "final": url}
    _cache[url] = (time.time(), out)
    return out
