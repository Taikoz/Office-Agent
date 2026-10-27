// Isometric furniture, Habbo style (iso/engine.js): volumes built from boxes. Sizes are in the 2D scene's units (x
// along the right wall, y toward the viewer; a piece covers the same footprint as in the 2D view), heights in screen
// units. A piece is drawn from the back corner of its footprint. Light comes from the left: tops light, the faces
// toward the viewer's left (front, +y) in the base color, the faces toward the right (side, +x) darker.

import { ART, SvgArt, shade } from "./base.js";
import { FOOT_LINEUP } from "./lounge.js";
import { personSvg } from "./people.js";
import { pixelImage } from "./pixelpeople.js";

const K = 0.6;
const n2 = v => +v.toFixed(2);
export const ipt = (x, y, z = 0) => [(x - y) * K, (x + y) * K / 2 - z];
const ipoly = (pts, fill, more = "") => `<path fill="${fill}"${more} d="M${pts.map(p => `${n2(p[0])} ${n2(p[1])}`).join("L")}Z"/>`;
const tones = c => Array.isArray(c) ? c : [shade(c, 1.2), c, shade(c, 0.74)];
// a box: footprint (x, y, w, d), from z0 up h; color: one base (shaded per face) or [top, front, side]
function ibox(x, y, w, d, z0, h, color, more = "") {
  const [top, front, side] = tones(color), z1 = z0 + h;
  return ipoly([ipt(x, y + d, z0), ipt(x + w, y + d, z0), ipt(x + w, y + d, z1), ipt(x, y + d, z1)], front, more)
    + ipoly([ipt(x + w, y + d, z0), ipt(x + w, y, z0), ipt(x + w, y, z1), ipt(x + w, y + d, z1)], side, more)
    + ipoly([ipt(x, y, z1), ipt(x + w, y, z1), ipt(x + w, y + d, z1), ipt(x, y + d, z1)], top, more);
}
const itop = (x, y, w, d, z, fill, more = "") => ipoly([ipt(x, y, z), ipt(x + w, y, z), ipt(x + w, y + d, z), ipt(x, y + d, z)], fill, more);
// a rect on a face toward +y (plane y, from x to x + w) or toward +x (plane x, from y to y + d)
const ifront = (x, y, w, z0, h, fill, more = "") => ipoly([ipt(x, y, z0), ipt(x + w, y, z0), ipt(x + w, y, z0 + h), ipt(x, y, z0 + h)], fill, more);
const iside = (x, y, d, z0, h, fill, more = "") => ipoly([ipt(x, y, z0), ipt(x, y + d, z0), ipt(x, y + d, z0 + h), ipt(x, y, z0 + h)], fill, more);
const iline = (a, b, stroke, w = 0.5) => `<path fill="none" stroke="${stroke}" stroke-width="${w}" d="M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}"/>`;
// an ellipse on a horizontal plane (a circle of radius r on the floor, seen in isometric view)
const iell = (cx, cy, z, r, fill, more = "") => { const [x, y] = ipt(cx, cy, z); return `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(r * K * 1.414)}" ry="${n2(r * K * 0.707)}" fill="${fill}"${more}/>`; };
// a short cylinder (stool, pot, fire pit): its side, then its top
const icyl = (cx, cy, z0, h, r, side, top) => {
  const [x, y0] = ipt(cx, cy, z0), y1 = y0 - h, rx = n2(r * K * 1.414), ry = n2(r * K * 0.707);
  return `<path fill="${side}" d="M${n2(x - rx)} ${n2(y1)}V${n2(y0)}A${rx} ${ry} 0 0 0 ${n2(x + rx)} ${n2(y0)}V${n2(y1)}Z"/><ellipse cx="${n2(x)}" cy="${n2(y1)}" rx="${rx}" ry="${ry}" fill="${top}"/>`;
};
const ishadow = (w, d, m = 2) => iell(w / 2, d / 2, 0, (w + d) / 2.6 + m, "#000", ' fill-opacity=".2"');
const wood = (base, k = 1) => [shade(base, 1.16 * k), shade(base, k), shade(base, 0.76 * k)];

export class IsoArt extends SvgArt {
  // footprint w × d (2D units), H screen units tall above the floor
  // (opts.mx: room on both sides, for what overhangs the footprint: a parasol, a tree)
  constructor(name, w, d, H, opts = {}) { super(name, (w + d) * K, (w + d) * K / 2 + H, { pad: 1, ...opts }); Object.assign(this, { fw: w, fd: d, H, mx: opts.mx || 0 }); }
  box() { return [-this.fd * K - this.mx, -this.H, (this.fw + this.fd) * K + 2 * this.mx, (this.fw + this.fd) * K / 2 + this.H]; }
}
const reg = C => { const a = new C(); ART[a.name] = a; };

/* ---------- the break room ---------- */
reg(class extends IsoArt {  // the TV on its low cabinet, against the wall, its screen toward the sofa
  constructor() { super("isotvunit", 26, 8, 28); }
  body({ on = false, frame = 0, w = "#8a6a4a", back = false }) {
    if (back) return ishadow(26, 8) + ibox(0, 0, 26, 8, 0, 8, wood(w)) + ibox(11, 2, 4, 3, 8, 1, "#1c1c24") + ibox(12.4, 2.2, 1.2, 1.2, 9, 3, "#1c1c24") + ibox(2, 3.1, 22, 1.4, 11, 15, ["#2a2a33", "#2a2a33", "#1c1c24"]) + ifront(9, 4.5, 8, 15, 6, "#3a3a46");
    let g = ishadow(26, 8) + ibox(0, 0, 26, 8, 0, 8, wood(w)) + ifront(1.5, 8, 11, 1.5, 5, shade(w, 0.85)) + ifront(13.5, 8, 11, 1.5, 5, shade(w, 0.85))
      + ifront(6, 8, 2, 4, 0.8, "#c9ccd6") + ifront(18, 8, 2, 4, 0.8, "#c9ccd6");
    g += ibox(11, 3, 4, 3, 8, 1, "#1c1c24") + ibox(12.4, 3.8, 1.2, 1.2, 9, 3, "#1c1c24") + ibox(2, 3.5, 22, 1.4, 11, 15, ["#2a2a33", "#14141c", "#1c1c24"]);
    g += ifront(3, 4.9, 20, 12, 13, on ? "#0b1020" : "#1c1d26");
    if (on) {  // a cartoon: sky, sun, a hill, a hero
      g += ifront(3, 4.9, 20, 18, 7, ["#7fc4ff", "#8fd0ff", "#ffb36b", "#7fc4ff"][frame % 4]) + ifront(3, 4.9, 20, 12, 6, "#3f9e4f");
      g += ifront(5 + frame * 3, 4.9, 2.4, 14, 4, "#ff6b6b") + ifront(18, 4.9, 2.4, 21, 2.4, "#ffe066");
    } else g += ipoly([ipt(13, 4.9, 25), ipt(17, 4.9, 25), ipt(12, 4.9, 12), ipt(8, 4.9, 12)], "#ffffff", ' fill-opacity=".06"');
    return g + ifront(21, 4.9, 1, 12.4, 0.6, on ? "#51cf66" : "#ff6b6b");
  }
});
reg(class extends IsoArt {  // the sofa seen from behind (the team watches the TV): seat and armrests; its back is isosofaback
  constructor() { super("isosofa", 56, 16, 14); }
  body() {
    const c = "#1f75be", d = "#11379e";
    let g = ishadow(56, 22) + ibox(0, 0, 56, 16, 0, 5, d);
    for (let i = 0; i < 3; i++) g += ibox(5 + i * 15.4, 1, 15, 15, 5, 3, [shade(c, 1.25), c, shade(c, 0.75)]);
    return g + ibox(0, 0, 5, 16, 5, 6, ["#2a4fd0", d, "#0a2a78"]) + ibox(51, 0, 5, 16, 5, 6, ["#2a4fd0", d, "#0a2a78"]);
  }
});
reg(class extends IsoArt {  // its back, in front of whoever sits there: low, the heads and shoulders show over it
  constructor() { super("isosofaback", 56, 6, 12); }
  body() {
    const d = "#11379e";
    let g = ibox(0, 0, 56, 6, 0, 9, ["#2a4fd0", d, "#0a2a78"]) + ibox(0, 0.5, 56, 3, 9, 1.6, ["#589edc", "#1f75be", "#11379e"]);
    for (const x of [18.6, 36.6]) g += ifront(x, 6, 0.6, 2, 6.5, "#0a2a78");
    return g + ifront(4, 6, 48, 1, 0.6, "#0a2a78");
  }
});
reg(class extends IsoArt {  // the reading armchair, facing the room
  constructor() { super("isoarmchair", 24, 18, 24); }
  body() {
    const c = "#b85905", d = "#95440b", e = "#7b380c";
    let g = ishadow(24, 18) + ibox(1, 0, 22, 6, 0, 22, [shade(c, 1.2), c, d]) + ibox(2, 1, 20, 1, 19, 3, ["#de8001", "#de8001", c]);
    g += ibox(1, 6, 22, 12, 0, 6, d) + ibox(4, 6, 16, 11, 6, 3, ["#f0a040", "#de8001", "#b86a00"]);
    return g + ibox(0, 4, 4, 14, 0, 12, [shade(e, 1.3), e, shade(e, 0.75)]) + ibox(20, 4, 4, 14, 0, 12, [shade(e, 1.3), e, shade(e, 0.75)]);
  }
});
reg(class extends IsoArt {  // the bookshelf against the wall
  constructor() { super("isobookshelf", 26, 7, 36); }
  body({ w = "#6d5238" }) {
    let g = ibox(0, 0, 26, 7, 0, 34, wood(w)) + ifront(1.5, 7, 23, 1.5, 31, shade(w, 0.55));
    const books = ["#ff6b6b", "#4090d7", "#fbaa08", "#51cf66", "#e9e4f5", "#b48cff", "#ff8f6b"];
    for (let r = 0; r < 3; r++) {
      const z = 2 + r * 10.5;
      g += ifront(1.5, 7, 23, z, 1, shade(w, 1.05));
      for (let x = 2, k = 0; x < 23; k++) { const bw = 2 + (k % 2), h = 6 + ((k * 7 + r * 3) % 3); if (x + bw > 24) break; g += ifront(x, 6.8, bw, z + 1, h, books[(k + r) % books.length]); x += bw + 0.4; }
    }
    return g;
  }
});
reg(class extends IsoArt {  // the arcade cabinet: marquee, screen (attract mode or a game), control panel, coin door
  constructor() { super("isoarcade", 22, 14, 42); }
  body({ frame = 0, playing = false }) {
    const on = frame % 2, F = 14;
    let g = ishadow(22, 14) + ibox(0, 0, 22, 9, 0, 40, ["#5a35a0", "#3b1d6e", "#2a1450"]) + ibox(0, 9, 22, 5, 0, 16, ["#4a2a8a", "#3b1d6e", "#2a1450"]);
    g += ibox(0, 9, 22, 6, 16, 3, ["#5a35a0", "#4a2a8a", "#2a1450"]);  // control panel
    g += iell(6, 11.5, 19.1, 1.4, "#1c1c24") + ibox(5.6, 11, 0.8, 0.8, 19, 2.6, "#1c1c24") + iell(6, 11.4, 21.8, 1.1, "#ff3b3b");
    for (const [x, c] of [[12, "#fbaa08"], [15, "#5aa9ff"], [18, "#51cf66"]]) g += iell(x, 12, 19.2, 1, c);
    g += ifront(1, 9, 20, 34, 5, on ? "#fbaa08" : "#de8001");  // marquee
    for (let i = 0; i < 6; i++) g += ifront(2.5 + i * 3, 9, 1.2, 35.6, 1.4, (i + on) % 2 ? "#fff3b0" : "#ff6b6b");
    g += ifront(2, 9, 18, 20, 13, "#0a0a12") + ifront(3, 9, 16, 21, 11, playing ? "#0b1640" : "#10102a");
    if (playing) { g += ifront(9 + on * 2, 9, 2, 22, 1.6, "#51cf66") + ifront(10 + on * 2, 9, 0.5, 25, 1.6, "#fff3b0"); for (let i = 0; i < 4; i++) g += ifront(4 + i * 3.6 + on, 9, 1.8, 29, 1.2, i % 2 ? "#ff6b6b" : "#b48cff"); }
    else { for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g += ifront(4.4 + i * 3.4 + on * 0.8, 9, 1.8, 27.5 - j * 2.6, 1.2, j ? "#5aa9ff" : "#51cf66"); if (on) g += ifront(5, 9, 12, 22.5, 1, "#fbaa08"); }
    g += ifront(7, F, 8, 3, 8, "#2a1450") + ifront(8.4, F, 1.4, 6, 3, on ? "#ff3b3b" : "#a32020") + ifront(12.2, F, 1.4, 6, 3, on ? "#ff3b3b" : "#a32020");
    return g + iside(22, 0, 9, 4, 10, "#ff6b9a", ' fill-opacity=".5"');
  }
});
reg(class extends IsoArt {  // ping-pong: legs, the green top with its lines, the net across; paddles when nobody plays
  constructor() { super("isopingpong", 68, 20, 18); }
  body({ idle = true }) {
    let g = ishadow(68, 20);
    for (const [x, y] of [[4, 2], [62, 2], [4, 16], [62, 16], [32, 2], [32, 16]]) g += ibox(x, y, 2, 2, 0, 9, "#3a3a48");
    g += ibox(0, 0, 68, 20, 9, 1.4, ["#1f8a5a", "#156b45", "#0f5034"]);
    const z = 10.45, L = (a, b) => iline(ipt(a[0], a[1], z), ipt(b[0], b[1], z), "#f7f7f7", 0.4);
    g += L([0.6, 0.6], [67.4, 0.6]) + L([67.4, 0.6], [67.4, 19.4]) + L([67.4, 19.4], [0.6, 19.4]) + L([0.6, 19.4], [0.6, 0.6]) + L([0.6, 10], [67.4, 10]);
    g += iside(34, -1.5, 23, z, 4, "#e0e0ea", ' fill-opacity=".8"') + iside(34, -1.5, 23, z + 3.6, 0.6, "#3a3a48") + ibox(33.6, -2, 0.8, 1, z - 1, 5, "#3a3a48") + ibox(33.6, 21, 0.8, 1, z - 1, 5, "#3a3a48");
    if (idle) g += iell(12, 6, z + 0.1, 2.6, "#d64545") + ibox(14, 5.4, 4, 1, z, 0.6, "#8a6a4a") + iell(56, 14, z + 0.1, 2.6, "#1c1c24") + ibox(50, 13.4, 4, 1, z, 0.6, "#8a6a4a") + iell(24, 14, z + 0.8, 0.8, "#fff");
    return g;
  }
});
reg(class extends IsoArt {  // the baby-foot: a wooden cabinet, the field, eight rods across (toward each team's side)
  constructor() { super("isobabyfoot", 44, 24, 22); }
  body({ shift = 0 }) {
    let g = ishadow(44, 24);
    for (const [x, y] of [[2, 2], [40, 2], [2, 20], [40, 20]]) g += ibox(x, y, 2, 2, 0, 7, "#4a3826");
    g += ibox(0, 0, 44, 24, 7, 6, ["#a8774c", "#8a5d3a", "#6d4a2e"]);
    const z = 12.9;
    for (let i = 0; i < 8; i++) g += itop(2 + i * 5, 2, 5, 20, z, i % 2 ? "#2b9240" : "#2f9e44");
    g += iline(ipt(22, 2, z), ipt(22, 22, z), "#f7f7f7", 0.3) + itop(0.4, 8, 1.6, 8, z + 0.05, "#14141c") + itop(42, 8, 1.6, 8, z + 0.05, "#14141c");
    FOOT_LINEUP.forEach(([c, men], i) => {
      const x = 4.5 + i * 5, red = c === "#d64545", dy = (red ? shift : -shift) * 1.2;
      g += iline(ipt(x, -4, z + 3.2), ipt(x, 28, z + 3.2), "#c9ccd6", 0.5);
      g += red ? ibox(x - 0.7, -6, 1.4, 2.4, z + 2.2, 2, "#1c1c24") : ibox(x - 0.7, 27.6, 1.4, 2.4, z + 2.2, 2, "#1c1c24");
      for (const y of { 1: [12], 2: [8, 16], 3: [6, 12, 18], 5: [4, 8, 12, 16, 20] }[men]) g += ibox(x - 0.8, y + dy - 0.6, 1.6, 1.2, z, 4, c);
    });
    return g;
  }
});
reg(class extends IsoArt {  // karaoke: a stage with its light strip, two speakers at the back, the mic stand, a wedge monitor;
  // on: the lights chase, a spotlight on the singer, the speakers pump
  constructor() { super("isostage", 48, 32, 26); }
  body({ frame = 0, on = false }) {
    const pulse = on && frame % 2 ? 0.8 : 0;
    let g = ishadow(48, 32) + ibox(0, 0, 48, 32, 0, 4, ["#9a62d0", "#5b2a86", "#3a1a58"]) + itop(2, 2, 44, 28, 4.05, "#6b3a9e");
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g += itop(4 + i * 7, 4 + j * 6.5, 7, 6.5, 4.1, "#7a48b0");  // checkered floor
    for (let i = 0; i < 8; i++) g += ifront(1.5 + i * 6, 32, 2.4, 1, 2, on && (i + frame) % 3 === 0 ? "#fbaa08" : on ? "#ff6bd5" : "#ffd88a");
    for (let i = 0; i < 5; i++) g += iside(48, 2 + i * 6.2, 2.4, 1, 2, on && (i + frame) % 3 === 1 ? "#fbaa08" : on ? "#5aa9ff" : "#ffd88a");
    if (on) g += iell(24, 22, 4.2, 10, "#fff3b0", ' fill-opacity=".35"') + iell(24, 22, 4.25, 6, "#ffffff", ' fill-opacity=".3"');  // the spotlight
    for (const x of [2, 38]) {  // the speakers
      g += ibox(x, 2, 8, 7, 4, 15, ["#3a3a46", "#2b2b33", "#1c1c24"]);
      g += ifront(x + 2.2, 9, 3.6, 6.5 - pulse / 2, 3.6 + pulse, "#454552") + ifront(x + 3.2, 9, 1.6, 7.6, 1.4, "#14141c") + ifront(x + 2.8, 9, 2.4, 13.5, 2.4, "#454552");
      if (on) g += ifront(x + 1, 9, 6, 17.6, 0.6, frame % 2 ? "#51cf66" : "#fbaa08");
    }
    g += ibox(20, 27, 8, 4, 4, 3, ["#3a3a46", "#2b2b33", "#1c1c24"]) + ipoly([ipt(20, 27, 7), ipt(28, 27, 7), ipt(28, 29.5, 9.4), ipt(20, 29.5, 9.4)], "#454552");  // the wedge
    g += iell(30, 24, 4.2, 2.4, "#2b2b33") + ibox(29.6, 23.6, 0.8, 0.8, 4, 15, "#2b2b33") + iline(ipt(30, 24, 19), ipt(28, 22.5, 21), "#2b2b33", 0.8) + (on ? "" : ibox(27, 21.6, 1.8, 1.8, 20.2, 2.4, "#9aa0ad"));  // the mic stand (its mic in the singer's hand)
    return g + ifront(16, 32, 16, 1.2, 1.6, on ? "#ffffff" : "#e9e4f5") + ifront(17, 32, 14, 1.6, 0.8, on ? "#ff6bd5" : "#b48cff");  // the KARAOKÉ plate
  }
});
reg(class extends IsoArt {  // the board game on a low table
  constructor() { super("isogametable", 34, 12, 10); }
  body({ frame = 0 }) {
    let g = ishadow(34, 12);
    for (const [x, y] of [[1, 1], [31, 1], [1, 9], [31, 9]]) g += ibox(x, y, 2, 2, 0, 5, "#5b3a20");
    g += ibox(0, 0, 34, 12, 5, 1.6, ["#9a6a40", "#7a4b32", "#5b3a20"]) + itop(7, 1.5, 20, 9, 6.65, "#f7f0dc");
    const cells = ["#c0392b", "#2f9e44", "#2c7ae0", "#fbaa08"];
    for (let i = 0; i < 6; i++) g += itop(7.5 + i * 3.2, 1.8, 2.6, 1.6, 6.7, cells[i % 4]) + itop(7.5 + i * 3.2, 8.4, 2.6, 1.6, 6.7, cells[(i + 2) % 4]);
    g += ibox(9 + frame * 3, 4.5, 1.4, 1.4, 6.6, 2.4, "#c0392b") + ibox(22 - frame * 2.4, 6, 1.4, 1.4, 6.6, 2.4, "#2c7ae0") + ibox(3, 4, 2, 2, 6.6, 1.4, "#f7f7f7");
    return g + itop(29, 3, 3, 5, 6.7, "#fbaa08");
  }
});
reg(class extends IsoArt {  // a floor cushion
  constructor() { super("isocushion", 14, 10, 6); }
  body({ c = "#d64545" }) { return ishadow(14, 10, 0) + ibox(0, 0, 14, 10, 0, 3, [shade(c, 1.25), c, shade(c, 0.75)]) + itop(2, 2, 10, 6, 3.05, shade(c, 1.1)); }
});
reg(class extends IsoArt {  // the dining table: wood, a gingham cloth
  constructor() { super("isodining", 48, 18, 14); }
  body() {
    let g = ishadow(48, 18);
    for (const [x, y] of [[2, 2], [44, 2], [2, 14], [44, 14]]) g += ibox(x, y, 2, 2, 0, 11, "#4a3826");
    g += ibox(0, 0, 48, 18, 11, 1.6, ["#c0946a", "#a0764e", "#7a5636"]) + itop(2, 1.5, 44, 15, 12.65, "#f4f2ea");
    for (let i = 0; i < 9; i++) g += itop(2 + i * 5, 1.5, 2.4, 15, 12.7, "#ff6b6b", ' fill-opacity=".35"');
    for (let j = 0; j < 4; j++) g += itop(2, 1.5 + j * 4, 44, 2, 12.75, "#ff6b6b", ' fill-opacity=".3"');
    return g + ifront(2, 16.5, 44, 9.5, 3.2, "#f4f2ea") + ifront(2, 16.5, 44, 9.5, 3.2, "#ff6b6b", ' fill-opacity=".25"');
  }
});
reg(class extends IsoArt {  // a stool
  constructor() { super("isostool", 10, 10, 9); }
  body() {
    let g = ishadow(10, 10, 0);
    for (const [x, y] of [[2, 2], [6.6, 2], [2, 6.6], [6.6, 6.6]]) g += ibox(x, y, 1.4, 1.4, 0, 6, "#4a3826");
    return g + icyl(5, 5, 6, 1.6, 5, "#6d5238", "#8a6a4a");
  }
});
reg(class extends IsoArt {  // a beanbag
  constructor() { super("isobeanbag", 18, 14, 11); }
  body({ c = "#1f75be" }) {
    const [x, y] = ipt(9, 7);
    return ishadow(18, 14, 0) + `<ellipse cx="${n2(x)}" cy="${n2(y - 3)}" rx="9.6" ry="5.4" fill="${shade(c, 0.6)}"/><ellipse cx="${n2(x)}" cy="${n2(y - 4.4)}" rx="8.8" ry="4.8" fill="${c}"/>`
      + `<ellipse cx="${n2(x - 2.4)}" cy="${n2(y - 6.6)}" rx="4.4" ry="2.2" fill="${shade(c, 1.35)}"/><path fill="${shade(c, 0.75)}" d="M${n2(x + 1)} ${n2(y - 9)}q4 1 6 4.4q-3 -1.4 -6 -1.6z"/>`;
  }
});
reg(class extends IsoArt {  // the kitchen counter: cupboards, a light top, the sink, the coffee maker, a cutting board
  constructor() { super("isocounter", 42, 10, 26); }
  body() {
    let g = ibox(0, 0, 42, 10, 0, 15, ["#e8e8e8", "#11379e", "#0a2a78"]) + ibox(0, 0, 42, 10, 15, 1.4, ["#f2f2f2", "#dadada", "#bdbdbd"]);
    for (const x of [14, 28]) g += ifront(x, 10, 0.5, 1, 13, "#081746");
    for (const x of [6, 20, 34]) g += ifront(x, 10, 3, 11, 0.7, "#c8c8c8");
    g += ifront(0, 10, 42, 0, 1, "#081746");
    g += itop(17, 2, 11, 6, 16.45, "#8d8aa0") + itop(18, 2.8, 9, 4.4, 16.5, "#6f7488") + ibox(22, 0.5, 1, 1, 16.4, 6, "#c8c8c8") + ibox(22, 0.5, 1, 4, 21.4, 1, "#c8c8c8");  // sink and tap
    g += ibox(3, 1, 7, 6, 16.4, 8, ["#3a3a46", "#2a2a33", "#1c1c24"]) + ifront(4, 7, 5, 18, 3, "#4090d7") + ibox(5, 6, 3, 2, 16.4, 2, "#f4f2ea");  // coffee maker
    return g + itop(31, 2, 9, 6, 16.45, "#d6a77f") + ibox(32, 3, 2, 2, 16.5, 2, "#ff6b6b") + ibox(35, 4, 2, 2, 16.5, 2.4, "#fbaa08") + ibox(37.5, 2.5, 1.6, 1.6, 16.5, 2, "#51cf66");
  }
});
reg(class extends IsoArt {  // the fridge (its style recolors #f2f2ef / #d8d8d2 / #b8b8b2): two doors, handles; open: the shelves
  constructor() { super("isofridge", 18, 10, 36); }
  body({ on = false }) {
    let g = ishadow(18, 10, 0) + ibox(0, 0, 18, 10, 0, 34, ["#f2f2ef", "#d8d8d2", "#b8b8b2"]) + ifront(0.6, 10, 16.8, 22, 0.5, "#b8b8b2");
    g += ifront(14.5, 10, 1.2, 24, 7, "#8a8a92") + ifront(14.5, 10, 1.2, 10, 9, "#8a8a92") + ifront(2, 10, 5, 27, 4, "#fbaa08") + ifront(2.6, 10, 1.6, 28, 1.6, "#ff6b6b");
    if (on) {  // the door open toward us: the inside lit, shelves with food
      g += ifront(0.8, 10, 16.4, 1, 20.5, "#f8fbff") + [5, 10, 15].map(z => ifront(0.8, 10, 16.4, z, 0.5, "#c9d7e6")).join("") + ifront(2, 10, 3, 2, 3, "#ff6b6b") + ifront(7, 10, 4, 6, 3.4, "#51cf66") + ifront(12, 10, 3, 11, 4, "#fbaa08");
      g += ipoly([ipt(0, 10, 1), ipt(0, 20, 1), ipt(0, 20, 21), ipt(0, 10, 21)], "#d8d8d2");
    }
    return g + itop(0, 0, 18, 10, 34.05, "#ffffff", ' fill-opacity=".25"');
  }
});
reg(class extends IsoArt {  // the stove: four burners, knobs, the oven window (lit while it cooks)
  constructor() { super("isostove", 14, 10, 24); }
  body({ on = false }) {
    let g = ishadow(14, 10, 0) + ibox(0, 0, 14, 10, 0, 16, ["#f2f2ef", "#d8d8d2", "#b8b8b2"]) + itop(0.6, 0.6, 12.8, 8.8, 16.05, "#2a2a33");
    for (const [x, y] of [[3.6, 3], [10.2, 3], [3.6, 7.2], [10.2, 7.2]]) g += iell(x, y, 16.1, 1.8, "#55556a") + iell(x, y, 16.2, 1, on && x < 5 ? "#5aa9ff" : "#1c1c24");
    g += ibox(0, -1, 14, 1.4, 16, 5, ["#d8d8d2", "#b8b8b2", "#a0a09a"]);  // the back panel
    for (let i = 0; i < 4; i++) g += ifront(1.6 + i * 3.2, 10, 1.4, 13.2, 1.4, "#3a3a46");
    g += ifront(1.6, 10, 10.8, 3, 8.4, "#3a3a46") + ifront(2.6, 10, 8.8, 4, 6.4, on ? "#ff9f43" : "#1c1c24") + ifront(2.6, 10, 8.8, 10.4, 0.6, "#c8c8c8");
    return g + (on ? ifront(3.4, 10, 7, 5, 2, "#ffd27a") : "");
  }
});

/* ---------- the office ---------- */
reg(class extends IsoArt {  // a dev's desk and its computer (the screen is painted live by the room): wood, screen colors, RGB strip
  constructor() { super("isodesk", 36, 12, 26); }
  body({ w = "#8a6a4a", rgb = false }) {
    let g = ishadow(36, 12) + ibox(0, 0, 2.4, 12, 0, 11, wood(w, 0.85)) + ibox(33.6, 0, 2.4, 12, 0, 11, wood(w, 0.85)) + ibox(2.4, 0.5, 31.2, 1.2, 3, 8, wood(w, 0.7));
    g += ibox(0, 0, 36, 12, 11, 1.6, wood(w));
    if (rgb) for (let i = 0; i < 12; i++) g += ifront(i * 3, 12, 3, 11.2, 0.8, `hsl(${i * 30} 90% 60%)`);
    g += itop(15, 2.5, 6, 3, 12.65, "#2a2a33") + ibox(17.2, 3, 1.6, 1.2, 12.6, 4, "#1c1c24");  // the monitor's foot
    g += ibox(9, 2.4, 18, 1.4, 14.6, 10, ["#33333f", "#1c1c24", "#2a2a33"]) + ifront(10, 3.8, 16, 15.6, 8, "#222230");
    g += itop(10.5, 6.6, 15, 3, 12.65, "#3a3a46");  // keyboard
    for (let r = 0; r < 3; r++) g += itop(11, 7 + r * 0.9, 14, 0.4, 12.7, "#55556a");
    return g + itop(28, 7, 2, 3, 12.7, "#3a3a46") + icyl(4, 5, 12.6, 3, 1.6, "#f4f2ea", "#6d4a2e") + itop(31, 2, 4, 5, 12.7, "#f4f2ea") + itop(31.4, 2.4, 3.6, 4.4, 12.75, "#fff7b8");
  }
});
reg(class extends IsoArt {  // an office chair: the seat on its column and its five wheels (its back is isochairback)
  constructor() { super("isochair", 12, 10, 10); }
  body({ c = "#3a3f52" }) {
    let g = ishadow(12, 10, 0);
    for (const [x, y] of [[1, 2], [11, 2], [6, 0], [2, 9], [10, 9]]) g += iline(ipt(6, 5, 1), ipt(x, y, 0.6), "#2a2a33", 0.8) + iell(x, y, 0.5, 0.7, "#1c1c24");
    return g + ibox(5.3, 4.3, 1.4, 1.4, 1, 6, "#2a2a33") + ibox(0.5, 0.5, 11, 9, 7, 2.2, [shade(c, 1.25), c, shade(c, 0.7)]);
  }
});
reg(class extends IsoArt {  // its back: low, in front of the dev who works there (their shoulders show), behind someone facing us
  constructor() { super("isochairback", 12, 2, 15); }
  body({ c = "#3a3f52" }) {
    let g = ibox(5.4, 0.3, 1.2, 1.2, 7, 3, "#2a2a33") + ibox(1, 0, 10, 2, 9.5, 4.5, ["#55607a", c, shade(c, 0.7)]);
    for (let z = 10.5; z < 14; z += 1.4) g += ifront(1.6, 2, 8.8, z, 0.4, "#55607a");
    return g;
  }
});
/* ---------- the chairs of the shop (items/furniture.js): from scrap to throne ---------- */
// a chair = its back (footprint w × 2, behind whoever sits) and its seat (w × d-1, from y = 1), and both for the shop
// (rear: the back seen from behind, when the chair is turned away from the viewer; else the same)
function chairArts(key, w, d, H, back, seat, rear = null) {
  const B = `isoc${key}back`, S = `isoc${key}`, [ox, oy] = ipt(0, 1);
  reg(class extends IsoArt { constructor() { super(B, w, 2, H); } body(o) { return o.back && rear ? rear(o) : back(o); } });
  reg(class extends IsoArt { constructor() { super(S, w, d - 1, 14); } body(o) { return seat(o); } });
  reg(class extends IsoArt { constructor() { super(`${S}full`, w, d, H); } body(o) { return back(o) + `<g transform="translate(${n2(ox)} ${n2(oy)})">${seat(o)}</g>`; } });
}
const T = c => [shade(c, 1.22), c, shade(c, 0.72)];
const legs4 = (x0, y0, x1, y1, h, c, t = 0.9) => [[x0, y0], [x1 - t, y0], [x0, y1 - t], [x1 - t, y1 - t]].map(([x, y]) => ibox(x, y, t, t, 0, h, c)).join("");
const star5 = (cx, cy, c = "#2a2a33") => [[cx - 5, cy - 3], [cx + 5, cy - 3], [cx, cy - 5], [cx - 4, cy + 4], [cx + 4, cy + 4]].map(([x, y]) => iline(ipt(cx, cy, 1), ipt(x, y, 0.6), c, 0.8) + iell(x, y, 0.5, 0.7, "#1c1c24")).join("");
const dots = (x, y, w, z, n, fill, face = "front") => Array.from({ length: n }, (_, i) => (face === "front" ? ifront : itop)(x + (i + 0.5) * w / n - 0.3, y, 0.6, z, 0.6, fill)).join("");
// poor
chairArts("crate", 12, 11, 10, () => "", ({ c = "#a8845a" }) => {  // a fruit crate turned over
  let g = ishadow(12, 10, 0) + ibox(0.5, 0, 11, 10, 0, 8, T(c));
  for (const z of [2.6, 5.3]) g += ifront(0.5, 10, 11, z, 0.5, shade(c, 0.55)) + iside(11.5, 0, 10, z, 0.5, shade(c, 0.45));
  return g + itop(0.5, 3.2, 11, 0.4, 8.01, shade(c, 0.7)) + itop(0.5, 6.6, 11, 0.4, 8.01, shade(c, 0.7)) + ifront(3, 10, 6, 6, 1.2, "#2a2a33", ' fill-opacity=".35"');
});
chairArts("folding", 12, 11, 16, ({ c = "#8d929c" }) => ibox(1, 0.5, 0.8, 0.8, 8, 7, "#55565e") + ibox(10.2, 0.5, 0.8, 0.8, 8, 7, "#55565e") + ibox(1, 0.4, 10, 1.1, 11.5, 3.4, T(c)),
  ({ c = "#8d929c" }) => {
    let g = ishadow(12, 10, 0);
    for (const x of [1, 11]) g += iline(ipt(x, 0.5, 0), ipt(x, 9.5, 8.4), "#55565e", 0.7) + iline(ipt(x, 9.5, 0), ipt(x, 0.5, 8.4), "#55565e", 0.7);
    return g + ibox(0.6, 0.5, 10.8, 9, 8.2, 0.8, T(c)) + ifront(0.6, 9.5, 10.8, 8.2, 0.3, shade(c, 1.3));
  });
chairArts("plastic", 12, 11, 17, ({ c = "#f0efe9" }) => {
  let g = ibox(0.8, 0, 10.4, 1.6, 8.6, 8, T(c));
  for (const x of [2.6, 5.4, 8.2]) g += ifront(x, 1.6, 1.2, 11, 3.4, shade(c, 0.6));
  return g + itop(0.8, 0, 10.4, 1.6, 16.61, shade(c, 1.3));
}, ({ c = "#f0efe9" }) => ishadow(12, 10, 0) + legs4(0.6, 0.4, 11.4, 9.6, 7.4, T(shade(c, 0.95)), 1.4) + ibox(0.5, 0.3, 11, 9.4, 7.4, 1.2, T(c)) + ifront(0.5, 9.7, 11, 7, 0.6, shade(c, 0.8)));
// affordable
chairArts("bistrot", 12, 11, 16, ({ w = "#1f1f24" }) => ibox(1.5, 0.5, 0.8, 0.8, 8, 8, T(w)) + ibox(9.7, 0.5, 0.8, 0.8, 8, 8, T(w)) + ibox(1.5, 0.3, 9, 1, 14, 1.4, T(w)) + ibox(3, 0.4, 6, 0.8, 11, 0.8, T(w)),
  ({ w = "#1f1f24", cane = "#d9c08a" }) => {
    let g = ishadow(12, 10, 0);
    for (const [x, y] of [[2, 1.5], [10, 1.5], [2.4, 8.6], [9.6, 8.6]]) g += iline(ipt(6, 5, 7.6), ipt(x, y, 0), w, 0.9);
    g += iell(6, 5, 3, 3.4, "none", ` stroke="${w}" stroke-width=".5"`) + icyl(6, 5, 7.4, 1, 5, shade(w, 0.9), cane);
    for (let i = -3; i <= 3; i += 1.5) g += iline(ipt(6 + i, 1.5, 8.41), ipt(6 + i, 8.5, 8.41), shade(cane, 0.75), 0.25);
    return g;
  });
// modern
chairArts("shell", 12, 11, 16, ({ c = "#f0efe9" }) => ibox(0.8, 0, 10.4, 1.6, 9, 6, T(c)) + itop(0.8, 0, 10.4, 1.6, 15.01, shade(c, 1.3)) + ifront(1.6, 1.6, 8.8, 9.4, 4.8, shade(c, 0.9)),
  ({ c = "#f0efe9", leg = "#c9a77a" }) => {
    let g = ishadow(12, 10, 0) + legs4(1.4, 1, 10.6, 9, 7.6, T(leg), 0.8);
    g += iline(ipt(1.8, 1.4, 4), ipt(10.2, 8.6, 4), "#55565e", 0.4) + iline(ipt(10.2, 1.4, 4), ipt(1.8, 8.6, 4), "#55565e", 0.4);
    return g + ibox(0.8, 0.4, 10.4, 9, 7.6, 1.4, T(c)) + itop(1.6, 1.2, 8.8, 7.4, 9.01, shade(c, 0.92));
  });
chairArts("ghost", 12, 11, 17, ({ c = "#dff3f7" }) => ibox(0.8, 0, 10.4, 1.4, 8.6, 8, T(c), ' fill-opacity=".5"') + iline(ipt(0.8, 1.4, 16.6), ipt(11.2, 1.4, 16.6), "#ffffff", 0.4),
  ({ c = "#dff3f7" }) => ishadow(12, 10, 0) + legs4(0.6, 0.4, 11.4, 9.6, 7.6, T(c), 1) .replace(/<path /g, '<path fill-opacity=".5" ') + ibox(0.5, 0.3, 11, 9.4, 7.6, 1, T(c), ' fill-opacity=".55"') + iline(ipt(1, 9.7, 8.6), ipt(11, 9.7, 8.6), "#ffffff", 0.4));
chairArts("mesh", 12, 11, 24, ({ c = "#2a2a33" }) => {
  let g = ibox(5.4, 0.3, 1.2, 1.2, 7, 3, "#2a2a33") + ibox(1, 0, 10, 1.6, 10, 9.4, T(c), ' fill-opacity=".85"');
  for (let x = 1.8; x < 11; x += 1.2) g += iline(ipt(x, 1.6, 10.4), ipt(x, 1.6, 19), shade(c, 1.6), 0.15);
  return g + ifront(2.4, 1.6, 7.2, 12, 1.2, shade(c, 1.5)) + ibox(5.6, 0.6, 0.8, 0.6, 19.4, 1.4, "#2a2a33") + ibox(3, 0, 6, 1.4, 20.6, 2.6, T(c));
}, ({ c = "#2a2a33" }) => ishadow(12, 10, 0) + star5(6, 5) + ibox(5.3, 4.3, 1.4, 1.4, 1, 6, "#2a2a33") + ibox(0.5, 0.5, 11, 9, 7, 2.2, T(c))
  + ibox(0.2, 3, 1, 1, 8, 3.6, "#2a2a33") + ibox(0, 2.4, 1.4, 5, 11.4, 0.8, "#1c1c24") + ibox(10.8, 3, 1, 1, 8, 3.6, "#2a2a33") + ibox(10.6, 2.4, 1.4, 5, 11.4, 0.8, "#1c1c24"));
chairArts("gamer", 12, 11, 26, ({ c = "#1c1c22", accent = "#d23a2a" }) => {
  let g = ibox(5.4, 0.3, 1.2, 1.2, 7, 3, "#2a2a33") + ibox(1.2, 0, 9.6, 2, 9.5, 15, T(c)) + ibox(0.4, 0, 1.6, 2, 11, 9, T(accent)) + ibox(10, 0, 1.6, 2, 11, 9, T(accent));
  return g + ifront(3.4, 2, 5.2, 20, 2.4, accent) + ibox(3.2, 1.2, 5.6, 1.2, 15, 2.4, T(accent)) + ifront(5, 2, 2, 13, 2, shade(accent, 1.2));
}, ({ c = "#1c1c22", accent = "#d23a2a" }) => ishadow(12, 10, 0) + star5(6, 5) + ibox(5.3, 4.3, 1.4, 1.4, 1, 6, "#2a2a33")
  + ibox(0.5, 0.5, 11, 9, 7, 2.2, T(c)) + ibox(0.5, 0.5, 2, 9, 9.2, 1.4, T(accent)) + ibox(9.5, 0.5, 2, 9, 9.2, 1.4, T(accent)) + ifront(4.5, 9.5, 3, 7.4, 1.4, accent),
  ({ c = "#1c1c22", accent = "#d23a2a" }) => ibox(5.4, 0.3, 1.2, 1.2, 7, 3, "#2a2a33") + ibox(1.2, 0, 9.6, 2, 9.5, 15, T(c)) + ibox(0.4, 0, 1.6, 2, 11, 9, T(accent)) + ibox(10, 0, 1.6, 2, 11, 9, T(accent)) + ifront(4, 2, 4, 16, 3, shade(c, 1.4)));
// rich
chairArts("chester", 12, 11, 16, ({ c = "#1f4a32" }) => {
  let g = ibox(0, 0, 12, 2, 3, 12, T(c)) + itop(0, 0, 12, 2, 15.01, shade(c, 1.35));
  for (const z of [7, 10.5]) g += dots(1, 2, 10, z, 4, shade(c, 0.6));
  return g + dots(0.5, 2, 11, 13.4, 5, "#d4a640");
}, ({ c = "#1f4a32" }) => {
  let g = ishadow(12, 10, 0) + legs4(0.6, 0.4, 11.4, 9.6, 3, T("#4a2f1c"), 1.2) + ibox(0.5, 0.5, 11, 9, 3, 5.8, T(c)) + ibox(1.6, 0.8, 8.8, 8.4, 8.8, 0.6, T(shade(c, 1.1)));
  g += ibox(0, 0.5, 1.6, 9, 3, 7.6, T(c)) + ibox(10.4, 0.5, 1.6, 9, 3, 7.6, T(c));
  return g + dots(0.5, 9.5, 11, 3.6, 9, "#d4a640");
});
chairArts("wassily", 12, 11, 17, ({ c = "#1c1c22" }) => ibox(0.6, 0.6, 0.6, 0.6, 7, 9, chrome) + ibox(10.8, 0.6, 0.6, 0.6, 7, 9, chrome) + ibox(1.2, 0.4, 9.6, 0.5, 9, 6.6, T(c)),
  ({ c = "#1c1c22" }) => {
    let g = ishadow(12, 10, 0);
    for (const x of [0.6, 10.8]) g += ibox(x, 0.5, 0.6, 9, 0, 0.6, chrome) + ibox(x, 8.9, 0.6, 0.6, 0, 10.4, chrome) + ibox(x, 0.5, 0.6, 9, 10.4, 0.6, chrome) + ibox(x, 2.4, 0.6, 7, 7.4, 2.4, T(c));
    return g + ibox(1.2, 1, 9.6, 0.6, 6.4, 0.6, chrome) + ibox(1.2, 0.6, 9.6, 8.4, 7.2, 0.5, T(c));
  });
chairArts("exec", 12, 11, 28, ({ c = "#1c1c22" }) => {
  let g = ibox(5.4, 0.3, 1.2, 1.2, 7, 3, "#c9ccd6") + ibox(0.5, 0, 11, 2.4, 9.5, 17, T(c)) + itop(0.5, 0, 11, 2.4, 26.51, shade(c, 1.4));
  for (const z of [12, 16, 20]) g += dots(1.6, 2.4, 8.8, z, 3, shade(c, 0.55));
  return g + ibox(1.4, 1.4, 9.2, 1.4, 22.4, 3.4, T(shade(c, 1.12)));
}, ({ c = "#1c1c22" }) => ishadow(12, 10, 0) + star5(6, 5, "#c9ccd6") + ibox(5.3, 4.3, 1.4, 1.4, 1, 6, "#c9ccd6")
  + ibox(0.3, 0.3, 11.4, 9.4, 7, 2.8, T(c)) + ibox(1.4, 0.8, 9.2, 8.4, 9.8, 0.6, T(shade(c, 1.12))) + ibox(-0.2, 1.6, 1.6, 7.4, 9.8, 2.8, T(c)) + ibox(10.6, 1.6, 1.6, 7.4, 9.8, 2.8, T(c)));
// luxury
const gold = ["#f2d27a", "#d4a640", "#a07a28"];
chairArts("louis", 12, 11, 22, ({ c = "#2a4a8a" }) => {
  let g = ibox(1, 0.5, 1, 1, 8.8, 11, gold) + ibox(10, 0.5, 1, 1, 8.8, 11, gold) + ibox(1, 0.3, 10, 1.2, 19.6, 1.6, gold);
  return g + ibox(2, 0.6, 8, 0.8, 10.6, 8.6, T(c)) + ifront(2, 1.4, 8, 10.6, 0.4, gold[1]) + ifront(2, 1.4, 8, 18.8, 0.4, gold[1]) + ifront(5.4, 1.4, 1.2, 21.2, 1.2, gold[0]);
}, ({ c = "#2a4a8a" }) => {
  let g = ishadow(12, 10, 0);
  for (const [x, y] of [[1, 0.6], [10, 0.6], [1, 8.4], [10, 8.4]]) g += ibox(x, y, 1, 1, 0, 7.6, gold) + ifront(x + 0.2, y + 1, 0.2, 1, 6, gold[2]);
  return g + ibox(0.6, 0.4, 10.8, 9.2, 6.4, 1.4, gold) + ifront(4.4, 9.6, 3.2, 5.6, 0.8, gold[0]) + ibox(1, 0.8, 10, 8.4, 7.8, 1.6, T(c)) + itop(2, 1.6, 8, 6.8, 9.41, shade(c, 1.15));
});
chairArts("throne", 12, 11, 34, ({ c = "#5a1f6e" }) => {
  let g = ibox(0, 0, 12, 2, 6, 22, gold) + ifront(1.5, 2, 9, 8, 17.4, c);
  g += ipoly([ipt(0, 2, 28), ipt(3, 2, 28), ipt(1.5, 2, 32)], gold[0]) + ipoly([ipt(4.5, 2, 28), ipt(7.5, 2, 28), ipt(6, 2, 33.4)], gold[0]) + ipoly([ipt(9, 2, 28), ipt(12, 2, 28), ipt(10.5, 2, 32)], gold[0]);
  return g + iell(6, 2.1, 30.4, 0.9, "#ff3b5c") + dots(1.5, 2, 9, 25.6, 5, "#f2d27a");
}, ({ c = "#5a1f6e" }) => {
  let g = ishadow(12, 10, 1) + ibox(0, 0.3, 12, 9.6, 0, 1.2, gold) + ibox(0.5, 0.5, 11, 9, 1.2, 5, gold) + ifront(1.5, 9.5, 9, 2, 3, shade(c, 0.8));
  g += ibox(1.5, 0.6, 9, 8.6, 6.2, 2.4, T(c)) + ibox(0, 0.5, 1.6, 9, 6.2, 6, gold) + ibox(10.4, 0.5, 1.6, 9, 6.2, 6, gold);
  return g + iell(0.8, 9, 12.6, 1, gold[0]) + iell(11.2, 9, 12.6, 1, gold[0]);
}, () => {
  let g = ibox(0, 0, 12, 2, 6, 22, gold) + ifront(1.5, 2, 9, 9, 15, gold[2]) + ifront(2.5, 2, 7, 10, 13, gold[1]);
  return g + ipoly([ipt(0, 2, 28), ipt(3, 2, 28), ipt(1.5, 2, 32)], gold[1]) + ipoly([ipt(4.5, 2, 28), ipt(7.5, 2, 28), ipt(6, 2, 33.4)], gold[1]) + ipoly([ipt(9, 2, 28), ipt(12, 2, 28), ipt(10.5, 2, 32)], gold[1]);
});
// designer
chairArts("panton", 12, 11, 19, ({ c = "#d23a2a" }) => ibox(1, 0, 10, 1.4, 8.6, 9, T(c)) + itop(1, 0, 10, 1.4, 17.61, shade(c, 1.3)),
  ({ c = "#d23a2a" }) => {
    const [top, front, side] = T(c);
    let g = ishadow(12, 10, 0) + ibox(1, 0, 10, 9.6, 0, 0.6, T(c));
    g += ipoly([ipt(1, 9.6, 0.6), ipt(11, 9.6, 0.6), ipt(11, 6, 7.6), ipt(1, 6, 7.6)], front) + ipoly([ipt(11, 9.6, 0.6), ipt(11, 6, 7.6), ipt(11, 6, 8.6), ipt(11, 9.6, 1.6)], side);
    return g + ibox(1, 0, 10, 6.4, 7.6, 1, [top, front, side]) + iline(ipt(1, 6, 8.6), ipt(11, 6, 8.6), shade(c, 1.4), 0.4);
  });
chairArts("egg", 14, 12, 26, ({ c = "#ef7d22", inner = "#f7c08a" }) => {
  let g = ibox(0.5, 0, 13, 3, 7, 17, T(c)) + ifront(2, 3, 10, 9, 13, inner) + itop(0.5, 0, 13, 3, 24.01, shade(c, 1.3));
  return g + ipoly([ipt(0.5, 3, 24), ipt(13.5, 3, 24), ipt(12, 3, 26), ipt(2, 3, 26)], shade(c, 1.15));
}, ({ c = "#ef7d22", inner = "#f7c08a" }) => {
  let g = ishadow(14, 11, 0);
  for (const [x, y] of [[2, 1], [12, 1], [2, 10], [12, 10]]) g += iline(ipt(7, 5.5, 0.8), ipt(x, y, 0.4), "#c9ccd6", 0.9);
  g += ibox(6.3, 4.8, 1.4, 1.4, 0.8, 5.4, "#c9ccd6") + ibox(1, 0.5, 12, 9.5, 6, 3, T(c)) + ibox(2, 1, 10, 7.6, 9, 1, T(inner));
  return g + ibox(0.3, 0, 1.8, 9, 6, 10, T(c)) + ibox(11.9, 0, 1.8, 9, 6, 10, T(c)) + iside(11.9, 0, 9, 7, 8, inner);
}, ({ c = "#ef7d22" }) => ibox(0.5, 0, 13, 3, 7, 17, T(c)) + ipoly([ipt(0.5, 3, 24), ipt(13.5, 3, 24), ipt(12, 3, 26), ipt(2, 3, 26)], shade(c, 1.15)) + ifront(3, 3, 8, 12, 0.4, shade(c, 0.8)));
/* ---------- armchairs, sofas, beanbags of the shop (items/furniture.js) ---------- */
// a seat with a deep back: its back (w × bd, behind whoever sits), its seat (w × (d - bd), from y = bd), both for the shop
// (rear: [z0, height, colour of the style] of its back seen from behind, when it is turned away from the viewer)
function seatArts(key, w, d, bd, H, back, seat, rear = null) {
  const B = `iso${key}back`, S = `iso${key}`, [ox, oy] = ipt(0, bd);
  reg(class extends IsoArt { constructor() { super(B, w, bd, H); } body(o) { return o.back && rear ? back(o) + ifront(0, bd, w, rear[0], rear[1], shade(rear[2](o), 0.88)) + ifront(0, bd, w, rear[0] + rear[1] - 0.6, 0.6, shade(rear[2](o), 1.1)) : back(o); } });
  reg(class extends IsoArt { constructor() { super(S, w, d - bd, 16); } body(o) { return seat(o); } });
  reg(class extends IsoArt { constructor() { super(`${S}full`, w, d, H); } body(o) { return back(o) + `<g transform="translate(${n2(ox)} ${n2(oy)})">${seat(o)}</g>`; } });
}
const fabric = (x, y, w, z, h, c, n = 6) => Array.from({ length: n }, (_, i) => ifront(x + (i + 0.5) * w / n, y, 0.3, z + ((i * 7) % 5) * h / 6, 0.3, shade(c, 1.3))).join("");
const plaid = (x, y, w, d, z, h) => ibox(x, y, w, d, z, h, T("#b8332a")) + ifront(x + w * 0.3, y + d, 0.6, z, h, "#f4f2ea") + ifront(x + w * 0.65, y + d, 0.6, z, h, "#f4f2ea") + ifront(x, y + d, w, z + h * 0.5, 0.5, "#f4f2ea");
const woodLegs = (x0, y0, x1, y1, h, c = "#3a2618") => legs4(x0, y0, x1, y1, h, T(c), 1.2);
// armchairs (24 × 18, back 6 deep)
seatArts("armrecup", 24, 18, 6, 24, ({ c = "#b8902a" }) => ibox(1, 0, 22, 6, 1, 19, T(c)) + ifront(5, 6, 5, 13, 4, shade(c, 1.35)) + iline(ipt(5, 6, 13), ipt(10, 6, 17), shade(c, 0.6), 0.3) + plaid(8, 0, 8, 6.4, 14, 7),
  ({ c = "#b8902a" }) => woodLegs(1, 0.5, 23, 11.5, 1.2) + ibox(1, 0, 22, 12, 1, 5, T(c)) + ibox(4, 0, 16, 11, 6, 1.8, T(shade(c, 1.06))) + ibox(0, 0, 4, 12, 1, 11, T(c)) + ibox(20, 0, 4, 12, 1, 11, T(c))
    + iell(22, 4, 12.05, 1.2, "#f4f2ea") + ifront(1, 12, 22, 3, 0.3, shade(c, 0.6)), [1, 19, o => o.c || "#b8902a"]);
seatArts("armrattan", 24, 18, 6, 24, ({ w = "#c49a5a", k = "#f0efe9" }) => {
  let g = ibox(1, 0, 22, 5, 4, 18, T(w));
  for (let z = 6; z < 22; z += 2) g += iline(ipt(1, 5, z), ipt(23, 5, z), shade(w, 0.7), 0.25);
  return g + ibox(3, 4, 18, 2, 9, 9, T(k));
}, ({ w = "#c49a5a", k = "#f0efe9" }) => {
  let g = ishadow(24, 12, 0) + ibox(1, 0, 22, 12, 0, 7, T(w)) + ibox(0, 0, 3, 12, 4, 9, T(w)) + ibox(21, 0, 3, 12, 4, 9, T(w));
  for (let z = 1; z < 7; z += 1.6) g += iline(ipt(1, 12, z), ipt(23, 12, z), shade(w, 0.7), 0.25);
  return g + ibox(3, 0.5, 18, 10.5, 7, 2.4, T(k));
}, [4, 18, o => o.w || "#c49a5a"]);
seatArts("armcocoon", 24, 18, 6, 22, ({ c = "#ece4d4" }) => ibox(0, 0, 24, 6, 1.5, 15, T(c)) + itop(1, 0.5, 22, 5, 16.51, shade(c, 1.12)) + fabric(1, 6, 22, 4, 12, c, 9),
  ({ c = "#ece4d4" }) => woodLegs(1.5, 0.5, 22.5, 11.5, 1.5, "#8a6a4a") + ibox(0, 0, 24, 12, 1.5, 6, T(c)) + ibox(0, 0, 4.5, 11.5, 1.5, 11.5, T(c)) + ibox(19.5, 0, 4.5, 11.5, 1.5, 11.5, T(c))
    + ibox(4.5, 0, 15, 10.5, 7.5, 2.4, T(shade(c, 1.06))) + fabric(0, 12, 24, 2, 5, c, 10) + itop(0.6, 1, 3.4, 9.5, 13.01, shade(c, 1.12)) + itop(20.1, 1, 3.4, 9.5, 13.01, shade(c, 1.12)), [1.5, 15, o => o.c || "#ece4d4"]);
seatArts("armrecliner", 24, 18, 6, 26, ({ c = "#6a6a72" }) => ibox(2, 0, 20, 6, 6, 17, T(c)) + ibox(4, 1.5, 16, 4.5, 19, 4, T(shade(c, 1.12))) + ifront(4, 6, 16, 12, 0.4, shade(c, 0.7)),
  ({ c = "#6a6a72" }) => ishadow(24, 12, 0) + ibox(1, 0, 22, 12, 0, 7, T(c)) + ibox(3.5, 0, 17, 11, 7, 3, T(shade(c, 1.08))) + ibox(0, 0, 3.5, 12, 0, 12, T(c)) + ibox(20.5, 0, 3.5, 12, 0, 12, T(c))
    + ifront(3.5, 12, 17, 1, 5, shade(c, 0.8)) + iside(24, 5, 1.5, 6, 4, "#2a2a33"), [6, 17, o => o.c || "#6a6a72"]);
seatArts("armclub", 24, 18, 6, 21, ({ c = "#9a5a2a" }) => ibox(1, 0, 22, 6, 1.5, 14, T(c)) + ibox(1, 0, 22, 6, 15.5, 1.6, T(shade(c, 1.15))) + itop(4, 1, 6, 1.5, 17.11, "#ffffff", ' fill-opacity=".2"'),
  ({ c = "#9a5a2a" }) => woodLegs(0.6, 0.5, 23.4, 11.5, 1.5) + ibox(1, 0, 22, 12, 1.5, 6, T(c)) + ibox(4.5, 0, 15, 11, 7.5, 2.5, T(shade(c, 1.1))) + ibox(0, 0, 4.5, 12, 1.5, 10, T(c)) + ibox(19.5, 0, 4.5, 12, 1.5, 10, T(c))
    + ibox(0, 0, 4.5, 12, 11.5, 1.2, T(shade(c, 1.15))) + ibox(19.5, 0, 4.5, 12, 11.5, 1.2, T(shade(c, 1.15))) + ifront(1, 12, 22, 3, 0.3, shade(c, 0.55)) + itop(6, 2, 5, 1.2, 10.01, "#ffffff", ' fill-opacity=".18"'), [1.5, 15.6, o => o.c || "#9a5a2a"]);
seatArts("armlounge", 24, 18, 6, 24, ({ w = "#5c3d27", c = "#1c1c22" }) => ibox(2, 0, 20, 2, 7, 16, wood(w)) + ibox(3, 2, 18, 3.4, 8, 14.5, T(c)) + ifront(3, 5.4, 18, 15, 0.4, shade(c, 0.6)) + dots(4, 5.4, 16, 11.5, 3, shade(c, 0.5)) + dots(4, 5.4, 16, 19, 3, shade(c, 0.5)),
  ({ w = "#5c3d27", c = "#1c1c22" }) => {
    let g = ishadow(24, 12, 0);
    for (const [x, y] of [[4, 2], [20, 2], [12, -1], [6, 11], [18, 11]]) g += iline(ipt(12, 6, 1.2), ipt(x, y, 0.4), "#2a2a33", 0.9);
    g += ibox(11.3, 5.3, 1.4, 1.4, 1, 3, "#2a2a33") + ibox(2, 0, 20, 12, 4, 3, wood(w)) + ibox(3, 0, 18, 11, 7, 3, T(c));
    return g + ibox(0.6, 0, 1.4, 10, 7, 3, wood(w)) + ibox(22, 0, 1.4, 10, 7, 3, wood(w)) + ibox(0.4, 0.5, 2, 9, 10, 2.4, T(c)) + ibox(21.6, 0.5, 2, 9, 10, 2.4, T(c));
  }, [7, 16, o => o.w || "#5c3d27"]);
seatArts("armbergere", 24, 18, 6, 26, ({ c = "#2a4a8a" }) => ibox(1, 0, 22, 4, 6, 16, gold) + ifront(3, 4, 18, 8, 12, c) + ipoly([ipt(8, 4, 22), ipt(16, 4, 22), ipt(12, 4, 25)], gold[0]) + dots(4, 4, 16, 14, 4, gold[0]),
  ({ c = "#2a4a8a" }) => {
    let g = ishadow(24, 12, 0);
    for (const [x, y] of [[1, 0.6], [21.6, 0.6], [1, 10.4], [21.6, 10.4]]) g += ibox(x, y, 1.4, 1, 0, 5.4, gold);
    return g + ibox(0.5, 0.3, 23, 11.4, 5, 1.6, gold) + ifront(10, 11.7, 4, 4.4, 0.6, gold[0]) + ibox(2, 0.8, 20, 10.4, 6.6, 2.6, T(c))
      + ibox(0, 1, 1.4, 10, 6.6, 6, gold) + ibox(22.6, 1, 1.4, 10, 6.6, 6, gold) + ibox(-0.1, 2.5, 1.6, 7, 10.4, 1.6, T(c)) + ibox(22.5, 2.5, 1.6, 7, 10.4, 1.6, T(c));
  }, [6, 16, o => gold[1]]);
// sofas (22 deep, back 6 deep)
const cushions = (n, x0, w, y, d, z, h, c) => Array.from({ length: n }, (_, i) => ibox(x0 + i * w / n + 0.2, y, w / n - 0.4, d, z, h, T(c))).join("");
seatArts("sofaold", 40, 22, 6, 22, ({ c = "#7a4a2a" }) => ibox(0, 0, 40, 6, 1, 15, T(c)) + ifront(25, 6, 6, 9, 3, shade(c, 1.35)) + iell(10, 6, 12, 1.4, "#f4f2ea") + plaid(26, 0, 9, 6.4, 13, 6),
  ({ c = "#7a4a2a" }) => woodLegs(1, 0.5, 39, 15.5, 1) + ibox(0, 0, 40, 16, 1, 5, T(c)) + ibox(5, 0.5, 14.8, 15, 6, 1.6, T(shade(c, 1.06))) + ibox(20.2, 0.5, 14.8, 15, 6, 2.4, T(shade(c, 1.06)))
    + ibox(0, 0, 5, 16, 1, 10, T(c)) + ibox(35, 0, 5, 16, 1, 10, T(c)) + iell(37.5, 5, 11.05, 1.2, "#f4f2ea") + ifront(0, 16, 40, 2.5, 0.3, shade(c, 0.55)), [1, 15, o => o.c || "#7a4a2a"]);
seatArts("sofafuton", 44, 22, 6, 20, ({ c = "#1c1c22" }) => ibox(0, 1.5, 44, 2, 4, 3, wood("#b08860")) + ibox(1, 1, 42, 4.6, 7, 12, T(c)) + dots(3, 5.6, 38, 13, 5, shade(c, 1.5)),
  ({ c = "#1c1c22" }) => {
    let g = ishadow(44, 16, 0) + ibox(0, 0, 44, 16, 0, 4, wood("#b08860"));
    for (let x = 4; x < 44; x += 5) g += ifront(x, 16, 0.4, 0.6, 2.8, shade("#b08860", 0.6));
    return g + ibox(2, 0, 40, 15.4, 4, 4, T(c)) + dots(4, 15.4, 36, 6, 5, shade(c, 1.5)) + ibox(0, 0, 2, 16, 0, 8, wood("#b08860")) + ibox(42, 0, 2, 16, 0, 8, wood("#b08860"));
  }, [4, 15, o => o.c || "#1c1c22"]);
seatArts("sofa2", 40, 22, 6, 20, ({ c = "#8d929c" }) => ibox(1, 0, 38, 6, 2, 14, T(c)) + cushions(2, 5, 30, 3.5, 2.5, 7, 8.5, shade(c, 1.08)),
  ({ c = "#8d929c" }) => woodLegs(1, 0.5, 39, 15.5, 2, "#8a6a4a") + ibox(0, 0, 40, 16, 2, 5, T(c)) + cushions(2, 5, 30, 0.3, 15.4, 7, 2.6, shade(c, 1.06))
    + ibox(0, 0, 5, 16, 2, 9.5, T(c)) + ibox(35, 0, 5, 16, 2, 9.5, T(c)), [2, 14, o => o.c || "#8d929c"]);
seatArts("sofamodern", 56, 22, 6, 20, ({ c = "#3a3f48" }) => ibox(0, 0, 56, 2.5, 2.5, 13, T(c)) + cushions(3, 3.5, 49, 2.5, 3.5, 7, 9.5, shade(c, 1.08)),
  ({ c = "#3a3f48" }) => legs4(1, 0.5, 55, 15.5, 2.5, ["#3a3a46", "#1c1c24", "#14141c"], 0.8) + ibox(0, 0, 56, 16, 2.5, 4.5, T(c)) + cushions(3, 3.5, 49, 0.3, 15.4, 7, 2.6, shade(c, 1.06))
    + ibox(0, 0, 3.5, 16, 2.5, 8, T(c)) + ibox(52.5, 0, 3.5, 16, 2.5, 8, T(c)), [2.5, 13, o => o.c || "#3a3f48"]);
seatArts("sofachester", 58, 22, 6, 21, ({ c = "#5a3420" }) => {
  let g = ibox(0, 0, 58, 6, 1.5, 14.5, T(c)) + ibox(0, 0, 58, 6, 16, 1.4, T(shade(c, 1.15)));
  for (const z of [6, 9.5, 13]) g += dots(2, 6, 54, z, 12, shade(c, 0.55));
  return g;
}, ({ c = "#5a3420" }) => woodLegs(1, 0.5, 57, 15.5, 1.5) + ibox(0, 0, 58, 16, 1.5, 5.5, T(c)) + cushions(3, 6, 46, 0.3, 15.4, 7, 2.4, shade(c, 1.08))
  + ibox(0, 0, 6, 16, 1.5, 12, T(c)) + ibox(52, 0, 6, 16, 1.5, 12, T(c)) + ibox(0, 0, 6, 16, 13.5, 1.4, T(shade(c, 1.15))) + ibox(52, 0, 6, 16, 13.5, 1.4, T(shade(c, 1.15))) + dots(0, 16, 58, 6.4, 24, "#d4a640"), [1.5, 15.9, o => o.c || "#5a3420"]);
seatArts("sofacloud", 60, 22, 6, 22, ({ c = "#f0efe9" }) => ibox(2, 0, 56, 6, 5, 12, T(c)) + [10, 30, 50].map(x => iell(x, 3, 17.2, 7, shade(c, 1.08))).join(""),
  ({ c = "#f0efe9" }) => ishadow(60, 16, 0) + ibox(0, 0, 60, 16, 0, 5, T(shade(c, 0.95))) + cushions(3, 6, 48, 0, 15.6, 5, 4, c)
    + [14, 30, 46].map(x => iell(x, 8, 9.1, 5.6, shade(c, 1.1))).join("") + ibox(0, 0, 6, 16, 0, 12, T(c)) + ibox(54, 0, 6, 16, 0, 12, T(c)) + iell(3, 8, 12.1, 3, shade(c, 1.12)) + iell(57, 8, 12.1, 3, shade(c, 1.12)), [5, 12, o => o.c || "#f0efe9"]);
seatArts("sofabaroque", 60, 22, 6, 28, ({ c = "#8f1f2a" }) => {
  let g = ibox(0, 0, 60, 4, 6, 18, gold) + ifront(3, 4, 54, 9, 13, c);
  for (const x of [8, 30, 52]) g += ipoly([ipt(x - 6, 4, 24), ipt(x + 6, 4, 24), ipt(x, 4, x === 30 ? 28 : 26)], gold[0]);
  return g + dots(5, 4, 50, 13, 9, gold[0]) + dots(5, 4, 50, 18, 9, gold[0]);
}, ({ c = "#8f1f2a" }) => {
  let g = ishadow(60, 16, 0);
  for (const [x, y] of [[1, 0.6], [57.6, 0.6], [1, 14.4], [57.6, 14.4], [29.3, 14.4]]) g += ibox(x, y, 1.4, 1, 0, 4.4, gold);
  return g + ibox(0, 0, 60, 16, 4, 2, gold) + ifront(26, 16, 8, 3.2, 0.8, gold[0]) + ibox(2, 0.5, 56, 15, 6, 3, T(c)) + ibox(0, 1, 2.4, 14, 6, 8, gold) + ibox(57.6, 1, 2.4, 14, 6, 8, gold)
    + ibox(-0.1, 3, 2.6, 9, 12, 1.6, T(c)) + ibox(57.5, 3, 2.6, 9, 12, 1.6, T(c));
}, [6, 18, o => gold[1]]);
seatArts("sofacurve", 58, 22, 6, 20, ({ c = "#1f6e4a" }) => {
  let g = ibox(0, 0, 58, 6, 1, 14, T(c)) + itop(0, 0, 58, 6, 15.01, shade(c, 1.15));
  for (let x = 4; x < 58; x += 4) g += ifront(x, 6, 0.4, 7, 8, shade(c, 0.7));
  return g;
}, ({ c = "#1f6e4a" }) => ishadow(58, 16, 0) + ibox(1, 1, 56, 14, 0, 1, ["#2a2a30", "#1c1c22", "#14141c"]) + ibox(0, 0, 58, 16, 1, 5, T(c)) + ibox(5, 0, 48, 15, 6, 3, T(shade(c, 1.08)))
  + ibox(0, 0, 5, 16, 1, 14, T(c)) + ibox(53, 0, 5, 16, 1, 14, T(c)) + itop(0, 0, 5, 16, 15.01, shade(c, 1.15)) + itop(53, 0, 5, 16, 15.01, shade(c, 1.15)), [1, 14, o => o.c || "#1f6e4a"]);
// beanbags and poufs (one piece, the sitter on it)
const pouf = (name, w, d, H, body) => reg(class extends IsoArt { constructor() { super(name, w, d, H); } body(o) { return body(o); } });
pouf("isopoufpneu", 16, 16, 9, ({ c = "#d23a2a" }) => {
  let g = ishadow(16, 16, 0) + icyl(8, 8, 0, 6, 7.4, "#1c1c22", "#2a2a30");
  const [x, y] = ipt(8, 8, 6);
  for (let i = -3; i <= 3; i++) g += `<path stroke="#3a3a44" stroke-width=".4" d="M${n2(x + i * 1.8)} ${n2(y + 4)}v4"/>`;
  return g + iell(8, 8, 6.05, 5.6, "#0e0e12") + iell(8, 8, 6.9, 5.2, c) + iell(7, 7, 7, 2.4, shade(c, 1.3)) + iell(8, 8, 7, 0.6, shade(c, 0.6));
});
pouf("isopoufpoire", 20, 16, 13, ({ c = "#ef7d22" }) => {
  const [x, y] = ipt(10, 8);
  return ishadow(20, 16, 0) + `<ellipse cx="${n2(x)}" cy="${n2(y - 3)}" rx="10.6" ry="6" fill="${shade(c, 0.6)}"/><ellipse cx="${n2(x)}" cy="${n2(y - 5)}" rx="9.6" ry="5.4" fill="${c}"/>`
    + `<path fill="${shade(c, 0.8)}" d="M${n2(x - 2)} ${n2(y - 12)}q6 0 8 6q-5 -2 -9 -2z"/><ellipse cx="${n2(x - 3)}" cy="${n2(y - 7.6)}" rx="4.6" ry="2.2" fill="${shade(c, 1.3)}"/>`
    + `<path fill="none" stroke="${shade(c, 0.7)}" stroke-width=".4" d="M${n2(x - 8)} ${n2(y - 3)}q8 4 16 0"/>`;
});
pouf("isopouftricot", 14, 14, 9, ({ c = "#ece4d4" }) => {
  let g = ishadow(14, 14, 0) + icyl(7, 7, 0, 7, 6.4, shade(c, 0.86), shade(c, 1.08));
  const [x, y] = ipt(7, 7, 0), rx = 6.4 * K * 1.414;
  for (let a = 0.15; a < Math.PI; a += 0.32) { const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * rx * 0.5; g += `<path fill="none" stroke="${shade(c, 0.7)}" stroke-width=".35" d="M${n2(px)} ${n2(py)}l-.5 -1.4l.5 -1.4l-.5 -1.4l.5 -1.4"/>`; }
  return g + iell(7, 7, 7.05, 2, shade(c, 0.9));
});
pouf("isopoufcube", 14, 14, 10, ({ c = "#2a6fd0" }) => ishadow(14, 14, 0) + ibox(1, 1, 12, 12, 0.8, 8, T(c)) + ifront(1, 13, 12, 8.4, 0.4, shade(c, 1.4)) + iside(13, 1, 12, 8.4, 0.4, shade(c, 1.2))
  + iell(7, 7, 8.85, 0.7, shade(c, 0.55)) + legs4(1.5, 1.5, 12.5, 12.5, 0.8, ["#3a2618", "#3a2618", "#2a1a10"], 1));
pouf("isopoufcuir", 16, 16, 9, ({ c = "#1c1c22" }) => {
  let g = ishadow(16, 16, 0);
  for (const [x, y] of [[3, 3], [13, 3], [3, 13], [13, 13]]) g += iell(x, y, 0.6, 0.8, gold[1]);
  g += icyl(8, 8, 1.4, 6, 7, shade(c, 0.8), c) + icyl(8, 8, 1.2, 0.5, 7.1, gold[1], gold[1]);
  for (const [x, y] of [[8, 8], [5, 6], [11, 6], [5, 10], [11, 10], [8, 4], [8, 12]]) g += iell(x, y, 7.45, 0.45, shade(c, 0.45));
  return g + iell(6, 6, 7.42, 2.2, "#ffffff", ' fill-opacity=".12"');
});
pouf("isopoufgalets", 22, 16, 10, ({ c = "#9caf88" }) => ishadow(22, 16, 0) + icyl(17, 4, 0, 4.4, 4, shade(c, 0.7), shade(c, 0.95)) + icyl(6, 6, 0, 5.4, 5, shade(c, 0.75), shade(c, 1.1)) + icyl(13, 10, 0, 7, 6, shade(c, 0.8), c)
  + iell(12, 9, 7.05, 2.4, shade(c, 1.2)));
pouf("isopoufmaroc", 16, 16, 9, ({ c = "#9a5a2a" }) => {
  let g = ishadow(16, 16, 0) + icyl(8, 8, 0, 7, 7.2, shade(c, 0.8), c);
  const [x, y] = ipt(8, 8, 0), rx = 7.2 * K * 1.414;
  g += `<path fill="none" stroke="${gold[0]}" stroke-width=".45" d="M${n2(x - rx)} ${n2(y - 3.5)}${Array.from({ length: 12 }, (_, i) => `L${n2(x - rx + (i + 1) * rx / 6)} ${n2(y - 3.5 + (i % 2 ? -1.2 : 1.2) + Math.sin((i + 1) / 12 * Math.PI) * 2.6)}`).join("")}"/>`;
  const [cx, cy] = ipt(8, 8, 7.05);
  return g + `<path fill="${gold[0]}" d="M${n2(cx)} ${n2(cy - 2.4)}l1 1.6l2 .8l-2 .8l-1 1.6l-1 -1.6l-2 -.8l2 -.8z"/>` + iell(8, 8, 7.05, 4.4, "none", ` stroke="${gold[1]}" stroke-width=".35"`);
});
reg(class extends IsoArt {  // the chief's podium: two steps, a gold edge, a star
  constructor() { super("isopodium", 28, 12, 7); }
  body() {
    return ishadow(28, 12, 0) + ibox(0, 0, 28, 12, 0, 2.4, ["#1b2a6b", "#11379e", "#081746"]) + ibox(2, 1, 24, 10, 2.4, 2.6, ["#2a4fd0", "#11379e", "#0a2a78"])
      + ifront(2, 11, 24, 4.6, 0.4, "#fbaa08") + ifront(0, 12, 28, 2, 0.4, "#fbaa08") + ifront(12.6, 11, 2.8, 2.6, 2, "#fbaa08");
  }
});
reg(class extends IsoArt {  // the MMX filing cabinet: three drawers (the middle one opens), the inbox tray on top
  constructor() { super("isocabinet", 22, 12, 46); }
  body({ open = false, pending = 0 }) {
    let g = ishadow(22, 12) + ibox(0, 0, 22, 12, 0, 36, ["#a7acbd", "#8a90a6", "#6f7488"]);
    for (let i = 0; i < 3; i++) {
      const z = 25 - i * 11.5, out = i === 1 && open, y = out ? 18 : 12;
      if (out) g += ibox(1.5, 12, 19, 6, z, 9.5, ["#c9ccd8", "#8a90a6", "#6f7488"]) + itop(3, 12.5, 16, 5, z + 9.55, "#f4f2ea") + itop(4, 13, 13, 4, z + 9.7, "#fff7b8");
      else g += ifront(1.5, 12, 19, z, 9.5, "#9aa0b4") + ifront(1.5, 12, 19, z + 9.1, 0.4, "#c9ccd8");
      g += ifront(8, y, 6, z + 5.5, 1.2, "#c9ccd8") + ifront(9, y, 4, z + 7.2, 1.4, "#f4f2ea");
    }
    g += ibox(3, 2, 16, 8, 36, 2.4, ["#55556a", "#3a3a48", "#2a2a33"]);
    for (let k = 0; k < Math.min(pending, 4); k++) g += itop(4 + k * 0.6, 3, 13, 6, 38.6 + k * 1.1, k % 2 ? "#fff7b8" : "#f4f2ea");
    return g;
  }
});
reg(class extends IsoArt {  // the espresso machine on its cabinet: cups warming on top, the screen, the spout, the steam wand
  constructor() { super("isocoffee", 22, 7, 30); }
  body({ frame = 0, brewing = false }) {
    let g = ishadow(22, 7, 0) + ibox(0, 0, 22, 7, 0, 12, ["#7a5636", "#5c3d27", "#4a2f1e"]) + ifront(1, 7, 9.5, 1, 10, "#4a2f1e") + ifront(11.5, 7, 9.5, 1, 10, "#4a2f1e");
    g += ibox(2, 0.5, 18, 6, 12, 14, ["#e0e3ea", "#c9cdd5", "#8d929c"]) + ifront(4, 6.5, 6, 21.5, 3, brewing ? "#1b3a2a" : "#2a2a33");
    if (brewing) g += ifront(4.6, 6.5, 1 + frame, 22.5, 1, "#51cf66");
    for (const x of [12, 14.5, 17]) g += ifront(x, 6.5, 1.4, 22.5, 1.4, x === 12 ? "#ff6b6b" : "#3a3a46");
    g += ibox(7, 6.5, 6, 2, 17, 2, "#3a3a46") + ibox(9.4, 7.5, 1.2, 1, 15.6, 1.4, "#2a2a33") + itop(5, 7, 10, 3, 12.05, "#55556a");  // group head, drip tray
    g += ibox(8.6, 7.6, 2.4, 2, 12.1, 2.4, "#f4f2ea");  // the cup
    if (brewing) g += ifront(9.6, 8.5, 0.4, 14.5, 1.4, "#6d4a2e") + itop(8.9, 7.9, 1.8, 1.4, 12.1 + Math.min(frame, 3) * 0.6, "#6d4a2e");
    for (const x of [4, 8, 12, 16]) g += ibox(x, 2, 2, 2, 26, 1.8, "#f4f2ea");
    return g + ibox(18, 6.5, 0.6, 2, 15, 6, "#8d929c");
  }
});
reg(class extends IsoArt {  // the console corner: the TV on its cabinet (its screen painted live), the console and its pad
  constructor() { super("isoconsoletv", 24, 7, 26); }
  body({ w = "#8a6a4a", on = false, back = false }) {
    if (back) return ishadow(24, 7, 0) + ibox(0, 0, 24, 7, 0, 7, wood(w)) + ibox(10, 2.5, 4, 2, 7, 1, "#1c1c24") + ibox(2, 2.2, 20, 1.6, 8, 10, ["#2a2a33", "#2a2a33", "#1c1c24"]) + ifront(8, 3.8, 8, 11, 5, "#3a3a46");
    let g = ishadow(24, 7, 0) + ibox(0, 0, 24, 7, 0, 7, wood(w)) + ifront(2, 7, 9, 1.5, 4, shade(w, 0.8)) + ifront(13, 7, 9, 1.5, 4, shade(w, 0.8));
    g += ibox(10, 2.5, 4, 2, 7, 1, "#1c1c24") + ibox(2, 2.2, 20, 1.6, 8, 10, ["#2a2a33", "#14141c", "#1c1c24"]) + ifront(3, 3.8, 18, 9, 7.6, on ? "#0b1020" : "#14141c");
    return g + ibox(3, 4.5, 6, 2.5, 7, 1.6, ["#f4f2ea", "#d8d4cc", "#bdb8b0"]) + ifront(4, 7, 1, 7.5, 0.6, "#51cf66") + ibox(15, 4.6, 4, 2, 7, 1, "#2a2a33");
  }
});

reg(class extends IsoArt {  // a bare desk (its computer is bought apart): the top, two legs, a drawer block, the cable tray
  constructor() { super("isodeskbare", 36, 12, 14); }
  body({ w = "#8a6a4a", rgb = false }) {
    let g = ishadow(36, 12) + ibox(0, 0, 2.4, 12, 0, 11, wood(w, 0.85)) + ibox(24, 0.5, 12, 11, 0, 11, wood(w, 0.9));
    for (const z of [1.5, 5.4]) g += ifront(25, 11.5, 10, z, 3.2, shade(w, 0.75)) + ifront(29, 11.5, 2, z + 1.4, 0.6, "#c9ccd6");
    g += ibox(2.4, 0.5, 21.6, 1.2, 3, 8, wood(w, 0.7)) + ibox(0, 0, 36, 12, 11, 1.6, wood(w));
    if (rgb) for (let i = 0; i < 12; i++) g += ifront(i * 3, 12, 3, 11.2, 0.8, `hsl(${i * 30} 90% 60%)`);
    return g;
  }
});
/* ---------- more desks (items/desk.js): older, modern, design; the dev sits on the +y side, drawers toward him ---------- */
const brass = "#d4a640", chrome = ["#e6e8ee", "#c9ccd6", "#a7acb6"];
// a thin slanted leg (a Scandinavian desk): from (xa, ya) on the floor to (xb, yb) under the top at z
const ileg = (xa, ya, xb, yb, z, fill) => ipoly([ipt(xa, ya, 0), ipt(xa + 1.2, ya, 0), ipt(xb + 1.2, yb, z), ipt(xb, yb, z)], fill);
reg(class extends IsoArt {  // the minister's desk (old): two pedestals of drawers, brass knobs, a leather top with a gilt line
  constructor() { super("isodeskministre", 40, 14, 15); }
  body({ w = "#6b2f1d", leather = "#2f5d3a" }) {
    let g = ishadow(40, 14);
    for (const x of [0, 29]) {
      g += ibox(x, 0.5, 11, 13.5, 0, 11.4, wood(w)) + ifront(x, 14, 11, 0, 0.8, shade(w, 0.6));
      for (const z of [1.2, 4.6, 8]) g += ifront(x + 1, 14, 9, z, 2.8, shade(w, 0.86)) + ifront(x + 4.8, 14, 1.4, z + 1, 0.8, brass);
    }
    g += ibox(11, 1, 18, 12.5, 8.6, 2.8, wood(w, 0.8)) + ifront(13, 13.5, 14, 9, 2, shade(w, 0.9)) + ifront(19.3, 13.5, 1.4, 9.6, 0.7, brass);
    g += ibox(0, 0, 40, 14, 11.4, 1.6, wood(w)) + ifront(0, 14, 40, 11.4, 0.4, shade(w, 1.3));
    return g + itop(2.4, 1.6, 35.2, 10.8, 13.01, "#c9a24b") + itop(3, 2.1, 34, 9.8, 13.02, leather) + itop(4, 2.6, 10, 0.4, 13.03, shade(leather, 1.3), ' fill-opacity=".5"');
  }
});
reg(class extends IsoArt {  // the school desk of the sixties: tube legs, a storage shelf, a formica top
  constructor() { super("isodeskschool", 32, 12, 13); }
  body({ top = "#e8843c", metal = "#3a3a46" }) {
    let g = ishadow(32, 12);
    for (const [x, y] of [[1, 0.6], [29.6, 0.6], [1, 10], [29.6, 10]]) g += ibox(x, y, 1.2, 1.2, 0, 11, metal);
    g += ibox(1, 5.4, 29.8, 1, 2, 0.8, metal) + ibox(2.5, 1, 27, 9.5, 8, 2.6, ["#6a6a74", "#4a4a54", "#3a3a44"]) + ifront(3, 10.5, 26, 8.3, 2, "#2a2a33");
    return g + ibox(0, 0, 32, 12, 11, 1, [shade(top, 1.1), shade(top, 0.8), shade(top, 0.65)]) + ifront(0, 12, 32, 11, 1, "#c9ccd6") + iside(32, 0, 12, 11, 1, "#a7acb6")
      + itop(2, 2, 10, 0.4, 12.01, "#ffffff", ' fill-opacity=".25"');
  }
});
reg(class extends IsoArt {  // the steel office desk of the seventies (administration): a side panel, a pedestal, chrome handles
  constructor() { super("isodeskmetal", 36, 13, 13); }
  body({ c = "#8d929c", top = "#4a5a52" }) {
    let g = ishadow(36, 13) + ibox(0, 0.5, 2, 12.5, 0, 11, c) + ibox(2, 0.6, 22, 1, 3, 8, shade(c, 0.75)) + ibox(24, 0.5, 12, 12.5, 0, 11, c);
    for (const z of [1, 4.4, 7.8]) g += ifront(25, 13, 10, z, 2.9, shade(c, 0.9)) + ifront(27, 13, 6, z + 2.1, 0.5, "#e6e8ee") + ifront(29, 13, 2, z + 0.6, 0.9, "#f4f2ea");
    return g + ibox(0, 0, 36, 13, 11, 1, [top, shade(c, 0.9), shade(c, 0.7)]) + ifront(0, 13, 36, 11, 1, "#c9ccd6") + iside(36, 0, 13, 11, 1, "#a7acb6");
  }
});
reg(class extends IsoArt {  // the glass desk (modern): trestle frames, a clear or smoked top you see through
  constructor() { super("isodeskglass", 36, 12, 13); }
  body({ glass = "#cfeef2", leg = "#c9ccd6" }) {
    let g = ishadow(36, 12, 0);
    for (const x of [2, 32.6]) g += ibox(x, 1, 1.4, 10, 0, 0.8, leg) + ibox(x, 1, 1.4, 1, 0, 11, leg) + ibox(x, 10, 1.4, 1, 0, 11, leg) + ibox(x, 1, 1.4, 10, 10, 1, leg);
    g += ibox(3.4, 5.4, 29.2, 1, 9.6, 0.6, leg);
    g += ibox(0, 0, 36, 12, 11, 1, [glass, shade(glass, 0.8), shade(glass, 0.65)], ' fill-opacity=".55"');
    return g + iline(ipt(2, 2, 12), ipt(14, 2, 12), "#ffffff", 0.4) + iline(ipt(4, 4, 12), ipt(10, 4, 12), "#ffffff", 0.3) + ifront(0, 12, 36, 11, 1, shade(glass, 0.7), ' fill-opacity=".85"');
  }
});
reg(class extends IsoArt {  // the sit-stand desk (modern): T feet, telescopic columns, a crossbeam, its control pad
  constructor() { super("isodeskstanding", 36, 12, 15); }
  body({ top = "#f0efe9", leg = "#e6e6e6" }) {
    let g = ishadow(36, 12);
    for (const x of [3, 30]) g += ibox(x, 0.5, 3, 11, 0, 1, leg) + ibox(x + 0.3, 4.2, 2.4, 3.6, 1, 5, shade(leg, 0.92)) + ibox(x + 0.6, 4.6, 1.8, 2.8, 6, 5, leg);
    g += ibox(5, 5, 26, 1.6, 9.4, 1.6, shade(leg, 0.8));
    g += ibox(0, 0, 36, 12, 11, 1.6, [shade(top, 1.08), shade(top, 0.9), shade(top, 0.72)]);
    return g + ifront(28, 12, 4.5, 11.3, 1, "#1c1c24") + ifront(28.6, 12, 0.8, 11.6, 0.4, "#51cf66") + ifront(30, 12, 1.8, 11.6, 0.4, "#c9ccd6");
  }
});
reg(class extends IsoArt {  // the Scandinavian desk (design): tapered splayed legs, a drawer in a colour, a light wood top
  constructor() { super("isodeskscandi", 34, 12, 13); }
  body({ w = "#c9a77a", drawer = "#f0efe9" }) {
    const lg = shade(w, 0.85);
    let g = ishadow(34, 12) + ileg(30.5, 0.2, 29.5, 1.2, 9, lg) + ileg(-0.4, 0.2, 0.8, 1.2, 9, lg);
    g += ibox(1.4, 1, 31.2, 10, 8.6, 2.4, [shade(drawer, 1.05), drawer, shade(drawer, 0.78)]) + ifront(10, 11, 14, 9, 1.6, shade(drawer, 0.9)) + ifront(16.4, 11, 1.2, 9.5, 0.6, w);
    g += ileg(-0.4, 12, 0.8, 10.6, 9, shade(w, 0.75)) + ileg(32.6, 12, 31.6, 10.6, 9, shade(w, 0.7));
    return g + ibox(0, 0, 34, 12, 11, 1, wood(w)) + ifront(0, 12, 34, 11.5, 0.3, shade(w, 1.25));
  }
});
reg(class extends IsoArt {  // the lacquered waterfall desk (design): the top falls to the floor on both sides, an open cubby
  constructor() { super("isodeskwave", 36, 12, 13); }
  body({ c = "#1e1e24", accent = "#c9a24b" }) {
    const t = [shade(c, 1.25), c, shade(c, 0.7)];
    let g = ishadow(36, 12) + ibox(0, 0, 2, 12, 0, 11, t) + ibox(24, 0.5, 10, 11, 5.4, 5.6, t) + ifront(25, 11.5, 8, 6.2, 3.6, shade(c, 0.45));
    g += ifront(25, 11.5, 8, 6.2, 0.3, accent) + ibox(34, 0, 2, 12, 0, 11, t);
    g += ibox(0, 0, 36, 12, 11, 1.4, t) + ifront(2, 12, 32, 11.4, 0.3, accent);
    return g + itop(3, 2, 12, 0.5, 12.41, "#ffffff", ' fill-opacity=".2"');
  }
});
reg(class extends IsoArt {  // the gaming desk: carbon top, a mouse pad wall to wall, LED strip, Z legs, headset hook
  constructor() { super("isodeskgamer", 40, 14, 15); }
  body({ led = "#ff3b5c" }) {
    const leg = ["#3a3a46", "#22222a", "#16161c"];
    let g = ishadow(40, 14);
    for (const x of [2, 35]) g += ibox(x, 1, 3, 12, 0, 1, leg) + ibox(x + 0.6, 6, 1.8, 2.6, 1, 10, leg) + ifront(x, 13, 3, 0.2, 0.5, led);
    g += ibox(5, 6.4, 30, 1.6, 9.6, 1.4, leg);
    g += ibox(0, 0, 40, 14, 11, 1.6, ["#2e2e38", "#1c1c24", "#14141c"]);
    for (let i = 0; i < 9; i++) g += itop(1 + i * 4.4, 0.6, 2.2, 12.6, 12.61, "#363642", ' fill-opacity=".6"');
    g += itop(3, 6.5, 34, 7, 12.62, "#101016") + iline(ipt(3, 13.5, 12.63), ipt(37, 13.5, 12.63), led, 0.4);
    return g + ifront(0, 14, 40, 11.3, 0.6, led) + ibox(40, 7, 0.6, 1, 8.6, 2, leg) + iside(40.6, 7, 1, 9, 1, led);
  }
});
reg(class extends IsoArt {  // a computer: the monitor (its screen painted live from the dev's work), keyboard, mouse, a tower
  constructor() { super("isopc", 22, 8, 16); }
  body({ back = false, kind = "bureau" }) {
    const tower = kind === "gamer" ? ["#3a3a46", "#1c1c24", "#14141c"] : ["#c9ccd6", "#a7acb6", "#8d929c"];
    let g = itop(7, 0.6, 6, 3, 0.05, "#2a2a33") + ibox(9.2, 1, 1.6, 1.2, 0, 4, "#1c1c24") + ibox(1, 0.4, 18, 1.4, 2, 10, ["#33333f", back ? "#2a2a33" : "#1c1c24", "#2a2a33"]);
    if (back) return g + ifront(6, 1.8, 8, 4, 4, "#3a3a46") + ibox(17, 3.5, 4, 4, 0, 7, tower) + itop(2, 4.6, 14, 3, 0.05, "#3a3a46");
    g += ifront(2, 1.8, 16, 3, 8, "#222230") + itop(2.5, 4.4, 13, 2.8, 0.05, "#3a3a46");
    for (let r = 0; r < 3; r++) g += itop(3, 4.8 + r * 0.8, 12, 0.35, 0.1, "#55556a");
    g += itop(16.5, 5, 1.6, 2.4, 0.08, "#3a3a46") + ibox(19, 1, 3, 5, 0, 8, tower);
    if (kind === "gamer") g += ifront(19.4, 6, 2.2, 1, 6, "#b48cff", ' fill-opacity=".9"');
    return g;
  }
});
reg(class extends IsoArt {  // the back of an armchair
  constructor() { super("isoarmback", 24, 6, 24); }
  body() { const c = "#b85905"; return ibox(1, 0, 22, 6, 0, 22, [shade(c, 1.2), c, "#95440b"]) + ibox(2, 1, 20, 1, 19, 3, ["#de8001", "#de8001", c]); }
});
reg(class extends IsoArt {  // the seat and the arms of an armchair
  constructor() { super("isoarmseat", 24, 12, 14); }
  body() {
    const e = "#7b380c";
    return ishadow(24, 12) + ibox(1, 0, 22, 12, 0, 6, "#95440b") + ibox(4, 0, 16, 11, 6, 3, ["#f0a040", "#de8001", "#b86a00"])
      + ibox(0, 0, 4, 12, 0, 12, [shade(e, 1.3), e, shade(e, 0.75)]) + ibox(20, 0, 4, 12, 0, 12, [shade(e, 1.3), e, shade(e, 0.75)]);
  }
});

/* ---------- the meeting room ---------- */
reg(class extends IsoArt {  // the conference table: two pedestals, an oak top, laptops, notebooks, bottles, the speakerphone
  constructor() { super("isoconftable", 140, 28, 24); }
  body() {
    let g = ishadow(140, 28) + ibox(20, 10, 10, 8, 0, 11, "#3a2a1e") + ibox(110, 10, 10, 8, 0, 11, "#3a2a1e");
    g += ibox(0, 0, 140, 28, 11, 2, ["#a8774c", "#8a5d3a", "#5c3d27"]) + itop(4, 3, 132, 22, 13.05, "#9a6a40");
    for (const x of [20, 70, 120]) {  // the back row's laptops (their lids toward us), the front row's (their screens)
      g += itop(x - 7, 3, 14, 7, 13.1, "#c9ccd6") + ifront(x - 7, 3.5, 14, 13.1, 8, "#2a2a33") + ifront(x - 1.5, 3.5, 3, 16.5, 1.4, "#9aa0b2");
      g += itop(x - 7, 18, 14, 7, 13.1, "#c9ccd6") + ifront(x - 7, 18, 14, 13.1, 8, "#2a2a33") + ifront(x - 6, 18, 12, 14, 6.4, "#3f6fb0");
    }
    for (const [x, y] of [[44, 8], [96, 16], [6, 15]]) g += itop(x, y, 8, 5, 13.15, "#f4f2ea") + itop(x, y, 8, 1, 13.2, "#d64545");
    for (const [x, y] of [[36, 16], [58, 6], [132, 12]]) g += icyl(x, y, 13, 5, 1, "#8ec5ff", "#2f6ad6");
    return g + icyl(88, 12, 13, 1.2, 5, "#2a2a33", "#3a3a46") + iell(88, 12, 14.4, 0.8, "#51cf66");
  }
});

/* ---------- the terrace ---------- */
reg(class extends IsoArt {  // the stair kiosk, the way back to the office: glass, a roof, its door toward the deck
  constructor() { super("isokiosk", 44, 26, 48); }
  body({ night = false }) {
    const glass = night ? "#ffe8a3" : "#a8d4ff";
    let g = ishadow(44, 26) + ibox(0, 0, 44, 26, 0, 38, ["#d5dae6", "#9aa7c0", "#77849e"]) + ibox(-2, -2, 48, 30, 38, 3, ["#3a4258", "#2a3044", "#1c2133"]);
    g += ifront(4, 26, 14, 0, 30, "#2a3044") + ifront(5, 26, 12, 1, 27, night ? "#ffd27a" : "#8ec5ff", ' fill-opacity=".85"') + ifront(10.6, 26, 0.8, 1, 27, "#2a3044") + ifront(15, 26, 1, 13, 4, "#c9ccd6");
    for (const y of [4, 13]) g += iside(44, y, 8, 12, 18, glass, ' fill-opacity=".8"');
    g += ifront(22, 26, 18, 14, 16, glass, ' fill-opacity=".8"') + ifront(22, 26, 18, 21.6, 0.6, "#77849e");
    return g + ifront(5, 26, 12, 31, 4, "#2f9e44") + ifront(6, 26, 10, 32, 2, "#ffffff", ' fill-opacity=".6"');
  }
});
reg(class extends IsoArt {  // the pergola over the banquet table: four posts, slats, vines (by season), the table and benches
  constructor() { super("isopergola", 122, 48, 52); }
  body({ season = "" }) {
    const leaf = { automne: "#d9822b", hiver: "#9aa7c0", printemps: "#7fc96b" }[season] || "#4f9e4a", post = ["#b08a5a", "#8a6a4a", "#6d5238"];
    let g = ishadow(122, 48);
    for (const x of [12, 106]) g += ibox(x, 18, 3, 12, 0, 11, "#5c3d27");  // the banquet table and its benches
    g += ibox(8, 8, 106, 5, 0, 6, ["#a0764e", "#7a5636", "#5c3d27"]) + ibox(6, 16, 110, 16, 11, 1.6, ["#c0946a", "#a0764e", "#7a5636"]);
    for (let i = 0; i < 6; i++) g += icyl(18 + i * 18, 24, 12.6, 1.4, 2.4, "#c9ccd6", "#f4f2ea");
    g += icyl(60, 22, 12.6, 6, 1.4, "#8a3b5a", "#d64545") + ibox(8, 36, 106, 5, 0, 6, ["#a0764e", "#7a5636", "#5c3d27"]);
    for (const [x, y] of [[0, 0], [118, 0], [0, 44], [118, 44]]) g += ibox(x, y, 4, 4, 0, 44, post);  // posts and slats
    g += ibox(0, 0, 122, 4, 44, 3, post) + ibox(0, 44, 122, 4, 44, 3, post);
    for (let x = 4; x < 120; x += 9) g += ibox(x, -2, 3, 52, 47, 2, ["#c09a6a", "#9a7a54", "#7a5a3a"]);
    if (season !== "hiver") for (let x = 6; x < 120; x += 7) g += iell(x, 2 + (x % 3) * 18, 49.5, 3.4, leaf, ' fill-opacity=".9"');
    return g;
  }
});
reg(class extends IsoArt {  // the bar: its back shelf with bottles and the neon sign, the counter
  constructor() { super("isobar", 88, 26, 48); }
  body({ neon = false }) {
    let g = ishadow(88, 26) + ibox(0, 0, 88, 6, 0, 30, ["#7a5636", "#5c3d27", "#4a2f1e"]);
    for (const z of [12, 22]) { g += ifront(2, 6, 84, z, 0.8, "#8a6a4a"); for (let x = 4; x < 84; x += 4.5) g += ifront(x, 6, 1.6, z + 0.8, 4 + (Math.floor(x) % 3), ["#2f9e44", "#d64545", "#fbaa08", "#5aa9ff", "#b48cff"][Math.floor(x) % 5], ' fill-opacity=".9"'); }
    g += ifront(30, 6, 28, 33, 7, "#14141c") + ifront(31, 6, 26, 34, 5, neon ? "#ff5fa2" : "#5a2a40");
    g += ibox(0, 12, 88, 14, 0, 20, ["#d9c7a8", "#8a5d3a", "#6d4a2e"]) + ibox(-1, 11, 90, 16, 20, 2, ["#3a3a46", "#2a2a33", "#1c1c24"]);
    for (let x = 4; x < 86; x += 12) g += ifront(x, 26, 8, 3, 14, "#a0764e");
    for (const x of [20, 46, 70]) g += icyl(x, 16, 22, 4, 1.2, "#f4c430", "#fff3b0");
    return g + (neon ? ifront(0, 26, 88, 1, 1, "#ff5fa2") : "");
  }
});
reg(class extends IsoArt {  // a bar stool
  constructor() { super("isobarstool", 8, 8, 16); }
  body() { return ishadow(8, 8, 0) + iell(4, 4, 0.5, 3.2, "#3a3a46") + ibox(3.4, 3.4, 1.2, 1.2, 0, 13, "#3a3a46") + icyl(4, 4, 13, 2, 4, "#b85905", "#de8001"); }
});
reg(class extends IsoArt {  // the grill: a kettle barbecue on its legs, the food when lit
  constructor() { super("isogrill", 20, 14, 26); }
  body({ on = false }) {
    let g = ishadow(20, 14);
    for (const [x, y] of [[4, 3], [16, 3], [10, 12]]) g += iline(ipt(10, 7, 12), ipt(x, y, 0), "#2a2a33", 1);
    g += icyl(10, 7, 10, 6, 8, "#1c1c24", "#3a3a46") + iell(10, 7, 16.1, 7, on ? "#ff6b35" : "#55556a");
    for (let i = -2; i <= 2; i++) g += iline(ipt(10 + i * 2.6, 1, 16.2), ipt(10 + i * 2.6, 13, 16.2), "#9aa0ad", 0.4);
    if (on) g += itop(5, 4, 4, 2, 16.6, "#8a3b2a") + itop(11, 8, 5, 2, 16.6, "#c46a3a") + itop(8, 10, 3, 2, 16.6, "#8a3b2a");
    return g + ibox(18, 6, 4, 1, 14, 0.8, "#9aa0ad");
  }
});
reg(class extends IsoArt {  // the fire pit: a stone ring, logs, flames when lit
  constructor() { super("isofirepit", 28, 24, 18); }
  body({ lit = false, frame = 0 }) {
    let g = ishadow(28, 24, 0) + icyl(14, 12, 0, 5, 12, "#6f7488", "#8d929c") + iell(14, 12, 5.05, 9, "#2a2a33");
    g += iline(ipt(8, 10, 5.6), ipt(20, 14, 5.6), "#6d4a2e", 1.6) + iline(ipt(9, 15, 5.6), ipt(19, 9, 5.6), "#5c3d27", 1.6);
    if (lit) { const [x, y] = ipt(14, 12, 6), h = 7 + frame; g += `<path fill="#ff6b35" d="M${n2(x - 4)} ${n2(y)}q1 -${h} 4 -${h + 3}q3 3 4 ${h + 3}z"/><path fill="#ffd43b" d="M${n2(x - 2)} ${n2(y)}q1 -${h - 3} 2 -${h}q2 3 2 ${h}z"/>`; }
    return g;
  }
});
reg(class extends IsoArt {  // the outdoor sofa: a teak frame, cream cushions, colored pillows
  constructor() { super("isooutsofa", 92, 20, 18); }
  body() {
    const teak = ["#a0764e", "#7a5636", "#5c3d27"];
    let g = ishadow(92, 20) + ibox(0, 0, 92, 20, 0, 5, teak) + ibox(0, 0, 92, 6, 5, 11, ["#efe6d2", "#d9cdb4", "#bfb196"]);
    for (let i = 0; i < 4; i++) g += ibox(4 + i * 21, 6, 20.5, 13, 5, 4, ["#f7f0dc", "#e3d8bf", "#c9bc9f"]);
    for (const [x, c] of [[8, "#ff6b6b"], [40, "#5aa9ff"], [72, "#fbaa08"]]) g += ibox(x, 5, 8, 3, 9, 7, c);
    return g + ibox(0, 0, 4, 20, 5, 8, teak) + ibox(88, 0, 4, 20, 5, 8, teak);
  }
});
reg(class extends IsoArt {  // the low table with its lantern
  constructor() { super("isolowtable", 28, 12, 16); }
  body({ lit = false }) {
    let g = ishadow(28, 12);
    for (const [x, y] of [[1, 1], [25, 1], [1, 9], [25, 9]]) g += ibox(x, y, 2, 2, 0, 6, "#5c3d27");
    g += ibox(0, 0, 28, 12, 6, 1.6, ["#c0946a", "#a0764e", "#7a5636"]);
    return g + ibox(12, 4, 4, 4, 7.6, 7, ["#3a3a46", lit ? "#ffd27a" : "#c9ccd6", lit ? "#e0b050" : "#9aa0ad"]) + ibox(11.5, 3.5, 5, 5, 14.6, 1, "#2a2a33");
  }
});
reg(class extends IsoArt {  // a deckchair with its towel
  constructor() { super("isochaise", 28, 12, 16); }
  body({ towel = "#ff6b6b" }) {
    let g = ishadow(28, 12);
    for (const [x, y] of [[2, 1], [24, 1], [2, 9], [24, 9]]) g += ibox(x, y, 2, 2, 0, 3, "#9aa0ad");
    g += ibox(1, 1, 26, 10, 3, 1.4, ["#f4f2ea", "#d9cdb4", "#bfb196"]) + ipoly([ipt(1, 1, 4.4), ipt(1, 11, 4.4), ipt(-3, 11, 13), ipt(-3, 1, 13)], "#e3d8bf");
    return g + itop(8, 2, 14, 8, 4.5, towel) + itop(8, 2, 14, 1.4, 4.55, "#ffffff", ' fill-opacity=".6"');
  }
});
reg(class extends IsoArt {  // a planter: a wooden box, flowers by season
  constructor() { super("isoplanter", 32, 10, 24); }
  body({ season = "" }) {
    const fl = { automne: ["#d9822b", "#b5541b"], hiver: ["#c9d7e6", "#9aa7c0"], printemps: ["#ff9fc4", "#ffd43b"] }[season] || ["#ff6b6b", "#fbaa08"];
    let g = ishadow(32, 10) + ibox(0, 0, 32, 10, 0, 9, ["#a0764e", "#7a5636", "#5c3d27"]) + itop(1, 1, 30, 8, 9.05, "#4a3826");
    for (let i = 0; i < 7; i++) { const x = 3 + i * 4.3, y = 3 + (i % 2) * 4, h = 15 + (i % 3) * 2; g += iline(ipt(x, y, 9), ipt(x, y, h), "#2f7a3a", 0.8) + iell(x, y, h, 2.2, "#3f9e4f") + iell(x + 0.6, y, h + 2, 1.1, fl[i % 2]); }
    return g;
  }
});

/* ---------- the objects of the buy mode (js/items/: their style recolors the same colors as their 2D art) ---------- */
reg(class extends IsoArt {  // the floor lamp: a round foot, the pole, the shade (lit: glowing)
  constructor() { super("isolamp", 11, 11, 48); }
  body({ on = false }) {
    let g = ishadow(11, 11, 0) + icyl(5.5, 5.5, 0, 1.4, 4, "#33333f", "#3d3d4a") + ibox(5, 5, 1.2, 1.2, 1.4, 36, ["#55556a", "#3d3d4a", "#33333f"]);
    const [x, y] = ipt(5.5, 5.5, 36), top = y - 9;
    g += `<path fill="${on ? "#ffe8a3" : "#f4efc9"}" d="M${n2(x - 3)} ${n2(top)}h6l2.6 9h-11.2z"/><path fill="#de8001" fill-opacity=".35" d="M${n2(x + 3)} ${n2(top)}l2.6 9h-2.4l-1.4 -9z"/>`;
    g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="5.6" ry="1.4" fill="${on ? "#fff3b0" : "#de8001"}"/>`;
    if (on) g += `<ellipse cx="${n2(x)}" cy="${n2(y + 1)}" rx="9" ry="3" fill="#ffe8a3" fill-opacity=".25"/>`;
    return g;
  }
});
reg(class extends IsoArt {  // the jukebox: a rounded top with its colored tubes, the record window, the speaker grill
  constructor() { super("isojukebox", 16, 12, 30); }
  body({ on: light = 3 }) {
    const glow = ["#ff6b6b", "#51cf66", "#5aa9ff", "#7b380c"][light], lit = light !== 3;
    let g = ishadow(16, 12) + ibox(0, 0, 16, 12, 0, 20, ["#d9741a", "#b85905", "#7b380c"]);
    const [ax, ay] = ipt(0, 12, 20), [bx, by] = ipt(16, 12, 20), [cx, cy] = ipt(16, 0, 20);
    g += `<path fill="#b85905" d="M${n2(ax)} ${n2(ay)}Q${n2((ax + bx) / 2)} ${n2(ay - 14)} ${n2(bx)} ${n2(by)}Z"/><path fill="#7b380c" d="M${n2(bx)} ${n2(by)}Q${n2((bx + cx) / 2 + 1)} ${n2((by + cy) / 2 - 12)} ${n2(cx)} ${n2(cy)}Z"/>`;
    g += `<path fill="none" stroke="${glow}" stroke-width="1.2" d="M${n2(ax + 1.6)} ${n2(ay - 0.6)}Q${n2((ax + bx) / 2)} ${n2(ay - 12)} ${n2(bx - 1.6)} ${n2(by - 0.6)}"/>`;
    g += ifront(3, 12, 10, 12, 6, lit ? "#fff3b0" : "#5a2808") + ifront(5, 12, 6, 13, 4, lit ? "#2a2a33" : "#3a1a0a");  // the records
    for (let i = 0; i < 4; i++) g += ifront(2.5 + i * 3, 12, 1.6, 2, 8, "#5a2808");  // the grill
    return g + ifront(0.6, 12, 1, 1, 18, glow, ' fill-opacity=".8"') + ifront(14.4, 12, 1, 1, 18, glow, ' fill-opacity=".8"');
  }
});
reg(class extends IsoArt {  // the aquarium on its cabinet: the water, the sand, plants, a castle, three fish swimming
  constructor() { super("isoaquarium", 26, 12, 30); }
  body({ frame = 0 }) {
    let g = ishadow(26, 12) + ibox(0, 0, 26, 12, 0, 11, ["#8a6a4a", "#6d5238", "#5a4330"]) + ifront(2, 12, 22, 2, 7, "#5a4330");
    g += ibox(0.5, 0.5, 25, 11, 11, 15, ["#5aa9ff", "#3f8fe0", "#0d2a6e"], ' fill-opacity=".85"') + ifront(0.5, 11.5, 25, 11, 2.6, "#d6b07f");
    g += ifront(4, 11.5, 1.4, 13, 7, "#3f9e4f") + ifront(20, 11.5, 1.4, 13, 9, "#3f9e4f") + ifront(11, 11.5, 4, 13.4, 4, "#8d8aa0") + ifront(12.4, 11.5, 1.2, 13.4, 2, "#3a3a48");
    for (let k = 0; k < 3; k++) { const u = (frame + k * 3) % 8, x = 3 + (u < 4 ? u : 8 - u) * 4.6, z = 18 + k * 2.4; g += ifront(x, 11.6, 2.6, z, 1.4, ["#ff8f6b", "#fbaa08", "#ff6b6b"][k]) + ifront(u < 4 ? x - 0.8 : x + 2.6, 11.6, 0.8, z + 0.2, 1, ["#ff8f6b", "#fbaa08", "#ff6b6b"][k]); }
    return g + itop(0.5, 0.5, 25, 11, 26.05, "#d5eeff", ' fill-opacity=".35"') + ifront(1, 11.5, 24, 25, 0.5, "#d5eeff", ' fill-opacity=".6"');
  }
});
reg(class extends IsoArt {  // the big plant in its terracotta pot
  constructor() { super("isobigplant", 16, 16, 34, { mx: 4 }); }
  body() {
    let g = ishadow(16, 16) + icyl(8, 8, 0, 8, 6, "#b0603a", "#c9744a") + iell(8, 8, 8.05, 5, "#4a3826");
    const [x, y] = ipt(8, 8, 8);
    for (const [dx, dy, c] of [[-7, -16, "#2f7a3a"], [6, -18, "#3f9e4f"], [-2, -24, "#2f7a3a"], [8, -8, "#3f9e4f"], [-9, -7, "#3f9e4f"], [2, -14, "#5fbf6d"]])
      g += `<path fill="${c}" d="M${n2(x)} ${n2(y)}Q${n2(x + dx * 0.2)} ${n2(y + dy * 0.7)} ${n2(x + dx)} ${n2(y + dy)}Q${n2(x + dx * 0.8)} ${n2(y + dy * 0.3)} ${n2(x)} ${n2(y)}Z"/>`;
    return g;
  }
});
reg(class extends IsoArt {  // the chief's desk: an executive top, a drawer block, the computer and its screen
  constructor() { super("isochiefdesk", 34, 16, 28); }
  body() {
    let g = ishadow(34, 16) + ibox(0, 1, 2.4, 14, 0, 12, ["#8a6a4a", "#5c3d27", "#4a3826"]) + ibox(22, 1, 11, 14, 0, 12, ["#8a6a4a", "#5c3d27", "#4a3826"]);
    for (const z of [2, 6.5]) g += ifront(23, 15, 9, z, 3.6, "#4a3826") + ifront(26.5, 15, 2, z + 1.6, 0.6, "#c9a24b");
    g += ibox(-1, 0, 36, 16, 12, 1.8, ["#8a6a4a", "#5c3d27", "#4a3826"]);
    g += ibox(13, 3, 2, 2, 13.8, 3, "#1c1c24") + ibox(6, 2.4, 16, 1.4, 16, 10, ["#33333f", "#1c1c24", "#2a2a33"]) + ifront(7, 3.8, 14, 17, 8, "#1f6feb");
    g += ifront(8, 3.8, 6, 23, 1, "#f7f7f7") + ifront(8, 3.8, 9, 21, 0.8, "#9fd1ff") + ifront(8, 3.8, 7, 19.4, 0.8, "#9fd1ff");  // ChiefOS on screen
    return g + itop(7, 8, 13, 3.4, 13.85, "#3a3a46") + itop(23, 8, 2.4, 3.4, 13.85, "#3a3a46") + icyl(29, 6, 13.8, 3, 1.6, "#f4f2ea", "#6d4a2e");
  }
});
reg(class extends IsoArt {  // the pet bowl: full of kibble or empty
  constructor() { super("isobowl", 10, 8, 6); }
  body({ on: full = false }) { return ishadow(10, 8, 0) + icyl(5, 4, 0, 2.6, 4, "#d64545", "#ff6b6b") + iell(5, 4, 2.65, 3, full ? "#c9a24b" : "#5a1f1f") + (full ? iell(4, 3.6, 3, 1, "#e0b85a") + iell(6, 4.4, 3, 0.8, "#e0b85a") : ""); }
});

/* ---------- plants, trees, signs, the small things of the rooms ---------- */
reg(class extends IsoArt {  // a small potted plant (dry: wilted)
  constructor() { super("isopotplant", 12, 12, 22); }
  body({ dry = false }) {
    const leaf = dry ? "#b09440" : "#3f9e4f", leaf2 = dry ? "#94782f" : "#5fbf6d";
    let g = ishadow(12, 12, 0) + icyl(6, 6, 0, 7, 4.4, "#b0603a", "#c9744a") + iell(6, 6, 7.05, 3.6, "#4a3826");
    const [x, y] = ipt(6, 6, 7), droop = dry ? 5 : 0;
    for (const [dx, dy, c] of [[-5, -9, leaf], [4, -10, leaf2], [0, -13, leaf], [6, -5, leaf], [-6, -4, leaf2]])
      g += `<path fill="${c}" d="M${n2(x)} ${n2(y)}Q${n2(x + dx * 0.3)} ${n2(y + dy * 0.8 + droop)} ${n2(x + dx)} ${n2(y + dy + droop * 1.4)}Q${n2(x + dx * 0.7)} ${n2(y + dy * 0.2)} ${n2(x)} ${n2(y)}Z"/>`;
    return g;
  }
});
reg(class extends IsoArt {  // the team's plant: it grows with the week's MRs, wilts without any
  constructor() { super("isoteamplant", 18, 18, 46); }
  body({ n = 1, dry = false, frame = 0 }) {
    const h = 4 + n * 2.4, leaf = dry ? "#b09440" : "#3f9e4f", leaf2 = dry ? "#94782f" : "#5fbf6d";
    let g = ishadow(18, 18) + icyl(9, 9, 0, 9, 6.4, "#b0603a", "#c9744a") + iell(9, 9, 9.05, 5.4, "#4a3826");
    const [x, y] = ipt(9, 9, 9);
    g += `<rect x="${n2(x - 0.4)}" y="${n2(y - h)}" width=".8" height="${n2(h)}" fill="${dry ? "#7a6a3a" : "#2f7a3a"}"/>`;
    for (let i = 0; i < Math.max(1, Math.floor(h / 3.2)); i++) {
      const yy = y - 2 - i * 3.2, side = i % 2 ? 1 : -1, sway = frame ? 0.4 : -0.4, droop = dry ? 1.6 : 0;
      g += `<path fill="${i % 2 ? leaf : leaf2}" d="M${n2(x)} ${n2(yy)}Q${n2(x + side * 2.4 + sway)} ${n2(yy - 2.4 + droop)} ${n2(x + side * 4.6 + sway)} ${n2(yy - 0.6 + droop * 1.4)}Q${n2(x + side * 2.2 + sway)} ${n2(yy + 0.8 + droop)} ${n2(x)} ${n2(yy)}Z"/>`;
    }
    if (n >= 6 && !dry) g += `<circle cx="${n2(x)}" cy="${n2(y - h - 1.2)}" r="1.8" fill="#ff6b9a"/><circle cx="${n2(x)}" cy="${n2(y - h - 1.2)}" r=".7" fill="#ffd43b"/>`;
    return g;
  }
});
reg(class extends IsoArt {  // an olive tree in a big pot (leaves by season)
  constructor() { super("isoolive", 22, 22, 56, { mx: 6 }); }
  body({ season = "" }) {
    const leaf = { automne: ["#c9a24b", "#a8873a"], hiver: ["#8a9a80", "#6f7e66"] }[season] || ["#7a9a5a", "#5f7f45"];
    let g = ishadow(22, 22) + ibox(2, 2, 18, 18, 0, 12, ["#e0d6c4", "#c9bca4", "#a89a80"]) + itop(3, 3, 16, 16, 12.05, "#5c3d27");
    const [x, y] = ipt(11, 11, 12);
    g += `<path fill="#6d5238" d="M${n2(x - 1)} ${n2(y)}q-1 -10 -3 -16h2q1 5 2 9q1 -6 4 -10h1.6q-3 6 -4.6 17z"/>`;
    for (const [dx, dy, r, k] of [[-6, -22, 7, 0], [5, -24, 7.6, 1], [0, -31, 7, 0], [-9, -28, 5, 1], [9, -18, 5, 0], [-2, -19, 6, 1]])
      g += `<ellipse cx="${n2(x + dx)}" cy="${n2(y + dy)}" rx="${r}" ry="${n2(r * 0.8)}" fill="${leaf[k]}"/>`;
    for (const [dx, dy] of [[-4, -25], [3, -29], [7, -21], [-8, -20]]) g += `<circle cx="${n2(x + dx)}" cy="${n2(y + dy)}" r=".7" fill="${season === "automne" ? "#3a2a4a" : "#2f3a1f"}"/>`;
    return g;
  }
});
reg(class extends IsoArt {  // a parasol: its foot, the pole, a striped canopy
  constructor() { super("isoparasol", 16, 16, 62, { mx: 16 }); }
  body({ a = "#fbaa08", b = "#081746", closed = false }) {
    if (closed) {  // folded: the stripes wrapped around the pole, a strap (rain, storm, night: items/furniture.js)
      const [x, y] = ipt(8, 8, 0);
      let g = ishadow(8, 8, 0) + ibox(4, 4, 8, 8, 0, 3, "#6f7488") + ibox(7.4, 7.4, 1.2, 1.2, 3, 56, "#c9ccd6");
      for (let i = 0; i < 4; i++) g += `<path fill="${i % 2 ? a : b}" d="M${n2(x - 3.2 + i * 1.6)} ${n2(y - 22)}L${n2(x - 1.6 + i * 1.6)} ${n2(y - 22)}L${n2(x + 0.2 - (i - 1.5) * 0.3)} ${n2(y - 54)}Z"/>`;
      return g + `<rect x="${n2(x - 2.4)}" y="${n2(y - 36)}" width="4.8" height="1.2" fill="#f4f2ea"/><circle cx="${n2(x)}" cy="${n2(y - 56.6)}" r="1.2" fill="#c9ccd6"/>`;
    }
    let g = iell(8, 8, 0, 22, "#000", ' fill-opacity=".14"') + ibox(4, 4, 8, 8, 0, 3, "#6f7488") + ibox(7.4, 7.4, 1.2, 1.2, 3, 48, "#c9ccd6");
    const [x, y] = ipt(8, 8, 52), rx = 24, ry = 11;
    for (let i = 0; i < 8; i++) {
      const a0 = i / 8 * Math.PI * 2, a1 = (i + 1) / 8 * Math.PI * 2;
      g += `<path fill="${i % 2 ? a : b}" d="M${n2(x)} ${n2(y - 8)}L${n2(x + Math.cos(a0) * rx)} ${n2(y + Math.sin(a0) * ry)}L${n2(x + Math.cos(a1) * rx)} ${n2(y + Math.sin(a1) * ry)}Z"/>`;
    }
    return g + `<circle cx="${n2(x)}" cy="${n2(y - 8.6)}" r="1.2" fill="#c9ccd6"/>`;
  }
});
reg(class extends IsoArt {  // the cake of a level up, its candles
  constructor() { super("isocake", 16, 16, 18); }
  body({ flame = 0 }) {
    let g = ishadow(16, 16, 0) + icyl(8, 8, 0, 1, 8, "#c9ccd6", "#f4f2ea") + icyl(8, 8, 1, 6, 6, "#c46a8a", "#f7c6d9") + icyl(8, 8, 7, 4, 4.4, "#f4c2d7", "#fff0f6");
    for (const [cx, cy] of [[6, 7], [10, 8], [8, 10]]) { const [x, y] = ipt(cx, cy, 11); g += `<rect x="${n2(x - 0.4)}" y="${n2(y - 3.6)}" width=".8" height="3.6" fill="${cx === 8 ? "#5aa9ff" : "#ff6b6b"}"/><ellipse cx="${n2(x)}" cy="${n2(y - 4.6 - flame * 0.3)}" rx=".7" ry="1.1" fill="#ffd43b"/>`; }
    return g;
  }
});
reg(class extends IsoArt {  // the box of croissants
  constructor() { super("isocroissants", 16, 12, 10); }
  body() {
    let g = ishadow(16, 12, 0) + ibox(0, 0, 16, 12, 0, 4, ["#f7c6d9", "#e98fc4", "#c96fa4"]);
    for (const [x, y] of [[4, 4], [10, 4], [7, 8.5]]) { const [px2, py] = ipt(x, y, 4); g += `<path fill="#d98018" d="M${n2(px2 - 3)} ${n2(py)}Q${n2(px2)} ${n2(py - 3.6)} ${n2(px2 + 3)} ${n2(py)}Z"/><path fill="none" stroke="#a85a0a" stroke-width=".3" d="M${n2(px2 - 1)} ${n2(py - 0.6)}l.3 -1.6M${n2(px2 + 1)} ${n2(py - 0.6)}l-.3 -1.6"/>`; }
    return g;
  }
});
reg(class extends IsoArt {  // the coffee spilled on the floor, its cup lying there
  constructor() { super("isospill", 20, 12, 5); }
  body() { return iell(9, 6, 0, 8, "#6d4a2e") + iell(7, 5, 0.05, 3.4, "#7d5636") + iell(6, 4.6, 0.1, 1.4, "#ffffff", ' fill-opacity=".35"') + ibox(15, 3, 4, 3, 0, 3, ["#f4f2ea", "#d9d6cc", "#bdb8b0"]); }
});
reg(class extends IsoArt {  // the afterwork chalkboard, an A-frame (its words painted live)
  constructor() { super("isochalkboard", 24, 8, 28); }
  body() {
    let g = ishadow(24, 8) + ipoly([ipt(1, 8, 0), ipt(1, 2, 26), ipt(23, 2, 26), ipt(23, 8, 0)], "#8a6a4a");
    return g + ipoly([ipt(2.5, 7.4, 2), ipt(2.5, 2.8, 24), ipt(21.5, 2.8, 24), ipt(21.5, 7.4, 2)], "#2a3a2e");
  }
});

/* ---------- the team, the chief and the pets in volume, Habbo style ---------- */
// built from blocks like the furniture: legs, body, arms, head (the face painted on one of its sides), hair, hat
const ROT = [(x, y) => [x, y], (x, y) => [y, -x], (x, y) => [-x, -y], (x, y) => [-y, x]];
// a model made of blocks, turned a quarter `rot` times: block(x0, y0, w, d, z0, h, color, details) in its own frame
// (x across, y toward where it looks), details painted on its sides: [side, u0, z0, w, h, color], side "front",
// "back", "left", "right" (u along the side, from left to right as seen from outside) or "top" (u, v on it);
// svg() draws the blocks back to front, bottom to top, with what shows of their details
function blocks(rot) {
  const R2 = ROT[rot], parts = [];
  const draw = p => {
    const c = [R2(p.x0, p.y0), R2(p.x0 + p.w, p.y0 + p.d)], X = Math.min(c[0][0], c[1][0]), Y = Math.min(c[0][1], c[1][1]);
    const W2 = Math.abs(c[1][0] - c[0][0]), D2 = Math.abs(c[1][1] - c[0][1]);
    let g = ibox(X, Y, W2, D2, p.z0, p.h, p.color);
    for (const [side, u0, dz, uw, dh, col] of p.details) {
      let a, b;
      if (side === "front") { a = [p.x0 + u0, p.y0 + p.d]; b = [p.x0 + u0 + uw, p.y0 + p.d]; }
      else if (side === "back") { a = [p.x0 + p.w - u0, p.y0]; b = [p.x0 + p.w - u0 - uw, p.y0]; }
      else if (side === "right") { a = [p.x0 + p.w, p.y0 + p.d - u0]; b = [p.x0 + p.w, p.y0 + p.d - u0 - uw]; }
      else if (side === "left") { a = [p.x0, p.y0 + u0]; b = [p.x0, p.y0 + u0 + uw]; }
      else { const q = [R2(p.x0 + u0, p.y0 + dz), R2(p.x0 + u0 + uw, p.y0 + dz + dh)]; g += itop(Math.min(q[0][0], q[1][0]), Math.min(q[0][1], q[1][1]), Math.abs(q[1][0] - q[0][0]), Math.abs(q[1][1] - q[0][1]), p.z0 + p.h + 0.02, col); continue; }
      const [ax, ay] = R2(...a), [bx, by] = R2(...b);
      if (Math.abs(ay - by) < 1e-6 && Math.abs(ay - (Y + D2)) < 1e-6) g += ifront(Math.min(ax, bx), ay, Math.abs(bx - ax), p.z0 + dz, dh, col);      // turned toward +y: seen
      else if (Math.abs(ax - bx) < 1e-6 && Math.abs(ax - (X + W2)) < 1e-6) g += iside(ax, Math.min(ay, by), Math.abs(by - ay), p.z0 + dz, dh, col);  // toward +x: seen
    }
    return g;
  };
  // blocks stacked over each other (the hair on the head) bottom to top, the others back to front
  const foot = p => { const c = [R2(p.x0, p.y0), R2(p.x0 + p.w, p.y0 + p.d)]; return [Math.min(c[0][0], c[1][0]), Math.min(c[0][1], c[1][1]), Math.max(c[0][0], c[1][0]), Math.max(c[0][1], c[1][1])]; };
  const order = (a, b) => {
    const fa = foot(a), fb = foot(b), over = fa[0] < fb[2] - 0.6 && fb[0] < fa[2] - 0.6 && fa[1] < fb[3] - 0.6 && fb[1] < fa[3] - 0.6;  // really one over the other
    if (over && Math.abs(a.z0 - b.z0) > 0.01) return a.z0 - b.z0;
    return (fa[0] + fa[2] + fa[1] + fa[3]) - (fb[0] + fb[2] + fb[1] + fb[3]) || a.z0 - b.z0;
  };
  return {
    block: (x0, y0, w, d, z0, h, color, details = []) => parts.push({ x0, y0, w, d, z0, h, color, details }),
    svg: () => parts.map((p, i) => [p, i]).sort((a, b2) => order(a[0], b2[0]) || a[1] - b2[1]).map(([p]) => draw(p)).join(""),
  };
}
// the team and the chief: modeled facing +y (toward the viewer's left); rot 0 faces +y (down-left, we see the face),
// 1 faces +x (down-right, the face on its right side), 2 faces -y and 3 faces -x (we see the back)
class IsoAvatar extends SvgArt {
  constructor() { super("isoavatar", 24, 48, { outline: 0.22, pad: 1 }); }
  box() { return [-12, -40, 24, 48]; }
  under({ seated = false }) { return seated ? "" : `<ellipse cx="0" cy="0" rx="4.4" ry="1.7" fill="#000" fill-opacity=".25"/>`; }
  // the pixel-art team (svg/pixelpeople.js); null while the atlas is not loaded: draw() is false and scene.js draws
  // its small fallback figure (drawPersonPx) rather than nobody
  image(state) { return pixelImage(state); }
  // drawn flat (svg/people.js): rot 0 faces down-left (from the front, turned left), 1 down-right (the same, mirrored),
  // 2 up-right (from behind, mirrored), 3 up-left (from behind)
  body(state) { const rot = state.rot || 0; return personSvg(state, { view: rot >= 2 ? "back" : "front", mirror: rot === 1 || rot === 2 }); }
}
ART.isoavatar = new IsoAvatar();

// Brume, the grey tabby: walking (legs by diagonal pairs, tail up), sitting (facing where she looks, tail around her
// paws, a blink now and then: frame 2) or asleep curled up
const CAT = { fur: "#a3a3ad", dark: "#8a8a96", stripe: "#6e6e7a", belly: "#d4d4dc", ear: "#e8a0b0", eye: "#8bd36b", nose: "#e88a9a" };
class IsoCat extends SvgArt {
  constructor() { super("isocat", 22, 22, { outline: 0.4, pad: 1 }); }
  box() { return [-11, -17, 22, 22]; }
  under({ pose }) { return `<ellipse cx="0" cy="0" rx="${pose === "sleep" ? 6 : 5}" ry="2" fill="#000" fill-opacity=".22"/>`; }
  body({ pose = "sit", frame = 0, rot = 0 }) {
    const c = CAT, { block, svg } = blocks(rot), blink = frame === 2;
    const eyes = z => blink ? [["front", 0.8, z + 0.5, 1.4, 0.4, c.stripe], ["front", 2.8, z + 0.5, 1.4, 0.4, c.stripe]]
      : [["front", 0.8, z, 1.4, 1.3, c.eye], ["front", 1.3, z, 0.5, 1.3, "#1c1c24"], ["front", 2.8, z, 1.4, 1.3, c.eye], ["front", 3.3, z, 0.5, 1.3, "#1c1c24"]];
    const head = (y0, z0, sleepy = false) => {
      block(-2.5, y0, 5, 4.2, z0, 4, c.fur, [...(sleepy ? [["front", 0.8, 2.2, 1.4, 0.4, c.stripe], ["front", 2.8, 2.2, 1.4, 0.4, c.stripe]] : eyes(2)),
        ["front", 2.1, 1, 0.8, 0.6, c.nose], ["front", 1.2, 0, 2.6, 0.9, c.belly], ["top", 1, 0.6, 0.8, 2, c.stripe], ["top", 3.2, 0.6, 0.8, 2, c.stripe]]);
      block(-2.4, y0 + 1, 1.4, 1.4, z0 + 4, 1.8, c.fur, [["front", 0.3, 0, 0.8, 1.2, c.ear]]);
      block(1, y0 + 1, 1.4, 1.4, z0 + 4, 1.8, c.fur, [["front", 0.3, 0, 0.8, 1.2, c.ear]]);
    };
    if (pose === "walk") {
      const f = frame % 2, up = (k) => (k === f ? 0.8 : 0);
      for (const [x, y, k] of [[-2.4, 2.4, 0], [1.2, 2.4, 1], [-2.4, -4.4, 1], [1.2, -4.4, 0]]) block(x, y + (k === f ? 0.6 : -0.6), 1.2, 1.2, up(k), 3 - up(k), x < 0 ? c.dark : c.fur);
      block(-2.6, -5, 5.2, 9, 2.8, 3.4, c.fur, [["top", 0.6, 2, 4, 0.8, c.stripe], ["top", 0.6, 4.4, 4, 0.8, c.stripe], ["top", 0.6, 6.8, 4, 0.8, c.stripe], ["left", 1, 0, 7, 0.8, c.belly], ["right", 1, 0, 7, 0.8, c.belly]]);
      head(3, 4.6);
      block(-0.5, -6.4, 1, 1.6, 5.6, 1, c.fur); block(-0.5, -7.2, 1, 1, 6.2, 4 + f, c.dark, [["back", 0, 2, 1, 0.8, c.stripe]]);
    } else if (pose === "sleep") {
      block(-3.6, -3.4, 7.2, 6.4, 0, 3.4, c.fur, [["top", 1.4, 1, 0.8, 4, c.stripe], ["top", 3.2, 1, 0.8, 4, c.stripe], ["front", 1, 0, 5, 1, c.belly]]);
      block(-4.4, -3.4, 0.9, 6.4, 0, 1.6, c.dark);  // the tail around her
      head(1.8, 0.2, true);
    } else {  // sitting: haunches, the chest up, the head on top, the tail on the floor
      block(-2.8, -3.4, 5.6, 5, 0, 4, c.fur, [["top", 1, 1, 0.8, 3, c.stripe], ["top", 3.6, 1, 0.8, 3, c.stripe]]);
      block(-2, 0.6, 4, 2.8, 0, 7.4, c.fur, [["front", 1, 1, 2, 4.6, c.belly]]);
      block(-1.6, 3.2, 1.2, 1, 0, 1, c.belly); block(0.4, 3.2, 1.2, 1, 0, 1, c.belly);
      block(2.8, -3.6 + (frame % 2), 1, 5.6, 0, 1, c.dark);  // the tail sweeping
      head(0, 7.4);
    }
    return svg();
  }
}
ART.isocat = new IsoCat();

// Biscuit, the dog: tan coat, a darker back, floppy ears, the snout forward; walking or sitting
const DOG = { coat: "#c98b4f", dark: "#9a6533", light: "#ecd2a8", ear: "#7a4a22", nose: "#1c1c24" };
class IsoDog extends SvgArt {
  constructor() { super("isodog", 26, 26, { outline: 0.4, pad: 1 }); }
  box() { return [-13, -20, 26, 26]; }
  under() { return `<ellipse cx="0" cy="0" rx="7" ry="2.6" fill="#000" fill-opacity=".22"/>`; }
  body({ frame = 0, sit = false, rot = 0 }) {
    const d = DOG, { block, svg } = blocks(rot), f = frame % 2;
    const head = (y0, z0) => {
      block(-2.8, y0, 5.6, 4.6, z0, 4.6, d.coat, [["front", 1, 2.6, 1.2, 1.2, "#1c1c24"], ["front", 3.4, 2.6, 1.2, 1.2, "#1c1c24"], ["top", 1.6, 0.6, 2.4, 1.6, d.light]]);
      block(-1.4, y0 + 4.6, 2.8, 2.4, z0, 2.4, d.light, [["front", 0.8, 1.2, 1.2, 1, d.nose], ["front", 0.6, 0, 1.6, 0.4, "#7a2b2b"]]);
      block(-3.6, y0 + 1, 0.9, 2.6, z0 + 0.6, 4.4, d.ear); block(2.7, y0 + 1, 0.9, 2.6, z0 + 0.6, 4.4, d.ear);
    };
    if (sit) {
      block(-3, -4, 6, 5.4, 0, 4.6, d.coat, [["top", 1, 1, 4, 3, d.dark]]);
      block(-2.4, 1, 4.8, 3.2, 0, 8.4, d.coat, [["front", 1.2, 1.4, 2.4, 5.6, d.light]]);
      block(-2, 4, 1.4, 1.6, 0, 1.2, d.light); block(0.6, 4, 1.4, 1.6, 0, 1.2, d.light);
      block(-0.5, -5.4, 1, 3, 0, 1.2, d.dark);
      head(0.4, 8.4);
    } else {
      for (const [x, y, k] of [[-2.8, 3.6, 0], [1.4, 3.6, 1], [-2.8, -5.6, 1], [1.4, -5.6, 0]]) block(x, y + (k === f ? 0.8 : -0.8), 1.4, 1.4, k === f ? 0.8 : 0, 3.6 - (k === f ? 0.8 : 0), x < 0 ? d.dark : d.coat);
      block(-3, -6.2, 6, 11, 3.4, 4.4, d.coat, [["top", 1, 1.6, 4, 7, d.dark], ["left", 1.4, 0, 8, 1, d.light], ["right", 1.4, 0, 8, 1, d.light]]);
      head(3.6, 6);
      block(-0.6, -7.6, 1.2, 1.6, 7, 1.2, d.dark); block(-0.6, -8.4, 1.2, 1.2, 7.6, 3.6 + f, d.coat);  // the tail, wagging
    }
    return svg();
  }
}
ART.isodog = new IsoDog();

// shared with the other isometric art files (svg/isogadgets.js)
export const ISO_KIT = { K, n2, ipoly, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, wood, T, legs4, gold, chrome, reg };
