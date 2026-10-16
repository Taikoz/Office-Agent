// The rooms built in construction mode (construct.js): a meeting room and a terrace, on the room bar once built.

import { hub } from "../hub.js";
import { H, S, W, badge, clip, ctx, curSession, cv, data, hash, px, specialty, text } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { CLOUD_TONES, SKY, skyPhase } from "../svg/sky.js";
import { BOARD_INK } from "../svg/meeting.js";
import { FLOOR_Y, bubble, drawPerson } from "../world/scene.js";
import { crew } from "../sims/crew.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { loungers, view } from "../world/lounge.js";
import { nameTag } from "../world/shop.js";
import { doorSprite, drawWall, roomFloorCanvas } from "../world/decor.js";
import { canvasPoint } from "../ui/panel.js";
import { toast } from "../sims/progress.js";
import { weather } from "../agents/events2.js";
import { focusMode } from "../ui/ux.js";
import { buy, drawBuyOverlay, drawRoomItems, hitItem, roomDepthItems } from "../world/build.js";
import { clockNow, dayState, drawPartyOver } from "../sims/days.js";
import { Room } from "./base.js";

class BuiltRoom extends Room {
  get open() { return hub.con.rooms.includes(this.id); }
  // the door back to the office, the bought objects
  hit(x, y) {
    if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
    return hitItem(x, y, this.id);
  }
  // the wall and floor of its decor, a baseboard, its title, the door back to the office, the rugs and wall objects
  shell(t, title) {
    drawWall(this.id);
    ctx.drawImage(roomFloorCanvas(this.id, H - FLOOR_Y, []), 0, Math.round(FLOOR_Y * S));
    px(0, 66.5, W, 3.5, "#2a1f18"); px(0, 66.5, W, 0.6, "#4a3828");
    text(title, 200, 4, "#fbaa08", 6, "center");
    doorSprite("office").draw(8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
    drawRoomItems(this.id, t, "rug"); drawRoomItems(this.id, t, "wall");
  }
}

// the meeting room: a whiteboard you draw on (markers on its tray, Ctrl+Z, the sponge clears it; kept), the wall TV
// (a click changes the channel: agents live, tickets, time and weather, a cartoon, off; slides during a meeting),
// the conference table where the free devs sit for a minute (startMeeting, construct.js), a wall clock
const boardSlot = new SaveSlot("office-whiteboard", { strokes: [] });
const BOARD = { x: 51, y: 17, w: 142, h: 42 }, BOARD_POINTS = 40000;
const TV = { x: 234, y: 10, w: 100, h: 42 }, TV_CHANNELS = [["agents", "Agents"], ["tickets", "Tickets"], ["clock", "Heure"], ["cartoon", "Dessin animé"], ["off", "Éteinte"]];
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
  drawTv(t) {
    const { x, y, w, h } = TV, ch = hub.meeting.on ? "slides" : TV_CHANNELS[this.channel][0];
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
      const d = clockNow(), w8 = weather?.() || "clear";
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
    // the whiteboard and the drawing on it (the stroke being drawn too)
    ART.whiteboard.draw(48, 14, { sel: this.tool });
    ctx.drawImage(this.boardImage(), Math.round(BOARD.x * S), Math.round(BOARD.y * S));
    if (this.stroke) { ctx.save(); ctx.lineCap = ctx.lineJoin = "round"; this.paintStroke(ctx, this.stroke, Math.round(BOARD.x * S), Math.round(BOARD.y * S)); ctx.restore(); }
    if (!boardSlot.data.strokes.length && !this.stroke) text("Dessine ici ✏️", BOARD.x + BOARD.w / 2, BOARD.y + 16, "#b8bcc8", 5, "center");
    this.drawTv(t);
    // the wall clock, at the real time
    ART.wallclock.draw(354, 14);
    const d = clockNow(), hand = (k, len, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd * S; ctx.beginPath(); ctx.moveTo(362 * S, 22 * S); ctx.lineTo((362 + Math.sin(k * Math.PI * 2) * len) * S, (22 - Math.cos(k * Math.PI * 2) * len) * S); ctx.stroke(); };
    hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12, 3.4, "#2a2a33", 0.7); hand(d.getMinutes() / 60, 5, "#2a2a33", 0.45); hand(d.getSeconds() / 60, 5.2, "#d64545", 0.25);
    // the table, the chairs, the team, by depth
    const items = [{ y: 172, draw: () => ART.conftable.draw(124, 132) }, { y: 92, draw: () => ART.bigplant.draw(372, 68) }, { y: 92, draw: () => ART.bigplant.draw(204, 68) }];
    for (const s of hub.MEET_SEATS) items.push({ y: s.y - 3, draw: () => ART.officechair.draw(s.x - 7, s.y - (s.y < 150 ? 17 : 14), { back: s.y > 150 }) });
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n); if (!l || !hub.meeting.on) return; const s = hub.MEET_SEATS[i]; items.push({ y: s.y, draw: () => drawPerson(s.x, s.y, l.look, { seated: true, back: s.y > 150, frame: Math.floor(t / 400) + i, smile: true }) }); });
    if (hub.meeting.on) items.push({ y: 151, draw: () => drawPerson(110, 151, CHIEF_LOOK, { tux: true, arms: "baton", frame: Math.floor(t / 600), smile: true }) });
    items.push(...roomDepthItems("meeting", t));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n); if (l && hub.meeting.on && Math.floor(t / 2500 + i) % 4 === 0) bubble(hub.MEET_SEATS[i].x, hub.MEET_SEATS[i].y - 22, ["D'accord.", "Bonne idée !", "Je m'en occupe.", "Et les tests ?"][i % 4]); });
    if (!hub.meeting.on) text("Clique sur la table pour réunir l'équipe", 200, 196, "#d5eeff", 5, "center");
    drawBuyOverlay("meeting", t);
  }
  // the board (drawn with the pointer), its tray (markers, eraser, sponge), the TV: taken here, not by the floor
  click(p) {
    if (inRect(BOARD, p)) return true;
    if (p.y >= 56 && p.y <= 67 && p.x >= 48 && p.x <= 196) {
      const i = Math.floor((p.x - 56) / 13);
      if (i >= 0 && i < BOARD_INK.length && p.x - 56 - i * 13 <= 11) { this.tool = i; return true; }
      const ex = 56 + BOARD_INK.length * 13 + 4;
      if (p.x >= ex && p.x <= ex + 12) { this.tool = -1; return true; }
      if (p.x >= 174 && p.x <= 188) {
        if (performance.now() > this.clearArmed) { this.clearArmed = performance.now() + 3000; toast("TABLEAU", "Tout effacer ?", "Reclique sur l'éponge pour effacer le tableau (Ctrl+Z annule un trait)."); return true; }
        boardSlot.data.strokes = []; boardSlot.save(); this.version++; this.clearArmed = 0; return true;
      }
      return true;
    }
    if (inRect(TV, p, 2)) { this.channel = (this.channel + 1) % TV_CHANNELS.length; this.channelAt = performance.now(); return true; }
    return false;
  }
  hit(x, y) {
    if (inRect(BOARD, { x, y }) || inRect(TV, { x, y }, 2) || (y >= 56 && y <= 67 && x >= 48 && x <= 196)) return "meeting-board";
    return x >= 124 && x <= 276 && y >= 130 && y <= 172 ? "meet-table" : super.hit(x, y);
  }
}
new MeetingRoom();

// the roof terrace: the city behind a glass railing, the stair kiosk, a pergola over the banquet table, the bar, the
// grill, the fire pit, an outdoor lounge, deckchairs, planters, string lights; the Friday afterwork happens here
class TerraceRoom extends BuiltRoom {
  // where the team stands during the afterwork: at the bar, around the fire pit, by the grill, at the banquet table
  static SPOTS = [[318, 150], [338, 152], [358, 150], [178, 166], [214, 168], [242, 192], [250, 132], [276, 134], [86, 150], [116, 152], [146, 150], [232, 150]].map(([x, y]) => ({ x, y }));
  constructor() { super("terrace", "🌿 Terrasse"); }
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
    const { h, phase } = skyPhase(), st = SKY[phase], dark = phase === "night", dim = dark || phase === "dusk", season = hub.seasonNow();
    const party = !!dayState.party, lit = dim || party, still = focusMode;
    // sky: gradient, sun or moon and stars, clouds drifting, birds by day
    ART.terracesky.draw(0, 0, { stops: st });
    if (dark) {
      for (let i = 0; i < 40; i++) if ((Math.floor(t / 600) + i) % 7) px((i * 53) % W, (i * 17) % 34, i % 5 ? 0.7 : 1, i % 5 ? 0.7 : 1, "#f4f2ff");
      ART.terracemoon.draw(318, 6, { bg: st[0] });
    } else {
      const k = Math.max(0, Math.min(1, (h - 6) / 15));
      ART.sun.draw(20 + k * 350, 30 - Math.sin(k * Math.PI) * 26, { color: phase === "day" ? "#ffe066" : "#ff9f43" });
    }
    const tone = CLOUD_TONES[phase];
    for (let i = 0; i < 5; i++) { const kind = "abc"[i % 3], cw = ART.cloud.width(kind), x = ((still ? 0 : t / (700 + i * 160)) + i * 97) % (W + cw + 20) - cw - 10; ART.cloud.draw(x, 4 + (i * 7) % 18, { kind, tone }); }
    if (phase === "day" && !still) for (let i = 0; i < 3; i++) { const bx = ((t / 60 + i * 40) % (W + 40)) - 20, by = 18 + i * 5 + Math.sin(t / 300 + i) * 2, up = Math.floor(t / 200 + i) % 2; px(bx, by, 1.2, 0.6, "#2a2a33"); px(bx + 1.2, by + (up ? -0.6 : 0.4), 1.2, 0.6, "#2a2a33"); px(bx - 1.2, by + (up ? -0.6 : 0.4), 1.2, 0.6, "#2a2a33"); }
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
      items.push({ y: y + 0.1, draw: () => { badge(x, y + 2, nameTag(l.name), "#4090d7"); if (t < l.sayUntil) bubble(x, y - 24, l.say, "#f7f7f7", "#081746"); } });
    }
    items.push(...roomDepthItems("terrace", t));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    // the hour: darker at dusk and at night, then what shines
    if (dim) { ctx.fillStyle = dark ? "rgba(8, 12, 40, .38)" : "rgba(40, 20, 60, .16)"; ctx.fillRect(0, Math.round(56 * S), cv.width, cv.height); }
    this.strand(44, 16, 52, 72, 6, lit, t);
    this.strand(174, 72, 304, 76, 18, lit, t);
    this.strand(180, 57, 300, 57, 3, lit, t);
    const glow = (x, y, r, col, a) => { ctx.globalAlpha = a; px(x - r, y - r, r * 2, r * 2, col); ctx.globalAlpha = 1; };
    if (lit) { glow(348, 79, 9, "#ff5fa2", 0.12); glow(109, 205, 5, "#ffd27a", 0.18); }  // the neon, the lantern
    if (lit || season === "hiver") glow(196, 177, 12, "#ff9f43", 0.14 + (still ? 0 : Math.sin(t / 120) * 0.03));  // the fire
    hub.drawSeasonTerrace(t);  // seasons.js: snow, leaves, petals
    drawPartyOver("terrace", t);
    drawBuyOverlay("terrace", t);
  }
}
new TerraceRoom();
