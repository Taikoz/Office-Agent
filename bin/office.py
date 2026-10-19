#!/usr/bin/env python3
"""Agent Office launcher, used by the plugin hooks and the /office command.

    office.py hook-launch    PreToolUse(Agent): add the validated lessons to the subagent's prompt, start the server if
                             needed, open the page if no tab is watching
    office.py hook-lessons   PreToolUse(Agent): only add the validated lessons to the subagent's prompt (lessons.py)
    office.py hook-session   SessionStart: refresh the ask.py shim; on /clear, empty the office
    office.py open           start if needed and always open the page (prints the URL)
    office.py ensure         start if needed, open only if no tab is watching (used by ask.py)
    office.py status | stop

Hooks read the event JSON on stdin and never fail the session: any problem is logged and the hook exits 0.
"""

from __future__ import annotations

import contextlib
import json
import re
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path, PurePath

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
sys.path.insert(0, str(APP))
from office import config  # noqa: E402

CFG = config.CFG
PORT = int(os.environ.get("AGENT_OFFICE_PORT") or CFG["port"])
URL = f"http://127.0.0.1:{PORT}/"
STATE = config.STATE_DIR
LOG = STATE / "server.log"
PID = STATE / "server.pid"


def up() -> bool:
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def ours() -> bool:
    """The process on the port is an Agent Office (and not another app)."""
    try:
        with urllib.request.urlopen(f"{URL}api/viewer", timeout=1) as r:
            return "idle" in json.load(r)
    except (OSError, ValueError):
        return False


def running_version() -> str:
    """Version of the Agent Office holding the port ("0" for one from before 0.5.2, which did not tell it)."""
    try:
        with urllib.request.urlopen(f"{URL}api/viewer", timeout=1) as r:
            return str(json.load(r).get("version") or "0")
    except (OSError, ValueError, AttributeError):
        return "0"


def vkey(version: str) -> tuple[int, ...]:
    """'0.5.10' → (0, 5, 10), for comparing versions."""
    return tuple(int(p) for p in re.findall(r"\d+", version)[:4]) or (0,)


def older(running: str, mine: str) -> bool:
    """The running server comes from an older plugin version: it would keep serving its old page after an update."""
    return vkey(running) < vkey(mine)


def stop_server() -> bool:
    """Stops the server this plugin started (its pid is in STATE); True once the port is free."""
    if PID.exists():
        try:
            os.kill(int(PID.read_text()), signal.SIGTERM)
        except (OSError, ValueError):
            pass
        PID.unlink(missing_ok=True)
    for _ in range(30):
        if not up():
            return True
        time.sleep(0.1)
    return not up()


def viewed() -> bool:
    """An open tab polls /api/state every 2 s (a hidden one about once a minute): 90 s avoids duplicate tabs."""
    try:
        with urllib.request.urlopen(f"{URL}api/viewer", timeout=1) as r:
            return json.load(r)["idle"] <= 90
    except (OSError, ValueError, KeyError):
        return False


def start() -> bool:
    if up():
        if not ours():
            return False
        if not older(running_version(), config.VERSION) or not stop_server():
            return True  # same or newer version (or one we did not start): kept
    # (an older version was stopped above: this one replaces it)
    STATE.mkdir(parents=True, exist_ok=True)
    kw: dict = {"stdin": subprocess.DEVNULL, "stdout": LOG.open("ab"), "stderr": subprocess.STDOUT}
    if os.name == "nt":
        kw["creationflags"] = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    proc = subprocess.Popen([sys.executable, "-I", "-X", "utf8", str(APP / "server.py"), "--port", str(PORT)], **kw)
    PID.write_text(str(proc.pid))
    for _ in range(40):
        if up():
            return True
        time.sleep(0.1)
    return False


def open_page() -> None:
    if os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY") or sys.platform in ("darwin", "win32"):
        webbrowser.open_new(URL)


def shim_body(target: PurePath) -> str:
    """Python source forwarding to `target`; the path is only ever written as a repr, so Windows backslashes are safe."""
    return (f"# Shim written by the Agent Office plugin: forwards to {target.as_posix()}\nimport runpy, sys\n"
            f"sys.argv[0] = {str(target)!r}\nrunpy.run_path({str(target)!r}, run_name=\"__main__\")\n")


def write_shim() -> None:
    """Stable paths (~/.claude/agent-office/ask.py, office.py) whatever the plugin version folder is."""
    STATE.mkdir(parents=True, exist_ok=True)
    for name, target in (("ask.py", APP / "ask.py"), ("office.py", Path(__file__).resolve())):
        shim = STATE / name
        body = shim_body(target)
        if not shim.exists() or shim.read_text(encoding="utf-8", errors="replace") != body:
            shim.write_text(body, encoding="utf-8")


def lessons_for(e: dict) -> dict | None:
    """PreToolUse(Agent): the subagent's input with the validated lessons that fit its mission (lessons.py), or None."""
    try:
        from office import lessons
        return lessons.hook_output(e)
    except Exception as err:  # a broken lessons file never blocks an agent
        STATE.mkdir(parents=True, exist_ok=True)
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(f"office.py lessons: {err!r}\n")
        return None


@contextlib.contextmanager
def quiet_stdout():
    """Sends this process's and its children's stdout to /dev/null for the duration."""
    sys.stdout.flush()
    saved = os.dup(1)
    try:
        with open(os.devnull, "w") as null:
            os.dup2(null.fileno(), 1)
            yield
    finally:
        sys.stdout.flush()
        os.dup2(saved, 1)
        os.close(saved)


def event() -> dict:
    try:
        data = json.loads(sys.stdin.read() or "{}")
        return data if isinstance(data, dict) else {}
    except ValueError:
        return {}


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "open"
    try:
        if cmd == "hook-launch":
            e = event()
            if config.excluded(str(e.get("cwd", ""))):
                return 0
            out = lessons_for(e)
            with quiet_stdout():  # the hook's stdout must be the lessons' JSON alone (the browser opener may print)
                write_shim()
                if start() and CFG["open_browser"] and not viewed():
                    open_page()
            if out:
                print(json.dumps(out, ensure_ascii=False), flush=True)
        elif cmd == "hook-lessons":  # the lessons alone, for a PreToolUse(Agent) hook set by hand (no server started)
            e = event()
            out = None if config.excluded(str(e.get("cwd", ""))) else lessons_for(e)
            if out:
                print(json.dumps(out, ensure_ascii=False), flush=True)
        elif cmd == "hook-session":
            e = event()
            write_shim()
            if e.get("source") == "clear" and not config.excluded(str(e.get("cwd", ""))):
                STATE.mkdir(parents=True, exist_ok=True)
                config.CLEAR_MARK.touch()
        elif cmd == "ensure":
            if start() and CFG["open_browser"] and not viewed():
                open_page()
        elif cmd == "open":
            write_shim()
            if not start():
                # exit 0: the message is the answer, and /office must not fall through to the next interpreter
                print(f"Agent Office n'a pas pu démarrer sur le port {PORT} (port pris par une autre appli ?). Journal : {LOG}")
                return 0
            open_page()
            print(f"Agent Office : {URL}  (démo : {URL}?demo=1)")
        elif cmd == "status":
            print(f"{'en marche' if up() and ours() else 'arrêté'} — {URL} — config : {config.CONFIG_PATH}"
                  f"{'' if config.CONFIG_PATH.exists() else ' (absente, valeurs par défaut)'}")
        elif cmd == "stop":
            had = PID.exists()
            print("Agent Office arrêté." if stop_server() and had else "Aucun serveur lancé par le plugin." if not up() else
                  f"Un serveur tourne sur le port {PORT} mais n'a pas été lancé par le plugin : arrête-le à la main.")
        else:
            print(__doc__)
            return 2
    except Exception as err:  # a hook must never break the session
        STATE.mkdir(parents=True, exist_ok=True)
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(f"office.py {cmd}: {err!r}\n")
        return 0 if cmd.startswith("hook-") else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
