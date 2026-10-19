// The physics of the rooms, a little more real (all cosmetic, nothing changes the agents):
//  - objects: an empty chair stays pushed back from its desk, a busy one rocks while its dev types; a plant rustles when
//    someone walks by (and a little in the draught); a door opens when someone goes through (doorOpen / drawDoorOpen);
//  - effects: steam over the coffee machines (thick while one brews) and the stove while someone cooks; dust motes
//    floating in the sun's patches; the light of an aquarium or a fountain rippling on the floor;
//  - the world outside: the clouds dim the sun's patches and pass over them, rain runs down the windows, at night the
//    glass reflects the room and the cars' headlights sweep the floor; on a shiny floor the lamps' reflections;
//    the rain on the terrace (streaks and rings on the deck);
//  - the sound: where it comes from (spatial: quieter from another room, on the side of the screen it plays).
// The movement of the walkers is world/motion.js.

import { hub, provide } from "../hub.js";
import { S, W, chief, ctx, ents, px } from "../core/core.js";
import { P } from "../iso/engine.js";
import { ART } from "../svg/base.js";
import { footOf } from "./place.js";
import { movingNear } from "./motion.js";

const FY = 70;
// through the hub, not imported: this module is loaded by the rooms' drawing early, before the shop (world/build.js)
const itemsIn = room => hub.itemsIn(room), defOf = type => hub.defOf(type);
const lampLit = it => it.on === true || (it.on == null && night() > 0);  // items/lamp.js
const brewingNow = () => [...ents.values()].some(e => e.pose === "coffee") || (chief.at === "coffee" && !chief.path.length && chief.coffeeUntil > 0);  // world/scene.js coffeeState
const center = it => { const [x0, y0, x1, y1] = footOf(it); return [(x0 + x1) / 2, (y0 + y1) / 2]; };
const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };  // a fixed random per index
const wx = () => (typeof hub.weather === "function" ? hub.weather() : "clear");
const night = () => (hub.focusMode ? 0 : hub.nightLevel?.() || 0);
function people(room) {
  const out = [];
  if (room === "office") { for (const e of ents.values()) if (!e.leaving && !e.queued) out.push({ x: e.x, y: e.y, seated: !!e.seated && !e.path?.length, busy: e.pose === "work" || e.pose === "type" || !!e.working }); if (chief.room === "office") out.push({ x: chief.x, y: chief.y, seated: chief.at === "pc" && !chief.path.length }); }
  if (room === "lounge") { for (const l of hub.loungers?.values() || []) if (!l.partyRoom) out.push({ x: l.x, y: l.y, seated: !l.path?.length }); if (chief.room === "lounge") out.push({ x: chief.lx, y: chief.ly, seated: !chief.lpath?.length }); }
  return out;
}

/* ---------- objects that move: chairs, plants (items/base.js pieces) ---------- */
const deskOf = new Map();  // chair uid → { at, dir: [dx, dy] | null }: the desk it belongs to (looked up every 3 s)
function chairDir(it, room, t) {
  let c = deskOf.get(it.uid);
  if (c && t - c.at < 3000) return c.dir;
  const [cx, cy] = center(it); let best = null, bd = 18;
  for (const o of itemsIn(room)) {
    const d = defOf(o.type); if (d.cat !== "bureau" || o.uid === it.uid) continue;
    const [x0, y0, x1, y1] = footOf(o), nx = Math.max(x0, Math.min(x1, cx)), ny = Math.max(y0, Math.min(y1, cy)), dist = Math.hypot(cx - nx, cy - ny);
    if (dist < bd) { bd = dist; const dx = cx - (x0 + x1) / 2, dy = cy - (y0 + y1) / 2, n = Math.hypot(dx, dy) || 1; best = [dx / n, dy / n]; }
  }
  deskOf.set(it.uid, c = { at: t, dir: best });
  return best;
}
// a piece used a moment ago bounces a little (world/upkeep.js poke): a button pressed, a door shut, a lever pulled
function pieceMotion(it, def, t) {
  const m = motionOf(it, def, t), k = it._poke ? Math.max(0, performance.now() - it._poke) / 420 : 1;
  if (k >= 1) return m;
  return { dx: 0, dy: 0, ...m, lift: Math.sin(k * Math.PI) * 1.4 * (1 - k) };
}
function motionOf(it, def, t) {
  if (hub.focusMode || it.on_) return null;
  const room = it.room;
  if (def.chair && def.cat === "chaises") {
    const dir = chairDir(it, room, t); if (!dir) return null;
    const [cx, cy] = center(it), who = people(room).find(p => Math.hypot(p.x - cx, p.y - cy) < 9);
    const want = who ? 0 : 2.6;  // empty: left pushed back from the desk
    it._push = (it._push ?? want) + (want - (it._push ?? want)) * 0.08;
    const rock = who?.seated ? Math.sin(t / 380 + it.uid) * (who.busy ? 0.35 : 0.15) : 0;
    const k = it._push + rock;
    return Math.abs(k) < 0.02 ? null : { dx: dir[0] * k, dy: dir[1] * k };
  }
  if (def.cat === "plantes" || def.plant || it.type === "pampas" || it.type === "bonsai") {
    const [cx, cy] = center(it);
    const now = performance.now();  // the same clock as the walkers (world/motion.js), not the frame's
    if (movingNear(room, cx, cy, 14, now)) it._rustle = now;
    const since = it._rustle ? Math.max(0, now - it._rustle) : 1e9, shake = since < 1600 ? (1 - since / 1600) * 0.09 * Math.sin(since / 70) : 0;
    const draught = 0.012 * Math.sin(t / 1300 + it.uid * 1.7), dry = hub.plantState?.(it);  // thirsty: drooping, yellowing (world/upkeep.js)
    return { dx: 0, dy: 0, sway: shake + draught * (dry ? 0.3 : 1) + (dry?.droop || 0), tint: dry?.tint };
  }
  return null;
}

/* ---------- doors that open (world/scene.js, rooms/lounge.js, rooms/built.js) ---------- */
const doors = new Map();  // `${room}:${fx}` → how open (0..1), eased
export function doorOpen(room, fx) {
  const key = `${room}:${fx}`, want = !hub.focusMode && movingNear(room, fx, FY + 4, 20) ? 1 : 0, k = doors.get(key) ?? 0, nk = k + (want - k) * (want ? 0.18 : 0.06);
  doors.set(key, nk < 0.005 ? 0 : nk);
  return nk;
}
// draw(): the closed door at (x, y); its leaf (lx, ly, lw, lh, in the drawing) swings open on its left hinge by k
export function drawDoorOpen(draw, x, y, k, leaf = [4, 4, 22, 44]) {
  draw();
  if (k < 0.02) return;
  const [lx, ly, lw, lh] = leaf, hx = x + lx, s = 1 - 0.78 * k;
  px(hx, y + ly, lw, lh, "#0d0a12");  // the doorway: dark, a little light on its floor
  ctx.save(); ctx.globalAlpha = 0.35 * k; px(hx + 2, y + ly + lh - 4, lw - 4, 4, "#f4d9a0"); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(hx * S, (y + ly - 0.5) * S, lw * s * S, (lh + 0.5) * S); ctx.clip();
  ctx.translate(hx * S, 0); ctx.scale(s, 1); ctx.translate(-hx * S, 0); draw();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.28 * k; px(hx, y + ly, lw * s, lh, "#000"); ctx.restore();  // the leaf turned away from the light
}

/* ---------- steam, motes (top layer, after the lights: iso/rooms.js lampsOver) ---------- */
function steam(x, y, z, t, n, thick, seed) {
  for (let i = 0; i < n; i++) {
    const life = 2200 + rnd(seed + i) * 900, k = ((t + rnd(seed * 3 + i) * life) % life) / life;
    const p = P(x + Math.sin(k * 5 + i) * 1.2 * k, y, z + k * 16), r = (1 + k * 3.2) * S;
    const a = (thick ? 0.32 : 0.14) * Math.sin(Math.PI * k);
    const g = ctx.createRadialGradient(p.x * S, p.y * S, 0, p.x * S, p.y * S, r);
    g.addColorStop(0, `rgba(240,240,248,${a})`); g.addColorStop(1, "rgba(240,240,248,0)");
    ctx.fillStyle = g; ctx.fillRect(p.x * S - r, p.y * S - r, 2 * r, 2 * r);
  }
}
const patches = new Map();  // room → the sun's patches on the floor this frame ([[x, y] × 4], power), from floorShade
function topFx(room, t) {
  if (hub.focusMode) return;
  ctx.save();
  const all = itemsIn(room), ppl = people(room);
  for (const it of all) {
    const d = defOf(it.type);
    if (d.role === "coffee") {
      const [cx, cy] = center(it), brewing = (room === "office" && brewingNow()) || ppl.some(p => Math.hypot(p.x - cx, p.y - cy) < 14 && p.seated);
      steam(cx, cy, Math.min(26, (ART[d.art]?.H || 20) * 0.7), t, brewing ? 5 : 2, brewing, it.uid);
    } else if (d.cook === "stove") {
      const [cx, cy] = center(it); if (ppl.some(p => Math.hypot(p.x - cx, p.y - cy) < 18 && p.seated)) steam(cx, cy, 17, t, 4, true, it.uid);
    }
  }
  // dust motes in the sun's patches: tiny specks floating, caught by the light
  const sp = patches.get(room);
  if (sp?.list.length && hub.quality?.mode !== "eco") {
    ctx.globalCompositeOperation = "lighter";
    sp.list.forEach(([q, pow], w) => {
      for (let i = 0; i < 14; i++) {
        const u = rnd(w * 31 + i), v = rnd(w * 17 + i * 3), drift = (t / (9000 + i * 300) + rnd(i)) % 1;
        const a = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u], b = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
        const fx = a[0] + (b[0] - a[0]) * v, fy = a[1] + (b[1] - a[1]) * v, z = 4 + 26 * ((v + drift) % 1), tw = 0.5 + 0.5 * Math.sin(t / 400 + i * 2.1);
        const p = P(fx + Math.sin(t / 2100 + i) * 2, fy, z);
        ctx.fillStyle = `rgba(255,246,214,${0.55 * pow * tw})`; ctx.fillRect(p.x * S, p.y * S, Math.max(1, 0.5 * S), Math.max(1, 0.5 * S));
      }
    });
  }
  ctx.restore();
}

/* ---------- on the floor (iso/rooms.js floorShade, floor units, clipped to the floor) ---------- */
const cloudPass = t => Math.max(0, Math.sin(t / 9000) * Math.sin(t / 3700 + 1));  // a cloud passing over the sun
// how much of the sun gets through the weather now
export function sunVeil(t) { const w = wx(); return ({ cloud: 0.6, rain: 0.3, storm: 0.15, snow: 0.45 }[w] ?? 1) * (w === "sun" ? 1 : 1 - 0.45 * cloudPass(t)); }
function floorFx(room, t, g, R, list) {
  patches.set(room, { list: list || [] });
  if (hub.focusMode) return;
  const n = night(), shiny = { carrelage: 1, beton: 0.8, damier: 0.9, parquet: 0.45, chevron: 0.45 }[hub.decor?.[room]?.floor] || 0;
  for (const it of itemsIn(room)) {
    const d = defOf(it.type), [cx, cy] = center(it);
    // water: the light of the water rippling around it
    if (it.type === "aquarium" || it.type === "fountain") {
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + t / 2600, r = 7 + 5 * rnd(i + it.uid) + Math.sin(t / 700 + i) * 1.5, k = 0.5 + 0.5 * Math.sin(t / 330 + i * 1.9);
        const x = cx + Math.cos(a) * r * 1.3, y = cy + 4 + Math.sin(a) * r * 0.7, gr = g.createRadialGradient(x, y, 0, x, y, 3.2);
        gr.addColorStop(0, `rgba(120,220,255,${(0.07 + 0.12 * n) * k})`); gr.addColorStop(1, "rgba(120,220,255,0)"); g.fillStyle = gr; g.fillRect(x - 3.2, y - 3.2, 6.4, 6.4);
      }
      g.restore();
    }
    // a shiny floor: the lamp's glow mirrored under it
    if (shiny && n > 0 && d.light && lampLit(it)) {
      g.save(); g.globalCompositeOperation = "lighter";
      const st = hub.styleOf(it), col = st.lc || d.lc || "#ffd678", [r, gg, b] = [1, 3, 5].map(j => parseInt(col.slice(j, j + 2), 16)), L = Math.min(22, (d.light || 20) * 0.5);
      const gr = g.createLinearGradient(cx, cy, cx + L, cy + L); gr.addColorStop(0, `rgba(${r},${gg},${b},${0.22 * shiny * n})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 2, cy + 1); g.lineTo(cx + 1, cy - 2); g.lineTo(cx + L + 2, cy + L - 1); g.lineTo(cx + L - 1, cy + L + 2); g.closePath(); g.fill(); g.restore();
    }
    // at night, the headlights of a car down in the street sweep the floor through the windows
    if (n > 0.25 && d.cat === "fenetres" && d.kind === "wall" && !it.closed && room !== "terrace") {
      const period = 13000 + (it.uid % 7) * 1500, k = ((t + it.uid * 3911) % period) / period; if (k > 0.22) continue;
      const u = k / 0.22, left = it.side === "left", a = it.x + d.w * (left ? 1 - u : u), dep = 18 + 30 * Math.sin(u * Math.PI);
      const [x, y] = left ? [dep, R.h - a] : [a, FY + dep], w = Math.sin(u * Math.PI);
      g.save(); g.globalCompositeOperation = "lighter"; g.translate(x, y); g.rotate(left ? Math.PI / 2 : 0); g.scale(1, 0.35);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 22); gr.addColorStop(0, `rgba(255,236,190,${0.16 * w * n})`); gr.addColorStop(1, "rgba(255,236,190,0)");
      g.fillStyle = gr; g.fillRect(-22, -22, 44, 44); g.restore();
    }
  }
}

/* ---------- on the walls: the windows' glass (iso/rooms.js lampsOver, back layer) ---------- */
function wallFx(room, t) {
  if (hub.focusMode) return;
  const w = wx(), rain = w === "rain" || w === "storm", n = night(), wins = itemsIn(room).filter(it => { const d = defOf(it.type); return d.cat === "fenetres" && d.kind === "wall"; });
  if (!wins.length || (!rain && n < 0.15)) return;
  for (const it of wins) {
    const d = defOf(it.type), gl = d.glass || { x: 3, y: 3, w: d.w - 6, h: d.h - 8 }, x0 = it.x + gl.x, y0 = it.y + gl.y;
    (it.side === "left" ? hub.ISO.onLeftWall : hub.ISO.onBackWall).call(hub.ISO, () => {
      ctx.save(); ctx.beginPath(); ctx.rect(x0 * S, y0 * S, gl.w * S, gl.h * S); ctx.clip();
      if (n > 0.15) {  // the room mirrored in the dark glass: a warm haze low, a faint pane highlight
        const gr = ctx.createLinearGradient(0, (y0 + gl.h) * S, 0, y0 * S); gr.addColorStop(0, `rgba(255,214,140,${0.12 * n})`); gr.addColorStop(1, "rgba(255,214,140,0)");
        ctx.fillStyle = gr; ctx.fillRect(x0 * S, y0 * S, gl.w * S, gl.h * S);
      }
      if (rain) {  // drops running down the glass
        ctx.strokeStyle = `rgba(210,228,255,${w === "storm" ? 0.55 : 0.42})`; ctx.lineWidth = Math.max(1, 0.35 * S);
        const cnt = Math.round(gl.w / (w === "storm" ? 2.2 : 3.4));
        for (let i = 0; i < cnt; i++) {
          const sp = 0.012 + rnd(i + it.uid) * 0.02, x = x0 + rnd(i * 7 + it.uid) * gl.w, y = y0 + ((t * sp + rnd(i * 13) * gl.h * 3) % (gl.h + 6)) - 3, len = 1.5 + rnd(i * 5) * 3;
          ctx.beginPath(); ctx.moveTo(x * S, y * S); ctx.lineTo((x + 0.15) * S, (y + len) * S); ctx.stroke();
          ctx.fillStyle = "rgba(230,240,255,.5)"; ctx.fillRect(x * S, (y + len) * S, Math.max(1, 0.6 * S), Math.max(1, 0.6 * S));
        }
      }
      ctx.restore();
    });
  }
}

/* ---------- the terrace in the rain (rooms/built.js, 2D) ---------- */
export function terraceRain(t) {
  const w = wx(); if (hub.focusMode || (w !== "rain" && w !== "storm")) return;
  const many = w === "storm" ? 90 : 55;
  ctx.save(); ctx.strokeStyle = "rgba(200,220,255,.45)"; ctx.lineWidth = Math.max(1, 0.3 * S);
  for (let i = 0; i < many; i++) {  // streaks
    const x = rnd(i) * W, y = ((t * (0.18 + rnd(i * 3) * 0.08)) + rnd(i * 7) * 240) % 240, l = 4 + rnd(i * 11) * 3;
    ctx.beginPath(); ctx.moveTo(x * S, y * S); ctx.lineTo((x - 1) * S, (y + l) * S); ctx.stroke();
  }
  for (let i = 0; i < many / 3; i++) {  // rings on the deck
    const period = 900 + rnd(i * 5) * 600, k = ((t + rnd(i * 9) * period) % period) / period, x = rnd(i * 17 + 1) * W, y = 80 + rnd(i * 23 + 2) * 150;
    ctx.strokeStyle = `rgba(210,228,255,${0.45 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(x * S, y * S, (0.5 + k * 3.5) * S, (0.25 + k * 1.4) * S, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- where a sound comes from (world/shop.js jukebox) ---------- */
function spatial(type) {
  const view = hub.ISO?.room;
  for (const room of ["office", "lounge", "meeting", "terrace"]) {
    const it = itemsIn(room).find(i => i.type === type); if (!it) continue;
    if (room !== view) return { gain: 0.22, pan: 0 };  // through the walls
    const [cx, cy] = center(it), z = hub.ISO?.z || 1, sx = (P(cx, cy).x - (hub.ISO?.cam?.x || 0)) * z / W;
    return { gain: Math.min(1.3, 0.6 + 0.5 * z), pan: Math.max(-0.85, Math.min(0.85, sx * 2 - 1)) };
  }
  return { gain: 1, pan: 0 };
}

provide({ get pieceMotion() { return pieceMotion; }, get physicsTop() { return topFx; }, get physicsFloor() { return floorFx; }, get physicsWall() { return wallFx; }, get sunVeil() { return sunVeil; }, get spatial() { return spatial; } });
