// The kitchen, Sims style: base units that line up (same depth, same worktop height) in the kitchen's colours, a
// sink and a dishwasher to use, an island, a microwave on the worktop, wall cabinets and a hood; stoves and fridges of
// several kinds (any of them makes the kitchen: build.js kitchenReady, cook: "stove" / "fridge").

import "../svg/isokitchen.js";
import { KHOOD, KOPEN, KSPICE, KWALL } from "../svg/isokitchen.js";
import { CHIEF_NAME } from "../core/core.js";
import { cooking } from "../social/kitchen.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { Appliance } from "./appliance.js";
import { Item } from "./base.js";
import { Fridge } from "./fridge.js";
import { Gadget } from "./gadgets.js";
import { Stove } from "./stove.js";

const now = () => Date.now();
const all = st => { const { id: _i, name: _n, sw: _s, ...art } = st; return art; };
// the kitchen's colours: front, worktop, handles
const FRONTS = [["blanc", "Blanc laqué, plan chêne", "#f4f4f0", "#b08860", "#8d929c"], ["chene", "Chêne, plan blanc", "#c9a77a", "#f4f4f0", "#2a2a30"],
  ["marine", "Marine, plan marbre, laiton", "#1f2f5a", "#e8e6e0", "#d4a640"], ["sauge", "Vert sauge, plan bois, laiton", "#9caf88", "#b08860", "#d4a640"],
  ["noir", "Noir mat, plan béton", "#2a2a30", "#9a9a9e", "#c9ccd6"], ["menthe", "Rétro menthe, formica", "#9ad9c0", "#f4f4f0", "#c9ccd6"],
  ["terracotta", "Terracotta, plan marbre", "#c0603e", "#e8e6e0", "#2a2a30"]].map(([id, name, f, t, h]) => ({ id, name, sw: f, f, t, h }));
const UNIT = { cat: "cuisine", room: "any", w: 14, d: 10, rots: 2, surface: { z: 16.4 }, styles: FRONTS };

/* ---------- base units ---------- */
class Unit extends Gadget { artState(st) { return all(st); } }
new Unit({ ...UNIT, type: "kbase", name: "Meuble bas à tiroirs", price: 180, art: "isokbase", desc: "Trois tiroirs, un plan de travail : ils s'alignent pour faire une cuisine." });
new Unit({ ...UNIT, type: "kdoor", name: "Meuble bas à portes", price: 160, art: "isokdoor", desc: "Deux portes, un plan de travail ; même hauteur que les autres meubles." });
new class extends Unit {
  isoState(it) { return { on: (it.waterUntil || 0) > now() }; }
}({ ...UNIT, type: "ksink", name: "Meuble évier", price: 450, art: "isoksink", act: "kitchen", spots: [{ x: 7, y: 18, face: [0, -1] }],
  desc: "Une cuve en inox, un robinet col de cygne. Clic : faire la vaisselle.",
  actions: [["dishes", "🧽", "Faire la vaisselle", it => {
    it.waterUntil = now() + 5000; say(CHIEF_NAME, "Allez, la vaisselle… 🧽"); sfx("commit");
    setTimeout(() => { addMoodlet(CHIEF_NAME, "dishes", "✨", "Cuisine propre", 3, 60); crewAdd(CHIEF_NAME, { moral: 3 }); say(CHIEF_NAME, "Nickel !"); }, 5000);
  }]] });
new class extends Unit {
  isoState(it) { return { on: (it.runUntil || 0) > now(), k: Math.floor(now() / 500) }; }
}({ ...UNIT, type: "kdish", name: "Lave-vaisselle", price: 550, art: "isokdish", spots: [{ x: 7, y: 18, face: [0, -1] }], desc: "Encastré sous le plan. Clic : le lancer (30 s).",
  actions: [["run", "🫧", "Lancer le lave-vaisselle", it => {
    it.runUntil = now() + 30000; say(CHIEF_NAME, "Et hop, le lave-vaisselle tourne."); sfx("commit");
    setTimeout(() => { toast("LAVE-VAISSELLE 🫧", "Vaisselle propre", "Tout brille."); addMoodlet(CHIEF_NAME, "dishwasher", "🫧", "Vaisselle faite sans effort", 2, 60); }, 30000);
  }, it => !((it.runUntil || 0) > now())]] });
new Unit({ ...UNIT, type: "kisland", name: "Îlot central", price: 900, w: 28, d: 14, art: "isokisland", desc: "Tiroirs côté cuisine, plan débordant côté salle : on y pose le micro-ondes ou on y mange debout." });

/* ---------- the microwave (on a worktop) ---------- */
new class extends Gadget {
  isoState(it) { return { on: (it.heatUntil || 0) > now(), k: Math.floor(now() / 250) }; }
}({ type: "microwave", cat: "cuisine", name: "Micro-ondes", price: 220, room: "any", kind: "top", w: 10, d: 7, rots: 2, art: "isomicrowave",
  desc: "Se pose sur un meuble de cuisine. Clic : réchauffer un plat.", styles: Appliance.styles({ blanc: "Blanc", inox: "Inox", noir: "Noir", rouge: "Rétro rouge" }),
  actions: [["heat", "♨️", "Réchauffer un plat · § 4", it => {
    if (!spend(4, "Plat à réchauffer")) return;
    it.heatUntil = now() + 6000; sfx("commit");
    setTimeout(() => { crewAdd(CHIEF_NAME, { faim: 25 }); say(CHIEF_NAME, "Ding ! 🍲"); sfx("achievement"); }, 6000);
  }, it => !((it.heatUntil || 0) > now())]] });

/* ---------- stoves ---------- */
class FrontStove extends Stove { artState(st) { return all(st); } }
const stoveSpot = w => [{ x: w / 2, y: 18, face: [0, -1] }];
new Stove({ type: "stoveretro", cat: "cuisine", cook: "stove", name: "Cuisinière rétro émaillée", price: 650, room: "any", w: 16, d: 10, rots: 2, art: "isostoveretro", spots: stoveSpot(16),
  desc: "Émail, chrome et une horloge au dosseret, comme chez grand-mère. Pour cuisiner (avec un frigo).", styles: Appliance.styles({ creme: "Crème", rouge: "Rouge", menthe: "Menthe", bleu: "Bleu", noir: "Noire" }) });
new FrontStove({ type: "stoveinduction", cat: "cuisine", cook: "stove", name: "Plaque induction + four", price: 900, room: "any", w: 14, d: 10, rots: 2, art: "isostoveinduction", spots: stoveSpot(14), surface: { z: 16.4 },
  desc: "Vitrocéramique noire sur un four encastré, dans un meuble aux couleurs de la cuisine.", styles: FRONTS });
new Stove({ type: "stovepro", cat: "cuisine", cook: "stove", name: "Piano de cuisson pro", price: 2400, room: "any", w: 24, d: 10, rots: 2, art: "isostovepro", spots: stoveSpot(24),
  desc: "Six feux sur fonte, deux fours : la cuisine d'un chef étoilé.", styles: Appliance.styles({ inox: "Inox", noir: "Noir", rouge: "Rouge", bleu: "Bleu", creme: "Crème" }) });

/* ---------- fridges ---------- */
class FrontFridge extends Fridge { artState(st) { return all(st); } }
new Fridge({ type: "fridgeus", cat: "cuisine", cook: "fridge", name: "Frigo américain", price: 1500, room: "any", w: 22, d: 12, rots: 2, art: "isofridgeus", spots: [{ x: 11, y: 20, face: [0, -1] }],
  desc: "Deux portes côte à côte, glaçons et eau fraîche.", styles: Appliance.styles({ inox: "Inox", noir: "Noir", blanc: "Blanc" }) });
new Fridge({ type: "fridgeretro", cat: "cuisine", cook: "fridge", name: "Frigo rétro", price: 800, room: "any", w: 16, d: 10, rots: 2, art: "isofridgeretro", spots: [{ x: 8, y: 18, face: [0, -1] }],
  desc: "Le dessus arrondi des années 50, une grosse poignée chromée.", styles: Appliance.styles({ creme: "Crème", rouge: "Rouge", menthe: "Menthe", bleu: "Bleu", jaune: "Jaune" }) });
new Fridge({ type: "fridgemini", cat: "cuisine", cook: "fridge", name: "Mini-frigo", price: 150, room: "any", w: 10, d: 9, rots: 2, art: "isofridgemini", spots: [{ x: 5, y: 16, face: [0, -1] }],
  desc: "Petit et pas cher : quelques boissons et de quoi dépanner.", styles: Appliance.styles({ blanc: "Blanc", noir: "Noir", rouge: "Rouge" }) });
new FrontFridge({ type: "fridgebuilt", cat: "cuisine", cook: "fridge", name: "Frigo encastré", price: 1100, room: "any", w: 14, d: 10, rots: 2, art: "isofridgebuilt", spots: [{ x: 7, y: 18, face: [0, -1] }],
  desc: "Caché dans une colonne aux façades de la cuisine.", styles: FRONTS });

/* ---------- on the wall, over the worktop ---------- */
class WallUnit extends Item { artState(st) { return all(st); } }
new WallUnit({ type: "kwallcab", cat: "cuisine", name: "Placard haut", price: 140, room: "any", kind: "wall", w: 14, h: 18, hang: 9, art2d: KWALL, styles: FRONTS, desc: "Au-dessus du plan de travail, assorti aux meubles bas." });
new WallUnit({ type: "kwallopen", cat: "cuisine", name: "Placard haut ouvert", price: 120, room: "any", kind: "wall", w: 14, h: 18, hang: 9, art2d: KOPEN, styles: FRONTS, desc: "Bols, verres et bocaux à portée de main." });
new class extends WallUnit {
  state() { return !!cooking; }  // its light on while someone cooks
}({ type: "khood", cat: "cuisine", name: "Hotte", price: 380, room: "any", kind: "wall", w: 14, h: 22, hang: 2, art2d: KHOOD, desc: "Au-dessus de la gazinière ; sa lumière s'allume pendant la cuisson.",
  styles: [["inox", "Inox", "#c9ccd6"], ["noir", "Noire", "#2a2a30"], ["blanc", "Blanche", "#f0efe9"], ["cuivre", "Cuivre", "#b8683a"]].map(([id, name, c]) => ({ id, name, sw: c, c })) });
new WallUnit({ type: "kwallspice", cat: "cuisine", name: "Étagère à épices", price: 60, room: "any", kind: "wall", w: 18, h: 12, hang: 14, art2d: KSPICE, desc: "Bocaux et pots, en bois.",
  styles: [["chene", "Chêne", "#a8784a"], ["noyer", "Noyer", "#5c3d27"], ["blanc", "Blanc", "#f0efe9"]].map(([id, name, w]) => ({ id, name, sw: w, w })) });

