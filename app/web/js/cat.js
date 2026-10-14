"use strict";
// Brume, the office cat.

/* ---------- office cat ---------- */
// wanders between the desks, naps on a free or idle desk, jumps for joy on deliveries, meows when clicked
const CAT_ROWS = [LANE, 150, 212], CAT_AISLES = [18, 106, 194, 282];
const cat = { x: 300, y: LANE, dir: -1, path: [], mode: "sit", until: 4000, desk: null, jump: 0, say: "", sayUntil: 0 };

function catPath(tx, ty) {
  const path = [];
  let { x, y } = cat;
  if (y < LANE) { path.push({ x, y: LANE }); y = LANE; }           // coming back from the coffee machine
  const row = ty < LANE ? LANE : ty;
  if (row !== y) {
    const ax = CAT_AISLES.reduce((b, a) => Math.abs(a - x) + Math.abs(a - tx) < Math.abs(b - x) + Math.abs(b - tx) ? a : b);
    path.push({ x: ax, y }, { x: ax, y: row });
  }
  path.push({ x: tx, y: row });
  if (ty < LANE) path.push({ x: tx, y: ty });
  return path;
}

function catNext(t) {
  // a dev blocked or turning in circles gets a visit: Brume sits by their chair for a while
  const sad = [...ents.values()].find(e => e.seated && !e.leaving && (e.agent.status === "blocked" || isStuck(e.agent)) && t > (e.comfortedUntil || 0));
  if (sad && Math.random() < 0.7) {
    sad.comfortedUntil = t + 120000;
    cat.path = catPath(sad.desk.x + 14, sad.desk.y + 28); cat.next = { mode: "comfort", who: sad.who };
    cat.mode = "walk"; return;
  }
  const busy = new Map([...ents.values()].filter(e => !e.leaving).map(e => [e.desk, e]));
  const naps = DESKS.filter(d => { const e = busy.get(d); return !e || (e.seated && (e.agent.status === "done" || e.agent.idle > 45)); });
  const r = Math.random();
  if (r < 0.35 && naps.length) {
    const d = naps[Math.floor(Math.random() * naps.length)];
    cat.path = catPath(d.x - 10, d.y + 28); cat.next = { mode: "sleep", desk: d };
  } else if (r < 0.5) {
    cat.path = catPath(COFFEE.x - 18, COFFEE.y); cat.next = { mode: "sit" };
  } else {
    cat.path = catPath(20 + Math.random() * 330, CAT_ROWS[Math.floor(Math.random() * CAT_ROWS.length)]); cat.next = { mode: "sit" };
  }
  cat.mode = "walk";
}

function stepCat(dt, t) {
  if (focusMode) return;
  // the security alarm scares her: she runs under the MMX cabinet until it stops
  if (alarm && cat.mode !== "hide" && cat.next?.mode !== "hide") {
    if (cat.mode === "sleep") { cat.y = cat.desk.y + 28; cat.desk = null; }
    cat.path = catPath(CAB.x + CAB.w / 2, CAT_ROWS[CAT_ROWS.length - 1]); cat.next = { mode: "hide" }; cat.mode = "walk";
    cat.say = "🙀"; cat.sayUntil = t + 1500;
  }
  if (stepLaser(dt, t)) return;
  if (cat.mode === "sleep") {
    const e = [...ents.values()].find(x => x.desk === cat.desk && !x.leaving);
    if (e?.seated && e.agent.status === "working" && e.agent.idle < 20) cat.until = 0;  // the dev is back at work: off the keyboard
  }
  if (cat.mode !== "walk") {
    if (t < cat.until) return;
    if (cat.mode === "sleep") { cat.y = cat.desk.y + 28; cat.desk = null; }
    return catNext(t);
  }
  const tgt = cat.path[0], dx = tgt.x - cat.x, dy = tgt.y - cat.y, dist = Math.hypot(dx, dy), sp = 0.035 * dt;
  if (dx) cat.dir = Math.sign(dx);
  if (dist > sp) { cat.x += dx / dist * sp; cat.y += dy / dist * sp; return; }
  cat.x = tgt.x; cat.y = tgt.y; cat.path.shift();
  if (cat.path.length) return;
  const n = cat.next || { mode: "sit" };
  cat.mode = n.mode; cat.comfort = n.mode === "comfort" ? n.who : null;
  if (n.mode === "sleep") { cat.desk = n.desk; cat.y = n.desk.y; cat.until = t + 20000 + Math.random() * 25000; }
  else cat.until = t + (n.mode === "comfort" ? 15000 : n.mode === "hide" ? 20000 : 3000 + Math.random() * 5000);
}

function catCheer() {
  const t = performance.now();
  cat.jump = t + 1300; cat.say = "♥"; cat.sayUntil = t + 1500;
  if (cat.mode === "sleep") cat.until = t + 1300;
}

function petCat() {
  const t = performance.now();
  sfx("meow"); cat.say = "Miaou !"; cat.sayUntil = t + 1800; crew.pets = (crew.pets || 0) + 1;
  for (const e of ents.values()) if (e.who && !e.leaving && !e.queued) crewAdd(e.who, { moral: 2 });
  burst(cat.x, cat.y - 8, ["#ff6b6b", "#e98fc4"], 5, 0.4);
  if (cat.mode === "sleep") cat.until = t + 1800;
}

// Brume as SVG sprites (same outline as the team): grey tabby, green eyes; one image per pose, frame, direction and scale
const CAT_C = { fur: "#a3a3ad", furD: "#8a8a96", stripe: "#6e6e7a", belly: "#d4d4dc", ear: "#e8a0b0", eye: "#8bd36b", pupil: "#1c1c24", nose: "#e88a9a" };
function catSvg(pose, frame) {
  const c = CAT_C;
  const ear = (x, y = -10.2) => `<path fill="${c.fur}" d="M${x} ${y}L${x + 0.9} ${y - 2.4}L${x + 1.9} ${y}Z"/><path fill="${c.ear}" d="M${x + 0.5} ${y - 0.2}L${x + 0.9} ${y - 1.4}L${x + 1.4} ${y - 0.2}Z"/>`;
  const whiskers = (x, y) => `<path stroke="#f2f2f6" stroke-width=".22" fill="none" d="M${x} ${y}l2 -0.5M${x} ${y + 0.5}l2.1 0.2M${x - 2.6} ${y}l-1.8 -0.5M${x - 2.6} ${y + 0.5}l-1.9 0.2"/>`;
  let g = "", out = `<ellipse cx="0" cy="0" rx="${pose === "sleep" ? 6 : 5.5}" ry="0.8" fill="#000" fill-opacity=".25"/>`;
  if (pose === "walk") {
    const f = frame % 2, tail = f ? "M-4.6 -5.6C-7 -6 -7.6 -8.6 -6.6 -10.6" : "M-4.6 -5.6C-7.4 -5.4 -8.4 -7.6 -8 -9.8";
    g += `<path fill="none" stroke="${c.fur}" stroke-width="1.5" stroke-linecap="round" d="${tail}"/>`;
    // legs: diagonal pairs swap at each frame
    const legs = f ? [[-4.3, 0], [-2.6, -0.6], [1.6, -0.6], [3.2, 0]] : [[-4.3, -0.6], [-2.6, 0], [1.6, 0], [3.2, -0.6]];
    for (const [x, lift] of legs) g += `<rect x="${x}" y="${-3.2 + lift}" width="1.2" height="${3.2}" fill="${x < 0 ? c.furD : c.fur}"/><rect x="${x - 0.1}" y="${-0.7 + lift}" width="1.5" height="0.7" fill="${c.belly}"/>`;
    g += `<rect x="-5.2" y="-6.6" width="9.6" height="4" rx="1.7" fill="${c.fur}"/><rect x="-4" y="-3.4" width="7" height="0.9" rx="0.4" fill="${c.belly}"/>`;
    g += `<path fill="${c.stripe}" d="M-3.4 -6.6h0.8v1.7h-0.8zM-1.5 -6.6h0.8v1.9h-0.8zM0.4 -6.6h0.8v1.7h-0.8z"/>`;
    g += ear(3.2) + ear(5.9);
    g += `<rect x="2.8" y="-10.4" width="5.6" height="4.8" rx="1.6" fill="${c.fur}"/><rect x="3.4" y="-7.4" width="4.6" height="1.7" rx="0.8" fill="${c.belly}"/>`;
    g += `<path fill="${c.stripe}" d="M4.6 -10.4h0.6v1h-0.6zM5.8 -10.4h0.6v1.2h-0.6z"/>`;
    g += `<rect x="4" y="-8.9" width="1" height="1.2" fill="${c.eye}"/><rect x="4.4" y="-8.8" width="0.4" height="1" fill="${c.pupil}"/>`;
    g += `<rect x="6.6" y="-8.9" width="1" height="1.2" fill="${c.eye}"/><rect x="7" y="-8.8" width="0.4" height="1" fill="${c.pupil}"/>`;
    g += `<rect x="5.6" y="-7.4" width="0.8" height="0.5" fill="${c.nose}"/>` + whiskers(8.4, -7);
  } else if (pose === "sleep") {
    g += `<path fill="none" stroke="${c.fur}" stroke-width="1.5" stroke-linecap="round" d="M-5 -1.4C-4.6 0.4 2 0.6 4.4 -0.6"/>`;
    g += `<ellipse cx="-0.5" cy="-2.7" rx="5.4" ry="2.8" fill="${c.fur}"/><ellipse cx="-0.8" cy="-1.4" rx="3.6" ry="0.9" fill="${c.belly}"/>`;
    g += `<path fill="${c.stripe}" d="M-3.4 -5.3h0.8v1.6h-0.8zM-1.4 -5.5h0.8v1.8h-0.8zM0.6 -5.3h0.8v1.6h-0.8z"/>`;
    g += `<path fill="${c.fur}" d="M2.2 -4.6L2.8 -6.6L3.8 -4.8ZM4.4 -4.8L5.4 -6.6L5.8 -4.4Z"/><path fill="${c.ear}" d="M2.7 -4.9L2.9 -5.9L3.4 -4.9Z"/>`;
    g += `<rect x="1.8" y="-5" width="4.6" height="3.8" rx="1.6" fill="${c.fur}"/><rect x="2.4" y="-2.6" width="3.6" height="1.2" rx="0.6" fill="${c.belly}"/>`;
    g += `<path fill="none" stroke="${c.pupil}" stroke-width=".4" d="M2.7 -3.4h1M4.6 -3.4h1"/><rect x="3.9" y="-2.5" width="0.7" height="0.4" fill="${c.nose}"/>`;
  } else {  // sitting, facing the viewer slightly turned, tail sweeping the floor
    const wag = frame % 2 ? "M-2.6 -0.8C-5.4 -0.6 -6.8 -1.8 -6.4 -4.2" : "M-2.6 -0.8C-5.6 -1 -6.2 -2.8 -5 -4.8";
    g += `<path fill="none" stroke="${c.fur}" stroke-width="1.5" stroke-linecap="round" d="${wag}"/>`;
    g += `<rect x="-3.2" y="-7.6" width="6.4" height="7.6" rx="2.6" fill="${c.fur}"/><rect x="-1.6" y="-6.8" width="3.2" height="4.6" rx="1.4" fill="${c.belly}"/>`;
    g += `<path fill="${c.stripe}" d="M-3.2 -5.6h1v0.7h-1zM-3.2 -4h1.1v0.7h-1.1zM2.2 -5.6h1v0.7h-1zM2.1 -4h1.1v0.7h-1.1z"/>`;
    g += `<rect x="-1.5" y="-2.2" width="1.3" height="2.2" fill="${c.fur}"/><rect x="0.2" y="-2.2" width="1.3" height="2.2" fill="${c.fur}"/>`;
    g += `<rect x="-1.6" y="-0.7" width="1.5" height="0.7" fill="${c.belly}"/><rect x="0.1" y="-0.7" width="1.5" height="0.7" fill="${c.belly}"/>`;
    g += ear(-3, -11.8) + ear(1.1, -11.8);
    g += `<rect x="-3.1" y="-12.2" width="6.2" height="5" rx="1.8" fill="${c.fur}"/><rect x="-1.8" y="-9" width="3.6" height="1.6" rx="0.8" fill="${c.belly}"/>`;
    g += `<path fill="${c.stripe}" d="M-1.3 -12.2h0.6v1.1h-0.6zM0 -12.2h0.6v1.3h-0.6zM1.2 -12.2h0.6v1.1h-0.6z"/>`;
    const blink = frame === 2;  // eyes closed now and then
    g += blink ? `<path fill="none" stroke="${c.pupil}" stroke-width=".4" d="M-2.2 -10h1.2M1 -10h1.2"/>`
      : `<rect x="-2.2" y="-10.6" width="1.2" height="1.3" fill="${c.eye}"/><rect x="-1.8" y="-10.5" width="0.45" height="1.1" fill="${c.pupil}"/>`
      + `<rect x="1" y="-10.6" width="1.2" height="1.3" fill="${c.eye}"/><rect x="1.4" y="-10.5" width="0.45" height="1.1" fill="${c.pupil}"/>`;
    g += `<rect x="-0.4" y="-9.1" width="0.8" height="0.5" fill="${c.nose}"/>` + whiskers(2.6, -8.8);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11 -15 22 16" width="${Math.round(22 * S)}" height="${Math.round(16 * S)}" shape-rendering="crispEdges">
    <defs><filter id="o" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="0.4" result="d"/>
    <feFlood flood-color="#120f1a"/><feComposite in2="d" operator="in" result="ol"/><feMerge><feMergeNode in="ol"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${out}<g filter="url(#o)">${g}</g></svg>`;
}
const catImgs = new Map();
function drawCatSprite(x, y, pose, frame, dir) {
  const key = `${pose}${frame}@${S}`;
  let img = catImgs.get(key);
  if (!img) {
    if (catImgs.size > 60) catImgs.clear();
    img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(catSvg(pose, frame)); catImgs.set(key, img);
  }
  if (!(img.complete && img.naturalWidth)) return false;
  ctx.save();
  ctx.translate(Math.round(x * S), 0); if (dir < 0) ctx.scale(-1, 1);  // the sprites face right: mirror for the left
  ctx.drawImage(img, Math.round(-11 * S), Math.round((y - 15) * S), Math.round(22 * S), Math.round(16 * S));
  ctx.restore();
  return true;
}

function drawCat(t) {
  if (focusMode) return;
  const { x, dir, mode } = cat;
  const y = cat.y - (t < cat.jump ? Math.abs(Math.sin((cat.jump - t) / 1300 * Math.PI * 3)) * 5 : 0);
  const moving = mode === "walk" || mode === "chase";
  const pose = mode === "sleep" ? "sleep" : moving ? "walk" : "sit";
  const frame = moving ? Math.floor(t / (mode === "chase" ? 90 : 140)) % 2 : pose === "sit" ? (Math.floor(t / 180) % 23 === 0 ? 2 : Math.sin(t / 300) > 0 ? 1 : 0) : 0;  // 2 = blink
  if (!drawCatSprite(x, y, pose, frame, dir)) drawCatPx(t, x, y);
  if (mode === "sleep") {  // z z z
    const k = (t / 1400) % 1;
    ctx.globalAlpha = 1 - k; text("z", x + 5 + k * 3, y - 8 - k * 6, "#d5eeff", 4); ctx.globalAlpha = 1;
  }
  const head = pose === "sleep" ? 8 : 15;
  if (t < cat.sayUntil) bubble(x, y - head, cat.say, "#f4f2ea");
  else if (mode === "comfort" && Math.floor(t / 3000) % 2) bubble(x, y - head, `♥ courage ${cat.comfort || ""}`, "#f4c2d7");
  else if (mode === "hide") bubble(x, y - head, "🙀", "#f4f2ea");
  else if (cat.hover) text(CAT_NAME.toUpperCase(), x, y + 1, "#d5eeff", 3.6, "center");
}

// fallback while the sprite images load (first frames only)
function drawCatPx(t, x, y) {
  const { dir, mode } = cat, fur = "#a3a3ad", dark = "#6e6e7a";
  const cp = (ox, oy, w, h, c) => px(dir > 0 ? x + ox : x - ox - w, y + oy, w, h, c);
  if (mode === "sleep") {  // curled up on the desk, z z z
    px(x - 4, y - 3, 8, 3, fur); px(x - 2, y - 3, 1, 1, dark); px(x, y - 3, 1, 1, dark);
    px(x + 2, y - 4, 3, 3, fur); px(x + 2, y - 5, 1, 1, fur); px(x + 4, y - 5, 1, 1, fur); px(x + 3, y - 3, 1.5, 0.5, "#1c1c24");
    px(x - 5, y - 1, 7, 1, dark);
  } else if (mode === "walk" || mode === "chase") {
    const leg = Math.floor(t / 140) % 2;
    cp(-4, -5, 8, 3, fur); cp(-2, -5, 1, 1, dark); cp(0, -5, 1, 1, dark);
    cp(3, -7, 4, 4, fur); cp(3, -8, 1, 1, fur); cp(6, -8, 1, 1, fur); cp(5, -6, 1, 1, "#1c1c24");
    cp(-3 + leg, -2, 1, 2, fur); cp(2 - leg, -2, 1, 2, fur);
    cp(-6, -8 + leg, 1, 3, fur); cp(-5, -6, 1, 1, fur);
  } else {  // sitting, tail swaying
    const wag = Math.sin(t / 300) > 0 ? 1 : 0;
    cp(-2, -5, 4, 5, fur); cp(-1, -4, 1, 1, dark);
    cp(-2, -9, 4, 4, fur); cp(-2, -10, 1, 1, fur); cp(1, -10, 1, 1, fur); cp(0, -8, 1, 1, "#1c1c24");
    cp(-4 - wag, -1, 3, 1, fur); cp(-5 - wag, -2 - wag, 1, 1, fur);
  }
}
