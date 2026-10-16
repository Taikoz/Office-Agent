// Where the objects bought stand, Sims style (build.js): on the floor on a footprint, turned a quarter at a time; on a
// wall; on the top of another one (a computer on a desk). From them: the work stations of the team (a desk each, the
// floor otherwise), the spots of the break room's activities, the coffee machine, the chief's podium and console.
//
// An object kind (js/items/) is modeled facing +y (toward the viewer's left), on a w × d footprint; rot turns it:
// 0 as modeled, 1 facing +x (its art mirrored), 2 facing -y and 3 facing -x (its back seen).

import { hub, provide } from "../hub.js";
import { COFFEE, DESKS, TEAM, chief, ents, roomSize } from "../core/core.js";

export const ROTS = ["face à gauche", "face à droite", "de dos (gauche)", "de dos (droite)"];
export const footDims = (def, rot = 0) => rot % 2 ? [def.d, def.w] : [def.w, def.d];
// a point, a rect, a direction of the model, in the room (relative to the object's footprint corner)
export function rotPt(def, rot, px, py) {
  const { w, d } = def;
  return [[px, py], [py, px], [w - px, d - py], [d - py, w - px]][rot || 0];
}
export function rotRect(def, rot, [lx, ly, lw, ld]) {
  const { w, d } = def;
  return [[lx, ly, lw, ld], [ly, lx, ld, lw], [w - lx - lw, d - ly - ld, lw, ld], [d - ly - ld, w - lx - lw, ld, lw]][rot || 0];
}
// back from the room to the model (the inverse of rotRect)
export function unrotRect(def, rot, [x, y, w, d]) {
  const { w: W, d: D } = def;
  return [[x, y, w, d], [y, x, d, w], [W - x - w, D - y - d, w, d], [W - y - d, D - x - w, d, w]][rot || 0];
}
export const rotDir = (rot, [fx, fy]) => [[fx, fy], [fy, fx], [-fx, -fy], [-fy, -fx]][rot || 0];
// the footprint of a placed object: [x0, y0, x1, y1] (floor and surface objects, rugs)
export function footOf(it, def = hub.defOf(it.type)) { const [fw, fd] = footDims(def, it.rot); return [it.x, it.y, it.x + fw, it.y + fd]; }
// its parts (an art each, on a part of the footprint; a sofa: its seat, its back), in the room
export function partsOf(it, def = hub.defOf(it.type)) {
  return (def.parts || [{ art: def.art, rect: [0, 0, def.w, def.d] }]).map(p => {
    const [x, y, w, d] = rotRect(def, it.rot, p.rect);
    return { ...p, x: it.x + x, y: it.y + y, w, d };
  });
}
// the spots of an object (where someone sits or stands to use it), in the room, with the way they look
export function spotsOf(it, def = hub.defOf(it.type)) {
  if (def.kind === "wall") {  // in front of it on the floor (a dartboard)
    if (!def.wallSpot) return [];
    const c = it.x + def.w / 2, R = roomSize(it.room), d = def.wallSpot;
    const s = (it.side || "back") === "back" ? { x: c, y: 70 + d, face: [0, -1] } : { x: d, y: R.h - c, face: [-1, 0] };
    return [{ ...s, uid: it.uid, key: `${it.uid}:0` }];
  }
  return (def.spots || []).map((s, i) => {
    const [x, y] = rotPt(def, it.rot, s.x, s.y);
    return { ...s, x: it.x + x, y: it.y + y, face: s.face && rotDir(it.rot, s.face), uid: it.uid, key: `${it.uid}:${i}` };
  });
}
// the surface on its top where small objects go (a desk, a table, a counter): its rect in the room and its height
export function surfaceOf(it, def = hub.defOf(it.type)) {
  if (!def.surface) return null;
  const [x, y, w, d] = rotRect(def, it.rot, def.surface.rect || [0, 0, def.w, def.d]);
  return { x: it.x + x, y: it.y + y, w, d, z: def.surface.z };
}
// who uses an object now: the team members settled on its spots, and the chief
export function usersOf(it) {
  let n = [...hub.loungers.values()].filter(l => l.spot?.uid === it.uid && !l.path.length).length;
  if (chief.room === it.room && chief.lspot?.uid === it.uid && !chief.lpath.length) n++;
  return n;
}

/* ---------- the team's work stations: a desk each (built from the desks bought), the floor otherwise ---------- */
// DESKS[i] is TEAM[i]'s place, updated in place (everyone keeps a reference): { x, y } with the seat at (x, y + 22),
// face: where the dev looks while working, uid: the desk (none: on the floor with a laptop)
const FLOOR_SEATS = i => ({ x: 36 + (i % 6) * 22, y: 252 + Math.floor(i / 6) * 18 });
export function syncDesks() {
  const desks = hub.itemsIn("office").filter(it => hub.defOf(it.type).workstation);
  const taken = new Set();
  for (const it of desks) if (Number.isInteger(it.slot) && it.slot < TEAM.length && !taken.has(it.slot)) taken.add(it.slot); else it.slot = null;
  for (const it of desks) if (it.slot === null) { const i = TEAM.findIndex((_, k) => !taken.has(k)); if (i >= 0) { it.slot = i; taken.add(i); } }
  // the seat of each desk; a chair near it (bought, placed in front of it) is taken: the dev sits on it, the chair
  // turned toward the desk (the closest pairs first, a chair for one desk)
  const seatOf = it => { const def = hub.defOf(it.type), [sx, sy] = rotPt(def, it.rot, ...def.seat); return { x: it.x + sx, y: it.y + sy }; };
  const chairs = hub.itemsIn("office").filter(o => hub.defOf(o.type).chair && !o.on_), pairs = [];
  for (const it of desks) { const s = seatOf(it); for (const c of chairs) { const p = chairSeat(c), dd = Math.hypot(p.x - s.x, p.y - s.y); if (dd < 18) pairs.push({ it, c, dd }); } }
  const chairOf = new Map(), usedC = new Set();
  for (const p of pairs.sort((a, b) => a.dd - b.dd)) if (!chairOf.has(p.it.uid) && !usedC.has(p.c.uid)) { chairOf.set(p.it.uid, p.c); usedC.add(p.c.uid); }
  TEAM.forEach((_, i) => {
    const it = desks.find(d => d.slot === i);
    let pos;
    if (it) {
      const c = chairOf.get(it.uid); if (c) faceChair(c, (it.rot + 2) % 4);
      const s = c ? chairSeat(c) : seatOf(it);
      pos = { x: s.x, y: s.y - 22, face: rotDir(it.rot, [0, -1]), uid: it.uid, chair: c?.uid ?? null, floor: false };
    }
    else { const s = FLOOR_SEATS(i); pos = { x: s.x, y: s.y - 22, face: [0, -1], uid: null, floor: true }; }
    if (DESKS[i]) Object.assign(DESKS[i], pos); else DESKS.push(pos);
  });
  DESKS.length = TEAM.length;
  for (const e of ents.values()) if (e.who && e.seated && !e.leaving && e.desk) { e.x = e.desk.x; e.y = e.desk.y + 22; }
}
// where one sits on a chair (its first spot, else its middle)
function chairSeat(c) {
  const s = spotsOf(c)[0]; if (s) return { x: s.x, y: s.y };
  const [x0, y0, x1, y1] = footOf(c); return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}
// a chair turned to face a way (rot), around its middle
function faceChair(c, rot) {
  const def = hub.defOf(c.type); if ((def.rots || 4) < 4 || (c.rot || 0) === rot) return;
  const [x0, y0, x1, y1] = footOf(c, def), [w, d] = footDims(def, rot);
  c.rot = rot; c.x = Math.round((x0 + x1 - w) / 2); c.y = Math.round((y0 + y1 - d) / 2);
}
// the desk of a station, and what stands on it
export const deskItemOf = d => d?.uid ? hub.itemByUid(d.uid) : null;
export const onTopOf = it => hub.itemsIn(it.room).filter(o => o.on_ === it.uid);
export const chairNear = (room, x, y) => hub.itemsIn(room).find(o => hub.defOf(o.type).chair && (() => { const [x0, y0, x1, y1] = footOf(o); return x >= x0 - 2 && x <= x1 + 2 && y >= y0 - 2 && y <= y1 + 2; })());

/* ---------- the office's fixed points from the objects: the coffee machine, the podium, the console ---------- */
export const OFFICE_SPOTS = { podium: null, console: null };
export function syncOffice() {
  const first = type => hub.itemsIn("office").find(it => hub.defOf(it.type).role === type);
  const front = (it, k) => { const s = spotsOf(it)[k || 0]; return s ? { x: Math.round(s.x), y: Math.round(s.y) } : null; };
  // the best coffee machine of the office (items/*.js coffee: its tier, what a cup gives)
  const coffee = hub.itemsIn("office").filter(it => hub.defOf(it.type).role === "coffee").sort((a, b) => (hub.defOf(b.type).coffee?.tier || 0) - (hub.defOf(a.type).coffee?.tier || 0))[0];
  Object.assign(COFFEE, coffee ? { ...front(coffee), ok: true, uid: coffee.uid, cup: hub.defOf(coffee.type).coffee || null } : { x: 465, y: 80, ok: false, uid: null, cup: null });
  const podium = first("podium"), console = first("console");
  OFFICE_SPOTS.podium = podium ? front(podium) : null;
  OFFICE_SPOTS.console = console ? front(console) : null;
}
export const inRoom = (room, x, y) => { const R = roomSize(room); return x >= 0 && x <= R.w && y >= 70 && y <= R.h; };

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get OFFICE_SPOTS() { return OFFICE_SPOTS; }, get footOf() { return footOf; }, get spotsOf() { return spotsOf; }, get syncDesks() { return syncDesks; }, get syncOffice() { return syncOffice; }, get usersOf() { return usersOf; } });
