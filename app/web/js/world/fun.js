// Laser pointer and random office events.

import { hub } from "../hub.js";
import { H, W, ctx, cv, px } from "../core/core.js";
import { view } from "./lounge.js";

/* ---------- fun: laser, office events, shop, mini-games, kudos ---------- */
// all of it is a game layered on the real activity; nothing here touches the agents. Per-viewer state lives in localStorage.
export const today = () => new Date().toISOString().slice(0, 10);

/* laser pointer: hold Shift over the office, Brume chases the dot, then gets bored */
export const laser = { on: false, x: 0, y: 0, over: false };
addEventListener("keydown", ev => { if (ev.key === "Shift") laser.on = true; });
addEventListener("keyup", ev => { if (ev.key === "Shift") laser.on = false; });
addEventListener("blur", () => { laser.on = false; });
function laserActive() { return laser.on && laser.over && view === "office"; }
export function stepLaser(dt, t) {
  if (!laserActive()) { if (hub.cat.mode === "chase") { hub.cat.mode = "sit"; hub.cat.until = t + 2000; } return false; }
  if (t < (hub.cat.boredUntil || 0)) return false;
  if (hub.cat.mode !== "chase") { hub.cat.mode = "chase"; hub.cat.chaseStart = t; hub.cat.path = []; if (hub.cat.desk) { hub.cat.y = hub.cat.desk.y + 28; hub.cat.desk = null; } }
  const tx = Math.max(6, Math.min(W - 6, laser.x)), ty = Math.max(74, Math.min(H - 4, laser.y));
  const dx = tx - hub.cat.x, dy = ty - hub.cat.y, dist = Math.hypot(dx, dy), sp = 0.1 * dt;
  if (dx) hub.cat.dir = Math.sign(dx);
  if (dist > sp) { hub.cat.x += dx / dist * sp; hub.cat.y += dy / dist * sp; }
  else if (t > hub.cat.jump) hub.cat.jump = t + 600;  // pounce
  if (t - hub.cat.chaseStart > 10000) {  // enough
    hub.cat.mode = "sit"; hub.cat.until = t + 6000; hub.cat.boredUntil = t + 25000; hub.cat.say = "Bof."; hub.cat.sayUntil = t + 2000;
  }
  return true;
}
export function drawLaser(t) {
  const on = laserActive();
  cv.classList.toggle("laser", on);  // the mouse cursor would hide the dot
  if (!on) return;
  const { x, y } = laser, r = 3.5 + Math.sin(t / 90) * 0.8;
  ctx.globalAlpha = 0.25; px(x - r - 1.5, y - r - 1.5, 2 * r + 3, 2 * r + 3, "#ff2020");
  ctx.globalAlpha = 0.5; px(x - r, y - r, 2 * r, 2 * r, "#ff3b3b"); ctx.globalAlpha = 1;
  px(x - 1.5, y - 1.5, 3, 3, "#ff2020"); px(x - 0.6, y - 0.6, 1.2, 1.2, "#ffe3e3");
}

// random office events, solved by a click: js/incidents/
