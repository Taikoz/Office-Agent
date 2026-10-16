// Walking around the furniture: a grid over the room's floor, the footprints of the objects bought as obstacles, A*
// between two points, then straightened (a walker goes straight where nothing stands in the way). A path followed by
// someone gets its legs routed when it is about to walk them (routeAhead).

import { hub, provide } from "../hub.js";
import { CAB, roomSize } from "../core/core.js";
import { footOf } from "./place.js";

const CELL = 6;
const grids = new Map();  // room → { sig, cols, rows, block: Uint8Array }
function grid(room) {
  const R = roomSize(room), items = hub.itemsIn(room).filter(it => { const d = hub.defOf(it.type); return !d.rug && d.kind !== "wall" && !it.on_ && !d.walkable; });
  const sig = `${R.w}|${R.h}|${items.map(it => `${it.uid}:${it.x}:${it.y}:${it.rot}`).join(",")}`;
  let g = grids.get(room);
  if (g?.sig === sig) return g;
  const cols = Math.ceil(R.w / CELL), rows = Math.ceil((R.h - 70) / CELL), block = new Uint8Array(cols * rows);
  const mark = (x0, y0, x1, y1) => {
    for (let cy = Math.max(0, Math.floor((y0 - 70 - 2) / CELL)); cy <= Math.min(rows - 1, Math.floor((y1 - 70 + 1) / CELL)); cy++)
      for (let cx = Math.max(0, Math.floor((x0 - 2) / CELL)); cx <= Math.min(cols - 1, Math.floor((x1 + 1) / CELL)); cx++) block[cy * cols + cx] = 1;
  };
  for (const it of items) mark(...footOf(it));
  g = { sig, cols, rows, block };
  grids.set(room, g);
  return g;
}
const cellOf = (g, x, y) => [Math.max(0, Math.min(g.cols - 1, Math.floor(x / CELL))), Math.max(0, Math.min(g.rows - 1, Math.floor((y - 70) / CELL)))];
const free = (g, cx, cy) => cx >= 0 && cy >= 0 && cx < g.cols && cy < g.rows && !g.block[cy * g.cols + cx];
// nothing in the way between two points (the start and the end may stand in a footprint: a seat on a sofa)
function clear(g, a, b, skipEnds = true) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 2));
  for (let i = 1; i < n; i++) {
    const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n, [cx, cy] = cellOf(g, x, y);
    if (!free(g, cx, cy)) {
      if (skipEnds) { const [ax, ay] = cellOf(g, a.x, a.y), [bx, by] = cellOf(g, b.x, b.y); if ((cx === ax && cy === ay) || (cx === bx && cy === by)) continue; }
      return false;
    }
  }
  return true;
}
// nothing bought stands there
export function isFree(room, x, y) { const g = grid(room), [cx, cy] = cellOf(g, x, y); return free(g, cx, cy); }
// the way from a to b in a room: the points to walk through, b last
export function route(room, a, b) {
  if (b.y < 70 || a.y < 70) return [b];  // toward the wall (the board, the coffee): straight
  const g = grid(room);
  if (clear(g, a, b)) return [b];
  const [sx, sy] = cellOf(g, a.x, a.y), [tx, ty] = cellOf(g, b.x, b.y), N = g.cols * g.rows;
  const cost = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), open = [];
  const start = sy * g.cols + sx, goal = ty * g.cols + tx, h = i => Math.hypot(i % g.cols - tx, Math.floor(i / g.cols) - ty);
  cost[start] = 0; open.push([h(start), start]);
  const ok = i => i === goal || i === start || !g.block[i];
  let found = false, guard = 0;
  while (open.length && guard++ < 6000) {
    let k = 0; for (let j = 1; j < open.length; j++) if (open[j][0] < open[k][0]) k = j;
    const [, i] = open.splice(k, 1)[0];
    if (i === goal) { found = true; break; }
    const cx = i % g.cols, cy = Math.floor(i / g.cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const j = ny * g.cols + nx; if (!ok(j)) continue;
      if (dx && dy && (!ok(cy * g.cols + nx) || !ok(ny * g.cols + cx))) continue;  // no corner cutting
      const c = cost[i] + (dx && dy ? 1.414 : 1);
      if (c < cost[j]) { cost[j] = c; from[j] = i; open.push([c + h(j), j]); }
    }
  }
  if (!found) return [b];  // walled in: straight through, rather than stuck
  const cells = []; for (let i = goal; i !== -1 && i !== start; i = from[i]) cells.unshift(i);
  const pts = cells.slice(0, -1).map(i => ({ x: (i % g.cols) * CELL + CELL / 2, y: 70 + Math.floor(i / g.cols) * CELL + CELL / 2 }));
  // straighten: from each point, the farthest one in sight
  const out = []; let cur = a, k = 0;
  const all = [...pts, b];
  while (k < all.length) {
    let far = k; for (let j = all.length - 1; j > k; j--) if (clear(g, cur, all[j])) { far = j; break; }
    out.push(all[far]); cur = all[far]; k = far + 1;
  }
  out[out.length - 1] = b;
  return out;
}
// before walking toward path[0], route that leg around the furniture (once: the points made are marked)
export function routeAhead(path, x, y, room) {
  const tgt = path[0];
  if (!tgt || tgt.routed) return;
  const pts = route(room, { x, y }, tgt);
  path.splice(0, 1, ...pts.slice(0, -1).map(p => ({ x: p.x, y: p.y, routed: true })), { ...tgt, routed: true });  // a copy: some legs are shared points (the door)
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get isFree() { return isFree; }, get routeAhead() { return routeAhead; } });
