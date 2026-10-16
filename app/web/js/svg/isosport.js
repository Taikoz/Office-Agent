// The gym and the library (rooms/extra.js, items/rooms2.js): machines and furniture in volume, like the rest.

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, T, legs4, wood, reg } = ISO_KIT;
const art = (name, w, d, H, body) => reg(class extends IsoArt { constructor() { super(name, w, d, H); } body(o) { return body(o); } });
const STEEL = ["#e6e8ee", "#c9ccd6", "#a7acb6"], DARK = ["#3a3a46", "#22222a", "#16161c"];

/* ---------- the gym ---------- */
// the treadmill: a belt that runs while someone runs, two posts, the console with its numbers
art("isotreadmill", 14, 30, 22, ({ c = "#c0303a", on = false, k = 0 }) => {
  let g = ishadow(14, 30) + ibox(1, 4, 12, 25, 0, 2.4, T("#2a2a30")) + itop(2.4, 5, 9.2, 23, 2.42, "#14141a");
  for (let i = 0; i < 6; i++) g += iline(ipt(2.4, 6 + ((i * 4 + (on ? k : 0)) % 23), 2.45), ipt(11.6, 6 + ((i * 4 + (on ? k : 0)) % 23), 2.45), "#3a3a46", 0.3);
  g += ibox(0.5, 3, 1, 1, 2.4, 13, STEEL) + ibox(12.5, 3, 1, 1, 2.4, 13, STEEL) + ibox(0.5, 3, 1, 14, 9, 0.8, STEEL) + ibox(12.5, 3, 1, 14, 9, 0.8, STEEL);
  g += ibox(0, 1, 14, 3.4, 15.4, 3.4, T(c)) + ifront(2, 4.4, 10, 16, 2, "#0a0e18") + ifront(3, 4.4, 4, 16.6, 0.8, on ? "#51cf66" : "#1c3a24") + ifront(8, 4.4, 3, 16.6, 0.8, on ? "#ff5a3b" : "#3a1c1c");
  return g + ibox(1, 0, 12, 4, 0, 2.4, T(shade(c, 0.8)));
});
// the exercise bike: a heavy flywheel at the front, the saddle, the handlebar
art("isobike", 10, 18, 22, ({ c = "#2a6fd0" }) => {
  let g = ishadow(10, 18) + ibox(1, 1, 8, 2, 0, 1, T("#2a2a30")) + ibox(1, 15, 8, 2, 0, 1, T("#2a2a30")) + ibox(4, 2, 2, 14, 1, 1.4, T(c));
  g += icyl(5, 4, 1.6, 8, 3.4, shade(c, 0.7), shade(c, 1.1)) + `<ellipse cx="${n2(ipt(5, 4, 5)[0])}" cy="${n2(ipt(5, 4, 5)[1])}" rx="2.6" ry="3.4" fill="#1c1c22"/>`;
  g += ibox(4.4, 12, 1.2, 1.2, 1, 12, T(c)) + ibox(3, 11, 4, 5, 13, 1.4, T("#1c1c22")) + ibox(4.4, 4, 1.2, 1.2, 4, 14, T(c)) + ibox(2, 3.6, 6, 1, 18, 1, T("#1c1c22"));
  return g + ifront(3.6, 4.6, 2.8, 15, 1.6, "#0a0e18");
});
// the weight bench: a padded bench, a rack, a barbell with its plates
art("isobench", 14, 28, 24, ({ c = "#1c1c22", p = "#c0303a" }) => {
  let g = ishadow(14, 28) + legs4(4, 6, 10, 26, 6, DARK, 1) + ibox(3.5, 6, 7, 20, 6, 2.2, T(c));
  g += ibox(1, 2, 1.2, 1.2, 0, 18, STEEL) + ibox(11.8, 2, 1.2, 1.2, 0, 18, STEEL) + ibox(0, 1, 14, 3, 0, 1, T("#2a2a30"));
  g += iline(ipt(-2, 2.6, 16.4), ipt(16, 2.6, 16.4), "#c9ccd6", 0.8);
  for (const x of [-1.4, 14.4]) g += `<ellipse cx="${n2(ipt(x, 2.6, 16.4)[0])}" cy="${n2(ipt(x, 2.6, 16.4)[1])}" rx="1.6" ry="3.6" fill="${p}"/>`;
  return g;
});
// the punching bag on its stand
art("isobag", 14, 14, 48, ({ c = "#c0303a", k = 0 }) => {
  const sw = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6][k % 8];
  let g = ishadow(14, 14) + ibox(0, 0, 14, 3, 0, 1, T("#2a2a30")) + ibox(1, 1, 1.4, 1.4, 1, 42, STEEL) + ibox(1, 1, 10, 1.4, 42, 1.2, STEEL);
  g += iline(ipt(10 + sw, 1.6, 42), ipt(10 + sw, 1.6, 36), "#55565e", 0.4);
  return g + icyl(10 + sw, 2, 12, 24, 3.6, shade(c, 0.8), shade(c, 1.1)) + ifront(8 + sw, 5.6, 4, 24, 1, "#1c1c22");
});
// the yoga mat, rolled out
art("isoyoga", 10, 24, 3, ({ c = "#7a4ab0" }) => ibox(0.5, 0.5, 9, 23, 0, 0.5, T(c)) + itop(1.5, 1.5, 7, 21, 0.52, shade(c, 1.12)) + icyl(5, 23, 0.5, 0.1, 0.2, c, c));
// the rowing machine: a long rail, the seat that slides, the flywheel in its cage
art("isorower", 10, 32, 14, ({ c = "#2a2a30", k = 0 }) => {
  const s = [0, 2, 4, 6, 4, 2][k % 6];
  let g = ishadow(10, 32) + ibox(4, 2, 2, 28, 1, 1.4, T(STEEL[1])) + ibox(1, 28, 8, 2, 0, 1, T(c)) + ibox(1, 2, 8, 2, 0, 1, T(c));
  g += icyl(5, 4, 1.6, 6, 3.4, shade(c, 0.85), shade(c, 1.3)) + ibox(2, 7, 6, 2, 1, 4, T("#3a3a46"));
  return g + ibox(3, 14 + s, 4, 4, 2.4, 1.6, T("#1c1c22")) + iline(ipt(5, 5, 6), ipt(5, 12 + s, 6), "#1c1c22", 0.5);
});
// the dumbbell rack: two shelves of pairs, from light to heavy
art("isodumbbells", 22, 8, 16, ({ c = "#2a2a30" }) => {
  let g = ishadow(22, 8) + legs4(0.5, 0.5, 21.5, 7.5, 13, T(c), 1) + ibox(0, 2, 22, 4, 5, 1, T(c)) + ibox(0, 2, 22, 4, 11, 1, T(c));
  const cols = ["#51cf66", "#3bc4ff", "#ffe14d", "#ff9a3b", "#c0303a"];
  for (let i = 0; i < 5; i++) for (const z of [6, 12]) g += ibox(1.5 + i * 4, 2.6, 3, 1.2, z, 1.6, T(cols[(i + (z === 12 ? 2 : 0)) % 5]));
  return g;
});
// the water fountain: a big blue bottle upside down, its tap, paper cups
art("isowater", 8, 8, 30, () => ishadow(8, 8) + ibox(1, 1, 6, 6, 0, 16, T("#e6e6ea")) + ifront(2.6, 7, 2.8, 12, 1.6, "#3a3a46") + ifront(3.4, 7, 1.2, 10.6, 1.4, "#3bc4ff")
  + icyl(4, 4, 16, 11, 2.8, "#5aa9e8", "#8ec5ff") + `<path fill="#ffffff" fill-opacity=".3" d="M${ipt(2, 4, 26).join(" ")}L${ipt(2.6, 4, 18).join(" ")}L${ipt(3.2, 4, 18).join(" ")}L${ipt(2.8, 4, 26).join(" ")}Z"/>` + ibox(6.6, 2, 1.2, 1.2, 9, 3, T("#f4f2ea")));

/* ---------- the library ---------- */
// the tall bookcase: five shelves of books, a rolling ladder
art("isobookcasetall", 32, 8, 54, ({ w = "#5c3d27" }) => {
  let g = ibox(0, 0, 32, 8, 0, 52, wood(w)) + ifront(1.4, 8, 29.2, 1.4, 49, shade(w, 0.5));
  const books = ["#c0303a", "#2a5a9a", "#e8c23a", "#2f6e4c", "#e9e4f5", "#7a4ab0", "#c87a4a", "#1c1c22"];
  for (let r = 0; r < 5; r++) {
    const z = 2 + r * 10; g += ifront(1.4, 8, 29.2, z, 0.8, shade(w, 1.05));
    for (let x = 2, k = 0; x < 30; k++) { const bw = 1.6 + (k % 3) * 0.5, h = 6 + ((k * 5 + r * 3) % 3); if (x + bw > 30) break; g += ifront(x, 7.8, bw, z + 0.8, h, books[(k + r * 3) % books.length]); x += bw + 0.2; }
  }
  return g + iline(ipt(22, 9, 0), ipt(22, 8, 50), "#8a6a4a", 0.6) + iline(ipt(26, 9, 0), ipt(26, 8, 50), "#8a6a4a", 0.6) + [6, 14, 22, 30, 38].map(z => iline(ipt(22, 8.6, z), ipt(26, 8.6, z), "#8a6a4a", 0.5)).join("");
});
// the study table: dark wood, two green banker's lamps, open books
art("isostudytable", 40, 16, 24, ({ w = "#5c3d27", on = true }) => {
  let g = ishadow(40, 16) + legs4(1, 1, 39, 15, 12, wood(w, 0.85), 1.4) + ibox(0, 0, 40, 16, 12, 1.4, wood(w)) + itop(3, 3, 34, 10, 13.42, "#2f5d3a");
  for (const x of [8, 30]) g += ibox(x, 3, 1, 1, 13.4, 5, T("#d4a640")) + `<path fill="#2f8a4a" d="M${ipt(x - 2.4, 2.6, 19).join(" ")}L${ipt(x + 3.4, 2.6, 19).join(" ")}L${ipt(x + 2.6, 4.6, 17.6).join(" ")}L${ipt(x - 1.6, 4.6, 17.6).join(" ")}Z"/>`
    + (on ? iell(x + 0.5, 5, 13.5, 3, "#fff3c4", ' fill-opacity=".4"') : "");
  return g + itop(14, 6, 6, 4, 13.5, "#f4f2ea") + itop(20.2, 6, 6, 4, 13.5, "#eae6da") + ibox(26, 5, 4, 5, 13.4, 2.6, T("#c0303a"));
});
// the globe on its wooden stand
art("isoglobe", 10, 10, 22, ({ w = "#8a6a4a" }) => ishadow(10, 10) + legs4(2, 2, 8, 8, 8, wood(w), 0.8) + ibox(1.5, 1.5, 7, 7, 8, 1, wood(w))
  + `<circle cx="${n2(ipt(5, 5, 15)[0])}" cy="${n2(ipt(5, 5, 15)[1])}" r="4.2" fill="#3a7ac0"/><path fill="#5aa86a" d="M${ipt(4, 4, 17).join(" ")}q2 -1 3 1q-1 2 -3 1zM${ipt(6, 6, 13.6).join(" ")}q1 1 0 2q-2 0 -1 -2z"/>`
  + `<circle cx="${n2(ipt(5, 5, 15)[0])}" cy="${n2(ipt(5, 5, 15)[1])}" r="4.8" fill="none" stroke="#d4a640" stroke-width=".5"/>`);
// the reading chaise: a long velvet seat with a rolled end, a cushion
art("isoreadnook", 30, 12, 16, ({ c = "#2f5d4a" }) => ishadow(30, 12) + legs4(1, 1, 29, 11, 3, wood("#5c3d27"), 1.2) + ibox(0, 0, 30, 12, 3, 4.6, T(c))
  + ibox(0, 0, 6, 12, 3, 9.4, T(c)) + icyl(3, 6, 12.4, 0.1, 0.1, c, c) + ibox(8, 1, 6, 4, 7.6, 2.4, T(shade(c, 1.25))) + itop(1, 1, 4, 10, 12.42, shade(c, 1.2)));
// the fireplace: a stone surround, a mantel, logs and flames that dance; it lights the room at night
art("isofireplace", 30, 8, 34, ({ c = "#cfc6b8", on = true, k = 0 }) => {
  let g = ibox(0, 0, 30, 8, 0, 30, T(c)) + ibox(-1, 0, 32, 9, 28, 2, T(shade(c, 0.85))) + ifront(6, 8, 18, 1, 16, "#1c1410");
  g += ibox(8, 5, 14, 2, 1, 1.6, T("#5c3d27")) + ibox(10, 4, 10, 2, 2.6, 1.6, T("#4a2f1c"));
  if (on) { const f = k % 3; g += ifront(9 + f, 7.9, 4, 3.6, 7 - f, "#ff9a3b") + ifront(14 - f, 7.9, 4, 3.6, 9 + f, "#ffb347") + ifront(12, 7.9, 3, 3.6, 5 + f, "#ffe14d") + ifront(6, 8, 18, 1, 16, "#ff9a3b", ' fill-opacity=".15"'); }
  return g + ibox(6, 0, 2, 8, 29.9, 3, T("#d4a640")) + ibox(21, 0, 3, 8, 29.9, 4, T("#3a5a8a"));
});
