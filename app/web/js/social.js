"use strict";
// Sims-style social life in the break room: a pie menu of interactions (the chief talks, jokes, hugs, teases…),
// friendships between everybody (the devs also visit and bond on their own), and a kitchen where the chief or a hungry
// dev cooks a dish for the team: chopping, pan on the fire, steam, plates, a dining table where the others come to eat.
// Purely a game: nothing here touches the agents.

/* ---------- friendships and cooking skill, kept in this browser (never in demo) ---------- */
const SOCIAL_KEY = "office-social";
let social = { rel: {}, cook: {}, meals: 0 };
try { Object.assign(social, JSON.parse(localStorage.getItem(SOCIAL_KEY) || "{}")); } catch (_) { /* storage blocked: fresh friendships */ }
function saveSocial() { if (DEMO) return; try { localStorage.setItem(SOCIAL_KEY, JSON.stringify(social)); } catch (_) { /* kept for this page only */ } }
setInterval(saveSocial, 10000); addEventListener("beforeunload", saveSocial);

const relKey = (a, b) => [a, b].sort().join("|");
// a pair that never met gets a small, stable affinity
function rel(a, b) { const k = relKey(a, b); if (social.rel[k] === undefined) social.rel[k] = hash(k) % 21 - 5; return social.rel[k]; }
function relAdd(a, b, d) { if (!a || !b || a === b) return; social.rel[relKey(a, b)] = Math.max(-100, Math.min(100, rel(a, b) + d)); }
const REL_LEVELS = [[-60, "Ennemi juré", "#ff6b6b"], [-20, "Tendu", "#ff9f43"], [15, "Connaissance", "#9aa3b5"], [40, "Copain", "#a9e34b"], [70, "Ami", "#51cf66"], [101, "Meilleur ami", "#ff6b9a"]];
const relLevel = v => REL_LEVELS.find(([max]) => v < max);
// cooking skill: levels 1-10 from the dishes cooked; the devs start with a little experience, the chief from scratch
const COOK_XP = [0, 2, 5, 9, 14, 20, 27, 35, 44, 54];
const cookXp = n => social.cook[n] ?? (n === CHIEF_NAME ? 0 : hash(`${n}:cook`) % 10);
const cookLevel = n => COOK_XP.filter(x => cookXp(n) >= x).length;
const everyone = () => [CHIEF_NAME, ...TEAM];

/* ---------- break-room places: stove, helper spot, dining table ---------- */
const STOVE = { x: 212, y: 84 }, HELPER = { x: 190, y: 84 }, PAN = { x: 205, y: 46 };  // the kitchen sprite sits at 158,30
const TABLE = { x: 162, y: 175, w: 48, h: 15 };
const SEATS = [{ x: 174, y: 172 }, { x: 198, y: 172, via: { x: 184, y: 172 } }, { x: 174, y: 204, via: { x: 150, y: 204 }, back: true }, { x: 198, y: 204, via: { x: 150, y: 204 }, back: true }];
const COOK_ACT = { id: "cook", label: "cuisine", pose: { back: true, arms: "type" }, fx: { ennui: -2 } };
const HELP_ACT = { id: "helpcook", label: "aide en cuisine", pose: { back: true, arms: "type" }, fx: { ennui: -2, moral: 0.5 } };
const EAT_ACT = { id: "eat", label: "mange à table", pose: { seated: true }, fx: { moral: 1 } };
const VISIT_ACT = { id: "visit", label: "papote", pose: {}, fx: { ennui: -2, moral: 0.5 } };
const RECIPES = [
  { id: "pates", cost: 20, icon: "🍝", label: "Pâtes bolo", lvl: 1, portions: 4, ms: 12000, fill: 55, food: "#e8b04c", top: "#c0392b" },
  { id: "crepes", cost: 25, icon: "🥞", label: "Crêpes", lvl: 2, portions: 6, ms: 14000, fill: 45, food: "#f2c46d", top: "#7a4b32", fun: 8 },
  { id: "pizza", cost: 40, icon: "🍕", label: "Pizza maison", lvl: 3, portions: 6, ms: 18000, fill: 65, food: "#f4d27a", top: "#d64545", fun: 6 },
  { id: "curry", cost: 45, icon: "🍛", label: "Curry de légumes", lvl: 4, portions: 5, ms: 18000, fill: 75, food: "#f0b429", top: "#2f9e44" },
  { id: "gateau", cost: 60, icon: "🎂", label: "Gâteau au chocolat", lvl: 6, portions: 8, ms: 22000, fill: 40, food: "#6d4a2e", top: "#f7f7f7", fun: 15 },
];
const STAGES = [[0.3, "🔪 prépare"], [0.85, "🔥 cuisine"], [1, "🍽️ dresse"]];
let cooking = null, dish = null, fire = null, nextAuto = 0, nextVisit = 0;
const eaters = new Map(), convos = [], socialFx = [], steam = [];

/* ---------- people: where they are, what they say ---------- */
const lounger = n => n === CHIEF_NAME ? null : loungers.get(n);
function posOf(n) { if (n === CHIEF_NAME) return { x: chief.lx, y: chief.ly }; const l = loungers.get(n); return l ? { x: l.x, y: l.y } : null; }
function here(n) { return n === CHIEF_NAME ? chief.room === "lounge" : !!loungers.get(n) && !loungers.get(n).called; }
function idleMate(l, t) { return !l.called && !l.path.length && !l.busy && t > (l.sayUntil || 0) - 2000; }
function say(n, msg, ms = 3000) {
  const t = performance.now();
  if (n === CHIEF_NAME) { chief.bubble = msg; chief.until = t + ms; } else { const l = loungers.get(n); if (l) { l.say = msg; l.sayUntil = t + ms; } }
}
function gesture(n, pose, ms) { const g = { pose, until: performance.now() + ms }; if (n === CHIEF_NAME) chief.gesture = g; else { const l = loungers.get(n); if (l) l.gesture = g; } }
function floatUp(x, y, txt, color, n = 1) {
  for (let i = 0; i < n; i++) socialFx.push({ x: x + (n > 1 ? (i - (n - 1) / 2) * 5 : 0), y, txt, color, born: performance.now() + i * 160, life: 1600 });
}
// a relationship change, shown the Sims way: green pluses or red minuses rising over the target, hearts between friends
function bond(a, b, d) {
  relAdd(a, b, d);
  const p = posOf(b) || posOf(a); if (!p) return;
  if (d > 0) floatUp(p.x, p.y - 30, "+", "#51cf66", Math.min(4, Math.ceil(d / 3)));
  else if (d < 0) floatUp(p.x, p.y - 30, "−", "#ff6b6b", Math.min(4, Math.ceil(-d / 3)));
  if (d >= 6 && rel(a, b) >= 40) floatUp(p.x, p.y - 36, "♥", "#ff6b9a", 2);
  if (d <= -8) floatUp(p.x, p.y - 36, "💢", "#ff6b6b");
  if ([40, 70].some(s => rel(a, b) >= s && rel(a, b) - d < s)) {  // a new level, like the Sims notification
    const [, label] = relLevel(rel(a, b));
    toast("AMITIÉ", `${a} et ${b} : ${label} !`, d > 0 ? "Leur relation passe un cap." : "");
    floatUp(p.x, p.y - 42, "♥", "#ff6b9a", 3);
  }
}

/* ---------- interactions: the pie menu's verbs ---------- */
// need: friendship needed (else refused), ok: success chance, d: [success, failure] friendship change
const TOPICS = ["⚽", "💻", "🍕", "🐈", "☕", "🎮", "🐛", "🚀", "🎬", "🌧️"];
const INTERACTIONS = {
  talk: { icon: "💬", label: "Discuter", ok: () => 0.9, d: [3, -1], social: 12, lines: ["Alors, quoi de neuf ?", "Ça avance, ton ticket ?", "T'as passé un bon week-end ?"], yes: ["Tranquille, et toi ?", "Ça roule !", "Raconte !"], no: ["Mouais…", "Pas trop envie de parler."] },
  compliment: { icon: "🌟", label: "Complimenter", cat: "amical", ok: m => 0.75 + m.moral / 400, d: [5, -1], social: 10, moral: 6, lines: ["Ta dernière MR était super propre.", "T'as géré sur ce bug !"], yes: ["Merci, ça fait plaisir !", "Oh, t'es gentil 😊"], no: ["Tu veux quoi en échange ?"] },
  hug: { icon: "🤗", label: "Câlin", cat: "amical", need: 40, ok: () => 0.95, d: [8, -6], social: 18, moral: 8, lines: ["Viens là !"], yes: ["Ohh ❤️", "Ça fait du bien."], no: ["Euh… non merci."] },
  highfive: { icon: "✋", label: "Check", cat: "amical", need: 15, ok: () => 0.95, d: [4, -3], social: 8, fun: 4, lines: ["Check !", "Tope là !"], yes: ["Yeah !", "✋ Paf !"], no: ["…je te laisse en plan."] },
  coffee: { icon: "☕", label: "Offrir un café", cat: "amical", ok: () => 1, d: [4, 0], social: 8, cafe: 35, lines: ["Je t'ai fait un café."], yes: ["Merci, j'en rêvais !", "Le meilleur collègue."] },
  cheer: { icon: "🎉", label: "Encourager", cat: "amical", ok: () => 0.95, d: [3, 0], social: 6, moral: 10, lines: ["On lâche rien !", "Tu vas tout casser aujourd'hui."], yes: ["Merci chef !", "Allez, on y va !"] },
  joke: { icon: "😂", label: "Raconter une blague", cat: "drôle", ok: m => 0.35 + (100 - m.ennui) / 300 + m.moral / 400, d: [6, -3], social: 10, fun: 15, lines: ["C'est un dev qui entre dans un bar…", "Pourquoi les devs confondent Halloween et Noël ? OCT 31 = DEC 25 !", "J'ai une blague sur UDP, mais pas sûr que tu la reçoives."], yes: ["HAHAHA 😂", "Excellente !", "Pfff… j'adore."], no: ["…", "Elle était nulle.", "Je l'ai pas comprise."] },
  tease: { icon: "😜", label: "Taquiner", cat: "drôle", ok: (m, r) => r >= 30 ? 0.85 : 0.3, d: [5, -7], social: 6, fun: 8, lines: ["Encore un console.log en prod ?", "Joli pull. Très… audacieux."], yes: ["Ha ha, t'es bête 😄", "Tu vas voir, toi !"], no: ["Pas drôle.", "Sérieux ?"] },
  dance: { icon: "🕺", label: "Danse ridicule", cat: "drôle", ok: m => 0.5 + m.moral / 250, d: [5, -2], social: 6, fun: 18, lines: ["Regarde ça !"], yes: ["😂 Encore !", "J'en peux plus !"], no: ["Je ne connais pas cette personne."] },
  critique: { icon: "🧐", label: "Critiquer son code", cat: "méchant", ok: () => 0.1, d: [2, -10], social: 2, moral: -8, lines: ["Ta fonction de 400 lignes, là…", "Pas un seul test ? Vraiment ?"], yes: ["Bon… t'as pas tort."], no: ["Et le tien, on en parle ?", "C'est bon, lâche-moi."] },
  argue: { icon: "😠", label: "Se disputer", cat: "méchant", ok: () => 0, d: [0, -16], social: -5, moral: -12, lines: ["C'est TOI qui as cassé la CI !", "Tabs, pas espaces. Point."], no: ["N'importe quoi !", "Tu me fatigues 😤"] },
  apologize: { icon: "🙏", label: "S'excuser", cat: "amical", max: 15, ok: (m, r) => 0.55 + r / 300 + m.moral / 300, d: [10, -2], social: 8, moral: 4, lines: ["Désolé pour l'autre fois…"], yes: ["C'est oublié 🤝", "Allez, on repart à zéro."], no: ["C'est un peu tard."] },
};
// what a dev does by itself to a colleague, from their relationship
function autoVerb(r, m) {
  if (r < -20) return Math.random() < 0.5 ? "argue" : "apologize";
  if (r >= 40 && Math.random() < 0.35) return pick(["hug", "highfive"]);
  if (m.ennui > 55 && Math.random() < 0.5) return pick(["joke", "dance"]);
  if (r >= 30 && Math.random() < 0.2) return "tease";
  return Math.random() < 0.6 ? "talk" : pick(["compliment", "joke", "cheer"]);
}

// a conversation: the two face each other, topic icons in bubbles, gestures; the outcome at the end
const CONVO_MS = 4200;
function startConvo(a, b, verb) {
  const t = performance.now(), it = INTERACTIONS[verb];
  if (!it || !here(a) || !here(b)) return;
  const la = lounger(a), lb = lounger(b);
  if (la) la.busy = true; if (lb) lb.busy = true;
  convos.push({ a, b, verb, start: t, end: t + CONVO_MS, beat: 0 });
  say(a, pick(it.lines), 2200);
  if (verb === "dance") gesture(a, { arms: "up" }, CONVO_MS - 600);
  if (verb === "hug" || verb === "highfive") gesture(a, { arms: "up" }, 1400);
}
function stepConvos(t) {
  for (let i = convos.length - 1; i >= 0; i--) {
    const c = convos[i], it = INTERACTIONS[c.verb];
    if (!here(c.a) || !here(c.b)) { convos.splice(i, 1); release(c); continue; }
    const beat = Math.floor((t - c.start) / 900);  // Sims-like chatter: topic icons back and forth
    if (beat !== c.beat && beat >= 2 && t < c.end - 800) { c.beat = beat; say(beat % 2 ? c.b : c.a, `${pick(TOPICS)} ${pick(TOPICS)}`, 850); }
    if (t < c.end) continue;
    convos.splice(i, 1);
    const m = mate(c.b), r = rel(c.a, c.b);
    const refused = (it.need !== undefined && r < it.need) || (it.max !== undefined && r > it.max);
    const ok = !refused && Math.random() < it.ok(m, r);
    bond(c.a, c.b, it.d[ok ? 0 : 1]);
    say(c.b, refused ? pick(["On n'est pas si proches…", "Euh… non."]) : pick((ok ? it.yes : it.no) || it.no || it.yes), 2800);
    if (ok) gesture(c.b, ["joke", "dance", "hug", "highfive", "tease"].includes(c.verb) ? { arms: "up" } : {}, 1200);
    crewAdd(c.a, { social: Math.max(0, it.social || 0) * 0.8, ennui: -(it.fun || 0) / 2 });
    if (ok) crewAdd(c.b, { social: it.social || 0, moral: it.moral || 0, ennui: -(it.fun || 0), cafe: it.cafe || 0 });
    else crewAdd(c.b, { moral: Math.min(0, it.moral || -2), social: Math.min(0, it.social || 0) });
    setTimeout(() => release(c), 2400);
  }
}
function release(c) {
  for (const n of [c.a, c.b]) {
    const l = lounger(n); if (!l || eaters.has(n) || cooking?.cook === n || cooking?.helper === n) continue;
    l.busy = false;
    if (l.spot?.act === VISIT_ACT) l.next = 0;  // the visitor goes back to an activity
  }
}

/* ---------- moving people to a place ---------- */
// a dev: through the break-room corridor (sendTo of lounge.js), to a spot with its own activity
function sendMate(l, sp, act, ms) { l.busy = true; sendTo(l, { ...sp, act }, performance.now()); l.next = performance.now() + ms; }
// the chief: same corridor, then `on` when he gets there
function chiefTo(sp, act, on) {
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lspot = act ? { ...sp, act } : null;
  chief.lpath = [...via, { x: via[0]?.x ?? chief.lx, y: LOUNGE_CORRIDOR }, { x: sp.via ? sp.via.x : sp.x, y: LOUNGE_CORRIDOR }, ...(sp.via ? [{ ...sp.via }] : []), { x: sp.x, y: sp.y, on }];
}
// next to someone: on the side with room, through the same detour as their spot
function besideOf(l) {
  const end = l.path.length ? l.path.at(-1) : l, side = end.x > 330 ? -11 : 11;
  return { x: Math.max(12, Math.min(388, end.x + side)), y: Math.max(76, end.y), via: l.spot?.via };
}
// every order to the chief goes through here: he comes from the office first if he is not in the break room
function chiefDo(fn) {
  if (chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = performance.now() + 3000; return; }
  if (chief.room === "lounge") return fn();
  chief.pendingSocial = fn; chiefToLounge();
}

/* ---------- cooking ---------- */
function startCooking(cook, recipe, helper = null) {
  if (cooking || fire) return;
  if (!kitchenReady()) return say(cook, "Il faut un frigo et une gazinière… (mode achat)");
  if (!spend(recipe.cost, `Courses : ${recipe.label}`)) return say(cook, "Plus d'argent pour les courses…");  // groceries, from the household funds
  const t = performance.now();
  cooking = { cook, helper, recipe, start: t, ms: recipe.ms * (helper ? 0.75 : 1), stage: -1, arrived: false, helperIn: !helper };
  const onStove = () => { if (cooking?.cook === cook) cooking.arrived = true; };
  if (cook === CHIEF_NAME) chiefTo(STOVE, COOK_ACT, onStove);
  else { const l = loungers.get(cook); sendMate(l, STOVE, COOK_ACT, 600000); }
  if (helper) { const h = loungers.get(helper); if (h) sendMate(h, HELPER, HELP_ACT, 600000); }
  say(cook, `${recipe.icon} ${recipe.label} pour tout le monde !`, 3000);
}
function stopCooking() {
  if (!cooking) return;
  for (const n of [cooking.cook, cooking.helper]) { const l = n && lounger(n); if (l) { l.busy = false; l.next = 0; } }
  if (cooking.cook === CHIEF_NAME && chief.lspot?.act === COOK_ACT) chief.lspot = { ...STOVE, act: { id: "stand", label: "se pose", pose: {} } };
  cooking = null;
}
function stepCooking(t, dt) {
  const c = cooking; if (!c) return;
  if (!here(c.cook) || (c.cook === CHIEF_NAME && chief.lspot?.act !== COOK_ACT)) { say(c.cook, "Le plat attendra…"); return stopCooking(); }
  if (c.helper && !here(c.helper)) c.helper = null;
  if (!c.arrived) {
    const l = lounger(c.cook);
    if (l && !l.path.length) c.arrived = true;
    if (!c.arrived) { c.start = t; return; }
  }
  const hl = c.helper && lounger(c.helper);
  const p = Math.min(1, (t - c.start) / c.ms), stage = STAGES.findIndex(([end]) => p < end || end === 1);
  if (stage !== c.stage) { c.stage = stage; say(c.cook, STAGES[stage][1], 1800); }
  if (stage === 1 && Math.random() < dt / 260) steam.push({ x: PAN.x + 2 + Math.random() * 6, y: PAN.y + 1, born: t, life: 1300 + Math.random() * 700, dark: c.burning });
  if (hl && !hl.path.length && Math.random() < dt / 2500) bond(c.cook, c.helper, 1);  // cooking together brings people closer
  if (stage === 1 && c.burnRoll === undefined) {  // a clumsy cook may burn the dish, or set the stove on fire
    const lvl = cookLevel(c.cook), r = Math.random(), risk = Math.max(0.03, 0.4 - lvl * 0.07) * (c.helper ? 0.6 : 1);
    c.burnRoll = r < risk; c.fireRoll = c.burnRoll && lvl <= 2 && Math.random() < 0.35;
  }
  if (c.burnRoll && p > 0.65 && !c.burning) { c.burning = true; say(c.cook, "Ça sent le brûlé…", 2200); }
  if (c.fireRoll && p > 0.75) return startFire(t);
  if (p < 1) return;
  const lvl0 = cookLevel(c.cook);
  social.cook[c.cook] = cookXp(c.cook) + (c.burnRoll ? 1 : 1 + c.recipe.lvl);
  if (c.helper) social.cook[c.helper] = cookXp(c.helper) + 1;
  if (cookLevel(c.cook) > lvl0) { toast("CUISINE", `${c.cook} passe niveau ${cookLevel(c.cook)} en cuisine !`, nextRecipe(c.cook)); floatUp(STOVE.x, STOVE.y - 34, "⭐", "#fbaa08", 3); }
  dish = { recipe: c.recipe, portions: c.recipe.portions, burnt: !!c.burnRoll, cook: c.cook, helper: c.helper, at: t };
  social.meals++;
  say(c.cook, c.burnRoll ? "Bon… c'est un peu cramé 😬" : `À table ! ${c.recipe.icon}`, 3200);
  burstLounge(TABLE.x + TABLE.w / 2, TABLE.y, c.burnRoll ? ["#555", "#333"] : ["#fbaa08", "#51cf66", "#ff6b9a"]);
  stopCooking(); saveSocial();
}
function nextRecipe(n) { const r = RECIPES.find(x => x.lvl === cookLevel(n)); return r ? `Nouvelle recette : ${r.icon} ${r.label}` : ""; }

// a kitchen fire: flames and smoke, everybody panics; the chief puts it out (pie menu), or a brave dev after a while
function startFire(t) {
  const cook = cooking.cook; stopCooking();
  fire = { start: t, cook, out: 0 };
  sfx("fail");
  toast("CUISINE", "🔥 Le feu en cuisine !", `${cook} a fait flamber la poêle. Clique sur la cuisine pour l'éteindre.`);
  for (const l of loungers.values()) if (!l.called) { say(l.name, pick(["AU FEU ! 🔥", "Quelqu'un, un extincteur !", "Ça crame !!"]), 2500); gesture(l.name, { arms: "up" }, 3000); crewAdd(l.name, { moral: -6 }); }
}
function extinguish(hero) {
  if (!fire || fire.out > 0) return;
  fire.out = performance.now() + 2600; fire.hero = hero;
  say(hero, "🧯 Je m'en occupe !", 2600); gesture(hero, { arms: "type" }, 2600);
}
function stepFire(t, dt) {
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
    for (const l of loungers.values()) if (!l.called && l.name !== hero) { bond(l.name, hero, 3); crewAdd(l.name, { moral: 4 }); }
    say(hero, "Ouf, c'est éteint.", 2500);
    toast("CUISINE", `${hero} a éteint le feu`, "Toute l'équipe lui en est reconnaissante.");
    if (hero === CHIEF_NAME && chief.lspot?.act === HELP_ACT) chief.lspot = null;
  }
}

/* ---------- eating at the dining table ---------- */
const EAT_MS = 11000;
function freeSeat() { return SEATS.find(s => ![...eaters.values()].some(e => e.seat === s)); }
function goEat(n) {
  const seat = freeSeat(); if (!dish || !dish.portions || !seat || eaters.has(n)) return false;
  dish.portions--;
  const e = { seat, recipe: dish.recipe, burnt: dish.burnt, cook: dish.cook, sat: false, start: 0 };
  eaters.set(n, e);
  const sit = () => { e.sat = true; e.start = performance.now(); };
  if (n === CHIEF_NAME) chiefTo(seat, EAT_ACT, sit); else sendMate(loungers.get(n), seat, EAT_ACT, 600000);
  if (!dish.portions) dish.leftAt = performance.now();
  return true;
}
function stepEaters(t, dt) {
  for (const [n, e] of eaters) {
    const l = lounger(n);
    if (!here(n) || (n === CHIEF_NAME ? chief.lspot?.act !== EAT_ACT : l.spot?.act !== EAT_ACT)) { eaters.delete(n); if (l) l.busy = false; continue; }
    if (!e.sat) { if (l && !l.path.length) { e.sat = true; e.start = t; } else continue; }
    crewAdd(n, { faim: e.recipe.fill * (e.burnt ? 0.5 : 1) * dt / EAT_MS, ennui: -(e.recipe.fun || 0) * dt / EAT_MS, social: 6 * dt / EAT_MS });
    if (!e.said && t - e.start > 2500) {
      e.said = true;
      const thanks = e.burnt ? pick(["C'est… croustillant.", "Bon, c'est mangeable."]) : n === e.cook ? pick(["Pas mal, je me surpasse.", "Mmh, réussi !"]) : pick([`Merci ${e.cook}, c'est délicieux !`, `${e.recipe.icon} Trop bon !`, "Le chef étoilé de l'équipe !"]);
      say(n, thanks, 3000);
      if (n !== e.cook) bond(n, e.cook, e.burnt ? -2 : 5);
    }
    // two people at the table chat a little
    for (const [o] of eaters) if (o !== n && n < o && Math.random() < dt / 9000) bond(n, o, 1);
    if (t - e.start > EAT_MS) {
      eaters.delete(n); crewAdd(n, { moral: e.burnt ? -2 : 5 });
      if (l) { l.busy = false; l.next = 0; } else { chief.lspot = { ...e.seat, act: { id: "stand", label: "se pose", pose: {} } }; chiefTo({ x: e.seat.x + (e.seat.back ? -14 : 0), y: e.seat.back ? 214 : 160 }, null); }
    }
  }
  if (dish && !dish.portions && !eaters.size) dish = null;
  if (dish && t - dish.at > 600000) { dish = null; }  // 10 min on the table: thrown away
}

/* ---------- autonomy: hungry devs eat or cook, lonely devs visit a friend ---------- */
function stepAutonomy(t) {
  if (focusMode) return;
  const free = [...loungers.values()].filter(l => idleMate(l, t));
  if (dish?.portions) {  // food on the table: the hungriest come and eat
    const hungry = free.filter(l => mate(l.name).faim < 65).sort((a, b) => mate(a.name).faim - mate(b.name).faim)[0];
    if (hungry && freeSeat()) { say(hungry.name, pick(["Ça sent bon ici !", `Une part de ${dish.recipe.label.toLowerCase()} ?`, "J'arrive, j'arrive !"])); goEat(hungry.name); return; }
  }
  if (!dish && !cooking && !fire && t > nextAuto) {  // nothing to eat: a hungry dev cooks for everyone, sometimes with a friend
    const cook = free.filter(l => mate(l.name).faim < 40).sort((a, b) => mate(a.name).faim - mate(b.name).faim)[0];
    if (cook) {
      nextAuto = t + 90000;
      const rs = RECIPES.filter(r => r.lvl <= cookLevel(cook.name) && canAfford(r.cost));
      if (!rs.length) return;
      const buddy = free.filter(l => l !== cook && rel(cook.name, l.name) >= 30).sort((a, b) => rel(cook.name, b.name) - rel(cook.name, a.name))[0];
      startCooking(cook.name, rs[rs.length - 1 - Math.floor(Math.random() * Math.min(2, rs.length))], Math.random() < 0.5 ? buddy?.name || null : null);
      return;
    }
  }
  if (t > nextVisit && free.length >= 2) {  // a visit: the loneliest picks a friend (or a new face) and goes to talk
    nextVisit = t + 14000 + Math.random() * 16000;
    const a = free.sort((p, q) => mate(p.name).social - mate(q.name).social)[0];
    if (mate(a.name).social > 75 && Math.random() < 0.6) return;
    const others = free.filter(l => l !== a && l.spot?.act !== VISIT_ACT);
    if (!others.length) return;
    const b = Math.random() < 0.7 ? others.sort((p, q) => rel(a.name, q.name) - rel(a.name, p.name))[0] : pick(others);
    b.busy = true; b.busyUntil = t + 30000;
    sendMate(a, besideOf(b), VISIT_ACT, 60000);
    a.visit = { to: b.name, verb: autoVerb(rel(a.name, b.name), mate(a.name)) };
  }
  for (const l of loungers.values()) {  // a visitor that arrived starts the conversation
    if (!l.visit || l.path.length) continue;
    const v = l.visit; l.visit = null;
    if (here(v.to)) startConvo(l.name, v.to, v.verb); else { l.busy = false; l.next = 0; }
  }
}

function stepSocial(dt, t) {
  if (chief.pendingSocial && chief.room === "lounge") { const fn = chief.pendingSocial; chief.pendingSocial = null; fn(); }
  if (chiefBusyNow()) chief.pendingSocial = null;
  stepActQueue(t); stepConvos(t); stepCooking(t, dt); stepFire(t, dt); stepEaters(t, dt); stepAutonomy(t);
  for (let i = socialFx.length - 1; i >= 0; i--) if (t - socialFx[i].born > socialFx[i].life) socialFx.splice(i, 1);
  for (let i = steam.length - 1; i >= 0; i--) if (t - steam[i].born > steam[i].life) steam.splice(i, 1);
  for (const l of loungers.values()) {  // nobody stays stuck waiting: busy only while involved in something
    if (l.called) { l.busy = false; l.visit = null; continue; }
    if (l.busy && t > (l.busyUntil || 0) && !l.visit && !eaters.has(l.name) && cooking?.cook !== l.name && cooking?.helper !== l.name
      && fire?.walker !== l.name && !convos.some(c => c.a === l.name || c.b === l.name)) l.busy = false;
  }
}

/* ---------- drawing ---------- */
function burstLounge(x, y, colors) { for (let i = 0; i < 8; i++) floatUp(x - 14 + Math.random() * 28, y - Math.random() * 6, "✦", colors[i % colors.length]); }
// wooden table with a gingham tablecloth
function tableArt(w, h) {
  return R(0, 0, w, h - 4, "#a0764e") + R(0, 0, w, 1, "#c79a6b") + R(0, h - 5, w, 1, "#6d5238") + R(2, h - 4, 2, 4, "#4a3826") + R(w - 4, h - 4, 2, 4, "#4a3826")
    + R(4, 2, w - 8, h - 8, "#f4f2ea") + R(4, 2, w - 8, 0.6, "#fff")
    + Array.from({ length: Math.floor((w - 8) / 4) }, (_, i) => R(4 + i * 4, 2, 2, h - 8, "#ff6b6b", ' fill-opacity=".35"')).join("")
    + [0, 1].map(j => R(4, 3 + j * 3, w - 8, 1.4, "#ff6b6b", ' fill-opacity=".3"')).join("");
}
function stoolArt() { return R(0, 0, 8, 2, "#8a6a4a") + R(0, 0, 8, 0.6, "#b08b63") + R(1, 2, 1, 4, "#4a3826") + R(6, 2, 1, 4, "#4a3826"); }
function plateArt(food, top, burnt, k) {  // k: 0 empty … 1 full
  const f = burnt ? "#3a2a1e" : food;
  return R(0, 1, 7, 2, "#f7f7f7") + R(1, 0.4, 5, 0.8, "#dadada") + (k > 0 ? R(1.6, 0, 3.8 * k, 1.4, f) + (burnt ? "" : R(2.4, 0, 1, 0.8, top)) : "");
}
function dishArt(food, top, burnt, n, max) {
  const f = burnt ? "#3a2a1e" : food, k = n / max;
  return R(0, 3, 14, 3, "#dadada") + R(1, 2, 12, 1.4, "#f7f7f7") + R(0, 5.4, 14, 0.6, "#9aa3b5")
    + (n ? R(2, 3 - 2.4 * k, 10, 2.4 * k + 0.4, f) + (burnt ? R(4, 2, 2, 1, "#111") : R(3.4, 3 - 2.4 * k, 1.4, 1, top) + R(7.5, 3.4 - 2.4 * k, 1.4, 1, top) + R(9.6, 3 - 2.4 * k, 1, 1, top)) : "");
}
// on the counter, over the kitchen sprite: cutting board, pan on the burner, flames, food that jumps, plates
function drawKitchenFx(t) {
  if (!kitchenStove()) return;  // no stove bought: no burner, no pan
  px(PAN.x - 1, PAN.y + 5.6, 12, 0.8, "#3a3a44");  // burner
  const c = cooking && cooking.arrived ? cooking : null, stage = c ? c.stage : -1;
  if (fire) {
    const out = fire.out > 0, k = out ? Math.max(0, (fire.out - t) / 2600) : Math.min(1, (t - fire.start) / 4000);
    for (let i = 0; i < 7; i++) {
      const h = (3 + Math.abs(Math.sin(t / 110 + i * 1.7)) * 6) * (0.4 + k);
      px(PAN.x - 2 + i * 2, PAN.y + 5 - h, 2, h, i % 2 ? "#ff6b35" : "#ffd43b");
      px(PAN.x - 1.6 + i * 2, PAN.y + 5 - h * 0.45, 1.2, h * 0.45, "#fff3b0");
    }
    if (out && fire.hero) { const p = posOf(fire.hero); if (p) for (let i = 0; i < 6; i++) px(p.x + (PAN.x + 4 - p.x) * ((t / 300 + i / 6) % 1), p.y - 14 + (PAN.y + 2 - p.y + 14) * ((t / 300 + i / 6) % 1), 1.6, 1.6, "#f7f7f7"); }
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
    if (stage === 2) for (let i = 0; i < 3; i++) art(`plate:${r.id}:${!!c.burning}:1`, PAN.x - 14 + i * 4, PAN.y + 2.4 - i * 0.4, 7, 3, () => plateArt(r.food, r.top, c.burning, 1), { outline: false });
  }
}
function drawSteam(t) {
  for (const s of steam) {
    const k = (t - s.born) / s.life; if (k < 0) continue;
    const size = (s.big ? 2.6 : 1.4) + k * (s.big ? 3 : 1.6), c = s.dark ? `rgba(40,36,48,${0.75 * (1 - k)})` : `rgba(245,245,255,${0.6 * (1 - k)})`;
    px(s.x + Math.sin(k * 6 + s.x) * 1.5 - size / 2, s.y - k * (s.big ? 26 : 14) - size / 2, size, size, c);
  }
}
// furniture of the depth-sorted list: the table (with the dish and the plates) and its stools
function socialItems(t) {
  const items = SEATS.map(s => ({ y: s.y - (s.back ? -1 : 1), draw: () => art("stool", s.x - 4, s.y - (s.back ? 4 : 5), 8, 6, stoolArt) }));
  items.push({ y: TABLE.y + 8, draw: () => {
    art(`dintable:${TABLE.w}`, TABLE.x, TABLE.y, TABLE.w, TABLE.h, () => tableArt(TABLE.w, TABLE.h));
    if (dish) art(`dish:${dish.recipe.id}:${dish.burnt}:${dish.portions}`, TABLE.x + TABLE.w / 2 - 7, TABLE.y + 1, 14, 6, () => dishArt(dish.recipe.food, dish.recipe.top, dish.burnt, dish.portions, dish.recipe.portions));
    for (const [, e] of eaters) {
      if (!e.sat) continue;
      const k = Math.max(0, 1 - (t - e.start) / EAT_MS), q = Math.ceil(k * 3) / 3;
      art(`plate:${e.recipe.id}:${e.burnt}:${q}`, e.seat.x - 3.5, e.seat.back ? TABLE.y + TABLE.h - 9 : TABLE.y + 1.5, 7, 3, () => plateArt(e.recipe.food, e.recipe.top, e.burnt, q), { outline: false });
    }
  } });
  return items;
}
// a fork going to the mouth for the people eating (drawn after them)
function drawFork(x, y, seat, t, start) {
  if (seat.back) return;
  const up = Math.floor((t - start) / 600) % 3 === 0;
  px(x + 3, y - (up ? 17 : 12), 0.8, 3, "#dfe4ee"); px(x + 2.6, y - (up ? 17.6 : 12.6), 1.6, 0.8, "#dfe4ee");
}
// over everything: progress bar of the cook, forks, floating pluses and hearts
function drawSocialOver(t) {
  drawSteam(t);
  for (const [n, e] of eaters) { const p = posOf(n); if (p && e.sat) drawFork(p.x, p.y, e.seat, t, e.start); }
  if (cooking?.arrived) {
    const p = posOf(cooking.cook), k = Math.min(1, (t - cooking.start) / cooking.ms);
    if (p) {
      const x = p.x - 12, y = p.y - 54;
      px(x - 0.6, y - 0.6, 25.2, 4.2, "#081746"); px(x, y, 24, 3, "#1a2340"); px(x, y, 24 * k, 3, cooking.burning ? "#ff9f43" : "#51cf66"); px(x, y, 24 * k, 0.8, "#ffffff55");
      text(cooking.recipe.icon, x - 5, y - 1.2, "#fff", 4.6);
    }
  }
  if (fire && !(fire.out > 0)) text("🔥 AU FEU !", PAN.x + 4, PAN.y - 16 + Math.sin(t / 120), Math.floor(t / 250) % 2 ? "#ff6b35" : "#ffd43b", 6, "center");
  for (const f of socialFx) {
    const k = (t - f.born) / f.life; if (k < 0) continue;
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    text(f.txt, f.x + Math.sin(k * 7 + f.x) * 1.2, f.y - k * 14, f.color, f.txt.length > 1 ? 5 : 7, "center");
    ctx.globalAlpha = 1;
  }
}

/* ---------- the pie menu (Sims style): a ring of actions around the clicked person or object ---------- */
const pie = document.createElement("div");
pie.id = "pie"; pie.hidden = true; pie.setAttribute("role", "menu");
document.body.append(pie);
let pieCtx = null;
function pieItems(kind, target, sub) {
  if (kind === "item") { const out = itemPieItems(target, sub); if (sub) out.push(["back", "↩", "Retour"]); return out; }  // build.js
  const items = [];
  if (kind === "mate") {
    const r = rel(CHIEF_NAME, target);
    if (!sub) {
      items.push(["v:talk", "💬", "Discuter"], ["s:amical", "😊", "Amical…"], ["s:drôle", "😂", "Drôle…"], ["s:méchant", "😠", "Méchant…"],
        ["s:cook", "🍳", "Cuisiner ensemble…"], ["s:duel", "🎮", "Défier…"], ["fiche", "📋", "Fiche"]);
      if (dish?.portions) items.splice(5, 0, ["invite", "🍽️", "Inviter à manger"]);
    } else if (sub === "cook") {
      for (const rc of RECIPES) items.push([`cook:${rc.id}`, rc.icon, `${rc.label} · ${fmtSim(rc.cost)}`, rc.lvl > Math.max(cookLevel(CHIEF_NAME), cookLevel(target)) ? `niv. ${rc.lvl}` : cooking || fire ? "cuisine occupée" : !canAfford(rc.cost) ? "pas assez de §" : ""]);
    } else if (sub === "duel") items.push(["duel:pingpong", "🏓", "Ping-pong"], ["duel:babyfoot", "⚽", "Baby-foot"], ["duel:darts", "🎯", "Fléchettes"]);
    else for (const [id, it] of Object.entries(INTERACTIONS)) {
      if (it.cat !== sub) continue;
      const lock = it.need !== undefined && r < it.need ? `${relLevel(it.need)[1].toLowerCase()} requis` : it.max !== undefined && r > it.max ? "pas fâchés" : "";
      items.push([`v:${id}`, it.icon, it.label, lock]);
    }
  } else if (kind === "kitchen") {
    if (fire) items.push(["fire", "🧯", "Éteindre le feu"]);
    else for (const rc of RECIPES) items.push([`cook:${rc.id}`, rc.icon, `${rc.label} · ${fmtSim(rc.cost)}`, rc.lvl > cookLevel(CHIEF_NAME) ? `niv. ${rc.lvl}` : cooking ? "cuisine occupée" : !canAfford(rc.cost) ? "pas assez de §" : ""]);
    items.push(["snack", "☕", "Café / encas"]);
    if (dish?.portions) items.push(["eat", "🍽️", "Manger une part"]);
  } else if (kind === "table") {
    if (dish?.portions) items.push(["eat", "🍽️", `Manger (${dish.portions} part${dish.portions > 1 ? "s" : ""})`]);
    if (dish) items.push(["clear", "🧹", "Débarrasser"]);
    if (!dish) items.push(["kitchen", "🍳", "Aller cuisiner…"]);
  }
  if (sub) items.push(["back", "↩", "Retour"]);
  return items;
}
function pieCenter(kind, target) {
  if (kind === "item") return itemPieCenter(target);
  if (kind === "mate") {
    const r = rel(CHIEF_NAME, target), [, label, col] = relLevel(r), m = mate(target);
    return `<b>${esc(target)}</b><span style="color:${col}">${esc(label)}</span><span class="rbar"><i style="left:${r < 0 ? 50 + r / 2 : 50}%;width:${Math.abs(r) / 2}%;background:${col}"></i></span><span class="muted">${esc(moodWord(m))} · 🍳 niv. ${cookLevel(target)}</span>`;
  }
  if (kind === "kitchen") return `<b>Cuisine</b><span class="muted">${esc(CHIEF_NAME)} : 🍳 niv. ${cookLevel(CHIEF_NAME)}</span><span class="muted">💰 ${fmtSim(wallet.funds)}</span>${cooking ? `<span class="muted">${esc(cooking.cook)} cuisine ${cooking.recipe.icon}</span>` : ""}`;
  return `<b>Table</b><span class="muted">${dish ? `${dish.recipe.icon} ${esc(dish.recipe.label)}${dish.burnt ? " (cramé)" : ""} · par ${esc(dish.cook)}` : "rien à manger"}</span>`;
}
function openPie(kind, target, p, sub = null) {
  pieCtx = { kind, target, p, sub, view };
  const items = pieItems(kind, target, sub), rect = cv.getBoundingClientRect();
  const cx = Math.max(150, Math.min(innerWidth - 150, rect.left + p.x / W * rect.width)), cy = Math.max(140, Math.min(innerHeight - 140, rect.top + p.y / H * rect.height));
  const rad = items.length > 6 ? 128 : 112;
  pie.style.left = `${cx}px`; pie.style.top = `${cy}px`;
  pie.innerHTML = `<div class="core">${pieCenter(kind, target)}</div>` + items.map(([id, icon, label, lock], i) => {
    const a = -Math.PI / 2 + i / items.length * Math.PI * 2;
    return `<button role="menuitem" data-pie="${esc(id)}" style="--x:${Math.round(Math.cos(a) * rad)}px;--y:${Math.round(Math.sin(a) * rad * 0.86)}px;--d:${i * 25}ms"${lock ? ` disabled title="${esc(lock)}"` : ""}><span class="ic">${icon}</span>${esc(label)}${lock ? `<small>${esc(lock)}</small>` : ""}</button>`;
  }).join("");
  pie.hidden = false;
  pie.querySelector("button:not([disabled])")?.focus({ preventScroll: true });
}
function closePie() { pie.hidden = true; pieCtx = null; }
pie.addEventListener("click", ev => {
  const b = ev.target.closest("button[data-pie]"); if (!b || !pieCtx) return;
  const { kind, target, p } = pieCtx, id = b.dataset.pie;
  if (id === "back") return openPie(kind, target, p);
  if (id.startsWith("s:")) return openPie(kind, target, p, id.slice(2));
  closePie();
  pieAction(kind, target, id);
});
document.addEventListener("pointerdown", ev => { if (!pie.hidden && !pie.contains(ev.target) && ev.target !== cv) closePie(); });
addEventListener("keydown", ev => { if (ev.key === "Escape" && !pie.hidden) { ev.stopImmediatePropagation(); ev.preventDefault(); closePie(); } }, true);
// the pie closes when its room is left, its dev is called away or its object is sold — not otherwise
setInterval(() => {
  if (!pieCtx) return;
  if (view !== pieCtx.view || (pieCtx.kind === "mate" && !here(pieCtx.target)) || (pieCtx.kind === "item" && !itemByUid(pieCtx.target))) closePie();
}, 500);

function pieAction(kind, target, id) {
  if (kind === "item") return itemPieAction(target, id);
  if (id === "fiche") { loungeSay(target, pick(["Salut chef !", "Oui ?", "Hey !"])); return openPanel(`mate:${target}`); }
  if (id.startsWith("duel:")) return challenge(target, id.slice(5));
  if (id === "clear") { dish = null; return say(CHIEF_NAME, "Hop, débarrassé."); }
  if (id === "kitchen") return openPie("kitchen", null, { x: 196, y: 60 });
  // everything else is an order for the chief: it joins his action queue (bottom-left), like in the Sims
  if (id === "snack") return enqueue("☕", "Café / encas", () => chiefDo(() => chiefLoungeAct("kitchen")));
  if (id === "eat") return enqueue("🍽️", "Manger", () => chiefDo(() => { if (!goEat(CHIEF_NAME)) say(CHIEF_NAME, "Plus de place à table…"); }));
  if (id === "fire") return enqueue("🧯", "Éteindre le feu", () => chiefDo(() => chiefTo(HELPER, HELP_ACT, () => extinguish(CHIEF_NAME))), true);
  if (id === "invite") {
    return enqueue("🍽️", `Manger avec ${target}`, () => chiefDo(() => { const l = loungers.get(target); if (!l || !dish?.portions) return; say(CHIEF_NAME, `${target}, viens manger !`); l.busy = false; if (goEat(target)) { bond(CHIEF_NAME, target, 3); if (dish?.portions) goEat(CHIEF_NAME); } }));
  }
  if (id.startsWith("cook:")) {
    const rc = RECIPES.find(r => r.id === id.slice(5)), helper = kind === "mate" ? target : null;
    return enqueue(rc.icon, `Cuisiner : ${rc.label}${helper ? ` avec ${helper}` : ""}`, () => chiefDo(() => {
      if (cooking || fire) return say(CHIEF_NAME, "La cuisine est occupée.");
      const h = helper && here(helper) ? helper : null;
      if (h) { loungers.get(h).busy = false; say(h, "Avec plaisir, je coupe les légumes !", 2500); }
      startCooking(CHIEF_NAME, rc, h);
    }));
  }
  if (id.startsWith("v:")) {
    const verb = id.slice(2), it = INTERACTIONS[verb];
    return enqueue(it.icon, `${it.label} · ${target}`, () => chiefDo(() => {
      const l = loungers.get(target); if (!l || l.called) return say(CHIEF_NAME, `${target} n'est plus là.`);
      l.busy = true; l.busyUntil = performance.now() + 30000;  // waits for the chief instead of wandering off
      chiefTo(besideOf(l), { id: "talk", label: `parle avec ${target}`, pose: {} }, () => startConvo(CHIEF_NAME, target, verb));
    }));
  }
}

/* ---------- the chief's action queue (Sims style): orders wait their turn, a click on one cancels it ---------- */
const actQueue = [];
let actSeq = 0;
function enqueue(icon, label, fn, urgent = false) {
  if (actQueue.length >= 6) return say(CHIEF_NAME, "Une chose à la fois !");
  const it = { id: ++actSeq, icon, label, fn };
  if (urgent) { actQueue.unshift(it); cancelChiefTask(); } else actQueue.push(it);
}
// the chief is free when nothing of a task is still going on: no walk, no conversation, no dish on the stove, no plate
function chiefIdle() {
  return !chief.pendingSocial && !chief.lpath.length && !chief.path.length && !convos.some(c => c.a === CHIEF_NAME || c.b === CHIEF_NAME)
    && cooking?.cook !== CHIEF_NAME && !eaters.has(CHIEF_NAME) && !(fire && fire.hero === CHIEF_NAME);
}
function stepActQueue(t) {
  if (chief.task && t > chief.task.started + 400 && chiefIdle()) chief.task = null;
  if (chief.task || !actQueue.length || chiefBusyNow()) return;
  const it = actQueue.shift();
  chief.task = { ...it, started: t };
  it.fn();
}
function cancelChiefTask() {
  if (!chief.task) return;
  if (cooking?.cook === CHIEF_NAME) { say(CHIEF_NAME, "J'arrête la cuisine."); stopCooking(); }
  if (eaters.has(CHIEF_NAME)) eaters.delete(CHIEF_NAME);
  for (let i = convos.length - 1; i >= 0; i--) if (convos[i].a === CHIEF_NAME) release(convos.splice(i, 1)[0]);
  chief.pendingSocial = null;
  if (chief.room === "lounge") { chief.lpath = []; chief.lspot = null; } else { chief.path = []; chief.at = "free"; }
  chief.task = null;
}
function cancelAction(id) {
  if (chief.task?.id === id) return cancelChiefTask();
  const i = actQueue.findIndex(a => a.id === id); if (i >= 0) actQueue.splice(i, 1);
}
// what the chief is doing right now, for the action queue: the running order, else what his state says
function chiefActivity() {
  if (chief.task) {
    const c = cooking?.cook === CHIEF_NAME && cooking.arrived ? Math.min(1, (performance.now() - cooking.start) / cooking.ms) : null;
    const e = eaters.get(CHIEF_NAME), ep = e?.sat ? Math.min(1, (performance.now() - e.start) / EAT_MS) : null;
    const cv2 = convos.find(x => x.a === CHIEF_NAME), cp = cv2 ? Math.min(1, (performance.now() - cv2.start) / CONVO_MS) : null;
    return { id: chief.task.id, icon: chief.task.icon, label: chief.task.label, progress: c ?? ep ?? cp };
  }
  const walking = chief.room === "lounge" ? chief.lpath.length : chief.path.length;
  if (walking) return { icon: "🚶", label: "Se déplace" };
  if (chief.room === "lounge") {
    const a = chief.lspot?.act?.id;
    return { kitchen: { icon: "☕", label: "Se fait un café" }, sofa: { icon: "📺", label: "Regarde la télé" }, read: { icon: "📖", label: "Lit" }, chat: { icon: "💬", label: "Papote" },
      arcade: { icon: "🕹️", label: "Joue à l'arcade" }, darts: { icon: "🎯", label: "Fléchettes" }, pingpong: { icon: "🏓", label: "Ping-pong" }, babyfoot: { icon: "⚽", label: "Baby-foot" } }[a]
      || { icon: "🛋️", label: "Se détend en salle de repos" };
  }
  return { coffee: { icon: "☕", label: "Pause café" }, console: { icon: "🎮", label: "Joue à la console" }, pc: { icon: "💻", label: "Joue sur l'ordinateur" }, podium: { icon: "👑", label: "Dirige l'équipe" } }[chief.at] || { icon: "🧍", label: "Fait un tour" };
}

/* ---------- the Sims window: relationships and cooking skill of the shown sim ---------- */
function simSocialHtml(name) {
  const rels = everyone().filter(o => o !== name).map(o => [o, rel(name, o)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  const lvl = cookLevel(name), next = COOK_XP[lvl], cur = COOK_XP[lvl - 1], k = next === undefined ? 1 : (cookXp(name) - cur) / (next - cur);
  return `<div class="social"><div class="skill"><span class="ic">🍳</span><span class="nl">CUISINE</span><span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < lvl ? "on" : i === lvl ? "part" : ""}"${i === lvl ? ` style="--k:${Math.round(k * 100)}%"` : ""}></i>`).join("")}</span><span class="lv">niv. ${lvl}</span></div>
    <div class="rels">${rels.map(([o, r]) => { const [, label, col] = relLevel(r); return `<button data-sim="${esc(o)}" title="${esc(o)} · ${esc(label)} (${r})"><span class="pf">${simPortrait(o)}</span><span class="rn">${esc(o)}<small style="color:${col}">${esc(label)}</small></span><span class="rbar"><i style="left:${r < 0 ? 50 + r / 2 : 50}%;width:${Math.abs(r) / 2}%;background:${col}"></i></span></button>`; }).join("")}</div></div>`;
}
// the side panel of a dev: the chief's relationship and the dev's best friend
function mateSocialHtml(name) {
  const r = rel(CHIEF_NAME, name), [, label, col] = relLevel(r);
  const best = TEAM.filter(o => o !== name).map(o => [o, rel(name, o)]).sort((a, b) => b[1] - a[1])[0];
  return `<p class="muted">Avec toi : <b style="color:${col}">${esc(label)}</b> (${r}) · meilleur pote : ${esc(best[0])} (${esc(relLevel(best[1])[1].toLowerCase())}) · 🍳 cuisine niv. ${cookLevel(name)}</p>`;
}
