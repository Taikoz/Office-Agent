// The games of the recent computers, drawn finely (3 pixels per unit of the 160 × 100 game: hd), over the simple ones
// of ui/pcgames.js. Course de nuit (the ultra PC): a night road seen from above with real cars (saloons, small cars,
// SUVs, vans, taxis, police with their lights, lorries) and ours, a red sports car: steer, speed up, brake, its
// headlights on the road, street lamps and buildings going by. Dino du build (the dual screen): a running dinosaur,
// bugs and piles of tickets to jump over, day turning to night. Pong (the all-in-one): neon. Flappy Bug (the
// laptop): a ladybird between pipes, the town behind.

import { PC_GAMES } from "./pcgames.js";
import { sfx } from "../sims/progress.js";

const W = 160, H = 100;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
const rr = (g, x, y, w, h, r, fill) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); };
const glow = (g, x, y, r, color, a = 1) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, "rgba(0,0,0,0)"); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalAlpha = 1; };

/* ---------- Course de nuit ---------- */
const ROAD = { x0: 32, x1: 128 }, LANES = [48, 80, 112];
// the traffic: what kind of car, its size, its colours
const KINDS = [
  { kind: "saloon", w: 11, l: 20, colors: ["#c9ccd6", "#1f2a44", "#7a1f2a", "#e8e6df", "#3c4048", "#2f5d9a"], speed: [0.035, 0.05] },
  { kind: "hatch", w: 10, l: 16, colors: ["#d23a2a", "#f2c14e", "#4a8f5a", "#e8e6df", "#5a6a8a"], speed: [0.03, 0.045] },
  { kind: "suv", w: 12, l: 21, colors: ["#2a2a33", "#8d929c", "#e8e6df", "#3e4a3a"], speed: [0.035, 0.05] },
  { kind: "van", w: 12, l: 24, colors: ["#e8e6df", "#c9ccd6", "#2f5d9a"], speed: [0.03, 0.04] },
  { kind: "taxi", w: 11, l: 20, colors: ["#f2c230"], speed: [0.035, 0.05] },
  { kind: "police", w: 11, l: 20, colors: ["#f4f4f6"], speed: [0.05, 0.06] },
  { kind: "truck", w: 13, l: 34, colors: ["#b8332a", "#2f5d9a", "#e8e6df"], speed: [0.025, 0.035] },
];
// a car from above, its front up, its centre at x, y; t: the time (the police lights)
function drawCar(g, x, y, c, t) {
  const { w, l, kind, color } = c, hw = w / 2, hl = l / 2, sports = kind === "sports";
  g.save(); g.translate(x, y); if (c.tilt) g.rotate(c.tilt);
  rr(g, -hw + 1.2, -hl + 1.6, w, l, 2.5, "rgba(0,0,0,.45)");  // the shadow on the road
  for (const [wx, wy, back] of [[-hw - 1, -hl + l * 0.14, 0], [hw - 0.6, -hl + l * 0.14, 0], [-hw - 1, hl - l * 0.32, 1], [hw - 0.6, hl - l * 0.32, 1]]) {  // the wheels, out of the body
    const tw = sports && back ? 2.2 : 1.6, th = sports && back ? l * 0.2 : l * 0.17;
    rr(g, wx - (sports && back ? (wx < 0 ? 0.6 : 0) : 0), wy, tw, th, 0.5, "#0d0d10"); g.fillStyle = "#3a3a44"; g.fillRect(wx + tw * 0.3 - (sports && back && wx < 0 ? 0.6 : 0), wy + th * 0.4, tw * 0.4, th * 0.2);
  }
  if (kind === "truck") {  // the cab, then the box behind it
    rr(g, -hw, -hl, w, 9, 2, color); rr(g, -hw + 1, -hl + 1.2, w - 2, 3, 1, "#2c3a52");
    rr(g, -hw - 0.3, -hl + 10, w + 0.6, l - 10, 1, "#d9d6cf"); g.fillStyle = "rgba(0,0,0,.08)"; for (let i = 0; i < 5; i++) g.fillRect(-hw, -hl + 12 + i * 4.5, w, 0.5);
    g.fillStyle = color; g.fillRect(-hw - 0.3, -hl + 10, w + 0.6, 2);
  } else {
    const body = g.createLinearGradient(-hw, 0, hw, 0);  // rounded flanks: darker on the sides
    body.addColorStop(0, shade(color, 0.72)); body.addColorStop(0.5, shade(color, 1.12)); body.addColorStop(1, shade(color, 0.72));
    if (sports) {  // a sports car: a pointed nose, the rear wider over the big wheels
      g.beginPath(); g.moveTo(-hw + 2.2, -hl); g.lineTo(hw - 2.2, -hl); g.quadraticCurveTo(hw - 0.4, -hl + 0.4, hw - 0.4, -hl + 4);
      g.lineTo(hw + 0.5, hl - 7); g.quadraticCurveTo(hw + 0.7, hl - 0.6, hw - 1.6, hl); g.lineTo(-hw + 1.6, hl); g.quadraticCurveTo(-hw - 0.7, hl - 0.6, -hw - 0.5, hl - 7);
      g.lineTo(-hw + 0.4, -hl + 4); g.quadraticCurveTo(-hw + 0.4, -hl + 0.4, -hw + 2.2, -hl); g.closePath(); g.fillStyle = body; g.fill();
      g.fillStyle = shade(color, 0.6); g.fillRect(-hw + 0.6, -hl + 6, 0.8, 4); g.fillRect(hw - 1.4, -hl + 6, 0.8, 4);  // side vents
    } else rr(g, -hw, -hl, w, l, kind === "van" || kind === "suv" ? 2 : 3, body);
    const glass = "#26324a", shine = "rgba(180,220,255,.35)";
    const ws = sports ? [-hl + l * 0.36, l * 0.15] : kind === "van" ? [-hl + 2.4, l * 0.14] : [-hl + l * 0.24, l * 0.16];  // the windscreen: y, depth
    g.beginPath(); g.moveTo(-hw + 1.5, ws[0] + ws[1]); g.lineTo(-hw + 2.4, ws[0]); g.lineTo(hw - 2.4, ws[0]); g.lineTo(hw - 1.5, ws[0] + ws[1]); g.closePath(); g.fillStyle = glass; g.fill();
    g.fillStyle = shine; g.fillRect(-hw + 2.6, ws[0] + 0.5, w * 0.3, 0.6);
    const roofY = ws[0] + ws[1], roofL = kind === "van" ? l * 0.62 : sports ? l * 0.22 : kind === "hatch" ? l * 0.3 : l * 0.28;
    if (sports) rr(g, -hw + 2.6, roofY, w - 5.2, roofL, 1.6, shade(color, 0.82));  // a small low cabin
    else rr(g, -hw + 1.6, roofY, w - 3.2, roofL, 1.2, shade(color, kind === "taxi" || kind === "police" ? 0.95 : 0.9));
    if (kind !== "van") { g.fillStyle = glass; if (sports) g.fillRect(-hw + 3, roofY + roofL, w - 6, l * 0.07); else g.fillRect(-hw + 2, roofY + roofL, w - 4, l * 0.1); }  // the rear window
    g.fillStyle = shade(color, 0.6); g.fillRect(-hw - 1, ws[0] - 0.4, 1, 1.2); g.fillRect(hw, ws[0] - 0.4, 1, 1.2);  // mirrors
    if (kind === "suv") { g.fillStyle = "#555"; g.fillRect(-hw + 2, roofY + 1, 0.6, roofL - 2); g.fillRect(hw - 2.6, roofY + 1, 0.6, roofL - 2); }
    if (kind === "taxi") { rr(g, -2.5, roofY + roofL / 2 - 1.2, 5, 2.4, 0.6, "#1c1c22"); g.fillStyle = "#ffe36e"; g.fillRect(-1.8, roofY + roofL / 2 - 0.6, 3.6, 1.2); }
    if (kind === "police") {
      g.fillStyle = "#1f3a8a"; g.fillRect(-hw, -hl + l * 0.12, w, 1.4); g.fillRect(-hw, hl - l * 0.2, w, 1.4);
      const on = Math.floor(t / 160) % 2;
      g.fillStyle = on ? "#ff3b3b" : "#3b6bff"; g.fillRect(-hw + 2, roofY + roofL / 2 - 0.8, hw - 2, 1.6);
      g.fillStyle = on ? "#3b6bff" : "#ff3b3b"; g.fillRect(0, roofY + roofL / 2 - 0.8, hw - 2, 1.6);
      glow(g, on ? -2.5 : 2.5, roofY + roofL / 2, 9, on ? "rgba(255,60,60,.55)" : "rgba(60,110,255,.55)");
    }
    if (sports) {  // a racing car: two stripes, a scoop, a spoiler
      g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(-1.6, -hl + 0.5, 1, l - 1); g.fillRect(0.6, -hl + 0.5, 1, l - 1);
      g.fillStyle = shade(color, 0.55); g.fillRect(-1.5, -hl + l * 0.12, 3, 1.6);
      rr(g, -hw - 0.4, hl - 2.4, w + 0.8, 1.8, 0.6, "#1c1c22"); g.fillStyle = "#555"; g.fillRect(-hw + 1.5, hl - 3.4, 0.6, 1.2); g.fillRect(hw - 2.1, hl - 3.4, 0.6, 1.2);  // the spoiler on its two feet
      g.fillStyle = "#888"; g.fillRect(-1.6, hl - 0.2, 1, 0.8); g.fillRect(0.6, hl - 0.2, 1, 0.8);  // the exhausts
    }
  }
  g.fillStyle = "#fff6c8"; g.fillRect(-hw + 0.8, -hl + 0.3, 2.2, 1.1); g.fillRect(hw - 3, -hl + 0.3, 2.2, 1.1);  // headlights
  g.fillStyle = c.braking ? "#ff4040" : "#c02020"; g.fillRect(-hw + 0.8, hl - 1.2, 2.2, 0.9); g.fillRect(hw - 3, hl - 1.2, 2.2, 0.9);  // tail lights
  glow(g, -hw + 1.9, hl - 0.8, c.braking ? 6 : 3.5, "rgba(255,40,40,.7)"); glow(g, hw - 1.9, hl - 0.8, c.braking ? 6 : 3.5, "rgba(255,40,40,.7)");
  g.restore();
}
// the buildings, trees and lamps along the road: drawn once, then they scroll
function scenery() {
  const items = [];
  for (let i = 0; i < 12; i++) items.push({ y: i * 18, side: i % 2, kind: pick(["house", "tower", "tree", "tree", "shop"]), seed: Math.random() });
  return items;
}
function drawSide(g, it, y) {
  const left = it.side === 0, x = left ? 2 : 133, w = 25;
  if (it.kind === "tree") { g.fillStyle = "#0c2416"; g.beginPath(); g.arc(x + 12, y + 8, 7, 0, 7); g.fill(); g.fillStyle = "#123420"; g.beginPath(); g.arc(x + 10, y + 6, 4, 0, 7); g.fill(); return; }
  const h = it.kind === "tower" ? 16 : 12;
  g.fillStyle = it.kind === "shop" ? "#1a1f33" : "#151a2b"; g.fillRect(x, y, w, h);
  g.fillStyle = "#0e1220"; g.fillRect(x, y, w, 1.5);
  for (let r = 0; r < (it.kind === "tower" ? 4 : 3); r++) for (let k = 0; k < 4; k++) if ((it.seed * 97 + r * 13 + k * 7) % 3 > 1.1) { g.fillStyle = (r + k) % 3 ? "#f2d27b" : "#9fd0ff"; g.fillRect(x + 2.5 + k * 5.5, y + 3 + r * 3.4, 2.5, 1.8); }
  if (it.kind === "shop") { g.fillStyle = "#ff4fb8"; g.fillRect(x + 4, y + h - 3, w - 8, 1); glow(g, x + w / 2, y + h - 2.5, 8, "rgba(255,79,184,.35)"); }
}
Object.assign(PC_GAMES.racer, {
  name: "Course de nuit", hd: true, bg: "#0b0e18", keys: "← → pour tourner · ↑ accélérer · ↓ freiner · évite le trafic",
  init: () => ({ x: 80, vx: 0, speed: 0.06, cars: [], side: scenery(), t: 900, off: 0, score: 0, dist: 0, time: 0, crash: null, shake: 0 }),
  step(s, dt, k) {
    s.time += dt;
    if (s.crash) { s.crash.t += dt; if (s.crash.t > 900) s.over = true; return; }
    // steering: a little inertia, the car leans into the turn; off the road: slower, it shakes
    const steer = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0);
    s.vx += (steer * 0.075 - s.vx) * Math.min(1, dt / 120);
    s.x = Math.max(ROAD.x0 - 6, Math.min(ROAD.x1 + 6, s.x + s.vx * dt));
    const off = s.x < ROAD.x0 + 5 || s.x > ROAD.x1 - 5;
    const top = off ? 0.06 : 0.16, want = k.ArrowUp ? top : k.ArrowDown ? 0.03 : Math.min(top, 0.06 + s.dist / 60000);
    s.speed += (want - s.speed) * Math.min(1, dt / (k.ArrowDown ? 250 : 900));
    s.braking = !!k.ArrowDown; s.shake = off ? 0.6 : s.speed > 0.13 ? 0.25 : 0;
    s.off = (s.off + s.speed * dt) % 12; s.dist += s.speed * dt; s.score = Math.floor(s.dist / 10);
    for (const it of s.side) { it.y += s.speed * dt * 0.9; if (it.y > H + 2) { it.y -= 12 * 18; it.kind = pick(["house", "tower", "tree", "tree", "shop"]); it.seed = Math.random(); } }
    // the traffic: slower cars in the three lanes, coming down toward us; never two at the same height
    s.t -= dt * (s.speed / 0.08);
    if (s.t <= 0) {
      s.t = rnd(500, 1000);
      const kd = pick(KINDS), lane = Math.floor(rnd(0, 3));
      if (!s.cars.some(c => c.y < kd.l + 8)) s.cars.push({ ...kd, color: pick(kd.colors), x: LANES[lane] + rnd(-2, 2), y: -kd.l, v: rnd(...kd.speed), braking: false });
    }
    for (const c of s.cars) { c.y += (s.speed - c.v) * dt; c.braking = Math.sin(s.time / 900 + c.x) > 0.85; }
    s.cars = s.cars.filter(c => c.y < H + 40 && c.y > -60);
    const me = { x: s.x - 6, y: 70, w: 12, h: 20 };
    const hitCar = s.cars.find(c => me.x < c.x + c.w / 2 - 0.5 && c.x - c.w / 2 + 0.5 < me.x + me.w && me.y < c.y + c.l / 2 - 0.5 && c.y - c.l / 2 + 0.5 < me.y + me.h);
    if (hitCar) { s.crash = { t: 0, x: s.x, y: 72 }; sfx("fail"); }
  },
  draw(g, s) {
    const t = s.time, sh = s.shake ? (Math.random() - 0.5) * s.shake : 0;
    g.save(); g.translate(sh, 0);
    g.fillStyle = "#0a1410"; g.fillRect(0, 0, ROAD.x0 - 2, H); g.fillRect(ROAD.x1 + 2, 0, W, H);  // the verges
    g.fillStyle = "#3a3d46"; g.fillRect(ROAD.x0 - 6, 0, 4, H); g.fillRect(ROAD.x1 + 2, 0, 4, H);  // the pavements
    for (const it of s.side) drawSide(g, it, it.y - 18);
    const road = g.createLinearGradient(ROAD.x0, 0, ROAD.x1, 0); road.addColorStop(0, "#1b1d24"); road.addColorStop(0.5, "#24262e"); road.addColorStop(1, "#1b1d24");
    g.fillStyle = road; g.fillRect(ROAD.x0, 0, ROAD.x1 - ROAD.x0, H);
    for (let y = -12 + s.off; y < H; y += 6) { g.fillStyle = Math.floor((y - s.off) / 6) % 2 ? "#d23a2a" : "#e8e6df"; g.fillRect(ROAD.x0 - 2, y, 2, 6); g.fillRect(ROAD.x1, y, 2, 6); }  // kerbs
    g.fillStyle = "#e8e6df"; for (let y = -12 + s.off; y < H; y += 12) { g.fillRect(63.5, y, 1, 6); g.fillRect(95.5, y, 1, 6); }  // the lanes
    for (let y = -24 + (s.off * 2) % 24; y < H; y += 24) { glow(g, ROAD.x0 + 2, y, 16, "rgba(255,214,140,.16)"); glow(g, ROAD.x1 - 2, y + 12, 16, "rgba(255,214,140,.16)"); }  // the lamps' light
    // our headlights on the road, before the cars (they light them)
    g.save(); g.globalCompositeOperation = "lighter";
    const beam = g.createLinearGradient(0, 70, 0, 20); beam.addColorStop(0, "rgba(255,240,190,.35)"); beam.addColorStop(1, "rgba(255,240,190,0)");
    g.fillStyle = beam; g.beginPath(); g.moveTo(s.x - 5, 70); g.lineTo(s.x - 18 + s.vx * 60, 18); g.lineTo(s.x + 18 + s.vx * 60, 18); g.lineTo(s.x + 5, 70); g.fill();
    g.restore();
    for (const c of s.cars) drawCar(g, c.x, c.y, c, t);
    const me = { kind: "sports", w: 12, l: 20, color: "#d4121e", tilt: s.vx * 2.2, braking: s.braking };
    if (!s.crash) {
      drawCar(g, s.x, 80, me, t);
      if (s.speed > 0.12) { g.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 6; i++) g.fillRect(rnd(ROAD.x0, ROAD.x1), rnd(0, H), 0.4, rnd(4, 10)); }  // speed lines
    } else {  // the crash: the car spun, smoke, sparks
      const k = s.crash.t / 900;
      drawCar(g, s.crash.x, 80, { ...me, tilt: k * 2.4 }, t);
      for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(255,${180 + i * 8},60,${1 - k})`; g.fillRect(s.crash.x + Math.cos(i) * k * 14, 72 + Math.sin(i * 1.7) * k * 10, 1, 1); }
      g.globalAlpha = 0.5 * (1 - k); g.fillStyle = "#aaa"; g.beginPath(); g.arc(s.crash.x, 74 - k * 8, 3 + k * 8, 0, 7); g.fill(); g.globalAlpha = 1;
    }
    g.restore();
    // the speedometer
    const kmh = Math.round(s.speed * 1500);
    g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(14, 88, 11, Math.PI, 0); g.fill();
    g.strokeStyle = "#fbaa08"; g.lineWidth = 1; g.beginPath(); g.arc(14, 88, 9, Math.PI, Math.PI + Math.PI * Math.min(1, kmh / 260)); g.stroke();
    g.fillStyle = "#fff"; g.font = "bold 5px monospace"; g.textAlign = "center"; g.fillText(String(kmh), 14, 87); g.font = "3px monospace"; g.fillText("km/h", 14, 91); g.textAlign = "left";
  },
});

/* ---------- Dino du build ---------- */
function drawDino(g, x, y, run, t, dead) {
  const P = (px, py, w, h, c) => { g.fillStyle = c; g.fillRect(x + px, y + py, w, h); };
  const body = dead ? "#8a8a96" : "#4a9a5a", dark = dead ? "#6a6a74" : "#357a44";
  P(4, 0, 7, 5, body); P(9, 1, 1.2, 1.2, dead ? "#1c1c22" : "#fff"); P(9.4, 1.4, 0.6, 0.6, "#1c1c22");  // the head, the eye
  P(4, 3.6, 7, 1, dark); P(8, 4.6, 3, 0.8, body);  // the mouth
  P(0, 5, 8, 6, body); P(-2, 6, 2.4, 2, body); P(-3.5, 5.4, 1.6, 1.4, body);  // the body, the tail
  P(6.5, 6.5, 2.4, 1, dark);  // the little arm
  const f = run ? Math.floor(t / 90) % 2 : 0;
  P(1, 11, 2, f ? 2 : 3, dark); P(5, 11, 2, f ? 3 : 2, dark); P(f ? 0.5 : 1, f ? 13 : 14, 3, 1, dark); P(f ? 5 : 4.5, f ? 14 : 13, 3, 1, dark);  // the legs running
}
Object.assign(PC_GAMES.runner, {
  hd: true, keys: "Espace ou ↑ pour sauter · saute les bugs et les piles de tickets",
  init: () => ({ y: 0, vy: 0, obs: [], t: 900, speed: 0.08, score: 0, dist: 0, time: 0, clouds: [0, 1, 2].map(i => ({ x: i * 60 + rnd(0, 30), y: rnd(8, 30) })) }),
  step(s, dt, k, pressed) {
    s.time += dt;
    if ((pressed[" "] || pressed.ArrowUp) && s.y === 0) { s.vy = 0.21; sfx("commit"); }
    s.vy -= 0.00075 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) s.vy = 0;
    s.t -= dt; s.speed += dt * 0.000004; s.dist += s.speed * dt; s.score = Math.floor(s.dist / 10);
    if (s.t <= 0) { s.t = rnd(750, 1500); const bug = Math.random() < 0.55; s.obs.push(bug ? { x: W, w: 8, h: 6, kind: "bug" } : { x: W, w: 7, h: rnd(8, 13), kind: "tickets" }); }
    for (const o of s.obs) o.x -= s.speed * dt; s.obs = s.obs.filter(o => o.x > -12);
    for (const c of s.clouds) { c.x -= s.speed * dt * 0.2; if (c.x < -20) { c.x = W + rnd(0, 30); c.y = rnd(8, 30); } }
    const me = { x: 21, y: 80 - s.y - 13, w: 9, h: 13 };
    if (s.obs.some(o => me.x < o.x + o.w - 1 && o.x + 1 < me.x + me.w && me.y < 80 && 80 - o.h + 1 < me.y + me.h)) s.over = true;
  },
  draw(g, s) {
    const night = Math.min(1, Math.max(0, (s.score - 300) / 200)), t = s.time;  // after 300: dusk, then night
    const sky = g.createLinearGradient(0, 0, 0, 80); sky.addColorStop(0, night > 0.5 ? "#141a33" : "#9fd0ff"); sky.addColorStop(1, night > 0.5 ? "#2a3060" : "#f4f2ea");
    g.fillStyle = sky; g.fillRect(0, 0, W, 80);
    if (night > 0.5) { g.fillStyle = "#fff"; for (let i = 0; i < 20; i++) g.fillRect((i * 37) % W, (i * 23) % 50, 0.6, 0.6); g.fillStyle = "#f4f2ea"; g.beginPath(); g.arc(130, 16, 5, 0, 7); g.fill(); }
    else { glow(g, 130, 16, 14, "rgba(255,220,120,.6)"); g.fillStyle = "#ffd54a"; g.beginPath(); g.arc(130, 16, 5, 0, 7); g.fill(); }
    for (const c of s.clouds) { g.fillStyle = night > 0.5 ? "rgba(200,210,255,.25)" : "rgba(255,255,255,.9)"; g.beginPath(); g.arc(c.x, c.y, 4, 0, 7); g.arc(c.x + 5, c.y - 2, 5, 0, 7); g.arc(c.x + 10, c.y, 4, 0, 7); g.fill(); }
    g.fillStyle = night > 0.5 ? "#3a3a52" : "#c9b48a"; g.fillRect(0, 80, W, 20); g.fillStyle = night > 0.5 ? "#2a2a40" : "#a8936a";
    for (let x = -(s.dist % 14); x < W; x += 14) g.fillRect(x, 84 + (Math.floor((x + s.dist) / 14) % 3) * 4, 3, 0.8);  // pebbles going by
    g.fillStyle = "#3a3a46"; g.fillRect(0, 80, W, 0.8);
    for (const o of s.obs) {
      if (o.kind === "bug") {  // a red bug, its legs moving
        const f = Math.floor(t / 120) % 2;
        g.fillStyle = "#1c1c22"; for (let i = 0; i < 3; i++) g.fillRect(o.x + 1 + i * 2.6, 78 + (i + f) % 2 * 0.6, 0.6, 2);
        g.fillStyle = "#d23a2a"; g.beginPath(); g.ellipse(o.x + 4, 76.5, 4, 3, 0, 0, 7); g.fill(); g.fillStyle = "#1c1c22"; g.fillRect(o.x + 3.8, 73.5, 0.5, 6); g.beginPath(); g.arc(o.x + 0.5, 76, 1.6, 0, 7); g.fill();
        g.fillStyle = "#1c1c22"; g.beginPath(); g.arc(o.x + 2.5, 75.5, 0.7, 0, 7); g.arc(o.x + 5.5, 77.2, 0.7, 0, 7); g.fill();
      } else {  // a pile of tickets (post-its)
        const n = Math.round(o.h / 2.2);
        for (let i = 0; i < n; i++) { g.fillStyle = ["#ffe14d", "#ff9fd4", "#9fe3ff", "#b6f5a0"][i % 4]; g.fillRect(o.x + (i % 2) * 0.6, 80 - (i + 1) * 2.2, o.w, 2); g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(o.x + (i % 2) * 0.6, 80 - i * 2.2 - 0.3, o.w, 0.3); }
      }
    }
    g.fillStyle = "rgba(0,0,0,.2)"; g.beginPath(); g.ellipse(26, 80.6, 5 - Math.min(3, s.y / 10), 1, 0, 0, 7); g.fill();  // the shadow
    drawDino(g, 21, 80 - s.y - 15, s.y === 0, t, s.over);
  },
});

/* ---------- Pong, in neon ---------- */
Object.assign(PC_GAMES.pong, {
  hd: true, bg: "#05060f",
  init: () => ({ y: 40, ai: 40, bx: 80, by: 50, vx: 0.07, vy: 0.04, me: 0, cpu: 0, score: 0, trail: [], sparks: [], time: 0 }),
  step(s, dt, k) {
    s.time += dt;
    s.y = Math.max(0, Math.min(H - 18, s.y + ((k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0)) * 0.12 * dt));
    s.ai += Math.sign(s.by - 9 - s.ai) * Math.min(Math.abs(s.by - 9 - s.ai), 0.065 * dt);
    s.bx += s.vx * dt; s.by += s.vy * dt; if (s.by < 1 || s.by > H - 1) s.vy *= -1;
    const spark = (x, y, c) => { for (let i = 0; i < 10; i++) s.sparks.push({ x, y, vx: rnd(-0.06, 0.06), vy: rnd(-0.06, 0.06), life: 400, c }); };
    if (s.bx < 8 && s.by > s.y && s.by < s.y + 18 && s.vx < 0) { s.vx = Math.abs(s.vx) * 1.05; s.vy = (s.by - s.y - 9) / 9 * 0.07; sfx("commit"); spark(8, s.by, "#3bf0ff"); }
    if (s.bx > W - 8 && s.by > s.ai && s.by < s.ai + 18 && s.vx > 0) { s.vx = -Math.abs(s.vx) * 1.03; spark(W - 8, s.by, "#ff4fb8"); }
    if (s.bx < 0 || s.bx > W) { if (s.bx > W) s.me++; else s.cpu++; Object.assign(s, { bx: 80, by: 50, vx: (s.bx > W ? -1 : 1) * 0.07, vy: rnd(-0.05, 0.05), trail: [] }); s.score = s.me; }
    if (s.me >= 7 || s.cpu >= 7) s.over = true;
    s.trail.push([s.bx, s.by]); if (s.trail.length > 12) s.trail.shift();
    for (const p of s.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } s.sparks = s.sparks.filter(p => p.life > 0);
  },
  draw(g, s) {
    g.strokeStyle = "rgba(59,240,255,.07)"; g.lineWidth = 0.3; for (let x = 0; x < W; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = "rgba(255,255,255,.25)"; for (let y = 2; y < H; y += 8) g.fillRect(79.6, y, 0.8, 4);
    g.font = "bold 16px monospace"; g.textAlign = "center"; g.fillStyle = "rgba(59,240,255,.35)"; g.fillText(String(s.me), 60, 20); g.fillStyle = "rgba(255,79,184,.35)"; g.fillText(String(s.cpu), 100, 20); g.textAlign = "left";
    const neon = (x, y, w, h, c) => { g.save(); g.shadowColor = c; g.shadowBlur = 8; g.fillStyle = c; g.fillRect(x, y, w, h); g.restore(); g.fillStyle = "#fff"; g.fillRect(x + w * 0.3, y + 1, w * 0.4, h - 2); };
    neon(4, s.y, 3, 18, "#3bf0ff"); neon(W - 7, s.ai, 3, 18, "#ff4fb8");
    s.trail.forEach(([x, y], i) => { g.globalAlpha = i / s.trail.length * 0.5; g.fillStyle = "#fffbd0"; g.fillRect(x - 1, y - 1, 2, 2); }); g.globalAlpha = 1;
    g.save(); g.shadowColor = "#fffbd0"; g.shadowBlur = 10; g.fillStyle = "#fff"; g.beginPath(); g.arc(s.bx, s.by, 1.7, 0, 7); g.fill(); g.restore();
    for (const p of s.sparks) { g.globalAlpha = p.life / 400; g.fillStyle = p.c; g.fillRect(p.x, p.y, 0.8, 0.8); } g.globalAlpha = 1;
  },
});

/* ---------- Flappy Bug ---------- */
Object.assign(PC_GAMES.flappy, {
  hd: true,
  init: () => ({ y: 45, vy: 0, pipes: [], t: 0, score: 0, time: 0, scroll: 0 }),
  step(s, dt, k, pressed) {
    s.time += dt; s.scroll += 0.05 * dt;
    if (pressed[" "] || pressed.ArrowUp) { s.vy = -0.16; sfx("commit"); }
    s.vy += 0.0006 * dt; s.y += s.vy * dt; s.t -= dt;
    if (s.t <= 0) { s.t = 1500; s.pipes.push({ x: W, gap: rnd(25, 70), done: false }); }
    for (const p of s.pipes) { p.x -= 0.05 * dt; if (!p.done && p.x < 30) { p.done = true; s.score++; } }
    s.pipes = s.pipes.filter(p => p.x > -14);
    const me = { x: 32, y: s.y - 3, w: 7, h: 6 }, hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    if (s.y < 0 || s.y > H - 6 || s.pipes.some(p => hit(me, { x: p.x, y: 0, w: 12, h: p.gap - 14 }) || hit(me, { x: p.x, y: p.gap + 14, w: 12, h: H }))) s.over = true;
  },
  draw(g, s) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#5fb8ff"); sky.addColorStop(1, "#cdeeff"); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const x = ((i * 50 - s.scroll * 0.15) % 200 + 200) % 200 - 20; g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(x, 14 + i * 5, 4, 0, 7); g.arc(x + 5, 12 + i * 5, 5, 0, 7); g.arc(x + 10, 14 + i * 5, 4, 0, 7); g.fill(); }
    for (let i = 0; i < 12; i++) { const x = ((i * 16 - s.scroll * 0.35) % 192 + 192) % 192 - 16, h = 14 + (i * 7) % 16; g.fillStyle = "#8fb3d9"; g.fillRect(x, H - 6 - h, 14, h); g.fillStyle = "#d7e9ff"; for (let r = 0; r < h / 4 - 1; r++) g.fillRect(x + 2 + (r % 2) * 6, H - 4 - h + r * 4, 2, 1.5); }  // the town far away
    for (const p of s.pipes) {
      const pipe = (y, h) => { const gr = g.createLinearGradient(p.x, 0, p.x + 12, 0); gr.addColorStop(0, "#3a9a3a"); gr.addColorStop(0.35, "#8fe07a"); gr.addColorStop(1, "#2a7a2a"); g.fillStyle = gr; g.fillRect(p.x, y, 12, h); };
      pipe(0, p.gap - 14); pipe(p.gap + 14, H);
      const cap = y => { const gr = g.createLinearGradient(p.x - 1.5, 0, p.x + 13.5, 0); gr.addColorStop(0, "#2f8a2f"); gr.addColorStop(0.35, "#a4f08e"); gr.addColorStop(1, "#246a24"); g.fillStyle = gr; g.fillRect(p.x - 1.5, y, 15, 4); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(p.x - 1.5, y + 3.4, 15, 0.6); };
      cap(p.gap - 18); cap(p.gap + 14);
    }
    g.fillStyle = "#d8c27a"; g.fillRect(0, H - 6, W, 6); g.fillStyle = "#5aa83a"; g.fillRect(0, H - 6, W, 1.6);
    g.fillStyle = "#c2aa62"; for (let x = -(s.scroll % 8); x < W; x += 8) g.fillRect(x, H - 3, 4, 0.8);
    // the ladybird: tilted with its speed, wings beating
    g.save(); g.translate(35.5, s.y); g.rotate(Math.max(-0.5, Math.min(0.9, s.vy * 5)));
    const f = Math.floor(s.time / 70) % 2;
    g.fillStyle = "rgba(220,240,255,.75)"; g.beginPath(); g.ellipse(-1, f ? -3.5 : -2, 3, 1.4, f ? -0.6 : -0.2, 0, 7); g.fill();
    g.fillStyle = "#d4121e"; g.beginPath(); g.ellipse(0, 0, 4.2, 3.4, 0, 0, 7); g.fill();
    g.fillStyle = "#1c1c22"; g.fillRect(-0.3, -3.4, 0.6, 6.8); for (const [x, y] of [[-2, -1.4], [-2.2, 1.4], [1.6, -1.6], [2, 1.2]]) { g.beginPath(); g.arc(x, y, 0.75, 0, 7); g.fill(); }
    g.beginPath(); g.arc(4, 0, 1.8, 0, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(4.6, -0.9, 0.7, 0.7);
    g.fillStyle = "rgba(255,255,255,.4)"; g.beginPath(); g.ellipse(-1, -1.8, 1.6, 0.7, 0, 0, 7); g.fill();
    g.restore();
    g.font = "bold 10px monospace"; g.textAlign = "center"; g.fillStyle = "rgba(0,0,0,.25)"; g.fillText(String(s.score), 80.5, 15.5); g.fillStyle = "#fff"; g.fillText(String(s.score), 80, 15); g.textAlign = "left";
  },
});
