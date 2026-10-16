// The furniture of the gym and the library (rooms/extra.js): machines where the devs come to train, places where they
// come to read (social/visits.js puts them on the spots: def.visit says the room, def.pose how they stand there).
// The chief trains or reads too, with a click.

import "../svg/isosport.js";
import { hub } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { sfx } from "../sims/progress.js";
import { Gadget } from "./gadgets.js";
import { Lamp } from "./lamp.js";

const all = st => { const { id: _i, name: _n, sw: _s, ...art } = st; return art; };
const sty = (key, list) => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const busy = it => [...hub.loungers.values()].some(l => l.roomSpot?.uid === it.uid);  // someone is on it (social/visits.js)

class Machine extends Gadget {
  artState(st) { return all(st); }
  isoState(it) { return { on: busy(it), k: Math.floor(performance.now() / 160) }; }
}
// the chief trains: tired, but in a better mood
const workout = [["train", "💪", "S'entraîner", () => { crewAdd(CHIEF_NAME, { ennui: -15, fatigue: 8, moral: 5 }); addMoodlet(CHIEF_NAME, "workout", "💪", "Séance de sport", 4, 45); say(CHIEF_NAME, "Allez, encore une série ! 💪"); sfx("commit"); }]];
const sport = (type, name, price, w, d, art, spot, pose, desc, styles, more = {}) => new Machine({ type, cat: "sport", name, price, room: "any", w, d, art, rots: 4, visit: "gym", pose,
  spots: spot ? [spot] : [], walk: false, actions: workout, desc: `${desc} Les devs viennent s'y défouler.`, styles, ...more });
sport("treadmill", "Tapis de course", 1400, 14, 30, "isotreadmill", { x: 7, y: 18, face: [0, -1] }, { run: true }, "La bande défile, l'écran compte les kilomètres.",
  sty("c", [["rouge", "Rouge", "#c0303a"], ["noir", "Noir", "#2a2a30"], ["bleu", "Bleu", "#2a6fd0"]]));
sport("bike", "Vélo d'appartement", 700, 10, 18, "isobike", { x: 5, y: 14, face: [0, -1], lift: 9 }, { seated: true, pedal: true }, "Un gros volant d'inertie, une selle, un guidon.",
  sty("c", [["bleu", "Bleu", "#2a6fd0"], ["rouge", "Rouge", "#c0303a"], ["noir", "Noir", "#2a2a30"]]));
sport("bench", "Banc de musculation", 900, 14, 28, "isobench", { x: 7, y: 17, face: [0, -1], lift: 6 }, { seated: true, lift: true }, "Un banc, un rack, une barre chargée.",
  sty("p", [["rouge", "Disques rouges", "#c0303a"], ["noir", "Disques noirs", "#1c1c22"], ["vert", "Disques verts", "#2f8a4a"]]));
sport("punchbag", "Sac de frappe", 500, 14, 14, "isobag", { x: 7, y: 20, face: [0, -1] }, { box: true }, "Pour évacuer une CI rouge.",
  sty("c", [["rouge", "Rouge", "#c0303a"], ["noir", "Noir", "#2a2a30"], ["bleu", "Bleu", "#2a5a9a"]]));
sport("yogamat", "Tapis de yoga", 80, 10, 24, "isoyoga", { x: 5, y: 12, face: [0, 1], lift: 0 }, { seated: true, zen: true }, "Respirer, s'étirer, recommencer.",
  sty("c", [["violet", "Violet", "#7a4ab0"], ["vert", "Vert", "#5aa86a"], ["bleu", "Bleu", "#3a7ac0"], ["rose", "Rose", "#e88aa8"]]), { walkable: true });
sport("rower", "Rameur", 1100, 10, 32, "isorower", { x: 5, y: 17, face: [0, -1], lift: 3 }, { seated: true, row: true }, "Le siège glisse, le volant souffle.",
  sty("c", [["noir", "Noir", "#2a2a30"], ["bois", "Bois", "#8a6a4a"]]));
sport("dumbbells", "Râtelier d'haltères", 600, 22, 8, "isodumbbells", { x: 11, y: 14, face: [0, -1] }, { curl: true }, "Des paires du plus léger au plus lourd.",
  sty("c", [["noir", "Noir", "#2a2a30"], ["chrome", "Chrome", "#a7acb6"]]));
new Machine({ type: "waterfountain", cat: "sport", name: "Fontaine à eau", price: 250, room: "any", w: 8, d: 8, art: "isowater", rots: 1, walk: false, desc: "De l'eau fraîche après l'effort.",
  styles: [{ id: "bleu", name: "Bleue", sw: "#5aa9e8" }], actions: [["drink", "💧", "Boire un verre d'eau", () => { crewAdd(CHIEF_NAME, { fatigue: -4 }); say(CHIEF_NAME, "Ahh, ça fait du bien 💧"); sfx("commit"); }]] });

/* ---------- the library ---------- */
const reading = [["read", "📖", "Lire un moment", () => { crewAdd(CHIEF_NAME, { ennui: -10, fatigue: -8, moral: 3 }); addMoodlet(CHIEF_NAME, "library", "📚", "Un bon livre au calme", 4, 45); say(CHIEF_NAME, "Un chapitre, et j'y retourne 📖"); sfx("commit"); }]];
const lib = (type, name, price, w, d, art, spots, pose, desc, styles, more = {}) => new Machine({ type, cat: "bibliotheque", name, price, room: "any", w, d, art, rots: 4, visit: "library", pose,
  spots, walk: false, actions: reading, desc, styles, ...more });
lib("bookcasetall", "Grande bibliothèque", 900, 32, 8, "isobookcasetall", [{ x: 16, y: 14, face: [0, -1] }], { browse: true }, "Cinq étagères pleines et une échelle : on vient y chercher un livre.",
  sty("w", [["noyer", "Noyer", "#5c3d27"], ["chene", "Chêne", "#8a6a4a"], ["acajou", "Acajou", "#6b2f1d"]]), { rots: 2 });
lib("studytable", "Table d'étude", 800, 40, 16, "isostudytable", [{ x: 10, y: 22, face: [0, -1], lift: 3 }, { x: 30, y: 22, face: [0, -1], lift: 3 }], { seated: true, book: true },
  "Bois sombre, deux lampes de banquier vertes : idéale pour étudier (ajoute des chaises devant).", sty("w", [["noyer", "Noyer", "#5c3d27"], ["chene", "Chêne", "#8a6a4a"]]), { surface: { z: 13.4 } });
lib("readnook", "Méridienne de lecture", 1300, 30, 12, "isoreadnook", [{ x: 16, y: 6, face: [0, 1], lift: 5 }], { seated: true, book: true }, "Du velours, un coussin, et on oublie l'heure.",
  sty("c", [["vert", "Velours vert", "#2f5d4a"], ["bordeaux", "Bordeaux", "#6e1f2a"], ["bleu", "Bleu nuit", "#1d2f5a"], ["moutarde", "Moutarde", "#c89a2a"]]));
new Machine({ type: "globe", cat: "bibliotheque", name: "Globe terrestre", price: 350, room: "any", w: 10, d: 10, art: "isoglobe", rots: 1, walk: false, actions: [],
  desc: "Un globe sur pied, pour rêver de voyages.", styles: sty("w", [["chene", "Chêne", "#8a6a4a"], ["noyer", "Noyer", "#5c3d27"]]) });
// the fireplace: a light (it glows at night), a click lights or puts out the fire
new (class extends Lamp {
  artState(st) { return all(st); }
  isoState() { return { k: Math.floor(performance.now() / 180) }; }
})({ type: "fireplace", cat: "bibliotheque", name: "Cheminée", price: 2200, room: "any", w: 30, d: 8, art: "isofireplace", rots: 2, light: 10, lightR: 70, lc: "#ff9a3b",
  desc: "Un feu de bois sous un manteau de pierre : il réchauffe la pièce et l'éclaire la nuit. Clic : l'allumer, l'éteindre.",
  styles: sty("c", [["pierre", "Pierre claire", "#cfc6b8"], ["brique", "Brique", "#a8583a"], ["marbre", "Marbre noir", "#3a3a40"]]) });
