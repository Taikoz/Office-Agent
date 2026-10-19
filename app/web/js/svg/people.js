// The team and the chief, drawn flat in 2D like the Sims of the first game: real proportions (a small head, about seven
// heads tall, the hips at the height of a desk), soft shading (the light from the left: a lit edge, the right side in
// shade), no heavy outline, seen three-quarters: from the front turned to the left, or from behind turned to the left;
// the other side is the same drawing mirrored. Limbs jointed at the elbow and the knee, so a pose is three points.
// The head (its face, hair and hats) is drawn in a head space of its own (8 wide, 8.9 tall) and scaled down onto the
// body; the torso and its clothes in a body space 8 wide, narrowed onto the shoulders.
//
// personSvg(state, { view: "front" | "back", mirror }) → SVG markup, the feet at (0, 0), ~30 units tall standing.
// state: look (sex: "f" or a man, skin, hair, style 0-8, shirt, outfit, tie, pants, shoes, beard, beardColor, glasses, scarf, wand,
// jetpack, parrot, katana, lei), frame, seated, arms (down, up, type, reach, baton), tux, smile, hat, walk (0-7),
// breath, blink, talk, hold (cup, sip, mic, papers, ticket, plate, bag, can, paddle, pint, cocktail, tray, pour, book).

import { shade } from "./base.js";

const INK = "#1a1622", LW = 0.22, INKO = ' stroke-opacity=".55"';
const n = v => +(+v).toFixed(2);
const P = (d, fill, more = "") => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${LW}"${INKO} stroke-linejoin="round"${more}/>`;
const F = (d, fill, more = "") => `<path d="${d}" fill="${fill}"${more}/>`;  // no line (a shade, a highlight)
const E = (x, y, rx, ry, fill, line = true, more = "") => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${line ? ` stroke="${INK}" stroke-width="${LW}"${INKO}` : ""}${more}/>`;
const S = (pts, c, w, more = "") => `<path d="M${pts.map(p => `${n(p[0])} ${n(p[1])}`).join("L")}" fill="none" stroke="${c}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"${more}/>`;
const pt = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const poly = (pts, fill, more = "") => F(`M${pts.map(p => `${n(p[0])} ${n(p[1])}`).join("L")}Z`, fill, more);
// smooth shading: gradients in the drawing's own units (ids unique across every person drawn, inline SVGs included)
let DEFS = [], GID = 0;
const gid = () => `pg${(++GID).toString(36)}`;
const stopsOf = st => st.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ""}/>`).join("");
function lin(x1, y1, x2, y2, st) { const id = gid(); DEFS.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${stopsOf(st)}</linearGradient>`); return `url(#${id})`; }
function rad(cx, cy, r, st) { const id = gid(); DEFS.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}">${stopsOf(st)}</radialGradient>`); return `url(#${id})`; }
const across = c => [[0, shade(c, 1.14)], [0.4, c], [1, shade(c, 0.7)]];  // lit on the left, in shade on the right
// the gradient across a limb: perpendicular to the line from its start to its end, as wide as the limb (lit on the left)
function limbFill(pts, c, w) {
  const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let nx = -dy / L, ny = dx / L; if (nx < 0) { nx = -nx; ny = -ny; }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
  const k = w / 2 + Math.abs(nx) * (Math.max(...xs) - Math.min(...xs)) * 0.25;
  return lin(mx - nx * k, my - ny * k, mx + nx * k, my + ny * k, across(c));
}
// a limb as one solid shape: a tapered band per segment (widths at each joint), the joints rounded, the start and the
// end rounded or square (caps: [start, end]); all its pieces filled with the same gradient, so no seam shows
function limb(pts, c, ws, { fill = null, caps = [true, true] } = {}) {
  const W = Array.isArray(ws) ? ws : pts.map(() => ws), f = fill || limbFill(pts, c, Math.max(...W));
  let g = "";
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const wa = W[i] / 2, wb = W[i + 1] / 2;
    g += F(`M${n(a[0] + nx * wa)} ${n(a[1] + ny * wa)}L${n(b[0] + nx * wb)} ${n(b[1] + ny * wb)}L${n(b[0] - nx * wb)} ${n(b[1] - ny * wb)}L${n(a[0] - nx * wa)} ${n(a[1] - ny * wa)}Z`, f);
  }
  pts.forEach((p, i) => { if ((i > 0 && i < pts.length - 1) || (i === 0 && caps[0]) || (i === pts.length - 1 && caps[1])) g += E(p[0], p[1], W[i] / 2, W[i] / 2, f, false); });
  return g;
}

const SHORT = new Set(["tshirt", "polo", "hawaii"]), LONG = new Set(["robe", "kimono"]), WIDE = new Set(["robe", "kimono"]);
const HX = 0.49, HY = 0.575, BX = 0.78;  // the head space and the body space onto the figure

/* ---------- the rig: where the joints are, for a view and a pose ---------- */
function rig(s, back) {
  const seated = !!s.seated, ph = s.walk != null ? (s.walk % 8) / 8 * 2 * Math.PI : null, f = (s.frame || 0) % 2;
  const H = seated ? -4.4 : -14.2, br = s.breath ? -0.2 : 0, T = H - 9.2 + br;  // the hips, the shoulders
  const nod = s.arms === "type" && f ? 0.2 : 0;
  const head = { cx: back ? 0.1 : -0.2, Y0: T - 6 + nod, Yc: T - 0.9 + nod };  // the top of the head, the chin
  const legs = (back ? [[-1.15, 1], [1.15, -1]] : [[1.15, -1], [-1.15, 1]]).map(([x, side]) => {
    const hip = [x, H + 0.9];
    if (seated) {
      if (back) return { hip, knee: [x, H + 2], ankle: [x, -1], foot: x, lift: 0, hidden: true };
      const kx = x * 0.8 - 4.2;
      return { hip, knee: [kx, H + 1.4], ankle: [kx + 0.2, -0.9], foot: kx + 0.2, lift: 0 };
    }
    const sw = ph == null ? 0 : Math.sin(ph) * 2.2 * side, lift = ph == null ? 0 : Math.max(0, Math.cos(ph) * side) * 1.1;
    const ax = x * 0.95 - sw;
    return { hip, knee: [(hip[0] + ax) / 2 - (lift ? 0.7 : 0), (H + -1) / 2 - lift * 0.6], ankle: [ax, -0.9 - lift], foot: ax, lift };
  });
  const fem = s.look?.sex === "f", sw0 = fem ? 2.3 : 2.6;  // a woman: narrower shoulders
  const shN = [back ? sw0 : -sw0, T + 1], shF = [back ? -sw0 + 0.1 : sw0 - 0.1, T + 1];
  const swing = ph == null || seated ? 0 : Math.sin(ph) * 1.5, fwd = -1;
  const down = (sh, k) => ({ sh, el: [sh[0] + (k > 0 ? swing : -swing) * 0.5 + (sh[0] < 0 ? -0.2 : 0.2), T + 4.8], ha: [sh[0] + (k > 0 ? swing : -swing) + (sh[0] < 0 ? -0.1 : 0.1), T + 9] });
  const forward = (sh, z, reach = 3.4, k = 0) => ({ sh, el: [sh[0] - 0.3, T + 4.6 - k], ha: [sh[0] - reach, z], fwd: true });
  const up = sh => ({ sh, el: [sh[0] + (sh[0] < 0 ? -0.9 : 0.9), T - 3.6], ha: [sh[0] + (sh[0] < 0 ? -0.6 : 0.6), T - 8] });
  let near = down(shN, 1), far = down(shF, -1);
  const a = s.arms, h = s.hold;
  if (a === "up") { near = up(shN); far = up(shF); }
  else if (a === "type") { near = forward(shN, T + 5.8 - f * 0.5, 3.2); far = forward(shF, T + 5.4 - (1 - f) * 0.5, 7.6); }
  else if (a === "reach") { near = forward(shN, T + 4.2 - f * 0.5, 4.2, 0.6); far = forward(shF, T + 3.8 - (1 - f) * 0.5, 8.6, 0.6); }
  else if (a === "baton") near = { sh: shN, el: [shN[0] - 1.2, T - 2.6], ha: [shN[0] - 1.6 - f * 0.8, T - 6.8 - f * 0.6] };
  if (["tray", "book"].includes(h)) { near = forward(shN, T + 5.4, 3.2); far = forward(shF, T + 5, 7.4); }
  else if (h === "sip" || h === "mic") near = { sh: shN, el: [shN[0] - 0.6, T + 4.4], ha: back ? [shN[0] - 1.2, T - 1.6] : [head.cx - 1.6, head.Yc - 0.8] };
  else if (h === "pour") near = forward(shN, T + 6, 3.6);
  else if (["bag", "can"].includes(h)) near = down(shN, 1);
  else if (h) near = forward(shN, T + 5.4 - (h === "paddle" ? f * 1.2 : 0), 3.2);
  return { H, T, head, legs, arms: [far, near], seated, ph, f, fwd, fem };
}
// where a hand is, from the feet (scene.js: the steam over a cup, the baton): the view, mirrored or not; which: "near" or "mouth"
export function handPoint(state, back, mirror, which = "near") {
  const r = rig(state, back), p = which === "mouth" ? [r.head.cx - 1.4, r.head.Yc - 1.4] : r.arms[1].ha;
  return [mirror ? -p[0] : p[0], p[1]];
}

/* ---------- pieces ---------- */
function shoe(x, lift, c) {  // the toe to the left (where they go, both views)
  const y = -lift, tx = x - 1.7, hx = x + 0.9;
  return P(`M${n(hx)} ${n(y)}L${n(tx)} ${n(y)}Q${n(tx - 0.35)} ${n(y)} ${n(tx - 0.2)} ${n(y - 0.5)}Q${n(tx + 0.1)} ${n(y - 1)} ${n(x - 0.3)} ${n(y - 1.1)}L${n(hx)} ${n(y - 1.15)}Z`, c)
    + F(`M${n(tx + 0.2)} ${n(y - 0.75)}Q${n(x - 0.6)} ${n(y - 1)} ${n(x)} ${n(y - 1)}`, "none", ` stroke="${shade(c, 1.7)}" stroke-width=".22" stroke-linecap="round"`);
}
// in the body space (8 wide): the torso's outline, shoulders rounded, the waist a little in
// (a woman: the shoulders narrower, the waist in, the hips wider)
function torsoPath(r) {
  const { T, H } = r;
  if (r.fem) return `M-3.6 ${n(T + 1.5)}Q-3.7 ${n(T)} -2.1 ${n(T)}L2.1 ${n(T)}Q3.7 ${n(T)} 3.6 ${n(T + 1.5)}Q2.5 ${n(T + 5.4)} 3.3 ${n(H - 1.4)}L3.6 ${n(H + 0.2)}L-3.7 ${n(H + 0.2)}L-3.4 ${n(H - 1.4)}Q-2.6 ${n(T + 5.4)} -3.6 ${n(T + 1.5)}Z`;
  return `M-4 ${n(T + 1.5)}Q-4.1 ${n(T)} -2.3 ${n(T)}L2.3 ${n(T)}Q4.1 ${n(T)} 4 ${n(T + 1.5)}Q3.5 ${n(T + 5)} 3 ${n(H - 1.6)}L3.2 ${n(H + 0.2)}L-3.3 ${n(H + 0.2)}L-3.1 ${n(H - 1.6)}Q-3.6 ${n(T + 5)} -4 ${n(T + 1.5)}Z`;
}
// the head's outline, in the head space (front: the jaw a little to the left, the cheek round)
function headPath({ cx, Y0, Yc }, fem = false) {
  if (fem) return `M${n(cx - 4)} ${n(Y0 + 4.4)}Q${n(cx - 4)} ${n(Y0)} ${n(cx - 0.1)} ${n(Y0)}Q${n(cx + 3.8)} ${n(Y0)} ${n(cx + 3.8)} ${n(Y0 + 4.4)}`
    + `L${n(cx + 3.5)} ${n(Y0 + 6.3)}Q${n(cx + 2.6)} ${n(Yc - 0.1)} ${n(cx - 0.5)} ${n(Yc - 0.1)}Q${n(cx - 3.4)} ${n(Yc - 0.1)} ${n(cx - 3.85)} ${n(Y0 + 6.3)}Z`;
  return `M${n(cx - 4.1)} ${n(Y0 + 4.4)}Q${n(cx - 4.1)} ${n(Y0)} ${n(cx - 0.1)} ${n(Y0)}Q${n(cx + 3.9)} ${n(Y0)} ${n(cx + 3.9)} ${n(Y0 + 4.4)}`
    + `L${n(cx + 3.7)} ${n(Y0 + 6.3)}Q${n(cx + 3.2)} ${n(Yc)} ${n(cx - 0.4)} ${n(Yc)}Q${n(cx - 3.7)} ${n(Yc)} ${n(cx - 4)} ${n(Y0 + 6.3)}Z`;
}

/* ---------- hair ---------- */
// in the head space (the head 8 wide: x -4.1..3.9, its top at 0, the chin at 8.9; the ear at 3.9, 5.2 from the front).
// A haircut = masses (an outline: a dome a little over the skull, a hairline, locks ending in tapered tips), each
// shaded round (lit top left), with strands running the way the hair grows clipped inside it, a sheen across the
// top, and the shadow it casts on the forehead.
const HEAD = headPath({ cx: 0, Y0: 0, Yc: 8.9 });
const at = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const xy = p => `${n(p[0])} ${n(p[1])}`;
function clipped(d, inner) { const id = gid(); DEFS.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return `<g clip-path="url(#${id})">${inner}</g>`; }
// from the current point through pts, each step a lock: it bulges toward d, ends in a tip, comes back (the edge of a fringe, the ends)
function tips(from, pts, d) {
  let s = "", p = from;
  pts.forEach((q, i) => { const k = i % 2 ? 0.65 : 1, m = at(p, q, 0.5), t = [m[0] + d[0] * k, m[1] + d[1] * k]; s += `Q${xy([p[0] + d[0] * 0.55 * k, p[1] + d[1] * 0.55 * k])} ${xy(t)}Q${xy([m[0] + d[0] * 0.2, m[1] + d[1] * 0.2])} ${xy(q)}`; p = q; });
  return s;
}
// from the current point through pts, each step a clump of hair standing out from c0 (len, lean: per clump): part of
// the mass's own outline, so a spike and the hair it grows from are one shape; spikeFlows: the strands up each clump
function spikeTips(from, pts, c0, clumps) {
  let s = "", p = from;
  pts.forEach((q, i) => {
    const [len, lean = 0] = clumps[i % clumps.length], m = at(p, q, 0.5), dx = m[0] - c0[0], dy = m[1] - c0[1], L = Math.hypot(dx, dy) || 1;
    const t = [m[0] + dx / L * len + lean, m[1] + dy / L * len], c1 = at(m, at(p, t, 0.5), 1.22), c2 = at(m, at(q, t, 0.5), 1.18);
    s += `Q${xy(c1)} ${xy(t)}Q${xy(c2)} ${xy(q)}`; p = q;
  });
  return s;
}
function spikeFlows(from, pts, c0, clumps) {
  const out = []; let p = from;
  pts.forEach((q, i) => {
    const [len, lean = 0] = clumps[i % clumps.length], m = at(p, q, 0.5), dx = m[0] - c0[0], dy = m[1] - c0[1], L = Math.hypot(dx, dy) || 1;
    const t = [m[0] + dx / L * len + lean, m[1] + dy / L * len], b = [m[0] - dx / L * 1.6, m[1] - dy / L * 1.6];
    out.push([[at(b, p, 0.5), at(p, t, 0.5), at(t, p, 0.08)], [at(b, q, 0.5), at(q, t, 0.5), at(t, q, 0.08)], 3]); p = q;
  });
  return out;
}
// k strands between two guides a and b (quadratic curves [start, control, end]), alternately in shade and lit
function flow(c, a, b, k, w = 0.16) {
  let g = "";
  for (let i = 0; i < k; i++) {
    const t = (i + 0.5) / k, j = (((i * 37) % 11) / 11 - 0.5) * 0.35, p = q => { const v = at(a[q], b[q], t); return [v[0] + j * (q === 1), v[1] + j * (q === 1)]; };
    const s = at(p(0), p(1), 0.04 + ((i * 5) % 3) * 0.06), lit = i % 3 === 1;
    g += F(`M${xy(s)}Q${xy(p(1))} ${xy(p(2))}`, "none", ` stroke="${shade(c, lit ? 1.5 : 0.6)}" stroke-width="${n(lit ? w * 0.85 : w)}" stroke-opacity="${lit ? 0.38 : 0.42}" stroke-linecap="round"`);
  }
  return g;
}
// a lock on its own: tapered from its root (w wide) to its tip, bent sideways
function lock(c, a, b, w, bend = 0, fill = null) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, m = at(a, b, 0.5), mb = [m[0] + nx * bend, m[1] + ny * bend];
  const d = `M${xy([a[0] + nx * w / 2, a[1] + ny * w / 2])}Q${xy([mb[0] + nx * w * 0.4, mb[1] + ny * w * 0.4])} ${xy(b)}Q${xy([mb[0] - nx * w * 0.4, mb[1] - ny * w * 0.4])} ${xy([a[0] - nx * w / 2, a[1] - ny * w / 2])}Z`;
  return hairPath(d, fill || lin(a[0], a[1], b[0], b[1], [[0, shade(c, 0.78)], [0.5, c], [1, shade(c, 1.3)]]), c) + F(`M${xy(at(a, b, 0.15))}Q${xy(mb)} ${xy(at(a, b, 0.85))}`, "none", ` stroke="${shade(c, 0.62)}" stroke-width=".14" stroke-opacity=".5"`);
}
// a mass: its outline, its shading, its strands (guides [a, b, k]) and its sheen, inside it
function mass(c, d, flows = [], sheen = null, dark = 1) {
  let inner = "";
  if (sheen) inner += F(sheen, "none", ` stroke="${shade(c, 1.55)}" stroke-width="1.3" stroke-opacity=".22" stroke-linecap="round"`) + F(sheen, "none", ` stroke="${shade(c, 1.7)}" stroke-width=".45" stroke-opacity=".35" stroke-linecap="round"`);
  inner += flows.map(f => flow(c, ...f)).join("");
  return hairPath(d, rad(-1.4, -0.6, 10, [[0, shade(c, 1.25 * dark)], [0.5, shade(c, dark)], [1, shade(c, 0.66 * dark)]]), c) + clipped(d, inner);
}
// hair outlined in its own darker shade, not in ink
const hairPath = (d, fill, c) => F(d, fill, ` stroke="${shade(c, 0.42)}" stroke-width="${LW}" stroke-opacity=".75" stroke-linejoin="round"`);
// what a mass casts on the skin under it (the forehead under a fringe)
const castShadow = d => clipped(HEAD, F(d, "#000000", ' fill-opacity=".16" transform="translate(-.2 .45)"'));
// stubble: shaved hair over the skin, the skull's own outline
// (fade: thinning out toward its top, like the hair round a bald crown)
function stubble(c, d, flows = [], fade = false) {
  const fill = fade ? lin(0, 4.2, 0, 6.6, [[0, c, 0], [1, c, 0.55]]) : c;
  return clipped(HEAD, F(d, fill, fade ? "" : ' fill-opacity=".38"') + clipped(d, flows.map(f => flow(c, ...f, 0.1)).join("")));
}

export const COVERS_EAR = st => st === 2 || st === 6;
const lengthOf = (st, r, back) => st === 6 ? r.T + (back ? 6 : 3.6) : back ? 10.8 : 10.4;
function hairBack(c, st, r) {  // from the front: what falls behind the neck and the shoulders (drawn before the body)
  if (!COVERS_EAR(st)) return "";
  const lo = lengthOf(st, r, false) + 0.4;
  const d = `M-3.4 5Q-4.6 ${n(lo - 3)} -3.6 ${n(lo)}` + tips([-3.6, lo], [[-1.4, lo + 0.5], [1, lo + 0.6], [3.2, lo + 0.3], [4.8, lo - 0.4]], [0, 0.7]) + `Q5.9 ${n(lo - 4)} 4.8 5Z`;
  return mass(c, d, [[[[-3.2, 5.4], [-4, lo - 3], [-3, lo]], [[4.4, 5.4], [5.4, lo - 3], [4.4, lo]], 9]], null, 0.72);
}
function hairFront(c, st, r) {
  let g = "";
  if (st === 5) {  // bald: a ring of short hair behind the ear, the scalp shining
    g += stubble(c, `M2.6 3.4Q4.4 3 4.6 4.6L4.5 7.4Q3.6 7.6 3.1 6.4Q3 5 2.6 3.4Z`, [[[[3, 3.6], [3.6, 5], [3.4, 6.8]], [[4.4, 3.6], [4.6, 5.4], [4.3, 7.2]], 6]])
      + stubble(c, `M2.5 3.6Q3.1 3.5 3.2 4.4L3.1 5.6Q2.8 5.2 2.6 4.6Z`);
    return g + F(`M-2.6 1.4Q-1.2 .1 1 .5`, "none", ` stroke="#ffffff" stroke-opacity=".35" stroke-width=".7" stroke-linecap="round"`);
  }
  if (st === 8) {  // mohawk: the sides shaved, a crest of spiky locks from the forehead over the top to the back
    g += stubble(c, `M-4.3 3.6C-4.6 -1.2 4.6 -1.4 4.6 3.4L4.5 6.6Q3.8 7 3.3 6.2L3 3.6Q1 1.4 -4.3 3.6Z`, [[[[-3.6, 2.6], [0, -.6], [4, 2.4]], [[-3.2, 3.2], [1, 1.4], [3.6, 5.6]], 10]]);
    // the crest: one fin standing on the middle of the skull, from the forehead to the back, its top edge in clumps
    // swept back; strands from its base up into each clump
    const base = [[-2.9, 1.7], [-2, 0.7], [-0.8, 0.2], [0.5, 0.1], [1.8, 0.3], [2.9, 0.9], [3.7, 1.9]], o = [0, 4.4];
    const hs = [0.9, 1.9, 2.5, 2.8, 2.7, 2.2, 1.2], top = base.map((b, i) => { const dx = b[0] - o[0], dy = b[1] - o[1], L = Math.hypot(dx, dy); return [b[0] + dx / L * hs[i], b[1] + dy / L * hs[i]]; });
    const clumps = [[0.8, 1.1], [1, 1.2], [0.9, 1.3], [1, 1.3], [0.9, 1.2], [0.7, 1]];
    const fin = `M${xy(base[0])}L${xy(top[0])}` + spikeTips(top[0], top.slice(1), o, clumps) + `L${xy(base[6])}` + base.slice(0, 6).reverse().map(b => `L${xy([b[0], b[1] + 0.25])}`).join("") + `Z`;
    g += mass(c, fin, [[[base[0], [0.4, -2.8], top[6]], [[base[1][0], base[1][1] + 0.3], [0.6, -0.4], base[6]], 6], ...spikeFlows(top[0], top.slice(1), o, clumps)], `M-2.2 -.6Q.4 -2.4 2.8 -1.2`);
    return g;
  }
  const long = COVERS_EAR(st);
  // the hairline: where the hair meets the forehead and the temple, from the sideburn (right) to the temple (left)
  const line = st === 7 ? `L2.9 3.2Q1.6 1.4 -.4 1.5Q-3 1.6 -4.2 3.4`
    : st === 4 ? `L2.85 3.3Q2.2 2 .8 1.8` + tips([0.8, 1.8], [[-0.6, 1.6], [-2, 1.9], [-3.3, 2.5], [-4.25, 3.4]], [-0.15, 0.45])
    : st === 3 ? `L2.85 3.1Q2.2 1.9 .8 1.6Q-1.8 1.4 -4.25 3.2`
    : `L2.85 3.3Q2.2 2.3 1.2 2.2` + tips([1.2, 2.2], [[0.1, 2], [-1, 2.2], [-2.1, 2.4], [-3.2, 2.8], [-4.25, 3.5]], [-0.3, 0.55]);
  if (long) {  // shoulder-length or long: the mass from a side part, a lock down the cheek, the rest over the ear
    const lo = lengthOf(st, r, false);
    const d = `M-4.5 3C-4.9 -.4 -2.6 -1.3 -.2 -1.3C3 -1.3 5.2 .8 5.3 4.4C5.6 ${n(lo * 0.62)} 5.9 ${n(lo - 2)} 5.6 ${n(lo - 0.3)}`
      + tips([5.6, lo - 0.3], [[4.6, lo + 0.2], [3.6, lo]], [-0.1, 0.8]) + `C2.9 ${n(lo - 2.4)} 3.4 6.4 3 4.2Q2.6 2.4 .8 2.2Q-1 1.6 -2.4 2.4Q-3.3 3 -3.35 4.2`
      + `C-3.4 6.4 -3.1 ${n(lo - 2)} -3.3 ${n(lo - 0.5)}` + tips([-3.3, lo - 0.5], [[-4.6, lo - 0.9]], [0, 0.9]) + `C-4.9 ${n(lo * 0.6)} -4.4 5 -4.5 3Z`;
    g += castShadow(`M-4.5 3C-4.9 -.4 4 -1.3 3 4.2Q2.6 2.4 .8 2.2Q-1 1.6 -2.4 2.4Q-3.3 3 -3.35 4.2L-4.5 4.2Z`);
    g += mass(c, d, [
      [[[-1.2, -1], [-3.6, -.4], [-4.5, 3.4]], [[-.8, -.5], [-1.2, 1.6], [-3.3, 3.6]], 7],
      [[[-4.5, 3], [-4.7, lo * 0.6], [-4.4, lo - 0.4]], [[-3.4, 3.6], [-3.6, lo * 0.6], [-3.4, lo - 0.2]], 5],
      [[[-.8, -1.1], [3.4, -1.3], [5.2, 4]], [[-.6, -.5], [2.4, 1], [3.1, 4.2]], 9],
      [[[5.2, 3], [5.8, lo * 0.6], [5.3, lo]], [[3.1, 4], [3.4, lo * 0.6], [3.5, lo]], 8]],
      `M-3.4 .8Q-1 -.7 2.8 .1`);
    return g + S([[-1.25, -1.1], [-1.05, 0.3]], shade(c, 0.5), 0.2);  // the parting
  }
  // short hair: the dome, the back down behind the ear, a sideburn, the hairline
  const top = st === 4 ? -1.15 : -1, o = [0.2, 3.6];
  const SPIKE = { from: [-3.6, 0.6], pts: [[-2.5, -0.5], [-1.2, -1], [0.2, -1.1], [1.6, -0.9], [2.8, -0.3], [3.8, 0.7], [4.45, 2.2]], clumps: [[0.9, -0.5], [1.3, 0.2], [1, 0.6], [1.4, 0.9], [1.05, 1.1], [1.25, 1.1], [0.75, 0.8]] };
  const dome = st === 1 ? `C-4.4 2 -4.1 1.1 -3.6 .6` + spikeTips(SPIKE.from, SPIKE.pts, o, SPIKE.clumps) + `C4.6 2.8 4.6 3.2 4.55 3.6`
    : st === 3 ? `C-4.9 2 -5.2 .2 -4.5 -.9C-3.8 -2.1 -2.2 -2.3 -1 -1.8C.8 -1.3 3.5 -1 4.35 1.1C4.6 2.2 4.6 3 4.55 3.6`
    : `C-4.6 .3 -2.6 ${n(top)} -.2 ${n(top)}C2.6 ${n(top)} 4.6 .6 4.55 3.6`;
  const d = `M-4.25 3.4` + dome + `L4.45 6.5Q4.1 6.9 3.7 6.4L3.15 5.6` + line + `Z`;
  if (st === 7) g += hairBun(c, [3.1, -0.6], 1.9);  // the bun, behind the top
  g += castShadow(d) + mass(c, d, st === 7 ? [
    [[[-4, 3.2], [-2.4, -.4], [2.6, -1]], [[2.8, 3.2], [2.8, 1], [3.2, .4]], 12]]
    : st === 1 ? [...spikeFlows(SPIKE.from, SPIKE.pts, o, SPIKE.clumps), [[[3.6, 1.4], [4.4, 3], [4.3, 6.2]], [[2.8, 2], [3.2, 3.4], [3.1, 5.4]], 4], [[[-3.4, 1], [-2, 1.2], [-.6, 2.2]], [[-4, 2.4], [-3, 2.4], [-2, 2.6]], 3]]
    : st === 3 ? [
      [[[-4.1, 3], [-5.2, -.6], [-1.6, -2.1]], [[.6, 1.7], [.2, -.6], [4.1, .8]], 14],
      [[[3.6, 1.2], [4.4, 3], [4.3, 6.2]], [[2.8, 2.6], [3.2, 3.6], [3.1, 5.4]], 4]]
    : st === 4 ? [
      [[[-1.6, -.5], [1.4, -1.7], [4.4, 1.6]], [[-1.4, 1.6], [1.8, 1], [3.1, 3.6]], 10],
      [[[-1.8, -.6], [-3.6, -.5], [-4.3, 3.2]], [[-1.6, 1.4], [-2.6, 1.8], [-3.4, 2.8]], 5],
      [[[4.4, 2], [4.6, 4], [4.3, 6.4]], [[3, 3.4], [3.3, 4.6], [3.2, 5.6]], 4]]
    : [
      [[[2.8, -.6], [.5, -.6], [-3.8, 2.6]], [[3.6, 1.6], [1.6, 1.4], [-.4, 2.4]], 11],
      [[[3.6, 0], [4.4, 2], [4.3, 6.2]], [[2.6, .8], [3.2, 2.4], [3.1, 5.4]], 5]],
    st === 4 ? `M-3.2 .4Q-1.4 -.9 1.4 -.7` : st === 3 ? `M-4.3 .4Q-3.8 -1.6 -1.4 -1.8` : st === 1 ? `M-2.6 .6Q-.6 -.6 1.8 -.2` : `M-2.8 .3Q-.8 -.8 1.8 -.5`);
  if (st === 3) g += F(`M-3.9 1.6Q-3.2 .4 -1.6 .2`, "none", ` stroke="${shade(c, 0.5)}" stroke-width=".22" stroke-opacity=".55" stroke-linecap="round"`);  // the wave's roll over the forehead
  if (st === 4) g += S([[-1.75, -1], [-1.55, 1.5]], shade(c, 0.48), 0.22) + S([[-1.5, -0.9], [-1.35, 1.3]], shade(c, 1.5), 0.12, ' stroke-opacity=".5"');  // the side parting
  if (st === 7) g += lock(c, [-3.9, 2.8], [-4.4, 5.6], 0.5, 0.4) + S([[2.4, -0.2], [3.1, 1.2]], shade(c, 0.45), 0.55);  // a loose lock at the temple, the hair tie
  return g;
}
// a bun: a knot of hair, its strands wound round it
function hairBun(c, [x, y], R) {
  const d = `M${n(x - R)} ${n(y)}A${n(R)} ${n(R * 0.95)} 0 1 1 ${n(x + R)} ${n(y)}A${n(R)} ${n(R * 0.95)} 0 1 1 ${n(x - R)} ${n(y)}Z`;
  let inner = "";
  for (let k = 0; k < 5; k++) { const r = R * (0.25 + k * 0.17); inner += F(`M${n(x - r)} ${n(y + r * 0.2)}A${n(r)} ${n(r * 0.8)} 0 0 1 ${n(x + r)} ${n(y - r * 0.2)}`, "none", ` stroke="${shade(c, k % 2 ? 1.5 : 0.6)}" stroke-width=".16" stroke-opacity=".42" stroke-linecap="round"`); }
  return hairPath(d, rad(x - R * 0.4, y - R * 0.4, R * 1.6, [[0, shade(c, 1.3)], [0.55, c], [1, shade(c, 0.62)]]), c) + clipped(d, inner);
}
function hairFromBehind(c, st, r) {  // the back of the head (the visible ear on the left, drawn after for short hair)
  let g = "";
  if (st === 5) return stubble(c, `M-4.4 4.2Q-2 5.6 0 5.3Q2 5.6 4.4 4.2L4.3 7.4Q0 8.6 -4.3 7.4Z`, [[[[-3.8, 4.6], [-3.6, 5.8], [-3.6, 7.2]], [[3.8, 4.6], [3.6, 5.8], [3.6, 7.2]], 8]], true)
    + F(`M-2 1.2Q0 .2 2 1`, "none", ` stroke="#ffffff" stroke-opacity=".3" stroke-width=".7" stroke-linecap="round"`);
  if (st === 8) {
    g += stubble(c, `M-4.6 4.4C-5 -1.6 5 -1.6 4.6 4.4L4.4 9Q0 9.6 -4.4 9Z`, [[[[-3.6, 1], [-4, 4], [-3.6, 8]], [[3.6, 1], [4, 4], [3.6, 8]], 10]]);
    // the crest seen end on: a strip from the nape up over the crown, taller toward the top, its top in spiky tips
    const o = [0, 2.4], clumps = [[1.1, -0.5], [1.4, -0.1], [1.3, 0.3], [1, 0.6]];
    const tp = [[-0.9, -1.9], [0.1, -2.2], [1.1, -1.9], [1.8, -0.9]];
    const d = `M-1.2 7.6Q-1.8 3 -1.8 -.9` + spikeTips([-1.8, -0.9], tp, o, clumps) + `Q1.9 3 1.2 7.6Q0 8 -1.2 7.6Z`;
    return g + mass(c, d, [[[[-.5, 7.4], [-.8, 2], [-.9, -2]], [[.5, 7.4], [.8, 2], [.9, -2]], 5], [[[-1.1, 7.4], [-1.6, 2], [-1.7, -1]], [[1.1, 7.4], [1.7, 2], [1.7, -1]], 8], ...spikeFlows([-1.8, -0.9], tp, o, clumps)], `M-.5 6Q-.8 1 -.6 -1.6`);
  }
  if (COVERS_EAR(st)) {
    const lo = lengthOf(st, r, true);
    const d = `M-4.5 3C-5.1 -2.9 5.1 -2.9 4.5 3C5.2 6 5.4 ${n(lo - 2.4)} 5 ${n(lo - 0.4)}`
      + tips([5, lo - 0.4], [[3.6, lo + 0.1], [2.2, lo - 0.1], [0.8, lo + 0.2], [-0.7, lo], [-2.2, lo + 0.2], [-3.7, lo], [-5, lo - 0.4]], [0, 0.85]) + `C-5.4 ${n(lo - 2.4)} -5.2 6 -4.5 3Z`;
    return mass(c, d, [
      [[[0, -1], [-5, 0], [-4.8, lo - 0.4]], [[0, -.6], [-1, 4], [-.6, lo]], 9],
      [[[0, -1], [1, 4], [.6, lo]], [[0, -1], [5, 0], [4.8, lo - 0.4]], 9]],
      `M-3.8 2.2Q0 .4 3.8 2.2`);
  }
  // short hair: the whole back of the head down to the nape, its ends in small tips, the strands fanning from the crown
  const BSPIKE = { from: [-4.2, 1], pts: [[-3.3, -0.4], [-2, -1.2], [-0.6, -1.5], [0.8, -1.5], [2.2, -1.1], [3.4, -0.3], [4.3, 1.2]], clumps: [[0.9, -0.5], [1.25, -0.3], [1, 0], [1.35, 0.3], [1, 0.4], [1.2, 0.6], [0.8, 0.5]] }, bo = [0, 3.8];
  const bdome = st === 1 ? `C-4.7 3 -4.6 1.8 -4.2 1` + spikeTips(BSPIKE.from, BSPIKE.pts, bo, BSPIKE.clumps) + `C4.6 2 4.6 3.2 4.45 4.2`
    : st === 3 ? `C-4.9 1 -4.9 -.8 -4 -1.6C-3 -2.4 -1.4 -2.2 -.2 -1.7C2.4 -1.6 4.8 -.3 4.45 4.2`
    : `C-4.9 -2.4 4.9 -2.4 4.45 4.2`;
  const d = `M-4.45 4.2` + bdome + `L4.2 7.2` + tips([4.2, 7.2], [[2.6, 7.9], [1, 8.2], [-0.8, 8.2], [-2.6, 7.8], [-4.1, 7.1]], [0, 0.45]) + `Z`;
  if (st === 7) {  // pulled back to the bun: the strands converge on it
    g += mass(c, d, [
      [[[-4.2, 6.6], [-3.6, 3], [-.6, 1.6]], [[4.2, 6.6], [3.6, 3], [.6, 1.6]], 16],
      [[[-4.4, 3.6], [-3.8, .2], [-.6, .8]], [[4.4, 3.6], [3.8, .2], [.6, .8]], 10]], `M-3.4 1.8Q0 .6 3.4 1.8`);
    return g + hairBun(c, [0, 1.3], 2.1);
  }
  const crown = st === 4 ? [-1.6, 0.4] : [0.8, 0.8];
  g += mass(c, d, [
    [[crown, [-3, .8], [-4, 6.6]], [[crown[0] + 0.2, crown[1] + 0.2], [0, 4], [-.2, 8]], 10],
    [[[crown[0] + 0.2, crown[1] + 0.1], [1.6, 4], [1, 8.1]], [crown, [4.4, 1.2], [4, 7]], 10],
    st === 3 ? [[crown, [-2.4, -.6], [-3.4, -2.4]], [crown, [.4, -1], [.2, -2]], 6] : [[crown, [-1, -.9], [-3.8, .8]], [crown, [2.4, -.9], [4.2, 1.4]], 8],
    ...(st === 1 ? spikeFlows(BSPIKE.from, BSPIKE.pts, bo, BSPIKE.clumps) : [])],
    `M-2.6 1.6Q0 .2 2.6 1.4`);
  return g;
}

/* ---------- the face ---------- */
function face(s, r) {
  const L = s.look, { cx, Y0, Yc } = r.head, skin = L.skin, ey = Y0 + 5.3, my = Y0 + 7.6, hairC = L.hair || "#3a2a1e";
  let g = "";
  for (const [x, k] of [[cx - 2.9, 1], [cx + 2, 0.8]]) g += E(x, my - 0.5, 0.85 * k, 0.45, "#e07a6a", false, ' fill-opacity=".14"');  // the cheeks
  const eyes = [cx - 2.2, cx + 0.9];
  if (s.blink) g += eyes.map(x => S([[x - 0.7, ey + 0.1], [x, ey + 0.4], [x + 0.7, ey + 0.1]], INK, 0.38)).join("");
  else g += eyes.map((x, i) => E(x, ey, i ? 0.66 : 0.74, 0.58, "#f4f0ea", false) + E(x - 0.22, ey + 0.02, 0.42, 0.5, "#4a3426", false) + E(x - 0.24, ey + 0.04, 0.22, 0.3, "#0e0c12", false)
    + E(x - 0.4, ey - 0.18, 0.12, 0.12, "#ffffff", false) + S([[x - 0.8, ey - 0.45], [x, ey - 0.62], [x + 0.75, ey - 0.42]], shade(skin, 0.55), 0.35)).join("");
  const brow = L.style === 5 ? shade(skin, 0.62) : shade(hairC, 0.8);
  const fem = L.sex === "f";
  g += eyes.map((x, i) => fem ? S([[x - 0.85, ey - 1.3 + (i ? -0.1 : 0)], [x - 0.1, ey - 1.8], [x + 0.75, ey - 1.55]], brow, 0.4) : S([[x - 0.8, ey - 1.45 + (i ? -0.1 : 0)], [x + 0.7, ey - 1.65]], brow, 0.55)).join("");
  if (fem && !s.blink) g += eyes.map(x => S([[x - 0.78, ey - 0.42], [x - 1.15, ey - 0.75]], INK, 0.2) + S([[x - 0.55, ey - 0.55], [x - 0.8, ey - 0.95]], INK, 0.18) + S([[x - 0.8, ey - 0.45], [x, ey - 0.64], [x + 0.75, ey - 0.42]], INK, 0.3, ' stroke-opacity=".8"')).join("");
  g += S([[cx - 0.7, ey + 0.4], [cx - 1.3, ey + 1.5], [cx - 0.6, ey + 1.7]], shade(skin, 0.7), 0.3);  // the nose
  if (s.talk) g += E(cx - 0.9, my + 0.1, 0.85, 0.6, "#5a1e24", true) + E(cx - 0.9, my + 0.35, 0.45, 0.22, "#e86a7a", false);
  else if (s.smile) g += F(`M${n(cx - 2.1)} ${n(my - 0.3)}Q${n(cx - 0.9)} ${n(my + 1)} ${n(cx + 0.3)} ${n(my - 0.3)}Q${n(cx - 0.9)} ${n(my + 0.35)} ${n(cx - 2.1)} ${n(my - 0.3)}Z`, "#7a2b30", ` stroke="${INK}" stroke-width=".25"`);
  else if (fem) g += F(`M${n(cx - 1.8)} ${n(my)}Q${n(cx - 1.3)} ${n(my - 0.45)} ${n(cx - 0.9)} ${n(my - 0.2)}Q${n(cx - 0.5)} ${n(my - 0.45)} ${n(cx)} ${n(my)}Q${n(cx - 0.9)} ${n(my + 0.75)} ${n(cx - 1.8)} ${n(my)}Z`, "#c25a64") + S([[cx - 1.7, my], [cx - 0.1, my]], "#7a2b30", 0.2);
  else g += S([[cx - 1.7, my], [cx - 0.9, my + 0.18], [cx - 0.1, my]], "#7a3a3e", 0.36);
  // the beard
  const b = L.beard, bc = L.beardColor || hairC;
  if (b === "stubble") g += F(`M${n(cx - 3.9)} ${n(Y0 + 6.2)}Q${n(cx - 3.4)} ${n(Yc)} ${n(cx - 0.4)} ${n(Yc)}Q${n(cx + 3.1)} ${n(Yc)} ${n(cx + 3.6)} ${n(Y0 + 6.2)}L${n(cx + 3)} ${n(my - 0.6)}Q${n(cx - 0.8)} ${n(my - 1.4)} ${n(cx - 3.4)} ${n(my - 0.6)}Z`, bc, ' fill-opacity=".3"');
  else if (b === "short" || b === "full") {
    const lo = b === "full" ? 1.3 : 0.25;
    g += P(`M${n(cx - 4.05)} ${n(Y0 + 4.8)}L${n(cx - 3.4)} ${n(my - 0.4)}Q${n(cx - 0.9)} ${n(my + 1.2)} ${n(cx + 1.6)} ${n(my - 0.4)}L${n(cx + 3.85)} ${n(Y0 + 4.8)}L${n(cx + 3.7)} ${n(Y0 + 6.3)}Q${n(cx + 3)} ${n(Yc + lo)} ${n(cx - 0.4)} ${n(Yc + lo)}Q${n(cx - 3.8)} ${n(Yc + lo)} ${n(cx - 4)} ${n(Y0 + 6.3)}Z`, bc)
      + (s.talk ? E(cx - 0.9, my + 0.1, 0.85, 0.6, "#5a1e24", true) : S([[cx - 1.7, my + 0.1], [cx - 0.1, my + 0.1]], "#5a2a2e", 0.36));
  } else if (b === "goatee") g += P(`M${n(cx - 1.9)} ${n(my + 0.6)}Q${n(cx - 0.9)} ${n(my + 0.2)} ${n(cx + 0.1)} ${n(my + 0.6)}L${n(cx - 0.2)} ${n(Yc + 0.6)}Q${n(cx - 0.9)} ${n(Yc + 1)} ${n(cx - 1.6)} ${n(Yc + 0.6)}Z`, bc);
  if (b === "mustache" || b === "goatee" || b === "full") g += P(`M${n(cx - 2.4)} ${n(my - 0.2)}Q${n(cx - 1.6)} ${n(my - 1.2)} ${n(cx - 0.9)} ${n(my - 0.6)}Q${n(cx - 0.2)} ${n(my - 1.2)} ${n(cx + 0.6)} ${n(my - 0.2)}Q${n(cx - 0.9)} ${n(my - 0.5)} ${n(cx - 2.4)} ${n(my - 0.2)}Z`, shade(bc, 0.9));
  // the glasses
  const gl = L.glasses === true ? "square" : L.glasses;
  if (gl === "square") g += eyes.map((x, i) => `<rect x="${n(x - 1.1)}" y="${n(ey - 0.95)}" width="2.2" height="1.8" rx=".3" fill="#ffffff" fill-opacity=".15" stroke="${INK}" stroke-width=".38"/>`).join("") + S([[eyes[0] + 1.1, ey - 0.4], [eyes[1] - 1.1, ey - 0.4]], INK, 0.3);
  else if (gl === "round") g += eyes.map(x => E(x, ey, 1.05, 1.05, "#ffffff", false, ` fill-opacity=".15" stroke="#8a6a2e" stroke-width=".38"`)).join("") + S([[eyes[0] + 1.05, ey - 0.2], [eyes[1] - 1.05, ey - 0.2]], "#8a6a2e", 0.3);
  else if (gl === "sun") g += eyes.map(x => `<rect x="${n(x - 1.2)}" y="${n(ey - 0.9)}" width="2.4" height="1.7" rx=".6" fill="#16141c" stroke="${INK}" stroke-width=".3"/>` + E(x - 0.5, ey - 0.4, 0.4, 0.2, "#ffffff", false, ' fill-opacity=".4"')).join("") + S([[eyes[0] + 1.2, ey - 0.4], [eyes[1] - 1.2, ey - 0.4]], INK, 0.35);
  else if (gl === "patch") g += S([[cx - 4.1, ey - 2.2], [cx + 3.9, ey - 1.2]], INK, 0.35) + E(eyes[0], ey, 1.15, 1.05, "#16141c", true);
  return g;
}

/* ---------- outfits ---------- */
// what is painted on the torso, from the front (torso: its ink path already drawn)
function outfitFront(s, r, c) {
  const { T, H } = r, o = c.outfit, sh = shade(c.shirt, 0.82), skin = c.skin;
  const neckV = (d, fill = shade(skin, 0.9)) => P(`M-1.6 ${n(T)}L${n(-0.2)} ${n(T + d)}L1.4 ${n(T)}Z`, fill);
  let g = "";
  if (o === "tux") g += P(`M-1.8 ${n(T)}L-0.2 ${n(T + 5)}L1.6 ${n(T)}Z`, "#f4f2ea") + P(`M-1.2 ${n(T + 0.4)}L-0.2 ${n(T + 1.2)}L0.8 ${n(T + 0.4)}L0.8 ${n(T + 1.6)}L-0.2 ${n(T + 1)}L-1.2 ${n(T + 1.6)}Z`, c.tie)
    + E(-0.2, T + 2.7, 0.22, 0.22, INK, false) + E(-0.2, T + 3.8, 0.22, 0.22, INK, false) + P(`M-1.8 ${n(T)}L-3 ${n(T + 0.2)}L-0.6 ${n(T + 5.6)}Z`, "#2a2a36") + P(`M1.6 ${n(T)}L2.8 ${n(T + 0.2)}L0.4 ${n(T + 5.6)}Z`, "#2a2a36");
  else if (o === "suit") g += P(`M-1.6 ${n(T)}L-0.2 ${n(T + 4.6)}L1.4 ${n(T)}Z`, "#f4f2ea") + P(`M-0.6 ${n(T + 0.6)}L0.2 ${n(T + 0.6)}L0.5 ${n(T + 5)}L-0.2 ${n(T + 5.8)}L-0.9 ${n(T + 5)}Z`, c.tie)
    + P(`M-1.6 ${n(T)}L-2.8 ${n(T + 0.2)}L-0.8 ${n(T + 6.4)}Z`, shade(c.shirt, 0.88)) + P(`M1.4 ${n(T)}L2.6 ${n(T + 0.2)}L0.4 ${n(T + 6.4)}Z`, shade(c.shirt, 0.88)) + E(-0.2, T + 7, 0.25, 0.25, INK, false);
  else if (o === "shirt") g += P(`M-1.8 ${n(T)}L-0.2 ${n(T + 1.6)}L-1 ${n(T + 2)}Z`, shade(c.shirt, 1.15)) + P(`M1.4 ${n(T)}L-0.2 ${n(T + 1.6)}L0.6 ${n(T + 2)}Z`, shade(c.shirt, 1.15))
    + S([[-0.2, T + 1.6], [-0.2, H]], shade(c.shirt, 0.75), 0.25) + [3.2, 5.2, 7.2].map(y => E(0.25, T + y, 0.2, 0.2, shade(c.shirt, 0.6), false)).join("");
  else if (o === "hoodie") g += P(`M-2.6 ${n(T)}Q-0.2 ${n(T + 2.6)} 2.2 ${n(T)}Z`, shade(c.shirt, 0.8)) + S([[-1.2, T + 1.4], [-1.3, T + 4]], "#f4f2ea", 0.3) + S([[0.8, T + 1.4], [0.9, T + 4]], "#f4f2ea", 0.3)
    + P(`M-2.6 ${n(H - 3.2)}L2.2 ${n(H - 3.2)}L2.8 ${n(H - 0.4)}L-3.2 ${n(H - 0.4)}Z`, shade(c.shirt, 0.92));
  else if (o === "polo") g += neckV(1.8) + P(`M-1.8 ${n(T)}L-0.4 ${n(T + 1.2)}L-2.2 ${n(T + 1.6)}Z`, shade(c.shirt, 1.25)) + P(`M1.6 ${n(T)}L0.2 ${n(T + 1.2)}L2 ${n(T + 1.6)}Z`, shade(c.shirt, 1.25))
    + [2.6, 3.8].map(y => E(-0.2, T + y, 0.2, 0.2, shade(c.shirt, 0.6), false)).join("");
  else if (o === "flight") g += P(`M-2.2 ${n(T + 2.6)}h3.6v2.6h-3.6Z`, "#1a222c") + E(-1.3, T + 3.9, 0.4, 0.4, "#00e5ff", false) + E(0.3, T + 3.9, 0.4, 0.4, "#ff3df2", false)
    + F(`M-3.9 ${n(T + 1)}L-3.6 ${n(H)}`, "none", ` stroke="${c.tie}" stroke-width=".7"`) + F(`M3.8 ${n(T + 1)}L3.5 ${n(H)}`, "none", ` stroke="${c.tie}" stroke-width=".7"`) + P(`M-2 ${n(T)}Q-0.2 ${n(T + 1.4)} 1.8 ${n(T)}Z`, shade(c.shirt, 0.8));
  else if (o === "vampire") g += P(`M-1.4 ${n(T)}L1.2 ${n(T)}L0.8 ${n(T + 4.4)}L-1 ${n(T + 4.4)}Z`, "#f4f2ea") + [1.4, 2.6, 3.8].map(y => S([[-1, T + y], [0.8, T + y]], "#d8d4c8", 0.3)).join("") + E(-0.1, T + 0.8, 0.5, 0.5, c.tie, true)
    + P(`M-1.4 ${n(T)}L-3.2 ${n(T + 0.2)}L-1.6 ${n(H)}Z`, shade(c.shirt, 0.8)) + P(`M1.2 ${n(T)}L3 ${n(T + 0.2)}L1.4 ${n(H)}Z`, shade(c.shirt, 0.8));
  else if (o === "hawaii") {
    g += P(`M-1.8 ${n(T)}L-0.2 ${n(T + 2.4)}L-2.4 ${n(T + 1.8)}Z`, shade(c.shirt, 1.2)) + P(`M1.4 ${n(T)}L-0.2 ${n(T + 2.4)}L1.8 ${n(T + 1.8)}Z`, shade(c.shirt, 1.2)) + neckV(1.6);
    for (const [x, y, k] of [[-2.8, 3.2, 0], [1.6, 2.4, 1], [-0.8, 5.4, 1], [2.4, 6.2, 0], [-2.6, 7.2, 1]]) g += [0, 1, 2, 3, 4].map(i => { const a = i * 1.257; return E(x + Math.cos(a) * 0.55, T + y + Math.sin(a) * 0.55, 0.42, 0.42, k ? "#f4f2ea" : c.tie, false); }).join("") + E(x, T + y, 0.25, 0.25, "#f2c230", false);
  } else if (o === "kimono") g += P(`M-1.6 ${n(T)}L1 ${n(T + 4.4)}L1.4 ${n(T)}Z`, "#f4f2ea") + P(`M-1.6 ${n(T)}L-0.2 ${n(T)}L1.6 ${n(T + 4.6)}L0.6 ${n(T + 5)}Z`, shade(c.shirt, 0.85))
    + P(`M-4 ${n(T + 5.4)}L3.9 ${n(T + 5.4)}L3.8 ${n(T + 7.6)}L-3.9 ${n(T + 7.6)}Z`, c.tie) + P(`M-0.9 ${n(T + 5.8)}h1.6v1.4h-1.6Z`, shade(c.tie, 0.7));
  else if (o === "pirate") g += P(`M-1.4 ${n(T)}L1.2 ${n(T)}L0.8 ${n(T + 4.6)}L-1 ${n(T + 4.6)}Z`, "#f4f2ea") + [1.4, 2.6].map(y => S([[-1, T + y], [0.8, T + y]], "#d8d4c8", 0.3)).join("")
    + P(`M-1.4 ${n(T)}L-3 ${n(T + 0.2)}L-2 ${n(H)}Z`, shade(c.shirt, 0.82)) + P(`M1.2 ${n(T)}L2.8 ${n(T + 0.2)}L1.8 ${n(H)}Z`, shade(c.shirt, 0.82))
    + P(`M-3.9 ${n(H - 2.6)}L3.7 ${n(H - 2.6)}L3.7 ${n(H - 1.2)}L-3.8 ${n(H - 1.2)}Z`, c.tie) + [[-2.6, 2], [-2.6, 4], [2.2, 2], [2.2, 4]].map(([x, y]) => E(x, T + y, 0.32, 0.32, "#e8c23a", true)).join("");
  else if (o === "robe") g += F(`M-0.2 ${n(T + 1)}L-0.2 ${n(H)}`, "none", ` stroke="${c.tie}" stroke-width=".7"`) + P(`M-2.4 ${n(T)}L-0.2 ${n(T + 2)}L2 ${n(T)}Z`, shade(c.shirt, 0.8)) + E(-0.2, T + 2, 0.55, 0.45, "#d4a640", true);
  else g += neckV(1.2) + P(`M-1.6 ${n(T)}Q-0.2 ${n(T + 1.5)} 1.4 ${n(T)}Z`, shade(skin, 0.9));  // a t-shirt
  return g;
}
// the back of the clothes
function outfitBack(s, r, c) {
  const { T, H } = r, o = c.outfit;
  let g = "";
  g += S([[-1.4, T + 0.3], [1.6, T + 0.3]], shade(c.shirt, 0.7), 0.5);  // the collar
  if (o === "suit" || o === "tux") g += S([[0.1, H - 3], [0.1, H]], shade(c.shirt, 0.7), 0.3);
  if (o === "robe") g += F(`M0.1 ${n(T + 0.6)}L0.1 ${n(H)}`, "none", ` stroke="${shade(c.shirt, 0.8)}" stroke-width=".4"`);
  if (o === "kimono") g += P(`M-3.9 ${n(T + 5.4)}L4 ${n(T + 5.4)}L3.9 ${n(T + 7.6)}L-3.8 ${n(T + 7.6)}Z`, c.tie) + P(`M-1.6 ${n(T + 5)}h3.4v3h-3.4Z`, shade(c.tie, 0.8));
  if (o === "pirate") g += P(`M-3.9 ${n(H - 2.6)}L3.8 ${n(H - 2.6)}L3.8 ${n(H - 1.2)}L-3.8 ${n(H - 1.2)}Z`, c.tie);
  if (o === "flight") g += F(`M-3.9 ${n(T + 1)}L-3.6 ${n(H)}M3.9 ${n(T + 1)}L3.6 ${n(H)}`, "none", ` stroke="${c.tie}" stroke-width=".7"`);
  if (o === "hawaii") for (const [x, y] of [[-2, 2.6], [1.8, 4], [-1, 6.4]]) g += E(x, T + y, 0.6, 0.6, c.tie, false) + E(x, T + y, 0.22, 0.22, "#f2c230", false);
  return g;
}

/* ---------- hats ---------- */
function hatSvg(hat, r, back) {
  const { cx, Y0 } = r.head, Yt = Y0 - 0.9;
  if (!hat) return "";
  const d = back ? 1 : -1;
  if (hat === "cap") return P(`M${n(cx - 4.4)} ${n(Y0 + 2.6)}Q${n(cx - 4.6)} ${n(Yt - 0.8)} ${n(cx)} ${n(Yt - 0.8)}Q${n(cx + 4.6)} ${n(Yt - 0.8)} ${n(cx + 4.4)} ${n(Y0 + 2.6)}Z`, "#081746")
    + (back ? P(`M${n(cx - 1.4)} ${n(Y0 + 1.4)}h2.8v1.2h-2.8Z`, "#fbaa08") : P(`M${n(cx - 4.4)} ${n(Y0 + 2.6)}L${n(cx - 7.2)} ${n(Y0 + 2.9)}Q${n(cx - 7)} ${n(Y0 + 1.8)} ${n(cx - 4)} ${n(Y0 + 1.6)}Z`, "#0e2460") + E(cx - 0.8, Y0 + 0.4, 0.9, 0.8, "#fbaa08", true));
  if (hat === "beanie") return P(`M${n(cx - 4.5)} ${n(Y0 + 3)}Q${n(cx - 4.8)} ${n(Yt - 1.4)} ${n(cx)} ${n(Yt - 1.4)}Q${n(cx + 4.8)} ${n(Yt - 1.4)} ${n(cx + 4.5)} ${n(Y0 + 3)}Z`, "#ff6b6b")
    + P(`M${n(cx - 4.6)} ${n(Y0 + 1.6)}L${n(cx + 4.6)} ${n(Y0 + 1.6)}L${n(cx + 4.6)} ${n(Y0 + 3.2)}L${n(cx - 4.6)} ${n(Y0 + 3.2)}Z`, "#c92a2a") + E(cx, Yt - 1.8, 1.2, 1.1, "#f7f7f7");
  if (hat === "party") return P(`M${n(cx - 2.8)} ${n(Y0 + 0.2)}L${n(cx + 0.2)} ${n(Yt - 6)}L${n(cx + 2.8)} ${n(Y0 + 0.2)}Z`, "#b48cff") + E(cx - 0.8, Yt - 1.6, 0.4, 0.4, "#fbaa08", false) + E(cx + 0.8, Yt - 0.4, 0.4, 0.4, "#51cf66", false) + E(cx - 0.2, Yt - 3.4, 0.35, 0.35, "#ff6b6b", false) + E(cx + 0.2, Yt - 6.2, 0.8, 0.8, "#fbaa08");
  if (hat === "crown") return P(`M${n(cx - 3.2)} ${n(Y0 + 0.6)}L${n(cx - 3.2)} ${n(Yt - 2.6)}L${n(cx - 1.6)} ${n(Yt - 0.8)}L${n(cx)} ${n(Yt - 3.4)}L${n(cx + 1.6)} ${n(Yt - 0.8)}L${n(cx + 3.2)} ${n(Yt - 2.6)}L${n(cx + 3.2)} ${n(Y0 + 0.6)}Z`, "#fbaa08") + E(cx, Y0 - 0.2, 0.55, 0.55, "#ff4d5e") + E(cx - 2, Y0, 0.35, 0.35, "#3bc4ff", false) + E(cx + 2, Y0, 0.35, 0.35, "#51cf66", false);
  if (hat === "straw") return E(cx, Y0 + 0.4, 6.6, 1.5, "#e2c27a") + P(`M${n(cx - 3.4)} ${n(Y0 + 0.4)}L${n(cx - 3)} ${n(Yt - 2.4)}Q${n(cx)} ${n(Yt - 3.2)} ${n(cx + 3)} ${n(Yt - 2.4)}L${n(cx + 3.4)} ${n(Y0 + 0.4)}Z`, "#d9b86a") + P(`M${n(cx - 3.3)} ${n(Y0 - 0.6)}h6.6v1.1h-6.6Z`, "#e8402a");
  if (hat === "kasa") return P(`M${n(cx - 7.4)} ${n(Y0 + 1.8)}L${n(cx)} ${n(Yt - 4.4)}L${n(cx + 7.4)} ${n(Y0 + 1.8)}Q${n(cx)} ${n(Y0 + 2.8)} ${n(cx - 7.4)} ${n(Y0 + 1.8)}Z`, "#d9b86a") + [-4, -1.4, 1.4, 4].map(x => S([[cx, Yt - 4], [cx + x, Y0 + 2]], "#a8884a", 0.22)).join("")
    + (back ? "" : S([[cx - 2.6, Y0 + 2.2], [cx - 1.4, r.head.Yc - 0.2]], "#8a6a2a", 0.3) + S([[cx + 2.4, Y0 + 2.2], [cx + 1.2, r.head.Yc - 0.2]], "#8a6a2a", 0.3));
  if (hat === "hachimaki") return P(`M${n(cx - 4.3)} ${n(Y0 + 1.4)}Q${n(cx)} ${n(Y0 + 0.6)} ${n(cx + 4.2)} ${n(Y0 + 1.4)}L${n(cx + 4.2)} ${n(Y0 + 2.8)}Q${n(cx)} ${n(Y0 + 2)} ${n(cx - 4.3)} ${n(Y0 + 2.8)}Z`, "#f4f2ea")
    + (back ? P(`M${n(cx - 0.4)} ${n(Y0 + 2)}l-1.2 3 1 .2 .8 -2.6 .8 2.8 1 -.3 -1.2 -3.2Z`, "#f4f2ea") : E(cx - 1.4, Y0 + 1.7, 0.6, 0.6, "#d8302a", false));
  if (hat === "tricorne") return P(`M${n(cx - 5.6)} ${n(Y0 + 1)}Q${n(cx)} ${n(Y0 + 2.6)} ${n(cx + 5.6)} ${n(Y0 + 1)}L${n(cx + 4.4)} ${n(Yt - 2.8)}Q${n(cx)} ${n(Yt - 1.2)} ${n(cx - 4.4)} ${n(Yt - 2.8)}Z`, "#1c1c24")
    + F(`M${n(cx - 5.4)} ${n(Y0 + 1)}Q${n(cx)} ${n(Y0 + 2.4)} ${n(cx + 5.4)} ${n(Y0 + 1)}`, "none", ' stroke="#c9a040" stroke-width=".45"') + (back ? "" : E(cx - 0.6, Y0 - 0.6, 0.75, 0.65, "#f4f2ea") + E(cx - 0.85, Y0 - 0.7, 0.15, 0.15, INK, false) + E(cx - 0.35, Y0 - 0.7, 0.15, 0.15, INK, false));
  if (hat === "tophat") return E(cx, Y0 + 0.4, 5, 1.1, "#14141a") + P(`M${n(cx - 3)} ${n(Y0 + 0.4)}L${n(cx - 3)} ${n(Yt - 5.8)}Q${n(cx)} ${n(Yt - 6.6)} ${n(cx + 3)} ${n(Yt - 5.8)}L${n(cx + 3)} ${n(Y0 + 0.4)}Z`, "#1c1c24") + P(`M${n(cx - 3)} ${n(Y0 - 1.4)}h6v1.2h-6Z`, "#8f1f2a");
  if (hat === "fedora") return E(cx, Y0 + 0.6, 5.6, 1.2, "#4a3826") + P(`M${n(cx - 3.2)} ${n(Y0 + 0.6)}L${n(cx - 3)} ${n(Yt - 2.4)}Q${n(cx)} ${n(Yt - 1.4)} ${n(cx + 3)} ${n(Yt - 2.4)}L${n(cx + 3.2)} ${n(Y0 + 0.6)}Z`, "#5c4632") + P(`M${n(cx - 3.2)} ${n(Y0 - 0.6)}h6.4v1h-6.4Z`, "#1c1c24");
  if (hat === "vr") return P(`M${n(cx - 4.6)} ${n(Y0 + 3.6)}h${back ? 9 : 8.6}v3.2h-${back ? 9 : 8.6}Z`, "#1c1c22") + (back ? "" : P(`M${n(cx - 4)} ${n(Y0 + 4.2)}h7.4v2h-7.4Z`, "#3bc4ff") + F(`M${n(cx - 3.6)} ${n(Y0 + 4.5)}h2`, "none", ' stroke="#e8f8ff" stroke-width=".4"')) + S([[cx - 4, Y0 + 3.6], [cx, Yt], [cx + 4, Y0 + 3.6]], "#2a2a33", 0.6);
  if (hat === "helmet") return E(cx, Y0 + 4.4, 6, 6.2, "#bfe9ff", true, ' fill-opacity=".28"') + F(`M${n(cx - 4)} ${n(Y0 + 1.6)}q1.4 -2.4 4.2 -2.8`, "none", ' stroke="#ffffff" stroke-opacity=".7" stroke-width=".6" stroke-linecap="round"') + P(`M${n(cx - 4.4)} ${n(r.head.Yc + 0.2)}h8.8v1.2h-8.8Z`, "#c9d2dc");
  if (hat === "visor") return back ? S([[cx - 4.1, Y0 + 4.8], [cx + 4, Y0 + 4.8]], "#2a3340", 0.8) : P(`M${n(cx - 4.4)} ${n(Y0 + 4.2)}h8.4v2.2h-8.4Z`, "#00e5ff") + F(`M${n(cx - 4)} ${n(Y0 + 4.6)}h7.4`, "none", ' stroke="#e8ffff" stroke-width=".5"');
  if (hat === "wizard") return E(cx, Y0 + 0.6, 6, 1.3, "#2a2350") + P(`M${n(cx - 3.4)} ${n(Y0 + 0.6)}L${n(cx + 0.6)} ${n(Yt - 7.4)}Q${n(cx + 2.8)} ${n(Yt - 9.2)} ${n(cx + 4.6)} ${n(Yt - 7.8)}Q${n(cx + 2.6)} ${n(Yt - 7.8)} ${n(cx + 2.2)} ${n(Yt - 6)}L${n(cx + 3.4)} ${n(Y0 + 0.6)}Z`, "#2a2350")
    + P(`M${n(cx - 3.2)} ${n(Y0 - 0.6)}h6.4v1.1h-6.4Z`, "#d4a640") + (back ? "" : P(`M${n(cx - 0.2)} ${n(Yt - 3.6)}l.4 1 1 .1 -.8 .6 .3 1 -.9 -.6 -.9 .6 .3 -1 -.8 -.6 1 -.1Z`, "#ffe14d"));
  if (hat === "headset") return S([[cx - 4.3, Y0 + 4.6], [cx - 4.2, Y0 + 0.4], [cx, Yt - 0.4], [cx + 4.1, Y0 + 0.4], [cx + 4.2, Y0 + 4.6]], "#2a2a33", 0.7) + E(cx + 4.1 * (back ? -1 : 1), Y0 + 5, 1, 1.4, "#2a2a33")
    + (back ? "" : S([[cx + 4, Y0 + 6], [cx + 1.6, r.head.Yc - 0.6], [cx - 0.4, r.head.Yc - 0.8]], "#2a2a33", 0.35) + E(cx - 0.6, r.head.Yc - 0.8, 0.4, 0.4, "#ff6b6b", false));
  return "";
}

/* ---------- held things (at the near hand) ---------- */
function held(h, p, f, mirrorText) {
  const [x, y] = p;
  if (h === "cup") return P(`M${n(x - 1.1)} ${n(y - 2.6)}h2.2l-.2 2.6h-1.8Z`, "#f4f2ea") + E(x, y - 2.6, 1.1, 0.35, "#5a3a22") + F(`M${n(x - 1)} ${n(y - 1.4)}h2`, "none", ' stroke="#d6a77f" stroke-width=".6"') + S([[x + 1.1, y - 2.1], [x + 1.8, y - 1.6], [x + 1, y - 0.9]], INK, 0.3);
  if (h === "sip") return P(`M${n(x - 1.6)} ${n(y - 1.2)}l2 -1.1 1.2 2 -1.8 1.1Z`, "#f4f2ea") + F(`M${n(x - 1.2)} ${n(y - 0.4)}l1.8 -1`, "none", ' stroke="#d6a77f" stroke-width=".5"');
  if (h === "mic") return S([[x, y], [x + 0.3, y + 2.4]], "#2b2b33", 0.9) + E(x - 0.1, y - 0.6, 0.85, 0.85, "#9aa0ad");
  if (h === "papers") return P(`M${n(x - 3)} ${n(y - 1.4)}l3.8 -.8 .8 3.6 -3.8 .8Z`, "#f4f2ea") + [0.6, 1.4, 2.2].map(k => S([[x - 2.4, y - 0.8 + k * 0.8], [x + 0.4, y - 1.4 + k * 0.8]], "#9aa0ad", 0.25)).join("") + P(`M${n(x - 2.8)} ${n(y - 1.2)}h1.6v1.6h-1.6Z`, "#fff7b8");
  if (h === "ticket") return P(`M${n(x - 2.2)} ${n(y - 2.4)}h3v3h-3Z`, "#fff7b8") + S([[x - 1.6, y - 1.6], [x + 0.2, y - 1.6]], "#c9a24b", 0.3) + S([[x - 1.6, y - 0.8], [x - 0.4, y - 0.8]], "#c9a24b", 0.3);
  if (h === "plate") return E(x - 0.6, y - 0.6, 2.6, 0.8, "#f4f2ea") + E(x - 0.6, y - 1.2, 1.2, 0.6, "#e0a040") + E(x - 0.9, y - 1.5, 0.4, 0.25, "#d64545", false);
  if (h === "bag") return P(`M${n(x - 1.6)} ${n(y + 0.4)}Q${n(x - 2.6)} ${n(y + 4)} ${n(x - 1.4)} ${n(y + 5.4)}h3Q${n(x + 2.6)} ${n(y + 4)} ${n(x + 1.4)} ${n(y + 0.4)}Z`, "#1f2329") + S([[x - 0.4, y - 0.2], [x + 0.4, y + 0.6]], "#1f2329", 0.6);
  if (h === "can") return P(`M${n(x - 1.4)} ${n(y + 0.8)}h2.8v3h-2.8Z`, "#3f9e5a") + S([[x - 1.4, y + 2.6], [x - 3.4, y + 1.2]], "#3f9e5a", 0.7) + S([[x - 0.8, y + 0.8], [x, y - 0.2], [x + 0.8, y + 0.8]], "#2f7a45", 0.4);
  if (h === "pour") return P(`M${n(x - 1.6)} ${n(y - 1.8)}l2.6 -.6 .6 2.6 -2.6 .6Z`, "#3f9e5a") + S([[x - 1.4, y - 0.4], [x - 3.8, y + 0.4]], "#3f9e5a", 0.7) + [0, 1, 2].map(k => E(x - 4 - k * 0.2, y + 1.2 + ((f + k) % 3) * 0.9, 0.18, 0.3, "#8ec5ff", false)).join("");
  if (h === "paddle") return S([[x, y], [x - 0.8, y - 1.4]], "#8a6a4a", 0.7) + E(x - 1.8, y - 2.8, 1.6, 1.7, "#d64545") + E(x - 2.2, y - 3.2, 0.6, 0.6, "#e85555", false);
  if (h === "pint") return P(`M${n(x - 1.1)} ${n(y - 3.4)}h2.2l-.15 3.6h-1.9Z`, "#f2b632") + P(`M${n(x - 1.15)} ${n(y - 4.2)}h2.3v.9h-2.3Z`, "#fffaf0") + F(`M${n(x - 0.6)} ${n(y - 3)}v2.4`, "none", ' stroke="#f7d880" stroke-width=".35"');
  if (h === "cocktail") return S([[x, y], [x, y - 1.4]], "#dfeaf2", 0.35) + P(`M${n(x - 1.4)} ${n(y - 3.4)}h2.8l-1.4 2Z`, "#ff7aa8") + S([[x + 0.4, y - 3.2], [x + 1.4, y - 4.8]], "#8a6a4a", 0.25) + P(`M${n(x + 0.6)} ${n(y - 4.8)}q.8 -.9 1.6 0Z`, "#fbaa08");
  if (h === "tray") return P(`M${n(x - 4)} ${n(y - 0.6)}h7.8l-.6 1h-6.6Z`, "#8a6a4a") + [-2.6, -0.4, 1.8].map(k => P(`M${n(x + k - 0.7)} ${n(y - 2.2)}h1.4v1.6h-1.4Z`, "#f4f2ea")).join("");
  if (h === "book") return P(`M${n(x - 3.6)} ${n(y - 1.4)}L${n(x)} ${n(y - 0.6)}L${n(x + 3)} ${n(y - 1.6)}L${n(x + 3)} ${n(y + 0.4)}L${n(x)} ${n(y + 1.2)}L${n(x - 3.6)} ${n(y + 0.4)}Z`, "#c0392b") + P(`M${n(x - 3.2)} ${n(y - 1.2)}L${n(x)} ${n(y - 0.5)}L${n(x + 2.6)} ${n(y - 1.4)}L${n(x + 2.6)} ${n(y)}L${n(x)} ${n(y + 0.8)}L${n(x - 3.2)} ${n(y)}Z`, "#f4f2ea");
  return "";
}


// a woman's chest under her clothes: the shade under it, a light on it (in the body space)
function bust({ T }, c) {
  const y = T + 3.4, soft = (x, rx) => E(x, y + 0.2, rx, 0.45, shade(c, 0.55), false, ' fill-opacity=".16"') + E(x - 0.2, y - 0.75, rx * 0.85, 0.65, "#ffffff", false, ' fill-opacity=".07"');
  return soft(-1.75, 1.1) + soft(1.3, 1);
}

/* ---------- the whole person ---------- */
export function personSvg(s, { view = "front", mirror = false } = {}) {
  DEFS = [];
  const back = view === "back", L = s.look || {}, r = rig(s, back);
  const outfit = L.outfit || (s.tux ? "tux" : "tshirt"), dark = outfit === "tux";
  const c = { outfit, shirt: dark ? (L.outfit ? L.shirt : "#1c1c24") : L.shirt || "#4a7ad0", skin: L.skin || "#f1c27d", hair: L.hair || "#3a2a1e", pants: outfit === "flight" ? (L.shirt || "#e6e8ee") : L.pants || "#2f3550", shoes: L.shoes || "#17141c", tie: L.tie || "#d64545" };
  const st = L.style || 0, { T, H, head } = r, long = LONG.has(outfit), sleeve = SHORT.has(outfit) ? "short" : "long", wide = WIDE.has(outfit);
  // the head space: the head drawn 8 wide, 8.9 tall, its top at 0, then scaled onto the figure
  const hr = { T: (T - head.Y0) / HY, H: (H - head.Y0) / HY, head: { cx: 0, Y0: 0, Yc: 8.9 } };
  const inHead = x => `<g transform="translate(${n(head.cx)} ${n(head.Y0)}) scale(${HX} ${HY})">${x}</g>`;
  const inBody = x => `<g transform="scale(${BX} 1)">${x}</g>`;
  let g = "";
  // an arm: the upper arm in the sleeve (a short one: the forearm bare), the forearm, the hand
  const arm = (a, only = false) => {
    let x = "";
    const path = only ? [a.sh, a.el] : [a.sh, a.el, a.ha];
    if (sleeve === "short") x += limb(path, c.skin, only ? [1.25, 1.1] : [1.25, 1.1, 0.9], { caps: [true, false] }) + limb([a.sh, pt(a.sh, a.el, 0.55)], c.shirt, [1.75, 1.55], { caps: [true, false] });
    else x += limb(path, c.shirt, only ? [1.7, 1.45] : wide ? [2, 2.1, 2.3] : [1.7, 1.45, 1.2], { caps: [true, false] });
    if (only) return x;
    const [hx, hy] = a.ha, d = Math.atan2(hy - a.el[1], hx - a.el[0]), hcx = hx + Math.cos(d) * 0.3, hcy = hy + Math.sin(d) * 0.3;
    return x + E(hcx, hcy, 0.58, 0.68, rad(hcx - 0.25, hcy - 0.25, 0.9, [[0, shade(c.skin, 1.1)], [1, shade(c.skin, 0.8)]]), false);
  };
  const [farArm, nearArm] = r.arms;
  const capeLo = r.seated ? H + 2.4 : -2.4;
  /* behind the body */
  if (outfit === "vampire") {  // the cape: behind from the front, all over the back from behind (later); its high collar
    if (!back) g += P(`M-3.2 ${n(T + 0.3)}L3.2 ${n(T + 0.3)}L4.4 ${n(capeLo)}L-4.6 ${n(capeLo)}Z`, "#14141a") + F(`M-4.6 ${n(capeLo)}L-3.2 ${n(T + 0.3)}L-2.6 ${n(T + 0.5)}L-3.8 ${n(capeLo)}Z`, c.tie);
    g += P(`M${n(head.cx - 2.4)} ${n(T + 0.4)}L${n(head.cx - 3.2)} ${n(head.Y0 + 2.6)}L${n(head.cx - 0.6)} ${n(T - 0.5)}L${n(head.cx + 0.8)} ${n(T - 0.5)}L${n(head.cx + 3.2)} ${n(head.Y0 + 2.6)}L${n(head.cx + 2.6)} ${n(T + 0.4)}Z`, back ? "#14141a" : c.tie);
  }
  if (L.jetpack && !back) g += P(`M-3.6 ${n(T + 1.2)}h1.6v5.6h-1.6Z`, "#9aa6b4") + P(`M2 ${n(T + 1.2)}h1.6v5.6h-1.6Z`, "#9aa6b4");
  if (L.katana) g += S([[back ? 4 : -4.4, H + 1.8], [back ? -2 : 2.2, H - 2.4]], "#1c1c24", 0.7);
  if (!back) g += inHead(hairBack(c.hair, st, hr));
  // the legs (far first), the hips, the shoes
  const legC = long ? shade(c.shirt, 0.9) : c.pants;
  if (!long) {
    const trousers = lin(-2.7, 0, 2.7, 0, [[0, shade(legC, 1.12)], [0.42, legC], [1, shade(legC, 0.72)]]);
    for (const leg of r.legs) if (!leg.hidden) g += limb([[leg.hip[0], H + 0.4], leg.knee, leg.ankle], legC, [2.3, 1.75, 1.3], { fill: trousers, caps: [false, false] });
    const hw = r.fem ? 1.12 : 1;
    g += F(`M${n(-2.5 * hw)} ${n(H - 0.1)}L${n(2.4 * hw)} ${n(H - 0.1)}L${n(2.3 * hw)} ${n(H + 1.3)}Q1.2 ${n(H + 2.4)} 0 ${n(H + 2.1)}Q-1.2 ${n(H + 2.4)} ${n(-2.4 * hw)} ${n(H + 1.3)}Z`, trousers);
  }
  for (const leg of r.legs) if (!leg.hidden) g += shoe(leg.foot, leg.lift, c.shoes);
  if (long) {  // a robe, a kimono: down to the ankles, the walk moving its hem
    const sw = r.ph == null ? 0 : Math.sin(r.ph) * 0.8, lo = r.seated ? H + 2.8 : -1;
    g += P(`M-2.6 ${n(H)}L2.5 ${n(H)}L${n(3.3 + sw)} ${n(lo)}L${n(-3.5 + sw)} ${n(lo)}Z`, lin(-3.4, 0, 3.3, 0, across(c.shirt)))
      + F(`M-2.2 ${n(H)}L${n(-3 + sw)} ${n(lo)}`, "none", ` stroke="${shade(c.shirt, 1.15)}" stroke-width=".35"`);
    if (!back) g += F(`M-0.2 ${n(H)}L${n(-0.4 + sw)} ${n(lo)}`, "none", ` stroke="${c.tie}" stroke-width="${outfit === "kimono" ? 0.3 : 0.5}"`);
  }
  if (outfit === "pirate" && !r.seated) {  // the coat's tails
    if (back) g += P(`M-2.7 ${n(H)}L2.6 ${n(H)}L3 ${n(H + 5)}L-3.1 ${n(H + 5)}Z`, c.shirt) + S([[0, H + 1.2], [0, H + 5]], shade(c.shirt, 0.7), 0.25);
    else g += P(`M-2.7 ${n(H)}L-1 ${n(H)}L-1.5 ${n(H + 5)}L-3.2 ${n(H + 4.8)}Z`, c.shirt) + P(`M0.9 ${n(H)}L2.6 ${n(H)}L3.1 ${n(H + 4.8)}L1.4 ${n(H + 5)}Z`, shade(c.shirt, 0.82));
  }
  // the far arm behind the body (from behind, a hand reaching forward is hidden)
  g += back && farArm.fwd ? arm(farArm, true) : arm(farArm);
  // the body (its clothes painted in the body space), the shading of the chest
  g += inBody(P(torsoPath(r), lin(-4, 0, 4, 0, [[0, shade(c.shirt, 1.12)], [0.45, c.shirt], [1, shade(c.shirt, 0.7)]])) + F(torsoPath(r), lin(0, T, 0, H, [[0, "#ffffff", 0.08], [0.5, "#ffffff", 0], [1, "#000000", 0.12]])) + (back ? outfitBack(s, r, c) : outfitFront(s, r, c) + (r.fem ? bust(r, c.shirt) : "")));
  if (L.jetpack && back) {
    g += P(`M-2.6 ${n(T + 1)}h5.2v6.2h-5.2Z`, "#9aa6b4") + P(`M-1.8 ${n(T + 2)}h3.6v.9h-3.6Z`, "#00e5ff");
    for (const x of [-2, 0.6]) { g += P(`M${x} ${n(T + 7.2)}h1.4v1h-1.4Z`, "#2a3340"); if (r.ph != null) g += F(`M${x + 0.15} ${n(T + 8.2)}l.55 2.4.55 -2.4Z`, "#ff9a3b"); }
  } else if (L.jetpack) g += S([[-2.1, T + 0.4], [-2, T + 5.6]], "#2a3340", 0.5) + S([[1.9, T + 0.4], [1.8, T + 5.6]], "#2a3340", 0.5);
  if (outfit === "vampire" && back) g += P(`M-3.4 ${n(T + 0.2)}L3.4 ${n(T + 0.2)}L4.4 ${n(capeLo)}L-4.6 ${n(capeLo)}Z`, "#14141a") + F(`M3.4 ${n(T + 0.2)}L4.4 ${n(capeLo)}L3.6 ${n(capeLo)}Z`, c.tie);
  if (outfit === "hoodie" && back) g += inBody(P(`M-3 ${n(T - 0.4)}Q-0.2 ${n(T - 1.4)} 2.8 ${n(T - 0.4)}L2.4 ${n(T + 3.6)}Q-0.1 ${n(T + 4.6)} -2.6 ${n(T + 3.6)}Z`, shade(c.shirt, 0.85)));
  // around the neck
  if (L.scarf) {
    const [sa, sb = "#f4f2ea"] = String(L.scarf).split(",");
    g += inBody(P(`M-2.6 ${n(T - 0.6)}Q-0.2 ${n(T + 1.2)} 2.4 ${n(T - 0.6)}L2.4 ${n(T + 0.7)}Q-0.2 ${n(T + 2.4)} -2.6 ${n(T + 0.7)}Z`, sa) + [-1.4, 1].map(x => S([[x, T + 0.1], [x, T + 1.4]], sb, 0.5)).join("")
      + (back ? "" : P(`M-1.4 ${n(T + 1.2)}h1.6v4.6h-1.6Z`, sa) + [2.4, 3.8].map(y => P(`M-1.4 ${n(T + y)}h1.6v.5h-1.6Z`, sb)).join("")));
  }
  if (L.lei) g += [-3, -2, -1, 0, 1, 2, 3].map((x, k) => E(x * 0.7 - 0.1, T + 0.3 + (3 - Math.abs(x)) * (back ? 0.12 : 0.42), 0.5, 0.5, ["#ff6a8a", "#ffd23a", "#ff8a3a", "#f4f2ea"][k % 4], false)).join("");
  // the neck, the head
  g += P(`M${n(head.cx - 0.75)} ${n(head.Yc - 0.6)}h1.5v${n(T - head.Yc + 0.9)}h-1.5Z`, lin(head.cx - 0.75, 0, head.cx + 0.75, 0, [[0, shade(c.skin, 0.95)], [1, shade(c.skin, 0.68)]]));
  const skinFill = rad(back ? 0.6 : -1.4, 2.8, 8, [[0, shade(c.skin, 1.08)], [0.62, c.skin], [1, shade(c.skin, 0.82)]]);
  const ear = x => E(x, 5.2, 0.72, 1.15, lin(x - 0.7, 0, x + 0.7, 0, across(c.skin)), true) + E(x + (x > 0 ? -0.1 : 0.1), 5.25, 0.32, 0.6, shade(c.skin, 0.78), false);
  if (back) g += inHead(P(headPath(hr.head, r.fem), skinFill) + hairFromBehind(c.hair, st, hr) + (COVERS_EAR(st) ? "" : ear(-4)));
  else g += inHead(P(headPath(hr.head, r.fem), skinFill) + face(s, hr) + hairFront(c.hair, st, hr) + (COVERS_EAR(st) ? "" : ear(3.9)));
  g += inHead(hatSvg(s.hat, hr, back));
  if (L.parrot) {  // a red macaw on the shoulder away from us (from behind: the one we see)
    const px = back ? -2.7 : 2.6, py = T - 0.3;
    g += P(`M${n(px - 0.3)} ${n(py)}l-.3 2.8.6 -.3.5.4Z`, "#2a6ad0") + E(px, py - 1, 0.9, 1.4, "#d8332a") + P(`M${n(px + 0.1)} ${n(py - 1.7)}q1 .6 .6 2.2l-.6 .3Z`, "#2a6ad0") + E(px - 0.15, py - 2.6, 0.8, 0.75, "#d8332a")
      + (back ? "" : E(px - 0.45, py - 2.7, 0.35, 0.3, "#f4f2ea", false) + E(px - 0.5, py - 2.7, 0.14, 0.14, INK, false) + P(`M${n(px - 0.85)} ${n(py - 2.85)}q-.7 0 -.6 .8l.6 -.2Z`, "#2a2a30"));
  }
  // the near arm over everything (a hand at the mouth, a tray in front); from behind, forward, only its upper part
  g += back && nearArm.fwd ? arm(nearArm, true) : arm(nearArm);
  const item = (h, p) => { const sc = 0.62; return `<g transform="translate(${n(p[0])} ${n(p[1])}) scale(${sc}) translate(${n(-p[0])} ${n(-p[1])})">${held(h, p, r.f)}</g>`; };
  if (s.hold && !(back && nearArm.fwd)) g += item(s.hold, nearArm.ha);
  else if (s.hold && back && ["tray", "book", "plate", "papers"].includes(s.hold)) g += item(s.hold, [nearArm.el[0] - 1.6, nearArm.el[1] + 1]);
  if (L.wand && !s.hold) {
    const [hx, hy] = nearArm.ha;
    g += s.arms === "up" ? S([[hx, hy], [hx - 0.3, hy - 3.6]], "#5a3a24", 0.4) + E(hx - 0.3, hy - 3.8, 0.35, 0.35, "#fff3b0", false) : r.seated ? "" : S([[hx, hy], [hx - 2.6, hy - 2.2]], "#5a3a24", 0.4) + E(hx - 2.7, hy - 2.3, 0.35, 0.35, "#fff3b0", false);
  }
  const body = `<defs>${DEFS.join("")}</defs><g shape-rendering="geometricPrecision">${g}</g>`;
  DEFS = [];
  return mirror ? `<g transform="scale(-1 1)">${body}</g>` : body;
}
