// Every object can be used, in every room: the chief walks there (from any room: office, break room, meeting room,
// terrace, gym, library), settles where it fits (on its seat, in front of it) and does it. An object with its own
// actions keeps them (items/*.js); the others get theirs here: by type, else by family (seats, tables, storage,
// kitchen units, screens, clocks, windows, frames, rugs…). One-off effects on the chief's needs, at most once per
// object every few minutes (a click never farms).

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief, ents } from "../core/core.js";
import { chiefGo, chiefToLounge, chiefToOffice, chiefToRoom } from "./chief.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { sfx } from "../sims/progress.js";
import { clockNow } from "../sims/days.js";
import { enqueue } from "../ui/actions.js";

const pick = list => list[Math.floor(Math.random() * list.length)];
const COOLDOWN = 5 * 60_000;
const lastFx = new Map();  // uid → when its effect was last given

/* ---------- the chief goes to an object, in any room, and settles there ---------- */
// where: a free seat of the object (sit) or in front of it; face: toward the object
function placeAt(it, sit) {
  const spots = hub.spotsOf(it).filter(s => ![...hub.loungers.values()].some(l => l.spot?.key === s.key && !l.path.length));
  if (sit && spots.length) return { ...spots[0] };
  const [x0, y0, x1, y1] = hub.footOf(it), f = hub.frontOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (sit) return { x: cx, y: cy, face: [0, 1], lift: sit === true ? 0 : sit };  // a stool, a cushion: on it
  return { ...f, face: [Math.sign(Math.round(cx - f.x)), Math.sign(Math.round(cy - f.y))] };
}
// how: { sit (true, or a seat height for an object without seats), pose: { seated, arms, hold }, then(it) }
export function chiefUse(it, how = {}) {
  if (hub.chiefBusyNow()) return say(CHIEF_NAME, "Pas maintenant, l'équipe a besoin de moi !");
  const sp = placeAt(it, how.sit), pose = { seated: !!how.sit, ...(how.pose || {}) };
  const arrive = () => how.then?.(it);
  if (it.room === "office") {
    const go = () => { chiefGo({ x: sp.x, y: sp.y }, c => { c.at = "use"; c.opose = { ...pose, dir: sp.face, lift: sp.lift || 0 }; arrive(); }); chief.at = "use"; chief.opose = null; };
    if (chief.room !== "office") { chief.pendingOffice = go; chiefToOffice(); } else go();
    return;
  }
  const go = () => {
    const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
    chief.lspot = { ...sp, uid: it.uid, key: `use:${sp.key || it.uid}`, act: { id: `use:${it.type}`, pose }, back: !!sp.face && sp.face[1] < 0 };
    chief.lpath = [...via, { x: sp.x, y: sp.y, on: arrive }];
  };
  if (chief.room === it.room) return go();
  chief.roomNext = { room: it.room, fn: go };  // run once he is in its room (world/chief.js stepChief)
  if (it.room === "lounge") chiefToLounge(); else chiefToRoom(it.room);
}
// what he holds where he is now (a pint, a cocktail…), until he moves on
export function chiefHold(hold) {
  if (chief.room === "office") { if (chief.at === "use") chief.opose = { ...(chief.opose || {}), hold }; return; }
  if (chief.lspot?.act) chief.lspot = { ...chief.lspot, act: { ...chief.lspot.act, pose: { ...chief.lspot.act.pose, hold } } };
}
// who is in a room now: the devs settled there (break room, built rooms), or at their desk (office)
export function peopleIn(room) {
  if (room === "office") return [...ents.values()].filter(e => e.who && !e.leaving).map(e => e.who);
  return [...hub.loungers.values()].filter(l => (room === "lounge" ? !l.partyRoom : l.partyRoom === room) && !l.path.length).map(l => l.name);
}
// the effect of an action: a line, the needs, a mood (once per object every COOLDOWN), a sound
function feel(it, line, fx, mood) {
  say(CHIEF_NAME, typeof line === "function" ? line(it) : line, 3500);
  if (Date.now() - (lastFx.get(it.uid) || 0) < COOLDOWN) return;
  lastFx.set(it.uid, Date.now());
  if (fx) crewAdd(CHIEF_NAME, fx);
  if (mood) addMoodlet(CHIEF_NAME, ...mood);
  sfx("commit");
}

/* ---------- what each object offers ---------- */
const hourLine = () => { const d = clockNow(), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0"); return `Déjà ${h} h ${m}${h >= 18 ? "… l'afterwork approche 🍻" : h < 10 ? ", un café d'abord ☕" : " : on avance !"}`; };
const skyLine = () => ({ rain: "Il pleut des cordes… 🌧️ Parfait pour coder.", storm: "Quel orage ! ⛈️", snow: "Il neige ! ❄️", cloudy: "Un peu gris, mais ça va. ☁️" }[hub.weather?.()] || "Grand ciel bleu ☀️ On mangera dehors !");
const SAY = {
  look: ["Joli, ça.", "Bon choix de déco, chef.", "On s'y sent bien, ici.", "Ça a de la gueule."],
  tidy: ["Un peu de rangement, ça fait du bien.", "Voilà, c'est plus net.", "Rangé ! Marie Kondo serait fière."],
  wipe: ["Un coup d'éponge, et ça brille ✨", "Plan de travail nickel."],
  screen: ["Hmm, intéressant…", "Les tests passent ? Parfait.", "Je jette un œil, c'est tout."],
};
// [id, icon, label, how] by type: how = { sit, pose, line, fx, mood }
const BY_TYPE = {
  grill: [["bbq", "🍖", "Lancer un barbecue", { pose: { arms: "reach" }, line: "Saucisses, merguez, brochettes… à table dans 10 min ! 🍖", fx: { faim: 12, social: 6 }, mood: ["bbq", "🍖", "Barbecue sur la terrasse", 5, 60] }]],
  firepit: [["warm", "🔥", "Se réchauffer au brasero", { pose: { arms: "reach" }, line: "Ah, ça réchauffe les mains 🔥", fx: { fatigue: -6, moral: 2 } }]],
  parasol: [["shade", "⛱️", "Se mettre à l'ombre", { line: "Un peu d'ombre, enfin. ⛱️", fx: { fatigue: -3 } }]],
  pergola: [["shade", "🌿", "Se poser sous la pergola", { line: "On est bien, sous la vigne. 🌿", fx: { fatigue: -4, ennui: -2 } }]],
  outsofa: [["lounge", "🛋️", "Se prélasser dehors", { sit: 5, line: "Le canapé au soleil… le vrai luxe. 😌", fx: { fatigue: -8, ennui: -4 } }]],
  chaise: [["tan", "☀️", "Bronzer un peu", { sit: 3, line: "Cinq minutes au soleil ☀️", fx: { fatigue: -6, moral: 3 }, mood: ["tan", "☀️", "Un rayon de soleil", 3, 30] }]],
  picnic: [["picnic", "🥪", "Pique-niquer", { sit: true, line: "Sandwich au soleil 🥪", fx: { faim: 10, social: 4 } }]],
  hottub: [["bath", "🫧", "Se baigner dans le jacuzzi", { sit: true, line: "Ahhh… les bulles 🫧", fx: { fatigue: -15, ennui: -6 }, mood: ["hottub", "🫧", "Détendu dans le jacuzzi", 6, 60] }]],
  chalkboard: [["menu", "🖍️", "Écrire le menu du jour", { pose: { arms: "reach" }, line: () => `Au menu : ${pick(["burger maison", "salade César", "pizza quatre fromages", "tartare de saumon", "risotto aux cèpes"])} 🖍️`, fx: { ennui: -3 } }]],
  fountain: [["wish", "🪙", "Faire un vœu", { line: () => pick(["🪙 …que la CI reste verte.", "🪙 …zéro bug en prod cette semaine.", "🪙 …une review LGTM du premier coup."]), fx: { moral: 3 } }]],
  birdcage: [["whistle", "🐦", "Siffler avec le canari", { line: "Fuiii fuiii 🐦 — il répond !", fx: { ennui: -4, moral: 1 } }]],
  globe: [["spin", "🌍", "Faire tourner le globe", { pose: { arms: "reach" }, line: () => `Et le doigt s'arrête sur… ${pick(["le Japon 🇯🇵", "le Brésil 🇧🇷", "l'Islande 🇮🇸", "le Canada 🇨🇦", "la Nouvelle-Zélande 🇳🇿"])} ! Prochain offsite ?`, fx: { ennui: -3 } }]],
  screen: [["hide", "🙈", "Se cacher derrière le paravent", { line: "Chut… je ne suis pas là. 🙈", fx: { ennui: -2 } }]],
  coatrack: [["coat", "🧥", "Accrocher sa veste", { line: "Hop, la veste au porte-manteau 🧥", fx: { fatigue: -1 } }]],
  tvunit: [["tv", "📺", "Regarder la télé", { line: () => pick(["Encore une rediff… 📺", "Le bulletin météo 📺", "Un documentaire sur les pieuvres 🐙"]), fx: { ennui: -5, fatigue: -2 } }]],
  walltv: [["tv", "📺", "Regarder la télé", { line: () => pick(["Les infos tech du jour 📺", "Un match en direct ⚽", "Un tuto Kubernetes, passionnant 📺"]), fx: { ennui: -5 } }]],
  dining: [["sit", "🍽️", "S'attabler", { sit: true, line: "On s'attable 🍽️", fx: { fatigue: -3, social: 2 } }]],
  mmxcabinet: [["look", "🗄️", "Feuilleter les fiches MMX", { line: "Tout ce que l'équipe a appris est là. 🗄️", fx: { ennui: -2 } }]],
};
// by family, when the type has nothing of its own
function byFamily(def) {
  const t = def.type;
  if (def.chair || def.cat === "chaises" || def.cat === "poufs") return [["sit", "🪑", "S'asseoir", { sit: def.spots ? true : t === "barstool" ? 10 : t === "stool" ? 6 : 2, line: "Je m'assois deux minutes.", fx: { fatigue: -4 } }]];
  if (def.cat === "fauteuils" || def.cat === "canapes") return [["sit", "🛋️", "S'installer", { sit: def.spots ? true : 5, line: "Ah, ça fait du bien de s'asseoir. 😌", fx: { fatigue: -6 } }]];
  if (def.kind === "rug") return [["vacuum", "🧹", "Passer l'aspirateur", { pose: { arms: "reach" }, line: "Vrrrrr… 🧹 Propre !", fx: { ennui: -2 } }]];
  if (def.cat === "horloges" || t === "wallclock") return [["time", "🕐", "Regarder l'heure", { line: hourLine }]];
  if (def.cat === "fenetres" || t === "window") return [["out", "🪟", "Regarder dehors", { line: skyLine, fx: { ennui: -2 } }]];
  if (def.cat === "cadres" || def.cat === "tableaux" || def.cat === "deco") return [["look", "👀", "Admirer", { line: () => pick(SAY.look), fx: { moral: 1 } }]];
  if (def.cat === "rangement" || def.cat === "bibliotheque") return [["tidy", "🗄️", "Ranger un peu", { pose: { arms: "reach" }, line: () => pick(SAY.tidy), fx: { ennui: -2, moral: 1 } }]];
  if (def.cat === "cuisine") return [["wipe", "🧽", "Essuyer", { pose: { arms: "reach" }, line: () => pick(SAY.wipe), fx: { ennui: -1 } }]];
  if (def.cat === "electronique") return [["screen", "⌨️", "Jeter un œil", { line: () => pick(SAY.screen) }]];
  if (def.surface) return [["break", "☕", "Faire une pause ici", { pose: { hold: "cup" }, line: "Une petite pause, accoudé là. ☕", fx: { fatigue: -2 } }]];
  return [["look", "👀", "Regarder de plus près", { line: () => pick(SAY.look) }]];
}
const actionsOf = def => BY_TYPE[def.type] || byFamily(def);
// the pie: what the object offers when it has nothing of its own; [id, icon, label] with ids "x:…"
export function interactPie(it, def, own) {
  if (own.length || ["coffee", "console", "podium", "conftable"].includes(def.role)) return [];  // already its own (world/build.js)
  return actionsOf(def).map(([id, icon, label]) => [`x:${id}`, icon, label]);
}
export function interactRun(it, def, id) {
  const a = actionsOf(def).find(x => `x:${x[0]}` === id); if (!a) return false;
  const [, icon, label, how] = a;
  enqueue(icon, label, () => chiefUse(it, { sit: how.sit, pose: how.pose, then: () => feel(it, how.line, how.fx, how.mood) }));
  return true;
}

provide({ get chiefHold() { return chiefHold; }, get peopleIn() { return peopleIn; }, get chiefUse() { return chiefUse; }, get interactPie() { return interactPie; }, get interactRun() { return interactRun; } });
