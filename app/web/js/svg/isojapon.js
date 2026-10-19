// The Japanese theme (items/japon.js): walls to compose (a shōji partition that glows at night, a fusuma door painted
// with a wave that slides open, a tokonoma alcove whose scroll writes the office's mood in one kanji, a post with its red
// lantern), a paper andon, a stone tōrō, a zabuton and a zaisu, a kotatsu, a hinoki desk, the sensei's dais (the
// chief's desk), a shelf of daruma (one per agent: an eye painted at the start, the other once delivered), a maneki-neko,
// a zen garden (a stone per agent at work), a koi pond (a koi per agent, gold for the delivered), a torii, an omikuji
// stand, a cherry tree, a bonsai, a taiko drum. Drawn like the rest (svg/iso.js).

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const T3 = c => [shade(c, 1.2), c, shade(c, 0.74)];
const HINOKI = "#c9a46a", DARK = "#3a2a1e", VERMILION = "#d8402a", PAPER = "#f4efe0", SUMI = "#1c1c22", GOLD = ["#f2d27a", "#c9a040", "#8a6a28"], STONE = ["#b8b4a8", "#9a968a", "#76726a"];
const path = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const glow = (x, y, z, r, c, a = 0.25) => { const [px, py] = ipt(x, y, z); return `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(r)}" fill="${c}" fill-opacity="${a.toFixed(2)}"/>`; };
const shifted = (g, dx, dy) => { const [x, y] = ipt(dx, dy, 0); return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`; };
const h01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
// a kanji written on a face toward +y, its centre at (x, y, z) (skewed like the plane)
const kanji = (ch, x, y, z, size, fill = SUMI) => { const [px, py] = ipt(x, y, z); return `<text x="${n2(px)}" y="${n2(py + size * 0.36)}" font-size="${size}" text-anchor="middle" font-family="'Noto Serif JP', 'Yu Mincho', serif" font-weight="bold" fill="${fill}" transform="skewY(26.565)" transform-origin="${n2(px)} ${n2(py)}">${ch}</text>`; };
// a shape on a front face (plane y): points (x, z)
const fpath = (y, pts, fill, more = "") => path(pts.map(([x, z]) => [x, y, z]), fill, more);
const flame = (x, y, z, s = 1, frame = 0) => {
  const f = Math.abs(Math.round(frame)) % 3, [px, py] = ipt(x, y, z), k = [1, 1.15, 0.9][f] * s, sway = [0, 0.4, -0.3][f] * s;
  return `<path fill="#ff9a3b" d="M${n2(px - 0.9 * s)} ${n2(py)}Q${n2(px + sway)} ${n2(py - 3.4 * k)} ${n2(px + 0.9 * s)} ${n2(py)}Q${n2(px)} ${n2(py + 0.7 * s)} ${n2(px - 0.9 * s)} ${n2(py)}Z"/>`
    + `<path fill="#fff3b0" d="M${n2(px - 0.4 * s)} ${n2(py - 0.2)}Q${n2(px + sway * 0.5)} ${n2(py - 2 * k)} ${n2(px + 0.4 * s)} ${n2(py - 0.2)}Z"/>`;
};
// a round paper lantern (chōchin) in screen units: ribs, black caps, a kanji; lit: it glows
const chochin = (x, y, r, c, on, ch = "祭") => `${on ? `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 2.2)}" fill="#ffb060" fill-opacity=".18"/>` : ""}<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(r)}" ry="${n2(r * 1.25)}" fill="${on ? shade(c, 1.15) : shade(c, 0.8)}"/>`
  + [-0.6, -0.2, 0.2, 0.6].map(k => `<path fill="none" stroke="${shade(c, 0.6)}" stroke-width=".18" d="M${n2(x - r * Math.sqrt(1 - k * k))} ${n2(y + k * r * 1.25)}H${n2(x + r * Math.sqrt(1 - k * k))}"/>`).join("")
  + `<rect x="${n2(x - r * 0.55)}" y="${n2(y - r * 1.35)}" width="${n2(r * 1.1)}" height="${n2(r * 0.3)}" fill="${SUMI}"/><rect x="${n2(x - r * 0.55)}" y="${n2(y + r * 1.05)}" width="${n2(r * 1.1)}" height="${n2(r * 0.3)}" fill="${SUMI}"/>`
  + `<text x="${n2(x)}" y="${n2(y + r * 0.35)}" font-size="${n2(r * 0.95)}" text-anchor="middle" font-family="'Noto Serif JP', serif" font-weight="bold" fill="${SUMI}">${ch}</text>`;
// a wave on a front face from x0 to x1, its foot at z0: a curling crest, foam claws, a lighter band
function wave(y, x0, x1, z0, h, c = "#2a4a8a") {
  const pts = [[x0, z0]];
  for (let x = x0; x <= x1 + 0.01; x += 0.5) { const t = (x - x0) / (x1 - x0); pts.push([x, z0 + h * (0.5 + 0.35 * Math.sin(t * Math.PI * 2.2) + (t > 0.55 && t < 0.8 ? (t - 0.55) * 2.4 : 0))]); }
  pts.push([x1, z0]);
  let g = fpath(y, pts, c) + fpath(y + 0.01, pts.map(([x, z]) => [x, Math.max(z0, z - h * 0.25)]), shade(c, 1.35), ' fill-opacity=".55"');
  for (let k = 0; k < 7; k++) { const x = x0 + (k + 0.5) * (x1 - x0) / 7, t = (x - x0) / (x1 - x0), z = z0 + h * (0.5 + 0.35 * Math.sin(t * Math.PI * 2.2) + (t > 0.55 && t < 0.8 ? (t - 0.55) * 2.4 : 0)); g += glow(x, y + 0.02, z, 0.45, "#ffffff", 0.95); }
  return g;
}

/* ---------- walls to compose ---------- */
const capOf = (w, d, c) => ibox(-0.2, -0.3, w + 0.4, d + 0.6, 50, 1.4, T3(shade(c, 1.1))) + ibox(0, 0, w, d, 51.4, 0.8, T3(shade(c, 0.8)));
// the shōji: a kickboard, paper panels in a fine lattice (they glow warm at night: lit), a frame, a transom
art("isoshoji", 24, 4, 60, ({ c = DARK, lit = false }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.8)));
  const paper = lit ? "#fff0c8" : PAPER;
  g += ifront(0, 4, 24, 0, 6, c) + ifront(0, 4, 24, 6, 38, paper) + ifront(0, 4, 24, 44, 6, c);
  if (lit) g += ifront(0, 4.01, 24, 6, 38, "#ffcf6a", ' fill-opacity=".25"');
  for (let x = 0; x <= 24; x += 3) g += ifront(Math.min(23.7, x), 4.02, 0.3, 6, 38, shade(c, 1.1));
  for (let z = 6; z <= 44; z += 4.75) g += ifront(0, 4.02, 24, z, 0.3, shade(c, 1.1));
  for (const x of [0, 12, 23]) g += ifront(x, 4.03, 1, 0, 50, c);
  for (let x = 1.5; x < 24; x += 3) g += ifront(x, 4.03, 0.25, 44.6, 4.8, shade(c, 1.2));  // the transom's slats
  return g + iside(24, 0, 4, 0, 50, shade(c, 0.7)) + capOf(24, 4, c);
});
// the fusuma: two sliding panels painted with the great wave and a gold cloud; the left one slides over the right (open)
art("isofusuma", 24, 4, 60, ({ c = DARK, open = 0 }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 1, 4, 0, 50, T3(c)) + ibox(23, 0, 1, 4, 0, 50, T3(c)) + ibox(1, 0, 22, 4, 44, 6, T3(shade(c, 0.85)));
  g += ifront(1, 3.6, 22, 0, 44, "#2a2420");
  const o = Math.max(0, Math.min(1, open)), panel = (x, y) => {
    let p = ifront(x, y, 11, 0.6, 43, "#efe6cc") + ifront(x, y + 0.01, 11, 36, 4, GOLD[1], ' fill-opacity=".85"') + ifront(x, y + 0.01, 11, 0.6, 1.2, SUMI);
    p += wave(y + 0.02, x + 0.4, x + 10.6, 1.8, 14) + glow(x + (x < 6 ? 9.6 : 1.4), y + 0.03, 20, 0.6, "#3a3a44", 1);
    for (const xx of [x, x + 10.7]) p += ifront(xx, y + 0.04, 0.3, 0.6, 43, SUMI);
    return p + ifront(x, y + 0.04, 11, 43.3, 0.3, SUMI);
  };
  g += panel(12, 3.8) + panel(1 + o * 10.6, 4);
  return g + capOf(24, 4, c);
});
// the tokonoma: a plaster wall, a raised alcove floor, a polished post, a hanging scroll with one kanji (ch), an ikebana
art("isotokonoma", 24, 4, 60, ({ c = DARK, ch = "和", frame = 0 }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3("#c9bfa8")) + ifront(0, 4, 24, 0, 50, "#e8dcc4") + ifront(1, 4.01, 22, 5, 39, "#d8ccb0");
  g += ibox(1, 4, 22, 2.4, 0, 5, T3(shade(c, 1.2))) + itop(1, 4, 22, 2.4, 5.01, "#5a3a24");
  g += ibox(0, 4, 1.4, 1.2, 0, 50, T3("#7a5232")) + ifront(1, 4.02, 22, 43, 1.2, c);
  g += iline(ipt(10, 4.05, 46), ipt(10, 4.05, 43.5), "#8a7a6a", 0.25);
  g += ifront(7.4, 4.06, 5.2, 16, 27, "#7a5a2a") + ifront(7.9, 4.07, 4.2, 17.5, 24, PAPER) + ifront(7.2, 4.08, 5.6, 42.6, 0.9, DARK) + ifront(7.2, 4.08, 5.6, 15.4, 0.9, DARK);
  g += [...String(ch)].slice(0, 2).map((k, i, a) => kanji(k, 10, 4.09, a.length > 1 ? 34 - i * 8 : 30, a.length > 1 ? 6 : 8)).join("");
  g += ifront(8.4, 4.09, 1, 19, 1, "#c0303a");  // the seal
  const [vx, vy] = ipt(17, 5.4, 5);  // the ikebana: a low vase, a curved branch, three camellias
  g += icyl(17, 5.4, 5, 1.6, 1.2, "#2a3a4a", "#3a4a5a") + `<path fill="none" stroke="#3a2a1e" stroke-width=".45" d="M${n2(vx)} ${n2(vy - 1.6)}q-1 -5 2.4 -8.6q2 -1.6 3 -1"/>`;
  for (const [dx, dy] of [[1.4, -8], [3.4, -9.4], [-0.2, -5]]) g += `<circle cx="${n2(vx + dx)}" cy="${n2(vy + dy)}" r=".9" fill="#d8303a"/><circle cx="${n2(vx + dx)}" cy="${n2(vy + dy)}" r=".3" fill="#f2d27a"/>`;
  return g + capOf(24, 4, c);
});
// the post with its red lantern: a square post, a bracket, a chōchin that glows (on) and sways a little (frame)
art("isochochinpost", 8, 8, 62, ({ on = true, frame = 0 }) => {
  let g = ishadow(8, 8) + ibox(0.4, 0.4, 7.2, 7.2, 0, 2, T3(STONE[1])) + ibox(2, 2, 4, 4, 2, 50, T3(DARK)) + ibox(1.6, 1.6, 4.8, 4.8, 52, 1.4, T3(shade(DARK, 1.2)));
  g += ibox(3.4, 5.8, 1.2, 4, 40, 0.8, T3(DARK));
  const [x, y] = ipt(4, 9.4, 40), sw = [0, 0.3, 0, -0.3][frame % 4];
  return g + `<path stroke="${SUMI}" stroke-width=".3" d="M${n2(x)} ${n2(y)}L${n2(x + sw)} ${n2(y + 2.4)}"/>` + chochin(x + sw, y + 6.6, 2.8, "#d8302a", on);
}, { mx: 2 });

/* ---------- lights ---------- */
// the andon: a paper floor lantern in a wooden frame, its light inside (on)
art("isoandon", 8, 8, 24, ({ on = true }) => {
  let g = ishadow(8, 8);
  for (const [x, y] of [[0.6, 0.6], [6.6, 0.6], [0.6, 6.6], [6.6, 6.6]]) g += ibox(x, y, 0.8, 0.8, 0, 18, T3(DARK));
  g += ibox(1, 1, 6, 6, 2, 15, on ? ["#fff4d0", "#ffe0a0", "#f0c070"] : [PAPER, "#e8dcc4", "#c9bfa8"]);
  for (const z of [6, 10, 14]) g += ifront(1, 7, 6, z, 0.25, DARK) + iside(7, 1, 6, z, 0.25, shade(DARK, 0.8));
  g += ifront(3.9, 7.01, 0.25, 2, 15, DARK) + iside(7.01, 3.9, 0.25, 2, 15, DARK) + ibox(0.4, 0.4, 7.2, 7.2, 18, 0.8, T3(DARK)) + ibox(0.4, 0.4, 7.2, 7.2, 1.6, 0.6, T3(DARK));
  return g + (on ? glow(4, 4, 10, 9, "#ffcf6a", 0.16) : "");
});
// the tōrō: a stone lantern, its fire box with openings (on: the flame), a roof with curled corners, a jewel on top
art("isotoro", 10, 10, 36, ({ on = true, frame = 0 }) => {
  let g = ishadow(10, 10) + ibox(1, 1, 8, 8, 0, 2, T3(STONE[1])) + icyl(5, 5, 2, 10, 1.6, STONE[2], STONE[0]) + ibox(1.6, 1.6, 6.8, 6.8, 12, 1.6, T3(STONE[1]));
  g += ibox(2.4, 2.4, 5.2, 5.2, 13.6, 6, T3(STONE[1])) + ifront(3.6, 7.6, 2.8, 15, 3.4, on ? "#ffcf6a" : "#2a2a30") + iside(7.6, 3.6, 2.8, 15, 3.4, on ? "#e8a840" : "#1c1c22");
  if (on) g += flame(5, 5, 15.2, 0.8, frame) + glow(5, 7.6, 16.6, 8, "#ffcf6a", 0.14);
  g += path([[0, 10, 19.6], [10, 10, 19.6], [10, 0, 19.6], [5, 5, 24]], STONE[0]) + path([[0, 10, 19.6], [10, 10, 19.6], [5, 5, 24]], STONE[1]) + path([[10, 10, 19.6], [10, 0, 19.6], [5, 5, 24]], STONE[2]);
  for (const [x, y] of [[0, 10], [10, 10], [10, 0]]) g += path([[x, y, 19.4], [x + (x ? 0.8 : -0.8), y + (y ? 0.8 : -0.8), 20.8], [x, y, 20.2]], STONE[0]);
  return g + icyl(5, 5, 23.6, 1, 0.9, STONE[2], STONE[0]) + `<circle cx="${n2(ipt(5, 5, 25.6)[0])}" cy="${n2(ipt(5, 5, 25.6)[1])}" r="1.3" fill="${STONE[0]}"/>`;
});

/* ---------- seats ---------- */
// the zabuton: a floor cushion, its four tassels, a tuft at the centre
art("isozabuton", 10, 10, 6, ({ c = "#2a3a6a" }) => {
  let g = ishadow(10, 10, 0) + ibox(0.6, 0.6, 8.8, 8.8, 0, 1.8, T3(c)) + itop(1.6, 1.6, 6.8, 6.8, 1.81, shade(c, 1.1));
  for (const [x, y] of [[0.6, 9.4], [9.4, 9.4], [9.4, 0.6]]) g += glow(x, y, 1, 0.5, "#c9a040", 1);
  return g + iell(5, 5, 1.82, 0.5, shade(c, 0.6));
});
// the zaisu: a legless chair, a lacquered frame, a cushion (c); its back, curved
const zaisuSeat = ({ c = "#8f1f2a" }) => ibox(0.4, 0.4, 11.2, 9.6, 0, 1.6, T3(SUMI)) + ibox(1, 1, 10, 8.4, 1.6, 1.4, T3(c)) + itop(3, 3, 6, 4, 3.01, shade(c, 1.12));
const zaisuBack = ({ c = "#8f1f2a" }) => ibox(0.6, 0, 10.8, 1.6, 1.6, 14, T3(SUMI)) + ifront(1.6, 1.6, 8.8, 3, 10.6, c) + ifront(1.6, 1.61, 8.8, 12.6, 0.4, GOLD[1]);
art("isozaisu", 12, 10, 6, zaisuSeat);
art("isozaisuback", 12, 2, 20, zaisuBack);
art("isozaisufull", 12, 11, 20, o => zaisuBack(o) + shifted(zaisuSeat(o), 0, 1));

/* ---------- tables, desks ---------- */
// the kotatsu: a low table over a quilt (c, with its pattern), a tea set, a basket of mandarins; on: it glows warm under
// the quilt, steam over the teapot
art("isokotatsu", 20, 20, 18, ({ c = "#c0303a", on = false, frame = 0 }) => {
  let g = ishadow(20, 20) + (on ? glow(10, 10, 0, 16, "#ff7a3a", 0.18) : "");
  g += path([[-0.6, 20.6, 0], [20.6, 20.6, 0], [20.6, -0.6, 0], [18, 2, 6.4], [2, 2, 6.4], [2, 18, 6.4], [18, 18, 6.4]], c);
  g += path([[-0.6, 20.6, 0], [20.6, 20.6, 0], [18, 18, 6.4], [2, 18, 6.4]], c) + path([[20.6, 20.6, 0], [20.6, -0.6, 0], [18, 2, 6.4], [18, 18, 6.4]], shade(c, 0.75));
  for (let k = 0; k < 9; k++) { const x = 1 + k * 2.2; g += glow(x, 20.4 - (x > 10 ? 0 : 0), 0.6 + (k % 2) * 2.4, 0.5, "#f4efe0", 0.85); }  // the pattern
  g += ibox(1.4, 1.4, 17.2, 17.2, 6.4, 1.2, T3(DARK)) + itop(2.4, 2.4, 15.2, 15.2, 7.61, shade(DARK, 1.3));
  g += icyl(7, 7, 7.6, 2.4, 1.6, "#3a4a3a", "#4a5a4a") + iline(ipt(8.6, 7, 9), ipt(9.8, 7, 9.6), "#3a4a3a", 0.5) + iell(7, 7, 10.2, 0.5, "#3a4a3a");
  for (const [x, y] of [[11, 6], [6, 11.4]]) g += icyl(x, y, 7.6, 1.2, 0.8, "#e8e0c8", "#5a8a3a");
  g += icyl(13, 13, 7.6, 1, 2.2, "#a07a4a", "#7a5a2a");
  for (const [x, y] of [[12.4, 12.4], [13.8, 13], [12.8, 13.8]]) g += `<circle cx="${n2(ipt(x, y, 9.4)[0])}" cy="${n2(ipt(x, y, 9.4)[1])}" r="1" fill="#f08a1c"/>`;
  if (on) for (let k = 0; k < 2; k++) { const [sx, sy] = ipt(7 + k * 0.6, 7, 12 + ((frame + k * 2) % 4) * 1.2); g += `<circle cx="${n2(sx)}" cy="${n2(sy)}" r="${n2(0.8 + ((frame + k) % 3) * 0.3)}" fill="#ffffff" fill-opacity=".45"/>`; }
  return g;
});
// the hinoki desk: pale wood, slender legs, a bonsai, an ink stone and its brush, a stack of washi (the dev's computer
// and chair are apart)
art("isodeskjapon", 40, 14, 30, ({ w = HINOKI }) => {
  let g = ishadow(40, 14);
  for (const x of [1, 37.4]) g += ibox(x, 1, 1.6, 12, 0, 12, T3(shade(w, 0.85))) + ibox(x, 6, 1.6, 2, 2, 1, T3(shade(w, 0.8)));
  g += ibox(1, 1, 38, 0.8, 9, 3, T3(shade(w, 0.85))) + ibox(-0.4, 0, 40.8, 14, 12, 1.2, T3(w)) + ifront(-0.4, 14, 40.8, 12.6, 0.3, shade(w, 0.7));
  g += icyl(4, 4, 13.2, 1, 2, "#3a4a5a", "#4a5a6a") + iline(ipt(4, 4, 14), ipt(4.6, 4, 18), DARK, 0.7);
  for (const [dx, dz] of [[-1.6, 18], [1.8, 19], [0.4, 20.4]]) g += glow(4 + dx, 4, dz, 1.6, "#3f7a3a", 1);
  g += ibox(30, 3, 5, 3, 13.2, 0.8, T3("#2a2a30")) + itop(30.6, 3.6, 1.6, 1.8, 14.02, SUMI) + iline(ipt(33, 7, 14.2), ipt(36, 9, 14.6), DARK, 0.4) + iline(ipt(35.6, 8.7, 14.5), ipt(36.6, 9.4, 14.7), SUMI, 0.6);
  for (let k = 0; k < 3; k++) g += itop(22 + k * 0.2, 4 + k * 0.2, 5, 6, 13.22 + k * 0.08, PAPER);
  return g + itop(22.6, 4.8, 3.6, 0.3, 13.5, SUMI) + kanji("禅", 24.4, 7.5, 13.5, 2.6);
});
// the sensei's dais (the chief's desk; ChiefOS opens as ZEN there): a tatami platform, a low black lacquer desk, a
// six-panel gold folding screen with pines and clouds, a katana on its stand; on: incense smoke rises
art("isochiefdeskzen", 34, 16, 50, ({ w = SUMI, on = false, frame = 0 }) => {
  let g = ishadow(34, 16);
  for (let k = 0; k < 6; k++) {  // the folding screen, zigzag
    const x = 2 + k * 5, y0 = k % 2 ? 1.4 : 0.4, y1 = k % 2 ? 0.4 : 1.4;
    g += path([[x, y0, 0], [x + 5, y1, 0], [x + 5, y1, 28], [x, y0, 28]], k % 2 ? GOLD[1] : GOLD[0]);
    g += path([[x, y0 + 0.01, 0], [x + 5, y1 + 0.01, 0], [x + 5, y1 + 0.01, 1], [x, y0 + 0.01, 1]], SUMI) + path([[x, y0 + 0.01, 27], [x + 5, y1 + 0.01, 27], [x + 5, y1 + 0.01, 28], [x, y0 + 0.01, 28]], SUMI);
  }
  for (const [x, z] of [[5, 20], [17, 22], [27, 19]]) g += `<ellipse cx="${n2(ipt(x, 1.4, z)[0])}" cy="${n2(ipt(x, 1.4, z)[1])}" rx="4" ry="1.4" fill="#ffffff" fill-opacity=".55"/>`;
  for (const x of [8, 22]) { const [px, py] = ipt(x, 1.4, 6); g += `<path stroke="#3a2a1e" stroke-width=".8" fill="none" d="M${n2(px)} ${n2(py)}q1 -6 -1 -12"/>` + [[-1, -10], [1.6, -8], [-2.6, -7]].map(([dx, dy]) => `<ellipse cx="${n2(px + dx)}" cy="${n2(py + dy)}" rx="2.6" ry="1" fill="#2f6a3a"/>`).join(""); }
  g += ibox(0, 3, 34, 13, 0, 2.4, T3("#8a9a5a")) + itop(0.6, 3.6, 32.8, 11.8, 2.41, "#a8b46a");
  for (let x = 1; x < 34; x += 1.2) g += itop(x, 3.6, 0.15, 11.8, 2.42, "#8a9a5a");
  g += ifront(0, 16, 34, 1.6, 0.6, "#2a2a30");
  g += ibox(7, 7, 20, 6, 2.4, 6, T3(w)) + ibox(6.6, 6.6, 20.8, 6.8, 8.4, 0.8, T3(shade(w, 1.3))) + ifront(7.6, 13, 18.8, 3.4, 4, shade(w, 1.15));
  g += itop(9, 8, 6, 4, 9.21, PAPER) + iline(ipt(12, 9, 9.3), ipt(15, 11, 9.4), SUMI, 0.4) + ibox(18, 8.4, 3, 2.4, 9.2, 0.7, T3("#2a2a30"));
  g += icyl(23.6, 10, 9.2, 1, 0.9, GOLD[2], GOLD[1]) + iline(ipt(23.6, 10, 10.2), ipt(23.6, 10, 13), "#7a5a3a", 0.25);
  if (on) for (let k = 0; k < 4; k++) { const z = 13 + k * 2.4 + (frame % 4) * 0.6, [sx, sy] = ipt(23.6 + Math.sin(frame * 0.6 + k) * 0.6, 10, z); g += `<circle cx="${n2(sx)}" cy="${n2(sy)}" r="${n2(0.5 + k * 0.25)}" fill="#e8e4f0" fill-opacity="${(0.6 - k * 0.12).toFixed(2)}"/>`; }
  g += ibox(29, 6, 3, 1.2, 2.4, 6, T3(SUMI)) + ibox(29, 12, 3, 1.2, 2.4, 6, T3(SUMI));  // the katana stand
  g += iline(ipt(30.5, 5, 7.6), ipt(30.5, 14.4, 7.6), SUMI, 1.1) + iline(ipt(30.5, 5, 7.6), ipt(30.5, 7.6, 7.6), "#8f1f2a", 1.1) + iline(ipt(30.5, 7.8, 7.6), ipt(30.5, 8.2, 7.6), GOLD[1], 1.6);
  return g;
});

/* ---------- things of the house ---------- */
// a daruma: a red round body, a white face, eyes (0, 1 or 2 painted), gold brows (screen units)
const daruma = (x, y, s, eyes, c = "#c8202a") => `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(2.4 * s)}" ry="${n2(2.7 * s)}" fill="${c}"/><ellipse cx="${n2(x)}" cy="${n2(y - 0.5 * s)}" rx="${n2(1.5 * s)}" ry="${n2(1.3 * s)}" fill="#f4efe0"/>`
  + [-0.6, 0.6].map((dx, i) => `<circle cx="${n2(x + dx * s)}" cy="${n2(y - 0.7 * s)}" r="${n2(0.45 * s)}" fill="${i < eyes ? SUMI : "#f4efe0"}" stroke="${SUMI}" stroke-width=".12"/>`).join("")
  + `<path fill="none" stroke="${GOLD[1]}" stroke-width="${n2(0.25 * s)}" d="M${n2(x - 1.2 * s)} ${n2(y + 1.2 * s)}q${n2(1.2 * s)} .8 ${n2(2.4 * s)} 0"/><path fill="${GOLD[0]}" d="M${n2(x - 1 * s)} ${n2(y + 1.6 * s)}h${n2(2 * s)}v${n2(0.5 * s)}h${n2(-2 * s)}z"/>`;
// the daruma shelf: a two-step stand of hinoki; one daruma per agent (eyes: a string of 0/1/2, up to 6)
art("isodaruma", 16, 8, 26, ({ eyes = "" }) => {
  let g = ishadow(16, 8) + ibox(0, 0, 16, 4, 0, 10, T3(HINOKI)) + ibox(0, 4, 16, 4, 0, 5, T3(shade(HINOKI, 1.05)));
  const list = String(eyes).slice(0, 6).split("").map(Number);
  if (!list.length) { const [x, y] = ipt(8, 2, 13); return g + daruma(x, y, 1, 0, "#e8e0c8"); }
  list.forEach((e, k) => { const top = k < 3, [x, y] = ipt(2.8 + (k % 3) * 5.2, top ? 2 : 6, (top ? 10 : 5) + 2.7); g += daruma(x, y, 0.95, e); });
  return g;
});
// the maneki-neko: a white lucky cat on its cushion, a red collar and bell, a gold koban; its paw beckons (frame)
art("isomaneki", 8, 8, 18, ({ frame = 0, c = "#f4f2ea" }) => {
  let g = ishadow(8, 8) + ibox(0.6, 0.6, 6.8, 6.8, 0, 1.4, T3("#c0303a"));
  const [x, y] = ipt(4, 4, 1.4), up = [0, 1, 2, 1][frame % 4];
  g += `<ellipse cx="${n2(x)}" cy="${n2(y - 3.4)}" rx="3" ry="3.4" fill="${c}"/><circle cx="${n2(x)}" cy="${n2(y - 8)}" r="2.8" fill="${c}"/>`;
  g += `<path fill="${c}" d="M${n2(x - 2.6)} ${n2(y - 9.6)}l.4 -2.4 1.6 1.4zM${n2(x + 2.6)} ${n2(y - 9.6)}l-.4 -2.4 -1.6 1.4z"/><path fill="#f4a0b0" d="M${n2(x - 2.2)} ${n2(y - 10)}l.25 -1.2.8 .7zM${n2(x + 2.2)} ${n2(y - 10)}l-.25 -1.2 -.8 .7z"/>`;
  g += `<path fill="none" stroke="${SUMI}" stroke-width=".3" d="M${n2(x - 1.6)} ${n2(y - 8.4)}q.5 -.5 1 0M${n2(x + 0.6)} ${n2(y - 8.4)}q.5 -.5 1 0M${n2(x - 0.4)} ${n2(y - 7.2)}q.4 .4 .8 0"/>`;
  g += `<rect x="${n2(x - 2.4)}" y="${n2(y - 5.8)}" width="4.8" height=".7" fill="#c0303a"/><circle cx="${n2(x)}" cy="${n2(y - 4.9)}" r=".6" fill="${GOLD[0]}"/>`;
  g += `<ellipse cx="${n2(x + 0.6)}" cy="${n2(y - 2.6)}" rx="1.3" ry="1.8" fill="${GOLD[1]}"/><path stroke="${GOLD[2]}" stroke-width=".2" d="M${n2(x + 0.6)} ${n2(y - 3.8)}v2.4"/>`;
  return g + `<ellipse cx="${n2(x - 2.6)}" cy="${n2(y - 7 - up * 0.8)}" rx=".9" ry="1.6" fill="${c}" transform="rotate(${-10 - up * 8} ${n2(x - 2.6)} ${n2(y - 6)})"/>`;
});
// the zen garden: a low frame of white gravel, raked lines, stones (n, up to 5) each ringed by circles of raking; a rake
art("isozengarden", 24, 16, 10, ({ n = 1, frame = 0 }) => {
  let g = ishadow(24, 16) + ibox(0, 0, 24, 16, 0, 2.4, T3(DARK)) + itop(0.8, 0.8, 22.4, 14.4, 2.41, "#e8e4d8");
  const stones = Array.from({ length: Math.max(1, Math.min(5, n)) }, (_, k) => [3.6 + h01(k, 4) * 16.8, 3 + h01(k, 9) * 10, 1 + h01(k, 2) * 0.8]);
  for (let y = 1.6; y < 15; y += 1.1) g += iline(ipt(1, y, 2.42), ipt(23, y, 2.42), "#c9c3b0", 0.18);
  for (const [x, y, r] of stones) {
    g += iell(x, y, 2.43, r + 2.4, "#e8e4d8");
    for (const k of [1.2, 1.9, 2.6]) g += iell(x, y, 2.44, r + k * (1 + (frame % 2) * 0.04), "none", ' stroke="#c9c3b0" stroke-width=".18"');
    g += `<ellipse cx="${n2(ipt(x, y, 3.2)[0])}" cy="${n2(ipt(x, y, 3.2)[1])}" rx="${n2(r * 1.4)}" ry="${n2(r)}" fill="${STONE[2]}"/><ellipse cx="${n2(ipt(x, y, 3.6)[0] - 0.3)}" cy="${n2(ipt(x, y, 3.6)[1] - 0.2)}" rx="${n2(r)}" ry="${n2(r * 0.6)}" fill="${STONE[0]}"/>`
      + glow(x + 0.3, y, 3.4, 0.6, "#5a8a3a", 0.8);
  }
  return g + iline(ipt(20, 15, 2.6), ipt(23, 12, 6), DARK, 0.5) + iline(ipt(19.4, 14.6, 2.5), ipt(20.8, 15.6, 2.5), DARK, 0.7);
});
// the koi pond: a stone rim, dark water, lily pads; a koi per agent at work (n) and a golden one per delivered (gold),
// swimming in circles (frame)
art("isokoipond", 24, 20, 10, ({ n = 1, gold = 0, frame = 0 }) => {
  const rim = Array.from({ length: 20 }, (_, k) => { const a = k * Math.PI / 10; return [12 + Math.cos(a) * 11.4 * (1 + 0.06 * Math.sin(k * 3)), 10 + Math.sin(a) * 9.4 * (1 + 0.05 * Math.cos(k * 2)), 0]; });
  let g = ishadow(24, 20) + path(rim.map(([x, y]) => [x, y, 1.4]), STONE[1]) + path(rim.map(([x, y]) => [12 + (x - 12) * 0.88, 10 + (y - 10) * 0.86, 1.41]), "#1a4a5a");
  for (const [x, y] of rim.filter((_, k) => k % 2)) g += `<ellipse cx="${n2(ipt(x, y, 1.6)[0])}" cy="${n2(ipt(x, y, 1.6)[1])}" rx="1.8" ry="1" fill="${h01(x, y) > 0.5 ? STONE[0] : STONE[2]}"/>`;
  for (const [x, y] of [[6, 6], [16, 14], [17.6, 12.8]]) g += iell(x, y, 1.45, 1.4, "#3f8a4a") + (x === 6 ? glow(x + 0.4, y, 1.8, 0.7, "#f4a0c0", 1) : "");
  const fish = [...Array(Math.min(6, n)).fill(0), ...Array(Math.min(4, gold)).fill(1)];
  fish.forEach((gd, k) => {
    const a = frame * 0.18 + k * 1.7, r = 4 + (k % 3) * 1.6, x = 12 + Math.cos(a) * r, y = 10 + Math.sin(a) * r * 0.8, [px, py] = ipt(x, y, 1.5), dir = Math.cos(a + Math.PI / 2) * 0.6 - Math.sin(a + Math.PI / 2) * 0.6 > 0 ? 1 : -1;
    const body = gd ? GOLD[0] : ["#f08a3a", "#f4f2ea", "#e8402a"][k % 3];
    g += `<ellipse cx="${n2(px)}" cy="${n2(py)}" rx="1.5" ry=".6" fill="${body}"/><path fill="${body}" d="M${n2(px - 1.4 * dir)} ${n2(py)}l${n2(-1 * dir)} -.6v1.2z"/>` + (!gd && k % 3 === 1 ? `<circle cx="${n2(px + 0.3 * dir)}" cy="${n2(py)}" r=".35" fill="#e8402a"/>` : "") + (gd ? `<ellipse cx="${n2(px)}" cy="${n2(py)}" rx="2.2" ry="1.1" fill="${GOLD[0]}" fill-opacity=".25"/>` : "");
  });
  return g;
});
// the torii: two vermilion pillars on black feet, the curved top beam, the tie beam, the plaque, a shimenawa rope with
// its paper zigzags; lit: two lanterns glow at its feet
art("isotorii", 24, 6, 58, ({ lit = false }) => {
  let g = ishadow(24, 6);
  for (const x of [3, 19]) g += ibox(x - 0.3, 2.2, 2.6, 2.6, 0, 3, T3(SUMI)) + icyl(x + 1, 3.5, 3, 37, 1.1, VERMILION, shade(VERMILION, 1.2));
  g += ibox(0.6, 2.6, 22.8, 1.8, 32, 2.2, T3(VERMILION));
  g += ibox(10.8, 2.8, 2.4, 1.4, 34.2, 4, T3(SUMI)) + ifront(11, 4.21, 2, 34.6, 3.2, GOLD[1]) + kanji("神", 12, 4.22, 36.2, 2.2, SUMI);
  g += path([[-2, 3, 38.2], [26, 3, 38.2], [26.6, 3, 41.4], [12, 3, 40], [-2.6, 3, 41.4]], VERMILION) + path([[-2, 4.6, 38.2], [26, 4.6, 38.2], [26.6, 4.6, 41.4], [12, 4.6, 40], [-2.6, 4.6, 41.4]], shade(VERMILION, 0.85));
  g += path([[-2.6, 3, 41.4], [12, 3, 40], [26.6, 3, 41.4], [27, 3, 43], [12, 3, 41.6], [-3, 3, 43]], SUMI) + path([[-2.6, 4.6, 41.4], [12, 4.6, 40], [26.6, 4.6, 41.4], [27, 4.6, 43], [12, 4.6, 41.6], [-3, 4.6, 43]], shade(SUMI, 1.4));
  const ropeZ = x => 27 - Math.sin((x - 3) / 17 * Math.PI) * 2;  // the rope sagging between the pillars, its paper streamers
  for (let x = 4; x < 20; x += 0.8) g += iline(ipt(x, 4.8, ropeZ(x)), ipt(x + 0.8, 4.8, ropeZ(x + 0.8)), "#d9c08a", 1.2);
  for (const x of [7, 12, 17]) { const [px, py] = ipt(x, 4.9, ropeZ(x)); g += `<path fill="#ffffff" d="M${n2(px)} ${n2(py)}h1l-.6 1.4h1l-.7 1.6h1l-.8 1.6h-.8l.6 -1.4h-1l.6 -1.6h-1z"/>`; }
  if (lit) for (const x of [0.4, 23]) { const [px, py] = ipt(x, 5.6, 6); g += chochin(px, py, 1.6, "#f4efe0", true, "灯"); }
  return g;
}, { mx: 4 });
// the omikuji stand: a wooden rack where the paper fortunes are tied, the hexagonal box of sticks on a little table
art("isoomikuji", 10, 8, 32, ({ frame = 0 }) => {
  let g = ishadow(10, 8);
  for (const x of [0.6, 8.6]) g += ibox(x, 3, 0.8, 0.8, 0, 26, T3(DARK));
  for (const z of [14, 20, 25]) g += ibox(0.6, 3.1, 8.8, 0.6, z, 0.5, T3(DARK));
  for (const z of [14, 20, 25]) for (let x = 1.6; x < 9; x += 0.9) { const [px, py] = ipt(x, 3.8, z); g += `<path fill="#ffffff" d="M${n2(px - 0.35)} ${n2(py - 0.2)}h.7v1.6h-.7z"/><path fill="#f4efe0" d="M${n2(px - 0.5)} ${n2(py)}h1v.4h-1z"/>`; }
  g += ibox(2, 5, 6, 3, 0, 9, T3(HINOKI)) + ibox(3.4, 5.6, 3.2, 1.8, 9, 6, T3("#c0303a")) + ifront(3.6, 7.41, 2.8, 10, 4, "#c0303a") + kanji("吉", 5, 7.42, 12, 2.4, GOLD[0]);
  const s = frame % 6 === 0 ? 1.6 : 0;
  return g + iline(ipt(5, 6.5, 15), ipt(5.4, 6.5, 16.4 + s), HINOKI, 0.4);
});
// the cherry tree: a dark twisted trunk, clouds of pink blossom, petals falling (frame); thirsty: fewer blossoms
art("isosakura", 16, 16, 64, ({ frame = 0, dry = false }) => {
  let g = ishadow(16, 16) + icyl(8, 8, 0, 1.4, 4.6, STONE[2], STONE[1]) + iell(8, 8, 1.41, 3.8, "#4a3420");
  const [bx, by] = ipt(8, 8, 1.4);
  g += `<path fill="#3a2a24" d="M${n2(bx - 1.4)} ${n2(by)}q-1 -10 2 -18q-4 -4 -7 -6l1 -.6q4 2 6.6 5q1 -4 4 -6l.6 .8q-3 3 -3.6 7q3 0 6 -3l.4 .8q-3 3.6 -6.6 4q-1 8 0 16z"/>`;
  const pinks = dry ? ["#c9a0a8", "#b8909a"] : ["#f8c8d8", "#f0a8c0", "#ffe0ea"];
  for (const [dx, dy, r] of [[-7, -26, 5], [-2, -30, 6], [4, -28, 5.6], [8, -24, 4.4], [-5, -21, 4], [1, -23, 5], [-10, -22, 3.6], [6, -32, 3.6]]) g += `<circle cx="${n2(bx + dx)}" cy="${n2(by + dy)}" r="${n2(dry ? r * 0.7 : r)}" fill="${pinks[Math.abs(dx + dy) % pinks.length]}"/>`;
  if (!dry) for (let k = 0; k < 6; k++) { const t = ((frame * 0.7 + k * 3.3) % 20) / 20, px = bx - 10 + h01(k, 1) * 20 + Math.sin(t * 9 + k) * 2, py = by - 20 + t * 20; g += `<ellipse cx="${n2(px)}" cy="${n2(py)}" rx=".6" ry=".35" fill="#f8c8d8" transform="rotate(${(k * 40 + frame * 20) % 360} ${n2(px)} ${n2(py)})"/>`; }
  return g;
}, { mx: 6 });
// the bonsai: a shallow glazed pot, a twisted trunk, three pads of foliage; thirsty: browned
art("isobonsaipin", 8, 8, 16, ({ dry = false }) => {
  const f = dry ? ["#a08a4a", "#8a7a3a"] : ["#3f8a3a", "#2f6a2a"];
  let g = ishadow(8, 8) + ibox(0.6, 1.6, 6.8, 4.8, 0, 1.8, T3("#2a4a6a")) + itop(1, 2, 6, 4, 1.81, "#4a3420");
  const [x, y] = ipt(4, 4, 1.8);
  g += `<path fill="#5a3a24" d="M${n2(x - 0.6)} ${n2(y)}q-1.6 -2.4 .6 -4q1.6 -1.2 -.4 -3l.8 -.2q2 1.8 .4 3.6q-1.6 1.6 .2 3.6z"/>`;
  for (const [dx, dy, rx] of [[-2.6, -4.6, 2.6], [1.4, -7, 3], [-0.6, -9.4, 2.2]]) g += `<ellipse cx="${n2(x + dx)}" cy="${n2(y + dy)}" rx="${rx}" ry="1.2" fill="${f[1]}"/><ellipse cx="${n2(x + dx)}" cy="${n2(y + dy - 0.4)}" rx="${rx - 0.5}" ry=".8" fill="${f[0]}"/>`;
  return g;
});
// the taiko: a big drum on its stand, two sticks; on: it booms (the skin trembles, rings around it)
art("isotaiko", 12, 12, 30, ({ on = false, frame = 0 }) => {
  let g = ishadow(12, 12) + ibox(1, 3, 1.4, 6, 0, 12, T3(DARK)) + ibox(9.6, 3, 1.4, 6, 0, 12, T3(DARK)) + ibox(1, 5.4, 10, 1.2, 4, 1, T3(DARK));
  const C = ipt(6, 6, 16), r = 6.4, k = on && frame % 2 ? 0.3 : 0;
  g += `<ellipse cx="${n2(C[0] + 1.4)}" cy="${n2(C[1])}" rx="${n2(r * 0.55)}" ry="${n2(r)}" fill="#8a3a1a"/><rect x="${n2(C[0] - 1.4)}" y="${n2(C[1] - r)}" width="2.8" height="${n2(r * 2)}" fill="#8a3a1a"/>`;
  g += `<ellipse cx="${n2(C[0] - 1.4)}" cy="${n2(C[1])}" rx="${n2(r * 0.55 + k)}" ry="${n2(r + k)}" fill="#efe2c0" stroke="${SUMI}" stroke-width=".5"/>`;
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g += `<circle cx="${n2(C[0] - 1.4 + Math.cos(a) * r * 0.5)}" cy="${n2(C[1] + Math.sin(a) * r * 0.92)}" r=".3" fill="${GOLD[1]}"/>`; }
  g += `<path fill="${SUMI}" d="M${n2(C[0] - 1.4)} ${n2(C[1] - 2)}a1 1 0 1 1 0 2a1 1 0 1 0 0 2a2 2 0 0 1 0 -4z" fill-opacity=".7"/>`;
  g += iline(ipt(8, 10.6, 12.6), ipt(11, 9, 17), HINOKI, 0.6) + iline(ipt(9, 10.8, 12.6), ipt(11.6, 10, 17.4), HINOKI, 0.6);
  if (on) for (const s of [1, 1.4]) g += `<ellipse cx="${n2(C[0] - 1.4)}" cy="${n2(C[1])}" rx="${n2(r * 0.55 * s + 2)}" ry="${n2(r * s + 2)}" fill="none" stroke="#f2d27a" stroke-width=".3" stroke-opacity="${(1.6 - s).toFixed(2)}"/>`;
  return g;
}, { mx: 3 });
