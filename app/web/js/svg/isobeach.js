// The beach & beach club theme (items/beach.js): walls to compose (a striped beach hut wall with its lifebuoy, a bamboo
// wall, a curtain of shells you walk through, a tiki totem and its torch), a tiki torch, a deck chair, a rattan hanging
// chair, a surfboard desk, the lifeguard tower (the chief's desk), the swimming pool (a swimmer per agent at work, a
// flamingo per delivered), a sandcastle (a tower per agent whose tests are green; washed away by a red CI), the swim
// flag (the CI's colour), the tiki bar, the DJ booth (its equalizer follows the agents' activity), a hammock between two
// palms, a parasol, crabs (one per agent whose tests are red), an ice-cream cart, a monstera. Drawn like the rest
// (svg/iso.js).

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const T3 = c => [shade(c, 1.2), c, shade(c, 0.74)];
const SAND = "#e8d4a0", BAMBOO = "#c9b06a", THATCH = "#c9a45a", WATER = "#3ab8d8", WHITE = "#f4f2ea", TEAK = "#a0703a";
const path = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const glow = (x, y, z, r, c, a = 0.25) => { const [px, py] = ipt(x, y, z); return `<circle cx="${n2(px)}" cy="${n2(py)}" r="${n2(r)}" fill="${c}" fill-opacity="${a.toFixed(2)}"/>`; };
const shifted = (g, dx, dy) => { const [x, y] = ipt(dx, dy, 0); return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`; };
const h01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
const flame = (x, y, z, s = 1, frame = 0) => {
  const f = Math.abs(Math.round(frame)) % 3, [px, py] = ipt(x, y, z), k = [1, 1.15, 0.9][f] * s, sway = [0, 0.4, -0.3][f] * s;
  return `<circle cx="${n2(px)}" cy="${n2(py - 1.4 * k)}" r="${n2(3.6 * s)}" fill="#ffcf6a" fill-opacity=".22"/>`
    + `<path fill="#ff7a2a" d="M${n2(px - 0.9 * s)} ${n2(py)}Q${n2(px + sway)} ${n2(py - 3.8 * k)} ${n2(px + 0.9 * s)} ${n2(py)}Q${n2(px)} ${n2(py + 0.7 * s)} ${n2(px - 0.9 * s)} ${n2(py)}Z"/>`
    + `<path fill="#ffe08a" d="M${n2(px - 0.4 * s)} ${n2(py - 0.2)}Q${n2(px + sway * 0.5)} ${n2(py - 2.2 * k)} ${n2(px + 0.4 * s)} ${n2(py - 0.2)}Z"/>`;
};
// a palm trunk from (bx, by) in screen units, curving, its fronds that sway (sw), coconuts
const palm = (bx, by, h, sw = 0, lean = 4, dry = false) => {
  const leaf = dry ? "#b8a04a" : "#3f9e4f", leaf2 = dry ? "#8a7a3a" : "#2f7a3a";
  const trunk = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [bx + Math.sin(t * 1.6) * lean * t, by - t * h]; });
  let g = "";
  for (let i = 0; i < 8; i++) { const [x0, y0] = trunk[i], [x1, y1] = trunk[i + 1]; g += `<path fill="${i % 2 ? "#a0805a" : "#8a6a4a"}" d="M${n2(x0 - 1.3 + i * 0.07)} ${n2(y0)}L${n2(x1 - 1.2 + i * 0.07)} ${n2(y1)}H${n2(x1 + 1.2 - i * 0.07)}L${n2(x0 + 1.3 - i * 0.07)} ${n2(y0)}Z"/>`; }
  const [tx, ty] = trunk[8];
  for (const [a, l] of [[-2.7, 12], [-2.1, 13], [-1.2, 10], [-0.4, 12], [0.4, 12], [-3.2, 9]]) {
    const ex = tx + Math.cos(a) * l + sw, ey = ty + Math.sin(a) * l * 0.5 + 3.4;
    g += `<path fill="${a < -1.5 ? leaf2 : leaf}" d="M${n2(tx)} ${n2(ty)}Q${n2((tx + ex) / 2)} ${n2(ty - 4)} ${n2(ex)} ${n2(ey)}Q${n2((tx + ex) / 2)} ${n2(ty - 1.6)} ${n2(tx)} ${n2(ty + 0.8)}Z"/>`;
  }
  return g + `<circle cx="${n2(tx - 0.8)}" cy="${n2(ty + 1.2)}" r="1" fill="#5a3a24"/><circle cx="${n2(tx + 0.9)}" cy="${n2(ty + 1.4)}" r="1" fill="#4a2f1e"/>`;
};
// a lifebuoy hung on a face (screen units)
const buoy = (x, y, r = 3) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="none" stroke="#e8402a" stroke-width="${n2(r * 0.55)}"/>`
  + [0, 1, 2, 3].map(k => { const a = k * Math.PI / 2 + Math.PI / 4; return `<path stroke="${WHITE}" stroke-width="${n2(r * 0.56)}" d="M${n2(x + Math.cos(a - 0.25) * r)} ${n2(y + Math.sin(a - 0.25) * r)}A${r} ${r} 0 0 1 ${n2(x + Math.cos(a + 0.25) * r)} ${n2(y + Math.sin(a + 0.25) * r)}" fill="none"/>`; }).join("")
  + `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 1.3)}" fill="none" stroke="#c9a46a" stroke-width=".25" stroke-dasharray="1 1"/>`;
const cap = (w, d, c) => ibox(-0.2, -0.3, w + 0.4, d + 0.6, 50, 1.4, T3(shade(c, 1.05)));

/* ---------- walls to compose ---------- */
// the beach hut: vertical boards painted in stripes (c and white), a little roof edge, a lifebuoy
art("isobeachhut", 24, 4, 60, ({ c = "#3a8ad0" }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.8)));
  for (let x = 0, k = 0; x < 24; x += 2, k++) g += ifront(x, 4, 2, 0, 50, k % 2 ? WHITE : c) + ifront(x + 1.85, 4.01, 0.15, 0, 50, "#00000022");
  for (let y = 0; y < 4; y += 2) g += iside(24, y, 2, 0, 50, (y / 2) % 2 ? shade(WHITE, 0.8) : shade(c, 0.75));
  const [bx, by] = ipt(17, 4.05, 34);
  g += path([[-0.6, 4.8, 50], [24.6, 4.8, 50], [24.6, 4.8, 48], [-0.6, 4.8, 48]], shade(c, 0.7));
  for (let x = 0; x < 24; x += 3) g += path([[x, 4.8, 48], [x + 3, 4.8, 48], [x + 1.5, 4.8, 46.6]], WHITE);
  return g + buoy(bx, by, 3.2) + cap(24, 4, WHITE);
});
// the bamboo wall: canes side by side, their nodes, two lashings of rope, a cap of thatch
art("isobamboowall", 24, 4, 60, ({ c = BAMBOO }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 50, T3(shade(c, 0.7)));
  for (let x = 0, k = 0; x < 24; x += 1.6, k++) {
    const t = shade(c, 0.9 + h01(k, 1) * 0.2);
    g += ifront(x, 4, 1.6, 0, 50, t) + ifront(x + 1.3, 4.01, 0.3, 0, 50, shade(t, 0.75)) + ifront(x + 0.2, 4.01, 0.3, 0, 50, shade(t, 1.15));
    for (let z = 6 + h01(k, 2) * 6; z < 50; z += 11) g += ifront(x, 4.02, 1.6, z, 0.5, shade(t, 0.7));
  }
  g += iside(24, 0, 4, 0, 50, shade(c, 0.65));
  for (const z of [14, 36]) g += ifront(0, 4.03, 24, z, 1, "#8a6a3a");
  return g + ibox(-0.6, -0.6, 25.2, 5.6, 50, 3, T3(THATCH)) + Array.from({ length: 16 }, (_, k) => ifront(k * 1.6 - 0.6, 5, 0.3, 48.4 - h01(k, 5) * 1.6, 2, shade(THATCH, 0.75))).join("");
});
// the shell curtain: a bamboo frame, strands of shells and beads that part and sway when someone walks through (open)
art("isoshellcurtain", 24, 4, 60, ({ c = BAMBOO, open = 0, frame = 0 }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 3, 4, 0, 50, T3(c)) + ibox(21, 0, 3, 4, 0, 50, T3(c)) + ibox(3, 0, 18, 4, 44, 6, T3(c));
  g += ifront(3, 3.6, 18, 0, 44, "#2a3a3a", ' fill-opacity=".25"');
  const o = Math.max(0, Math.min(1, open));
  for (let k = 0; k < 14; k++) {
    const x0 = 3.8 + k * 1.24, side = x0 < 12 ? -1 : 1, push = o * (side < 0 ? (x0 - 3) : (21 - x0)) * 0.7, sw = Math.sin(frame * 0.8 + k) * 0.2 * (o > 0.05 ? 1 : 0.4);
    for (let z = 43, i = 0; z > 2; z -= 2.2, i++) {
      const t = (43 - z) / 41, x = x0 - side * push * t * t + sw * t * 4, [px, py] = ipt(x, 4.1, z);
      g += i % 3 === 2 ? `<path fill="${["#f4d8c8", "#f8e8d0", "#e8b8a0"][k % 3]}" d="M${n2(px - 0.6)} ${n2(py + 0.5)}q.6 -1.4 1.2 0z"/>` : `<circle cx="${n2(px)}" cy="${n2(py)}" r=".35" fill="${["#3ab8d8", "#f4f2ea", "#e8a03a"][(k + i) % 3]}"/>`;
    }
  }
  return g + cap(24, 4, c);
}, { mx: 2 });
// the tiki totem: a carved post with a fierce face, its torch flaming on top (on)
art("isotikipillar", 8, 8, 64, ({ on = true, frame = 0 }) => {
  const wd = "#8a5a2a";
  let g = ishadow(8, 8) + ibox(0.6, 0.6, 6.8, 6.8, 0, 2, T3("#6a4a2a")) + ibox(1.2, 1.2, 5.6, 5.6, 2, 46, T3(wd));
  for (const [z, ky] of [[34, 0], [14, 1]]) {  // two faces stacked
    g += ifront(1.6, 6.81, 4.8, z + 8, 1.4, shade(wd, 0.6)) + ifront(1.8, 6.82, 1.6, z + 5, 1.8, WHITE) + ifront(4.6, 6.82, 1.6, z + 5, 1.8, WHITE) + ifront(2.4, 6.83, 0.6, z + 5.4, 1, "#1c1c22") + ifront(5.2, 6.83, 0.6, z + 5.4, 1, "#1c1c22");
    g += ifront(3.4, 6.82, 1.2, z + 2.6, 2.2, shade(wd, 1.25)) + ifront(2, 6.82, 4, z, 1.8, "#1c1c22") + [2.4, 3.4, 4.4, 5.4].map(x => ifront(x, 6.83, 0.5, z + 1, 0.8, WHITE)).join("");
    g += ifront(1.2, 6.82, 5.6, z - 1, 0.6, ky ? "#3ab8d8" : "#e8402a");
  }
  g += ibox(0.8, 0.8, 6.4, 6.4, 48, 2, T3(THATCH)) + icyl(4, 4, 50, 3, 1.6, "#3a3a40", "#1c1c22");
  return g + (on ? flame(4, 4, 53, 1.4, frame) : "");
});

/* ---------- lights ---------- */
// the tiki torch: a bamboo pole stuck in the sand, a woven cup, its flame (on)
art("isotikitorch", 6, 6, 44, ({ on = true, frame = 0 }) => {
  let g = ishadow(6, 6) + iell(3, 3, 0.2, 2.4, SAND) + icyl(3, 3, 0, 30, 0.6, BAMBOO, shade(BAMBOO, 1.2));
  for (const z of [8, 16, 24]) g += icyl(3, 3, z, 0.5, 0.66, shade(BAMBOO, 0.7), shade(BAMBOO, 0.8));
  g += icyl(3, 3, 30, 4, 1.4, THATCH, shade(THATCH, 0.7));
  for (let k = 0; k < 3; k++) g += iline(ipt(1.8, 4.2, 30.6 + k * 1.3), ipt(4.2, 4.2, 31.4 + k * 1.3), shade(THATCH, 0.65), 0.25);
  return g + (on ? flame(3, 3, 34, 1.3, frame) : "");
});

/* ---------- seats ---------- */
// the deck chair: a folding wooden frame, a striped canvas sling (c)
art("isotransat", 10, 16, 18, ({ c = "#3a8ad0" }) => {
  let g = ishadow(10, 16) + iline(ipt(1, 14, 0), ipt(1, 2, 14), TEAK, 0.9) + iline(ipt(9, 14, 0), ipt(9, 2, 14), TEAK, 0.9) + iline(ipt(1, 4, 0), ipt(1, 12, 7), TEAK, 0.8) + iline(ipt(9, 4, 0), ipt(9, 12, 7), TEAK, 0.8);
  const S = [[1.2, 2.4, 13.6], [8.8, 2.4, 13.6], [8.8, 9, 5], [8.8, 14.4, 3], [1.2, 14.4, 3], [1.2, 9, 5]];
  g += path(S, c);
  for (const x of [3.6, 6.2]) g += path([[x, 2.4, 13.6], [x + 1.2, 2.4, 13.6], [x + 1.2, 9, 5], [x + 1.2, 14.4, 3], [x, 14.4, 3], [x, 9, 5]], WHITE);
  return g + iline(ipt(1, 2.2, 14), ipt(9, 2.2, 14), TEAK, 0.7) + iline(ipt(1, 14.6, 3), ipt(9, 14.6, 3), TEAK, 0.7);
});
// the rattan hanging chair: a woven egg on a chain from an arched stand, a cushion (c)
art("isohangchair", 16, 14, 46, ({ c = "#f4f2ea", frame = 0 }) => {
  let g = ishadow(16, 14) + iell(8, 7, 0, 5.6, "#2a2a30") + iell(8, 7, 0.4, 5, "#3a3a44");
  const [bx, by] = ipt(8, 7, 0.5);
  g += `<path fill="none" stroke="#2a2a30" stroke-width="1.1" d="M${n2(bx)} ${n2(by)}V${n2(by - 34)}Q${n2(bx)} ${n2(by - 40)} ${n2(bx + 6)} ${n2(by - 40)}"/>`;
  const sw = [0, 0.4, 0, -0.4][frame % 4], cx = bx + 6 + sw, cy = by - 18;
  g += `<path stroke="#5a5a62" stroke-width=".4" d="M${n2(bx + 6)} ${n2(by - 40)}L${n2(cx)} ${n2(cy - 12)}"/>`;
  g += `<path fill="#c9a46a" d="M${n2(cx - 6)} ${n2(cy)}Q${n2(cx - 6.4)} ${n2(cy - 12)} ${n2(cx)} ${n2(cy - 12.4)}Q${n2(cx + 6.4)} ${n2(cy - 12)} ${n2(cx + 6)} ${n2(cy)}Q${n2(cx + 5)} ${n2(cy + 6)} ${n2(cx)} ${n2(cy + 6.4)}Q${n2(cx - 5)} ${n2(cy + 6)} ${n2(cx - 6)} ${n2(cy)}Z"/>`;
  for (let k = 0; k < 6; k++) g += `<path fill="none" stroke="#a07a4a" stroke-width=".25" d="M${n2(cx - 5.6 + k * 0.3)} ${n2(cy - 8 + k * 2.4)}Q${n2(cx)} ${n2(cy - 6 + k * 2.4)} ${n2(cx + 5.6 - k * 0.3)} ${n2(cy - 8 + k * 2.4)}"/>`;
  g += `<path fill="#3a2a1e" fill-opacity=".55" d="M${n2(cx - 4.4)} ${n2(cy - 1)}Q${n2(cx - 4.4)} ${n2(cy - 9.4)} ${n2(cx)} ${n2(cy - 9.6)}Q${n2(cx + 4.4)} ${n2(cy - 9.4)} ${n2(cx + 4.4)} ${n2(cy - 1)}Z"/>`;
  return g + `<ellipse cx="${n2(cx)}" cy="${n2(cy + 0.6)}" rx="4.6" ry="2.2" fill="${c}"/><ellipse cx="${n2(cx)}" cy="${n2(cy - 4)}" rx="3" ry="2.6" fill="${shade(c, 0.9)}"/>`;
}, { mx: 4 });

/* ---------- tables, desks ---------- */
// the surfboard desk: a long board (c, a stripe, a fin) laid on two sawhorses (the dev's computer and chair are apart)
art("isodesksurf", 40, 14, 30, ({ c = "#3ab8d8" }) => {
  let g = ishadow(40, 14);
  for (const x of [5, 33]) { g += iline(ipt(x, 2, 0), ipt(x + 1, 7, 12), TEAK, 1) + iline(ipt(x + 2, 12, 0), ipt(x + 1, 7, 12), TEAK, 1) + ibox(x - 0.6, 1, 3.2, 12, 11, 1, T3(TEAK)); }
  const board = Array.from({ length: 24 }, (_, k) => { const a = k * Math.PI * 2 / 24; return [20 + Math.cos(a) * 20.4, 7 + Math.sin(a) * 6.6 * (Math.cos(a) > 0 ? 1 - Math.cos(a) * 0.3 : 1), 12]; });
  g += path(board.map(([x, y, z]) => [x, y, z]), shade(c, 0.75)) + path(board.map(([x, y]) => [x, y, 13]), c);
  g += path([[1.4, 7, 13.01], [38.6, 7, 13.01], [38.6, 7.8, 13.01], [1.4, 7.8, 13.01]], WHITE) + path([[1.4, 6, 13.01], [38.6, 6, 13.01], [38.6, 6.3, 13.01], [1.4, 6.3, 13.01]], "#e8402a");
  return g + path([[34, 7, 12], [37, 7, 12], [35, 7, 9.4]], shade(c, 0.6)) + itop(24, 2.6, 5, 2.4, 13.02, "#1c1c22") + glow(26.5, 3.8, 13.1, 0.8, "#f2d27a", 1);
});
// the lifeguard tower (the chief's desk; ChiefOS opens as TROPIC there): a high wooden chair on its stilts, a parasol,
// the red cross, a lifebuoy, binoculars on the desk below, the flag; on: he whistles
art("isochiefdeskguard", 34, 16, 70, ({ w = "#f4f2ea", frame = 0, on = false }) => {
  let g = ishadow(34, 16);
  for (const [x, y] of [[20, 2], [30, 2], [20, 8], [30, 8]]) g += ibox(x, y, 1.2, 1.2, 0, 24, T3(w));
  for (let z = 4; z < 24; z += 5) g += ibox(19.8, 9.2, 11.6, 0.4, z, 0.8, T3(w));
  g += ibox(19.4, 1.6, 12.4, 8.2, 24, 1.4, T3(w)) + ibox(20, 2, 11, 1.4, 25.4, 10, T3(w)) + ifront(23, 3.41, 5, 28, 5, "#e8402a") + ifront(24.9, 3.42, 1.2, 28.4, 4.2, WHITE) + ifront(23.4, 3.42, 4.4, 29.9, 1.2, WHITE);
  for (const x of [20, 29.8]) g += ibox(x, 3.4, 1.2, 6, 25.4, 5, T3(w));
  g += icyl(25.5, 6, 25.4, 22, 0.35, "#5a5a62", "#7a7a84");
  const umb = Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4; return [25.5 + Math.cos(a) * 9, 6 + Math.sin(a) * 9, 45]; });
  for (let k = 0; k < 8; k++) g += path([[25.5, 6, 48.6], umb[k], umb[(k + 1) % 8]], k % 2 ? WHITE : "#e8402a");
  const [fx, fy] = ipt(32.4, 9.6, 24);  // the flag
  g += `<path stroke="#5a5a62" stroke-width=".4" d="M${n2(fx)} ${n2(fy)}V${n2(fy - 20)}"/><path fill="#e8402a" d="M${n2(fx)} ${n2(fy - 20)}l${n2(5 + Math.sin(frame) * 0.6)} 1.6 -${n2(5 + Math.sin(frame) * 0.6)} 1.8z"/>`;
  g += ibox(0, 6, 18, 8, 0, 12, T3(TEAK)) + ibox(-0.4, 5.6, 18.8, 8.8, 12, 1, T3(shade(TEAK, 1.2))) + ifront(1, 14, 7.6, 1.4, 9, shade(TEAK, 1.1)) + ifront(9.4, 14, 7.6, 1.4, 9, shade(TEAK, 1.1));
  const [bx, by] = ipt(8, 4.4, 30);
  g += `<g transform="translate(${n2(bx - 3)} ${n2(by + 8)})">${buoy(0, 0, 2.6)}</g>`;
  g += ibox(4, 9, 3.4, 1.4, 13, 1.4, T3("#1c1c22")) + icyl(4.6, 10.6, 13, 1.6, 0.6, "#1c1c22", "#3a5a8a") + icyl(6.8, 10.6, 13, 1.6, 0.6, "#1c1c22", "#3a5a8a");
  g += icyl(13, 10, 13, 3.6, 1, "#f08a3a", "#ffe08a") + iline(ipt(13.4, 10, 16.6), ipt(14.6, 9, 19), "#e8402a", 0.4);
  if (on) { const [wx, wy] = ipt(25.5, 4, 38); g += [1, 2, 3].map(k => `<path fill="none" stroke="#f2d27a" stroke-width=".4" d="M${n2(wx + 2 + k * 1.6)} ${n2(wy - 2 - k)}q${n2(1 + k * 0.4)} ${n2(1 + k * 0.4)} 0 ${n2(2 + k * 0.8)}"/>`).join(""); }
  return g;
}, { mx: 8 });

/* ---------- the beach club ---------- */
// the swimming pool: a white rim, turquoise water that ripples (frame), a ladder; a swimmer per agent at work doing
// lengths, an inflatable flamingo per mission delivered
art("isopool", 40, 24, 14, ({ n = 0, gold = 0, frame = 0 }) => {
  let g = ishadow(40, 24) + ibox(0, 0, 40, 24, 0, 2.4, T3(WHITE)) + itop(1.6, 1.6, 36.8, 20.8, 2.41, "#2a98c0") + itop(2.4, 2.4, 35.2, 19.2, 2.42, WATER);
  for (let k = 0; k < 10; k++) { const x = 3 + h01(k, 1) * 32, y = 3 + h01(k, 2) * 17, s = (frame + k * 3) % 8; g += iell(x, y, 2.43, 0.6 + s * 0.12, "none", ` stroke="#ffffff" stroke-opacity="${(0.6 - s * 0.06).toFixed(2)}" stroke-width=".25"`); }
  for (let y = 6; y < 22; y += 6) for (let x = 3; x < 38; x += 1.6) g += iell(x, y, 2.44, 0.25, (Math.round(x / 1.6) % 2) ? "#e8402a" : WHITE);  // the lane ropes
  for (let k = 0; k < Math.min(3, n); k++) {  // the swimmers, each in his lane
    const t = ((frame / 20 + k * 0.37) % 2), u = t < 1 ? t : 2 - t, x = 4 + u * 32, y = 3 + k * 6, [px, py] = ipt(x, y, 2.6), arm = frame % 2;
    g += `<ellipse cx="${n2(px)}" cy="${n2(py)}" rx="2.4" ry=".9" fill="#ffffff" fill-opacity=".5"/><circle cx="${n2(px + (t < 1 ? 0.8 : -0.8))}" cy="${n2(py - 0.6)}" r=".9" fill="${["#e8402a", "#fbaa08", "#3a5ad0"][k]}"/>`
      + `<path stroke="#f1c27d" stroke-width=".5" d="M${n2(px)} ${n2(py - 0.4)}l${arm ? 1.6 : -1.6} -1.4"/>`;
  }
  for (let k = 0; k < Math.min(3, gold); k++) {  // the pink flamingos, bobbing
    const [px, py] = ipt(30 - k * 7, 17 - (k % 2) * 3, 3 + Math.sin(frame * Math.PI / 20 + k) * 0.3);
    g += `<ellipse cx="${n2(px)}" cy="${n2(py)}" rx="2.6" ry="1.2" fill="#f48ab0"/><ellipse cx="${n2(px)}" cy="${n2(py)}" rx="1.4" ry=".5" fill="#ffb8d0"/><path fill="none" stroke="#f48ab0" stroke-width=".9" stroke-linecap="round" d="M${n2(px + 2)} ${n2(py - 0.4)}q1 -2.6 -.4 -4q-.6 -.8 .4 -1.2"/><path fill="#1c1c22" d="M${n2(px + 2)} ${n2(py - 5.6)}l1 .5 -.9 .3z"/>`;
  }
  g += iline(ipt(37, 23, 2.4), ipt(37, 23, 8), "#c9ccd6", 0.5) + iline(ipt(39, 23, 2.4), ipt(39, 23, 8), "#c9ccd6", 0.5);
  for (const z of [4, 6]) g += iline(ipt(37, 23, z), ipt(39, 23, z), "#c9ccd6", 0.35);
  return g;
});
// the sandcastle: a mound, towers (n, up to 5: an agent whose tests are green), crenels, a little flag; washed: slumped
// by a wave (a red CI)
art("isosandcastle", 14, 14, 20, ({ n = 1, washed = false, frame = 0 }) => {
  const s = "#e2c88a", sd = "#c9ac6a";
  let g = ishadow(14, 14) + iell(7, 7, 0, 6.4, SAND);
  if (washed) return g + path([[1, 7, 0], [7, 1, 0], [13, 7, 0], [7, 13, 0], [7, 7, 3.4]], s) + iell(5, 9, 0.4, 3, "#3ab8d8", ' fill-opacity=".35"') + `<path fill="#3a8ad0" d="M${n2(ipt(10, 10, 2)[0])} ${n2(ipt(10, 10, 2)[1])}l1.6 -1 1.6 1z"/>`;
  g += ibox(2.4, 2.4, 9.2, 9.2, 0, 4, [shade(s, 1.1), s, sd]);
  for (let x = 2.4; x < 11.6; x += 1.8) g += ibox(x, 10.8, 0.9, 0.8, 4, 0.9, [shade(s, 1.1), s, sd]);
  const spots = [[3, 3], [9.4, 3], [3, 9.4], [9.4, 9.4], [6.2, 6.2]];
  for (let k = 0; k < Math.max(1, Math.min(5, n)); k++) {
    const [x, y] = spots[k], h = k === 4 ? 8 : 5;
    g += icyl(x + 0.8, y + 0.8, 4, h, 1.3, s, shade(s, 1.1)) + icyl(x + 0.8, y + 0.8, 4 + h, 1, 1.5, sd, s);
  }
  const [fx, fy] = ipt(7, 7, 17);
  return g + `<path stroke="#5a3a24" stroke-width=".3" d="M${n2(fx)} ${n2(fy + 4)}V${n2(fy - 2)}"/><path fill="#e8402a" d="M${n2(fx)} ${n2(fy - 2)}l${n2(2.4 + (frame % 2) * 0.4)} .8 -${n2(2.4 + (frame % 2) * 0.4)} .8z"/>`
    + `<path fill="#f4d8c8" d="M${n2(ipt(12, 3, 0.2)[0])} ${n2(ipt(12, 3, 0.2)[1])}q.8 -1.6 1.6 0z"/>`;
});
// the swim flag on its mast: green, yellow (orange) or red, a purple jellyfish one when nothing runs; it flaps (frame)
art("isoswimflag", 8, 8, 56, ({ c = "#2a9a4a", frame = 0 }) => {
  let g = ishadow(8, 8) + iell(4, 4, 0, 3, SAND) + icyl(4, 4, 0, 2, 2.2, "#c9ccd6", "#e6e6ea") + icyl(4, 4, 2, 44, 0.45, WHITE, "#ffffff");
  const [x, y] = ipt(4, 4, 46), f = frame % 4, wv = [0, 0.8, 0, -0.8][f];
  g += `<path fill="${c}" d="M${n2(x)} ${n2(y)}Q${n2(x + 4)} ${n2(y - 1 + wv)} ${n2(x + 8)} ${n2(y + 0.4)}L${n2(x + 8)} ${n2(y + 5.4)}Q${n2(x + 4)} ${n2(y + 4 - wv)} ${n2(x)} ${n2(y + 5)}Z"/>`;
  return g + `<circle cx="${n2(x)}" cy="${n2(y - 0.4)}" r=".7" fill="#c9ccd6"/>`;
});
// the tiki bar: a bamboo counter under a thatched roof, stools of bamboo, bottles, a pineapple, cocktails (on: shaking)
art("isotikibar", 30, 16, 50, ({ frame = 0, on = false }) => {
  let g = ishadow(30, 16);
  for (const [x, y] of [[0.4, 0.4], [28.4, 0.4], [0.4, 8], [28.4, 8]]) g += icyl(x + 0.6, y + 0.6, 0, 34, 0.6, BAMBOO, shade(BAMBOO, 1.2));
  g += ibox(1, 1, 28, 3, 10, 0.8, T3(TEAK));
  for (const [x, c] of [[3, "#3a8a3a"], [5, "#c0303a"], [7, "#e8c23a"], [9, "#5a3a24"], [22, "#3ab8d8"], [24, "#f4f2ea"]]) g += icyl(x, 2.4, 10.8, 3.6, 0.6, c, shade(c, 1.3)) + icyl(x, 2.4, 14.4, 1, 0.25, c, c);
  g += ibox(0, 8, 30, 6, 0, 12, T3(BAMBOO));
  for (let x = 0.6; x < 30; x += 1.4) g += ifront(x, 14, 0.25, 0, 12, shade(BAMBOO, 0.7));
  g += ibox(-0.4, 7.6, 30.8, 6.8, 12, 1.2, T3(TEAK));
  g += path([[-3, -2, 34], [33, -2, 34], [33, 18, 34], [-3, 18, 34]], shade(THATCH, 0.9)) + path([[-3, 18, 34], [33, 18, 34], [15, 8, 44]], THATCH) + path([[33, 18, 34], [33, -2, 34], [15, 8, 44]], shade(THATCH, 0.78));
  for (let x = -3; x < 33; x += 1.2) g += iline(ipt(x, 18, 34), ipt(x + 0.2, 18, 32.6 - h01(x, 3) * 1.2), shade(THATCH, 0.7), 0.5);
  const [px, py] = ipt(5, 10.6, 13.2);
  g += `<ellipse cx="${n2(px)}" cy="${n2(py - 1.4)}" rx="1.4" ry="1.8" fill="#e8b830"/><path fill="#3f9e4f" d="M${n2(px)} ${n2(py - 3)}l-1.4 -2 1 .6 .4 -1.6 .4 1.6 1 -.6z"/>`;
  for (const [x, c] of [[12, "#ff7aa8"], [16, "#3ab8d8"], [20, "#ffb030"]]) { const [cx, cy] = ipt(x, 10.6, 13.2); g += `<path fill="${c}" d="M${n2(cx - 1)} ${n2(cy - 2.4)}h2l-.6 2h-.8z"/><rect x="${n2(cx - 0.1)}" y="${n2(cy - 0.4)}" width=".2" height=".8" fill="${WHITE}"/><rect x="${n2(cx + 0.3)}" y="${n2(cy - 4.2)}" width=".25" height="2" fill="#e8402a"/><circle cx="${n2(cx - 0.7)}" cy="${n2(cy - 2.6)}" r=".5" fill="#f2d27a"/>`; }
  if (on) { const [sx, sy] = ipt(25, 10.6, 15 + (frame % 2) * 1.2); g += `<rect x="${n2(sx - 0.8)}" y="${n2(sy - 3)}" width="1.6" height="3" rx=".5" fill="#c9ccd6"/>`; }
  for (const x of [5, 15, 25]) g += icyl(x, 17.4, 0, 8, 0.35, BAMBOO, BAMBOO) + icyl(x, 17.4, 8, 0.8, 1.6, THATCH, shade(THATCH, 1.1));
  return g;
}, { mx: 4 });
// the DJ booth: a deck with two turntables that spin, a mixer, an equalizer whose bars follow the agents' activity (eq:
// 0..1), a laser fan when the set is on
art("isodjbooth", 20, 12, 40, ({ eq = 0.3, frame = 0, on = false }) => {
  // the panel at the back first (the deck stands in front of it), its sign slanted along its face
  let g = ishadow(20, 12) + ibox(0, 0, 20, 2, 0, 24, T3("#1c1c22")) + ifront(1, 2.01, 18, 13, 10, "#0e0e12")
    + `<text x="0" y="0" font-size="2.6" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#ff3b8a" transform="matrix(1 .5 0 1 ${n2(ipt(10, 2.02, 19.2)[0])} ${n2(ipt(10, 2.02, 19.2)[1])})">BEACH</text>` + `<text x="0" y="0" font-size="2.6" text-anchor="middle" font-family="sans-serif" font-weight="bold" fill="#ff3b8a" transform="matrix(1 .5 0 1 ${n2(ipt(10, 2.02, 15.4)[0])} ${n2(ipt(10, 2.02, 15.4)[1])})">CLUB</text>`;
  g += ibox(0, 2, 20, 10, 0, 11, T3("#1c1c22")) + ifront(0.6, 12, 18.8, 1, 9.4, "#2a2a33");
  for (let k = 0; k < 12; k++) { const h = Math.max(0.6, (0.3 + eq * 0.7) * 7.4 * Math.abs(Math.sin(frame * Math.PI / 4 + k * 1.3))); g += ifront(1.8 + k * 1.4, 12.01, 1, 2, h, h > 5 ? "#ff3b8a" : h > 3 ? "#fbaa08" : "#3ae8a8"); }
  g += ibox(-0.4, 1.6, 20.8, 10.8, 11, 0.8, T3("#2a2a33"));
  for (const x of [5, 15]) {
    g += iell(x, 7, 11.82, 3.6, "#1c1c22") + iell(x, 7, 11.83, 3, "#0e0e12");
    const a = (frame * Math.PI / 4) % (Math.PI * 2), [cx, cy] = ipt(x, 7, 11.84);
    g += `<path stroke="#3a3a44" stroke-width=".2" d="M${n2(cx)} ${n2(cy)}l${n2(Math.cos(a) * 2.6)} ${n2(Math.sin(a) * 1.3)}"/>` + iell(x, 7, 11.85, 0.8, x < 10 ? "#ff3b8a" : "#3ab8d8");
  }
  g += ibox(8.8, 4, 2.4, 6, 11.8, 0.8, T3("#3a3a44")) + [9.4, 10.2, 11].map(x => itop(x, 5, 0.3, 3, 12.62, "#c9ccd6")).join("");
  if (on) for (let k = 0; k < 5; k++) { const [lx, ly] = ipt(10, 1, 24), a = -Math.PI / 2 + (k - 2) * 0.35 + Math.sin(frame * Math.PI / 4) * 0.2; g += `<path stroke="${["#ff3b8a", "#3ae8a8", "#3ab8d8", "#fbaa08", "#b46bff"][k]}" stroke-width=".35" stroke-opacity=".8" d="M${n2(lx)} ${n2(ly)}l${n2(Math.cos(a) * 16)} ${n2(Math.sin(a) * 14)}"/>`; }
  return g;
}, { mx: 6 });
// the hammock between two palms: the net slung low, it swings (frame); a nap in it (on: someone's shape)
art("isopalmhammock", 32, 12, 60, ({ frame = 0, on = false, dry = false }) => {
  let g = ishadow(32, 12) + iell(3, 6, 0, 2.6, SAND) + iell(29, 6, 0, 2.6, SAND);
  const [ax, ay] = ipt(3, 6, 0), [bx, by] = ipt(29, 6, 0), sw = [0, 0.4, 0, -0.4][frame % 4];
  g += palm(ax, ay, 44, sw, -4, dry);
  const [p0x, p0y] = ipt(3, 6, 16), [p1x, p1y] = ipt(29, 6, 16), mx = (p0x + p1x) / 2 + sw * 2, my = (p0y + p1y) / 2 + 9;
  g += `<path fill="#e8c8a0" stroke="#c9a46a" stroke-width=".3" d="M${n2(p0x)} ${n2(p0y)}Q${n2(mx)} ${n2(my + 4)} ${n2(p1x)} ${n2(p1y)}Q${n2(mx)} ${n2(my - 1)} ${n2(p0x)} ${n2(p0y)}Z"/>`;
  for (let k = 1; k < 8; k++) { const t = k / 8, x = p0x + (p1x - p0x) * t, y = p0y + (p1y - p0y) * t + Math.sin(t * Math.PI) * 9; g += `<path stroke="#e8402a" stroke-width=".3" d="M${n2(x)} ${n2(y - 2)}v3.4"/>`; }
  if (on) g += `<ellipse cx="${n2(mx)}" cy="${n2(my)}" rx="5" ry="1.6" fill="#3a5ad0"/><circle cx="${n2(mx - 5)}" cy="${n2(my - 1.4)}" r="1.4" fill="#f1c27d"/><text x="${n2(mx + 3)}" y="${n2(my - 4)}" font-size="3" fill="#ffffff">z</text>`;
  return g + palm(bx, by, 46, -sw, 4, dry);
}, { mx: 10 });
// the parasol: a striped umbrella (c) on a pole stuck in the sand, a towel and flip-flops under it
art("isobeachparasol", 16, 16, 40, ({ c = "#e8402a" }) => {
  let g = ishadow(16, 16) + itop(3, 5, 7, 10, 0.1, c) + itop(3, 5, 7, 2, 0.11, WHITE) + itop(3, 9, 7, 2, 0.11, WHITE);
  g += itop(11, 4, 1.4, 2.6, 0.2, "#3ab8d8") + itop(12.8, 4.4, 1.4, 2.6, 0.2, "#3ab8d8");
  g += icyl(8, 8, 0, 30, 0.35, WHITE, WHITE);
  const R = 10, rim = Array.from({ length: 10 }, (_, k) => { const a = k * Math.PI / 5; return [8 + Math.cos(a) * R, 8 + Math.sin(a) * R, 26]; });
  for (let k = 0; k < 10; k++) g += path([[8, 8, 31], rim[k], rim[(k + 1) % 10]], k % 2 ? WHITE : c);
  for (const p of rim) { const [x, y] = ipt(...p); g += `<path fill="${c}" d="M${n2(x - 0.8)} ${n2(y)}q.8 1 1.6 0z"/>`; }
  return g;
}, { mx: 4 });
// a crab (screen units): a red shell, claws up, eyes on stalks; walk: sidestepping
const crab = (x, y, s = 1, k = 0, c = "#e8402a") => `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(2 * s)}" ry="${n2(1.3 * s)}" fill="${c}"/>`
  + [-1, 1].map(d => `<path fill="none" stroke="${c}" stroke-width="${n2(0.4 * s)}" d="M${n2(x + d * 1.6 * s)} ${n2(y + 0.4 * s)}l${n2(d * 1.2 * s)} ${n2(0.9 * s)}M${n2(x + d * 1.2 * s)} ${n2(y + 0.8 * s)}l${n2(d * 0.8 * s)} ${n2(1 * s)}"/>`
    + `<path fill="${c}" d="M${n2(x + d * 1.8 * s)} ${n2(y - 0.6 * s)}l${n2(d * 1 * s)} ${n2(-1.6 * s - (k % 2) * 0.4)}l${n2(d * 0.6 * s)} ${n2(0.8 * s)}z"/>`).join("")
  + [-0.6, 0.6].map(d => `<path stroke="${c}" stroke-width=".25" d="M${n2(x + d * s)} ${n2(y - 1 * s)}v${n2(-0.9 * s)}"/><circle cx="${n2(x + d * s)}" cy="${n2(y - 2 * s)}" r="${n2(0.35 * s)}" fill="#1c1c22"/>`).join("");
// the crabs' rock: a rock on a patch of sand, a tide pool; a crab per agent whose tests are red (n, up to 5), dancing
// sideways (frame); none: a single shell
art("isocrabs", 16, 12, 16, ({ n = 0, frame = 0 }) => {
  let g = ishadow(16, 12) + path([[0.4, 6, 0], [4, 0.6, 0], [12, 0.4, 0], [15.6, 6, 0], [12, 11.6, 0], [4, 11.4, 0]], SAND) + iell(11, 8, 0.05, 2.4, "#3ab8d8", ' fill-opacity=".6"');
  g += `<path fill="#8a8478" d="M${n2(ipt(3, 3, 0)[0])} ${n2(ipt(3, 3, 0)[1])}q2 -7 7 -6q4 1 3 6z"/><path fill="#a8a296" d="M${n2(ipt(3.6, 3, 0)[0])} ${n2(ipt(3.6, 3, 0)[1] - 1)}q2 -5 6 -5q-3 2 -4 5z"/>`;
  if (!n) return g + `<path fill="#f4d8c8" d="M${n2(ipt(10, 9, 0.2)[0])} ${n2(ipt(10, 9, 0.2)[1])}q1 -2 2 0z"/>`;
  for (let k = 0; k < Math.min(5, n); k++) { const [px, py] = ipt(4 + k * 2.4 + Math.sin(frame * Math.PI / 5 + k) * 1.4, 7 + (k % 2) * 2.6, 0.4); g += crab(px, py, 1, frame + k); }
  return g;
});
// the ice-cream cart: a striped awning, two wheels, the tubs of colours under glass, cones
art("isoicecart", 16, 10, 34, ({ c = "#f48ab0" }) => {
  let g = ishadow(16, 10) + ibox(1, 1, 14, 8, 4, 10, T3(WHITE)) + ifront(1, 9, 14, 6, 6, c) + ifront(1, 9.01, 14, 8.4, 1, WHITE);
  for (const x of [3, 13]) { const [px, py] = ipt(x, 9.4, 3); g += `<circle cx="${n2(px)}" cy="${n2(py)}" r="2.6" fill="#2a2a30"/><circle cx="${n2(px)}" cy="${n2(py)}" r="1" fill="#c9ccd6"/>`; }
  g += ibox(1.4, 1.4, 13.2, 7.2, 14, 1.4, T3("#c9ccd6"));
  for (const [x, col] of [[3, "#f4e8c8"], [6, "#5a3a24"], [9, "#f48ab0"], [12, "#8ad0a0"]]) g += itop(x - 1, 3, 2.4, 3, 15.42, col);
  g += itop(1.4, 1.4, 13.2, 7.2, 15.5, "#dfeaf2", ' fill-opacity=".35"');
  for (const x of [1.4, 14]) g += ibox(x, 1.4, 0.5, 0.5, 15.4, 12, T3("#c9ccd6"));
  for (let k = 0; k < 6; k++) g += path([[1 + k * 2.4, -0.6, 27.4], [3.4 + k * 2.4, -0.6, 27.4], [3.4 + k * 2.4, 10.6, 26.4], [1 + k * 2.4, 10.6, 26.4]], k % 2 ? WHITE : c);
  for (let k = 0; k < 6; k++) { const [px, py] = ipt(2.2 + k * 2.4, 10.6, 26.4); g += `<path fill="${k % 2 ? WHITE : c}" d="M${n2(px - 1.2)} ${n2(py)}q1.2 1.6 2.4 0z"/>`; }
  const [cx, cy] = ipt(15.6, 5, 12);
  return g + `<path fill="#d9a050" d="M${n2(cx)} ${n2(cy)}l-.8 -2.6h1.6z"/><circle cx="${n2(cx)}" cy="${n2(cy - 3)}" r=".9" fill="#f48ab0"/>`;
});
// the monstera in a woven basket: big split leaves; thirsty: yellowed
art("isomonsterabasket", 12, 12, 32, ({ dry = false, frame = 0 }) => {
  const leaf = dry ? "#b8a04a" : "#2f8a3a", vein = dry ? "#8a7a3a" : "#1f6a2a";
  let g = ishadow(12, 12) + icyl(6, 6, 0, 8, 4, "#c9a46a", "#d9b87a");
  for (let z = 1.4; z < 8; z += 1.6) g += iline(ipt(2.2, 9.6, z), ipt(9.8, 9.6, z), "#a07a4a", 0.25);
  const [bx, by] = ipt(6, 6, 8), sw = [0, 0.3, 0, -0.3][frame % 4];
  for (const [a, l, s] of [[-2.4, 12, 1], [-1.4, 14, 1.2], [-0.6, 11, 1], [-3, 9, 0.9], [-0.1, 9, 0.8]]) {
    const ex = bx + Math.cos(a) * l * 0.7 + sw, ey = by + Math.sin(a) * l * 1.2;
    g += `<path stroke="${vein}" stroke-width=".35" d="M${n2(bx)} ${n2(by)}L${n2(ex)} ${n2(ey)}"/><ellipse cx="${n2(ex)}" cy="${n2(ey)}" rx="${n2(3.4 * s)}" ry="${n2(2.6 * s)}" fill="${leaf}" transform="rotate(${n2(a * 57 + 90)} ${n2(ex)} ${n2(ey)})"/>`;
    for (const d of [-1, 1]) g += `<path stroke="${shade(leaf, 1.3)}" stroke-width=".25" d="M${n2(ex)} ${n2(ey)}l${n2(d * 2.2 * s)} ${n2(-0.6 * s)}"/>`;
  }
  return g;
}, { mx: 4 });
