// The other chiefs on the internal network (ChiefOS → Réseau, office/net.py): the host talks to its own server
// (/api/net, token), a guest to the host's network server (its address and join code). Every second each one sends
// where its chief is (room, position, a bubble, its look) and gets the others and the chat; the others walk in our
// rooms where they are in theirs, with their name and what they say. Never in the demo.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, badge, chief } from "../core/core.js";
import { CHIEF_LOOK } from "./chief.js";
import { chiefHat } from "./chiefedit.js";
import { toast } from "../sims/progress.js";

import { bubble, drawPerson, headroom } from "./scene.js";
import { anchored } from "../iso/engine.js";

export const net = { mode: "", addr: "", code: "", sid: "", peers: [], chat: [], since: 0, error: "", status: null, said: new Map() };
const demo = () => typeof DEMO !== "undefined" && DEMO;
// one request: to our own server as the host, to the host's network server as a guest
async function call(action, body = {}) {
  if (net.mode === "host") {
    const r = await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action, ...body }) });
    const out = await r.json(); if (!out.ok) throw new Error(out.error || `HTTP ${r.status}`); return out;
  }
  const url = `http://${net.addr}/net/${action === "peers" ? `peers?sid=${encodeURIComponent(net.sid)}&since=${net.since}` : action}`;
  const r = await fetch(url, action === "peers" ? { headers: { "X-Join-Code": net.code } } : { method: "POST", headers: { "Content-Type": "application/json", "X-Join-Code": net.code }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({})); if (!r.ok) throw new Error(out.error || `HTTP ${r.status}`); return out;
}
const me = () => ({ name: CHIEF_NAME, look: { ...CHIEF_LOOK, hat: chiefHat() || undefined } });
const where = () => chief.room === "lounge" ? { room: "lounge", x: chief.lx, y: chief.ly } : { room: chief.room || "office", x: chief.x, y: chief.y };

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
  try { const out = await call("hello", me()); net.sid = out.sid; net.since = 0; net.chat = []; net.peers = []; net.error = ""; net.quiet = true; }  // the history comes without notifications
  catch (err) { const m = net.mode; Object.assign(net, { mode: "", sid: "" }); throw new Error(m === "guest" ? `connexion refusée : ${err.message}` : err.message); }
}
export async function leave() {
  try { if (net.sid) await call("leave", { sid: net.sid }); } catch (_) { /* gone already */ }
  if (net.mode === "host") await fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ action: "stop" }) }).catch(() => {});
  Object.assign(net, { mode: "", sid: "", peers: [], status: null, error: "" });
}
export async function sendChat(text) { if (net.sid && text.trim()) { await call("chat", { sid: net.sid, text: text.trim() }); chief.bubble = text.trim().slice(0, 60); chief.until = performance.now() + 4000; } }

/* ---------- every second: where I am, who is there, what was said ---------- */
let busy = false;
setInterval(async () => {
  if (!net.sid || busy) return;
  busy = true;
  try {
    const t = performance.now();
    await call("state", { sid: net.sid, ...where(), bubble: t < (chief.until || 0) ? chief.bubble : "", look: me().look });
    const out = await call("peers", { sid: net.sid, since: net.since });
    net.peers = out.peers || []; net.error = "";
    for (const m of out.chat || []) {
      net.since = Math.max(net.since, m.id); net.chat.push(m);
      if (net.quiet) continue;
      if (m.name && m.name !== CHIEF_NAME) { net.said.set(m.name, { text: m.text, until: t + 5000 }); hub.sfx?.("commit"); }
      else if (!m.name) toast("RÉSEAU 🌐", m.text, "");
    }
    net.chat = net.chat.slice(-80); net.quiet = false;
    if (net.mode === "host") net.status = { ...net.status, peers: net.peers.length + 1 };
  } catch (err) {
    net.error = err.message;
    if (/session inconnue/.test(err.message)) { try { await join0(); } catch (_) { /* the host closed */ } }
  } finally { busy = false; }
}, 1000);

/* ---------- in our rooms: the others where they are (iso/rooms.js isoItems) ---------- */
export function peerItems(room, t, G, items) {
  for (const p of net.peers) {
    if (p.room !== room) continue;
    const said = net.said.get(p.name), text = said && t < said.until ? said.text : p.bubble;
    items.push({ pt: [p.x, p.y], draw: () => anchored(p.x, p.y, () => {
      drawPerson(p.x, p.y, { skin: "#f1c7a3", hair: "#3a2a1a", shirt: "#2a4a8a", ...p.look }, { tux: true, smile: true, hat: p.look?.hat, frame: Math.floor(t / 400) });
      badge(p.x, p.y + 2, `🌐 ${p.name}`, p.host ? "#fbaa08" : "#3bc4ff");
      if (text) bubble(p.x, p.y - 24 - headroom(), text.slice(0, 80), "#d5eeff", "#081746");
    }) });
  }
}

provide({ get net() { return net; }, get peerItems() { return peerItems; } });
