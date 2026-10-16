// Visiting another chief's office (world/peers.js): its rooms as its page sent them (sizes, decor, furniture), drawn
// with our own furniture code; our avatar there walks where we click (our chief at home stays put); its owner and its
// other visitors are there too. A bar at the top: its rooms, and back home.

import { hub } from "../hub.js";
import { CHIEF_NAME, ROOM, badge } from "../core/core.js";
import { bubble, drawPerson, headroom } from "../world/scene.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { chiefHat } from "../world/chiefedit.js";
import { DECOR_DEFAULT, decor, drawWall, roomFloorCanvas } from "../world/decor.js";
import { drawRoomItems, furni } from "../world/build.js";
import { anchored } from "../iso/engine.js";
import { isoItems, lampsOver, leftWallDecor } from "../iso/rooms.js";
import { drawPeer, endVisit, net, smoothed, visitRoom } from "../world/peers.js";
import { Room } from "./base.js";

const ROOM_FR = { office: "Bureau", lounge: "Repos", meeting: "Réunion", terrace: "Terrasse", gym: "Sport", library: "Bibliothèque" };
const HEX = /^#[0-9a-fA-F]{6}$/, WORD = /^[a-zé-ëï]{1,16}$/;
const clamp = (v, a, b, d) => Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : d;
// what another page sent is data: only known kinds, numbers, short words and colours go into our drawing
function cleanDecor(d, room) {
  const out = { ...(DECOR_DEFAULT[room] || DECOR_DEFAULT.office) };
  for (const [k, v] of Object.entries(d || {})) if (k in out && typeof v === "string" && (HEX.test(v) || WORD.test(v))) out[k] = v;
  return out;
}
function cleanItems(list, room) {
  return (Array.isArray(list) ? list : []).filter(it => it && it.room === room && hub.defOf(it.type) && !hub.defOf(it.type).anchor).slice(0, 400).map(it => ({
    uid: clamp(it.uid, 0, 1e9, 0), type: it.type, room: "visit", x: clamp(it.x, -50, 900, 0), y: clamp(it.y, 0, 500, 70), rot: clamp(it.rot, 0, 3, 0) | 0,
    style: typeof it.style === "string" ? it.style.slice(0, 20) : null, ...(it.side === "left" || it.side === "back" ? { side: it.side } : {}),
    ...(it.on_ != null ? { on_: clamp(it.on_, 0, 1e9, 0) } : {}), on: !!it.on, closed: !!it.closed, off: !!it.off }));
}

class VisitView extends Room {
  constructor() { super("visit", "🚪 Visite"); this.last = 0; }
  // the visited room's size, decor and furniture in place of ours, for this frame only
  frame(t) {
    const v = net.visit; if (!v) return;
    const s = v.layout.sizes?.[v.room] || [];
    Object.assign(ROOM.visit, { w: clamp(s[0], 400, 840, 560), h: clamp(s[1], 232, 420, 300) });
    decor.visit = cleanDecor(v.layout.decor?.[v.room], v.room);
    if (v.cleanFor !== v.layout || v.cleanRoom !== v.room) { v.items = cleanItems(v.layout.items, v.room); v.cleanFor = v.layout; v.cleanRoom = v.room; }
    const mine = furni.items;
    furni.items = v.items;
    try { super.frame(t); } finally { furni.items = mine; }
  }
  renderIso(t, G) {
    const v = net.visit, R = ROOM.visit, dt = Math.min(60, t - (this.last || t)); this.last = t;
    // our avatar walks to where we clicked
    const dx = v.tx - v.x, dy = v.ty - v.y, dist = Math.hypot(dx, dy), sp = 0.06 * dt;
    if (dist > sp) { v.x += dx / dist * sp; v.y += dy / dist * sp; v.dir = [dx, dy]; } else { v.x = v.tx; v.y = v.ty; v.dir = null; }
    const outdoors = v.room === "terrace";
    G.back(() => {
      G.shell(outdoors ? { floor: roomFloorCanvas("visit", R.h - 70, [], R.w), walls: false } : { wall: () => drawWall("visit"), wallColor: decor.visit.wallColor, floor: roomFloorCanvas("visit", R.h - 70, [], R.w) });
      G.onFloor(() => drawRoomItems("visit", t, "rug"));
      if (!outdoors) { G.onBackWall(() => drawRoomItems("visit", t, "wall")); G.onLeftWall(() => leftWallDecor("visit", t)); }
    });
    const items = [];
    isoItems("visit", t, G, items);
    // its owner (at home) and its other visitors, in this room; then us
    for (const p of net.peers) {
      const here = p.room === v.room && ((p.pid === v.pid && !p.visiting) || (p.visiting === v.pid && p.pid !== net.pid));
      if (!here) continue;
      const s = smoothed(p, t);
      items.push({ pt: [s.x, s.y], draw: () => anchored(s.x, s.y, () => drawPeer(p, t, s.x, s.y)) });
    }
    const walking = !!v.dir;
    items.push({ pt: [v.x, v.y], draw: () => anchored(v.x, v.y, () => {
      drawPerson(v.x, v.y, CHIEF_LOOK, { tux: true, smile: true, hat: chiefHat(), dir: v.dir, frame: walking ? Math.floor(t / 180) : 0 });
      badge(v.x, v.y + 2, `${CHIEF_NAME} 👑`, "#fbaa08");
      if (t < v.until) bubble(v.x, v.y - 24 - headroom(), v.bubble, "#f7f7f7", "#081746");
    }) });
    G.drawSorted(items);
    lampsOver("visit");
  }
  // a click on the floor: our avatar goes there
  click(p) {
    const v = net.visit; if (!v || !(p.x > -900)) return true;
    v.tx = Math.max(6, Math.min(ROOM.visit.w - 6, p.x)); v.ty = Math.max(74, Math.min(ROOM.visit.h - 4, p.y));
    return true;
  }
  hit() { return null; }
}
new VisitView();

/* ---------- the bar at the top while visiting: the rooms of the office, back home ---------- */
const bar = document.createElement("nav");
bar.id = "visitbar"; bar.hidden = true; bar.setAttribute("aria-label", "Visite");
document.body.append(bar);
let barKey = "";
setInterval(() => {
  const v = net.visit, key = v ? `${v.pid}|${v.room}|${v.layout.rooms.join(",")}` : "";
  bar.hidden = !v;
  if (key === barKey) return;
  barKey = key;
  if (v) bar.innerHTML = `<b>🚪 Chez ${v.name.replace(/[<>&"]/g, "")}</b>${v.layout.rooms.filter(r => ROOM_FR[r]).map(r => `<button data-vroom="${r}" class="${r === v.room ? "on" : ""}">${ROOM_FR[r]}</button>`).join("")}<button data-vhome class="home">🏠 Rentrer à mon bureau</button>`;
}, 300);
bar.addEventListener("click", ev => { const r = ev.target.closest("[data-vroom]"); if (r) return visitRoom(r.dataset.vroom); if (ev.target.closest("[data-vhome]")) endVisit(); });
