// The kitchen, Sims style (items/kitchenset.js): base units all 10 deep with their worktop at the same height (16.4),
// so they line up into one run; a sink, a dishwasher, an island; stoves and fridges of several kinds (their body in
// #f2f2ef / #d8d8d2 / #b8b8b2, recoloured by the appliance styles); a microwave on the worktop; wall cabinets, a hood.

import { SvgArt, shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, T, reg } = ISO_KIT;
const art = (name, w, d, H, body) => reg(class extends IsoArt { constructor() { super(name, w, d, H); } body(o) { return body(o); } });
const BODY = ["#f2f2ef", "#d8d8d2", "#b8b8b2"], STEEL = ["#e6e8ee", "#c9ccd6", "#a7acb6"];
export const TOP_Z = 16.4;

/* ---------- base units: plinth, carcass, worktop (f: front, t: worktop, h: handles) ---------- */
function carcass(w, d, { f, t }) {
  let g = ibox(0.4, 0.8, w - 0.8, d - 1, 0, 1, "#1c1c22") + ibox(0, 0, w, d - 0.4, 1, 13.6, T(f)) + ibox(0, 0, w, d, 14.6, 1.8, T(t));
  if (t === "#e8e6e0") g += iline(ipt(1, d, 16.2), ipt(w * 0.4, d, 15), "#b8b8c0", 0.2) + iline(ipt(w * 0.6, 2, 16.41), ipt(w - 1, d - 2, 16.41), "#c9c9d0", 0.2);  // marble veins
  return g;
}
const drawers = (x, w, d, f, h, n = 3) => Array.from({ length: n }, (_, i) => { const z = 1.6 + i * 13 / n, hh = 13 / n - 0.8; return ifront(x + 0.6, d - 0.4, w - 1.2, z, hh, shade(f, 0.94)) + ifront(x + w / 2 - 2, d - 0.4, 4, z + hh - 1.2, 0.5, h); }).join("");
const doors = (x, w, d, f, h) => ifront(x + 0.6, d - 0.4, w / 2 - 0.9, 1.6, 12.4, shade(f, 0.94)) + ifront(x + w / 2 + 0.3, d - 0.4, w / 2 - 0.9, 1.6, 12.4, shade(f, 0.94))
  + ifront(x + w / 2 - 1.4, d - 0.4, 0.5, 9.5, 3.4, h) + ifront(x + w / 2 + 0.9, d - 0.4, 0.5, 9.5, 3.4, h);
art("isokbase", 14, 10, 18, o => carcass(14, 10, o) + drawers(0, 14, 10, o.f, o.h));
art("isokdoor", 14, 10, 18, o => carcass(14, 10, o) + doors(0, 14, 10, o.f, o.h));
// the sink: a steel basin cut in the worktop, a gooseneck tap, doors below; water running while used
art("isoksink", 14, 10, 26, ({ on = false, ...o }) => {
  let g = carcass(14, 10, o) + doors(0, 14, 10, o.f, o.h) + itop(2, 2, 10, 6.5, 16.42, STEEL[2]) + itop(2.6, 2.6, 8.8, 5.3, 16.44, "#8d929c") + iell(6.8, 5.2, 16.46, 0.5, "#55565e");
  g += ibox(6.4, 0.6, 1, 1, 16.4, 7, STEEL) + ibox(6.4, 0.6, 1, 3.4, 23.4, 1, STEEL) + ibox(6.4, 3.4, 1, 0.8, 21.6, 1.8, STEEL) + ibox(8.4, 0.8, 0.8, 0.8, 16.4, 1.6, STEEL);
  return g + (on ? `<path fill="#9fd8f0" fill-opacity=".8" d="M${ipt(6.7, 3.8, 21.6).join(" ")}L${ipt(7.2, 3.8, 21.6).join(" ")}L${ipt(7.2, 3.8, 16.5).join(" ")}L${ipt(6.7, 3.8, 16.5).join(" ")}Z"/>` + iell(7, 4, 16.5, 1.2, "#bfe8f8", ' fill-opacity=".7"') : "");
});
// the dishwasher: a full front, its control strip, a light while it runs
art("isokdish", 14, 10, 18, ({ on = false, k = 0, ...o }) => carcass(14, 10, o) + ifront(0.6, 9.6, 12.8, 1.6, 11, shade(o.f, 0.96)) + ifront(0.6, 9.6, 12.8, 12.8, 1.4, "#2a2a33")
  + ifront(2, 9.6, 6, 11, 0.5, o.h) + ifront(10, 9.6, 1, 13.1, 0.8, on ? (k % 2 ? "#51cf66" : "#2a8a3a") : "#55565e") + ifront(11.6, 9.6, 0.8, 13.1, 0.8, "#3bc4ff"));
// the island: drawers on the kitchen side, a worktop overhang and an open shelf on the other
art("isokisland", 28, 14, 18, o => {
  let g = ishadow(28, 14, 0) + ibox(0.4, 2.8, 27.2, 10.8, 0, 1, "#1c1c22") + ibox(0, 2.4, 28, 11.2, 1, 13.6, T(o.f)) + drawers(0, 14, 14, o.f, o.h) + drawers(14, 14, 14, o.f, o.h, 2);
  return g + ibox(0, 0, 28, 14, 14.6, 1.8, T(o.t)) + itop(0, 0, 28, 2.4, 16.41, shade(o.t, 0.93));  // the overhang, a stool's knees under it
});
// the microwave: on the worktop (a top object); its window lights orange and the plate turns while it heats
art("isomicrowave", 10, 7, 8, ({ on = false, k = 0 }) => {
  let g = ibox(0, 0, 10, 7, 0, 6, BODY) + ifront(0.6, 7, 6.4, 0.8, 4.4, "#1c1c24") + ifront(7.6, 7, 1.8, 0.8, 4.4, "#3a3a46");
  if (on) g += ifront(0.9, 7, 5.8, 1.1, 3.8, "#ff9f43", ' fill-opacity=".85"') + ifront(1.6 + (k % 4) * 1.1, 7, 1.4, 1.4, 1.2, "#fff3b0");
  return g + ifront(8, 7, 1, 4, 0.6, on ? "#ff3b3b" : "#51cf66") + ifront(8.1, 7, 0.8, 1.6, 0.8, "#c9ccd6") + ifront(6.7, 7, 0.3, 1.4, 3, "#c9ccd6");
});

/* ---------- stoves (on = the oven cooking) ---------- */
const burner = (x, y, z, r, on) => iell(x, y, z, r, "#55556a") + iell(x, y, z + 0.1, r * 0.55, on ? "#5aa9ff" : "#1c1c24");
// the vintage enamel cooker: rounded edges, a chrome rail, a splashback with a clock
art("isostoveretro", 16, 10, 26, ({ on = false }) => {
  let g = ishadow(16, 10, 0) + ibox(0, 0, 16, 10, 0, 1.4, "#2a2a30") + ibox(0, 0, 16, 10, 1.4, 14.6, BODY) + itop(0.6, 0.6, 14.8, 8.8, 16.02, "#2a2a33");
  for (const [x, y] of [[4, 3], [12, 3], [4, 7.2], [12, 7.2]]) g += burner(x, y, 16.05, 1.9, on && x < 5);
  g += ibox(0, -1.4, 16, 1.6, 16, 7, BODY) + iell(8, 0.2, 21, 1.6, "#f7f2e2") + iline(ipt(8, 0.2, 21), ipt(8, 0.2, 22.2), "#1c1c22", 0.25);
  g += ifront(0, 10, 16, 13.6, 0.6, STEEL[1]) + ifront(1.6, 10, 12.8, 3, 9, "#b8b8b2") + ifront(2.8, 10, 10.4, 4.2, 6.4, on ? "#ff9f43" : "#1c1c24") + ifront(2.4, 10, 11.2, 11.2, 0.6, STEEL[0]);
  for (let i = 0; i < 4; i++) g += iell(2.4 + i * 3.7, 10, 14.6, 0.6, "#2a2a30");
  return g;
});
// the induction hob over a built-in oven, in a base unit (its front in the kitchen's colours)
art("isostoveinduction", 14, 10, 18, ({ on = false, ...o }) => {
  let g = carcass(14, 10, o) + itop(0.8, 0.8, 12.4, 8.4, 16.42, "#14141a");
  for (const [x, y, r] of [[4, 3.4, 2], [10, 3.4, 1.5], [4, 7.4, 1.5], [10, 7.4, 2]]) g += iell(x, y, 16.44, r, "none", ` stroke="${on && x < 5 && y < 4 ? "#ff5a3b" : "#4a4a58"}" stroke-width=".25"`);
  g += ifront(0.6, 9.6, 12.8, 1.6, 10.6, "#1c1c22") + ifront(1.4, 9.6, 11.2, 2.6, 7, on ? "#ff9f43" : "#0e0e14") + ifront(1.4, 9.6, 11.2, 10.6, 0.5, "#c9ccd6");
  return g + ifront(5.4, 9.6, 3.2, 12.6, 1, "#2a2a33") + ifront(6, 9.6, 2, 12.9, 0.4, on ? "#ff5a3b" : "#3bc4ff");
});
// the professional range: 6 burners on cast-iron grates, two ovens, big knobs, a rail
art("isostovepro", 24, 10, 24, ({ on = false }) => {
  let g = ishadow(24, 10, 0) + ibox(0, 0, 24, 10, 0, 1.6, "#2a2a30") + ibox(0, 0, 24, 10, 1.6, 14.4, BODY) + itop(0.4, 0.4, 23.2, 9.2, 16.02, "#1c1c22");
  for (const [x, y] of [[3.8, 3], [12, 3], [20.2, 3], [3.8, 7.2], [12, 7.2], [20.2, 7.2]]) g += burner(x, y, 16.05, 1.8, on && x < 5);
  for (const x of [8, 16]) g += iline(ipt(x, 0.6, 16.3), ipt(x, 9.4, 16.3), "#3a3a46", 0.5);
  g += ibox(0, -1.2, 24, 1.4, 16, 6, BODY) + ifront(0, 10, 24, 13.2, 0.7, STEEL[0]);
  for (let i = 0; i < 6; i++) g += iell(2.2 + i * 3.9, 10, 14.6, 0.75, "#1c1c22") + iell(2.2 + i * 3.9, 10, 14.6, 0.35, STEEL[1]);
  for (const x of [1, 12.6]) g += ifront(x, 10, 10.4, 2.6, 9.4, "#b8b8b2") + ifront(x + 1, 10, 8.4, 3.6, 6, on && x < 5 ? "#ff9f43" : "#1c1c24") + ifront(x + 0.8, 10, 8.8, 10.4, 0.6, STEEL[0]);
  return g;
});

/* ---------- fridges (on = open a moment) ---------- */
const fridgeInside = (x, w, d, z0, h) => ifront(x, d, w, z0, h, "#f8fbff") + [0.25, 0.5, 0.75].map(k => ifront(x, d, w, z0 + h * k, 0.4, "#c9d7e6")).join("")
  + ifront(x + 1, d, 2.4, z0 + 1, 2.6, "#ff6b6b") + ifront(x + w * 0.5, d, 3, z0 + h * 0.3, 3, "#51cf66") + ifront(x + 1.4, d, 2.6, z0 + h * 0.55, 3.2, "#fbaa08");
// the American fridge: two doors side by side, the ice and water dispenser
art("isofridgeus", 22, 12, 38, ({ on = false }) => {
  let g = ishadow(22, 12, 0) + ibox(0, 0, 22, 12, 0, 36, BODY) + ifront(10.8, 12, 0.4, 0.8, 35, "#8a8a92");
  g += ifront(9.6, 12, 0.7, 12, 14, "#8a8a92") + ifront(11.7, 12, 0.7, 12, 14, "#8a8a92") + ifront(2.6, 12, 5, 18, 7, "#3a3a46") + ifront(3.4, 12, 3.4, 18.8, 2, "#9fd8f0") + ifront(4.4, 12, 1.4, 22.4, 1.6, "#3bc4ff");
  if (on) g += fridgeInside(11.4, 10, 12, 1, 34);
  return g + itop(0, 0, 22, 12, 36.05, "#ffffff", ' fill-opacity=".25"');
});
// the retro fridge of the fifties: a rounded top, a big chrome lever handle, its badge
art("isofridgeretro", 16, 10, 36, ({ on = false }) => {
  const [x0, y0] = ipt(0, 10, 30), [x1, y1] = ipt(16, 10, 30), [x2, y2] = ipt(16, 0, 30);
  let g = ishadow(16, 10, 0) + ibox(0.6, 0.6, 14.8, 8.8, 0, 1.4, "#2a2a30") + ibox(0, 0, 16, 10, 1.4, 28.6, BODY);
  g += `<path fill="#f2f2ef" d="M${n2(x0)} ${n2(y0)}Q${n2((x0 + x1) / 2)} ${n2(y0 - 5)} ${n2(x1)} ${n2(y1)}L${n2(x2)} ${n2(y2)}Q${n2((x1 + x2) / 2)} ${n2(y2 - 4)} ${n2(x2 - 1)} ${n2(y2 - 1)}Z"/>`;
  g += ifront(0.6, 10, 14.8, 21, 0.4, "#b8b8b2") + ibox(12.4, 9.6, 1.2, 1.2, 14, 6, STEEL) + ibox(11.6, 10, 2.4, 0.8, 19.6, 1, STEEL) + ifront(5.4, 10, 5, 25, 1.6, STEEL[0]) + ifront(6, 10, 3.8, 25.3, 1, "#c0303a");
  if (on) g += fridgeInside(1, 14, 10, 2, 18);
  return g;
});
// the mini fridge: under a worktop or beside a sofa
art("isofridgemini", 10, 9, 15, ({ on = false }) => {
  let g = ishadow(10, 9, 0) + ibox(0, 0, 10, 9, 0, 13, BODY) + ifront(7.8, 9, 0.8, 5, 5, "#8a8a92") + ifront(1, 9, 4, 10.6, 1.4, "#fbaa08");
  return g + (on ? fridgeInside(0.8, 8.4, 9, 1, 11) : "") + itop(0, 0, 10, 9, 13.05, "#ffffff", ' fill-opacity=".2"');
});
// the built-in fridge: a tall unit with the kitchen's fronts, long bar handles
art("isofridgebuilt", 14, 10, 40, ({ on = false, ...o }) => {
  let g = ishadow(14, 10, 0) + ibox(0.4, 0.8, 13.2, 9, 0, 1, "#1c1c22") + ibox(0, 0, 14, 10, 1, 37, T(o.f));
  g += ifront(0.6, 10, 12.8, 1.6, 11, shade(o.f, 0.94)) + ifront(0.6, 10, 12.8, 13.2, 24, shade(o.f, 0.94)) + ifront(11, 10, 0.6, 5, 6, o.h) + ifront(11, 10, 0.6, 16, 14, o.h);
  return g + (on ? fridgeInside(1, 12, 10, 13.4, 23) : "") + itop(0, 0, 14, 10, 38.05, shade(o.f, 1.15));
});

/* ---------- on the wall (2D, in the wall's strip; a shade under them for the volume) ---------- */
class FlatArt extends SvgArt {
  constructor(name, w, h, fn) { super(name, w, h); this.fn = fn; }
  body(o) { return this.fn(o); }
}
const R = (x, y, w, h, c, more = "") => `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" fill="${c}"${more}/>`;
export const KWALL = new FlatArt("kwallcab", 14, 18, ({ f = "#f4f4f0", h = "#8d929c" }) => R(0, 0, 14, 16, shade(f, 0.86)) + R(0.6, 0.4, 6.2, 14.8, f) + R(7.2, 0.4, 6.2, 14.8, f)
  + R(5.6, 10.6, 0.5, 3.4, h) + R(7.9, 10.6, 0.5, 3.4, h) + R(0, 16, 14, 2, "#000", ' fill-opacity=".18"') + R(0, 0, 14, 0.6, shade(f, 1.12)));
export const KOPEN = new FlatArt("kwallopen", 14, 18, ({ f = "#f4f4f0" }) => R(0, 0, 14, 16, shade(f, 0.86)) + R(0.8, 0.8, 12.4, 14.4, shade(f, 0.55)) + R(0.8, 7.6, 12.4, 0.8, f)
  + ["#f4f2ea", "#7fc4ff", "#ff9f43"].map((c, i) => R(1.6 + i * 3.8, 3.6, 2.6, 4, c)).join("") + ["#e8e6e0", "#51cf66", "#c0303a"].map((c, i) => R(1.6 + i * 3.8, 11.4, 2.8, 3.8, c)).join("") + R(0, 16, 14, 2, "#000", ' fill-opacity=".18"'));
export const KHOOD = new FlatArt("kwallhood", 14, 22, ({ c = "#c9ccd6", on = false }) => `<path fill="${c}" d="M4.6 0H9.4V12H4.6Z"/><path fill="${shade(c, 0.85)}" d="M0 15L4 11H10L14 15V18H0Z"/>`
  + R(0, 18, 14, 1.2, shade(c, 0.7)) + R(1, 19.2, 12, 0.6, on ? "#fff3b0" : "#3a3a46") + R(5.4, 0, 0.6, 12, shade(c, 1.15)) + (on ? R(1, 19.8, 12, 2.2, "#fff3b0", ' fill-opacity=".35"') : ""));
export const KSPICE = new FlatArt("kwallspice", 18, 12, ({ w = "#a8784a" }) => R(0, 4.4, 18, 1, w) + R(0, 10, 18, 1, w) + R(0.6, 5.4, 0.8, 4.6, shade(w, 0.75)) + R(16.6, 5.4, 0.8, 4.6, shade(w, 0.75))
  + ["#c0303a", "#e8c23a", "#51cf66", "#8a5a2a", "#f4f2ea"].map((c, i) => R(2 + i * 3, 1, 2, 3.4, "#e6eef4", ' fill-opacity=".8"') + R(2 + i * 3, 2.2, 2, 2.2, c) + R(2 + i * 3, 0.6, 2, 0.6, "#2a2a30")).join("")
  + [0, 1, 2, 3].map(i => R(2.4 + i * 3.6, 6.4, 2.4, 3.6, ["#9a5a2a", "#f4f2ea", "#2f6e4c", "#d8a0a8"][i])).join("") + R(0, 11, 18, 1, "#000", ' fill-opacity=".15"'));

/* ---------- coffee machines, from the worst to the best (items/catalog2.js), each on its stand ---------- */
const stand = (w, d, c = "#8a6a4a") => ishadow(w, d, 0) + ibox(0, 0, w, d, 0, 13, T(c)) + ifront(1, d, w - 2, 1.5, 10, shade(c, 0.88)) + ibox(0, 0, w, d, 13, 1, T(shade(c, 1.1)));
// the drip coffee maker: a black body, the glass jug, its warming plate
art("isocoffeefilter", 14, 8, 30, ({ c = "#1c1c22", on = false }) => {
  let g = stand(14, 8) + ibox(3, 1, 8, 5, 14, 2, T(c)) + ibox(3, 1, 8, 2.6, 16, 10, T(c)) + ibox(3, 1, 8, 5, 26, 1.6, T(c));
  g += ibox(4.4, 3.6, 5, 3.4, 16, 5.6, ["#dfe8ee", "#cfdde6", "#b8c6d0"], ' fill-opacity=".55"') + ifront(4.4, 7, 5, 16.2, 2.6, "#5a3418", ' fill-opacity=".9"');
  return g + ifront(9.6, 6, 0.8, 21.5, 0.8, on ? "#ff3b3b" : "#7a2020") + ibox(8.4, 4, 1, 1, 21.2, 1, T("#2a2a30"));
});
// the capsule machine: a sleek body in a colour, a drip tray, a box of coloured capsules
art("isocoffeecapsule", 14, 8, 30, ({ c = "#c0303a", on = false }) => {
  let g = stand(14, 8) + ibox(3, 1, 6, 6, 14, 11, T(c)) + ibox(3, 0.6, 6, 6.8, 25, 1.2, T(shade(c, 1.15))) + ibox(4, 5, 4, 2, 14, 0.8, T("#2a2a30"));
  g += ibox(5, 5.2, 2, 1.4, 16.2, 1.8, T("#f4f2ea")) + ifront(4, 7, 4, 21, 1.6, "#1c1c22") + ifront(4.4, 7, 0.8, 21.4, 0.8, on ? "#51cf66" : "#3a3a46");
  for (const [i, k] of ["#c0303a", "#e8c23a", "#2a6fd0", "#2a2a30", "#51cf66"].entries()) g += iell(10.5 + (i % 2) * 1.6, 2 + i * 1.1, 14.6, 0.7, k);
  return g + ibox(9.6, 1, 3.4, 6, 14, 0.6, T("#3a3a46"));
});
// the lever espresso machine of a real barista: two group heads, long levers, a dome, a gauge, cups warming on top
art("isocoffeepro", 26, 9, 40, ({ c = "#c9ccd6", on = false }) => {
  let g = stand(26, 9, "#5c3d27") + ibox(2, 0.5, 22, 7.6, 14, 12, T(c)) + ibox(2, 0.5, 22, 7.6, 26, 1, T(shade(c, 1.15)));
  g += ifront(3, 8.1, 20, 19, 4, shade(c, 0.85)) + iell(13, 8.1, 22.5, 1.6, "#f7f2e2") + iline(ipt(13, 8.1, 22.5), ipt(13.8, 8.1, 23.4), "#c0303a", 0.25);
  for (const x of [6, 20]) g += ibox(x - 1, 6, 2, 2.6, 16.4, 2.4, T("#a7acb6")) + ibox(x - 0.4, 7.6, 0.8, 0.8, 18.8, 9, T("#1c1c22")) + iell(x, 8, 28, 1, "#1c1c22") + ibox(x - 1, 6, 2, 2, 14, 1.4, T("#f4f2ea"));
  g += icyl(13, 4, 27, 4, 3.4, shade(c, 0.9), shade(c, 1.2)) + iell(13, 4, 31.2, 1, "#d4a640") + ibox(12.6, 3.6, 0.8, 0.8, 31.2, 2, T("#d4a640"));
  for (const x of [4, 7.5, 18.5, 22]) g += icyl(x, 3, 27, 1.6, 1.2, "#e6e6ea", "#f4f2ea");
  return g + (on ? iell(6, 8.4, 15.2, 1.2, "#5a3418") + iell(20, 8.4, 15.2, 1.2, "#5a3418") : "");
});

/* ---------- lights (items/catalog2.js): the light itself glows warm when on ---------- */
const bulb = (x, y, z, on, c = "#fff3c4", r = 1.6) => iell(x, y, z, r, on ? c : "#c9c4b0") + (on ? iell(x, y, z, r * 2.2, c, ' fill-opacity=".25"') : "");
// the arc floor lamp: a marble foot, a steel arc, a dome hanging far out
art("isolamparc", 14, 14, 52, ({ c = "#c9ccd6", on = true }) => {
  const [x0, y0] = ipt(2, 12, 2), [x1, y1] = ipt(2, 12, 46), [x2, y2] = ipt(12, 2, 44);
  return iell(2, 12, 0, 3, "#000", ' fill-opacity=".2"') + icyl(2, 12, 0, 2.4, 2.6, "#d9d6cf", "#f0ede6") + `<path fill="none" stroke="${c}" stroke-width=".9" d="M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}Q${n2(x1 + 6)} ${n2(y1 - 8)} ${n2(x2)} ${n2(y2)}"/>`
    + icyl(12, 2, 36, 5, 4, shade(c, 0.85), shade(c, 1.1)) + bulb(12, 2, 36, on, "#fff3c4", 2.2);
});
// the photographer's tripod lamp: three legs, a big drum shade
art("isolamptripod", 12, 12, 42, ({ c = "#2a2a30", on = true }) => {
  let g = iell(6, 6, 0, 5, "#000", ' fill-opacity=".18"');
  for (const [x, y] of [[1, 2], [11, 3], [6, 11]]) g += iline(ipt(x, y, 0), ipt(6, 6, 28), "#5c3d27", 0.8);
  return g + ibox(5.6, 5.6, 0.8, 0.8, 28, 4, T("#3a3a46")) + icyl(6, 6, 30, 8, 4.6, shade(c, 0.9), on ? "#fff3c4" : shade(c, 1.2)) + (on ? iell(6, 6, 30, 5, "#fff3c4", ' fill-opacity=".3"') : "");
});
// the LED column: a tall bar of colour
art("isolampled", 8, 8, 40, ({ c = "#b46bff", on = true }) => iell(4, 4, 0, 3.4, "#000", ' fill-opacity=".2"') + icyl(4, 4, 0, 1.4, 3, "#1c1c22", "#2a2a30")
  + ibox(3, 3, 2, 2, 1.4, 34, on ? [shade(c, 1.4), c, shade(c, 0.8)] : T("#3a3a46")) + (on ? ibox(2.4, 2.4, 3.2, 3.2, 1.4, 34, T(c), ' fill-opacity=".25"') : ""));
// the pendant: hanging from the ceiling (its cord goes up out of sight), a shade over a table or a desk
art("isopendant", 10, 10, 78, ({ c = "#2a2a30", on = true }) => iline(ipt(5, 5, 54), ipt(5, 5, 78), "#1c1c22", 0.4)
  + `<path fill="${c}" d="M${ipt(1, 5, 48).join(" ")}L${ipt(5, 1, 49).join(" ")}L${ipt(9, 5, 48).join(" ")}L${ipt(5, 9, 47).join(" ")}Z"/>`
  + icyl(5, 5, 48, 6, 2, shade(c, 0.85), shade(c, 1.15)) + `<path fill="${shade(c, 0.75)}" d="M${ipt(1.5, 8.5, 48).join(" ")}Q${ipt(5, 5, 54).join(" ")} ${ipt(8.5, 1.5, 48).join(" ")}Z"/>` + bulb(5, 5, 47.6, on, "#fff3c4", 2.6));
// the crystal chandelier: gilt arms, candles, crystal drops
art("isochandelier", 16, 16, 82, ({ c = "#d4a640", on = true }) => {
  let g = iline(ipt(8, 8, 60), ipt(8, 8, 82), "#3a3a44", 0.4) + icyl(8, 8, 52, 8, 1.2, shade(c, 0.85), c);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = 8 + Math.cos(a) * 6, y = 8 + Math.sin(a) * 6; g += iline(ipt(8, 8, 54), ipt(x, y, 54), c, 0.6) + icyl(x, y, 54, 2.6, 0.5, "#f4f2ea", "#fff") + bulb(x, y, 57, on, "#ffe9a8", 0.9) + iell(x, y, 51.6, 0.5, "#dff3ff"); }
  return g + iell(8, 8, 50, 1.2, "#dff3ff");
});
