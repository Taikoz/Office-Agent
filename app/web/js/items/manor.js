// The haunted manor theme (shop: 🎭 Thèmes → 🦇 Manoir hanté; drawings: svg/isomanor.js): manor walls to compose
// (wainscot and torn damask, a creaking door that swings open when someone comes near, the ancestor's portrait whose
// eyes follow the chief, a pillar with its sconce), a window on a moonlit night, two rugs, a candelabra, a
// jack-o'-lantern, a BOO! neon, a cobweb, a carved chair, a wingback armchair, a séance table (the questions waiting), a
// dark desk, the master's organ (the chief's desk: ChiefOS turns CRYPTE there), a jar of ghosts (one per blocked or
// looping agent), a grandfather clock that strikes the CI's state, a coffin to nap in, a beam of bats that take off
// during the security alarm, a raven that counts the MRs waiting for a review, a carnivorous plant. The chief's vampire
// cape and top hat are in the wardrobe (world/shop.js).

import "../svg/isomanor.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, S, chief, ctx, ents } from "../core/core.js";
import { awaitingReview, isStuck } from "../core/data.js";
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
import { NEON, Neon, WallArt, WallDeco, both, neonArt, tpath, ttext } from "./walldeco.js";
import { StyledDesk } from "./desk.js";
import { ChiefDesk } from "./chiefdesk.js";

const THEME = "manoir";
const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const anim = (t, ms) => Math.floor(t / ms);
const still = () => !!hub.focusMode;
const manor = def => ({ theme: THEME, room: "any", ...def });
const PAPERS = sty([["bordeaux", "Damas bordeaux", "#4a1a2a"], ["vert", "Damas vert bouteille", "#1e3a2a"], ["violet", "Damas violet", "#3a1e4a"], ["noir", "Damas noir", "#24202a"]]);
const DARKWOOD = sty([["ebene", "Ébène", "#2a1c1a"], ["noyer", "Noyer noirci", "#3a2418"], ["acajou", "Acajou", "#4a2018"]], "w");
const others = room => hub.peopleIn(room).filter(n => n !== CHIEF_NAME);
const agents = () => (hub.data?.sessions || []).flatMap(s => (s.agents || []).map(a => ({ a, s })));
// the ghosts: the agents blocked or turning in circles (core/data.js isStuck)
const haunted = () => agents().filter(({ a }) => a.status === "blocked" || isStuck(a)).map(({ a }) => a);
const who = a => a.ticket || a.description || a.type || "un agent";

/* ---------- manor walls ---------- */
class ManorWall extends Colored { isoState(it, t) { return { ...super.isoState(it, t), torn: !hub.styleOf(it).neat }; } }
const wall = (Cls, def) => new Cls(manor({ cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, styles: PAPERS, ...def }));
wall(ManorWall, { type: "manorwall", name: "Mur de manoir", price: 320, art: "isomanorwall",
  desc: "Boiseries sombres en bas, papier damassé déchiré en haut, une corniche, une toile d'araignée dans le coin : aligne-les pour un couloir de manoir." });
// the creaking door: it swings open when someone comes near (the chief, a dev of the room), and closes behind them
const doorOpen = new WeakMap();
const near = (it, x, y) => { const [x0, y0, x1, y1] = hub.footOf(it); return Math.hypot((x0 + x1) / 2 - x, (y0 + y1) / 2 - y) < 34; };  // wide: open before he reaches it
const someoneNear = it => {
  const r = it.room;
  return (chief.room === r && near(it, r === "office" ? chief.x : chief.lx, r === "office" ? chief.y : chief.ly))
    || (r === "office" ? [...ents.values()].some(e => near(it, e.x, e.y)) : [...hub.loungers.values()].some(l => (r === "lounge" ? !l.partyRoom : l.partyRoom === r) && near(it, l.x, l.y)));
};
class CreakyDoor extends Colored {
  isoState(it, t) {
    const was = doorOpen.get(it) || 0, want = someoneNear(it) ? 1 : 0, o = was + (want - was) * 0.14;
    if (want && was < 0.02 && !still()) sfx("door");  // the creak
    doorOpen.set(it, o);
    return { ...super.isoState(it, t), open: still() ? want : o };
  }
}
wall(CreakyDoor, { type: "manordoor", name: "Porte qui grince", price: 700, art: "isomanordoor", walkable: true,
  desc: "Une lourde porte à panneaux, gonds de fer, heurtoir en anneau : elle s'ouvre toute seule quand quelqu'un approche… en grinçant." });
// the ancestor's portrait: his eyes follow the chief across the room, and glow red at night
class PortraitWall extends ManorWall {
  isoState(it, t) {
    const [x0, y0, x1, y1] = hub.footOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, here = chief.room === it.room;
    const x = it.room === "office" ? chief.x : chief.lx, y = it.room === "office" ? chief.y : chief.ly;
    const look = here ? Math.max(-1, Math.min(1, Math.round(((x - cx) - (y - cy)) / 30))) * (it.rot % 2 ? -1 : 1) : 0;  // on screen; a turned wall is drawn mirrored
    return { ...super.isoState(it, t), look, lit: hub.nightLevel?.() > 0 };
  }
}
wall(PortraitWall, { type: "manorportrait", name: "Mur au portrait de l'ancêtre", price: 650, art: "isomanorportrait",
  desc: "Dans un cadre doré, l'arrière-grand-oncle du chef, l'air sévère. Ses yeux te suivent dans la pièce… et rougeoient la nuit." });
class Sconce extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 170) % 3 }; } }
new Sconce(manor({ type: "manorpillar", cat: "cloisons", shelf: "murs", name: "Colonne à bougeoir", price: 380, w: 8, d: 8, rots: 1, art: "isomanorpillar", light: 30,
  desc: "Pour finir un mur ou tourner un angle : une colonne cannelée d'ébène, un bougeoir de fer et sa bougie. Clic : l'allumer, l'éteindre.", styles: [{ id: "ebene", name: "Ébène", sw: "#2a1c1a" }] }));

/* ---------- window, rugs ---------- */
// the window on a moonlit night, whatever the hour: a violet sky, a full moon, a dead tree, bats, a band of mist
class MoonWin extends Win {
  behind(it, t) {
    const g = this.glass, x = (it.x + g.x) * S, y = (it.y + g.y) * S, w = g.w * S, h = g.h * S, s = still() ? 0 : t;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, y + h); sky.addColorStop(0, "#120a24"); sky.addColorStop(1, "#3a2050"); ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    for (let k = 0; k < 18; k++) { const a = Math.sin(k * 71.3) * 43758.5453, b = Math.sin(k * 23.9) * 9631.1; ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(s / 1100 + k)); ctx.fillStyle = "#f4efe2"; ctx.fillRect(x + (a - Math.floor(a)) * w, y + (b - Math.floor(b)) * h * 0.6, 0.5 * S, 0.5 * S); }
    ctx.globalAlpha = 1;
    const mx = x + w * 0.66, my = y + h * 0.34, r = Math.min(w, h) * 0.2, halo = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, r * 2.4);
    halo.addColorStop(0, "rgba(244, 231, 176, 0.35)"); halo.addColorStop(1, "rgba(244, 231, 176, 0)"); ctx.fillStyle = halo; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#f4ecc8"; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(180, 170, 140, 0.45)"; for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.1, 0.35, 0.12]]) { ctx.beginPath(); ctx.arc(mx + dx * r, my + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "#0a0610"; ctx.lineCap = "round";  // the dead tree, from the bottom left
    const branch = (x0, y0, len, ang, wd, depth) => {
      const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (depth) { branch(x1, y1, len * 0.68, ang - 0.5, wd * 0.62, depth - 1); branch(x1, y1, len * 0.6, ang + 0.42, wd * 0.6, depth - 1); }
    };
    branch(x + w * 0.16, y + h, h * 0.36, -Math.PI / 2 + 0.12, 1.6 * S, 4);
    for (let k = 0; k < 3; k++) {  // bats crossing the moon
      const p = ((s / 60 + k * 37) % (w * 1.4)) - w * 0.2, bx = x + p, by = y + h * (0.25 + k * 0.12) + Math.sin(s / 200 + k) * 2 * S, up = Math.floor(s / 140 + k) % 2, bs = 1.4 * S;
      ctx.fillStyle = "#0a0610"; ctx.beginPath(); ctx.moveTo(bx - bs * 2, by + (up ? -bs : 0)); ctx.quadraticCurveTo(bx - bs, by, bx, by + bs * 0.4); ctx.quadraticCurveTo(bx + bs, by, bx + bs * 2, by + (up ? -bs : 0)); ctx.quadraticCurveTo(bx, by + bs * 0.9, bx - bs * 2, by + (up ? -bs : 0)); ctx.fill();
    }
    const mist = ctx.createLinearGradient(x, y + h * 0.7, x, y + h); mist.addColorStop(0, "rgba(200, 190, 220, 0)"); mist.addColorStop(1, "rgba(200, 190, 220, 0.35)"); ctx.fillStyle = mist; ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
    ctx.restore();
  }
}
new MoonWin(manor({ type: "windowmanor", cat: "fenetres", name: "Fenêtre sur la lande", price: 1100, kind: "wall", w: 26, h: 40, glass: { x: 3, y: 3, w: 20, h: 33 },
  art2d: new FrameArt("wallwindowmanor", 26, 40, ({ f = "#2a1c1a" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 40V6Q0 0 6 0H20Q26 0 26 6V40ZM3 36H23V6Q23 3 20 3H6Q3 3 3 6Z"/>`
    + `<rect x="-1" y="36" width="28" height="4" fill="${shade(f, 1.3)}"/><rect x="12.4" y="3" width="1.2" height="33" fill="${f}"/><rect x="3" y="19" width="20" height="1.2" fill="${f}"/>`
    + `<path fill="none" stroke="#e8e4f0" stroke-opacity=".5" stroke-width=".25" d="M3 3L9 3M3 3L3 9M3 3L8 8M5.4 3Q5.4 5.4 3 5.4M7.4 3Q7.4 7.4 3 7.4"/>`
    + `<path fill="#ffffff" fill-opacity=".12" d="M5 6h3l-3 4z"/>`),
  desc: "Une haute fenêtre à meneaux, une toile d'araignée dans le coin. Derrière la vitre, toujours la nuit : la pleine lune, un arbre mort, des chauves-souris, la brume.",
  styles: sty([["ebene", "Ébène", "#2a1c1a", { f: "#2a1c1a" }], ["fer", "Fer forgé", "#2e2e36", { f: "#2e2e36" }], ["gris", "Bois gris", "#5a5660", { f: "#5a5660" }]]) }));
const RUG_DARK = [{ id: "bordeaux", name: "Bordeaux", sw: "#4a1a2a" }, { id: "violet", name: "Violet", sw: "#2e1a3a" }, { id: "noir", name: "Noir", sw: "#1c1820" }];
new Item(manor({ type: "rugweb", cat: "tapis", kind: "rug", shape: "toile", name: "Tapis toile d'araignée", price: 480, w: 48, d: 48, desc: "Une grande toile d'argent tissée sur fond sombre, et son araignée au milieu.", styles: RUG_DARK }));
new Item(manor({ type: "rugworn", cat: "tapis", kind: "rug", shape: "elime", name: "Tapis persan élimé", price: 380, w: 64, d: 40, desc: "Un vieux tapis d'Orient, mité, troué, les franges en bataille : il en a vu passer, des fantômes.", styles: RUG_DARK }));

/* ---------- lights ---------- */
class Flicker extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 190) % 3, c: hub.styleOf(it).c }; } }
new Flicker(manor({ type: "candelabra", cat: "lumiere", name: "Candélabre", price: 360, w: 8, d: 8, rots: 1, art: "isocandelabra", light: 34,
  desc: "Un grand chandelier de fer forgé, trois bougies qui coulent. Clic : l'allumer, l'éteindre.", styles: [{ id: "fer", name: "Fer forgé", sw: "#2e2e36" }] }));
new Flicker(manor({ type: "pumpkin", cat: "lumiere", name: "Citrouille lanterne", price: 140, w: 8, d: 8, rots: 1, art: "isopumpkin", light: 22,
  desc: "Une citrouille sculptée, une bougie dedans : elle grimace dans le noir. Clic : l'allumer, l'éteindre.",
  styles: sty([["orange", "Orange", "#e8761c"], ["blanche", "Blanche", "#e8e0c8"], ["verte", "Verte", "#6a8a3a"]]) }));
new Neon(manor({ type: "neonboo", cat: "neons", shelf: "lumiere", name: "Néon BOO!", price: 150, kind: "wall", w: 34, h: 16, glow: true,
  art2d: neonArt("wallneonboo", 34, 16, both(ttext("BOO!", 15, 11.6, 9.5), tpath("M28.5 4.5Q31 3 32.5 5.5Q31 5 30.4 6.4Q29.6 5.4 28.5 4.5Z"))), desc: "💡 Lumineux · BOO!, et une petite chauve-souris.",
  styles: NEON([["citrouille", "Citrouille", "#ff8a1c"], ["spectre", "Vert spectral", "#7dffb0"]]).reverse() }));
// a cobweb for a corner of the wall: its spider goes down its thread and back up (frame)
class Cobweb extends WallDeco { state(it, t) { return still() ? 0 : anim(t, 400) % 12; } thumbState() { return 3; } }
new Cobweb(manor({ type: "cobweb", cat: "cadres", name: "Toile d'araignée", price: 60, kind: "wall", w: 16, h: 22,
  art2d: new WallArt("wallcobweb", 16, 22, ({ on: f = 0 }) => {
    const spokes = [0, 0.32, 0.64, 0.96, 1.28, 1.57].map(a => [Math.cos(a) * 15, Math.sin(a) * 15]);
    let g = spokes.map(([x, y]) => `<path stroke="#e8e4f0" stroke-opacity=".7" stroke-width=".25" d="M0 0L${x.toFixed(2)} ${y.toFixed(2)}"/>`).join("");
    for (const k of [0.25, 0.45, 0.65, 0.85]) g += `<path fill="none" stroke="#e8e4f0" stroke-opacity=".6" stroke-width=".2" d="M${spokes.map(([x, y]) => `${(x * k).toFixed(2)} ${(y * k).toFixed(2)}`).join("L")}"/>`;
    const d = 6 + [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1][f || 0] * 1.6;
    return g + `<path stroke="#e8e4f0" stroke-opacity=".7" stroke-width=".2" d="M8 4V${d}"/><ellipse cx="8" cy="${d + 1}" rx="1.2" ry="1.4" fill="#1c1420"/><circle cx="8" cy="${d - 0.3}" r=".7" fill="#1c1420"/>`
      + [-1, 1].map(s => `<path fill="none" stroke="#1c1420" stroke-width=".3" d="M8 ${d + 0.6}l${s * 1.8} -1 M8 ${d + 1.2}l${s * 2} .2 M8 ${d + 1.8}l${s * 1.6} 1.2"/>`).join("");
  }, { outline: 0, pad: 1 }),
  desc: "Une toile d'araignée pour un coin du mur ; son araignée descend au bout de son fil, puis remonte.", styles: [{ id: "argent", name: "Fil d'argent", sw: "#e8e4f0" }] }));

/* ---------- seats ---------- */
class Seat extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
new Seat(manor({ type: "chairmanor", cat: "chaises", name: "Chaise sculptée", price: 440, w: 12, d: 11, chair: true, walkable: true, thumbArt: "isocmanorfull",
  parts: [{ art: "isocmanorback", rect: [0, 0, 12, 2] }, { art: "isocmanor", rect: [0, 1, 12, 10] }], spots: [{ x: 6, y: 6, face: [0, 1], lift: 3 }],
  desc: "Haut dossier d'ébène en pointe, pommeaux dorés, losange d'or, assise de velours : pour dîner avec les ancêtres.",
  styles: sty([["sang", "Velours sang", "#8f1f2a"], ["nuit", "Velours nuit", "#22233a"], ["mousse", "Velours mousse", "#2a4a2a"]]) }));
new Seat(manor({ type: "wingback", cat: "fauteuils", act: "read", name: "Fauteuil à oreilles", price: 1500, w: 18, d: 14, thumbArt: "isowingfull",
  parts: [{ art: "isowingback", rect: [0, 0, 18, 6] }, { art: "isowing", rect: [0, 6, 18, 8] }], spots: [{ x: 9, y: 9, face: [0, 1], lift: 6 }],
  desc: "Un grand fauteuil à oreilles en velours capitonné, clous de laiton, pieds griffus : pour lire Poe au coin du feu. En salle de repos, les devs viennent y lire.",
  styles: sty([["vert", "Velours vert", "#2a3a2a"], ["bordeaux", "Velours bordeaux", "#5a1a24"], ["prune", "Velours prune", "#3a1e3a"]]) }));

/* ---------- tables, desks ---------- */
// the séance table: the spirits spell out the questions the agents are waiting on
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 600) % 6, on: now() < (it.seanceUntil || 0) }; }
}(manor({ type: "seance", cat: "tables", name: "Table de spiritisme", price: 1200, w: 20, d: 20, rots: 1, art: "isoseance", surface: { z: 12 },
  desc: "Un guéridon drapé de velours, une planche de spiritisme, sa goutte qui glisse toute seule, deux bougies. Clic : une séance ; les esprits épellent les questions des agents qui t'attendent.",
  styles: sty([["violet", "Velours violet", "#3a1a4a"], ["sang", "Velours sang", "#5a1a24"], ["noir", "Velours noir", "#1c1820"]]),
  actions: [["seance", "🕯️", "Faire une séance", it => {
    it.seanceUntil = now() + 9000;
    const qs = hub.data?.questions || [], people = others(it.room);
    say(CHIEF_NAME, "Esprits… êtes-vous là ? 🕯️", 2500); sfx("door");
    setTimeout(() => {
      if (qs.length) { toast("SÉANCE 🕯️", `${qs.length} question${qs.length > 1 ? "s" : ""} d'outre-tombe`, "Les agents t'attendent : ouvre ChiefOS → Questions."); say(CHIEF_NAME, `Q… U… E… S… T… I… O… N… ${qs.length} agent${qs.length > 1 ? "s" : ""} m'appelle${qs.length > 1 ? "nt" : ""} ! 👻`, 4000); }
      else say(CHIEF_NAME, "La goutte glisse vers… « AU REVOIR ». Personne ne t'attend. 👻", 4000);
      for (const n of [CHIEF_NAME, ...people]) { crewAdd(n, { social: 8, ennui: -8 }); addMoodlet(n, "seance", "🕯️", "Une séance de spiritisme", 4, 60); }
      if (people.length) setTimeout(() => say(pick(people), pick(["J'ai senti un courant d'air… 😨", "C'est toi qui pousses la goutte ! 😂", "Je dors avec la lumière ce soir. 🕯️"]), 3000), 1200);
    }, 2600);
  }]] }));
new StyledDesk(manor({ type: "deskmanor", cat: "bureau", room: "office", workstation: true, name: "Bureau d'outre-tombe", price: 1300, w: 40, d: 14, art: "isodeskmanor", seat: [20, 24], surface: { z: 13.4 },
  desc: "Caissons sombres à poignées de laiton, sous-main de cuir, un bougeoir, un crâne, l'encrier et sa plume, une toile d'araignée dessous. La place d'un dev (ordinateur et chaise à part).",
  styles: [{ id: "ebene", name: "Ébène, cuir sang", sw: "#2a1c1a", w: "#2a1c1a", leather: "#8f1f2a" }, { id: "noyer", name: "Noyer noirci, cuir vert", sw: "#3a2418", w: "#3a2418", leather: "#1f3a2a" },
    { id: "acajou", name: "Acajou, cuir noir", sw: "#4a2018", w: "#4a2018", leather: "#1c1820" }] }));
// the master's organ: the chief's desk of the theme; ChiefOS opens there as a crypt (ui/chiefos.js osSkin); he can play
new class extends ChiefDesk {
  isoState(it, t) { return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 300) % 8, on: now() < (it.playUntil || 0) }; }
  pie(it) { return [...super.pie(it), ["organ", "🎹", "Jouer la toccata"]]; }
  perform(it, id) {
    if (id !== "organ") return super.perform(it, id);
    enqueue("🎹", "Jouer la toccata", () => chiefVisit(it, () => {
      it.playUntil = now() + 8000; sfx("achievement");
      say(CHIEF_NAME, pick(["Taaa-da-daaa… da-da-da-da-daaa ! 🎹🦇", "Une toccata en ré mineur, pour la release de ce soir. 🎹", "Fugue en CI majeur. 🎹"]), 4000);
      crewAdd(CHIEF_NAME, { ennui: -12, moral: 3 }); addMoodlet(CHIEF_NAME, "organ", "🎹", "Une toccata à l'orgue", 4, 60);
      const people = others(it.room); if (people.length) setTimeout(() => say(pick(people), pick(["Brrr, j'ai des frissons ! 😱", "Bravo maestro ! 👏", "C'est l'heure du bal des vampires ? 🦇"]), 3000), 1500);
    }));
    return true;
  }
}(manor({ type: "chiefdeskorgan", chiefDesk: true, osSkin: "crypte", cat: "bureau", name: "Orgue du maître des lieux", price: 3200, room: "office", unique: true, w: 34, d: 16, art: "isochiefdeskorgan",
  spots: [{ x: 17, y: 24, face: [0, -1] }],
  desc: "Ton bureau de maître du manoir : un orgue à tuyaux de laiton, deux claviers, des tirettes, un pupitre, deux candélabres. Assis là, ChiefOS s'ouvre en Crypte. Clic : jouer la toccata.",
  styles: sty([["ebene", "Ébène", "#2a1c1a"], ["noyer", "Noyer noirci", "#3a2418"], ["acajou", "Acajou", "#4a2018"]], "w") }));

/* ---------- haunted things ---------- */
// the jar of ghosts: one ghost per agent blocked or turning in circles, live
new class extends Gadget {
  isoState(it, t) { return { n: haunted().length, frame: still() ? 0 : anim(t, 250) % 8 }; }
}(manor({ type: "ghostjar", cat: "deco", name: "Bocal à fantômes", price: 900, w: 8, d: 8, rots: 1, art: "isoghostjar",
  desc: "Un bocal de verre sur un socle sculpté. Il contient un petit fantôme par vrai agent bloqué ou qui tourne en rond. Clic : écouter ce qu'ils murmurent.",
  styles: [{ id: "verre", name: "Verre", sw: "#cfe6ff" }],
  actions: [["listen", "👻", "Écouter les fantômes", () => {
    const list = haunted();
    if (!list.length) { say(CHIEF_NAME, "Le bocal est vide : aucun agent bloqué. Pour l'instant… 👻", 3500); sfx("commit"); return; }
    toast("BOCAL 👻", `${list.length} âme${list.length > 1 ? "s" : ""} en peine`, list.slice(0, 4).map(a => `${a.status === "blocked" ? "⛔ bloqué" : "🌀 tourne en rond"} : ${who(a)}`).join(" · "));
    say(CHIEF_NAME, `Ouuuh… ${list.length} agent${list.length > 1 ? "s" : ""} hante${list.length > 1 ? "nt" : ""} le manoir. Il faut ${list.length > 1 ? "les" : "le"} délivrer ! 👻`, 4000); sfx("fail");
  }]] }));
// the grandfather clock: the real time; it strikes the CI's state of the agents' MRs (agents/ticket.js pipeOf)
new class extends Gadget {
  isoState(it, t) { const d = clockNow(); return { w: hub.styleOf(it).w, h: d.getHours(), m: d.getMinutes(), frame: still() ? 0 : anim(t, 250) % 8 }; }
}(manor({ type: "grandclock", cat: "deco", name: "Horloge comtoise", price: 1100, w: 10, d: 8, rots: 4, art: "isograndclock",
  desc: "Une haute horloge de parquet, son cadran de lune, son balancier de laiton qui bat : l'heure exacte. Clic : sonner les coups, et l'état des CI des MR des agents.",
  styles: DARKWOOD,
  actions: [["strike", "🕰️", "Sonner les coups", () => {
    const h = clockNow().getHours() % 12 || 12, pipes = Object.values(hub.data?.pipelines || {}).filter(p => p && p.state !== "merged");
    const red = pipes.filter(p => p.ci === "failed").length, run = pipes.filter(p => p.ci === "running" || p.ci === "pending").length, green = pipes.filter(p => p.ci === "success").length;
    say(CHIEF_NAME, `${"DONG… ".repeat(Math.min(h, 3))}${h > 3 ? `(${h} coups) ` : ""}🕰️`, 3000); sfx("commit");
    setTimeout(() => say(CHIEF_NAME, pipes.length ? `Les CI : ${red} rouge${red > 1 ? "s" : ""}, ${run} en cours, ${green} verte${green > 1 ? "s" : ""}.${red ? " Les morts se réveillent… 💀" : " Tout est calme. 🌙"}` : "Aucune CI à sonner : pas de MR ouverte. 🌙", 4500), 2400);
  }]] }));
// the coffin: a nap, the lid closed (the best rest of the manor)
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, open: now() < (it.napUntil || 0) ? 1 : 0.15 }; }
}(manor({ type: "coffin", cat: "deco", name: "Cercueil", price: 1300, w: 24, d: 10, rots: 4, art: "isocoffin",
  desc: "Un cercueil d'ébène capitonné de satin rouge, poignées de laiton. Clic : une sieste de vampire, jusqu'à la tombée de la nuit.",
  styles: DARKWOOD,
  actions: [["nap", "⚰️", "Faire une sieste de vampire", it => {
    it.napUntil = now() + 6000;
    say(CHIEF_NAME, pick(["Ne me réveillez qu'à la nuit tombée… ⚰️😴", "Une petite sieste de mille ans. ⚰️", "Si un agent m'appelle, dites que je suis mort. ⚰️"]), 3500);
    crewAdd(CHIEF_NAME, { fatigue: -30 }); addMoodlet(CHIEF_NAME, "coffin", "⚰️", "Reposé comme un vampire", 5, 120); sfx("door");
  }]] }));
// the bats: asleep upside down under their beam; they take off during the security alarm (agents/events2.js), or when
// woken up
new class extends Gadget {
  isoState(it, t) { const al = hub.alarm, fly = (al && performance.now() < al.until) || now() < (it.flyUntil || 0); return { w: hub.styleOf(it).w, fly, frame: still() ? 0 : fly ? anim(t, 140) % 16 : anim(t, 700) % 4 }; }
}(manor({ type: "batroost", cat: "deco", name: "Poutre aux chauves-souris", price: 850, w: 16, d: 6, rots: 2, art: "isobatroost",
  desc: "Une vieille poutre sur deux poteaux, cinq chauves-souris qui dorment la tête en bas. Pendant l'alarme sécurité, elles s'envolent en tourbillon. Clic : les réveiller.",
  styles: DARKWOOD,
  actions: [["wake", "🦇", "Réveiller les chauves-souris", it => {
    it.flyUntil = now() + 6000; say(CHIEF_NAME, "Debout là-dedans ! 🦇🦇🦇", 2500); crewAdd(CHIEF_NAME, { ennui: -6 }); sfx("achievement");
    const people = others(it.room); if (people.length) setTimeout(() => say(pick(people), pick(["AAAAH ! Dans mes cheveux ! 😱", "Elles sont mignonnes en fait. 🦇", "Fermez la fenêtre !!"]), 2500), 800);
  }]] }));
// the raven on its bust: « Nevermore »… and the MRs no reviewer has looked at yet (core/data.js awaitingReview)
const NEVER = ["Jamais plus… de push --force sur main.", "Jamais plus… de « ça marche sur ma machine ».", "Jamais plus… de migration le vendredi soir.", "Jamais plus… de TODO sans ticket."];
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 500) % 6, talk: now() < (it.talkUntil || 0) && anim(t, 180) % 2 === 0 }; }
}(manor({ type: "raven", cat: "deco", name: "Corbeau sur son buste", price: 700, w: 8, d: 8, rots: 1, art: "isoraven",
  desc: "Un buste pâle sur sa colonne de marbre, un corbeau perché dessus qui penche la tête. Clic : il croasse les MR qui attendent encore une review.",
  styles: [{ id: "marbre", name: "Marbre", sw: "#d9d4c8" }],
  actions: [["croak", "🐦‍⬛", "Écouter le corbeau", it => {
    it.talkUntil = now() + 3000;
    const n = agents().filter(({ a, s }) => awaitingReview(a, s)).length;
    say(CHIEF_NAME, n ? `« Croâ ! ${n} MR attend${n > 1 ? "ent" : ""} une review. Jamais plus de MR orpheline ! » 🐦‍⬛` : `« Croâ ! ${pick(NEVER)} » 🐦‍⬛`, 4500);
    crewAdd(CHIEF_NAME, { ennui: -4 }); sfx("commit");
  }]] }));
new class extends Plant {
  isoState(it, t) { return { ...super.isoState(it), frame: still() ? 0 : anim(t, 450) % 4 }; }
}(manor({ type: "carnivore", cat: "plantes", name: "Plante carnivore", price: 320, w: 10, d: 10, rots: 1, art: "isocarnivore", plant: true,
  desc: "Trois pièges à dents qui claquent dans le vide, dans un pot noir. Elle mange les bugs (paraît-il). Clic : l'arroser.", styles: [{ id: "dionee", name: "Dionée", sw: "#4a8a3a" }] }));
