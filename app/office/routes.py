"""HTTP handler: JSON API, static files of web/, token-protected POSTs."""

from __future__ import annotations

import json
import re
import secrets
import time
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from . import history, savegame, team
from .billing import billing
from .config import CFG, GL_TOOLS, MMX, TICKET_RE, TOKEN, WEB, discover_agents
from .detail import agent_detail
from .launcher import agents, launch
from .live import GAME, sessions
from .mmx import mmx_storage, mmx_validate
from .perf import perf
from .pipelines import Pipelines
from .questions import answer_question, answered, pending_questions
from .tickets import TicketStates

PIPELINES = Pipelines()
DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
LAST_VIEW = 0.0  # last /api/state poll by an open page; office.py reopens the page when stale
TYPES = {".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8"}


def static_files() -> dict[str, Path]:
    """Map each servable URL (/static/…) to its file under web/; nothing else is ever read from disk."""
    return {f"/static/{f.relative_to(WEB).as_posix()}": f for f in WEB.rglob("*") if f.suffix in TYPES}


def build_stamp() -> float:
    """Newest change in web/: the page reloads itself when it moves."""
    return max(f.stat().st_mtime for f in [WEB / "index.html", *static_files().values()])


def office_config(window: float, tickets: TicketStates) -> dict[str, Any]:
    """What the page needs from ~/.claude/agent-office.json: agents' labels and colors, names, enabled integrations."""
    cwds = list({s.get("cwd", "") for s in sessions(window)})
    return {"agents": discover_agents(cwds), "ticket": CFG["ticket_regex"], **team.settings(),
            "features": {"mmx": MMX is not None, "youtrack": tickets.enabled, "gitlab": bool(GL_TOOLS)}}


def make_handler(window: float, tickets: TicketStates) -> type[BaseHTTPRequestHandler]:
    """Build the request handler bound to the scan window and ticket cache."""

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            global LAST_VIEW
            if self.path.startswith("/api/viewer"):
                self.reply(200, "application/json", json.dumps({"idle": time.time() - LAST_VIEW}).encode())
            elif self.path.startswith("/api/state"):
                LAST_VIEW = time.time()
                data = sessions(window)
                ids = {a["ticket"] for s in data for a in s["agents"] if a["ticket"]}
                build = build_stamp()
                body = json.dumps({"now": time.time(), "build": build, "sessions": data, "tickets": tickets.get(ids),
                                   "questions": pending_questions(), "links": {"youtrack": tickets.base_url()}, "billing": billing(), "backlog": tickets.backlog(),
                                   "pipelines": PIPELINES.get({a["game"]["mr"] for s in data for a in s["agents"] if a.get("game", {}).get("mr")})}).encode()
                self.reply(200, "application/json", body)
            elif self.path.startswith("/api/agent?"):
                query = parse_qs(urlparse(self.path).query)
                detail = agent_detail(query.get("s", [""])[0], query.get("a", [""])[0])
                if detail is None:
                    self.reply(404, "application/json", b'{"error": "agent introuvable"}')
                else:
                    self.reply(200, "application/json", json.dumps(detail).encode())
            elif self.path.startswith("/api/costs"):
                days = parse_qs(urlparse(self.path).query).get("days", ["30"])[0]
                self.reply(200, "application/json", json.dumps(history.costs(GAME, min(90.0, max(1.0, float(days) if days.isdigit() else 30.0))), ensure_ascii=False).encode())
            elif self.path.startswith("/api/report"):
                day = parse_qs(urlparse(self.path).query).get("day", [""])[0]
                if not DAY_RE.match(day):
                    self.reply(400, "application/json", b'{"error": "jour invalide"}')
                else:
                    self.reply(200, "application/json", json.dumps(history.report(GAME, day), ensure_ascii=False).encode())
            elif self.path.startswith("/api/ticket"):
                tid = parse_qs(urlparse(self.path).query).get("id", [""])[0]
                if not TICKET_RE.fullmatch(tid):
                    self.reply(400, "application/json", b'{"error": "ticket invalide"}')
                else:
                    self.reply(200, "application/json", json.dumps(history.ticket(GAME, tid), ensure_ascii=False).encode())
            elif self.path.startswith("/api/answers"):
                self.reply(200, "application/json", json.dumps(answered(), ensure_ascii=False).encode())
            elif self.path.startswith("/api/search"):
                q = parse_qs(urlparse(self.path).query).get("q", [""])[0].strip()[:120]
                body = history.search(GAME, q) if len(q) >= 2 else []
                self.reply(200, "application/json", json.dumps(body, ensure_ascii=False).encode())
            elif self.path.startswith("/api/config"):
                self.reply(200, "application/json", json.dumps(office_config(window, tickets), ensure_ascii=False).encode())
            elif self.path.startswith("/api/agents"):
                self.reply(200, "application/json", json.dumps(agents()).encode())
            elif self.path.startswith("/api/game"):
                self.reply(200, "application/json", json.dumps(GAME.state(), ensure_ascii=False).encode())
            elif self.path.startswith("/api/mmx"):
                self.reply(200, "application/json", json.dumps(mmx_storage(), ensure_ascii=False).encode())
            elif self.path.startswith("/api/perf"):
                days = parse_qs(urlparse(self.path).query).get("days", ["7"])[0]
                self.reply(200, "application/json", json.dumps(perf(min(30.0, max(0.1, float(days) if days.replace(".", "", 1).isdigit() else 7.0)))).encode())
            elif self.path in ("/", "/index.html") or self.path.startswith("/?"):
                cfg = json.dumps(office_config(window, tickets), ensure_ascii=False).replace("</", "<\\/")
                saved = json.dumps(savegame.load(), ensure_ascii=False).replace("</", "<\\/")
                page = (WEB / "index.html").read_bytes().replace(b"__OFFICE_TOKEN__", TOKEN.encode()).replace(b"__OFFICE_CFG__", cfg.encode()) \
                    .replace(b"__OFFICE_SAVE__", saved.encode())
                self.reply(200, "text/html; charset=utf-8", page)
            elif urlparse(self.path).path == "/logo" and (logo := team.logo_path()) is not None:
                # an uploaded SVG could carry script: never let it run on this origin (it would read the token)
                self.reply(200, team.LOGO_TYPES[logo.suffix[1:]], logo.read_bytes(),
                           {"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "X-Content-Type-Options": "nosniff"})
            elif urlparse(self.path).path == "/sw.js":  # service worker: served from the root so it may show notifications for the page
                self.reply(200, TYPES[".js"], (WEB / "sw.js").read_bytes())
            elif (static := static_files().get(urlparse(self.path).path)) is not None:
                self.reply(200, TYPES[static.suffix], static.read_bytes())
            else:
                self.reply(404, "text/plain", b"not found")

        def do_POST(self) -> None:
            # Answers and launches drive agents that can push code, validations write MMX: only this page (same origin + per-run token) may post them.
            origin = self.headers.get("Origin", "")
            allowed = {f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}"}
            if self.path not in ("/api/answer", "/api/mmx/validate", "/api/launch", "/api/team", "/api/save") or origin not in allowed or not secrets.compare_digest(self.headers.get("X-Office-Token", ""), TOKEN):
                self.reply(403, "application/json", b'{"error": "interdit"}')
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                limit = savegame.SAVE_MAX + 10_000 if self.path == "/api/save" else 500_000 if self.path == "/api/team" else 16_000
                data = json.loads(self.rfile.read(min(size, limit)))
                if self.path == "/api/save":
                    ok, output = savegame.save(data)
                    self.reply(200 if ok else 400, "application/json", json.dumps({"ok": ok, "output": output}, ensure_ascii=False).encode())
                    return
                if self.path == "/api/team":
                    ok, output = team.save(data if isinstance(data, dict) else {})
                    self.reply(200 if ok else 400, "application/json", json.dumps({"ok": ok, "output": output}, ensure_ascii=False).encode())
                    return
                if self.path == "/api/launch":
                    ok, output = launch(str(data["agent"]), str(data["prompt"]))
                    self.reply(200 if ok else 409, "application/json", json.dumps({"ok": ok, "output": output}, ensure_ascii=False).encode())
                    return
                if self.path == "/api/mmx/validate":
                    ok, output = mmx_validate([str(i) for i in data["ids"]][:50])
                    self.reply(200 if ok else 409, "application/json", json.dumps({"ok": ok, "output": output}, ensure_ascii=False).encode())
                    return
                qid, answer = str(data["id"]), str(data["answer"]).strip()[:4000]
            except (ValueError, KeyError, TypeError):
                self.reply(400, "application/json", b'{"error": "requete invalide"}')
                return
            if not answer or not answer_question(qid, answer):
                self.reply(409, "application/json", b'{"error": "question introuvable ou deja repondue"}')
                return
            self.reply(200, "application/json", b'{"ok": true}')

        def reply(self, code: int, kind: str, body: bytes, headers: dict[str, str] | None = None) -> None:
            self.send_response(code)
            self.send_header("Content-Type", kind)
            self.send_header("Cache-Control", "no-store")
            for key, value in (headers or {}).items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_: Any) -> None:
            return

    return Handler
