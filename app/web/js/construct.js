"use strict";
// Build mode, Sims style (🏗️ Construction in the buy mode): enlarge the open space (10 then 12 desks, new devs hired),
// build a meeting room (meetings with the team) and a terrace (where the Friday afterwork goes), add windows on any
// wall. A room bar at the top switches between the rooms built.

let con = store("office-construct", { level: 0, rooms: [], hires: [] });
const saveCon = () => save("office-construct", con);
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
  DESK_SP = sp;
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
CATALOG.push({ type: "window", cat: "construction", name: "Fenêtre", price: 350, room: "any", wall: true, w: 58, h: 41, desc: "Au mur, avec le ciel de l'heure et la météo des tests.",
  art: st => windowArt(st.curtain, st.color),
  styles: [{ id: "velours", name: "Rideaux velours", sw: "#8f2b46", curtain: "velours", color: "#8f2b46" }, { id: "lin", name: "Rideaux lin", sw: "#e8e2d0", curtain: "lin", color: "#e8e2d0" },
    { id: "store", name: "Store", sw: "#c9a24b", curtain: "store", color: "#c9a24b" }, { id: "nu", name: "Sans rideaux", sw: "#8ec5ff", curtain: "aucun", color: "#8f2b46" }] });
BUY_CATS.splice(BUY_CATS.length - 1, 0, ["construction", "🏗️", "Construction"]);

/* ---------- the room bar (top) and the rooms ---------- */
const ROOM_LABELS = { office: "🏢 Bureau", lounge: "☕ Repos", meeting: "🤝 Réunion", terrace: "🌿 Terrasse" };
const roomBar = document.getElementById("rooms");
function renderRoomBar() {
  const rooms = ["office", "lounge", ...con.rooms];
  roomBar.innerHTML = rooms.map(r => `<button data-room="${r}" class="${view === r ? "on" : ""}">${ROOM_LABELS[r]}</button>`).join("");
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

function drawRoomShell(room, t, title) {
  drawWall(room);
  ctx.drawImage(roomFloorCanvas(room, H - FLOOR_Y, []), 0, Math.round(FLOOR_Y * S));
  px(0, 66.5, W, 3.5, "#2a1f18"); px(0, 66.5, W, 0.6, "#4a3828");
  text(title, 200, 4, "#fbaa08", 6, "center");
  sprite(doorSprite("office"), 8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
  drawRoomItems(room, t, "rug"); drawRoomItems(room, t, "wall");
}
function renderMeeting(t) {
  drawRoomShell("meeting", t, "SALLE DE RÉUNION");
  // whiteboard with a chart, a screen with slides
  px(60, 16, 70, 40, "#e8e8ee"); px(60, 16, 70, 2, "#b8b8c4"); [12, 20, 16, 28, 24, 34].forEach((h, i) => px(68 + i * 9, 50 - h, 6, h, ["#5aa9ff", "#51cf66", "#fbaa08"][i % 3])); text("OBJECTIFS", 95, 19, "#22212a", 4, "center");
  px(270, 18, 64, 36, "#1c1c24"); px(272, 20, 60, 32, meeting.on ? "#2e5d9e" : "#14141c");
  if (meeting.on) { text(["Roadmap", "Sprint", "Démo", "Questions ?"][Math.floor(t / 4000) % 4], 302, 30, "#f7f7f7", 6, "center"); }
  const items = [{ y: 150, draw: () => art("meettable", 130, 136, 140, 30, () => R(0, 0, 140, 26, "#6d5238") + R(0, 0, 140, 2, "#8a6a4a") + R(4, 26, 4, 4, "#4a3826") + R(132, 26, 4, 4, "#4a3826") + R(50, 8, 40, 10, "#3a3a48") + R(52, 10, 36, 6, "#5aa9ff")) }];
  for (const s of MEET_SEATS) items.push({ y: s.y - 2, draw: () => art("meetchair", s.x - 5, s.y - 10, 10, 10, () => R(0, 0, 10, 7, "#2a2a33") + R(1, 7, 8, 2, "#3a3a48")) });
  meeting.who.forEach((n, i) => { const l = loungers.get(n); if (!l || !meeting.on) return; const s = MEET_SEATS[i]; items.push({ y: s.y, draw: () => drawPerson(s.x, s.y, l.look, { seated: true, back: s.y < 150, frame: Math.floor(t / 400) + i, smile: true }) }); });
  if (meeting.on) items.push({ y: 151, draw: () => drawPerson(115, 151, CHIEF_LOOK, { tux: true, arms: "baton", frame: Math.floor(t / 600), smile: true }) });
  items.push(...roomDepthItems("meeting", t));
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  meeting.who.forEach((n, i) => { const l = loungers.get(n); if (l && meeting.on && Math.floor(t / 2500 + i) % 4 === 0) bubble(MEET_SEATS[i].x, MEET_SEATS[i].y - 22, ["D'accord.", "Bonne idée !", "Je m'en occupe.", "Et les tests ?"][i % 4]); });
  if (!meeting.on) text("Clique sur la table pour réunir l'équipe", 200, 200, "#d5eeff", 5, "center");
  drawBuyOverlay("meeting", t);
}
// the terrace: open sky, city skyline, wooden deck, string lights, barbecue; the afterwork happens here
function renderTerrace(t) {
  const { phase } = skyPhase();
  const st = SKY[phase];  // full-width sky (skyGradientArt is window-sized)
  art(`terrasky:${phase}`, 0, 0, W, 72, () => `<defs><linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${st[0]}"/><stop offset=".6" stop-color="${st[1]}"/><stop offset="1" stop-color="${st[2]}"/></linearGradient></defs><rect width="${W}" height="72" fill="url(#tsky)"/>`, { outline: false });
  if (phase === "night") art("tmoon", 318, 10, 12, 12, `<circle cx="6" cy="6" r="5.4" fill="#f4efc9"/><circle cx="8.4" cy="4.6" r="4.6" fill="${st[0]}"/>`, { outline: false });
  else { const h = clockNow().getHours() + clockNow().getMinutes() / 60, k = Math.max(0, Math.min(1, (h - 6) / 15)); px(20 + k * 360 - 5, 46 - Math.sin(k * Math.PI) * 34 - 5, 10, 10, phase === "day" ? "#ffe066" : "#ff9f43"); }
  if (phase === "night") for (let i = 0; i < 30; i++) if ((Math.floor(t / 600) + i) % 6) px((i * 53) % W, (i * 17) % 50, 0.8, 0.8, "#f4f2ff");
  for (let i = 0; i < 14; i++) { const h = 16 + (hash(`b${i}`) % 26), x = i * 30 - 4; px(x, 72 - h, 26, h, phase === "night" ? "#1c1b2e" : "#5a6378"); if (phase === "night") for (let w = 0; w < 6; w++) if ((hash(`w${i}${w}`) % 3) === 0) px(x + 4 + (w % 3) * 7, 72 - h + 4 + Math.floor(w / 3) * 6, 2.4, 2.4, "#ffd77a"); }
  for (let y = 72; y < H; y += 6) { px(0, y, W, 6, (y / 6) % 2 ? "#9a7550" : "#8a6a48"); px(0, y, W, 0.5, "#6d5238"); }
  px(0, 70, W, 3, "#4a3826"); for (let x = 2; x < W; x += 12) px(x, 58, 1.6, 14, "#4a3826"); px(0, 58, W, 1.6, "#5c3d27");
  for (let x = 6; x < W; x += 14) { const on = phase !== "day" || dayState.party; px(x, 12 + Math.sin(x / 30) * 3, 1.8, 2.4, on ? ["#ffd43b", "#ff9f43", "#fff3b0"][x % 3] : "#c8c4bc"); }
  text("TERRASSE", 200, 4, "#fbaa08", 6, "center");
  sprite(doorSprite("lounge"), 8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
  drawRoomItems("terrace", t, "rug");
  const items = [
    { y: 112, draw: () => { art("bbq", 330, 92, 22, 20, () => R(2, 6, 18, 8, "#2a2a33") + R(0, 4, 22, 3, "#3a3a44") + R(4, 14, 2, 6, "#2a2a33") + R(16, 14, 2, 6, "#2a2a33")); if (dayState.party) for (let i = 0; i < 3; i++) px(334 + i * 6, 88 - ((t / 40 + i * 9) % 12), 2, 2, "rgba(220,220,230,.5)"); } },
    ...[[60, 160], [100, 170], [300, 190]].map(([x, y]) => ({ y, draw: () => art("deckchair", x - 10, y - 12, 20, 12, () => R(0, 6, 20, 4, "#f7f7f7") + R(0, 6, 20, 1, "#ff6b6b") + R(14, 0, 6, 7, "#f7f7f7") + R(1, 10, 1.4, 2, "#8a6a4a") + R(17, 10, 1.4, 2, "#8a6a4a")) })),
    { y: 214, draw: () => sprite("plant", 368, 196) }, { y: 214, draw: () => sprite("plant", 20, 196) },
  ];
  for (const l of loungers.values()) if (l.partyRoom === "terrace" && !l.path.length) {
    const sp = PARTY_SPOTS[l.partySpot] || { x: l.x, y: l.y }, x = sp.x, y = sp.y + 70;
    items.push({ y, draw: () => { drawPerson(x, y, l.look, { arms: Math.floor(t / 500 + hash(l.name)) % 2 ? "up" : "down", frame: Math.floor(t / 300), smile: true }); px(x + 4, y - 13, 2.5, 3, "#f4c430"); } });
    items.push({ y: y + 0.1, draw: () => { badge(x, y + 2, nameTag(l.name), "#4090d7"); if (t < l.sayUntil) bubble(x, y - 24, l.say, "#f7f7f7", "#081746"); } });
  }
  items.push(...roomDepthItems("terrace", t));
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  if (!dayState.party) text(afterworkTime() ? "L'afterwork commence…" : "L'afterwork du vendredi (17 h) se tient ici 🍻", 200, 140, "#f7f7f7", 5, "center");
  drawSeasonTerrace(t);  // seasons.js
  drawPartyOver("terrace", t);
  drawBuyOverlay("terrace", t);
}
function hitRoom(room, x, y) {
  if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
  const itm = hitItem(x, y, room); if (itm) return itm;
  if (room === "meeting" && x >= 128 && x <= 272 && y >= 132 && y <= 168) return "meet-table";
  return null;
}
