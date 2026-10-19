// The wizard school theme (items/magic.js): castle walls to compose (straight, pointed arch, stained glass, a pillar
// with its torch), floating candles and a wrought-iron chandelier, a gothic chair and the headmaster's throne, the
// refectory table, a potion table, a wizard's desk, a bubbling cauldron, a shelf of grimoires (one floats), a broom
// that hovers, an owl on its perch, the sorting hat on its stool, a crystal ball. Drawn like the rest (svg/iso.js).

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const T3 = c => [shade(c, 1.2), c, shade(c, 0.74)];
const IRON = ["#4a4a54", "#2e2e36", "#1c1c22"], GOLD = ["#f2d27a", "#d4a640", "#a07a28"], OAK = "#4a2f1e";
const path = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const h01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };  // a steady noise per stone
// a flame: a teardrop at (x, y, z), flickering with frame; its halo when lit
const flame = (x, y, z, s = 1, frame = 0, halo = true) => {
  const [px, py] = ipt(x, y, z), k = [1, 1.15, 0.9][frame % 3] * s, sway = [0, 0.4, -0.3][frame % 3] * s;
  return (halo ? `<circle cx="${n2(px)}" cy="${n2(py - 1.4 * k)}" r="${n2(3.6 * s)}" fill="#ffcf6a" fill-opacity=".22"/>` : "")
    + `<path fill="#ff9a3b" d="M${n2(px - 0.9 * s)} ${n2(py)}Q${n2(px + sway)} ${n2(py - 3.4 * k)} ${n2(px + 0.9 * s)} ${n2(py)}Q${n2(px)} ${n2(py + 0.7 * s)} ${n2(px - 0.9 * s)} ${n2(py)}Z"/>`
    + `<path fill="#fff3b0" d="M${n2(px - 0.4 * s)} ${n2(py - 0.2)}Q${n2(px + sway * 0.5)} ${n2(py - 2 * k)} ${n2(px + 0.4 * s)} ${n2(py - 0.2)}Z"/>`;
};
// an art's markup moved by (dx, dy) on the floor (a chair's seat in front of its back, for the shop's card)
const shifted = (g, dx, dy) => { const [x, y] = ipt(dx, dy, 0); return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`; };
const candle = (x, y, z, h, frame, lit = true) => icyl(x, y, z, h, 0.55, "#efe6cf", "#fffaf0") + iline(ipt(x, y, z + h), ipt(x, y, z + h + 0.6), "#2a2a30", 0.25) + (lit ? flame(x, y, z + h + 0.6, 0.7, frame) : "");

/* ---------- walls to compose ---------- */
// stones on the front face (plane y) and the right side (plane x = w), rows of blocks, staggered, each a little different
// hole: [x0, x1, z1] an opening from the floor (an arch): the stones stop at its edges
function stones(w, d, z0, z1, c, skip = () => false, hole = null) {
  let g = "";
  for (let z = z0, r = 0; z < z1; z += 4, r++) {
    const hh = Math.min(4, z1 - z);
    for (let x = (r % 2 ? -3 : 0); x < w; x += 6) {
      const a = Math.max(0, x), b = Math.min(w, x + 6); if (b - a < 0.6 || skip(a, b, z, z + hh)) continue;
      const parts = hole && z < hole[2] ? [[a, Math.min(b, hole[0])], [Math.max(a, hole[1]), b]] : [[a, b]];
      for (const [p, q] of parts) if (q - p >= 0.6) g += ifront(p + 0.25, d, q - p - 0.5, z + 0.25, hh - 0.5, shade(c, 0.9 + h01(a, z) * 0.22));
    }
    for (let y = (r % 2 ? 0 : -2); y < d; y += 4) { const a = Math.max(0, y), b = Math.min(d, y + 4); if (b - a > 0.6) g += iside(w, a + 0.2, b - a - 0.4, z + 0.25, hh - 0.5, shade(c, 0.66 + h01(y, z) * 0.12)); }
  }
  return g;
}
const crenels = (w, d, z, c) => { let g = ""; for (let x = 0; x + 3.6 <= w + 0.1; x += 6) g += ibox(x, 0, Math.min(4, w - x), d, z, 5, T3(shade(c, 1.04))); return g; };
const moss = (w, d, on) => on ? [3, 11, 19].map(x => iell(Math.min(w - 1, x), d, 2 + (x % 5), 1.6, "#5a7a3a", ' fill-opacity=".75"')).join("") : "";
art("isocastlewall", 24, 4, 60, ({ c = "#8d8a80", moss: m = false }) => ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.8))) + stones(24, 4, 0, 50, c) + crenels(24, 4, 50, c) + moss(24, 4, m));
// a pointed arch: two piers, the arch's stones, the way through (nothing drawn there: the floor shows)
art("isocastlearch", 24, 4, 60, ({ c = "#8d8a80", moss: m = false }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 7, 4, 0, 50, T3(shade(c, 0.8))) + ibox(17, 0, 7, 4, 0, 50, T3(shade(c, 0.8))) + ibox(7, 0, 10, 4, 36, 14, T3(shade(c, 0.8)));
  g += stones(24, 4, 0, 50, c, () => false, [7, 17, 36]);
  g += path([[7, 4, 28], [12, 4, 36], [17, 4, 28], [17, 4, 36.2], [7, 4, 36.2]], shade(c, 0.95));  // the spandrels, over the pointed top
  g += path([[7, 4, 28], [12, 4, 36], [12, 0, 36], [7, 0, 28]], shade(c, 0.58));  // the pointed top's underside (the half seen)
  const rim = [[7, 4, 0], [7, 4, 28], [12, 4, 36], [17, 4, 28], [17, 4, 0]];
  for (let k = 0; k < rim.length - 1; k++) g += iline(ipt(...rim[k]), ipt(...rim[k + 1]), shade(c, 1.25), 0.9);  // the voussoirs' edge
  return g + crenels(24, 4, 50, c) + moss(24, 4, m);
});
// a stained-glass window in the wall: a pointed lancet, coloured glass, lead; lit from inside at night
art("isocastlewin", 24, 4, 60, ({ c = "#8d8a80", lit = false, moss: m = false }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.8))) + stones(24, 4, 0, 50, c, (a, b, z, z2) => b > 7 && a < 17 && z2 > 14 && z < 44);
  const win = [[7.6, 4, 14], [16.4, 4, 14], [16.4, 4, 34], [12, 4, 43], [7.6, 4, 34]];
  g += path([[7, 4, 13.4], [17, 4, 13.4], [17, 4, 34.2], [12, 4, 44], [7, 4, 34.2]], shade(c, 1.12)) + path(win, "#1c1c30");
  const panes = [["#c0303a", 7.6, 12, 14, 24], ["#2a5a9a", 12, 16.4, 14, 24], ["#e8c23a", 7.6, 12, 24, 34], ["#2f7a45", 12, 16.4, 24, 34]];
  for (const [col, x0, x1, z0, z1] of panes) g += path([[x0, 4, z0], [x1, 4, z0], [x1, 4, z1], [x0, 4, z1]], col, ` fill-opacity="${lit ? 0.95 : 0.6}"`);
  g += path([[7.6, 4, 34], [16.4, 4, 34], [12, 4, 43]], "#b48cff", ` fill-opacity="${lit ? 0.95 : 0.6}"`);
  for (const [a, b] of [[[12, 4, 14], [12, 4, 43]], [[7.6, 4, 24], [16.4, 4, 24]], [[7.6, 4, 34], [16.4, 4, 34]]]) g += iline(ipt(...a), ipt(...b), "#1c1c22", 0.45);
  if (lit) { const [x, y] = ipt(12, 4, 28); g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="9" ry="13" fill="#ffd27a" fill-opacity=".14"/>`; }
  return g + crenels(24, 4, 50, c) + moss(24, 4, m);
});
// a square pillar to end or turn a wall: a base, the shaft, a capital, a torch on its bracket (lit: frame)
art("isocastlepillar", 8, 8, 70, ({ c = "#8d8a80", on = true, frame = 0, moss: m = false }) => {
  let g = ishadow(8, 8) + ibox(0, 0, 8, 8, 0, 3, T3(shade(c, 0.9))) + ibox(1, 1, 6, 6, 3, 50, T3(shade(c, 0.8)));
  g += stones(7, 7, 3, 53, c) + ibox(0, 0, 8, 8, 53, 3, T3(shade(c, 1.05))) + ibox(1.5, 1.5, 5, 5, 56, 3, T3(shade(c, 1.1)));
  g += ibox(3.4, 7, 1.2, 2.4, 30, 0.8, IRON) + ibox(3.5, 8.6, 1, 1, 30.8, 6, ["#6a4a2a", "#5a3a24", "#4a2f1e"]) + ibox(3.2, 8.3, 1.6, 1.6, 36.4, 1.2, IRON);
  if (on) g += flame(4, 9.1, 37.6, 1.4, frame);
  return g + (m ? iell(4, 8, 2, 2, "#5a7a3a", ' fill-opacity=".75"') : "");
});

/* ---------- lights ---------- */
// floating candles: seven of them, bobbing at different heights, a faint shadow under them
art("isofloatcandles", 14, 14, 62, ({ on = true, frame = 0 }) => {
  let g = iell(7, 7, 0, 5, "#000", ' fill-opacity=".08"');
  const C = [[2, 3, 40], [7, 2, 46], [12, 4, 38], [3, 9, 44], [8, 8, 36], [12, 11, 42], [6, 12, 48]];
  for (const [i, [x, y, z]] of C.entries()) g += candle(x, y, z + [0, 0.8, 1.2, 0.6][(frame + i) % 4], 3 + (i % 3), frame + i, on);
  return g;
});
// a wrought-iron chandelier: a ring of candles hung from four chains
art("isochandelier", 20, 20, 78, ({ on = true, frame = 0 }) => {
  let g = iell(10, 10, 0, 7, "#000", ' fill-opacity=".1"');
  for (const [x, y] of [[3, 10], [17, 10], [10, 3], [10, 17]]) g += iline(ipt(x, y, 46), ipt(10, 10, 76), "#2e2e36", 0.4);
  g += iell(10, 10, 45, 7.4, "none", ' stroke="#2e2e36" stroke-width="1.1"') + iell(10, 10, 46, 7.4, "none", ' stroke="#4a4a54" stroke-width=".4"') + icyl(10, 10, 42, 6, 0.9, "#2e2e36", "#4a4a54");
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, x = 10 + Math.cos(a) * 7.4, y = 10 + Math.sin(a) * 7.4; g += icyl(x, y, 45.6, 0.8, 0.9, "#2e2e36", "#4a4a54") + candle(x, y, 46.4, 3.2, frame + k, on); }
  return g;
});

/* ---------- seats ---------- */
// the gothic chair: dark wood, a tall pointed back with tracery and finials, a velvet seat (c)
const gothicSeat = ({ c = "#6e1f2a", w = OAK }) => {
  let g = "";
  for (const [x, y] of [[0.4, 0.4], [10.6, 0.4], [0.4, 8.6], [10.6, 8.6]]) g += ibox(x, y, 1, 1, 0, 8, T3(w));
  return g + ibox(0, 0, 12, 10, 8, 1.4, T3(w)) + ibox(0.6, 0.6, 10.8, 8.8, 9.4, 1.2, T3(c));
};
const gothicBack = ({ w = OAK, c = "#6e1f2a" }) => {
  let g = ibox(0, 0, 1.2, 1.6, 0, 33, T3(w)) + ibox(10.8, 0, 1.2, 1.6, 0, 33, T3(w)) + ibox(1.2, 0.4, 9.6, 0.8, 10, 18, T3(w));
  g += path([[1.2, 1.2, 28], [10.8, 1.2, 28], [6, 1.2, 35]], shade(w, 1.05)) + path([[3, 1.2, 12], [9, 1.2, 12], [9, 1.2, 24], [6, 1.2, 28], [3, 1.2, 24]], shade(c, 0.9));
  g += iline(ipt(6, 1.2, 12), ipt(6, 1.2, 28), shade(w, 0.7), 0.4) + iline(ipt(3, 1.2, 20), ipt(9, 1.2, 20), shade(w, 0.7), 0.4);
  for (const x of [0.6, 11.4]) g += path([[x - 0.6, 0.8, 33], [x + 0.6, 0.8, 33], [x, 0.8, 37]], shade(w, 1.15));
  return g + ibox(5.4, 0.2, 1.2, 1.2, 34.6, 1.4, GOLD);
};
art("isocgothic", 12, 10, 12, gothicSeat);
art("isocgothicback", 12, 2, 40, gothicBack);
art("isocgothicfull", 12, 11, 40, o => gothicBack(o) + shifted(gothicSeat(o), 0, 1));
// the headmaster's throne: a high carved back crowned with a crest, gilded trims, armrests, a deep cushion
const throneSeat = ({ c = "#2a2350", w = "#3a2416" }) => {
  let g = ishadow(24, 12) + ibox(0, 0, 24, 12, 0, 8, T3(w)) + ifront(1, 12, 22, 1, 6, shade(w, 1.1)) + ifront(1, 12, 22, 7, 0.6, GOLD[1]);
  g += ibox(2.5, 0, 19, 11, 8, 3, T3(c)) + ibox(0, 0, 2.6, 12, 8, 8, T3(w)) + ibox(21.4, 0, 2.6, 12, 8, 8, T3(w));
  return g + ibox(-0.3, -0.3, 3.2, 12.6, 16, 1, GOLD) + ibox(21.1, -0.3, 3.2, 12.6, 16, 1, GOLD) + iell(1.3, 11, 17, 1, GOLD[0]) + iell(22.7, 11, 17, 1, GOLD[0]);
};
const throneBack = ({ c = "#2a2350", w = "#3a2416" }) => {
  let g = ibox(0, 0, 24, 6, 0, 44, T3(w)) + ifront(3, 6, 18, 10, 30, shade(c, 1.05)) + ifront(3, 6, 18, 39.4, 0.8, GOLD[1]) + ifront(3, 6, 18, 9.4, 0.8, GOLD[1]);
  for (let k = 0; k < 4; k++) g += ifront(5 + k * 4, 6, 2, 14, 22, shade(c, 0.85));  // the tufting
  g += path([[0, 6, 44], [24, 6, 44], [18, 6, 49], [12, 6, 54], [6, 6, 49]], shade(w, 1.1)) + path([[9, 6, 46], [15, 6, 46], [12, 6, 51]], GOLD[1]);
  for (const x of [1.5, 22.5]) g += icyl(x, 3, 44, 3, 1.4, GOLD[2], GOLD[0]) + iell(x, 3, 47.6, 1.2, GOLD[0]);
  return g + iell(12, 6, 49, 1.4, "#c0303a");
};
art("isothrone", 24, 12, 18, throneSeat);
art("isothroneback", 24, 6, 56, throneBack);
art("isothronefull", 24, 18, 56, o => throneBack(o) + shifted(throneSeat(o), 0, 6));

/* ---------- tables, desk ---------- */
// the refectory table: a long oak top on trestles, its two benches, candlesticks, goblets and plates
art("isorefectory", 56, 24, 30, ({ w = "#6b4a2e", frame = 0 }) => {
  let g = ishadow(56, 24) + ibox(1, 0, 54, 4, 4.2, 1.6, T3(w));
  for (const x of [3, 27, 51]) g += ibox(x, 0.6, 1.4, 2.8, 0, 4.2, T3(shade(w, 0.8)));
  for (const x of [4, 50]) g += ibox(x, 9, 2, 6, 0, 13, T3(shade(w, 0.75))) + ibox(x - 1, 8, 4, 8, 0, 1.4, T3(shade(w, 0.75)));
  g += ibox(0, 6, 56, 12, 13, 1.6, T3(w)) + itop(0, 6, 56, 12, 14.62, "#ffffff", ' fill-opacity=".05"');
  for (const x of [8, 20, 36, 48]) g += iell(x, 9, 14.7, 1.6, "#d9d4c8") + iell(x, 15, 14.7, 1.6, "#d9d4c8") + icyl(x + 3, 12, 14.6, 2.2, 0.6, GOLD[2], GOLD[0]);
  for (const x of [14, 28, 42]) g += icyl(x, 12, 14.6, 1, 1.2, GOLD[2], GOLD[0]) + icyl(x, 12, 15.6, 3.4, 0.4, GOLD[1], GOLD[0]) + candle(x, 12, 19, 2.4, frame + x);
  g += ibox(1, 20, 54, 4, 4.2, 1.6, T3(w));
  for (const x of [3, 27, 51]) g += ibox(x, 20.6, 1.4, 2.8, 0, 4.2, T3(shade(w, 0.8)));
  return g;
});
// the potion table: a worn top, coloured flasks (one bubbling), a mortar, an open book, a small cauldron
art("isopotiontable", 28, 14, 34, ({ w = "#5a3a24", frame = 0 }) => {
  let g = ishadow(28, 14);
  for (const [x, y] of [[1, 1], [26, 1], [1, 12], [26, 12]]) g += ibox(x, y, 1.2, 1.2, 0, 13, T3(shade(w, 0.8)));
  g += ibox(0, 0, 28, 14, 13, 1.6, T3(w)) + ibox(2, 2, 24, 10, 3, 0.8, T3(shade(w, 0.7)));
  const F = [[4, 4, "#51cf66", 5], [7, 3, "#b48cff", 4], [6, 7, "#3bc4ff", 3.4], [10, 4, "#ff6b6b", 6]];
  for (const [x, y, c, h] of F) g += icyl(x, y, 14.6, h, 1.1, shade(c, 0.85), c) + icyl(x, y, 14.6 + h, 1.6, 0.4, "#d9e6ea", "#eef4f6") + icyl(x, y, 16.2 + h, 0.6, 0.5, "#8a6a4a", "#a8845a");
  if (frame % 2) g += iell(4, 4, 21.4, 0.5, "#9dffb5") + iell(4.4, 3.6, 22.6, 0.35, "#9dffb5");
  g += icyl(16, 4, 14.6, 2, 1.6, "#8d929c", "#a7acb6") + iline(ipt(16, 4, 16.6), ipt(17.6, 3, 19), "#a8845a", 0.5);
  g += itop(13, 8, 7, 4.4, 14.7, "#efe6cf") + iline(ipt(16.5, 8, 14.75), ipt(16.5, 12.4, 14.75), "#a8906a", 0.3);
  for (let k = 0; k < 3; k++) g += iline(ipt(13.6, 9 + k, 14.75), ipt(15.8, 9 + k, 14.75), "#8a7a5a", 0.2) + iline(ipt(17.2, 9 + k, 14.75), ipt(19.4, 9 + k, 14.75), "#8a7a5a", 0.2);
  return g + icyl(23, 8, 14.6, 3, 2.2, "#1c1c22", "#2e2e36") + iell(23, 8, 17.6, 1.7, "#51cf66") + (frame % 2 ? iell(22.4, 7.4, 17.7, 0.4, "#c8ffd0") : "");
});
// the wizard's desk: two pedestals of carved drawers, a leather blotter, a stack of grimoires, an inkwell and its quill, a candle
art("isodeskwizard", 40, 14, 30, ({ w = "#3a2416", leather = "#2f5d3a", frame = 0 }) => {
  let g = ishadow(40, 14);
  for (const x of [0, 28]) {
    g += ibox(x, 0, 12, 14, 0, 12, T3(w));
    for (let k = 0; k < 3; k++) g += ifront(x + 1, 14, 10, 1 + k * 3.6, 3, shade(w, 1.12)) + ifront(x + 5.4, 14, 1.2, 2.2 + k * 3.6, 0.6, GOLD[1]);
  }
  g += ifront(12, 14, 16, 8, 3, shade(w, 0.9)) + ibox(-0.5, -0.5, 41, 15, 12, 1.4, T3(shade(w, 1.08))) + itop(10, 3, 20, 9, 13.42, leather) + itop(10.6, 3.6, 18.8, 7.8, 13.43, shade(leather, 1.12));
  const books = [["#8f2b2b", 3.6], ["#22336a", 3], ["#2f5d3a", 3.4], ["#5a3a14", 2.6]];
  let z = 13.4; for (const [i, [c, h]] of books.entries()) { g += ibox(1.6 + (i % 2) * 0.4, 2 + i * 0.3, 7, 5, z, h * 0.5, T3(c)) + ifront(1.6 + (i % 2) * 0.4, 7 + i * 0.3, 7, z + h * 0.2, 0.3, GOLD[1]); z += h * 0.5; }
  g += icyl(33, 10, 13.4, 1.4, 1, "#1c1c22", "#2a2a40") + iline(ipt(33, 10, 14.8), ipt(34.6, 8.6, 21), "#f4efe2", 0.7) + iline(ipt(33.6, 9.6, 16), ipt(34.4, 8.8, 20), "#d9cfb8", 0.35);
  return g + icyl(36.6, 3.4, 13.4, 0.6, 1.4, GOLD[2], GOLD[0]) + candle(36.6, 3.4, 14, 4, frame);
});

/* ---------- magic things ---------- */
// the cauldron: on three legs over embers, its brew (c) bubbling, a wisp of steam
art("isocauldron", 14, 14, 30, ({ c = "#51cf66", frame = 0, still = false }) => {
  let g = ishadow(14, 14);
  for (const [x, y] of [[3, 5], [11, 5], [7, 12]]) g += ibox(x - 0.5, y - 0.5, 1, 1, 0, 3, IRON);
  g += iell(7, 7, 0.3, 3.4, "#ff6b35", ' fill-opacity=".8"') + iell(7, 7, 0.5, 2, "#ffd27a");
  g += icyl(7, 7, 2.4, 8.4, 5.6, "#22222a", "#3a3a46") + icyl(7, 7, 10.8, 0.8, 5.9, "#2e2e36", "#4a4a54") + iell(7, 7, 11.6, 5, shade(c, 0.8)) + iell(7, 7, 11.62, 4.4, c);
  const B = [[5, 6], [8.4, 7.6], [6.6, 9], [9, 5.4]];
  for (const [i, [x, y]] of B.entries()) if (!still && (frame + i) % 3) g += iell(x, y, 11.9 + ((frame + i) % 3) * 0.3, 0.5 + ((frame + i) % 2) * 0.25, shade(c, 1.35));
  if (!still) for (let k = 0; k < 3; k++) { const z = 14 + ((frame * 2 + k * 3) % 9); g += iell(6 + k, 7 - k * 0.6, z, 1.2 + k * 0.3, shade(c, 1.5), ` fill-opacity="${(0.4 - (z - 14) * 0.035).toFixed(2)}"`); }
  return g + `<ellipse cx="${n2(ipt(7, 7, 12)[0])}" cy="${n2(ipt(7, 7, 12)[1])}" rx="11" ry="6" fill="${c}" fill-opacity=".12"/>`;
});
// a bookcase of grimoires: thick spines with gold bands, a candle, and one book floating over the top, pages fluttering
art("isogrimoires", 30, 8, 62, ({ w = OAK, frame = 0, still = false }) => {
  let g = ishadow(30, 8) + ibox(0, 0, 30, 8, 0, 50, T3(w)) + ifront(1.2, 8, 27.6, 1.2, 47.6, shade(w, 0.45));
  const C = ["#8f2b2b", "#22336a", "#2f5d3a", "#5a3a14", "#4a2f6b", "#7a5a2e", "#1c1c22"];
  for (let s = 0; s < 4; s++) {
    const z = 1.6 + s * 12;
    g += ifront(1.2, 8, 27.6, z + 10.4, 1, shade(w, 1.1));
    for (let x = 1.6, i = 0; x < 27.6; i++) { const bw = 1.4 + h01(i, s) * 1.6, bh = 7 + h01(s, i) * 3; if (x + bw > 28.6) break; const c = C[(i + s * 3) % C.length];
      g += ifront(x, 8, bw, z, bh, c) + ifront(x, 8, bw, z + bh * 0.2, 0.4, GOLD[1]) + ifront(x, 8, bw, z + bh * 0.75, 0.4, GOLD[1]); x += bw + 0.15; }
  }
  g += ibox(-0.5, -0.5, 31, 9, 50, 1.6, T3(shade(w, 1.08))) + candle(26, 4, 51.6, 3, frame);
  const bob = still ? 0 : [0, 0.8, 1.4, 0.8][frame % 4], [bx, by] = ipt(12, 4, 57 + bob);
  return g + `<g transform="translate(${n2(bx)} ${n2(by)})"><path fill="#8f2b2b" d="M-5 1L0 3L5 1L5 -1L0 1L-5 -1Z"/><path fill="#f4efe2" d="M-4.6 -1.2L0 0.6L4.6 -1.2L4.2 -3.4L0 -1.6L-4.2 -3.4Z"/>`
    + `<path fill="none" stroke="#c9bfa8" stroke-width=".25" d="M-3.6 -2.2L-0.6 -0.9M0.6 -0.9L3.6 -2.2"/>${frame % 2 && !still ? `<path fill="#fffaf0" d="M0 -1.6L2.4 -4.8L3 -2.6Z"/>` : ""}</g>`
    + `<circle cx="${n2(bx)}" cy="${n2(by - 1)}" r="6" fill="#b48cff" fill-opacity=".1"/>`;
});
// a flying broom: a little stand, the broom hovering over it (bob)
art("isobroom", 14, 8, 30, ({ frame = 0, still = false }) => {
  let g = ishadow(14, 8, 0) + ibox(1, 3, 12, 2, 0, 1.2, T3(OAK)) + ibox(2, 3.4, 1.2, 1.2, 1.2, 9, T3(OAK)) + ibox(10.8, 3.4, 1.2, 1.2, 1.2, 9, T3(OAK));
  const z = 13 + (still ? 0 : [0, 0.8, 1.4, 0.8][frame % 4]);
  g += iline(ipt(-1, 4, z + 0.6), ipt(11, 4, z), "#7a5236", 1.1) + iline(ipt(-1, 4, z + 0.9), ipt(11, 4, z + 0.3), "#a07a50", 0.35);
  const [x, y] = ipt(11, 4, z);
  g += `<path fill="#c9a24b" d="M${n2(x - 0.6)} ${n2(y - 0.8)}L${n2(x + 6)} ${n2(y - 2.6)}L${n2(x + 6.6)} ${n2(y + 1.6)}L${n2(x - 0.4)} ${n2(y + 0.8)}Z"/>`
    + `<path fill="none" stroke="#9a7a30" stroke-width=".3" d="M${n2(x + 1)} ${n2(y - 0.6)}L${n2(x + 6.2)} ${n2(y - 1.6)}M${n2(x + 1)} ${n2(y + 0.4)}L${n2(x + 6.4)} ${n2(y + 0.6)}"/><rect x="${n2(x - 0.8)}" y="${n2(y - 1)}" width="1.2" height="2" fill="#8f2b2b"/>`;
  return g + (still ? "" : `<circle cx="${n2(x + 7)}" cy="${n2(y)}" r=".4" fill="#ffe14d"/><circle cx="${n2(x + 8.6)}" cy="${n2(y - 1.4)}" r=".3" fill="#ffe14d" fill-opacity=".7"/>`);
});
// an owl on its perch: a T of wood on a round foot, a little bowl; it blinks and turns its head (frame)
art("isoowlperch", 10, 10, 44, ({ frame = 0, c = "#8a6a4a", still = false }) => {
  let g = ishadow(10, 10, 0) + icyl(5, 5, 0, 1.2, 3.6, shade(OAK, 0.8), OAK) + ibox(4.4, 4.4, 1.2, 1.2, 1.2, 26, T3(OAK)) + ibox(1, 4.5, 8, 1, 27, 1.2, T3(OAK)) + icyl(8, 7, 1.2, 1, 1.2, "#8d929c", "#c9ccd6");
  const [x, y] = ipt(5, 5, 28.2), blink = !still && frame % 7 === 0, turn = still ? 0 : [0, 0, 0.6, 0, -0.6, 0, 0][frame % 7];
  g += `<ellipse cx="${n2(x)}" cy="${n2(y - 4)}" rx="3.2" ry="4.4" fill="${c}"/><ellipse cx="${n2(x)}" cy="${n2(y - 3.2)}" rx="2.1" ry="3" fill="${shade(c, 1.35)}"/>`;
  for (let k = 0; k < 3; k++) g += `<path fill="none" stroke="${shade(c, 0.8)}" stroke-width=".3" d="M${n2(x - 1.2)} ${n2(y - 4 + k * 1.2)}q1.2 .8 2.4 0"/>`;
  g += `<ellipse cx="${n2(x + turn)}" cy="${n2(y - 8.6)}" rx="2.9" ry="2.5" fill="${c}"/><path fill="${c}" d="M${n2(x - 2.6 + turn)} ${n2(y - 10)}l.4 -2l1 1.4zM${n2(x + 2.6 + turn)} ${n2(y - 10)}l-.4 -2l-1 1.4z"/>`;
  for (const s of [-1, 1]) g += blink ? `<rect x="${n2(x + s * 1.2 - 0.8 + turn)}" y="${n2(y - 8.8)}" width="1.6" height=".35" fill="#1c1c22"/>` : `<circle cx="${n2(x + s * 1.2 + turn)}" cy="${n2(y - 8.7)}" r="1" fill="#ffe14d"/><circle cx="${n2(x + s * 1.2 + turn)}" cy="${n2(y - 8.7)}" r=".5" fill="#1c1c22"/>`;
  return g + `<path fill="#d4a640" d="M${n2(x - 0.4 + turn)} ${n2(y - 8)}h.8l-.4 1z"/><path fill="#d4a640" d="M${n2(x - 1.6)} ${n2(y + 0.2)}h1v.6h-1zM${n2(x + 0.6)} ${n2(y + 0.2)}h1v.6h-1z"/>`;
});
// the sorting hat on its three-legged stool: patched leather, folds that make a face, a bent tip
art("isosortinghat", 10, 10, 36, ({ frame = 0, still = false }) => {
  let g = ishadow(10, 10, 0);
  for (const [x, y] of [[2, 3], [8, 3], [5, 8.5]]) g += ibox(x - 0.5, y - 0.5, 1, 1, 0, 12, T3(OAK));
  g += icyl(5, 5, 12, 1.4, 4.2, shade(OAK, 0.85), shade(OAK, 1.1));
  const [x, y] = ipt(5, 5, 13.4), talk = !still && frame % 4 === 1, c = "#6a4a2e";
  g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="6.4" ry="2.2" fill="${shade(c, 0.85)}"/><path fill="${c}" d="M${n2(x - 4)} ${n2(y)}Q${n2(x - 2)} ${n2(y - 9)} ${n2(x + 1)} ${n2(y - 13)}Q${n2(x + 4)} ${n2(y - 15)} ${n2(x + 5)} ${n2(y - 12)}Q${n2(x + 2.4)} ${n2(y - 12)} ${n2(x + 2)} ${n2(y - 9)}Q${n2(x + 3)} ${n2(y - 4)} ${n2(x + 4)} ${n2(y)}Z"/>`;
  g += `<path fill="none" stroke="${shade(c, 0.6)}" stroke-width=".45" d="M${n2(x - 2.4)} ${n2(y - 6)}q1 -.8 2 0M${n2(x + 0.4)} ${n2(y - 6.2)}q1 -.8 2 0M${n2(x - 1.6)} ${n2(y - 3.2)}q1.6 ${talk ? 1.4 : 0.6} 3.2 0"/>`;
  return g + `<rect x="${n2(x - 3)}" y="${n2(y - 2.2)}" width="2" height="1.6" fill="${shade(c, 1.2)}"/><path fill="none" stroke="#c9b48a" stroke-width=".2" d="M${n2(x - 3)} ${n2(y - 2.2)}h2v1.6h-2z"/>`;
});
// a crystal ball on a brass stand: a swirl of light inside (frame)
art("isocrystalball", 6, 6, 12, ({ frame = 0, c = "#b48cff" }) => {
  let g = icyl(3, 3, 0, 1, 2, GOLD[2], GOLD[0]) + icyl(3, 3, 1, 1.2, 1.2, GOLD[1], GOLD[0]);
  const [x, y] = ipt(3, 3, 5);
  g += `<circle cx="${n2(x)}" cy="${n2(y)}" r="3.4" fill="${c}" fill-opacity=".18"/><circle cx="${n2(x)}" cy="${n2(y)}" r="2.6" fill="#dfeaf2" fill-opacity=".55"/>`;
  const a = (frame % 6) * Math.PI / 3;
  g += `<path fill="none" stroke="${c}" stroke-width=".6" stroke-linecap="round" d="M${n2(x + Math.cos(a) * 1.6)} ${n2(y + Math.sin(a) * 1.6)}Q${n2(x)} ${n2(y)} ${n2(x - Math.cos(a) * 1.2)} ${n2(y - Math.sin(a) * 1.2)}"/>`;
  return g + `<circle cx="${n2(x - 0.9)}" cy="${n2(y - 0.9)}" r=".6" fill="#ffffff" fill-opacity=".8"/>`;
});
