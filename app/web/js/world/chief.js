// The chief: podium, coffee and console breaks.

import { walkStep } from "./motion.js";
import { hub, provide } from "../hub.js";
import { CHIEF_NAME, COFFEE, DESKS, DOOR, LANE, badge, chief, curSession, px, roomSize } from "../core/core.js";
import { OFFICE_SPOTS, spotsOf } from "./place.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { bubble, drawPerson, headroom, stepOf } from "./scene.js";

/* ---------- the chief: yours to move ---------- */
// The chief goes where you click: anywhere on the office floor, to the coffee machine, the console, the podium, or through
// the door to the break room (where he can eat, nap, play or chat like the team). He refuses to wander off and comes
// back to his podium by himself when the team needs him (a question, a dev arriving).
export const CHIEF_LOOK = { skin: "#f1c7a3", hair: "#d8d8d8", shirt: "#1c1c24", style: 4, glasses: true };
// his spots: the podium, the coffee machine, the console (from the objects bought, world/place.js), the door
const CHIEF_SPOTS = {
  get podium() { return OFFICE_SPOTS.podium || { x: 282, y: 90 }; }, get coffee() { return COFFEE; },
  get console() { return OFFICE_SPOTS.console || { x: 221, y: 93 }; }, get door() { return { x: DOOR.x, y: DOOR.y }; },
};
chief.room = "office";  // "office" or "lounge"
Object.assign(chief, { lx: 23, ly: 72, lpath: [], lspot: null });  // break-room position (LD, the door, is defined in lounge.js)

// a walk in the office: straight to the goal, its legs routed around the furniture as he walks (world/route.js)
export const OFFICE_ROWS = [LANE, 168, 254];
export function officeRoute(fx, fy, tx, ty) { return [{ x: tx, y: ty }]; }
// a clicked point → a place to stand: on the floor, never inside a desk, the cabinet or a wall
function standable(x, y) {
  const R = roomSize("office");
  return { x: Math.max(8, Math.min(R.w - 8, x)), y: Math.max(76, Math.min(R.h - 8, y)) };
}
export function chiefGo(dest, onArrive) {
  const spot = typeof dest === "string" ? CHIEF_SPOTS[dest] : dest;
  chief.path = officeRoute(chief.x, chief.y, spot.x, spot.y);
  chief.path[chief.path.length - 1].on = onArrive;
  chief.at = typeof dest === "string" ? dest : "free";
}
export function chiefWalk(p) {
  if (hub.chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = performance.now() + 3000; return; }
  if (chief.room === "lounge") return;
  chiefGo(standable(p.x, p.y));
}

// office ⇄ break room through the door; the view follows him
export function chiefToLounge() {
  if (chief.room === "lounge") return hub.setView("lounge");
  if (hub.chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = performance.now() + 3000; return; }
  chief.cup = false; chief.coffeeUntil = 0;
  chiefGo("door", c => {
    c.room = "lounge"; c.at = "lounge"; c.lx = hub.LD.x; c.ly = hub.LD.y; c.lspot = null;
    c.lpath = [{ x: hub.LD.x, y: hub.LOUNGE_CORRIDOR }, { x: 60, y: hub.LOUNGE_CORRIDOR }];
    if (hub.view === "office") hub.setView("lounge");
  });
}
export function chiefToOffice(next = "podium") {
  if (chief.room !== "lounge") return;
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lspot = null;
  chief.lpath = [...via, { x: via[0]?.x ?? chief.lx, y: hub.LOUNGE_CORRIDOR }, { x: hub.LD.x, y: hub.LOUNGE_CORRIDOR }, { ...hub.LD, on: () => {
    chief.room = "office"; chief.x = DOOR.x; chief.y = DOOR.y + 2; chief.lpath = [];
    chiefGo(next, next === "coffee" ? c => { c.coffeeUntil = performance.now() + 6000; hub.smoke(COFFEE.x, 56, "#d5eeff"); hub.usedCoffee?.(); } : undefined);
    if (hub.view === "lounge") hub.setView("office");
  } }];
}
// in the break room: walk anywhere, or settle on an activity (its spot and pose, like the team)
export function chiefLoungeWalk(p) {
  const { w, h } = roomSize("lounge"), x = Math.max(12, Math.min(w - 12, p.x)), y = Math.max(74, Math.min(h - 10, p.y));
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lspot = null;
  chief.lpath = [...via, { x, y }];
}
export function chiefLoungeAct(actId, uid = null) {
  const act = hub.Activity.get(actId); if (!act) return;
  const spots = act.spots.filter(s => uid == null || s.uid === uid), sp = spots.find(hub.spotFree) || spots[0];
  if (!sp) { chief.bubble = `Il faut acheter de quoi : ${act.task.toLowerCase()}.`; chief.until = performance.now() + 3000; return; }
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lpath = [...via, { x: sp.x, y: sp.y }];
  chief.lspot = { ...sp, act };
  chief.bubble = act.chief.line;
  chief.until = performance.now() + 2500;
}
// the chief uses an object bought: in the break room, its activity; elsewhere he goes there first
export function chiefUseItem(it) {
  const actId = hub.defOf(it.type).act; if (!actId) return;
  if (it.room !== "lounge") { chief.bubble = "Ça s'utilise en salle de repos."; chief.until = performance.now() + 2500; return; }
  if (chief.room === "lounge") return chiefLoungeAct(actId, it.uid);
  chief.loungeNext = () => chiefLoungeAct(actId, it.uid);
  chiefToLounge();
}

function stepChief(dt, t) {
  // the team needs him: back to the podium, from the break room if need be
  if (hub.chiefBusyNow() || hub.focusMode) {
    if (chief.room === "lounge") { if (!chief.lpath.length || chief.lpath.at(-1)?.on === undefined) chiefToOffice(); }
    else if (chief.at !== "podium") { chief.cup = false; chief.coffeeUntil = 0; chiefGo("podium"); }
  }
  if (chief.room === "lounge") {
    if (!chief.lpath.length && chief.loungeNext) { const fn = chief.loungeNext; chief.loungeNext = null; fn(); }  // what he came for (chiefUseItem)
    if (!chief.lpath.length) return;
    hub.routeAhead(chief.lpath, chief.lx, chief.ly, "lounge");
    const tgt = walkStep(chief, chief.lpath, dt, 0.05, "lounge", "lx", "ly");  // with some weight (world/motion.js)
    if (tgt?.on) tgt.on(chief);
    return;
  }
  if (!chief.path.length) return;
  hub.routeAhead(chief.path, chief.x, chief.y, "office");
  const tgt = walkStep(chief, chief.path, dt, 0.05, "office");
  if (tgt?.on) tgt.on(chief);
}

// the chief in the break room, drawn among the team (y-sorted by the lounge)
export function drawChiefLounge(t) {
  const walking = chief.lpath.length > 0, act = !walking && chief.lspot?.act, g = chief.gesture && t < chief.gesture.until ? chief.gesture.pose : {};
  const svc = chief.at === "service" && !walking ? chief.svc : null;  // looking after an object (world/upkeep.js)
  const pose = { ...(act?.pose || {}), ...(act && chief.lspot.back ? { back: true } : {}), ...(walking ? {} : g), ...(svc ? { arms: svc.kind === "thirst" ? "down" : "reach", hold: svc.kind === "thirst" ? "pour" : "" } : {}) };
  drawPerson(chief.lx, chief.ly, CHIEF_LOOK, { tux: true, smile: true, frame: Math.floor(t / (walking ? 180 : 300)), step: walking ? stepOf(chief.lstep ||= {}, chief.lx, chief.ly) : null, talk: t < (chief.until || 0),
    seated: !!pose.seated, back: !!pose.back || (walking && chief.lpath[0].y < chief.ly), arms: pose.arms || "down", hold: chief.carry && !svc ? chief.carry : walking ? "" : pose.hold || "",
    dir: walking ? [chief.lpath[0].x - chief.lx, chief.lpath[0].y - chief.ly] : svc ? svc.dir : chief.lspot?.face });
}
export function drawChiefLoungeOver(t) {
  const y = chief.ly + (chief.lspot?.act?.pose?.seated && !chief.lpath.length ? -3 : 2);
  badge(chief.lx, y, CHIEF_NAME.toUpperCase(), "#fbaa08");
  hub.drawEmotion(CHIEF_NAME, chief.lx, chief.ly - 25 - headroom(7), t);
  if (t < (chief.until || 0) && chief.bubble) bubble(chief.lx, chief.ly - 24 - headroom(), chief.bubble, "#fbaa08", "#081746", CHIEF_NAME);
}

// gaming corner under the board: TV on a low cabinet, console, beanbag
export function drawConsole(t) {
  drawConsoleScreen(t);
  hub.woodSprite("tv", hub.decor.office.wood).draw(148, 64);
  ART.console.draw(150, 74.6);
  SPRITES.beanbag.draw(152, 85);
}
// the console corner's TV (16 × 9 at 152, 65): a tiny platformer while he plays (hills, a hero jumping over an enemy, a coin)
export function drawConsoleScreen(t) {
  if (!consolePlaying()) return px(152, 65, 16, 9, "#14141c");
  const f = Math.floor(t / 200) % 2, k = (t / 90) % 16, jump = Math.abs(Math.sin(t / 260)) * 3;
  ART.tvgame.draw(152, 65, { frame: f });
  ART.hero.draw(154.6, 68.4 - jump, { frame: f });
  px(168 - k, 70.2, 1.6, 1.2, "#7a3aa8"); px(168.2 - k, 70, 0.4, 0.4, "#fff");
  if (Math.floor(t / 300) % 2) { px(160, 66.6, 1.2, 1.2, "#ffd43b"); px(160.3, 66.9, 0.5, 0.5, "#fff7b8"); }
}
export const consolePlaying = () => chief.at === "console" && !chief.path.length && !(curSession()?.chief?.idle > 900);

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get chiefUseItem() { return chiefUseItem; }, get CHIEF_LOOK() { return CHIEF_LOOK; }, get stepChief() { return stepChief; } });
