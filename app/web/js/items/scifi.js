// The sci-fi theme (shop: 🎭 Thèmes → 🚀 Station spatiale; drawings: svg/isoscifi.js): hull walls to compose (plated,
// a sliding door that opens when someone comes near, a porthole on the stars, an energy pillar), an observation bay
// on deep space, two rugs, a plasma lamp, a light column, a circuit neon, a pilot seat, a capsule chair, a holographic
// table, a command desk, the chief's holographic command post (ChiefOS turns HOLO there), computers of the future, a
// robot that reports on the real agents, teleporters (between two rooms), a cryo pod, a fusion reactor, a delivery
// drone, an alien plant. The chief's spacesuit, helmet, visor and jetpack are in the wardrobe (world/shop.js).

import "../svg/isoscifi.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, S, chief, ctx, ents } from "../core/core.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { shade } from "../svg/base.js";
import { GAME_OF } from "../ui/pcgames.js";
import { Item } from "./base.js";
import { Colored, Computer } from "./furniture.js";
import { Gadget } from "./gadgets.js";
import { Lamp } from "./lamp.js";
import { Plant } from "./plant.js";
import { FrameArt, Win } from "./catalog2.js";
import { NEON, Neon, neonArt, tpath } from "./walldeco.js";
import { StyledDesk } from "./desk.js";
import { ChiefDesk } from "./chiefdesk.js";

const THEME = "scifi";
const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const anim = (t, ms) => Math.floor(t / ms);
const still = () => !!hub.focusMode;
const sci = def => ({ theme: THEME, room: "any", ...def });
const HULL = sty([["acier", "Acier", "#9aa6b4"], ["blanc", "Blanc station", "#dfe4ea"], ["sombre", "Titane sombre", "#4a5562"], ["cuivre", "Cuivre oxydé", "#7a8a7a"]]);
const others = room => hub.peopleIn(room).filter(n => n !== CHIEF_NAME);

/* ---------- hull walls ---------- */
class Hull extends Colored { isoState(it, t) { return { ...super.isoState(it, t), lit: true, frame: still() ? 0 : anim(t, 500) % 5 }; } }
const hull = def => new Hull(sci({ cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, styles: HULL, ...def }));
hull({ type: "hullwall", name: "Cloison de vaisseau", price: 320, art: "isohullwall",
  desc: "Des plaques rivetées, une grille d'aération, une bande lumineuse : aligne-les pour faire une coursive, un pont, une cabine." });
hull({ type: "hullport", name: "Cloison à hublot", price: 600, art: "isohullport",
  desc: "Un hublot rond sur les étoiles et une planète à anneaux ; les étoiles scintillent." });
// the sliding door: it opens when someone comes near (the chief, a dev of the room), and closes behind them
const doorOpen = new WeakMap();
const near = (it, x, y) => { const [x0, y0, x1, y1] = hub.footOf(it); return Math.hypot((x0 + x1) / 2 - x, (y0 + y1) / 2 - y) < 34; };  // wide: open before he reaches it
class SlidingDoor extends Hull {
  isoState(it, t) {
    const r = it.room, someone = (chief.room === r && near(it, r === "office" ? chief.x : chief.lx, r === "office" ? chief.y : chief.ly))
      || (r === "office" ? [...ents.values()].some(e => near(it, e.x, e.y)) : [...hub.loungers.values()].some(l => (r === "lounge" ? !l.partyRoom : l.partyRoom === r) && near(it, l.x, l.y)));
    const o = (doorOpen.get(it) || 0) + ((someone ? 1 : 0) - (doorOpen.get(it) || 0)) * 0.12; doorOpen.set(it, o);
    return { ...super.isoState(it, t), open: still() ? (someone ? 1 : 0) : o };
  }
}
new SlidingDoor(sci({ type: "hulldoor", cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, styles: HULL, name: "Porte coulissante", price: 750, art: "isohulldoor", walkable: true,
  desc: "Une porte automatique à deux battants, bordée de rayures de sécurité : elle s'ouvre toute seule quand quelqu'un approche. Pchhht." }));
class Pulse extends Lamp { isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 180) % 4 }; } }
new Pulse(sci({ type: "techpillar", cat: "cloisons", shelf: "murs", name: "Pilier énergétique", price: 520, w: 8, d: 8, rots: 1, art: "isotechpillar", light: 36,
  desc: "Pour finir une cloison ou tourner un angle : un pilier de plaques, des câbles, un cœur d'énergie qui pulse. Clic : l'allumer, l'éteindre.", styles: HULL }));

/* ---------- window, rugs ---------- */
// the observation bay: deep space behind the glass instead of the sky (stars that twinkle, a ringed planet, a comet)
class SpaceWin extends Win {
  behind(it, t) {
    const g = this.glass, x = (it.x + g.x) * S, y = (it.y + g.y) * S, w = g.w * S, h = g.h * S;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, y + h); sky.addColorStop(0, "#02040e"); sky.addColorStop(1, "#0a1636"); ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    for (let k = 0; k < 46; k++) { const a = Math.sin(k * 91.7) * 43758.5453, b = Math.sin(k * 17.3) * 9631.1, fx = a - Math.floor(a), fy = b - Math.floor(b);
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t / 900 + k)); ctx.fillStyle = k % 9 ? "#f4f8ff" : "#9fdcff"; const s = (k % 7 ? 0.5 : 0.9) * S; ctx.fillRect(x + fx * w, y + fy * h, s, s); }
    ctx.globalAlpha = 1;
    const px = x + w * 0.7, py = y + h * 0.58, r = Math.min(w, h) * 0.24, pl = ctx.createRadialGradient(px - r * 0.4, py - r * 0.4, r * 0.1, px, py, r);
    pl.addColorStop(0, "#f2b07a"); pl.addColorStop(1, "#7a2f2a"); ctx.fillStyle = pl; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#f4e7b0"; ctx.globalAlpha = 0.6; ctx.lineWidth = 0.5 * S; ctx.beginPath(); ctx.ellipse(px, py, r * 1.7, r * 0.35, -0.3, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    const c = (t / 40) % (w * 1.6); ctx.fillStyle = "#ffffff"; ctx.fillRect(x + c - w * 0.3, y + h * 0.2 + c * 0.15, 1.2 * S, 0.6 * S);
    ctx.globalAlpha = 0.3; ctx.fillRect(x + c - w * 0.3 - 4 * S, y + h * 0.2 + c * 0.15 - 0.6 * S, 4 * S, 0.4 * S); ctx.globalAlpha = 1;
    ctx.restore();
  }
}
new SpaceWin(sci({ type: "windowspace", cat: "fenetres", name: "Baie d'observation", price: 1400, kind: "wall", w: 60, h: 34, glass: { x: 4, y: 4, w: 52, h: 26 },
  art2d: new FrameArt("wallwindowspace", 60, 34, ({ f = "#9aa6b4" }) => `<path fill-rule="evenodd" fill="${f}" d="M6 0H54L60 6V28L54 34H6L0 28V6ZM8 4H52L56 8V26L52 30H8L4 26V8Z"/>`
    + `<path fill="${shade(f, 0.7)}" d="M0 28L6 34H54L60 28V30L54 36H6L0 30Z"/>` + [[3, 3], [57, 3], [3, 31], [57, 31], [30, 2], [30, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" fill="${shade(f, 0.55)}"/>`).join("")
    + `<rect x="4" y="15" width="52" height=".8" fill="${f}" fill-opacity=".6"/><rect x="29.6" y="4" width=".8" height="26" fill="${f}" fill-opacity=".6"/><path fill="#ffffff" fill-opacity=".12" d="M9 6h8l-9 9v-5z"/>`),
  desc: "Une large baie aux coins coupés : derrière la vitre, l'espace profond, une planète à anneaux, une comète qui passe.", styles: sty([["acier", "Acier", "#9aa6b4", { f: "#9aa6b4" }], ["blanc", "Blanc", "#dfe4ea", { f: "#dfe4ea" }], ["noir", "Noir", "#2a3340", { f: "#2a3340" }]]) }));
const RUG_SCI = [{ id: "nuit", name: "Nuit", sw: "#0a1a2a" }, { id: "anthracite", name: "Anthracite", sw: "#1c222c" }, { id: "violet", name: "Violet", sw: "#1e1430" }];
new Item(sci({ type: "rugholo", cat: "tapis", kind: "rug", shape: "grille", name: "Tapis à grille lumineuse", price: 520, w: 64, d: 44, desc: "Un sol de simulateur : une grille cyan, des nœuds qui brillent.", styles: RUG_SCI }));
new Item(sci({ type: "rughexa", cat: "tapis", kind: "rug", shape: "hexa", name: "Tapis hexagonal", price: 460, w: 56, d: 40, desc: "Des alvéoles hexagonales, quelques-unes allumées.", styles: RUG_SCI }));

/* ---------- lights ---------- */
new Pulse(sci({ type: "plasmalamp", cat: "lumiere", name: "Lampe à plasma", price: 260, w: 8, d: 8, rots: 1, art: "isoplasmalamp", light: 26,
  desc: "Une boule de verre où dansent des éclairs roses et violets. Clic : l'allumer, l'éteindre.", styles: [{ id: "plasma", name: "Plasma", sw: "#ff3df2" }] }));
new Pulse(sci({ type: "lightcolumn", cat: "lumiere", name: "Colonne lumineuse", price: 340, w: 6, d: 6, rots: 1, art: "isolightcolumn", light: 34,
  desc: "Un tube de lumière vertical sur un pied d'acier.", styles: sty([["cyan", "Cyan", "#00e5ff"], ["magenta", "Magenta", "#ff3df2"], ["ambre", "Ambre", "#ffb03b"], ["vert", "Vert", "#4dff88"]]) }));
new Neon(sci({ type: "neoncircuit", cat: "neons", shelf: "lumiere", name: "Néon circuit", price: 170, kind: "wall", w: 30, h: 18, glow: true,
  art2d: neonArt("wallneoncircuit", 30, 18, tpath("M2 9H8L11 4H18L21 9H28M11 4V2M18 4V2M8 9L11 14H19L21 9M14 14V16.5M5 9V12.5H2M25 9V5.5H28")), desc: "💡 Lumineux · Les pistes d'un circuit imprimé.", styles: NEON() }));

/* ---------- seats ---------- */
class Seat extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
new Seat(sci({ type: "chairpilot", cat: "chaises", name: "Siège de pilote", price: 680, w: 12, d: 11, chair: true, walkable: true, thumbArt: "isocpilotfull",
  parts: [{ art: "isocpilotback", rect: [0, 0, 12, 2] }, { art: "isocpilot", rect: [0, 1, 12, 10] }], spots: [{ x: 6, y: 6, face: [0, 1], lift: 5 }],
  desc: "Coque rembourrée, appui-tête, accoudoirs à pavés tactiles, liserés lumineux : prêt pour le saut en hyperespace.",
  styles: sty([["noir", "Noir", "#1c2430"], ["blanc", "Blanc", "#c9d2dc"], ["rouge", "Rouge", "#7a1f2a"], ["bleu", "Bleu", "#1d3a6a"]]) }));
new Seat(sci({ type: "capsulechair", cat: "fauteuils", act: "read", name: "Fauteuil capsule", price: 1600, w: 18, d: 16, thumbArt: "isocapsulefull",
  parts: [{ art: "isocapsuleback", rect: [0, 0, 18, 8] }, { art: "isocapsule", rect: [0, 8, 18, 8] }], spots: [{ x: 9, y: 10, face: [0, 1], lift: 7 }],
  desc: "Un œuf blanc ouvert vers l'avant, l'intérieur éclairé : on s'y isole pour lire. En salle de repos, les devs viennent s'y poser.",
  styles: sty([["blanc", "Blanc", "#e6e8ee"], ["noir", "Noir", "#2a3340"], ["orange", "Orange", "#e8843c"]]) }));

/* ---------- tables, desks ---------- */
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 160) % 12, on: true }; }
}(sci({ type: "holotable", cat: "tables", name: "Table holographique", price: 2200, w: 24, d: 24, rots: 1, art: "isoholotable",
  desc: "Une table hexagonale ; au-dessus, un globe holographique qui tourne. Clic : projeter l'état des agents.",
  styles: sty([["anthracite", "Anthracite", "#2a3340"], ["blanc", "Blanc", "#c9d2dc"]]),
  actions: [["map", "🌐", "Projeter l'état des agents", () => {
    const a = (hub.data?.sessions || []).flatMap(s => s.agents || []), n = st => a.filter(x => x.status === st).length;
    say(CHIEF_NAME, a.length ? `Projection : ${n("working")} en mission, ${n("blocked")} bloqué(s), ${n("done")} livré(s). 🌐` : "Projection : aucun agent dans le secteur. 🌐", 4500);
    crewAdd(CHIEF_NAME, { ennui: -4 }); sfx("commit");
  }]] }));
new StyledDesk(sci({ type: "deskcommand", cat: "bureau", room: "office", workstation: true, name: "Bureau de commandement", price: 1200, w: 40, d: 14, art: "isodeskcommand", seat: [20, 24], surface: { z: 13.4 },
  desc: "Plateau blanc lisse, caissons sombres, bande lumineuse le long du bord. La place d'un dev (ordinateur et chaise à part).",
  styles: [{ id: "cyan", name: "Blanc, lumière cyan", sw: "#00e5ff", c: "#e6e8ee", led: "#00e5ff" }, { id: "magenta", name: "Blanc, lumière magenta", sw: "#ff3df2", c: "#e6e8ee", led: "#ff3df2" },
    { id: "noir", name: "Noir, lumière ambre", sw: "#ffb03b", c: "#2a3340", led: "#ffb03b" }] }));
new class extends ChiefDesk {
  isoState(_it, t) { return { frame: still() ? 0 : anim(t, 700) % 6 }; }
}(sci({ type: "chiefdeskholo", chiefDesk: true, osSkin: "holo", cat: "bureau", name: "Poste de commandement holographique", price: 3200, room: "office", unique: true, w: 34, d: 16, art: "isochiefdeskholo",
  spots: [{ x: 17, y: 24, face: [0, -1] }], desc: "Ton poste de commandement : une console courbe, un clavier lumineux, trois écrans holographiques. Dessus, ChiefOS passe en HOLO.",
  styles: [{ id: "noir", name: "Noir", sw: "#1a222c" }] }));

/* ---------- computers of the future: on a desk, they show the dev's work, tinted (items/furniture.js) ---------- */
const pc = (type, name, price, w, d, art, screens, desc, styles, game) => {
  new Computer(sci({ type, cat: "electronique", name, price, kind: "top", w, d, art, rots: 4, screens, desc: `${desc} Se pose sur un bureau ; l'écran montre le travail du dev.`, styles }));
  GAME_OF[type] = game;
};
pc("pcholo", "Ordinateur holographique", 2200, 20, 9, "isopcholo", [{ x: 2.4, y: 5, z: 6.4, w: 15.2, h: 8.2 }], "Une barre émettrice, un clavier de lumière, un écran qui flotte dans l'air, transparent.",
  sty([["cyan", "Hologramme cyan", "#00e5ff", { c: "#00e5ff", tint: "#00e5ff" }], ["magenta", "Hologramme magenta", "#ff3df2", { c: "#ff3df2", tint: "#ff3df2" }], ["vert", "Hologramme vert", "#4dff88", { c: "#4dff88", tint: "#4dff88" }]]), "invaders");
pc("pcquantum", "Terminal quantique", 2800, 22, 9, "isopcquantum", [{ x: 1.4, y: 3.4, z: 4.4, w: 14.2, h: 8.6 }], "Un écran sur bras fin et, à côté, le cœur quantique dans son cylindre de verre, cerclé d'anneaux de lumière.",
  sty([["violet", "Qubits violets", "#b48cff", { c: "#b48cff", tint: "#b48cff" }], ["cyan", "Qubits cyan", "#00e5ff", { c: "#00e5ff", tint: "#00e5ff" }]]), "racer");
pc("pcglass", "Écran transparent", 1600, 18, 7, "isopcglass", [{ x: 1.3, y: 3, z: 3.9, w: 15.4, h: 8.8 }], "Une dalle de verre sur un pied fin : l'image flotte, on voit à travers.",
  sty([["clair", "Verre clair", "#dfeaf2", { c: "#dfeaf2", tint: "#bfe9ff" }], ["fume", "Verre fumé", "#5a6a7a", { c: "#5a6a7a", tint: "#7fb8c8" }]]), "runner");

/* ---------- gadgets ---------- */
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 300) % 36, still: still() }; }
}(sci({ type: "robot", cat: "deco", name: "Robot assistant", price: 1500, w: 8, d: 8, rots: 1, art: "isorobot",
  desc: "Un petit droïde à dôme qui flotte sur sa boule : il fait le point sur les vrais agents, ou danse. Bip.",
  styles: sty([["blanc", "Blanc", "#e6e8ee"], ["or", "Doré", "#d4a640"], ["rouge", "Rouge", "#c0303a"]]),
  actions: [["report", "📊", "Demander un rapport", () => {
    const s = hub.data?.sessions || [], a = s.flatMap(x => x.agents || []), q = (hub.data?.questions || []).length, n = st => a.filter(x => x.status === st).length;
    const msg = a.length ? `Bip bip. ${n("working")} agent(s) en mission, ${n("blocked")} bloqué(s), ${n("done")} livré(s)${q ? `, ${q} question(s) pour toi` : ""}.` : "Bip. Aucun agent actif. Je recommande un café.";
    toast("ROBOT 🤖", "Rapport", msg); say(CHIEF_NAME, "Merci, R-0FF1CE. 🤖", 2500); sfx("commit");
  }], ["dance", "💃", "Faire danser le robot", () => { say(CHIEF_NAME, "Vas-y, montre-leur ! 🤖🕺", 3000); crewAdd(CHIEF_NAME, { ennui: -8, moral: 2 }); for (const n of hub.peopleIn(hub.curRoom?.() || "office").slice(0, 2)) say(n, "Hahaha, il danse ! 😂", 2500); sfx("achievement"); }]] }));
// teleporters: the chief steps on one and appears on another, in another room (the view follows him)
const pads = () => ["office", "lounge", "meeting", "terrace", "gym", "library"].flatMap(r => hub.itemsIn(r)).filter(i => i.type === "teleporter");
function beam(it) {
  const dest = pads().find(p => p.uid !== it.uid && p.room !== it.room) || pads().find(p => p.uid !== it.uid);
  if (!dest) return say(CHIEF_NAME, "Il faut un second téléporteur, dans une autre pièce. ✨", 3500);
  it.beamUntil = now() + 1800; dest.beamUntil = now() + 2600; sfx("achievement");
  setTimeout(() => {
    const [x0, y0, x1, y1] = hub.footOf(dest), x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    Object.assign(chief, { lspot: null, lpath: [], path: [], roomNext: null, loungeNext: null, pendingOffice: null });
    if (dest.room === "office") Object.assign(chief, { room: "office", x, y, at: "free" });
    else Object.assign(chief, { room: dest.room, lx: x, ly: y, at: dest.room });
    hub.setView(dest.room); say(CHIEF_NAME, "Bzzzzt ✨ …me voilà !", 3000); addMoodlet(CHIEF_NAME, "beam", "✨", "Téléporté", 3, 30);
  }, 900);
}
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, on: now() < (it.beamUntil || 0), frame: anim(t, 120) % 20 }; }
}(sci({ type: "teleporter", cat: "deco", name: "Téléporteur", price: 2600, w: 16, d: 16, rots: 1, art: "isoteleporter", walkable: true,
  desc: "Un plateau cerclé de lumière. Achètes-en deux, dans deux pièces : clic sur l'un, et le chef réapparaît sur l'autre.",
  styles: sty([["anthracite", "Anthracite", "#2a3340"], ["blanc", "Blanc", "#c9d2dc"]]),
  actions: [["beam", "✨", "Se téléporter", beam]] }));
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: anim(t, 600) % 2, on: true }; }
}(sci({ type: "cryopod", cat: "deco", name: "Caisson cryogénique", price: 2400, w: 14, d: 12, rots: 4, art: "isocryopod",
  desc: "Une capsule debout, vitre givrée, lumière bleue. Clic : une sieste cryogénique, le meilleur des repos.",
  styles: sty([["blanc", "Blanc", "#e6e8ee"], ["acier", "Acier", "#9aa6b4"]]),
  actions: [["cryo", "❄️", "Faire une sieste cryogénique", () => { say(CHIEF_NAME, "Réveillez-moi à la prochaine release… ❄️😴", 3500); crewAdd(CHIEF_NAME, { fatigue: -35 }); addMoodlet(CHIEF_NAME, "cryo", "❄️", "Reposé comme après un long voyage", 6, 120); sfx("commit"); }]] }));
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 250) % 4, on: true }; }
}(sci({ type: "reactor", cat: "deco", name: "Réacteur à fusion miniature", price: 3000, w: 14, d: 14, rots: 1, art: "isoreactor", light: 30,
  desc: "Un anneau de plaques autour d'un cœur qui pulse, rayures de sécurité au sol. Clic : booster toute la pièce.",
  styles: [{ id: "standard", name: "Standard", sw: "#00e5ff" }],
  actions: [["boost", "⚡", "Booster la pièce · § 50", it => {
    const people = others(it.room);
    if (!spend(50, "Boost du réacteur")) return;
    for (const n of [CHIEF_NAME, ...people]) { crewAdd(n, { fatigue: -12, moral: 3 }); addMoodlet(n, "reactor", "⚡", "Boosté par le réacteur", 4, 60); }
    say(CHIEF_NAME, "Puissance maximale ! ⚡", 3000); if (people.length) setTimeout(() => say(pick(people), "Je sens mes neurones vibrer ⚡", 2500), 900); sfx("achievement");
  }]] }));
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 140) % 8, still: still() }; }
}(sci({ type: "drone", cat: "deco", name: "Drone de livraison", price: 1300, w: 12, d: 12, rots: 1, art: "isodrone", walkable: true,
  desc: "Quatre rotors, un colis sous le ventre, il plane au-dessus de son plot. Clic : un café ou une part de pizza, livré en 30 secondes.",
  styles: sty([["blanc", "Blanc", "#e6e8ee"], ["noir", "Noir", "#2a3340"], ["jaune", "Jaune", "#e8c23a"]]),
  actions: [["coffee", "☕", "Un café par drone", () => { say(CHIEF_NAME, "Zzzz… livré ! Un double espresso ☕", 3000); crewAdd(CHIEF_NAME, { cafe: 25, fatigue: -4 }); hub.chiefHold?.("cup"); sfx("commit"); }],
    ["pizza", "🍕", "Une part de pizza", () => { say(CHIEF_NAME, "Une part de margherita, encore chaude 🍕", 3000); crewAdd(CHIEF_NAME, { faim: 20 }); sfx("commit"); }]] }));
new class extends Plant {
  isoState(it, t) { return { ...super.isoState(it), frame: still() ? 0 : anim(t, 500) % 3 }; }
}(sci({ type: "alienplant", cat: "plantes", name: "Plante alien", price: 420, w: 10, d: 10, rots: 1, art: "isoalienplant", plant: true,
  desc: "Des bulbes translucides qui luisent doucement, venus d'une autre planète. Clic : l'arroser (eau lourde de préférence).", styles: [{ id: "alien", name: "Bioluminescente", sw: "#7dffb0" }] }));
