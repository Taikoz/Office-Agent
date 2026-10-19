// The isometric view, Habbo style: every room is drawn this way. The game keeps simulating in its 2D plane (x from 0 to
// the room's width; the wall from y 0 to 70, the floor from 70 to the room's depth, core.js ROOM): every room is
// projected with the same 2:1 projection, the floor between two back walls (no front wall: everything stays visible).
// A camera shows a part of it: drag the scene to move, the mouse wheel zooms.
//  - the 2D wall strip (y 0..70) is painted on the right wall, sheared: the board, the window, the doors stay where
//    the game thinks they are (the left wall only carries decoration);
//  - the floor and what lies on it (rugs) are projected;
//  - furniture is drawn in volume (svg/iso.js) on its 2D footprint, people and small things upright on their point;
//  - a pointer on the screen is turned back into a 2D point (toScene): every click, drag and drawing of the 2D game
//    keeps working unchanged (ui/panel.js canvasPoint).

import { hub, provide } from "../hub.js";
import { H, S, W, ctx, cv, roomSize } from "../core/core.js";
import { shade } from "../svg/base.js";
import { PX } from "./pixi.js";

let isoNow = null;  // the view while a room is drawn in isometric view (anchored() moves the 2D drawings then)

// the projection: a 2D floor unit is 0.6 screen unit along each axis (x goes down-right, y down-left); heights 1:1
export const IK = 0.6;
const FY = 70, WALL = 46, STRIP = 70;
let FY1 = 232, FX1 = 400;                  // the room drawn: its width, the front of its floor
export let OX = 30 + (FY1 - FY) * IK, OY = 52;  // the back corner of its floor, in the world (the camera shows a part of it)
// a point of the floor (2D x, y) at height z, on screen
export const P = (x, y, z = 0) => ({ x: OX + (x - (y - FY)) * IK, y: OY + (x + (y - FY)) * IK / 2 - z });

class IsoView {
  constructor() { this.regions = []; this.room = ""; this.cams = new Map(); this.z = 0.8; this.cam = { x: 0, y: 0 }; }
  get drawing() { return isoNow === this; }
  // a frame of a room: its size, its camera (the back layer, the world and the canvas over them move with it)
  begin(room) {
    const sz = roomSize(room);
    FX1 = sz.w; FY1 = sz.h; OX = 30 + (FY1 - FY) * IK; OY = 52;
    this.room = room; this.cam = this.cams.get(room) || this.cams.set(room, this.center()).get(room); this.clampCam();
    this.regions = []; isoNow = this;
    const layered = PX.begin(this.cam, this.z);
    ctx.setTransform(this.z, 0, 0, this.z, -this.cam.x * this.z * S, -this.cam.y * this.z * S);
    return layered;
  }
  end() { isoNow = null; PX.end(); }
  /* ---------- the camera ---------- */
  // the room's extent in the world, and the camera kept over it (centered when it fits)
  bounds() { return { w: OX + FX1 * IK + 34, h: OY + (FX1 + FY1 - FY) * IK / 2 + 14 }; }
  center() { const b = this.bounds(); return { x: (b.w - W / this.z) / 2, y: Math.min(0, (b.h - H / this.z) / 2) }; }
  clampCam() {
    const b = this.bounds(), vw = W / this.z, vh = H / this.z, c = this.cam;
    c.x = b.w <= vw ? (b.w - vw) / 2 : Math.max(-20, Math.min(b.w - vw + 20, c.x));
    c.y = b.h <= vh ? (b.h - vh) / 2 : Math.max(-14, Math.min(b.h - vh + 40, c.y));  // room under the HUD at the bottom
  }
  // a point of the screen (scene units) in the world, and back
  toWorld(sx, sy) { return { x: sx / this.z + this.cam.x, y: sy / this.z + this.cam.y }; }
  toScreen(p) { return { x: (p.x - this.cam.x) * this.z, y: (p.y - this.cam.y) * this.z }; }
  // something painted over the whole screen, not moving with the camera (a sky, the night)
  screen(fn) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); try { return fn(); } finally { ctx.restore(); } }
  off() { PX.off(); }
  // what is painted behind the world: the floor, the walls, the sky (the back layer, iso/pixi.js)
  back(fn) { return PX.back(fn); }
  /* ---------- points ---------- */
  // a point of the 2D scene: on the floor, or above the wall's foot standing against the wall (a pan on the stove)
  pt(x, y) { return y >= FY ? P(x, y) : P(x, FY + 3, (FY + 3 - y) * 0.8); }
  floorAt(sx, sy) {
    const a = (sx - OX) / IK, b = (sy - OY) / (IK / 2), x = (a + b) / 2, y = FY + (b - a) / 2;
    return { x, y, inside: x >= 0 && x <= FX1 && y >= FY && y <= FY1 };
  }
  wallAt(sx, sy) {  // the right wall: the 2D strip
    const x = (sx - OX) / IK, foot = OY + x * IK / 2, y = STRIP - (foot - sy) / IK;
    return x >= 0 && x <= FX1 && sy <= foot && sy >= foot - WALL - 3 ? { x, y: Math.max(0, y) } : null;
  }
  // the left wall: its 2D strip (x from its front end, y 0..70), or null
  leftWallAt(sx, sy) {
    const y = FY + (OX - sx) / IK; if (y < FY || y > FY1) return null;
    const foot = P(0, y).y, z = foot - sy, x = FY1 - y;
    return z >= 0 && z <= WALL + 3 ? { x, y: Math.max(0, STRIP - z / IK) } : null;
  }
  // a point of a wall's 2D strip (back: x along the right wall; left: x from its front end), in the world
  wallPt(side, x, y) {
    if (side === "left") return { x: OX - (FY1 - FY) * IK + IK * x, y: OY + (FY1 - FY) * IK / 2 - IK / 2 * x - STRIP * IK + IK * y };
    return { x: OX + IK * x, y: OY - STRIP * IK + IK / 2 * x + IK * y };
  }
  // the wall near a world point, Sims style (the pointer on it, a bit above, or on the floor in front of it): right of
  // the back corner the right wall, left of it the left one; its side and the strip point (y out of 0..70 off the wall)
  nearWall(sx, sy) {
    let side, x, foot;
    if (sx >= OX) { side = "back"; x = (sx - OX) / IK; if (x > FX1) return null; foot = OY + x * IK / 2; }
    else { side = "left"; const y = FY + (OX - sx) / IK; if (y > FY1) return null; x = FY1 - y; foot = P(0, y).y; }
    if (sy < foot - WALL - 30 || sy > foot + 60) return null;
    return { side, x, y: STRIP - (foot - sy) / IK };
  }
  // a wall object's rect (strip units) clickable: as the strip point under the pointer (right wall) or its middle, with uid
  wallRegion(side, r, uid) {
    const pts = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([x, y]) => { const p = this.wallPt(side, x, y); return [p.x, p.y]; });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), mid = { x: r.x + r.w / 2, y: r.y + r.h / 2, uid, wall: side };
    this.region(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys),
      side === "back" ? (sx, sy) => ({ ...(this.wallAt(sx, sy) || mid), uid, wall: side }) : mid, pts);
  }
  // the point of a horizontal plane at height z under a world point (the top of a desk)
  floorAtZ(sx, sy, z) { return this.floorAt(sx, sy + z); }
  // the 2D point under a screen point: the topmost piece drawn there, else the right wall, else the floor
  // (bare: only the wall and the floor, an object being placed in the buy mode goes there)
  toScene(px, py, bare = false) {
    const { x: sx, y: sy } = this.toWorld(px, py);
    if (!bare) for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (sx < r.x || sx > r.x + r.w || sy < r.y || sy > r.y + r.h || (r.poly && !inPoly(r.poly, sx, sy))) continue;
      return r.inv(sx, sy);
    }
    const w = this.wallAt(sx, sy); if (w) return w;
    const f = this.floorAt(sx, sy);
    return f.inside ? { x: f.x, y: f.y } : { x: -999, y: -999 };
  }
  /* ---------- canvas transforms (the 2D drawing code runs unchanged inside) ---------- */
  tf(a, b, c, d, e, f, fn) { ctx.save(); ctx.transform(a, b, c, d, e * S, f * S); try { return fn(); } finally { ctx.restore(); } }
  // the 2D wall strip on the right wall
  onBackWall(fn) { return this.tf(IK, IK / 2, 0, IK, OX, OY - STRIP * IK, fn); }
  // a 2D wall strip (x from 0 to the floor's depth) on the left wall, from its front end to the back corner
  onLeftWall(fn) { const F = P(0, FY1); return this.tf(IK, -IK / 2, 0, IK, F.x, F.y - STRIP * IK, fn); }
  // the floor plane
  onFloor(fn) { return this.tf(IK, IK / 2, -IK, IK / 2, OX + FY * IK, OY - FY * IK / 2, fn); }
  // a 2D drawing on a vertical face: its point (ax, ay) at the floor point (fx, fy) height z; along x (a face toward
  // the viewer's left, like the right wall) or along y (toward the right, read from front to back); kx: floor units
  // per drawing unit across, ky: screen units per drawing unit upward
  face(along, fx, fy, z, ax, ay, fn, kx = 1, ky = IK) {
    const o = P(fx, fy, z), a = kx * IK, b = along === "x" ? a / 2 : -a / 2;
    return this.tf(a, b, 0, ky, o.x - a * ax, o.y - b * ax - ky * ay, fn);
  }
  // a 2D drawing moved upright: its point (ax, ay) onto the floor point (fx, fy) at height z; box (2D rect of the
  // drawing): clickable, turned back into the 2D point under the pointer (or box.to)
  put(ax, ay, fx, fy, z, fn, box = null) {
    const p = P(fx, fy, z), dx = p.x - ax, dy = p.y - ay;
    ctx.save(); ctx.translate(Math.round(dx * S), Math.round(dy * S));
    try { fn(); } finally { ctx.restore(); }
    if (box) this.region(box.x + dx, box.y + dy, box.w, box.h, box.to || ((sx, sy) => ({ x: sx - dx, y: sy - dy })));  // to: always this 2D point
  }
  at(ax, ay, fn, box) { return ay >= FY ? this.put(ax, ay, ax, ay, 0, fn, box) : this.put(ax, ay, ax, FY + 3, (FY + 3 - ay) * 0.8, fn, box); }
  /* ---------- clicks ---------- */
  // a screen rect (or polygon) whose click goes to inv(sx, sy) → a 2D point (or a fixed one)
  region(x, y, w, h, inv, poly = null) { this.regions.push({ x, y, w, h, inv: typeof inv === "function" ? inv : () => inv, poly }); }
  // the silhouette of a box on the floor (x0..x1, y0..y1, height h), clicked as the 2D point `to`
  boxRegion(x0, y0, x1, y1, h, to) {
    const pts = [P(x0, y0, h), P(x1, y0, h), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0), P(x0, y1, h)].map(p => [p.x, p.y]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    this.region(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), to, pts);
  }
  /* ---------- depth ---------- */
  // items: { fp: [x0, y0, x1, y1] } (a footprint) or { pt: [x, y] } (someone, something small), and draw(); a piece
  // entirely behind another one (lower x or lower y) is drawn first; someone standing in a footprint is on it
  drawSorted(items) {
    const n = items.length, box = it => it.fp || [it.pt[0], it.pt[1], it.pt[0], it.pt[1]];
    const B = items.map(box), mid = B.map(b => (b[0] + b[2]) / 2 + (b[1] + b[3]) / 2);
    const before = (i, j) => {  // i must be drawn before j
      const a = B[i], b = B[j];
      // one on the other (a computer on a desk): the lower first
      if (items[i].fp && items[j].fp && (items[i].z || 0) !== (items[j].z || 0) && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) return (items[i].z || 0) < (items[j].z || 0);
      if (items[i].fp && items[j].pt && a[0] <= b[0] && b[0] <= a[2] && a[1] <= b[1] && b[1] <= a[3]) return true;
      if (items[j].fp && items[i].pt && b[0] <= a[0] && a[0] <= b[2] && b[1] <= a[1] && a[1] <= b[3]) return false;
      const behind = a[2] <= b[0] || a[3] <= b[1], ahead = b[2] <= a[0] || b[3] <= a[1];
      if (behind && !ahead) return true;
      if (ahead && !behind) return false;
      return mid[i] + (items[i].bias || 0) < mid[j] + (items[j].bias || 0);
    };
    const indeg = new Array(n).fill(0), out = items.map(() => []);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (before(i, j)) { out[i].push(j); indeg[j]++; } else { out[j].push(i); indeg[i]++; } }
    const done = new Array(n).fill(false);
    for (let k = 0; k < n; k++) {
      let best = -1;
      for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (best < 0 || mid[i] < mid[best])) best = i;
      if (best < 0) for (let i = 0; i < n; i++) if (!done[i] && (best < 0 || indeg[i] < indeg[best] || (indeg[i] === indeg[best] && mid[i] < mid[best]))) best = i;  // a cycle: the least blocked
      done[best] = true; for (const j of out[best]) indeg[j]--;
      const b = B[best]; PX.pieceTint = hub.spriteTint ? hub.spriteTint((b[0] + b[2]) / 2, (b[1] + b[3]) / 2) : 0xffffff;  // its light (iso/rooms.js)
      PX.piece(items[best].box || this.boxOf(b, items[best]), items[best].draw);
    }
    PX.pieceTint = 0xffffff;
  }
  // where a piece may draw on the screen: its footprint up to h (people: their height and some room for what they hold)
  boxOf([x0, y0, x1, y1], it) {
    if (it.pt) { const p = P(x0, y0); return { x: p.x - 40, y: p.y - 70 - (it.z || 0), w: 80, h: 84 }; }
    const h = it.h || 64, l = P(x0, y1), r = P(x1, y0), top = P(x0, y0, h), bot = P(x1, y1);
    return { x: l.x - 8, y: top.y - 8, w: r.x - l.x + 16, h: bot.y - top.y + 16 };
  }
  /* ---------- the room's shell: two back walls (the decor's wall on both), the projected floor, their edges ---------- */
  // wall(): paints the 2D wall strip (decor.js drawWall: one cached image); wallColor: for the edges; floor: the 2D
  // floor canvas (y 70..232, rugs included); walls: false for a terrace
  shell({ wall, wallColor = "#888", floor, walls = true }) {
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x * S, p.y * S) : ctx.moveTo(p.x * S, p.y * S)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    poly([P(0, FY1), P(FX1, FY1), P(FX1, FY1, -5), P(0, FY1, -5)], "#2a1f18");  // the floor's thickness
    poly([P(FX1, FY), P(FX1, FY1), P(FX1, FY1, -5), P(FX1, FY, -5)], "#1a130e");
    if (floor) this.onFloor(() => ctx.drawImage(floor, 0, Math.round(FY * S)));
    if (!walls) return;
    const clipTo = (w, fn) => () => { ctx.beginPath(); ctx.rect(0, 0, w * S, STRIP * S); ctx.clip(); for (let x = 0; x < w; x += W) { ctx.save(); ctx.translate(x * S, 0); fn(); ctx.restore(); } };  // the 2D wall is W wide: repeated
    this.onLeftWall(clipTo(FY1 - FY, wall));
    this.onBackWall(clipTo(FX1, wall));
    ctx.globalAlpha = 0.16; poly([P(0, FY1), P(0, FY), P(0, FY, WALL), P(0, FY1, WALL)], "#000"); ctx.globalAlpha = 1;  // the left wall in the shade
    poly([P(0, FY1, WALL), P(0, FY, WALL), P(0, FY, WALL + 3), P(0, FY1, WALL + 3)], shade(wallColor, 0.55));          // the tops of the walls
    poly([P(0, FY, WALL), P(FX1, FY, WALL), P(FX1, FY, WALL + 3), P(0, FY, WALL + 3)], shade(wallColor, 0.66));
    poly([P(0, FY1, WALL + 3), P(0, FY1, -5), P(-4, FY1 + 4, -5), P(-4, FY1 + 4, WALL + 3)], shade(wallColor, 0.42));  // the walls' ends
    poly([P(FX1, FY, WALL + 3), P(FX1, FY, -5), P(FX1 + 4, FY - 4, -5), P(FX1 + 4, FY - 4, WALL + 3)], shade(wallColor, 0.5));
    const a = P(0, FY), b = P(0, FY, WALL); ctx.fillStyle = shade(wallColor, 0.72); ctx.fillRect(a.x * S - S * 0.3, b.y * S, S * 0.6, (a.y - b.y) * S);  // the corner
  }
}
function inPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const ISO = new IsoView();
export const roomDepth = () => FY1 - FY;
export const roomWidth = () => FX1;
// in a room drawn in isometric view, a 2D drawing anchored at a point of the floor moves to its projected point
export function anchored(ax, ay, fn, box) { return isoNow ? isoNow.at(ax, ay, fn, box) : fn(); }
export const isoDrawing = () => !!isoNow;
// which way a pet in volume looks (svg/iso.js: 0 +y, 1 +x, 2 -y, 3 -x): where it walks, else its 2D direction
export function petRot(pet, dir) {
  const p = pet.path?.[0];
  if (p && (p.x !== pet.x || p.y !== pet.y)) { const dx = p.x - pet.x, dy = p.y - pet.y; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 0 : 2); }
  return dir < 0 ? 3 : 1;
}

// drag the scene to move the camera (a click that moved is not a click: takeDrag), the mouse wheel zooms around the
// pointer; on the window, after the scene's own handlers (a ticket dragged from the board, the whiteboard)
let pan = null, panned = false;
const isoRoom = () => hub.booted && hub.Room?.current()?.iso?.();
const scenePt = ev => { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H }; };
addEventListener("mousedown", ev => {
  if (ev.target !== cv || ev.button !== 0 || ev.defaultPrevented || !isoRoom()) return;
  const p = scenePt(ev); pan = { x: p.x, y: p.y, cx: ISO.cam.x, cy: ISO.cam.y, moved: false };
});
addEventListener("mousemove", ev => {
  if (!pan) return;
  const p = scenePt(ev);
  if (!pan.moved && Math.hypot(p.x - pan.x, p.y - pan.y) < 4) return;
  pan.moved = true; cv.classList.add("panning");
  ISO.cam.x = pan.cx - (p.x - pan.x) / ISO.z; ISO.cam.y = pan.cy - (p.y - pan.y) / ISO.z; ISO.clampCam();
});
addEventListener("mouseup", () => { if (pan?.moved) { panned = true; setTimeout(() => { panned = false; }, 0); } pan = null; cv.classList.remove("panning"); });
addEventListener("wheel", ev => {
  if (ev.target !== cv || ev.defaultPrevented || !isoRoom()) return;
  ev.preventDefault();
  const p = scenePt(ev), w = ISO.toWorld(p.x, p.y);
  ISO.z = Math.max(0.55, Math.min(2.2, ISO.z * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)));
  ISO.cam.x = w.x - p.x / ISO.z; ISO.cam.y = w.y - p.y / ISO.z; ISO.clampCam();
}, { passive: false });
ISO.takeDrag = () => panned;

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get ISO() { return ISO; } });
