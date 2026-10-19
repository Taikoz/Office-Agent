// More of the catalog (their drawings: svg/isofurni3.js): storage, small tables, plants that need watering, for the
// terrace a picnic table, a hammock to read in and a hot tub; then music (a piano, a guitar: the chief plays), a pool
// table, a chess table, a folding screen, a coat rack, a drinks fridge and a popcorn cart (the chief helps himself), a
// bonsai, a vegetable bed, a garden swing, a birdcage.

import "../svg/isofurni3.js";
import { hub } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { pantry, savePantry } from "../social/kitchen.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { sfx } from "../sims/progress.js";
import { Colored } from "./furniture.js";
import { Gadget } from "./gadgets.js";
import { Plant } from "./plant.js";

const sty = (key, list) => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const WOODS = sty("w", [["chene", "Chêne", "#8a6a4a"], ["noyer", "Noyer", "#5c3d27"], ["blanc", "Laqué blanc", "#e6e2d8"], ["noir", "Laqué noir", "#3a3a44"]]);
const add = def => new Colored({ room: "any", ...def });

/* ---------- storage ---------- */
add({ type: "lockers", cat: "rangement", name: "Casiers métalliques", price: 600, w: 30, d: 9, rots: 2, art: "isolockers", desc: "Trois casiers à cadenas, comme au vestiaire : chacun y range ses affaires.",
  styles: sty("c", [["gris", "Gris", "#7a8290"], ["bleu", "Bleu", "#2f5d9a"], ["vert", "Vert", "#3e7a5a"], ["rouge", "Rouge", "#a8323a"], ["jaune", "Jaune", "#d4a73a"]]) });
add({ type: "dresser", cat: "rangement", name: "Commode", price: 450, w: 24, d: 10, rots: 2, art: "isodresser", surface: { z: 19.2 }, desc: "Quatre tiroirs à boutons de laiton ; on pose ce qu'on veut dessus.", styles: WOODS });
add({ type: "cubeshelf", cat: "rangement", name: "Étagère à cases", price: 280, w: 28, d: 8, rots: 2, art: "isocubeshelf", desc: "Seize cases : des bacs en tissu, des livres, une petite plante.",
  styles: sty("w", [["blanc", "Blanc", "#f0ece4"], ["chene", "Chêne", "#b08a5a"], ["noir", "Noir", "#3a3a44"]]) });

/* ---------- small tables ---------- */
add({ type: "bistrotable", cat: "tables", name: "Table bistrot", price: 160, w: 12, d: 12, rots: 1, art: "isobistrotable", surface: { z: 14.6 }, desc: "Un plateau rond sur un pied en fonte, comme en terrasse de café.",
  styles: sty("c", [["marbre", "Marbre", "#ece8e0"], ["noir", "Marbre noir", "#3a3a44"], ["bois", "Bois", "#a0764e"], ["vert", "Vert bistrot", "#2f5d3a"]]) });
add({ type: "hightable", cat: "tables", name: "Mange-debout", price: 220, w: 12, d: 12, rots: 1, art: "isohightable", surface: { z: 22.8 }, desc: "Une table haute pour le café debout ou le stand-up.",
  styles: sty("c", [["noir", "Noir", "#2a2a33"], ["blanc", "Blanc", "#ece8e0"], ["bois", "Bois", "#a0764e"]]) });

/* ---------- plants (a click waters them; they may get thirsty) ---------- */
new Plant({ type: "monstera", cat: "plantes", name: "Monstera", price: 180, room: "any", w: 14, d: 14, art: "isomonstera", plant: true, desc: "De grandes feuilles découpées dans un pot en céramique. Clic : l'arroser.",
  styles: [{ id: "verte", name: "Verte", sw: "#3f9e4f" }] });
new Plant({ type: "cacti", cat: "plantes", name: "Trio de cactus", price: 90, room: "any", w: 16, d: 8, rots: 2, art: "isocacti", plant: true, desc: "Trois cactus dans une jardinière, l'un est en fleur. Presque pas d'eau.",
  styles: [{ id: "vert", name: "Vert", sw: "#4a8a4a" }] });
new Plant({ type: "bamboo", cat: "plantes", name: "Bambou en bac", price: 260, room: "any", w: 24, d: 8, rots: 2, art: "isobamboo", plant: true, desc: "Une haie de bambous : un paravent vivant. Clic : l'arroser.",
  styles: [{ id: "vert", name: "Vert", sw: "#7aa84a" }] });

/* ---------- outdoors ---------- */
add({ type: "picnic", cat: "exterieur", name: "Table de pique-nique", price: 500, w: 40, d: 26, rots: 2, art: "isopicnic", surface: { z: 14.2, rect: [0, 8, 40, 10] }, visit: "terrace", pose: { seated: true },
  spots: [[12, 3.5, 1], [28, 3.5, 1], [12, 22.5, -1], [28, 22.5, -1]].map(([x, y, f]) => ({ x, y, face: [0, f], lift: 4 })),
  desc: "Une table et ses deux bancs en bois : le déjeuner au soleil. Sur la terrasse, les devs viennent s'y asseoir.",
  styles: sty("w", [["teck", "Teck", "#a0764e"], ["gris", "Bois grisé", "#8d8a80"], ["rouge", "Rouge", "#a8423a"]]) });
add({ type: "hammock", cat: "exterieur", act: "read", name: "Hamac", price: 700, w: 40, d: 14, rots: 2, art: "isohammock", spots: [{ x: 20, y: 7, face: [0, 1], lift: 7 }],
  desc: "Une toile rayée sur son cadre en bois : on y lit en se balançant.", styles: sty("c", [["jaune", "Jaune", "#e8c23a"], ["bleu", "Bleu", "#3a7ac0"], ["rouge", "Rouge", "#c0303a"], ["vert", "Vert", "#5aa86a"]]) });
add({ type: "hottub", cat: "exterieur", name: "Jacuzzi", price: 4000, w: 32, d: 32, rots: 1, art: "isohottub", env: e => ({ lit: e.lit, frame: e.still ? 0 : Math.floor(e.t / 400) % 3 }),
  visit: "terrace", pose: { seated: true }, spots: [[16, 2, [0, 1]], [2, 16, [1, 0]], [30, 16, [-1, 0]], [16, 30, [0, -1]]].map(([x, y, face]) => ({ x, y, face, lift: 8 })),
  desc: "Un bain à remous en bois : des bulles, de la vapeur le soir, l'eau éclairée de l'intérieur. Sur la terrasse, les devs viennent s'y détendre.", styles: sty("w", [["teck", "Teck", "#8a6a4a"], ["gris", "Gris", "#6a6a72"], ["noir", "Noir", "#2a2a30"]]) });

/* ---------- the second batch ---------- */
const chiefSays = (line, d, mood) => () => { crewAdd(CHIEF_NAME, d); if (mood) addMoodlet(CHIEF_NAME, ...mood); say(CHIEF_NAME, line); sfx("commit"); };
const gadget = def => new Gadget({ room: "any", ...def });
const TUNES = ["♪ La lettre à Élise, version CI verte", "♪ Un petit ragtime entre deux MR", "♪ Gymnopédie n° 1, tout doux", "♪ Le thème de Tetris, évidemment"];
gadget({ type: "piano", cat: "loisirs", act: "piano", name: "Piano droit", price: 2400, w: 30, d: 18, rots: 2, art: "isopiano", spots: [{ x: 15, y: 16, face: [0, -1], lift: 4 }],
  desc: "Un piano droit, son pupitre, ses pédales et son tabouret. En salle de repos, les devs viennent y jouer ; clic : jouer un morceau.",
  styles: sty("w", [["noir", "Laqué noir", "#1c1c22"], ["noyer", "Noyer", "#5c3d27"], ["blanc", "Laqué blanc", "#e6e2d8"]]),
  actions: [["play", "🎹", "Jouer un morceau", it => chiefSays(TUNES[(it.uid + Math.floor(Date.now() / 60000)) % TUNES.length], { ennui: -12, moral: 4 }, ["piano", "🎹", "Un peu de musique", 3, 30])(), it => it.room !== "lounge"]] });  // in the break room: the activity
gadget({ type: "guitar", cat: "loisirs", name: "Guitare sur pied", price: 350, w: 8, d: 8, rots: 1, art: "isoguitar", desc: "Une guitare folk sur son support. Clic : gratter quelques accords.",
  styles: sty("c", [["naturel", "Naturel", "#c88a4a"], ["sunburst", "Sunburst", "#a8421f"], ["noir", "Noire", "#2a2a30"]]),
  actions: [["play", "🎸", "Gratter quelques accords", chiefSays("♪ Wonderwall… non, je rigole.", { ennui: -8, moral: 2 })]] });
add({ type: "billiard", cat: "loisirs", act: "billiard", name: "Billard", price: 3200, w: 60, d: 32, rots: 2, art: "isobilliard", spots: [{ x: -6, y: 16, face: [1, 0] }, { x: 66, y: 16, face: [-1, 0] }],
  desc: "Un billard en bois massif, le triangle en place. En salle de repos, les devs y font des parties à deux.",
  styles: sty("c", [["vert", "Tapis vert", "#2f7a4a"], ["bleu", "Tapis bleu", "#2a5a9a"], ["rouge", "Tapis bordeaux", "#7a2430"], ["gris", "Tapis gris", "#5a5f6a"]]) });
add({ type: "chesstable", cat: "tables", act: "chess", name: "Table d'échecs", price: 420, w: 14, d: 30, rots: 2, art: "isochesstable", spots: [{ x: 7, y: 3.5, face: [0, 1], lift: 5 }, { x: 7, y: 26.5, face: [0, -1], lift: 5 }],
  desc: "Un guéridon à échiquier marqueté et ses deux tabourets. En salle de repos, les devs viennent y faire une partie.",
  styles: sty("w", [["noyer", "Noyer", "#5c3d27"], ["chene", "Chêne", "#8a6a4a"], ["noir", "Ébène", "#2a2a30"]]) });
add({ type: "screen", cat: "deco", name: "Paravent", price: 300, w: 30, d: 4, rots: 2, art: "isoscreen", desc: "Trois volets en bois et papier de riz : un coin au calme en deux secondes.",
  styles: sty("c", [["riz", "Papier de riz", "#f4efe2"], ["lin", "Lin", "#d9c7a5"], ["indigo", "Indigo", "#3a4a7a"], ["rose", "Rose poudré", "#e8c0c0"]]) });
add({ type: "coatrack", cat: "rangement", name: "Porte-manteau", price: 120, w: 8, d: 8, rots: 1, art: "isocoatrack", desc: "Un perroquet en bois ; quelqu'un y a oublié son manteau et son chapeau.",
  styles: sty("c", [["noyer", "Noyer", "#5c3d27"], ["chene", "Chêne", "#8a6a4a"], ["noir", "Noir", "#2a2a30"]]) });
gadget({ type: "drinksfridge", cat: "cuisine", name: "Frigo à boissons", price: 900, w: 14, d: 12, rots: 4, art: "isodrinksfridge", env: e => ({ lit: true }),
  desc: "Une porte vitrée, des canettes bien alignées, éclairées de l'intérieur. Clic : une boisson fraîche.",
  styles: sty("c", [["rouge", "Rouge", "#c0303a"], ["bleu", "Bleu", "#2a6fd0"], ["vert", "Vert", "#2f8a4a"], ["noir", "Noir", "#2a2a30"]]),
  actions: [["drink", "🥤", "Prendre une boisson fraîche", chiefSays("Pschiiit… ah, ça réveille 🥤", { fatigue: -5, faim: 3 })]] });
gadget({ type: "popcorn", cat: "cuisine", name: "Machine à pop-corn", price: 450, w: 10, d: 10, rots: 1, art: "isopopcorn", env: e => ({ frame: e.still ? 0 : Math.floor(e.t / 250) % 3 }),
  desc: "Un chariot rouge de fête foraine, le maïs qui éclate dans sa vitrine. Clic : un cornet.",
  styles: sty("c", [["rouge", "Rouge", "#c0303a"], ["bleu", "Bleu", "#2a5a9a"], ["jaune", "Jaune", "#d4a73a"]]),
  actions: [["eat", "🍿", "Prendre un cornet de pop-corn", chiefSays("Un cornet pour la démo de cet après-midi 🍿", { faim: 6, ennui: -4 })]] });
new Plant({ type: "bonsai", cat: "plantes", name: "Bonsaï", price: 320, room: "any", w: 10, d: 10, rots: 1, art: "isobonsai", plant: true, desc: "Un genévrier taillé depuis vingt ans dans sa coupe émaillée. Clic : l'arroser.",
  styles: [{ id: "bleu", name: "Coupe bleue", sw: "#2f5d9a" }] });
// the vegetable bed: ripe again 3 hours after a harvest; the harvest goes to the kitchen's fridge (social/kitchen.js)
const RIPE_MS = 3 * 3600_000, ripe = it => Date.now() - (it.picked || 0) > RIPE_MS;
class VegPatch extends Plant {
  isoState(it) { return { ...super.isoState(it), ripe: ripe(it) }; }
  pie(it) { return [...super.pie(it), ["harvest", "🍅", ripe(it) ? "Récolter (tomates, légumes)" : "Pas encore mûr", ripe(it) ? "" : `dans ${Math.ceil((RIPE_MS - (Date.now() - it.picked)) / 60000)} min`]]; }
  act(it, id) {
    if (id !== "harvest") return super.act(it, id);
    if (!ripe(it)) return true;
    it.picked = Date.now(); pantry.tomates = (pantry.tomates || 0) + 2; pantry.legumes = (pantry.legumes || 0) + 1; savePantry(); hub.saveBuild?.();
    crewAdd(CHIEF_NAME, { ennui: -4, moral: 2 }); say(CHIEF_NAME, "🍅🍅🥕 Tout droit au frigo de la cuisine !"); sfx("achievement");
    return true;
  }
}
new VegPatch({ type: "vegpatch", cat: "exterieur", name: "Potager surélevé", price: 380, room: "any", w: 30, d: 12, rots: 2, art: "isovegpatch", plant: true,
  desc: "Des salades, des carottes et des tomates sur leurs tuteurs. Clic : l'arroser, ou récolter (toutes les 3 h) : 2 tomates et des légumes pour le frigo de la cuisine.",
  styles: [{ id: "bois", name: "Bois", sw: "#8a6a4a" }] });
add({ type: "swing", cat: "exterieur", act: "read", name: "Balancelle", price: 1200, w: 34, d: 14, rots: 2, art: "isoswing", spots: [{ x: 11, y: 8, face: [0, 1], lift: 6 }, { x: 23, y: 8, face: [0, 1], lift: 6 }],
  desc: "Une balancelle de jardin à auvent rayé : on s'y pose à deux.", styles: sty("c", [["bleu", "Bleu", "#3a7ac0"], ["vert", "Vert", "#5aa86a"], ["rouge", "Rouge", "#c0303a"], ["jaune", "Jaune", "#e8c23a"]]) });
add({ type: "birdcage", cat: "deco", name: "Cage à oiseaux", price: 260, w: 10, d: 10, rots: 1, art: "isobirdcage", env: e => ({ frame: e.still ? 0 : Math.floor(e.t / 700) % 2 }),
  desc: "Une cage en laiton sur pied, un canari qui sautille d'un perchoir à l'autre.", styles: sty("c", [["laiton", "Laiton", "#d4a73a"], ["blanc", "Blanc", "#e6e2d8"], ["noir", "Noir", "#2a2a30"]]) });
