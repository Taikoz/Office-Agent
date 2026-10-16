// Isometric gadgets of the shop (items/gadgets.js): computers (their screen is painted live by the item, so the art
// leaves it dark), a 3D printer, a smart speaker, a copier, a vending machine, a pinball, a VR station.

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, T, legs4, chrome, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const keyboard = (x, y, w, d, c = "#3a3a46", k = "#55556a") => itop(x, y, w, d, 0.05, c) + Array.from({ length: 3 }, (_, r) => itop(x + 0.5, y + 0.4 + r * (d - 0.8) / 3, w - 1, 0.35, 0.1, k)).join("");
const mouse = (x, y, c = "#3a3a46") => itop(x, y, 1.6, 2.4, 0.08, c);

/* ---------- computers (on a desk) ---------- */
// the 80s computer: a deep beige CRT, a floppy slot, a clicky keyboard
art("isopcretro", 20, 9, 14, ({ c = "#d9d0b8", back = false }) => {
  let g = ibox(3, 0.5, 14, 6, 0, 2.6, T(shade(c, 0.95))) + ibox(4, 0.8, 12, 5.4, 2.6, 10.4, T(c));
  if (back) return g + ifront(6, 6.2, 8, 4, 4, shade(c, 0.8)) + keyboard(3, 6.8, 14, 2, c, shade(c, 0.7));
  g += ifront(4.6, 6.2, 10.8, 3, 7.4, shade(c, 0.7)) + ifront(5, 6.2, 10, 3.4, 6.6, "#10140e");
  return g + ifront(12, 6.2, 3, 1, 0.5, "#2a2a30") + ifront(4.4, 6.2, 1, 1, 0.6, "#51cf66") + keyboard(3, 6.8, 14, 2, c, shade(c, 0.7)) + mouse(17.6, 7);
});
// the laptop: a thin base, the lid open
art("isolaptop", 18, 10, 12, ({ c = "#c9ccd6", back = false }) => {
  let g = ibox(1, 3.2, 16, 6.6, 0, 0.8, T(c)) + itop(2, 4, 14, 3.2, 0.82, "#2a2a33") + itop(6.5, 7.6, 5, 1.8, 0.82, shade(c, 0.85));
  for (let r = 0; r < 3; r++) g += itop(2.4, 4.3 + r * 1, 13.2, 0.4, 0.86, "#4a4a58");
  g += ibox(1.5, 2.4, 15, 0.8, 0.8, 9.6, T(shade(c, 0.9)));
  return back ? g + iell(9, 2.4, 6, 1.2, shade(c, 1.25)) : g + ifront(2, 3.2, 14, 1.4, 8.4, "#14141c");
});
// the curved ultra-wide monitor: three panels, a stand; a mini PC beside it
art("isopcultra", 30, 9, 16, ({ c = "#1c1c22", back = false }) => {
  const [top, front, side] = T(c);
  let g = itop(12, 0.6, 6, 3, 0.05, front) + ibox(14.2, 1, 1.6, 1.2, 0, 4.6, T(c));
  g += `<path fill="${side}" d="M${ipt(1, 3.6, 4).join(" ")}L${ipt(7, 1.6, 4).join(" ")}L${ipt(7, 1.6, 13).join(" ")}L${ipt(1, 3.6, 13).join(" ")}Z"/>`;
  g += ibox(7, 1, 16, 1.4, 4, 9, [top, front, side]);
  g += `<path fill="${front}" d="M${ipt(23, 2.4, 4).join(" ")}L${ipt(29, 4.4, 4).join(" ")}L${ipt(29, 4.4, 13).join(" ")}L${ipt(23, 2.4, 13).join(" ")}Z"/>`;
  if (!back) g += ifront(7.4, 2.4, 15.2, 4.6, 7.8, "#0a0e18") + `<path fill="#101a30" d="M${ipt(1.6, 4, 4.6).join(" ")}L${ipt(6.8, 2.3, 4.6).join(" ")}L${ipt(6.8, 2.3, 12.4).join(" ")}L${ipt(1.6, 4, 12.4).join(" ")}Z"/><path fill="#101a30" d="M${ipt(23.2, 2.7, 4.6).join(" ")}L${ipt(28.4, 4.5, 4.6).join(" ")}L${ipt(28.4, 4.5, 12.4).join(" ")}L${ipt(23.2, 2.7, 12.4).join(" ")}Z"/>`;
  return g + keyboard(8, 5, 13, 2.8) + mouse(23, 5.4) + ibox(25, 6, 4, 3, 0, 2, T("#2a2a33")) + ifront(25.4, 9, 0.6, 0.8, 0.4, "#3bc4ff");
});
// two monitors side by side, a tower with its LEDs
art("isopcdual", 30, 9, 15, ({ c = "#1c1c22", led = null, back = false }) => {
  let g = "";
  for (const x of [1, 15]) g += itop(x + 4, 0.6, 5, 2.6, 0.05, "#2a2a33") + ibox(x + 5.7, 1, 1.4, 1.2, 0, 4, T("#2a2a33")) + ibox(x, 0.6, 13, 1.3, 3.4, 8.4, T(c));
  if (!back) g += ifront(1.6, 1.9, 11.8, 4, 7.2, "#0a0e18") + ifront(15.6, 1.9, 11.8, 4, 7.2, "#0a0e18");
  g += keyboard(8, 4.6, 13, 2.8) + mouse(22.5, 5);
  const tower = ibox(26, 3.6, 4, 5, 0, 8, T("#2a2a33"));
  return g + tower + (led ? ifront(26.4, 8.6, 3.2, 1, 6, led, ' fill-opacity=".85"') : ifront(27, 8.6, 1, 6, 0.6, "#51cf66"));
});
// the all-in-one: a thin coloured panel with its chin, a matching keyboard
art("isopcaio", 18, 8, 15, ({ c = "#4a8ad0", back = false }) => {
  let g = itop(6.5, 0.6, 5, 2.6, 0.05, shade(c, 0.9)) + ibox(8.2, 1, 1.6, 1, 0, 3.4, T(shade(c, 0.9))) + ibox(1, 0.8, 16, 0.9, 3.2, 10, T(shade(c, 1.1)));
  g += ifront(1, 1.7, 16, 3.2, 2.2, c);
  if (back) return g + iell(9, 0.8, 9, 1.4, shade(c, 0.7)) + keyboard(3, 4.4, 12, 2.4, shade(c, 1.25), shade(c, 0.9));
  return g + ifront(1.6, 1.7, 14.8, 5.6, 7.2, "#0a0e18") + keyboard(3, 4.4, 12, 2.4, shade(c, 1.25), shade(c, 0.9)) + mouse(15.6, 4.8, shade(c, 1.25));
});

/* ---------- interactive electronics ---------- */
// the 3D printer: a frame, its print head moving, the figurine growing layer by layer
art("isoprinter3d", 12, 12, 18, ({ c = "#2a2a33", printing = false, k = 0, f = "#ff9a3b" }) => {
  let g = ishadow(12, 12, 0) + ibox(0, 0, 12, 12, 0, 2.4, T(c)) + ifront(1, 12, 3, 0.8, 1, "#3bc4ff");
  g += ibox(0.4, 0.4, 1, 1, 2.4, 14, T(c)) + ibox(10.6, 0.4, 1, 1, 2.4, 14, T(c)) + ibox(0.4, 0.4, 11.2, 1, 16.4, 1.2, T(c));
  g += itop(2, 2, 8, 8, 2.45, "#3a3a46");
  const hgt = printing ? Math.max(0.8, k * 6) : 0;
  if (hgt) g += icyl(6, 6, 2.45, hgt, 1.8, shade(f, 0.8), f);
  const hz = 2.6 + hgt + 2, hx = printing ? 4.5 + Math.sin(k * 40) * 2.5 : 6;
  g += ibox(1.4, 5.4, 9.2, 0.6, hz + 1.2, 0.6, T("#c9ccd6")) + ibox(hx - 1, 4.8, 2, 2, hz, 1.8, T("#e8e8ee")) + ibox(hx - 0.2, 5.6, 0.4, 0.4, hz - 0.8, 0.8, "#ff9a3b");
  return g + icyl(11, 10, 2.4, 3, 1.4, "#3a3a46", f);
}, { mx: 0 });
// the smart speaker: a fabric cylinder, its ring of light when it speaks
art("isospeaker", 6, 6, 9, ({ c = "#3a3a46", talk = false, k = 0 }) => {
  const ring = talk ? ["#3bc4ff", "#51cf66", "#b46bff"][k % 3] : shade(c, 0.6);
  let g = iell(3, 3, 0, 3.2, "#000", ' fill-opacity=".2"') + icyl(3, 3, 0, 7, 2.6, shade(c, 0.85), shade(c, 1.1));
  for (let z = 1; z < 7; z += 1.2) g += iell(3, 3, z, 2.62, "none", ` stroke="${shade(c, 0.7)}" stroke-width=".2"`);
  return g + iell(3, 3, 7.02, 2, "none", ` stroke="${ring}" stroke-width="${talk ? 0.7 : 0.4}"`) + (talk ? iell(3, 3, 7.05, 2.8, ring, ' fill-opacity=".25"') : "");
});
// the copier: a big body, paper trays, the lid, a control panel, sheets flying out when it copies
art("isocopier", 18, 14, 26, ({ c = "#e6e6ea", busy = false, jam = false, k = 0 }) => {
  let g = ishadow(18, 14) + ibox(0, 0, 18, 14, 0, 4, T(shade(c, 0.85))) + ibox(0, 0, 18, 14, 4, 12, T(c)) + ibox(0, 0, 18, 13, 16, 2, T(shade(c, 0.9)));
  for (const z of [1, 6.5, 10]) g += ifront(2, 14, 14, z, 2.6, shade(c, 0.88)) + ifront(7.5, 14, 3, z + 1, 0.6, "#5a5a64");
  g += ibox(1, 0, 12, 12, 18, 1.4, T("#3a3a46")) + ibox(13, 9, 5, 4, 18, 1.6, T("#4a4a54")) + itop(13.6, 9.6, 3, 2, 19.65, jam ? "#ff3b3b" : busy ? "#51cf66" : "#3bc4ff");
  g += iside(18, 3, 8, 10, 1.4, "#3a3a46") + itop(18.1, 3, 3, 8, 11.4, "#f7f7f2");
  if (busy && !jam) for (let i = 0; i < 2; i++) { const p = ((k / 6) + i / 2) % 1; g += itop(18.4 + p * 5, 3 - p * 2, 3, 6, 11.6 + p * 4, "#ffffff", ` fill-opacity="${n2(1 - p)}"`); }
  if (jam) g += ifront(7, 14, 4, 5, 3, "#ff3b3b") + ipoly2([ipt(8.2, 14, 6), ipt(9.8, 14, 6), ipt(9, 14, 7.6)], "#ffe14d");
  return g;
});
const ipoly2 = (pts, fill) => `<path fill="${fill}" d="M${pts.map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
// the vending machine: a lit window of snacks on spirals, a slot, its coin panel
art("isovending", 16, 12, 34, ({ c = "#c0303a", lit = true, stuck = false }) => {
  let g = ishadow(16, 12) + ibox(0, 0, 16, 12, 0, 32, T(c)) + ifront(1, 12, 10, 8, 22, lit ? "#e8f4ff" : "#9aa4b0");
  const snacks = ["#ff9a3b", "#ffe14d", "#3bc4ff", "#ff4fb8", "#51cf66", "#b46bff"];
  for (let r = 0; r < 4; r++) { g += ifront(1, 12, 10, 9 + r * 5.4, 0.4, "#8d929c"); for (let i = 0; i < 4; i++) g += ifront(1.6 + i * 2.4, 12, 1.6, 9.5 + r * 5.4, 3, snacks[(r * 4 + i) % snacks.length]); }
  if (stuck) g += ifront(6.4, 12, 1.6, 10.6, 2, "#ffe14d") + ifront(6.2, 12, 2, 13, 0.4, "#ff3b3b");
  g += ifront(1, 12, 10, 2, 4, "#1c1c22") + ifront(12, 12, 3, 20, 8, "#2a2a33");
  for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) g += ifront(12.4 + i * 1.2, 12, 0.8, 21 + r * 2.2, 0.8, "#c9ccd6");
  return g + ifront(12.6, 12, 1.8, 14, 2.4, "#14141c") + ifront(0, 12, 16, 30, 2, shade(c, 1.25)) + (lit ? ifront(1, 12, 10, 8, 22, "#ffffff", ' fill-opacity=".12"') : "");
});
// the pinball: a slanted lit playfield on legs, a backbox with its score
art("isopinball", 12, 24, 30, ({ c = "#1f3a8a", k = 0, on = false }) => {
  let g = ishadow(12, 24) + legs4(0.5, 0.5, 11.5, 23.5, 9, T("#2a2a33"), 1.1);
  g += `<path fill="${shade(c, 0.75)}" d="M${ipt(12, 24, 9).join(" ")}L${ipt(12, 4, 13).join(" ")}L${ipt(12, 4, 9).join(" ")}L${ipt(12, 24, 7).join(" ")}Z"/>`;
  g += `<path fill="${shade(c, 0.9)}" d="M${ipt(0, 24, 7).join(" ")}L${ipt(12, 24, 7).join(" ")}L${ipt(12, 24, 9).join(" ")}L${ipt(0, 24, 9).join(" ")}Z"/>`;
  g += `<path fill="#0e1430" d="M${ipt(0.6, 23.4, 9).join(" ")}L${ipt(11.4, 23.4, 9).join(" ")}L${ipt(11.4, 4.6, 12.8).join(" ")}L${ipt(0.6, 4.6, 12.8).join(" ")}Z"/>`;
  const lights = ["#ff4fb8", "#ffe14d", "#3bc4ff", "#51cf66"];
  for (const [i, [x, y]] of [[3, 9], [8, 10], [5.5, 14], [3.5, 18], [8.5, 18]].entries()) { const z = 9 + (24 - y) / 20 * 4 + 0.1; g += iell(x, y, z, 1.1, on && (i + k) % 2 ? lights[i % 4] : shade(lights[i % 4], 0.5)); }
  g += iline(ipt(4, 22, 9.4), ipt(5.6, 21, 9.6), "#f4f2ea", 0.5) + iline(ipt(8, 22, 9.4), ipt(6.4, 21, 9.6), "#f4f2ea", 0.5);
  g += ibox(0, 0, 12, 4, 9, 20, T(c)) + ifront(1, 4, 10, 16, 10, "#0a0a12") + ifront(1.6, 4, 8.8, 22, 3, on ? lights[k % 4] : "#3a3a46");
  return g + ifront(2, 4, 8, 17, 3, "#1c1c22") + (on ? ifront(2.4, 4, 7.2, 17.6, 1.6, "#ff9a3b", ' fill-opacity=".9"') : "") + ifront(0, 24, 1, 8, 1, "#c9ccd6");
});
// the VR station: a mat, two tracking towers, a headset on its stand (on someone's head when used)
art("isovr", 22, 22, 18, ({ c = "#2a2a33", on = false, k = 0 }) => {
  let g = itop(1, 1, 20, 20, 0.05, shade(c, 0.9)) + itop(2, 2, 18, 18, 0.06, "none") + iline(ipt(2, 2, 0.1), ipt(20, 2, 0.1), "#3bc4ff", 0.3) + iline(ipt(2, 20, 0.1), ipt(20, 20, 0.1), "#3bc4ff", 0.3);
  for (const [x, y] of [[1, 1], [20, 1]]) g += ibox(x, y, 1, 1, 0, 16, T("#3a3a46")) + ibox(x - 0.5, y - 0.5, 2, 2, 16, 2, T("#1c1c22")) + ifront(x - 0.3, y + 1.5, 1.6, 16.6, 0.6, on && k % 2 ? "#ff3b3b" : "#51cf66");
  if (!on) g += ibox(10.5, 18, 1, 1, 0, 9, T("#3a3a46")) + ibox(9, 17.4, 4, 2.4, 9, 2.4, T("#1c1c22")) + ifront(9.4, 19.8, 3.2, 9.6, 1.2, "#3bc4ff");
  return g;
});
