// The rooftop afterwork (items/afterwork.js), drawn like the bar (svg/isobar.js): the bartender's post (a rubber mat,
// a rack of glasses, an ice bucket; Marcel himself is drawn over it, items/afterwork.js), a guinguette string of
// bulbs between two posts (a coloured bulb per real agent at work), the happy-hour bell on its bracket, the cocktail
// menu on its easel (its words chalked live), a dance floor of lit tiles.

import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ipoly, ibox, itop, ifront, iside, iline, iell, icyl, ishadow, reg } = ISO_KIT;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const metal = c => [shade(c, 1.22), c, shade(c, 0.72)];
const BRASS = ["#f2d27a", "#d4a640", "#a07a28"], STEEL = metal("#b8bcc6");
const WARM = ["#ffd43b", "#ff9f43", "#fff3b0", "#ff6b9a"];

/* ---------- the bartender's post ---------- */
// a ribbed rubber mat on the floor, a rack of glasses at the back, an ice bucket with a bottle of bubbly
art("isobarmanpost", 14, 8, 22, ({ party = false }) => {
  // a raised duckboard (Marcel stands on it, to be seen over the counter): slats on two runners, a black rubber top
  const Z = 5, WD = ["#b08a5a", "#8a6a4a", "#6d4a2e"];
  let g = ishadow(14, 8, 0) + ibox(0, 0, 14, 8, 0, Z - 0.4, WD) + itop(0, 0, 14, 8, Z, "#24242c");
  for (let x = 1.5; x < 14; x += 2) g += iline(ipt(x, 0.6, Z + 0.05), ipt(x, 7.4, Z + 0.05), "#3a3a44", 0.5);
  for (let x = 0.5; x < 14; x += 2.3) g += ifront(x, 8, 1.6, 0.6, Z - 1.2, "#5a3d24");
  g += ibox(0.6, 0.4, 5, 3.6, Z, 3, metal("#4a4a56"));  // the rack, its glasses upside down
  for (let k = 0; k < 3; k++) g += ibox(1.1 + k * 1.6, 0.8, 1.1, 1.1, Z + 3, 2.2, ["#f4fbff", "#dfeaf2", "#b9c8d4"], ' fill-opacity=".9"');
  g += icyl(11, 2.4, Z, 6, 2, STEEL[1], "#e6f4ff") + iell(11, 2.4, Z + 6, 1.6, "#cfe8f6");  // the bucket, the ice
  g += icyl(11.4, 2.2, Z + 5.8, 5, 0.6, party ? "#c8a040" : "#2f6e3c", "#1c1c22") + icyl(11.4, 2.2, Z + 10.8, 1.2, 0.35, "#e0c060", "#e0c060");
  return g;
});

/* ---------- the guinguette ---------- */
// two wooden posts, a wire that sags between them, a bulb every 6 units; bulbs: the colour of each one (null: off)
art("isoguinguette", 60, 4, 50, ({ bulbs = [], lit = false }) => {
  const H = 40, z = k => H - 2 - Math.sin(k * Math.PI) * 7, x = k => 2 + 56 * k;
  let g = iell(2, 3, 0, 3, "#000", ' fill-opacity=".2"') + iell(58, 3, 0, 3, "#000", ' fill-opacity=".2"');
  for (const px of [0.6, 56.6]) {
    g += ibox(px - 0.6, 1, 4, 4, 0, 1.2, metal("#5a5a64"));  // a weighted foot
    g += ibox(px + 0.4, 1.4, 2, 2, 1.2, H, ["#b08a5a", "#8a6a4a", "#6d4a2e"]) + ibox(px, 1, 2.8, 2.8, H, 1, ["#b08a5a", "#8a6a4a", "#6d4a2e"]);
  }
  let d = "";
  for (let i = 0; i <= 30; i++) { const k = i / 30, [sx, sy] = ipt(x(k), 2.4, z(k)); d += `${i ? "L" : "M"}${n2(sx)} ${n2(sy)}`; }
  g += `<path fill="none" stroke="#2a2a33" stroke-width=".45" d="${d}"/>`;
  const n = bulbs.length;
  for (let i = 0; i < n; i++) {
    const k = (i + 1) / (n + 1), [bx, by] = ipt(x(k), 2.4, z(k) - 1.6), c = bulbs[i];
    g += `<rect x="${n2(bx - 0.25)}" y="${n2(by - 1)}" width=".5" height=".8" fill="#2a2a33"/>`;
    if (c && lit) g += `<circle cx="${n2(bx)}" cy="${n2(by + 0.6)}" r="3.6" fill="${c}" fill-opacity=".3"/>`;
    g += `<ellipse cx="${n2(bx)}" cy="${n2(by + 0.6)}" rx="1.4" ry="1.8" fill="${c ? (lit ? c : shade(c, 0.85)) : "#c8c4bc"}"/>`
      + `<ellipse cx="${n2(bx - 0.3)}" cy="${n2(by + 0.2)}" rx=".3" ry=".4" fill="#fff" fill-opacity="${c && lit ? ".8" : ".4"}"/>`;
  }
  return g;
}, { mx: 2 });

/* ---------- the happy-hour bell ---------- */
// a wooden base, a brass bracket, the bell (swinging when rung), its rope
art("isohappybell", 6, 5, 18, ({ swing = 0 }) => {
  let g = ibox(0.4, 0.6, 5.2, 4, 0, 1.2, ["#b08a5a", "#8a6a4a", "#6d4a2e"]);
  g += ibox(0.8, 2, 0.8, 0.8, 1.2, 13, metal(BRASS[1])) + ibox(0.8, 2, 4.4, 0.8, 13.4, 0.8, metal(BRASS[1]));
  const [cx, cy] = ipt(3.6, 2.4, 12.6), a = [0, 14, -14][swing] || 0;
  return g + `<g transform="rotate(${a} ${n2(cx)} ${n2(cy)})">`
    + `<path fill="${BRASS[1]}" d="M${n2(cx - 0.8)} ${n2(cy + 0.6)}Q${n2(cx - 1.2)} ${n2(cy + 3)} ${n2(cx - 2.6)} ${n2(cy + 4.4)}H${n2(cx + 2.6)}Q${n2(cx + 1.2)} ${n2(cy + 3)} ${n2(cx + 0.8)} ${n2(cy + 0.6)}Z"/>`
    + `<path fill="${BRASS[0]}" d="M${n2(cx - 0.6)} ${n2(cy + 1)}Q${n2(cx - 1)} ${n2(cy + 3)} ${n2(cx - 1.8)} ${n2(cy + 4.2)}H${n2(cx - 1)}Q${n2(cx - 0.4)} ${n2(cy + 3)} ${n2(cx - 0.2)} ${n2(cy + 1)}Z"/>`
    + `<rect x="${n2(cx - 2.8)}" y="${n2(cy + 4.2)}" width="5.6" height=".7" fill="${BRASS[2]}"/><circle cx="${n2(cx)}" cy="${n2(cy + 5.2)}" r=".6" fill="${BRASS[2]}"/>`
    + `<path fill="none" stroke="#c8a070" stroke-width=".5" d="M${n2(cx + 0.4)} ${n2(cy + 5)}q.6 2 -.2 3.4"/></g>`;
});

/* ---------- the cocktail menu ---------- */
// an easel: three legs, a framed blackboard (its words are chalked live: items/afterwork.js), a lime and a glass on the ledge
art("isococktailmenu", 26, 8, 44, () => {
  const W8 = ["#b08a5a", "#8a6a4a", "#6d4a2e"];
  let g = ishadow(26, 8) + iline(ipt(13, 7.6, 0), ipt(13, 6, 36), "#6d4a2e", 1);  // the back leg
  for (const x of [2.5, 23.5]) g += ipoly([ipt(x - 0.8, 3.2, 0), ipt(x + 0.8, 3.2, 0), ipt(x + 0.5, 4, 40), ipt(x - 0.5, 4, 40)], W8[1]);
  g += ibox(0.8, 3.6, 24.4, 0.8, 39, 2, W8);  // the top bar
  g += ifront(1.2, 4.4, 23.6, 11, 27.6, "#6d4a2e") + ifront(2, 4.42, 22, 11.8, 26, "#22302a");  // the frame, the slate
  g += ifront(2, 4.43, 22, 37, 0.5, "#ffffff", ' fill-opacity=".06"');
  g += ibox(1, 3.6, 24, 2.2, 10, 1, W8);  // the ledge, a lime, a glass, the chalk
  g += icyl(5, 4.6, 11, 1.4, 1.2, "#7ac74f", "#a8e070") + ifront(19, 5, 2, 11, 3.4, "#dfeaf2", ' fill-opacity=".85"') + ifront(19.2, 5.02, 1.6, 11, 1.6, "#ff9f43", ' fill-opacity=".9"');
  return g + ibox(10, 4.4, 2.4, 0.6, 11, 0.6, ["#ffffff", "#f2f2f2", "#d9d9d9"]);
});

/* ---------- the dance floor ---------- */
// a low stage of 5 × 4 lit tiles, a chrome edge; tiles: a colour per tile (lit) or none (off)
art("isodancefloor", 50, 40, 6, ({ tiles = [], cols = 5, rows = 4 }) => {
  let g = ibox(0, 0, 50, 40, 0, 1.4, metal("#3a3a46")) + ifront(0, 40, 50, 1.1, 0.3, "#c9ccd6") + iside(50, 0, 40, 1.1, 0.3, "#9aa0ad");
  const tw = 50 / cols, td = 40 / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const col = tiles[r * cols + c];
    g += itop(c * tw + 0.5, r * td + 0.5, tw - 1, td - 1, 1.42, col || "#2a2a36");
    if (col) g += itop(c * tw + 1.6, r * td + 1.6, tw - 3.2, td - 3.2, 1.43, "#ffffff", ' fill-opacity=".28"');
  }
  return g;
});
