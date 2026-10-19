// The haunted manor theme (items/manor.js): manor walls to compose (wainscot and torn damask, a creaking door that
// swings open when someone comes near, a portrait whose eyes follow the chief, a pillar with its sconce), a candelabra
// and a jack-o'-lantern, a carved chair and a wingback armchair, a séance table, a dark desk, the master's organ (the
// chief's desk), a jar of ghosts (the blocked agents), a grandfather clock, a coffin, a beam of bats, a raven on its
// bust, a carnivorous plant. Drawn like the rest (svg/iso.js).

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const T3 = c => [shade(c, 1.2), c, shade(c, 0.74)];
const IRON = ["#4a4a54", "#2e2e36", "#1c1c22"], GOLD = ["#f2d27a", "#c9a040", "#8a6a28"], EBONY = "#2a1c1a", BLOOD = "#8f1f2a";
const path = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const shifted = (g, dx, dy) => { const [x, y] = ipt(dx, dy, 0); return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`; };
const glow = (x, y, z, r, c, a = 0.25) => { const [px, py] = ipt(x, y, z); return `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(r)}" fill="${c}" fill-opacity="${a.toFixed(2)}"/>`; };
const h01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
// a flame that flickers with frame, its halo
const flame = (x, y, z, s = 1, frame = 0) => {
  const f = Math.abs(Math.round(frame)) % 3, [px, py] = ipt(x, y, z), k = [1, 1.15, 0.9][f] * s, sway = [0, 0.4, -0.3][f] * s;
  return `<circle cx="${n2(px)}" cy="${n2(py - 1.4 * k)}" r="${n2(3.6 * s)}" fill="#ffcf6a" fill-opacity=".22"/>`
    + `<path fill="#ff9a3b" d="M${n2(px - 0.9 * s)} ${n2(py)}Q${n2(px + sway)} ${n2(py - 3.4 * k)} ${n2(px + 0.9 * s)} ${n2(py)}Q${n2(px)} ${n2(py + 0.7 * s)} ${n2(px - 0.9 * s)} ${n2(py)}Z"/>`
    + `<path fill="#fff3b0" d="M${n2(px - 0.4 * s)} ${n2(py - 0.2)}Q${n2(px + sway * 0.5)} ${n2(py - 2 * k)} ${n2(px + 0.4 * s)} ${n2(py - 0.2)}Z"/>`;
};
// a candle with wax running down its side; lit: its flame
const candle = (x, y, z, h, frame, lit = true) => {
  const [px, py] = ipt(x, y, z + h);
  return icyl(x, y, z, h, 0.6, "#e8e0c8", "#fffaf0") + `<path fill="#f4efe2" d="M${n2(px - 0.7)} ${n2(py + 0.4)}v${n2(h * 0.5)}h.5v-${n2(h * 0.3)}h.4v${n2(h * 0.15)}h.4v-${n2(h * 0.35)}Z"/>`
    + iline(ipt(x, y, z + h), ipt(x, y, z + h + 0.6), "#2a2a30", 0.25) + (lit ? flame(x, y, z + h + 0.6, 0.7, frame) : "");
};
// a little ghost, in screen units: a sheet with a wavy hem and two eyes
const ghost = (x, y, s = 1, a = 0.85) => `<path fill="#f4f8ff" fill-opacity="${a}" d="M${n2(x - 1.3 * s)} ${n2(y + 1.6 * s)}V${n2(y)}Q${n2(x - 1.3 * s)} ${n2(y - 1.7 * s)} ${n2(x)} ${n2(y - 1.7 * s)}Q${n2(x + 1.3 * s)} ${n2(y - 1.7 * s)} ${n2(x + 1.3 * s)} ${n2(y)}V${n2(y + 1.6 * s)}`
  + `l-${n2(0.43 * s)} -${n2(0.5 * s)}-${n2(0.43 * s)} ${n2(0.5 * s)}-${n2(0.43 * s)} -${n2(0.5 * s)}-${n2(0.44 * s)} ${n2(0.5 * s)}Z"/>`
  + `<circle cx="${n2(x - 0.45 * s)}" cy="${n2(y - 0.3 * s)}" r="${n2(0.25 * s)}" fill="#1c1c22"/><circle cx="${n2(x + 0.45 * s)}" cy="${n2(y - 0.3 * s)}" r="${n2(0.25 * s)}" fill="#1c1c22"/>`;
// a bat, wings spread (screen units); up: the wings' beat
const bat = (x, y, s = 1, up = false) => `<path fill="#1c1420" d="M${n2(x)} ${n2(y)}Q${n2(x - 1.6 * s)} ${n2(y + (up ? -2 : 0.4) * s)} ${n2(x - 3.4 * s)} ${n2(y + (up ? -1.6 : -0.6) * s)}`
  + `Q${n2(x - 2.4 * s)} ${n2(y + 0.4 * s)} ${n2(x - 2.6 * s)} ${n2(y + 1 * s)}Q${n2(x - 1.4 * s)} ${n2(y + 0.4 * s)} ${n2(x)} ${n2(y + 1.2 * s)}Q${n2(x + 1.4 * s)} ${n2(y + 0.4 * s)} ${n2(x + 2.6 * s)} ${n2(y + 1 * s)}`
  + `Q${n2(x + 2.4 * s)} ${n2(y + 0.4 * s)} ${n2(x + 3.4 * s)} ${n2(y + (up ? -1.6 : -0.6) * s)}Q${n2(x + 1.6 * s)} ${n2(y + (up ? -2 : 0.4) * s)} ${n2(x)} ${n2(y)}Z"/>`
  + `<path fill="#1c1420" d="M${n2(x - 0.6 * s)} ${n2(y + 0.2 * s)}l.2 -.8.4 .5.4 -.5.2 .8z"/><rect x="${n2(x - 0.4 * s)}" y="${n2(y + 0.3 * s)}" width=".25" height=".25" fill="#ff4d5e"/><rect x="${n2(x + 0.15 * s)}" y="${n2(y + 0.3 * s)}" width=".25" height=".25" fill="#ff4d5e"/>`;
// a cobweb in a corner of a front face (plane y): threads fanning from (x, z), going right (dir 1) or left (-1) and down
function web(x, y, z, r, dir = 1) {
  const c = "#e8e4f0", o = ' stroke-opacity=".55"';
  let g = "";
  const spokes = [0, 0.4, 0.8, 1.2, 1.57].map(a => [x + Math.cos(a) * r * dir, z - Math.sin(a) * r]);
  for (const [sx, sz] of spokes) g += iline(ipt(x, y, z), ipt(sx, y, sz), c, 0.18).replace("/>", `${o}/>`);
  for (const k of [0.35, 0.6, 0.85]) {
    const pts = spokes.map(([sx, sz]) => ipt(x + (sx - x) * k, y, z + (sz - z) * k));
    g += `<path fill="none" stroke="${c}" stroke-width=".15"${o} d="M${pts.map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}"/>`;
  }
  return g;
}

/* ---------- walls to compose ---------- */
// the lower part, wood panels and a chair rail; the upper part, a damask paper (c) with its motifs, torn here and there;
// a cornice on top. skip(x0, x1, z0, z1): leave a hole for a door or a frame
function manorFace(w, d, c, wd = EBONY, torn = true, skip = () => false) {
  let g = ifront(0, d, w, 0, 16, shade(wd, 0.9)) + ifront(0, d, w, 16, 34, c);
  for (let x = 0.8; x + 5 <= w; x += 6) if (!skip(x, x + 4.6, 2, 13)) g += ifront(x, d, 4.6, 2, 11, shade(wd, 1.15)) + ifront(x + 0.6, d, 3.4, 2.6, 9.8, shade(wd, 0.95));
  for (let z = 19, r = 0; z < 48; z += 5, r++) for (let x = (r % 2 ? 3 : 0) + 1.5; x < w - 1; x += 6) {
    if (skip(x - 1.2, x + 1.2, z - 1.6, z + 1.6)) continue;
    g += path([[x, d, z + 1.6], [x + 1.1, d, z], [x, d, z - 1.6], [x - 1.1, d, z]], shade(c, 1.45), ' fill-opacity=".8"') + ifront(x - 0.25, d, 0.5, z - 0.25, 0.5, shade(c, 0.7));
  }
  if (torn) for (const [x, z] of [[w * 0.68, 38], [w * 0.2, 24]]) if (!skip(x - 2, x + 3, z - 3, z + 3))  // a torn strip: the plaster under it, the curled edge
    g += path([[x, d, z + 3], [x + 3, d, z + 1.6], [x + 2.4, d, z - 2.4], [x - 0.6, d, z - 3]], "#c9bfa8") + path([[x, d, z + 3], [x + 0.8, d, z + 2.4], [x + 0.2, d, z - 2.8], [x - 0.6, d, z - 3]], shade(c, 1.35));
  for (let y = 0; y < d; y += 4) g += iside(w, y + 0.2, Math.min(3.6, d - y - 0.4), 0.2, 15.6, shade(wd, 0.7)) + iside(w, y + 0.2, Math.min(3.6, d - y - 0.4), 16.2, 33.6, shade(c, 0.72));
  return g + ibox(0, d - 0.2, w, 0.8, 15.6, 1.2, T3(shade(wd, 1.2))) + ibox(0, 0, w, d, 50, 2.6, T3(shade(wd, 1.1))) + ibox(0, 0, w, d + 0.4, 52.6, 1, T3(shade(wd, 1.3)));
}
art("isomanorwall", 24, 4, 60, ({ c = "#4a1a2a", torn = true }) => ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.7))) + manorFace(24, 4, c, EBONY, torn) + web(0.4, 4, 49.6, 7, 1));
// the creaking door: a frame, a lintel with a moulding, a leaf hinged on the left that swings out toward the room
// (open 0..1); panels, iron hinges, a ring knocker
art("isomanordoor", 24, 4, 60, ({ c = "#4a1a2a", open = 0 }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 4, 4, 0, 50, T3(shade(c, 0.7))) + ibox(20, 0, 4, 4, 0, 50, T3(shade(c, 0.7))) + ibox(4, 0, 16, 4, 40, 10, T3(shade(c, 0.7)));
  g += manorFace(24, 4, c, EBONY, false, (a, b, z0, z1) => b > 4 && a < 20 && z0 < 40);
  g += ibox(3.4, 3.6, 1.2, 1, 0, 41, T3("#3a2418")) + ibox(19.4, 3.6, 1.2, 1, 0, 41, T3("#3a2418")) + ibox(3.4, 3.6, 17.2, 1, 40, 2, T3("#3a2418")) + path([[8, 4.6, 42], [12, 4.6, 45], [16, 4.6, 42]], "#3a2418");
  const a = Math.max(0, Math.min(1, open)) * 1.25, ca = Math.cos(a), sa = Math.sin(a), hx = 4.6, hy = 2.6;
  const P = (u, z) => [hx + u * ca, hy + u * sa, z], L = 14.8;
  g += path([P(0, 0), P(L, 0), P(L, 39.6), P(0, 39.6)], "#5a3a24") + path([P(L, 0), P(L + 0.01, 0), P(L, 39.6)], "#2a1810");
  for (const [z0, z1] of [[3, 18], [21, 37]]) for (const [u0, u1] of [[1.4, 6.8], [8, 13.4]]) g += path([P(u0, z0), P(u1, z0), P(u1, z1), P(u0, z1)], "#6e4a30") + path([P(u0 + 0.5, z0 + 0.5), P(u1 - 0.5, z0 + 0.5), P(u1 - 0.5, z1 - 0.5), P(u0 + 0.5, z1 - 0.5)], "#5e3e26");
  for (const z of [6, 33]) g += path([P(0, z), P(5, z), P(5, z + 1.2), P(0, z + 1.2)], IRON[1]);
  const [kx, ky] = ipt(...P(11.6, 21));
  return g + `<circle cx="${n2(kx)}" cy="${n2(ky)}" r="1.4" fill="none" stroke="${GOLD[1]}" stroke-width=".45"/><circle cx="${n2(kx)}" cy="${n2(ky - 1.3)}" r=".5" fill="${GOLD[2]}"/>`;
});
// a wall with the ancestor's portrait: a gilt frame, a stern old man; his eyes follow the chief (look -1..1) and glow red
// at night (lit)
art("isomanorportrait", 24, 4, 60, ({ c = "#4a1a2a", look = 0, lit = false }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.7))) + manorFace(24, 4, c, EBONY, false, (a, b, z0, z1) => b > 6 && a < 18 && z1 > 20 && z0 < 46);
  g += ifront(6.4, 4.05, 11.2, 20.4, 25.2, GOLD[1]) + ifront(7.4, 4.06, 9.2, 21.4, 23.2, GOLD[2]) + ifront(8, 4.07, 8, 22, 22, "#1e2a1e");
  for (const [x, z] of [[6.4, 45.6], [17.6, 45.6], [6.4, 20.4], [17.6, 20.4]]) g += glow(x, 4.1, z, 1, GOLD[0], 0.9);
  const [x, y] = ipt(12, 4.1, 31), e = look * 0.45;
  g += `<path fill="#1c1c24" d="M${n2(x - 3.6)} ${n2(y + 10)}Q${n2(x - 3.4)} ${n2(y + 3.2)} ${n2(x)} ${n2(y + 3)}Q${n2(x + 3.4)} ${n2(y + 3.2)} ${n2(x + 3.6)} ${n2(y + 10)}Z"/>`;  // the black coat
  g += `<path fill="#f4f2ea" d="M${n2(x - 0.9)} ${n2(y + 3.2)}L${n2(x)} ${n2(y + 6)}L${n2(x + 0.9)} ${n2(y + 3.2)}Z"/>`;
  g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="2.3" ry="3" fill="#d8c8b0"/><path fill="#e8e4d8" d="M${n2(x - 2.4)} ${n2(y - 0.6)}Q${n2(x - 2.8)} ${n2(y - 3.6)} ${n2(x)} ${n2(y - 3.3)}Q${n2(x + 2.8)} ${n2(y - 3.6)} ${n2(x + 2.4)} ${n2(y - 0.6)}Q${n2(x + 1.6)} ${n2(y - 2.4)} ${n2(x)} ${n2(y - 2.4)}Q${n2(x - 1.6)} ${n2(y - 2.4)} ${n2(x - 2.4)} ${n2(y - 0.6)}Z"/>`;
  g += `<path fill="none" stroke="#8a7a6a" stroke-width=".3" d="M${n2(x - 1.5)} ${n2(y - 1.1)}l1 .3M${n2(x + 1.5)} ${n2(y - 1.1)}l-1 .3M${n2(x - 0.8)} ${n2(y + 1.7)}h1.6"/>`;
  for (const dx of [-0.85, 0.85]) g += `<rect x="${n2(x + dx - 0.35 + e)}" y="${n2(y - 0.5)}" width=".7" height=".6" fill="${lit ? "#ff3b3b" : "#1c1c22"}"/>` + (lit ? `<circle cx="${n2(x + dx + e)}" cy="${n2(y - 0.2)}" r="1" fill="#ff3b3b" fill-opacity=".3"/>` : "");
  return g + `<path fill="#ffffff" fill-opacity=".08" d="M${n2(x - 4)} ${n2(y - 8)}h4l-4 6z"/>` + web(23.6, 4, 49.6, 5, -1);
});
// the pillar: a dark wood column with fluting, a base and a capital, an iron sconce and its candle (on: lit)
art("isomanorpillar", 8, 8, 62, ({ on = true, frame = 0 }) => {
  let g = ishadow(8, 8) + ibox(0, 0, 8, 8, 0, 4, T3(shade(EBONY, 1.2))) + ibox(1, 1, 6, 6, 4, 46, T3(EBONY)) + ibox(0, 0, 8, 8, 50, 4, T3(shade(EBONY, 1.2))) + ibox(-0.4, -0.4, 8.8, 8.8, 54, 1.2, T3(shade(EBONY, 1.35)));
  for (const x of [2.2, 3.7, 5.2]) g += ifront(x, 7, 0.5, 6, 42, shade(EBONY, 0.7));
  for (const y of [2.2, 3.7, 5.2]) g += iside(7, y, 0.5, 6, 42, shade(EBONY, 0.55));
  g += ibox(3.4, 7, 1.2, 2.4, 28, 0.8, T3(IRON[1])) + icyl(4, 9, 28.8, 0.6, 1, IRON[2], IRON[0]);
  return g + candle(4, 9, 29.4, 3.2, frame, on) + (on ? glow(4, 9, 34, 7, "#ffcf6a", 0.12) : "");
});

/* ---------- lights ---------- */
// the candelabra: an iron foot, a tall stem, three arms, three candles running with wax (on: lit)
art("isocandelabra", 8, 8, 44, ({ on = true, frame = 0 }) => {
  let g = ishadow(8, 8, 0) + icyl(4, 4, 0, 1.2, 3, IRON[2], IRON[1]) + icyl(4, 4, 1.2, 1.2, 1.4, IRON[1], IRON[0]) + icyl(4, 4, 2.4, 24, 0.5, IRON[1], IRON[0]);
  g += icyl(4, 4, 12, 1, 1, IRON[1], IRON[0]) + iline(ipt(4, 4, 26), ipt(0.8, 4, 27.6), IRON[1], 0.7) + iline(ipt(4, 4, 26), ipt(7.2, 4, 27.6), IRON[1], 0.7);
  for (const [x, z] of [[0.8, 27.6], [4, 26.4], [7.2, 27.6]]) g += icyl(x, 4, z, 0.6, 1, IRON[2], IRON[0]) + candle(x, 4, z + 0.6, x === 4 ? 6 : 4.4, frame + x, on);
  return g;
});
// a jack-o'-lantern: a pumpkin with its ribs and stem, a carved face glowing from inside (on), flickering (frame)
art("isopumpkin", 8, 8, 14, ({ on = true, frame = 0, c = "#e8761c" }) => {
  const [x, y] = ipt(4, 4, 4.2), k = [1, 0.8, 0.95][frame % 3], f = on ? "#ffcf4a" : "#3a1a0a";
  let g = ishadow(8, 8, 0) + `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="5.4" ry="4.4" fill="${c}"/>`;
  for (const dx of [-3, 0, 3]) g += `<ellipse cx="${n2(x + dx)}" cy="${n2(y)}" rx="${dx ? 1.6 : 2}" ry="4.2" fill="${shade(c, dx ? 0.86 : 1.08)}" fill-opacity=".8"/>`;
  g += `<path fill="#4a6a2a" d="M${n2(x - 0.4)} ${n2(y - 4)}q.2 -1.6 1.4 -2.2l.4 .5q-.9 .6 -1 1.8z"/>`;
  g += `<path fill="${f}" d="M${n2(x - 3)} ${n2(y - 1.4)}l1.2 -1.6 1.2 1.6zM${n2(x + 0.6)} ${n2(y - 1.4)}l1.2 -1.6 1.2 1.6zM${n2(x - 0.4)} ${n2(y - 0.2)}h.8l-.4 -.9z`
    + `M${n2(x - 3.4)} ${n2(y + 0.8)}h6.8l-.6 1.4 -.8 -.6 -.9 .9 -.9 -.9 -.9 .9 -.9 -.9 -.9 .9 -.8 -.6z"/>`;
  return g + (on ? `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(7 * k)}" fill="#ffb03b" fill-opacity=".14"/>` : "");
});

/* ---------- seats ---------- */
// the carved chair: turned legs, a velvet seat (c); its back: a pointed crest, finials, a velvet panel
const manorSeat = ({ c = BLOOD }) => {
  let g = "";
  for (const [x, y] of [[1, 1], [10, 1], [1, 9], [10, 9]]) g += ibox(x, y, 1, 1, 0, 6, T3(EBONY));
  return g + ibox(0.6, 0.6, 10.8, 9.4, 6, 1.6, T3(EBONY)) + ibox(1.2, 1.2, 9.6, 8.2, 7.6, 1.2, T3(c)) + itop(3, 3, 6, 4, 8.82, shade(c, 1.15));
};
const manorBack = ({ c = BLOOD }) => {
  let g = ibox(1, 0, 1.2, 2, 6, 26, T3(EBONY)) + ibox(9.8, 0, 1.2, 2, 6, 26, T3(EBONY)) + ifront(2.2, 1.6, 7.6, 9, 16, shade(c, 0.95));
  g += path([[2.2, 1.6, 25], [6, 1.6, 31], [9.8, 1.6, 25], [9.8, 1.6, 26.6], [6, 1.6, 33], [2.2, 1.6, 26.6]], EBONY);
  g += path([[4.4, 1.62, 21], [6, 1.62, 23.4], [7.6, 1.62, 21], [6, 1.62, 18.6]], GOLD[1], ' fill-opacity=".7"');
  for (const x of [1.6, 10.4]) g += icyl(x, 1, 32, 1.2, 0.5, EBONY, shade(EBONY, 1.3)) + glow(x, 1, 33.6, 0.5, GOLD[1], 1);
  return g;
};
art("isocmanor", 12, 10, 12, manorSeat);
art("isocmanorback", 12, 2, 38, manorBack);
art("isocmanorfull", 12, 11, 38, o => manorBack(o) + shifted(manorSeat(o), 0, 1));
// the wingback armchair: claw feet, a deep seat, two wings and a tall rounded back, buttoned velvet (c), brass nails
const wingSeat = ({ c = "#2a3a2a" }) => {
  let g = "";
  for (const [x, y] of [[1, 6.4], [15.6, 6.4], [1, 0.4], [15.6, 0.4]]) g += ibox(x, y, 1.4, 1.4, 0, 3, T3(EBONY)) + iell(x + 0.7, y + 1.4, 0.4, 0.7, GOLD[2]);
  g += ibox(0.6, 0, 16.8, 8, 3, 6, T3(c)) + ibox(2.4, 0.2, 13.2, 7.6, 9, 2.2, T3(shade(c, 1.12)));
  for (const x of [0, 15.4]) g += ibox(x, 0, 2.6, 8, 9, 6, T3(shade(c, 0.95))) + itop(x, 0, 2.6, 8, 15.02, shade(c, 1.2));
  for (let x = 1.4; x < 17; x += 2.2) g += ifront(x, 8, 0.4, 3.6, 0.4, GOLD[1]);
  return g;
};
const wingBack = ({ c = "#2a3a2a" }) => {
  let g = ibox(1, 2, 16, 4, 6, 22, T3(c)) + path([[1, 6, 28], [3, 6, 31.4], [9, 6, 33], [15, 6, 31.4], [17, 6, 28]], c) + path([[17, 2, 28], [17, 6, 28], [15, 6, 31.4], [15, 2, 31.4]], shade(c, 0.74));
  for (const [x, z] of [[5, 16], [9, 16], [13, 16], [7, 22], [11, 22], [9, 28]]) g += glow(x, 6, z, 0.45, shade(c, 0.6), 1);
  for (const x of [0, 15]) g += ibox(x, 0, 3, 6, 6, 18, T3(shade(c, 0.92))) + path([[x, 6, 24], [x + 3, 6, 24], [x + 3, 6, 25.6], [x + 1.5, 6, 26.6], [x, 6, 25.6]], shade(c, 0.92));
  return g;
};
art("isowing", 18, 8, 16, wingSeat);
art("isowingback", 18, 6, 40, wingBack);
art("isowingfull", 18, 14, 40, o => wingBack(o) + shifted(wingSeat(o), 0, 6));

/* ---------- tables, desks ---------- */
// the séance table: a round pedestal table, a purple cloth, a talking board and its planchette that slides (frame),
// two candles; a pale spirit rises over it while a séance runs (on)
art("isoseance", 20, 20, 40, ({ c = "#3a1a4a", frame = 0, on = false }) => {
  let g = ishadow(20, 20) + icyl(10, 10, 0, 1, 4, IRON[2], IRON[1]) + icyl(10, 10, 1, 10, 1.2, EBONY, shade(EBONY, 1.2)) + icyl(10, 10, 10.4, 1.4, 9.6, shade(c, 0.8), c);
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + 0.3, [x, y] = ipt(10 + Math.cos(a) * 9.4, 10 + Math.sin(a) * 9.4, 10.6); if (Math.sin(a) + Math.cos(a) > -0.4) g += `<path fill="${shade(c, 0.7)}" d="M${n2(x - 1)} ${n2(y)}l1 2.4 1 -2.4z"/>`; }
  g += itop(5, 6.5, 10, 7, 11.85, "#c9a46a") + itop(5.5, 7, 9, 6, 11.86, "#dcc08a");
  for (let k = 0; k < 13; k++) { const x = 6 + k * 0.62; g += itop(x, 8, 0.36, 0.5, 11.87, "#3a2414") + itop(x, 9.3, 0.36, 0.5, 11.87, "#3a2414"); }
  g += itop(6, 11.4, 1.2, 0.7, 11.87, "#3a2414") + itop(12.8, 11.4, 1.2, 0.7, 11.87, "#3a2414");
  const spots = [[7, 9], [11.4, 8.6], [13, 10.6], [9.4, 11.6], [8.2, 10], [12, 9.6]], [sx, sy] = spots[frame % spots.length];
  g += path([[sx, sy - 1, 12.1], [sx + 1.6, sy + 0.6, 12.1], [sx - 0.6, sy + 1.4, 12.1]], "#f4efe2") + iell(sx + 0.3, sy + 0.4, 12.15, 0.4, "#8ab4d8");
  for (const [x, y] of [[3.6, 5.6], [16.4, 14]]) g += icyl(x, y, 11.8, 0.5, 0.9, GOLD[2], GOLD[0]) + candle(x, y, 12.3, 3, frame + x);
  if (on) { const [px, py] = ipt(10, 10, 26 + (frame % 4) * 0.6); g += `<ellipse cx="${n2(px)}" cy="${n2(py + 6)}" rx="3" ry="7" fill="#dfeaff" fill-opacity=".12"/>` + ghost(px, py, 2.4, 0.6); }
  return g;
});
// the manor desk: two dark pedestals with brass pulls, a top with an inlaid leather blotter, a candle on its stick, a
// skull, an inkwell and its quill, a cobweb under it (the dev's computer and chair are apart)
art("isodeskmanor", 40, 14, 30, ({ w = EBONY, leather = BLOOD, frame = 0 }) => {
  let g = ishadow(40, 14);
  for (const x of [0, 28]) {
    g += ibox(x, 1, 12, 13, 0, 12, T3(w));
    for (let k = 0; k < 3; k++) g += ifront(x + 1, 14, 10, 0.8 + k * 3.8, 3.2, shade(w, 1.15)) + icyl(x + 6, 14, 2.3 + k * 3.8, 0.3, 0.5, GOLD[2], GOLD[0]);
  }
  g += ibox(12, 2, 16, 1, 4, 8, T3(shade(w, 0.85))) + web(12.4, 2, 11.6, 4, 1);
  g += ibox(-0.4, -0.2, 40.8, 14.4, 12, 1.4, T3(shade(w, 1.15))) + itop(6, 3, 28, 8, 13.42, leather) + itop(6.6, 3.6, 26.8, 6.8, 13.43, shade(leather, 1.12));
  g += icyl(3.4, 4, 13.4, 0.5, 1.3, GOLD[2], GOLD[0]) + candle(3.4, 4, 13.9, 4, frame);
  const [kx, ky] = ipt(36, 4, 15.6);  // the skull
  g += `<ellipse cx="${n2(kx)}" cy="${n2(ky)}" rx="2.2" ry="2" fill="#e8e0c8"/><rect x="${n2(kx - 1.2)}" y="${n2(ky + 1.2)}" width="2.4" height="1.3" rx=".4" fill="#d8ceb4"/>`
    + `<ellipse cx="${n2(kx - 0.8)}" cy="${n2(ky + 0.1)}" rx=".6" ry=".7" fill="#1c1c22"/><ellipse cx="${n2(kx + 0.8)}" cy="${n2(ky + 0.1)}" rx=".6" ry=".7" fill="#1c1c22"/><path fill="#1c1c22" d="M${n2(kx - 0.25)} ${n2(ky + 1.1)}h.5l-.25 -.5z"/>`;
  return g + icyl(36, 10, 13.4, 1.2, 0.9, "#1c1c22", "#2a2a40") + iline(ipt(36, 10, 14.6), ipt(37.6, 8.6, 20), "#f4efe2", 0.7) + iline(ipt(36.4, 9.6, 16), ipt(37.2, 8.9, 19), "#c9c1a8", 0.35);
});
// the master's organ (the chief's desk; ChiefOS opens as a crypt there): a row of brass pipes, a carved case, two
// keyboards, stop knobs, a music stand, two candelabras on the case; notes rise while he plays (on), candles flicker
art("isochiefdeskorgan", 34, 16, 64, ({ w = EBONY, frame = 0, on = false }) => {
  let g = ishadow(34, 16);
  for (let k = 0; k < 13; k++) { const x = 2.2 + k * 2.5, h = 24 + (6 - Math.abs(k - 6)) * 3.2;
    g += icyl(x, 1.6, 20, h, 1, k % 2 ? GOLD[2] : GOLD[1], GOLD[0]) + ifront(x - 0.5, 2.6, 1, 23, 1.6, "#1c1c22"); }
  g += ibox(0, 3, 34, 6, 0, 22, T3(w)) + path([[0, 9, 22], [6, 9, 26], [28, 9, 26], [34, 9, 22]], shade(w, 1.15));
  for (const x of [2, 12, 22]) g += ifront(x, 9, 10 - 0.6, 3, 8, shade(w, 1.18)) + ifront(x + 0.6, 9, 8.2, 3.6, 6.8, shade(w, 0.95));
  g += ibox(1, 9, 32, 5, 0, 10.4, T3(shade(w, 0.9))) + ibox(0.4, 9, 33.2, 5.4, 10.4, 1.2, T3(shade(w, 1.2)));
  for (const [y, z] of [[10, 11.6], [12, 12.6]]) {
    g += ibox(5, y, 24, 2, z, 0.8, T3("#1c1c22"));
    for (let x = 5.3; x < 28.8; x += 1.1) g += itop(x, y + 0.2, 0.9, 1.6, z + 0.82, "#f4efe2");
    for (let x = 5.9; x < 28; x += 1.1) if ((Math.round((x - 5.9) / 1.1) % 7) % 3 !== 2) g += itop(x, y + 0.2, 0.5, 0.9, z + 0.84, "#1c1c22");
  }
  for (const x of [2.4, 3.6, 30.4, 31.6]) for (const z of [13, 16]) g += iell(x, 9.2, z, 0.45, ["#c0303a", "#f4efe2", "#2a5a9a", "#2f7a45"][Math.round(x + z) % 4]);
  g += ibox(13, 8.4, 8, 0.6, 14, 5, T3(shade(w, 1.1))) + ifront(13.6, 9, 6.8, 14.8, 4, "#efe2c0");
  for (let k = 0; k < 4; k++) g += iline(ipt(14, 9.02, 15.6 + k), ipt(20, 9.02, 15.6 + k), "#7a6a5a", 0.15);
  for (const x of [2.5, 31.5]) { g += icyl(x, 6, 22, 5, 0.4, IRON[1], IRON[0]); for (const dx of [-1.4, 0, 1.4]) g += candle(x + dx, 6, 27 + (dx ? 0 : 0.6), 2.6, frame + dx * 3); }
  if (on) for (let k = 0; k < 3; k++) { const [nx, ny] = ipt(10 + k * 7, 4, 42 + ((frame + k * 3) % 8) * 1.6); g += `<text x="${n2(nx)}" y="${n2(ny)}" font-size="4" fill="${GOLD[0]}" fill-opacity="${(1 - ((frame + k * 3) % 8) / 9).toFixed(2)}">${k % 2 ? "♫" : "♪"}</text>`; }
  return g;
});

/* ---------- haunted things ---------- */
// the jar of ghosts: a glass jar on a carved stand, one little ghost per blocked agent (n, up to 5) bobbing inside, a
// green glow when it is not empty, an iron lid, a label
art("isoghostjar", 8, 8, 30, ({ n = 0, frame = 0 }) => {
  let g = ishadow(8, 8) + ibox(0.8, 0.8, 6.4, 6.4, 0, 5, T3(EBONY)) + ibox(0.4, 0.4, 7.2, 7.2, 5, 0.8, T3(shade(EBONY, 1.3)));
  const [cx, cy] = ipt(4, 4, 13);
  if (n) g += `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="6" ry="8" fill="#7dffb0" fill-opacity=".14"/>`;
  g += icyl(4, 4, 5.8, 14, 3, "#cfe6ff26", "#dfeaff40");
  for (let k = 0; k < Math.min(5, n); k++) { const bob = Math.sin((frame + k * 2) * 0.8) * 1.1; g += ghost(cx + [-1.4, 1.4, 0, -1.2, 1.2][k], cy + [-3, -1.6, 0.6, 2.8, 3.6][k] + bob - 1, 0.9, 0.8); }
  g += `<path fill="#ffffff" fill-opacity=".25" d="M${n2(cx - 3.2)} ${n2(cy - 5)}q-.6 5 .2 9l-.8 .2q-.8 -4.6 0 -9.2z"/>`;
  g += icyl(4, 4, 19.8, 1.4, 3.3, IRON[1], IRON[0]) + icyl(4, 4, 21.2, 1, 1, IRON[2], IRON[0]) + ifront(2.6, 7, 2.8, 9, 2.4, "#efe2c0") + ifront(2.9, 7.01, 2.2, 9.9, 0.4, "#5a1e2a");
  return g;
});
// the grandfather clock: a tall case, a hood with a broken pediment, a painted face with the real time (h, m) and a moon
// dial, a brass pendulum that swings behind a glass door (frame)
art("isograndclock", 10, 8, 62, ({ w = "#3a2418", h = 10, m = 10, frame = 0 }) => {
  let g = ishadow(10, 8) + ibox(0, 0, 10, 8, 0, 4, T3(shade(w, 1.1))) + ibox(1, 1, 8, 6, 4, 34, T3(w)) + ibox(0, 0, 10, 8, 38, 14, T3(w));
  g += path([[0, 8, 52], [3.6, 8, 56], [3.6, 8, 54], [0, 8, 52.6]], shade(w, 1.2)) + path([[10, 8, 52], [6.4, 8, 56], [6.4, 8, 54], [10, 8, 52.6]], shade(w, 1.2)) + ibox(4.2, 3, 1.6, 2, 52, 4, T3(GOLD[1]));
  g += ifront(2.4, 7, 5.2, 8, 26, "#140c0a") + ifront(2.4, 7.01, 5.2, 8, 26, "#9fc0d8", ' fill-opacity=".12"');
  const sw = Math.sin(frame * Math.PI / 4) * 1.6, [ax, ay] = ipt(5, 7, 33), [bx, by] = ipt(5 + sw, 7, 13);
  g += `<path stroke="${GOLD[2]}" stroke-width=".5" d="M${n2(ax)} ${n2(ay)}L${n2(bx)} ${n2(by)}"/><circle cx="${n2(bx)}" cy="${n2(by)}" r="1.9" fill="${GOLD[1]}"/><circle cx="${n2(bx - 0.5)}" cy="${n2(by - 0.5)}" r=".6" fill="${GOLD[0]}"/>`;
  const [fx, fy] = ipt(5, 8, 45), R = 3.6;
  g += `<circle cx="${n2(fx)}" cy="${n2(fy)}" r="${R + 0.6}" fill="${GOLD[1]}"/><circle cx="${n2(fx)}" cy="${n2(fy)}" r="${R}" fill="#f4efe2"/>`;
  g += `<path fill="#22336a" d="M${n2(fx - 2.4)} ${n2(fy - 1.4)}A2.4 2.4 0 0 1 ${n2(fx + 2.4)} ${n2(fy - 1.4)}Z"/><circle cx="${n2(fx + 0.6)}" cy="${n2(fy - 2.6)}" r=".7" fill="#f4e7b0"/>`;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g += `<rect x="${n2(fx + Math.sin(a) * (R - 0.6) - 0.15)}" y="${n2(fy - Math.cos(a) * (R - 0.6) - 0.15)}" width=".3" height=".3" fill="#1c1c22"/>`; }
  const hand = (ang, len, wd) => { const a = (ang - 90) * Math.PI / 180; return `<path stroke="#1c1c22" stroke-width="${wd}" stroke-linecap="round" d="M${n2(fx)} ${n2(fy)}L${n2(fx + Math.cos(a) * len)} ${n2(fy + Math.sin(a) * len)}"/>`; };
  return g + hand((h % 12) * 30 + m / 2, 1.9, 0.45) + hand(m * 6, 2.9, 0.3) + `<circle cx="${n2(fx)}" cy="${n2(fy)}" r=".35" fill="${GOLD[2]}"/>`;
});
// the coffin: six-sided, dark wood, brass handles, a lid that slides aside (open) on red satin
art("isocoffin", 24, 10, 16, ({ w = EBONY, open = 0 }) => {
  const P = [[0, 3.2], [6, 0], [24, 1.8], [24, 8.2], [6, 10], [0, 6.8]], H = 7;
  let g = ishadow(24, 10) + path(P.map(([x, y]) => [x, y, 0]), shade(w, 0.6));
  for (let i = 0; i < P.length; i++) { const [a, b] = [P[i], P[(i + 1) % P.length]], nx = b[1] - a[1], ny = a[0] - b[0];
    if (nx + ny > 0) g += path([[...a, 0], [...b, 0], [...b, H], [...a, H]], shade(w, nx > ny ? 0.74 : 1)); }
  for (const x of [9, 17]) g += ifront(x, 9.6 - (x - 6) * 0.1, 2.4, 3, 0.6, GOLD[1]);
  const Pi = P.map(([x, y]) => [x + (12 - x) * 0.08, y + (5 - y) * 0.16]);
  g += path(Pi.map(([x, y]) => [x, y, H - 0.1]), BLOOD) + path(Pi.map(([x, y]) => [x + (12 - x) * 0.1, y + (5 - y) * 0.2, H - 0.05]), shade(BLOOD, 1.3));
  const o = Math.max(0, Math.min(1, open)), dx = o * 5, dy = o * 6.5, dz = o * 0.6;
  g += path(P.map(([x, y]) => [x + dx, y + dy, H + dz]), shade(w, 1.25)) + path(P.map(([x, y]) => [x + dx, y + dy, H + dz + 0.01]).map(([x, y, z]) => [x + (12 + dx - x) * 0.2, y + (5 + dy - y) * 0.35, z]), shade(w, 1.4));
  return g + iline(ipt(1.5 + dx, 5 + dy, H + dz), ipt(22.6 + dx, 5 + dy, H + dz), GOLD[1], 0.3);
});
// the bats' beam: two posts, a beam; bats hang under it asleep, or fly around it in a flurry (fly), wings beating
art("isobatroost", 16, 6, 54, ({ w = "#3a2418", fly = false, frame = 0 }) => {
  let g = ishadow(16, 6) + ibox(0, 2, 2, 2, 0, 36, T3(w)) + ibox(14, 2, 2, 2, 0, 36, T3(w)) + ibox(-1, 1.8, 18, 2.4, 36, 2.4, T3(shade(w, 1.1)));
  g += path([[0, 4, 30], [0, 4, 36], [4, 4, 36]], shade(w, 0.85)) + path([[16, 4, 30], [16, 4, 36], [12, 4, 36]], shade(w, 0.85));
  const xs = [3.2, 5.6, 8, 10.4, 12.8];
  if (!fly) return g + xs.map((x, k) => { const [px, py] = ipt(x, 3, 35.8), s = k % 2 ? 0.9 : 1.05;
    return `<path fill="#1c1420" d="M${n2(px - 0.9 * s)} ${n2(py)}h${n2(1.8 * s)}q.2 2.6 -.9 ${n2(4 * s)}q-1.1 -1.4 -.9 -${n2(4 * s)}z"/><path fill="#1c1420" d="M${n2(px - 0.5)} ${n2(py + 4 * s)}l.2 .7.3 -.4.3 .4.2 -.7z"/>`; }).join("");
  return g + xs.map((x, k) => { const a = (frame + k * 2.3) * 0.7, [px, py] = ipt(8 + Math.cos(a) * 9, 3 + Math.sin(a) * 6, 42 + Math.sin(a * 1.7 + k) * 6); return bat(px, py, 1.1, (frame + k) % 2 === 0); }).join("");
});
// the raven on its bust: a marble column, a pale bust, a black raven perched on its head who tilts his head and opens
// his beak when he speaks (talk)
art("isoraven", 8, 8, 40, ({ frame = 0, talk = false }) => {
  const M = ["#f4f0e8", "#d9d4c8", "#b8b2a4"];
  let g = ishadow(8, 8) + ibox(0.6, 0.6, 6.8, 6.8, 0, 2, M) + ibox(1.6, 1.6, 4.8, 4.8, 2, 14, M) + ibox(0.8, 0.8, 6.4, 6.4, 16, 1.4, M);
  for (const x of [2.6, 3.8, 5]) g += ifront(x, 6.4, 0.4, 3, 12, "#c9c3b5");
  const [x, y] = ipt(4, 4, 21);
  g += `<path fill="${M[1]}" d="M${n2(x - 4.4)} ${n2(y + 3.6)}Q${n2(x - 4)} ${n2(y)} ${n2(x)} ${n2(y - 0.4)}Q${n2(x + 4)} ${n2(y)} ${n2(x + 4.4)} ${n2(y + 3.6)}Z"/>`;
  g += `<ellipse cx="${n2(x)}" cy="${n2(y - 3.6)}" rx="2.4" ry="3" fill="${M[0]}"/><path fill="${M[1]}" d="M${n2(x - 2.4)} ${n2(y - 4)}q.4 -2.6 2.4 -2.8q2 .2 2.4 2.8q-1 -1.4 -2.4 -1.4q-1.4 0 -2.4 1.4z"/>`;
  const tilt = [0, 0, 0.6, 0, -0.5, 0][frame % 6], [rx, ry] = [x + 0.4, y - 8];
  g += `<path fill="#14141c" d="M${n2(rx - 3.4)} ${n2(ry + 2.4)}Q${n2(rx - 2.4)} ${n2(ry - 0.4)} ${n2(rx + 0.4)} ${n2(ry - 0.6)}Q${n2(rx + 2.2)} ${n2(ry + 0.4)} ${n2(rx + 1.4)} ${n2(ry + 2.4)}Z"/>`;  // the body, the tail
  g += `<path fill="#1c1c2a" d="M${n2(rx - 2.6)} ${n2(ry + 1.4)}q1.6 -1.2 3.4 -.6l-.4 1.4z"/>`;
  const hx = rx + 1.4, hy = ry - 1.6 + tilt;
  g += `<circle cx="${n2(hx)}" cy="${n2(hy)}" r="1.4" fill="#14141c"/><circle cx="${n2(hx + 0.4)}" cy="${n2(hy - 0.3)}" r=".3" fill="#e8c23a"/>`;
  g += talk ? `<path fill="#3a3a44" d="M${n2(hx + 1.2)} ${n2(hy - 0.4)}l2 -.5 -1.9 .9 1.9 .8 -2 -.3z"/>` : `<path fill="#3a3a44" d="M${n2(hx + 1.2)} ${n2(hy - 0.4)}l2 .3 -2 .5z"/>`;
  for (const dx of [-0.6, 0.4]) g += `<rect x="${n2(rx + dx)}" y="${n2(ry + 2.3)}" width=".25" height="1" fill="#3a3a44"/>`;
  return g;
});
// the carnivorous plant: a black pot, stems, three traps with teeth that snap shut and open (frame); thirsty: brown
art("isocarnivore", 10, 10, 26, ({ frame = 0, dry = false }) => {
  const leaf = dry ? "#8a6a3a" : "#4a8a3a", jaw = dry ? "#a07a4a" : "#c0303a";
  let g = ishadow(10, 10) + icyl(5, 5, 0, 7, 3.4, "#2a2a30", "#3a3a44") + iell(5, 5, 7, 3, "#3a2a1a");
  const traps = [[2, 3, 14, -1], [5, 6, 19, 1], [8, 4, 12, 1]];
  traps.forEach(([tx, ty, tz, dir], k) => {
    g += iline(ipt(5, 5, 7), ipt(tx, ty, tz), leaf, 0.6);
    const [px, py] = ipt(tx, ty, tz), o = [0.4, 1, 1.5, 1][(frame + k) % 4] * 1.6;
    g += `<path fill="${leaf}" d="M${n2(px - 2.4 * dir)} ${n2(py)}Q${n2(px)} ${n2(py - o - 2)} ${n2(px + 2.4 * dir)} ${n2(py - o)}Z"/><path fill="${jaw}" d="M${n2(px - 2 * dir)} ${n2(py - 0.1)}Q${n2(px)} ${n2(py - o - 1.2)} ${n2(px + 2 * dir)} ${n2(py - o + 0.1)}Z"/>`;
    g += `<path fill="${leaf}" d="M${n2(px - 2.4 * dir)} ${n2(py)}Q${n2(px)} ${n2(py + 2)} ${n2(px + 2.4 * dir)} ${n2(py)}Z"/>`;
    for (let t = 0; t < 4; t++) { const u = -1.8 + t * 1.2; g += `<path fill="#f4efe2" d="M${n2(px + u * dir)} ${n2(py)}l.2 -.8.2 .8z"/>`; }
  });
  for (const [x, y] of [[3, 7], [7, 7.6]]) { const [px, py] = ipt(x, y, 8); g += `<path fill="${leaf}" d="M${n2(px)} ${n2(py)}q-2 -1 -3 -3q2.4 .4 3 3z"/>`; }
  return g;
});
