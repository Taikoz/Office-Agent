"""The devs' own words: a small model (Claude Haiku) writes what a dev says about the work its agent really does (the last
steps, the file edited, the command that failed), and the texts of the comic strip told at the end of a mission.

Off by default (ChiefOS / the menu turn it on); at most DAILY_MAX calls a day, one at a time, GAP seconds apart. It goes
through the Claude API when an API key and the `anthropic` package are there, else through the `claude` command on this
machine (headless, Haiku, no tool, no MCP, no session kept: nothing shows in the office), on the user's subscription.
What it reads of the agent's work goes to Claude the same way the agent's own work does. State: STATE_DIR/quips.json.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import threading
import time
from collections import OrderedDict
from datetime import date
from typing import Any

from . import config
from .detail import agent_detail

MODEL = "claude-haiku-5-5"
DAILY_MAX = 300
GAP = 6.0  # seconds between two calls
CACHE_MAX = 200
_lock = threading.Lock()  # around the settings file and the call schedule (never held during a call)
_last = 0.0  # when the last call was scheduled
_cache: OrderedDict[tuple[str, ...], Any] = OrderedDict()  # (kind, session, agent, events seen) → what was written: the same work, the same words


def _remember(key: tuple[str, ...], value: Any) -> None:
    _cache[key] = value
    while len(_cache) > CACHE_MAX:
        _cache.popitem(last=False)

SYSTEM_QUIP = (
    "Tu prêtes une voix humaine à un dev d'un jeu de bureau façon Les Sims : un agent IA code pour lui, et le dev commente "
    "ce qui vient de se passer. Écris UNE seule réplique, en français, à la première personne, de 4 à 14 mots, vivante et "
    "naturelle (soulagement, agacement, fierté, perplexité, humour léger), au plus un emoji. Parle du concret (le fichier, "
    "le test, l'erreur, la MR) sans recopier de code ni de long chemin. Ni guillemets, ni préfixe, ni explication : la "
    "réplique seule."
)
SYSTEM_COMIC = (
    "Tu écris les textes d'une BD de quelques cases qui raconte la mission d'un dev dans un jeu de bureau façon Les Sims "
    "(un agent IA code pour lui). Pour chaque case décrite, écris un récitatif (caption : 3 à 10 mots, au présent, style BD, "
    "une pointe d'humour) et une bulle (say : ce que dit le personnage, 2 à 10 mots, au plus un emoji). En français, concret "
    "mais sans code ni long chemin. Réponds uniquement par un tableau JSON, une entrée par case et dans l'ordre : "
    '[{"caption": "...", "say": "..."}]'
)


def _path():
    return config.STATE_DIR / "quips.json"  # read at call time (the tests move it)


def settings() -> dict[str, Any]:
    try:
        s = json.loads(_path().read_text())
    except (OSError, ValueError):
        s = {}
    s = {"on": bool(s.get("on")), "day": str(s.get("day", "")), "used": int(s.get("used", 0) or 0)}
    if s["day"] != date.today().isoformat():
        s.update(day=date.today().isoformat(), used=0)
    return s


def _save(s: dict[str, Any]) -> None:
    config.STATE_DIR.mkdir(parents=True, exist_ok=True)
    _path().write_text(json.dumps(s))


def engine() -> str:
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            import anthropic  # noqa: F401
            return "api"
        except ImportError:
            pass
    return "cli" if shutil.which("claude") else "none"


def status() -> dict[str, Any]:
    s = settings()
    return {"on": s["on"], "used": s["used"], "max": DAILY_MAX, "engine": engine()}


def set_on(on: bool) -> dict[str, Any]:
    with _lock:
        s = settings()
        s["on"] = bool(on)
        _save(s)
    return status()


def _api(system: str, prompt: str) -> str | None:
    import anthropic

    client = anthropic.Anthropic()
    try:
        r = client.messages.create(model=MODEL, max_tokens=1024, system=system, output_config={"effort": "low"},
                                   messages=[{"role": "user", "content": prompt}])
    except (anthropic.APIStatusError, anthropic.APIConnectionError):  # a refused key, a limit, the network: no line this time
        return None
    except TypeError:  # an older SDK without output_config
        return None
    if r.stop_reason == "refusal":
        return None
    return "".join(b.text for b in r.content if b.type == "text")


def _cli(system: str, prompt: str) -> str | None:
    exe = shutil.which("claude")
    if not exe:
        return None
    cwd = config.STATE_DIR / "quips-cwd"  # an empty folder: no project's CLAUDE.md comes along
    cwd.mkdir(parents=True, exist_ok=True)
    try:
        p = subprocess.run([exe, "-p", "--model", "haiku", "--no-session-persistence", "--strict-mcp-config", "--tools", "",
                            "--system-prompt", system, "--output-format", "text", prompt],
                           cwd=cwd, capture_output=True, text=True, timeout=60, stdin=subprocess.DEVNULL)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return p.stdout if p.returncode == 0 else None


def _refund() -> None:
    with _lock:
        s = settings()
        s["used"] = max(0, s["used"] - 1)
        _save(s)


def ask(system: str, prompt: str, need_on: bool = True) -> tuple[str | None, str]:
    """One call, if allowed: (text, "") or (None, why: off, limit, engine, failed). The slot is booked under the lock
    (on, quota, GAP after the last one), the call runs outside it; a call that brings nothing gives its slot back.
    need_on=False: a feature with its own switch (insights.py) shares the quota but not the devs' one."""
    global _last
    kind = engine()
    if kind == "none":
        return None, "engine"
    with _lock:
        s = settings()
        if need_on and not s["on"]:
            return None, "off"
        if s["used"] >= DAILY_MAX:
            return None, "limit"
        at = max(time.time(), _last + GAP)
        _last = at
        s["used"] += 1
        _save(s)
    if at > time.time():
        time.sleep(at - time.time())
    if need_on and not settings()["on"]:  # switched off while waiting
        _refund()
        return None, "off"
    out = ((_api(system, prompt) if kind == "api" else _cli(system, prompt)) or "").strip()
    if not out:
        _refund()
        return None, "failed"
    return out, ""


def work_context(d: dict[str, Any]) -> str:
    """What the agent did lately, short: its mission, its last steps, the last file edited, the last command."""
    lines = [f"Mission : {d.get('ticket') or ''} {str(d.get('description', ''))[:200]}".strip(), f"Statut : {d.get('status', '')}"]
    for e in d.get("events", [])[-12:]:
        lines.append(f"- {e.get('kind')}{' ' + e['tool'] if e.get('tool') else ''} : {str(e.get('label', ''))[:160]}")
    if d.get("edits"):
        e = d["edits"][-1]
        lines.append(f"Dernière modif : {str(e.get('file', '')).rsplit('/', 1)[-1]} → {str(e.get('new') or '')[:240]}")
    if d.get("terminal"):
        c = d["terminal"][-1]
        lines.append(f"Dernière commande{' (échec)' if c.get('failed') else ''} : {str(c.get('cmd', ''))[:160]} → {str(c.get('out') or '')[-300:]}")
    return "\n".join(lines)


def quip(session: str, agent: str, who: str, traits: str = "") -> dict[str, Any]:
    d = agent_detail(session, agent)
    if d is None:
        return {"error": "agent"}
    key = ("quip", session, agent, str(d.get("eventCount", 0)))
    if key in _cache:
        return {"line": _cache[key], "same": True}
    text, why = ask(SYSTEM_QUIP, f"Le dev s'appelle {who or 'le dev'}{f', personnalité : {traits}' if traits else ''}.\nCe qui vient de se passer :\n{work_context(d)}")
    if not text:
        return {"error": why}
    line = text.splitlines()[0].strip().strip('"«» ')[:140]
    _remember(key, line)
    return {"line": line}


def comic(session: str, agent: str, who: str, moments: list[dict[str, Any]]) -> dict[str, Any]:
    """The texts of the comic strip, one per moment ({kind, hint}): [{caption, say}]."""
    d = agent_detail(session, agent)
    if d is None:
        return {"error": "agent"}
    moments = [{"kind": str(m.get("kind", ""))[:20], "hint": str(m.get("hint", ""))[:200]} for m in moments[:6] if isinstance(m, dict)]
    key = ("comic", session, agent, str(d.get("eventCount", 0)), json.dumps(moments, sort_keys=True))
    if key in _cache:
        return {"panels": _cache[key]}
    cases = "\n".join(f"{i + 1}. {m['kind']} : {m['hint']}" for i, m in enumerate(moments))
    text, why = ask(SYSTEM_COMIC, f"Le dev s'appelle {who or 'le dev'}.\nLa mission :\n{work_context(d)}\n\nLes cases :\n{cases}")
    if not text:
        return {"error": why}
    try:
        panels = json.loads(text[text.index("["): text.rindex("]") + 1])
    except ValueError:
        return {"error": "failed"}
    panels = [{"caption": str(p.get("caption", ""))[:90], "say": str(p.get("say", ""))[:90]} for p in panels if isinstance(p, dict)][:len(moments)]
    if len(panels) != len(moments):
        return {"error": "failed"}
    _remember(key, panels)
    return {"panels": panels}
