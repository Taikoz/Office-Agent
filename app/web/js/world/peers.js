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
import { bubble, drawPerson, headroom } from "./scene.js";
import { anchored } from "../iso/engine.js";
import { decor } from "./decor.js";
import { setView, view } from "./lounge.js";

export const net = { mode: "", addr: "", code: "", sid: "", pid: "", peers: [], chat: [], since: 0, error: "", status: null, said: new Map(), quiet: false, visit: null,
  convs: new Map(), open: "", ringing: null };  // convs: "all" or a chief's pid → { msgs, unread } — in memory only, never saved
const demo = () => typeof DEMO !== "undefined" && DEMO;
// one request: to our own server as the host, to the host's network server as a guest
async function call(action, body = {}) {
  if (net.mode === "host") {
    const r = await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action, ...body }) });
    const out = await r.json(); if (!out.ok) throw new Error(out.error || `HTTP ${r.status}`); return out;
  }
  const r = await fetch(`http://${net.addr}/net/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Join-Code": net.code }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({})); if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`); return out;
}
const me = () => ({ name: CHIEF_NAME, look: { ...CHIEF_LOOK, hat: chiefHat() || undefined } });
// where our chief is: in our office, or in the office we visit (our avatar there)
const where = () => net.visit ? { room: net.visit.room, x: net.visit.x, y: net.visit.y, visiting: net.visit.pid }
  : chief.room === "lounge" ? { room: "lounge", x: chief.lx, y: chief.ly, visiting: "" } : { room: chief.room || "office", x: chief.x, y: chief.y, visiting: "" };

/* ---------- hosting, joining, leaving ---------- */
export async function host() {
  if (demo()) throw new Error("pas en mode démo");
  const r = await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action: "host" }) });
  const st = await r.json(); if (!st.ok) throw new Error(st.error || "impossible d'ouvrir le réseau");
  net.status = st; net.mode = "host"; await join0();
  return st;
}
export async function join(addr, code) {
  if (demo()) throw new Error("pas en mode démo");
  if (!/^(\d{1,3}\.){3}\d{1,3}(:\d{2,5})?$/.test(addr)) throw new Error("adresse attendue : 192.168.1.20:8766");
  Object.assign(net, { mode: "guest", addr: addr.includes(":") ? addr : `${addr}:8766`, code: code.trim().toUpperCase() });
  try { localStorage.setItem("office-net-last", JSON.stringify({ addr: net.addr })); } catch (_) { /* storage blocked */ }
  await join0();
}
async function join0() {
  try {
    const out = await call("hello", me());
    Object.assign(net, { sid: out.sid, pid: out.pid, since: 0, chat: [], peers: [], error: "", quiet: true, layoutSig: "", lookSent: true, ringing: null });  // the history comes without notifications
    net.convs.clear();
  } catch (err) { const m = net.mode; Object.assign(net, { mode: "", sid: "" }); throw new Error(m === "guest" ? `connexion refusée : ${err.message}` : err.message); }
}
export async function leave() {
  endVisit(false);
  try { if (net.sid) await call("leave", { sid: net.sid }); } catch (_) { /* gone already */ }
  if (net.mode === "host") await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action: "stop" }) }).catch(() => {});
  Object.assign(net, { mode: "", sid: "", pid: "", peers: [], status: null, error: "", ringing: null });
  net.convs.clear(); net.chat = [];  // the conversations go with the connection: nothing is kept
  if (view === "visit") setView("office");
}
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
  if (m.kind === "text") {
    const c = conv(m.to ? other : "all"); c.msgs.push(m); c.msgs.splice(0, c.msgs.length - 100);
    if (net.quiet || mineMsg) return;
    if (net.open !== (m.to ? other : "all")) c.unread++;
    if (!m.to) net.said.set(m.name, { text: m.text, until: t + 5000 });
    hub.sfx?.("commit");
    return;
  }
  // a call: someone invites us to their office; and the answers to ours
  if (net.quiet || mineMsg || m.to !== net.pid) return;
  if (m.kind === "invite" && Date.now() / 1000 - m.t < 60) { net.ringing = { from: m.from, name: m.name, at: t }; hub.phoneRing?.(); }
  else if (m.kind === "accept") toast("📱 TÉLÉPHONE", `${m.name} accepte`, "Il arrive dans ton bureau.");
  else if (m.kind === "decline") toast("📱 TÉLÉPHONE", `${m.name} ne peut pas venir`, "Il a refusé l'invitation.");
}
export async function invite(pid) { await call("chat", { sid: net.sid, kind: "invite", to: pid }); }
export async function answerCall(yes) {
  const r = net.ringing; if (!r) return;
  net.ringing = null;
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
  net.visit = { pid, name: p.name, layout: { ...layout, rooms }, room: first, x: 50, y: 110, tx: 50, ty: 110, bubble: "", until: 0, fetched: performance.now() };
  setView("visit");
}
export function endVisit(home = true) {
  if (!net.visit) return;
  net.visit = null;
  if (home && view === "visit") setView("office");
}
export const visitRoom = room => { if (net.visit?.layout.rooms.includes(room)) Object.assign(net.visit, { room, x: 50, y: 110, tx: 50, ty: 110 }); };

/* ---------- four times a second: where we are, who is there, what was said ---------- */
let busy = false, lastLayout = 0;
setInterval(async () => {
  if (!net.sid || busy) return;
  if (net.visit && view !== "visit") endVisit(false);  // another room picked on the bar: back home
  busy = true;
  try {
    const t = performance.now(), v = net.visit;
    const say = v ? (t < v.until ? v.bubble : "") : (t < (chief.until || 0) ? chief.bubble : "");
    const lookAgain = t - (net.lookAt || 0) > 10000;  // the look now and then (it may change), not every time
    if (lookAgain) net.lookAt = t;
    const out = await call("sync", { sid: net.sid, ...where(), bubble: say, since: net.since, ...(lookAgain ? { look: me().look } : {}) });
    net.peers = out.peers || []; net.error = "";
    for (const m of out.chat || []) { net.since = Math.max(net.since, m.id); net.chat.push(m); received(m, t); }
    net.chat = net.chat.slice(-80); net.quiet = false;
    if (net.mode === "host") net.status = { ...net.status, peers: net.peers.length + 1 };
    if (t - lastLayout > 3000) { lastLayout = t; publishLayout().catch(() => {}); }
    if (v && net.visit === v) {  // the office we visit: still there, its layout refreshed now and then
      if (!net.peers.some(p => p.pid === v.pid)) { toast("RÉSEAU 🌐", `${v.name} s'est déconnecté`, "Retour à ton bureau."); endVisit(); }
      else if (t - v.fetched > 8000) { v.fetched = t; call("layout", { sid: net.sid, pid: v.pid }).then(o => { if (net.visit === v && o.layout) v.layout = { ...o.layout, rooms: Array.isArray(o.layout.rooms) ? o.layout.rooms : v.layout.rooms }; }).catch(() => {}); }
    }
  } catch (err) {
    net.error = err.message;
    if (/session inconnue/.test(err.message)) { try { await join0(); } catch (_) { /* the host closed */ } }
  } finally { busy = false; }
}, 250);

/* ---------- the others, smoothed between two updates ---------- */
const shown = new Map();  // pid → { x, y, t, room }
export function smoothed(p, t) {
  const s = shown.get(p.pid);
  if (!s || s.room !== p.room || Math.hypot(p.x - s.x, p.y - s.y) > 90) { const n = { x: p.x, y: p.y, t, room: p.room }; shown.set(p.pid, n); return n; }
  const k = Math.min(1, (t - s.t) / 140); s.x += (p.x - s.x) * k; s.y += (p.y - s.y) * k; s.t = t;
  return s;
}
export function drawPeer(p, t, x, y) {
  const said = net.said.get(p.name), text = said && t < said.until ? said.text : p.bubble;
  drawPerson(x, y, { skin: "#f1c7a3", hair: "#3a2a1a", shirt: "#2a4a8a", ...p.look }, { tux: true, smile: true, hat: p.look?.hat, frame: Math.floor(t / 400) });
  badge(x, y + 2, `🌐 ${p.name}`, p.host ? "#fbaa08" : "#3bc4ff");
  if (text) bubble(x, y - 24 - headroom(), text.slice(0, 80), "#d5eeff", "#081746");
}
// at home: only who visits us, in the room they are in (iso/rooms.js isoItems)
export function peerItems(room, t, G, items) {
  if (net.visit || !net.pid) return;
  for (const p of net.peers) {
    if (p.visiting !== net.pid || p.room !== room) continue;
    const s = smoothed(p, t);
    items.push({ pt: [s.x, s.y], draw: () => anchored(s.x, s.y, () => drawPeer(p, t, s.x, s.y)) });
  }
}

provide({ get net() { return net; }, get peerItems() { return peerItems; } });
