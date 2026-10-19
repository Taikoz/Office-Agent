// What the rooms share in isometric view (iso/engine.js): the objects bought, the left wall, the night over the office,
// the light of the lamps.

import { hub, provide } from "../hub.js";
import { DESKS, S, chief, ctx, ents, px, roomSize, withCtx } from "../core/core.js";
import { lampLit } from "../items/lamp.js";
import { ART } from "../svg/base.js";
import { buy, defOf, drawItem, drawRoomItems, itemsIn } from "../world/build.js";
import { footOf, rotPt } from "../world/place.js";
import { P, roomDepth } from "./engine.js";
import { PX } from "./pixi.js";

// the objects bought for this room standing in it (rugs and wall objects are painted with the floor and the walls):
// each part of each one, a piece of the world sorted by depth (world/place.js partsOf)
export function isoItems(room, t, G, items) {
  for (const it of itemsIn(room)) {
    const df = defOf(it.type);
    if (df.kind === "rug" || df.kind === "wall" || (buy.moving && (buy.moving.uid === it.uid || buy.moving.uid === it.on_))) continue;
    items.push(...df.pieces(it, t, G));
  }
  hub.peerItems?.(room, t, G, items);  // the other chiefs on the internal network (world/peers.js)
}

// the left wall (a 2D strip as long as the room is deep, drawn by G.onLeftWall): its baseboard and the objects hung there
export function leftWallDecor(room, t) {
  const D = roomDepth();
  px(0, 66.5, D, 3.5, "#2a1f18"); px(0, 66.5, D, 0.6, "#4a3828");
  drawRoomItems(room, t, "leftwall");
}

// The night and the lights (lampsOver, after the world is sorted; each frame). The room's shell (floor, walls and what
// hangs on them, iso/pixi.js back layer) gets the night, wiped where the lights shine (a pool on the floor in
// perspective, a neon in its own shape and around it) and their colour added; never the background, and never over
// the objects: they stand in front. The objects and the people (the sprites of the world) get their light one by one
// (spriteTint, from the lights of the room: dark and bluish far from any, lit and coloured next to one). Over all of it
// only the lamps' bulbs glow. The colour of the hour (warm at sunset, pink at dawn) the same way.
const FY = 70, STRIP = 70;  // the floor starts at the wall's foot; the wall strip is 70 high (iso/engine.js)
const veil = document.createElement("canvas"), vg = veil.getContext("2d");
const lightmap = document.createElement("canvas"), lg = lightmap.getContext("2d");
const rgb = col => [1, 3, 5].map(i => parseInt((col || "#ffd678").slice(i, i + 2), 16));
// a soft ellipse of light on the floor (screen units)
function pool(g, cx, cy, r, fill) {
  g.save(); g.translate(cx, cy); g.scale(1, 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); fill(gr); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r);
  g.restore();
}
function blob(g, cx, cy, r, fill) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); fill(gr); g.fillStyle = gr; g.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
// what shines in this room now: { fl: [x, y] floor point, fr: its reach on the floor, floor / head: screen points, r, color, power, bulb }
function lightsOf(room, t, night) {
  const out = [], push = (fx, fy, z, reach, color, power, bulb) => { const f = P(fx, fy, 0), h = P(fx, fy, z); out.push({ fl: [fx, fy], fr: reach, floor: [f.x * S, f.y * S], head: [h.x * S, h.y * S], r: reach * S, color, power, bulb }); };
  if (hub.Happening.get("power").on && room === "office") return out;
  for (const it of itemsIn(room)) {
    const d = defOf(it.type);
    if (d.light && lampLit(it)) {
      const [x0, y0, x1, y1] = footOf(it), at = d.lightAt && rotPt(d, it.rot || 0, ...d.lightAt);  // where its light is (an arc lamp: under its dome)
      const flick = it.type === "chandelier" || it.type === "candles" ? 0.93 + 0.07 * Math.sin(t / 90 + it.uid) * Math.sin(t / 37) : 1;
      push(at ? it.x + at[0] : (x0 + x1) / 2, at ? it.y + at[1] : (y0 + y1) / 2, d.light, (d.lightR || 46) * 1.15, hub.styleOf(it).lc || d.lc || "#ffd678", flick, it.type === "lampled" ? 5 : 3);
    }
    if (!night) continue;
    // the screens at night, only when they are on: the TV flickers, the arcade's colours, the aquarium's blue water
    const kind = { tvunit: "tv", walltv: "tv", arcade: "arcade", aquarium: "aqua" }[it.type]; if (!kind) continue;
    if (kind === "tv" && !(d.isoState?.(it, t)?.on ?? d.state?.(it, t))) continue;
    const wall = d.kind === "wall", [cx, cy] = wall ? [it.x + d.w / 2, FY + 10] : (() => { const [x0, y0, x1, y1] = footOf(it); return [(x0 + x1) / 2, (y0 + y1) / 2 + 6]; })();
    const flick = kind === "tv" ? 0.65 + 0.35 * Math.abs(Math.sin(t / 230) * Math.sin(t / 97 + it.uid)) : kind === "arcade" ? 0.85 + 0.15 * Math.sin(t / 300) : 0.9;
    push(cx, cy, 14, kind === "tv" ? 50 : 34, kind === "tv" ? (Math.floor(t / 1800) % 3 ? "#9ecbff" : "#d8e6ff") : kind === "arcade" ? "#c06bff" : "#4fd0ff", flick, 0);
  }
  if (night) for (const e of ents.values()) {  // a dev at work at night: the warm desk lamp, the screen's cold glow
    if (e.leaving || e.queued || !e.seated || !DESKS.includes(e.desk)) continue;
    push(e.desk.x, e.desk.y + 8, 20, 34, "#ffd678", 0.85, 0);
    push(e.desk.x, e.desk.y + 4, 16, 16, "#7fc8ff", 0.7, 0);
  }
  return out;
}
// the neon signs and wall lamps: where they shine on the floor (for the sprites near them)
function glowLights(room, glows) {
  const R = roomSize(room);
  return glows.map(it => { const d = defOf(it.type), st = hub.styleOf(it), a = it.x + d.w / 2; return { fl: it.side === "left" ? [8, R.h - a] : [a, FY + 8], fr: 34, color: st.c || st.sw || "#ff4fb8", power: 0.7 }; });
}
const state = new Map();  // room → { n, lights, tint }: for the sprites of the next frame (spriteTint)
// the light of a sprite standing at (fx, fy) on the floor, as a colour to multiply it by
function spriteTint(fx, fy) {
  const st = state.get(hub.ISO.room); if (!st || (!st.n && st.tint === 0xffffff)) return st?.tint ?? 0xffffff;
  const k = Math.min(1, st.n / 0.625);  // how dark the night is
  let r = 1 - 0.7 * k, g = 1 - 0.66 * k, b = 1 - 0.45 * k;  // far from any light: dark, bluish
  for (const L of st.lights) {
    const dist = Math.hypot(fx - L.fl[0], fy - L.fl[1]), w = Math.max(0, 1 - dist / (L.fr * 1.1)) * L.power * k; if (!w) continue;
    const [cr, cg, cb] = rgb(L.color); r += w * (0.55 + 0.45 * cr / 255); g += w * (0.55 + 0.45 * cg / 255); b += w * (0.55 + 0.45 * cb / 255);
  }
  const tr = (st.tint >> 16) & 255, tg = (st.tint >> 8) & 255, tb = st.tint & 255;
  return (Math.round(Math.min(1, r) * tr) << 16) | (Math.round(Math.min(1, g) * tg) << 8) | Math.round(Math.min(1, b) * tb);
}
export function nightOver() {}  // the night is part of lampsOver (every room)
export function lampsOver(room) {
  lightsAndNight(room);
  hub.ISO.back(() => hub.physicsWall?.(room, performance.now()));  // the windows: rain on the glass, the room mirrored at night (world/physics.js)
  hub.physicsTop?.(room, performance.now());  // steam, dust motes in the sun
}
function lightsAndNight(room) {
  const t = performance.now(), n = hub.focusMode ? 0 : (hub.nightLevel?.() || 0) * 1.25;
  const glows = hub.Happening.get("power").on && room === "office" ? [] : itemsIn(room).filter(it => { const d = defOf(it.type); return d.glow && d.kind === "wall" && !it.off; });
  const lights = lightsOf(room, t, n > 0);
  // the colour of the hour: warm late in the afternoon, pink at dawn
  const d = hub.clockNow(), h = d.getHours() + d.getMinutes() / 60, dusk = h > 16 && h < 20 ? Math.sin(Math.PI * (h - 16) / 4) : 0, dawn = h > 6 && h < 8.5 ? Math.sin(Math.PI * (h - 6) / 2.5) : 0;
  const k = hub.focusMode ? 0 : Math.max(dusk, dawn), [, tg, tb] = dusk >= dawn ? [255, 196, 140] : [255, 214, 222];
  const tint = k ? (255 << 16) | (Math.round(255 - (255 - tg) * k) << 8) | Math.round(255 - (255 - tb) * k) : 0xffffff;
  state.set(room, { n, lights: [...lights, ...(n > 0 ? glowLights(room, glows) : [])], tint });
  PX.tint = tint;
  if (!n && !k) {  // daytime: only a soft warmth under the lamps left on
    if (lights.length) hub.ISO.back(() => { ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const L of lights) { const [R, G, B] = rgb(L.color); pool(ctx, L.floor[0], L.floor[1], L.r, gr => { gr.addColorStop(0, `rgba(${R},${G},${B},${0.05 * L.power})`); gr.addColorStop(1, `rgba(${R},${G},${B},0)`); }); } ctx.restore(); });
    return;
  }
  hub.ISO.back(() => {  // on the room's shell, under the world
    const W = ctx.canvas.width, H = ctx.canvas.height, tf = ctx.getTransform();
    if (k) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = `rgba(255,${dusk >= dawn ? 120 : 150},${dusk >= dawn ? 50 : 170},${0.2 * k})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (n <= 0) return;
    // the night's veil, wiped where the lights shine and in the shape of the neons, laid over the shell only
    if (veil.width !== W || veil.height !== H) { veil.width = W; veil.height = H; lightmap.width = W; lightmap.height = H; }
    vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalCompositeOperation = "source-over"; vg.clearRect(0, 0, W, H);
    vg.fillStyle = `rgba(6, 10, 40, ${n})`; vg.fillRect(0, 0, W, H);
    vg.setTransform(tf); vg.globalCompositeOperation = "destination-out";
    for (const L of lights) pool(vg, L.floor[0], L.floor[1], L.r, g => { g.addColorStop(0, `rgba(0,0,0,${0.92 * L.power})`); g.addColorStop(0.55, `rgba(0,0,0,${0.5 * L.power})`); g.addColorStop(1, "rgba(0,0,0,0)"); });
    for (const it of glows) {
      vg.save(); withCtx(vg, () => (it.side === "left" ? hub.ISO.onLeftWall : hub.ISO.onBackWall).call(hub.ISO, () => drawItem(it, t))); vg.restore();
      const dd = defOf(it.type), p = hub.ISO.wallPt(it.side || "back", it.x + dd.w / 2, it.y + dd.h / 2), r = (Math.max(dd.w, dd.h) * 0.5 + 16) * S;
      blob(vg, p.x * S, p.y * S, r, g => { g.addColorStop(0, "rgba(0,0,0,.7)"); g.addColorStop(1, "rgba(0,0,0,0)"); });
      if (it.type === "sconce") pool(vg, p.x * S, (p.y + 22) * S, 30 * S, g => { g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); });
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "source-atop"; ctx.drawImage(veil, 0, 0); ctx.restore();
    // the colour of the lights, kept to the shell (the background stays as it is)
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = "source-over"; lg.clearRect(0, 0, W, H); lg.setTransform(tf); lg.globalCompositeOperation = "lighter";
    for (const L of lights) { const [R, G, B] = rgb(L.color), a = 0.2 * n * L.power; pool(lg, L.floor[0], L.floor[1], L.r, g => { g.addColorStop(0, `rgba(${R},${G},${B},${a})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); }); }
    for (const it of glows) {
      const dd = defOf(it.type), st = hub.styleOf(it), [R, G, B] = rgb(st.c || st.sw || "#ff4fb8"), p = hub.ISO.wallPt(it.side || "back", it.x + dd.w / 2, it.y + dd.h / 2);
      blob(lg, p.x * S, p.y * S, (Math.max(dd.w, dd.h) * 0.5 + 18) * S, g => { g.addColorStop(0, `rgba(${R},${G},${B},${0.3 * n})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); });
    }
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = "destination-in"; lg.drawImage(ctx.canvas, 0, 0);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(lightmap, 0, 0); ctx.restore();
  });
  // over everything, only the lamps' bulbs (no screen, no neon: those stay behind what stands in front)
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const L of lights) if (L.bulb) {
    const [R, G, B] = rgb(L.color);
    blob(ctx, L.head[0], L.head[1], L.bulb * 3.2 * S, g => { g.addColorStop(0, `rgba(${R},${G},${B},${(0.15 + 0.45 * n) * L.power})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); });
  }
  ctx.restore();
}
provide({ get spriteTint() { return spriteTint; } });

/* ---------- on the floor, under everything (world/build.js drawRoomItems "rug", in floor units) ----------
   The sun: through each window a patch of light on the floor, in the window's shape and its bars, longer when the
   sun is low, moving with the hour (a closed blind stops it); and the shadows it casts, toward the inside of the room.
   The lamps at night: each object and each person near a lit lamp casts a shadow away from it. Under every piece of
   furniture a soft contact shadow, so it stands on the floor. */
const sunNow = (t = performance.now()) => {
  const d = hub.clockNow(), h = d.getHours() + d.getMinutes() / 60;
  if (h < 7 || h > 19.5) return null;
  const day = Math.sin(Math.PI * (h - 7) / 12.5), elev = 0.22 + 0.95 * day;  // radians over the horizon
  return { h, power: Math.min(1, day * 1.4) * (hub.sunVeil ? hub.sunVeil(t) : 1),  // the clouds dim it (world/physics.js)
    len: Math.min(3.4, 1 / Math.tan(elev)), drift: (13 - h) / 6 * 0.7,  // the sun turns: from the left in the morning
    warm: h > 16.5 ? Math.min(1, (h - 16.5) / 2.5) : h < 8.5 ? Math.min(1, (8.5 - h) / 1.5) : 0 };
};
const heightOf = d => Math.min(60, ART[d.art]?.H || 18);
function softEllipse(g, cx, cy, rx, ry, ang, alpha, color = "0,0,0") {
  g.save(); g.translate(cx, cy); if (ang) g.rotate(ang); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(${color},${alpha})`); gr.addColorStop(0.6, `rgba(${color},${alpha * 0.55})`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(-rx, -rx, 2 * rx, 2 * rx); g.restore();
}
// who stands in this room (their feet), for the shadows
function peopleIn(room) {
  const out = [];
  if (room === "office") { for (const e of ents.values()) if (!e.leaving && !e.queued) out.push([e.x, e.y]); if (chief.room === "office") out.push([chief.x, chief.y]); }
  if (room === "lounge") { for (const l of hub.loungers?.values() || []) if (!l.partyRoom) out.push([l.x, l.y]); if (chief.room === "lounge") out.push([chief.lx, chief.ly]); }
  if (room !== "office" && room !== "lounge" && chief.room === room) out.push([chief.lx, chief.ly]);  // a built room (world/chief.js)
  return out;
}
export function floorShade(room, t) {
  if (hub.focusMode) return;
  const R = roomSize(room), g = ctx, sun = sunNow(t), patches = [], night = hub.nightLevel?.() || 0, all = itemsIn(room);
  const solids = all.filter(it => { const d = defOf(it.type); return d.kind !== "rug" && d.kind !== "wall" && !it.on_ && !d.walkable; });
  g.save(); g.scale(S, S);  // floor units (the floor's transform works in pixels, like px)
  g.beginPath(); g.rect(0, FY, R.w, R.h - FY); g.clip();
  // contact shadows: furniture stands on the floor
  for (const it of solids) { const [x0, y0, x1, y1] = footOf(it); softEllipse(g, (x0 + x1) / 2, (y0 + y1) / 2 + 0.6, (x1 - x0) / 2 + 2.4, (y1 - y0) / 2 + 2, 0, 0.22); }
  // the sun: the windows' light on the floor, and the shadows it casts
  if (sun && sun.power > 0.05 && room !== "terrace") {
    const col = sun.warm ? `255,${Math.round(236 - 70 * sun.warm)},${Math.round(190 - 110 * sun.warm)}` : "255,244,214";
    for (const it of all) {
      const d = defOf(it.type); if (d.cat !== "fenetres" || d.kind !== "wall" || it.closed) continue;
      const gl = d.glass || { x: 3, y: 3, w: d.w - 6, h: d.h - 8 }, zTop = STRIP - (it.y + gl.y), zBot = STRIP - (it.y + gl.y + gl.h), left = it.side === "left";
      // a point of the glass (along the wall a, height z) where its light falls on the floor
      const fall = (a, z) => left ? [z * sun.len, R.h - a + sun.drift * z * sun.len] : [a + sun.drift * z * sun.len, FY + z * sun.len];
      const a0 = it.x + gl.x, a1 = it.x + gl.x + gl.w, poly = [fall(a0, zBot), fall(a1, zBot), fall(a1, zTop), fall(a0, zTop)];
      patches.push([poly, sun.power]);
      g.save(); g.globalCompositeOperation = "lighter";
      const [nx, ny] = fall((a0 + a1) / 2, zBot), [fx, fy] = fall((a0 + a1) / 2, zTop), gr = g.createLinearGradient(nx, ny, fx, fy);
      gr.addColorStop(0, `rgba(${col},${0.32 * sun.power})`); gr.addColorStop(1, `rgba(${col},${0.08 * sun.power})`);
      g.fillStyle = gr; g.beginPath(); poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.restore();
      // the window's bars: thin shadows across the patch
      const bars = gl.shape === "round" ? [] : d.type === "windowbay" ? [[1 / 3, null], [2 / 3, null]] : [[0.5, null], [null, 0.5]];
      g.save(); g.strokeStyle = `rgba(0,0,0,${0.18 * sun.power})`; g.lineWidth = 1.2;
      for (const [fa, fz] of bars) {
        g.beginPath();
        if (fa != null) { const a = a0 + (a1 - a0) * fa; g.moveTo(...fall(a, zBot)); g.lineTo(...fall(a, zTop)); }
        else { const z = zBot + (zTop - zBot) * fz; g.moveTo(...fall(a0, z)); g.lineTo(...fall(a1, z)); }
        g.stroke();
      }
      g.restore();
    }
    // the shadows of the sun, toward the inside of the room (away from the back wall), drifting with the hour
    const ang = Math.atan2(1, sun.drift), k = 0.13 * sun.power;
    const cast = (x, y, w, h) => { const L = Math.min(26, h * sun.len * 0.32); softEllipse(g, x + Math.cos(ang) * L / 2, y + Math.sin(ang) * L / 2, L / 2 + w / 2, w * 0.42, ang, k); };
    for (const it of solids) { const [x0, y0, x1, y1] = footOf(it); cast((x0 + x1) / 2, (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0, 14), heightOf(defOf(it.type))); }
    for (const [x, y] of peopleIn(room)) cast(x, y, 6, 26);
  }
  // the lamps at night: what stands near a lit lamp casts a shadow away from it
  if (night > 0) {
    const lamps = all.filter(it => defOf(it.type).light && lampLit(it)).map(it => { const d = defOf(it.type), [x0, y0, x1, y1] = footOf(it), at = d.lightAt && rotPt(d, it.rot || 0, ...d.lightAt);
      return { uid: it.uid, x: at ? it.x + at[0] : (x0 + x1) / 2, y: at ? it.y + at[1] : (y0 + y1) / 2, r: (d.lightR || 46) * 1.2, z: d.light || 30 }; });
    const cast = (uid, x, y, w, h) => {
      for (const L of lamps) {
        if (L.uid === uid) continue;
        const dx = x - L.x, dy = y - L.y, dist = Math.hypot(dx, dy); if (dist > L.r || dist < 2) continue;
        const len = Math.max(4, Math.min(28, h * dist / Math.max(10, L.z - h * 0.3) * 0.7)), ang = Math.atan2(dy, dx);
        softEllipse(g, x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2, len / 2 + w / 2, w * 0.45, ang, 0.32 * night * 2 * (1 - dist / L.r));
      }
    };
    for (const it of solids) { const [x0, y0, x1, y1] = footOf(it); cast(it.uid, (x0 + x1) / 2, (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0, 14), heightOf(defOf(it.type))); }
    for (const [x, y] of peopleIn(room)) cast(null, x, y, 6, 26);
  }
  const hov = hub.hoverUid != null && all.find(it => it.uid === hub.hoverUid);  // the object under the pointer: its outline glows (ui/hover.js)
  if (hov && defOf(hov.type).kind !== "wall") {
    const [x0, y0, x1, y1] = footOf(hov), a = 0.55 + 0.25 * Math.sin(t / 220);
    g.save(); g.strokeStyle = `rgba(251,170,8,${a})`; g.lineWidth = 0.9; g.shadowColor = "#fbaa08"; g.shadowBlur = 6; g.strokeRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
    g.fillStyle = `rgba(251,170,8,${a * 0.18})`; g.fillRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2); g.restore();
  }
  hub.physicsFloor?.(room, t, g, R, patches);  // water light, reflections, headlights; the patches for the dust motes (world/physics.js)
  g.restore();
}
provide({ get floorShade() { return floorShade; } });
