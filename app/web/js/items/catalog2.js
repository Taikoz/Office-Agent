// More of the catalog: coffee machines from the worst to the best (their tier sets what a coffee break gives,
// world/place.js syncOffice), windows of several kinds (the sky of the hour behind their glass, whatever its shape),
// lights on the floor, on the wall and from the ceiling (their light at night, iso/rooms.js lampsOver).

import { SvgArt, shade } from "../svg/base.js";
import { drawSky } from "../svg/sky.js";
import { S, ctx } from "../core/core.js";
import { hub } from "../hub.js";
import { sfx } from "../sims/progress.js";
import { Item } from "./base.js";
import { Colored } from "./furniture.js";
import { Lamp } from "./lamp.js";
import "../svg/isolights.js";  // the lights' drawings

const all = st => { const { id: _i, name: _n, sw: _s, ...art } = st; return art; };
const sty = (key, list) => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));

/* ---------- coffee machines (role coffee: the office's coffee spot; the break room's kitchen too) ---------- */
class Coffee extends Colored { artState(st) { return all(st); } }
const coffee = (type, name, price, w, d, art, cup, desc, styles) => new Coffee({ type, cat: "cafe", name, price, room: "any", w, d, rots: 2, art, role: "coffee", act: "kitchen",
  coffee: cup, spots: [{ x: w / 2, y: d + 8, face: [0, -1] }], desc: `Niveau ${cup.tier}/4 · ${desc}`, styles });
coffee("coffeefilter", "Cafetière filtre", 120, 14, 8, "isocoffeefilter", { tier: 1, cafe: 25, moral: 0, fatigue: -6, wait: 6000 },
  "Un café tiède qui attend depuis ce matin. Ça dépanne, sans plus.", sty("c", [["noir", "Noire", "#1c1c22"], ["blanc", "Blanche", "#e6e6ea"], ["rouge", "Rouge", "#b8332a"]]));
coffee("coffeecapsule", "Machine à capsules", 380, 14, 8, "isocoffeecapsule", { tier: 2, cafe: 35, moral: 2, fatigue: -9, wait: 3500 },
  "Rapide et pratique, une capsule par café.", sty("c", [["rouge", "Rouge", "#c0303a"], ["noir", "Noire", "#2a2a30"], ["blanc", "Blanche", "#e6e6ea"], ["bleu", "Bleue", "#2a5a9a"], ["jaune", "Jaune", "#e8b83a"]]));
coffee("coffeepro", "Machine à levier de barista", 3500, 26, 9, "isocoffeepro", { tier: 4, cafe: 60, moral: 8, fatigue: -18, wait: 5500 },
  "Deux groupes à levier, un dôme, un manomètre : un vrai café de barista, et l'équipe le sent.", sty("c", [["chrome", "Chrome", "#c9ccd6"], ["cuivre", "Cuivre", "#c87a4a"], ["noir", "Noire", "#2a2a30"]]));

/* ---------- windows: a frame (the glass left clear), the sky drawn behind the glass in its shape ---------- */
class FrameArt extends SvgArt {
  constructor(name, w, h, fn) { super(name, w, h); this.fn = fn; }
  body(o) { return this.fn(o); }
}
// glass: { x, y, w, h, shape: "rect" | "round" | "arch" } in the window's own units
class Win extends Item {
  artState(st) { return all(st); }
  behind(it, t) {
    const g = this.glass, x = (it.x + g.x) * S, y = (it.y + g.y) * S, w = g.w * S, h = g.h * S;
    ctx.save(); ctx.beginPath();
    if (g.shape === "round") ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
    else if (g.shape === "arch") { ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
    else ctx.rect(x, y, w, h);
    ctx.clip(); ctx.translate(x, y); ctx.scale(g.w / 46, g.h / 28);
    drawSky(0, 0, t);  // the sky of the hour and the tests' weather (svg/sky.js), stretched to the glass
    ctx.restore();
  }
}
const ring = (cx, cy, r0, r1) => `M${cx - r0} ${cy}a${r0} ${r0} 0 1 0 ${2 * r0} 0a${r0} ${r0} 0 1 0 ${-2 * r0} 0ZM${cx - r1} ${cy}a${r1} ${r1} 0 1 1 ${2 * r1} 0a${r1} ${r1} 0 1 1 ${-2 * r1} 0Z`;
const glint = (x, y) => `<path fill="#ffffff" fill-opacity=".35" d="M${x} ${y}h3l-5 6v-3z"/>`;
const win = (type, name, price, w, h, glass, art, desc, styles, more = {}) => new (more.cls || Win)({ type, cat: "fenetres", name, price, room: "any", kind: "wall", w, h, glass,
  art2d: new FrameArt(`wall${type}`, w, h, art), desc: `${desc} Derrière la vitre, le ciel de l'heure et la météo des tests.`, styles, ...more });
win("windowbay", "Baie vitrée", 900, 100, 50, { x: 3, y: 3, w: 94, h: 42 },
  ({ f = "#2a2a30" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 0H100V50H0ZM3 3V45H97V3Z"/><rect x="32" y="3" width="2" height="42" fill="${f}"/><rect x="66" y="3" width="2" height="42" fill="${f}"/>`
    + `<rect x="-1" y="45" width="102" height="5" fill="${shade(f, 1.3)}"/>${glint(8, 8)}${glint(42, 10)}${glint(76, 8)}`,
  "Du sol presque au plafond, trois grands pans de verre.", sty("f", [["noir", "Alu noir", "#2a2a30"], ["blanc", "Alu blanc", "#e6e6ea"], ["bois", "Bois", "#8a6a4a"]]));
win("windowround", "Hublot", 260, 30, 30, { x: 4, y: 4, w: 22, h: 22, shape: "round" },
  ({ f = "#c9a24b" }) => `<path fill-rule="evenodd" fill="${f}" d="${ring(15, 15, 15, 11)}"/>` + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<circle cx="${(15 + Math.cos(a) * 13).toFixed(2)}" cy="${(15 + Math.sin(a) * 13).toFixed(2)}" r=".8" fill="${shade(f, 0.7)}"/>`; }).join("")
    + glint(10, 8),
  "Un hublot rond cerclé de rivets, comme dans un sous-marin.", sty("f", [["laiton", "Laiton", "#c9a24b"], ["chrome", "Chrome", "#c9ccd6"], ["noir", "Noir", "#2a2a30"]]));
win("windowstained", "Vitrail", 1200, 28, 46, { x: 3, y: 3, w: 22, h: 40, shape: "arch" },
  ({ f = "#8d8a80", a = "#c0303a", b = "#2a5a9a", c = "#e8c23a" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 46V14A14 14 0 0 1 28 14V46ZM3 43H25V14A11 11 0 0 0 3 14Z"/>`
    + `<g fill-opacity=".55"><path fill="${b}" d="M3 14A11 11 0 0 1 14 3V14Z"/><path fill="${a}" d="M14 3A11 11 0 0 1 25 14H14Z"/><rect x="3" y="14" width="11" height="14" fill="${c}"/><rect x="14" y="14" width="11" height="14" fill="${b}"/>`
    + `<rect x="3" y="28" width="11" height="15" fill="${a}"/><rect x="14" y="28" width="11" height="15" fill="${c}"/><circle cx="14" cy="21" r="5" fill="#ffffff"/></g>`
    + `<path fill="none" stroke="#2a2a30" stroke-width=".6" d="M14 3V43M3 14H25M3 28H25"/><circle cx="14" cy="21" r="5" fill="none" stroke="#2a2a30" stroke-width=".6"/>`,
  "Une arche de verre coloré sertie de plomb ; la lumière la traverse.", [{ id: "classique", name: "Classique", sw: "#c0303a", a: "#c0303a", b: "#2a5a9a", c: "#e8c23a" },
    { id: "bleu", name: "Camaïeu bleu", sw: "#2a5a9a", a: "#3a7ac0", b: "#1d3a6a", c: "#8ec5ff" }, { id: "ambre", name: "Ambre", sw: "#e8a03a", a: "#c86a2a", b: "#e8a03a", c: "#f4d47a" }]);
win("windowloft", "Verrière d'atelier", 1100, 72, 46, { x: 2, y: 2, w: 68, h: 42 },
  ({ f = "#1c1c22" }) => `<path fill-rule="evenodd" fill="${f}" d="M0 0H72V46H0ZM2 2V44H70V2Z"/>` + [19, 36, 53].map(x => `<rect x="${x}" y="2" width="1.4" height="42" fill="${f}"/>`).join("")
    + [16, 30].map(y => `<rect x="2" y="${y}" width="68" height="1.2" fill="${f}"/>`).join("") + glint(6, 5) + glint(40, 18),
  "Une verrière de loft en acier, petits carreaux.", sty("f", [["noir", "Acier noir", "#1c1c22"], ["vert", "Vert anglais", "#1f4a32"], ["blanc", "Blanc", "#e6e6ea"]]));
// the window with a venetian blind: a click opens or closes the slats
class Blind extends Win {
  pie(it) { return [["blind", it.closed ? "🔆" : "🌗", it.closed ? "Ouvrir le store" : "Fermer le store"]]; }
  act(it, id) { if (id !== "blind") return false; it.closed = !it.closed; hub.saveBuild(); sfx("commit"); return true; }
  state(it) { return !!it.closed; }
}
win("windowblind", "Fenêtre à store vénitien", 480, 58, 41, { x: 4, y: 4, w: 50, h: 33 },
  ({ f = "#f4f2ea", on: closed = false }) => `<path fill-rule="evenodd" fill="${shade(f, 0.9)}" d="M0 0H58V41H0ZM4 4V37H54V4Z"/><rect x="2" y="1.4" width="54" height="3" fill="${f}"/>`
    + Array.from({ length: 11 }, (_, i) => `<rect x="4" y="${4 + i * 3}" width="50" height="${closed ? 3 : 0.9}" fill="${f}"${closed ? "" : ' fill-opacity=".95"'}/>`).join("")
    + `<rect x="50" y="4" width=".4" height="${closed ? 33 : 20}" fill="${shade(f, 0.6)}"/><rect x="-1" y="37" width="60" height="4" fill="${shade(f, 1.05)}"/>`,
  "Des lamelles qui s'ouvrent ou se ferment d'un clic.", sty("f", [["blanc", "Blanc", "#f4f2ea"], ["bois", "Bois", "#b08860"], ["noir", "Noir", "#3a3a40"]]), { cls: Blind });

/* ---------- lights: a click switches them on or off; their light at night has their colour ---------- */
const lamp = (type, name, price, w, d, art, light, desc, styles, more = {}) => new (class extends Lamp { artState(st) { return all(st); } })({
  type, cat: "lumiere", name, price, room: "any", w, d, art, light, desc: `${desc} Clic : allumer, éteindre.`, styles, ...more });
lamp("lamparc", "Lampadaire arc", 420, 14, 14, "isolamparc", 38, "Un pied en marbre, un arc d'acier, une coupole qui flotte au-dessus du canapé.",
  sty("c", [["chrome", "Chrome", "#c9ccd6"], ["laiton", "Laiton", "#c9a24b"], ["noir", "Noir", "#2a2a30"]]), { lightR: 52, lightAt: [11.5, 2.5] });  // its light: under the dome, far from the foot
lamp("lamptripod", "Lampe trépied", 260, 12, 12, "isolamptripod", 34, "Trois pieds en bois, un grand abat-jour tambour.",
  sty("c", [["noir", "Abat-jour noir", "#2a2a30"], ["blanc", "Abat-jour blanc", "#e6e2d8"], ["moutarde", "Abat-jour moutarde", "#c89a2a"]]));
lamp("lampled", "Colonne LED", 300, 8, 8, "isolampled", 30, "Une barre de lumière colorée, ambiance gaming.",
  [["violet", "Violet", "#b46bff"], ["cyan", "Cyan", "#3bc4ff"], ["rose", "Rose", "#ff4fb8"], ["vert", "Vert", "#4dff88"], ["orange", "Orange", "#ff9a3b"]].map(([id, name, c]) => ({ id, name, sw: c, c, lc: c })), { lightR: 38 });
lamp("pendant", "Suspension", 220, 10, 10, "isopendant", 47, "Elle pend du plafond : au-dessus d'une table ou d'un bureau, on passe dessous.",
  sty("c", [["noir", "Noire", "#2a2a30"], ["blanc", "Blanche", "#e6e6ea"], ["laiton", "Laiton", "#c9a24b"], ["vert", "Vert émaillé", "#2f6e4c"]]), { walkable: true, lightR: 42 });
lamp("chandelier", "Lustre en cristal", 2500, 16, 16, "isochandelier", 54, "Six bougies, des pampilles de cristal, des bras dorés : la grande classe.",
  sty("c", [["or", "Doré", "#d4a640"], ["argent", "Argenté", "#c9ccd6"]]), { walkable: true, lightR: 72, lc: "#ffe3a0" });
// the wall sconce: a plate, an arm, a shade; it glows on the wall at night (like the neon signs)
class Sconce extends Item {
  artState(st) { return all(st); }
  thumbState() { return true; }
  pie(it) { return [["lamp", it.off ? "💡" : "🌑", it.off ? "Allumer" : "Éteindre"]]; }
  act(it, id) { if (id !== "lamp") return false; it.off = !it.off; hub.saveBuild(); sfx("commit"); return true; }
  state(it) { return !it.off; }
}
new Sconce({ type: "sconce", cat: "lumiere", name: "Applique murale", price: 140, room: "any", kind: "wall", w: 10, h: 14, hang: 20, glow: true, desc: "Au mur, une lumière douce le soir. Clic : allumer, éteindre.",
  // a brass wall plate, a curved arm, a pleated shade; lit: the bulb glows under it and the shade is warm
  art2d: new FrameArt("wallsconce", 10, 14, ({ f = "#c9a24b", on = true }) => `<defs><linearGradient id="sc" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>`
    + `<radialGradient id="sg"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#ffe08a" stop-opacity=".8"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient></defs>`
    + `<rect x="3.6" y="9.4" width="2.8" height="4.4" rx="1.2" fill="${shade(f, 0.75)}"/><rect x="3.9" y="9.6" width="2.2" height="4" rx="1" fill="${f}"/><rect x="3.9" y="9.6" width="2.2" height="4" rx="1" fill="url(#sc)"/><circle cx="5" cy="11.6" r=".35" fill="${shade(f, 0.6)}"/>`
    + `<path fill="none" stroke="${shade(f, 0.7)}" stroke-width=".9" d="M5 10.4C5 8.6 5 8 5 6.4"/><path fill="none" stroke="${f}" stroke-width=".5" d="M5 10.4C5 8.6 5 8 5 6.4"/>`
    + (on ? `<ellipse cx="5" cy="6.6" rx="3.6" ry="1.8" fill="url(#sg)"/>` : "")
    + `<path fill="${on ? "#fff1c4" : "#e8e2cf"}" d="M1.7 6.4H8.3L7 .8H3Z"/><path fill="url(#sc)" d="M1.7 6.4H8.3L7 .8H3Z"/>`
    + `<path fill="none" stroke="${on ? "#e8b860" : "#c9bfa4"}" stroke-opacity=".7" stroke-width=".2" d="M3.6 .9L3 6.3M5 .9V6.3M6.4 .9L7 6.3"/>`
    + `<rect x="1.5" y="6.1" width="7" height=".55" rx=".25" fill="${shade(f, 0.85)}"/><rect x="2.9" y=".6" width="4.2" height=".45" rx=".2" fill="${shade(f, 0.85)}"/>`
    + (on ? `<ellipse cx="5" cy="6.9" rx="1.2" ry=".5" fill="#fffbe6"/>` : "")),
  styles: [["laiton", "Laiton", "#c9a24b"], ["noir", "Noire", "#2a2a30"], ["blanc", "Blanche", "#e6e6ea"]].map(([id, name, f]) => ({ id, name, sw: f, f, c: "#ffd678" })) });
