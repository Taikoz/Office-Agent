"""Terminals for ChiefOS: a login shell in a pseudo-terminal per session, written and read by the page over HTTP.

Every call is token-protected (routes.py) and the server only listens on 127.0.0.1 with a checked Host header: a shell
is never reachable by another website. Linux and macOS (pty); not on Windows (no pseudo-terminal in the standard
library): the page says so. Output is kept in a ring buffer the page reads with an offset (long poll).
"""

from __future__ import annotations

import base64
import os
import secrets
import signal
import struct
import threading
import time
from pathlib import Path
from typing import Any

from .launcher import clean_env

MAX_SESSIONS = 6
BUF_MAX = 512_000          # bytes of output kept per terminal
IDLE_KILL = 3 * 3600       # a terminal nobody reads for 3 h is closed
_sessions: dict[str, "Term"] = {}
_lock = threading.Lock()


def available() -> bool:
    return os.name == "posix"


class Term:
    def __init__(self, pid: int, fd: int, cwd: str) -> None:
        self.pid, self.fd, self.cwd = pid, fd, cwd
        self.buf, self.base = bytearray(), 0       # base = offset of buf[0] in the whole output
        self.alive, self.used, self.started = True, time.time(), time.time()
        self.cond = threading.Condition()

    def end(self) -> int:
        return self.base + len(self.buf)


def _winsize(fd: int, rows: int, cols: int) -> None:
    import fcntl
    import termios
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", max(2, min(rows, 300)), max(10, min(cols, 500)), 0, 0))


def _reader(t: Term) -> None:
    import select
    while t.alive:
        try:
            ready, _, _ = select.select([t.fd], [], [], 1.0)
            if not ready:
                continue
            chunk = os.read(t.fd, 65536)
            if not chunk:
                raise OSError("eof")
        except OSError:
            t.alive = False
            break
        with t.cond:
            t.buf += chunk
            if len(t.buf) > BUF_MAX:
                cut = len(t.buf) - BUF_MAX
                del t.buf[:cut]
                t.base += cut
            t.cond.notify_all()
    with t.cond:
        t.cond.notify_all()
    try:
        os.waitpid(t.pid, os.WNOHANG)
    except OSError:
        pass


def _check_cwd(cwd: str) -> Path:
    home = Path.home().resolve()
    p = Path(cwd or "~").expanduser().resolve()
    if not p.is_dir():
        raise ValueError("dossier introuvable")
    if p != home and home not in p.parents:
        raise ValueError("le dossier doit être dans ton dossier personnel")
    return p


def open_term(cwd: str, rows: int = 30, cols: int = 100) -> dict[str, Any]:
    if not available():
        raise ValueError("terminal indisponible sur ce système (Windows : pas de pseudo-terminal)")
    path = _check_cwd(cwd)
    reap()
    with _lock:
        if sum(1 for t in _sessions.values() if t.alive) >= MAX_SESSIONS:
            raise ValueError(f"{MAX_SESSIONS} terminaux ouverts au plus : ferme-en un")
    import pty
    shell = os.environ.get("SHELL") or "/bin/bash"
    env = {**clean_env(dict(os.environ)), "TERM": "xterm-256color", "COLORTERM": "truecolor", "AGENT_OFFICE_TERMINAL": "1"}
    pid, fd = pty.fork()
    if pid == 0:  # child: straight to the shell (nothing else runs in a forked threaded process)
        try:
            os.chdir(path)
            os.execvpe(shell, [shell, "-l"], env)
        finally:
            os._exit(127)
    _winsize(fd, rows, cols)
    t = Term(pid, fd, str(path))
    tid = secrets.token_hex(6)
    with _lock:
        _sessions[tid] = t
    threading.Thread(target=_reader, args=(t,), daemon=True).start()
    return {"id": tid, "cwd": str(path), "shell": Path(shell).name}


def _get(tid: str) -> Term:
    t = _sessions.get(tid)
    if t is None:
        raise ValueError("terminal inconnu")
    t.used = time.time()
    return t


def read(tid: str, since: int, wait: float = 0.6) -> dict[str, Any]:
    """Output after offset `since` (base64), waiting up to `wait` s for some; `next` is the offset to ask next."""
    t = _get(tid)
    with t.cond:
        if since >= t.end() and t.alive:
            t.cond.wait(timeout=wait)
        start = max(since, t.base)
        data = bytes(t.buf[start - t.base:])
        return {"data": base64.b64encode(data).decode(), "next": t.end(), "lost": start > since, "alive": t.alive}


def write(tid: str, data: str) -> None:
    t = _get(tid)
    if not t.alive:
        raise ValueError("terminal fermé")
    os.write(t.fd, data.encode("utf-8", errors="replace"))


def resize(tid: str, rows: int, cols: int) -> None:
    t = _get(tid)
    _winsize(t.fd, rows, cols)


def close(tid: str) -> None:
    t = _sessions.pop(tid, None)
    if t is None:
        return
    t.alive = False
    for sig in (signal.SIGHUP, signal.SIGKILL):
        try:
            os.killpg(os.getpgid(t.pid), sig)
        except OSError:
            pass
        time.sleep(0.05)
    try:
        os.close(t.fd)
    except OSError:
        pass


def sessions() -> list[dict[str, Any]]:
    reap()
    return [{"id": k, "cwd": t.cwd, "alive": t.alive, "started": t.started} for k, t in _sessions.items()]


def reap() -> None:
    """Closes the terminals nobody read for a long time, and forgets the dead ones."""
    now = time.time()
    for k, t in list(_sessions.items()):
        if now - t.used > IDLE_KILL or (not t.alive and now - t.used > 60):
            close(k)
