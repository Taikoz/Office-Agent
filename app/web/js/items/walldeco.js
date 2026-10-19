// Wall decoration of the shop: glowing neon signs (their light shows at night, iso/rooms.js lampsOver), framed
// posters (the frame chosen as a style), clocks that give the real time (a seconds hand, a swinging pendulum).

import { hub } from "../hub.js";
import { SvgArt, shade } from "../svg/base.js";
import { sfx } from "../sims/progress.js";
import { clockNow } from "../sims/days.js";
import { Item } from "./base.js";

const n2 = v => +(+v).toFixed(2);
const FONT = "font-family=\"'Trebuchet MS','Arial Rounded MT Bold',sans-serif\" font-weight=\"bold\"";
const SCRIPT = "font-family=\"'Brush Script MT','Segoe Script',cursive\" font-style=\"italic\" font-weight=\"bold\"";
// a 2D wall art from a function of its state (the style's colours, the time…)
export class WallArt extends SvgArt {
  constructor(name, w, h, fn, opts) { super(name, w, h, opts); this.fn = fn; }
  body(o) { return this.fn(o); }
}
// the colours of a style go to the art as they are
export class WallDeco extends Item {
  artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; }
}

/* ---------- neon signs: a halo (blurred), the glass tube, its white-hot core; on a clear acrylic plate ---------- */
// shape(colour, width): the strokes of the sign
function neonArt(name, w, h, shape) {
  return new WallArt(name, w, h, ({ c = "#ff4fb8", on = true }) => {
    if (!on) return `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="1.5" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".14" stroke-width=".3"/>`  // switched off: the cold glass tube
      + `<g opacity=".55">${shape(shade(c, 0.45), 1.3)}</g><g opacity=".5">${shape("#d8dde6", 0.4)}</g>`;
    const glow = `<filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter>`;
    return `<defs>${glow}</defs><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="1.5" fill="#ffffff" fill-opacity=".07" stroke="#ffffff" stroke-opacity=".18" stroke-width=".3"/>`
      + [[1.5, 1.5], [w - 1.5, 1.5], [1.5, h - 1.5], [w - 1.5, h - 1.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".5" fill="#c9ccd6"/>`).join("")
      + `<g filter="url(#g)" opacity=".95">${shape(c, 2.6)}</g><g opacity=".9">${shape(c, 1.1)}</g><g opacity=".85">${shape("#ffffff", 0.4)}</g>`;
  }, { outline: 0, pad: 4 });
}
const stroke = (c, sw) => `fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"`;
const tpath = d => (c, sw) => `<path ${stroke(c, sw)} d="${d}"/>`;
const ttext = (txt, x, y, size, font = FONT, more = "") => (c, sw) => `<text x="${x}" y="${y}" font-size="${size}" ${font} text-anchor="middle" ${stroke(c, sw * 0.5)}${more}>${txt}</text>`;
const both = (...fs) => (c, sw) => fs.map(f => f(c, sw)).join("");
const NEON = (extra = []) => [["rose", "Rose", "#ff4fb8"], ["bleu", "Bleu glacier", "#3bc4ff"], ["vert", "Vert acide", "#4dff88"], ["jaune", "Jaune", "#ffe14d"], ...extra].map(([id, name, c]) => ({ id, name, sw: c, c }));
const neons = [
  ["neononair", "Néon ON AIR", 140, 40, 14, "Quand ça tourne, ça se voit.", ttext("ON AIR", 20, 9.6, 8), [["rouge", "Rouge", "#ff3b3b"]]],
  ["neoncode", "Néon </>", 160, 30, 16, "Le signe des devs.", tpath("M10 4L4 8L10 12M20 4L24 8L20 12M16.5 3L13.5 13"), [["violet", "Violet", "#b46bff"]]],
  ["neonbolt", "Néon éclair", 120, 16, 22, "Un éclair d'énergie.", tpath("M10 1.5L3.5 12H8L5.5 20.5L12.5 8.5H8L10 1.5Z"), [["blanc", "Blanc", "#f4f8ff"]]],
  ["neonheart", "Néon cœur", 120, 20, 18, "Pour l'amour du code.", tpath("M10 16C2 10.5 1.5 6 3.5 3.8C5.5 1.8 8.6 2.4 10 5C11.4 2.4 14.5 1.8 16.5 3.8C18.5 6 18 10.5 10 16Z"), [["rouge", "Rouge", "#ff3b3b"]]],
  ["neoncoffee", "Néon café", 150, 34, 22, "Une tasse qui fume, et le mot qui va avec.", both(tpath("M6 9H16V14C16 16.5 14 18 11 18C8 18 6 16.5 6 14Z M16 10.5C18.5 10.5 18.5 14 16 14 M8.5 3C9.5 4.5 7.5 5.5 8.5 7 M12 2.5C13 4 11 5 12 6.5"), ttext("COFFEE", 26.5, 13.5, 4.2)), [["orange", "Orange", "#ff9a3b"]]],
  ["neonhello", "Néon Hello", 140, 40, 16, "Écrit à la main, en lettres liées.", ttext("Hello", 20, 11.5, 10, SCRIPT), [["violet", "Violet", "#b46bff"]]],
  ["neoninvader", "Néon envahisseur", 170, 22, 18, "Un alien pixel des années 80.", tpath("M6 2L8 4M16 2L14 4M7 4H15V6H17V8H19V12H17V10H15V12H7V10H5V12H3V8H5V6H7Z M8 7H9V8H8Z M13 7H14V8H13Z M7 12V14H9 M15 12V14H13"), [["violet", "Violet", "#b46bff"]]],
  ["neoncactus", "Néon cactus", 130, 16, 24, "Un cactus qui ne pique pas.", tpath("M8 22V4C8 2 11 2 11 4V22 M8 13H5C3.5 13 3 12 3 10.5V8 M11 10H13.5C15 10 15.5 9 15.5 7.5V6 M4 22H15"), [["blanc", "Blanc", "#f4f8ff"]]],
  ["neonwave", "Néon vague", 140, 40, 12, "Une onde qui court sur le mur.", tpath("M2 6C6 1 8 1 12 6C16 11 18 11 22 6C26 1 28 1 32 6C36 11 38 11 38 9"), [["violet", "Violet", "#b46bff"]]],
  ["neonship", "Néon SHIP IT", 160, 46, 16, "La devise de l'équipe, en grand.", both(ttext("SHIP IT", 23, 9, 7.5), tpath("M9 12.5H37 M33 10.5L37 12.5L33 14.5")), [["orange", "Orange", "#ff9a3b"]]],
];
// a neon has a switch: a click turns it off or on (its light at night too, iso/rooms.js lampsOver)
class Neon extends WallDeco {
  state(it) { return !it.off; }
  thumbState() { return true; }
  pie(it) { return [["switch", "💡", it.off ? "Allumer le néon" : "Éteindre le néon"]]; }
  perform(it, id) { if (id !== "switch") return false; it.off = !it.off; hub.saveBuild?.(); sfx("commit"); return true; }
}
export { Neon, neonArt, ttext, tpath, both, NEON };
for (const [type, name, price, w, h, desc, shape, extra] of neons)
  new Neon({ type, cat: "neons", name, price, room: "any", kind: "wall", w, h, glow: true, art2d: neonArt(`wall${type}`, w, h, shape), desc: `💡 Lumineux · ${desc}`, styles: NEON(extra) });

/* ---------- framed posters: the picture, a mat, the frame (a style: black, oak, gilt, aluminium, white) ---------- */
const FRAMES = [["noir", "Cadre noir", "#1c1c22", 1.2], ["chene", "Cadre chêne", "#a8784a", 1.4], ["dore", "Cadre doré", "#d4a640", 1.8], ["alu", "Cadre alu", "#b8bcc6", 0.8], ["blanc", "Cadre blanc", "#f4f2ea", 1.2]]
  .map(([id, name, f, fw]) => ({ id, name, sw: f, f, fw }));
function posterArt(name, w, h, pic) {
  return new WallArt(name, w, h, ({ f = "#1c1c22", fw = 1.2 }) => {
    const m = fw + 1.1, ix = m, iy = m, iw = w - 2 * m, ih = h - 2 * m;
    let g = `<rect width="${w}" height="${h}" fill="${f}"/>` + `<rect x="${fw}" y="${fw}" width="${w - 2 * fw}" height="${h - 2 * fw}" fill="#f7f5ee"/>`;
    if (fw > 1.6) g += `<rect x=".4" y=".4" width="${w - 0.8}" height="${h - 0.8}" fill="none" stroke="${shade(f, 1.3)}" stroke-width=".3"/><rect x="${fw - 0.4}" y="${fw - 0.4}" width="${w - 2 * fw + 0.8}" height="${h - 2 * fw + 0.8}" fill="none" stroke="${shade(f, 0.7)}" stroke-width=".3"/>`;
    g += `<svg x="${ix}" y="${iy}" width="${iw}" height="${ih}" viewBox="0 0 100 100" preserveAspectRatio="none">${pic}</svg>`;
    return g + `<path d="M${ix} ${iy}L${ix + iw * 0.45} ${iy}L${ix} ${iy + ih * 0.5}Z" fill="#ffffff" fill-opacity=".12"/>`;
  });
}
const T = (x, y, s, c, txt, more = "") => `<text x="${x}" y="${y}" font-size="${s}" ${FONT} fill="${c}" text-anchor="middle"${more}>${txt}</text>`;
const posters = [
  ["postermovie", "Affiche de film rétro", 160, 20, 28, "Une série B des années 50.",
    `<rect width="100" height="100" fill="#f2d9a0"/><circle cx="50" cy="38" r="26" fill="#e8843c"/><path d="M0 70L30 45L55 66L75 50L100 72V100H0Z" fill="#2a3a5a"/><path d="M38 30L50 18L62 30L56 30L56 44L44 44L44 30Z" fill="#c0303a"/>${T(50, 86, 13, "#c0303a", "ATTACK!")}${T(50, 96, 6, "#2a3a5a", "OF THE BUGS")}`],
  ["posterconcert", "Affiche de concert", 140, 20, 28, "Le groupe du week-end dernier.",
    `<rect width="100" height="100" fill="#1c1c22"/><circle cx="50" cy="40" r="30" fill="#ff4fb8"/><circle cx="50" cy="40" r="20" fill="#ffe14d"/><circle cx="50" cy="40" r="9" fill="#3bc4ff"/>${T(50, 85, 14, "#f4f2ea", "LIVE")}${T(50, 96, 6, "#ff4fb8", "PARIS · 21H")}`],
  ["postermap", "Carte du monde", 220, 32, 22, "Pour savoir où sont les serveurs.",
    `<rect width="100" height="100" fill="#cfe4ea"/><path d="M8 25Q15 15 25 22T38 30L32 48Q22 55 15 45Z M30 55Q38 52 40 65L35 90Q28 80 30 55Z M45 20Q60 12 75 18T92 30L85 45Q72 40 62 48L55 40Q48 35 45 20Z M50 50Q58 48 60 60L55 78Q48 70 50 50Z M78 65Q88 62 90 72L82 80Q76 75 78 65Z" fill="#7aa86a"/><path d="M0 50H100M50 0V100" stroke="#ffffff" stroke-width=".8" stroke-opacity=".7"/>`],
  ["posterbauhaus", "Affiche Bauhaus", 180, 22, 30, "Cercle, carré, triangle : l'art moderne.",
    `<rect width="100" height="100" fill="#efe6d2"/><circle cx="34" cy="34" r="22" fill="#d23a2a"/><rect x="50" y="40" width="36" height="36" fill="#2a4a9a"/><path d="M14 92L40 50L66 92Z" fill="#e8c23a"/><rect x="10" y="8" width="80" height="3" fill="#1c1c22"/>`],
  ["posterwave", "La Vague", 260, 32, 22, "L'estampe japonaise de la grande vague.",
    `<rect width="100" height="100" fill="#efe2c4"/><path d="M0 75Q20 30 45 40Q60 46 52 60Q44 66 40 58Q50 56 46 50Q30 44 18 70Q30 62 36 75Q60 70 70 55Q85 30 100 45V100H0Z" fill="#1d3a6a"/><path d="M40 58Q50 56 46 50M52 60Q58 50 50 44" stroke="#f4f2ea" stroke-width="2" fill="none"/><path d="M70 72L78 58L86 72Z" fill="#f4f2ea"/><circle cx="82" cy="20" r="7" fill="#d23a2a"/>`],
  ["postership", "Affiche SHIP IT", 120, 20, 28, "Typographie, la devise de l'équipe.",
    `<rect width="100" height="100" fill="#081746"/>${T(50, 42, 24, "#fbaa08", "SHIP")}${T(50, 72, 24, "#fbaa08", "IT")}<rect x="20" y="82" width="60" height="2" fill="#f4f2ea"/>${T(50, 94, 6, "#f4f2ea", "MOVE FAST · TEST MORE")}`],
  ["postermountain", "Photo de montagne", 200, 32, 22, "Un sommet au lever du soleil.",
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a7a"/><stop offset="1" stop-color="#f2a07a"/></linearGradient></defs><rect width="100" height="100" fill="url(#s)"/><circle cx="72" cy="58" r="10" fill="#ffe0a0"/><path d="M0 85L28 38L44 60L62 30L100 82V100H0Z" fill="#3a3a5a"/><path d="M62 30L70 42L64 40L58 44Z M28 38L34 48L28 46L23 47Z" fill="#f4f4f8"/>`],
  ["postermetro", "Plan de métro", 170, 28, 22, "Les lignes de la ville en couleurs.",
    `<rect width="100" height="100" fill="#f7f5ee"/><path d="M5 30H40L60 50H95" stroke="#d23a2a" stroke-width="4" fill="none"/><path d="M20 90V55L45 30V5" stroke="#2a6fd0" stroke-width="4" fill="none"/><path d="M5 75H50L70 55V20H95" stroke="#3e8e5a" stroke-width="4" fill="none"/><path d="M80 95L60 75H30" stroke="#e8c23a" stroke-width="4" fill="none"/>${[[40, 30], [60, 50], [45, 30], [50, 75], [70, 55], [30, 75]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#ffffff" stroke="#1c1c22" stroke-width="1.4"/>`).join("")}`],
];
for (const [type, name, price, w, h, desc, pic] of posters)
  new WallDeco({ type, cat: "cadres", name, price, room: "any", kind: "wall", w, h, art2d: posterArt(`wall${type}`, w, h, pic), desc: `${desc} Le cadre se choisit.`, styles: FRAMES });

/* ---------- clocks: the real time (the hour, the minutes; a seconds hand, a pendulum on some) ---------- */
class Clock extends WallDeco {
  state(_it, t) { const d = clockNow(); return { h: d.getHours(), m: d.getMinutes(), s: this.secs ? d.getSeconds() : 0, sw: this.swing ? Math.floor(t / 250) % 8 : 0 }; }
  thumbState() { return { h: 10, m: 10, s: 30, sw: 0 }; }
}
const hand = (cx, cy, ang, len, w, c, back = 0) => { const a = (ang - 90) * Math.PI / 180; return `<path d="M${n2(cx - Math.cos(a) * back)} ${n2(cy - Math.sin(a) * back)}L${n2(cx + Math.cos(a) * len)} ${n2(cy + Math.sin(a) * len)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };
const hands = (cx, cy, r, { h = 10, m = 10, s = 0 } = {}, c = "#1c1c22", sec = null) => hand(cx, cy, (h % 12) * 30 + m / 2, r * 0.52, r * 0.1, c, r * 0.1) + hand(cx, cy, m * 6, r * 0.78, r * 0.07, c, r * 0.12)
  + (sec ? hand(cx, cy, s * 6, r * 0.85, r * 0.035, sec, r * 0.2) : "") + `<circle cx="${cx}" cy="${cy}" r="${r * 0.07}" fill="${sec || c}"/>`;
const ticks = (cx, cy, r, c, n = 60) => Array.from({ length: n }, (_, i) => { const a = i * (360 / n) * Math.PI / 180, big = i % (n / 12) === 0, r0 = r * (big ? 0.8 : 0.9); return `<path d="M${n2(cx + Math.sin(a) * r0)} ${n2(cy - Math.cos(a) * r0)}L${n2(cx + Math.sin(a) * r)} ${n2(cy - Math.cos(a) * r)}" stroke="${c}" stroke-width="${big ? r * 0.06 : r * 0.025}"/>`; }).join("");
const clocks = [
  ["clockstation", "Horloge de gare", 180, 24, 24, "Cadran blanc, trotteuse rouge : à l'heure, toujours.", { secs: true },
    ({ on = {}, f = "#1c1c22" }) => `<circle cx="12" cy="12" r="11.5" fill="${f}"/><circle cx="12" cy="12" r="10.2" fill="#f7f7f2"/>${ticks(12, 12, 9.6, "#1c1c22")}${hands(12, 12, 9.6, on, "#1c1c22", "#d23a2a")}`,
    [["noir", "Noir", "#1c1c22"], ["blanc", "Blanc", "#e6e6e6"], ["laiton", "Laiton", "#c9a24b"], ["rouge", "Rouge", "#b8332a"]]],
  ["clockminimal", "Horloge minimaliste", 90, 22, 22, "Sans chiffres, juste deux aiguilles.", {},
    ({ on = {}, f = "#c9a77a" }) => `<circle cx="11" cy="11" r="10.6" fill="${f}"/>${[0, 3, 6, 9].map(i => { const a = i * 30 * Math.PI / 180; return `<circle cx="${n2(11 + Math.sin(a) * 8.6)}" cy="${n2(11 - Math.cos(a) * 8.6)}" r=".7" fill="${shade(f, 0.55)}"/>`; }).join("")}${hands(11, 11, 9.6, on, shade(f, 0.35))}`,
    [["chene", "Chêne", "#c9a77a"], ["blanc", "Blanc", "#f0efe9"], ["noir", "Noir", "#2a2a30"], ["terracotta", "Terracotta", "#c0603e"], ["sauge", "Sauge", "#9caf88"]]],
  ["clocksun", "Horloge soleil", 420, 34, 34, "Des rayons dorés autour du cadran, très années 60.", {},
    ({ on = {}, f = "#d4a640" }) => `${Array.from({ length: 24 }, (_, i) => { const a = i * 15 * Math.PI / 180, r = i % 2 ? 15 : 16.6; return `<path d="M17 17L${n2(17 + Math.sin(a - 0.06) * r)} ${n2(17 - Math.cos(a - 0.06) * r)}L${n2(17 + Math.sin(a + 0.06) * r)} ${n2(17 - Math.cos(a + 0.06) * r)}Z" fill="${i % 2 ? shade(f, 0.8) : f}"/>`; }).join("")}<circle cx="17" cy="17" r="8" fill="${shade(f, 1.15)}"/><circle cx="17" cy="17" r="6.8" fill="#f7f2e2"/>${hands(17, 17, 6.4, on, "#1c1c22")}`,
    [["or", "Doré", "#d4a640"], ["argent", "Argenté", "#b8bcc6"], ["noir", "Noir", "#2a2a30"], ["cuivre", "Cuivre", "#b8683a"]]],
  ["clockdigital", "Horloge digitale", 150, 36, 14, "Chiffres LED, l'heure qui clignote.", { secs: true },
    ({ on = {}, c = "#ff3b3b" }) => { const hh = String(on.h ?? 10).padStart(2, "0"), mm = String(on.m ?? 10).padStart(2, "0"); return `<rect width="36" height="14" rx="1.5" fill="#14141a"/><rect x="1.4" y="1.4" width="33.2" height="11.2" rx="1" fill="#0a0a0e"/><text x="18" y="10.8" font-size="9.6" font-family="'Courier New',monospace" font-weight="bold" fill="${c}" text-anchor="middle" letter-spacing=".4">${hh}${(on.s ?? 0) % 2 ? " " : ":"}${mm}</text><rect x="1.4" y="1.4" width="33.2" height="4" fill="#ffffff" fill-opacity=".05"/>`; },
    [["rouge", "LED rouge", "#ff3b3b"], ["vert", "LED verte", "#4dff88"], ["bleu", "LED bleue", "#3bc4ff"], ["blanc", "LED blanche", "#f4f8ff"]]],
  ["clockcuckoo", "Coucou suisse", 360, 22, 42, "Un chalet sculpté, un balancier, des pommes de pin.", { swing: true },
    ({ on = {}, f = "#6b4a30" }) => { const sw = [0, 1, 2, 1, 0, -1, -2, -1][on.sw || 0] * 1.8; return `<path d="M11 1L22 11H0Z" fill="${shade(f, 0.7)}"/><rect x="2" y="10" width="18" height="16" fill="${f}"/><path d="M1 11L11 2L21 11" stroke="${shade(f, 1.4)}" stroke-width=".8" fill="none"/><rect x="8.5" y="11.5" width="5" height="3.4" fill="#1c1c22"/><circle cx="11" cy="20" r="5" fill="#f2e6c8"/>${hands(11, 20, 4.6, on, "#1c1c22")}<path d="M3 26H19" stroke="${shade(f, 1.3)}" stroke-width=".8"/><path d="M11 26L${n2(11 + sw)} 38" stroke="#c9a24b" stroke-width=".5"/><circle cx="${n2(11 + sw)}" cy="38.4" r="1.8" fill="#d4a640"/><path d="M6 26V34M16 26V31" stroke="#5a5a5a" stroke-width=".3"/><ellipse cx="6" cy="35.6" rx="1" ry="2" fill="#4a2f1c"/><ellipse cx="16" cy="32.6" rx="1" ry="2" fill="#4a2f1c"/>`; },
    [["noyer", "Noyer", "#6b4a30"], ["clair", "Bois clair", "#b08860"], ["rouge", "Peint en rouge", "#9a3a2a"], ["vert", "Peint en vert", "#3e6a4a"]]],
  ["clockregulator", "Pendule régulateur", 650, 18, 46, "Une pendule de notaire en bois vitré, balancier en laiton.", { swing: true },
    ({ on = {}, f = "#5c3d27" }) => { const sw = [0, 1, 2, 1, 0, -1, -2, -1][on.sw || 0] * 1.4; return `<path d="M0 6Q9 -1 18 6Z" fill="${shade(f, 0.8)}"/><rect y="5" width="18" height="41" rx="1" fill="${f}"/><circle cx="9" cy="13" r="6.4" fill="#d4a640"/><circle cx="9" cy="13" r="5.6" fill="#f7f2e2"/>${ticks(9, 13, 5.2, "#1c1c22", 12)}${hands(9, 13, 5.2, on, "#1c1c22")}<rect x="2.6" y="21" width="12.8" height="22" fill="#1c1410"/><path d="M9 21L${n2(9 + sw)} 38" stroke="#d4a640" stroke-width=".5"/><circle cx="${n2(9 + sw)}" cy="38.6" r="2.6" fill="#d4a640"/><rect x="2.6" y="21" width="5" height="22" fill="#ffffff" fill-opacity=".08"/>`; },
    [["noyer", "Noyer", "#5c3d27"], ["acajou", "Acajou", "#6b2f1d"], ["chene", "Chêne", "#9a7a50"], ["noir", "Laqué noir", "#1c1c22"]]],
  ["clockneon", "Horloge néon", 280, 26, 26, "💡 Lumineux · un anneau de néon autour de l'heure.", { secs: true, glow: true },
    ({ on = {}, c = "#ff4fb8" }) => `<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter></defs><circle cx="13" cy="13" r="12.4" fill="#14141a"/><circle cx="13" cy="13" r="11" fill="none" stroke="${c}" stroke-width="2.4" filter="url(#g)"/><circle cx="13" cy="13" r="11" fill="none" stroke="${c}" stroke-width="1"/><circle cx="13" cy="13" r="11" fill="none" stroke="#ffffff" stroke-width=".35" stroke-opacity=".8"/>${ticks(13, 13, 9.4, c, 12)}${hands(13, 13, 9.4, on, "#f4f8ff", c)}`,
    [["rose", "Rose", "#ff4fb8"], ["bleu", "Bleu glacier", "#3bc4ff"], ["vert", "Vert acide", "#4dff88"], ["violet", "Violet", "#b46bff"]]],
  ["clockworld", "Horloges fuseaux", 340, 60, 22, "Paris, New York, Tokyo : l'heure des serveurs.", {},
    ({ on = {}, f = "#b8bcc6" }) => [["PARIS", 0, 10], ["NEW YORK", -6, 30], ["TOKYO", 7, 50]].map(([city, dh, cx]) => `<circle cx="${cx}" cy="9" r="8.4" fill="${f}"/><circle cx="${cx}" cy="9" r="7.2" fill="#f7f7f2"/>${ticks(cx, 9, 6.8, "#1c1c22", 12)}${hands(cx, 9, 6.8, { h: ((on.h ?? 10) + dh + 24) % 24, m: on.m ?? 10 }, "#1c1c22")}<text x="${cx}" y="21" font-size="2.6" ${FONT} fill="#1c1c22" text-anchor="middle">${city}</text>`).join(""),
    [["alu", "Alu", "#b8bcc6"], ["noir", "Noir", "#2a2a30"], ["laiton", "Laiton", "#c9a24b"], ["blanc", "Blanc", "#f0efe9"]]],
];
for (const [type, name, price, w, h, desc, opts, fn, sts] of clocks) {
  const key = type === "clockneon" || type === "clockdigital" ? "c" : "f";
  new Clock({ type, cat: "horloges", name, price, room: "any", kind: "wall", w, h, ...opts, art2d: new WallArt(`wall${type}`, w, h, fn, { outline: type === "clockneon" ? 0 : 0.4, pad: type === "clockneon" ? 3 : 1 }),
    desc, styles: sts.map(([id, n, c]) => ({ id, name: n, sw: c, [key]: c })) });
}
