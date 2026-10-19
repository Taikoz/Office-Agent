// Walking with some weight, for everyone who walks a path (the devs, the chief, the clients, the cat, the dog, the
// team in the break room): they speed up when they set off and slow down before they stop, slow down in a sharp turn,
// round the corners of their path instead of turning on the spot, and make way for each other: someone coming the
// other way, they step aside; someone slower ahead going the same way, they slow down behind them.

const ACCEL = 0.00012;        // units / ms² (from 0 to a walk in about 400 ms)
const BRAKE = 0.0001;         // units / ms² (stops in about 12 units from a walk)
const CORNER = 7;             // units before a waypoint where the turn starts
const PERSONAL = 7;           // units: the room a walker keeps around itself
import { hub } from "../hub.js";

const seen = new Map();       // room → Map(walker → { x, y, hx, hy, v, at }): who walked where, this frame or the last one

const others = (room, w, t) => [...(seen.get(room) || new Map())].filter(([o, s]) => o !== w && t - s.at < 120).map(([, s]) => s);
// someone moving near (x, y) in this room right now (world/physics.js: plants rustle, doors open)
export function movingNear(room, x, y, r, t = performance.now()) { for (const s of (seen.get(room) || new Map()).values()) if (t - s.at < 150 && s.v > 0.008 && Math.hypot(s.x - x, s.y - y) < r) return true; return false; }
export function walkersIn(room, t = performance.now()) { return [...(seen.get(room) || new Map()).values()].filter(s => t - s.at < 150); }

// one step along a path (an array of waypoints {x, y}); w keeps its position in w[kx], w[ky] and its speed in w._v.
// Returns the waypoint reached this step (shifted off the path, the walker on it), or null.
export function walkStep(w, path, dt, max, room, kx = "x", ky = "y") {
  // each leg goes around the furniture, routed once when it starts (world/route.js): the devs, the clients, the pets too
  if (path[0] && !path[0].routed && hub.routeAhead && (room === "office" || room === "lounge")) hub.routeAhead(path, w[kx], w[ky], room);
  const t = performance.now(), tgt = path[0]; if (!tgt) return null;
  let x = w[kx], y = w[ky], dx = tgt.x - x, dy = tgt.y - y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.01) { path.shift(); w._v = path.length ? w._v : 0; return tgt; }
  let ux = dx / dist, uy = dy / dist;
  // round the corner: near a waypoint, already lean toward the next one
  const next = path[1];
  if (next && dist < CORNER) {
    const nx = next.x - tgt.x, ny = next.y - tgt.y, nd = Math.hypot(nx, ny) || 1, k = (1 - dist / CORNER) * 0.45;
    ux = ux * (1 - k) + (nx / nd) * k; uy = uy * (1 - k) + (ny / nd) * k; const n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n;
  }
  // the speed it wants: slower in a sharp turn, braking before the last waypoint
  const hx = w._hx ?? ux, hy = w._hy ?? uy, turn = Math.max(0, hx * ux + hy * uy);  // 1: straight on, 0: a right angle or more
  let want = max * (0.45 + 0.55 * turn);
  const left = path.reduce((s, p, i) => i ? s + Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : s, dist);
  want = Math.min(want, Math.sqrt(2 * BRAKE * left) + 0.004);
  // make way: someone ahead going the other way → a step aside; going the same way slower → wait behind
  let sx = 0, sy = 0;
  for (const o of others(room, w, t)) {
    const ox = o.x - x, oy = o.y - y, od = Math.hypot(ox, oy); if (od > PERSONAL * 2.2 || od < 0.01) continue;
    const ahead = (ox * ux + oy * uy) / od; if (ahead < 0.2) continue;  // behind or beside: not in the way
    const facing = o.hx * ux + o.hy * uy;
    if (facing < -0.2 || o.v < 0.006) {  // coming toward us, or standing: step aside (to our right, or away from them)
      const side = (ox * -uy + oy * ux) > 0 ? -1 : 1, k = (1 - od / (PERSONAL * 2.2)) * 0.9;
      sx += -uy * side * k; sy += ux * side * k;
    } else if (od < PERSONAL * 1.4) want = Math.min(want, Math.max(0.012, o.v * 0.95));  // same way: follow
  }
  const v = w._v ?? 0;
  w._v = want > v ? Math.min(want, v + ACCEL * dt) : Math.max(want, v - BRAKE * 2.5 * dt);
  // move: along the way, plus the step aside
  let mx = ux + sx, my = uy + sy; const mn = Math.hypot(mx, my) || 1; mx /= mn; my /= mn;
  const step = Math.max(0.004 * dt, w._v * dt);
  // never off the way into the furniture: a rounded corner or a step aside that would enter a footprint (world/route.js)
  // is dropped, straight toward the waypoint (the route keeps that one clear)
  if ((mx !== dx / dist || my !== dy / dist) && !roomFree(room, x + mx * Math.max(step, 2), y + my * Math.max(step, 2), x, y)) { mx = dx / dist; my = dy / dist; }
  w._hx = mx; w._hy = my;
  if (dist <= step + 0.05) {  // reached
    w[kx] = tgt.x; w[ky] = tgt.y; path.shift();
    if (!path.length) w._v = 0;
    note(room, w, tgt.x, tgt.y, mx, my, w._v, t);
    return tgt;
  }
  w[kx] = x + mx * step; w[ky] = y + my * step;
  note(room, w, w[kx], w[ky], mx, my, w._v, t);
  return null;
}
// a point a walker may step on: the floor, nothing bought standing there (or it is already in one: a seat)
function roomFree(room, x, y, fx, fy) {
  if (y < 70 || !hub.isFree) return true;
  return hub.isFree(room, x, y) || !hub.isFree(room, fx, fy);
}
function note(room, w, x, y, hx, hy, v, at) {
  let m = seen.get(room); if (!m) seen.set(room, m = new Map());
  m.set(w, { x, y, hx, hy, v, at });
  if (m.size > 60) for (const [k, s] of m) if (at - s.at > 2000) m.delete(k);
}
// someone standing (seated at a desk, waiting): an obstacle the others walk around
export function standing(room, w, x, y) { note(room, w, x, y, 0, 0, 0, performance.now()); }
