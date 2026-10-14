"use strict";
// Laser pointer and random office events.

/* ---------- fun: laser, office events, shop, mini-games, kudos ---------- */
// all of it is a game layered on the real activity; nothing here touches the agents. Per-viewer state lives in localStorage.
function store(key, def) { if (DEMO) return { ...def }; try { return { ...def, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch (_) { return { ...def }; } }
function save(key, val) { if (DEMO) return; try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { /* storage blocked: kept for this page only */ } }
const today = () => new Date().toISOString().slice(0, 10);

/* laser pointer: hold Shift over the office, Brume chases the dot, then gets bored */
const laser = { on: false, x: 0, y: 0, over: false };
addEventListener("keydown", ev => { if (ev.key === "Shift") laser.on = true; });
addEventListener("keyup", ev => { if (ev.key === "Shift") laser.on = false; });
addEventListener("blur", () => { laser.on = false; });
function laserActive() { return laser.on && laser.over && view === "office"; }
function stepLaser(dt, t) {
  if (!laserActive()) { if (cat.mode === "chase") { cat.mode = "sit"; cat.until = t + 2000; } return false; }
  if (t < (cat.boredUntil || 0)) return false;
  if (cat.mode !== "chase") { cat.mode = "chase"; cat.chaseStart = t; cat.path = []; if (cat.desk) { cat.y = cat.desk.y + 28; cat.desk = null; } }
  const tx = Math.max(6, Math.min(W - 6, laser.x)), ty = Math.max(74, Math.min(H - 4, laser.y));
  const dx = tx - cat.x, dy = ty - cat.y, dist = Math.hypot(dx, dy), sp = 0.1 * dt;
  if (dx) cat.dir = Math.sign(dx);
  if (dist > sp) { cat.x += dx / dist * sp; cat.y += dy / dist * sp; }
  else if (t > cat.jump) cat.jump = t + 600;  // pounce
  if (t - cat.chaseStart > 10000) {  // enough
    cat.mode = "sit"; cat.until = t + 6000; cat.boredUntil = t + 25000; cat.say = "Bof."; cat.sayUntil = t + 2000;
  }
  return true;
}
function drawLaser(t) {
  const on = laserActive();
  cv.classList.toggle("laser", on);  // the mouse cursor would hide the dot
  if (!on) return;
  const { x, y } = laser, r = 3.5 + Math.sin(t / 90) * 0.8;
  ctx.globalAlpha = 0.25; px(x - r - 1.5, y - r - 1.5, 2 * r + 3, 2 * r + 3, "#ff2020");
  ctx.globalAlpha = 0.5; px(x - r, y - r, 2 * r, 2 * r, "#ff3b3b"); ctx.globalAlpha = 1;
  px(x - 1.5, y - 1.5, 3, 3, "#ff2020"); px(x - 0.6, y - 0.6, 1.2, 1.2, "#ffe3e3");
}

/* random office events, solved by a click */
const events = { coffee: false, spill: null, croissants: false, plant: -1, next: performance.now() + 60000 + Math.random() * 120000 };
let eventLog = store("office-events", { solved: 0 });
const PLANTS = [[300, 54], [6, 206]];
function startEvent(t) {
  const friday = new Date().getDay() === 5;
  const kinds = [!events.coffee && "coffee", !events.spill && "spill", !events.croissants && "croissants", ...(friday && !events.croissants ? ["croissants", "croissants"] : []), events.plant < 0 && "plant"].filter(Boolean);
  if (!kinds.length) return;
  const k = kinds[Math.floor(Math.random() * kinds.length)];
  if (k === "coffee") { events.coffee = true; toast("INCIDENT", "La machine à café est en panne !", "Clique dessus pour la réparer : sans elle, pas de pause café."); }
  else if (k === "spill") {
    const y = [LANE, 150, 212][Math.floor(Math.random() * 3)], x = 60 + Math.random() * 260;
    events.spill = { x, y };
    cat.mode = "walk"; cat.path = catPath(x + 8, y); cat.next = { mode: "sit" }; cat.say = "Oups."; cat.sayUntil = t + 6000;
    toast("OUPS", `${CAT_NAME} a renversé un café`, "Clique sur la flaque pour nettoyer.");
  } else if (k === "croissants") { events.croissants = true; toast("LIVRAISON", "Des croissants sont arrivés 🥐", "Clique sur la boîte près du podium pour les distribuer."); }
  else { events.plant = Math.floor(Math.random() * PLANTS.length); toast("ALERTE VERTE", "Une plante a soif", "Clique dessus pour l'arroser."); }
  sfx("fail");
}
function stepEvents(t) {
  if (focusMode) return;
  const active = (events.coffee ? 1 : 0) + (events.spill ? 1 : 0) + (events.croissants ? 1 : 0) + (events.plant >= 0 ? 1 : 0);
  if (t > events.next) { if (active < 2) startEvent(t); events.next = t + 180000 + Math.random() * 180000; }
}
function solved(title, body) {
  eventLog.solved++; save("office-events", eventLog);
  for (const e of ents.values()) if (e.who && !e.leaving && !e.queued) crewAdd(e.who, { moral: 3 });
  toast("RÉGLÉ ✓", title, `${body} (${eventLog.solved} problème(s) réglé(s) au total)`); sfx("verify");
}
function solveEvent(id) {
  const t = performance.now();
  if (id === "fix-coffee") { events.coffee = false; burst(325, 52, ["#fbaa08", "#f7f7f7", "#5aa9ff"], 16); solved("Machine à café réparée", "Les pauses café reprennent."); }
  else if (id === "clean") { const s = events.spill; events.spill = null; burst(s.x, s.y - 2, ["#d5eeff", "#f7f7f7"], 14, 0.6); cat.say = "Mrrp."; cat.sayUntil = t + 1500; solved("Flaque nettoyée", "Le sol brille."); }
  else if (id === "croissants") {
    events.croissants = false; burst(246, 84, ["#de8001", "#fbaa08", "#f4efc9"], 20);
    for (const e of ents.values()) if (e.who && !e.leaving && !e.queued) { crewAdd(e.who, { moral: 6, fatigue: -3 }); if (e.seated) { e.fxKind = "commit"; e.fxMsg = "🥐 Miam !"; e.fxUntil = t + 2600; } }
    for (const l of loungers.values()) { crewAdd(l.name, { moral: 6 }); loungeSay(l.name, "Merci pour les croissants !", t); }
    solved("Croissants distribués", "Toute l'équipe a le moral.");
  } else if (id === "water") { const [x, y] = PLANTS[events.plant]; events.plant = -1; rain(x + 5, y + 6, "#5aa9ff"); solved("Plante arrosée", "Elle reprend des couleurs."); }
}
function drawEvents(t) {
  const blink = Math.floor(t / 300) % 2;
  const mark = (x, y) => { if (blink) { px(x - 1.5, y - 6, 3, 4, "#fbaa08"); text("!", x, y - 6.4, "#081746", 4.5, "center"); } };
  if (events.coffee) { art(`coffeebroken:${blink}`, 320, 48.4, 10, 5.6, () => brokenCoffeeArt(blink)); if (Math.random() < 0.02) smoke(325, 50); mark(336, 44); }
  if (events.plant >= 0) { const [x, y] = PLANTS[events.plant]; art("wilted", x - 2, y - 6, 14, 15, wiltedPlantArt); mark(x + 5, y - 7); }
  if (events.spill) { const { x, y } = events.spill; art("spill", x - 9, y - 4, 23, 9, SPILL_ART); mark(x, y - 5); }
  if (events.croissants) { art("croissants", 239, 76, 16, 11, CROISSANTS_ART); mark(246, 74); }
}
function hitEvents(x, y) {
  if (events.coffee && x >= 314 && x <= 336 && y >= 40 && y <= 68) return "fix-coffee";
  if (events.spill && Math.abs(x - events.spill.x) <= 9 && Math.abs(y - events.spill.y) <= 6) return "clean";
  if (events.croissants && x >= 236 && x <= 256 && y >= 72 && y <= 90) return "croissants";
  if (events.plant >= 0) { const [px0, py0] = PLANTS[events.plant]; if (x >= px0 - 3 && x <= px0 + 13 && y >= py0 - 8 && y <= py0 + 14) return "water"; }
  return null;
}
