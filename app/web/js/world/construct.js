// Build mode, Sims style (🏗️ Construction in the buy mode): enlarge the open space (10 then 12 desks, new devs hired),
// build a meeting room (meetings with the team) and a terrace (where the Friday afterwork goes), add windows on any
// wall. A room bar at the top switches between the rooms built.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, DESKS, TEAM, ents } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crewAdd } from "../sims/crew.js";
import { OFFICE_AISLES } from "./chief.js";
import { loungers, setView, view } from "./lounge.js";
import { DECOR_DEFAULT, decor } from "./decor.js";
import { esc } from "../core/data.js";
import { sfx, toast } from "../sims/progress.js";
import { fmtSim, spend, wallet } from "../sims/money.js";
import { BUY_CATS, buy, furni, hasDesk, renderBuy, saveBuild } from "./build.js";
import { addMoodlet, hasTrait } from "../sims/moods.js";
import { Room } from "../rooms/base.js";

export let con = new SaveSlot("office-construct", { level: 0, rooms: [], hires: [] }).data;
const saveCon = () => SaveSlot.get("office-construct").save(con);
const hasRoom = r => con.rooms.includes(r);
const HIRES = ["Inès", "Jules", "Karim", "Léa", "Malik", "Nina", "Oscar", "Paul"];
const LAYOUTS = [{ cols: 4, sp: 88 }, { cols: 5, sp: 68 }, { cols: 6, sp: 56 }];
const PROJECTS = [
  { id: "open1", icon: "🏢", name: "Agrandir l'open space", desc: "10 bureaux au lieu de 8, et 2 devs recrutés (bureaux fournis).", price: 5000, ok: () => con.level === 0, done: () => con.level >= 1 },
  { id: "open2", icon: "🏙️", name: "Open space XXL", desc: "12 bureaux, 2 devs de plus.", price: 9000, ok: () => con.level === 1, done: () => con.level >= 2, needs: "Agrandir l'open space d'abord" },
  { id: "meeting", icon: "🤝", name: "Salle de réunion", desc: "Une grande table : réunis l'équipe (social, moral).", price: 4000, ok: () => !hasRoom("meeting"), done: () => hasRoom("meeting") },
  { id: "terrace", icon: "🌿", name: "Terrasse", desc: "En plein air, avec barbecue : l'afterwork du vendredi s'y tient.", price: 6000, ok: () => !hasRoom("terrace"), done: () => hasRoom("terrace") },
];

/* ---------- the open space: 4, 5 or 6 desks per row; the team grows with it ---------- */
function applyLayout() {
  const { cols, sp } = LAYOUTS[con.level], x0 = 194 - sp * (cols - 1) / 2;
  for (let r = 0; r < 2; r++) for (let i = 0; i < cols; i++) {  // desks are updated in place: everybody keeps a reference to them
    const k = r * cols + i, pos = { x: Math.round(x0 + i * sp), y: 122 + r * 62 };
    if (DESKS[k]) Object.assign(DESKS[k], pos); else DESKS.push(pos);
  }
  hub.DESK_SP = sp;
  const row = DESKS.slice(0, cols);
  OFFICE_AISLES.length = 0; OFFICE_AISLES.push(...row.map(d => d.x - sp / 2), row.at(-1).x + Math.max(22, sp / 2));
  con.hires = [...new Set(con.hires)];
  for (const n of con.hires) if (!TEAM.includes(n)) TEAM.push(n);
  for (const e of ents.values()) if (e.who && e.seated && !e.leaving) { e.desk = DESKS[TEAM.indexOf(e.who)]; e.x = e.desk.x; e.y = e.desk.y + 22; }
}
applyLayout();
function hire(n) {
  for (let k = 0; k < n; k++) {
    const name = HIRES.find(h => !TEAM.includes(h)); if (!name) break;
    con.hires.push(name); TEAM.push(name);
  }
  saveCon(); applyLayout();
  for (let i = 0; i < DESKS.length; i++) if (!hasDesk(i)) furni.items.push({ uid: ++furni.seq, type: "desk", style: "decor", room: "office", x: DESKS[i].x - 18, y: DESKS[i].y - 14, slot: i });
  saveBuild();
}
function buyProject(id) {
  const p = PROJECTS.find(x => x.id === id); if (!p || !p.ok() || !spend(p.price, p.name)) return;
  if (id === "open1" || id === "open2") { con.level++; const before = TEAM.length; hire(2); toast("CONSTRUCTION 🏗️", `${p.name} : ${DESKS.length} bureaux`, `Bienvenue à ${TEAM.slice(before).join(" et ")} !`); }
  else { con.rooms.push(id); saveCon(); toast("CONSTRUCTION 🏗️", `${p.name} construite`, "Elle apparaît dans la barre des pièces, en haut."); renderRoomBar(); }
  sfx("level"); saveCon(); renderBuy();
}
function constructGridHtml() {
  return PROJECTS.map(p => {
    const done = p.done(), ok = p.ok();
    return `<div class="bitem${done ? " own" : ""}"><span class="bthumb big">${p.icon}</span><b>${esc(p.name)}</b><span class="muted" style="font-size:14px">${esc(p.desc)}</span>
      <span class="price">${done ? "✓ construit" : fmtSim(p.price)}</span>${done ? "" : `<button data-project="${p.id}"${!ok || wallet.funds < p.price ? " disabled" : ""}${!ok && p.needs ? ` title="${esc(p.needs)}"` : ""}>Construire</button>`}</div>`;
  }).join("");
}

/* ---------- windows: a wall object for any room, the sky follows the hour ---------- */
BUY_CATS.splice(BUY_CATS.length - 1, 0, ["construction", "🏗️", "Construction"]);

/* ---------- the room bar (top) and the rooms ---------- */
const roomBar = document.getElementById("rooms");
function renderRoomBar() {
  const rooms = ["office", "lounge", ...con.rooms];
  roomBar.innerHTML = rooms.map(r => `<button data-room="${r}" class="${view === r ? "on" : ""}">${Room.get(r).label}</button>`).join("");
}
roomBar.addEventListener("click", ev => { const b = ev.target.closest("[data-room]"); if (b) { setView(b.dataset.room); if (buy.on) renderBuy(); } });
renderRoomBar();
const curRoom = () => ["lounge", "meeting", "terrace"].includes(view) ? view : "office";
for (const r of ["meeting", "terrace"]) if (!decor[r]) decor[r] = { ...DECOR_DEFAULT.office, ...(r === "meeting" ? { wall: "uni", wallColor: "#4a3f36", floor: "moquette", floorColor: "#5a5866" } : { floor: "parquet", floorColor: "#8a6a4a" }) };

// meeting: the idle devs of the break room sit around the table for a minute
const meeting = { on: false, until: 0, who: [] };
const MEET_SEATS = [{ x: 150, y: 128 }, { x: 200, y: 128 }, { x: 250, y: 128 }, { x: 150, y: 176 }, { x: 200, y: 176 }, { x: 250, y: 176 }];
function startMeeting() {
  if (meeting.on) return;
  const devs = [...loungers.values()].filter(l => !l.called && !l.busy && !l.party).slice(0, 6);
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
provide({ get MEET_SEATS() { return MEET_SEATS; }, get buyProject() { return buyProject; }, get con() { return con; }, get constructGridHtml() { return constructGridHtml; }, get curRoom() { return curRoom; }, get hasRoom() { return hasRoom; }, get meeting() { return meeting; }, get renderRoomBar() { return renderRoomBar; }, get startMeeting() { return startMeeting; } });
