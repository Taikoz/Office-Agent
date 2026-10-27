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
OFF = 'réseau désactivé : mettre "network": {"enabled": true} dans ~/.claude/agent-office.json puis relancer le serveur'
MAX_PEERS = 8           # chiefs at once (the host included)
PEER_TTL = 20.0         # seconds without news: gone
CHAT_KEEP = 80          # messages kept
BODY_MAX = 4096         # bytes of a request
LAYOUT_MAX = 400_000    # bytes of an office's layout (its rooms, furniture, decor), for the visitors
CREW_MAX = 24_000       # bytes of an office's team as its visitors see it
CREW_SIZE = 24          # people in it
CREW_TTL = 6.0          # seconds: an older team is not shown any more
PID = re.compile(r"^[0-9a-f]{8}$")
RATE = 60               # requests per second and per address (a duel: 20 a second, on top of the presence)
DUEL_MAX = 2000         # bytes of one player's state in a duel
RTC_MAX = 16_000        # bytes of one side of a video call's set-up (its offer or answer, the voice: WebRTC)
BEACON_PORT = 8768      # UDP: an open office says so on the internal network (no code in it), the others list it
DUEL_TTL = 30.0         # seconds without news: the duel is over
CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L
ROOMS = {"office", "lounge", "meeting", "terrace", "gym", "library"}
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
KEY = re.compile(r"^[a-z][a-zA-Z]{0,11}$")  # a key (camelCase) or a word
ARMS = {"down", "up", "type", "baton"}
STATUS = {"work", "think", "blocked", "done", "walk", "coffee", "question", "rest", "meeting", "party", "sport", "read", "away"}  # away: gone to an afterwork elsewhere
# what a visitor does to the office it visits: to a dev (talk, cheer, coffee, kudos, wave) or to an object (a few safe
# switches: a lamp, a blind, the music); the host's page decides what it does with it
EMOTES = {"wave", "dance", "clap", "laugh", "love", "five", "cheers", "think"}
PRESENCE = {"dispo", "occupe", "reunion", "dnd", "absent"}
GID = re.compile(r"^[0-9a-f]{8}$")
# a duel between two chiefs (ping-pong, baby-foot): the challenge and its answers; an afterwork of all the offices
DUEL = re.compile(r"^(?:invite:(?:pingpong|babyfoot|darts):[0-9a-f]{8}|(?:accept|decline|quit|busy):[0-9a-f]{8}|cheer:[0-9a-f]{8}:(?:clap|wow|laugh|fire|love))$")
DUEL_INFO = re.compile(r"^[0-9a-f]{8}:(?:pingpong|babyfoot|darts):[0-9a-f]{8}$")  # gid:game:opponent, in a player's presence
VISIO = re.compile(r"^(?:ring|accept|decline|end|busy):[0-9a-f]{8}$")
GIFT = re.compile(r"^(?:coffee|croissants|pizza|cake|plant|flowers)$")
PARTY = re.compile(r"^(?:start|stop|join|leave)$")
ACT = re.compile(r"^(?:(?:talk|cheer|coffee|kudos|wave|pet):[^\x00-\x1f:]{1,24}|use:\d{1,10}:(?:lamp|blind|music))$")


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


def num(v: Any, lo: float, hi: float, default: float = 0.0) -> float:
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, x)) if x == x else default  # NaN: the default


def clean_pose(v: Any) -> dict[str, Any]:
    """How someone stands: seated or not, turned where, the arms, raised by a seat (z)."""
    if not isinstance(v, dict):
        return {}
    out: dict[str, Any] = {k: True for k in ("seated", "back", "walk") if v.get(k) is True}
    if v.get("arms") in ARMS:
        out["arms"] = v["arms"]
    d = v.get("dir")
    if isinstance(d, list) and len(d) == 2:
        out["dir"] = [round(num(d[0], -1e3, 1e3), 2), round(num(d[1], -1e3, 1e3), 2)]
    if "z" in v:
        out["z"] = round(num(v.get("z"), 0, 30), 1)
    return out


def clean_crew(v: Any) -> list[dict[str, Any]]:
    """An office's team for its visitors: names, looks, where they are and how, what they do in a word, their mood
    and best skills. Only these fields, bounded: never what the agents work on (tickets, files, commands)."""
    out: list[dict[str, Any]] = []
    for m in (v if isinstance(v, list) else [])[:CREW_SIZE]:
        if not isinstance(m, dict) or m.get("room") not in ROOMS or not clean_text(m.get("n"), 24):
            continue
        skills = [[clean_text(s[0], 24), int(num(s[1], 0, 10))] for s in (m.get("sk") if isinstance(m.get("sk"), list) else [])[:3]
                  if isinstance(s, list) and len(s) == 2]
        out.append({"n": clean_text(m.get("n"), 24), "room": m["room"], "x": round(num(m.get("x"), 0, 900), 1), "y": round(num(m.get("y"), 0, 500), 1),
                    "look": clean_look(m.get("look")), "pose": clean_pose(m.get("pose")), "b": clean_text(m.get("b"), 60),
                    "tag": clean_text(m.get("tag"), 30), "c": m["c"] if isinstance(m.get("c"), str) and HEX.match(m["c"]) else "",
                    "st": m["st"] if m.get("st") in STATUS else "", "what": clean_text(m.get("what"), 40),
                    "mood": int(num(m.get("mood"), 0, 100, 50)), "kudos": int(num(m.get("kudos"), 0, 1e6)), "sk": skills,
                    **({"pet": m["pet"], "pm": m.get("pm") if m.get("pm") in ("walk", "sit", "sleep") else "sit",
                        "fx": round(num(m.get("fx"), 0, 900, 0), 1), "fy": round(num(m.get("fy"), 0, 500, 0), 1)} if m.get("pet") in ("cat", "dog") else {})})
    return out


class Hub:
    """Who is here and what was said; shared by the LAN server and the host's own page."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.peers: dict[str, dict[str, Any]] = {}
        self.layouts: dict[str, tuple[float, str]] = {}  # pid → (when, the layout as JSON), for whoever visits
        self.crews: dict[str, tuple[float, list[dict[str, Any]]]] = {}  # pid → (when, its team), for whoever visits
        self.duels: dict[str, dict[str, tuple[float, str]]] = {}  # gid → pid → (when, its state as JSON)
        self.rtcs: dict[str, dict[str, tuple[float, str]]] = {}   # call id → pid → (when, its offer or answer)
        self.watchers: dict[str, dict[str, float]] = {}           # gid → pid of a spectator → when
        self.chat: list[dict[str, Any]] = []
        self.seq = 0

    def reset(self) -> None:
        with self.lock:
            self.peers.clear()
            self.chat.clear()
            self.layouts.clear()
            self.crews.clear()
            self.duels.clear()
            self.rtcs.clear()
            self.watchers.clear()

    def prune(self) -> None:
        now = time.time()
        for sid in [s for s, p in self.peers.items() if now - p["seen"] > PEER_TTL]:
            self.layouts.pop(self.peers[sid]["pid"], None)
            self.crews.pop(self.peers[sid]["pid"], None)
            del self.peers[sid]

    def hello(self, data: dict[str, Any], host: bool = False) -> tuple[bool, dict[str, Any]]:
        """A chief comes in. A page coming back (reloaded) replaces its old session (old: its sid), and the host's page
        is only one: no ghost of the same chief for 20 s."""
        with self.lock:
            self.prune()
            old = str(data.get("old") or "")
            if old in self.peers:
                del self.peers[old]
            if host:
                for s in [s for s, p in self.peers.items() if p["host"]]:
                    del self.peers[s]
            if len(self.peers) >= MAX_PEERS:
                return False, {"error": "bureau complet"}
            sid = secrets.token_urlsafe(12)
            self.peers[sid] = {"pid": secrets.token_hex(4), "name": clean_text(data.get("name"), 24) or "Chef", "look": clean_look(data.get("look")), "room": "office",
                               "x": 280.0, "y": 120.0, "bubble": "", "seen": time.time(), "host": host, "visiting": "", "pose": {}, "emote": "", "status": "dispo", "duel": ""}
            self.say_system(f"{self.peers[sid]['name']} est connecté")
            return True, {"sid": sid, "pid": self.peers[sid]["pid"]}

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
            visiting = str(data.get("visiting") or "")
            p.update({"room": room if room in ROOMS else "office", "bubble": clean_text(data.get("bubble"), 80), "seen": time.time(),
                      "x": max(0.0, min(900.0, x)), "y": max(0.0, min(500.0, y)), "visiting": visiting if PID.match(visiting) else ""})
            p["pose"] = clean_pose(data.get("pose"))
            p["emote"] = data["emote"] if data.get("emote") in EMOTES else ""
            if data.get("status") in PRESENCE:
                p["status"] = data["status"]
            duel = str(data.get("duel") or "")
            p["duel"] = duel if DUEL_INFO.match(duel) else ""
            if "look" in data:
                p["look"] = clean_look(data.get("look"))
            return True, {}

    def say(self, data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        """A message: to everyone, or to one chief (to: its pid; then only the two of them get it). kind: a text, or a
        phone call (invite) and its answer (accept / decline), or what a visitor does in the office it visits (act: to
        its owner; see ACT). Kept in memory only: gone when the server closes."""
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            kind = str(data.get("kind") or "text")
            to = str(data.get("to") or "")
            text = clean_text(data.get("text"), 200)
            if not p or kind not in ("text", "invite", "accept", "decline", "act", "duel", "party", "visio", "gift", "guestbook") or (to and not PID.match(to)) or (kind == "text" and not text) or (kind != "text" and not to):
                return False, {"error": "message refusé"}
            if kind == "act" and (not ACT.match(text) or p["visiting"] != to):  # only in the office we are in
                return False, {"error": "action refusée"}
            if (kind == "duel" and not DUEL.match(text)) or (kind == "party" and not PARTY.match(text)) or (kind == "visio" and not VISIO.match(text)) \
                    or (kind == "gift" and not GIFT.match(text)) or (kind == "guestbook" and (not text or p["visiting"] != to)):  # a guestbook: where we are
                return False, {"error": "message refusé"}
            p["seen"] = time.time()
            self.seq += 1
            self.chat.append({"id": self.seq, "t": time.time(), "name": p["name"], "from": p["pid"], "to": to, "kind": kind, "text": text})
            del self.chat[:-CHAT_KEEP]
            return True, {}

    def say_system(self, text: str) -> None:
        self.seq += 1
        self.chat.append({"id": self.seq, "t": time.time(), "name": "", "from": "", "to": "", "kind": "system", "text": text})
        del self.chat[:-CHAT_KEEP]

    def snapshot(self, sid: str, since: int) -> tuple[bool, dict[str, Any]]:
        with self.lock:
            self.prune()
            if sid not in self.peers:
                return False, {"error": "session inconnue"}
            self.peers[sid]["seen"] = time.time()
            others = [{k: v for k, v in p.items() if k != "seen"} for s, p in self.peers.items() if s != sid]  # never the others' sid
            mine = self.peers[sid]["pid"]  # a private message, a call: only to the two chiefs concerned
            out: dict[str, Any] = {"peers": others, "chat": [m for m in self.chat if m["id"] > since and (not m["to"] or m["to"] == mine or m["from"] == mine)]}
            crew = self.crews.get(self.peers[sid]["visiting"])  # the team of the office we visit
            if crew and time.time() - crew[0] < CREW_TTL:
                out["crew"] = crew[1]
            return True, out

    def crews_of(self, sid: str, want: Any) -> dict[str, list[dict[str, Any]]]:
        """The teams of a few offices (their devs come to our afterwork)."""
        with self.lock:
            if sid not in self.peers or not isinstance(want, list):
                return {}
            now = time.time()
            return {pid: c[1] for pid in want[:MAX_PEERS] if isinstance(pid, str) and (c := self.crews.get(pid)) and now - c[0] < CREW_TTL}

    def relay(self, data: dict[str, Any], store: dict[str, dict[str, tuple[float, str]]], most: int) -> tuple[bool, dict[str, Any]]:
        """Two pages talking through us: each one's last state in, the other one's out (a duel: the challenger's page
        plays the match; a video call: the set-up of the voice)."""
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            gid = str(data.get("gid", ""))
            if not p or not GID.match(gid) or not isinstance(data.get("st"), dict):
                return False, {"error": "relais refusé"}
            raw = json.dumps(data["st"], ensure_ascii=False)
            if len(raw.encode()) > most:
                return False, {"error": "état trop gros"}
            now = time.time()
            for g in [g for g, d in store.items() if all(now - w > DUEL_TTL for w, _ in d.values())]:
                del store[g]
                self.watchers.pop(g, None)
            d = store.setdefault(gid, {})
            if p["pid"] not in d and len(d) >= 2:
                return False, {"error": "complet"}
            p["seen"] = now
            d[p["pid"]] = (now, raw)
            other = next(((w, st) for pid, (w, st) in d.items() if pid != p["pid"]), None)
            watching = sum(1 for w in self.watchers.get(gid, {}).values() if now - w < 5)
            return True, ({"st": json.loads(other[1]), "age": round(now - other[0], 3)} if other else {"st": None}) | {"watching": watching}

    def watch(self, data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        """A spectator of a duel: the state of one of its players (the one whose page plays the match)."""
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            gid, pid = str(data.get("gid", "")), str(data.get("pid", ""))
            got = self.duels.get(gid, {}).get(pid)
            if not p or not got:
                return False, {"error": "pas de partie"}
            p["seen"] = time.time()
            self.watchers.setdefault(gid, {})[p["pid"]] = time.time()
            return True, {"st": json.loads(got[1])}

    def put_crew(self, data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        """A chief's team as its visitors see it (clean_crew)."""
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            if not p or not isinstance(data.get("crew"), list):
                return False, {"error": "équipe refusée"}
            p["seen"] = time.time()
            self.crews[p["pid"]] = (time.time(), clean_crew(data["crew"]))
            return True, {}

    def put_layout(self, data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        """A chief's office as it is (rooms, furniture, decor): what its visitors see. Kept as given, only bounded."""
        with self.lock:
            p = self.peers.get(str(data.get("sid", "")))
            layout = data.get("layout")
            if not p or not isinstance(layout, dict):
                return False, {"error": "plan refusé"}
            raw = json.dumps(layout, ensure_ascii=False)
            if len(raw.encode()) > LAYOUT_MAX:
                return False, {"error": "plan trop grand"}
            self.layouts[p["pid"]] = (time.time(), raw)
            return True, {}

    def get_layout(self, sid: str, pid: str, at: Any = None) -> tuple[bool, dict[str, Any]]:
        """at: when the plan we have was published; the same one again: only {"same": true} (a plan is big)."""
        with self.lock:
            if sid not in self.peers:
                return False, {"error": "session inconnue"}
            got = self.layouts.get(pid)
            if got and isinstance(at, (int, float)) and at == got[0]:
                return True, {"at": got[0], "same": True}
            return (True, {"at": got[0], "layout": json.loads(got[1])}) if got else (False, {"error": "pas de plan"})

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
    return {"on": on, "ip": STATE["ip"] if on else lan_ip(), "port": STATE["port"] or DEFAULT_PORT, "code": STATE["code"] if on else "", "peers": n,
            "auto": bool(load_conf().get("auto"))}


def conf_file() -> Any:
    from . import config  # read at call time (the tests move it)
    return config.STATE_DIR / "net.json"


def load_conf() -> dict[str, Any]:
    """The network settings kept between two starts: the join code (the same after a restart: the others come back by
    themselves), the port, and whether the office opens to the network when the server starts."""
    try:
        c = json.loads(conf_file().read_text())
    except (OSError, ValueError):
        return {}
    if not isinstance(c, dict):
        return {}
    code = c.get("code") if isinstance(c.get("code"), str) and re.fullmatch(f"[{CODE_CHARS}]{{6}}", c.get("code", "")) else ""
    port = c.get("port") if isinstance(c.get("port"), int) and 1024 <= c["port"] <= 65535 else DEFAULT_PORT
    return {"code": code, "port": port, "auto": c.get("auto") is True}


def save_conf(**kw: Any) -> None:
    c = load_conf() | kw
    f = conf_file()
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(c))
    tmp.chmod(0o600)  # the join code
    tmp.replace(f)


def start(port: int = DEFAULT_PORT, new_code: bool = False) -> dict[str, Any]:
    """Opens the office on the internal network: the LAN server on this machine's private address, with the join code
    kept from last time (a new one when asked, or the first time)."""
    from . import config  # read at call time (the tests move it)
    if not config.network_enabled():
        raise ValueError(OFF)
    if STATE["server"] is not None:
        if not new_code:
            return status()
        STATE["code"] = "".join(secrets.choice(CODE_CHARS) for _ in range(6))
        save_conf(code=STATE["code"])
        return status()
    ip = lan_ip()
    if not ip:
        raise ValueError("pas d'adresse sur un réseau interne (privé) : impossible d'ouvrir le bureau")
    if not 1024 <= port <= 65535:
        raise ValueError("port invalide")
    server = ThreadingHTTPServer((ip, port), LanHandler)
    server.daemon_threads = True
    code = "" if new_code else load_conf().get("code", "")
    code = code or "".join(secrets.choice(CODE_CHARS) for _ in range(6))
    save_conf(code=code, port=port)
    STATE.update(server=server, code=code, ip=ip, port=port)
    HUB.reset()
    threading.Thread(target=server.serve_forever, name="office-net", daemon=True).start()
    threading.Thread(target=beacon, args=(server,), name="office-net-beacon", daemon=True).start()
    return status()


def autostart() -> None:
    """At the server's start: opens the office to the network when it was asked to (ChiefOS → Réseau)."""
    from . import config
    c = load_conf()
    if c.get("auto") and config.network_enabled():
        try:
            start(c["port"])
        except (ValueError, OSError):
            pass  # no internal network now, or the port taken: the page says so


def beacon(server: Any) -> None:
    """While the office is open: every 2 s, "an office is here" on the internal network (its name and port; never the
    code), so the other chiefs see it in their list (discover)."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        while STATE["server"] is server:
            with HUB.lock:
                name = next((p["name"] for p in HUB.peers.values() if p["host"]), "")
            msg = json.dumps({"office": 1, "name": name, "port": STATE["port"]}).encode()
            for to in ("255.255.255.255", STATE["ip"].rsplit(".", 1)[0] + ".255"):
                try:
                    s.sendto(msg, (to, BEACON_PORT))
                except OSError:
                    pass
            time.sleep(2)


FOUND: dict[str, dict[str, Any]] = {}  # "ip:port" → { ip, port, name, seen }
LISTEN: dict[str, Any] = {"on": False}


def listen() -> None:
    """The offices open on the internal network (their beacons), heard from the first discover on."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SO_REUSEPORT"):
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
        s.bind(("", BEACON_PORT))
    except OSError:
        LISTEN["on"] = False
        return
    with s:
        while True:
            try:
                raw, (ip, _) = s.recvfrom(512)
                b = json.loads(raw)
            except (OSError, ValueError):
                continue
            if not isinstance(b, dict) or b.get("office") != 1 or not isinstance(b.get("port"), int) or not ipaddress.ip_address(ip).is_private:
                continue
            if len(FOUND) > 64:
                FOUND.clear()
            FOUND[f"{ip}:{b['port']}"] = {"ip": ip, "port": b["port"], "name": clean_text(b.get("name"), 24), "seen": time.time()}


def discover() -> dict[str, Any]:
    from . import config
    if not config.network_enabled():
        return {"offices": [], "off": OFF}  # no UDP listener on the network either
    if not LISTEN["on"]:
        LISTEN["on"] = True
        threading.Thread(target=listen, name="office-net-listen", daemon=True).start()
    now, mine = time.time(), f"{STATE['ip']}:{STATE['port']}"
    return {"offices": [{k: v for k, v in o.items() if k != "seen"} for key, o in list(FOUND.items()) if now - o["seen"] < 8 and key != mine]}


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
        if not self.path.startswith(("/net/peers?", "/net/layout?")):
            self.reply(404, {"error": "inconnu"})
            return
        if not self.allowed():
            return
        q = dict(p.split("=", 1) for p in self.path.split("?", 1)[1].split("&") if "=" in p)
        if self.path.startswith("/net/layout?"):
            ok, body = HUB.get_layout(q.get("sid", ""), q.get("pid", ""))
        else:
            since = int(q.get("since", "0")) if q.get("since", "0").isdigit() else 0
            ok, body = HUB.snapshot(q.get("sid", ""), since)
        self.reply(200 if ok else 400, body)

    def do_POST(self) -> None:  # noqa: N802
        if self.path not in ("/net/hello", "/net/state", "/net/sync", "/net/chat", "/net/layout", "/net/crew", "/net/duel", "/net/watch", "/net/rtc", "/net/leave"):
            self.reply(404, {"error": "inconnu"})
            return
        if not self.allowed():
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > {"/net/layout": LAYOUT_MAX + 1000, "/net/crew": CREW_MAX, "/net/rtc": RTC_MAX + 500}.get(self.path, BODY_MAX):
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
    if action == "sync":  # where I am, then who is there and what was said: one request
        ok, body = HUB.state(data)
        if not ok:
            return ok, body
        since = data.get("since", 0)
        ok, body = HUB.snapshot(str(data.get("sid", "")), since if isinstance(since, int) else 0)
        if ok and data.get("want"):  # the teams at our afterwork
            body["crews"] = HUB.crews_of(str(data.get("sid", "")), data.get("want"))
        return ok, body
    if action == "layout":
        return HUB.put_layout(data) if "layout" in data else HUB.get_layout(str(data.get("sid", "")), str(data.get("pid", "")), data.get("at"))
    if action == "chat":
        return HUB.say(data)
    if action == "crew":
        return HUB.put_crew(data)
    if action == "duel":
        return HUB.relay(data, HUB.duels, DUEL_MAX)
    if action == "watch":
        return HUB.watch(data)
    if action == "rtc":
        return HUB.relay(data, HUB.rtcs, RTC_MAX)
    if action == "peers":
        since = data.get("since", 0)
        return HUB.snapshot(str(data.get("sid", "")), since if isinstance(since, int) else 0)
    if action == "leave":
        HUB.leave(str(data.get("sid", "")))
        return True, {}
    return False, {"error": "action inconnue"}
