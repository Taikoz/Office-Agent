// The rooms built in construction mode (construct.js): a meeting room and a terrace, on the room bar once built.

import { hub, provide } from "../hub.js";
import { H, S, W, badge, chief, clip, ctx, curSession, cv, data, fillScreen, hash, px, roomSize, specialty, text } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { SKY, drawTerraceSky, skyPhase, terraceWeatherVeil } from "../svg/sky.js";
import { BOARD_INK } from "../svg/meeting.js";
import { FLOOR_Y, bubble, drawPerson, headroom } from "../world/scene.js";
import { crew } from "../sims/crew.js";
import { CHIEF_LOOK, chiefLoungeWalk, chiefToRoom, drawChiefLounge, drawChiefLoungeOver } from "../world/chief.js";
import { loungers, view } from "../world/lounge.js";
import { nameTag } from "../world/shop.js";
import { doorSprite, drawWall, roomFloorCanvas } from "../world/decor.js";
import { canvasPoint } from "../ui/panel.js";
import { toast } from "../sims/progress.js";
import { weather } from "../agents/events2.js";
import { focusMode } from "../ui/ux.js";
import { buy, drawBuyOverlay, drawBuyOverlayIso, drawRoomItems, hitItem, roomDepthItems } from "../world/build.js";
import { P, anchored } from "../iso/engine.js";
import { drawRooftops, streetHaze } from "../iso/rooftops.js";
import { isoItems, lampsOver, leftWallDecor } from "../iso/rooms.js";
import { clockNow, dayState, drawPartyOver } from "../sims/days.js";
import { Room } from "./base.js";
import { doorOpen, drawDoorOpen, terraceRain } from "../world/physics.js";

export class BuiltRoom extends Room {
  get open() { return hub.con.rooms.includes(this.id); }
  // the door back to the office, the bought objects
  hit(x, y) {
    if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
    return hitItem(x, y, this.id);
  }
  // a click on the floor: the chief walks there; from another room he comes first (world/chief.js chiefToRoom)
  floorClick(p) {
    if (!(p.y > 72)) return;
    if (chief.room === this.id) chiefLoungeWalk(p); else chiefToRoom(this.id, p);
  }
  // the chief, when he is here (not at the head of the table: a meeting draws him there)
  chiefHere() { return chief.room === this.id && !(this.id === "meeting" && hub.meeting.on); }
  chiefItem(t, G, items) { if (this.chiefHere()) items.push({ pt: [chief.lx, chief.ly], draw: () => G.put(chief.lx, chief.ly, chief.lx, chief.ly, chief.lpath.length ? 0 : chief.lspot?.lift || 0, () => drawChiefLounge(t), { x: chief.lx - 9, y: chief.ly - 34, w: 18, h: 37, to: { x: chief.lx, y: chief.ly - 8 } }) }); }
  chiefOver(t) { if (this.chiefHere()) anchored(chief.lx, chief.ly, () => drawChiefLoungeOver(t)); }
  // the wall and floor of its decor, a baseboard, its title, the door back to the office, the rugs and wall objects
  shell(t, title) {
    drawWall(this.id);
    ctx.drawImage(roomFloorCanvas(this.id, H - FLOOR_Y, []), 0, Math.round(FLOOR_Y * S));
    text(title, 200, 4, "#fbaa08", 6, "center");
    drawRoomItems(this.id, t, "rug");
    this.wallStrip(t);
  }
  // on the wall: the baseboard, the door back to the office, the wall objects
  wallStrip(t) {
    px(0, 66.5, W, 3.5, "#2a1f18"); px(0, 66.5, W, 0.6, "#4a3828");
    drawDoorOpen(() => doorSprite("office").draw(8, 20), 8, 20, doorOpen(this.id, 23)); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
    drawRoomItems(this.id, t, "wall");
  }
}

// the meeting room: a whiteboard you draw on (markers on its tray, Ctrl+Z, the sponge clears it; kept), the wall TV
// (a click changes the channel: agents live, tickets, time and weather, a cartoon, off; slides during a meeting),
// the conference table where the free devs sit for a minute (startMeeting, construct.js), a wall clock
const boardSlot = new SaveSlot("office-whiteboard", { strokes: [] });
// the whiteboard, the TV and the clock bought for the meeting room (build.js), where they hang (offscreen: none)
const BOARD = { x: -999, y: -999, w: 142, h: 42 }, BOARD_POINTS = 40000;
const TV = { x: -999, y: -999, w: 100, h: 42 }, CLOCK = { x: -999, y: -999 }, TV_CHANNELS = [["agents", "Agents"], ["tickets", "Tickets"], ["clock", "Heure"], ["cartoon", "Dessin animé"], ["off", "Éteinte"]];
const inRect = (r, p, m = 0) => p.x >= r.x - m && p.x <= r.x + r.w + m && p.y >= r.y - m && p.y <= r.y + r.h + m;
class MeetingRoom extends BuiltRoom {
  constructor() {
    super("meeting", "🤝 Réunion");
    Object.assign(this, { tool: 0, stroke: null, cache: { key: "", c: null }, version: 0, clearArmed: 0, channel: 0, channelAt: 0 });
    const end = () => {
      if (!this.stroke) return;
      const st = this.stroke; this.stroke = null;
      if (st.p.length === 2) st.p.push(st.p[0] + 0.1, st.p[1]);  // a dot
      const list = boardSlot.data.strokes; list.push(st);
      while (list.reduce((n, s) => n + s.p.length / 2, 0) > BOARD_POINTS) list.shift();
      boardSlot.save(); this.version++;
    };
    // drawing on the whiteboard with the pointer
    cv.addEventListener("pointerdown", ev => {
      if (view !== "meeting" || buy.on || ev.button !== 0) return;
      const p = canvasPoint(ev); if (!inRect(BOARD, p)) return;
      ev.preventDefault(); cv.setPointerCapture(ev.pointerId);
      const [c, w] = this.tool < 0 ? ["#fbfbf7", 5] : [BOARD_INK[this.tool][0], 0.9];
      this.stroke = { c, w, p: [+(p.x - BOARD.x).toFixed(1), +(p.y - BOARD.y).toFixed(1)] };
    });
    cv.addEventListener("pointermove", ev => {
      if (view !== "meeting") return;
      const p = canvasPoint(ev);
      cv.style.cursor = inRect(BOARD, p) ? "crosshair" : "";
      if (!this.stroke) return;
      if (!(ev.buttons & 1)) return end();  // the release was missed (outside the page)
      const q = this.stroke.p, x = Math.max(0, Math.min(BOARD.w, p.x - BOARD.x)), y = Math.max(0, Math.min(BOARD.h, p.y - BOARD.y));
      if (Math.hypot(x - q[q.length - 2], y - q[q.length - 1]) > 0.35) q.push(+x.toFixed(1), +y.toFixed(1));
    });
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end); addEventListener("pointerup", end);
    addEventListener("keydown", ev => {
      if (view !== "meeting" || !(ev.ctrlKey || ev.metaKey) || ev.key.toLowerCase() !== "z" || ev.target.closest?.("input, textarea, #chiefos")) return;
      ev.preventDefault();
      if (boardSlot.data.strokes.pop()) { boardSlot.save(); this.version++; }
    });
  }
  // the drawing, painted once per change and scale
  boardImage() {
    const key = `${S}|${this.version}|${boardSlot.data.strokes.length}`;
    if (this.cache.key === key) return this.cache.c;
    const c = document.createElement("canvas"); c.width = Math.ceil(BOARD.w * S); c.height = Math.ceil(BOARD.h * S);
    const g = c.getContext("2d"); g.lineCap = g.lineJoin = "round";
    for (const st of boardSlot.data.strokes) this.paintStroke(g, st, 0, 0);
    this.cache = { key, c };
    return c;
  }
  paintStroke(g, st, ox, oy) {
    g.strokeStyle = st.c; g.lineWidth = Math.max(1, st.w * S); g.beginPath();
    for (let i = 0; i < st.p.length; i += 2) { const x = ox + st.p[i] * S, y = oy + st.p[i + 1] * S; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  // the TV: slides during a meeting, else the channel chosen
  drawTv(t, at = TV) {
    const { x, y, w, h } = at, ch = hub.meeting.on ? "slides" : TV_CHANNELS[this.channel][0];
    ART.walltv.draw(x - 2, y - 2, { on: ch !== "off" });
    if (ch === "off") return;
    ctx.save(); ctx.beginPath(); ctx.rect(x * S, y * S, w * S, h * S); ctx.clip();
    const agents = curSession()?.agents || [], name = a => crew.ids[a.id] || specialty(a.type);
    const head = (title, col) => { px(x, y, w, 7, col); text(title, x + 3, y + 1.2, "#f7f7f7", 4.2); text(clockNow().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), x + w - 3, y + 1.2, "#f7f7f7", 4, "right"); };
    if (ch === "slides") {
      const k = Math.floor(t / 4000) % 4, [title, col] = [["🗺️ Roadmap", "#2c7ae0"], ["🏃 Sprint", "#2f9e44"], ["🎬 Démo", "#e66100"], ["❓ Questions", "#813d9c"]][k];
      px(x, y, w, h, "#f4f6fb"); px(x, y, w, 9, col); text(title, x + w / 2, y + 1.6, "#ffffff", 5.4, "center");
      if (k === 3) text("?", x + w / 2, y + 14, col, 16, "center");
      else for (let i = 0; i < 3; i++) { px(x + 8, y + 15 + i * 8, 2, 2, col); px(x + 13, y + 15.4 + i * 8, 40 + ((i * 17 + k * 9) % 30), 1.4, "#9aa0b2"); }
      if (k === 0) for (let i = 0; i < 4; i++) px(x + 74 + i * 5, y + 36 - (6 + i * 5), 3.4, 6 + i * 5, col);
    } else if (ch === "agents") {
      px(x, y, w, h, "#0d1530"); head("AGENTS EN DIRECT", "#1c71d8");
      if (!agents.length) text("Personne au bureau", x + w / 2, y + 22, "#9fb3d9", 4.4, "center");
      agents.slice(0, 5).forEach((a, i) => {
        const yy = y + 10 + i * 6.4, col = { working: "#fbaa08", blocked: "#ff6b6b", done: "#51cf66", asking: "#b48cff" }[a.status] || "#9aa0b2";
        px(x + 3, yy + 1, 2.4, 2.4, col); text(clip(name(a), 12), x + 7, yy, "#f7f7f7", 4); text(clip(a.ticket || specialty(a.type), 11), x + w - 3, yy, "#9fb3d9", 3.8, "right");
      });
    } else if (ch === "tickets") {
      px(x, y, w, h, "#10162b"); head("TABLEAU", "#7764d8");
      const cols = [["À faire", (data.backlog || []).length, "#9fb3d9"], ["En cours", agents.filter(a => ["working", "asking"].includes(a.status)).length, "#fbaa08"], ["Bloqués", agents.filter(a => a.status === "blocked").length, "#ff6b6b"], ["Livrés", agents.filter(a => a.status === "done").length, "#51cf66"]];
      const max = Math.max(1, ...cols.map(c => c[1]));
      cols.forEach(([label, n, col], i) => { const cx = x + 6 + i * 24, bh = 20 * n / max; px(cx, y + 34 - bh, 14, bh || 0.6, col); text(String(n), cx + 7, y + 26 - bh, "#f7f7f7", 4.4, "center"); text(label, cx + 7, y + 35.6, "#c9ccd6", 3.4, "center"); });
    } else if (ch === "clock") {
      const d = clockNow(), w8 = hub.weather?.() || weather?.() || "clear";
      px(x, y, w, h, "#081746"); text(d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), x + w / 2, y + 6, "#fbaa08", 16, "center");
      text(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), x + w / 2, y + 25, "#d5eeff", 4.4, "center");
      text(hub.WEATHER_FR[w8] || "", x + w / 2, y + 32, "#f7f7f7", 4.4, "center");
    } else if (ch === "cartoon") {
      const img = ART.tvshow.image({ frame: Math.floor(t / 700) % 4 });
      px(x, y, w, h, "#000"); if (img) ctx.drawImage(img, Math.round((x + (w - 74.7) / 2) * S), Math.round(y * S), Math.round(74.7 * S), Math.round(h * S));
    }
    if (!hub.meeting.on && t - this.channelAt < 2200) { px(x + 2, y + h - 8, 50, 6, "rgba(0,0,0,.6)"); text(`CH ${this.channel + 1} · ${TV_CHANNELS[this.channel][1]}`, x + 4, y + h - 7.4, "#51cf66", 3.8); }
    // the screen's glare
    ctx.globalAlpha = 0.06; px(x + w * 0.62, y, 10, h, "#ffffff"); ctx.globalAlpha = 1;
    ctx.restore();
  }
  render(t) {
    this.shell(t, "SALLE DE RÉUNION");
    this.wallPieces(t);
    // the table, the chairs, the team, by depth
    const items = [{ y: 172, draw: () => ART.conftable.draw(124, 132) }, { y: 92, draw: () => ART.bigplant.draw(372, 68) }, { y: 92, draw: () => ART.bigplant.draw(204, 68) }];
    for (const s of hub.MEET_SEATS) items.push({ y: s.y - 3, draw: () => ART.officechair.draw(s.x - 7, s.y - (s.y < 150 ? 17 : 14), { back: s.y > 150 }) });
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n); if (!l || !hub.meeting.on) return; const s = hub.MEET_SEATS[i]; items.push({ y: s.y, draw: () => this.drawMate(l, s, i, t) }); });
    if (hub.meeting.on) items.push({ y: 151, draw: () => this.drawChief(t) });
    items.push(...roomDepthItems("meeting", t));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    this.drawOver(t);
    drawBuyOverlay("meeting", t);
  }
  drawMate(l, s, i, t) { drawPerson(s.x, s.y, l.look, { seated: true, back: s.back ?? s.y > 150, dir: s.face, frame: Math.floor(t / 400) + i, smile: true }); }
  drawChief(t, at = { x: 110, y: 151 }) { drawPerson(at.x, at.y, CHIEF_LOOK, { tux: true, arms: "baton", frame: Math.floor(t / 600), smile: true, dir: [1, 0] }); }
  drawOver(t) {
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n), s = hub.MEET_SEATS[i]; if (l && hub.meeting.on && Math.floor(t / 2500 + i) % 4 === 0) anchored(s.x, s.y, () => bubble(s.x, s.y - 22 - headroom(), ["D'accord.", "Bonne idée !", "Je m'en occupe.", "Et les tests ?"][i % 4])); });
    if (!hub.meeting.on) text(hub.MEET_SEATS.length ? "Clique sur la table pour réunir l'équipe" : "Salle vide : achète une table de réunion et des chaises (🛒 ACHAT)", 200, hub.Room.current().iso() ? 26 : 196, "#d5eeff", 5, "center");
  }
  // the whiteboard and the drawing on it (the stroke being drawn too), the TV, the wall clock
  wallPieces(t) { this.drawWhiteboard(); this.drawTv(t); this.drawClock(); }
  // the whiteboard and what is drawn on it (at: its drawing area; a ghost in the buy mode elsewhere)
  drawWhiteboard(at = BOARD) {
    if (at.x < -100) return;
    ART.whiteboard.draw(at.x - 3, at.y - 3, { sel: this.tool });
    ctx.drawImage(this.boardImage(), Math.round(at.x * S), Math.round(at.y * S));
    if (this.stroke && at === BOARD) { ctx.save(); ctx.lineCap = ctx.lineJoin = "round"; this.paintStroke(ctx, this.stroke, Math.round(BOARD.x * S), Math.round(BOARD.y * S)); ctx.restore(); }
    if (!boardSlot.data.strokes.length && !this.stroke) text("Dessine ici ✏️", at.x + at.w / 2, at.y + 16, "#b8bcc8", 5, "center");
    this.drawMissions(at);
  }
  // the missions of the day on post-its, down the board's right edge: ticket or task, colour by state
  drawMissions(at) {
    const agents = (curSession()?.agents || []).filter(a => a.status !== "gone").slice(-4);
    if (!agents.length || at.x < -100) return;
    const COL = { working: "#fff3a8", asking: "#ffd8a8", blocked: "#ffb3b3", done: "#c8f0c0" };
    const x = at.x + at.w - 25;
    text("MISSIONS", x + 11.5, at.y + 1.2, "#081746", 3.2, "center");
    agents.forEach((a, i) => {
      const y = at.y + 5.5 + i * 9;
      px(x + 0.4, y + 0.4, 23, 8, "#00000022"); px(x, y, 23, 8, COL[a.status] || "#fff3a8"); px(x + 9, y - 0.8, 5, 1.6, "#ffffffaa");  // the note, its tape
      text(clip(a.ticket || a.description || a.type || "mission", 13), x + 1.2, y + 1.1, "#1c1c24", 3, "left");
      text(a.status === "done" ? "✓ livré" : a.status === "blocked" ? "✗ bloqué" : a.status === "asking" ? "? question" : "▶ en cours", x + 1.2, y + 4.6, "#4a4e58", 2.6, "left");
    });
  }
  // the wall clock, at the real time
  drawClock(at = CLOCK) {
    if (at.x < -100) return;
    ART.wallclock.draw(at.x, at.y);
    const cx = at.x + 8, cy = at.y + 8, d = clockNow(), hand = (k, len, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd * S; ctx.beginPath(); ctx.moveTo(cx * S, cy * S); ctx.lineTo((cx + Math.sin(k * Math.PI * 2) * len) * S, (cy - Math.cos(k * Math.PI * 2) * len) * S); ctx.stroke(); };
    hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12, 3.4, "#2a2a33", 0.7); hand(d.getMinutes() / 60, 5, "#2a2a33", 0.45); hand(d.getSeconds() / 60, 5.2, "#d64545", 0.25);
  }
  // in isometric view: the board, the TV and the clock on the right wall, the table and the chairs in volume
  renderIso(t, G) {
    G.back(() => {  // the back layer: the room's shell, what hangs on its walls, the rugs
      G.shell({ wall: () => drawWall("meeting"), wallColor: hub.decor.meeting.wallColor, floor: roomFloorCanvas("meeting", roomSize("meeting").h - FLOOR_Y, [], roomSize("meeting").w) });  // its size (construct.js)
      text("SALLE DE RÉUNION", 200, 3, "#fbaa08", 6, "center");
      G.onFloor(() => drawRoomItems("meeting", t, "rug"));
      G.onBackWall(() => this.wallStrip(t));  // its board, TV and clock: objects bought (build.js)
      G.onLeftWall(() => leftWallDecor("meeting", t));
    });
    const items = [];
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n), s = hub.MEET_SEATS[i]; if (l && s && hub.meeting.on) items.push({ pt: [s.x, s.y], draw: () => G.put(s.x, s.y, s.x, s.y, s.lift, () => this.drawMate(l, s, i, t)) }); });
    const table = hub.itemsIn("meeting").find(it => hub.defOf(it.type).role === "conftable"), head = table ? (() => { const [x0, y0, , y1] = hub.footOf(table); return { x: x0 - 14, y: (y0 + y1) / 2 }; })() : { x: 110, y: 151 };
    if (hub.meeting.on) items.push({ pt: [head.x, head.y], draw: () => anchored(head.x, head.y, () => this.drawChief(t, head)) });
    this.chiefItem(t, G, items);
    isoItems("meeting", t, G, items);
    G.drawSorted(items);
    lampsOver("meeting");
    this.drawOver(t);
    this.chiefOver(t);
    drawBuyOverlayIso("meeting", t, G);
  }
  // the board (drawn with the pointer), its tray (markers, eraser, sponge), the TV: taken here, not by the floor
  click(p) {
    if (inRect(BOARD, p)) return true;
    const ox = BOARD.x - 51, oy = BOARD.y - 17;  // the tray, under the board
    if (p.y >= 56 + oy && p.y <= 67 + oy && p.x >= 48 + ox && p.x <= 196 + ox) {
      const i = Math.floor((p.x - 56 - ox) / 13);
      if (i >= 0 && i < BOARD_INK.length && p.x - 56 - ox - i * 13 <= 11) { this.tool = i; return true; }
      const ex = 56 + ox + BOARD_INK.length * 13 + 4;
      if (p.x >= ex && p.x <= ex + 12) { this.tool = -1; return true; }
      if (p.x >= 174 + ox && p.x <= 188 + ox) {
        if (performance.now() > this.clearArmed) { this.clearArmed = performance.now() + 3000; toast("TABLEAU", "Tout effacer ?", "Reclique sur l'éponge pour effacer le tableau (Ctrl+Z annule un trait)."); return true; }
        boardSlot.data.strokes = []; boardSlot.save(); this.version++; this.clearArmed = 0; return true;
      }
      return true;
    }
    if (inRect(TV, p, 2)) { this.channel = (this.channel + 1) % TV_CHANNELS.length; this.channelAt = performance.now(); return true; }
    return false;
  }
  hit(x, y) {
    const ox = BOARD.x - 51, oy = BOARD.y - 17;
    if (inRect(BOARD, { x, y }) || inRect(TV, { x, y }, 2) || (y >= 56 + oy && y <= 67 + oy && x >= 48 + ox && x <= 196 + ox)) return "meeting-board";
    return super.hit(x, y);
  }
}
new MeetingRoom();
provide({ get MEET_PIECES() { return { BOARD, TV, CLOCK }; } });

// the weather on the deck: snow that settles while it snows (10 min to cover it) and melts after, puddles under the rain
const deckWx = { snow: -1, wet: -1, at: 0 };
const rndK = n => { const v = Math.sin(n * 127.1) * 43758.5; return v - Math.floor(v); };
function stepDeckWx(t) {
  const w = hub.weather?.() || "clear", dt = deckWx.at ? Math.min(2000, t - deckWx.at) : 0; deckWx.at = t;
  if (deckWx.snow < 0) { deckWx.snow = w === "snow" ? 0.7 : 0; deckWx.wet = ["rain", "storm"].includes(w) ? 0.8 : 0; }  // on arrival: as if it had been going on
  deckWx.snow = Math.max(0, Math.min(1, deckWx.snow + dt * (w === "snow" ? 1 / 600000 : -1 / 900000)));
  deckWx.wet = Math.max(0, Math.min(1, deckWx.wet + dt * (["rain", "storm"].includes(w) ? 1 / 180000 : -1 / 600000)));
  return w;
}
// on the deck's plane (2D floor units): drifts of snow, puddles with the rain's rings
function drawDeckWx(R, t, raining) {
  const { snow, wet } = deckWx, still = hub.focusMode;
  if (snow > 0.01) {
    ctx.globalAlpha = Math.min(0.85, snow * 0.9); px(0, 70, R.w, R.h - 70, "#f2f6fa");  // the layer, thicker as it falls
    for (let i = 0; i < 220; i++) {  // drifts over it, bluish in their hollows
      const x = rndK(i) * R.w, y = 72 + rndK(i + 500) * (R.h - 74), r = (6 + rndK(i + 900) * 14) * (0.5 + snow * 0.7);
      ctx.globalAlpha = Math.min(1, snow * 1.2) * (i % 4 ? 0.7 : 0.35); ctx.fillStyle = i % 4 ? "#ffffff" : "#c9d6e6";
      ctx.beginPath(); ctx.ellipse(x * S, y * S, r * S, r * 0.75 * S, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (wet > 0.01) {
    for (let i = 0; i < 14; i++) {
      const x = 20 + rndK(i + 40) * (R.w - 40), y = 84 + rndK(i + 80) * (R.h - 100), r = (6 + rndK(i + 120) * 14) * wet;
      ctx.globalAlpha = 0.45 * wet; ctx.fillStyle = "#3a4a66"; ctx.beginPath(); ctx.ellipse(x * S, y * S, r * S, r * 0.6 * S, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.3 * wet; ctx.fillStyle = "#c9d8ee"; ctx.beginPath(); ctx.ellipse((x - r * 0.3) * S, (y - r * 0.2) * S, r * 0.35 * S, r * 0.12 * S, 0, 0, Math.PI * 2); ctx.fill();
      if (raining && !still) {  // the rain's rings
        const k = ((t / 700) + rndK(i + 160)) % 1; ctx.globalAlpha = 0.5 * (1 - k) * wet; ctx.strokeStyle = "#dfe9f7"; ctx.lineWidth = Math.max(1, 0.4 * S);
        ctx.beginPath(); ctx.ellipse(x * S, y * S, r * 0.8 * k * S, r * 0.48 * k * S, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// the roof terrace: the city behind a glass railing, the stair kiosk, a pergola over the banquet table, the bar, the
// grill, the fire pit, an outdoor lounge, deckchairs, planters, string lights; the Friday afterwork happens here
class TerraceRoom extends BuiltRoom {
  // where the team stands during the afterwork: at the bar, around the fire pit, by the grill, at the banquet table
  static SPOTS = [[486, 152], [506, 154], [526, 152], [196, 190], [254, 196], [232, 238], [352, 140], [378, 142], [86, 150], [116, 152], [146, 150], [300, 170]].map(([x, y]) => ({ x, y }));
  constructor() { super("terrace", "🌿 Terrasse"); }
  // where the team goes during the afterwork: the seats of the furniture bought (the hot tub's rim, the picnic benches,
  // the swing…), the bar's counter, the grill, around the fire pit; with nothing bought, the old places
  partySpots() {
    const out = [];
    for (const it of hub.itemsIn("terrace")) {
      const d = hub.defOf(it.type), [x0, y0, x1, y1] = hub.footOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (d.visit === "terrace" || d.act === "read") out.push(...hub.spotsOf(it).map(sp => ({ ...sp, pose: { seated: true, ...(d.pose || {}) } })));
      else if (d.bar && it.type !== "bar") out.push(...hub.spotsOf(it).map(sp => ({ ...sp, pose: { hold: "pint" } })));  // at the counter (items/bar.js)
      else if (it.type === "bar") for (const k of [0.25, 0.5, 0.75]) out.push(it.rot % 2 ? { x: x1 + 6, y: y0 + (y1 - y0) * k, face: [-1, 0], pose: { cup: true, hold: "pint" } } : { x: x0 + (x1 - x0) * k, y: y1 + 6, face: [0, -1], pose: { cup: true, hold: "pint" } });
      else if (it.type === "grill") out.push({ x: cx, y: y1 + 6, face: [0, -1], pose: { arms: "reach" } });
      else if (it.type === "firepit") for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) out.push({ x: cx + dx * ((x1 - x0) / 2 + 6), y: cy + dy * ((y1 - y0) / 2 + 6), face: [-dx, -dy], pose: { cup: true } });
    }
    const R = roomSize("terrace");
    return (out.length ? out : TerraceRoom.SPOTS.map(sp => ({ ...sp, pose: { cup: true } }))).filter(sp => sp.x > 4 && sp.x < R.w - 4 && sp.y > 72 && sp.y < R.h - 2);
  }
  partySpotOf(l) { const all = this.partySpots(); return all.length ? all[(l.partySpot || 0) % all.length] : null; }
  // how someone stands there (a visitor on a seat, social/visits.js; the afterwork, see partySpots)
  poseOf(l, t) {
    const sp = l.roomSpot || this.partySpotOf(l) || {}, p = sp.pose || {}, face = sp.face;
    return { seated: !!p.seated, back: (face?.[1] ?? 0) < 0, dir: face || null, smile: true, frame: Math.floor(t / (p.arms === "reach" ? 300 : 500)),
      arms: p.arms || (p.seated ? "down" : Math.floor(t / 500 + hash(l.name)) % 2 ? "up" : "down"), hold: p.book ? "book" : p.hold || "" };
  }
  // who is here: at the afterwork, or come for a moment (social/visits.js)
  people() { return [...loungers.values()].filter(l => l.partyRoom === "terrace" && !l.path.length).map(l => ({ l, sp: l.roomSpot || this.partySpotOf(l) })).filter(o => o.sp); }
  // a string of lights hanging between two points: a wire, bulbs lit at dusk, at night and during the afterwork
  strand(x0, y0, x1, y1, sag, lit, t) {
    const n = Math.max(6, Math.round(Math.abs(x1 - x0) / 7));
    for (let i = 0; i <= n * 3; i++) { const k = i / (n * 3); px(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag, 0.6, 0.6, "#2a2a33"); }
    for (let i = 1; i < n; i++) {
      const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag + 0.8;
      const col = ["#ffd43b", "#ff9f43", "#fff3b0", "#ff6b9a"][i % 4], on = lit && (Math.floor(t / 900) + i) % 7 !== 0;
      if (on) { ctx.globalAlpha = 0.35; px(x - 1.6, y - 1, 4.2, 4.4, col); ctx.globalAlpha = 1; }
      px(x - 0.2, y - 0.6, 0.6, 0.6, "#2a2a33"); px(x - 0.5, y, 1.4, 1.8, on ? col : "#c8c4bc");
    }
  }
  render(t) {
    const { phase } = skyPhase(), st = SKY[phase], dark = phase === "night", dim = dark || phase === "dusk", season = hub.seasonNow(), gloomy = ["rain", "storm"].includes(hub.weather?.() || weather?.());
    const party = !!dayState.party, lit = dim || party || gloomy, still = focusMode;
    // sky: the hour and today's weather (svg/sky.js)
    drawTerraceSky(t);
    // the city, the railing, the deck
    ART.city.draw(0, 22, { phase, blink: Math.floor(t / 700) % 2 });
    ART.deck.draw(0, 72);
    ART.railing.draw(0, 56, { night: dark });
    text("TERRASSE", 200, 2, "#fbaa08", 6, "center");
    ART.kiosk.draw(4, 12, { night: dim });
    text("← BUREAU", 26, 25.2, "#fbaa08", 3.6, "center");
    drawRoomItems("terrace", t, "rug");
    // furniture and people, by depth
    const grillOn = party || season === "été";
    const items = [
      { y: 86, draw: () => { ART.planter.draw(180, 64, { season }); ART.planter.draw(214, 64, { season }); } },
      { y: 116, draw: () => {
        ART.grill.draw(258, 86, { on: grillOn });
        if (grillOn && !still) for (let i = 0; i < 4; i++) { const k = ((t / 1600) + i / 4) % 1; ctx.globalAlpha = 0.45 * (1 - k); px(266 + Math.sin(k * 6 + i) * 3, 92 - k * 26, 2.4 + k * 3, 2.4 + k * 3, "#e6e6ee"); ctx.globalAlpha = 1; }
      } },
      { y: 128, draw: () => ART.bar.draw(304, 72, { neon: lit }) },
      { y: 130, draw: () => {
        ART.chalkboard.draw(222, 104);
        text("AFTERWORK", 237, 107.4, "#f2f2f2", 3.2, "center");
        text(party ? "C'EST PARTI !" : "VEN. 17 H", 237, 112, party ? "#fbaa08" : "#cfe8d6", 3.2, "center");
        text(grillOn ? "BBQ 🔥" : "🍻", 237, 116.6, "#ff9f43", 3.2, "center");
      } },
      ...[316, 334, 352].map(x => ({ y: 140, draw: () => ART.barstool.draw(x, 126) })),
      { y: 144, draw: () => ART.pergola.draw(50, 70, { season }) },
      { y: 186, draw: () => ART.olive.draw(370, 146, { season }) },
      { y: 136, draw: () => ART.olive.draw(10, 96, { season }) },
      { y: 196, draw: () => ART.parasol.draw(24, 128) },
      { y: 187, draw: () => { SPRITES.beanbag.draw(150, 176); SPRITES.beanbag.draw(214, 178); } },
      { y: 213, draw: () => ART.parasol.draw(304, 144) },
      { y: 190, draw: () => ART.firepit.draw(181, 168, { lit: lit || season === "hiver", frame: still ? 0 : Math.floor(t / 160) % 3 }) },
      ...[[284, 206, "#ff6b6b"], [316, 210, "#51cf66"], [348, 206, "#5aa9ff"]].map(([x, y, towel]) => ({ y: y + 16, draw: () => ART.chaise.draw(x, y, { towel }) })),
      { y: 214, draw: () => ART.outsofa.draw(60, 178) },
      { y: 216, draw: () => ART.lowtable.draw(94, 202, { lit }) },
    ];
    for (const l of loungers.values()) if (l.partyRoom === "terrace" && !l.path.length) {
      const sp = TerraceRoom.SPOTS[(l.partySpot || 0) % TerraceRoom.SPOTS.length], x = sp.x, y = sp.y;
      items.push({ y, draw: () => { drawPerson(x, y, l.look, { arms: Math.floor(t / 500 + hash(l.name)) % 2 ? "up" : "down", frame: Math.floor(t / 300), smile: true }); px(x + 4, y - 13, 2.5, 3, "#f4c430"); } });
      items.push({ y: y + 0.1, draw: () => { badge(x, y + 2, nameTag(l.name), "#4090d7"); if (t < l.sayUntil) bubble(x, y - 24, l.say, "#f7f7f7", "#081746", l.name); } });
    }
    items.push(...roomDepthItems("terrace", t));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    // the hour: darker at dusk and at night, then what shines
    terraceWeatherVeil(t);
    if (dim) { ctx.fillStyle = dark ? "rgba(8, 12, 40, .38)" : "rgba(40, 20, 60, .16)"; ctx.fillRect(0, Math.round(56 * S), cv.width, cv.height); }
    this.strand(44, 16, 52, 72, 6, lit, t);
    this.strand(174, 72, 304, 76, 18, lit, t);
    this.strand(180, 57, 300, 57, 3, lit, t);
    const glow = (x, y, r, col, a) => { ctx.globalAlpha = a; px(x - r, y - r, r * 2, r * 2, col); ctx.globalAlpha = 1; };
    if (lit) { glow(348, 79, 9, "#ff5fa2", 0.12); glow(109, 205, 5, "#ffd27a", 0.18); }  // the neon, the lantern
    if (lit || season === "hiver") glow(196, 177, 12, "#ff9f43", 0.14 + (still ? 0 : Math.sin(t / 120) * 0.03));  // the fire
    hub.drawSeasonTerrace(t);  // seasons.js: snow, leaves, petals
    terraceRain(t);  // the rain: streaks, rings on the deck (world/physics.js)
    drawPartyOver("terrace", t);
    drawBuyOverlay("terrace", t);
  }
  // the deck under the whole terrace: the 2D deck repeated (cached per scale)
  deckFloor() {
    const img = ART.deck.image({}), R = roomSize("terrace");
    if (!img) return null;
    if (this.deck?.img === img) return this.deck.c;
    const c = document.createElement("canvas"); c.width = Math.ceil(R.w * S); c.height = Math.ceil((R.h - 70) * S);
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    for (let x = 0; x < R.w; x += 400) for (let y = 0; y < R.h - 70; y += 158) g.drawImage(img, Math.round(x * S), Math.round(y * S), Math.round(400 * S), Math.round(160 * S));
    this.deck = { img, c };
    return c;
  }
  // in isometric view: the sky and the city behind, the deck as a raised floor with its glass railing, the stairs'
  // kiosk (fixed); everything else is bought (build.js)
  renderIso(t, G) {
    const { phase } = skyPhase(), st = SKY[phase], dark = phase === "night", dim = dark || phase === "dusk", season = hub.seasonNow(), gloomy = ["rain", "storm"].includes(hub.weather?.() || weather?.());
    const party = !!dayState.party, lit = dim || party || gloomy, still = focusMode, R = roomSize("terrace"), raining = ["rain", "storm"].includes(stepDeckWx(t));
    G.back(() => {  // the back layer: the room's shell, what hangs on its walls, the rugs
      G.screen(() => {  // the sky and the city stay behind, whatever the camera
      px(0, 0, W, H, st[2]);
      drawTerraceSky(t);  // the hour and today's weather (svg/sky.js)
      streetHaze(phase, gloomy);  // the street far below, under the skyline (iso/rooftops.js)
      ART.city.draw(0, 22, { phase, blink: Math.floor(t / 700) % 2 });
      });
      drawRooftops(R, phase, gloomy, t);  // the neighbours' roofs below, our building under the deck
      G.shell({ floor: this.deckFloor(), walls: false });
      G.onFloor(() => { drawRoomItems("terrace", t, "rug"); drawDeckWx(R, t, raining); });
      // the glass railing along the two back edges
      const glass = (a, b) => { ctx.globalAlpha = 0.28; ctx.fillStyle = dark ? "#9fb3d9" : "#d5eeff"; ctx.beginPath(); for (const [i, q] of [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], 13), P(a[0], a[1], 13)].entries()) i ? ctx.lineTo(q.x * S, q.y * S) : ctx.moveTo(q.x * S, q.y * S); ctx.fill(); ctx.globalAlpha = 1; };
      for (let x = 0; x < R.w; x += 25) glass([x, 70], [x + 25, 70]);
      for (let y = 70; y < R.h; y += 25) glass([0, y], [0, y + 25]);
      for (let x = 0; x <= R.w; x += 25) { const a = P(x, 70), b = P(x, 70, 14); px(a.x - 0.5, b.y, 1, a.y - b.y, "#9aa0b2"); }
      for (let y = 70; y <= R.h; y += 25) { const a = P(0, y), b = P(0, y, 14); px(a.x - 0.5, b.y, 1, a.y - b.y, "#9aa0b2"); }
      ctx.strokeStyle = "#c9ccd6"; ctx.lineWidth = S * 0.8; ctx.beginPath(); [P(0, R.h, 14), P(0, 70, 14), P(R.w, 70, 14)].forEach((q, i) => i ? ctx.lineTo(q.x * S, q.y * S) : ctx.moveTo(q.x * S, q.y * S)); ctx.stroke();
      text("TERRASSE", 200, 2, "#fbaa08", 6, "center");
    });
    const items = [];
    const stand = (ax, ay, fn, box) => items.push({ pt: [ax, ay], draw: () => anchored(ax, ay, fn, box) });
    const k = P(4, 70); items.push({ fp: [4, 70, 48, 96], draw: () => { ART.isokiosk.draw(k.x, k.y, { night: dim }); G.boxRegion(4, 70, 48, 96, 40, { x: 24, y: 40 }); } });  // the stairs' kiosk (fixed): back to the office
    items.push({ pt: [26, 97], draw: () => G.put(0, 0, 15, 96, 35, () => text("← BUREAU", 0, 0, "#fbaa08", 3.6, "center")) });
    const here = this.people();
    for (const { l, sp } of here) items.push({ pt: [sp.x, sp.y], draw: () => G.put(sp.x, sp.y, sp.x, sp.y, sp.lift || 0, () => {
      drawPerson(sp.x, sp.y, l.look, this.poseOf(l, t));
      if (sp.pose?.cup) px(sp.x + 4, sp.y - 13, 2.5, 3, "#f4c430");  // a drink
    }, { x: sp.x - 9, y: sp.y - 34, w: 18, h: 37, to: { x: sp.x, y: sp.y - 8 } }) });
    this.chiefItem(t, G, items);
    isoItems("terrace", t, G, items);
    G.drawSorted(items);
    for (const { l, sp } of here) G.put(sp.x, sp.y, sp.x, sp.y, sp.lift || 0, () => { const seated = !!sp.pose?.seated; badge(sp.x, sp.y + (seated ? -3 : 2), nameTag(l.name), "#4090d7"); if (t < l.sayUntil) bubble(sp.x, sp.y - (seated ? 22 : 24) - headroom(), l.say, "#f7f7f7", "#081746", l.name); });
    // the weather (grey veil, snow; the rain over the screen), then the hour: darker at dusk and at night, then what shines
    terraceWeatherVeil(t);
    G.screen(() => terraceRain(t, false));
    if (dim) fillScreen(dark ? "rgba(8, 12, 40, .38)" : "rgba(40, 20, 60, .16)");
    const sp = (a, b, sag) => { const p = P(...a), q = P(...b); this.strand(p.x, p.y, q.x, q.y, sag, lit, t); };
    sp([0, R.h, 14], [0, 70, 14], 4);
    sp([0, 70, 14], [R.w, 70, 14], 4);
    const glow = (q, r, col, a) => { ctx.globalAlpha = a; px(q.x - r, q.y - r, r * 2, r * 2, col); ctx.globalAlpha = 1; };
    for (const it of hub.itemsIn("terrace")) {  // what shines: the bar's neon, the fire pits
      const [x0, y0, x1, y1] = hub.footOf(it), c = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
      if (it.type === "bar" && lit) glow(P(c.x, y0 + 3, 36), 9, "#ff5fa2", 0.12);
      if (it.type === "firepit" && (lit || season === "hiver")) glow(P(c.x, c.y, 8), 12, "#ff9f43", 0.14 + (still ? 0 : Math.sin(t / 120) * 0.03));
    }
    lampsOver("terrace");
    this.chiefOver(t);
    hub.drawSeasonTerrace(t);
    const D = R.h - 70;  // the garland along the railing
    drawPartyOver("terrace", t, u => { const L = D / (D + R.w); return u < L ? P(0, R.h - D * u / L, 13) : P(R.w * (u - L) / (1 - L), 70, 13); });
    drawBuyOverlayIso("terrace", t, G);
  }
}
new TerraceRoom();
