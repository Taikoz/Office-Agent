"""The user's team, created on first launch: names (chief, devs, cat), office name and optional logo, in STATE_DIR."""

from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path
from typing import Any

from .config import CFG, STATE_DIR, agent_files

TEAM_FILE = STATE_DIR / "team.json"
LOGO_TYPES = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp", "svg": "image/svg+xml"}
LOGO_MAX = 300_000  # bytes, once decoded
DATA_URL = re.compile(r"^data:image/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=\s]+)$")
NAME_BAD = re.compile(r"[\x00-\x1f<>\"`]")
DESKS = 8
PREFERRED = ["feature-builder", "mr-reviewer", "guardian-test-writer", "security-auditor", "audit-security-code", "youtrack-board-cleaner"]
MAIN_ONLY = {"tech-lead"}  # run as the main session (the chief), never as a subagent
ROLE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$")


def clean(value: Any, limit: int = 20) -> str:
    """A display name: trimmed, short, without control or markup characters."""
    return NAME_BAD.sub("", str(value or "")).strip()[:limit]


def load() -> dict[str, Any] | None:
    """The saved team, or None before the first-launch setup."""
    try:
        data = json.loads(TEAM_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (OSError, ValueError):
        return None


def logo_path() -> Path | None:
    """The uploaded logo file, if any."""
    for ext in LOGO_TYPES:
        path = STATE_DIR / f"logo.{ext}"
        if path.exists():
            return path
    return None


def default_roles() -> list[str]:
    """One agent type per desk: the user's own agents (the usual ones first), then general-purpose and Explore; the
    desks left over get general-purpose."""
    mine = [n for n in agent_files() if n not in MAIN_ONLY]
    custom = [n for n in PREFERRED if n in mine] + sorted(n for n in mine if n not in PREFERRED)
    roles = custom[:DESKS - 2] + ["general-purpose", "Explore"]
    return (roles + ["general-purpose"] * DESKS)[:DESKS]


def roles_of(saved: dict[str, Any]) -> list[str]:
    roles = saved.get("roles")
    if isinstance(roles, list) and len(roles) == DESKS and all(isinstance(r, str) and ROLE_RE.match(r) for r in roles):
        return roles
    return default_roles()


def save_roles(roles: Any) -> tuple[bool, str]:
    """The agent type of each desk (ChiefOS → Équipe)."""
    if not isinstance(roles, list) or len(roles) != DESKS or not all(isinstance(r, str) and ROLE_RE.match(r) for r in roles):
        return False, f"il faut un type d'agent valide pour chacun des {DESKS} bureaux"
    saved = load() or {}
    saved["roles"] = roles
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    write(TEAM_FILE, json.dumps(saved, ensure_ascii=False, indent=2).encode())
    return True, "rôles enregistrés"


def settings() -> dict[str, Any]:
    """Names and logo for the page: the saved team, else ~/.claude/agent-office.json, else the page defaults."""
    saved = load() or {}
    team = saved.get("team") if isinstance(saved.get("team"), list) else CFG.get("team") or []
    logo = logo_path()
    return {
        "setup": bool(saved),
        "office": clean(saved.get("office"), 30),
        "chief": clean(saved.get("chief")) or CFG["chief_name"],
        "team": [n for n in (clean(x) for x in team) if n][:DESKS],
        "cat": clean(saved.get("cat")),
        "logo": f"/logo?v={int(logo.stat().st_mtime)}" if logo else None,
        "roles": roles_of(saved),
    }


def save(data: dict[str, Any]) -> tuple[bool, str]:
    """Store the team from the setup form; `logo`: data URL to replace, null to remove, absent to keep."""
    chief = clean(data.get("chief"))
    team = [clean(x) for x in data.get("team") or []][:DESKS]
    if not chief or len(team) != DESKS or not all(team):
        return False, f"il faut ton nom et les {DESKS} prénoms de l'équipe"
    if len({n.lower() for n in [chief, *team]}) != DESKS + 1:
        return False, "chaque membre de l'équipe doit avoir un prénom différent"
    logo = data.get("logo", ...)
    if logo is not ... and logo is not None:
        m = DATA_URL.match(str(logo))
        if not m:
            return False, "logo : PNG, JPEG, WebP ou SVG seulement"
        try:
            raw = base64.b64decode(m[2], validate=False)
        except ValueError:
            return False, "logo illisible"
        if len(raw) > LOGO_MAX:
            return False, f"logo trop lourd (max {LOGO_MAX // 1000} ko)"
        ext = "svg" if m[1] == "svg+xml" else m[1]
        if ext == "svg" and b"<svg" not in raw[:4000].lower():
            return False, "ce fichier n'est pas un SVG"
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if logo is not ...:
        for old in STATE_DIR.glob("logo.*"):
            old.unlink(missing_ok=True)
        if logo is not None:
            write(STATE_DIR / f"logo.{ext}", raw)
    body = {"chief": chief, "team": team, "cat": clean(data.get("cat")) or "Brume", "office": clean(data.get("office"), 30)}
    if isinstance((load() or {}).get("roles"), list):
        body["roles"] = (load() or {})["roles"]  # renaming the team keeps the desks' roles
    write(TEAM_FILE, json.dumps(body, ensure_ascii=False, indent=2).encode())
    return True, "équipe enregistrée"


def write(path: Path, data: bytes) -> None:
    """Atomic write, readable by the user only."""
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(data)
    os.chmod(tmp, 0o600)
    tmp.replace(path)
