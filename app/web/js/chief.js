"use strict";
// The chief: podium, coffee and console breaks.

/* ---------- the chief: yours to move ---------- */
// The chief goes where you click: anywhere on the office floor, to the coffee machine, the console, the podium, or through
// the door to the break room (where he can eat, nap, play or chat like the team). He refuses to wander off and comes
// back to his podium by himself when the team needs him (a question, a dev arriving).
const CHIEF_LOOK = { skin: "#f1c7a3", hair: "#d8d8d8", shirt: "#1c1c24", style: 4, glasses: true };
const CHIEF_SPOTS = { podium: { x: 222, y: 86 }, coffee: { x: 312, y: 79 }, console: { x: 161, y: 93 }, door: { x: DOOR.x, y: DOOR.y } };
chief.room = "office";  // "office" or "lounge"
Object.assign(chief, { lx: 23, ly: 72, lpath: [], lspot: null });  // break-room position (LD, the door, is defined in lounge.js)

// office walkways: the lane under the podium and the aisles in front of each desk row, joined by vertical aisles
const OFFICE_ROWS = [LANE, 150, 212], OFFICE_AISLES = [18, 106, 194, 282, 345];
function officeRoute(fx, fy, tx, ty) {
  const near = y => OFFICE_ROWS.reduce((b, r) => Math.abs(r - y) < Math.abs(b - y) ? r : b);
  const pts = []; let x = fx, y = fy;
  const r0 = near(fy);
  if (Math.abs(y - r0) > 0.5) { pts.push({ x, y: r0 }); y = r0; }  // step onto the nearest walkway
  const r1 = near(ty);
  if (r1 !== y) {
    const ax = OFFICE_AISLES.reduce((b, a) => Math.abs(a - x) + Math.abs(a - tx) < Math.abs(b - x) + Math.abs(b - tx) ? a : b);
    pts.push({ x: ax, y }, { x: ax, y: r1 }); x = ax; y = r1;
  }
  pts.push({ x: tx, y: r1 });
  if (Math.abs(ty - r1) > 0.5) pts.push({ x: tx, y: ty });
  return pts;
}
// a clicked point → a place to stand: on the floor, never inside a desk, the cabinet or a wall
function standable(x, y) {
  x = Math.max(8, Math.min(366, x)); y = Math.max(76, Math.min(224, y));
  for (const d of DESKS) if (Math.abs(x - d.x) <= 24 && y >= d.y - 12 && y <= d.y + 25) y = d.y + 28;
  return { x, y };
}
function chiefGo(dest, onArrive) {
  const spot = typeof dest === "string" ? CHIEF_SPOTS[dest] : dest;
  chief.path = officeRoute(chief.x, chief.y, spot.x, spot.y);
  chief.path[chief.path.length - 1].on = onArrive;
  chief.at = typeof dest === "string" ? dest : "free";
}
function chiefWalk(p) {
  if (chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = performance.now() + 3000; return; }
  if (chief.room === "lounge") return;
  chiefGo(standable(p.x, p.y));
}

// office ⇄ break room through the door; the view follows him
function chiefToLounge() {
  if (chief.room === "lounge") return setView("lounge");
  if (chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = performance.now() + 3000; return; }
  chief.cup = false; chief.coffeeUntil = 0;
  chiefGo("door", c => {
    c.room = "lounge"; c.at = "lounge"; c.lx = LD.x; c.ly = LD.y; c.lspot = null;
    c.lpath = [{ x: LD.x, y: LOUNGE_CORRIDOR }, { x: 60, y: LOUNGE_CORRIDOR }];
    if (view === "office") setView("lounge");
  });
}
function chiefToOffice(next = "podium") {
  if (chief.room !== "lounge") return;
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lspot = null;
  chief.lpath = [...via, { x: via[0]?.x ?? chief.lx, y: LOUNGE_CORRIDOR }, { x: LD.x, y: LOUNGE_CORRIDOR }, { ...LD, on: () => {
    chief.room = "office"; chief.x = DOOR.x; chief.y = DOOR.y + 2; chief.lpath = [];
    chiefGo(next, next === "coffee" ? c => { c.coffeeUntil = performance.now() + 6000; smoke(COFFEE.x, 56, "#d5eeff"); } : undefined);
    if (view === "lounge") setView("office");
  } }];
}
// in the break room: walk anywhere, or settle on an activity (its spot and pose, like the team)
function chiefLoungeWalk(p) {
  const x = Math.max(12, Math.min(388, p.x)), y = Math.max(74, Math.min(222, p.y));
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lspot = null;
  chief.lpath = [...via, { x: via[0]?.x ?? chief.lx, y: LOUNGE_CORRIDOR }, { x, y: LOUNGE_CORRIDOR }, { x, y }];
}
function chiefLoungeAct(actId) {
  const act = ACTS.find(a => a.id === actId); if (!act) return;
  const sp = act.spots.find(spotFree) || act.spots[0];
  const via = chief.lspot?.via ? [{ ...chief.lspot.via }] : [];
  chief.lpath = [...via, { x: via[0]?.x ?? chief.lx, y: LOUNGE_CORRIDOR }, { x: sp.via ? sp.via.x : sp.x, y: LOUNGE_CORRIDOR }, ...(sp.via ? [{ ...sp.via }] : []), { x: sp.x, y: sp.y }];
  chief.lspot = { ...sp, act };
  chief.bubble = { kitchen: "Un petit encas 🍕", sofa: "Pause canapé 💤", read: "Un peu de lecture 📖", chat: "On papote ? 💬", arcade: "Une partie 🎮", darts: "Aux fléchettes 🎯", pingpong: "Échauffement 🏓", babyfoot: "Baby ! ⚽", karaoke: "🎤 Un, deux, un, deux…", boardgame: "Qui veut une partie ? 🎲" }[actId] || "";
  chief.until = performance.now() + 2500;
}

function stepChief(dt, t) {
  // the team needs him: back to the podium, from the break room if need be
  if (chiefBusyNow() || focusMode) {
    if (chief.room === "lounge") { if (!chief.lpath.length || chief.lpath.at(-1)?.on === undefined) chiefToOffice(); }
    else if (chief.at !== "podium") { chief.cup = false; chief.coffeeUntil = 0; chiefGo("podium"); }
  }
  if (chief.room === "lounge") {
    if (!chief.lpath.length) return;
    const tgt = chief.lpath[0], dx = tgt.x - chief.lx, dy = tgt.y - chief.ly, dist = Math.hypot(dx, dy), sp = 0.05 * dt;
    if (dist > sp) { chief.lx += dx / dist * sp; chief.ly += dy / dist * sp; return; }
    chief.lx = tgt.x; chief.ly = tgt.y; chief.lpath.shift();
    if (tgt.on) tgt.on(chief);
    return;
  }
  if (!chief.path.length) return;
  const tgt = chief.path[0], dx = tgt.x - chief.x, dy = tgt.y - chief.y, dist = Math.hypot(dx, dy), sp = 0.05 * dt;
  if (dist > sp) { chief.x += dx / dist * sp; chief.y += dy / dist * sp; return; }
  chief.x = tgt.x; chief.y = tgt.y; chief.path.shift();
  if (tgt.on) tgt.on(chief);
}

// the chief in the break room, drawn among the team (y-sorted by the lounge)
function drawChiefLounge(t) {
  const walking = chief.lpath.length > 0, act = !walking && chief.lspot?.act, g = chief.gesture && t < chief.gesture.until ? chief.gesture.pose : {};
  const pose = { ...(act?.pose || {}), ...(act && chief.lspot.back ? { back: true } : {}), ...(walking ? {} : g) };
  drawPerson(chief.lx, chief.ly, CHIEF_LOOK, { tux: true, smile: true, frame: Math.floor(t / (walking ? 180 : 300)),
    seated: !!pose.seated, back: !!pose.back || (walking && chief.lpath[0].y < chief.ly), arms: pose.arms || "down" });
}
function drawChiefLoungeOver(t) {
  const y = chief.ly + (chief.lspot?.act?.pose?.seated && !chief.lpath.length ? -3 : 2);
  badge(chief.lx, y, CHIEF_NAME.toUpperCase(), "#fbaa08");
  drawEmotion(CHIEF_NAME, chief.lx, chief.ly - 25, t);
  if (t < (chief.until || 0) && chief.bubble) bubble(chief.lx, chief.ly - 24, chief.bubble, "#fbaa08", "#081746");
}

// gaming corner under the board: TV on a low cabinet, console, beanbag
function drawConsole(t) {
  const playing = chief.at === "console" && !chief.path.length && !(curSession()?.chief?.idle > 900);
  if (playing) {  // a tiny platformer on the TV: hills, a hero jumping over a walking enemy, a coin
    const f = Math.floor(t / 200) % 2, k = (t / 90) % 16, jump = Math.abs(Math.sin(t / 260)) * 3;
    art(`tvgame:${f}`, 152, 65, 16, 9, () => tvGameArt(f), { outline: false });
    art(`hero:${f}`, 154.6, 68.4 - jump, 2.4, 3.4, () => heroArt(f), { outline: false });
    px(168 - k, 70.2, 1.6, 1.2, "#7a3aa8"); px(168.2 - k, 70, 0.4, 0.4, "#fff");
    if (Math.floor(t / 300) % 2) { px(160, 66.6, 1.2, 1.2, "#ffd43b"); px(160.3, 66.9, 0.5, 0.5, "#fff7b8"); }
  } else px(152, 65, 16, 9, "#14141c");
  sprite(woodSprite("tv", decor.office.wood), 148, 64);
  art("console", 150, 74.6, 14.6, 5.4, CONSOLE_ART);
  sprite("beanbag", 152, 85);
}
