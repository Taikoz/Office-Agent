// The kitchen of the break room: the stove and the dining table, the recipes and the fridge's ingredients, cooking
// (chopping, the pan on the fire, a fire to put out), eating at the table, and how it is all drawn.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief, px } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { anchored } from "../iso/engine.js";
import { crewAdd, mate } from "../sims/crew.js";
import { loungers, pick, sendTo } from "../world/lounge.js";
import { sfx, toast } from "../sims/progress.js";
import { canAfford, fmtSim, spend } from "../sims/money.js";
import { cookLevel, cookXp, saveSocial, social } from "./relations.js";

/* ---------- break-room places: stove, helper spot, dining table ---------- */
export const STOVE = { x: 212, y: 84 }, HELPER = { x: 190, y: 84 }, PAN = { x: 205, y: 46 };  // follow the stove bought (build.js); PAN.fx, fy, z: its top in the room
// drawn on the stove's top, in the isometric view (the pan, the flames, the fire's warning)
export const panAt = fn => hub.ISO?.drawing && PAN.fx != null ? hub.ISO.put(PAN.x + 5, PAN.y + 5.6, PAN.fx, PAN.fy, PAN.z, fn) : fn();
export const TABLE = { x: 162, y: 175, w: 48, h: 15 };
export const SEATS = [{ x: 174, y: 172 }, { x: 198, y: 172, via: { x: 184, y: 172 } }, { x: 174, y: 204, via: { x: 150, y: 204 }, back: true }, { x: 198, y: 204, via: { x: 150, y: 204 }, back: true }];
const COOK_ACT = { id: "cook", label: "cuisine", pose: { back: true, arms: "type" }, fx: { ennui: -2 } };
export const HELP_ACT = { id: "helpcook", label: "aide en cuisine", pose: { back: true, arms: "type" }, fx: { ennui: -2, moral: 0.5 } };
const EAT_ACT = { id: "eat", label: "mange à table", pose: { seated: true }, fx: { moral: 1 } };
export const VISIT_ACT = { id: "visit", label: "papote", pose: {}, fx: { ennui: -2, moral: 0.5 } };
export const RECIPES = [
  { id: "pates", cost: 20, icon: "🍝", label: "Pâtes bolo", lvl: 1, portions: 4, ms: 12000, fill: 55, food: "#e8b04c", top: "#c0392b" },
  { id: "crepes", cost: 25, icon: "🥞", label: "Crêpes", lvl: 2, portions: 6, ms: 14000, fill: 45, food: "#f2c46d", top: "#7a4b32", fun: 8 },
  { id: "pizza", cost: 40, icon: "🍕", label: "Pizza maison", lvl: 3, portions: 6, ms: 18000, fill: 65, food: "#f4d27a", top: "#d64545", fun: 6 },
  { id: "curry", cost: 45, icon: "🍛", label: "Curry de légumes", lvl: 4, portions: 5, ms: 18000, fill: 75, food: "#f0b429", top: "#2f9e44" },
  { id: "gateau", cost: 60, icon: "🎂", label: "Gâteau au chocolat", lvl: 6, portions: 8, ms: 22000, fill: 40, food: "#6d4a2e", top: "#f7f7f7", fun: 15 },
];
// the fridge: ingredients bought with § (🛒 Faire les courses), each recipe takes its own; the devs only cook what is in it
export const INGREDIENTS = { pates: ["🍝", "Pâtes", 4], tomates: ["🍅", "Tomates", 5], viande: ["🥩", "Viande hachée", 9], farine: ["🌾", "Farine", 4], oeufs: ["🥚", "Œufs", 5],
  lait: ["🥛", "Lait", 4], fromage: ["🧀", "Fromage", 12], legumes: ["🥕", "Légumes", 9], riz: ["🍚", "Riz", 5], chocolat: ["🍫", "Chocolat", 14], beurre: ["🧈", "Beurre", 6] };
const NEEDS_OF = { pates: { pates: 1, tomates: 1, viande: 1 }, crepes: { farine: 1, oeufs: 1, lait: 1 }, pizza: { farine: 1, tomates: 1, fromage: 1 },
  curry: { legumes: 2, riz: 1 }, gateau: { chocolat: 1, oeufs: 2, farine: 1, beurre: 1 } };
export let pantry = new SaveSlot("office-pantry", { pates: 1, tomates: 1, viande: 1, farine: 1, oeufs: 1, lait: 1 }).data;  // a first shopping bag
export const savePantry = () => SaveSlot.get("office-pantry").save(pantry);
const missingFor = rc => Object.entries(NEEDS_OF[rc.id] || {}).filter(([k, n]) => (pantry[k] || 0) < n);
export const hasIngredients = rc => !missingFor(rc).length;
const basketCost = rc => Object.entries(NEEDS_OF[rc.id] || {}).reduce((sum, [k, n]) => sum + INGREDIENTS[k][2] * n, 0);
export const fridgeLine = () => Object.entries(pantry).filter(([k, n]) => n > 0 && INGREDIENTS[k]).map(([k, n]) => `${INGREDIENTS[k][0]}${n}`).join(" ") || "frigo vide";
function takeIngredients(rc) { if (!hasIngredients(rc)) return false; for (const [k, n] of Object.entries(NEEDS_OF[rc.id] || {})) pantry[k] -= n; savePantry(); return true; }
function buyBasket(rc) {
  if (!spend(basketCost(rc), `Courses : ${rc.label}`)) return false;
  for (const [k, n] of Object.entries(NEEDS_OF[rc.id] || {})) pantry[k] = (pantry[k] || 0) + n;
  savePantry(); return true;
}
export function recipeLock(rc, lvl) { return rc.lvl > lvl ? `niv. ${rc.lvl}` : cooking || fire ? "cuisine occupée" : !hasIngredients(rc) ? `manque ${missingFor(rc).map(([k]) => INGREDIENTS[k][0]).join("")}` : ""; }
export const shopItems = () => RECIPES.map(rc => [`shop:${rc.id}`, rc.icon, `Courses ${rc.label.toLowerCase()} · ${fmtSim(basketCost(rc))}`, canAfford(basketCost(rc)) ? "" : "pas assez de §"]);
export function shopFor(rc) {
  if (!buyBasket(rc)) return hub.say(CHIEF_NAME, "Pas assez d'argent pour les courses…");
  const fr = hub.itemsIn("lounge").find(it => hub.defOf(it.type).cook === "fridge"); if (fr) fr.openUntil = performance.now() + 2200;
  hub.say(CHIEF_NAME, `🛒 Courses rangées : ${Object.keys(NEEDS_OF[rc.id]).map(k => INGREDIENTS[k][0]).join(" ")}`, 2600); sfx("commit");
}
const STAGES = [[0.3, "🔪 prépare"], [0.85, "🔥 cuisine"], [1, "🍽️ dresse"]];
export let cooking = null, dish = null, fire = null, nextAuto = 0, nextVisit = 0;
export const eaters = new Map(), convos = [], socialFx = [], steam = [];

/* ---------- cooking ---------- */
export function startCooking(cook, recipe, helper = null) {
  if (cooking || fire) return;
  if (!hub.kitchenReady()) return hub.say(cook, "Il faut un frigo et une gazinière… (mode achat)");
  if (!takeIngredients(recipe)) return hub.say(cook, `Il manque ${missingFor(recipe).map(([k]) => INGREDIENTS[k][1].toLowerCase()).join(", ")} au frigo… 🛒`);  // groceries bought before (fridge)
  const t = performance.now();
  cooking = { cook, helper, recipe, start: t, ms: recipe.ms * (helper ? 0.75 : 1), stage: -1, arrived: false, helperIn: !helper };
  const onStove = () => { if (cooking?.cook === cook) cooking.arrived = true; };
  if (cook === CHIEF_NAME) hub.chiefTo(STOVE, COOK_ACT, onStove);
  else { const l = loungers.get(cook); hub.sendMate(l, STOVE, COOK_ACT, 600000); }
  if (helper) { const h = loungers.get(helper); if (h) hub.sendMate(h, HELPER, HELP_ACT, 600000); }
  hub.say(cook, `${recipe.icon} ${recipe.label} pour tout le monde !`, 3000);
}
export function stopCooking() {
  if (!cooking) return;
  for (const n of [cooking.cook, cooking.helper]) { const l = n && hub.lounger(n); if (l) { l.busy = false; l.next = 0; } }
  if (cooking.cook === CHIEF_NAME && chief.lspot?.act === COOK_ACT) chief.lspot = { ...STOVE, act: { id: "stand", label: "se pose", pose: {} } };
  cooking = null;
}
export function stepCooking(t, dt) {
  const c = cooking; if (!c) return;
  if (!hub.here(c.cook) || (c.cook === CHIEF_NAME && chief.lspot?.act !== COOK_ACT)) { hub.say(c.cook, "Le plat attendra…"); return stopCooking(); }
  if (c.helper && !hub.here(c.helper)) c.helper = null;
  if (!c.arrived) {
    const l = hub.lounger(c.cook);
    if (l && !l.path.length) c.arrived = true;
    if (!c.arrived) { c.start = t; return; }
  }
  const hl = c.helper && hub.lounger(c.helper);
  const p = Math.min(1, (t - c.start) / c.ms), stage = STAGES.findIndex(([end]) => p < end || end === 1);
  if (stage !== c.stage) { c.stage = stage; hub.say(c.cook, STAGES[stage][1], 1800); }
  if (stage === 1 && Math.random() < dt / 260) steam.push({ x: PAN.x + 2 + Math.random() * 6, y: PAN.y + 1, born: t, life: 1300 + Math.random() * 700, dark: c.burning });
  if (hl && !hl.path.length && Math.random() < dt / 2500) hub.bond(c.cook, c.helper, 1);  // cooking together brings people closer
  if (stage === 1 && c.burnRoll === undefined) {  // a clumsy cook may burn the dish, or set the stove on fire
    const lvl = cookLevel(c.cook), r = Math.random(), risk = Math.max(0.03, 0.4 - lvl * 0.07) * (c.helper ? 0.6 : 1);
    c.burnRoll = r < risk; c.fireRoll = c.burnRoll && lvl <= 2 && Math.random() < 0.35;
  }
  if (c.burnRoll && p > 0.65 && !c.burning) { c.burning = true; hub.say(c.cook, "Ça sent le brûlé…", 2200); }
  if (c.fireRoll && p > 0.75) return startFire(t);
  if (p < 1) return;
  const lvl0 = cookLevel(c.cook);
  social.cook[c.cook] = cookXp(c.cook) + (c.burnRoll ? 1 : 1 + c.recipe.lvl);
  if (c.helper) social.cook[c.helper] = cookXp(c.helper) + 1;
  if (cookLevel(c.cook) > lvl0) { toast("CUISINE", `${c.cook} passe niveau ${cookLevel(c.cook)} en cuisine !`, nextRecipe(c.cook)); hub.floatUp(STOVE.x, STOVE.y - 34, "⭐", "#fbaa08", 3); }
  dish = { recipe: c.recipe, portions: c.recipe.portions, burnt: !!c.burnRoll, cook: c.cook, helper: c.helper, at: t };
  if (!c.burnRoll) hub.wantEvent(c.cook, "cook");
  social.meals++;
  hub.say(c.cook, c.burnRoll ? "Bon… c'est un peu cramé 😬" : `À table ! ${c.recipe.icon}`, 3200);
  hub.burstLounge(TABLE.x + TABLE.w / 2, TABLE.y, c.burnRoll ? ["#555", "#333"] : ["#fbaa08", "#51cf66", "#ff6b9a"]);
  stopCooking(); saveSocial();
}
function nextRecipe(n) { const r = RECIPES.find(x => x.lvl === cookLevel(n)); return r ? `Nouvelle recette : ${r.icon} ${r.label}` : ""; }

// a kitchen fire: flames and smoke, everybody panics; the chief puts it out (pie menu), or a brave dev after a while
function startFire(t) {
  const cook = cooking.cook; stopCooking();
  fire = { start: t, cook, out: 0 };
  sfx("fail");
  toast("CUISINE", "🔥 Le feu en cuisine !", `${cook} a fait flamber la poêle. Clique sur la cuisine pour l'éteindre.`);
  for (const l of loungers.values()) if (!l.called) { hub.say(l.name, pick(["AU FEU ! 🔥", "Quelqu'un, un extincteur !", "Ça crame !!"]), 2500); hub.gesture(l.name, { arms: "up" }, 3000); crewAdd(l.name, { moral: -6 }); }
}
export function extinguish(hero) {
  if (!fire || fire.out > 0) return;
  fire.out = performance.now() + 2600; fire.hero = hero;
  hub.say(hero, "🧯 Je m'en occupe !", 2600); hub.gesture(hero, { arms: "type" }, 2600);
}
export function stepFire(t, dt) {
  if (!fire) return;
  const burning = !(fire.out > 0) || t < fire.out;
  if (Math.random() < dt / (burning ? 90 : 60)) steam.push({ x: PAN.x - 2 + Math.random() * 14, y: PAN.y - 2, born: t, life: 1800, dark: !fire.out, big: true });
  if (!fire.out && t - fire.start > 20000) {  // nobody came: the bravest dev in the room takes the extinguisher
    const brave = [...loungers.values()].filter(l => !l.called).sort((a, b) => mate(a.name).fatigue - mate(b.name).fatigue)[0];
    if (brave) { brave.busy = true; sendTo(brave, { ...HELPER, act: HELP_ACT }, t); brave.next = t + 8000; fire.walker = brave.name; }
    fire.out = -1;  // dispatched
  }
  if (fire.out === -1 && fire.walker) { const l = loungers.get(fire.walker); if (!l || !l.path.length) { if (l) l.busy = false; extinguish(fire.walker); } }
  if (fire.out > 0 && t >= fire.out) {
    const hero = fire.hero; fire = null;
    for (const l of loungers.values()) if (!l.called && l.name !== hero) { hub.bond(l.name, hero, 3); crewAdd(l.name, { moral: 4 }); }
    hub.say(hero, "Ouf, c'est éteint.", 2500);
    toast("CUISINE", `${hero} a éteint le feu`, "Toute l'équipe lui en est reconnaissante.");
    if (hero === CHIEF_NAME && chief.lspot?.act === HELP_ACT) chief.lspot = null;
  }
}

/* ---------- eating at the dining table ---------- */
export const EAT_MS = 11000;
export function freeSeat() { return SEATS.find(s => ![...eaters.values()].some(e => e.seat === s)); }
export function goEat(n) {
  const seat = freeSeat(); if (!dish || !dish.portions || !seat || eaters.has(n)) return false;
  dish.portions--;
  const e = { seat, recipe: dish.recipe, burnt: dish.burnt, cook: dish.cook, sat: false, start: 0 };
  eaters.set(n, e);
  const sit = () => { e.sat = true; e.start = performance.now(); };
  if (n === CHIEF_NAME) hub.chiefTo(seat, EAT_ACT, sit); else hub.sendMate(loungers.get(n), seat, EAT_ACT, 600000);
  if (!dish.portions) dish.leftAt = performance.now();
  return true;
}
export function stepEaters(t, dt) {
  for (const [n, e] of eaters) {
    const l = hub.lounger(n);
    if (!hub.here(n) || (n === CHIEF_NAME ? chief.lspot?.act !== EAT_ACT : l.spot?.act !== EAT_ACT)) { eaters.delete(n); if (l) l.busy = false; continue; }
    if (!e.sat) { if (l && !l.path.length) { e.sat = true; e.start = t; } else continue; }
    crewAdd(n, { faim: e.recipe.fill * (e.burnt ? 0.5 : 1) * dt / EAT_MS, ennui: -(e.recipe.fun || 0) * dt / EAT_MS, social: 6 * dt / EAT_MS });
    if (!e.said && t - e.start > 2500) {
      e.said = true;
      const thanks = e.burnt ? pick(["C'est… croustillant.", "Bon, c'est mangeable."]) : n === e.cook ? pick(["Pas mal, je me surpasse.", "Mmh, réussi !"]) : pick([`Merci ${e.cook}, c'est délicieux !`, `${e.recipe.icon} Trop bon !`, "Le chef étoilé de l'équipe !"]);
      hub.say(n, thanks, 3000);
      if (n !== e.cook) hub.bond(n, e.cook, e.burnt ? -2 : 5);
    }
    // two people at the table chat a little
    for (const [o] of eaters) if (o !== n && n < o && Math.random() < dt / 9000) hub.bond(n, o, 1);
    if (t - e.start > EAT_MS) {
      eaters.delete(n); crewAdd(n, { moral: e.burnt ? -2 : 5 });
      if (!e.burnt) { hub.wantEvent(n, "eat", e.recipe.id); hub.addMoodlet(n, "meal", "😋", "Bon repas", 4 * hub.traitK(n, "eat"), 45); }
      if (l) { l.busy = false; l.next = 0; } else { chief.lspot = { ...e.seat, act: { id: "stand", label: "se pose", pose: {} } }; hub.chiefTo({ x: e.seat.x + (e.seat.back ? -14 : 0), y: e.seat.back ? 214 : 160 }, null); }
    }
  }
  if (dish && !dish.portions && !eaters.size) dish = null;
  if (dish && t - dish.at > 600000) { dish = null; }  // 10 min on the table: thrown away
}

// on the counter, over the kitchen sprite: cutting board, pan on the burner, flames, food that jumps, plates
export function drawKitchenFx(t) {
  if (!hub.kitchenStove()) return;  // no stove bought: no burner, no pan
  px(PAN.x - 1, PAN.y + 5.6, 12, 0.8, "#3a3a44");  // burner
  const c = cooking && cooking.arrived ? cooking : null, stage = c ? c.stage : -1;
  if (fire) {
    const out = fire.out > 0, k = out ? Math.max(0, (fire.out - t) / 2600) : Math.min(1, (t - fire.start) / 4000);
    for (let i = 0; i < 7; i++) {
      const h = (3 + Math.abs(Math.sin(t / 110 + i * 1.7)) * 6) * (0.4 + k);
      px(PAN.x - 2 + i * 2, PAN.y + 5 - h, 2, h, i % 2 ? "#ff6b35" : "#ffd43b");
      px(PAN.x - 1.6 + i * 2, PAN.y + 5 - h * 0.45, 1.2, h * 0.45, "#fff3b0");
    }
    if (out && fire.hero) { const p = hub.posOf(fire.hero); if (p) for (let i = 0; i < 6; i++) px(p.x + (PAN.x + 4 - p.x) * ((t / 300 + i / 6) % 1), p.y - 14 + (PAN.y + 2 - p.y + 14) * ((t / 300 + i / 6) % 1), 1.6, 1.6, "#f7f7f7"); }
    return;
  }
  if (stage === 0) {  // chopping: board, vegetables, a knife going up and down
    px(PAN.x - 1, PAN.y + 3.6, 12, 2, "#c79a6b"); px(PAN.x - 1, PAN.y + 3.6, 12, 0.5, "#e0b98a");
    const cut = Math.floor(t / 180) % 2;
    for (let i = 0; i < 4; i++) px(PAN.x + i * 1.6, PAN.y + 2.8, 1.2, 1, i % 2 ? "#51cf66" : "#ff6b6b");
    px(PAN.x + 6.5, PAN.y + 2.4, 2, 1.4, "#ff9f43");
    px(PAN.x + 7, PAN.y - 1.5 + cut * 2.6, 3.4, 0.8, "#dfe4ee"); px(PAN.x + 10.2, PAN.y - 1.8 + cut * 2.6, 1.8, 1.2, "#2a2a33");
    if (cut && Math.floor(t / 180) % 4 === 1) px(PAN.x + 5.5, PAN.y + 1.6, 0.8, 0.8, "#51cf66");
  } else {
    const r = c?.recipe, cookingNow = stage === 1;
    if (cookingNow) for (let i = 0; i < 5; i++) { const h = 1 + Math.abs(Math.sin(t / 90 + i)) * 1.4; px(PAN.x + 0.6 + i * 2, PAN.y + 5.6 - h, 1.2, h, i % 2 ? "#ff8f3b" : "#5aa9ff"); }
    px(PAN.x, PAN.y + 2.6, 10, 2.4, "#2a2a33"); px(PAN.x + 0.6, PAN.y + 2.4, 8.8, 0.8, "#4a4a55"); px(PAN.x + 10, PAN.y + 3, 4.5, 1, "#1c1c24");
    if (cookingNow) {  // the food sizzles, and a bit jumps out of the pan now and then (flip)
      const col = c.burning ? "#3a2a1e" : r.food;
      for (let i = 0; i < 4; i++) px(PAN.x + 1.4 + i * 2, PAN.y + 1.8 + (Math.floor(t / 120 + i) % 2) * 0.4, 1.6, 1, i % 2 ? col : (c.burning ? "#222" : r.top));
      const k = (t % 1400) / 1400; if (k < 0.45) { const j = Math.sin(k / 0.45 * Math.PI) * 6; px(PAN.x + 4, PAN.y + 1.4 - j, 1.6, 1.2, col); }
    }
    if (stage === 2) for (let i = 0; i < 3; i++) ART.plate.draw(PAN.x - 14 + i * 4, PAN.y + 2.4 - i * 0.4, { food: r.food, top: r.top, burnt: !!c.burning, k: 1 });
  }
}
export function drawSteam(t) {
  for (const s of steam) {
    const k = (t - s.born) / s.life; if (k < 0) continue;
    const size = (s.big ? 2.6 : 1.4) + k * (s.big ? 3 : 1.6), c = s.dark ? `rgba(40,36,48,${0.75 * (1 - k)})` : `rgba(245,245,255,${0.6 * (1 - k)})`;
    panAt(() => px(s.x + Math.sin(k * 6 + s.x) * 1.5 - size / 2, s.y - k * (s.big ? 26 : 14) - size / 2, size, size, c));  // over the pan
  }
}
// furniture of the depth-sorted list: the table (with the dish and the plates) and its stools
export function socialItems(t) {
  const items = SEATS.map(s => ({ y: s.y - (s.back ? -1 : 1), draw: () => ART.stool.draw(s.x - 4, s.y - (s.back ? 4 : 5)) }));
  items.push({ y: TABLE.y + 8, draw: () => { ART.table.draw(TABLE.x, TABLE.y, { w: TABLE.w, h: TABLE.h }); drawTableTop(t); } });
  return items;
}
// what is on the dining table: the dish, the plates of the people eating (also on the isometric table, rooms/lounge.js)
export function drawTableTop(t) {
  if (dish) ART.dish.draw(TABLE.x + TABLE.w / 2 - 7, TABLE.y + 1, { food: dish.recipe.food, top: dish.recipe.top, burnt: dish.burnt, n: dish.portions, max: dish.recipe.portions });
  for (const [, e] of eaters) {
    if (!e.sat) continue;
    const k = Math.max(0, 1 - (t - e.start) / EAT_MS), q = Math.ceil(k * 3) / 3;
    ART.plate.draw(e.seat.x - 3.5, e.seat.back ? TABLE.y + TABLE.h - 9 : TABLE.y + 1.5, { food: e.recipe.food, top: e.recipe.top, burnt: e.burnt, k: q });
  }
}
// a fork going to the mouth for the people eating (drawn after them)
export function drawFork(x, y, seat, t, start) {
  if (seat.back) return;
  const up = Math.floor((t - start) / 600) % 3 === 0;
  px(x + 3, y - (up ? 17 : 12), 0.8, 3, "#dfe4ee"); px(x + 2.6, y - (up ? 17.6 : 12.6), 1.6, 0.8, "#dfe4ee");
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get dish() { return dish; }, set dish(v) { dish = v; }, get nextAuto() { return nextAuto; }, set nextAuto(v) { nextAuto = v; }, get nextVisit() { return nextVisit; }, set nextVisit(v) { nextVisit = v; } });
