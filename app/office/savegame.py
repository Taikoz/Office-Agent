"""The game's progress (money, objects, friendships, skills, wants…) saved in a file of STATE_DIR, so it survives a
cleared browser or a change of browser. The page sends its `office-*` storage keys; the newest save wins on load."""

from __future__ import annotations

import json
import os
import re
import shutil
from datetime import date
from typing import Any

from .config import STATE_DIR

SAVE_FILE = STATE_DIR / "save.json"
BACKUP_KEEP = 7  # days of copies of the save kept in STATE_DIR/backups
SAVE_MAX = 2_000_000       # bytes of the whole save
VALUE_MAX = 600_000        # bytes of one key
KEY_RE = re.compile(r"^office-[a-z0-9-]{1,40}$")


def load() -> dict[str, Any]:
    """The saved progress ({"savedAt": ms, "keys": {key: json text}}), or {} when there is none or it is unreadable."""
    try:
        data = json.loads(SAVE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    ok, _ = check(data)
    return data if ok else {}


def check(data: Any) -> tuple[bool, str]:
    """A save is a timestamp and string values under `office-*` keys, within the size limits."""
    if not isinstance(data, dict) or not isinstance(data.get("savedAt"), int) or not isinstance(data.get("keys"), dict):
        return False, "format invalide"
    total = 0
    for key, value in data["keys"].items():
        if not isinstance(key, str) or not KEY_RE.match(key) or not isinstance(value, str):
            return False, f"clé refusée : {str(key)[:40]}"
        if len(value.encode()) > VALUE_MAX:
            return False, f"valeur trop grande : {key}"
        total += len(key) + len(value.encode())
    if total > SAVE_MAX:
        return False, "sauvegarde trop grande"
    return True, ""


def backup_daily() -> None:
    """Before the first save of a day, the save as it was goes to backups/save-YYYY-MM-DD.json; the oldest go."""
    if not SAVE_FILE.exists():
        return
    backups = STATE_DIR / "backups"
    backups.mkdir(parents=True, exist_ok=True)
    today = backups / f"save-{date.today().isoformat()}.json"
    if not today.exists():
        shutil.copy2(SAVE_FILE, today)
    for old in sorted(backups.glob("save-*.json"))[:-BACKUP_KEEP]:
        old.unlink(missing_ok=True)


def save(data: Any) -> tuple[bool, str]:
    """Merges the keys into the saved ones (a partial save, sent while the page closes, never drops progress)
    and writes the file atomically (a crash mid-write never leaves half a file)."""
    ok, why = check(data)
    if not ok:
        return False, why
    keys = {**load().get("keys", {}), **data["keys"]}
    ok, why = check({"savedAt": data["savedAt"], "keys": keys})
    if not ok:
        return False, why
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    backup_daily()
    tmp = SAVE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps({"savedAt": data["savedAt"], "keys": keys}, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, SAVE_FILE)
    return True, str(SAVE_FILE)
