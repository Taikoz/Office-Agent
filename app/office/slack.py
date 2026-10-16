"""Slack, read-only: the messages of one channel (ChiefOS → Support), with a bot token entered in ChiefOS → Réglages.

The token stays on this machine (STATE_DIR/slack.json, 0600): it is never sent back to the page nor put in the save;
the server calls the Slack API itself and returns only what the page shows (the channel's last messages, who wrote
them, their threads and reactions). Nothing is ever posted to Slack. Answers are cached 30 s, people's names 1 h.

The bot needs: channels:history (groups:history for a private channel), channels:read / groups:read (to find a
channel by its name), users:read (the names), and to be in the channel (/invite @the-bot).
"""

from __future__ import annotations

import html
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from . import config

TIMEOUT = 8
CACHE_S = 30
CHANNEL_ID = re.compile(r"^[CG][A-Z0-9]{6,}$")
TOKEN_RE = re.compile(r"^xox[bp]-[A-Za-z0-9-]{10,}$")
SKIP = {"channel_join", "channel_leave", "channel_topic", "channel_purpose", "channel_name", "bot_add", "bot_remove"}
_cache: dict[str, tuple[float, Any]] = {}
_people: dict[str, tuple[float, str]] = {}
_lock = threading.Lock()


class SlackError(Exception):
    """A readable reason (French, shown in the page)."""


ERRORS = {
    "invalid_auth": "token refusé (invalide ou révoqué)", "not_authed": "token manquant", "account_inactive": "token désactivé",
    "token_revoked": "token révoqué", "channel_not_found": "channel introuvable (ou le bot n'y a pas accès)",
    "not_in_channel": "le bot n'est pas dans ce channel : invite-le avec /invite @le-bot", "ratelimited": "Slack demande d'attendre un peu",
}


def conf_file() -> Any:
    return config.STATE_DIR / "slack.json"  # read at call time (the tests move it)


def load() -> dict[str, Any]:
    try:
        data = json.loads(conf_file().read_text(encoding="utf-8"))
        return data if isinstance(data, dict) and data.get("token") and data.get("channel") else {}
    except (OSError, ValueError):
        return {}


def api(token: str, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    req = urllib.request.Request(f"https://slack.com/api/{method}{query}", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = json.loads(r.read(4_000_000))
    except urllib.error.HTTPError as err:
        raise SlackError("Slack demande d'attendre un peu" if err.code == 429 else f"Slack a répondu {err.code}") from err
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise SlackError(f"Slack injoignable ({getattr(err, 'reason', err)})") from err
    except ValueError as err:
        raise SlackError("réponse de Slack illisible") from err
    if not body.get("ok"):
        code = str(body.get("error", "erreur"))
        if code == "missing_scope":
            raise SlackError(f"droit manquant pour le bot : {body.get('needed', '?')}")
        raise SlackError(ERRORS.get(code, f"Slack : {code}"))
    return body


def find_channel(token: str, name: str) -> str:
    """A channel's id from its name (#support), through the channels the token can see (5 pages at most)."""
    name = name.strip().lstrip("#").lower()
    cursor = ""
    for _ in range(5):
        page = api(token, "conversations.list", {"types": "public_channel,private_channel", "exclude_archived": "true", "limit": 1000, **({"cursor": cursor} if cursor else {})})
        for ch in page.get("channels", []):
            if ch.get("name", "").lower() == name:
                return ch["id"]
        cursor = (page.get("response_metadata") or {}).get("next_cursor", "")
        if not cursor:
            break
    raise SlackError(f"channel #{name} introuvable (le bot y est-il invité ?)")


def save(token: str, channel: str) -> dict[str, Any]:
    """Stores the token (an empty one keeps the saved one) and the channel, after checking both against Slack."""
    old = load()
    token = (token or "").strip() or old.get("token", "")
    channel = (channel or "").strip()
    if not token:
        raise SlackError("token manquant")
    if not TOKEN_RE.match(token):
        raise SlackError("token attendu : xoxb-… (bot) ou xoxp-…")
    if not channel:
        raise SlackError("channel manquant (#support ou son identifiant C…)")
    who = api(token, "auth.test")
    cid = channel if CHANNEL_ID.match(channel) else find_channel(token, channel)
    info = api(token, "conversations.info", {"channel": cid}).get("channel", {})
    api(token, "conversations.history", {"channel": cid, "limit": 1})  # the bot can read it
    f = conf_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps({"token": token, "channel": cid, "name": info.get("name", ""), "team": who.get("team", ""),
                               "url": who.get("url", ""), "bot": who.get("user", "")}), encoding="utf-8")
    os.chmod(tmp, 0o600)
    os.replace(tmp, f)
    with _lock:
        _cache.clear()
    return status()


def forget() -> dict[str, Any]:
    conf_file().unlink(missing_ok=True)
    with _lock:
        _cache.clear()
        _people.clear()
    return status()


def status() -> dict[str, Any]:
    """What the page may know: the workspace, the channel, the bot; never the token."""
    c = load()
    return {"configured": bool(c), "team": c.get("team", ""), "channel": c.get("name", ""), "channelId": c.get("channel", ""), "bot": c.get("bot", "")}


def person(token: str, uid: str) -> str:
    with _lock:
        hit = _people.get(uid)
        if hit and time.time() - hit[0] < 3600:
            return hit[1]
    try:
        u = api(token, "users.info", {"user": uid}).get("user", {})
        name = (u.get("profile") or {}).get("display_name") or u.get("real_name") or u.get("name") or uid
    except SlackError:
        name = uid  # no users:read: the id
    with _lock:
        _people[uid] = (time.time(), name)
    return name


def plain(token: str, text: str) -> str:
    """Slack's markup made readable: <@U…> → @name, <#C…|name> → #name, <url|label> → label (url), entities decoded."""
    text = re.sub(r"<@([UW][A-Z0-9]+)(?:\|[^>]*)?>", lambda m: f"@{person(token, m.group(1))}", text or "")
    text = re.sub(r"<#[CG][A-Z0-9]+\|([^>]*)>", r"#\1", text)
    text = re.sub(r"<!(here|channel|everyone)[^>]*>", r"@\1", text)
    text = re.sub(r"<(https?://[^|>]+)\|([^>]+)>", r"\2 (\1)", text)
    text = re.sub(r"<(https?://[^>]+)>", r"\1", text)
    return html.unescape(text)[:4000]


def messages() -> dict[str, Any]:
    """The channel's last 40 messages, oldest first: who, when, the text, its thread, its reactions, its link."""
    c = load()
    if not c:
        raise SlackError("Slack n'est pas relié (ChiefOS → Réglages)")
    with _lock:
        hit = _cache.get("messages")
        if hit and time.time() - hit[0] < CACHE_S:
            return hit[1]
    raw = api(c["token"], "conversations.history", {"channel": c["channel"], "limit": 40}).get("messages", [])
    base = (c.get("url") or "").rstrip("/")
    out = []
    for m in reversed(raw):
        if m.get("subtype") in SKIP:
            continue
        uid = m.get("user") or ""
        name = person(c["token"], uid) if uid else (m.get("username") or (m.get("bot_profile") or {}).get("name") or "bot")
        ts = str(m.get("ts", ""))
        out.append({"ts": ts, "t": float(ts or 0), "name": name, "bot": not uid, "text": plain(c["token"], m.get("text", "")),
                    "replies": int(m.get("reply_count") or 0), "files": [str(f.get("name", "fichier"))[:80] for f in m.get("files") or []][:5],
                    "reactions": [{"name": r.get("name", ""), "count": int(r.get("count") or 0)} for r in m.get("reactions") or []][:8],
                    "link": f"{base}/archives/{c['channel']}/p{ts.replace('.', '')}" if base and ts else ""})
    body = {"channel": c.get("name", ""), "team": c.get("team", ""), "messages": out, "at": time.time()}
    with _lock:
        _cache["messages"] = (time.time(), body)
    return body


def safe(fn: Any) -> tuple[int, dict[str, Any]]:
    """(HTTP code, body) for the routes: a Slack problem is a readable message, not a crash."""
    try:
        return 200, fn()
    except SlackError as err:
        return 502, {"error": str(err)}
