"""Agents launched in a git worktree of their own (`claude --worktree <name>`): names, and where a session works.

Claude Code creates the worktree in <repo>/.claude/worktrees/<name>, on a branch of its own, and offers to remove it at
the end of the session; the office only names it and shows it.
"""

from __future__ import annotations

import re
import time
from pathlib import Path

MARK = "/.claude/worktrees/"
NAME_MAX = 48


def name_for(agent: str, ticket: str | None, repo: Path, now: float | None = None) -> str:
    """A readable, safe and new worktree name: the ticket and the agent, the time when it is taken already."""
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", f"{ticket}-{agent}" if ticket else agent).strip("-.")[:NAME_MAX] or "agent"
    if not (repo / ".claude" / "worktrees" / base).exists():
        return base
    return f"{base}-{time.strftime('%H%M%S', time.localtime(now))}"


def is_repo(path: Path) -> bool:
    """A git working tree (its .git is a folder, or a file for a worktree or a submodule)."""
    return (path / ".git").exists()


def split(cwd: str) -> tuple[str, str] | None:
    """(repo, worktree name) when `cwd` is inside a Claude Code worktree, else None."""
    cwd = cwd.replace("\\", "/")
    if MARK not in cwd:
        return None
    repo, rest = cwd.split(MARK, 1)
    name = rest.split("/", 1)[0]
    return (repo, name) if repo and name else None


def root(cwd: str) -> str:
    """The worktree's own folder when `cwd` is inside one, else ""."""
    found = split(cwd)
    return f"{found[0]}{MARK}{found[1]}" if found else ""
