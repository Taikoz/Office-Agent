"""Scheduled agents (ChiefOS → Planification): "every Monday at 9:00, launch youtrack-board-cleaner with this mission".

A thread of the server checks every 30 s; a due run opens the usual interactive terminal (launcher.launch, permissions
asked as always). A run is only started within 15 minutes after its time: if the server was off then, it is skipped,
not fired hours later. Kept in STATE_DIR/schedules.json with the log of the last runs.
"""

from __future__ import annotations

import json
import re
import secrets
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import STATE_DIR
from .launcher import agents, launch

FILE = STATE_DIR / "schedules.json"
WINDOW_MIN = 15
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_lock = threading.Lock()
_started = False


def load() -> dict[str, Any]:
    try:
        data = json.loads(FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return {"items": data.get("items") or [], "log": data.get("log") or []}
    except (OSError, ValueError):
        pass
    return {"items": [], "log": []}


def _write(data: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(FILE)


def clean(item: dict[str, Any]) -> dict[str, Any]:
    days = sorted({int(d) for d in item.get("days") or [] if str(d).isdigit() and 0 <= int(d) <= 6})
    t = str(item.get("time", ""))
    if not TIME_RE.match(t):
        raise ValueError("heure invalide (HH:MM)")
    if not days:
        raise ValueError("choisis au moins un jour")
    if str(item.get("agent")) not in agents():
        raise ValueError("agent inconnu")
    prompt = str(item.get("prompt", "")).strip()
    if not prompt or len(prompt) > 2000:
        raise ValueError("mission vide ou trop longue")
    cwd = str(item.get("cwd") or "")
    if cwd:
        p, home = Path(cwd).expanduser().resolve(), Path.home().resolve()
        if not p.is_dir() or (p != home and home not in p.parents):
            raise ValueError("dossier invalide (dans ton dossier personnel)")
        cwd = str(p)
    return {"id": str(item.get("id") or secrets.token_hex(4)), "name": str(item.get("name") or item["agent"])[:60], "agent": str(item["agent"]),
            "prompt": prompt, "cwd": cwd, "days": days, "time": t, "enabled": bool(item.get("enabled", True)), "last": str(item.get("last", ""))}


def due(item: dict[str, Any], now: datetime) -> str | None:
    """The slot key ("2026-10-19 09:00") when `item` must run now, else None."""
    if not item.get("enabled") or now.weekday() not in item.get("days", []):
        return None
    h, m = map(int, item["time"].split(":"))
    slot = now.replace(hour=h, minute=m, second=0, microsecond=0)
    key = slot.strftime("%Y-%m-%d %H:%M")
    if slot <= now and (now - slot).total_seconds() <= WINDOW_MIN * 60 and item.get("last") != key:
        return key
    return None


def run(item: dict[str, Any], key: str, why: str) -> dict[str, Any]:
    ok, out = launch(item["agent"], item["prompt"], Path(item["cwd"]) if item.get("cwd") else None)
    return {"t": time.time(), "slot": key, "id": item["id"], "name": item["name"], "agent": item["agent"], "ok": ok, "output": out, "why": why}


def tick(now: datetime | None = None) -> list[dict[str, Any]]:
    now = now or datetime.now()
    fired = []
    with _lock:
        data = load()
        for item in data["items"]:
            key = due(item, now)
            if key:
                item["last"] = key
                fired.append(run(item, key, "planifié"))
        if fired:
            data["log"] = (fired + data["log"])[:100]
            _write(data)
    return fired


def act(body: dict[str, Any]) -> dict[str, Any]:
    """save (create or update), delete, toggle, run now."""
    action = body.get("action")
    with _lock:
        data = load()
        if action == "save":
            item = clean(body.get("item") or {})
            old = next((i for i in data["items"] if i["id"] == item["id"]), None)
            if old:
                item["last"] = old.get("last", "")
                data["items"] = [item if i["id"] == item["id"] else i for i in data["items"]]
            else:
                data["items"].append(item)
        elif action == "delete":
            data["items"] = [i for i in data["items"] if i["id"] != body.get("id")]
        elif action == "toggle":
            for i in data["items"]:
                if i["id"] == body.get("id"):
                    i["enabled"] = not i.get("enabled")
        elif action == "run":
            item = next((i for i in data["items"] if i["id"] == body.get("id")), None)
            if not item:
                raise ValueError("planification inconnue")
            data["log"] = ([run(item, datetime.now().strftime("%Y-%m-%d %H:%M"), "lancé à la main")] + data["log"])[:100]
        else:
            raise ValueError("action inconnue")
        _write(data)
    return {**data, "agents": agents()}


def start() -> None:
    """The scheduler thread (once per server)."""
    global _started
    if _started:
        return
    _started = True

    def loop() -> None:
        while True:
            try:
                tick()
            except Exception:  # a bad file must not stop the server
                pass
            time.sleep(30)
    threading.Thread(target=loop, daemon=True, name="agent-office-schedules").start()
