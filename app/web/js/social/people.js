// The people of the break room as the social life sees them: where they are, what they say, gestures, floating hearts
// and pluses, friendships changing, moving them to a place; and what is drawn over everybody.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief, ctx, px, text } from "../core/core.js";
import { chiefToLounge } from "../world/chief.js";
import { LOUNGE_CORRIDOR, loungers, sendTo } from "../world/lounge.js";
import { toast } from "../sims/progress.js";
import { rel, relAdd, relLevel } from "./relations.js";
import { PAN, cooking, drawFork, drawSteam, eaters, fire, socialFx } from "./kitchen.js";

/* ---------- people: where they are, what they say ---------- */
export const lounger = n => n === CHIEF_NAME ? null : loungers.get(n);
export function posOf(n) { if (n === CHIEF_NAME) return { x: chief.lx, y: chief.ly }; const l = loungers.get(n); return l ? { x: l.x, y: l.y } : null; }
export function here(n) { return n === CHIEF_NAME ? chief.room === "lounge" : !!loungers.get(n) && !loungers.get(n).called; }
export function idleMate(l, t) { return !l.called && !l.path.length && !l.busy && t > (l.sayUntil || 0) - 2000; }
export function say(n, msg, ms = 3000) {
  const t = performance.now();
  if (n === CHIEF_NAME) { chief.bubble = msg; chief.until = t + ms; } else { const l = loungers.get(n); if (l) { l.say = msg; l.sayUntil = t + ms; } }
}
export function gesture(n, pose, ms) { const g = { pose, until: performance.now() + ms }; if (n === CHIEF_NAME) chief.gesture = g; else { const l = loungers.get(n); if (l) l.gesture = g; } }
function floatUp(x, y, txt, color, n = 1) {
  for (let i = 0; i < n; i++) socialFx.push({ x: x + (n > 1 ? (i - (n - 1) / 2) * 5 : 0), y, txt, color, born: performance.now() + i * 160, life: 1600 });
}
// a relationship change, shown the Sims way: green pluses or red minuses rising over the target, hearts between friends
export function bond(a, b, d) {
  relAdd(a, b, d);
  const p = posOf(b) || posOf(a); if (!p) return;
  if (d > 0) floatUp(p.x, p.y - 30, "+", "#51cf66", Math.min(4, Math.ceil(d / 3)));
  else if (d < 0) floatUp(p.x, p.y - 30, "−", "#ff6b6b", Math.min(4, Math.ceil(-d / 3)));
  if (d >= 6 && rel(a, b) >= 40) floatUp(p.x, p.y - 36, "♥", "#ff6b9a", 2);
  if (d <= -8) floatUp(p.x, p.y - 36, "💢", "#ff6b6b");
  if ([40, 70].some(s => rel(a, b) >= s && rel(a, b) - d < s)) {  // a new level, like the Sims notification
    const [, label] = relLevel(rel(a, b));
    toast("AMITIÉ", `${a} et ${b} : ${label} !`, d > 0 ? "Leur relation passe un cap." : "");
    floatUp(p.x, p.y - 42, "♥", "#ff6b9a", 3);
  }
}


/* ---------- moving people to a place ---------- */
// a dev: through the break-room corridor (sendTo of lounge.js), to a spot with its own activity
export function sendMate(l, sp, act, ms) { l.busy = true; sendTo(l, { ...sp, act }, performance.now()); l.next = performance.now() + ms; }
// the chief: same corridor, then `on` when he gets there
export function chiefTo(sp, act, on) {
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lspot = act ? { ...sp, act } : null;
  chief.lpath = [...via, { x: via[0]?.x ?? chief.lx, y: LOUNGE_CORRIDOR }, { x: sp.via ? sp.via.x : sp.x, y: LOUNGE_CORRIDOR }, ...(sp.via ? [{ ...sp.via }] : []), { x: sp.x, y: sp.y, on }];
}
// next to someone: on the side with room, through the same detour as their spot
export function besideOf(l) {
  const end = l.path.length ? l.path.at(-1) : l, side = end.x > 330 ? -11 : 11;
  return { x: Math.max(12, Math.min(388, end.x + side)), y: Math.max(76, end.y), via: l.spot?.via };
}
// every order to the chief goes through here: he comes from the office first if he is not in the break room
export function chiefDo(fn) {
  if (hub.chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = performance.now() + 3000; return; }
  if (chief.room === "lounge") return fn();
  chief.pendingSocial = fn; chiefToLounge();
}


function burstLounge(x, y, colors) { for (let i = 0; i < 8; i++) floatUp(x - 14 + Math.random() * 28, y - Math.random() * 6, "✦", colors[i % colors.length]); }
// over everything: progress bar of the cook, forks, floating pluses and hearts
export function drawSocialOver(t) {
  drawSteam(t);
  for (const [n, e] of eaters) { const p = posOf(n); if (p && e.sat) drawFork(p.x, p.y, e.seat, t, e.start); }
  if (cooking?.arrived) {
    const p = posOf(cooking.cook), k = Math.min(1, (t - cooking.start) / cooking.ms);
    if (p) {
      const x = p.x - 12, y = p.y - 54;
      px(x - 0.6, y - 0.6, 25.2, 4.2, "#081746"); px(x, y, 24, 3, "#1a2340"); px(x, y, 24 * k, 3, cooking.burning ? "#ff9f43" : "#51cf66"); px(x, y, 24 * k, 0.8, "#ffffff55");
      text(cooking.recipe.icon, x - 5, y - 1.2, "#fff", 4.6);
    }
  }
  if (fire && !(fire.out > 0)) text("🔥 AU FEU !", PAN.x + 4, PAN.y - 16 + Math.sin(t / 120), Math.floor(t / 250) % 2 ? "#ff6b35" : "#ffd43b", 6, "center");
  for (const f of socialFx) {
    const k = (t - f.born) / f.life; if (k < 0) continue;
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    text(f.txt, f.x + Math.sin(k * 7 + f.x) * 1.2, f.y - k * 14, f.color, f.txt.length > 1 ? 5 : 7, "center");
    ctx.globalAlpha = 1;
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get bond() { return bond; }, get burstLounge() { return burstLounge; }, get chiefTo() { return chiefTo; }, get floatUp() { return floatUp; }, get gesture() { return gesture; }, get here() { return here; }, get lounger() { return lounger; }, get posOf() { return posOf; }, get say() { return say; }, get sendMate() { return sendMate; } });
