// Office room, desks, board and people drawing.

import { hub, provide } from "../hub.js";
import { CAB, DESKS, H, S, STATE_COLORS, W, chief, roomSize, clip, ctx, data, drawerUntil, ents, font, hash, inTransit, mmx, px, raw, text, typeColor } from "../core/core.js";
import { isoDrawing } from "../iso/engine.js";
import { ART, shade } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { lookTraits } from "../svg/figures.js";
import { BOARD_COLS, STICKY } from "../svg/office.js";
import { drawSky } from "../svg/sky.js";

/* ---------- scene ---------- */
// the floor (decor.js: parquet, tiles, carpet… and a rug under each row of desks), drawn once per scale and setting
export const FLOOR_Y = 70;
export function floorCanvas(room = "office") {
  const rows = [...new Set(DESKS.map(d => d.y))], x0 = Math.min(...DESKS.map(d => d.x)) - 30, x1 = Math.max(...DESKS.map(d => d.x)) + 30, R = roomSize(room);
  return hub.roomFloorCanvas(room, R.h - FLOOR_Y, rows.map(dy => [x0, dy - 4 - FLOOR_Y, x1 - x0, 36]), R.w);
}

export function drawRoom(t, room = "office") {
  const mine = room === "office";
  hub.drawWall(room);
  ctx.drawImage(floorCanvas(room), 0, Math.round(FLOOR_Y * S));
  drawRoomWall(t, room);
  // plants
  SPRITES.plant.draw(438, 52);
  if (mine) hub.drawTeamPlant(t);
  // espresso machine: brews while a dev or the chief takes a coffee
  const { frame, brewing } = coffeeState(t, mine);
  ART.coffeemachine.draw(456, 44, { frame, brewing });
  if (mine) SPRITES.sign.draw(454, 26);
  if (!hub.focusMode) hub.drawSeason(t);
}
// what hangs on the wall: chair rail, baseboard, the window and its sky, the trophies and the employee of the week,
// the door (also painted on the right wall of the isometric view)
export function drawRoomWall(t, room = "office", iso = false) {
  const mine = room === "office", wc = hub.decor[room].wallColor;
  if (hub.decor[room].wall !== "boiserie") { px(0, 44, W, 0.8, shade(wc, 0.87)); px(0, 44.8, W, 0.5, shade(wc, 1.35)); }  // chair rail on the wall
  px(0, 66.5, W, 3.5, "#2a1f18"); px(0, 66.5, W, 0.6, "#4a3828"); px(0, 69.4, W, 0.6, "#1a130e");  // baseboard
  // window: sky following the real hour and the weather of today's tests (svg/sky.js drawSky)
  if (!iso) { drawSky(374, 12, t); hub.drawWindow(room, 368, 4); ART.glints.draw(368, 4); }  // in isometric view, windows are bought (build.js)
  if (mine && !iso) { hub.drawShelf(t); hub.drawEmployee(t); }  // in isometric view: objects bought (build.js)
  // door
  hub.doorSprite(room).draw(492, 20);
  px(493, 10, 28, 8, "#f7f7f7"); text(mine ? `☕ REPOS ${hub.loungers.size}` : "← MON BUREAU", 507, 10.6, "#081746", 4, "center");
}
export function coffeeState(t, mine = true) {
  const brewing = mine && ([...ents.values()].some(e => e.pose === "coffee") || (chief.at === "coffee" && !chief.path.length && chief.coffeeUntil > 0));
  return { brewing, frame: brewing ? Math.floor(t / 600) % 4 : 0 };
}

export let boardCards = [];  // card rectangles of the last frame, for dragging a ticket onto a free desk
// a column with more than 5 cards shows 4 per page and a ◀ page/pages ▶ strip in the 5th slot (click or mouse wheel)
const boardPage = {};
export let boardPagers = [];
export function flipBoard(st, dir) {
  const pg = boardPagers.find(b => b.st === st);
  if (pg) boardPage[st] = ((boardPage[st] || 0) + dir + pg.pages) % pg.pages;
}
export function hitBoardPager(x, y) {
  const b = boardPagers.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  return b ? `boardpg:${b.st}:${x < b.x + b.w / 2 ? -1 : 1}` : null;
}
// the ticket board bought (build.js): where its top-left corner is on the wall (offscreen: none)
export const BOARD_AT = { x: -999, y: -999 };
// at: where to draw it (a ghost in the buy mode: live false, its cards are not clickable)
export function drawBoard(session, at = BOARD_AT, live = true) {
  if (live) { boardCards = []; boardPagers = []; }
  if (at.x < -100) return;
  const x0 = at.x + 3, y0 = at.y + 3, w = 196, h = 58;
  if (!live) { const keep = [boardCards, boardPagers]; drawBoard.ghost = true; try { return drawBoardAt(session, x0, y0, w, h); } finally { drawBoard.ghost = false; boardCards = keep[0]; boardPagers = keep[1]; } }
  drawBoardAt(session, x0, y0, w, h);
}
function drawBoardAt(session, x0, y0, w, h) {
  ART.board.draw(x0 - 3, y0 - 3, { w, h });
  const cw = w / BOARD_COLS.length;
  // a card stays in TO DO until its dev comes to the board and takes it
  const todo = a => { const e = ents.get(a.id); return !!e && !e.picked; };
  BOARD_COLS.forEach(([title, st], i) => {
    const cx = x0 + i * cw;
    let agents = (session?.agents || []).filter(a => st === "todo" ? todo(a)
      : !todo(a) && (a.status === st || (st === "working" && a.status === "asking")));
    if (st === "todo") agents = [...agents, ...hub.backlogCards()];  // my YouTrack tickets not started yet: drop one on a free desk
    text(agents.length ? `${title} · ${agents.length}` : title, cx + cw / 2, y0 + 0.4, "#081746", 4.4, "center");
    const per = agents.length > 5 ? 4 : 5, pages = Math.ceil(agents.length / per) || 1;
    const page = Math.min(boardPage[st] || 0, pages - 1);
    boardPage[st] = page;
    agents.slice(page * per, page * per + per).forEach((a, k) => {
      const yy = y0 + 9 + k * 9.4, x = cx + 3, cardW = cw - 6;
      const kind = a.backlog ? "backlog" : st === "done" ? "done" : st === "blocked" ? "blocked" : a.ticket ? "ticket" : "other";
      const [fill, edge] = STICKY[kind];
      ART.sticky.draw(x, yy, { fill, edge, w: cardW, h: 8 });
      boardCards.push({ x, y: yy, w: cardW, h: 8, agent: a });
      px(x + 0.6, yy + 1.6, 1.2, 5.4, a.backlog ? "#4090d7" : typeColor(a.type));  // who works on it
      const state = data.tickets[a.ticket]?.state;
      if (state) { px(x + cardW - 5.2, yy + 2.6, 2.4, 2.4, "#3a3a48"); px(x + cardW - 4.8, yy + 3, 1.6, 1.6, STATE_COLORS[state] || "#999"); }
      text(clip(a.ticket || a.description, 13), x + 3, yy + 1.6, "#0c2470", 4.4);
      if (st === "done") text("✓", x + cardW - 7, yy + 1.2, "#2f9e44", 4.6, "center");
      else if (st === "blocked") text("!", x + cardW - 7, yy + 1.2, "#d64545", 4.6, "center");
      else if (a.status === "asking") text("?", x + cardW - 7, yy + 1.2, "#b07a00", 4.6, "center");
    });
    if (pages > 1) {
      const yy = y0 + 9 + 4 * 9.4, x = cx + 3, pw = cw - 6;
      boardPagers.push({ st, x, y: yy, w: pw, h: 8, page, pages });
      px(x, yy + 0.5, pw, 7, "#e6ecf7"); px(x, yy + 7, pw, 0.5, "#9fb3d9");
      text("◀", x + 3, yy + 1.4, "#0d2766", 4.4, "center");
      text(`${page + 1}/${pages} · ${agents.length}`, x + pw / 2, yy + 1.4, "#0d2766", 4.2, "center");
      text("▶", x + pw - 3, yy + 1.4, "#0d2766", 4.4, "center");
    }
  });
}

export function drawCabinet(t, hover) {
  const { x, y, w, h } = CAB;
  const stored = Math.max(0, (mmx?.count || 0) - inTransit.entries), pending = Math.max(0, (mmx?.pending.length || 0) - inTransit.pending);
  if (hover) px(x - 2, y - 14, w + 4, h + 16, "#fbaa08");
  SPRITES.cabinet.draw(x - 1, y - 2);
  for (let i = 0; i < 3; i++) {
    const dy = y + 3 + i * 13.5, open = i === 1 && t < drawerUntil ? 3 : 0;
    if (!open) continue;
    px(x + 2, dy, w - 4, 11, "#2a2d38");
    px(x + 2 - open, dy, w - 4 + open, 11, "#8a90a6");
    px(x + 8 - open, dy + 4, 6, 2, "#c9ccd8");
    px(x + 7 - open, dy + 1.5, 8, 2, "#f4f2ea");
    if (open) for (let k = 0; k < 3; k++) px(x - 1 - open + k * 2, dy - 1.5, 1.5, 3, "#fff7b8");
  }
  // inbox tray on top: proposals waiting for approval
  px(x + 2, y - 7, w - 4, 5, "#3a3a48");
  for (let k = 0; k < Math.min(pending, 4); k++) px(x + 4 + k * 0.6, y - 6 - k * 1.2, w - 9, 1.6, k % 2 ? "#fff7b8" : "#f4f2ea");
  text("MMX", x + w / 2, y - 14 - Math.min(pending, 4) * 1.2, "#d5eeff", 4.6, "center");
  text(String(stored), x + w / 2, y + h + 1, "#adadad", 4.2, "center");
  if (pending) { px(x + w - 3, y - 10, 6, 5, "#fbaa08"); text(String(pending), x + w, y - 10.4, "#1c1c24", 3.6, "center"); }
}

export function drawPerson(x, y, look, opts = {}) {
  const hat = look === hub.CHIEF_LOOK ? hub.chiefHat() : look.team ? hub.shop.hat : "";
  const o = { frame: (opts.frame || 0) % 2, back: !!opts.back, seated: !!opts.seated, arms: opts.arms || "down", tux: !!opts.tux, smile: !!opts.smile, hat };
  // the isometric view: in volume, turned toward where they go or look (opts.dir: a 2D direction; else facing us, or
  // the wall when seen from behind), a quarter turn at a time (svg/iso.js IsoAvatar)
  if (isoDrawing() && !opts.flat) {  // (flat: a portrait on the wall stays a picture)
    const d = opts.dir;
    let rot = o.back ? 2 : 0;
    if (d && (d[0] || d[1])) rot = Math.abs(d[0]) > Math.abs(d[1]) ? (d[0] > 0 ? 1 : 3) : (d[1] > 0 ? 0 : 2);
    if (!ART.isoavatar.draw(x, y, { look: lookTraits(look), rot, frame: o.frame, seated: o.seated, arms: o.arms, tux: o.tux, smile: o.smile, hat: o.hat })) return drawPersonPx(x, y, look, opts);
    if (o.arms === "baton") {  // the baton in the raised hand
      const [hx, hy] = [[4.9, 0], [0, -4.9], [-4.9, 0], [0, 4.9]][rot], top = (o.seated ? 4 : 8) + 16 + (o.frame ? 2 : 0), hp = { x: x + (hx - hy) * 0.6, y: y + (hx + hy) * 0.3 - top };
      raw.drawn = true; ctx.strokeStyle = "#f4f2ea"; ctx.lineWidth = Math.max(1, S * 0.6); ctx.beginPath();
      ctx.moveTo(hp.x * S, hp.y * S); ctx.lineTo((hp.x + 4) * S, (hp.y - 5) * S); ctx.stroke();
    }
    return;
  }
  if (!ART.person.draw(x, y, { look: lookTraits(look), ...o })) return drawPersonPx(x, y, look, opts);  // svg/figures.js
  if (o.arms === "baton") {
    const lift = o.frame ? -3 : 0, ty = y - 12;
    ctx.strokeStyle = "#f4f2ea"; ctx.lineWidth = Math.max(1, S * 0.6); ctx.beginPath();
    ctx.moveTo((x + 5.5) * S, (ty - 3 + lift) * S); ctx.lineTo((x + 11) * S, (ty - 9 + lift * 0.5) * S); ctx.stroke();
  }
}

function drawPersonPx(x, y, look, opts = {}) {
  const { frame = 0, back = false, seated = false, arms = "down", tux = false } = opts;
  const shirt = tux ? "#1c1c24" : look.shirt;
  const legOff = seated ? 0 : (frame % 2 ? 1 : -1);
  if (!seated) {
    px(x - 3, y - 5, 2, 5 + Math.min(0, legOff), "#2f3550"); px(x + 1, y - 5, 2, 5 - Math.max(0, legOff), "#2f3550");
    px(x - 3, y - 1 + Math.min(0, legOff), 2, 1, "#1a1a1a"); px(x + 1, y - 1 - Math.max(0, legOff), 2, 1, "#1a1a1a");
  }
  const ty = y - 12;
  px(x - 4, ty, 8, 7, shirt);
  if (tux) { px(x - 1, ty, 2, 4, "#f4f2ea"); px(x - 2, ty, 4, 1.5, "#d64545"); }
  if (arms === "up") { px(x - 6, ty - 5, 2, 6, shirt); px(x + 4, ty - 5, 2, 6, shirt); px(x - 6, ty - 6, 2, 1.5, look.skin); px(x + 4, ty - 6, 2, 1.5, look.skin); }
  else if (arms === "type") {
    const a = frame % 2;
    px(x - 6, ty + 1, 2, 4, shirt); px(x + 4, ty + 1, 2, 4, shirt);
    px(x - 6, ty - 1 + a, 2, 2, look.skin); px(x + 4, ty - a, 2, 2, look.skin);
  } else if (arms === "baton") {
    px(x - 6, ty + 1, 2, 5, shirt); px(x - 6, ty + 6, 2, 1.5, look.skin);
    const lift = frame % 2 ? -3 : 0;
    px(x + 4, ty - 2 + lift, 2, 6, shirt); px(x + 4, ty - 3 + lift, 2, 1.5, look.skin);
    ctx.strokeStyle = "#f4f2ea"; ctx.lineWidth = Math.max(1, S * 0.6); ctx.beginPath();
    ctx.moveTo((x + 5.5) * S, (ty - 3 + lift) * S); ctx.lineTo((x + 11) * S, (ty - 9 + lift * 0.5) * S); ctx.stroke();
  } else { px(x - 6, ty + 1, 2, 6, shirt); px(x + 4, ty + 1, 2, 6, shirt); px(x - 6, ty + 7, 2, 1.5, look.skin); px(x + 4, ty + 7, 2, 1.5, look.skin); }
  const hy = ty - 7;
  if (back) { px(x - 3, hy, 6, 7, look.hair); }
  else {
    px(x - 3, hy, 6, 7, look.skin); px(x - 3, hy, 6, 2, look.hair); px(x - 3, hy, 1, 4, look.hair);
    px(x - 2, hy + 3.5, 1, 1, "#1a1a1a"); px(x + 1, hy + 3.5, 1, 1, "#1a1a1a");
    if (opts.smile) px(x - 1, hy + 5.5, 2, 0.8, "#7a2b2b");
  }
}

// the desk bought for this spot, in its style (build.js); none: the dev works on a cardboard box
export function drawDesk(d, ent, t) {
  const st = hub.deskStyle(DESKS.indexOf(d));
  if (!st) return hub.drawNoDesk(d, ent, t);
  const wood = st.wood || hub.decor.office.wood;
  drawDeskScreen(d, ent, t);
  hub.monitorSprite(st.screen).draw(d.x - 10, d.y - 14);
  hub.woodSprite("desk", wood).draw(d.x - 18, d.y - 3);
  if (st.rgb) for (let i = 0; i < 12; i++) px(d.x - 17 + i * 2.8, d.y + 15.2, 2.8, 0.8, `hsl(${(i * 30 + t / 8) % 360} 90% 60%)`);  // gamer LED strip
}
// the screen of a desk's computer (16 × 10 at d.x - 8, d.y - 12): the dev's work, red on a failure, ✓ when delivered
export function drawDeskScreen(d, ent, t) {
  const col = ent ? typeColor(ent.agent.type) : "#555";
  if (ent && ent.seated) {
    const st = ent.agent.status;
    const red = ent.fxKind === "fail" && t < ent.fxUntil;
    const scr = red ? (Math.floor(t / 150) % 2 ? "#a3263a" : "#5a1f2a") : st === "blocked" ? "#5a1f2a" : st === "done" ? "#1f4a33" : "#13233a";
    px(d.x - 8, d.y - 12, 16, 10, scr);
    if (red) text("✗", d.x, d.y - 12.5, "#ffd0d6", 9, "center");
    else if (st === "working") for (let l = 0; l < 4; l++) {
      const w = 3 + ((hash(ent.agent.id) + l * 7 + Math.floor(t / 300)) % 10);
      px(d.x - 7 + (l % 2) * 2, d.y - 11 + l * 2.2, w, 1, col);
    } else if (st === "done") text("✓", d.x, d.y - 12.5, "#51cf66", 9, "center");
    else if (st === "blocked") text("!", d.x, d.y - 12.5, "#ff6b6b", 9, "center");
  } else px(d.x - 8, d.y - 12, 16, 10, "#222230");
}

// how much higher a bubble or a mood goes over someone's head: the people in volume are taller (iso/engine.js)
export const headroom = (k = 9) => isoDrawing() ? k : 0;
export function bubble(x, y, msg, color = "#f4f2ea", fg = "#1c1c24") {
  if (!msg) return;
  font(4.6);
  const w = Math.min(ctx.measureText(msg).width / S + 4, 132);
  const bx = Math.max(2, Math.min(W - w - 2, x - w / 2));
  px(bx, y - 9, w, 8, color); px(bx - 0.6, y - 8.4, w + 1.2, 6.8, color);
  px(x - 1, y - 1, 2, 1.5, color);
  ctx.save(); ctx.beginPath(); ctx.rect(bx * S, (y - 9) * S, (w - 1) * S, 8 * S); ctx.clip();
  text(msg, bx + 2, y - 8.7, fg, 4.6); ctx.restore();
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get BOARD_AT() { return BOARD_AT; }, get drawBoard() { return drawBoard; } });
