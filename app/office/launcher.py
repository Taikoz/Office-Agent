"""Start an agent from the office: opens an interactive `claude --agent <name>` in a new terminal.

The session stays interactive, so every permission prompt still goes to the user; nothing runs headless.
"""

from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

from .config import LAUNCH_DIR, agent_files

PROMPT_MAX = 2000


def agents() -> list[str]:
    """Agent names that can be launched (user, launch dir and plugin agents)."""
    return sorted(agent_files())


# Set by the Claude Code session that started this server (hook): passed on, they make the launched claude
# a child session that saves no transcript, so its dev never shows up in the office.
SESSION_MARKERS = ("CLAUDECODE", "CLAUDE_PID", "CLAUDE_EFFORT")
SESSION_PREFIXES = ("CLAUDE_CODE_",)


def clean_env(env: dict[str, str]) -> dict[str, str]:
    """The environment without the parent Claude Code session's markers."""
    return {k: v for k, v in env.items() if k not in SESSION_MARKERS and not k.startswith(SESSION_PREFIXES)}


def terminal(cmd: list[str]) -> list[str] | None:
    """argv opening `cmd` in a new graphical terminal, or None when there is none."""
    if sys.platform == "darwin":  # shell-quoted, then escaped as an AppleScript string
        line = f"cd {shlex.quote(str(LAUNCH_DIR))} && {shlex.join(cmd)}".replace("\\", "\\\\").replace('"', '\\"')
        return ["osascript", "-e", f'tell application "Terminal" to do script "{line}"']
    if not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        return None
    if term := shutil.which("gnome-terminal"):
        return [term, f"--working-directory={LAUNCH_DIR}", "--", *cmd]
    if term := shutil.which("konsole"):
        return [term, "--workdir", str(LAUNCH_DIR), "-e", *cmd]
    for name in ("x-terminal-emulator", "xterm"):
        if term := shutil.which(name):
            return [term, "-e", *cmd]
    return None


def launch(agent: str, prompt: str) -> tuple[bool, str]:
    """Open a terminal running claude as `agent` with `prompt`; argv only, no shell."""
    if agent not in agents():
        return False, "agent inconnu"
    prompt = prompt.strip()
    if not prompt or len(prompt) > PROMPT_MAX:
        return False, "mission vide ou trop longue"
    claude = shutil.which("claude") or str(Path.home() / ".local" / "bin" / "claude")
    if sys.platform == "win32":
        return launch_windows(claude, agent, prompt)
    argv = terminal([claude, "--agent", agent, prompt])
    if argv is None:
        return False, "pas de terminal graphique disponible"
    subprocess.Popen(argv, cwd=LAUNCH_DIR, env=clean_env(dict(os.environ)), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                     start_new_session=True)
    return True, f"{agent} lancé dans un nouveau terminal"


def launch_windows(claude: str, agent: str, prompt: str) -> tuple[bool, str]:
    """Windows: claude.exe in a new console window, argv only. A claude.cmd (npm install) would go through cmd.exe,
    which reparses the mission text: refused rather than risking it."""
    exe = claude if claude.lower().endswith(".exe") else shutil.which("claude.exe") or ""
    if not exe:
        return False, "claude.exe introuvable (installation npm ?) : lance l'agent depuis Claude Code"
    subprocess.Popen([exe, "--agent", agent, prompt], cwd=LAUNCH_DIR, env=clean_env(dict(os.environ)),
                     creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0x10))
    return True, f"{agent} lancé dans une nouvelle console"
