// The sci-fi theme (items/scifi.js): hull walls to compose (a plated wall, a sliding door, a porthole on the stars, an
// energy pillar), a plasma lamp and a light column, a pilot seat and a capsule chair, a holographic table, a command
// desk, the chief's holographic command post, computers of the future (holographic, quantum, transparent), a robot, a
// teleporter, a cryo pod, a fusion reactor, a delivery drone, an alien plant. Drawn like the rest (svg/iso.js).

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const T3 = c => [shade(c, 1.2), c, shade(c, 0.74)];
const CY = "#00e5ff", MG = "#ff3df2", DARK = ["#2a3340", "#1a222c", "#10161e"], STEEL = ["#c9d2dc", "#9aa6b4", "#6a7684"];
const path = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(([x, y, z]) => ipt(x, y, z)).map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const shifted = (g, dx, dy) => { const [x, y] = ipt(dx, dy, 0); return `<g transform="translate(${n2(x)} ${n2(y)})">${g}</g>`; };
const glow = (x, y, z, r, c, a = 0.25) => { const [px, py] = ipt(x, y, z); return `<circle cx="${n2(px)}" cy="${n2(py)}" r="${r}" fill="${c}" fill-opacity="${a}"/>`; };
const h01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
// a light strip along the front face (plane y), from x0 to x1 at height z
const strip = (x0, x1, y, z, c, lit = true) => ifront(x0, y, x1 - x0, z, 0.8, lit ? c : shade(c, 0.4)) + (lit ? ifront(x0, y, x1 - x0, z - 0.6, 2, c, ' fill-opacity=".18"') : "");

/* ---------- hull walls ---------- */
// plates on the front face and the right side, rivets, a vent, a light strip at hip height
function plates(w, d, h, c) {
  let g = "";
  for (let z = 0, r = 0; z < h; z += 12, r++) for (let x = 0; x < w; x += 8) {
    g += ifront(x + 0.3, d, 7.4, z + 0.3, Math.min(11.4, h - z - 0.6), shade(c, 0.95 + h01(x, z) * 0.1));
    for (const [dx, dz] of [[0.9, 1], [6.5, 1], [0.9, 10.4], [6.5, 10.4]]) if (z + dz < h - 0.5) g += ifront(x + dx, d, 0.5, z + dz, 0.5, shade(c, 0.6));
  }
  for (let y = 0; y < d; y += 4) g += iside(w, y + 0.2, Math.min(3.6, d - y - 0.4), 0.3, h - 0.6, shade(c, 0.7));
  return g;
}
art("isohullwall", 24, 4, 56, ({ c = "#9aa6b4", lit = true }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 52, T3(shade(c, 0.8))) + plates(24, 4, 52, c);
  for (let k = 0; k < 4; k++) g += ifront(9, 4, 6, 30 + k * 1.4, 0.6, "#2a3340");  // the vent
  return g + strip(0.5, 23.5, 4, 18, CY, lit) + ibox(0, 0, 24, 4, 52, 2, T3(shade(c, 1.1))) + itop(0, 0, 24, 4, 54, shade(c, 1.25));
});
// the sliding door: its frame with hazard stripes, two leaves that slide apart (open 0..1), a status light
art("isohulldoor", 24, 4, 56, ({ c = "#9aa6b4", open = 0, lit = true }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 4, 4, 0, 52, T3(shade(c, 0.85))) + ibox(20, 0, 4, 4, 0, 52, T3(shade(c, 0.85))) + ibox(4, 0, 16, 4, 38, 14, T3(shade(c, 0.85)));
  g += plates(4, 4, 52, c) + shifted(plates(4, 4, 52, c), 20, 0);
  for (let k = 0; k < 8; k++) g += path([[4 + k * 2, 4, 38], [5 + k * 2, 4, 38], [6 + k * 2, 4, 39.6], [5 + k * 2, 4, 39.6]], k % 2 ? "#1c1c22" : "#e8c23a");
  const s = 8 * Math.max(0, Math.min(1, open));
  if (s < 7.9) { g += ibox(4, 1.5, 8 - s, 1, 0, 38, T3(shade(c, 1.05))) + ibox(12 + s, 1.5, 8 - s, 1, 0, 38, T3(shade(c, 1.05))); if (s < 0.3) g += iline(ipt(12, 2.5, 0), ipt(12, 2.5, 38), "#2a3340", 0.4); }
  return g + iell(12, 4, 47, 0.9, open > 0.1 ? "#51cf66" : "#ff4d5e") + glow(12, 4, 47, 2.6, open > 0.1 ? "#51cf66" : "#ff4d5e", lit ? 0.3 : 0.1) + ibox(0, 0, 24, 4, 52, 2, T3(shade(c, 1.1)));
});
// a porthole on the stars: a round window, a planet, the stars twinkle (frame)
art("isohullport", 24, 4, 56, ({ c = "#9aa6b4", frame = 0, lit = true }) => {
  let g = ishadow(24, 4) + ibox(0, 0, 24, 4, 0, 52, T3(shade(c, 0.8))) + plates(24, 4, 52, c);
  const [x, y] = ipt(12, 4, 32), R = 8.6;
  g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${R + 1.6}" ry="${R + 2.2}" fill="${shade(c, 0.6)}"/><ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${R}" ry="${R + 0.6}" fill="#050a1a"/>`;
  for (let k = 0; k < 14; k++) { const a = h01(k, 1) * 6.28, r = h01(k, 2) * R * 0.9, on = (k + frame) % 5; if (on) g += `<rect x="${n2(x + Math.cos(a) * r)}" y="${n2(y + Math.sin(a) * r)}" width=".6" height=".6" fill="#f4f8ff" fill-opacity="${on / 5}"/>`; }
  g += `<circle cx="${n2(x + 3)}" cy="${n2(y + 2.6)}" r="3.6" fill="#c0603e"/><path fill="#e8a070" d="M${n2(x - 0.6)} ${n2(y + 2)}q3.6 -1 7.2 .4l-.2 1q-3.4 -1.2 -7 -.4z"/><ellipse cx="${n2(x + 3)}" cy="${n2(y + 2.6)}" rx="5.6" ry="1.2" fill="none" stroke="#f4e7b0" stroke-width=".35"/>`;
  g += `<path fill="#ffffff" fill-opacity=".14" d="M${n2(x - 6)} ${n2(y - 3)}q3 -5 8 -6l-1 2q-4 1 -6 5z"/>`;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g += `<circle cx="${n2(x + Math.cos(a) * (R + 0.8))}" cy="${n2(y + Math.sin(a) * (R + 1.4))}" r=".4" fill="${shade(c, 1.3)}"/>`; }
  return g + strip(0.5, 23.5, 4, 14, CY, lit) + ibox(0, 0, 24, 4, 52, 2, T3(shade(c, 1.1)));
});
// the energy pillar: a column of plates, cables, an energy core in a glass sleeve (on: it glows, frame: it pulses)
art("isotechpillar", 8, 8, 60, ({ c = "#9aa6b4", on = true, frame = 0 }) => {
  let g = ishadow(8, 8) + ibox(0, 0, 8, 8, 0, 4, T3(shade(c, 0.8))) + ibox(0, 0, 8, 8, 48, 6, T3(shade(c, 0.85))) + ibox(1, 1, 6, 6, 4, 44, T3(shade(c, 0.7)));
  for (const x of [1.4, 6.2]) g += ifront(x, 7, 0.5, 4, 44, "#1c1c22");
  const k = [0.75, 1, 0.85, 0.65][frame % 4];
  g += icyl(4, 4, 12, 30, 2.6, on ? `${CY}55` : "#3a4a5a55", on ? `${CY}88` : "#3a4a5a") + icyl(4, 4, 12, 30, 1.2, on ? shade(CY, k) : "#2a3a4a", on ? "#e8ffff" : "#3a4a5a");
  return g + (on ? glow(4, 4, 27, 9 * k, CY, 0.2) : "");
});

/* ---------- lights ---------- */
// a plasma lamp: a black base, a glass orb, lightning arcs from the core to the glass (frame)
art("isoplasmalamp", 8, 8, 26, ({ on = true, frame = 0 }) => {
  let g = ishadow(8, 8, 0) + icyl(4, 4, 0, 4, 2.6, "#1c1c22", "#2a2a30") + icyl(4, 4, 4, 1, 1.2, "#2a2a30", "#3a3a44");
  const [x, y] = ipt(4, 4, 12);
  g += `<circle cx="${n2(x)}" cy="${n2(y)}" r="6.2" fill="#1a0a2a" fill-opacity=".55"/><circle cx="${n2(x)}" cy="${n2(y)}" r="6.2" fill="none" stroke="#dfeaf2" stroke-opacity=".5" stroke-width=".4"/>`;
  if (on) {
    g += `<circle cx="${n2(x)}" cy="${n2(y)}" r="9" fill="${MG}" fill-opacity=".12"/><circle cx="${n2(x)}" cy="${n2(y)}" r="1.5" fill="#ffd6ff"/>`;
    for (let k = 0; k < 5; k++) { const a = (k * 1.26 + frame * 0.7) % 6.28, ex = x + Math.cos(a) * 5.8, ey = y + Math.sin(a) * 5.8, mx = x + Math.cos(a + 0.4) * 3, my = y + Math.sin(a + 0.4) * 3;
      g += `<path fill="none" stroke="${k % 2 ? MG : "#b48cff"}" stroke-width=".45" d="M${n2(x)} ${n2(y)}L${n2(mx)} ${n2(my)}L${n2(ex)} ${n2(ey)}"/>`; }
  }
  return g + `<circle cx="${n2(x - 2)}" cy="${n2(y - 2.4)}" r="1" fill="#ffffff" fill-opacity=".5"/>`;
});
// a light column: a slim steel foot, a glowing tube (its colour: c)
art("isolightcolumn", 6, 6, 56, ({ c = CY, on = true }) => {
  let g = ishadow(6, 6, 0) + ibox(0.5, 0.5, 5, 5, 0, 2, STEEL) + ibox(1.6, 1.6, 2.8, 2.8, 2, 46, on ? [shade(c, 1.3), c, shade(c, 0.8)] : DARK) + ibox(0.5, 0.5, 5, 5, 48, 1.6, STEEL);
  return g + (on ? `<ellipse cx="${n2(ipt(3, 3, 25)[0])}" cy="${n2(ipt(3, 3, 25)[1])}" rx="7" ry="26" fill="${c}" fill-opacity=".14"/>` : "");
});

/* ---------- seats ---------- */
// the pilot seat: a padded shell on a pedestal, armrests with control pads, a tall back with a headrest and lights
const pilotSeat = ({ c = "#1c2430" }) => {
  let g = ibox(4.6, 4, 2.8, 2.8, 0, 6, STEEL) + ibox(1, 1, 10, 9, 6, 2.6, T3(c)) + ibox(2, 1.6, 8, 7.6, 8.6, 1.2, T3(shade(c, 1.3)));
  for (const x of [0, 10.6]) g += ibox(x, 1, 1.4, 8, 8.6, 3.2, T3(shade(c, 0.8))) + itop(x + 0.2, 6, 1, 2.4, 11.82, CY);
  return g;
};
const pilotBack = ({ c = "#1c2430" }) => {
  let g = ibox(1, 0, 10, 2, 6, 24, T3(c)) + ifront(2.4, 2, 7.2, 9, 16, shade(c, 1.25)) + ibox(3, 0.2, 6, 1.8, 30, 5, T3(c));
  return g + ifront(1, 2, 0.6, 8, 20, CY) + ifront(10.4, 2, 0.6, 8, 20, CY) + ifront(4, 2, 4, 32, 1.2, CY, ' fill-opacity=".8"');
};
art("isocpilot", 12, 10, 14, pilotSeat);
art("isocpilotback", 12, 2, 38, pilotBack);
art("isocpilotfull", 12, 11, 38, o => pilotBack(o) + shifted(pilotSeat(o), 0, 1));
// the capsule chair: an egg-shaped shell open to the front, its glowing inside, a round base
const capsuleBase = ({ c = "#e6e8ee" }) => ishadow(18, 10) + icyl(9, 4, 0, 3, 5, shade(c, 0.7), shade(c, 0.9)) + ibox(2, 0, 14, 8, 3, 6, T3(c)) + ibox(3, 0.6, 12, 6.8, 9, 1.6, T3("#2a3340"));
const capsuleShell = ({ c = "#e6e8ee", on = true }) => {
  const [x, y] = ipt(9, 4, 20);
  return `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="11" ry="15" fill="${c}"/><ellipse cx="${n2(x + 0.6)}" cy="${n2(y + 1)}" rx="8.4" ry="12.4" fill="#1a222c"/>`
    + (on ? `<ellipse cx="${n2(x + 0.6)}" cy="${n2(y + 1)}" rx="8.4" ry="12.4" fill="none" stroke="${CY}" stroke-width=".7"/><ellipse cx="${n2(x + 0.6)}" cy="${n2(y + 1)}" rx="7" ry="11" fill="${CY}" fill-opacity=".1"/>` : "")
    + `<path fill="#ffffff" fill-opacity=".25" d="M${n2(x - 8)} ${n2(y - 6)}q2 -8 8 -9l-.4 1.4q-5 1.6 -6.4 8z"/>`;
};
art("isocapsule", 18, 8, 16, capsuleBase);
art("isocapsuleback", 18, 8, 40, capsuleShell);
art("isocapsulefull", 18, 16, 40, o => capsuleShell(o) + shifted(capsuleBase(o), 0, 8));

/* ---------- tables, desks ---------- */
// the holographic table: a hexagonal table with an emitter, a cone of light, a rotating hologram over it (frame)
art("isoholotable", 24, 24, 48, ({ c = "#2a3340", frame = 0, on = true }) => {
  const hex = z => [[6, 0, z], [18, 0, z], [24, 12, z], [18, 24, z], [6, 24, z], [0, 12, z]];
  let g = ishadow(24, 24) + icyl(12, 12, 0, 10, 4, shade(c, 0.7), c) + path(hex(10), shade(c, 0.6)) + path(hex(11.6), shade(c, 1.15));
  g += path([[6, 24, 10], [18, 24, 10], [18, 24, 11.6], [6, 24, 11.6]], shade(c, 0.9)) + path([[18, 24, 10], [24, 12, 10], [24, 12, 11.6], [18, 24, 11.6]], shade(c, 0.7));
  g += iell(12, 12, 11.7, 4, "#0a1a28") + iell(12, 12, 11.75, 3, on ? CY : "#2a3a4a");
  if (!on) return g;
  const [x, y] = ipt(12, 12, 11.8), [hx, hy] = ipt(12, 12, 30), a = frame * Math.PI / 6;
  g += `<path fill="${CY}" fill-opacity=".1" d="M${n2(x - 4)} ${n2(y)}L${n2(hx - 9)} ${n2(hy)}L${n2(hx + 9)} ${n2(hy)}L${n2(x + 4)} ${n2(y)}Z"/>`;
  g += `<circle cx="${n2(hx)}" cy="${n2(hy)}" r="7.4" fill="${CY}" fill-opacity=".15" stroke="${CY}" stroke-width=".4"/>`;
  for (let k = 0; k < 3; k++) g += `<ellipse cx="${n2(hx)}" cy="${n2(hy)}" rx="${n2(Math.abs(Math.cos(a + k * 1.05)) * 7.4)}" ry="7.4" fill="none" stroke="${CY}" stroke-opacity=".6" stroke-width=".3"/>`;
  g += `<ellipse cx="${n2(hx)}" cy="${n2(hy)}" rx="7.4" ry="2.2" fill="none" stroke="${CY}" stroke-opacity=".7" stroke-width=".3"/><ellipse cx="${n2(hx)}" cy="${n2(hy + 4)}" rx="5.6" ry="1.6" fill="none" stroke="${MG}" stroke-opacity=".6" stroke-width=".3"/>`;
  return g + `<circle cx="${n2(hx + Math.cos(a) * 9.6)}" cy="${n2(hy + Math.sin(a) * 2.6)}" r=".9" fill="${MG}"/>`;
});
// the command desk: a smooth white top, a dark base, a light strip along the front edge (a dev's work station)
art("isodeskcommand", 40, 14, 18, ({ c = "#e6e8ee", led = CY }) => {
  let g = ishadow(40, 14) + ibox(2, 1, 9, 12, 0, 12, T3("#2a3340")) + ibox(29, 1, 9, 12, 0, 12, T3("#2a3340")) + ifront(12, 13, 16, 9, 3, "#1a222c");
  g += ibox(0, 0, 40, 14, 12, 1.4, T3(c)) + strip(1, 39, 14, 12.4, led) + itop(2, 2, 36, 10, 13.42, shade(c, 1.06));
  return g + ifront(3, 13, 7, 4, 0.5, led, ' fill-opacity=".8"') + ifront(30, 13, 7, 4, 0.5, led, ' fill-opacity=".8"');
});
// the chief's holographic command post: a curved console, a lit keyboard pad, three holographic screens floating over it
art("isochiefdeskholo", 34, 16, 44, ({ c = "#1a222c", frame = 0 }) => {
  let g = ishadow(34, 16) + ibox(3, 2, 28, 10, 0, 11, T3(c)) + ifront(6, 12, 22, 2, 7, shade(c, 1.2));
  g += ibox(0, 0, 34, 14, 11, 1.6, T3(shade(c, 1.15))) + strip(1, 33, 14, 11.4, CY) + itop(10, 7, 14, 5, 12.62, `${CY}55`);
  for (let k = 0; k < 6; k++) g += itop(10.6 + k * 2.2, 7.6, 1.6, 1.2, 12.64, CY) + itop(10.6 + k * 2.2, 9.6, 1.6, 1.2, 12.64, `${CY}99`);
  const scr = [[2, 3, 18, 9, 12, -0.15], [11.5, 2, 20, 11, 13, 0], [22, 3, 18, 9, 12, 0.15]];
  for (const [i, [x0, y0, z0, w, h]] of scr.entries()) {
    g += path([[x0, y0, z0], [x0 + w, y0, z0], [x0 + w, y0, z0 + h], [x0, y0, z0 + h]], CY, ' fill-opacity=".14"') + path([[x0, y0, z0], [x0 + w, y0, z0], [x0 + w, y0, z0 + h], [x0, y0, z0 + h]], "none", ` stroke="${CY}" stroke-width=".4"`);
    for (let r = 0; r < 4; r++) g += iline(ipt(x0 + 1, y0, z0 + h - 2 - r * 2), ipt(x0 + 1 + (w - 2) * (0.4 + h01(r + frame, i) * 0.6), y0, z0 + h - 2 - r * 2), r ? CY : MG, 0.5);
  }
  return g + glow(17, 2, 24, 16, CY, 0.06);
});

/* ---------- computers of the future (on a desk: their screen shows the dev's work, items/furniture.js Computer) ---------- */
// holographic: an emitter bar and a floating, see-through screen
art("isopcholo", 20, 9, 22, ({ c = CY }) => {
  let g = ibox(2, 5, 16, 3, 0, 1.4, T3("#2a3340")) + ifront(3, 8, 14, 0.4, 0.5, c) + ibox(3, 1, 14, 3, 0, 0.6, T3("#1a222c"));
  for (let k = 0; k < 7; k++) g += itop(3.4 + k * 1.9, 1.4, 1.4, 2.2, 0.62, `${c}99`);
  return g + path([[2, 5, 6], [18, 5, 6], [18, 5, 15], [2, 5, 15]], c, ' fill-opacity=".12"') + path([[2, 5, 6], [18, 5, 6], [18, 5, 15], [2, 5, 15]], "none", ` stroke="${c}" stroke-width=".4"`)
    + `<path fill="${c}" fill-opacity=".1" d="M${n2(ipt(4, 6.5, 1.4)[0])} ${n2(ipt(4, 6.5, 1.4)[1])}L${n2(ipt(2, 5, 6)[0])} ${n2(ipt(2, 5, 6)[1])}L${n2(ipt(18, 5, 6)[0])} ${n2(ipt(18, 5, 6)[1])}L${n2(ipt(16, 6.5, 1.4)[0])} ${n2(ipt(16, 6.5, 1.4)[1])}Z"/>`;
});
// quantum: a curved screen on a thin arm, the quantum core in its glass cylinder, rings of light
art("isopcquantum", 22, 9, 22, ({ c = "#b48cff" }) => {
  let g = ibox(1, 2, 15, 1, 0, 0.6, T3("#1a222c")) + ibox(7.4, 3, 1.2, 1.2, 0.6, 3.6, STEEL);
  g += ibox(1, 2.6, 15, 0.8, 4, 9.2, ["#2a3340", "#10161e", "#1a222c"]);
  g += icyl(19, 5, 0, 1.2, 2.2, "#2a3340", "#3a4450") + icyl(19, 5, 1.2, 9, 1.8, `${c}44`, `${c}66`) + icyl(19, 5, 1.2, 9, 0.7, c, "#f4e8ff");
  for (const z of [3, 6, 9]) g += iell(19, 5, z, 1.8, "none", ` stroke="${c}" stroke-width=".35"`);
  return g + icyl(19, 5, 10.2, 1, 2.2, "#2a3340", "#3a4450") + glow(19, 5, 6, 6, c, 0.15) + ibox(2, 5.4, 12, 3, 0, 0.6, T3("#1a222c"));
});
// transparent: a thin glass panel on a slim foot, its edges lit
art("isopcglass", 18, 7, 18, ({ c = "#dfeaf2" }) => {
  let g = ibox(6, 2, 6, 3, 0, 0.6, STEEL) + ibox(8.5, 2.8, 1, 1, 0.6, 3, STEEL);
  g += path([[1, 3, 3.6], [17, 3, 3.6], [17, 3, 13], [1, 3, 13]], c, ' fill-opacity=".18"') + path([[1, 3, 3.6], [17, 3, 3.6], [17, 3, 13], [1, 3, 13]], "none", ` stroke="${c}" stroke-width=".35"`);
  return g + ibox(3, 4.4, 12, 2.4, 0, 0.5, T3("#e6e8ee"));
});

/* ---------- gadgets ---------- */
// the robot assistant: a round body on a ball, a dome head with its eye (blink), an antenna; it bobs (frame)
art("isorobot", 8, 8, 24, ({ c = "#e6e8ee", frame = 0, still = false }) => {
  const bob = still ? 0 : [0, 0.5, 1, 0.5][frame % 4];
  let g = ishadow(8, 8, 0) + iell(4, 4, 0.6, 1.8, "#2a3340") + icyl(4, 4, 2 + bob, 7, 3.2, shade(c, 0.85), c) + ifront(2.6, 7.2, 2.8, 4.4 + bob, 1.2, CY, ' fill-opacity=".8"');
  const [x, y] = ipt(4, 4, 9 + bob);
  g += `<path fill="${shade(c, 1.05)}" d="M${n2(x - 4.4)} ${n2(y)}a4.4 4 0 0 1 8.8 0z"/><rect x="${n2(x - 2.6)}" y="${n2(y - 2.6)}" width="5.2" height="1.8" rx=".9" fill="#10161e"/>`;
  g += frame % 9 === 0 && !still ? `<rect x="${n2(x - 1.6)}" y="${n2(y - 1.8)}" width="3.2" height=".3" fill="${CY}"/>` : `<rect x="${n2(x - 1.6 + (frame % 3) * 0.6)}" y="${n2(y - 2.2)}" width="1.4" height="1" fill="${CY}"/>`;
  return g + `<path stroke="${shade(c, 0.6)}" stroke-width=".35" d="M${n2(x)} ${n2(y - 4)}v-2.4"/><circle cx="${n2(x)}" cy="${n2(y - 6.6)}" r=".6" fill="${frame % 2 ? MG : "#ff4d5e"}"/>`;
});
// the teleporter: a round pad, three rings, a column of light when it beams (on)
art("isoteleporter", 16, 16, 48, ({ c = "#2a3340", on = false, frame = 0 }) => {
  let g = ishadow(16, 16) + icyl(8, 8, 0, 2.4, 7.6, shade(c, 0.7), c) + iell(8, 8, 2.5, 6.4, "#10161e") + iell(8, 8, 2.55, 5.6, `${CY}${on ? "cc" : "55"}`);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g += iell(8 + Math.cos(a) * 6.6, 8 + Math.sin(a) * 6.6, 2.5, 0.5, on ? CY : "#5a6a7a"); }
  if (!on) return g;
  const [x, y] = ipt(8, 8, 2.6);
  g += `<path fill="${CY}" fill-opacity=".22" d="M${n2(x - 11)} ${n2(y)}L${n2(x - 11)} ${n2(y - 40)}L${n2(x + 11)} ${n2(y - 40)}L${n2(x + 11)} ${n2(y)}Z"/>`;
  for (let k = 0; k < 3; k++) { const z = 6 + ((frame * 4 + k * 13) % 38); g += iell(8, 8, z, 6, "none", ` stroke="${CY}" stroke-opacity="${(0.9 - z / 50).toFixed(2)}" stroke-width=".6"`); }
  return g;
});
// the cryo pod: a capsule standing on its base, frosted glass, blue light, a control panel
art("isocryopod", 14, 12, 50, ({ c = "#e6e8ee", frame = 0, on = true }) => {
  let g = ishadow(14, 12) + ibox(0, 0, 14, 12, 0, 4, T3(shade(c, 0.85))) + ibox(1, 1, 12, 10, 4, 38, T3(c)) + ibox(0, 0, 14, 12, 42, 4, T3(shade(c, 0.85)));
  g += path([[2.6, 11, 7], [11.4, 11, 7], [11.4, 11, 38], [7, 11, 40.5], [2.6, 11, 38]], on ? "#7fd8ff" : "#5a7a8a", ' fill-opacity=".75"');
  for (let k = 0; k < 7; k++) g += `<circle cx="${n2(ipt(3.6 + h01(k, 3) * 7, 11, 9 + h01(k, 4) * 28)[0])}" cy="${n2(ipt(3.6 + h01(k, 3) * 7, 11, 9 + h01(k, 4) * 28)[1])}" r="${n2(0.6 + h01(k, 5))}" fill="#ffffff" fill-opacity=".5"/>`;
  g += ifront(4.6, 11, 4.8, 5, 1.2, frame % 2 ? CY : "#51cf66") + strip(1, 13, 12, 44, CY, on);
  return g + (on ? glow(7, 11, 24, 12, "#7fd8ff", 0.12) : "");
});
// the fusion reactor: a ring of plates around a pulsing core (frame), cables to the floor, warning stripes
art("isoreactor", 14, 14, 40, ({ on = true, frame = 0 }) => {
  let g = ishadow(14, 14) + ibox(0, 0, 14, 14, 0, 4, T3("#3a4450"));
  for (let k = 0; k < 7; k++) g += path([[k * 2, 14, 0], [k * 2 + 1, 14, 0], [k * 2 + 2, 14, 4], [k * 2 + 1, 14, 4]], k % 2 ? "#1c1c22" : "#e8c23a");
  for (const [x, y] of [[2, 2], [12, 2], [2, 12], [12, 12]]) g += ibox(x - 0.6, y - 0.6, 1.2, 1.2, 4, 26, STEEL);
  const k = on ? [0.8, 1, 1.15, 1][frame % 4] : 0.5, [x, y] = ipt(7, 7, 18);
  g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="11" ry="5" fill="none" stroke="#6a7684" stroke-width="2.4"/><ellipse cx="${n2(x)}" cy="${n2(y)}" rx="11" ry="5" fill="none" stroke="${on ? CY : "#3a4a5a"}" stroke-width=".6"/>`;
  g += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(4 * k)}" fill="${on ? CY : "#2a3a4a"}" fill-opacity=".85"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(2 * k)}" fill="${on ? "#f4ffff" : "#3a4a5a"}"/>`;
  return g + (on ? glow(7, 7, 18, 14 * k, CY, 0.16) : "") + ibox(0, 0, 14, 14, 30, 2, T3("#3a4450"));
});
// the delivery drone: four rotors (they blur: frame), a small body, a parcel under it, hovering over its pad
art("isodrone", 12, 12, 40, ({ c = "#e6e8ee", frame = 0, still = false }) => {
  const bob = still ? 0 : [0, 0.8, 1.4, 0.8][frame % 4];
  let g = ishadow(12, 12, 0) + iell(6, 6, 0.2, 4.6, "#2a3340") + iell(6, 6, 0.25, 3.4, "none", ` stroke="${CY}" stroke-width=".4"`);
  const z = 22 + bob;
  for (const [x, y] of [[1.6, 1.6], [10.4, 1.6], [1.6, 10.4], [10.4, 10.4]]) g += iline(ipt(6, 6, z), ipt(x, y, z + 0.6), "#3a4450", 0.7) + iell(x, y, z + 1, 2.2, `${shade(c, 0.9)}${still ? "" : "88"}`) + iell(x, y, z + 1.05, 0.5, "#2a3340");
  g += ibox(4.4, 4.4, 3.2, 3.2, z - 1.4, 2.4, T3(c)) + ifront(5, 7.6, 2, z - 0.6, 0.6, frame % 2 ? "#51cf66" : "#ff4d5e");
  return g + iline(ipt(6, 6, z - 1.4), ipt(6, 6, z - 4), "#3a4450", 0.3) + ibox(4.8, 4.8, 2.4, 2.4, z - 6.4, 2.4, T3("#b08a5a"));
});
// the alien plant: a dark pot, translucent bulbs that glow (dry: duller)
art("isoalienplant", 10, 10, 30, ({ dry = false, frame = 0 }) => {
  let g = ishadow(10, 10, 0) + icyl(5, 5, 0, 6, 3.4, "#2a3340", "#3a4450") + iell(5, 5, 6.05, 2.9, "#1a1a20");
  const C = dry ? ["#6a7a5a", "#5a6a4a"] : ["#7dffb0", MG];
  for (const [i, [dx, dy, h]] of [[0, 0, 16], [-1.6, 0.6, 11], [1.4, -0.8, 13], [0.6, 1.4, 9]].entries()) {
    const [x0, y0] = ipt(5, 5, 6), [x1, y1] = ipt(5 + dx, 5 + dy, 6 + h);
    g += `<path fill="none" stroke="#3f7a5a" stroke-width=".7" d="M${n2(x0)} ${n2(y0)}Q${n2(x0 + dx * 2)} ${n2((y0 + y1) / 2)} ${n2(x1)} ${n2(y1)}"/>`;
    const pulse = dry ? 0.5 : 0.6 + ((frame + i) % 3) * 0.15;
    g += `<circle cx="${n2(x1)}" cy="${n2(y1)}" r="${n2(1.8 + (i % 2) * 0.6)}" fill="${C[i % 2]}" fill-opacity="${pulse.toFixed(2)}"/><circle cx="${n2(x1 - 0.5)}" cy="${n2(y1 - 0.5)}" r=".5" fill="#ffffff" fill-opacity=".7"/>`;
    if (!dry) g += `<circle cx="${n2(x1)}" cy="${n2(y1)}" r="4" fill="${C[i % 2]}" fill-opacity=".12"/>`;
  }
  return g;
});
