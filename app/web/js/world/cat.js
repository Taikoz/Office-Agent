// Brume, the office cat.

import { hub, provide } from "../hub.js";
import { CAB, CAT_NAME, COFFEE, DESKS, LANE, ctx, ents, px, text } from "../core/core.js";
import { ART } from "../svg/base.js";
import { bubble } from "./scene.js";
import { crew, crewAdd } from "../sims/crew.js";
import { stepLaser } from "./fun.js";

/* ---------- office cat ---------- */
// wanders between the desks, naps on a free or idle desk, jumps for joy on deliveries, meows when clicked
const CAT_ROWS = [LANE, 150, 212], CAT_AISLES = [18, 106, 194, 282];
export const cat = { x: 300, y: LANE, dir: -1, path: [], mode: "sit", until: 4000, desk: null, jump: 0, say: "", sayUntil: 0 };

export function catPath(tx, ty) {
  const path = [];
  let { x, y } = cat;
  if (y < LANE) { path.push({ x, y: LANE }); y = LANE; }           // coming back from the coffee machine
  const row = ty < LANE ? LANE : ty;
  if (row !== y) {
    const ax = CAT_AISLES.reduce((b, a) => Math.abs(a - x) + Math.abs(a - tx) < Math.abs(b - x) + Math.abs(b - tx) ? a : b);
    path.push({ x: ax, y }, { x: ax, y: row });
  }
  path.push({ x: tx, y: row });
  if (ty < LANE) path.push({ x: tx, y: ty });
  return path;
}

function catNext(t) {
  // a dev blocked or turning in circles gets a visit: Brume sits by their chair for a while
  const sad = [...ents.values()].find(e => e.seated && !e.leaving && (e.agent.status === "blocked" || hub.isStuck(e.agent)) && t > (e.comfortedUntil || 0));
  if (sad && Math.random() < 0.7) {
    sad.comfortedUntil = t + 120000;
    cat.path = catPath(sad.desk.x + 14, sad.desk.y + 28); cat.next = { mode: "comfort", who: sad.who };
    cat.mode = "walk"; return;
  }
  const busy = new Map([...ents.values()].filter(e => !e.leaving).map(e => [e.desk, e]));
  const naps = DESKS.filter(d => { const e = busy.get(d); return !e || (e.seated && (e.agent.status === "done" || e.agent.idle > 45)); });
  const r = Math.random();
  if (r < 0.35 && naps.length) {
    const d = naps[Math.floor(Math.random() * naps.length)];
    cat.path = catPath(d.x - 10, d.y + 28); cat.next = { mode: "sleep", desk: d };
  } else if (r < 0.5) {
    cat.path = catPath(COFFEE.x - 18, COFFEE.y); cat.next = { mode: "sit" };
  } else {
    cat.path = catPath(20 + Math.random() * 330, CAT_ROWS[Math.floor(Math.random() * CAT_ROWS.length)]); cat.next = { mode: "sit" };
  }
  cat.mode = "walk";
}

function stepCat(dt, t) {
  if (hub.focusMode) return;
  // the security alarm scares her: she runs under the MMX cabinet until it stops
  if (hub.alarm && cat.mode !== "hide" && cat.next?.mode !== "hide") {
    if (cat.mode === "sleep") { cat.y = cat.desk.y + 28; cat.desk = null; }
    cat.path = catPath(CAB.x + CAB.w / 2, CAT_ROWS[CAT_ROWS.length - 1]); cat.next = { mode: "hide" }; cat.mode = "walk";
    cat.say = "🙀"; cat.sayUntil = t + 1500;
  }
  if (stepLaser(dt, t)) return;
  if (cat.mode === "sleep") {
    const e = [...ents.values()].find(x => x.desk === cat.desk && !x.leaving);
    if (e?.seated && e.agent.status === "working" && e.agent.idle < 20) cat.until = 0;  // the dev is back at work: off the keyboard
  }
  if (cat.mode !== "walk") {
    if (t < cat.until) return;
    if (cat.mode === "sleep") { cat.y = cat.desk.y + 28; cat.desk = null; }
    return catNext(t);
  }
  const tgt = cat.path[0], dx = tgt.x - cat.x, dy = tgt.y - cat.y, dist = Math.hypot(dx, dy), sp = 0.035 * dt;
  if (dx) cat.dir = Math.sign(dx);
  if (dist > sp) { cat.x += dx / dist * sp; cat.y += dy / dist * sp; return; }
  cat.x = tgt.x; cat.y = tgt.y; cat.path.shift();
  if (cat.path.length) return;
  const n = cat.next || { mode: "sit" };
  cat.mode = n.mode; cat.comfort = n.mode === "comfort" ? n.who : null;
  if (n.mode === "sleep") { cat.desk = n.desk; cat.y = n.desk.y; cat.until = t + 20000 + Math.random() * 25000; }
  else cat.until = t + (n.mode === "comfort" ? 15000 : n.mode === "hide" ? 20000 : 3000 + Math.random() * 5000);
}

export function catCheer() {
  const t = performance.now();
  cat.jump = t + 1300; cat.say = "♥"; cat.sayUntil = t + 1500;
  if (cat.mode === "sleep") cat.until = t + 1300;
}

export function petCat() {
  const t = performance.now();
  hub.sfx("meow"); cat.say = "Miaou !"; cat.sayUntil = t + 1800; crew.pets = (crew.pets || 0) + 1;
  for (const e of ents.values()) if (e.who && !e.leaving && !e.queued) crewAdd(e.who, { moral: 2 });
  hub.burst(cat.x, cat.y - 8, ["#ff6b6b", "#e98fc4"], 5, 0.4);
  if (cat.mode === "sleep") cat.until = t + 1800;
}

export function drawCat(t) {
  if (hub.focusMode) return;
  const { x, dir, mode } = cat;
  const y = cat.y - (t < cat.jump ? Math.abs(Math.sin((cat.jump - t) / 1300 * Math.PI * 3)) * 5 : 0);
  const moving = mode === "walk" || mode === "chase";
  const pose = mode === "sleep" ? "sleep" : moving ? "walk" : "sit";
  const frame = moving ? Math.floor(t / (mode === "chase" ? 90 : 140)) % 2 : pose === "sit" ? (Math.floor(t / 180) % 23 === 0 ? 2 : Math.sin(t / 300) > 0 ? 1 : 0) : 0;  // 2 = blink
  if (!ART.cat.draw(x, y, { pose, frame }, { flip: dir < 0 })) drawCatPx(t, x, y);  // svg/figures.js; she faces right
  if (mode === "sleep") {  // z z z
    const k = (t / 1400) % 1;
    ctx.globalAlpha = 1 - k; text("z", x + 5 + k * 3, y - 8 - k * 6, "#d5eeff", 4); ctx.globalAlpha = 1;
  }
  const head = pose === "sleep" ? 8 : 15;
  if (t < cat.sayUntil) bubble(x, y - head, cat.say, "#f4f2ea");
  else if (mode === "comfort" && Math.floor(t / 3000) % 2) bubble(x, y - head, `♥ courage ${cat.comfort || ""}`, "#f4c2d7");
  else if (mode === "hide") bubble(x, y - head, "🙀", "#f4f2ea");
  else if (cat.hover) text(CAT_NAME.toUpperCase(), x, y + 1, "#d5eeff", 3.6, "center");
}

// fallback while the sprite images load (first frames only)
function drawCatPx(t, x, y) {
  const { dir, mode } = cat, fur = "#a3a3ad", dark = "#6e6e7a";
  const cp = (ox, oy, w, h, c) => px(dir > 0 ? x + ox : x - ox - w, y + oy, w, h, c);
  if (mode === "sleep") {  // curled up on the desk, z z z
    px(x - 4, y - 3, 8, 3, fur); px(x - 2, y - 3, 1, 1, dark); px(x, y - 3, 1, 1, dark);
    px(x + 2, y - 4, 3, 3, fur); px(x + 2, y - 5, 1, 1, fur); px(x + 4, y - 5, 1, 1, fur); px(x + 3, y - 3, 1.5, 0.5, "#1c1c24");
    px(x - 5, y - 1, 7, 1, dark);
  } else if (mode === "walk" || mode === "chase") {
    const leg = Math.floor(t / 140) % 2;
    cp(-4, -5, 8, 3, fur); cp(-2, -5, 1, 1, dark); cp(0, -5, 1, 1, dark);
    cp(3, -7, 4, 4, fur); cp(3, -8, 1, 1, fur); cp(6, -8, 1, 1, fur); cp(5, -6, 1, 1, "#1c1c24");
    cp(-3 + leg, -2, 1, 2, fur); cp(2 - leg, -2, 1, 2, fur);
    cp(-6, -8 + leg, 1, 3, fur); cp(-5, -6, 1, 1, fur);
  } else {  // sitting, tail swaying
    const wag = Math.sin(t / 300) > 0 ? 1 : 0;
    cp(-2, -5, 4, 5, fur); cp(-1, -4, 1, 1, dark);
    cp(-2, -9, 4, 4, fur); cp(-2, -10, 1, 1, fur); cp(1, -10, 1, 1, fur); cp(0, -8, 1, 1, "#1c1c24");
    cp(-4 - wag, -1, 3, 1, fur); cp(-5 - wag, -2 - wag, 1, 1, fur);
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get cat() { return cat; }, get catPath() { return catPath; }, get petCat() { return petCat; }, set petCat(v) { petCat = v; }, get stepCat() { return stepCat; } });
