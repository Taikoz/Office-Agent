// More computers (on a desk, their screen live like the others) and electronics to play with: a 3D printer that
// prints figurines, a smart speaker that answers, a copier (photocopies, the day's report, paper jams), a vending
// machine (snacks that get stuck), a pinball and a VR station (played like the arcade in the break room).

import "../svg/isogadgets.js";
import { hub } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { saveBuild } from "../world/build.js";
import { usersOf } from "../world/place.js";
import { jukebox, pressJukebox } from "../world/shop.js";
import { weather } from "../agents/events2.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { enqueue } from "../ui/actions.js";
import { Colored, Computer } from "./furniture.js";

const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));

/* ---------- computers ---------- */
const pc = (type, name, price, w, d, art, screens, desc, styles) =>
  new Computer({ type, cat: "electronique", name, price, room: "any", kind: "top", w, d, art, rots: 4, screens, desc: `${desc} Se pose sur un bureau ; l'écran montre le travail du dev.`, styles });
pc("pcretro", "Ordinateur rétro", 400, 20, 9, "isopcretro", [{ x: 5, y: 6.25, z: 3.4, w: 10, h: 6.6 }], "Un écran cathodique des années 80, son lecteur de disquettes, son clavier qui claque.",
  sty([["vert", "Beige, phosphore vert", "#d9d0b8", { c: "#d9d0b8", tint: "#2aff6a" }], ["ambre", "Gris, phosphore ambre", "#b8b8b0", { c: "#b8b8b0", tint: "#ffb03b" }], ["couleur", "Blanc, écran couleur", "#ece8dc", { c: "#ece8dc" }]]));
pc("laptop", "Ordinateur portable", 900, 18, 10, "isolaptop", [{ x: 2, y: 3.25, z: 1.4, w: 14, h: 8.4 }], "Fin et léger, il tient sur n'importe quel bureau.",
  sty([["alu", "Aluminium", "#c9ccd6"], ["noir", "Noir", "#2a2a30"], ["or", "Or rose", "#e8c0b0"], ["nuit", "Bleu nuit", "#2a3a5a"]]));
pc("pcaio", "Tout-en-un coloré", 1300, 18, 8, "isopcaio", [{ x: 1.6, y: 1.75, z: 5.6, w: 14.8, h: 7.2 }], "L'écran et l'ordinateur en un, clavier assorti.",
  sty([["bleu", "Bleu", "#4a8ad0"], ["vert", "Vert", "#4aa86a"], ["rose", "Rose", "#e88aa8"], ["jaune", "Jaune", "#e8c23a"], ["violet", "Violet", "#8a6ad0"], ["argent", "Argent", "#c9ccd6"]]));
pc("pcdual", "Double écran", 1600, 30, 9, "isopcdual", [{ x: 1.6, y: 1.95, z: 4, w: 11.8, h: 7.2 }, { x: 15.6, y: 1.95, z: 4, w: 11.8, h: 7.2 }], "Deux écrans et une tour : le code d'un côté, les tests de l'autre.",
  sty([["noir", "Noir", "#1c1c22"], ["blanc", "Blanc", "#e6e6ea"], ["rgb", "Noir, tour RGB", "#b46bff", { c: "#1c1c22", led: "#b46bff" }]]));
pc("pcultra", "Écran incurvé ultra-large", 1800, 30, 9, "isopcultra", [{ x: 7.4, y: 2.45, z: 4.6, w: 15.2, h: 7.8 }], "Un écran courbe qui enveloppe le regard, un mini-PC à côté.",
  sty([["noir", "Noir", "#1c1c22"], ["blanc", "Blanc", "#e6e6ea"], ["gris", "Gris sidéral", "#5a5e68"]]));

/* ---------- the chief goes to an object (in any room: world/interact.js), then does something there ---------- */
export function chiefVisit(it, fn) {
  hub.chiefUse(it, { then: () => { fn(); hub.saveBuild?.(); } });
}
// an object with its own actions: [id, icon, label, run(it), when(it)?, lock(it)?]; walk: the chief goes there first
export class Gadget extends Colored {
  pie(it) {
    const own = (this.actions || []).filter(a => !a[4] || a[4](it)).map(([id, icon, label, , , lock]) => [id, icon, label, lock?.(it) || ""]);
    return [...own, ...super.pie(it)];
  }
  perform(it, id) {
    const a = (this.actions || []).find(x => x[0] === id);
    if (!a) return super.perform(it, id);
    if (this.walk === false) a[3](it); else enqueue(a[1], a[2], () => chiefVisit(it, () => a[3](it)));
    return true;
  }
}
const now = () => Date.now();

/* ---------- the 3D printer ---------- */
const FIGURINES = ["un petit Brume", "un canard en plastique", "une coupe de champion", "un buste du chef", "une fusée", "un dragon", "un bug (pour le taper)", "un porte-clés de la boîte"];
const PRINT_MS = 40000;
new class extends Gadget {
  isoState(it) { const left = (it.printUntil || 0) - now(); return left > 0 ? { printing: true, k: 1 - left / PRINT_MS } : {}; }
}({ type: "printer3d", cat: "electronique", name: "Imprimante 3D", price: 650, room: "any", kind: "top", w: 12, d: 12, art: "isoprinter3d", rots: 4,
  desc: "Se pose sur un bureau ou une table. Clic : imprimer une figurine (§ 15 de filament, 40 s).",
  styles: sty([["noir", "Noire, filament orange", "#2a2a33", { c: "#2a2a33", f: "#ff9a3b" }], ["blanc", "Blanche, filament cyan", "#e6e6ea", { c: "#e6e6ea", f: "#3bc4ff" }], ["rouge", "Rouge, filament vert", "#b8332a", { c: "#b8332a", f: "#51cf66" }]]),
  actions: [["print", "🖨️", "Imprimer une figurine · § 15", it => {
    if (!spend(15, "Filament")) return;
    it.printUntil = now() + PRINT_MS; it.fig = FIGURINES[Math.floor(Math.random() * FIGURINES.length)]; say(CHIEF_NAME, "Allez, imprime-moi ça !"); sfx("commit");
  }, it => !((it.printUntil || 0) > now()), null]] });
setInterval(() => {  // a print done: the figurine is out
  for (const it of hub.itemsIn ? ["office", "lounge", "meeting", "terrace", "gym", "library"].flatMap(r => hub.itemsIn(r)).filter(i => i.type === "printer3d" && i.printUntil && i.printUntil <= now()) : []) {
    it.printUntil = 0; saveBuild();
    toast("IMPRIMANTE 3D 🖨️", "Impression terminée", `Tu as imprimé ${it.fig || "une figurine"}.`); sfx("achievement");
    addMoodlet(CHIEF_NAME, "print3d", "🖨️", `J'ai imprimé ${it.fig || "une figurine"}`, 4, 60);
  }
}, 1000);

/* ---------- the smart speaker ---------- */
const JOKES = ["Il y a 10 sortes de gens : ceux qui comprennent le binaire et les autres.", "Ça marche sur ma machine. Alors on livre ta machine.", "Un développeur va au supermarché : « Prends du lait, et s'il y a des œufs, prends-en 6. » Il revient avec 6 litres de lait.",
  "Pourquoi les devs confondent Halloween et Noël ? Parce que OCT 31 = DEC 25.", "Le meilleur commit : « fix ». Le deuxième meilleur : « fix 2 ».", "Il n'y a que deux choses difficiles en informatique : l'invalidation de cache, nommer les choses, et les erreurs de un."];
const WEATHER = { clear: "Pas encore de tests aujourd'hui : ciel dégagé.", sun: "Tous les tests sont verts : grand soleil ☀️", cloud: "Quelques tests rouges : nuageux ⛅", rain: "Beaucoup de tests rouges : il pleut 🌧️", storm: "Plus de rouge que de vert : orage ⛈️" };
const speak = (it, title, body) => { it.talkUntil = now() + 3500; toast(`🔊 ${title}`, body, ""); sfx("commit"); };
new class extends Gadget {
  isoState(it) { const talk = (it.talkUntil || 0) > now() || (jukebox.playing && jukebox.uid === it.uid); return { talk, k: Math.floor(now() / 300) }; }
}({ type: "speaker", cat: "electronique", name: "Enceinte connectée", price: 120, room: "any", kind: "top", w: 6, d: 6, art: "isospeaker", rots: 1, walk: false,
  desc: "Se pose sur un meuble. Elle répond : une blague, la météo des tests, la musique.",
  styles: sty([["anthracite", "Anthracite", "#3a3a46"], ["blanc", "Blanc", "#e6e6ea"], ["bleu", "Bleu", "#3a5a8a"], ["corail", "Corail", "#e8846a"]]),
  actions: [
    ["joke", "🃏", "Raconte une blague", it => { say(CHIEF_NAME, "Dis Office, une blague !"); speak(it, "ENCEINTE", JOKES[Math.floor(Math.random() * JOKES.length)]); }],
    ["weather", "🌦️", "La météo des tests", it => { say(CHIEF_NAME, "Dis Office, quel temps fait-il ?"); speak(it, "MÉTÉO DES TESTS", WEATHER[weather()] || WEATHER.clear); }],
    ["music", "🎵", "Musique ! (station suivante)", it => { const st = pressJukebox(it); speak(it, "ENCEINTE", st ? `${st} 🎶` : "Musique coupée."); }],
  ] });

/* ---------- the copier ---------- */
new class extends Gadget {
  isoState(it) { return { busy: (it.busyUntil || 0) > now(), jam: !!it.jam, k: Math.floor(now() / 120) }; }
  center(it) { return it.jam ? `<span class="muted">⚠️ Bourrage papier</span>` : ""; }
}({ type: "copier", cat: "electronique", name: "Photocopieuse", price: 1500, room: "any", w: 18, d: 14, art: "isocopier", rots: 4, spots: [{ x: 9, y: 20, face: [0, -1] }],
  desc: "Des photocopies, le rapport du jour imprimé… et parfois un bourrage papier.",
  styles: sty([["blanc", "Blanche", "#e6e6ea"], ["gris", "Grise", "#a7acb6"], ["beige", "Beige", "#d9d0b8"]]),
  actions: [
    ["copy", "📠", "Faire des photocopies", it => {
      it.busyUntil = now() + 6000; sfx("commit");
      setTimeout(() => { if (Math.random() < 0.25) { it.jam = true; it.busyUntil = 0; saveBuild(); say(CHIEF_NAME, "Bourrage papier… évidemment."); sfx("fail"); } else say(CHIEF_NAME, "Et voilà, en 30 exemplaires."); }, 6000);
    }, it => !it.jam && !((it.busyUntil || 0) > now())],
    ["report", "📄", "Imprimer le rapport du jour", it => { it.busyUntil = now() + 3000; setTimeout(() => document.getElementById("reportbtn")?.click(), 1500); }, it => !it.jam],
    ["unjam", "🔧", "Débloquer le bourrage", it => {
      it.jam = false; say(CHIEF_NAME, "Ah, une feuille coincée. Réparé !"); sfx("achievement"); crewAdd(CHIEF_NAME, { moral: 4 }); addMoodlet(CHIEF_NAME, "unjam", "🔧", "J'ai vaincu la photocopieuse", 3, 30);
    }, it => !!it.jam],
  ] });

/* ---------- the vending machine ---------- */
new class extends Gadget {
  isoState(it) { return { lit: true, stuck: !!it.stuck }; }
}({ type: "vending", cat: "electronique", name: "Distributeur de snacks", price: 1200, room: "any", w: 16, d: 12, art: "isovending", rots: 4, spots: [{ x: 8, y: 18, face: [0, -1] }],
  desc: "Snacks et sodas pour le chef. Il arrive qu'un paquet reste coincé…",
  styles: sty([["rouge", "Rouge", "#c0303a"], ["bleu", "Bleu", "#2a4a9a"], ["noir", "Noir", "#2a2a30"], ["vert", "Vert", "#2f7a4a"]]),
  actions: [
    ["snack", "🍫", "Un snack · § 3", it => {
      if (!spend(3, "Snack")) return;
      if (Math.random() < 0.2) { it.stuck = true; say(CHIEF_NAME, "Noooon, il est resté coincé !"); sfx("fail"); return; }
      crewAdd(CHIEF_NAME, { faim: 30 }); say(CHIEF_NAME, "Miam, un petit snack 🍫"); sfx("commit");
    }, it => !it.stuck],
    ["soda", "🥤", "Un soda · § 2", it => { if (!spend(2, "Soda")) return; crewAdd(CHIEF_NAME, { cafe: 15, ennui: -5 }); say(CHIEF_NAME, "Pschitt ! 🥤"); sfx("commit"); }],
    ["shake", "👊", "Secouer la machine", it => {
      if (Math.random() < 0.6) { it.stuck = false; crewAdd(CHIEF_NAME, { faim: 30 }); say(CHIEF_NAME, "Ha ! Il est tombé 🍫"); sfx("achievement"); addMoodlet(CHIEF_NAME, "vending", "👊", "J'ai eu le distributeur", 3, 30); }
      else { say(CHIEF_NAME, "Toujours coincé… encore une fois !"); sfx("fail"); }
    }, it => !!it.stuck],
  ] });

/* ---------- the pinball and the VR station: played like the arcade (the break room's activity) ---------- */
const playing = it => usersOf(it) > 0;
new class extends Gadget {
  isoState(it) { return { on: playing(it), k: Math.floor(now() / 200) }; }
}({ type: "pinball", cat: "loisirs", name: "Flipper", price: 1800, room: "any", w: 12, d: 24, art: "isopinball", rots: 4, act: "arcade", spots: [{ x: 6, y: 29, face: [0, -1] }],
  desc: "Billes, bumpers et lumières : les devs y jouent en salle de repos.", styles: sty([["bleu", "Bleu cosmos", "#1f3a8a"], ["rouge", "Rouge rock", "#8f1f2a"], ["violet", "Violet néon", "#5a2a8a"]]) });
new class extends Gadget {
  isoState(it) { return { on: playing(it), k: Math.floor(now() / 400) }; }
}({ type: "vrstation", cat: "loisirs", name: "Station VR", price: 2500, room: "any", w: 22, d: 22, art: "isovr", rots: 1, act: "arcade", walkable: true, spots: [{ x: 11, y: 12, face: [0, 1] }],
  desc: "Un tapis, deux balises, un casque : les devs s'évadent en réalité virtuelle.", styles: sty([["noir", "Noir", "#2a2a33"], ["blanc", "Blanc", "#c9ccd6"]]) });
