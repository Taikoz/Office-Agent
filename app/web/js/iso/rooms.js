// What the rooms share in isometric view (iso/engine.js): the objects bought, the left wall, the night over the office,
// the light of the lamps.

import { hub } from "../hub.js";
import { DESKS, S, ctx, ents, fillScreen, px } from "../core/core.js";
import { ART } from "../svg/base.js";
import { buy, defOf, drawItem, drawRoomItems, itemsIn } from "../world/build.js";
import { footOf } from "../world/place.js";
import { P, roomDepth } from "./engine.js";

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

// the night over the office: the room darkens, a lamp lights each desk where someone works
export function nightOver() {
  const n = hub.focusMode ? 0 : hub.nightLevel();
  if (!n) return;
  fillScreen(`rgba(6, 10, 40, ${n})`);
  for (const e of ents.values()) {
    if (e.leaving || e.queued || !DESKS.includes(e.desk)) continue;
    const p = P(e.desk.x, e.desk.y + 8, 20), x = p.x * S, y = p.y * S, r = 30 * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 214, 120, ${n * 0.55})`); g.addColorStop(1, "rgba(255, 214, 120, 0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

// the light of the lamps that are on
export function lampsOver(room) {
  const h = hub.clockNow().getHours(), night = h < 8 || h >= 19;
  if (!(hub.Happening.get("power").on && room === "office")) for (const it of itemsIn(room)) {  // the neon signs on the walls: a halo of their colour
    const d = defOf(it.type); if (!d.glow || d.kind !== "wall" || it.off) continue;
    const st = hub.styleOf(it), col = st.c || st.sw || "#ff4fb8", p = hub.ISO.wallPt(it.side || "back", it.x + d.w / 2, it.y + d.h / 2), cx = p.x * S, cy = p.y * S, r = (Math.max(d.w, d.h) * 0.5 + 18) * S;
    if (night) {  // the tube shines through the dark: the night's veil wiped where it is (whoever stands in front keeps their place)
      ctx.save(); ctx.globalCompositeOperation = "destination-out";
      (it.side === "left" ? hub.ISO.onLeftWall : hub.ISO.onBackWall).call(hub.ISO, () => drawItem(it, performance.now()));
      ctx.restore();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r), [R, G, B] = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
    g.addColorStop(0, `rgba(${R},${G},${B},${night ? 0.34 : 0.1})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);

  }
  for (const it of itemsIn(room)) if (defOf(it.type).light && it.on && !(hub.Happening.get("power").on && room === "office")) {
    const d = defOf(it.type), [x0, y0, x1, y1] = footOf(it), p = P((x0 + x1) / 2, (y0 + y1) / 2, d.light), cx = p.x * S, cy = p.y * S, r = (d.lightR || 46) * S;
    const col = hub.styleOf(it).lc || d.lc || "#ffd678", [R, G, B] = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${R},${G},${B},${night ? 0.34 : 0.12})`); g.addColorStop(1, `rgba(${R},${G},${B},0)`);  // its colour (an LED column), its reach (a chandelier)
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  }
}
