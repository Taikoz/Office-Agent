// The other chiefs on the internal network (ChiefOS → Réseau, office/net.py). Each one stays in its own office: a
// connected chief shows in ours only when it comes to visit. "Visiter" takes us into someone's office (its rooms,
// furniture and decor, sent by its page: rooms/visit.js), with an avatar of our own there: our chief at home does not
// move. Four times a second one request says where we are and gets the others and the chat; their moves are smoothed.
// Never in the demo.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, ROOM, badge, chief } from "../core/core.js";
import { CHIEF_LOOK } from "./chief.js";
import { chiefHat } from "./chiefedit.js";
import { toast } from "../sims/progress.js";
import { bubble, drawPerson, headroom, stepOf } from "./scene.js";
import { decor } from "./decor.js";
import { setView, view } from "./lounge.js";
import { OFFICE_SPOTS } from "./place.js";
import { applyAct, crewSnapshot } from "./share.js";

export const net = { mode: "", addr: "", code: "", sid: "", pid: "", peers: [], chat: [], since: 0, error: "", status: null, said: new Map(), quiet: false, visit: null,
  convs: new Map(), open: "", ringing: null, presence: "dispo", emote: null };  // convs: "all" or a chief's pid → { msgs, unread } — in memory only, never saved
// what a chief does for a moment (the phone's Emotes) and how available he is (its Statut); "dnd" declines calls
export const EMOTE_INFO = { wave: ["👋", "Saluer"], dance: ["💃", "Danser"], clap: ["👏", "Applaudir"], laugh: ["😂", "Rire"], love: ["❤️", "Cœur"], five: ["🙌", "High five"], cheers: ["🍻", "Santé"], think: ["🤔", "Réfléchir"] };
export const PRESENCE_INFO = { dispo: ["🟢", "Disponible"], occupe: ["🟠", "Occupé"], reunion: ["📅", "En réunion"], dnd: ["⛔", "Ne pas déranger"], absent: ["💤", "Absent"] };
try { const p = localStorage.getItem("office-net-presence"); if (PRESENCE_INFO[p]) net.presence = p; } catch (_) { /* storage blocked */ }
export function setPresence(p) { if (!PRESENCE_INFO[p]) return; net.presence = p; try { localStorage.setItem("office-net-presence", p); } catch (_) { /* storage blocked */ } }
// an emote: shown at once over our chief (at home or visiting), sent with our position for 4 s
export function emote(key) {
  const e = EMOTE_INFO[key]; if (!e) return;
  const t = performance.now();
  net.emote = { key, until: t + 4000 };
  if (net.visit) Object.assign(net.visit, { bubble: `${e[0]} ${e[1]}`, until: t + 4000 });  // its body language: rooms/visit.js
  else { chief.bubble = `${e[0]}`; chief.until = t + 4000; chief.gesture = { pose: { arms: "up" }, until: t + 4000 }; }
}
const demo = () => typeof DEMO !== "undefined" && DEMO;
// one request: to our own server as the host, to the host's network server as a guest
export async function call(action, body = {}) {
  if (net.mode === "host") {
    const r = await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action, ...body }) });
    const out = await r.json(); if (!out.ok) throw new Error(out.error || `HTTP ${r.status}`); return out;
  }
  const r = await fetch(`http://${net.addr}/net/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Join-Code": net.code }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({})); if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`); return out;
}
const me = () => ({ name: CHIEF_NAME, look: { ...CHIEF_LOOK, hat: chiefHat() || undefined } });
// where our chief is and how he stands: in our office, or in the office we visit (our avatar there)
const toward = (p, x, y) => [Math.round(p.x - x), Math.round(p.y - y)];
function chiefPose() {
  if (chief.room === "lounge") {
    const walking = chief.lpath.length > 0, act = !walking && chief.lspot?.act, pose = act?.pose || {};
    return { walk: walking, seated: !!pose.seated, arms: pose.arms || "down", back: walking ? chief.lpath[0].y < chief.ly : !!(act && chief.lspot.back),
      dir: walking ? toward(chief.lpath[0], chief.lx, chief.ly) : chief.lspot?.face || null, z: walking ? 0 : chief.lspot?.lift || 0 };
  }
  const walking = chief.path.length > 0, at = walking ? "" : chief.at, seated = ["console", "pc", "chiefos"].includes(at);
  return { walk: walking, seated, back: walking ? chief.path[0].y < chief.y : at === "console", arms: at === "console" ? "type" : at === "coffee" ? "up" : "down",
    dir: walking ? toward(chief.path[0], chief.x, chief.y) : null, z: at === "podium" && OFFICE_SPOTS.podium ? 5 : 0 };
}
function where() {
  const v = net.visit;
  if (v) return { room: v.room, x: v.x, y: v.y, visiting: v.pid, pose: v.dir ? { walk: true, dir: v.dir.map(Math.round) } : v.pose ? { seated: v.pose.seated, arms: v.pose.arms, back: v.pose.back, dir: v.pose.dir, z: v.pose.z } : {} };
  if (chief.room === "lounge") return { room: "lounge", x: chief.lx, y: chief.ly, visiting: "", pose: chiefPose() };
  return { room: chief.room || "office", x: chief.x, y: chief.y, visiting: "", pose: chiefPose() };
}

/* ---------- hosting, joining, leaving ---------- */
export async function host(port = 0) {
  if (demo()) throw new Error("pas en mode démo");
  const r = await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action: "host", ...(port ? { port } : {}) }) });
  const st = await r.json(); if (!st.ok) throw new Error(st.error || "impossible d'ouvrir le réseau");
  net.status = st; net.mode = "host"; await join0();
  return st;
}
export async function join(addr, code) {
  if (demo()) throw new Error("pas en mode démo");
  if (!/^(\d{1,3}\.){3}\d{1,3}(:\d{2,5})?$/.test(addr)) throw new Error("adresse attendue : 192.168.1.20:8766");
  Object.assign(net, { mode: "guest", addr: addr.includes(":") ? addr : `${addr}:8766`, code: code.trim().toUpperCase() });
  await join0();
  remember({ addr: net.addr, code: net.code, auto: true });  // the page comes back by itself after a reload
}
// the last office joined (its address and code, per address too): rejoined by itself while "auto"
export function lastJoin() { try { return JSON.parse(localStorage.getItem("office-net-last") || "{}") || {}; } catch (_) { return {}; } }
export function codeFor(addr) { try { return JSON.parse(localStorage.getItem("office-net-codes") || "{}")[addr] || ""; } catch (_) { return ""; } }
function remember(last) {
  try {
    localStorage.setItem("office-net-last", JSON.stringify(last));
    if (last.addr && last.code) { const all = JSON.parse(localStorage.getItem("office-net-codes") || "{}"); all[last.addr] = last.code; localStorage.setItem("office-net-codes", JSON.stringify(all)); }
  } catch (_) { /* storage blocked */ }
}
async function join0() {
  try {
    let old = ""; try { old = sessionStorage.getItem("office-net-sid") || ""; } catch (_) { /* storage blocked */ }
    const out = await call("hello", { ...me(), old });  // this page's session before a reload: replaced
    try { sessionStorage.setItem("office-net-sid", out.sid); } catch (_) { /* storage blocked */ }
    Object.assign(net, { sid: out.sid, pid: out.pid, since: 0, chat: [], peers: [], error: "", quiet: true, layoutSig: "", lookSent: true, ringing: null });  // the history comes without notifications
    net.convs.clear();
  } catch (err) { const m = net.mode; Object.assign(net, { mode: "", sid: "" }); throw new Error(m === "guest" ? `connexion refusée : ${err.message}` : err.message); }
}
export async function leave() {
  endVisit(false);
  if (net.mode === "guest") remember({ ...lastJoin(), auto: false });  // left on purpose: not back by itself
  try { if (net.sid) await call("leave", { sid: net.sid }); } catch (_) { /* gone already */ }
  if (net.mode === "host") await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action: "stop" }) }).catch(() => {});
  Object.assign(net, { mode: "", sid: "", pid: "", peers: [], status: null, error: "", ringing: null });
  net.convs.clear(); net.chat = [];  // the conversations go with the connection: nothing is kept
  if (view === "visit") setView("office");
}
// at the page's start: our office still open (the server kept it, or opens it by itself): we are its host again; else
// the office we were in, joined again (every 10 s until it answers, while we did not leave it)
async function resume() {
  if (demo() || net.sid) return;
  try {
    const r = await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action: "status" }) });
    const st = await r.json();
    if (st.ok && st.on) { net.status = st; net.mode = "host"; return await join0(); }
  } catch (_) { /* the server answers later */ }
  const last = lastJoin();
  if (!last.auto || !last.addr || !last.code || net.sid) return;
  try { await join(last.addr, last.code); toast("RÉSEAU 🌐", "Reconnecté", `au bureau ${last.addr}`); }
  catch (_) { if (net.mode === "guest") Object.assign(net, { mode: "" }); setTimeout(resume, 10000); }
}
setTimeout(resume, 1500);
export async function sendChat(text, to = "") {
  if (!net.sid || !text.trim()) return;
  await call("chat", { sid: net.sid, text: text.trim(), to });
  if (to) return;  // a private message: no bubble over our head
  const b = text.trim().slice(0, 60), t = performance.now();
  if (net.visit) Object.assign(net.visit, { bubble: b, until: t + 4000 }); else { chief.bubble = b; chief.until = t + 4000; }
}

/* ---------- the conversations (ChiefOS → Messages) and the phone (world/phone.js) ---------- */
export const conv = key => net.convs.get(key) || net.convs.set(key, { msgs: [], unread: 0 }).get(key);
export const unread = () => [...net.convs.values()].reduce((s, c) => s + c.unread, 0);
function received(m, t) {
  const mineMsg = m.from === net.pid, other = mineMsg ? m.to : m.from;
  if (m.kind === "system") { conv("all").msgs.push(m); if (!net.quiet) toast("RÉSEAU 🌐", m.text, ""); return; }
  if (m.kind === "act") { if (!net.quiet && !mineMsg && m.to === net.pid) applyAct(m, t); return; }  // a visitor here (world/share.js)
  if (["duel", "party", "visio", "gift", "guestbook"].includes(m.kind)) {  // games/online.js, social/netparty.js, world/visio.js, social/gifts.js
    const on = { duel: hub.onDuelMsg, party: hub.onPartyMsg, visio: hub.onVisioMsg, gift: hub.onGiftMsg, guestbook: hub.onGuestbookMsg }[m.kind];
    if (!net.quiet && !mineMsg && m.to === net.pid && Date.now() / 1000 - m.t < 60) on?.(m, t);
    return;
  }
  if (m.kind === "text") {
    const c = conv(m.to ? other : "all"); c.msgs.push(m); c.msgs.splice(0, c.msgs.length - 100);
    if (net.quiet || mineMsg) return;
    if (net.open !== (m.to ? other : "all")) { c.unread++; hub.phoneBanner?.({ icon: "💬", app: "thread", thread: m.to ? other : "all", title: m.to ? m.name : `${m.name} · Tout le monde`, body: m.text }); }
    if (!m.to) net.said.set(m.name, { text: m.text, until: t + 5000 });
    hub.sfx?.("commit");
    return;
  }
  // a call: someone invites us to their office; and the answers to ours
  if (net.quiet || mineMsg || m.to !== net.pid) return;
  if (m.kind === "invite" && Date.now() / 1000 - m.t < 60) {
    if (net.presence === "dnd") { call("chat", { sid: net.sid, kind: "decline", to: m.from }).catch(() => {}); return toast("📱 TÉLÉPHONE", `${m.name} a appelé`, "Refusé : tu es en « ne pas déranger »."); }
    net.ringing = { kind: "call", from: m.from, name: m.name, at: t }; hub.phoneRing?.();
  }
  else if (m.kind === "accept") toast("📱 TÉLÉPHONE", `${m.name} accepte`, "Il arrive dans ton bureau.");
  else if (m.kind === "decline") toast("📱 TÉLÉPHONE", `${m.name} ne peut pas venir`, "Il a refusé l'invitation.");
}
// what we do in the office we visit: to a dev ("cheer:Alice") or an object ("use:12:lamp"); its page decides
export async function sendAct(text) { if (net.visit) await call("chat", { sid: net.sid, kind: "act", to: net.visit.pid, text }); }
export async function invite(pid) { await call("chat", { sid: net.sid, kind: "invite", to: pid }); }
export async function answerCall(yes) {
  const r = net.ringing; if (!r) return;
  net.ringing = null;
  if (r.kind === "duel") return hub.answerDuel?.(r, yes);    // games/online.js
  if (r.kind === "party") return hub.answerParty?.(r, yes);  // social/netparty.js
  if (r.kind === "visio") return hub.answerVisio?.(r, yes);  // world/visio.js
  await call("chat", { sid: net.sid, kind: yes ? "accept" : "decline", to: r.from });
  if (yes) await startVisit(r.from);
}

/* ---------- our office as our visitors see it: rooms, sizes, decor, furniture ---------- */
const KEEP = ["uid", "type", "room", "x", "y", "rot", "style", "side", "on_", "on", "closed", "off"];
function myLayout() {
  const rooms = ["office", "lounge", ...(hub.con?.rooms || [])];
  const items = rooms.flatMap(r => (hub.itemsIn?.(r) || []).map(it => Object.fromEntries(KEEP.filter(k => it[k] !== undefined).map(k => [k, it[k]]))));
  return { name: CHIEF_NAME, rooms, sizes: Object.fromEntries(rooms.map(r => [r, [ROOM[r]?.w, ROOM[r]?.h]])), decor: Object.fromEntries(rooms.map(r => [r, decor[r]])), items };
}
async function publishLayout() {
  const layout = myLayout(), sig = JSON.stringify(layout);
  if (sig === net.layoutSig) return;
  await call("layout", { sid: net.sid, layout }); net.layoutSig = sig;
}

/* ---------- visiting someone ---------- */
export async function startVisit(pid) {
  const p = net.peers.find(x => x.pid === pid); if (!p) throw new Error("ce chef n'est plus là");
  if (hub.buy?.on) hub.toggleBuy?.(false);
  const out = await call("layout", { sid: net.sid, pid });
  const layout = out.layout || {}, rooms = Array.isArray(layout.rooms) ? layout.rooms : ["office"];
  const first = rooms.includes(p.room) && !p.visiting ? p.room : "office";
  net.visit = { pid, name: p.name, layout: { ...layout, rooms }, layoutAt: out.at, room: first, x: 50, y: 110, tx: 50, ty: 110, bubble: "", until: 0, fetched: performance.now() };
  setView("visit");
}
export function endVisit(home = true) {
  if (!net.visit) return;
  net.visit = null;
  if (home && view === "visit") setView("office");
}
export function visitRoom(room, at = null) {  // at: where we come in (by its door, rooms/visit.js)
  const { x, y } = at || { x: 50, y: 110 };
  if (net.visit?.layout.rooms.includes(room)) Object.assign(net.visit, { room, x, y, tx: x, ty: y, dir: null, pose: null, onArrive: null });
}

/* ---------- several times a second: where we are, who is there, what was said ---------- */
// the pace follows what happens: 5 a second while someone moves (us or another), 3 while visiting or visited (a team
// lives there), else under 2; one request at a time
let busy = false, lastLayout = 0, lastCrew = 0, lastSent = 0, lastWhere = "", stirAt = 0;
const peerSig = new Map();  // pid → its last position: who moved
function pace(t, w) {
  const sig = `${w.room}|${Math.round(w.x)}|${Math.round(w.y)}|${JSON.stringify(w.pose)}|${net.emote && t < net.emote.until ? net.emote.key : ""}|${net.presence}`;
  if (sig !== lastWhere) { lastWhere = sig; stirAt = t; }
  if (t - stirAt < 1500) return 200;
  return net.visit || net.peers.some(p => p.visiting === net.pid) ? 330 : 600;
}
setInterval(async () => {
  if (!net.sid || busy) return;
  if (net.visit && view !== "visit" && view !== "game") endVisit(false);  // another room picked on the bar: back home (a duel keeps the visit)
  const t = performance.now(), w = where();
  if (t - lastSent < pace(t, w)) return;
  busy = true; lastSent = t;
  try {
    const v = net.visit;
    const say = v ? (t < v.until ? v.bubble : "") : (t < (chief.until || 0) ? chief.bubble : "");
    const lookAgain = t - (net.lookAt || 0) > 10000;  // the look now and then (it may change), not every time
    if (lookAgain) net.lookAt = t;
    const want = hub.partyWant?.() || [], em = net.emote && t < net.emote.until ? net.emote.key : "";
    const out = await call("sync", { sid: net.sid, ...w, bubble: say, since: net.since, emote: em, status: net.presence, duel: hub.duelInfo?.() || "", ...(want.length ? { want } : {}), ...(lookAgain ? { look: me().look } : {}) });
    if (out.crews) hub.partyCrews?.(out.crews);
    const now = performance.now();
    net.peers = out.peers || []; net.error = "";
    for (const p of net.peers) { const k = `${p.room}|${Math.round(p.x)}|${Math.round(p.y)}`; if (peerSig.get(p.pid) !== k) { peerSig.set(p.pid, k); stirAt = now; } }
    for (const m of out.chat || []) { net.since = Math.max(net.since, m.id); net.chat.push(m); received(m, now); }
    net.chat = net.chat.slice(-80); net.quiet = false;
    if (net.mode === "host") net.status = { ...net.status, peers: net.peers.length + 1 };
    if (now - lastLayout > 3000) { lastLayout = now; publishLayout().catch(() => {}); }
    // our team, for those who visit us (3 times a second, only while someone is here)
    if ((net.peers.some(p => p.visiting === net.pid) || hub.partyAway?.()) && now - lastCrew > 300) { lastCrew = now; call("crew", { sid: net.sid, crew: crewSnapshot(now) }).catch(() => {}); }
    if (v && net.visit === v) {  // the office we visit: its team; still there; its plan again only when it changed
      v.crew = out.crew || [];
      if (!net.peers.some(p => p.pid === v.pid)) { toast("RÉSEAU 🌐", `${v.name} s'est déconnecté`, "Retour à ton bureau."); endVisit(); }
      else if (now - v.fetched > 5000) {
        v.fetched = now;
        call("layout", { sid: net.sid, pid: v.pid, at: v.layoutAt }).then(o => {
          if (net.visit !== v || o.same || !o.layout) return;
          v.layoutAt = o.at; v.layout = { ...o.layout, rooms: Array.isArray(o.layout.rooms) ? o.layout.rooms : v.layout.rooms };
        }).catch(() => {});
      }
    }
  } catch (err) {
    net.error = err.message;
    if (/session inconnue/.test(err.message)) { try { await join0(); } catch (_) { /* the host closed */ } }
  } finally { busy = false; }
}, 50);

/* ---------- the others (chiefs and, in the office we visit, its team), between two updates ---------- */
// what comes from the network is shown a little late, going smoothly from one received position to the next, like an
// online game. The delay follows how regular the updates really are (the slowest of the last ones, and a margin);
// an update late: the walker goes on the way it went for a moment instead of stopping, then catches up softly. It
// walks while it really moves on screen (its speed, smoothed), its legs follow the ground covered (scene.js stepOf),
// turned where it goes; the pose goes with the position it came with (one sits once on the chair, not before).
const shown = new Map();  // key → { buf: [{ t, x, y, pose }], src, last, gaps, x, y, room, v, vx, vy, dir, pose, at }
export function smoothed(key, p, t) {
  let s = shown.get(key);
  const far = s && Math.hypot(p.x - s.buf.at(-1).x, p.y - s.buf.at(-1).y) > 120;
  if (!s || s.room !== p.room || far) {  // new, another room, or a jump (a door): there at once
    s = { buf: [{ t, x: p.x, y: p.y, pose: p.pose }], src: p, last: t, gaps: [], x: p.x, y: p.y, room: p.room, v: 0, vx: 0, vy: 0, dir: null, pose: p.pose, at: t };
    shown.set(key, s); return s;
  }
  if (s.src !== p) {  // an update came (each one is a new object)
    s.src = p; s.gaps.push(Math.min(1500, t - s.last)); if (s.gaps.length > 8) s.gaps.shift(); s.last = t;
    s.buf.push({ t, x: p.x, y: p.y, pose: p.pose });
    if (s.buf.length > 16) s.buf.shift();
  }
  // the delay drifts toward its target (8 % of the time at most: the walk speeds up or slows down a little, never jumps)
  const want = Math.max(120, Math.min(800, (s.gaps.length ? Math.max(...s.gaps) : 300) * 1.15 + 30)), step = Math.max(1, Math.min(100, t - s.at)) * 0.08;
  s.delay = s.delay == null ? want : s.delay + Math.max(-step, Math.min(step, want - s.delay));
  const rt = t - s.delay, b = s.buf;
  let i = b.length - 1;
  while (i > 0 && b[i - 1].t > rt) i--;
  const A = b[Math.max(0, i - 1)], B = b[i];
  let tx, ty;
  if (rt <= B.t || b.length < 2) {  // between two received positions
    const k = B.t > A.t ? Math.max(0, Math.min(1, (rt - A.t) / (B.t - A.t))) : 1;
    tx = A.x + (B.x - A.x) * k; ty = A.y + (B.y - A.y) * k;
  } else {  // past the newest: on the way it went, slowing down, 150 ms at most
    const P = b[b.length - 2], L = b[b.length - 1], dt = Math.max(1, L.t - P.t), late = rt - L.t, ahead = Math.min(150, late - late * late / 600);
    tx = L.x + (L.x - P.x) / dt * ahead; ty = L.y + (L.y - P.y) / dt * ahead;
  }
  // a soft catch-up (no jump when an update corrects the guess), the speed smoothed
  const dt = Math.max(1, Math.min(100, t - s.at)); s.at = t;
  const f = Math.min(1, dt / 70), nx = s.x + (tx - s.x) * f, ny = s.y + (ty - s.y) * f;
  const vx = (nx - s.x) / dt, vy = (ny - s.y) / dt;
  s.vx = s.vx * 0.75 + vx * 0.25; s.vy = s.vy * 0.75 + vy * 0.25; s.v = Math.hypot(s.vx, s.vy);
  s.x = nx; s.y = ny;
  if (s.v > 0.006) {  // turned along the way it goes; on a diagonal, it keeps its side until the other one clearly wins
    const ax = Math.abs(s.vx), ay = Math.abs(s.vy), horiz = s.horiz == null ? ax >= ay : s.horiz ? ax * 1.4 >= ay : ax >= ay * 1.4;
    s.horiz = horiz; s.dir = horiz ? [Math.sign(s.vx), 0] : [0, Math.sign(s.vy)];
  }
  s.pose = s.v > 0.01 ? A.pose : B.pose;
  return s;
}
const walkingNow = s => s.v > 0.01;  // 10 units a second (a walk: about 60)
// the drawPerson options of someone shown from the network: walking (it moves on screen) or its pose
export function netPose(p, s, t, extra = {}) {
  const pose = s.pose || p.pose || {};
  if (walkingNow(s)) { const d = s.dir || pose.dir; return { ...extra, step: stepOf(s, s.x, s.y), dir: d, back: !!d && d[1] < 0 && Math.abs(d[1]) >= Math.abs(d[0]), hold: pose.hold === "sip" ? "cup" : pose.hold || "" }; }
  stepOf(s, s.x, s.y);
  return { ...extra, frame: ["type", "up", "reach"].includes(pose.arms) ? Math.floor(t / 260) : 0, seated: !!pose.seated, back: !!pose.back, arms: pose.arms || "down", hold: pose.hold || "", dir: pose.dir || (pose.seated ? null : s.dir) };  // still: turned where it went
}
export const liftOf = (p, s, t) => walkingNow(s) ? 0 : (s.pose || p.pose)?.z || 0;
// an emote's body language: arms up and down, a little jump for a dance
export function emotePose(key, t, o) {
  if (!key) return o;
  const f = Math.floor(t / 220) % 2;
  if (key === "dance") return { ...o, arms: f ? "up" : "down", frame: Math.floor(t / 150), dir: [[1, 0], [0, 1], [-1, 0], [0, -1]][Math.floor(t / 300) % 4], seated: false };
  if (key === "clap" || key === "wave" || key === "laugh") return { ...o, arms: f ? "up" : "down" };
  return { ...o, arms: "up" };
}
export function drawPeer(p, t, x, y, s) {
  const said = net.said.get(p.name), em = EMOTE_INFO[p.emote], text = em ? `${em[0]} ${em[1]}` : said && t < said.until ? said.text : p.bubble;
  drawPerson(x, y, { skin: "#f1c7a3", hair: "#3a2a1a", shirt: "#2a4a8a", ...p.look }, emotePose(p.emote, t, netPose(p, s, t, { tux: true, smile: true, hat: p.look?.hat, talk: !!text && !em })));
  badge(x, y + ((s.pose || p.pose)?.seated ? -3 : 2), `${PRESENCE_INFO[p.status]?.[0] || "🌐"} ${p.name}`, p.host ? "#fbaa08" : "#3bc4ff");
  if (text) bubble(x, y - 24 - headroom(), text.slice(0, 80), em ? "#fff3c4" : "#d5eeff", "#081746", p.name);
}
export const personBox = (x, y) => ({ x: x - 9, y: y - 34, w: 18, h: 37, to: { x, y: y - 8 } });
// at home: only who visits us, in the room they are in (iso/rooms.js isoItems)
export function peerItems(room, t, G, items) {
  if (net.visit || !net.pid) return;
  for (const p of net.peers) {
    if (p.visiting !== net.pid || p.room !== room) continue;
    const s = smoothed(p.pid, p, t);
    items.push({ pt: [s.x, s.y], draw: () => G.put(s.x, s.y, s.x, s.y, liftOf(p, s, t), () => drawPeer(p, t, s.x, s.y, s), personBox(s.x, s.y)) });
  }
}

provide({ get net() { return net; }, get peerItems() { return peerItems; } });
