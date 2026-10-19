"""Settings (~/.claude/agent-office.json or $AGENT_OFFICE_CONFIG, merged over defaults), paths, limits and patterns.

Every key is optional. A missing integration (mmx, youtrack_tools, gitlab_tools, audit_log) simply hides its feature.
"""

from __future__ import annotations

import json
import os
import re
import secrets
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent  # app/
WEB = ROOT / "web"


def plugin_version(root: Path = ROOT.parent) -> str:
    """The version in .claude-plugin/plugin.json ("0" when unreadable): a newer plugin replaces an older running server."""
    try:
        return str(json.loads((root / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))["version"])
    except (OSError, ValueError, KeyError, TypeError):
        return "0"


VERSION = plugin_version()
HOME_CLAUDE = Path.home() / ".claude"
STATE_DIR = HOME_CLAUDE / "agent-office"  # questions, clear marker, ask.py / office.py shims, log
CONFIG_PATH = Path(os.environ.get("AGENT_OFFICE_CONFIG") or HOME_CLAUDE / "agent-office.json")

DEFAULTS: dict[str, Any] = {
    "port": 8765,
    "window_minutes": 120,           # how far back sessions are shown
    "open_browser": True,            # open the page when an agent is launched
    "exclude": [],                   # project path fragments never shown nor tracked, e.g. ["perso"]
    "ticket_regex": r"\b([A-Z][A-Z0-9]+-\d{2,6})\b",
    "chief_name": "Chef",            # the main session's character
    "team": [],                      # up to 8 dev names, one per desk (default names otherwise)
    "agents": {},                    # {"feature-builder": {"label": "DÉVELOPPEUR", "color": "#5aa9ff"}}
    "phases": {},                    # {"feature-builder": [["Branche", "branch|checkout"], ...]}
    "launch_dir": "~",               # working directory of agents launched from the office
    "mmx": None,                     # path to an MMX memory folder (enables the filing cabinet)
    "youtrack_tools": None,          # folder holding yt.py (ticket states on the board, backlog)
    "youtrack_backlog_query": "Assignee: me #Unresolved State: Submitted, Open, Reopened Type: Task",
    "gitlab_tools": None,            # folder holding gl.py (CI / merged state of the agents' MRs)
    "audit_log": None,               # path to a security audit-log.json (findings give XP)
    "to_verify_regex": r"yt\.py command\b.*to verify",
    "lessons": True,                 # add the validated lessons (ChiefOS → Leçons) to the subagents' prompts
    "process_rules": None,           # ChiefOS → Process: [{"when": "feature-builder", "project": "cogito", "then": "guardian-test-writer"}, …]
}

COLOR_NAMES = {  # Claude Code agent frontmatter colors
    "red": "#f06b6b", "orange": "#ff8f6b", "yellow": "#f2b84b", "green": "#5fd38d", "cyan": "#7fd6d6",
    "blue": "#5aa9ff", "purple": "#b48cff", "pink": "#e98fc4",
}


def _path(value: Any) -> Path | None:
    return Path(os.path.expanduser(str(value))) if value else None


def load() -> dict[str, Any]:
    """Read the user's settings; a broken file falls back to the defaults (and says so in the log)."""
    cfg = dict(DEFAULTS)
    try:
        user = json.loads(CONFIG_PATH.read_text(encoding="utf-8")) if CONFIG_PATH.exists() else {}
        if not isinstance(user, dict):
            raise ValueError("the root must be an object")
        cfg.update({k: v for k, v in user.items() if k in DEFAULTS})
    except (OSError, ValueError) as err:
        print(f"agent-office: {CONFIG_PATH} ignored ({err})")
    cfg["exclude"] = [str(x) for x in cfg["exclude"] or [] if x]
    # one YouTrack query or several (their results are merged)
    q = cfg["youtrack_backlog_query"]
    cfg["youtrack_backlog_query"] = [str(x) for x in (q if isinstance(q, list) else [q]) if x]
    for key in ("mmx", "youtrack_tools", "gitlab_tools", "audit_log", "launch_dir"):
        cfg[key] = _path(cfg[key])
    for key in ("ticket_regex", "to_verify_regex"):
        try:
            re.compile(cfg[key])
        except (re.error, TypeError):
            cfg[key] = DEFAULTS[key]
    cfg["chief_name"] = str(cfg["chief_name"] or DEFAULTS["chief_name"])[:20]
    return cfg


CFG = load()
EXCLUDED: tuple[str, ...] = tuple(CFG["exclude"])


def excluded(text: str) -> bool:
    """True when a path, cwd or project name belongs to an excluded project."""
    return any(x in text for x in EXCLUDED)


PROJECTS = HOME_CLAUDE / "projects"
CLEAR_MARK = STATE_DIR / "clear"
QUESTIONS = STATE_DIR / "questions"
def load_token() -> str:
    """Secret of the page's POSTs (answers, launches, saves…), kept in STATE_DIR (0600) so a restarted server accepts the
    tabs already open: a fresh token per run made every save of an open tab fail with 403 after a restart."""
    path = STATE_DIR / "token"
    try:
        token = path.read_text(encoding="utf-8").strip()
        if len(token) >= 24:
            return token
    except OSError:
        pass
    token = secrets.token_urlsafe(24)
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_text(token, encoding="utf-8")
        os.chmod(path, 0o600)
    except OSError:
        pass  # read-only home: one token for this run
    return token


TOKEN = load_token()
YT_TOOLS: Path | None = CFG["youtrack_tools"]
GL_TOOLS: Path | None = CFG["gitlab_tools"]
MMX: Path | None = CFG["mmx"] if CFG["mmx"] and (CFG["mmx"] / "INDEX.json").exists() else None
AUDIT_LOG: Path = CFG["audit_log"] or STATE_DIR / "no-audit-log.json"  # a missing file means no audit XP
LAUNCH_DIR: Path = CFG["launch_dir"] if CFG["launch_dir"] and CFG["launch_dir"].is_dir() else Path.home()
MMX_LABELS = {"MOD-PREFERENCES": "Préférences", "MOD-PROFILE": "Profil", "MOD-PROJECTS": "Projets",
              "MOD-KNOWLEDGE": "Connaissances", "MOD-RELATIONS": "Relations", "MOD-ARCHIVE": "Archives"}
TICKET_RE = re.compile(CFG["ticket_regex"])
TO_VERIFY_RE = re.compile(CFG["to_verify_regex"], re.I | re.S)
SAFE_ID = re.compile(r"^[\w-]{1,80}$")
TAIL_BYTES = 256_000
HEAD_BYTES = 64_000
ASK_RE = re.compile(r"agent-office/ask\.py")
WAIT_RE = re.compile(r"--wait\s+['\"]?([\w-]+)")


def frontmatter(path: Path) -> dict[str, str]:
    """Flat `key: value` pairs of a Markdown file's YAML frontmatter (enough for name/color)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return {}
    if not text.startswith("---"):
        return {}
    out = {}
    for line in text[3:].split("\n---", 1)[0].splitlines():
        if ":" in line and not line.startswith((" ", "\t")):
            k, v = line.split(":", 1)
            out[k.strip()] = v.strip().strip("'\"")
    return out


def installed_plugins() -> list[str]:
    """Install folders of the enabled Claude Code plugins (not every plugin cached from a marketplace)."""
    try:
        data = json.loads((HOME_CLAUDE / "plugins" / "installed_plugins.json").read_text(encoding="utf-8"))
        return [i["installPath"] for entries in data.get("plugins", {}).values() for i in entries if i.get("installPath")][:100]
    except (OSError, ValueError, AttributeError, TypeError, KeyError):
        return []


def agent_files(cwds: list[str] = ()) -> dict[str, Path]:
    """Every agent definition the user has (user, launch dir, session cwds and plugin agents), by name."""
    dirs = [HOME_CLAUDE / "agents", LAUNCH_DIR / ".claude" / "agents", *(Path(c) / ".claude" / "agents" for c in cwds if c)]
    dirs += [Path(p) / "agents" for p in installed_plugins()]
    found: dict[str, Path] = {}
    for d in dirs:
        if not d.is_dir() or excluded(str(d)):
            continue
        for md in sorted(d.glob("*.md"))[:200]:
            found.setdefault(frontmatter(md).get("name") or md.stem, md)
    return found


def discover_agents(cwds: list[str] = ()) -> dict[str, dict[str, str]]:
    """Label and color of every agent: the agent file's `color`, then ~/.claude/agent-office.json."""
    found: dict[str, dict[str, str]] = {}
    for name, md in agent_files(cwds).items():
        color = frontmatter(md).get("color", "")
        color = COLOR_NAMES.get(color.lower(), color if color.startswith("#") else "")
        found[name] = {"color": color} if color else {}
    for name, over in (CFG["agents"] or {}).items():
        if isinstance(over, dict):
            found.setdefault(name, {}).update({k: str(v) for k, v in over.items() if k in ("label", "color")})
    return found
