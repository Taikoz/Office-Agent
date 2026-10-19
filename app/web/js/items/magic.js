// The wizard school theme (shop: 🎭 Thèmes → 🪄 École de sorcellerie; drawings: svg/isomagic.js): castle walls to
// compose piece by piece (straight, pointed arch, stained glass, a pillar with its torch), a lancet window, two rugs,
// floating candles, a chandelier, a wall torch, a gothic chair, the headmaster's throne, the refectory table, a potion
// table, a wizard's desk, a cauldron, a shelf of grimoires, a flying broom, an owl, the sorting hat, a crystal ball, a
// living portrait. Each one does something: brew, read, fly, send an owl, get sorted, read the future… The chief's
// clothes of the theme are in the wardrobe (world/shop.js).

import "../svg/isomagic.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, TEAM } from "../core/core.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { clockNow } from "../sims/days.js";
import { shade } from "../svg/base.js";
import { Item } from "./base.js";
import { Colored } from "./furniture.js";
import { Gadget } from "./gadgets.js";
import { Lamp } from "./lamp.js";
import { FrameArt, Win } from "./catalog2.js";
import { WallArt, WallDeco } from "./walldeco.js";
import { StyledDesk } from "./desk.js";
import { ChiefDesk } from "./chiefdesk.js";

const THEME = "magie";
const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const anim = (t, ms) => Math.floor(t / ms);
const still = () => !!hub.focusMode;
const STONES = sty([["gris", "Pierre grise", "#8d8a80"], ["blonde", "Pierre blonde", "#c9b48a"], ["sombre", "Pierre sombre", "#5a5866"], ["moussue", "Pierre moussue", "#7f8a74", { c: "#7f8a74", moss: true }]]);
const WOODS = sty([["chene", "Chêne sombre", "#4a2f1e"], ["noyer", "Noyer", "#5c3d27"], ["ebene", "Ébène", "#2a2026"]], "w");
const HOUSES = [["Phénix", "🔥", "#c0303a"], ["Dragon", "🐉", "#2f7a45"], ["Licorne", "🦄", "#3a7ac0"], ["Griffon", "🦅", "#d4a640"]];
const SPELLS = ["« Refactorus Totalum »", "« Accio Café »", "« Lumos Logs »", "« Expelliarmus Bug »", "« Wingardium Deploya »", "« Mergus Conflictus Finite »"];
const POTIONS = [["une potion de concentration", "🧪", { fatigue: -10 }, "Concentré comme jamais"], ["une potion de bonne humeur", "💖", { moral: 8 }, "Pétillant de bonne humeur"],
  ["une potion d'énergie", "⚡", { fatigue: -14, cafe: 10 }, "Plein d'énergie"], ["une potion… ratée, ça sent le soufre", "💨", { moral: -2, ennui: -6 }, "Potion ratée (mais drôle)"]];
// everyone in the room (world/interact.js), the chief aside
const others = room => hub.peopleIn(room).filter(n => n !== CHIEF_NAME);
const magic = def => ({ theme: THEME, room: "any", ...def });

/* ---------- walls to compose: straight, arch, stained glass, pillar ---------- */
class CastleWall extends Colored {
  isoState(it, t) { return { ...super.isoState(it, t), lit: hub.nightLevel?.() > 0, moss: !!hub.styleOf(it).moss }; }
}
const wall = def => new CastleWall(magic({ cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, styles: STONES, ...def }));
wall({ type: "castlewall", name: "Mur de château", price: 300, art: "isocastlewall",
  desc: "Un pan de mur en pierre de taille, créneaux en haut. Aligne-les, tourne-les, termine par un pilier : une salle de château, un couloir, une tour." });
wall({ type: "castlearch", name: "Mur à arche ogivale", price: 450, art: "isocastlearch", walkable: true,
  desc: "Le même mur, percé d'une arche en ogive : on passe dessous." });
wall({ type: "castlewin", name: "Mur à vitrail", price: 650, art: "isocastlewin",
  desc: "Une lancette de verre coloré serti de plomb dans le mur ; le soir, elle s'allume de l'intérieur." });
new class extends Lamp {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 160) % 3, ...(hub.styleOf(it).moss ? { moss: true } : {}), c: hub.styleOf(it).c }; }
}(magic({ type: "castlepillar", cat: "cloisons", shelf: "murs", name: "Pilier à torche", price: 380, w: 8, d: 8, rots: 1, art: "isocastlepillar", light: 34,
  desc: "Pour finir un mur ou tourner un angle : un pilier carré, sa torche qui crépite. Clic : l'allumer, l'éteindre.", styles: STONES }));

/* ---------- window, rugs ---------- */
new Win(magic({ type: "windowogive", cat: "fenetres", name: "Fenêtre ogivale à croisillons", price: 900, kind: "wall", w: 24, h: 44, glass: { x: 3, y: 3, w: 18, h: 38, shape: "arch" },
  art2d: new FrameArt("wallwindowogive", 24, 44, ({ f = "#8d8a80" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 44V12A12 12 0 0 1 24 12V44ZM3 41H21V12A9 9 0 0 0 3 12Z"/>`
    + `<rect x="-1" y="41" width="26" height="3" fill="${shade(f, 1.2)}"/><g stroke="#2a2a30" stroke-width=".45" fill="none">` + [-12, -6, 0, 6, 12, 18].map(k => `<path d="M${3 + k} 41L${21 + k} 5M${21 - k} 41L${3 - k} 5"/>`).join("") + `</g>`
    + `<path fill="${f}" d="M0 44V12A12 12 0 0 1 24 12V44ZM3 41H21V12A9 9 0 0 0 3 12Z" fill-rule="evenodd"/>` + `<path fill="#ffffff" fill-opacity=".3" d="M6 9h3l-6 7v-3z"/>`),
  desc: "Une haute fenêtre en ogive, losanges de verre sertis de plomb, encadrement de pierre. Derrière la vitre, le ciel de l'heure et la météo des tests.",
  styles: sty([["pierre", "Pierre", "#8d8a80", { f: "#8d8a80" }], ["blonde", "Pierre blonde", "#c9b48a", { f: "#c9b48a" }], ["fer", "Fer forgé", "#2e2e36", { f: "#2e2e36" }]]) }));
const RUG_NIGHT = [{ id: "nuit", name: "Bleu nuit", sw: "#1d2350" }, { id: "violet", name: "Violet", sw: "#3a2350" }, { id: "encre", name: "Encre", sw: "#14141c" }];
new Item(magic({ type: "rugstarry", cat: "tapis", kind: "rug", shape: "etoiles", name: "Tapis de ciel étoilé", price: 520, w: 64, d: 40, desc: "Un ciel de nuit tissé : étoiles d'or, croissant de lune, une comète.", styles: RUG_NIGHT }));
new Item(magic({ type: "rugrunes", cat: "tapis", kind: "rug", shape: "runes", name: "Tapis du cercle des runes", price: 480, w: 50, d: 50,
  desc: "Un grand cercle d'anneaux dorés et de runes autour d'une étoile : idéal sous un chaudron.", styles: [...RUG_NIGHT, { id: "bordeaux", name: "Bordeaux", sw: "#5a1e2a" }] }));

/* ---------- lights ---------- */
class MagicLight extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 220) % 12 }; } }
new MagicLight(magic({ type: "floatcandles", cat: "lumiere", name: "Chandelles flottantes", price: 420, w: 14, d: 14, rots: 1, art: "isofloatcandles", walkable: true, light: 36,
  desc: "Sept chandelles qui flottent dans les airs, chacune à sa hauteur, en se balançant doucement. On passe dessous. Clic : les allumer, les éteindre.", styles: [{ id: "cire", name: "Cire", sw: "#efe6cf" }] }));
new MagicLight(magic({ type: "chandelier", cat: "lumiere", name: "Lustre de fer forgé", price: 780, w: 20, d: 20, rots: 1, art: "isochandelier", walkable: true, light: 52,
  desc: "Une couronne de fer suspendue à quatre chaînes, huit bougies : la grande salle à la tombée du jour. On passe dessous.", styles: [{ id: "fer", name: "Fer forgé", sw: "#2e2e36" }] }));
// a torch on the wall: its flame flickers (a 2D wall art), its light at night (iso/rooms.js lampsOver: glow)
class Torch extends WallDeco { state(it, t) { return still() ? 0 : anim(t, 160) % 3; } }
new Torch(magic({ type: "walltorch", cat: "lumiere", name: "Torche murale", price: 160, kind: "wall", w: 8, h: 20, glow: true,
  art2d: new WallArt("walltorch", 8, 20, ({ on: f = 0 }) => {
    const k = [1, 1.15, 0.92][f || 0], sw = [0, 0.5, -0.4][f || 0];
    return `<circle cx="4" cy="5" r="4" fill="#ffcf6a" fill-opacity=".25"/><rect x="2.6" y="14" width="2.8" height="1.4" fill="#2e2e36"/><rect x="3.5" y="15" width="1" height="5" fill="#2e2e36"/>`
      + `<path fill="#6a4a2a" d="M2.8 14L3.4 8H4.6L5.2 14Z"/><rect x="2.8" y="7.4" width="2.4" height="1.2" fill="#2e2e36"/>`
      + `<path fill="#ff9a3b" d="M2.4 7.6Q${4 + sw} ${7.6 - 6 * k} 5.6 7.6Q4 8.8 2.4 7.6Z"/><path fill="#fff3b0" d="M3.2 7.6Q${4 + sw * 0.5} ${7.6 - 3.4 * k} 4.8 7.6Z"/>`;
  }, { outline: 0, pad: 3 }),
  desc: "💡 Lumineux · Une torche dans son anneau de fer, la flamme qui danse.", styles: [{ id: "fer", name: "Fer", sw: "#2e2e36" }] }));

/* ---------- seats ---------- */
class Seat extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
new Seat(magic({ type: "chairgothic", cat: "chaises", name: "Chaise gothique", price: 420, w: 12, d: 11, chair: true, walkable: true, thumbArt: "isocgothicfull",
  parts: [{ art: "isocgothicback", rect: [0, 0, 12, 2] }, { art: "isocgothic", rect: [0, 1, 12, 10] }], spots: [{ x: 6, y: 6, face: [0, 1], lift: 3 }],
  desc: "Haut dossier en ogive, rosace sculptée, pinacles, assise de velours : on y attend son tour de parole au conseil.",
  styles: sty([["bordeaux", "Velours bordeaux", "#6e1f2a"], ["vert", "Velours vert", "#1f4a32"], ["bleu", "Velours nuit", "#22336a"], ["or", "Velours moutarde", "#a07a28"]].map(([id, n, c]) => [id, n, c, { c, w: "#4a2f1e" }])) }));
new Seat(magic({ type: "throne", cat: "fauteuils", act: "read", name: "Fauteuil du directeur", price: 2400, w: 24, d: 18, thumbArt: "isothronefull",
  parts: [{ art: "isothroneback", rect: [0, 0, 24, 6] }, { art: "isothrone", rect: [0, 6, 24, 12] }], spots: [{ x: 12, y: 11, face: [0, 1], lift: 5 }],
  desc: "Le grand fauteuil sculpté du directeur : dossier capitonné, cimier doré, accoudoirs à boules d'or. En salle de repos, les devs viennent y lire.",
  styles: sty([["nuit", "Velours nuit", "#2a2350"], ["pourpre", "Velours pourpre", "#5a1e4a"], ["emeraude", "Velours émeraude", "#1f4a32"]].map(([id, n, c]) => [id, n, c, { c, w: "#3a2416" }])) }));

/* ---------- tables, desk ---------- */
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 200) % 6 }; }
}(magic({ type: "refectory", cat: "tables", name: "Table de réfectoire", price: 1800, w: 56, d: 24, rots: 2, art: "isorefectory", surface: { z: 14.6, rect: [0, 6, 56, 12] }, visit: "terrace", pose: { seated: true },
  spots: [10, 28, 46].flatMap(x => [{ x, y: 2, face: [0, 1], lift: 3 }, { x, y: 22, face: [0, -1], lift: 3 }]),
  desc: "La longue table de chêne et ses deux bancs, bougeoirs, gobelets et assiettes : six convives. Clic : organiser un festin pour toute la pièce.",
  styles: sty([["chene", "Chêne", "#6b4a2e"], ["sombre", "Chêne sombre", "#4a2f1e"], ["clair", "Chêne clair", "#9a7a50"]], "w"),
  actions: [["feast", "🍗", "Organiser un festin · § 80", it => {
    const people = others(it.room);
    if (!spend(80, "Festin")) return;
    for (const n of people) { crewAdd(n, { faim: 30, social: 12, moral: 4 }); addMoodlet(n, "feast", "🍗", "Un festin au réfectoire", 6, 120); }
    crewAdd(CHIEF_NAME, { faim: 30, social: 10 }); addMoodlet(CHIEF_NAME, "feast", "🍗", "Un festin au réfectoire", 6, 120);
    say(CHIEF_NAME, people.length ? "Que le festin commence ! 🍗🥧🍷" : "Un festin… pour moi tout seul. 🍗", 3500); sfx("achievement");
    if (people.length) setTimeout(() => say(pick(people), pick(["Du poulet rôti ! 🍗", "Les tartes à la citrouille 🥧", "Encore un peu de jus de citrouille ?"]), 3000), 1000);
  }]] }));
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 400) % 2 }; }
}(magic({ type: "potiontable", cat: "tables", name: "Table de potions", price: 950, w: 28, d: 14, rots: 4, art: "isopotiontable", surface: { z: 14.6 },
  desc: "Fioles colorées (l'une bouillonne), mortier, grimoire ouvert, petit chaudron. Clic : préparer une potion… au hasard.",
  styles: sty([["noyer", "Noyer usé", "#5a3a24"], ["chene", "Chêne", "#7a5236"]], "w"),
  actions: [["brew", "🧪", "Préparer une potion", it => {
    const [what, icon, fx, label] = pick(POTIONS);
    crewAdd(CHIEF_NAME, fx); addMoodlet(CHIEF_NAME, "potion", icon, label, fx.moral < 0 ? -2 : 4, 45);
    say(CHIEF_NAME, `Une pincée de… voilà ${what} ${icon}`, 3500); sfx(fx.moral < 0 ? "fail" : "commit");
  }]] }));
new StyledDesk(magic({ type: "deskwizard", cat: "bureau", room: "office", workstation: true, name: "Bureau de sorcier", price: 1300, w: 40, d: 14, art: "isodeskwizard", seat: [20, 24], surface: { z: 13.4 },
  desc: "Deux caissons sculptés à poignées d'or, sous-main de cuir, une pile de grimoires, l'encrier et sa plume, une bougie. La place d'un dev (ordinateur et chaise à part).",
  styles: [{ id: "ebene", name: "Ébène, cuir vert", sw: "#3a2416", w: "#3a2416", leather: "#2f5d3a" }, { id: "noyer", name: "Noyer, cuir bordeaux", sw: "#5c3d27", w: "#5c3d27", leather: "#6e1f2a" },
    { id: "chene", name: "Chêne, cuir nuit", sw: "#6b4a2e", w: "#6b4a2e", leather: "#22336a" }] }));

// the headmaster's desk: the chief's desk of the theme; ChiefOS opens there as a grimoire (ui/chiefos.js osSkin)
new class extends ChiefDesk {
  isoState(it, t) { return { w: hub.styleOf(it).w, leather: hub.styleOf(it).leather, frame: still() ? 0 : anim(t, 400) % 12 }; }
}(magic({ type: "chiefdeskmagic", chiefDesk: true, osSkin: "grimoire", cat: "bureau", name: "Bureau du directeur", price: 3000, room: "office", unique: true, w: 34, d: 16, art: "isochiefdeskmagic",
  spots: [{ x: 17, y: 24, face: [0, -1] }],
  desc: "Ton bureau de directeur d'école : caissons sculptés, étoile d'or, grimoire ouvert dont les runes brillent, boule de cristal, plume, chandelles, petit planétaire qui tourne. Assis là, ChiefOS s'ouvre en Grimoire.",
  styles: [{ id: "ebene", name: "Ébène, cuir bordeaux", sw: "#3a2416", w: "#3a2416", leather: "#5a1e2a" }, { id: "noyer", name: "Noyer, cuir vert", sw: "#5c3d27", w: "#5c3d27", leather: "#1f4a32" },
    { id: "chene", name: "Chêne, cuir nuit", sw: "#6b4a2e", w: "#6b4a2e", leather: "#22336a" }] }));

/* ---------- magic things ---------- */
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 260) % 12, still: still() }; }
}(magic({ type: "cauldron", cat: "deco", name: "Chaudron bouillonnant", price: 700, w: 14, d: 14, rots: 1, art: "isocauldron",
  desc: "Un gros chaudron de fonte sur ses braises, la potion qui bouillonne et fume. Clic : touiller, ou servir une louche à toute la pièce.",
  styles: sty([["vert", "Potion verte", "#51cf66"], ["violet", "Potion violette", "#b48cff"], ["bleu", "Potion bleue", "#3bc4ff"], ["rouge", "Potion rouge", "#ff6b6b"]]),
  actions: [["stir", "🥄", "Touiller la potion", it => { say(CHIEF_NAME, pick(["Bloup… bloup… 🫧", "Trois tours dans le sens des aiguilles… 🥄", "Ça sent la cannelle et l'orage. 🫧"]), 3000); crewAdd(CHIEF_NAME, { ennui: -5 }); sfx("commit"); }],
    ["ladle", "🍵", "Servir une louche à tous", it => {
      const people = others(it.room);
      if (!people.length) return say(CHIEF_NAME, "Personne pour goûter ma potion… 🍵");
      for (const n of people) { crewAdd(n, { fatigue: -8, moral: 3 }); addMoodlet(n, "ladle", "🍵", "Une louche de potion du chef", 4, 60); }
      say(CHIEF_NAME, "Une louche chacun, ça requinque ! 🍵", 3000); setTimeout(() => say(pick(people), pick(["Ça pique un peu… 😵", "Hmm, goût myrtille ! 🫐", "Je vois des couleurs ✨"]), 3000), 900); sfx("achievement");
    }]] }));
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 300) % 4, still: still() }; }
}(magic({ type: "grimoires", cat: "bibliotheque", act: "read", name: "Bibliothèque de grimoires", price: 1600, w: 30, d: 8, rots: 2, art: "isogrimoires", spots: [{ x: 15, y: 14, face: [0, -1] }],
  desc: "Quatre étagères de grimoires reliés de cuir à filets d'or, une bougie… et un livre qui flotte au-dessus en tournant ses pages. Clic : lire un sortilège.",
  styles: WOODS,
  actions: [["spell", "📖", "Lire un sortilège", () => { say(CHIEF_NAME, `${pick(SPELLS)} ✨`, 3500); crewAdd(CHIEF_NAME, { ennui: -6, moral: 1 }); addMoodlet(CHIEF_NAME, "spell", "📖", "Un nouveau sortilège appris", 3, 60); sfx("commit"); }]] }));
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 350) % 4, still: still() }; }
}(magic({ type: "broom", cat: "deco", name: "Balai volant", price: 1100, w: 14, d: 8, rots: 2, art: "isobroom",
  desc: "Un balai de course qui flotte au-dessus de son support, quelques étincelles derrière. Clic : faire un tour.",
  styles: [{ id: "course", name: "Modèle de course", sw: "#7a5236" }],
  actions: [["fly", "🧹", "Faire un tour de balai", () => {
    say(CHIEF_NAME, pick(["Wouhouuu ! Le tour du bâtiment en 12 secondes ! 🧹", "Attention aux fenêtres… 🧹💨", "Un looping au-dessus de la terrasse ! 🧹"]), 3500);
    crewAdd(CHIEF_NAME, { ennui: -14, moral: 4, fatigue: 3 }); addMoodlet(CHIEF_NAME, "broom", "🧹", "Un tour de balai", 5, 60); sfx("achievement");
  }]] }));
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 600) % 7, still: still() }; }
}(magic({ type: "owlperch", cat: "deco", name: "Perchoir à hibou", price: 650, w: 10, d: 10, rots: 1, art: "isoowlperch",
  desc: "Un hibou sur son perchoir : il cligne des yeux, tourne la tête. Clic : envoyer un hibou à un dev, avec tes félicitations.",
  styles: sty([["fauve", "Hibou fauve", "#8a6a4a"], ["neige", "Harfang des neiges", "#e6e2d8"], ["gris", "Hibou gris", "#7a7a80"]]),
  actions: [["owl", "🦉", "Envoyer un hibou", () => {
    const to = pick(TEAM);
    crewAdd(to, { moral: 6, social: 6 }); addMoodlet(to, "owl", "🦉", "Un hibou du chef, avec des félicitations", 5, 120);
    say(CHIEF_NAME, `Va, porte mes félicitations à ${to} ! 🦉`, 3500); toast("HIBOU 🦉", `Message pour ${to}`, "« Merci pour ton travail. — Le chef »"); sfx("achievement");
  }]] }));
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 500) % 4, still: still() }; }
}(magic({ type: "sortinghat", cat: "deco", name: "Chapeau répartiteur", price: 900, w: 10, d: 10, rots: 1, art: "isosortinghat",
  desc: "Un vieux chapeau rapiécé sur son tabouret ; il parle. Clic : te faire répartir, ou répartir l'équipe dans la pièce entre Phénix, Dragon, Licorne et Griffon.",
  styles: [{ id: "cuir", name: "Cuir usé", sw: "#6a4a2e" }],
  actions: [["sort", "🎩", "Se faire répartir", () => {
    const [h, icon] = pick(HOUSES);
    say(CHIEF_NAME, `« Hmm… difficile… très difficile… ${h.toUpperCase()} ! » ${icon}`, 4000); addMoodlet(CHIEF_NAME, "house", icon, `Maison ${h}`, 3, 24 * 60); sfx("achievement");
  }], ["sortall", "📜", "Répartir l'équipe présente", it => {
    const people = others(it.room);
    if (!people.length) return say(CHIEF_NAME, "Personne à répartir ici. 🎩");
    people.forEach((n, i) => { const [h, icon] = HOUSES[(n.length + i) % HOUSES.length]; addMoodlet(n, "house", icon, `Maison ${h}`, 3, 24 * 60); setTimeout(() => say(n, `${h} ! ${icon}`, 2500), 700 * i); });
    say(CHIEF_NAME, "Que la répartition commence ! 🎩", 2500); sfx("achievement");
  }]] }));
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 250) % 6 }; }
}(magic({ type: "crystalball", cat: "deco", name: "Boule de cristal", price: 520, kind: "top", w: 6, d: 6, rots: 1, art: "isocrystalball",
  desc: "Sur un pied de laiton, une brume qui tourne à l'intérieur. Se pose sur une table ou un bureau. Clic : lire l'avenir (de l'équipe).",
  styles: sty([["mauve", "Brume mauve", "#b48cff"], ["bleue", "Brume bleue", "#3bc4ff"], ["verte", "Brume verte", "#51cf66"]]),
  actions: [["future", "🔮", "Lire l'avenir", () => {
    const s = hub.data?.sessions || [], busy = s.flatMap(x => x.agents || []).filter(a => a.status === "working").length, h = clockNow().getHours();
    say(CHIEF_NAME, pick([busy ? `Je vois… ${busy} agent${busy > 1 ? "s" : ""} au travail, et une CI verte au bout du chemin. 🔮` : "Je vois… un calme plat. Lance donc un agent. 🔮",
      h >= 16 ? "Je vois… un afterwork, des rires, une tournée. 🔮" : "Je vois… une MR approuvée avant ce soir. 🔮", "Je vois… un bug. Il se cache dans un fichier de config. 🔮"]), 4500);
    crewAdd(CHIEF_NAME, { ennui: -4 }); sfx("commit");
  }]] }));
// a living portrait: the old headmaster, in a gilded frame; he blinks and looks around (frame)
class Portrait extends WallDeco { state(it, t) { return still() ? 0 : anim(t, 700) % 8; } }
new Portrait(magic({ type: "portraitmagic", cat: "cadres", name: "Portrait animé", price: 750, kind: "wall", w: 20, h: 26,
  art2d: new WallArt("wallportraitmagic", 20, 26, ({ on: f = 0, f: fr = "#d4a640" }) => {
    const look = [0, 0, 0.6, 0, -0.6, 0, 0, 0][f || 0], blink = f === 5;
    let g = `<rect width="20" height="26" rx="1" fill="${fr}"/><rect x="1.6" y="1.6" width="16.8" height="22.8" fill="${shade(fr, 0.7)}"/><rect x="2.6" y="2.6" width="14.8" height="20.8" fill="#2a3a2a"/>`;
    g += `<path fill="#3a2a5a" d="M4 23.4Q4 15 10 14.6Q16 15 16 23.4Z"/><rect x="7.6" y="7" width="4.8" height="6" rx="2" fill="#f1c7a3"/><path fill="#e8e4d8" d="M7.4 11.6Q10 18 12.6 11.6Q12 15 10 15.4Q8 15 7.4 11.6Z"/>`;
    g += `<path fill="#3a2a5a" d="M6.6 7.6L10 2.4L13.4 7.6Z"/><rect x="6.2" y="7.2" width="7.6" height="0.9" fill="#d4a640"/>`;
    g += blink ? `<rect x="8.3" y="9.6" width="1.2" height=".3" fill="#1c1c22"/><rect x="10.5" y="9.6" width="1.2" height=".3" fill="#1c1c22"/>` : `<rect x="${8.4 + look}" y="9.2" width="1" height="1" fill="#1c1c22"/><rect x="${10.6 + look}" y="9.2" width="1" height="1" fill="#1c1c22"/>`;
    return g + `<path fill="#ffffff" fill-opacity=".1" d="M2.6 2.6h6l-6 7z"/>`;
  }, { outline: 0, pad: 1 }),
  desc: "Le vieux directeur dans son cadre doré : il cligne des yeux et vous suit du regard.", styles: sty([["or", "Cadre doré", "#d4a640", { f: "#d4a640" }], ["noyer", "Cadre noyer", "#5c3d27", { f: "#5c3d27" }]]) }));
