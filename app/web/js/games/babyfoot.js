// Baby-foot against a dev: 8 rods (goalkeeper, defence, midfield, attack per team), first to 5.

import { hub } from "../hub.js";
import { CHIEF_NAME, H, S, W, ctx, px, text } from "../core/core.js";
import { drawPerson } from "../world/scene.js";
import { mate } from "../sims/crew.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { loungeSay, view } from "../world/lounge.js";
import { MiniGame, endMatch, match } from "./base.js";
import { keysDown } from "./pingpong.js";
import { gauss } from "./darts.js";

/* the field and the rods in the real order: the chief (yellow) defends the left goal, the dev the right one.
   men = offsets of the men on the rod from the field centre, range = how far the rod slides */
const FOOT = { x0: 16, x1: 384, y0: 40, y1: 192, cy: 116, goal: 18, r: 2, manW: 2.6, manH: 4 };
const FOOT_ROLES = {
  GARDIEN: { men: [0], range: 26 },
  DÉFENSE: { men: [-25, 25], range: 46 },
  MILIEU: { men: [-56, -28, 0, 28, 56], range: 15 },
  ATTAQUE: { men: [-44, 0, 44], range: 27 },
};
const FOOT_RODS = [["p", "GARDIEN"], ["p", "DÉFENSE"], ["a", "ATTAQUE"], ["p", "MILIEU"], ["a", "MILIEU"], ["p", "ATTAQUE"], ["a", "DÉFENSE"], ["a", "GARDIEN"]]
  .map(([side, role], i) => ({ side, role, x: 39 + i * 46, dir: side === "p" ? 1 : -1, ...FOOT_ROLES[role] }));

function footInit() {
  return { py: FOOT.cy, ball: null, serveAt: performance.now() + 900, serveTo: Math.random() < 0.5 ? "p" : "a", goalAt: 0, scorer: "", aiY: FOOT.cy, aiSeen: 0, still: 0, lastMouse: null,
    rods: FOOT_RODS.map(r => ({ ...r, o: 0, v: 0, kick: 0, cd: 0 })) };
}
const footManY = (rod, k) => FOOT.cy + rod.men[k] + rod.o;
// the slide that brings the nearest man of the rod onto the line y
function footBestOffset(rod, y) {
  let best = rod.o, bd = Infinity;
  for (const off of rod.men) {
    const o = Math.max(-rod.range, Math.min(rod.range, y - FOOT.cy - off)), d = Math.abs(FOOT.cy + off + o - y) * 4 + Math.abs(o - rod.o) * 0.05;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
// where the ball will cross x, bouncing off the side walls
function footPredict(b, x) {
  if (!b.vx || Math.sign(x - b.x) !== Math.sign(b.vx)) return b.y;
  const lo = FOOT.y0 + FOOT.r, span = FOOT.y1 - FOOT.r - lo;
  let y = b.y + b.vy * (x - b.x) / b.vx - lo;
  y = ((y % (2 * span)) + 2 * span) % (2 * span);
  return lo + (y > span ? 2 * span - y : y);
}
function footServe(m) {
  // the ball is dropped at midfield and rolls slowly toward the midfield of the team that conceded
  const dir = m.serveTo === "p" ? -1 : 1;
  m.ball = { x: 200, y: FOOT.cy + (Math.random() - 0.5) * 30, vx: dir * (0.05 + Math.random() * 0.03), vy: (Math.random() - 0.5) * 0.08, spin: 0 };
  m.still = 0;
}
function footKick(t) {
  const m = match; if (!m || m.skin !== "babyfoot" || m.over) return;
  for (const r of m.rods) if (r.side === "p" && t > r.cd) { r.kick = t + 170; r.cd = t + 330; }
}
addEventListener("keydown", ev => { if (view === "game" && match?.skin === "babyfoot" && ev.key === " ") { ev.preventDefault(); if (!ev.repeat) footKick(performance.now()); } });

function stepFoot(dt, t) {
  const m = match;
  if (m.over) { if (t > m.over) endMatch(); return; }
  dt = Math.min(dt, 40);
  // the chief: mouse or ↑/↓ moves a line, every rod puts its nearest man on it
  if (m.mouseY != null && m.mouseY !== m.lastMouse) { m.py = m.mouseY; m.lastMouse = m.mouseY; }
  if (keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("z")) m.py -= 0.2 * dt;
  if (keysDown.has("ArrowDown") || keysDown.has("s")) m.py += 0.2 * dt;
  m.py = Math.max(FOOT.y0, Math.min(FOOT.y1, m.py));
  // the dev reads the ball with a delay and some error, and slides slower when tired; another chief plays his rods
  // himself (games/online.js: his line and his shots)
  const b = m.ball, net = m.net, st = net ? null : mate(m.name), skill = net ? 1 : Math.max(0.35, (1 - st.fatigue / 220) * (0.8 + st.moral / 400));
  if (!net && t > m.aiSeen) { m.aiSeen = t + 140 + st.fatigue * 1.5; m.aiErr = gauss() * (5 + st.fatigue / 12); }
  if (net && net.in.kick > net.kicked) { net.kicked = net.in.kick; for (const r of m.rods) if (r.side === "a" && t > r.cd) { r.kick = t + 170; r.cd = t + 330; } }
  for (const r of m.rods) {
    const want = r.side === "p" ? footBestOffset(r, m.py) : footBestOffset(r, net ? net.in.py : (b ? footPredict(b, r.x) : FOOT.cy) + (m.aiErr || 0));
    const speed = (r.side === "p" || net ? 0.5 : 0.13 + 0.12 * skill) * dt, prev = r.o;
    r.o += Math.max(-speed, Math.min(speed, want - r.o));
    r.v = (r.o - prev) / dt;
    // the dev shoots when the ball sits in front of one of his men
    if (!net && r.side === "a" && b && t > r.cd) for (let k = 0; k < r.men.length; k++) {
      const dx = (b.x - r.x) * r.dir, dy = Math.abs(b.y - footManY(r, k));
      if (dx > 1 && dx < 9 && dy < 5 && Math.random() < 0.12 * skill * dt / 16) { r.kick = t + 170; r.cd = t + 520 + Math.random() * 400; break; }
    }
  }
  if (!b) { if (t > m.serveAt) footServe(m); return; }
  // the ball: substeps so a hard shot does not go through a man
  const steps = Math.min(16, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 1.2) || 1), h = dt / steps;
  for (let i = 0; i < steps && m.ball; i++) footBall(m, b, h, t);
  if (!m.ball) return;
  const f = Math.pow(0.99965, dt); b.vx *= f; b.vy *= f;
  // a dead ball (stopped out of reach) is served again
  m.still = Math.hypot(b.vx, b.vy) < 0.025 ? m.still + dt : 0;
  if (m.still > 2200) { m.serveTo = b.x < 200 ? "p" : "a"; m.ball = null; m.serveAt = t + 500; m.flash = { t, text: "BALLE MORTE" }; }
}
function footBall(m, b, h, t) {
  b.x += b.vx * h; b.y += b.vy * h;
  const { x0, x1, y0, y1, cy, goal, r } = FOOT;
  if (b.y < y0 + r) { b.y = y0 + r; b.vy = Math.abs(b.vy) * 0.9; }
  if (b.y > y1 - r) { b.y = y1 - r; b.vy = -Math.abs(b.vy) * 0.9; }
  if (b.x < x0 + r || b.x > x1 - r) {
    const left = b.x < x0 + r;
    if (Math.abs(b.y - cy) < goal - r) return footGoal(m, left ? "a" : "p", t);
    b.x = left ? x0 + r : x1 - r; b.vx = (left ? 1 : -1) * Math.abs(b.vx) * 0.8; hub.sfx("commit");
  }
  for (const rod of m.rods) {
    const kicking = t < rod.kick;
    if (Math.abs(b.x - rod.x) > FOOT.manW + r + 6) continue;
    for (let k = 0; k < rod.men.length; k++) {
      const my = footManY(rod, k), front = (b.x - rod.x) * rod.dir >= 0;
      // a kicking man swings his feet forward: his reach in front grows
      const reach = FOOT.manW + r + (kicking && front ? 5 : 0);
      if (Math.abs(b.x - rod.x) >= reach || Math.abs(b.y - my) >= FOOT.manH + r) continue;
      const out = front ? rod.dir : -rod.dir, sp = Math.hypot(b.vx, b.vy);
      const power = kicking && front ? 0.36 : Math.max(0.09, sp * (front ? 0.8 : 0.6) + Math.abs(rod.v) * 0.2);
      b.vx = out * power;
      b.vy = Math.max(-0.22, Math.min(0.22, (b.y - my) * 0.014 + rod.v * 0.45));
      b.x = rod.x + out * (FOOT.manW + r + 0.2);
      if (kicking && front) { rod.kick = 0; m.shot = { t, side: rod.side }; }
      hub.sfx("commit");
      return;
    }
  }
}
function footGoal(m, scorer, t) {
  if (scorer === "p") m.ps++; else m.as++;
  m.ball = null; m.serveAt = t + 1500; m.serveTo = scorer === "p" ? "a" : "p";
  m.flash = { t, text: scorer === "p" ? "BUUUT !" : `BUT DE ${m.name.toUpperCase()}` };
  hub.sfx(scorer === "p" ? "pass" : "fail");
  if (scorer === "a" && m.as < 5 && !m.net) loungeSay(m.name, ["Dans la lucarne !", "Gamelle !", "Trop facile 😎"][Math.floor(Math.random() * 3)]);
  if (m.ps >= 5 || m.as >= 5) m.over = t + 2600;
}

function renderFoot(t, m = match) {
  const { x0, x1, y0, y1, cy, goal } = FOOT, white = "#f7f7f7";
  const box = (x, y, w, h) => { px(x, y, w, 0.6, white); px(x, y + h - 0.6, w, 0.6, white); px(x, y, 0.6, h, white); px(x + w - 0.6, y, 0.6, h, white); };
  px(0, 0, W, H, "#040c26");
  px(8, 32, 384, 168, "#6d4a2e"); px(10, 34, 380, 164, "#8a5d3a"); px(10, 34, 380, 1.5, "#a8774c");
  for (let i = 0; i < 8; i++) px(x0 + i * 46, y0, 46, y1 - y0, i % 2 ? "#2b9240" : "#2f9e44");
  box(x0, y0, x1 - x0, y1 - y0); px(199.7, y0, 0.6, y1 - y0, white);
  ctx.strokeStyle = white; ctx.lineWidth = 0.6 * S; ctx.beginPath(); ctx.arc(200 * S, cy * S, 22 * S, 0, 2 * Math.PI); ctx.stroke();
  px(199, cy - 1, 2, 2, white);
  box(x0, cy - 30, 22, 60); box(x1 - 22, cy - 30, 22, 60);
  px(x0 - 6, cy - goal, 6, goal * 2, "#14141c"); px(x1, cy - goal, 6, goal * 2, "#14141c");
  // rods, handles on each team's side, men (head, shoulders, feet swinging when they shoot)
  for (const r of m.rods) {
    const mine = r.side === "p", shirt = mine ? "#fbaa08" : "#d64545", kicking = t < r.kick;
    px(r.x - 0.7, 30, 1.4, 172, "#c9ccd6"); px(r.x - 0.7, 30, 0.5, 172, "#eef0f5");
    if (mine) px(r.x - 2, 202 + r.o * 0.15, 4, 9, "#1c1c24"); else px(r.x - 2, 21 + r.o * 0.15, 4, 9, "#1c1c24");
    for (let k = 0; k < r.men.length; k++) {
      const y = footManY(r, k);
      px(r.x - 2.2 + 1, y - 3.4 + 1.2, 4.4, 7, "rgba(0,0,0,.25)");
      if (kicking) px(r.x + (r.dir > 0 ? 1 : -5), y - 1.4, 4, 2.8, "#1c1c24");  // the feet come out in front
      px(r.x - 2.2, y - 4, 4.4, 8, shirt); px(r.x - 2.2, y - 4, 4.4, 1, mine ? "#081746" : m.look.shirt);
      ctx.fillStyle = "#f1c7a3"; ctx.beginPath(); ctx.arc(r.x * S, y * S, 1.5 * S, 0, 2 * Math.PI); ctx.fill();
    }
    text(r.role, r.x, mine ? 193 : 35.5, mine ? "#fbaa08" : "#f7f7f7", 3.2, "center");
  }
  // the chief's aiming line
  ctx.fillStyle = "#fbaa08"; ctx.beginPath(); ctx.moveTo(4 * S, (m.py - 3) * S); ctx.lineTo(9 * S, m.py * S); ctx.lineTo(4 * S, (m.py + 3) * S); ctx.fill();
  if (m.ball) {
    const b = m.ball;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.arc((b.x + 0.8) * S, (b.y + 0.9) * S, 2.1 * S, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = white; ctx.beginPath(); ctx.arc(b.x * S, b.y * S, 2.1 * S, 0, 2 * Math.PI); ctx.fill();
    const a = (b.x + b.y) / 3; px(b.x + Math.cos(a) * 0.8 - 0.5, b.y + Math.sin(a) * 0.8 - 0.5, 1, 1, "#1c1c24");
  }
  text(`${m.leftName || CHIEF_NAME}  ${m.ps}  —  ${m.as}  ${m.name}`, 200, 1, "#f7f7f7", 9, "center");
  text("BABY-FOOT · premier à 5", 200, 12.5, "#fbaa08", 4.2, "center");
  text("Souris ou ↑ / ↓ = barres · clic ou Espace = tirer · Échap = abandonner", 200, 214, "#adadad", 4, "center");
  if (m.flash && t - m.flash.t < 1300 && !m.over) text(m.flash.text, 200, 96, "#fbaa08", 14, "center");
  drawPerson(26, 230, m.leftLook || CHIEF_LOOK, { tux: true, smile: m.ps >= m.as }); drawPerson(374, 230, m.look, { smile: m.as >= m.ps });
  if (m.over) { px(110, 96, 180, 40, "#081746"); px(112, 98, 176, 36, m.ps > m.as ? "#51cf66" : "#ff6b6b");
    text(m.ps > m.as ? (m.leftName ? `${m.leftName.toUpperCase()} GAGNE` : "VICTOIRE !") : `${m.name.toUpperCase()} GAGNE`, 200, 102, "#081746", 10, "center"); text(`${m.ps} — ${m.as}`, 200, 120, "#081746", 6, "center"); }
}

class Babyfoot extends MiniGame {
  constructor() { super("babyfoot", "Baby-foot"); }
  init() { return footInit(); }
  step(_m, dt, t) { stepFoot(dt, t); }
  render(m, t) { renderFoot(t, m); }
  click(_m, p, t) { footKick(t); }
}
new Babyfoot();

/* ---------- over the network (games/online.js) ---------- */
// what the challenger's page sends: the rods (slide, shooting), the ball, the scores, the last goal, his line
export const footState = (m, t) => ({ rods: m.rods.map(r => [Math.round(r.o * 10) / 10, t < r.kick ? 1 : 0]), b: m.ball && [m.ball.x, m.ball.y, m.ball.vx, m.ball.vy].map(v => Math.round(v * 1000) / 1000),
  fl: m.flash && !m.over ? [m.flash.text === "BUUUT !" ? "p" : "a", Math.round(t - m.flash.t)] : null, py: Math.round(m.py) });
// the other player's screen (turned: he plays on the left, in yellow), or a spectator's (as the challenger plays it)
export function footView(v, m, t, turned = true) {
  const flip = x => turned ? 400 - x : x;
  const rods = FOOT_RODS.map((r, i) => ({ ...r, side: turned ? (r.side === "p" ? "a" : "p") : r.side, x: flip(r.x), dir: turned ? -r.dir : r.dir, o: v.rods?.[i]?.[0] || 0, kick: v.rods?.[i]?.[1] ? t + 60 : 0 }));
  const mine = v.fl && (v.fl[0] === "a") === turned, fl = v.fl && { t: t - v.fl[1], text: turned ? (mine ? "BUUUT !" : `BUT DE ${m.name.toUpperCase()}`) : `BUT DE ${(v.fl[0] === "p" ? m.leftName : m.name).toUpperCase()}` };
  return { name: m.name, look: m.look, leftName: m.leftName, leftLook: m.leftLook, ps: turned ? v.as : v.ps, as: turned ? v.ps : v.as, py: turned ? m.py : v.py ?? 116, rods,
    ball: v.b && { x: flip(v.b[0]), y: v.b[1] }, flash: fl, over: v.over ? 1 : 0 };
}
