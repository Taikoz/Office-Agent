"use strict";
// Office room, desks, board and people drawing.

/* ---------- scene ---------- */
// the floor (decor.js: parquet, tiles, carpet… and a rug under each row of desks), drawn once per scale and setting
const FLOOR_Y = 70;
function floorCanvas(room = "office") {
  const rows = [...new Set(DESKS.map(d => d.y))], x0 = Math.min(...DESKS.map(d => d.x)) - 30, x1 = Math.max(...DESKS.map(d => d.x)) + 30;
  return roomFloorCanvas(room, H - FLOOR_Y, rows.map(dy => [x0, dy - 4 - FLOOR_Y, x1 - x0, 36]));
}

function drawRoom(t, room = "office") {
  const mine = room === "office";
  drawWall(room);
  const wc = decor[room].wallColor;
  if (decor[room].wall !== "boiserie") { px(0, 44, W, 0.8, shade(wc, 0.87)); px(0, 44.8, W, 0.5, shade(wc, 1.35)); }  // chair rail on the wall
  ctx.drawImage(floorCanvas(room), 0, Math.round(FLOOR_Y * S));
  px(0, 66.5, W, 3.5, "#2a1f18"); px(0, 66.5, W, 0.6, "#4a3828"); px(0, 69.4, W, 0.6, "#1a130e");  // baseboard
  // window: sky following the real hour and the weather of today's tests (art.js drawSky)
  drawSky(234, 12, t);
  drawWindow(room, 228, 4); art("windowglints", 228, 4, 58, 41, WINDOW_GLINTS, { outline: false });
  if (mine) { drawShelf(t); drawEmployee(t); }
  // door
  sprite(doorSprite(room), 352, 20);
  px(353, 10, 28, 8, "#f7f7f7"); text(mine ? `☕ REPOS ${loungers.size}` : "← MON BUREAU", 367, 10.6, "#081746", 4, "center");
  // plants
  sprite("plant", 298, 52);
  if (mine) drawTeamPlant(t);
  // espresso machine: brews while a dev or the chief takes a coffee
  const brewing = mine && ([...ents.values()].some(e => e.pose === "coffee") || (chief.at === "coffee" && !chief.path.length && chief.coffeeUntil > 0));
  const frame = brewing ? Math.floor(t / 600) % 4 : 0;
  art(`coffeemachine:${brewing}:${frame}`, 316, 44, 18, 22, () => coffeeMachineArt(frame, brewing));
  if (mine) sprite("sign", 314, 26);
  if (!focusMode) drawSeason(t);
}

let boardCards = [];  // card rectangles of the last frame, for dragging a ticket onto a free desk
// a column with more than 5 cards shows 4 per page and a ◀ page/pages ▶ strip in the 5th slot (click or mouse wheel)
const boardPage = {};
let boardPagers = [];
function flipBoard(st, dir) {
  const pg = boardPagers.find(b => b.st === st);
  if (pg) boardPage[st] = ((boardPage[st] || 0) + dir + pg.pages) % pg.pages;
}
function hitBoardPager(x, y) {
  const b = boardPagers.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  return b ? `boardpg:${b.st}:${x < b.x + b.w / 2 ? -1 : 1}` : null;
}
function drawBoard(session) {
  const x0 = 10, y0 = 4, w = 196, h = 58;
  boardCards = []; boardPagers = [];
  art(`board:${w}x${h}`, x0 - 3, y0 - 3, w + 8, h + 9, () => boardArt(w, h));
  const cw = w / BOARD_COLS.length;
  // a card stays in TO DO until its dev comes to the board and takes it
  const todo = a => { const e = ents.get(a.id); return !!e && !e.picked; };
  BOARD_COLS.forEach(([title, st], i) => {
    const cx = x0 + i * cw;
    let agents = (session?.agents || []).filter(a => st === "todo" ? todo(a)
      : !todo(a) && (a.status === st || (st === "working" && a.status === "asking")));
    if (st === "todo") agents = [...agents, ...backlogCards()];  // my YouTrack tickets not started yet: drop one on a free desk
    text(agents.length ? `${title} · ${agents.length}` : title, cx + cw / 2, y0 + 0.4, "#081746", 4.4, "center");
    const per = agents.length > 5 ? 4 : 5, pages = Math.ceil(agents.length / per) || 1;
    const page = Math.min(boardPage[st] || 0, pages - 1);
    boardPage[st] = page;
    agents.slice(page * per, page * per + per).forEach((a, k) => {
      const yy = y0 + 9 + k * 9.4, x = cx + 3, cardW = cw - 6;
      const kind = a.backlog ? "backlog" : st === "done" ? "done" : st === "blocked" ? "blocked" : a.ticket ? "ticket" : "other";
      const [fill, edge] = STICKY[kind];
      art(`sticky:${kind}:${cardW}`, x, yy, cardW, 8, () => stickyArt(fill, edge, cardW, 8), { outline: false });
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

function drawCabinet(t, hover) {
  const { x, y, w, h } = CAB;
  const stored = Math.max(0, (mmx?.count || 0) - inTransit.entries), pending = Math.max(0, (mmx?.pending.length || 0) - inTransit.pending);
  if (hover) px(x - 2, y - 14, w + 4, h + 16, "#fbaa08");
  sprite("cabinet", x - 1, y - 2);
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

// people as SVG sprites (outlined, shaded, 5 hair styles, glasses), one image per look + pose, cached per scale
const personImgs = new Map();
function shade(hex, k) {
  const n = parseInt(hex.slice(1, 7), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
const R = (x, y, w, h, c, more = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${more}/>`;
function personSvg(look, o) {
  const { frame = 0, back = false, seated = false, arms = "down", tux = false, smile = false, hat = "" } = o;
  const shirt = tux ? "#1c1c24" : look.shirt, sh = shade(shirt, 0.72), skin = look.skin, skd = shade(skin, 0.84), hair = look.hair, hl = shade(hair, 1.45);
  const ty = -12, hy = -19, st = look.style || 0;
  let g = "", out = "";
  if (!seated) {
    const lo = frame % 2 ? 1 : -1;
    out += `<ellipse cx="0" cy="0" rx="4.5" ry="0.9" fill="#000" fill-opacity=".28"/>`;
    g += R(-3, -5, 2, 5 + Math.min(0, lo), "#2f3550") + R(1, -5, 2, 5 - Math.max(0, lo), "#2f3550") + R(-1.6, -5, 0.6, 3, "#232840") + R(2.4, -5, 0.6, 3, "#232840");
    g += R(-3.6, -1 + Math.min(0, lo), 2.6, 1.1, "#17141c") + R(1, -1 - Math.max(0, lo), 2.6, 1.1, "#17141c");
  }
  // torso
  g += R(-4, ty, 8, 7, shirt) + R(2.8, ty, 1.2, 7, sh) + R(-4, ty + 6.2, 8, 0.8, sh);
  if (tux && !back) g += R(-1, ty, 2, 4.5, "#f4f2ea") + R(-0.3, ty + 2.2, 0.6, 0.6, "#1c1c24") + R(-0.3, ty + 3.6, 0.6, 0.6, "#1c1c24") + R(-2.2, ty, 4.4, 1.5, "#d64545") + R(-0.5, ty, 1, 1.5, "#a83232");
  else if (!back) g += R(-1, ty, 2, 1.2, skd) + R(-2.2, ty, 1.2, 1.4, shade(shirt, 1.25)) + R(1, ty, 1.2, 1.4, shade(shirt, 1.25));
  // arms
  const arm = (x, y, h, hy2) => R(x, y, 2, h, shirt) + R(x + (x < 0 ? 0 : 1.4), y, 0.6, h, sh) + R(x, hy2, 2, 1.6, skin);
  if (arms === "up") g += arm(-6, ty - 5, 6, ty - 6.4) + arm(4, ty - 5, 6, ty - 6.4);
  else if (arms === "type") { const a = frame % 2; g += arm(-6, ty + 1, 4, ty - 1 + a) + arm(4, ty + 1, 4, ty - a); }
  else if (arms === "baton") { const lift = frame % 2 ? -3 : 0; g += arm(-6, ty + 1, 5, ty + 6) + arm(4, ty - 2 + lift, 6, ty - 3.4 + lift); }
  else g += arm(-6, ty + 1, 6, ty + 7) + arm(4, ty + 1, 6, ty + 7);
  // head
  if (back) {
    g += R(-3.6, hy + 3, 0.7, 1.6, skd) + R(2.9, hy + 3, 0.7, 1.6, skd) + R(-1.5, hy + 6.2, 3, 0.9, skd);
    g += R(-3.2, hy - 0.6, 6.4, 6.9, hair) + R(-2, hy - 0.4, 2.4, 0.6, hl);
    if (st === 2) g += R(-3.4, hy + 4, 6.8, 4.4, hair);
  } else {
    g += R(-3, hy, 6, 7, skin) + R(-3, hy + 6, 6, 1, skd) + R(-3.6, hy + 3, 0.7, 1.6, skd) + R(2.9, hy + 3, 0.7, 1.6, skd);
    g += R(-2, hy + 3.4, 1, 1.2, "#1a1a1a") + R(1, hy + 3.4, 1, 1.2, "#1a1a1a") + R(-1.7, hy + 3.5, 0.4, 0.4, "#fff") + R(1.3, hy + 3.5, 0.4, 0.4, "#fff");
    g += R(-2.7, hy + 5, 1, 0.6, "#e88a8a", ' fill-opacity=".55"') + R(1.7, hy + 5, 1, 0.6, "#e88a8a", ' fill-opacity=".55"');
    g += smile ? R(-1, hy + 5.7, 2, 0.6, "#7a2b2b") + R(-1.4, hy + 5.2, 0.5, 0.5, "#7a2b2b") + R(0.9, hy + 5.2, 0.5, 0.5, "#7a2b2b") : R(-0.6, hy + 5.8, 1.2, 0.5, "#8a4a4a");
    if (look.glasses) g += `<path fill="none" stroke="#1c1c24" stroke-width=".45" d="M-2.6 ${hy + 3}h2v1.8h-2zM0.6 ${hy + 3}h2v1.8h-2zM-0.6 ${hy + 3.6}h1.2"/>`;
    g += R(-3.4, hy - 0.6, 6.8, 2.4, hair) + R(-2, hy - 0.4, 2.4, 0.6, hl);
    if (st === 2) g += R(-3.6, hy + 1.8, 1.2, 6.6, hair) + R(2.4, hy + 1.8, 1.2, 6.6, hair);
    else if (st === 4) g += R(-3.4, hy + 1.8, 3.6, 1, hair) + R(-3.4, hy + 1.8, 0.8, 1.6, hair);
    else g += R(-3.4, hy + 1.8, 0.9, 2, hair) + R(2.5, hy + 1.8, 0.9, 2, hair);
  }
  if (st === 1) g += R(-3, hy - 1.6, 1.2, 1.1, hair) + R(-0.6, hy - 2.1, 1.2, 1.6, hair) + R(1.8, hy - 1.6, 1.2, 1.1, hair);
  if (st === 3) g += R(-1.4, hy - 2.7, 2.8, 2.2, hair) + R(-0.8, hy - 2.5, 1, 0.5, hl);
  if (hat === "cap") g += R(-3.6, hy - 1.8, 7.2, 2.6, "#081746") + R(-0.6, hy - 1.4, 1.2, 1.2, "#fbaa08") + (back ? "" : R(-0.5, hy + 0.4, 5.4, 1, "#081746"));
  else if (hat === "beanie") g += R(-3.7, hy - 2.2, 7.4, 3, "#ff6b6b") + R(-3.7, hy + 0.3, 7.4, 1, "#c92a2a") + R(-0.8, hy - 3.4, 1.6, 1.4, "#f7f7f7");
  else if (hat === "party") g += `<path fill="#b48cff" d="M-2.6 ${hy}L0 ${hy - 5}L2.6 ${hy}Z"/>` + R(-1, hy - 2, 0.8, 0.8, "#fbaa08") + R(0.5, hy - 1, 0.8, 0.8, "#51cf66") + R(-0.6, hy - 5.8, 1.2, 1.2, "#fbaa08");
  else if (hat === "crown") g += `<path fill="#fbaa08" d="M-3 ${hy + 0.5}V${hy - 2.5}L-1.5 ${hy - 1}L0 ${hy - 3.2}L1.5 ${hy - 1}L3 ${hy - 2.5}V${hy + 0.5}Z"/>` + R(-0.5, hy - 0.8, 1, 1, "#ff6b6b");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-9 -25 18 26" width="${Math.round(18 * S)}" height="${Math.round(26 * S)}" shape-rendering="crispEdges">
    <defs><filter id="o" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="0.45" result="d"/>
    <feFlood flood-color="#120f1a"/><feComposite in2="d" operator="in" result="ol"/><feMerge><feMergeNode in="ol"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${out}<g filter="url(#o)">${g}</g></svg>`;
}

function drawPerson(x, y, look, opts = {}) {
  const hat = look === CHIEF_LOOK ? (shop.crown && shop.owned.includes("crown") ? "crown" : "") : look.team ? shop.hat : "";
  const o = { frame: (opts.frame || 0) % 2, back: !!opts.back, seated: !!opts.seated, arms: opts.arms || "down", tux: !!opts.tux, smile: !!opts.smile, hat };
  const key = `${look.skin}${look.hair}${look.shirt}${look.style}${look.glasses}|${o.frame}${o.back}${o.seated}${o.arms}${o.tux}${o.smile}${hat}@${S}`;
  let img = personImgs.get(key);
  if (!img) {
    if (personImgs.size > 600) personImgs.clear();
    img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(personSvg(look, o)); personImgs.set(key, img);
  }
  if (!(img.complete && img.naturalWidth)) return drawPersonPx(x, y, look, opts);
  ctx.drawImage(img, Math.round((x - 9) * S), Math.round((y - 25) * S), Math.round(18 * S), Math.round(26 * S));
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
function drawDesk(d, ent, t) {
  const st = deskStyle(DESKS.indexOf(d));
  if (!st) return drawNoDesk(d, ent, t);
  const wood = st.wood || decor.office.wood;
  const col = ent ? typeColor(ent.agent.type) : "#555";
  const on = ent && ent.seated;
  if (on) {
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
  sprite(monitorSprite(st.screen), d.x - 10, d.y - 14);
  sprite(woodSprite("desk", wood), d.x - 18, d.y - 3);
  if (st.rgb) for (let i = 0; i < 12; i++) px(d.x - 17 + i * 2.8, d.y + 15.2, 2.8, 0.8, `hsl(${(i * 30 + t / 8) % 360} 90% 60%)`);  // gamer LED strip
}

function bubble(x, y, msg, color = "#f4f2ea", fg = "#1c1c24") {
  if (!msg) return;
  font(4.6);
  const w = Math.min(ctx.measureText(msg).width / S + 4, 132);
  const bx = Math.max(2, Math.min(W - w - 2, x - w / 2));
  px(bx, y - 9, w, 8, color); px(bx - 0.6, y - 8.4, w + 1.2, 6.8, color);
  px(x - 1, y - 1, 2, 1.5, color);
  ctx.save(); ctx.beginPath(); ctx.rect(bx * S, (y - 9) * S, (w - 1) * S, 8 * S); ctx.clip();
  text(msg, bx + 2, y - 8.7, fg, 4.6); ctx.restore();
}
