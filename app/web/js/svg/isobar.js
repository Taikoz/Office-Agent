// The bar of the buy mode (items/bar.js), to build piece by piece: counters (straight, corner, the bartender's flap)
// that line up, a beer tap and a cocktail station on top, a back bar of bottles, a cash register, an ice machine, an
// under-counter fridge, a keg, a high stool. Drawn like the rest (svg/iso.js): boxes lit from the left; seen from
// the front (+y) the customers' side, from the back (rot ≥ 2) the bartender's side.

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const metal = c => [shade(c, 1.22), c, shade(c, 0.72)];
const STEEL = metal("#b8bcc6"), CHROME = ["#f4f6fa", "#c9ccd6", "#8d929c"], BRASS = ["#f2d27a", "#d4a640", "#a07a28"];
const BOTTLES = ["#7a3a12", "#2f6e3c", "#d9e6ea", "#8f2b46", "#c8902a", "#2a4a8a", "#5a2a14", "#e0c060"];
// a flat polygon from 3D points (a reflection on the mirror)
const ipoly2 = (pts, fill, more) => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const TOP_Z = 21;  // the counter's top (its slab is 1.6 thick: things stand at 22.6)

/* ---------- counters ---------- */
// the customers' side: panels, a kick plate, a brass foot rail; the bartender's side: shelves of glasses and bottles
function counterBody(w, d, { c = "#6d4a2e", t = "#2a2a30", back = false }, corner = false) {
  let g = ishadow(w, d) + ibox(0, 0.5, w, d - 0.5, 0, TOP_Z, metal(c)) + ifront(0, d, w, 0, 1.6, shade(c, 0.45));
  if (!back) {
    const n = Math.max(1, Math.round(w / 8));
    for (let i = 0; i < n; i++) g += ifront(i * w / n + 0.9, d, w / n - 1.8, 3, TOP_Z - 6, shade(c, 1.1)) + ifront(i * w / n + 1.4, d, w / n - 2.8, 3.5, TOP_Z - 7, shade(c, 0.9));
    if (corner) g += iside(w, 1.4, d - 2.8, 3, TOP_Z - 6, shade(c, 0.6));
    g += iline(ipt(0.4, d + 1.4, 4.2), ipt(w - 0.4, d + 1.4, 4.2), BRASS[1], 0.9) + iline(ipt(0.4, d + 1.4, 4.5), ipt(w - 0.4, d + 1.4, 4.5), BRASS[0], 0.3);
    for (const x of [1.2, w - 1.2]) g += iline(ipt(x, d, 4.2), ipt(x, d + 1.4, 4.2), BRASS[2], 0.6);
  } else {  // the bartender's side: two shelves, glasses upside down, a few bottles
    g += ifront(0.8, d, w - 1.6, 2, TOP_Z - 4, shade(c, 0.4));
    for (const z of [3, 11]) {
      g += ifront(0.8, d, w - 1.6, z, 0.5, shade(c, 1.2));
      for (let x = 1.6; x < w - 2; x += 2.2) g += z === 3 ? ifront(x, d, 1.2, z + 0.5, 3.4 + (Math.floor(x) % 2), BOTTLES[Math.floor(x * 3) % BOTTLES.length]) : ifront(x, d, 1.5, z + 0.5, 2.4, "#dfeaf2", ' fill-opacity=".85"');
    }
  }
  g += ibox(-0.4, -0.2, w + 0.8, d + 1, TOP_Z, 1.6, metal(t)) + itop(-0.4, -0.2, w + 0.8, d + 1, TOP_Z + 1.6, "#ffffff", ' fill-opacity=".08"');
  return g;
}
art("isobarcounter", 24, 12, 30, o => counterBody(24, 12, o));
art("isobarcorner", 12, 12, 30, o => counterBody(12, 12, o, true));
// the flap: a swinging half door under a top that lifts (a seam and a brass hinge); the way behind the bar
art("isobarflap", 12, 12, 30, ({ c = "#6d4a2e", t = "#2a2a30", back = false }) => {
  let g = ishadow(12, 12) + ibox(0, 0.5, 1.4, 11.5, 0, TOP_Z, metal(c)) + ibox(10.6, 0.5, 1.4, 11.5, 0, TOP_Z, metal(c));
  g += ibox(1.4, 11, 9.2, 0.8, 3, 13, metal(shade(c, 1.12)));  // the half door
  if (!back) for (let k = 0; k < 5; k++) g += ifront(2, 11.8, 8, 5 + k * 2.2, 0.8, shade(c, 0.7));
  g += ibox(-0.4, -0.2, 12.8, 13, TOP_Z, 1.6, metal(t)) + iline(ipt(6, -0.2, TOP_Z + 1.62), ipt(6, 12.8, TOP_Z + 1.62), shade(t, 0.5), 0.35);
  return g + ifront(5.4, 12.8, 1.2, TOP_Z + 0.4, 0.8, BRASS[1]);
});

/* ---------- on the counter ---------- */
// the beer tap: a drip tray, a chrome T tower, three taps and their handles; a pint filling under the middle one
art("isobeertap", 12, 5, 18, ({ pouring = false, empty = false, frame = 0 }) => {
  let g = ibox(0.5, 1, 11, 4, 0, 0.8, STEEL);
  for (let x = 1; x < 11; x += 1.2) g += iline(ipt(x, 1.4, 0.82), ipt(x, 4.6, 0.82), "#6a6f78", 0.25);
  g += icyl(6, 2.4, 0.8, 9, 0.9, CHROME[2], CHROME[0]) + ibox(1, 1.8, 10, 1.4, 9.8, 2.4, CHROME);
  const handles = empty ? ["#8d929c", "#8d929c", "#8d929c"] : ["#c8902a", "#8f2b46", "#1c1c22"];
  [2.4, 6, 9.6].forEach((x, i) => {
    g += ibox(x - 0.4, 2.9, 0.8, 1.2, 8.2, 1.8, CHROME) + ibox(x - 0.5, 2, 1, 1, 12.2, 4.6, metal(handles[i])) + ifront(x - 0.5, 3, 1, 15, 1, "#f4f2ea");
  });
  if (pouring) {
    const k = [0.35, 0.65, 0.95][frame % 3];
    g += iline(ipt(6, 4.2, 8.2), ipt(6, 4.2, 1 + 5.6 * k), "#f2b632", 0.5);
    g += ibox(5, 3.4, 2, 1.8, 0.8, 5.6, ["#f4f8ff55", "#dfeaf244", "#c9d6e044"]) + ibox(5.1, 3.5, 1.8, 1.6, 0.8, 5.4 * k, ["#f7c948", "#f2b632", "#c8902a"]);
    if (k > 0.9) g += ibox(5.1, 3.5, 1.8, 1.6, 6.2, 0.8, "#fffaf0");
  }
  return g;
});
// the cocktail station: a rubber mat, a shaker (shaken: frame), a jigger, a bowl of limes, two bottles, a glass
art("isococktail", 12, 7, 14, ({ frame = 0, shaking = false }) => {
  let g = ibox(0, 0.5, 12, 6.5, 0, 0.5, ["#2a2a30", "#1c1c22", "#141418"]);
  const up = shaking ? [0, 2, 1][frame % 3] : 0;
  g += icyl(2.2, 3, 0.5 + up, 5.2, 1.2, CHROME[2], CHROME[0]) + icyl(2.2, 3, 5.7 + up, 1.4, 0.8, CHROME[1], CHROME[0]);
  g += icyl(4.8, 5, 0.5, 1.6, 0.6, CHROME[2], CHROME[1]);
  g += icyl(7, 2.6, 0.5, 1.2, 1.6, "#e6e2d8", "#d9d4c8");
  for (const [x, y] of [[6.4, 2.2], [7.6, 2.4], [7, 3.2]]) g += iell(x, y, 1.8, 0.6, "#7ac84a");
  g += icyl(10, 2, 0.5, 6, 0.8, "#8f2b46", shade("#8f2b46", 1.2)) + icyl(10, 2, 6.5, 1.6, 0.3, "#2a2a30", "#2a2a30");
  g += icyl(9.6, 4.6, 0.5, 5, 0.8, "#d9e6ea", "#eef4f6") + icyl(9.6, 4.6, 5.5, 1.4, 0.3, "#c8902a", "#c8902a");
  const [x, y] = ipt(5.4, 5.6, 0.5);  // a cocktail glass: stem, cone, drink, umbrella
  g += `<path fill="none" stroke="#dfeaf2" stroke-width=".35" d="M${n2(x)} ${n2(y)}v-2.4M${n2(x - 1)} ${n2(y)}h2"/><path fill="#ff7aa8" fill-opacity=".85" d="M${n2(x - 1.6)} ${n2(y - 4.4)}h3.2l-1.6 2Z"/>`;
  return g + `<path fill="none" stroke="#f4f2ea" stroke-width=".3" d="M${n2(x + 0.6)} ${n2(y - 4.2)}l1 -2.4"/><path fill="#fbaa08" d="M${n2(x + 0.2)} ${n2(y - 6.6)}q1.2 -1 2.4 0z"/>`;
});
// the cash register: a brass body, its keys, the drawer (open: out), the amount flag on top
art("isoregister", 9, 7, 13, ({ open = false }) => {
  let g = ibox(0.5, 0.5, 8, 6, 0, 2.4, BRASS) + (open ? ibox(1, 5, 7, 3, 0.4, 1.6, metal("#8a6a4a")) + itop(1.6, 5.4, 5.8, 2.2, 2.02, "#2f7a45") : "");
  g += ibox(0.8, 0.8, 7.4, 4.4, 2.4, 4.2, BRASS);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) g += iell(1.6 + k * 1.4, 1.6 + r * 1.2, 6.62, 0.36, r === 2 && k === 4 ? "#d64545" : "#f4f2ea");
  g += ibox(2.6, 1, 4, 1.2, 6.6, 3, BRASS) + ifront(3, 2.2, 3.2, 7.4, 1.8, "#1c1c22") + ifront(3.3, 2.2, 2.6, 7.7, 1.2, "#7dff8a", ' fill-opacity=".9"');
  return g;
});

/* ---------- behind the bar ---------- */
// the back bar: a cabinet, a mirror, three glass shelves of bottles lit from under, a crown
art("isobottleshelf", 30, 8, 54, ({ w = "#4a2f1e", lit = true, back = false }) => {
  const W = metal(w);
  let g = ishadow(30, 8) + ibox(0, 0, 30, 8, 0, 14, W);
  if (back) return g + ibox(0, 0, 30, 2, 14, 32, W) + ibox(-0.5, -0.5, 31, 3, 46, 2.4, W);
  for (const x of [1, 15.5]) g += ifront(x, 8, 13.5, 1.5, 11, shade(w, 1.15)) + ifront(x + 6, 8, 1.4, 6.5, 0.8, BRASS[1]);
  g += ibox(0, 0, 30, 1.2, 14, 32, W) + ifront(1, 1.2, 28, 15, 30, "#9fb8c8") + ifront(1, 1.2, 28, 15, 30, "#ffffff", ' fill-opacity=".12"');
  g += ipoly2([[4, 1.2, 44], [10, 1.2, 44], [3, 1.2, 16], [1, 1.2, 16], [1, 1.2, 40]], "#ffffff", ' fill-opacity=".1"');
  for (const [k, z] of [[0, 16], [1, 25], [2, 34]]) {
    g += ibox(0.6, 1.2, 28.8, 5.2, z, 0.5, ["#e6f2f7cc", "#c9dde6cc", "#a8c0cccc"]);
    if (lit) g += ifront(0.6, 6.4, 28.8, z - 1, 1, "#ffd27a", ' fill-opacity=".55"');
    for (let i = 0; i < 9; i++) {
      const x = 2 + i * 3.1 + (k % 2) * 0.8, c = BOTTLES[(i * 3 + k * 2) % BOTTLES.length], h = 4.2 + ((i + k) % 3) * 0.9;
      g += icyl(x, 3.6, z + 0.5, h, 0.8, c, shade(c, 1.25)) + icyl(x, 3.6, z + 0.5 + h, 1.6, 0.3, shade(c, 0.8), shade(c, 0.9)) + ifront(x - 0.5, 4.4, 1, z + 1.6, 1.4, "#f4f2ea", ' fill-opacity=".85"');
    }
  }
  return g + ibox(-0.5, -0.5, 31, 9, 46, 2.4, W) + ifront(-0.5, 8.5, 31, 46.6, 0.5, BRASS[1]);
});
// the ice machine: stainless steel, a sloped bin door, a blue plate, vents; its little light
art("isoicemachine", 12, 11, 26, ({ lit = true }) => {
  let g = ishadow(12, 11) + ibox(0, 0, 12, 11, 0, 22, STEEL);
  for (let k = 0; k < 4; k++) g += ifront(2, 11, 8, 2 + k * 1.2, 0.5, "#6a6f78");
  g += ifront(1, 11, 10, 8, 10, "#d2d6de") + ifront(1.4, 11, 9.2, 17, 0.8, "#9aa0ad") + ifront(3.4, 11, 5.2, 12, 2.4, "#2a6fd0") + ifront(4, 11, 4, 12.6, 1.2, "#f4f8ff");
  return g + iell(10, 10.6, 20.4, 0.4, lit ? "#51cf66" : "#3a3a44");
});
// the under-counter fridge: black steel, two glass doors, bottles in rows, lit inside
art("isobarfridge", 14, 10, 24, ({ c = "#1c1c22", lit = true }) => {
  let g = ishadow(14, 10) + ibox(0, 0, 14, 10, 0, 20, metal(c));
  for (const x of [0.8, 7.2]) {
    g += ifront(x, 10, 6, 1.4, 17, lit ? "#cfe8ff" : "#6a7a8a");
    for (const z of [3, 9]) { g += ifront(x + 0.3, 10, 5.4, z, 0.3, "#8d929c"); for (let k = 0; k < 4; k++) g += ifront(x + 0.6 + k * 1.3, 10, 0.8, z + 0.3, 4.4, BOTTLES[(k + z) % BOTTLES.length]); }
    g += ifront(x, 10, 6, 1.4, 17, "#ffffff", ` fill-opacity="${lit ? 0.18 : 0.08}"`) + ifront(x + (x < 4 ? 5.2 : 0.2), 10, 0.6, 7, 6, "#c9ccd6");
  }
  return g;
});
// a keg: stainless, two rings, its coupler and hose on top; full: dewy, empty: dull
art("isokeg", 9, 9, 18, ({ full = true }) => {
  const side = full ? "#b8bcc6" : "#8d929c";
  let g = ishadow(9, 9, 0) + icyl(4.5, 4.5, 0, 12, 3.6, side, shade(side, 1.15));
  for (const z of [2.4, 9.4]) g += icyl(4.5, 4.5, z, 0.8, 3.75, shade(side, 0.75), shade(side, 0.9));
  g += icyl(4.5, 4.5, 12, 1.6, 1.4, "#2a2a30", "#3a3a44") + iline(ipt(4.5, 4.5, 13.4), ipt(8, 2, 10), "#2a2a30", 0.6);
  if (full) for (const [x, z] of [[2, 6], [5.6, 4], [3.4, 8]]) g += iell(x, 8, z, 0.3, "#ffffff", ' fill-opacity=".7"');
  return g;
});
// a high stool with a low back: a round foot, a footrest ring, a padded seat
art("isobarstoolback", 9, 9, 24, ({ c = "#8f2b46" }) => {
  let g = ishadow(9, 9, 0) + iell(4.5, 4.5, 0.4, 3.2, "#2a2a30") + ibox(4, 4, 1, 1, 0, 13, ["#c9ccd6", "#8d929c", "#6a6f78"]);
  g += iell(4.5, 4.5, 5, 2.6, "none", ' stroke="#c9ccd6" stroke-width=".5"');
  g += icyl(4.5, 4.5, 13, 1.6, 3, shade(c, 0.75), c) + iell(4.5, 4.5, 14.62, 2.2, shade(c, 1.2), ' fill-opacity=".5"');
  return g + ibox(1.6, 1.2, 5.8, 1, 14.4, 5, metal(c));
});
