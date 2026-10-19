// The lights of the buy mode, drawn again with care (they replace the first ones of svg/iso.js and svg/isokitchen.js):
// round volumes shaded left to right (a light from the left, like the rest of the office), weighted feet, poles with
// their joints, shades with their rims and seams, the bulb seen through the opening, a warm inside when lit. The
// light they cast on the room is drawn by iso/rooms.js lampsOver. Their style colours keep the same keys (the
// recolouring maps of items/lamp.js and items/catalog2.js).

import "./isokitchen.js";  // drawn after the first ones, which it replaces
import { shade } from "./base.js";
import { ISO_KIT, IsoArt, ipt } from "./iso.js";

const { n2, iline, iell, icyl, reg } = ISO_KIT;
const K = 0.6, RX = r => r * K * 1.414, RY = r => r * K * 0.707;
const art = (name, w, d, H, body, opts = {}) => reg(class extends IsoArt { constructor() { super(name, w, d, H, opts); } body(o) { return body(o); } });  // opts.mx: room on the sides
// the shading of a round thing: light on its left, shadow on its right (an overlay over its own colour)
const DEFS = `<defs><linearGradient id="rnd" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".3" stop-color="#fff" stop-opacity=".08"/>`
  + `<stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>`
  + `<radialGradient id="glow"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffe08a" stop-opacity=".85"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>`
  + `<linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs>`;
// a truncated cone (a shade, a dome's skirt): its side from z0 up h, radius rb at the bottom, rt at the top; then the
// opening on top (inside: what is seen through it)
function cone(cx, cy, z0, h, rb, rt, side, inside = null, shading = true) {
  const [x, y0] = ipt(cx, cy, z0), y1 = y0 - h;
  const d = `M${n2(x - RX(rt))} ${n2(y1)}L${n2(x - RX(rb))} ${n2(y0)}A${n2(RX(rb))} ${n2(RY(rb))} 0 0 0 ${n2(x + RX(rb))} ${n2(y0)}L${n2(x + RX(rt))} ${n2(y1)}A${n2(RX(rt))} ${n2(RY(rt))} 0 0 1 ${n2(x - RX(rt))} ${n2(y1)}Z`;
  return `<path fill="${side}" d="${d}"/>${shading ? `<path fill="url(#rnd)" d="${d}"/>` : ""}`
    + (inside ? `<ellipse cx="${n2(x)}" cy="${n2(y1)}" rx="${n2(RX(rt))}" ry="${n2(RY(rt))}" fill="${inside}"/>` : "");
}
// a thin band around a round thing (a rim, a ring), at height z
const band = (cx, cy, z, r, h, c) => cone(cx, cy, z, h, r, r, c);
// a pole: a thin cylinder, shaded like metal
function pole(cx, cy, z0, z1, r, c) {
  const [x, y0] = ipt(cx, cy, z0), y1 = ipt(cx, cy, z1)[1], w = RX(r);
  return `<rect x="${n2(x - w)}" y="${n2(y1)}" width="${n2(2 * w)}" height="${n2(y0 - y1)}" fill="${c}"/><rect x="${n2(x - w)}" y="${n2(y1)}" width="${n2(2 * w)}" height="${n2(y0 - y1)}" fill="url(#metal)"/>`;
}
const disc = (cx, cy, z, h, r, side, top) => icyl(cx, cy, z, h, r, side, top) + (() => { const [x, y0] = ipt(cx, cy, z), w = RX(r); return `<path fill="url(#metal)" d="M${n2(x - w)} ${n2(y0 - h)}V${n2(y0)}A${n2(w)} ${n2(RY(r))} 0 0 0 ${n2(x + w)} ${n2(y0)}V${n2(y0 - h)}Z"/>`; })();
const shadow = (cx, cy, r) => iell(cx, cy, 0, r, "#000", ' fill-opacity=".22"');
// the bulb: off a pale glass, on a white core in its warm glow
const bulb = (cx, cy, z, on, r = 1.2) => { const [x, y] = ipt(cx, cy, z); return on ? `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 2.6)}" fill="url(#glow)"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.8)}" fill="#fffdf2"/>` : `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.8)}" fill="#dcd8cc"/><circle cx="${n2(x - r * 0.3)}" cy="${n2(y - r * 0.3)}" r="${n2(r * 0.25)}" fill="#fff" fill-opacity=".8"/>`; };

/* ---------- the floor lamp (items/lamp.js): weighted foot, a pole with its joint and its chain, a drum shade ---------- */
// colours mapped by its styles: metal #3d3d4a / #55556a / #33333f, shade #f4efc9 (#ffe8a3 lit) / #de8001 (its rims)
art("isolamp", 11, 11, 48, ({ on = false }) => {
  const c = 5.5, shadeC = on ? "#ffe8a3" : "#f4efc9";
  let g = DEFS + shadow(c, c, 4.2);
  g += disc(c, c, 0, 0.9, 3.4, "#33333f", "#55556a") + disc(c, c, 0.9, 0.7, 2.4, "#3d3d4a", "#55556a") + iell(c, c, 1.6, 1.1, "#33333f");  // the weighted foot
  g += pole(c, c, 1.6, 35.5, 0.42, "#55556a") + band(c, c, 19, 0.75, 0.9, "#3d3d4a") + band(c, c, 34.6, 0.95, 1.6, "#33333f");  // pole, joint, socket
  g += iline(ipt(c + 0.9, c, 35), ipt(c + 0.9, c, 31.5), "#c9a24b", 0.2) + iell(c + 0.9, c, 31.3, 0.32, "#c9a24b");  // the pull chain
  g += cone(c, c, 34, 10.5, 4.8, 3.1, shadeC, on ? "#fff4c2" : "#c9b98a");  // the drum shade, its inside seen from above
  for (const k of [-0.45, 0.2]) { const [x0, y0] = ipt(c, c, 34.3), [x1, y1] = ipt(c, c, 44.2); g += `<path fill="none" stroke="#de8001" stroke-opacity=".22" stroke-width=".25" d="M${n2(x0 + RX(4.8) * k)} ${n2(y0 + RY(4.8) * 0.95)}L${n2(x1 + RX(3.1) * k)} ${n2(y1 + RY(3.1) * 0.95)}"/>`; }  // seams
  g += band(c, c, 34, 4.85, 0.55, "#de8001") + band(c, c, 43.9, 3.15, 0.6, "#de8001");  // the rims
  if (on) { const [x, y] = ipt(c, c, 44.5); g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(RX(2.2))}" ry="${n2(RY(2.2))}" fill="url(#glow)"/>` + bulb(c, c, 42, true, 0.9); }
  return g;
});

/* ---------- the arc floor lamp: marble foot, a steel arc, a dome hanging far out ---------- */
art("isolamparc", 14, 14, 52, ({ c = "#c9ccd6", on = true }) => {
  let g = DEFS + shadow(2.5, 11.5, 3.2);
  g += disc(2.5, 11.5, 0, 2.4, 3, "#d9d6cf", "#f4f2ec");  // the marble foot, its veins
  { const [x, y] = ipt(2.5, 11.5, 2.4); g += `<path fill="none" stroke="#b9b6ae" stroke-width=".25" d="M${n2(x - 2.4)} ${n2(y)}q1.2 -.6 2.2 .1t2.4 -.2"/>`; }
  const [x0, y0] = ipt(2.5, 11.5, 2.4), [x1, y1] = ipt(2.5, 11.5, 40), [x2, y2] = ipt(11.5, 2.5, 42.6);  // the arc ends on the dome's top
  const arc = `M${n2(x0)} ${n2(y0)}L${n2(x1)} ${n2(y1)}Q${n2(x1 + 1.5)} ${n2(y1 - 13)} ${n2(x2)} ${n2(y2)}`;
  g += `<path fill="none" stroke="${shade(c, 0.55)}" stroke-width="1.35" d="${arc}"/><path fill="none" stroke="${c}" stroke-width=".95" d="${arc}"/><path fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".3" d="${arc}"/>`;
  // the dome: a half sphere over its rim, the bulb glowing under it
  const [dx, dy] = ipt(11.5, 2.5, 37.5), rx = RX(5.2), ry = RY(5.2);
  g += `<path fill="${on ? "#fff1b8" : shade(c, 0.6)}" d="M${n2(dx - rx)} ${n2(dy)}A${n2(rx)} ${n2(ry)} 0 0 0 ${n2(dx + rx)} ${n2(dy)}A${n2(rx)} ${n2(ry)} 0 0 0 ${n2(dx - rx)} ${n2(dy)}Z"/>`;
  const dome = `M${n2(dx - rx)} ${n2(dy)}A${n2(rx)} ${n2(rx * 0.95)} 0 0 1 ${n2(dx + rx)} ${n2(dy)}A${n2(rx)} ${n2(ry)} 0 0 1 ${n2(dx - rx)} ${n2(dy)}Z`;
  g += `<path fill="${c}" d="${dome}"/><path fill="url(#rnd)" d="${dome}"/><ellipse cx="${n2(dx - rx * 0.35)}" cy="${n2(dy - rx * 0.6)}" rx="${n2(rx * 0.22)}" ry="${n2(rx * 0.12)}" fill="#fff" fill-opacity=".7"/>`;
  g += `<path fill="none" stroke="${shade(c, 0.6)}" stroke-width=".4" d="M${n2(dx - rx)} ${n2(dy)}A${n2(rx)} ${n2(ry)} 0 0 0 ${n2(dx + rx)} ${n2(dy)}"/>`;
  g += `<ellipse cx="${n2(x2)}" cy="${n2(y2 + 0.3)}" rx=".9" ry=".5" fill="${shade(c, 0.7)}"/>`;  // where the arc holds it
  if (on) g += `<ellipse cx="${n2(dx)}" cy="${n2(dy + 1.2)}" rx="${n2(rx * 0.7)}" ry="${n2(ry * 0.9)}" fill="url(#glow)"/>`;
  return g;
}, { mx: 3 });  // the dome goes past the foot's square

/* ---------- the tripod lamp: three wooden legs with brass joints, a drum shade ---------- */
art("isolamptripod", 12, 12, 42, ({ c = "#2a2a30", on = true }) => {
  let g = DEFS + shadow(6, 6, 5);
  const top = ipt(6, 6, 27);
  for (const [x, y] of [[1, 2.5], [11, 3], [6, 11.2]]) {
    const b = ipt(x, y, 0);
    g += `<path fill="none" stroke="#3a2618" stroke-width="1.15" d="M${n2(b[0])} ${n2(b[1])}L${n2(top[0])} ${n2(top[1])}"/><path fill="none" stroke="#8a6040" stroke-width=".7" d="M${n2(b[0])} ${n2(b[1])}L${n2(top[0])} ${n2(top[1])}"/>`
      + `<path fill="none" stroke="#c49a6c" stroke-opacity=".7" stroke-width=".22" d="M${n2(b[0] - 0.2)} ${n2(b[1])}L${n2(top[0] - 0.2)} ${n2(top[1])}"/>` + iell(x, y, 0.2, 0.45, "#1c1c22");
  }
  g += band(6, 6, 26.6, 0.9, 1.4, "#c9a24b") + pole(6, 6, 28, 30, 0.35, "#c9a24b");  // the brass head
  g += cone(6, 6, 29.5, 7.5, 5.4, 5.0, c, on ? "#fff3c4" : shade(c, 0.6));
  g += band(6, 6, 29.5, 5.45, 0.5, shade(c, 0.7)) + band(6, 6, 36.6, 5.05, 0.45, shade(c, 0.7));
  if (on) { const [x, y] = ipt(6, 6, 29.3); g += `<path fill="none" stroke="#ffe8a3" stroke-opacity=".9" stroke-width=".45" d="M${n2(x - RX(5.4))} ${n2(y)}A${n2(RX(5.4))} ${n2(RY(5.4))} 0 0 0 ${n2(x + RX(5.4))} ${n2(y)}"/>` + bulb(6, 6, 35, true, 1); }
  return g;
});

/* ---------- the LED column: an aluminium frame, a frosted bar of colour ---------- */
art("isolampled", 8, 8, 40, ({ c = "#b46bff", on = true }) => {
  let g = DEFS + shadow(4, 4, 3.4) + disc(4, 4, 0, 0.8, 3, "#1c1c22", "#2a2a30");
  const [x, y0] = ipt(4, 4, 1), y1 = ipt(4, 4, 37)[1], w = 1.5;
  g += `<rect x="${n2(x - w - 0.5)}" y="${n2(y1 - 0.6)}" width="${n2(2 * w + 1)}" height="${n2(y0 - y1 + 0.6)}" rx=".5" fill="#2a2a30"/>`;  // the frame
  if (on) {
    g += `<rect x="${n2(x - w - 1.6)}" y="${n2(y1)}" width="${n2(2 * w + 3.2)}" height="${n2(y0 - y1)}" rx="1.6" fill="${c}" fill-opacity=".28"/>`;  // its halo
    g += `<rect x="${n2(x - w)}" y="${n2(y1)}" width="${n2(2 * w)}" height="${n2(y0 - y1)}" rx=".4" fill="${c}"/><rect x="${n2(x - 0.35)}" y="${n2(y1 + 0.6)}" width=".7" height="${n2(y0 - y1 - 1.2)}" fill="#fff" fill-opacity=".85"/>`;
  } else g += `<rect x="${n2(x - w)}" y="${n2(y1)}" width="${n2(2 * w)}" height="${n2(y0 - y1)}" rx=".4" fill="#5a5a66"/><rect x="${n2(x - w)}" y="${n2(y1)}" width="${n2(2 * w)}" height="${n2(y0 - y1)}" fill="url(#rnd)"/>`;
  g += `<rect x="${n2(x - w - 0.5)}" y="${n2(y1 - 1.2)}" width="${n2(2 * w + 1)}" height="1.2" rx=".4" fill="#3a3a44"/>`;  // the cap
  return g;
});

/* ---------- the pendant: a ceiling cord, an enamelled cone, white inside, an Edison bulb under it ---------- */
art("isopendant", 10, 10, 78, ({ c = "#2a2a30", on = true }) => {
  let g = DEFS + iline(ipt(5, 5, 56), ipt(5, 5, 78), "#1c1c22", 0.35) + band(5, 5, 54.5, 0.7, 2, shade(c, 0.8));  // the cord, the socket cover
  g += cone(5, 5, 47, 7.5, 5, 0.9, c, null);  // the cone, its mouth down
  const [x, y] = ipt(5, 5, 47), rx = RX(5), ry = RY(5);
  g += `<path fill="${on ? "#fff4cf" : "#e8e6df"}" d="M${n2(x - rx)} ${n2(y)}A${n2(rx)} ${n2(ry)} 0 0 0 ${n2(x + rx)} ${n2(y)}A${n2(rx)} ${n2(ry * 0.55)} 0 0 1 ${n2(x - rx)} ${n2(y)}Z"/>`;  // the white inside, seen under the rim
  g += `<path fill="none" stroke="${shade(c, 0.6)}" stroke-width=".45" d="M${n2(x - rx)} ${n2(y)}A${n2(rx)} ${n2(ry)} 0 0 0 ${n2(x + rx)} ${n2(y)}"/>`;
  const [ex, ey] = ipt(5, 5, 45.6);
  g += on ? `<ellipse cx="${n2(ex)}" cy="${n2(ey)}" rx="2.6" ry="2" fill="url(#glow)"/><ellipse cx="${n2(ex)}" cy="${n2(ey)}" rx=".9" ry="1.1" fill="#fffbe6"/><path fill="none" stroke="#ffb84a" stroke-width=".25" d="M${n2(ex - 0.4)} ${n2(ey + 0.2)}q.4 -.6 .8 0"/>`
    : `<ellipse cx="${n2(ex)}" cy="${n2(ey)}" rx=".9" ry="1.1" fill="#d8d2bf" fill-opacity=".9"/><path fill="none" stroke="#a89878" stroke-width=".2" d="M${n2(ex - 0.4)} ${n2(ey + 0.2)}q.4 -.6 .8 0"/>`;
  return g;
});

/* ---------- the crystal chandelier: gilt stem and arms in two tiers, candles and their flames, crystal drops ---------- */
art("isochandelier", 16, 16, 82, ({ c = "#d4a640", on = true }) => {
  const dark = shade(c, 0.62), hi = shade(c, 1.3);
  let g = DEFS + iline(ipt(8, 8, 66), ipt(8, 8, 82), "#3a3a44", 0.4) + band(8, 8, 64.5, 1.6, 1.2, dark);  // the chain, the ceiling cup
  g += pole(8, 8, 50, 64.5, 0.55, c);
  for (const [z, r] of [[61, 1.1], [57, 1.4], [52.5, 1.0]]) { const [x, y] = ipt(8, 8, z); g += `<ellipse cx="${n2(x)}" cy="${n2(y)}" rx="${n2(RX(r))}" ry="${n2(RX(r) * 0.85)}" fill="${c}"/><ellipse cx="${n2(x - RX(r) * 0.35)}" cy="${n2(y - RX(r) * 0.35)}" rx="${n2(RX(r) * 0.3)}" ry="${n2(RX(r) * 0.22)}" fill="${hi}"/>`; }  // gilt knobs
  g += band(8, 8, 53.2, 6.6, 0.55, dark);  // the ring of the drops
  const arms = [];
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, x = 8 + Math.cos(a) * 6.2, y = 8 + Math.sin(a) * 6.2; arms.push({ x, y, back: Math.sin(a) + Math.cos(a) < 0 }); }
  const drawArm = ({ x, y }) => {
    const s = ipt(8, 8, 54.6), e = ipt(x, y, 56.4), m = ipt((8 + x) / 2, (8 + y) / 2, 52.2);
    let a = `<path fill="none" stroke="${dark}" stroke-width=".85" d="M${n2(s[0])} ${n2(s[1])}Q${n2(m[0])} ${n2(m[1] + 2.6)} ${n2(e[0])} ${n2(e[1])}"/><path fill="none" stroke="${c}" stroke-width=".5" d="M${n2(s[0])} ${n2(s[1])}Q${n2(m[0])} ${n2(m[1] + 2.6)} ${n2(e[0])} ${n2(e[1])}"/>`;
    a += band(x, y, 56.2, 1.05, 0.6, c) + band(x, y, 56.8, 0.55, 2.4, "#f4f2ea");  // the cup, the candle
    const [fx, fy] = ipt(x, y, 59.8);
    a += on ? `<circle cx="${n2(fx)}" cy="${n2(fy - 0.4)}" r="1.3" fill="url(#glow)"/><path fill="#ffb84a" d="M${n2(fx)} ${n2(fy - 1.3)}q.75 .9 .45 1.45q-.45 .45 -.9 0q-.3 -.55 .45 -1.45Z"/><path fill="#fffbe6" d="M${n2(fx)} ${n2(fy - 0.6)}q.35 .45 .2 .75q-.2 .2 -.4 0q-.15 -.3 .2 -.75Z"/>`
      : iline(ipt(x, y, 59.2), ipt(x, y, 59.9), "#2a2a30", 0.2);
    const [dx, dy] = ipt((8 + x * 2) / 3, (8 + y * 2) / 3, 53);  // a crystal drop under the ring
    a += `<path fill="#dff3ff" d="M${n2(dx)} ${n2(dy)}l.5 1l-.5 1.4l-.5 -1.4z"/><path fill="#fff" fill-opacity=".8" d="M${n2(dx)} ${n2(dy)}l.18 1l-.18 1.4z"/>`;
    return a;
  };
  for (const arm of arms.filter(a => a.back)) g += drawArm(arm);   // behind the stem first
  g += pole(8, 8, 50, 55, 0.7, c);
  for (const arm of arms.filter(a => !a.back)) g += drawArm(arm);
  const [bx, by] = ipt(8, 8, 49.4);
  return g + `<path fill="${c}" d="M${n2(bx - 0.8)} ${n2(by)}q.8 2.4 1.6 0z"/><path fill="#dff3ff" d="M${n2(bx)} ${n2(by + 1.6)}l.6 1.2l-.6 1.6l-.6 -1.6z"/>`;  // the finial, the last drop
});
