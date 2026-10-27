"""The integrations' tokens (GitLab, Sentry, Slack): sealed at rest, and only ever sent to the host they belong to.

At rest: STATE_DIR/<name>.json holds `sealed`, never the token. The key is HMAC-SHA256(vault.key, machine id), where
vault.key (32 random bytes, 0600) lives OUTSIDE ~/.claude (config.VAULT_KEY, ~/.local/share/agent-office/): a copy of
~/.claude (a backup, synced dotfiles, an archive an agent made, a `grep -r glpat- ~`) holds no usable token, and neither
does a copy of both folders taken to another machine. The seal is encrypt-then-MAC from the standard library only:
a keystream of HMAC-SHA256(key, "enc" | nonce | counter), then HMAC-SHA256(key, "mac" | nonce | ciphertext).
It is no defence against a program running as the user on this machine: that one can do what this server does.

In flight: open_authed() follows a redirect only on the same scheme, host and port; to any other place it is refused,
so the token header never leaves for another host (urllib alone copies every header to wherever a redirect points).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import platform
import secrets
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

PREFIX = "v1:"


def _machine_id() -> bytes:
    for p in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            v = Path(p).read_text(encoding="utf-8").strip()
            if v:
                return v.encode()
        except OSError:
            pass
    return f"{platform.node()}|{os.getuid() if hasattr(os, 'getuid') else os.getlogin()}".encode()


def _key() -> bytes:
    from . import config  # read at call time (the tests move it)
    f: Path = config.VAULT_KEY
    try:
        raw = f.read_bytes()
    except FileNotFoundError:
        raw = b""
    if len(raw) != 32:
        raw = secrets.token_bytes(32)
        f.parent.mkdir(parents=True, exist_ok=True)
        os.chmod(f.parent, 0o700)
        fd = os.open(f, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)  # never readable by another account, even for a moment
        with os.fdopen(fd, "wb") as out:
            out.write(raw)
    return hmac.new(raw, _machine_id(), hashlib.sha256).digest()


def _stream(key: bytes, nonce: bytes, n: int) -> bytes:
    out = bytearray()
    for i in range((n + 31) // 32):
        out += hmac.new(key, b"enc" + nonce + i.to_bytes(4, "big"), hashlib.sha256).digest()
    return bytes(out[:n])


def seal(token: str) -> str:
    key, nonce, data = _key(), secrets.token_bytes(16), token.encode()
    ct = bytes(a ^ b for a, b in zip(data, _stream(key, nonce, len(data))))
    tag = hmac.new(key, b"mac" + nonce + ct, hashlib.sha256).digest()
    return PREFIX + base64.urlsafe_b64encode(nonce + ct + tag).decode()


def unseal(sealed: str) -> str:
    """The token, or "" when it cannot be opened (another machine, a lost or new vault.key, a tampered file)."""
    if not isinstance(sealed, str) or not sealed.startswith(PREFIX):
        return ""
    try:
        raw = base64.urlsafe_b64decode(sealed[len(PREFIX):])
    except ValueError:
        return ""
    if len(raw) < 48:
        return ""
    key, nonce, ct, tag = _key(), raw[:16], raw[16:-32], raw[-32:]
    if not hmac.compare_digest(tag, hmac.new(key, b"mac" + nonce + ct, hashlib.sha256).digest()):
        return ""
    try:
        return bytes(a ^ b for a, b in zip(ct, _stream(key, nonce, len(ct)))).decode()
    except UnicodeDecodeError:
        return ""


def write(f: Path, data: dict[str, Any]) -> None:
    """data with its `token` sealed, to f (0600 from its creation, then moved in place)."""
    data = dict(data)
    if data.get("token"):
        data["sealed"] = seal(str(data.pop("token")))
    data.pop("token", None)
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as out:
        json.dump(data, out)
    os.replace(tmp, f)


def read(f: Path) -> dict[str, Any]:
    """The settings with the token opened in memory; a file from an older version (token in clear) is sealed now."""
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    if data.get("token"):  # written in clear by an older version
        write(f, data)
        return data
    token = unseal(data.pop("sealed", ""))
    return {**data, "token": token} if token else data


class _SameOrigin(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> Any:
        a, b = urllib.parse.urlparse(req.full_url), urllib.parse.urlparse(newurl)
        if (a.scheme, a.hostname, a.port) != (b.scheme, b.hostname, b.port):
            raise urllib.error.URLError(f"redirection vers {b.hostname or '?'} refusée (le jeton ne quitte pas {a.hostname})")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_opener = urllib.request.build_opener(_SameOrigin)


def open_authed(req: urllib.request.Request, timeout: float) -> Any:
    """urlopen for a request that carries a token: redirects only within the same origin."""
    return _opener.open(req, timeout=timeout)
