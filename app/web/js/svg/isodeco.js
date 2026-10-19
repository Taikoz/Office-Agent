// The decoration of the buy mode (items/deco.js), drawn with care: round volumes shaded from the left like the rest of
// the office, real materials (marble, stone, bronze, glazed ceramic, rice paper, wood), and a little life (water
// running, a pendulum swinging, wax lava rising, flames, grasses in the draught: frame).

import { SvgArt, shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, ibox, iline, iell, icyl, reg } = ISO_KIT;
const K = 0.6, RX = r => r * K * 1.414, RY = r => r * K * 0.707;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });
const DEFS = `<defs><linearGradient id="rnd" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".3" stop-color="#fff" stop-opacity=".06"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".36"/></linearGradient>`
  + `<radialGradient id="ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#d6dae2"/><stop offset="1" stop-color="#5a5f6a"/></radialGradient>`
  + `<radialGradient id="glow"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffe08a" stop-opacity=".8"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>`
  + `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe0f0"/><stop offset="1" stop-color="#3f8fbf"/></linearGradient></defs>`;
const shadow = (cx, cy, r, o = 0.22) => iell(cx, cy, 0, r, "#000", ` fill-opacity="${o}"`);
// a round body seen from the side: a profile [ [z, r], … ] turned around (cx, cy), shaded; its top opening
function lathe(cx, cy, prof, fill, top = null) {
  const [x] = ipt(cx, cy, 0), pts = prof.map(([z, r]) => [ipt(cx, cy, z)[1], RX(r)]);
  const left = pts.map(([y, w]) => `${n2(x - w)} ${n2(y)}`), right = pts.slice().reverse().map(([y, w]) => `${n2(x + w)} ${n2(y)}`);
  const [y0, w0] = pts[0], d = `M${left.join("L")}L${right.join("L")}Z`;
  const [yt, wt] = pts.at(-1);
  return `<path fill="${fill}" d="${d}"/><path fill="url(#rnd)" d="${d}"/><path fill="${fill}" d="M${n2(x - w0)} ${n2(y0)}A${n2(w0)} ${n2(w0 / 2)} 0 0 0 ${n2(x + w0)} ${n2(y0)}Z"/>`
    + (top ? `<ellipse cx="${n2(x)}" cy="${n2(yt)}" rx="${n2(wt)}" ry="${n2(wt / 2)}" fill="${top}"/>` : "");
}
const blob = (cx, cy, rx, ry, fill, more = "") => `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(ry)}" fill="${fill}"${more}/>`;

/* ---------- the zen fountain: a stone basin, three stacked river stones, water running down, ripples ---------- */
art("isofountain", 14, 14, 28, ({ c = "#8d929c", frame = 0 }) => {
  let g = DEFS + shadow(7, 7, 8.5) + ibox(0.5, 0.5, 13, 13, 0, 3.2, [shade(c, 1.15), c, shade(c, 0.72)]);  // the basin
  const [wx, wy] = ipt(7, 7, 3);
  g += `<path fill="url(#water)" d="M${ipt(1.5, 1.5, 3).join(" ")}L${ipt(12.5, 1.5, 3).join(" ")}L${ipt(12.5, 12.5, 3).join(" ")}L${ipt(1.5, 12.5, 3).join(" ")}Z"/>`;
  for (let i = 0; i < 2; i++) { const k = ((frame + i * 2) % 4) / 4; g += `<ellipse cx="${n2(wx)}" cy="${n2(wy + 0.6)}" rx="${n2(RX(1.6 + k * 4))}" ry="${n2(RY(1.6 + k * 4))}" fill="none" stroke="#e6faff" stroke-opacity="${n2(0.7 * (1 - k))}" stroke-width=".3"/>`; }  // ripples
  for (const [x, y] of [[2.6, 10.5], [10.8, 3.2], [3.4, 3.6]]) g += iell(x, y, 3.1, 0.9, shade(c, 0.85)) + iell(x - 0.2, y - 0.2, 3.3, 0.4, "#fff", ' fill-opacity=".35"');  // pebbles
  const stones = [[3, 4.2, 3.4], [8.6, 3.4, 2.8], [13.4, 2.4, 2.2]];  // z, radius, height
  for (const [z, r, h] of stones) { const [x, y] = ipt(7, 7, z); g += blob(x, y - h / 2, RX(r), h * 0.75, shade(c, 0.9)) + blob(x, y - h / 2, RX(r), h * 0.75, "url(#rnd)") + blob(x - RX(r) * 0.3, y - h * 0.85, RX(r) * 0.35, h * 0.18, "#fff", ' fill-opacity=".3"'); }
  const [tx, ty] = ipt(7, 7, 16);  // the water from the top stone, down its front
  g += `<path fill="none" stroke="#bfefff" stroke-width=".55" stroke-dasharray="1.2 .8" stroke-dashoffset="${n2(-frame * 0.5)}" d="M${n2(tx + 0.4)} ${n2(ty)}C${n2(tx + 3)} ${n2(ty + 3)} ${n2(tx + 4)} ${n2(ty + 8)} ${n2(tx + 2.8)} ${n2(wy)}"/>`;
  return g;
});

/* ---------- the abstract sculpture: a marble plinth, two interlocked rings of metal ---------- */
art("isosculpture", 10, 10, 40, ({ c = "#b07a3a" }) => {
  let g = DEFS + shadow(5, 5, 5.5) + ibox(2, 2, 6, 6, 0, 18, ["#f6f4ee", "#e4e0d6", "#c9c4b8"]);  // the plinth
  g += iline(ipt(2, 8, 12), ipt(5, 8, 15), "#bdb8ac", 0.2) + iline(ipt(8, 4, 6), ipt(8, 7, 10), "#bdb8ac", 0.2) + ibox(1.6, 1.6, 6.8, 6.8, 18, 0.7, ["#ffffff", "#ece8e0", "#d2cec4"]);
  const [x, y] = ipt(5, 5, 27), hi = shade(c, 1.45), lo = shade(c, 0.6);
  const ring = (rx, ry, rot, half) => { const a = half === "back" ? `M${n2(-rx)} 0A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(rx)} 0` : half === "front" ? `M${n2(rx)} 0A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(-rx)} 0` : `M${n2(-rx)} 0A${n2(rx)} ${n2(ry)} 0 1 1 ${n2(rx)} 0A${n2(rx)} ${n2(ry)} 0 1 1 ${n2(-rx)} 0`;
    return `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${rot})"><path fill="none" stroke="${lo}" stroke-width="1.9" d="${a}"/><path fill="none" stroke="${c}" stroke-width="1.3" d="${a}"/><path fill="none" stroke="${hi}" stroke-width=".4" stroke-opacity=".9" d="${a}" transform="translate(-.3 -.3)"/></g>`; };
  g += ring(5.4, 2.2, -12, "back") + ring(3.4, 8.2, 18, "all") + ring(5.4, 2.2, -12, "front");
  return g + ibox(4.4, 4.4, 1.2, 1.2, 18.7, 1.4, [hi, c, lo]);  // its foot
});

/* ---------- the Japanese folding screen: three panels zigzag, a wooden frame, rice paper, a cherry branch ---------- */
art("isoscreen", 24, 4, 40, ({ c = "#5c3d27" }) => {
  let g = DEFS + iell(12, 2, 0, 9, "#000", ' fill-opacity=".14"');
  const ys = [0.5, 3.5, 0.5, 3.5], panels = [];
  for (let i = 0; i < 3; i++) panels.push([[i * 8, ys[i]], [(i + 1) * 8, ys[i + 1]]]);
  panels.forEach(([[x0, y0], [x1, y1]], i) => {
    const P = (x, y, z) => ipt(x, y, z).map(n2).join(" "), lerp = (k, z) => P(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z);
    const face = i % 2 ? shade(c, 0.85) : c;
    g += `<path fill="${face}" d="M${P(x0, y0, 1)}L${P(x1, y1, 1)}L${P(x1, y1, 36)}L${P(x0, y0, 36)}Z"/>`;  // the frame
    g += `<path fill="${i % 2 ? "#e9e2cf" : "#f6f1e3"}" d="M${lerp(0.08, 3)}L${lerp(0.92, 3)}L${lerp(0.92, 34)}L${lerp(0.08, 34)}Z"/>`;  // the paper
    for (const z of [10, 17, 24, 31]) g += `<path fill="none" stroke="${face}" stroke-width=".3" stroke-opacity=".8" d="M${lerp(0.08, z)}L${lerp(0.92, z)}"/>`;  // the grid
    g += `<path fill="none" stroke="${face}" stroke-width=".3" stroke-opacity=".8" d="M${lerp(0.5, 3)}L${lerp(0.5, 34)}"/>`;
    for (const k of [0.05, 0.95]) g += `<path fill="none" stroke="${shade(c, 0.6)}" stroke-width=".7" d="M${lerp(k, 0)}L${lerp(k, 1.4)}"/>`;  // feet
  });
  // the cherry branch across the paper, and its blossoms
  const br = [[2, 2.3, 26], [7, 1.3, 29], [12, 2.5, 25], [17, 1.8, 28.5], [22, 2.6, 23]].map(([x, y, z]) => ipt(x, y, z));
  g += `<path fill="none" stroke="#4a2f22" stroke-width=".7" d="M${br.map(p => p.map(n2).join(" ")).join("L")}"/>` + iline(ipt(7, 1.3, 29), ipt(9, 1.6, 33), "#4a2f22", 0.45) + iline(ipt(17, 1.8, 28.5), ipt(19, 2.2, 31.5), "#4a2f22", 0.45);
  for (const [x, y, z] of [[3, 2.2, 27.4], [6, 1.4, 30.2], [8.6, 1.6, 32.6], [11, 2.4, 26.4], [13.6, 2.4, 26.8], [16, 1.9, 29.6], [19, 2.2, 31.6], [21, 2.5, 24.6], [9.5, 1.8, 28]]) {
    const [px, py] = ipt(x, y, z); g += `<circle cx="${n2(px)}" cy="${n2(py)}" r=".75" fill="#f4a6c0"/><circle cx="${n2(px)}" cy="${n2(py)}" r=".28" fill="#d6456e"/>`;
  }
  return g;
});

/* ---------- the tall vase with pampas grass: a glazed body, its rim, plumes swaying ---------- */
art("isovase", 9, 9, 50, ({ c = "#c0643a", frame = 0 }) => {
  let g = DEFS + shadow(4.5, 4.5, 4.2) + lathe(4.5, 4.5, [[0, 2.4], [2, 3.3], [7, 3.9], [12, 3.4], [16, 2.2], [19, 1.7], [21, 2.1]], c, shade(c, 0.45));
  g += (() => { const [x, y] = ipt(4.5, 4.5, 21); return `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(RX(2.1))}" ry="${n2(RY(2.1))}" fill="none" stroke="${shade(c, 1.25)}" stroke-width=".35"/>`; })();
  const sway = [0, 0.6, 0.9, 0.4][frame % 4], [bx, by] = ipt(4.5, 4.5, 20.5);
  for (const [dx, h, lean] of [[-1.2, 22, -4], [-0.4, 27, -1.5], [0.4, 25, 2], [1, 20, 4.5], [0, 29, 0.5]]) {
    const tx = bx + dx + lean + sway * (h / 25), ty = by - h;
    g += `<path fill="none" stroke="#b49a6a" stroke-width=".3" d="M${n2(bx + dx * 0.4)} ${n2(by)}Q${n2(bx + dx)} ${n2(by - h * 0.6)} ${n2(tx)} ${n2(ty + 4)}"/>`;
    for (let k = 0; k < 5; k++) g += blob(tx + (k % 2 ? 0.5 : -0.4) + sway * 0.2, ty + 4 - k * 1.5, 1.5 - k * 0.12, 1.25, k % 2 ? "#efe3c7" : "#e4d3ae");
    g += blob(tx - 0.5, ty - 2.2, 0.6, 0.9, "#fff8e8", ' fill-opacity=".6"');
  }
  return g;
}, { mx: 3 });

/* ---------- the antique bust: a philosopher in three-quarter view, on a turned foot, on a moulded column ---------- */
art("isobust", 9, 9, 50, ({ c = "#ece8e0" }) => {
  const m = c, lt = shade(c, 1.1), d1 = shade(c, 0.86), d2 = shade(c, 0.7), d3 = shade(c, 0.55);
  let g = DEFS + shadow(4.5, 4.5, 4.6);
  // the column: a stepped base, a slightly swelling shaft with its flutes, a moulded capital
  g += ibox(0.8, 0.8, 7.4, 7.4, 0, 1.4, [lt, m, d2]) + icyl(4.5, 4.5, 1.4, 1.2, 3.1, d1, m);
  g += lathe(4.5, 4.5, [[2.6, 2.5], [10, 2.62], [17, 2.5], [21, 2.35]], m);
  { const [x, y0] = ipt(4.5, 4.5, 2.6), y1 = ipt(4.5, 4.5, 21)[1]; for (const k of [-0.62, -0.25, 0.12, 0.48]) g += `<path fill="none" stroke="${d2}" stroke-opacity=".55" stroke-width=".3" d="M${n2(x + k * RX(2.5))} ${n2(y0 - 0.6)}L${n2(x + k * RX(2.35))} ${n2(y1 + 0.4)}"/>`; }
  g += icyl(4.5, 4.5, 21, 0.8, 2.9, d1, lt) + ibox(1.1, 1.1, 6.8, 6.8, 21.8, 1.3, [lt, m, d2]);
  // the turned foot of the bust
  g += lathe(4.5, 4.5, [[23.1, 1.7], [23.7, 1.4], [24.3, 0.9], [25, 1.2]], m);
  const [x, yb] = ipt(4.5, 4.5, 25);  // the bottom of the chest, in screen units: everything above is drawn from here
  const P = (dx, dy) => `${n2(x + dx)} ${n2(yb - dy)}`;
  // the chest and sloping shoulders, cut to a gentle point at the bottom (a classical bust)
  const chest = `M${P(-3.8, 1.4)}Q${P(-1.6, 0.4)} ${P(0, -0.4)}Q${P(1.6, 0.4)} ${P(3.8, 1.4)}C${P(4.4, 3.4)} ${P(4.1, 5)} ${P(2.6, 5.7)}Q${P(1.6, 6.1)} ${P(1, 6.5)}L${P(-1, 6.5)}Q${P(-1.6, 6.1)} ${P(-2.6, 5.7)}C${P(-4.1, 5)} ${P(-4.4, 3.4)} ${P(-3.8, 1.4)}Z`;
  g += `<path fill="${m}" d="${chest}"/><path fill="url(#rnd)" d="${chest}"/>`;
  // the toga: one broad band from the left shoulder across the chest, its edge catching the light
  const toga = `M${P(-3.3, 5.6)}C${P(-1.8, 5.9)} ${P(0.6, 3.6)} ${P(3.3, 1.2)}L${P(3.9, 2.3)}C${P(1.6, 4)} ${P(-0.6, 6.2)} ${P(-1.4, 6.5)}Z`;
  g += `<path fill="${d1}" d="${toga}"/><path fill="url(#rnd)" d="${toga}"/>`;
  g += `<path fill="none" stroke="${lt}" stroke-width=".3" d="M${P(-3.2, 5.7)}C${P(-1.8, 6)} ${P(0.6, 3.7)} ${P(3.3, 1.3)}"/>`;
  g += `<path fill="none" stroke="${d2}" stroke-opacity=".7" stroke-width=".22" d="M${P(-1.2, 5.6)}C${P(0.2, 4.6)} ${P(1.6, 3.4)} ${P(3.4, 1.9)}"/>`;  // one soft fold
  // the neck, shaded on its right
  g += `<path fill="${m}" d="M${P(-1.1, 6.2)}L${P(-0.9, 8.5)}L${P(1.1, 8.5)}L${P(1.3, 6.2)}Z"/><path fill="${d2}" fill-opacity=".5" d="M${P(0.5, 6.2)}L${P(0.6, 8.5)}L${P(1.1, 8.5)}L${P(1.3, 6.2)}Z"/>`;
  // the head, turned a little to the left
  const head = `M${P(-1.4, 8.4)}C${P(-2.3, 9.2)} ${P(-2.6, 11.2)} ${P(-2.5, 12.9)}C${P(-2.3, 15)} ${P(-0.7, 16.3)} ${P(0.6, 16.2)}C${P(2.2, 16.1)} ${P(3, 14.5)} ${P(2.9, 12.7)}C${P(2.8, 10.7)} ${P(2.1, 9)} ${P(0.9, 8.3)}Z`;
  g += `<path fill="${m}" d="${head}"/><path fill="url(#rnd)" d="${head}"/>`;
  // the beard: one mass along the jaw and the chin, a few curls drawn in it
  const beard = `M${P(-2.3, 11.6)}C${P(-2.5, 9.6)} ${P(-1.4, 7.9)} ${P(0.2, 7.9)}C${P(1.8, 7.9)} ${P(2.8, 9.4)} ${P(2.8, 11.8)}C${P(2.2, 10.8)} ${P(1.4, 10.5)} ${P(0.6, 10.8)}C${P(-0.4, 10.4)} ${P(-1.6, 10.6)} ${P(-2.3, 11.6)}Z`;
  g += `<path fill="${d1}" d="${beard}"/><path fill="url(#rnd)" d="${beard}"/>`;
  const curl = (dx, dy, r = 0.45) => `<path fill="none" stroke="${d2}" stroke-width=".22" stroke-linecap="round" d="M${P(dx - r, dy)}a${r} ${r} 0 1 1 ${n2(r)} ${n2(r)}"/>`;
  g += [[-1.6, 9.6], [-0.4, 8.9], [0.9, 9], [2, 9.9], [-0.9, 10.2], [0.5, 10]].map(([dx, dy]) => curl(dx, dy)).join("");
  g += `<path fill="none" stroke="${d2}" stroke-width=".3" stroke-linecap="round" d="M${P(-1.5, 11.5)}Q${P(-0.8, 11.9)} ${P(0, 11.5)}"/>`;  // the moustache
  // the face: the nose, the brow over deep eyes, the ear
  g += `<path fill="${m}" d="M${P(-2.4, 13)}L${P(-3.1, 11.8)}L${P(-2.3, 11.6)}Z"/><path fill="none" stroke="${d2}" stroke-width=".2" d="M${P(-3.1, 11.8)}L${P(-2.3, 11.6)}"/>`;
  g += `<path fill="${d2}" fill-opacity=".55" d="M${P(-2.1, 13.2)}q.5 .3 1 0q-.5 -.22 -1 0Z"/><path fill="${d2}" fill-opacity=".55" d="M${P(-0.6, 13.2)}q.55 .3 1.1 0q-.55 -.22 -1.1 0Z"/>`;
  g += `<path fill="none" stroke="${d1}" stroke-width=".35" stroke-linecap="round" d="M${P(-2.3, 13.9)}Q${P(-1.3, 14.3)} ${P(-0.3, 13.9)}M${P(0, 13.9)}Q${P(0.6, 14.2)} ${P(1.1, 13.8)}"/>`;
  g += `<path fill="${d1}" d="M${P(1.9, 13)}C${P(2.5, 13.1)} ${P(2.5, 11.7)} ${P(2, 11.5)}Z"/>`;
  // the hair: a mass over the top and the back, light on its crown, curls drawn in it
  const hair = `M${P(-2.5, 13.8)}C${P(-2.6, 16.2)} ${P(-0.6, 17.5)} ${P(1, 17.2)}C${P(2.8, 16.8)} ${P(3.4, 14.6)} ${P(2.9, 12.4)}C${P(2.5, 13.2)} ${P(2.1, 13.9)} ${P(1.4, 14.3)}C${P(0.4, 15)} ${P(-1.4, 14.8)} ${P(-2.5, 13.8)}Z`;
  g += `<path fill="${m}" d="${hair}"/><path fill="url(#rnd)" d="${hair}"/>`;
  g += [[-1.9, 15.1], [-0.8, 16.1], [0.5, 16.5], [1.7, 16], [2.5, 14.8], [-0.3, 15.2], [1, 15.4], [2.3, 13.5]].map(([dx, dy]) => curl(dx, dy, 0.5)).join("");
  g += `<path fill="none" stroke="${lt}" stroke-width=".3" stroke-linecap="round" d="M${P(-1.6, 16.2)}Q${P(-0.4, 17.1)} ${P(0.9, 16.9)}"/>`;  // the light on the crown
  return g;
});

/* ---------- on a desk: Newton's cradle, a lava lamp, a bonsai, three candles ---------- */
art("isonewton", 8, 5, 13, ({ c = "#2a2a30", frame = 0 }) => {
  let g = DEFS + ibox(0, 0, 8, 5, 0, 1, [shade(c, 1.25), c, shade(c, 0.7)]);
  for (const x of [0.6, 7.4]) for (const y of [0.6, 4.4]) g += iline(ipt(x, y, 1), ipt(x, y, 10), "#c9ccd6", 0.35);  // the posts
  g += iline(ipt(0.6, 0.6, 10), ipt(7.4, 0.6, 10), "#c9ccd6", 0.35) + iline(ipt(0.6, 4.4, 10), ipt(7.4, 4.4, 10), "#c9ccd6", 0.35);
  const swing = [[-40, 0], [-20, 0], [0, 0], [0, 20], [0, 40], [0, 20], [0, 0], [-20, 0]][frame % 8];
  for (let i = 0; i < 5; i++) {
    const x = 2 + i * 1, [ax, ay] = ipt(x, 2.5, 10), ang = (i === 0 ? swing[0] : i === 4 ? swing[1] : 0) * Math.PI / 180, L = 6;
    const bx = ax + Math.sin(ang) * L, by = ay + Math.cos(ang) * L;
    g += `<path fill="none" stroke="#9aa0ac" stroke-width=".15" d="M${n2(ax)} ${n2(ay)}L${n2(bx)} ${n2(by)}"/><circle cx="${n2(bx)}" cy="${n2(by)}" r=".62" fill="url(#ball)"/>`;
  }
  return g;
});
art("isolava", 4, 4, 16, ({ c = "#ff4fb8", on = true, frame = 0 }) => {
  let g = DEFS + lathe(2, 2, [[0, 1.6], [2.6, 1.1], [3.2, 1.0]], "#9aa0ac");  // the cone foot
  const [x, y0] = ipt(2, 2, 3.2), y1 = y0 - 8.6, wb = RX(1.15), wt = RX(0.6);
  const glass = `M${n2(x - wb)} ${n2(y0)}L${n2(x - wt)} ${n2(y1)}L${n2(x + wt)} ${n2(y1)}L${n2(x + wb)} ${n2(y0)}Z`;
  g += `<path fill="${on ? shade(c, 0.55) : "#4a3a52"}" d="${glass}"/>`;
  if (on) g += `<ellipse cx="${n2(x)}" cy="${n2((y0 + y1) / 2 + 1)}" rx="${n2(wb * 1.35)}" ry="${n2((y0 - y1) * 0.5)}" fill="${c}" fill-opacity=".14"/>`;  // a soft glow around the glass
  const blobs = [[0.15, 0.2, 0.55], [0.55, -0.1, 0.42], [0.85, 0.15, 0.32]].map(([k, dx, r], i) => { const kk = (k + frame * 0.08 * (i % 2 ? 1 : -0.6) + 1) % 1; return [x + dx * wb, y0 - 0.6 - kk * (y0 - y1 - 1.6), r * wb * 1.3]; });
  for (const [bx, by, r] of blobs) g += blob(bx, by, r, r * 1.25, on ? shade(c, 1.35) : "#8a6a8a");
  g += blob(x, y0 - 0.4, wb * 0.8, 0.5, on ? shade(c, 1.2) : "#8a6a8a");
  g += `<path fill="url(#rnd)" d="${glass}"/><path fill="#fff" fill-opacity=".35" d="M${n2(x - wb * 0.7)} ${n2(y0 - 0.5)}L${n2(x - wt * 0.6)} ${n2(y1 + 0.5)}L${n2(x - wt * 0.3)} ${n2(y1 + 0.5)}L${n2(x - wb * 0.4)} ${n2(y0 - 0.5)}Z"/>`;
  return g + lathe(2, 2, [[11.8, 0.62], [13.4, 0.4]], "#9aa0ac");  // the cap
});
art("isobonsai", 8, 6, 16, ({ c = "#4f7f8f" }) => {
  let g = DEFS + ibox(0.5, 0.8, 7, 4.4, 0, 2.4, [shade(c, 1.2), c, shade(c, 0.68)]) + ibox(0.9, 1.2, 6.2, 3.6, 2.4, 0.05, ["#5a7a3a", "#5a7a3a", "#5a7a3a"]);  // the glazed pot, its moss
  for (const [x, y] of [[1.6, 1.6], [6.4, 4.4]]) g += ibox(x - 0.4, y - 0.4, 0.8, 0.8, -0.4, 0.4, ["#3a2a20", "#3a2a20", "#3a2a20"]);
  const [x, y] = ipt(4, 3, 2.4);
  const trunk = `M${n2(x - 0.6)} ${n2(y)}C${n2(x - 2.4)} ${n2(y - 3)} ${n2(x + 1.6)} ${n2(y - 4.6)} ${n2(x - 0.6)} ${n2(y - 7.4)}C${n2(x - 1.6)} ${n2(y - 9)} ${n2(x + 1)} ${n2(y - 10)} ${n2(x + 1.2)} ${n2(y - 11)}`;
  g += `<path fill="none" stroke="#3a2618" stroke-width="1.5" stroke-linecap="round" d="${trunk}"/><path fill="none" stroke="#7a5236" stroke-width=".8" stroke-linecap="round" d="${trunk}"/>`;
  g += iline([x - 0.4, y - 6.6], [x - 3.4, y - 7.6], "#5a3a26", 0.55) + iline([x + 0.2, y - 9], [x + 3.2, y - 9.2], "#5a3a26", 0.5);
  for (const [px, py, rx] of [[-3.6, -8, 2.4], [3.4, -9.6, 2.2], [0.8, -11.6, 2.8], [-1, -10, 1.8]]) {  // the foliage pads, lit from the top left
    g += blob(x + px, y + py, rx, rx * 0.55, "#2f6e3a") + blob(x + px - 0.3, y + py - 0.35, rx * 0.8, rx * 0.4, "#4a9a4a") + blob(x + px - 0.7, y + py - 0.6, rx * 0.4, rx * 0.2, "#7cc76a");
  }
  return g;
});
art("isocandles", 7, 4, 9, ({ c = "#f4efe6", on = true, frame = 0 }) => {
  let g = DEFS;
  for (const [cx, cy, h, r] of [[1.6, 2, 5.4, 1.2], [4, 2.4, 3.8, 1.3], [6, 1.8, 2.8, 0.9]]) {
    g += lathe(cx, cy, [[0, r], [h, r]], "#cfe3ea") + lathe(cx, cy, [[0.2, r * 0.86], [h - 0.6, r * 0.86]], c, shade(c, 0.9));  // the glass, the wax
    const [x, y] = ipt(cx, cy, h - 0.6);
    g += iline([x, y], [x, y - 0.6], "#2a2a30", 0.15);
    if (on) { const fl = [0, 0.2, -0.15, 0.1][(frame + cx * 3) % 4 | 0]; g += `<circle cx="${n2(x)}" cy="${n2(y - 1.1)}" r="1.4" fill="url(#glow)"/><path fill="#ffb84a" d="M${n2(x + fl)} ${n2(y - 2.1)}q.5 .7 .3 1.1q-.3 .3 -.6 0q-.2 -.4 .3 -1.1Z"/><path fill="#fffbe6" d="M${n2(x + fl * 0.5)} ${n2(y - 1.5)}q.2 .35 .12 .55q-.12 .14 -.24 0q-.08 -.2 .12 -.55Z"/>`; }
  }
  return g;
});

/* ---------- on the walls (2D art, in their own units) ---------- */
export class WallArt extends SvgArt {
  constructor(name, w, h, fn) { super(name, w, h); this.fn = fn; }
  body(o) { return this.fn(o); }
}
// a low-poly wooden deer head on a round board
export const DEER = new WallArt("walldeer", 16, 16, ({ c = "#b08860" }) => {
  const t = k => shade(c, k), F = (pts, k) => `<path fill="${t(k)}" d="M${pts}Z"/>`;
  return `<circle cx="8" cy="9" r="6.6" fill="${t(0.55)}"/><circle cx="8" cy="9" r="6" fill="${t(0.72)}"/>`
    + F("6 7L8 6L10 7L9.4 11L8 13.2L6.6 11", 1) + F("6 7L8 6L8 9", 1.18) + F("10 7L8 6L8 9", 0.88) + F("6.6 11L8 9L8 13.2", 1.1) + F("9.4 11L8 9L8 13.2", 0.8)
    + F("6 7L4.2 6.2L5.4 8.2", 0.95) + F("10 7L11.8 6.2L10.6 8.2", 0.75)  // the ears
    + `<path fill="none" stroke="${t(1.25)}" stroke-width=".55" stroke-linecap="round" d="M6.6 6.4L5 3.6L3.6 3M5 3.6L5.4 1.6M5.6 5L4.2 4.6M9.4 6.4L11 3.6L12.4 3M11 3.6L10.6 1.6M10.4 5L11.8 4.6"/>`  // the antlers
    + `<circle cx="7.1" cy="8.6" r=".35" fill="#1c1c22"/><circle cx="8.9" cy="8.6" r=".35" fill="#1c1c22"/><path fill="#1c1c22" d="M7.6 12.6h.8l-.4 .5Z"/>`;
});
// a gilt sunburst mirror
export const SUNMIRROR = new WallArt("wallsunmirror", 16, 16, ({ c = "#d4a640" }) => {
  let g = `<defs><radialGradient id="mir" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#cfe4ee"/><stop offset="1" stop-color="#7d97a8"/></radialGradient></defs>`;
  for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, l = i % 2 ? 7.6 : 6.4; g += `<path fill="none" stroke="${i % 2 ? shade(c, 0.8) : c}" stroke-width="${i % 2 ? 0.4 : 0.6}" stroke-linecap="round" d="M${n2(8 + Math.cos(a) * 4.4)} ${n2(8 + Math.sin(a) * 4.4)}L${n2(8 + Math.cos(a) * l)} ${n2(8 + Math.sin(a) * l)}"/>`; }
  return g + `<circle cx="8" cy="8" r="4.5" fill="${shade(c, 0.7)}"/><circle cx="8" cy="8" r="4.1" fill="${c}"/><circle cx="8" cy="8" r="3.5" fill="url(#mir)"/>`
    + `<path fill="#fff" fill-opacity=".55" d="M5.6 7.2Q6 5.4 7.8 5L7.4 5.8Q6.4 6.2 6.2 7.4Z"/>`;
});
// a framed gold record and its plaque
export const GOLDRECORD = new WallArt("wallgold", 12, 14, ({ c = "#1c1c22" }) => {
  let g = `<rect x="0" y="0" width="12" height="14" rx=".4" fill="${c}"/><rect x=".8" y=".8" width="10.4" height="12.4" fill="#f4f2ec"/><rect x=".8" y=".8" width="10.4" height="12.4" fill="#0f1218"/>`
    + `<defs><radialGradient id="gold" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e2b84a"/><stop offset="1" stop-color="#8a6420"/></radialGradient></defs>`
    + `<circle cx="6" cy="6" r="4" fill="url(#gold)"/>`;
  for (const r of [3.6, 3.1, 2.6, 2.1]) g += `<circle cx="6" cy="6" r="${r}" fill="none" stroke="#8a6420" stroke-opacity=".35" stroke-width=".12"/>`;
  return g + `<circle cx="6" cy="6" r="1.3" fill="#c0303a"/><circle cx="6" cy="6" r=".25" fill="#0f1218"/><path fill="#fff" fill-opacity=".35" d="M3.2 4.6Q4 3 5.8 2.4L5.6 3.2Q4.4 3.6 3.8 4.8Z"/>`
    + `<rect x="3.2" y="11" width="5.6" height="1.4" rx=".2" fill="#c9a24b"/><rect x="3.8" y="11.5" width="4.4" height=".2" fill="#6a4a10"/><rect x="4.2" y="11.9" width="3.6" height=".15" fill="#6a4a10"/>`;
});
