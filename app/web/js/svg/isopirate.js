// The pirate ship theme (items/pirate.js): hull walls to compose (tarred planks and a rope rail, a gunport whose lid
// swings up and a cannon pokes out, a porthole on the sea, a mast with its lantern), a ship's lantern, a barrel stool
// and the captain's chair, the chart table (an island per ticket at sea), the purser's desk, the captain's wheel (the
// chief's desk), a treasure chest that fills with the day's loot, the ship's bell, a parrot on its perch, a cannon, a
// message in a bottle, a spyglass, the kraken's barrel, a rum barrel, a palm in a half-barrel. Drawn like the rest
// (svg/iso.js).

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const T3 = c => [shade(c, 1.2), c, shade(c, 0.74)];
const IRON = ["#4a4a54", "#2e2e36", "#1c1c22"], BRASS = ["#f2d27a", "#c9a040", "#8a6a28"], TAR = "#1c1410", ROPE = "#c9a46a", OAK = "#7a5232", SEA = "#1f6a8a";
const path = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const shifted = (g, dx, dy) => { const [x, y] = ipt(dx, dy, 0); return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`; };
const glow = (x, y, z, r, c, a = 0.25) => { const [px, py] = ipt(x, y, z); return `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(r)}" fill="${c}" fill-opacity="${a.toFixed(2)}"/>`; };
const h01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
// a circle standing in the plane y (toward the room), centre (x, z): its points, to fill or to clamp
const ring = (x, y, z, r, n = 28) => Array.from({ length: n }, (_, k) => { const a = k * Math.PI * 2 / n; return [x + Math.cos(a) * r, y, z + Math.sin(a) * r]; });
// the same in the plane x (a cannon's muzzle, a barrel lying along x)
const ringX = (x, y, z, r, n = 20) => Array.from({ length: n }, (_, k) => { const a = k * Math.PI * 2 / n; return [x, y + Math.cos(a) * r, z + Math.sin(a) * r]; });
// a flame that flickers with frame, its halo
const flame = (x, y, z, s = 1, frame = 0) => {
  const f = Math.abs(Math.round(frame)) % 3, [px, py] = ipt(x, y, z), k = [1, 1.15, 0.9][f] * s, sway = [0, 0.4, -0.3][f] * s;
  return `<circle cx="${n2(px)}" cy="${n2(py - 1.4 * k)}" r="${n2(3.6 * s)}" fill="#ffcf6a" fill-opacity=".22"/>`
    + `<path fill="#ff9a3b" d="M${n2(px - 0.9 * s)} ${n2(py)}Q${n2(px + sway)} ${n2(py - 3.4 * k)} ${n2(px + 0.9 * s)} ${n2(py)}Q${n2(px)} ${n2(py + 0.7 * s)} ${n2(px - 0.9 * s)} ${n2(py)}Z"/>`
    + `<path fill="#fff3b0" d="M${n2(px - 0.4 * s)} ${n2(py - 0.2)}Q${n2(px + sway * 0.5)} ${n2(py - 2 * k)} ${n2(px + 0.4 * s)} ${n2(py - 0.2)}Z"/>`;
};
// a ship's lantern: a brass base, four glass panes around a flame (on: lit), a pointed cap and its ring
const lantern = (x, y, z, frame = 0, on = true, s = 1) => {
  const a = 1.3 * s, h = 4 * s;
  let g = ibox(x - a - 0.2, y - a - 0.2, 2 * a + 0.4, 2 * a + 0.4, z, 0.7 * s, T3(BRASS[1]));
  g += ibox(x - a, y - a, 2 * a, 2 * a, z + 0.7 * s, h, on ? ["#fff0b8cc", "#ffd27acc", "#e8a840cc"] : ["#4a4a52aa", "#2e2e36aa", "#1c1c22aa"]);
  if (on) g += flame(x, y, z + 1.4 * s, 0.75 * s, frame) + glow(x, y, z + 3 * s, 6 * s, "#ffcf6a", 0.14);
  for (const dx of [-a, a]) g += ifront(x + dx - 0.15 * s, y + a, 0.3 * s, z + 0.7 * s, h, BRASS[2]);
  g += iside(x + a, y - 0.15 * s, 0.3 * s, z + 0.7 * s, h, BRASS[2]);
  const zt = z + 0.7 * s + h;
  g += ibox(x - a - 0.2, y - a - 0.2, 2 * a + 0.4, 2 * a + 0.4, zt, 0.6 * s, T3(BRASS[1]));
  g += path([[x - a, y + a, zt + 0.6 * s], [x + a, y + a, zt + 0.6 * s], [x, y, zt + 2.6 * s]], BRASS[1]) + path([[x + a, y + a, zt + 0.6 * s], [x + a, y - a, zt + 0.6 * s], [x, y, zt + 2.6 * s]], BRASS[2]);
  const [rx, ry] = ipt(x, y, zt + 3.4 * s);
  return g + `<circle cx="${n2(rx)}" cy="${n2(ry)}" r="${n2(0.8 * s)}" fill="none" stroke="${BRASS[1]}" stroke-width="${n2(0.3 * s)}"/>`;
};
// an iron hoop around a cylinder (its front half only: no lid over it)
const band = (cx, cy, z, h, r, c) => { const [x, y0] = ipt(cx, cy, z), rx = n2(r * 0.6 * 1.414), ry = n2(r * 0.6 * 0.707);
  return `<path fill="${c}" d="M${n2(x - rx)} ${n2(y0 - h)}A${rx} ${ry} 0 0 0 ${n2(x + rx)} ${n2(y0 - h)}V${n2(y0)}A${rx} ${ry} 0 0 1 ${n2(x - rx)} ${n2(y0)}Z"/>`; };
// a barrel standing up: staves (c), three iron hoops, its lid
const barrel = (x, y, z, h, r, c = OAK) => {
  let g = icyl(x, y, z, h * 0.5, r, c, shade(c, 1.2)) + icyl(x, y, z + h * 0.5, h * 0.5, r, shade(c, 1.05), shade(c, 1.2));
  for (const k of [0.12, 0.5, 0.88]) g += band(x, y, z + h * k - 0.4, 0.8, r + 0.08, IRON[1]);
  const [cx, cy] = ipt(x, y, z);
  for (let s = -2; s <= 2; s++) g += `<path stroke="${shade(c, 0.7)}" stroke-width=".2" d="M${n2(cx + s * r * 0.45)} ${n2(cy - 0.6)}V${n2(cy - h + 0.6)}"/>`;
  return g + iell(x, y, z + h, r * 0.86, shade(c, 1.25)) + iell(x, y, z + h + 0.01, r * 0.6, shade(c, 1.1), ' fill-opacity=".6"');
};
// a cylinder lying along x (a cannon, a rum barrel): slices from x0 to x1, its round end at x1
const lying = (x0, x1, y, z, r0, r1, c, end = shade(c, 1.15)) => {
  let g = "";
  for (let x = x0; x <= x1; x += 0.5) g += path(ringX(x, y, z, r0 + (r1 - r0) * (x - x0) / Math.max(0.01, x1 - x0)), c);
  return g + path(ringX(x1, y, z, r1), end);
};
// a rope coil hanging on a peg (screen units)
const coil = (x, y, s = 1) => `<g fill="none" stroke="${ROPE}" stroke-width="${n2(0.55 * s)}">` + [0, 0.5, 1].map(k => `<ellipse cx="${n2(x)}" cy="${n2(y + 2.6 * s + k * 0.5)}" rx="${n2(2 * s - k * 0.2)}" ry="${n2(2.8 * s)}"/>`).join("")
  + `</g><path stroke="${ROPE}" stroke-width="${n2(0.5 * s)}" d="M${n2(x + 0.6)} ${n2(y + 5.4 * s)}q.4 1.6 -.4 2.6"/>`;

/* ---------- walls to compose ---------- */
// the planks of a hull: rows of tarred boards (c), staggered butt joints, treenails, a wale at mid height; a gunwale on top
function hullFace(w, d, c) {
  let g = "";
  for (let z = 0, r = 0; z < 50; z += 4.2, r++) {
    const hz = Math.min(4.2, 50 - z);
    g += ifront(0, d, w, z, hz, shade(c, 0.88 + h01(r, 3) * 0.22)) + ifront(0, d, w, z + hz - 0.3, 0.3, TAR) + ifront(0, d, w, z + hz - 0.9, 0.4, "#ffffff", ' fill-opacity=".05"');
    for (let x = ((r * 7) % 11) + 1; x < w - 1; x += 11) g += ifront(x, d, 0.25, z, hz, TAR) + glow(x - 0.8, d, z + 1.2, 0.3, TAR, 0.7) + glow(x + 0.9, d, z + 2.8, 0.3, TAR, 0.7);
  }
  for (let y = 0; y < d; y += 4.2) g += iside(w, y, Math.min(4.2, d - y), 0, 50, shade(c, 0.7));
  g += ibox(0, d - 0.1, w, 0.8, 17, 2.4, T3(shade(c, 0.8)));  // the wale
  return g + ibox(-0.2, -0.3, w + 0.4, d + 0.6, 50, 2.4, T3(shade(c, 1.25))) + ibox(-0.2, -0.3, w + 0.4, d + 0.6, 52.4, 0.6, T3(shade(c, 0.6)));
}
// a rope rail along a wall: a line of twisted rope between two iron eyes
const ropeRail = (x0, x1, y, z) => {
  let g = iline(ipt(x0, y, z), ipt(x1, y, z), shade(ROPE, 0.75), 1.1) + iline(ipt(x0, y, z + 0.1), ipt(x1, y, z + 0.1), ROPE, 0.7);
  for (let x = x0 + 0.6; x < x1; x += 1.2) g += iline(ipt(x, y, z - 0.4), ipt(x + 0.5, y, z + 0.4), shade(ROPE, 0.6), 0.2);
  for (const x of [x0, x1]) g += glow(x, y, z, 0.9, IRON[1], 1);
  return g;
};
art("isoshiphull", 24, 4, 60, ({ c = OAK }) => {
  const [px, py] = ipt(19, 4.2, 34);
  return ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.7))) + hullFace(24, 4, c) + ropeRail(1.5, 22.5, 4.3, 38) + ibox(18.4, 4, 1.2, 1.2, 33, 1.2, T3(IRON[1])) + coil(px, py, 1.1);
});
// the gunport: a square hole in the planks, its lid hinged at the top that swings up (open 0..1), red inside as on a
// man-of-war; the cannon's muzzle comes out once it is open; fire: the flash and the smoke
art("isoshipgun", 24, 4, 60, ({ c = OAK, open = 0, fire = false, frame = 0 }) => {
  const o = Math.max(0, Math.min(1, open));
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.7))) + hullFace(24, 4, c) + ropeRail(1.5, 22.5, 4.3, 38);
  g += ifront(6.4, 4.05, 11.2, 9.4, 13.2, shade(c, 0.55)) + ifront(7, 4.06, 10, 10, 12, "#0a0806") + ifront(7, 4.07, 10, 10, 1, "#8f1f2a") + ifront(7, 4.07, 1, 10, 12, "#8f1f2a");
  if (o > 0.4) {  // the cannon: its barrel out of the hole, the muzzle ring, the bore
    const out = (o - 0.4) / 0.6 * 4, P = ring(12, 4.2 + out, 15.6, 2.2, 18), M = ring(12, 4.25 + out, 15.6, 1.1, 14);
    g += ibox(10, 2, 4, 2.4 + out, 13.6, 4, T3(IRON[1])) + path(P, IRON[0]) + path(M, "#0a0a0c");
    if (fire) {
      const f = frame % 6, [mx, my] = ipt(12, 6 + out + f * 1.4, 15.6);
      if (f < 2) g += `<circle cx="${n2(mx)}" cy="${n2(my)}" r="${3 + f * 2}" fill="#ffcf4a" fill-opacity=".8"/><circle cx="${n2(mx)}" cy="${n2(my)}" r="${1.6 + f}" fill="#fff6c8"/>`;
      for (let k = 0; k < 4; k++) { const [sx, sy] = ipt(12 + (k - 1.5) * 1.6, 7 + out + f * 1.6 + k, 17 + k * 1.4 + f * 0.6); g += `<circle cx="${n2(sx)}" cy="${n2(sy)}" r="${n2(2 + f * 0.7 + k * 0.4)}" fill="#e8e4dc" fill-opacity="${(0.75 - f * 0.1).toFixed(2)}"/>`; }
    }
  }
  const a = o * 1.15, L = 12.4, P = (x, u) => [x, 4.1 + Math.sin(a) * u, 22.4 - Math.cos(a) * u];  // the lid, hinged at the top edge
  g += path([P(6.6, 0), P(17.4, 0), P(17.4, L), P(6.6, L)], o > 0.05 ? "#8f1f2a" : shade(c, 0.95));
  if (o <= 0.05) for (const z of [12.6, 16.6, 20.6]) g += ifront(6.6, 4.12, 10.8, z, 0.25, TAR);
  else g += path([P(6.6, L - 0.01), P(17.4, L - 0.01), P(17.4, L), P(6.6, L)], shade(c, 0.6));
  for (const x of [8, 16]) g += path([P(x - 0.4, 0), P(x + 0.4, 0), P(x + 0.4, 5), P(x - 0.4, 5)], IRON[1]);
  return g;
}, { mx: 8 });
// the porthole on the sea: a brass ring with its bolts, the sky over the horizon, waves that roll (frame), a sail far away
art("isoshipport", 24, 4, 60, ({ c = OAK, frame = 0, night = false }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.7))) + hullFace(24, 4, c) + ropeRail(1.5, 22.5, 4.3, 42);
  const Z = 29, R = 6.4, r = 5, hz = Z - 0.6;
  g += path(ring(12, 4.1, Z, R), BRASS[2]) + path(ring(12, 4.11, Z, R - 0.4), BRASS[1]);
  const inner = ring(12, 4.12, Z, r, 32);
  g += path(inner.map(([x, y, z]) => [x, y, Math.max(z, hz)]), night ? "#12204a" : "#8fd0ff") + path(inner.map(([x, y, z]) => [x, y + 0.001, Math.min(z, hz)]), night ? "#0e2a44" : SEA);
  if (night) { for (const [x, z] of [[9.6, 32.6], [13.4, 33.4], [15, 31.4]]) g += glow(x, 4.13, z, 0.3, "#f4efe2", 1); g += glow(14.2, 4.13, 32.2, 1, "#f4ecc8", 1); }
  else g += glow(9.4, 4.13, 32.4, 1.1, "#ffe9a0", 1);
  for (let k = 0; k < 4; k++) {  // the waves: short white strokes drifting, kept inside the glass
    const z = hz - 1 - k * 1.1, half = Math.sqrt(Math.max(0, r * r - (z - Z) ** 2)) - 0.6, x = 12 - half + ((frame * 0.7 + k * 2.3) % (2 * half - 1.4));
    if (half > 1) g += iline(ipt(x, 4.14, z), ipt(x + 1.4, 4.14, z), "#e8f6ff", 0.25);
  }
  const sx = 12 - 3 + (frame % 24) * 0.25;  // a far sail
  g += path([[sx, 4.14, hz], [sx, 4.14, hz + 2.2], [sx + 1.1, 4.14, hz]], night ? "#2a3a5a" : "#f4f2ea") + ifront(sx - 0.6, 4.14, 1.8, hz - 0.3, 0.4, night ? "#1a2a3a" : "#5a3a24");
  g += path([[9.8, 4.15, 32.8], [11.4, 4.15, 32.8], [9.8, 4.15, 30.2]], "#ffffff", ' fill-opacity=".25"');
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g += glow(12 + Math.cos(a) * (R - 0.2), 4.15, Z + Math.sin(a) * (R - 0.2), 0.35, BRASS[0], 1); }
  return g;
});
// the mast: a round spar, rope lashings, a bracket and its lantern (on: lit), a belaying rack with its pins
art("isomastpillar", 8, 8, 64, ({ on = true, frame = 0 }) => {
  let g = ishadow(8, 8) + ibox(0.4, 0.4, 7.2, 7.2, 0, 3, T3(shade(OAK, 0.8))) + icyl(4, 4, 3, 55, 2.6, OAK, shade(OAK, 1.2));
  for (const z of [14, 30, 46, 54]) g += icyl(4, 4, z, 1.4, 2.75, shade(ROPE, 0.85), ROPE);
  g += ibox(1, 6.4, 6, 0.8, 20, 1.2, T3(shade(OAK, 0.85)));
  for (const x of [1.8, 3.4, 5, 6.6]) g += icyl(x, 7, 19, 3.6, 0.3, shade(OAK, 1.2), shade(OAK, 1.4));
  g += ibox(3.4, 6, 1.2, 4, 36, 0.8, T3(IRON[1])) + iline(ipt(4, 9.6, 36), ipt(4, 9.6, 34), IRON[1], 0.4);
  return g + lantern(4, 9.6, 27.4, frame, on, 1);
}, { mx: 2 });

/* ---------- lights ---------- */
// the ship's lantern: a big one, on a keg (on: lit)
art("isoshiplantern", 10, 10, 32, ({ on = true, frame = 0 }) => ishadow(10, 10) + barrel(5, 5, 0, 9, 3.6) + lantern(5, 5, 9, frame, on, 1.7));

/* ---------- seats ---------- */
// the barrel stool: a short keg, a coil of rope on top for a cushion
art("isobarrelstool", 10, 10, 14, ({ c = OAK }) => {
  let g = ishadow(10, 10) + barrel(5, 5, 0, 9, 3.6, c);
  for (const r of [3, 2.2, 1.4]) g += iell(5, 5, 9.1, r, "none", ` stroke="${ROPE}" stroke-width=".55"`);
  return g;
});
// the captain's chair: a carved oak armchair, a red leather seat (c), lion-paw feet, a tall back with a skull on its
// crest and two finials
const captSeat = ({ c = "#8f1f2a" }) => {
  let g = "";
  for (const [x, y] of [[1, 1], [12.4, 1], [1, 8.6], [12.4, 8.6]]) g += ibox(x, y, 1.4, 1.4, 0, 6, T3(OAK)) + iell(x + 0.7, y + 1.4, 0.4, 0.8, shade(OAK, 0.8));
  g += ibox(0.4, 0.4, 14.2, 10, 6, 1.6, T3(OAK)) + ibox(1.2, 1.2, 12.6, 8.6, 7.6, 1.6, T3(c));
  for (let x = 1.8; x < 14; x += 1.6) g += glow(x, 9.8, 8.4, 0.25, BRASS[1], 1);
  for (const x of [0, 13.2]) g += ibox(x, 1, 1.8, 9, 9.2, 5, T3(shade(OAK, 0.9))) + ibox(x - 0.2, 1, 2.2, 9.6, 14.2, 1, T3(shade(OAK, 1.2)));
  return g;
};
const captBack = ({ c = "#8f1f2a" }) => {
  let g = ibox(0.6, 0, 1.6, 2, 6, 26, T3(OAK)) + ibox(12.8, 0, 1.6, 2, 6, 26, T3(OAK)) + ibox(2.2, 0.6, 10.6, 1.2, 9, 18, T3(c));
  for (const [x, z] of [[4.4, 12], [7.5, 12], [10.6, 12], [4.4, 18], [7.5, 18], [10.6, 18], [6, 24], [9, 24]]) g += glow(x, 1.82, z, 0.35, shade(c, 0.6), 1);
  g += path([[2.2, 1.6, 27], [7.5, 1.6, 31], [12.8, 1.6, 27], [12.8, 1.6, 28.8], [7.5, 1.6, 33.4], [2.2, 1.6, 28.8]], OAK);
  const [kx, ky] = ipt(7.5, 1.7, 31.2);  // the skull and crossbones on the crest
  g += `<path stroke="#e8e0c8" stroke-width=".6" stroke-linecap="round" d="M${n2(kx - 2)} ${n2(ky + 0.6)}l4 2.4M${n2(kx + 2)} ${n2(ky + 0.6)}l-4 2.4"/>`
    + `<ellipse cx="${n2(kx)}" cy="${n2(ky)}" rx="1.5" ry="1.4" fill="#e8e0c8"/><rect x="${n2(kx - 0.8)}" y="${n2(ky + 0.8)}" width="1.6" height=".9" fill="#d8ceb4"/>`
    + `<circle cx="${n2(kx - 0.55)}" cy="${n2(ky)}" r=".4" fill="#1c1c22"/><circle cx="${n2(kx + 0.55)}" cy="${n2(ky)}" r=".4" fill="#1c1c22"/>`;
  for (const x of [1.4, 13.6]) g += icyl(x, 1, 32, 1.4, 0.6, OAK, shade(OAK, 1.3)) + glow(x, 1, 33.8, 0.6, BRASS[1], 1);
  return g;
};
art("isocapt", 15, 11, 16, captSeat);
art("isocaptback", 15, 2, 40, captBack);
art("isocaptfull", 15, 12, 40, o => captBack(o) + shifted(captSeat(o), 0, 1));

/* ---------- tables, desks ---------- */
// a sea chart on a plane z: parchment, blue sea, n islands (palms and a red X on the first), a dotted route, a compass rose
function seaChart(x, y, w, d, z, n = 3, frame = 0) {
  let g = itop(x, y, w, d, z, "#d9c08a") + itop(x + 0.6, y + 0.6, w - 1.2, d - 1.2, z + 0.01, "#8fb8c8") + itop(x + 0.6, y + 0.6, w - 1.2, d - 1.2, z + 0.02, "#e8d4a0", ' fill-opacity=".35"');
  const isles = Array.from({ length: Math.min(6, n) }, (_, k) => [x + 2.4 + h01(k, 1) * (w - 5), y + 2 + h01(k, 2) * (d - 4), 0.9 + h01(k, 3) * 0.9]);
  for (let k = 1; k < isles.length; k++) {  // the route, dot by dot
    const [ax, ay] = isles[k - 1], [bx, by] = isles[k];
    for (let t = 0.15; t < 0.9; t += 0.18) g += iell(ax + (bx - ax) * t, ay + (by - ay) * t, z + 0.03, 0.15, "#5a1e1e");
  }
  isles.forEach(([ix, iy, r], k) => {
    g += iell(ix, iy, z + 0.04, r + 0.35, "#e8d4a0") + iell(ix, iy, z + 0.05, r, "#7aa64a");
    if (k === 0) { const [px, py] = ipt(ix, iy, z + 0.06); g += `<path stroke="#c0303a" stroke-width=".45" d="M${n2(px - 0.8)} ${n2(py - 0.5)}l1.6 1M${n2(px + 0.8)} ${n2(py - 0.5)}l-1.6 1"/>`; }
    else g += iline(ipt(ix, iy, z + 0.06), ipt(ix, iy, z + 1.4), "#5a3a24", 0.25) + iell(ix, iy, z + 1.4, 0.6, "#3f8a3a");
  });
  const [cx, cy] = ipt(x + w - 2.2, y + d - 2.2, z + 0.06);
  g += `<path fill="#5a1e1e" d="M${n2(cx)} ${n2(cy - 1.4)}l.3 1.1 1.4 .3 -1.4 .3 -.3 1.1 -.3 -1.1 -1.4 -.3 1.4 -.3z"/>`;
  if (isles.length) {  // the little ship sailing from island to island
    const seg = Math.max(1, isles.length - 1), t = (frame % (seg * 8)) / 8, i = Math.min(seg - 1, Math.floor(t)), f = t - i;
    const [ax, ay] = isles[i], [bx, by] = isles[Math.min(isles.length - 1, i + 1)], sx = ax + (bx - ax) * f, sy = ay + (by - ay) * f;
    g += ibox(sx - 0.6, sy - 0.3, 1.2, 0.6, z + 0.05, 0.4, T3("#5a3a24")) + path([[sx, sy, z + 0.45], [sx, sy, z + 1.8], [sx + 0.8, sy, z + 0.6]], "#f4f2ea");
  }
  return g;
}
// the chart table: a heavy oak table, turned legs, the chart with an island per ticket at sea (n), the ship that sails
// them, brass dividers, a candle in a hurricane glass
art("isomaptable", 24, 16, 30, ({ w = OAK, n = 3, frame = 0 }) => {
  let g = ishadow(24, 16);
  for (const [x, y] of [[1, 1], [21, 1], [1, 13], [21, 13]]) g += icyl(x + 1, y + 1, 0, 11, 0.9, shade(w, 0.9), w) + icyl(x + 1, y + 1, 4, 1.2, 1.3, shade(w, 1.1), w);
  g += ibox(0.6, 0.6, 22.8, 14.8, 9.4, 1.8, T3(shade(w, 0.85))) + ibox(0, 0, 24, 16, 11.2, 1, T3(shade(w, 1.15)));
  g += seaChart(2, 2, 20, 12, 12.21, n, frame);
  const [dx, dy] = ipt(19, 4, 12.3);
  g += `<path fill="none" stroke="${BRASS[1]}" stroke-width=".35" d="M${n2(dx)} ${n2(dy - 0.4)}l-1.8 2.6M${n2(dx)} ${n2(dy - 0.4)}l1.2 2.8"/><circle cx="${n2(dx)}" cy="${n2(dy - 0.5)}" r=".4" fill="${BRASS[0]}"/>`;
  g += icyl(3.4, 12.6, 12.2, 0.6, 1, BRASS[2], BRASS[0]) + flame(3.4, 12.6, 14.4, 0.6, frame) + icyl(3.4, 12.6, 12.8, 4, 1.1, "#dfeaf233", "#ffffff22");
  return g;
});
// the purser's desk: planks on two barrels, a ledger open, piles of doubloons, a quill and its inkwell, a lantern (the
// dev's computer and chair are apart)
art("isodeskpirate", 40, 14, 30, ({ w = OAK, frame = 0 }) => {
  let g = ishadow(40, 14) + barrel(6, 7.4, 0, 12, 5, w) + barrel(34, 7.4, 0, 12, 5, w);
  g += ibox(-0.4, 0, 40.8, 14, 12, 1.4, T3(shade(w, 1.1)));
  for (let x = 4.6; x < 40; x += 4.8) g += itop(x, 0, 0.2, 14, 13.41, TAR);
  for (const x of [0.6, 39]) for (const y of [2, 12]) g += iell(x, y, 13.42, 0.2, IRON[1]);
  g += itop(13, 3.4, 6.4, 7, 13.45, "#efe2c0") + itop(19.6, 3.4, 6.4, 7, 13.45, "#e8dab4") + itop(19.4, 3.4, 0.4, 7, 13.46, "#8a6a4a");
  for (let k = 0; k < 5; k++) g += itop(14, 4.6 + k * 1.2, 4.4, 0.18, 13.47, "#8a7a6a") + itop(20.6, 4.6 + k * 1.2, 4.4, 0.18, 13.47, "#8a7a6a");
  for (const [x, y, n] of [[29, 4, 4], [31, 7, 6], [28.4, 9, 2]]) for (let k = 0; k < n; k++) g += icyl(x, y, 13.4 + k * 0.45, 0.45, 1, BRASS[2], BRASS[0]);
  g += icyl(9, 4, 13.4, 1.2, 0.9, "#1c1c22", "#2a2a40") + iline(ipt(9, 4, 14.6), ipt(10.6, 2.6, 20), "#f4efe2", 0.7) + iline(ipt(9.4, 3.6, 16), ipt(10.2, 2.9, 19), "#c9c1a8", 0.35);
  return g + lantern(4, 10, 13.4, frame, true, 1);
});
// the captain's wheel (the chief's desk; ChiefOS opens as a galleon there): a big spoked wheel on its post (turned by
// spin), the binnacle and its compass, a chart desk in front; on: he steers, the wheel turns
art("isochiefdeskwheel", 34, 16, 62, ({ w = OAK, spin = 0, frame = 0 }) => {
  let g = ishadow(34, 16);
  g += ibox(14, 2, 6, 3, 0, 22, T3(shade(w, 0.85))) + ibox(13.4, 1.4, 7.2, 4.2, 0, 2, T3(shade(w, 1.1)));
  const C = [17, 6.2, 32], R = 12, rim = ring(C[0], C[1], C[2], R, 40), rim2 = ring(C[0], C[1] + 0.01, C[2], R - 1.2, 40);
  for (let k = 0; k < 8; k++) {  // the spokes and their handles, turned by spin
    const a = spin + k * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    g += iline(ipt(C[0], C[1], C[2]), ipt(C[0] + ca * (R + 3.4), C[1], C[2] + sa * (R + 3.4)), shade(w, 0.85), 1.3) + iline(ipt(C[0] + ca * R, C[1], C[2] + sa * R), ipt(C[0] + ca * (R + 3.4), C[1], C[2] + sa * (R + 3.4)), shade(w, 1.25), 0.9);
  }
  const pts = P => P.map(p => ipt(...p)).map(([x, y]) => `${n2(x)} ${n2(y)}`).join("L");
  g += `<path fill-rule="evenodd" fill="${shade(w, 1.05)}" d="M${pts(rim)}ZM${pts(ring(C[0], C[1], C[2], R - 1.8, 40))}Z"/>` + path(rim2, "none", ` stroke="${shade(w, 0.75)}" stroke-width=".25"`);
  for (let k = 0; k < 8; k++) { const a = spin + k * Math.PI / 4 + Math.PI / 8; g += glow(C[0] + Math.cos(a) * (R - 0.6), C[1] + 0.03, C[2] + Math.sin(a) * (R - 0.6), 0.35, BRASS[1], 1); }
  g += path(ring(C[0], C[1] + 0.04, C[2], 2.4, 20), BRASS[1]) + path(ring(C[0], C[1] + 0.05, C[2], 1.2, 16), BRASS[2]);
  // the chart desk in front: a sloped top with the chart, a ledge; the binnacle at its side
  g += ibox(4, 9, 26, 6, 0, 10, T3(w)) + ifront(5, 15, 11.4, 1.5, 7, shade(w, 1.12)) + ifront(17.6, 15, 11.4, 1.5, 7, shade(w, 1.12));
  for (const x of [10.7, 23.3]) g += icyl(x, 15, 4.6, 0.5, 0.5, BRASS[2], BRASS[0]);
  g += path([[4, 9, 10], [30, 9, 10], [30, 15, 11.6], [4, 15, 11.6]], shade(w, 1.2));
  g += path([[8, 10, 10.6], [26, 10, 10.6], [26, 14, 11.6], [8, 14, 11.6]], "#d9c08a") + path([[8.6, 10.6, 10.8], [25.4, 10.6, 10.8], [25.4, 13.4, 11.5], [8.6, 13.4, 11.5]], "#8fb8c8");
  for (const [x, y] of [[12, 11.6], [17, 12.6], [22, 11.4]]) g += iell(x, y, 11.3, 0.9, "#7aa64a");
  g += icyl(31.6, 12, 0, 13, 1.6, shade(w, 0.9), w) + icyl(31.6, 12, 13, 2, 2.2, BRASS[2], BRASS[1]) + iell(31.6, 12, 15.02, 1.6, "#f4efe2");
  const n = Math.sin(frame * 0.7) * 0.4, [bx, by] = ipt(31.6, 12, 15.03);
  g += `<path fill="#c0303a" d="M${n2(bx + n)} ${n2(by - 0.9)}l.3 .9h-.6z"/><path fill="#1c1c22" d="M${n2(bx - n)} ${n2(by + 0.9)}l.3 -.9h-.6z"/>`;
  return g + icyl(31.6, 12, 15, 2.4, 1.6, "#dfeaf244", "#ffffff22");
}, { mx: 4 });

/* ---------- things of the sea ---------- */
// the treasure chest: iron-bound, a domed lid that stands open, gold heaped by the day's loot (gold 0..1), gems that
// sparkle (frame); empty: a few coins at the bottom
art("isotreasure", 14, 10, 26, ({ w = "#6a4426", gold = 0, frame = 0 }) => {
  let g = ishadow(14, 10) + ibox(0, 1, 14, 9, 0, 7, T3(w));
  for (const x of [1.4, 12]) g += ifront(x, 10, 0.8, 0, 7, IRON[1]);
  g += ifront(0, 10, 14, 6.2, 0.8, IRON[1]) + ifront(6, 10, 2, 3.4, 2.4, BRASS[1]) + ifront(6.7, 10.01, 0.6, 3.8, 1, "#1c1c22");
  const k = Math.max(0, Math.min(1, gold)), top = 6.9 + k * 4;
  g += itop(0.6, 1.6, 12.8, 7.8, 6.9, "#3a2414");
  if (k > 0) {  // the heap of doubloons, higher in the middle
    g += path([[0.8, 9.2, 6.9], [13.2, 9.2, 6.9], [11, 6, top], [7, 5, top + 1.4], [3, 6, top]], BRASS[1]) + path([[0.8, 9.2, 6.9], [3, 6, top], [7, 5, top + 1.4], [7, 8, top - 0.6]], BRASS[0]);
    for (let i = 0; i < 10 * k; i++) g += iell(2 + h01(i, 5) * 10, 5.4 + h01(i, 6) * 3.4, 7 + h01(i, 7) * (top - 6.9), 0.55, BRASS[(i % 3)]);
    for (const [x, y, c, z] of [[4, 7, "#c0303a", top - 1], [9.4, 6.4, "#2a9a5a", top - 0.6], [6.4, 8, "#3a6ad0", top - 1.6]]) { const [px, py] = ipt(x, y, z); g += `<path fill="${c}" d="M${n2(px)} ${n2(py - 0.8)}l.8 .8 -.8 .8 -.8 -.8z"/>`; }
    const s = frame % 8, [sx, sy] = ipt(3 + s * 1.2, 6 + (s % 3), top - 0.2); if (s < 5) g += `<path fill="#fffbe0" d="M${n2(sx)} ${n2(sy - 1.4)}l.25 1.15 1.15 .25 -1.15 .25 -.25 1.15 -.25 -1.15 -1.15 -.25 1.15 -.25z"/>`;
    if (k > 0.7) for (let i = 0; i < 4; i++) g += iell(2 + i * 3, 11 + (i % 2), 0.1, 0.6, BRASS[i % 2]);  // spilled over
  } else for (let i = 0; i < 3; i++) g += iell(3 + i * 3, 5 + i, 6.95, 0.55, BRASS[1]);
  // the lid, open backward: a curved top (three slats), the iron bands
  const L = (x, u, z) => [x, 1 - u * 0.5, z + u * 0.2];
  for (let i = 0; i < 3; i++) g += path([L(0, i * 1.2, 7 + i * 2.6), L(14, i * 1.2, 7 + i * 2.6), L(14, (i + 1) * 1.2, 7 + (i + 1) * 2.6), L(0, (i + 1) * 1.2, 7 + (i + 1) * 2.6)], shade(w, 1.1 - i * 0.08));
  for (const x of [1.4, 12]) g += path([L(x, 0, 7), L(x + 0.8, 0, 7), L(x + 0.8, 3.6, 14.8), L(x, 3.6, 14.8)], IRON[1]);
  return g;
});
// the ship's bell: a little gallows of oak, a brass bell, its rope; ringing: the bell swings (frame) and rings
art("isoshipbell", 8, 8, 40, ({ ring: on = false, frame = 0 }) => {
  let g = ishadow(8, 8) + ibox(0.6, 0.6, 6.8, 6.8, 0, 2, T3(shade(OAK, 0.85))) + ibox(3, 3, 2, 2, 2, 30, T3(OAK)) + ibox(3, 3, 6.6, 2, 30, 1.6, T3(OAK));
  const sw = on ? [-0.5, 0, 0.5, 0][frame % 4] : 0, [hx, hy] = ipt(7, 4, 30), x = hx + sw * 3, y = hy + 1;
  g += `<path stroke="${IRON[1]}" stroke-width=".5" d="M${n2(hx)} ${n2(hy)}L${n2(x)} ${n2(y)}"/>`;
  g += `<path fill="${BRASS[1]}" d="M${n2(x - 1.4)} ${n2(y + 0.6)}Q${n2(x - 1.6)} ${n2(y + 4.6)} ${n2(x - 3)} ${n2(y + 5.6)}H${n2(x + 3)}Q${n2(x + 1.6)} ${n2(y + 4.6)} ${n2(x + 1.4)} ${n2(y + 0.6)}Q${n2(x)} ${n2(y - 0.4)} ${n2(x - 1.4)} ${n2(y + 0.6)}Z"/>`
    + `<path fill="${BRASS[0]}" d="M${n2(x - 0.9)} ${n2(y + 1)}q-.3 3 -1.4 4.2h.9q.8 -1.6 1 -4.2z"/><rect x="${n2(x - 3)}" y="${n2(y + 5.2)}" width="6" height=".8" fill="${BRASS[2]}"/>`;
  g += `<path stroke="${ROPE}" stroke-width=".45" d="M${n2(x + sw)} ${n2(y + 5.8)}q${n2(sw * 2)} 3 0 6"/><circle cx="${n2(x + sw)}" cy="${n2(y + 12)}" r=".6" fill="${ROPE}"/>`;
  if (on) for (const s of [-1, 1]) g += `<path fill="none" stroke="${BRASS[0]}" stroke-width=".3" stroke-opacity=".8" d="M${n2(x + s * 4.4)} ${n2(y + 1.4)}q${n2(s * 1)} 2 0 4M${n2(x + s * 5.6)} ${n2(y + 0.6)}q${n2(s * 1.4)} 2.8 0 5.6"/>`;
  return g;
}, { mx: 4 });
// the parrot on its perch: a T-bar on a post, a seed cup, the bird (c: its plumage) who bobs his head (frame), opens his
// beak and flaps when he talks
art("isoparrot", 8, 8, 42, ({ c = "#d8332a", frame = 0, talk = false }) => {
  let g = ishadow(8, 8) + icyl(4, 4, 0, 1.2, 3.2, shade(OAK, 0.8), OAK) + icyl(4, 4, 1.2, 26, 0.5, OAK, shade(OAK, 1.2));
  g += iline(ipt(0.6, 4, 27.4), ipt(7.4, 4, 27.4), OAK, 1.2) + icyl(1.2, 4, 26.2, 1, 0.9, "#c9ccd6", "#e6e6ea");
  const [x, y0] = ipt(4.6, 4, 27.6), bob = [0, -0.4, 0, 0.3][frame % 4], y = y0 + bob;
  const wing = shade(c, 0.6), blue = "#2a6ad0", yel = "#f2c230", flap = talk && frame % 2;
  g += `<path fill="${blue}" d="M${n2(x - 0.6)} ${n2(y - 1)}l-1 6 1 -.6 .6 .9z"/>`;  // the tail
  g += `<ellipse cx="${n2(x)}" cy="${n2(y - 3.6)}" rx="1.9" ry="3.2" fill="${c}"/>`;
  g += flap ? `<path fill="${wing}" d="M${n2(x + 0.6)} ${n2(y - 5)}l3.4 -2.6 -.6 2 1.2 -.2 -3 3.6z"/><path fill="${yel}" d="M${n2(x + 2.2)} ${n2(y - 6.2)}l1.6 -1.2 -.3 .9z"/>`
    : `<path fill="${wing}" d="M${n2(x + 0.2)} ${n2(y - 5.4)}q2 1 1.4 4.6l-1.6 1.2q-.8 -3 .2 -5.8z"/><path fill="${yel}" d="M${n2(x + 0.6)} ${n2(y - 2)}l1 -.4 -.4 1.2z"/><path fill="${blue}" d="M${n2(x + 0.8)} ${n2(y - 0.8)}l.9 -.6 -.2 1.2z"/>`;
  const hx = x + 0.3, hy = y - 7.4;
  g += `<circle cx="${n2(hx)}" cy="${n2(hy)}" r="1.7" fill="${c}"/><ellipse cx="${n2(hx + 0.5)}" cy="${n2(hy - 0.1)}" rx=".9" ry=".8" fill="#f4f2ea"/><circle cx="${n2(hx + 0.6)}" cy="${n2(hy - 0.2)}" r=".35" fill="#1c1c22"/>`;
  g += talk && frame % 2 === 0 ? `<path fill="#2a2a30" d="M${n2(hx + 1.4)} ${n2(hy - 0.6)}q1.6 0 1.4 1.6l-1.2 -.6zM${n2(hx + 1.4)} ${n2(hy + 0.6)}l1 .6 -1 .2z"/>` : `<path fill="#2a2a30" d="M${n2(hx + 1.4)} ${n2(hy - 0.6)}q1.6 0 1.4 1.8l-1.4 -.4z"/>`;
  for (const dx of [-0.5, 0.5]) g += `<path stroke="#5a5a62" stroke-width=".3" d="M${n2(x + dx)} ${n2(y - 0.6)}v.8"/>`;
  return g;
});
// the cannon on its carriage: four little wheels, a black barrel along x, the touch-hole; fire: the flash, the smoke
art("isocannon", 20, 10, 20, ({ fire = false, frame = 0 }) => {
  let g = ishadow(20, 10) + ibox(1, 1.6, 12, 6.8, 2, 4, T3(shade(OAK, 0.9))) + ibox(1, 1.6, 6, 6.8, 6, 2.4, T3(shade(OAK, 0.85)));
  for (const [x, y] of [[3, 1.4], [11, 1.4], [3, 8.6], [11, 8.6]]) g += path(ringX(x, y, 2, 2, 14), shade(OAK, 0.7)) + path(ringX(x + 0.01, y, 2, 0.6, 8), IRON[1]);
  g += lying(2, 18, 5, 9.2, 3, 2.2, IRON[1], IRON[0]) + path(ringX(18.02, 5, 9.2, 1.3, 14), "#0a0a0c");
  for (const x of [5, 10, 16.6]) g += path(ringX(x, 5, 9.2, 3 - (x - 2) / 16 * 0.8 + 0.25, 16), IRON[2]) + path(ringX(x + 0.3, 5, 9.2, 3 - (x - 2) / 16 * 0.8 + 0.05, 16), IRON[1]);
  g += iline(ipt(4, 5, 11.6), ipt(15, 5, 10.6), "#8a8a96", 0.3) + iell(3.6, 5, 12.1, 0.4, "#0a0a0c");
  if (fire) {
    const f = frame % 8, [mx, my] = ipt(19 + f * 0.8, 5, 9.2);
    if (f < 3) g += `<circle cx="${n2(mx)}" cy="${n2(my)}" r="${3 + f * 2.2}" fill="#ffb03b" fill-opacity=".75"/><circle cx="${n2(mx)}" cy="${n2(my)}" r="${1.6 + f}" fill="#fff6c8"/>`;
    for (let k = 0; k < 5; k++) { const [sx, sy] = ipt(19 + f * 1.4 + k * 1.2, 5 + (k - 2) * 1.2, 10 + k * 1.2 + f * 0.8); g += `<circle cx="${n2(sx)}" cy="${n2(sy)}" r="${n2(1.8 + f * 0.6 + k * 0.3)}" fill="#e8e4dc" fill-opacity="${(0.8 - f * 0.09).toFixed(2)}"/>`; }
    const [ex, ey] = ipt(3.6, 5, 12.4); if (f < 4) g += `<circle cx="${n2(ex)}" cy="${n2(ey - 1)}" r="1" fill="#ff9a3b"/>`;
  }
  for (const [x, y] of [[16, 9.6], [17.6, 8.8], [16.8, 10.6]]) g += icyl(x, y, 0, 1.2, 0.7, "#1c1c22", "#3a3a44");  // the cannonballs
  return g;
}, { mx: 10 });
// the message in a bottle: a sand mound, a shell, a green bottle lying on it, a rolled message inside; on: a question
// waits (it glows, a little star blinks)
art("isobottle", 10, 10, 14, ({ on = false, frame = 0 }) => {
  let g = ishadow(10, 10) + path([[0.6, 5, 0], [3, 1, 0.8], [8, 1.6, 1], [9.4, 6, 0.6], [6, 9.4, 0.3], [1.6, 8.6, 0.2]], "#e8d4a0") + iell(5, 5, 1, 3, "#f0dcaa");
  g += lying(2, 7.6, 5, 2.6, 1.2, 1.2, "#2a7a4a99", "#3a9a5a99") + lying(7.6, 9.2, 5, 2.6, 0.5, 0.5, "#2a7a4a", "#5a3a24");
  g += lying(3.4, 6.6, 5, 2.6, 0.5, 0.5, "#efe2c0", "#d9c08a") + iell(5, 5, 2.62, 0.2, "#c0303a");
  g += iline(ipt(2.6, 4.4, 3.6), ipt(7, 4.4, 3.6), "#ffffff", 0.3).replace("/>", ' stroke-opacity=".5"/>');
  const [sx, sy] = ipt(2.4, 8, 0.6); g += `<path fill="#f4b8a8" d="M${n2(sx - 1.2)} ${n2(sy)}q1.2 -2 2.4 0z"/><path stroke="#d88a7a" stroke-width=".15" d="M${n2(sx)} ${n2(sy)}v-1.2M${n2(sx - 0.6)} ${n2(sy)}l.4 -1M${n2(sx + 0.6)} ${n2(sy)}l-.4 -1"/>`;
  if (on) { const [px, py] = ipt(5, 5, 6); g += glow(5, 5, 2.6, 3, "#ffe9a0", 0.25) + (frame % 2 ? `<path fill="#fff3b0" d="M${n2(px)} ${n2(py - 1.4)}l.3 1.1 1.1 .3 -1.1 .3 -.3 1.1 -.3 -1.1 -1.1 -.3 1.1 -.3z"/>` : ""); }
  return g;
});
// the spyglass on its tripod: three oak legs, a brass telescope that sweeps the horizon (frame)
art("isospyglass", 10, 10, 40, ({ frame = 0 }) => {
  let g = ishadow(10, 10);
  for (const [x, y] of [[1, 2], [9, 3], [4, 9.4]]) g += iline(ipt(x, y, 0), ipt(5, 5, 24), shade(OAK, 0.85), 0.9);
  g += icyl(5, 5, 23, 1.6, 1, BRASS[2], BRASS[1]);
  const a = [-0.3, -0.1, 0.1, 0.3, 0.1, -0.1][frame % 6], dx = Math.cos(a), dy = Math.sin(a);
  const seg = (u0, u1, r, c) => iline(ipt(5 + dx * u0, 5 + dy * u0, 25.4 + u0 * 0.35), ipt(5 + dx * u1, 5 + dy * u1, 25.4 + u1 * 0.35), c, r);
  g += seg(-5, -1, 1.2, BRASS[2]) + seg(-1, 3, 1.6, BRASS[1]) + seg(3, 7, 2, BRASS[1]) + seg(6.6, 7, 2.3, BRASS[0]) + seg(-5.2, -4.8, 1.4, BRASS[0]);
  for (const u of [-1, 3]) g += seg(u - 0.15, u + 0.15, u < 0 ? 1.8 : 2.2, BRASS[0]);
  return g;
}, { mx: 4 });
// the kraken's barrel: a barrel, its lid knocked aside; tentacles (n: one per red CI, up to 3) rise out of it and wave
// (frame); none: just a curious tip and two eyes peeking
art("isokraken", 12, 12, 44, ({ n = 0, frame = 0, c = "#8a3a7a" }) => {
  let g = ishadow(12, 12) + barrel(6, 6, 0, 13, 4.6) + iell(6, 6, 13.02, 3.9, "#0e1a24");
  g += path([[9.6, 8, 0.1], [13, 7, 0.3], [13.4, 11, 0.6], [10, 12, 0.4]], shade(OAK, 1.15));
  const [bx, by] = ipt(6, 6, 13);
  const tent = (ox, h, ph, k) => {  // a tentacle: a tapering wavy band, suckers on its inner side
    const pts = [], pts2 = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10, sw = Math.sin(ph + t * 3) * 2.4 * t, wd = 1.5 * (1 - t) + 0.2; pts.push([bx + ox + sw - wd, by - t * h]); pts2.unshift([bx + ox + sw + wd, by - t * h]); }
    const tip = pts[pts.length - 1];
    let s = `<path fill="${c}" d="M${[...pts, [tip[0] + 0.6 * Math.cos(ph), tip[1] - 1.2], ...pts2].map(([x, y]) => `${n2(x)} ${n2(y)}`).join("L")}Z"/>`;
    for (let i = 2; i < 9; i += 2) { const t = i / 10, sw = Math.sin(ph + t * 3) * 2.4 * t; s += `<circle cx="${n2(bx + ox + sw + 0.5)}" cy="${n2(by - t * h)}" r="${n2(0.42 * (1 - t) + 0.12)}" fill="#f0b8d8"/>`; }
    return s;
  };
  const m = Math.min(3, n);
  if (!m) return g + tent(0, 4, frame * 0.6, 0) + `<circle cx="${n2(bx - 1.6)}" cy="${n2(by - 0.6)}" r=".7" fill="#f2e86a"/><circle cx="${n2(bx + 1.6)}" cy="${n2(by - 0.6)}" r=".7" fill="#f2e86a"/>`
    + `<rect x="${n2(bx - 1.7)}" y="${n2(by - 1)}" width=".2" height=".8" fill="#1c1c22"/><rect x="${n2(bx + 1.5)}" y="${n2(by - 1)}" width=".2" height=".8" fill="#1c1c22"/>`;
  for (let k = 0; k < m; k++) g += tent([-2, 2, 0][k], 18 + k * 4, frame * 0.6 + k * 2, k);
  return g + glow(6, 6, 13, 6, "#c03a8a", 0.12);
}, { mx: 4 });
// the rum barrel: a big barrel lying on a cradle, a brass tap, XXX painted, a tin mug under the tap; pour: a stream
art("isorumbarrel", 14, 12, 22, ({ w = OAK, pour = false, frame = 0 }) => {
  let g = ishadow(14, 12) + ibox(1, 1, 2, 10, 0, 3.2, T3(shade(w, 0.75))) + ibox(10, 1, 2, 10, 0, 3.2, T3(shade(w, 0.75)));
  g += lying(1, 12, 6, 8.2, 4.6, 4.6, w, shade(w, 1.15));
  for (const x of [2, 6.5, 11]) g += path(ringX(x, 6, 8.2, 4.75, 20), IRON[1]) + path(ringX(x + 0.5, 6, 8.2, 4.62, 20), w);
  g += path(ringX(12.02, 6, 8.2, 3.6, 18), shade(w, 1.25)) + path(ringX(12.03, 6, 8.2, 3, 18), shade(w, 1.05));
  const [tx, ty] = ipt(12.2, 6, 6.6);
  g += `<text x="${n2(tx - 6.5)}" y="${n2(ty - 1.6)}" font-size="2.6" font-family="Georgia, serif" font-weight="bold" fill="${TAR}" transform="skewY(26.6)" transform-origin="${n2(tx - 6.5)} ${n2(ty - 1.6)}">XXX</text>`;
  g += `<rect x="${n2(tx - 0.3)}" y="${n2(ty - 0.6)}" width="1.6" height=".8" fill="${BRASS[1]}"/><rect x="${n2(tx + 0.9)}" y="${n2(ty - 0.6)}" width=".6" height="1.6" fill="${BRASS[2]}"/>`;
  if (pour) g += `<rect x="${n2(tx + 1)}" y="${n2(ty + 1)}" width=".4" height="${n2(3.2 + (frame % 2) * 0.2)}" fill="#a0581a"/>`;
  return g + icyl(13.6, 7.6, 0, 2.4, 1.1, "#9aa0a8", "#c9ccd6") + iell(13.6, 7.6, 2.41, 0.8, pour ? "#a0581a" : "#4a4a52");
}, { mx: 3 });
// the palm in a half-barrel: a curved ringed trunk, fronds that sway (frame), two coconuts; thirsty: yellowed
art("isopalm", 12, 12, 60, ({ frame = 0, dry = false }) => {
  const leaf = dry ? "#b8a04a" : "#3f9e4f", leaf2 = dry ? "#8a7a3a" : "#2f7a3a";
  let g = ishadow(12, 12) + icyl(6, 6, 0, 7, 5, OAK, shade(OAK, 1.2)) + band(6, 6, 2.6, 0.8, 5.05, IRON[1]) + band(6, 6, 5.6, 0.8, 5.05, IRON[1]) + iell(6, 6, 7, 4.4, "#4a3420");
  const [bx, by] = ipt(6, 6, 7), sw = [0, 0.5, 0, -0.5][frame % 4];
  const trunk = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [bx + Math.sin(t * 1.6) * 4 * t, by - t * 36]; });
  for (let i = 0; i < 8; i++) { const [x0, y0] = trunk[i], [x1, y1] = trunk[i + 1]; g += `<path fill="${i % 2 ? "#8a6a4a" : "#7a5a3a"}" d="M${n2(x0 - 1.4 + i * 0.08)} ${n2(y0)}L${n2(x1 - 1.3 + i * 0.08)} ${n2(y1)}H${n2(x1 + 1.3 - i * 0.08)}L${n2(x0 + 1.4 - i * 0.08)} ${n2(y0)}Z"/>`; }
  const [tx, ty] = trunk[8];
  for (const [a, l] of [[-2.6, 13], [-2, 12], [-1.1, 10], [-0.3, 12], [0.4, 13], [-3.1, 9]]) {
    const ex = tx + Math.cos(a) * l + sw, ey = ty + Math.sin(a) * l * 0.5 + 3.4;
    g += `<path fill="${a < -1.5 ? leaf2 : leaf}" d="M${n2(tx)} ${n2(ty)}Q${n2((tx + ex) / 2)} ${n2(ty - 4)} ${n2(ex)} ${n2(ey)}Q${n2((tx + ex) / 2)} ${n2(ty - 1.6)} ${n2(tx)} ${n2(ty + 0.8)}Z"/>`;
  }
  return g + `<circle cx="${n2(tx - 0.8)}" cy="${n2(ty + 1.2)}" r="1.1" fill="#5a3a24"/><circle cx="${n2(tx + 0.9)}" cy="${n2(ty + 1.4)}" r="1.1" fill="#4a2f1e"/>`;
}, { mx: 8 });
