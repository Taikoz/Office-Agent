"""ChiefOS → generated applications: the apps the user creates in 🔌 Intégrations from a connector's views.

An app is a record, never code: {id, connector, view, name, icon, params, enabled, created}, kept in
STATE_DIR/apps.json (0600). ChiefOS shows each one with the same generic window (web/js/apps/generated.js); its data
comes from data(id), which runs the view's declared read through integrations.run() and cuts the rows with the view's
own function. So an app reaches exactly what its view declares: editing apps.json (another op, other params) gives
nothing more, since the op is taken from the connector's view, not from the record, and only declared params pass.

Its lifecycle: created, renamed or reconfigured, disabled, deleted. A connection that is revoked, expired or
disconnected never deletes an app: data() answers with the connection's state, and the app offers to reconnect.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import threading
import time
from typing import Any

from . import config, integrations

MAX_APPS = 40
MAX_ROWS = 200
CELL_MAX = 400
ICON_MAX = 8
NAME_MAX = 40
_lock = threading.Lock()


class AppError(Exception):
    """A readable reason (French, shown in the page)."""


def _file() -> Any:
    return config.STATE_DIR / "apps.json"  # read at call time (the tests move it)


def _read() -> list[dict[str, Any]]:
    try:
        data = json.loads(_file().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [a for a in data.get("apps", []) if isinstance(a, dict) and isinstance(a.get("id"), str)] if isinstance(data, dict) else []


def _write(apps: list[dict[str, Any]]) -> None:
    f = _file()
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as out:
        json.dump({"version": 1, "apps": apps}, out, ensure_ascii=False, indent=1)
    os.replace(tmp, f)


def _text(v: Any, n: int) -> str:
    return re.sub(r"[\x00-\x1f\x7f]", " ", str(v or ""))[:n].strip()


def _params(view: integrations.View, values: Any) -> dict[str, str]:
    declared = {f.key for f in view.params}
    return {k: _text(v, 200) for k, v in (values if isinstance(values, dict) else {}).items() if k in declared and isinstance(v, (str, int, float))}


def _status(app: dict[str, Any]) -> dict[str, Any]:
    """An app as the page sees it: its record, its template, and whether it can work right now (and why not)."""
    try:
        c = integrations.get(app.get("connector", ""))
        view = c.view(app.get("view", ""))
    except LookupError as err:
        return {**app, "state": "broken", "detail": str(err)}
    conn = integrations.connection(c)
    state = "disabled" if not app.get("enabled", True) else "ready" if conn["state"] == "connected" else "connection"
    return {**app, "state": state, "detail": conn["detail"] if state == "connection" else "", "connection": conn["state"],
            "provider": c.name, "providerIcon": c.icon, "template": view.public(), "link": view.link}


def list_apps() -> dict[str, Any]:
    return {"apps": [_status(a) for a in _read()]}


def create(connector: str, view: str, name: str = "", icon: str = "", params: Any = None) -> dict[str, Any]:
    c = integrations.get(connector)
    v = c.view(view)
    with _lock:
        apps = _read()
        if len(apps) >= MAX_APPS:
            raise AppError(f"{MAX_APPS} applications au plus : supprime-en une d'abord")
        app = {"id": secrets.token_hex(4), "connector": c.id, "view": v.id, "name": _text(name, NAME_MAX) or f"{v.label} · {c.name}",
               "icon": _text(icon, ICON_MAX) or v.icon, "params": _params(v, params), "enabled": True, "created": time.time()}
        _write([*apps, app])
    integrations.audit_event("app_create", c.id, True, app["name"], app=app["id"], view=v.id)
    return _status(app)


def update(app_id: str, changes: Any) -> dict[str, Any]:
    changes = changes if isinstance(changes, dict) else {}
    with _lock:
        apps = _read()
        app = next((a for a in apps if a["id"] == app_id), None)
        if app is None:
            raise LookupError("application introuvable")
        if "name" in changes:
            app["name"] = _text(changes["name"], NAME_MAX) or app["name"]
        if "icon" in changes:
            app["icon"] = _text(changes["icon"], ICON_MAX) or app["icon"]
        if "enabled" in changes:
            app["enabled"] = changes["enabled"] is True
        if "params" in changes:
            app["params"] = _params(integrations.get(app["connector"]).view(app["view"]), changes["params"])
        _write(apps)
    integrations.audit_event("app_update", app["connector"], True, app["name"], app=app_id, enabled=app.get("enabled", True))
    return _status(app)


def delete(app_id: str) -> dict[str, Any]:
    with _lock:
        apps = _read()
        gone = next((a for a in apps if a["id"] == app_id), None)
        if gone is None:
            raise LookupError("application introuvable")
        _write([a for a in apps if a["id"] != app_id])
    integrations.audit_event("app_delete", gone.get("connector", ""), True, gone.get("name", ""), app=app_id)
    return list_apps()


def _cell(v: Any) -> Any:
    if isinstance(v, bool) or v is None:
        return "" if v is None else ("oui" if v else "non")
    if isinstance(v, (int, float)):
        return v
    return _text(v, CELL_MAX)


def data(app_id: str) -> dict[str, Any]:
    """The rows of one app, through its connector's declared read; its state instead when it cannot read now."""
    app = next((a for a in _read() if a["id"] == app_id), None)
    if app is None:
        raise LookupError("application introuvable")
    st = _status(app)
    if st["state"] != "ready":
        return {"id": app_id, "state": st["state"], "detail": st.get("detail", ""), "connection": st.get("connection", ""), "rows": []}
    c = integrations.get(app["connector"])
    view = c.view(app["view"])
    try:
        answer = integrations.run(c.id, view.op, app.get("params") or {})
    except c.error as err:
        state = integrations.state_of(c, err)
        return {"id": app_id, "state": "connection", "connection": state, "detail": str(err), "rows": []}
    except integrations.RateLimited as err:
        return {"id": app_id, "state": "connection", "connection": "rate_limited", "detail": str(err), "rows": []}
    except PermissionError as err:  # an address out of the allowlist
        return {"id": app_id, "state": "connection", "connection": "host_refused", "detail": str(err), "rows": []}
    keys = [k for k, _label, _kind in view.columns] + ([view.link] if view.link else []) + ([view.scope[1]] if view.scope else [])
    rows = []
    for r in view.rows(answer)[:MAX_ROWS]:
        row = {k: _cell(r.get(k)) for k in keys}
        if view.link and not str(row.get(view.link, "")).startswith(("https://", "http://")):
            row[view.link] = ""  # a link is only ever a web address
        rows.append(row)
    return {"id": app_id, "state": "ready", "rows": rows, "at": time.time()}


def safe(fn: Any) -> tuple[int, Any]:
    try:
        return integrations.safe(fn)
    except AppError as err:
        return 400, {"error": str(err)}
