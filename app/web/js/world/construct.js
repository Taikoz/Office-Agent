// Build mode, Sims style (🏗️ Construction in the buy mode): enlarge the open space (10 then 12 desks, new devs hired),
// build a meeting room (meetings with the team) and a terrace (where the Friday afterwork goes), add windows on any
// wall. A room bar at the top switches between the rooms built.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, DESKS, TEAM, ents } from "../core/core.js";
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
  else { con.rooms.push(id); saveCon(); toast("CONSTRUCTION 🏗️", `${p.name} construite`, "Sa porte est dans la salle de repos ; la pièce est aussi dans la barre du haut."); renderRoomBar(); }
  sfx("level"); saveCon(); renderBuy();
}
function constructGridHtml() {
  return PROJECTS.map(p => {
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
const curRoom = () => ["lounge", "meeting", "terrace"].includes(view) ? view : "office";
for (const r of ["meeting", "terrace"]) if (!decor[r]) decor[r] = { ...DECOR_DEFAULT[r] };

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
