// Ping-pong against a dev, first to 5: the mouse or ↑ / ↓ (Z/S) move your paddle; the dev's one follows the ball,
// better when rested and in a good mood.

import { hub } from "../hub.js";
import { CHIEF_NAME, H, W, px, text } from "../core/core.js";
import { drawPerson } from "../world/scene.js";
import { mate } from "../sims/crew.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { view } from "../world/lounge.js";
import { MiniGame, endMatch, match } from "./base.js";

export const keysDown = new Set();
addEventListener("keydown", ev => { if (view === "game" && ["ArrowUp", "ArrowDown", "w", "s", "z"].includes(ev.key)) { keysDown.add(ev.key); ev.preventDefault(); } });
addEventListener("keyup", ev => keysDown.delete(ev.key));
function serve(dir) { const a = (Math.random() - 0.5) * 0.6; match.ball = { x: 200, y: 116, vx: dir * 0.13 * Math.cos(a), vy: 0.13 * Math.sin(a) }; }

class Pingpong extends MiniGame {
  constructor() { super("pingpong", "Ping-pong"); }
  init() { return { py: 116, ay: 116, ball: null, serveAt: performance.now() + 900 }; }
  step(m, dt, t) {
    if (m.over) { if (t > m.over) endMatch(); return; }
    if (keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("z")) m.py -= 0.16 * dt;
    if (keysDown.has("ArrowDown") || keysDown.has("s")) m.py += 0.16 * dt;
    if (m.mouseY != null) m.py += Math.max(-0.2 * dt, Math.min(0.2 * dt, m.mouseY - m.py));
    m.py = Math.max(52, Math.min(180, m.py));
    if (!m.ball) { if (t > m.serveAt) serve(Math.random() < 0.5 ? -1 : 1); return; }
    const b = m.ball;
    if (m.net) m.ay += Math.max(-0.2 * dt, Math.min(0.2 * dt, m.net.in.py - m.ay));  // another chief's paddle (games/online.js)
    else {
      const st = mate(m.name), skill = 0.07 * (1 - st.fatigue / 250) * (0.85 + st.moral / 400);
      if (b.vx > 0) m.ay += Math.max(-skill * dt, Math.min(skill * dt, b.y - m.ay)); else m.ay += Math.max(-0.03 * dt, Math.min(0.03 * dt, 116 - m.ay));
    }
    m.ay = Math.max(52, Math.min(180, m.ay));
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < 42 || b.y > 190) { b.vy = -b.vy; b.y = Math.max(42, Math.min(190, b.y)); }
    const paddle = (px0, py0, side) => {
      if (Math.abs(b.x - px0) < 3 && Math.abs(b.y - py0) < 13 && Math.sign(b.vx) === side) {
        b.vx = -b.vx * 1.06; b.vy += (b.y - py0) * 0.006; b.x = px0 - side * 3; hub.sfx("commit");
      }
    };
    paddle(40, m.py, -1); paddle(360, m.ay, 1);
    if (b.x < 20 || b.x > 380) {
      if (b.x < 20) m.as++; else m.ps++;
      hub.sfx(b.x < 20 ? "fail" : "pass"); m.ball = null; m.serveAt = t + 1100;
      if (m.ps >= 5 || m.as >= 5) m.over = t + 2600;
    }
  }
  render(m, t) {
    px(0, 0, W, H, "#040c26");
    px(14, 38, 372, 156, "#f7f7f7"); px(16, 40, 368, 152, "#1f8a5a");
    px(199.4, 40, 1.2, 152, "#f7f7f7"); px(16, 115.5, 368, 0.6, "#f7f7f7");
    const pad = (x, y, c) => px(x - 1.5, y - 11, 3, 22, c);
    pad(40, m.py, "#fbaa08"); pad(360, m.ay, m.look.shirt);
    if (m.ball) px(m.ball.x - 1.5, m.ball.y - 1.5, 3, 3, "#f7f7f7");
    text(`${m.leftName || CHIEF_NAME}  ${m.ps}  —  ${m.as}  ${m.name}`, 200, 12, "#f7f7f7", 9, "center");  // leftName: a spectator's screen (games/online.js)
    text("PING-PONG · premier à 5", 200, 26, "#fbaa08", 4.5, "center");
    text("Souris ou ↑ / ↓ (Z/S) · Échap pour abandonner", 200, 210, "#adadad", 4.2, "center");
    drawPerson(26, 230, m.leftLook || CHIEF_LOOK, { tux: true, smile: true }); drawPerson(374, 230, m.look, { smile: m.as >= m.ps });
    if (m.over) { px(110, 96, 180, 40, "#081746"); px(112, 98, 176, 36, m.ps > m.as ? "#51cf66" : "#ff6b6b");
      text(m.ps > m.as ? (m.leftName ? `${m.leftName.toUpperCase()} GAGNE` : "VICTOIRE !") : `${m.name.toUpperCase()} GAGNE`, 200, 102, "#081746", 10, "center"); text(`${m.ps} — ${m.as}`, 200, 120, "#081746", 6, "center"); }
  }
}
new Pingpong();
