// The pirate ship theme (shop: 🎭 Thèmes → 🏴‍☠️ Navire pirate; drawings: svg/isopirate.js): hull walls to compose
// (tarred planks and a rope rail, a gunport that opens on its cannon when someone comes near or during the security
// alarm, a porthole on the sea, a mast with its lantern), a stern window on the sea (a sail on the horizon per agent at
// work), two rugs, a ship's lantern, a ARRR! neon, a barrel stool, the captain's chair, the chart table (an island per
// ticket at sea), the purser's desk, the captain's wheel (the chief's desk: ChiefOS turns GALION there), a treasure
// chest that fills with the day's deliveries, the ship's bell (the crew on deck), a parrot that repeats the tickets, a
// cannon (a salvo per merged MR), a message in a bottle (the oldest question waiting), a spyglass (the backlog in
// sight), the kraken's barrel (a tentacle per red CI), a rum barrel, a palm. The chief's coat, tricorne, eyepatch and
// parrot are in the wardrobe (world/shop.js).

import "../svg/isopirate.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, S, chief, ctx, ents } from "../core/core.js";
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
import { ChiefDesk } from "./chiefdesk.js";

const THEME = "pirate";
const sty = (list, key = "c") => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const anim = (t, ms) => Math.floor(t / ms);
const still = () => !!hub.focusMode;
const pirate = def => ({ theme: THEME, room: "any", ...def });
const s_ = n => n > 1 ? "s" : "";
const OAKS = sty([["chene", "Chêne goudronné", "#7a5232"], ["teck", "Teck", "#9a6a3a"], ["noir", "Bois noirci", "#3a2a1e"], ["gris", "Bois flotté", "#8a8478"]]);
const WOODS = sty([["chene", "Chêne", "#7a5232"], ["teck", "Teck", "#9a6a3a"], ["noir", "Bois noirci", "#3a2a1e"]], "w");
const others = room => hub.peopleIn(room).filter(n => n !== CHIEF_NAME);
const agents = () => (hub.data?.sessions || []).flatMap(s => s.agents || []);
const atSea = () => agents().filter(a => a.status === "working");
const ticketsAtSea = () => [...new Set(atSea().map(a => a.ticket).filter(Boolean))];
const pipes = () => Object.values(hub.data?.pipelines || {}).filter(Boolean);
const redCi = () => pipes().filter(p => p.state !== "merged" && p.ci === "failed").length;
const delivered = () => agents().filter(a => a.status === "done").length;
const who = a => a.ticket || a.description || a.type || "un agent";
const nightNow = () => { const h = clockNow().getHours(); return h >= 20 || h < 7; };
const alarmOn = () => { const al = hub.alarm; return !!al && performance.now() < al.until; };

/* ---------- hull walls ---------- */
const wall = (Cls, def) => new Cls(pirate({ cat: "cloisons", shelf: "murs", w: 24, d: 4, rots: 4, styles: OAKS, ...def }));
wall(Colored, { type: "shiphull", name: "Bordé de coque", price: 300, art: "isoshiphull",
  desc: "Des bordages goudronnés, une préceinte, un plat-bord, une main courante de cordage et son rouleau de filin : aligne-les pour faire un navire de ton bureau." });
// the gunport: it opens on its cannon when someone comes near, or in battle stations during the security alarm (then it fires)
const portOpen = new WeakMap();
const near = (it, x, y) => { const [x0, y0, x1, y1] = hub.footOf(it); return Math.hypot((x0 + x1) / 2 - x, (y0 + y1) / 2 - y) < 34; };
const someoneNear = it => {
  const r = it.room;
  return (chief.room === r && near(it, r === "office" ? chief.x : chief.lx, r === "office" ? chief.y : chief.ly))
    || (r === "office" ? [...ents.values()].some(e => near(it, e.x, e.y)) : [...hub.loungers.values()].some(l => (r === "lounge" ? !l.partyRoom : l.partyRoom === r) && near(it, l.x, l.y)));
};
class Gunport extends Colored {
  isoState(it, t) {
    const al = alarmOn(), was = portOpen.get(it) || 0, want = al || someoneNear(it) || now() < (it.fireUntil || 0) ? 1 : 0, o = was + (want - was) * 0.12;
    if (want && was < 0.02 && !still()) sfx("tap");
    portOpen.set(it, o);
    return { ...super.isoState(it, t), open: still() ? want : o, fire: !still() && (al || now() < (it.fireUntil || 0)) && o > 0.9, frame: anim(t, 120) % 12 };
  }
}
wall(Gunport, { type: "shipgun", name: "Sabord à canon", price: 750, art: "isoshipgun",
  desc: "Un sabord peint en rouge dedans : il s'ouvre sur la gueule du canon quand quelqu'un approche, et pendant l'alarme sécurité c'est le branle-bas de combat (il tire)." });
class Porthole extends Colored { isoState(it, t) { return { ...super.isoState(it, t), frame: still() ? 0 : anim(t, 260) % 48, night: nightNow() }; } }
wall(Porthole, { type: "shipport", name: "Bordé à hublot", price: 520, art: "isoshipport",
  desc: "Un hublot de laiton boulonné sur la mer : les vagues roulent, une voile passe au loin ; la nuit, la lune et les étoiles." });
class MastLamp extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 170) % 3 }; } }
new MastLamp(pirate({ type: "mastpillar", cat: "cloisons", shelf: "murs", name: "Mât et lanterne", price: 420, w: 8, d: 8, rots: 1, art: "isomastpillar", light: 32,
  desc: "Pour finir un mur ou tourner un angle : un tronçon de mât ligaturé de cordage, son râtelier à cabillots et sa lanterne. Clic : l'allumer, l'éteindre.",
  styles: [{ id: "chene", name: "Chêne", sw: "#7a5232" }] }));

/* ---------- window, rugs ---------- */
// the stern window: the sea of the hour (day, sunset, night), an island with its palm, gulls, and a sail on the horizon
// per agent at work (their ships at sea)
class SternWin extends Win {
  behind(it, t) {
    const g = this.glass, x = (it.x + g.x) * S, y = (it.y + g.y) * S, w = g.w * S, h = g.h * S, s = still() ? 0 : t, hr = clockNow().getHours() + clockNow().getMinutes() / 60;
    const night = hr >= 20.5 || hr < 6.5, dusk = !night && (hr >= 18.5 || hr < 8), hz = y + h * 0.58;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const sky = ctx.createLinearGradient(x, y, x, hz);
    const [c0, c1] = night ? ["#0a1430", "#24305a"] : dusk ? ["#3a4a8a", "#ff9a5a"] : ["#4aa0e8", "#bfe6ff"];
    sky.addColorStop(0, c0); sky.addColorStop(1, c1); ctx.fillStyle = sky; ctx.fillRect(x, y, w, hz - y);
    if (night) for (let k = 0; k < 16; k++) { const a = Math.sin(k * 71.3) * 43758.5453, b = Math.sin(k * 23.9) * 9631.1; ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(s / 1100 + k)); ctx.fillStyle = "#f4efe2"; ctx.fillRect(x + (a - Math.floor(a)) * w, y + (b - Math.floor(b)) * (hz - y) * 0.8, 0.5 * S, 0.5 * S); }
    ctx.globalAlpha = 1;
    const ox = x + w * (night ? 0.7 : dusk ? 0.3 : 0.75), oy = night ? y + h * 0.18 : dusk ? hz - h * 0.04 : y + h * 0.16, r = Math.min(w, h) * 0.09;
    ctx.fillStyle = night ? "#f4ecc8" : dusk ? "#ff7a3a" : "#fff3b0"; ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.fill();
    const sea = ctx.createLinearGradient(x, hz, x, y + h); sea.addColorStop(0, night ? "#14284a" : dusk ? "#5a4a7a" : "#2a8ab8"); sea.addColorStop(1, night ? "#08142a" : dusk ? "#2a2a4a" : "#1a5a82");
    ctx.fillStyle = sea; ctx.fillRect(x, hz, w, y + h - hz);
    ctx.fillStyle = night ? "rgba(244, 236, 200, 0.35)" : "rgba(255, 240, 180, 0.4)"; for (let k = 0; k < 6; k++) ctx.fillRect(ox - r * (1 - k * 0.12) + Math.sin(s / 400 + k) * S, hz + 2 + k * 2.4 * S, r * 2 * (1 - k * 0.12), 0.5 * S);
    ctx.fillStyle = night ? "#0e1c14" : "#d9c08a"; ctx.beginPath(); ctx.ellipse(x + w * 0.2, hz, w * 0.14, h * 0.05, 0, Math.PI, 0); ctx.fill();  // the island
    ctx.strokeStyle = night ? "#0a1410" : "#6a4a2a"; ctx.lineWidth = 0.9 * S; ctx.beginPath(); ctx.moveTo(x + w * 0.2, hz - h * 0.04); ctx.quadraticCurveTo(x + w * 0.22, hz - h * 0.12, x + w * 0.26, hz - h * 0.17); ctx.stroke();
    ctx.fillStyle = night ? "#0a1410" : "#2f7a3a"; for (const a of [-2.6, -1.9, -1.1, -0.4, 0.3]) { ctx.beginPath(); ctx.ellipse(x + w * 0.26 + Math.cos(a) * 2.4 * S, hz - h * 0.17 + Math.sin(a) * 1.4 * S + 1.2 * S, 2.6 * S, 0.7 * S, a, 0, Math.PI * 2); ctx.fill(); }
    const n = Math.min(5, atSea().length);  // the crew's ships: one sail per agent at work, sailing along the horizon
    for (let k = 0; k < n; k++) {
      const bx = x + ((s / 90 + k * w / Math.max(1, n) + w * 0.1) % (w * 1.2)) - w * 0.1, by = hz - 0.3 * S, sz = (1.6 - k * 0.15) * S;
      ctx.fillStyle = night ? "#1a2238" : "#3a2414"; ctx.fillRect(bx - sz * 1.4, by - sz * 0.5, sz * 2.8, sz * 0.6);
      ctx.fillStyle = night ? "#2a3450" : "#f4f2ea"; ctx.beginPath(); ctx.moveTo(bx, by - sz * 0.5); ctx.lineTo(bx, by - sz * 3); ctx.lineTo(bx + sz * 1.3, by - sz * 0.7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 0.2 * S, by - sz * 0.6); ctx.lineTo(bx - 0.2 * S, by - sz * 2.4); ctx.lineTo(bx - sz * 1.1, by - sz * 0.7); ctx.fill();
      ctx.fillStyle = "#1c1c22"; ctx.fillRect(bx - 0.2 * S, by - sz * 3.6, sz * 0.8, sz * 0.5);  // the black flag
    }
    if (!night) { ctx.strokeStyle = "#f4f2ea"; ctx.lineWidth = 0.4 * S; for (let k = 0; k < 2; k++) { const gx = x + ((s / 50 + k * 47) % (w * 1.3)) - w * 0.15, gy = y + h * (0.22 + k * 0.1), up = Math.floor(s / 220 + k) % 2 ? -0.8 : 0.2; ctx.beginPath(); ctx.moveTo(gx - 1.6 * S, gy + up * S); ctx.quadraticCurveTo(gx - 0.8 * S, gy - 0.6 * S, gx, gy); ctx.quadraticCurveTo(gx + 0.8 * S, gy - 0.6 * S, gx + 1.6 * S, gy + up * S); ctx.stroke(); } }
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; for (let k = 0; k < 8; k++) { const wx = x + ((k * 37 + s / 70) % w), wy = hz + (h - (hz - y)) * (0.15 + (k % 4) * 0.2); ctx.fillRect(wx, wy, 2.4 * S, 0.4 * S); }
    ctx.restore();
  }
}
new SternWin(pirate({ type: "windowstern", cat: "fenetres", name: "Fenêtre de poupe", price: 1200, kind: "wall", w: 40, h: 30, glass: { x: 3, y: 4, w: 34, h: 22 },
  art2d: new FrameArt("wallwindowstern", 40, 30, ({ f = "#5a3a24" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 30V6Q20 -2 40 6V30ZM3 26H37V8Q20 1 3 8Z"/>`
    + `<path fill="${shade(f, 1.3)}" d="M-1 26H41V30H-1Z"/><path fill="none" stroke="#c9a040" stroke-width=".5" d="M1.5 28H38.5M2 6.6Q20 -0.6 38 6.6"/>`
    + [11.5, 20, 28.5].map(x => `<rect x="${x - 0.5}" y="3" width="1" height="23" fill="${f}"/>`).join("") + `<rect x="3" y="15" width="34" height="1" fill="${f}"/>`
    + `<path fill="#ffffff" fill-opacity=".14" d="M5 9h3l-3 4z"/><path fill="#ffffff" fill-opacity=".1" d="M22 8h2.4l-2.4 3.4z"/>`),
  desc: "La grande fenêtre à petits carreaux de la cabine du capitaine. Derrière, la mer de l'heure (jour, couchant, nuit étoilée), une île et son palmier, des mouettes… et une voile à l'horizon par agent au travail.",
  styles: sty([["acajou", "Acajou", "#5a3a24", { f: "#5a3a24" }], ["noir", "Bois noirci", "#2a1c14", { f: "#2a1c14" }], ["bleu", "Bleu marine", "#1e3050", { f: "#1e3050" }]]) }));
new Item(pirate({ type: "rugmap", cat: "tapis", kind: "rug", shape: "carte", name: "Tapis carte au trésor", price: 520, w: 64, d: 44,
  desc: "Une carte au trésor sur le parchemin : des îles, un chemin en pointillé, la croix rouge, une rose des vents, un serpent de mer dans un coin.",
  styles: [{ id: "parchemin", name: "Parchemin", sw: "#d9c08a" }, { id: "vieux", name: "Vieux parchemin", sw: "#b8a070" }] }));
new Item(pirate({ type: "rugcompass", cat: "tapis", kind: "rug", shape: "rosevents", name: "Tapis rose des vents", price: 460, w: 48, d: 48,
  desc: "Une grande rose des vents à seize branches sur un fond marine, cerclée de cordage, le nord marqué d'une fleur de lys.",
  styles: [{ id: "marine", name: "Marine", sw: "#1e3050" }, { id: "sable", name: "Sable", sw: "#c9a46a" }, { id: "rouge", name: "Rouge corsaire", sw: "#6a1a1e" }] }));

/* ---------- lights ---------- */
class Lantern extends Lamp { isoState(it, t) { return { frame: still() ? 0 : anim(t, 190) % 3 }; } }
new Lantern(pirate({ type: "shiplantern", cat: "lumiere", name: "Lanterne de navire", price: 280, w: 10, d: 10, rots: 1, art: "isoshiplantern", light: 34,
  desc: "Une grosse lanterne de laiton à quatre vitres, posée sur un tonnelet. Clic : l'allumer, l'éteindre.", styles: [{ id: "laiton", name: "Laiton", sw: "#c9a040" }] }));
new Neon(pirate({ type: "neonarrr", cat: "neons", shelf: "lumiere", name: "Néon ARRR!", price: 160, kind: "wall", w: 36, h: 18, glow: true,
  art2d: neonArt("wallneonarrr", 36, 18, both(ttext("ARRR!", 21, 12.4, 10), tpath("M2.5 6.5L8.5 12.5M8.5 6.5L2.5 12.5M5.5 3.2A2.2 2.2 0 1 1 5.49 3.2"))),
  desc: "💡 Lumineux · ARRR!, et deux os croisés sous une tête de mort.", styles: NEON([["rouge", "Rouge corsaire", "#ff3b3b"], ["or", "Or des doublons", "#ffc93b"]]).reverse() }));

/* ---------- seats ---------- */
class Seat extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
new Seat(pirate({ type: "barrelstool", cat: "chaises", name: "Tabouret tonneau", price: 180, w: 10, d: 10, rots: 1, chair: true, walkable: true, art: "isobarrelstool",
  spots: [{ x: 5, y: 5, face: [0, 1], lift: 7 }], desc: "Un tonnelet cerclé de fer, un rouleau de cordage dessus en guise de coussin : le siège du matelot.", styles: OAKS }));
new Seat(pirate({ type: "captchair", cat: "fauteuils", act: "read", name: "Fauteuil du capitaine", price: 1400, w: 15, d: 12, thumbArt: "isocaptfull",
  parts: [{ art: "isocaptback", rect: [0, 0, 15, 2] }, { art: "isocapt", rect: [0, 1, 15, 11] }], spots: [{ x: 7.5, y: 7, face: [0, 1], lift: 5 }],
  desc: "Chêne sculpté, pieds en pattes de lion, cuir clouté de laiton, une tête de mort sur le fronton. En salle de repos, les devs viennent y lire leurs livres de bord.",
  styles: sty([["rouge", "Cuir rouge", "#8f1f2a"], ["noir", "Cuir noir", "#2a2a30"], ["cognac", "Cuir cognac", "#a0602a"]]) }));

/* ---------- tables, desks ---------- */
// the chart table: an island per ticket an agent is working on; clic: plot the course (the tickets at sea, the backlog)
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, n: Math.max(1, ticketsAtSea().length), frame: still() ? 0 : anim(t, 400) % 48 }; }
}(pirate({ type: "maptable", cat: "tables", name: "Table des cartes", price: 1300, w: 24, d: 16, rots: 2, art: "isomaptable", surface: { z: 12 },
  desc: "La table du navigateur : sur la carte, une île par ticket sur lequel un agent travaille, et un petit navire qui va de l'une à l'autre. Clic : faire le point.",
  styles: WOODS,
  actions: [["chart", "🧭", "Faire le point", () => {
    const tk = ticketsAtSea(), back = (hub.data?.backlog || []).length;
    toast("CARTE 🧭", tk.length ? `${tk.length} île${s_(tk.length)} en vue` : "Mer d'huile", tk.length ? tk.slice(0, 5).join(" · ") : "Aucun agent en mission.");
    say(CHIEF_NAME, tk.length ? `Cap sur ${tk[0]}${tk.length > 1 ? ` puis ${tk.length - 1} autre${s_(tk.length - 1)} île${s_(tk.length - 1)}` : ""} ! ${back ? `Et ${back} terre${s_(back)} inexplorée${s_(back)} au backlog.` : ""} 🧭`
      : `Pas un agent en mer.${back ? ` ${back} ticket${s_(back)} attend${back > 1 ? "ent" : ""} au port.` : ""} ⚓`, 4500);
    crewAdd(CHIEF_NAME, { ennui: -4 }); sfx("commit");
  }]] }));
new StyledDesk(pirate({ type: "deskpirate", cat: "bureau", room: "office", workstation: true, name: "Bureau de l'intendant", price: 1100, w: 40, d: 14, art: "isodeskpirate", seat: [20, 24], surface: { z: 13.4 },
  desc: "Des planches clouées sur deux tonneaux, le grand livre de comptes ouvert, des piles de doublons, l'encrier et sa plume, une lanterne. La place d'un dev (ordinateur et chaise à part).",
  styles: WOODS }));
// the captain's wheel: the chief's desk of the theme; ChiefOS opens there as a galleon (ui/chiefos.js osSkin); he can steer
new class extends ChiefDesk {
  isoState(it, t) { const on = now() < (it.steerUntil || 0); return { w: hub.styleOf(it).w, frame: still() ? 0 : anim(t, 300) % 12, spin: on && !still() ? t / 260 : (it.spin || 0) }; }
  pie(it) { return [...super.pie(it), ["steer", "☸️", "Prendre la barre"]]; }
  perform(it, id) {
    if (id !== "steer") return super.perform(it, id);
    enqueue("☸️", "Prendre la barre", () => chiefVisit(it, () => {
      it.steerUntil = now() + 5000; it.spin = Math.random() * 6; sfx("achievement");
      const n = atSea().length;
      say(CHIEF_NAME, pick([`Cap sur la prod, moussaillons ! ${n ? `${n} agent${s_(n)} à la manœuvre.` : ""} ☸️`, "Larguez les amarres, on déploie ! ☸️", "Barre à tribord, toute ! On évite le récif du vendredi soir. ☸️"]), 4000);
      crewAdd(CHIEF_NAME, { ennui: -10, moral: 3 }); addMoodlet(CHIEF_NAME, "helm", "☸️", "J'ai tenu la barre", 4, 60);
      const people = others(it.room); if (people.length) setTimeout(() => say(pick(people), pick(["À vos ordres, capitaine ! 🫡", "Terre en vue ! 🏝️", "J'ai le mal de mer… 🤢"]), 3000), 1500);
    }));
    return true;
  }
}(pirate({ type: "chiefdeskwheel", chiefDesk: true, osSkin: "galion", cat: "bureau", name: "Barre du capitaine", price: 3200, room: "office", unique: true, w: 34, d: 16, art: "isochiefdeskwheel",
  spots: [{ x: 17, y: 24, face: [0, -1] }],
  desc: "Ton poste de capitaine : la grande roue à poignées sur son fût, l'habitacle et son compas, un pupitre à cartes. Assis là, ChiefOS s'ouvre en Galion. Clic : prendre la barre.",
  styles: WOODS }));

/* ---------- things of the sea ---------- */
// the treasure chest: the gold rises with the agents' missions delivered (the day's loot); clic: count the loot
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, gold: Math.min(1, delivered() / 6), frame: still() ? 0 : anim(t, 220) % 16 }; }
}(pirate({ type: "treasure", cat: "deco", name: "Coffre au trésor", price: 1500, w: 14, d: 10, rots: 4, art: "isotreasure",
  desc: "Un coffre cerclé de fer, le couvercle grand ouvert. Il se remplit de doublons et de pierreries à chaque mission livrée par un vrai agent ; au-delà de six, ça déborde. Clic : compter le butin.",
  styles: sty([["chene", "Chêne", "#6a4426"], ["noir", "Bois noirci", "#3a2a1e"], ["rouge", "Laque rouge", "#7a2a22"]], "w"),
  actions: [["loot", "💰", "Compter le butin", () => {
    const d = delivered(), mr = agents().filter(a => a.game?.mr).length, merged = pipes().filter(p => p.state === "merged").length;
    toast("BUTIN 💰", d ? `${d} mission${s_(d)} livrée${s_(d)}` : "Le coffre est vide", `${mr} MR ouverte${s_(mr)}${merged ? ` · ${merged} fusionnée${s_(merged)}` : ""}`);
    say(CHIEF_NAME, d ? `${d} prise${s_(d)} aujourd'hui ! Doublons pour tout l'équipage ! 💰🏴‍☠️` : "Pas un doublon… Au travail, bande de marins d'eau douce ! 💰", 4000);
    for (const n of [CHIEF_NAME, ...others(hub.curRoom())]) crewAdd(n, { moral: d ? 4 : 0, ennui: -4 });
    sfx(d ? "achievement" : "commit");
  }]] }));
// the ship's bell: it strikes the watch (a stroke per half hour of the watch) and calls the crew on deck (the agents at work)
new class extends Gadget {
  isoState(it, t) { return { ring: now() < (it.ringUntil || 0), frame: still() ? 0 : anim(t, 150) % 4 }; }
}(pirate({ type: "shipbell", cat: "deco", name: "Cloche du bord", price: 600, w: 8, d: 8, rots: 1, art: "isoshipbell",
  desc: "Une cloche de laiton sous sa potence de chêne. Clic : piquer l'heure à la façon des marins (un coup par demi-heure de quart) et rassembler l'équipage : qui est à son poste.",
  styles: [{ id: "laiton", name: "Laiton", sw: "#c9a040" }],
  actions: [["bell", "🔔", "Piquer l'heure", it => {
    it.ringUntil = now() + 2500;
    const d = clockNow(), strokes = ((d.getHours() % 4) * 2 + (d.getMinutes() >= 30 ? 1 : 0)) || 8, n = atSea().length, b = agents().filter(a => a.status === "blocked").length;
    say(CHIEF_NAME, `${"DING-DING ".repeat(Math.floor(strokes / 2))}${strokes % 2 ? "DING " : ""}— ${strokes} coup${s_(strokes)} ! 🔔`, 3000); sfx("verify");
    setTimeout(() => say(CHIEF_NAME, n ? `Tout le monde sur le pont : ${n} agent${s_(n)} à la manœuvre${b ? `, ${b} échoué${s_(b)} sur un récif` : ""}. 🔔` : "Le pont est désert : tout l'équipage est à terre. ⚓", 4500), 2200);
    for (const p of others(it.room)) crewAdd(p, { social: 5, ennui: -4 });
  }]] }));
// the parrot: he repeats what he hears, the tickets of the agents at sea, the questions waiting
const COCO = ["Coco veut une MR ! Coco veut une MR !", "Pièces de huit ! Pièces de huit !", "Rrrebase ! Rrrebase !", "Push --force ? Jamais ! Jamais !", "Tests verrrts ! Tests verrrts !"];
new class extends Gadget {
  isoState(it, t) { return { c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 300) % 4, talk: now() < (it.talkUntil || 0) }; }
}(pirate({ type: "parrot", cat: "deco", name: "Perroquet sur son perchoir", price: 800, w: 8, d: 8, rots: 1, art: "isoparrot",
  desc: "Un ara sur son perchoir en T, sa mangeoire de cuivre. Il répète ce qu'il entend : les tickets des agents en mission, et il crie quand une question attend. Clic : lui parler.",
  styles: sty([["ara", "Ara rouge", "#d8332a"], ["vert", "Amazone verte", "#3a9a3a"], ["bleu", "Ara bleu", "#2a6ad0"]]),
  actions: [["talk", "🦜", "Parler au perroquet", it => {
    it.talkUntil = now() + 3500;
    const q = (hub.data?.questions || [])[0], tk = ticketsAtSea();
    const line = q ? `Question ! Question ! ${q.ticket ? `${q.ticket} ! ` : ""}Rrréponds !` : tk.length ? `${pick(tk)} ! ${pick(tk)} ! Crrroa !` : pick(COCO);
    say(CHIEF_NAME, `🦜 « ${line} »`, 4000); crewAdd(CHIEF_NAME, { ennui: -5, social: 3 }); sfx("tap");
  }]] }));
// the cannon: a salvo, one shot per MR merged (the pipelines' state); it fires on its own during the security alarm
new class extends Gadget {
  isoState(it, t) { const fire = alarmOn() || now() < (it.fireUntil || 0); return { fire: fire && !still(), frame: anim(t, 110) % 8 }; }
}(pirate({ type: "cannon", cat: "deco", name: "Canon", price: 1400, w: 20, d: 10, rots: 4, art: "isocannon",
  desc: "Un canon de fonte sur son affût à quatre roues, ses boulets à côté. Il tire tout seul pendant l'alarme sécurité. Clic : une salve d'honneur, un coup par MR fusionnée.",
  styles: [{ id: "fonte", name: "Fonte", sw: "#2e2e36" }],
  actions: [["fire", "💥", "Tirer une salve", it => {
    const merged = pipes().filter(p => p.state === "merged").length, shots = Math.max(1, Math.min(merged, 7));
    it.fireUntil = now() + 900 * shots; sfx("boss");
    say(CHIEF_NAME, merged ? `${"BOUM ! ".repeat(Math.min(shots, 3)).trim()} ${merged} MR fusionnée${s_(merged)}, ${merged} coup${s_(merged)} de canon ! 💥` : "BOUM ! Un coup pour la prochaine MR. 💥", 4000);
    crewAdd(CHIEF_NAME, { ennui: -8 });
    const people = others(it.room); if (people.length) setTimeout(() => say(pick(people), pick(["Mes oreilles !! 🙉", "Feu à volonté ! 🏴‍☠️", "Il a encore troué la cloison… 😬"]), 2500), 900);
  }]] }));
// the message in a bottle: it carries the oldest question an agent is waiting on
new class extends Gadget {
  isoState(it, t) { return { on: (hub.data?.questions || []).length > 0, frame: still() ? 0 : anim(t, 500) % 2 }; }
}(pirate({ type: "bottle", cat: "deco", name: "Bouteille à la mer", price: 260, w: 10, d: 10, rots: 4, art: "isobottle",
  desc: "Une bouteille échouée sur un petit tas de sable, un message roulé dedans. Elle luit quand un agent attend une réponse. Clic : lire le message (la plus ancienne question).",
  styles: [{ id: "verte", name: "Verre vert", sw: "#2a7a4a" }],
  actions: [["read", "📜", "Lire le message", () => {
    const qs = hub.data?.questions || [], q = qs[0];
    if (!q) { say(CHIEF_NAME, "« Tout va bien, capitaine. Signé : l'équipage. » Aucune question. 📜", 3500); sfx("commit"); return; }
    const txt = String(q.question || "").replace(/\s+/g, " ");
    toast("BOUTEILLE 📜", `${q.ticket || q.agent || "Un agent"} t'écrit`, `${txt.slice(0, 140)}${txt.length > 140 ? "…" : ""}${qs.length > 1 ? ` (+${qs.length - 1} autre${s_(qs.length - 1)})` : ""}`);
    say(CHIEF_NAME, `Un message à la mer ! ${qs.length > 1 ? `${qs.length} agents m'appellent.` : "Un agent m'appelle."} Réponds dans ChiefOS → Questions. 📜`, 4000); sfx("verify");
  }]] }));
// the spyglass: land in sight, the tickets waiting in the backlog
new class extends Gadget {
  isoState(it, t) { return { frame: still() ? 0 : anim(t, 700) % 6 }; }
}(pirate({ type: "spyglass", cat: "deco", name: "Longue-vue", price: 650, w: 10, d: 10, rots: 4, art: "isospyglass",
  desc: "Une longue-vue de laiton sur son trépied, qui balaie l'horizon. Clic : regarder au loin, les tickets qui attendent au backlog.",
  styles: [{ id: "laiton", name: "Laiton", sw: "#c9a040" }],
  actions: [["look", "🔭", "Regarder au loin", () => {
    const back = hub.data?.backlog || [];
    say(CHIEF_NAME, back.length ? `Terre en vue ! ${back.length} ticket${s_(back.length)} à l'horizon : ${back[0].id}${back[0].summary ? ` — « ${String(back[0].summary).slice(0, 50)} »` : ""}. 🔭` : "Rien à l'horizon : le backlog est vide. Mer calme. 🔭", 5000);
    crewAdd(CHIEF_NAME, { ennui: -4 }); sfx("commit");
  }]] }));
// the kraken's barrel: a tentacle rises per red CI on the agents' MRs; clic: feed it (calms it for a moment)
new class extends Gadget {
  isoState(it, t) { return { n: now() < (it.fedUntil || 0) ? 0 : redCi(), c: hub.styleOf(it).c, frame: still() ? 0 : anim(t, 200) % 31 }; }
}(pirate({ type: "kraken", cat: "deco", name: "Tonneau du kraken", price: 1100, w: 12, d: 12, rots: 1, art: "isokraken",
  desc: "Un tonneau dont le couvercle a sauté. Dedans, un petit kraken : un tentacule sort par CI rouge sur les MR des agents ; quand tout est vert, il se contente de regarder. Clic : lui donner un poisson.",
  styles: sty([["violet", "Kraken violet", "#8a3a7a"], ["rouge", "Kraken rouge", "#a83a3a"], ["vert", "Kraken vert", "#3a8a6a"]]),
  actions: [["feed", "🐟", "Donner un poisson", it => {
    const r = redCi(); it.fedUntil = now() + 8000;
    say(CHIEF_NAME, r ? `Tiens, un poisson… ${r} CI rouge${s_(r)}, il a faim de pipelines ! 🐙` : "Il est calme : toutes les CI sont vertes. Bon kraken. 🐙", 4000);
    crewAdd(CHIEF_NAME, { ennui: -5 }); sfx(r ? "fail" : "commit");
  }]] }));
// the rum barrel: a round of grog for the room (§ 2 a glass)
new class extends Gadget {
  isoState(it, t) { return { w: hub.styleOf(it).w, pour: now() < (it.pourUntil || 0), frame: still() ? 0 : anim(t, 150) % 2 }; }
}(pirate({ type: "rumbarrel", cat: "deco", name: "Tonneau de rhum", price: 700, w: 14, d: 12, rots: 4, art: "isorumbarrel",
  desc: "Un gros tonneau couché sur son berceau, un robinet de laiton, XXX peint dessus, un quart en fer-blanc. Clic : une tournée de grog pour toute la pièce (§ 2 le verre).",
  styles: WOODS,
  actions: [["grog", "🥃", "Tournée de grog", it => {
    const people = others(it.room), cost = 2 * (people.length + 1);
    if (!spend(cost, "Tournée de grog")) return;
    it.pourUntil = now() + 3000; sfx("pass");
    say(CHIEF_NAME, pick(["Une tournée de grog pour l'équipage ! Yo-ho-ho ! 🥃", "À la santé de la release ! 🥃", "Quinze hommes sur le coffre du mort… 🎶"]), 3500);
    for (const n of [CHIEF_NAME, ...people]) { crewAdd(n, { social: 8, ennui: -6, moral: 2 }); addMoodlet(n, "grog", "🥃", "Une tournée de grog", 3, 45); }
    if (people.length) setTimeout(() => say(pick(people), pick(["Yo-ho-ho ! 🏴‍☠️", "Et une bouteille de rhum ! 🎶", "Ça réchauffe ! 🥃"]), 2500), 1200);
  }]] }));
new class extends Plant {
  isoState(it, t) { return { ...super.isoState(it), frame: still() ? 0 : anim(t, 600) % 4 }; }
}(pirate({ type: "palmbarrel", cat: "plantes", name: "Palmier en tonneau", price: 420, w: 12, d: 12, rots: 1, art: "isopalm", plant: true,
  desc: "Un cocotier dans un demi-tonneau, ses palmes qui ondulent, deux noix de coco. Clic : l'arroser.", styles: [{ id: "cocotier", name: "Cocotier", sw: "#3f9e4f" }] }));
