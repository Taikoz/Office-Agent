// The beach & beach club theme (shop: 🎭 Thèmes → 🏖️ Plage & beach club; drawings: svg/isobeach.js): walls to compose (a
// striped beach hut wall, a bamboo wall, a curtain of shells that parts when someone walks through, a tiki totem and
// its torch), a bay window on the ocean (a surfer per agent at work), two rugs, a tiki torch, a BEACH CLUB neon, a
// deck chair, a rattan hanging chair, a surfboard desk, the lifeguard tower (the chief's desk: ChiefOS turns TROPIC
// there; clic: watch the swimmers, the agents in trouble), the pool (a swimmer per agent at work, a flamingo per
// delivered), a sandcastle (a tower per agent whose tests are green, washed away by a red CI), the swim flag (the CI's
// colour), the tiki bar (a round of cocktails), the DJ booth (its equalizer follows the activity; clic: a set), a
// hammock, a parasol, the crabs (one per agent whose tests are red), an ice-cream cart, a monstera. The chief's
// Hawaiian shirt, straw hat and lei are in the wardrobe (world/shop.js).

import "../svg/isobeach.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, S, chief, ctx, ents } from "../core/core.js";
import { isStuck } from "../core/data.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { clockNow } from "../sims/days.js";
import { shade } from "../svg/base.js";
import { enqueue } from "../ui/actions.js";
import { Item } from "./base.js";
import { Colored } from "./furniture.js";
import { Gadget, chiefVisit } from "./gadgets.js";
import { Lamp } from "./lamp.js";
import { Plant } from "./plant.js";
import { FrameArt, Win } from "./catalog2.js";
import { NEON, Neon, both, neonArt, tpath, ttext } from "./walldeco.js";
import { StyledDesk } from "./desk.js";
import { tileCanvas } from "../world/decor.js";
import { ChiefDesk } from "./chiefdesk.js";

const THEME = "plage";
const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const anim = (t, ms) => Math.floor(t / ms);
const still = () => !!hub.focusMode;
const beach = def => ({ theme: THEME, room: "any", ...def });
const s_ = n => n > 1 ? "s" : "";
const others = room => hub.peopleIn(room).filter(n => n !== CHIEF_NAME);
const agents = () => (hub.data?.sessions || []).flatMap(s => s.agents || []);
const working = () => agents().filter(a => a.status === "working");
const delivered = () => agents().filter(a => a.status === "done").length;
const pipes = () => Object.values(hub.data?.pipelines || {}).filter(p => p && p.state !== "merged");
const redCi = () => pipes().filter(p => p.ci === "failed").length;
const greenTests = () => agents().filter(a => a.game?.tests?.ok).length;
const redTests = () => agents().filter(a => a.game?.tests && !a.game.tests.ok).length;
const inTrouble = () => agents().filter(a => a.status === "blocked" || isStuck(a));
const who = a => a.ticket || a.description || a.type || "un agent";
// the swim flag: red when a CI is red, orange while one runs, green otherwise
const FLAGS = { red: ["#e8402a", "Drapeau rouge"], orange: ["#f0a020", "Drapeau orange"], green: ["#2a9a4a", "Drapeau vert"] };
const flagNow = () => redCi() ? "red" : pipes().some(p => p.ci === "running" || p.ci === "pending") ? "orange" : "green";

/* ---------- walls ---------- */
const wall = (Cls, def) => new Cls(beach({ cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, ...def }));
wall(Colored, { type: "beachhut", name: "Mur de cabine de plage", price: 300, art: "isobeachhut",
  desc: "Des planches peintes en rayures, un lambrequin festonné, une bouée accrochée : aligne-les pour une rangée de cabines au bord de l'eau.",
  styles: sty([["bleu", "Bleu et blanc", "#3a8ad0"], ["rouge", "Rouge et blanc", "#e8402a"], ["vert", "Vert d'eau et blanc", "#5ac8a8"], ["jaune", "Jaune et blanc", "#f0c040"]]) });
wall(Colored, { type: "bamboowall", name: "Mur de bambou", price: 320, art: "isobamboowall",
  desc: "Des cannes de bambou serrées, ligaturées de corde, un chaperon de chaume : l'esprit paillote.",
  styles: sty([["naturel", "Naturel", "#c9b06a"], ["fume", "Fumé", "#8a6a3a"], ["clair", "Clair", "#e0cc8a"]]) });
// the shell curtain: its strands part when someone comes near, and swing back
const curtainOpen = new WeakMap();
const near = (it, x, y) => { const [x0, y0, x1, y1] = hub.footOf(it); return Math.hypot((x0 + x1) / 2 - x, (y0 + y1) / 2 - y) < 30; };
const someoneNear = it => {
  const r = it.room;
  return (chief.room === r && near(it, r === "office" ? chief.x : chief.lx, r === "office" ? chief.y : chief.ly))
    || (r === "office" ? [...ents.values()].some(e => near(it, e.x, e.y)) : [...hub.loungers.values()].some(l => (r === "lounge" ? !l.partyRoom : l.partyRoom === r) && near(it, l.x, l.y)));
};
class ShellCurtain extends Colored {
  isoState(it, t) {
    const was = curtainOpen.get(it) || 0, want = someoneNear(it) ? 1 : 0, o = was + (want - was) * 0.16;
    curtainOpen.set(it, o);
    return { ...super.isoState(it, t), open: still() ? want : o, frame: still() ? 0 : anim(t, 160) % 40 };
  }
}
wall(ShellCurtain, { type: "shellcurtain", name: "Rideau de coquillages", price: 650, art: "isoshellcurtain", walkable: true,
  desc: "Un passage encadré de bambou, des rangs de perles et de coquillages : ils s'écartent en cliquetant quand quelqu'un passe, puis se balancent.",
  styles: sty([["naturel", "Bambou naturel", "#c9b06a"], ["fume", "Bambou fumé", "#8a6a3a"]]) });
class TikiLamp extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 160) % 3 }; } }
new TikiLamp(beach({ type: "tikipillar", cat: "cloisons", shelf: "murs", name: "Totem tiki", price: 420, w: 8, d: 8, rots: 1, art: "isotikipillar", light: 34,
  desc: "Pour finir un mur ou tourner un angle : un poteau sculpté de deux visages tiki, sa torche qui flambe au sommet. Clic : l'allumer, l'éteindre.",
  styles: [{ id: "bois", name: "Bois sculpté", sw: "#8a5a2a" }] }));

/* ---------- window, rugs ---------- */
// the bay on the ocean: the sky of the hour (a sunset at the end of the day), the sea, a sailboat, and a surfer on the
// waves per agent at work
class OceanWin extends Win {
  behind(it, t) {
    const g = this.glass, x = (it.x + g.x) * S, y = (it.y + g.y) * S, w = g.w * S, h = g.h * S, s = still() ? 0 : t, hr = clockNow().getHours() + clockNow().getMinutes() / 60;
    const night = hr >= 21 || hr < 6.5, dusk = !night && (hr >= 18 || hr < 8), hz = y + h * 0.5;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, hz), [c0, c1] = night ? ["#0a1430", "#2a2a5a"] : dusk ? ["#6a3a8a", "#ff9a4a"] : ["#3aa0e8", "#bfeaff"];
    sky.addColorStop(0, c0); sky.addColorStop(1, c1); ctx.fillStyle = sky; ctx.fillRect(x, y, w, hz - y);
    const ox = x + w * (dusk ? 0.5 : 0.78), oy = dusk ? hz - h * 0.02 : y + h * 0.18, r = Math.min(w, h) * (dusk ? 0.12 : 0.08);
    ctx.fillStyle = night ? "#f4ecc8" : dusk ? "#ff6a2a" : "#fff3a0"; ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
    const sea = ctx.createLinearGradient(x, hz, x, y + h); sea.addColorStop(0, night ? "#14284a" : dusk ? "#7a4a7a" : "#1a8ab8"); sea.addColorStop(1, night ? "#0a1a30" : dusk ? "#3a3a6a" : "#3ad0d8");
    ctx.fillStyle = sea; ctx.fillRect(x, hz, w, h * 0.32);
    ctx.fillStyle = night ? "#3a3a40" : "#f0dca8"; ctx.beginPath(); ctx.moveTo(x, y + h * 0.84); ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.78, x + w, y + h * 0.86); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();  // the sand
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"; for (let k = 0; k < 3; k++) { const fy = y + h * (0.78 + k * 0.02) + Math.sin(s / 700 + k) * 1.2 * S; ctx.fillRect(x, fy, w, 0.5 * S); }  // the foam
    if (dusk || !night) { ctx.fillStyle = dusk ? "rgba(255, 140, 70, 0.5)" : "rgba(255, 255, 220, 0.4)"; for (let k = 0; k < 5; k++) ctx.fillRect(ox - r + Math.sin(s / 500 + k) * S, hz + 2 + k * 2.4 * S, r * 2 * (1 - k * 0.14), 0.5 * S); }
    const bx = x + ((s / 140) % (w * 1.3)) - w * 0.15, by = hz - 0.2 * S;  // a sailboat crossing
    ctx.fillStyle = night ? "#2a3048" : "#ffffff"; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 4 * S); ctx.lineTo(bx + 2.4 * S, by); ctx.fill(); ctx.fillStyle = night ? "#1a1a2a" : "#3a2a24"; ctx.fillRect(bx - 1.4 * S, by, 4 * S, 0.8 * S);
    const n = Math.min(4, working().length);
    for (let k = 0; k < n; k++) {  // the surfers riding the waves, one per agent at work
      const sx = x + ((s / 60 + k * w / Math.max(1, n)) % (w * 1.2)) - w * 0.1, sy = y + h * (0.66 + (k % 2) * 0.06) + Math.sin(s / 300 + k) * 1.2 * S;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)"; ctx.beginPath(); ctx.ellipse(sx - 2 * S, sy + 1 * S, 4 * S, 1 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ["#fbaa08", "#e8402a", "#3a5ad0", "#3ae8a8"][k]; ctx.fillRect(sx - 2 * S, sy, 4 * S, 0.7 * S);
      ctx.fillStyle = night ? "#1c1c22" : "#3a2a24"; ctx.fillRect(sx - 0.4 * S, sy - 3 * S, 0.8 * S, 3 * S); ctx.beginPath(); ctx.arc(sx, sy - 3.6 * S, 0.7 * S, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
new OceanWin(beach({ type: "windowocean", cat: "fenetres", name: "Baie sur l'océan", price: 1200, kind: "wall", w: 60, h: 34, glass: { x: 2, y: 2, w: 56, h: 30 },
  art2d: new FrameArt("wallwindowocean", 60, 34, ({ f = "#f4f2ea" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 0H60V34H0ZM2 2V32H58V2Z"/>`
    + `<rect x="29.4" y="2" width="1.2" height="30" fill="${f}"/><rect x="-1" y="31" width="62" height="3" fill="${shade(f, 0.85)}"/><path fill="#ffffff" fill-opacity=".14" d="M5 5h4l-4 6zM34 5h3l-3 4z"/>`),
  desc: "Une grande baie vitrée sur la mer. Derrière, le ciel de l'heure (et le coucher de soleil), un voilier, l'écume sur le sable… et un surfeur sur les vagues par agent au travail.",
  styles: sty([["blanc", "Blanc", "#f4f2ea", { f: "#f4f2ea" }], ["teck", "Teck", "#a0703a", { f: "#a0703a" }], ["bleu", "Bleu marine", "#22336a", { f: "#22336a" }]]) }));
new Item(beach({ type: "rugtowel", cat: "tapis", kind: "rug", shape: "serviette", name: "Serviette de plage géante", price: 260, w: 40, d: 64,
  desc: "Une serviette XXL à larges rayures, ses franges, un soleil brodé.", styles: [{ id: "rouge", name: "Rouge", sw: "#e8402a" }, { id: "bleu", name: "Bleu", sw: "#3a8ad0" }, { id: "jaune", name: "Jaune", sw: "#f0c040" }, { id: "rose", name: "Rose flamant", sw: "#f48ab0" }] }));
new Item(beach({ type: "rugmonstera", cat: "tapis", kind: "rug", shape: "monstera", name: "Tapis feuilles tropicales", price: 420, w: 56, d: 40,
  desc: "Des feuilles de monstera et de palmier sur fond uni : la jungle à tes pieds.", styles: [{ id: "creme", name: "Crème", sw: "#efe6d0" }, { id: "nuit", name: "Nuit", sw: "#1e2a2a" }, { id: "corail", name: "Corail", sw: "#f08a6a" }] }));

/* ---------- tiles to compose: sand, shore, sea ---------- */
// laid like rugs, side by side (snapped to the grid): one walks on them, tables, deck chairs, everything goes on top; the
// water moves (world/decor.js drawTileAnim). The shore pieces turn (↻) so the coast can go any way: a straight shore, a
// point of sand, a cove; their water meets the tile's edges at the middle, so they all fit together
const SANDS = sty([["blond", "Sable blond", "#e8d4a0"], ["blanc", "Sable blanc", "#f4ecd8"], ["dore", "Sable doré", "#d9b878"], ["volcan", "Sable volcanique", "#6a6460"]]);
const WATERS = sty([["lagon", "Lagon", "#2ab8c8"], ["ocean", "Océan", "#1a7ab0"], ["profond", "Mer profonde", "#14507a"], ["piscine", "Eau de piscine", "#3ac0e8"]]);
const tile = (type, shape, name, price, size, desc, styles, rots = 1) => new Item(beach({ type, cat: "tapis", shelf: "dalles", kind: "rug", tile: true, shape, name, price, w: size, d: size, rots,
  thumb: st => tileCanvas(shape, st.c, size, size, 0).toDataURL(), desc, styles }));
tile("tilesand", "sable", "Dalle de sable", 40, 32, "Une dalle de sable fin, ses ondulations, un coquillage : à poser côte à côte pour faire une plage. On marche dessus, on y pose transats, tables, tout.", SANDS);
tile("tilesandxl", "sable", "Grande dalle de sable", 140, 64, "Quatre dalles de sable d'un coup, pour couvrir vite une grande plage.", SANDS);
tile("tileshore", "rivage", "Dalle de rivage", 60, 32, "Moitié sable, moitié eau, l'écume qui monte et redescend sur le sable mouillé. ↻ pour tourner la côte.", WATERS, 4);
tile("tilepoint", "pointe", "Dalle de pointe", 60, 32, "Un coin de sable qui avance dans l'eau, pour l'angle d'une plage. ↻ pour la tourner.", WATERS, 4);
tile("tilecove", "crique", "Dalle de crique", 60, 32, "Un coin d'eau qui entre dans le sable, pour l'angle intérieur d'une côte. ↻ pour la tourner.", WATERS, 4);
tile("tilesea", "mer", "Dalle de mer", 50, 32, "De l'eau, des vagues qui roulent d'une dalle à l'autre, des reflets de soleil. On peut y poser une bouée, un flamant… ou une table (les pieds dans l'eau).", WATERS);
tile("tileseaxl", "mer", "Grande dalle de mer", 180, 64, "Quatre dalles de mer d'un coup, pour un océan.", WATERS);

/* ---------- lights ---------- */
class Torch extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 150) % 3 }; } }
new Torch(beach({ type: "tikitorch", cat: "lumiere", name: "Torche tiki", price: 160, w: 6, d: 6, rots: 1, art: "isotikitorch", light: 30,
  desc: "Un bambou planté dans le sable, une coupe tressée et sa flamme : l'éclairage des soirées sur la plage. Clic : l'allumer, l'éteindre.", styles: [{ id: "bambou", name: "Bambou", sw: "#c9b06a" }] }));
new Neon(beach({ type: "neonbeach", cat: "neons", shelf: "lumiere", name: "Néon BEACH CLUB", price: 180, kind: "wall", w: 44, h: 20, glow: true,
  art2d: neonArt("wallneonbeach", 44, 20, both(ttext("BEACH CLUB", 26, 13, 7.6), tpath("M4 14A4 4 0 0 1 12 14M3 15.6H13M8 7.6V9M3.6 9.6L4.6 10.6M12.4 9.6L11.4 10.6"))),
  desc: "💡 Lumineux · BEACH CLUB, et un soleil qui se couche sur l'horizon.", styles: NEON([["corail", "Corail", "#ff6a5a"], ["turquoise", "Turquoise", "#3ae8d8"]]).reverse() }));

/* ---------- seats ---------- */
class Seat extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
new Seat(beach({ type: "transat", cat: "chaises", name: "Transat", price: 220, w: 10, d: 16, rots: 4, chair: true, walkable: true, art: "isotransat",
  spots: [{ x: 5, y: 9, face: [0, 1], lift: 4 }], desc: "Une chaise longue pliante en bois, sa toile rayée : pour regarder la mer (ou le backlog) les pieds en éventail.",
  styles: sty([["bleu", "Rayé bleu", "#3a8ad0"], ["rouge", "Rayé rouge", "#e8402a"], ["jaune", "Rayé jaune", "#f0c040"], ["vert", "Rayé vert d'eau", "#5ac8a8"]]) }));
new class extends Seat {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 700) % 4 }; }
}(beach({ type: "hangchair", cat: "fauteuils", act: "read", name: "Fauteuil suspendu en rotin", price: 1300, w: 16, d: 14, rots: 1, art: "isohangchair",
  spots: [{ x: 11, y: 8, face: [0, 1], lift: 14 }],
  desc: "Un œuf de rotin tressé suspendu à son arceau, un gros coussin : il se balance doucement. En salle de repos, les devs viennent y lire.",
  styles: sty([["blanc", "Coussin blanc", "#f4f2ea"], ["corail", "Coussin corail", "#f08a6a"], ["turquoise", "Coussin turquoise", "#3ab8d8"]]) }));

/* ---------- desks ---------- */
new StyledDesk(beach({ type: "desksurf", cat: "bureau", room: "office", workstation: true, name: "Bureau planche de surf", price: 1150, w: 40, d: 14, art: "isodesksurf", seat: [20, 24], surface: { z: 13 },
  desc: "Une longue planche de surf posée sur deux tréteaux, sa dérive, ses bandes de couleur, un autocollant : la place d'un dev (ordinateur et chaise à part).",
  styles: [{ id: "turquoise", name: "Turquoise", sw: "#3ab8d8", c: "#3ab8d8" }, { id: "corail", name: "Corail", sw: "#f08a6a", c: "#f08a6a" }, { id: "jaune", name: "Jaune soleil", sw: "#f0c040", c: "#f0c040" }, { id: "bois", name: "Bois", sw: "#c9a46a", c: "#c9a46a" }] }));
// the lifeguard tower: the chief's desk of the theme; ChiefOS opens there as TROPIC (ui/chiefos.js osSkin); from up
// there he watches the swimmers, the agents in trouble
new class extends ChiefDesk {
  isoState(it, t) { return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 300) % 8, on: now() < (it.whistleUntil || 0) }; }
  pie(it) { return [...super.pie(it), ["watch", "🛟", "Surveiller la baignade"]]; }
  perform(it, id) {
    if (id !== "watch") return super.perform(it, id);
    enqueue("🛟", "Surveiller la baignade", () => chiefVisit(it, () => {
      it.whistleUntil = now() + 3000; sfx("alarm");
      const list = inTrouble();
      if (!list.length) { say(CHIEF_NAME, `Tuuut ! Baignade surveillée : ${working().length} agent${s_(working().length)} à l'eau, personne en difficulté. 🛟`, 4000); crewAdd(CHIEF_NAME, { moral: 2 }); return; }
      toast("SURVEILLANCE 🛟", `${list.length} agent${s_(list.length)} en difficulté`, list.slice(0, 4).map(a => `${a.status === "blocked" ? "⛔ bloqué" : "🌀 tourne en rond"} : ${who(a)}`).join(" · "));
      say(CHIEF_NAME, `TUUUT ! ${list.length} agent${s_(list.length)} à la dérive, je plonge ! 🛟🏊`, 4000); crewAdd(CHIEF_NAME, { ennui: -8 });
    }));
    return true;
  }
}(beach({ type: "chiefdeskguard", chiefDesk: true, osSkin: "tropic", cat: "bureau", name: "Poste du maître-nageur", price: 3200, room: "office", unique: true, w: 34, d: 16, art: "isochiefdeskguard",
  spots: [{ x: 9, y: 22, face: [0, -1] }],
  desc: "Ton poste de chef de plage : la chaise haute du maître-nageur sous son parasol, la croix rouge, la bouée, le drapeau, et un bureau en teck avec ses jumelles. Assis là, ChiefOS s'ouvre en Tropical. Clic : surveiller la baignade (les agents en difficulté).",
  styles: sty([["blanc", "Blanc", "#f4f2ea"], ["rouge", "Rouge secours", "#e8402a"], ["teck", "Teck", "#a0703a"]], "w") }));

/* ---------- the beach club ---------- */
// the pool: a swimmer per agent at work, a flamingo per mission delivered; a dive for whoever is in the room
new class extends Gadget {
  isoState(it, t) { return { n: working().length, gold: delivered(), frame: still() ? 0 : anim(t, 140) % 1000 }; }
}(beach({ type: "pool", cat: "deco", name: "Piscine", price: 2800, w: 40, d: 24, rots: 2, art: "isopool",
  desc: "Un bassin turquoise, ses lignes d'eau, son échelle. Un nageur fait des longueurs par vrai agent au travail, un flamant gonflable flotte par mission livrée. Clic : piquer une tête.",
  styles: [{ id: "turquoise", name: "Turquoise", sw: "#3ab8d8" }],
  actions: [["dive", "🏊", "Piquer une tête", it => {
    const n = working().length, people = others(it.room); sfx("pass");
    say(CHIEF_NAME, pick([`Plouf ! ${n ? `Je fais des longueurs avec les ${n} agent${s_(n)}.` : "L'eau est bonne !"} 🏊`, "Bombe !!! 💦", "Rien de tel qu'une longueur avant la revue de code. 🏊"]), 3500);
    for (const p of [CHIEF_NAME, ...people]) { crewAdd(p, { fatigue: -8, ennui: -10, moral: 3 }); addMoodlet(p, "pool", "🏊", "Une baignade", 4, 60); }
    if (people.length) setTimeout(() => say(pick(people), pick(["Tu m'as tout éclaboussé ! 😂", "J'arrive ! 🏊", "Qui a apporté le flamant ? 🦩"]), 2500), 1000);
  }]] }));
// the sandcastle: a tower per agent whose tests are green; a red CI washes it away
new class extends Gadget {
  isoState(it, t) { return { n: Math.max(1, greenTests()), washed: redCi() > 0 && now() > (it.builtUntil || 0), frame: still() ? 0 : anim(t, 400) % 2 }; }
}(beach({ type: "sandcastle", cat: "deco", name: "Château de sable", price: 300, w: 14, d: 14, rots: 1, art: "isosandcastle",
  desc: "Un château de sable et son drapeau : une tour par agent dont les tests sont verts. Quand une CI passe au rouge, la vague l'emporte. Clic : le reconstruire.",
  styles: [{ id: "sable", name: "Sable", sw: "#e2c88a" }],
  actions: [["build", "🏰", "Reconstruire le château", it => {
    const r = redCi(), g = greenTests(); it.builtUntil = now() + 60000; sfx("commit");
    say(CHIEF_NAME, r ? `Je le reconstruis… mais ${r} CI rouge${s_(r)}, la marée remonte. 🏰🌊` : `${g || 1} tour${s_(g || 1)} : ${g ? `${g} agent${s_(g)} aux tests verts` : "pas encore de tests verts"}. Beau château ! 🏰`, 4000);
    crewAdd(CHIEF_NAME, { ennui: -6 });
  }]] }));
// the swim flag: the colour of the CI of the agents' MRs
new class extends Gadget {
  isoState(it, t) { return { c: FLAGS[flagNow()][0], frame: still() ? 0 : anim(t, 250) % 4 }; }
}(beach({ type: "swimflag", cat: "deco", name: "Drapeau de baignade", price: 450, w: 8, d: 8, rots: 1, art: "isoswimflag",
  desc: "Le mât du poste de secours : drapeau vert quand les CI des MR des agents passent, orange quand l'une tourne encore, rouge quand l'une a cassé. Clic : lire le drapeau.",
  styles: [{ id: "blanc", name: "Mât blanc", sw: "#f4f2ea" }],
  actions: [["read", "🚩", "Lire le drapeau", () => {
    const f = flagNow(), r = redCi(), run = pipes().filter(p => p.ci === "running" || p.ci === "pending").length;
    say(CHIEF_NAME, f === "red" ? `${FLAGS.red[1]} : baignade interdite, ${r} CI cassée${s_(r)} ! 🚩` : f === "orange" ? `${FLAGS.orange[1]} : prudence, ${run} CI en cours. 🚩` : `${FLAGS.green[1]} : baignade autorisée, tout est vert. 🏖️`, 4000);
    sfx(f === "red" ? "fail" : "commit");
  }]] }));
// the tiki bar: a round of cocktails for the room (§ 3 a glass)
new class extends Gadget {
  isoState(it, t) { return { on: now() < (it.shakeUntil || 0), frame: still() ? 0 : anim(t, 140) % 2 }; }
}(beach({ type: "tikibar", cat: "deco", name: "Paillote bar tiki", price: 2200, w: 30, d: 16, rots: 2, art: "isotikibar",
  desc: "Le comptoir de bambou sous son toit de chaume, ses bouteilles, un ananas, des cocktails à ombrelle et trois tabourets. Clic : une tournée de cocktails pour toute la pièce (§ 3 le verre).",
  styles: [{ id: "chaume", name: "Chaume", sw: "#c9a45a" }],
  actions: [["cocktails", "🍹", "Tournée de cocktails", it => {
    const people = others(it.room), cost = 3 * (people.length + 1);
    if (!spend(cost, "Tournée de cocktails")) return;
    it.shakeUntil = now() + 4000; sfx("pass");
    say(CHIEF_NAME, pick(["Piña colada pour tout le monde ! 🍹", "Happy hour au beach club ! 🍹🌴", "Un mojito, et on merge. 🍹"]), 3500);
    for (const n of [CHIEF_NAME, ...people]) { crewAdd(n, { social: 10, ennui: -8, moral: 3 }); addMoodlet(n, "cocktail", "🍹", "Un cocktail au beach club", 4, 60); }
    if (people.length) setTimeout(() => say(pick(people), pick(["Avec une ombrelle, s'il te plaît ! ☂️", "Santé ! 🍹", "Je prends le bleu, c'est quoi ?"]), 2500), 1200);
  }]] }));
// the DJ booth: its equalizer follows the agents at work; a set makes the room dance
new class extends Gadget {
  isoState(it, t) { return { eq: Math.min(1, working().length / 4), on: now() < (it.setUntil || 0), frame: still() ? 0 : anim(t, 130) % 1000 }; }
}(beach({ type: "djbooth", cat: "deco", name: "Platines du DJ", price: 1900, w: 20, d: 12, rots: 4, art: "isodjbooth",
  desc: "Deux platines qui tournent, une table de mixage, le panneau BEACH CLUB. Son égaliseur s'agite au rythme des vrais agents au travail. Clic : lancer un set, toute la pièce danse.",
  styles: [{ id: "noir", name: "Noir", sw: "#1c1c22" }],
  actions: [["set", "🎧", "Lancer un set", it => {
    it.setUntil = now() + 15000; sfx("level");
    const people = others(it.room), n = working().length;
    say(CHIEF_NAME, `${n ? `Un set à ${100 + n * 12} BPM, au rythme des ${n} agent${s_(n)} !` : "Un petit set chill-out, personne ne bosse."} 🎧🔊`, 4000);
    for (const p of [CHIEF_NAME, ...people]) { crewAdd(p, { ennui: -14, social: 6, moral: 3 }); addMoodlet(p, "dj", "🎧", "J'ai dansé au beach club", 4, 90); }
    if (people.length) setTimeout(() => say(pick(people), pick(["Monte le son ! 🔊", "C'est mon morceau !! 💃", "DJ Adrien en résidence ! 🎧"]), 2500), 1200);
  }]] }));
// the hammock between two palms: a nap
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 600) % 4, on: now() < (it.napUntil || 0) }; }
}(beach({ type: "palmhammock", cat: "deco", name: "Hamac entre deux cocotiers", price: 1200, w: 32, d: 12, rots: 2, art: "isopalmhammock",
  desc: "Un hamac rayé tendu entre deux cocotiers qui se balance au vent. Clic : une sieste.",
  styles: [{ id: "cocotier", name: "Cocotiers", sw: "#3f9e4f" }],
  actions: [["nap", "😴", "Faire la sieste", it => {
    it.napUntil = now() + 10000;
    say(CHIEF_NAME, pick(["Réveillez-moi quand la CI est verte… 😴", "Cinq minutes de hamac, pas plus. 🌴", "Le bruit des vagues… zzz"]), 3500);
    crewAdd(CHIEF_NAME, { fatigue: -25 }); addMoodlet(CHIEF_NAME, "hammock", "🌴", "Une sieste dans le hamac", 5, 120); sfx("commit");
  }]] }));
// the parasol: a little sun under it
new class extends Gadget {}(beach({ type: "beachparasol", cat: "deco", name: "Parasol et serviette", price: 380, w: 16, d: 16, rots: 1, art: "isobeachparasol",
  desc: "Un parasol rayé planté dans le sable, une serviette, des tongs. Clic : faire bronzette.",
  styles: sty([["rouge", "Rayé rouge", "#e8402a"], ["bleu", "Rayé bleu", "#3a8ad0"], ["jaune", "Rayé jaune", "#f0c040"], ["vert", "Rayé vert d'eau", "#5ac8a8"]]),
  actions: [["sun", "😎", "Faire bronzette", () => {
    say(CHIEF_NAME, pick(["Indice 50, lunettes de soleil, et les notifications coupées. 😎", "Bronzette méritée. ☀️", "Je reviens dans 10 minutes, promis. 🏖️"]), 3500);
    crewAdd(CHIEF_NAME, { fatigue: -10, moral: 3 }); sfx("commit");
  }]] }));
// the crabs: one per agent whose tests are red, dancing sideways; chasing them puts a bug back where it belongs
new class extends Gadget {
  isoState(it, t) { return { n: now() < (it.chasedUntil || 0) ? 0 : redTests(), frame: still() ? 0 : anim(t, 220) % 1000 }; }
}(beach({ type: "crabs", cat: "deco", name: "Rocher aux crabes", price: 420, w: 16, d: 12, rots: 2, art: "isocrabs",
  desc: "Un rocher, une flaque, du sable. Un crabe en sort par vrai agent dont les tests sont rouges : les bugs, ça pince. Clic : chasser les crabes.",
  styles: [{ id: "rocher", name: "Rocher", sw: "#8a8478" }],
  actions: [["chase", "🦀", "Chasser les crabes", it => {
    const n = redTests(); it.chasedUntil = now() + 8000;
    say(CHIEF_NAME, n ? `Ouille ! ${n} crabe${s_(n)}, ${n} agent${s_(n)} aux tests rouges. Ils reviendront tant que ce n'est pas corrigé. 🦀` : "Pas un crabe : tous les tests sont verts. 🦀", 4000);
    crewAdd(CHIEF_NAME, { ennui: -5 }); sfx(n ? "fail" : "commit");
  }]] }));
// the ice-cream cart: ice creams for the room (§ 2 each)
new class extends Gadget {}(beach({ type: "icecart", cat: "deco", name: "Chariot de glaces", price: 900, w: 16, d: 10, rots: 4, art: "isoicecart",
  desc: "Un chariot sur deux roues sous son auvent rayé, quatre parfums sous la vitre, des cornets. Clic : des glaces pour toute la pièce (§ 2 la boule).",
  styles: sty([["rose", "Rose", "#f48ab0"], ["menthe", "Menthe", "#8ad0a0"], ["citron", "Citron", "#f0d040"]]),
  actions: [["ice", "🍦", "Glaces pour tout le monde", it => {
    const people = others(it.room), cost = 2 * (people.length + 1);
    if (!spend(cost, "Glaces")) return;
    say(CHIEF_NAME, pick(["Vanille, chocolat, fraise, pistache : servez-vous ! 🍦", "Une boule pour chaque test vert ! 🍦", "Glaces offertes par la maison. 🍨"]), 3500); sfx("pass");
    for (const n of [CHIEF_NAME, ...people]) { crewAdd(n, { moral: 4, ennui: -6 }); addMoodlet(n, "icecream", "🍦", "Une glace en terrasse", 3, 45); }
  }]] }));
new class extends Plant {
  isoState(it, t) { return { ...super.isoState(it), frame: still() ? 0 : anim(t, 700) % 4 }; }
}(beach({ type: "monsterabasket", cat: "plantes", name: "Monstera en panier", price: 240, w: 12, d: 12, rots: 1, art: "isomonsterabasket", plant: true,
  desc: "Une monstera aux grandes feuilles découpées dans un panier tressé. Clic : l'arroser.", styles: [{ id: "verte", name: "Verte", sw: "#2f8a3a" }] }));
