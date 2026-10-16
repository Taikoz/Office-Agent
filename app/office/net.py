"""Agent Office on the internal network (ChiefOS → Réseau). Off by default; the user opens it. It is a SEPARATE server,
on its own port, bound to this machine's private address only (never to a public one, never to every interface) and
only while hosting. It serves nothing of the main server: no transcripts, no terminal, no launches, no files. Only the
presence of the chiefs who joined (a name, a look, a room, a position, a bubble) and a chat, behind a join code.

The host's own page talks to the same hub through the main server (/api/net, token); a guest's page talks to this one
directly (CORS from its own http://127.0.0.1 page)."""

from __future__ import annotations

import ipaddress
import json
import re
import secrets
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

DEFAULT_PORT = 8766
MAX_PEERS = 8           # chiefs at once (the host included)
PEER_TTL = 20.0         # seconds without news: gone
CHAT_KEEP = 80          # messages kept
BODY_MAX = 4096         # bytes of a request
RATE = 30               # requests per second and per address
CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L
ROOMS = {"office", "lounge", "meeting", "terrace", "gym", "library"}
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
KEY = re.compile(r"^[a-z]{1,12}$")


def clean_text(v: Any, n: int) -> str:
    """A short single-line text: control characters out, trimmed to n characters."""
    return re.sub(r"[\x00-\x1f\x7f]", " ", str(v or ""))[:n].strip()


def clean_look(v: Any) -> dict[str, Any]:
    """The look of a chief: a few colours, small numbers, on/off; anything else is dropped."""
    out: dict[str, Any] = {}
    if not isinstance(v, dict):
        return out
    for k, x in list(v.items())[:12]:
        if not isinstance(k, str) or not KEY.match(k):
            continue
        if isinstance(x, bool):
            out[k] = x
        elif isinstance(x, (int, float)) and 0 <= x <= 40:
            out[k] = int(x)
        elif isinstance(x, str) and HEX.match(x):
            out[k] = x
        elif isinstance(x, str) and KEY.match(x):  # a hat's name
            out[k] = x
    return out


class Hub:
    """Who is here and what was said; shared by the LAN server and the host's own page."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.peers: dict[str, dict[str, Any]] = {}
        self.chat: list[dict[str, Any]] = []
        self.seq = 0

    def reset(self) -> None:
        with self.lock:
            self.peers.clear()
            self.chat.clear()

    def prune(self) -> None:
        now = time.time()
        for sid in [s for s, p in self.peers.items() if now - p["seen"] > PEER_TTL]:
            del self.peers[sid]

    def hello(self, data: dict[str, Any], host: bool = False) -> tuple[bool, dict[str, Any]]:
        with self.lock:
            self.prune()
            if len(self.peers) >= MAX_PEERS:
                return False, {"error": "bureau complet"}
            sid = secrets.token_urlsafe(12)
            self.peers[sid] = {"pid": secrets.token_hex(4), "name": clean_text(data.get("name"), 24) or "Chef", "look": clean_look(data.get("look")), "room": "office",
                               "x": 280.0, "y": 120.0, "bubble": "", "seen": time.time(), "host": host}
            self.say_system(f"{self.peers[sid]['name']} a rejoint le bureau")
            return True, {"sid": sid}

    def state(self, data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            if not p:
                return False, {"error": "session inconnue"}
            room = str(data.get("room", ""))
            try:
                x, y = float(data.get("x") or 0), float(data.get("y") or 0)
            except (TypeError, ValueError):
                return False, {"error": "position invalide"}
            p.update({"room": room if room in ROOMS else "office", "bubble": clean_text(data.get("bubble"), 80), "seen": time.time(),
                      "x": max(0.0, min(900.0, x)), "y": max(0.0, min(500.0, y))})
            if "look" in data:
                p["look"] = clean_look(data.get("look"))
            return True, {}

    def say(self, data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            text = clean_text(data.get("text"), 200)
            if not p or not text:
                return False, {"error": "message refusé"}
            p["seen"] = time.time()
            self.seq += 1
            self.chat.append({"id": self.seq, "t": time.time(), "name": p["name"], "text": text})
            del self.chat[:-CHAT_KEEP]
            return True, {}

    def say_system(self, text: str) -> None:
        self.seq += 1
        self.chat.append({"id": self.seq, "t": time.time(), "name": "", "text": text})
        del self.chat[:-CHAT_KEEP]

    def snapshot(self, sid: str, since: int) -> tuple[bool, dict[str, Any]]:
        with self.lock:
            self.prune()
            if sid not in self.peers:
                return False, {"error": "session inconnue"}
            self.peers[sid]["seen"] = time.time()
            others = [{k: v for k, v in p.items() if k != "seen"} for s, p in self.peers.items() if s != sid]  # never the others' sid
            return True, {"peers": others, "chat": [m for m in self.chat if m["id"] > since]}

    def leave(self, sid: str) -> None:
        with self.lock:
            p = self.peers.pop(sid, None)
            if p:
                self.say_system(f"{p['name']} est parti")


HUB = Hub()
STATE: dict[str, Any] = {"server": None, "code": "", "ip": "", "port": 0}
RATES: dict[str, list[float]] = {}


def lan_ip() -> str:
    """This machine's address on the internal network (the interface of the default route), or '' when none."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # no packet is sent: it only picks the interface
            ip = s.getsockname()[0]
    except OSError:
        return ""
    return ip if ipaddress.ip_address(ip).is_private and not ipaddress.ip_address(ip).is_loopback else ""


def status() -> dict[str, Any]:
    on = STATE["server"] is not None
    with HUB.lock:
        HUB.prune()
        n = len(HUB.peers)
    return {"on": on, "ip": STATE["ip"] if on else lan_ip(), "port": STATE["port"] or DEFAULT_PORT, "code": STATE["code"] if on else "", "peers": n}


def start(port: int = DEFAULT_PORT) -> dict[str, Any]:
    """Opens the office on the internal network: a new join code, the LAN server on this machine's private address."""
    if STATE["server"] is not None:
        return status()
    ip = lan_ip()
    if not ip:
        raise ValueError("pas d'adresse sur un réseau interne (privé) : impossible d'ouvrir le bureau")
    if not 1024 <= port <= 65535:
        raise ValueError("port invalide")
    server = ThreadingHTTPServer((ip, port), LanHandler)
    server.daemon_threads = True
    STATE.update(server=server, code="".join(secrets.choice(CODE_CHARS) for _ in range(6)), ip=ip, port=port)
    HUB.reset()
    threading.Thread(target=server.serve_forever, name="office-net", daemon=True).start()
    return status()


def stop() -> dict[str, Any]:
    """Closes the office to the network: the LAN server stops, everyone is out."""
    server = STATE["server"]
    if server is not None:
        server.shutdown()
        server.server_close()
    STATE.update(server=None, code="", ip="", port=0)
    HUB.reset()
    return status()


def rate_ok(ip: str) -> bool:
    now = time.time()
    hits = [t for t in RATES.get(ip, []) if now - t < 1.0]
    if len(hits) >= RATE:
        RATES[ip] = hits
        return False
    hits.append(now)
    RATES[ip] = hits
    if len(RATES) > 500:  # never grows without bound
        RATES.clear()
    return True


class LanHandler(BaseHTTPRequestHandler):
    """The only thing reachable from the network: /net/hello, /net/state, /net/chat, /net/peers, /net/leave."""

    server_version = "office-net"
    sys_version = ""

    def cors(self) -> None:
        # a guest's page is its own office, served on its own loopback (http://127.0.0.1:<port>)
        origin = self.headers.get("Origin", "")
        if re.match(r"^http://(127\.0\.0\.1|localhost)(:\d{1,5})?$", origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def reply(self, code: int, body: dict[str, Any]) -> None:
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def allowed(self) -> bool:
        if not rate_ok(self.client_address[0]):
            self.reply(429, {"error": "trop de requêtes"})
            return False
        if not STATE["code"] or not secrets.compare_digest(self.headers.get("X-Join-Code", "").upper(), STATE["code"]):
            self.reply(403, {"error": "code refusé"})
            return False
        return True

    def do_OPTIONS(self) -> None:  # noqa: N802 — the CORS preflight of a guest's page
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Join-Code")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if not self.path.startswith("/net/peers?"):
            self.reply(404, {"error": "inconnu"})
            return
        if not self.allowed():
            return
        q = dict(p.split("=", 1) for p in self.path.split("?", 1)[1].split("&") if "=" in p)
        since = int(q.get("since", "0")) if q.get("since", "0").isdigit() else 0
        ok, body = HUB.snapshot(q.get("sid", ""), since)
        self.reply(200 if ok else 400, body)

    def do_POST(self) -> None:  # noqa: N802
        if self.path not in ("/net/hello", "/net/state", "/net/chat", "/net/leave"):
            self.reply(404, {"error": "inconnu"})
            return
        if not self.allowed():
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > BODY_MAX:
                raise ValueError("trop gros")
            data = json.loads(self.rfile.read(size) or b"{}")
            if not isinstance(data, dict):
                raise ValueError("format")
        except (ValueError, json.JSONDecodeError):
            self.reply(400, {"error": "requête invalide"})
            return
        ok, body = act(self.path.rsplit("/", 1)[1], data)
        self.reply(200 if ok else 400, body)

    def log_message(self, *_: Any) -> None:
        pass


def act(action: str, data: dict[str, Any], host: bool = False) -> tuple[bool, dict[str, Any]]:
    """One action of a chief (the guests through the LAN server, the host through /api/net)."""
    if action == "hello":
        return HUB.hello(data, host)
    if action == "state":
        return HUB.state(data)
    if action == "chat":
        return HUB.say(data)
    if action == "peers":
        since = data.get("since", 0)
        return HUB.snapshot(str(data.get("sid", "")), since if isinstance(since, int) else 0)
    if action == "leave":
        HUB.leave(str(data.get("sid", "")))
        return True, {}
    return False, {"error": "action inconnue"}
