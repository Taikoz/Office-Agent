// What is seen from the roof terrace in isometric view (rooms/built.js): our building under the deck (its two facades,
// a cornice, windows lit at night), the lower roofs of the neighbours behind it in the same projection (parapets,
// air-conditioning units, water tanks, skylights), all fading into the haze of the street far below, which meets the
// skyline at the horizon. The colours follow the hour and grey under the rain (svg/terrace.js TERRACE_TONES).

import { H, S, W, ctx, px } from "../core/core.js";
import { shade } from "../svg/base.js";
import { TERRACE_TONES } from "../svg/terrace.js";
import { P } from "./engine.js";

const rnd = n => { const v = Math.sin(n * 91.7) * 4375.85; return v - Math.floor(v); };
const mix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return `#${A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("")}`; };
// the neighbours, behind the deck (x < 0: on its left; y < 70: on its right): footprint, roof height (below the deck),
// what is on the roof
const NEIGHBOURS = [
  [-170, 210, -24, 330, -46, "ac"], [-300, 60, -40, 190, -92, "tank"], [-150, 70, -30, 196, -64, "sky"],
  [40, -120, 190, 40, -58, "ac"], [220, -160, 380, 36, -84, "tank"], [410, -110, 560, 44, -40, "sky"], [590, -200, 760, 30, -110, "ac"],
  [-420, -120, -200, 40, -150, ""], [-210, -150, 10, 30, -128, "tank"],
];
const DEPTH = 220;  // how far down a facade is drawn before the haze takes it

function tones(phase, gloomy) {
  const c = TERRACE_TONES[phase] || TERRACE_TONES.day, g = gloomy ? 0.4 : 0, grey = "#59627a";
  const m = h => (g ? mix(h, grey, g) : h);
  return { far: m(c.far), near: m(c.near), side: m(c.side), win: m(c.win), lit: c.lit, night: phase === "night" || phase === "dusk" };
}

// the street's haze under the skyline, painted on the screen (it does not move with the camera)
export function streetHaze(phase, gloomy) {
  const c = tones(phase, gloomy), g = ctx.createLinearGradient(0, 70 * S, 0, H * S);
  g.addColorStop(0, c.far); g.addColorStop(0.35, mix(c.far, c.side, 0.55)); g.addColorStop(1, shade(c.side, 0.75));
  ctx.fillStyle = g; ctx.fillRect(0, 70 * S, W * S, (H - 70) * S);
  if (c.night) {  // the glow of the streetlights rising from below
    const s = ctx.createLinearGradient(0, H * 0.6 * S, 0, H * S);
    s.addColorStop(0, "rgba(255,170,80,0)"); s.addColorStop(1, "rgba(255,170,80,.14)");
    ctx.fillStyle = s; ctx.fillRect(0, H * 0.6 * S, W * S, H * 0.4 * S);
  }
}

const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x * S, p.y * S) : ctx.moveTo(p.x * S, p.y * S)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
// a vertical face drawn flat: along world x (the face y = fy, toward the viewer's left) or along world y (the face
// x = fx, toward the right, read from its front end); u across in floor units, v down from the top in height units
function face(along, fx, fy, z, fn) {
  const o = P(fx, fy, z), a = 0.6, b = along === "x" ? 0.3 : -0.3;
  ctx.save(); ctx.transform(a, b, 0, 1, o.x * S, o.y * S); try { fn(); } finally { ctx.restore(); }
}
// a facade: its wall, rows of windows (some lit at night), the haze taking it toward the street
function facade(along, fx, fy, z, len, c, wall, seed, step = 16, cornice = null) {
  face(along, fx, fy, z, () => {
    px(0, 0, len, DEPTH, wall);
    if (cornice) { px(0, 0, len, 3, cornice); px(0, 3, len, 1, shade(wall, 0.8)); }
    for (let r = 0, v = cornice ? 9 : 6; v < DEPTH - 20; r++, v += 13) for (let k = 0, u = 5; u < len - 8; k++, u += step) {
      const on = c.night && rnd(seed + r * 31 + k * 7) < 0.32, glass = mix(c.side, "#0b1430", 0.35);
      px(u - 0.8, v - 0.8, 7.6, 8.6, shade(wall, 1.18));  // the frame
      px(u, v, 6, 7, on ? c.lit : shade(glass, along === "x" ? 1 : 0.85));
      if (!on) { px(u, v, 6, 1.2, shade(glass, 0.7)); px(u + 1, v + 2, 1, 3, mix(glass, c.win, 0.6)); }  // the lintel's shadow, a reflection
      else px(u + 2.6, v, 0.8, 7, shade(c.lit, 0.8));  // the window bar
    }
    const g = ctx.createLinearGradient(0, 30 * S, 0, DEPTH * S);  // the haze, thicker toward the street
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, c.hazeEnd);
    ctx.fillStyle = g; ctx.fillRect(0, 30 * S, len * S, (DEPTH - 30) * S);
  });
}
// a box on a roof (an air-conditioning unit, a skylight's frame): its two visible sides and its top
function box(x0, y0, x1, y1, z0, z1, col) {
  poly([P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0)], shade(col, 0.82));
  poly([P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), P(x1, y0, z0)], shade(col, 0.68));
  poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col);
}
function neighbour([x0, y0, x1, y1, z, what], i, c, t) {
  const wall = shade(c.near, 1 + (i % 3) * 0.08), roof = shade(c.side, 1.15);
  facade("x", x0, y1, z, x1 - x0, c, wall, i * 101, 15);
  facade("y", x1, y1, z, y1 - y0, c, shade(wall, 0.82), i * 101 + 50, 15);
  poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], roof);  // the roof, its parapet
  poly([P(x0 + 4, y0 + 4, z), P(x1 - 4, y0 + 4, z), P(x1 - 4, y1 - 4, z), P(x0 + 4, y1 - 4, z)], shade(roof, 0.86));
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  if (what === "ac") { box(mx - 22, my - 10, mx - 4, my + 8, z, z + 9, shade(c.far, 1.05)); box(mx + 6, my - 6, mx + 20, my + 8, z, z + 7, shade(c.far, 1.05)); }
  if (what === "tank") {
    for (const [lx, ly] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) box(mx + lx - 1, my + ly - 1, mx + lx + 1, my + ly + 1, z, z + 12, shade(c.side, 0.9));  // its legs
    box(mx - 11, my - 11, mx + 11, my + 11, z + 12, z + 30, mix(c.near, "#8a5a3a", 0.45));
    poly([P(mx - 11, my - 11, z + 30), P(mx + 11, my - 11, z + 30), P(mx + 11, my + 11, z + 30), P(mx - 11, my + 11, z + 30)], mix(c.side, "#6a4430", 0.4));
  }
  if (what === "sky") { box(mx - 18, my - 12, mx + 18, my + 12, z, z + 4, shade(c.side, 1.3)); poly([P(mx - 15, my - 9, z + 4), P(mx + 15, my - 9, z + 4), P(mx + 15, my + 9, z + 4), P(mx - 15, my + 9, z + 4)], c.night ? mix(c.lit, c.side, 0.5) : shade(c.win, 0.9)); }
  if (c.night && i % 4 === 1) {  // an antenna with its red light
    const a = P(x1 - 10, y0 + 10, z), b = P(x1 - 10, y0 + 10, z + 26);
    px(a.x - 0.3, b.y, 0.6, a.y - b.y, shade(c.side, 0.8)); if (Math.floor(t / 700 + i) % 2) px(b.x - 0.8, b.y - 0.8, 1.6, 1.6, "#ff4d4d");
  }
}

// in the world (it moves with the camera), before the deck: the neighbours from the farthest, then our building
export function drawRooftops(R, phase, gloomy, t) {
  const c = tones(phase, gloomy);
  c.hazeEnd = mix(c.far, c.side, 0.55);
  [...NEIGHBOURS].sort((a, b) => (a[2] + a[3]) - (b[2] + b[3])).forEach((n, i) => neighbour(n, i, c, t));
  // our building: stone facades under the deck, a cornice right under the boards
  const stone = mix(c.near, "#c9b896", c.night ? 0.35 : 0.6);  // a warm stone, the neighbours' concrete is cooler
  facade("x", 0, R.h, -5, R.w, c, stone, 7, 20, shade(stone, 1.25));
  facade("y", R.w, R.h, -5, R.h - 70, c, shade(stone, 0.8), 13, 20, shade(stone, 1.05));
}
