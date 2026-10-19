// More furniture of the buy mode (items/catalog3.js): storage (metal lockers, a chest of drawers, a cube shelf), small
// tables (a bistro table, a standing table), plants (a monstera, cacti, bamboo), and for outdoors a picnic table, a
// hammock and a hot tub (bubbles and steam: frame). Drawn like the rest (svg/iso.js): boxes lit from the left.

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iline, iell, icyl, ishadow, wood, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const metal = c => [shade(c, 1.22), c, shade(c, 0.72)];
// a leaf: a curved blade from (x, y) toward (x + dx, y + dy)
const leaf = (x, y, dx, dy, c, bend = 0.3) => `<path fill="${c}" d="M${n2(x)} ${n2(y)}Q${n2(x + dx * bend - dy * 0.25)} ${n2(y + dy * 0.75 + dx * 0.1)} ${n2(x + dx)} ${n2(y + dy)}Q${n2(x + dx * 0.75 + dy * 0.2)} ${n2(y + dy * 0.2)} ${n2(x)} ${n2(y)}Z"/>`;

/* ---------- storage ---------- */
// metal lockers: three doors with vents, a number plate and a padlock each
art("isolockers", 30, 9, 40, ({ c = "#7a8290", back = false }) => {
  let g = ishadow(30, 9) + ibox(0, 0, 30, 9, 0, 38, metal(c));
  if (back) return g;
  for (let i = 0; i < 3; i++) {
    const x = 0.8 + i * 9.8;
    g += ifront(x, 9, 8.6, 1.5, 35, shade(c, 0.92)) + iline(ipt(x + 8.6, 9, 1.5), ipt(x + 8.6, 9, 36.5), shade(c, 0.6), 0.4);
    for (let v = 0; v < 4; v++) g += ifront(x + 2, 9, 4.6, 31 - v * 1.6, 0.5, shade(c, 0.55));  // the vents
    g += ifront(x + 2.6, 9, 3.4, 23, 1.8, "#e8e4d8") + ifront(x + 6.4, 9, 1, 15, 3, "#2a2a30") + ifront(x + 6.2, 9, 1.4, 13.6, 1.6, "#d4a73a");  // number plate, handle, padlock
    for (let v = 0; v < 3; v++) g += ifront(x + 2, 9, 4.6, 5 - v * 1.4, 0.5, shade(c, 0.55));
  }
  return g + itop(0, 0, 30, 9, 38, shade(c, 1.3));
});
// a chest of drawers: four drawers with brass knobs, a runner and a small lamp-free top (things go on it)
art("isodresser", 24, 10, 22, ({ w = "#8a6a4a", back = false }) => {
  const W = wood(w);
  let g = ishadow(24, 10) + ibox(1, 1, 1.2, 1.2, 0, 2, W) + ibox(21.8, 1, 1.2, 1.2, 0, 2, W) + ibox(1, 7.8, 1.2, 1.2, 0, 2, W) + ibox(21.8, 7.8, 1.2, 1.2, 0, 2, W);
  g += ibox(0, 0, 24, 10, 2, 16, W) + ibox(-0.4, -0.4, 24.8, 10.8, 18, 1.2, wood(w, 1.08));
  if (back) return g;
  for (let r = 0; r < 4; r++) {
    const z = 3 + r * 3.7;
    g += ifront(1, 10, 22, z, 3.2, shade(w, 0.92)) + iline(ipt(1, 10, z + 3.2), ipt(23, 10, z + 3.2), shade(w, 0.6), 0.3);
    g += iell(7, 10.3, z + 1.6, 0.5, "#d4a73a") + iell(17, 10.3, z + 1.6, 0.5, "#d4a73a");
  }
  return g;
});
// a cube shelf: 4 × 3 compartments, fabric bins in some, books and a plant in others
art("isocubeshelf", 28, 8, 30, ({ w = "#f0ece4", back = false }) => {
  const W = wood(w), cell = 6.6;
  let g = ishadow(28, 8) + ibox(0, 0, 28, 8, 0, 28, W);
  if (back) return g;
  const bins = ["#c0603e", "#2f5d9a", "#9caf88", "#e8c23a"], books = ["#8f2b46", "#22336a", "#2f6e3c", "#de8001", "#c9ccd6"];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
    const x = 0.9 + k * cell, z = 0.9 + r * cell, n = (r * 4 + k) * 7 % 5;
    g += ifront(x, 8, cell - 0.8, z, cell - 0.8, shade(w, 0.55));  // the dark inside
    if (n === 0 || n === 3) g += ifront(x + 0.4, 8, cell - 1.6, z, cell - 1.6, bins[(r + k) % 4]) + ifront(x + 1.8, 8, 2.2, z + cell - 3.6, 0.8, shade(bins[(r + k) % 4], 0.6));
    else if (n === 1) for (let b = 0; b < 4; b++) g += ifront(x + 0.4 + b * 1.4, 8, 1.2, z, 3.6 + (b % 2) * 1.2, books[(r + k + b) % 5]);
    else if (n === 4 && r === 3) { const [px0, py0] = ipt(x + 2.8, 6, z + 1.6); g += icyl(x + 2.8, 6, z, 1.6, 1.4, "#b0603a", "#c9744a") + leaf(px0, py0, -2.4, -3, "#3f9e4f") + leaf(px0, py0, 2.6, -3.2, "#5fbf6d") + leaf(px0, py0, 0.4, -4, "#3f9e4f"); }
  }
  return g;
});

/* ---------- small tables ---------- */
// a round bistro table: a marble (or wood) top on a cast-iron foot
art("isobistrotable", 12, 12, 16, ({ c = "#ece8e0" }) => {
  let g = ishadow(12, 12, 0) + icyl(6, 6, 0, 0.8, 3.4, "#1c1c22", "#2a2a33") + icyl(6, 6, 0.8, 12.6, 0.6, "#2a2a33", "#2a2a33");
  g += icyl(6, 6, 13.4, 1.2, 5.6, shade(c, 0.78), c);
  const [x, y] = ipt(6, 6, 14.6);
  return g + `<ellipse cx="${n2(x - 1.4)}" cy="${n2(y - 0.6)}" rx="2.2" ry=".7" fill="#fff" fill-opacity=".35"/>`;
});
// a standing table: a high round top, a footrest ring
art("isohightable", 12, 12, 24, ({ c = "#2a2a33" }) => {
  let g = ishadow(12, 12, 0) + icyl(6, 6, 0, 0.8, 4, "#1c1c22", "#3a3a44") + icyl(6, 6, 0.8, 20.8, 0.7, "#5a5f6a", "#8d929c");
  const [x, y] = ipt(6, 6, 7);
  g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="2.6" ry="1.3" fill="none" stroke="#a7acb6" stroke-width=".5"/>`;
  return g + icyl(6, 6, 21.6, 1.2, 5.4, shade(c, 0.75), c);
});

/* ---------- plants (dry: wilted, incidents/plant.js) ---------- */
// a monstera in a ceramic pot: big split leaves on long stems
art("isomonstera", 14, 14, 38, ({ dry = false, c = "#e8e4d8" }) => {
  const l1 = dry ? "#b09440" : "#2f7a3a", l2 = dry ? "#94782f" : "#3f9e4f", droop = dry ? 4 : 0;
  let g = ishadow(14, 14, 1) + icyl(7, 7, 0, 10, 5, shade(c, 0.82), c) + iell(7, 7, 10.05, 4.2, "#4a3826");
  const [x, y] = ipt(7, 7, 10);
  for (const [dx, dy, col, s] of [[-9, -16, l1, 1], [8, -18, l2, -1], [-2, -24, l2, 1], [10, -9, l1, -1], [-10, -7, l2, 1]]) {
    const tx = x + dx, ty = y + dy + droop;
    g += `<path fill="none" stroke="${dry ? "#7a6a3a" : "#2a5a2a"}" stroke-width=".5" d="M${n2(x)} ${n2(y)}Q${n2(x + dx * 0.4)} ${n2(y + dy * 0.7)} ${n2(tx)} ${n2(ty + 2)}"/>`;
    g += `<ellipse cx="${n2(tx)}" cy="${n2(ty)}" rx="4.4" ry="3" fill="${col}" transform="rotate(${s * 20} ${n2(tx)} ${n2(ty)})"/>`;
    g += `<path fill="none" stroke="${shade(col, 0.7)}" stroke-width=".4" d="M${n2(tx - s * 1.5)} ${n2(ty - 2)}l${n2(s * 1.6)} 1.6M${n2(tx + s * 2.6)} ${n2(ty - 0.4)}l${n2(-s * 1.8)} .6M${n2(tx - s * 0.4)} ${n2(ty + 2.2)}l${n2(s * 1)} -1.4"/>`;
  }
  return g;
});
// three cacti in a long terracotta planter, one in flower
art("isocacti", 16, 8, 24, ({ dry = false }) => {
  const c1 = dry ? "#9a9050" : "#4a8a4a", c2 = dry ? "#8a8040" : "#3a7a3a";
  let g = ishadow(16, 8, 0) + ibox(0, 0, 16, 8, 0, 6, ["#d08a5a", "#b0603a", "#8a4a2a"]) + itop(0.8, 0.8, 14.4, 6.4, 6, "#c9b48a");
  const [a, ay] = ipt(3.5, 4, 6), [b, by] = ipt(8, 4, 6), [c, cy] = ipt(12.5, 4, 6);
  g += `<rect x="${n2(a - 1.4)}" y="${n2(ay - 9)}" width="2.8" height="9" rx="1.4" fill="${c1}"/><rect x="${n2(a + 1)}" y="${n2(ay - 7)}" width="1.6" height="3.4" rx=".8" fill="${c1}"/>`;
  g += `<rect x="${n2(b - 2)}" y="${n2(by - 14)}" width="4" height="14" rx="2" fill="${c2}"/><rect x="${n2(b - 4)}" y="${n2(by - 10)}" width="2.2" height="5" rx="1.1" fill="${c2}"/><rect x="${n2(b + 1.8)}" y="${n2(by - 12)}" width="2.2" height="4.4" rx="1.1" fill="${c2}"/>`;
  g += `<ellipse cx="${n2(c)}" cy="${n2(cy - 3)}" rx="2.6" ry="3" fill="${c1}"/>`;
  if (!dry) g += `<circle cx="${n2(b)}" cy="${n2(by - 14.4)}" r="1.2" fill="#ff6b9a"/><circle cx="${n2(b)}" cy="${n2(by - 14.4)}" r=".45" fill="#ffd43b"/>`;
  for (const [x, y] of [[b - 1, by - 8], [b + 1, by - 4], [a, ay - 5], [c + 1, cy - 3], [b - 0.6, by - 11]]) g += `<rect x="${n2(x)}" y="${n2(y)}" width=".4" height=".4" fill="#f4f2ea"/>`;
  return g;
});
// bamboo in a long planter: canes with their rings, leaves at the top
art("isobamboo", 24, 8, 54, ({ dry = false, frame = 0 }) => {
  const cane = dry ? "#a89a50" : "#7aa84a", ring = dry ? "#7a6a3a" : "#4a7a2a", lf = dry ? ["#b09440", "#94782f"] : ["#3f9e4f", "#5fbf6d"];
  let g = ishadow(24, 8) + ibox(0, 0, 24, 8, 0, 8, ["#5a5f6a", "#3a3f4a", "#2a2e38"]) + itop(0.8, 0.8, 22.4, 6.4, 8, "#4a3826");
  for (let i = 0; i < 6; i++) {
    const [x, y] = ipt(2.5 + i * 3.8, 3 + (i % 2) * 2, 8), h = 30 + (i * 13) % 14, sway = (frame ? 0.6 : -0.6) * (i % 2 ? 1 : -1);
    g += `<path fill="none" stroke="${cane}" stroke-width="1.1" d="M${n2(x)} ${n2(y)}L${n2(x + sway)} ${n2(y - h)}"/>`;
    for (let k = 6; k < h; k += 6) g += `<rect x="${n2(x + sway * k / h - 0.7)}" y="${n2(y - k)}" width="1.4" height=".5" fill="${ring}"/>`;
    for (let k = 0; k < 4; k++) g += leaf(x + sway, y - h + 4 + k * 3, (k % 2 ? 4 : -4), -2 - k % 2, lf[(i + k) % 2], 0.5);
  }
  return g;
});

/* ---------- outdoors ---------- */
// a wooden picnic table with its two benches (its slats, its A-frame legs)
art("isopicnic", 40, 26, 18, ({ w = "#a0764e" }) => {
  const W = wood(w);
  let g = ishadow(40, 26, 3);
  const legs = (y0, y1, z) => { for (const x of [4, 34]) g += ibox(x, y0, 2, y1 - y0, 0, z, wood(w, 0.85)); };
  legs(1, 6, 7); g += ibox(0, 1, 40, 5, 7, 1.2, W);  // the back bench
  legs(9, 17, 13);
  for (let k = 0; k < 4; k++) g += ibox(0, 8.4 + k * 2.4, 40, 2.1, 13, 1.2, W);  // the top's slats
  legs(20, 25, 7); g += ibox(0, 20, 40, 5, 7, 1.2, W);  // the front bench
  return g;
});
// a hammock on its wooden frame: a striped cloth hanging in a curve, a pillow
art("isohammock", 40, 14, 26, ({ c = "#e8c23a", back = false }) => {
  const frame = wood("#8a6a4a");
  let g = ishadow(40, 14, 2) + ibox(0, 5, 40, 4, 0, 1.6, frame) + ibox(0, 5, 2, 4, 1.6, 20, frame) + ibox(38, 5, 2, 4, 1.6, 20, frame);
  const a = ipt(2, 7, 20), b = ipt(38, 7, 20), mid = ipt(20, 7, 9);
  const cx = 2 * mid[0] - (a[0] + b[0]) / 2, cy = 2 * mid[1] - (a[1] + b[1]) / 2;
  const curve = (o, col, wd) => `<path fill="none" stroke="${col}" stroke-width="${wd}" d="M${n2(a[0])} ${n2(a[1] + o)}Q${n2(cx)} ${n2(cy + o)} ${n2(b[0])} ${n2(b[1] + o)}"/>`;
  g += curve(0, shade(c, 0.7), 4.2) + curve(-0.6, c, 3.2) + curve(-0.4, "#ffffff", 0.6) + curve(0.9, "#c0303a", 0.6);
  if (!back) { const p = ipt(9, 7, 13.6); g += `<ellipse cx="${n2(p[0])}" cy="${n2(p[1])}" rx="2.8" ry="1.4" fill="#f4f2ea"/>`; }
  return g + iline(a, ipt(1, 7, 21), "#5a3a1f", 0.4) + iline(b, ipt(39, 7, 21), "#5a3a1f", 0.4);
});
// a hot tub: a wooden shell, blue water lit from inside, bubbles rising, steam at night (frame, lit)
art("isohottub", 32, 32, 22, ({ w = "#8a6a4a", frame = 0, lit = false }) => {
  let g = ishadow(32, 32, 2) + ibox(0, 0, 32, 32, 0, 11, wood(w)) + itop(0, 0, 32, 32, 11, shade(w, 1.25));
  for (let k = 1; k < 8; k++) g += iline(ipt(k * 4, 32, 0.5), ipt(k * 4, 32, 10.5), shade(w, 0.7), 0.3) + iline(ipt(32, k * 4, 0.5), ipt(32, k * 4, 10.5), shade(w, 0.55), 0.3);
  g += itop(2.4, 2.4, 27.2, 27.2, 11, lit ? "#2a9ad8" : "#4ab0e0") + itop(4, 4, 24, 24, 11, lit ? "#5ac8f0" : "#7fd0f0", ' fill-opacity=".6"');
  for (let i = 0; i < 9; i++) {  // the bubbles
    const x = 6 + (i * 37) % 20, y = 6 + (i * 53) % 20, r = 0.6 + ((i + frame) % 3) * 0.3;
    g += iell(x, y, 11.1, r, "#ffffff", ' fill-opacity=".7"');
  }
  if (lit) for (let i = 0; i < 3; i++) { const [x, y] = ipt(10 + i * 6, 14 + i * 3, 13 + ((frame + i) % 3) * 2); g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="3.4" ry="1.6" fill="#ffffff" fill-opacity=".22"/>`; }
  return g + ibox(26, 0, 6, 3, 11, 2.4, "#c9ccd6");  // the control box
});

/* ---------- the second batch: music, games, the kitchen, decoration, the garden ---------- */
// an upright piano: its cabinet, the keyboard (white and black keys), the music stand, the pedals
art("isopiano", 30, 18, 34, ({ w = "#1c1c22", back = false }) => {
  const W = wood(w), bench = y => ibox(9, y, 12, 4, 0, 6, W) + ibox(9.2, y + 0.2, 11.6, 3.6, 6, 1.4, ["#4a2a2a", "#3a1f1f", "#2a1414"]);
  if (back) return ishadow(30, 18) + bench(0) + ibox(0, 10, 30, 8, 0, 32, W) + ibox(-0.4, 9.6, 30.8, 8.8, 32, 1.4, wood(w, 1.1));
  let g = ishadow(30, 18) + ibox(0, 0, 30, 8, 0, 32, W) + ibox(-0.4, -0.4, 30.8, 8.8, 32, 1.4, wood(w, 1.1));
  g += ibox(1, 9.5, 2, 2, 0, 14, W) + ibox(27, 9.5, 2, 2, 0, 14, W) + ibox(0, 8, 30, 4, 14, 2.4, W);
  g += itop(1, 8.4, 28, 3.2, 16.4, "#f4f2ea");
  for (let k = 1; k < 28; k++) g += iline(ipt(1 + k, 8.4, 16.4), ipt(1 + k, 11.6, 16.4), "#c9c4b8", 0.2);
  for (let k = 0; k < 27; k++) if ([0, 1, 3, 4, 5].includes(k % 7)) g += ibox(1.7 + k, 8.4, 0.6, 1.8, 16.4, 0.6, "#1c1c22");  // the black keys, by octave
  g += ifront(8, 8, 14, 22, 6, shade(w, 0.75)) + ifront(9, 8, 12, 23, 4, "#f4f2ea") + iline(ipt(10, 8, 25), ipt(19, 8, 25), "#6a6a72", 0.3) + iline(ipt(10, 8, 24), ipt(17, 8, 24), "#6a6a72", 0.3);
  g += ibox(12, 10.5, 1.4, 1.4, 0.4, 0.6, "#d4a73a") + ibox(14.4, 10.5, 1.4, 1.4, 0.4, 0.6, "#d4a73a") + ibox(16.8, 10.5, 1.4, 1.4, 0.4, 0.6, "#d4a73a");
  return g + bench(14);
});
// an acoustic guitar on its stand: the body in two curves, the sound hole, the neck and the head
art("isoguitar", 8, 8, 34, ({ c = "#c88a4a" }) => {
  const [x, y] = ipt(4, 4, 0);
  let g = ishadow(8, 8, 0) + iline(ipt(1, 6, 0), ipt(4, 4, 9), "#2a2a30", 0.7) + iline(ipt(7, 6, 0), ipt(4, 4, 9), "#2a2a30", 0.7) + iline(ipt(4, 1, 0), ipt(4, 4, 9), "#2a2a30", 0.7);
  g += `<rect x="${n2(x - 0.7)}" y="${n2(y - 31)}" width="1.4" height="14" fill="#5c3d27"/><rect x="${n2(x - 1.1)}" y="${n2(y - 34)}" width="2.2" height="3.4" rx=".4" fill="#3a2a1c"/>`;
  g += `<ellipse cx="${n2(x)}" cy="${n2(y - 9)}" rx="4.4" ry="4.6" fill="${c}"/><ellipse cx="${n2(x)}" cy="${n2(y - 15.4)}" rx="3.4" ry="3.4" fill="${c}"/>`;
  g += `<ellipse cx="${n2(x - 1.2)}" cy="${n2(y - 11)}" rx="1.6" ry="2.4" fill="#fff" fill-opacity=".18"/><circle cx="${n2(x)}" cy="${n2(y - 13)}" r="1.3" fill="#2a1a10"/>`;
  g += `<rect x="${n2(x - 1.6)}" y="${n2(y - 8)}" width="3.2" height=".8" fill="#2a1a10"/>`;
  for (const dx of [-0.45, -0.15, 0.15, 0.45]) g += `<rect x="${n2(x + dx - 0.05)}" y="${n2(y - 31)}" width=".1" height="23" fill="#e8e4d8" fill-opacity=".8"/>`;
  return g;
});
// a pool table: carved legs, a wooden frame, the cloth, six pockets, the balls racked, a cue lying on it
art("isobilliard", 60, 32, 22, ({ c = "#2f7a4a" }) => {
  const W = wood("#5c3d27");
  let g = ishadow(60, 32, 3);
  for (const [x, y] of [[3, 3], [55, 3], [3, 27], [55, 27], [29, 3], [29, 27]]) g += ibox(x, y, 2.4, 2.4, 0, 12, W);
  g += ibox(0, 0, 60, 32, 12, 4, W) + itop(0, 0, 60, 32, 16, shade("#5c3d27", 1.25)) + itop(3, 3, 54, 26, 16, c) + itop(3, 3, 54, 26, 16, "#000", ' fill-opacity=".08"');
  for (const [x, y] of [[3.5, 3.5], [30, 3], [56.5, 3.5], [3.5, 28.5], [30, 29], [56.5, 28.5]]) g += iell(x, y, 16.05, 1.3, "#14141c");
  g += iell(16, 16, 16.1, 0.9, "#f4f2ea");
  const balls = ["#e8c23a", "#2a5ad0", "#c0303a", "#6a2a9a", "#ef7d22", "#2f8a4a", "#8f2b2b", "#1c1c22", "#e8c23a", "#2a5ad0"];
  let k = 0; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) g += iell(40 + r * 1.7, 16 - r * 0.95 + i * 1.9, 16.1, 0.85, balls[k++ % balls.length]);
  return g + iline(ipt(6, 24, 16.6), ipt(30, 10, 16.6), "#d9b27a", 0.6) + iline(ipt(6, 24, 16.6), ipt(9, 22.3, 16.6), "#2a2a30", 0.7);
});
// a chess table: a pedestal, an inlaid board, the pieces set up
art("isochesstable", 14, 30, 18, ({ w = "#5c3d27" }) => {
  const stool = y => icyl(7, y, 0, 5, 2.8, shade(w, 0.75), shade(w, 1.15)) + icyl(7, y, 5, 1.2, 3, "#3a1f1f", "#5a2a2a");
  let g = ishadow(14, 30, 0) + stool(3.5) + icyl(7, 15, 0, 1, 4, shade(w, 0.7), w) + icyl(7, 15, 1, 11, 1, shade(w, 0.8), w) + ibox(0, 8, 14, 14, 12, 1.4, wood(w));
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) g += itop(1 + c * 1.5, 9 + r * 1.5, 1.5, 1.5, 13.4, (r + c) % 2 ? "#3a2a1c" : "#e8dcc0");
  for (let c = 0; c < 8; c++) for (const [r, col] of [[0, "#1c1c22"], [1, "#1c1c22"], [6, "#f4f2ea"], [7, "#f4f2ea"]]) {
    const h = r === 1 || r === 6 ? 0.9 : [1.4, 1.2, 1.2, 1.8, 2, 1.2, 1.2, 1.4][c];
    g += icyl(1.75 + c * 1.5, 9.75 + r * 1.5, 13.4, h, 0.45, shade(col, 0.8), col);
  }
  return g + stool(26.5);
});
// a three-leaf folding screen: wooden frames, paper (or fabric) panels, a pattern
art("isoscreen", 30, 4, 34, ({ c = "#f4efe2" }) => {
  let g = ishadow(30, 4, 0);
  for (let i = 0; i < 3; i++) {
    const x = i * 10, fr = wood("#5c3d27", i === 1 ? 0.9 : 1);
    g += ibox(x, 1.5, 9.6, 1, 0, 32, fr) + ifront(x + 0.8, 2.5, 8, 2, 28, i === 1 ? shade(c, 0.9) : c);
    for (let k = 1; k < 4; k++) g += ifront(x + 0.8, 2.5, 8, 2 + k * 7, 0.4, "#5c3d27");
    g += ifront(x + 4.6, 2.5, 0.4, 2, 28, "#5c3d27");
  }
  const [bx, by] = ipt(14, 2.5, 22);
  return g + `<path fill="none" stroke="#c0303a" stroke-width=".7" d="M${n2(bx - 9)} ${n2(by + 2)}q4 -5 8 -2t9 -1"/><circle cx="${n2(bx + 6)}" cy="${n2(by - 6)}" r="2.2" fill="#c0303a" fill-opacity=".8"/>`;
});
// a coat rack: a round foot, a pole, hooks, a coat and a hat hanging
art("isocoatrack", 8, 8, 42, ({ c = "#5c3d27" }) => {
  const [x, y] = ipt(4, 4, 0);
  let g = ishadow(8, 8, 0) + icyl(4, 4, 0, 1.2, 3.4, shade(c, 0.7), c) + icyl(4, 4, 1.2, 36, 0.5, shade(c, 0.8), c) + icyl(4, 4, 37, 1.6, 1, shade(c, 0.8), shade(c, 1.2));
  for (const dx of [-2.6, 2.6, -1.4, 1.4]) g += iline([x, y - 34], [x + dx, y - 36.4], c, 0.6);
  g += `<path fill="#3a4a6a" d="M${n2(x - 2.6)} ${n2(y - 35)}l-1.6 4l-.6 12h3.4l.8 -12z"/><path fill="#2a3a5a" d="M${n2(x - 2.6)} ${n2(y - 35)}l1.4 3.6l-.4 12.4h-1.6z"/>`;
  return g + `<ellipse cx="${n2(x + 2.8)}" cy="${n2(y - 35.6)}" rx="2.4" ry=".8" fill="#6b4a2a"/><rect x="${n2(x + 1.4)}" y="${n2(y - 38)}" width="2.8" height="2.4" rx=".6" fill="#7a5530"/><rect x="${n2(x + 1.4)}" y="${n2(y - 36.4)}" width="2.8" height=".5" fill="#c0303a"/>`;
});
// a glass-door drinks fridge: lit shelves of cans and bottles, a brand strip
art("isodrinksfridge", 14, 12, 32, ({ c = "#c0303a", lit = true }) => {
  let g = ishadow(14, 12) + ibox(0, 0, 14, 12, 0, 30, metal("#2a2a33")) + ifront(0, 12, 14, 27, 3, c) + ifront(4, 12, 6, 27.8, 1.4, "#f4f2ea");
  g += ifront(1, 12, 12, 2, 24, lit ? "#cfe8ff" : "#7a8a9a");
  const cans = ["#c0303a", "#2a6fd0", "#3ec46a", "#e8c23a", "#f4f2ea", "#ef7d22"];
  for (let r = 0; r < 4; r++) { const z = 3 + r * 6; g += ifront(1, 12, 12, z, 0.4, "#8d929c"); for (let k = 0; k < 6; k++) g += ifront(1.6 + k * 1.9, 12, 1.2, z + 0.4, r % 2 ? 3.6 : 2.4, cans[(r * 2 + k) % 6]); }
  g += ifront(1, 12, 12, 2, 24, "#ffffff", ` fill-opacity="${lit ? 0.16 : 0.08}"`) + ifront(11.6, 12, 0.6, 8, 10, "#c9ccd6");
  return g;
});
// a popcorn cart: a red base on wheels, the glass box full of popcorn, the kettle, the striped roof (frame: popping)
art("isopopcorn", 10, 10, 34, ({ c = "#c0303a", frame = 0 }) => {
  let g = ishadow(10, 10, 0) + icyl(1.5, 9, 0, 1, 1.2, "#2a2a30", "#3a3a44") + icyl(8.5, 9, 0, 1, 1.2, "#2a2a30", "#3a3a44");
  g += ibox(0, 0, 10, 10, 1, 11, metal(c)) + ifront(2, 10, 6, 4, 4, "#f4f2ea") + ifront(2.6, 10, 4.8, 4.6, 2.8, c);
  g += ibox(0.5, 0.5, 9, 9, 12, 2, metal(c));
  g += ibox(1, 1, 8, 8, 14, 1, ["#fff3c4", "#ffe9a0", "#f0d070"]);
  for (let k = 0; k < 14; k++) g += iell(1.6 + (k * 37) % 7, 1.6 + (k * 53) % 7, 15 + (k % 3) * 0.6, 0.7, k % 4 ? "#fff8e0" : "#ffe08a");
  g += ibox(1, 1, 8, 8, 14, 11, ["#dff3ff22", "#dff3ff33", "#bfe0ff44"]) + iline(ipt(1, 9, 14), ipt(1, 9, 25), "#c9ccd6", 0.4) + iline(ipt(9, 9, 14), ipt(9, 9, 25), "#c9ccd6", 0.4) + iline(ipt(9, 1, 14), ipt(9, 1, 25), "#c9ccd6", 0.4);
  g += icyl(5, 4, 21, 2.4, 1.8, "#a7acb6", "#c9ccd6");
  if (frame) for (let k = 0; k < 3; k++) g += iell(3 + k * 2, 3 + (k + frame) % 3, 20 + ((k + frame) % 3) * 1.2, 0.5, "#fff8e0");
  g += ibox(-0.5, -0.5, 11, 11, 25, 1.4, metal(c));
  for (let k = 0; k < 5; k++) g += ifront(-0.5 + k * 2.2, 10.5, 1.1, 25, 1.4, "#f4f2ea");
  return g + `<path fill="${c}" d="M${n2(ipt(-0.5, 10.5, 26.4)[0])} ${n2(ipt(-0.5, 10.5, 26.4)[1])}L${n2(ipt(5, 5, 32)[0])} ${n2(ipt(5, 5, 32)[1])}L${n2(ipt(10.5, 10.5, 26.4)[0])} ${n2(ipt(10.5, 10.5, 26.4)[1])}Z"/><path fill="${shade(c, 0.72)}" d="M${n2(ipt(10.5, 10.5, 26.4)[0])} ${n2(ipt(10.5, 10.5, 26.4)[1])}L${n2(ipt(5, 5, 32)[0])} ${n2(ipt(5, 5, 32)[1])}L${n2(ipt(10.5, -0.5, 26.4)[0])} ${n2(ipt(10.5, -0.5, 26.4)[1])}Z"/>`;
});
// a bonsai: a shallow glazed tray, a twisting trunk, clouds of foliage
art("isobonsai", 10, 10, 22, ({ dry = false, c = "#2f5d9a" }) => {
  const f1 = dry ? "#b09440" : "#3f7a3a", f2 = dry ? "#94782f" : "#5a9a4a";
  let g = ishadow(10, 10, 0) + ibox(1, 2, 8, 6, 0, 3, metal(c)) + itop(1.6, 2.6, 6.8, 4.8, 3, "#5a4a36") + iell(6.6, 5.4, 3.05, 0.9, "#8d929c");
  const [x, y] = ipt(4.6, 5, 3);
  g += `<path fill="none" stroke="#5a3a24" stroke-width="1.6" stroke-linecap="round" d="M${n2(x)} ${n2(y)}c-1 -3 3 -4 1 -7s2 -4 0 -6"/><path fill="none" stroke="#5a3a24" stroke-width=".9" d="M${n2(x + 0.6)} ${n2(y - 6)}l4 -2M${n2(x + 0.4)} ${n2(y - 9)}l-3.6 -1.6"/>`;
  return g + `<ellipse cx="${n2(x + 5)}" cy="${n2(y - 9)}" rx="3.6" ry="1.8" fill="${f1}"/><ellipse cx="${n2(x - 3.4)}" cy="${n2(y - 11)}" rx="3.2" ry="1.6" fill="${f2}"/><ellipse cx="${n2(x + 0.6)}" cy="${n2(y - 14.4)}" rx="4.2" ry="2.2" fill="${f1}"/><ellipse cx="${n2(x - 0.6)}" cy="${n2(y - 15.2)}" rx="2.2" ry="1" fill="${f2}"/>`;
});
// a raised vegetable bed: wooden planks, lettuces, carrots, tomatoes on their stakes
art("isovegpatch", 30, 12, 26, ({ dry = false, ripe = true }) => {
  const W = wood("#8a6a4a"), g1 = dry ? "#b09440" : "#5aa84a", g2 = dry ? "#94782f" : "#3f8a3a";
  let g = ishadow(30, 12) + ibox(0, 0, 30, 12, 0, 10, W) + itop(1, 1, 28, 10, 10, "#4a3826");
  for (let k = 0; k < 3; k++) g += iline(ipt(0, 12, 3 + k * 3), ipt(30, 12, 3 + k * 3), shade("#8a6a4a", 0.7), 0.3);
  for (let k = 0; k < 4; k++) { const [x, y] = ipt(4 + k * 3.4, 4, 10); g += `<ellipse cx="${n2(x)}" cy="${n2(y - 1.2)}" rx="1.8" ry="1.3" fill="${g1}"/><ellipse cx="${n2(x - 0.3)}" cy="${n2(y - 1.6)}" rx=".9" ry=".6" fill="#9adf7a"/>`; }
  for (let k = 0; k < 4; k++) { const [x, y] = ipt(4 + k * 3.4, 8.6, 10); g += `<path fill="${g2}" d="M${n2(x)} ${n2(y)}l-1 -3l1 1l1 -2l.2 2l1 -1z"/><rect x="${n2(x - 0.3)}" y="${n2(y - 0.4)}" width=".6" height=".6" fill="#ef7d22"/>`; }
  for (const xx of [20, 25]) for (const yy of [3.5, 8.5]) {
    const [x, y] = ipt(xx, yy, 10);
    g += `<rect x="${n2(x - 0.2)}" y="${n2(y - 14)}" width=".4" height="14" fill="#a8845a"/><path fill="none" stroke="${g2}" stroke-width=".9" d="M${n2(x)} ${n2(y)}q-2 -4 0 -7t0 -6"/>`;
    if (!dry && ripe) g += `<circle cx="${n2(x + 0.9)}" cy="${n2(y - 5)}" r=".8" fill="#d23a2a"/><circle cx="${n2(x - 0.8)}" cy="${n2(y - 9)}" r=".7" fill="#e8502a"/>`;
  }
  return g;
});
// a garden swing bench: an A-frame, chains, a cushioned bench, a striped canopy
art("isoswing", 34, 14, 40, ({ c = "#3a7ac0" }) => {
  const fr = metal("#e6e2d8");
  let g = ishadow(34, 14, 2);
  for (const x of [0, 32]) g += ibox(x, 1, 2, 2, 0, 33, fr) + ibox(x, 11, 2, 2, 0, 33, fr) + ibox(x, 1, 2, 12, 31, 2, fr);
  g += ibox(0, 6, 34, 2, 32, 2, fr);
  for (const x of [4, 30]) g += iline(ipt(x, 7, 32), ipt(x, 5, 18), "#8d929c", 0.4) + iline(ipt(x, 7, 32), ipt(x, 10, 12), "#8d929c", 0.4);
  g += ibox(3, 4, 28, 7, 10, 1.6, fr) + ibox(3.4, 4.4, 27.2, 6.2, 11.6, 1.6, c) + ibox(3, 3.6, 28, 1.4, 11.6, 8, fr) + ifront(3.4, 5, 27.2, 12.6, 6, c);
  for (let k = 0; k < 3; k++) g += ibox(5 + k * 9, 4.6, 7, 5.6, 13.2, 1.4, shade(c, 1.15));
  g += ibox(-1, 0, 36, 14, 35, 1.6, ["#f4f2ea", "#e6e2d8", "#c9c4b8"]);
  for (let k = 0; k < 6; k++) g += itop(-1 + k * 6, 0, 3, 14, 36.6, c) + ifront(-1 + k * 6, 14, 3, 35, 1.6, shade(c, 0.9));
  return g;
});
// a birdcage on its stand: a dome of bars, a perch, a swing, a canary that hops (frame)
art("isobirdcage", 10, 10, 44, ({ c = "#d4a73a", frame = 0 }) => {
  const [x, y] = ipt(5, 5, 0);
  let g = ishadow(10, 10, 0) + icyl(5, 5, 0, 1, 3.4, shade(c, 0.7), c) + icyl(5, 5, 1, 22, 0.45, shade(c, 0.8), c) + icyl(5, 5, 23, 1.2, 4.4, shade(c, 0.75), c);
  const top = y - 24.2, cy = y - 31;
  g += `<ellipse cx="${n2(x)}" cy="${n2(top)}" rx="4.2" ry="1.4" fill="#f4f2ea" fill-opacity=".5"/>`;
  const by = frame % 2 ? cy + 3 : cy + 1.6;
  g += `<rect x="${n2(x - 3.4)}" y="${n2(cy + 3.6)}" width="6.8" height=".4" fill="#8a6a4a"/><ellipse cx="${n2(x + (frame % 2 ? 1 : -0.6))}" cy="${n2(by)}" rx="1.3" ry="1.1" fill="#ffd43b"/><circle cx="${n2(x + (frame % 2 ? 1.9 : 0.3))}" cy="${n2(by - 1)}" r=".7" fill="#ffd43b"/><rect x="${n2(x + (frame % 2 ? 2.4 : 0.8))}" y="${n2(by - 1.1)}" width=".6" height=".3" fill="#ef7d22"/>`;
  for (let k = -4; k <= 4; k += 1.33) g += `<path fill="none" stroke="${c}" stroke-width=".3" d="M${n2(x + k)} ${n2(top)}V${n2(cy - 2)}Q${n2(x + k * 0.6)} ${n2(cy - 8)} ${n2(x)} ${n2(cy - 9)}"/>`;
  return g + `<path fill="none" stroke="${c}" stroke-width=".5" d="M${n2(x - 4.2)} ${n2(top)}V${n2(cy - 2)}Q${n2(x - 4)} ${n2(cy - 9)} ${n2(x)} ${n2(cy - 9)}Q${n2(x + 4)} ${n2(cy - 9)} ${n2(x + 4.2)} ${n2(cy - 2)}V${n2(top)}"/><circle cx="${n2(x)}" cy="${n2(cy - 10)}" r=".8" fill="none" stroke="${c}" stroke-width=".4"/>`;
});
