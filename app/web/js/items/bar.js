// The bar, built from A to Z (shop: 🍸 Bar; drawings: svg/isobar.js): counters that line up (straight, corner, the
// bartender's flap), and on them a beer tap, a cocktail station, a cash register; behind them a back bar of bottles,
// an ice machine, an under-counter fridge, kegs; high stools, neon signs. In any room: the chief pours a pint, shakes a
// cocktail, pays a round to everyone in the room, changes the keg (a full one in the room, else ordered), counts the
// till. In the break room the team comes to have a drink at the counter (activity "bar"); on the terrace, the
// afterwork happens at the counter and on the stools (rooms/built.js).

import "../svg/isobar.js";
import { hub } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { earn, spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { Activity } from "../activities/base.js";
import { Colored } from "./furniture.js";
import { Gadget } from "./gadgets.js";
import { NEON, Neon, both, neonArt, tpath, ttext } from "./walldeco.js";

const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const KEG = 30;  // pints in a keg
const CHEERS = ["Santé ! 🍻", "Merci chef ! 🍺", "À la CI verte ! 🍻", "Tchin ! 🥂", "À la prochaine MR ! 🍻"];
const COCKTAILS = ["un Mojito 🌿", "un Spritz 🍊", "une Piña colada 🍍", "un Old fashioned 🥃", "un Moscow mule 🫚", "un Espresso martini ☕", "un « Merge conflict » maison 🍸"];
const SPIRITS = ["un petit rhum ambré 🥃", "un whisky tourbé 🥃", "un fond de cognac 🥃", "une liqueur de poire 🍐", "un mezcal fumé 🌵"];

// the items of the same room
const roomItems = (it, types) => hub.itemsIn(it.room).filter(i => [].concat(types).includes(i.type));
// a drink sold: counted on the cash register of the room, if there is one (the till of the day)
export function sold(it, n = 1) {
  const day = new Date().toDateString();
  for (const r of roomItems(it, "register")) { if (r.day !== day) Object.assign(r, { day, sales: 0, cashed: 0 }); r.sales += n; }
}
// everyone here gets a drink: their mood, a toast, the till; nobody: he keeps it for the afterwork
export function round(it, what, icon) {
  const people = hub.peopleIn(it.room).filter(n => n !== CHIEF_NAME);
  if (!people.length) return say(CHIEF_NAME, `Personne pour trinquer… ${icon} je garde ça pour l'afterwork.`), false;
  for (const n of people) { crewAdd(n, { social: 10, moral: 3, ennui: -5 }); addMoodlet(n, "round", icon, `${what} offert(e) par le chef`, 5, 90); }
  say(CHIEF_NAME, `${what === "Une tournée" ? "Tournée générale" : what} pour tout le monde ! ${icon}`, 3500);
  setTimeout(() => say(pick(people), pick(CHEERS), 3000), 900);
  crewAdd(CHIEF_NAME, { social: 12, moral: 3 }); addMoodlet(CHIEF_NAME, "round", icon, "J'ai payé ma tournée", 4, 60);
  sold(it, people.length + 1); sfx("achievement");
  return people.length;
}
const drink = (hold, line, fx, mood) => it => { hub.chiefHold(hold); say(CHIEF_NAME, typeof line === "function" ? line() : line, 3500); crewAdd(CHIEF_NAME, fx); if (mood) addMoodlet(CHIEF_NAME, ...mood); sold(it); sfx("commit"); };

/* ---------- the counter: the team has a drink there ---------- */
new Activity({ id: "bar", label: "boit un verre au comptoir", icon: "🍻", task: "Boire un verre au comptoir",
  pose: { hold: "pint" }, fx: { ennui: -2, moral: 1 }, serves: ["social", "fun"], social: true,
  chief: { fx: { ennui: -10, social: 10, moral: 2 }, line: "Une petite mousse au comptoir 🍻" },
  lines: ["Elle est fraîche, celle-là 🍺", "Qui a cassé la CI ? Pas moi 🍻", "On trinque à la release !", "Patron, la même !"],
  want: { label: "Boire un verre au bar", pay: 50, pts: 50 } });
const COUNTER_STYLES = [["chene", "Chêne, plateau ardoise", "#8a6a4a", { c: "#8a6a4a", t: "#2a2a30" }], ["noyer", "Noyer, plateau zinc", "#5c3d27", { c: "#5c3d27", t: "#9aa0ad" }],
  ["noir", "Laqué noir, plateau marbre", "#1c1c22", { c: "#1c1c22", t: "#e6e2d8" }], ["vert", "Vert bistrot, plateau laiton", "#2f5d3a", { c: "#2f5d3a", t: "#c8a040" }],
  ["beton", "Béton, plateau bois", "#8d8a80", { c: "#8d8a80", t: "#a0764e" }]].map(([id, name, sw, more]) => ({ id, name, sw, ...more }));
class BarCounter extends Colored {
  pie(it) { return [...super.pie(it), ["wipe", "🧽", "Essuyer le comptoir"]]; }
  perform(it, id) {
    if (id !== "wipe") return super.perform(it, id);
    hub.enqueue("🧽", "Essuyer le comptoir", () => hub.chiefUse(it, { pose: { arms: "reach" }, then: () => { say(CHIEF_NAME, "Un coup de torchon, et ça brille ✨"); crewAdd(CHIEF_NAME, { ennui: -1 }); } }));
    return true;
  }
}
const counter = def => new BarCounter({ cat: "bar", room: "any", act: "bar", bar: true, rots: 4, styles: COUNTER_STYLES, surface: { z: 22.6, rect: [0, 0, def.w, def.d] }, ...def });
counter({ type: "barcounter", name: "Comptoir de bar", price: 600, w: 24, d: 12, art: "isobarcounter", spots: [{ x: 7, y: 17, face: [0, -1] }, { x: 17, y: 17, face: [0, -1] }],
  desc: "Un module de comptoir : panneaux moulurés, repose-pied en laiton, plateau épais ; côté barman, des étagères à verres. Aligne-les, ajoute un angle et un passage : ton bar, de A à Z. Les devs viennent y boire un verre." });
counter({ type: "barcorner", name: "Angle de comptoir", price: 380, w: 12, d: 12, art: "isobarcorner", spots: [{ x: 6, y: 17, face: [0, -1] }],
  desc: "Le module d'angle, pour faire tourner le comptoir en L ou en U." });
counter({ type: "barflap", name: "Passage de barman", price: 420, w: 12, d: 12, art: "isobarflap", act: undefined, spots: [],
  desc: "Une demi-porte battante sous un abattant : l'entrée derrière le comptoir." });

/* ---------- the beer tap: pints from its keg; empty, change the keg ---------- */
const pints = it => it.pints ?? KEG;
new class extends Gadget {
  isoState(it, t) { return { pouring: now() < (it.pourUntil || 0), empty: pints(it) <= 0, frame: Math.floor(t / 600) }; }
  center(it) { return `<span class="muted">🛢️ ${pints(it)} / ${KEG} pintes dans le fût</span>`; }
}({ type: "beertap", cat: "bar", name: "Tireuse à bière", price: 1200, room: "any", kind: "top", w: 12, d: 5, rots: 4, art: "isobeertap",
  desc: `Trois becs, une tour chromée, un égouttoir : se pose sur un comptoir. Un fût fait ${KEG} pintes ; vide, on le change (un fût plein dans la pièce, sinon § 60).`,
  styles: sty([["chrome", "Chrome", "#c9ccd6"], ["cuivre", "Cuivre", "#c87a4a"], ["noir", "Noir mat", "#2a2a30"]]),
  actions: [
    ["pint", "🍺", "Tirer une pression", it => { it.pints = pints(it) - 1; it.pourUntil = now() + 2500; setTimeout(() => drink("pint", () => pick(["Une pression bien tirée 🍺", "Deux doigts de mousse, parfait 🍺", "Ahh, bien fraîche 🍺"]), { ennui: -6, social: 3, moral: 2 }, ["pint", "🍺", "Une bonne pression", 3, 45])(it), 2500); }, null, it => pints(it) <= 0 ? "fût vide" : ""],
    ["round", "🍻", "Payer une tournée · § 25", it => { if (!hub.peopleIn(it.room).some(n => n !== CHIEF_NAME)) return round(it, "Une tournée", "🍻"); if (pints(it) <= 1 || !spend(25, "Tournée")) return; it.pourUntil = now() + 3000; it.pints = Math.max(0, pints(it) - (round(it, "Une tournée", "🍻") || 0) - 1); hub.chiefHold("pint"); }, null, it => pints(it) <= 1 ? "fût presque vide" : ""],
    ["keg", "🛢️", "Changer le fût", it => {
      const spare = roomItems(it, "keg").find(k => k.full !== false);
      if (spare) { spare.full = false; it.pints = KEG; say(CHIEF_NAME, "Fût changé, ça repart ! 🛢️"); sfx("commit"); return; }
      if (!spend(60, "Fût de bière")) return;
      it.pints = KEG; say(CHIEF_NAME, "Pas de fût d'avance : commandé et branché. 🛢️ (§ 60)"); sfx("commit");
    }, it => pints(it) < KEG, it => pints(it) >= KEG ? "fût plein" : ""],
  ] });
// a keg: the spare one, for the tap of the same room; once used, order a full one
new class extends Gadget {
  isoState(it) { return { full: it.full !== false }; }
}({ type: "keg", cat: "bar", name: "Fût de bière", price: 120, room: "any", w: 9, d: 9, rots: 1, art: "isokeg",
  desc: "Un fût de 30 pintes en inox, d'avance pour la tireuse de la pièce. Vide, on en recommande un.",
  styles: [{ id: "inox", name: "Inox", sw: "#b8bcc6" }],
  actions: [["order", "📦", "Commander un fût plein · § 60", it => { if (!spend(60, "Fût de bière")) return; it.full = true; say(CHIEF_NAME, "Un fût plein, livré ! 📦"); }, it => it.full === false],
    ["check", "🔎", "Vérifier les fûts", it => { const taps = roomItems(it, "beertap"); say(CHIEF_NAME, taps.length ? `Tireuse : ${taps.map(pints).join(", ")} pintes. Fût de réserve : ${it.full === false ? "vide" : "plein"}.` : "Il manque une tireuse sur un comptoir !", 4000); }]] });

/* ---------- on the counter: cocktails, the till ---------- */
new class extends Gadget {
  isoState(it, t) { return { shaking: now() < (it.shakeUntil || 0), frame: Math.floor(t / 150) }; }
}({ type: "cocktailstation", cat: "bar", name: "Station à cocktails", price: 650, room: "any", kind: "top", w: 12, d: 7, rots: 4, art: "isococktail",
  desc: "Shaker, doseur, citrons verts, deux bouteilles et un verre à cocktail : se pose sur un comptoir. Avec une machine à glaçons dans la pièce, c'est encore meilleur.",
  styles: [{ id: "classique", name: "Classique", sw: "#c9ccd6" }],
  actions: [
    ["cocktail", "🍹", "Préparer un cocktail", it => { it.shakeUntil = now() + 3000; const ice = roomItems(it, "icemachine").length; setTimeout(() => drink("cocktail", () => `Et voilà ${pick(COCKTAILS)}${ice ? " bien frappé 🧊" : ""}`, { ennui: -8, moral: ice ? 4 : 2 }, ["cocktail", "🍹", "Un cocktail maison", ice ? 5 : 3, 45])(it), 3000); }],
    ["serve", "🍸", "Cocktails pour tous · § 40", it => { if (!hub.peopleIn(it.room).some(n => n !== CHIEF_NAME)) return round(it, "Un cocktail", "🍸"); if (!spend(40, "Cocktails")) return; it.shakeUntil = now() + 4000; round(it, "Un cocktail", "🍸"); hub.chiefHold("cocktail"); }],
  ] });
new class extends Gadget {
  isoState(it) { return { open: now() < (it.openUntil || 0) }; }
  center(it) { const today = it.day === new Date().toDateString(); return `<span class="muted">🧾 ${today ? it.sales || 0 : 0} consommation(s) aujourd'hui</span>`; }
}({ type: "register", cat: "bar", name: "Caisse enregistreuse", price: 480, room: "any", kind: "top", w: 9, d: 7, rots: 4, art: "isoregister",
  desc: "Une caisse en laiton à l'ancienne, ding ! Elle compte les verres servis dans la pièce ; une fois par jour, on fait la caisse (§ 3 par verre).",
  styles: [{ id: "laiton", name: "Laiton", sw: "#d4a640" }],
  actions: [["till", "💰", "Faire la caisse", it => {
    it.openUntil = now() + 2500; sfx("achievement");
    const today = it.day === new Date().toDateString(), n = today ? (it.sales || 0) - (it.cashed || 0) : 0;
    if (!n) return say(CHIEF_NAME, today && it.sales ? "Déjà fait la caisse, rien de neuf. 🧾" : "Ding ! Rien dans la caisse aujourd'hui… 🧾");
    it.cashed = it.sales; earn(n * 3); toast("BAR 🍸", "Caisse du jour", `${n} verre(s) servi(s) : +§ ${n * 3}`); say(CHIEF_NAME, `Ding ! ${n} verre(s), § ${n * 3} 💰`);
  }]] });

/* ---------- behind the bar ---------- */
new Gadget({ type: "bottleshelf", cat: "bar", name: "Étagère à bouteilles", price: 1400, room: "any", w: 30, d: 8, rots: 2, art: "isobottleshelf", env: () => ({ lit: true }),
  desc: "Le fond de bar : un meuble, un miroir, trois étagères de verre chargées de bouteilles, éclairées par-dessous.",
  styles: sty([["noyer", "Noyer", "#4a2f1e"], ["chene", "Chêne", "#8a6a4a"], ["noir", "Noir", "#1c1c22"]], "w"),
  actions: [["shot", "🥃", "Se servir un petit verre", drink("cup", () => `Allez, ${pick(SPIRITS)}`, { ennui: -4, moral: 1 })],
    ["stock", "📋", "Faire l'inventaire", it => { say(CHIEF_NAME, `Gin, rhum, whisky… ${20 + (it.uid % 13)} bouteilles. Il faudra du citron. 📋`); crewAdd(CHIEF_NAME, { ennui: -2 }); }]] });
new Gadget({ type: "icemachine", cat: "bar", name: "Machine à glaçons", price: 750, room: "any", w: 12, d: 11, rots: 4, art: "isoicemachine", env: () => ({ lit: true }),
  desc: "Inox, bac à glaçons sous la porte inclinée. Les cocktails de la pièce sont servis bien frappés.",
  styles: [{ id: "inox", name: "Inox", sw: "#b8bcc6" }],
  actions: [["ice", "🧊", "Remplir le seau à glaçons", it => { say(CHIEF_NAME, "Crrr crrr… le seau est plein 🧊"); crewAdd(CHIEF_NAME, { ennui: -1 }); sfx("commit"); }]] });
new Gadget({ type: "barfridge", cat: "bar", name: "Frigo sous comptoir", price: 700, room: "any", w: 14, d: 10, rots: 4, art: "isobarfridge", env: () => ({ lit: true }),
  desc: "Deux portes vitrées, des bouteilles bien rangées, éclairées de l'intérieur : se glisse derrière le comptoir.",
  styles: sty([["noir", "Noir", "#1c1c22"], ["inox", "Inox", "#8d929c"], ["rouge", "Rouge", "#8f2b2b"]]),
  actions: [["beer", "🍾", "Une bière bien fraîche", drink("pint", "Pschitt… une blonde bien fraîche 🍾", { ennui: -5, social: 2 }, ["pint", "🍺", "Une bière fraîche", 3, 40])],
    ["soft", "🥤", "Un soda", drink("cup", "Un soda, je bosse encore 🥤", { fatigue: -3, faim: 2 })]] });

/* ---------- stools, signs ---------- */
new Colored({ type: "barstoolback", cat: "bar", name: "Tabouret haut à dossier", price: 160, room: "any", w: 9, d: 9, rots: 4, art: "isobarstoolback", chair: true, walkable: true,
  visit: "terrace", pose: { seated: true, hold: "pint" }, spots: [{ x: 4.5, y: 4.5, face: [0, -1], lift: 11 }],
  desc: "Haut, rembourré, un petit dossier et un repose-pied chromé : face au comptoir. Pendant l'afterwork, les devs s'y installent.",
  styles: sty([["bordeaux", "Cuir bordeaux", "#8f2b46"], ["noir", "Cuir noir", "#2a2a30"], ["cognac", "Cuir cognac", "#a0602a"], ["vert", "Velours vert", "#2f5d3a"], ["moutarde", "Velours moutarde", "#c8902a"]]) });
new Neon({ type: "neonbar", cat: "bar", name: "Néon BAR", price: 150, room: "any", kind: "wall", w: 30, h: 14, glow: true,
  art2d: neonArt("wallneonbar", 30, 14, both(ttext("BAR", 15, 10.4, 9), tpath("M3 12.5H27"))), desc: "💡 Lumineux · Pour qu'on trouve le comptoir les yeux fermés.", styles: NEON([["rouge", "Rouge", "#ff3b3b"]]) });
new Neon({ type: "neoncocktail", cat: "bar", name: "Néon cocktail", price: 160, room: "any", kind: "wall", w: 20, h: 22, glow: true,
  art2d: neonArt("wallneoncocktail", 20, 22, tpath("M3 3H17L10 11Z M10 11V19 M6 19.5H14 M13 3L16 0.8 M12.5 6.5A1.6 1.6 0 1 0 12.5 6.4")), desc: "💡 Lumineux · Un verre à cocktail et son olive.", styles: NEON() });
new Neon({ type: "neonopen", cat: "bar", name: "Néon OPEN", price: 140, room: "any", kind: "wall", w: 28, h: 12, glow: true,
  art2d: neonArt("wallneonopen", 28, 12, both(ttext("OPEN", 14, 8.6, 7), tpath("M1.5 1.5H26.5V10.5H1.5Z"))), desc: "💡 Lumineux · Le bar est ouvert !", styles: NEON([["rouge", "Rouge", "#ff3b3b"]]) });
