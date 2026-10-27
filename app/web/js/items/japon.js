// The Japanese theme (shop: 🎭 Thèmes → ⛩️ Maison japonaise; drawings: svg/isojapon.js): walls to compose (a shōji that
// glows at night, a fusuma that slides open when someone comes near, a tokonoma whose scroll writes the office's mood in
// one kanji, a post with its red lantern), a round window on Mount Fuji (a lantern lit on the pagoda per agent at work),
// two rugs, an andon, a tōrō, a ramen neon, a zabuton, a zaisu, a kotatsu, a hinoki desk, the sensei's dais (the
// chief's desk: ChiefOS turns ZEN there), a daruma shelf (one per agent: one eye at the start, both once delivered), a
// maneki-neko (it beckons faster with each MR opened), a zen garden (a stone per agent at work), a koi pond (a koi per
// agent, gold ones for the delivered), a torii (lit when every CI is green), an omikuji stand (the fortune follows the
// real state), a cherry tree, a bonsai, a taiko drum. The chief's kimono, kasa and katana are in the wardrobe
// (world/shop.js).

import "../svg/isojapon.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, S, chief, ctx, ents } from "../core/core.js";
import { isStuck } from "../core/data.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
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
import { NEON, Neon, neonArt, ttext } from "./walldeco.js";
import { StyledDesk } from "./desk.js";
import { ChiefDesk } from "./chiefdesk.js";

const THEME = "japon";
const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const anim = (t, ms) => Math.floor(t / ms);
const still = () => !!hub.focusMode;
const japon = def => ({ theme: THEME, room: "any", ...def });
const s_ = n => n > 1 ? "s" : "";
const WOODS = sty([["sombre", "Bois sombre", "#3a2a1e"], ["hinoki", "Hinoki", "#c9a46a"], ["laque", "Laque noire", "#1c1c22"]]);
const others = room => hub.peopleIn(room).filter(n => n !== CHIEF_NAME);
const agents = () => (hub.data?.sessions || []).flatMap(s => s.agents || []);
const working = () => agents().filter(a => a.status === "working");
const delivered = () => agents().filter(a => a.status === "done").length;
const pipes = () => Object.values(hub.data?.pipelines || {}).filter(p => p && p.state !== "merged");
const redCi = () => pipes().filter(p => p.ci === "failed").length;
const stuck = () => agents().filter(a => a.status === "blocked" || isStuck(a)).length;
const nightNow = () => hub.nightLevel?.() > 0;
// the office's mood in one kanji (the tokonoma's scroll, the omikuji): trouble, waiting, work, or calm
const MOODS = { trouble: ["困", "l'embarras : un agent est bloqué"], wait: ["待", "l'attente : une question attend"], fire: ["火", "le feu : une CI est rouge"], work: ["働", "le travail : les agents sont à l'œuvre"], calm: ["和", "l'harmonie : tout est calme"] };
const mood = () => stuck() ? "trouble" : (hub.data?.questions || []).length ? "wait" : redCi() ? "fire" : working().length ? "work" : "calm";

/* ---------- walls ---------- */
const wall = (Cls, def) => new Cls(japon({ cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, styles: WOODS, ...def }));
class Shoji extends Colored { isoState(it, t) { return { ...super.isoState(it, t), lit: nightNow() }; } }
wall(Shoji, { type: "shoji", name: "Cloison shōji", price: 340, art: "isoshoji",
  desc: "Un treillis de bois fin tendu de papier de riz : le jour, une lumière douce ; le soir, il s'allume d'un halo chaud. Aligne-les pour une maison japonaise." });
// the fusuma: it slides open when someone comes near, and closes behind them
const doorOpen = new WeakMap();
const near = (it, x, y) => { const [x0, y0, x1, y1] = hub.footOf(it); return Math.hypot((x0 + x1) / 2 - x, (y0 + y1) / 2 - y) < 34; };
const someoneNear = it => {
  const r = it.room;
  return (chief.room === r && near(it, r === "office" ? chief.x : chief.lx, r === "office" ? chief.y : chief.ly))
    || (r === "office" ? [...ents.values()].some(e => near(it, e.x, e.y)) : [...hub.loungers.values()].some(l => (r === "lounge" ? !l.partyRoom : l.partyRoom === r) && near(it, l.x, l.y)));
};
class Fusuma extends Colored {
  isoState(it, t) {
    const was = doorOpen.get(it) || 0, want = someoneNear(it) ? 1 : 0, o = was + (want - was) * 0.14;
    if (want && was < 0.02 && !still()) sfx("tap");
    doorOpen.set(it, o);
    return { ...super.isoState(it, t), open: still() ? want : o };
  }
}
wall(Fusuma, { type: "fusuma", name: "Porte fusuma", price: 720, art: "isofusuma", walkable: true,
  desc: "Deux panneaux coulissants peints de la grande vague et d'un nuage d'or : ils glissent tout seuls quand quelqu'un approche." });
class Tokonoma extends Colored { isoState(it, t) { return { ...super.isoState(it, t), ch: MOODS[mood()][0] }; } }
wall(Tokonoma, { type: "tokonoma", name: "Mur au tokonoma", price: 680, art: "isotokonoma",
  desc: "L'alcôve d'honneur : un rouleau calligraphié, un ikebana de camélias. Le kanji du rouleau dit l'humeur du bureau, en vrai : 和 l'harmonie, 働 le travail, 待 une question attend, 火 une CI est rouge, 困 un agent est bloqué." });
class PostLamp extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 600) % 4 }; } }
new PostLamp(japon({ type: "chochinpost", cat: "cloisons", shelf: "murs", name: "Poteau et lanterne rouge", price: 380, w: 8, d: 8, rots: 1, art: "isochochinpost", light: 30,
  desc: "Pour finir un mur ou tourner un angle : un poteau sombre sur sa pierre, une lanterne de papier rouge qui se balance. Clic : l'allumer, l'éteindre.",
  styles: [{ id: "sombre", name: "Bois sombre", sw: "#3a2a1e" }] }));

/* ---------- window, rugs ---------- */
// the round window: Mount Fuji under the sky of the hour, a cherry branch whose petals fall, a pagoda on the hill with a
// lantern lit per agent at work
class MaruWin extends Win {
  behind(it, t) {
    const g = this.glass, x = (it.x + g.x) * S, y = (it.y + g.y) * S, w = g.w * S, h = g.h * S, s = still() ? 0 : t, hr = clockNow().getHours() + clockNow().getMinutes() / 60;
    const night = hr >= 20.5 || hr < 6.5, dusk = !night && (hr >= 18 || hr < 8);
    ctx.save(); ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, y + h), [c0, c1] = night ? ["#0e1430", "#2a2a5a"] : dusk ? ["#5a4a8a", "#ffaa7a"] : ["#8ac8f0", "#fde8d8"];
    sky.addColorStop(0, c0); sky.addColorStop(1, c1); ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = night ? "#f4ecc8" : dusk ? "#ff6a3a" : "#e8402a"; ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.26, w * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = night ? "#2a3050" : "#5a6a9a"; ctx.beginPath(); ctx.moveTo(x, y + h * 0.82); ctx.lineTo(x + w * 0.48, y + h * 0.36); ctx.lineTo(x + w * 0.56, y + h * 0.36); ctx.lineTo(x + w, y + h * 0.84); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
    ctx.fillStyle = night ? "#c9cce0" : "#ffffff"; ctx.beginPath(); ctx.moveTo(x + w * 0.4, y + h * 0.44); ctx.lineTo(x + w * 0.48, y + h * 0.36); ctx.lineTo(x + w * 0.56, y + h * 0.36); ctx.lineTo(x + w * 0.64, y + h * 0.45); ctx.lineTo(x + w * 0.58, y + h * 0.42); ctx.lineTo(x + w * 0.52, y + h * 0.46); ctx.lineTo(x + w * 0.46, y + h * 0.42); ctx.fill();
    ctx.fillStyle = night ? "#141a2a" : "#3a5a3a"; ctx.beginPath(); ctx.ellipse(x + w * 0.22, y + h, w * 0.4, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    const px = x + w * 0.2, py = y + h * 0.86, n = Math.min(4, working().length);  // the pagoda: four roofs, a lantern per agent at work
    for (let k = 0; k < 4; k++) {
      const ww = (5 - k * 0.8) * S, yy = py - k * 2.6 * S;
      ctx.fillStyle = night ? "#2a1a1a" : "#8a2a1e"; ctx.fillRect(px - ww * 0.35, yy - 2 * S, ww * 0.7, 2 * S);
      ctx.fillStyle = night ? "#0e0e14" : "#2a2a30"; ctx.beginPath(); ctx.moveTo(px - ww / 2, yy - 1.6 * S); ctx.lineTo(px, yy - 3 * S); ctx.lineTo(px + ww / 2, yy - 1.6 * S); ctx.fill();
      if (k < n) { ctx.fillStyle = "rgba(255, 190, 90, 0.35)"; ctx.beginPath(); ctx.arc(px, yy - 0.9 * S, 1.6 * S, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffcf6a"; ctx.fillRect(px - 0.4 * S, yy - 1.4 * S, 0.8 * S, 1 * S); }
    }
    ctx.strokeStyle = "#3a2a24"; ctx.lineWidth = 1 * S; ctx.beginPath(); ctx.moveTo(x + w, y + h * 0.12); ctx.quadraticCurveTo(x + w * 0.7, y + h * 0.1, x + w * 0.5, y + h * 0.04); ctx.stroke();  // the cherry branch
    ctx.fillStyle = night ? "#c898b0" : "#f8c8d8";
    for (const [fx, fy] of [[0.95, 0.12], [0.85, 0.1], [0.75, 0.08], [0.65, 0.07], [0.56, 0.05], [0.8, 0.16]]) { ctx.beginPath(); ctx.arc(x + w * fx, y + h * fy, 1.6 * S, 0, Math.PI * 2); ctx.fill(); }
    for (let k = 0; k < 5; k++) { const tt = ((s / 2400 + k * 0.21) % 1), fx = x + w * (0.9 - tt * 0.6 + Math.sin(tt * 8 + k) * 0.05), fy = y + h * (0.12 + tt * 0.85); ctx.fillRect(fx, fy, 0.8 * S, 0.5 * S); }
    ctx.restore();
  }
}
new MaruWin(japon({ type: "windowmaru", cat: "fenetres", name: "Fenêtre ronde marumado", price: 1150, kind: "wall", w: 32, h: 32, glass: { x: 3, y: 3, w: 26, h: 26, shape: "round" },
  art2d: new FrameArt("wallwindowmaru", 32, 32, ({ f = "#3a2a1e" }) => `<path fill-rule="evenodd" fill="${f}" d="M16 0A16 16 0 1 1 15.99 0ZM16 3A13 13 0 1 0 16.01 3Z"/>`
    + `<path fill="none" stroke="${shade(f, 1.4)}" stroke-width=".4" d="M16 1.5A14.5 14.5 0 1 1 15.99 1.5"/>`
    + [9.5, 16, 22.5].map(x => `<rect x="${x - 0.3}" y="${x === 16 ? 3 : 4.6}" width=".6" height="${x === 16 ? 26 : 22.8}" fill="${f}" fill-opacity=".8"/>`).join("") + `<rect x="3" y="15.7" width="26" height=".6" fill="${f}" fill-opacity=".8"/>`),
  desc: "Une fenêtre ronde au treillis léger. Derrière, le mont Fuji sous le ciel de l'heure, une branche de cerisier qui perd ses pétales, et une pagode où s'allume une lanterne par agent au travail.",
  styles: sty([["sombre", "Bois sombre", "#3a2a1e", { f: "#3a2a1e" }], ["hinoki", "Hinoki", "#c9a46a", { f: "#c9a46a" }], ["rouge", "Laque vermillon", "#b8302a", { f: "#b8302a" }]]) }));
new Item(japon({ type: "rugwave", cat: "tapis", kind: "rug", shape: "vague", name: "Tapis grande vague", price: 520, w: 64, d: 40,
  desc: "La grande vague en tissage : l'écume en griffes, le Fuji minuscule au fond.", styles: [{ id: "indigo", name: "Indigo", sw: "#e8dcc4" }, { id: "nuit", name: "Nuit", sw: "#24304a" }] }));
new Item(japon({ type: "rugsakura", cat: "tapis", kind: "rug", shape: "sakura", name: "Tapis de pétales", price: 420, w: 48, d: 36,
  desc: "Des fleurs et des pétales de cerisier sur un fond uni, comme après le hanami.", styles: [{ id: "encre", name: "Encre", sw: "#24242a" }, { id: "creme", name: "Crème", sw: "#efe6d0" }, { id: "indigo", name: "Indigo", sw: "#22336a" }] }));

/* ---------- lights ---------- */
new Lamp(japon({ type: "andon", cat: "lumiere", name: "Lanterne andon", price: 220, w: 8, d: 8, rots: 1, art: "isoandon", light: 30,
  desc: "Une lanterne de papier dans son cadre de bois, posée au sol : une lumière de veillée. Clic : l'allumer, l'éteindre.", styles: [{ id: "papier", name: "Papier", sw: "#f4efe0" }] }));
class Toro extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 190) % 3 }; } }
new Toro(japon({ type: "toro", cat: "lumiere", name: "Lanterne de pierre tōrō", price: 480, w: 10, d: 10, rots: 1, art: "isotoro", light: 26,
  desc: "Une lanterne de jardin en pierre, son toit aux coins relevés, une flamme dans sa niche. Clic : l'allumer, l'éteindre.", styles: [{ id: "granit", name: "Granit", sw: "#9a968a" }] }));
new Neon(japon({ type: "neonramen", cat: "neons", shelf: "lumiere", name: "Néon ラーメン", price: 160, kind: "wall", w: 40, h: 16, glow: true,
  art2d: neonArt("wallneonramen", 40, 16, ttext("ラーメン", 20, 11.4, 9, `font-family="'Noto Sans JP', sans-serif"`)), desc: "💡 Lumineux · « Ramen », comme à la porte d'une échoppe de Tokyo.",
  styles: NEON([["rouge", "Rouge lampion", "#ff3b3b"]]).reverse() }));

/* ---------- seats ---------- */
class Seat extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
new Seat(japon({ type: "zabuton", cat: "chaises", name: "Coussin zabuton", price: 90, w: 10, d: 10, rots: 1, chair: true, walkable: true, art: "isozabuton",
  spots: [{ x: 5, y: 5, face: [0, 1], lift: 1 }], desc: "Un coussin de sol épais, ses quatre pompons, son point au centre : on s'y assoit en tailleur.",
  styles: sty([["indigo", "Indigo", "#2a3a6a"], ["rouge", "Rouge", "#a82a2a"], ["moutarde", "Moutarde", "#c8902a"], ["vert", "Vert thé", "#5a7a3a"]]) }));
new Seat(japon({ type: "zaisu", cat: "fauteuils", act: "read", name: "Chaise zaisu", price: 520, w: 12, d: 11, thumbArt: "isozaisufull",
  parts: [{ art: "isozaisuback", rect: [0, 0, 12, 2] }, { art: "isozaisu", rect: [0, 1, 12, 10] }], spots: [{ x: 6, y: 6, face: [0, 1], lift: 1.6 }],
  desc: "Une chaise sans pieds en laque noire, un dossier galonné d'or, un coussin : pour lire assis au ras des tatamis. En salle de repos, les devs viennent y lire.",
  styles: sty([["rouge", "Rouge", "#8f1f2a"], ["indigo", "Indigo", "#2a3a6a"], ["or", "Or", "#c9a040"]]) }));

/* ---------- tables, desks ---------- */
// the kotatsu: its warmth (fatigue down, mood up) for whoever is in the room, the tea steaming
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, on: now() < (it.warmUntil || 0), frame: still() ? 0 : anim(t, 300) % 8 }; }
}(japon({ type: "kotatsu", cat: "tables", name: "Kotatsu", price: 1100, w: 20, d: 20, rots: 1, art: "isokotatsu", surface: { z: 7.6 },
  desc: "Une table basse chauffante sous sa couette, un service à thé, un panier de mandarines. Clic : s'y glisser avec un thé ; toute la pièce se réchauffe.",
  styles: sty([["rouge", "Couette rouge", "#c0303a"], ["indigo", "Couette indigo", "#2a3a6a"], ["vert", "Couette vert thé", "#5a7a3a"]]),
  actions: [["warm", "🍵", "Se glisser sous le kotatsu", it => {
    it.warmUntil = now() + 60000; sfx("pass");
    const people = others(it.room);
    say(CHIEF_NAME, pick(["Ahhh… je ne bouge plus d'ici. 🍵", "Un thé, une mandarine, le kotatsu : la perfection. 🍊", "On fait le stand-up ici, d'accord ? 🍵"]), 3500);
    for (const n of [CHIEF_NAME, ...people]) { crewAdd(n, { fatigue: -12, moral: 3, social: 4 }); addMoodlet(n, "kotatsu", "🍵", "Au chaud sous le kotatsu", 4, 90); }
    if (people.length) setTimeout(() => say(pick(people), pick(["Pousse-toi, j'arrive ! 🍊", "Je peux avoir une mandarine ?", "Ne me réveillez pas avant la démo. 😴"]), 2500), 1200);
  }]] }));
new StyledDesk(japon({ type: "deskjapon", cat: "bureau", room: "office", workstation: true, name: "Bureau en hinoki", price: 1150, w: 40, d: 14, art: "isodeskjapon", seat: [20, 24], surface: { z: 13.2 },
  desc: "Du hinoki clair aux pieds fins, un bonsaï, une pierre à encre et son pinceau, du papier washi marqué 禅. La place d'un dev (ordinateur et chaise à part).",
  styles: [{ id: "hinoki", name: "Hinoki", sw: "#c9a46a", w: "#c9a46a" }, { id: "sombre", name: "Bois sombre", sw: "#5a3a24", w: "#5a3a24" }, { id: "laque", name: "Laque noire", sw: "#2a2a30", w: "#2a2a30" }] }));
// the sensei's dais: the chief's desk of the theme; ChiefOS opens there as ZEN (ui/chiefos.js osSkin); he can meditate
new class extends ChiefDesk {
  isoState(it, t) { return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 350) % 8, on: now() < (it.zenUntil || 0) }; }
  pie(it) { return [...super.pie(it), ["zazen", "🧘", "Méditer"]]; }
  perform(it, id) {
    if (id !== "zazen") return super.perform(it, id);
    enqueue("🧘", "Méditer", () => chiefVisit(it, () => {
      it.zenUntil = now() + 20000; sfx("verify");
      const m = mood();
      say(CHIEF_NAME, `${MOODS[m][0]}… ${pick(["Le bug que tu cherches est en toi.", "Un commit à la fois.", "Le code qui n'est pas écrit n'a pas de bug.", "Respire. La CI passera."])} 🧘`, 4500);
      crewAdd(CHIEF_NAME, { fatigue: -15, moral: 5 }); addMoodlet(CHIEF_NAME, "zazen", "🧘", "Une méditation zazen", 5, 120);
    }));
    return true;
  }
}(japon({ type: "chiefdeskzen", chiefDesk: true, osSkin: "zen", cat: "bureau", name: "Estrade du sensei", price: 3200, room: "office", unique: true, w: 34, d: 16, art: "isochiefdeskzen",
  spots: [{ x: 17, y: 24, face: [0, -1] }],
  desc: "Ton poste de sensei : une estrade de tatamis, un bureau bas en laque noire, un paravent d'or aux pins et aux nuages, un katana sur son support, de l'encens. Assis là, ChiefOS s'ouvre en Zen. Clic : méditer.",
  styles: sty([["laque", "Laque noire", "#1c1c22"], ["vermillon", "Laque vermillon", "#8f2a1e"]], "w") }));

/* ---------- things of the house ---------- */
// the daruma shelf: one daruma per agent of the day; one eye painted at the start of the mission, the second once delivered
const DARUMA_OF = a => a.status === "done" ? 2 : a.status === "gone" ? 0 : 1;
new class extends Gadget {
  isoState() { return { eyes: agents().filter(a => a.status !== "gone").slice(0, 6).map(DARUMA_OF).join("") }; }
}(japon({ type: "darumashelf", cat: "deco", name: "Étagère à daruma", price: 900, w: 16, d: 8, rots: 4, art: "isodaruma",
  desc: "Un petit gradin de hinoki et ses daruma : un par vrai agent en mission. On peint un œil quand la mission commence, le second quand elle est livrée. Clic : faire le compte des vœux.",
  styles: [{ id: "hinoki", name: "Hinoki", sw: "#c9a46a" }],
  actions: [["wish", "🎎", "Faire le compte des vœux", () => {
    const list = agents().filter(a => a.status !== "gone"), done = list.filter(a => a.status === "done").length;
    if (!list.length) { say(CHIEF_NAME, "Pas un vœu en cours : les daruma attendent leur premier œil. 🎎", 3500); return; }
    toast("DARUMA 🎎", `${done} vœu${s_(done)} exaucé${s_(done)} sur ${list.length}`, list.slice(0, 5).map(a => `${a.status === "done" ? "◉◉" : "◉○"} ${a.ticket || a.type}`).join(" · "));
    say(CHIEF_NAME, done === list.length ? "Tous les daruma ont leurs deux yeux ! Banzai ! 🎎" : `${list.length - done} daruma attend${list.length - done > 1 ? "ent" : ""} encore son second œil. Courage ! 🎎`, 4000);
    sfx(done ? "achievement" : "commit"); crewAdd(CHIEF_NAME, { moral: 2 });
  }]] }));
// the maneki-neko: its paw beckons faster with each MR the agents opened
new class extends Gadget {
  isoState(it, t) { const n = agents().filter(a => a.game?.mr).length; return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, Math.max(140, 700 - n * 120)) % 4 }; }
}(japon({ type: "maneki", cat: "deco", name: "Maneki-neko", price: 380, w: 8, d: 8, rots: 1, art: "isomaneki",
  desc: "Le chat porte-bonheur sur son coussin, sa clochette, sa pièce d'or. Sa patte fait signe d'autant plus vite que les agents ont ouvert de MR. Clic : le caresser pour la chance.",
  styles: sty([["blanc", "Blanc", "#f4f2ea"], ["or", "Doré", "#e8c25a"], ["noir", "Noir", "#2a2a30"]]),
  actions: [["pet", "🐱", "Caresser le maneki-neko", () => {
    const n = agents().filter(a => a.game?.mr).length;
    say(CHIEF_NAME, n ? `${n} MR ouverte${s_(n)} : il fait signe à la chance ! 🐱💰` : "Il attend la première MR pour lever la patte. 🐱", 3500);
    crewAdd(CHIEF_NAME, { moral: 2, ennui: -3 }); sfx("tap");
  }]] }));
// the zen garden: a stone per agent at work; raking it calms the chief
new class extends Gadget {
  isoState(it, t) { return { n: Math.max(1, working().length), frame: now() < (it.rakeUntil || 0) ? anim(t, 300) % 2 : 0 }; }
}(japon({ type: "zengarden", cat: "deco", name: "Jardin zen", price: 950, w: 24, d: 16, rots: 2, art: "isozengarden",
  desc: "Un bac de gravier blanc ratissé, et une pierre moussue par agent au travail, chacune cerclée par le râteau. Clic : ratisser, pour retrouver son calme.",
  styles: [{ id: "gravier", name: "Gravier blanc", sw: "#e8e4d8" }],
  actions: [["rake", "🪨", "Ratisser le gravier", it => {
    it.rakeUntil = now() + 8000; const n = working().length;
    say(CHIEF_NAME, `${n ? `${n} pierre${s_(n)}, ${n} agent${s_(n)} à l'œuvre.` : "Une seule pierre : le calme."} Je ratisse… 🪨`, 3500);
    crewAdd(CHIEF_NAME, { fatigue: -6, moral: 3, ennui: -4 }); addMoodlet(CHIEF_NAME, "zen", "🪨", "J'ai ratissé le jardin zen", 3, 60); sfx("commit");
  }]] }));
// the koi pond: a koi per agent at work, a golden koi per mission delivered; feeding them gathers the room
new class extends Gadget {
  isoState(it, t) { return { n: working().length, gold: delivered(), frame: still() ? 0 : anim(t, 120) % 40 }; }
}(japon({ type: "koipond", cat: "deco", name: "Bassin aux carpes koï", price: 1400, w: 24, d: 20, rots: 1, art: "isokoipond",
  desc: "Un bassin cerclé de pierres, des nénuphars. Une carpe par vrai agent au travail, une carpe dorée par mission livrée, qui tournent en rond. Clic : les nourrir.",
  styles: [{ id: "pierre", name: "Pierre", sw: "#9a968a" }],
  actions: [["feed", "🐟", "Nourrir les carpes", it => {
    const n = working().length, g = delivered(), people = others(it.room);
    say(CHIEF_NAME, n + g ? `${n} carpe${s_(n)} au travail, ${g} carpe${s_(g)} dorée${s_(g)} : elles accourent ! 🐟` : "Le bassin est vide : pas un agent aujourd'hui. 🐟", 3500);
    for (const p of [CHIEF_NAME, ...people]) crewAdd(p, { ennui: -5, moral: 2 }); sfx("pass");
  }]] }));
// the torii: its lanterns light up when every CI of the agents' MRs is green
new class extends Gadget {
  isoState() { const p = pipes(); return { lit: p.length > 0 && p.every(x => x.ci === "success") }; }
}(japon({ type: "torii", cat: "deco", name: "Torii", price: 1600, w: 24, d: 6, rots: 2, art: "isotorii", walkable: true,
  desc: "Le portail vermillon des sanctuaires, sa corde shimenawa et ses papiers. Ses deux lanternes s'allument quand toutes les CI des MR des agents sont vertes. On passe dessous. Clic : faire un vœu.",
  styles: [{ id: "vermillon", name: "Vermillon", sw: "#d8402a" }],
  actions: [["pray", "⛩️", "Faire un vœu", () => {
    const p = pipes(), red = p.filter(x => x.ci === "failed").length;
    say(CHIEF_NAME, !p.length ? "Deux saluts, deux claquements de mains : que la prochaine MR passe du premier coup. ⛩️" : red ? `Kami du CI, ${red} pipeline${s_(red)} rouge${s_(red)}… aidez-nous. ⛩️` : "Toutes les CI sont vertes : les kami sont avec nous. ⛩️✨", 4000);
    crewAdd(CHIEF_NAME, { moral: 3 }); sfx("verify");
  }]] }));
// the omikuji: the fortune follows the real state of the office
const FORTUNES = {
  calm: ["大吉 Daikichi — grande chance", "Rien ne presse, tout avance. Le moment de nettoyer le backlog."],
  work: ["吉 Kichi — chance", "Les agents travaillent bien. Laisse-les faire, va prendre un thé."],
  wait: ["末吉 Suekichi — chance à venir", "Quelqu'un attend ta réponse : la chance viendra quand tu l'auras donnée."],
  fire: ["凶 Kyō — malchance", "Une CI rouge rôde. Noue ce papier au portique et va lire les logs."],
  trouble: ["大凶 Daikyō — grande malchance", "Un agent est bloqué. Va le voir avant qu'il ne tourne en rond."],
};
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 300) % 6 }; }
}(japon({ type: "omikuji", cat: "deco", name: "Présentoir à omikuji", price: 520, w: 10, d: 8, rots: 4, art: "isoomikuji",
  desc: "La boîte à baguettes et le portique où l'on noue les papiers de la fortune. Clic : tirer son omikuji ; la fortune suit l'état réel du bureau.",
  styles: [{ id: "bois", name: "Bois sombre", sw: "#3a2a1e" }],
  actions: [["draw", "🎋", "Tirer un omikuji", () => {
    const [title, text] = FORTUNES[mood()];
    toast("OMIKUJI 🎋", title, text); say(CHIEF_NAME, `${title.split(" — ")[1]} ! ${text} 🎋`, 5000);
    crewAdd(CHIEF_NAME, { ennui: -5 }); sfx(["calm", "work"].includes(mood()) ? "achievement" : "fail");
  }]] }));
new class extends Plant {
  isoState(it, t) { return { ...super.isoState(it), frame: still() ? 0 : anim(t, 220) % 200 }; }
}(japon({ type: "sakura", cat: "plantes", name: "Cerisier en fleur", price: 900, w: 16, d: 16, rots: 1, art: "isosakura", plant: true,
  desc: "Un petit cerisier au tronc tordu, couvert de fleurs roses dont les pétales tombent. Clic : l'arroser.", styles: [{ id: "rose", name: "Fleurs roses", sw: "#f8c8d8" }] }));
new Plant(japon({ type: "bonsaipin", cat: "plantes", name: "Bonsaï pin", price: 260, w: 8, d: 8, rots: 1, art: "isobonsaipin", plant: true,
  desc: "Un pin taillé depuis des années dans sa coupe émaillée. Clic : l'arroser.", styles: [{ id: "pin", name: "Pin", sw: "#3f8a3a" }] }));
// the taiko: a drum roll that encourages everyone in the room
new class extends Gadget {
  isoState(it, t) { return { on: now() < (it.drumUntil || 0), frame: still() ? 0 : anim(t, 120) % 2 }; }
}(japon({ type: "taiko", cat: "deco", name: "Tambour taiko", price: 850, w: 12, d: 12, rots: 4, art: "isotaiko",
  desc: "Un grand tambour sur son support, ses deux baguettes. Clic : un roulement de taiko pour donner du cœur à l'ouvrage à toute la pièce.",
  styles: [{ id: "keyaki", name: "Keyaki", sw: "#8a3a1a" }],
  actions: [["drum", "🥁", "Jouer du taiko", it => {
    it.drumUntil = now() + 4000; sfx("boss");
    const people = others(it.room), n = working().length;
    say(CHIEF_NAME, `DON ! DON ! DOKO-DON ! ${n ? `Ganbatte, les ${n} agent${s_(n)} ! ` : ""}🥁`, 3500);
    for (const p of [CHIEF_NAME, ...people]) { crewAdd(p, { moral: 4, ennui: -6 }); addMoodlet(p, "taiko", "🥁", "Un roulement de taiko", 3, 60); }
    if (people.length) setTimeout(() => say(pick(people), pick(["Ganbarimasu ! 💪", "Ça réveille ! 🥁", "Encore, encore !"]), 2500), 1000);
  }]] }));
