// Build mode, Sims style (🏗️ Construction in the buy mode): enlarge the open space (10 then 12 desks, new devs hired),
// build a meeting room (meetings with the team) and a terrace (where the Friday afterwork goes), add windows on any
// wall. A room bar at the top switches between the rooms built.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, DESKS, ROOM, TEAM, ents, setRoomSize } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crewAdd } from "../sims/crew.js";
import { loungers, setView, view } from "./lounge.js";
import { DECOR_DEFAULT, decor } from "./decor.js";
import { esc } from "../core/data.js";
import { sfx, toast } from "../sims/progress.js";
import { fmtSim, spend, wallet } from "../sims/money.js";
import { BUY_CATS, buy, renderBuy } from "./build.js";
import { addMoodlet, hasTrait } from "../sims/moods.js";
import { Room } from "../rooms/base.js";

// 2: a new game: no room built, nobody hired yet
export let con = new SaveSlot("office-construct", { level: 0, rooms: [], hires: [] }, { version: 2, migrations: { 2: () => ({ level: 0, rooms: [], hires: [] }) } }).data;
const saveCon = () => SaveSlot.get("office-construct").save(con);
const hasRoom = r => con.rooms.includes(r);
const HIRES = ["Inès", "Jules", "Karim", "Léa", "Malik", "Nina", "Oscar", "Paul"];
export const PROJECTS = [
  { id: "open1", icon: "🏢", name: "Recruter deux devs", desc: "Deux devs de plus dans l'équipe (leurs bureaux s'achètent à part).", price: 5000, ok: () => con.level === 0, done: () => con.level >= 1 },
  { id: "open2", icon: "🏙️", name: "Recruter deux devs de plus", desc: "L'équipe passe à douze.", price: 9000, ok: () => con.level === 1, done: () => con.level >= 2, needs: "Recruter les deux premiers d'abord" },
  { id: "meeting", icon: "🤝", name: "Salle de réunion", desc: "Une grande table : réunis l'équipe (social, moral).", price: 4000, ok: () => !hasRoom("meeting"), done: () => hasRoom("meeting") },
  { id: "terrace", icon: "🌿", name: "Terrasse", desc: "En plein air, avec barbecue : l'afterwork du vendredi s'y tient.", price: 6000, ok: () => !hasRoom("terrace"), done: () => hasRoom("terrace") },
  { id: "gym", icon: "🏋️", name: "Salle de sport", desc: "Les devs s'ennuient moins et y retrouvent le moral (les sportifs adorent).", price: 5000, ok: () => !hasRoom("gym"), done: () => hasRoom("gym") },
  { id: "library", icon: "📚", name: "Bibliothèque", desc: "Un coin calme où les devs fatigués viennent lire et se reposer.", price: 4500, ok: () => !hasRoom("library"), done: () => hasRoom("library") },
];

/* ---------- the open space grows: new devs hired (their desks are bought in the buy mode, build.js) ---------- */
function applyTeam() {
  con.hires = [...new Set(con.hires)];
  for (const n of con.hires) if (!TEAM.includes(n)) TEAM.push(n);
  hub.syncAll?.();
}
applyTeam();
function hire(n) {
  for (let k = 0; k < n; k++) {
    const name = HIRES.find(h => !TEAM.includes(h)); if (!name) break;
    con.hires.push(name); TEAM.push(name);
  }
  saveCon(); applyTeam();
}
export function buyProject(id) {
  const p = PROJECTS.find(x => x.id === id); if (!p || !p.ok() || !spend(p.price, p.name)) return;
  if (id === "open1" || id === "open2") {
    con.level++; const before = TEAM.length; hire(2);
    toast("CONSTRUCTION 🏗️", `${p.name} : ${TEAM.length} devs`, `Bienvenue à ${TEAM.slice(before).join(" et ")} ! Achète-leur un bureau.`);
    setTimeout(() => hub.Happening?.get("welcome")?.start(performance.now(), TEAM.slice(before)), 4000);  // the welcome drink (social/officetalk.js)
  }
  else { con.rooms.push(id); saveCon(); toast("CONSTRUCTION 🏗️", `${p.name} construite`, ["gym", "library"].includes(id) ? "Elle est dans la barre du haut ; achète ses meubles pour que les devs y viennent." : "Sa porte est dans la salle de repos ; la pièce est aussi dans la barre du haut."); renderRoomBar(); }
  sfx("level"); saveCon(); renderBuy();
}
/* ---------- the rooms' size: longer, deeper, or smaller when the furniture still fits ---------- */
const BASE = { office: [560, 300], lounge: [560, 300], meeting: [400, 232], terrace: [600, 320], gym: [420, 270], library: [400, 270] };
const LIMIT = { w: [400, 840], h: [232, 420] };
con.sizes = con.sizes || {};
for (const [id, [w, h]] of Object.entries(con.sizes)) setRoomSize(id, w, h);
const ROOM_NAMES = { office: "🏢 Bureau", lounge: "☕ Salle de repos", meeting: "🤝 Salle de réunion", terrace: "🌿 Terrasse", gym: "🏋️ Salle de sport", library: "📚 Bibliothèque" };
const resizeCost = (dw, dh) => dw > 0 ? 2500 : dh > 0 ? 2000 : 0;  // growing costs; shrinking is free
// whether every object of the room still fits in w × h
function fits(room, w, h) {
  return (hub.itemsIn?.(room) || []).every(it => {
    const d = hub.defOf(it.type);
    if (d.kind === "wall") return (it.side || "back") === "back" ? it.x + d.w <= w - 2 : it.x + d.w <= h - 70 - 2;
    const [, , x1, y1] = hub.footOf(it); return x1 <= w - 2 && y1 <= h - 2;
  });
}
function resizeRoom(room, dw, dh) {
  const R = ROOM[room], w = R.w + dw, h = R.h + dh;
  if (w < LIMIT.w[0] || w > LIMIT.w[1] || h < LIMIT.h[0] || h > LIMIT.h[1]) return toast("CONSTRUCTION", "Impossible", "La pièce ne peut pas être plus grande ou plus petite.");
  if ((dw < 0 || dh < 0) && !fits(room, w, h)) return toast("CONSTRUCTION", "Des meubles gênent", "Déplace ou vends ce qui dépasse avant de réduire la pièce.");
  const cost = resizeCost(dw, dh);
  if (cost && !spend(cost, `Travaux : ${ROOM_NAMES[room]}`)) return;
  // the left wall's objects keep their distance from the back corner (their strip runs from the front end)
  if (dh) for (const it of hub.itemsIn(room)) if (hub.defOf(it.type).kind === "wall" && it.side === "left") it.x += dh;
  setRoomSize(room, w, h); con.sizes[room] = [w, h]; saveCon();
  hub.ISO?.cams?.delete(room);  // the camera recentres on the new room
  hub.saveBuild?.(); sfx(cost ? "level" : "commit");
  toast("CONSTRUCTION 🏗️", `${ROOM_NAMES[room]} : ${w} × ${h - 70}`, dw > 0 || dh > 0 ? "Les ouvriers ont poussé les murs." : "La pièce a été réduite.");
  renderBuy();
}
function sizesHtml() {
  const rooms = ["office", "lounge", ...con.rooms];
  return rooms.map(r => {
    const R = ROOM[r], [bw, bh] = BASE[r];
    const btn = (dw, dh, label) => `<button data-resize="${r}:${dw}:${dh}"${(dw > 0 || dh > 0) && wallet.funds < resizeCost(dw, dh) ? " disabled" : ""}>${label}</button>`;
    return `<div class="bitem"><span class="bthumb big">📐</span><b>${esc(ROOM_NAMES[r])}</b><span class="muted" style="font-size:14px">${R.w} × ${R.h - 70}${R.w !== bw || R.h !== bh ? ` (de base ${bw} × ${bh - 70})` : ""}</span>
      <span class="price">↔ ${fmtSim(2500)} · ↕ ${fmtSim(2000)}</span><span class="resize">${btn(40, 0, "↔ +40")}${btn(0, 20, "↕ +20")}${btn(-40, 0, "↔ −40")}${btn(0, -20, "↕ −20")}</span></div>`;
  }).join("");
}
document.getElementById("buy").addEventListener("click", ev => { const b = ev.target.closest("[data-resize]"); if (!b) return; const [r, dw, dh] = b.dataset.resize.split(":"); resizeRoom(r, +dw, +dh); });
function constructGridHtml() {
  return sizesHtml() + PROJECTS.map(p => {
    const done = p.done(), ok = p.ok();
    return `<div class="bitem${done ? " own" : ""}"><span class="bthumb big">${p.icon}</span><b>${esc(p.name)}</b><span class="muted" style="font-size:14px">${esc(p.desc)}</span>
      <span class="price">${done ? "✓ construit" : fmtSim(p.price)}</span>${done ? "" : `<button data-project="${p.id}"${!ok || wallet.funds < p.price ? " disabled" : ""}${!ok && p.needs ? ` title="${esc(p.needs)}"` : ""}>Construire</button>`}</div>`;
  }).join("");
}


/* ---------- the room bar (top) and the rooms ---------- */
const roomBar = document.getElementById("rooms");
function renderRoomBar() {
  const rooms = ["office", "lounge", ...con.rooms];
  roomBar.innerHTML = rooms.map(r => `<button data-room="${r}" class="${view === r ? "on" : ""}">${Room.get(r).label}</button>`).join("");
}
roomBar.addEventListener("click", ev => { const b = ev.target.closest("[data-room]"); if (b) { setView(b.dataset.room); if (buy.on) renderBuy(); } });
renderRoomBar();
const curRoom = () => ["lounge", "meeting", "terrace", "gym", "library"].includes(view) ? view : "office";
for (const r of ["meeting", "terrace", "gym", "library"]) if (!decor[r]) decor[r] = { ...DECOR_DEFAULT[r] };

// meeting: the idle devs of the break room sit around the table for a minute
const meeting = { on: false, until: 0, who: [] };
// the seats: the chairs bought for the meeting room (build.js), the way they face
const MEET_SEATS = [];
function syncMeeting() {
  MEET_SEATS.length = 0;
  for (const it of hub.itemsIn("meeting").filter(it => hub.defOf(it.type).chair)) for (const s of hub.spotsOf(it)) MEET_SEATS.push({ x: s.x, y: s.y, face: s.face || [0, 1], back: !!s.face && (s.face[1] < 0 || s.face[0] < 0), lift: s.lift || 0 });
}
function startMeeting() {
  if (meeting.on) return;
  if (!MEET_SEATS.length) return toast("RÉUNION", "Pas de chaises", "Achète une table et des chaises pour la salle de réunion.");
  const devs = [...loungers.values()].filter(l => !l.called && !l.busy && !l.party).slice(0, Math.min(6, MEET_SEATS.length));
  if (!devs.length) return toast("RÉUNION", "Personne de disponible", "Les devs libres attendent en salle de repos.");
  meeting.on = true; meeting.until = performance.now() + 60000; meeting.who = devs.map(l => l.name);
  for (const l of devs) { l.busy = true; l.partyRoom = "meeting"; l.say = "J'arrive en réunion !"; l.sayUntil = performance.now() + 2000; }
  toast("RÉUNION 🤝", `${devs.length} dev(s) autour de la table`, "Une minute de point d'équipe.");
}
function stepMeeting(t) {
  if (!meeting.on || t < meeting.until) return;
  meeting.on = false;
  for (const n of meeting.who) {
    const l = loungers.get(n); if (l) { l.busy = false; l.partyRoom = null; l.next = 0; }
    crewAdd(n, { social: 20, ennui: -5 });
    if (hasTrait(n, "solitaire")) addMoodlet(n, "meeting", "😮‍💨", "Réunion de trop", -4, 45);
    else addMoodlet(n, "meeting", "🤝", "Réunion productive", 5, 45);
  }
  addMoodlet(CHIEF_NAME, "meeting", "🧭", "Équipe alignée", 6, 60);
  toast("RÉUNION", "Fin de la réunion", "Chacun retourne à ses occupations.");
}
setInterval(() => stepMeeting(performance.now()), 1000);

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get MEET_SEATS() { return MEET_SEATS; }, get syncMeeting() { return syncMeeting; }, get buyProject() { return buyProject; }, get con() { return con; }, get constructGridHtml() { return constructGridHtml; }, get curRoom() { return curRoom; }, get hasRoom() { return hasRoom; }, get meeting() { return meeting; }, get renderRoomBar() { return renderRoomBar; }, get startMeeting() { return startMeeting; } });
