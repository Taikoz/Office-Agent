// Darts: 501, 301, Cricket, Tour de l'horloge.

import { hub } from "../hub.js";
import { CHIEF_NAME, H, S, W, clip, ctx, px, text } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { drawPerson } from "../world/scene.js";
import { mate } from "../sims/crew.js";
import { loungeSay } from "../world/lounge.js";
import { MiniGame, endMatch, match } from "./base.js";

/* darts in the break room: 501 / 301 (double or single out), Cricket, Tour de l'horloge — against a dev, 3 darts a turn */
const DART_NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const DART_MODES = [
  { id: "501", label: "501", hint: "de 501 pile à zéro" },
  { id: "301", label: "301", hint: "de 301 pile à zéro" },
  { id: "cricket", label: "CRICKET", hint: "fermer 15 à 20 + bull, marquer sur les ouverts" },
  { id: "clock", label: "TOUR DE L'HORLOGE", hint: "1 → 20 puis bull ; double +2, triple +3" },
].map((d, i) => ({ ...d, x: 110, y: 40 + i * 32, w: 180, h: 28 }));
const DART_OUT_BTN = { x: 110, y: 172, w: 180, h: 24 };
const DART_ROUNDS = { "501": 30, "301": 20, cricket: 20, clock: 15 };
const CRICKET = [20, 19, 18, 17, 16, 15, 25];
const DB = { x: 120, y: 124, r: 84 }, DR = { bull: 6.35, outer: 15.9, tIn: 99, tOut: 107, dIn: 162, dOut: 170 };
let dartPrefs = new SaveSlot("office-darts", { mode: "501", out: "double" }).data;
const dartsDouble = m => (m.out || dartPrefs.out) === "double";
const dartLabel = (n, m) => n === 25 ? (m === 2 ? "BULL" : "25") : `${["", "", "D", "T"][m]}${n}`;
export const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const dartWobble = t => ({ x: Math.sin(t / 340) * 3 + Math.sin(t / 97) * 0.8, y: Math.cos(t / 450) * 3 + Math.cos(t / 131) * 0.8 });

function dartScore(x, y) {
  const dx = x - DB.x, dy = y - DB.y, r = Math.hypot(dx, dy) / DB.r * 170;
  if (r <= DR.bull) return { n: 25, m: 2, v: 50, label: "BULL" };
  if (r <= DR.outer) return { n: 25, m: 1, v: 25, label: "25" };
  if (r > DR.dOut) return { n: 0, m: 0, v: 0, label: "raté" };
  const n = DART_NUMS[Math.floor(((Math.atan2(dx, -dy) * 180 / Math.PI + 369) % 360) / 18)];
  const m = r >= DR.dIn ? 2 : r >= DR.tIn && r <= DR.tOut ? 3 : 1;
  return { n, m, v: n * m, label: `${["", "", "D", "T"][m]}${n}` };
}
function dartPoint(n, m) {
  if (n === 25) return { x: DB.x, y: DB.y - (m === 2 ? 0 : 11 / 170 * DB.r) };
  const r = (m === 3 ? 103 : m === 2 ? 166 : 135) / 170 * DB.r, a = DART_NUMS.indexOf(n) * Math.PI / 10;
  return { x: DB.x + Math.sin(a) * r, y: DB.y - Math.cos(a) * r };
}
// next dart toward a finish (also used for the player's checkout hint); double out unless `single`
function dartsOut(rem, single = false) {
  if (single) {
    if (rem <= 20) return [rem, 1];
    if (rem === 25 || rem === 50) return [25, rem / 25];
    if (rem <= 40 && rem % 2 === 0) return [rem / 2, 2];
    if (rem <= 60 && rem % 3 === 0) return [rem / 3, 3];
    if (rem <= 60) return [rem - 40 <= 20 ? rem - 40 : 20, rem - 40 <= 20 ? 1 : 2];  // leave a D20 or less
    return [20, 3];
  }
  if (rem === 50) return [25, 2];
  if (rem <= 40 && rem % 2 === 0) return [rem / 2, 2];
  for (const leave of [32, 40, 16, 24, 36, 20, 8, 12, 4, 2]) {
    const need = rem - leave;
    if (need >= 1 && need <= 20) return [need, 1];
    if (need === 25) return [25, 1];
    if (need > 20 && need <= 60 && need % 3 === 0) return [need / 3, 3];
  }
  return rem > 60 ? [20, 3] : [1, 1];
}
function dartsCheckout(rem, left, single = false) {
  const steps = [];
  for (let r = rem; steps.length < left;) {
    const [n, m] = dartsOut(r, single);
    steps.push(dartLabel(n, m)); r -= n * m;
    if (r === 0) return steps.join(" · ");
    if (r < (single ? 0 : 2)) return "";
  }
  return "";
}
// why a dart busts, in words: the score goes back to what it was before the throw of 3
function dartsBustWhy(rest, s, double) {
  if (rest < 0) return `${s.v} > reste : ça dépasse`;
  if (rest === 1) return "il resterait 1 : aucun double ne fait 1";
  if (rest === 0 && double) return "finir sur un double (ou le bull)";
  return "";
}
function dartsAim(m, me, op) {
  if (m.mode === "clock") return [me.at > 20 ? 25 : me.at, 1];
  if (m.mode === "cricket") {
    const open = CRICKET.filter(n => me.marks[n] < 3), scoring = CRICKET.filter(n => me.marks[n] >= 3 && op.marks[n] < 3);
    const n = open.length && !(me.pts < op.pts && scoring.length) ? open[0] : scoring[0] ?? open[0] ?? 20;
    return [n, n === 25 ? 2 : 3];
  }
  return dartsOut(me.rem, !dartsDouble(m));
}

function dartsStart(mode) {
  const m = match, side = () => mode === "cricket" ? { marks: Object.fromEntries(CRICKET.map(n => [n, 0])), pts: 0 } : mode === "clock" ? { at: 1 } : { rem: +mode };
  Object.assign(m, { mode, out: dartPrefs.out, phase: "play", turn: "p", darts: [], round: 1, next: 0, aiAt: Infinity, p: side(), a: side(), msg: "À toi : 3 fléchettes.", why: "" });
  for (const k of ["p", "a"]) Object.assign(m[k], { scored: 0, thrown: 0 });
  m.turnStart = m.p.rem;
  dartPrefs.mode = mode; SaveSlot.get("office-darts").save(dartPrefs);
}
function dartsApply(m, who, s) {
  const me = m[who], op = m[who === "p" ? "a" : "p"];
  if (m.mode === "cricket") {
    if (!CRICKET.includes(s.n)) return "";
    const extra = Math.max(0, s.m - (3 - me.marks[s.n]));
    me.marks[s.n] = Math.min(3, me.marks[s.n] + s.m);
    if (extra && op.marks[s.n] < 3) me.pts += extra * s.n;
    return CRICKET.every(n => me.marks[n] >= 3) && me.pts >= op.pts ? "win" : "";
  }
  if (m.mode === "clock") {
    if (s.n !== (me.at > 20 ? 25 : me.at)) return "";
    if (s.n === 25) return "win";
    me.at = Math.min(21, me.at + s.m);
    return "";
  }
  const rest = me.rem - s.v, double = dartsDouble(m);
  if (rest < 0 || (double && (rest === 1 || (rest === 0 && s.m !== 2)))) { m.why = dartsBustWhy(rest, s, double); return "bust"; }
  me.rem = rest;
  return rest ? "" : "win";
}
function dartsLeader(m) {
  const { p, a } = m, marks = x => CRICKET.reduce((n, k) => n + x.marks[k], 0);
  if (m.mode === "cricket") return p.pts !== a.pts ? (p.pts > a.pts ? "p" : "a") : marks(p) >= marks(a) ? "p" : "a";
  if (m.mode === "clock") return p.at >= a.at ? "p" : "a";
  return p.rem <= a.rem ? "p" : "a";
}
function dartsEnd(who, t) {
  const m = match;
  m.ps = who === "p" ? 1 : 0; m.as = 1 - m.ps; m.over = t + 3200;
  m.msg = `${who === "p" ? CHIEF_NAME : m.name} gagne !`; hub.sfx(who === "p" ? "pass" : "fail");
}
function dartsThrow(x, y, t) {
  const m = match, who = m.turn, s = dartScore(x, y);
  m.darts.push({ x, y, s, who }); hub.sfx(s.v ? "commit" : "fail");
  const res = dartsApply(m, who, s), x01 = m.mode === "501" || m.mode === "301";
  m.msg = `${who === "p" ? CHIEF_NAME : m.name} : ${s.label}${res === "bust" ? " · BUST !" : ""}`;
  if (res !== "bust") m.why = "";
  if (x01) { m[who].thrown++; if (res !== "bust") m[who].scored += s.v; }
  if (res === "win") return dartsEnd(who, t);
  if (res === "bust") { m[who].scored -= m.turnStart - m[who].rem; m[who].thrown += 3 - m.darts.length; m[who].rem = m.turnStart; }
  if (m.darts.length === 3 && m.mode !== "cricket" && m.mode !== "clock" && res !== "bust") {
    const tot = m.darts.reduce((n, d) => n + d.s.v, 0);
    if (tot >= 100) m.msg = tot === 180 ? "ONE HUNDRED AND EIGHTYYY !!!" : `${tot} !`;
    if (who === "a" && tot >= 100 && !m.net) loungeSay(m.name, tot === 180 ? "180 !!!" : "Pas mal, hein ?");
  }
  if (res === "bust" || m.darts.length === 3) m.next = t + 1600;
  else if (who === "a") m.aiAt = t + 900;
}
function dartsClick(p, t) {
  const m = match;
  const inBox = b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  if (m.phase === "menu") {
    if (inBox(DART_OUT_BTN)) { dartPrefs.out = dartPrefs.out === "double" ? "single" : "double"; SaveSlot.get("office-darts").save(dartPrefs); return; }
    const b = DART_MODES.find(inBox); if (b) dartsStart(b.id); return;
  }
  if (m.over || m.next || m.turn !== "p") return;
  const w = dartWobble(t);
  dartsThrow(p.x + w.x + gauss() * 1.4, p.y + w.y + gauss() * 1.4, t);
}
function stepDarts(dt, t) {
  const m = match;
  if (m.over) { if (t > m.over) endMatch(); return; }
  if (m.phase !== "play") return;
  if (m.next) {
    if (t < m.next) return;
    m.next = 0; m.darts = []; m.why = "";
    if (m.turn === "a" && ++m.round > DART_ROUNDS[m.mode]) return dartsEnd(dartsLeader(m), t);
    m.turn = m.turn === "p" ? "a" : "p"; m.turnStart = m[m.turn].rem;
    m.msg = m.turn === "p" ? "À toi : 3 fléchettes." : `${m.name} lance…`;
    if (m.turn === "a") m.aiAt = t + 1000;
    return;
  }
  // another chief's darts (games/online.js): thrown on his page, played here in order
  if (m.net && m.turn === "a" && !m.over) for (const [id, x, y] of m.net.in.th || []) {
    if (id <= (m.net.thrown || 0)) continue;
    m.net.thrown = id; dartsThrow(x, y, t);
    if (m.next || m.over) break;
  }
  if (!m.net && m.turn === "a" && t > m.aiAt) {
    const [n, k] = dartsAim(m, m.a, m.p), aim = dartPoint(n, k), st = mate(m.name);
    const sig = Math.max(3, Math.min(9, 4.6 + st.fatigue / 30 - st.moral / 80));
    m.aiAt = Infinity;
    dartsThrow(aim.x + gauss() * sig, aim.y + gauss() * sig, t);
  }
}

function drawDartboard() {
  const cx = DB.x * S, cy = DB.y * S, k = DB.r * S / 170;
  const ring = (r0, r1, a0, a1, c) => { ctx.beginPath(); ctx.arc(cx, cy, r1 * k, a0, a1); ctx.arc(cx, cy, r0 * k, a1, a0, true); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
  ring(0, 200, 0, 2 * Math.PI, "#1c1c24");
  for (let i = 0; i < 20; i++) {
    const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + Math.PI / 10, dark = i % 2 === 0;
    ring(DR.outer, DR.tIn, a0, a1, dark ? "#1c1c24" : "#f4efc9");
    ring(DR.tIn, DR.tOut, a0, a1, dark ? "#d64545" : "#2f9e44");
    ring(DR.tOut, DR.dIn, a0, a1, dark ? "#1c1c24" : "#f4efc9");
    ring(DR.dIn, DR.dOut, a0, a1, dark ? "#d64545" : "#2f9e44");
    const am = i * Math.PI / 10;
    text(String(DART_NUMS[i]), DB.x + Math.sin(am) * (DB.r + 7), DB.y - Math.cos(am) * (DB.r + 7) - 2.6, "#f7f7f7", 5.2, "center");
  }
  ring(0, DR.outer, 0, 2 * Math.PI, "#2f9e44"); ring(0, DR.bull, 0, 2 * Math.PI, "#d64545");
  // the silver spider: ring wires and segment wires
  ctx.strokeStyle = "rgba(200,204,214,.75)"; ctx.lineWidth = Math.max(1, 0.35 * S);
  for (const r of [DR.bull, DR.outer, DR.tIn, DR.tOut, DR.dIn, DR.dOut]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 2 * Math.PI); ctx.stroke(); }
  ctx.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i * 18 - 99) * Math.PI / 180; ctx.moveTo(cx + Math.cos(a) * DR.outer * k, cy + Math.sin(a) * DR.outer * k); ctx.lineTo(cx + Math.cos(a) * DR.dOut * k, cy + Math.sin(a) * DR.dOut * k); }
  ctx.stroke();
}
// a dart planted at x, y: tip in the board, steel barrel, shaft, flight in the thrower's colour
function drawDart(x, y, color) {
  const L = (x0, y0, x1, y1, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w * S; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0 * S, y0 * S); ctx.lineTo(x1 * S, y1 * S); ctx.stroke(); };
  ctx.fillStyle = "#0a0a10"; ctx.beginPath(); ctx.arc(x * S, y * S, 0.8 * S, 0, 2 * Math.PI); ctx.fill();
  L(x + 0.6, y - 0.5, x + 4.4, y - 3.5, "#c8ccd6", 1.4); L(x + 4.4, y - 3.5, x + 6.8, y - 5.4, "#2a2a34", 0.8);
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo((x + 6.2) * S, (y - 4.9) * S); ctx.lineTo((x + 9.6) * S, (y - 9.4) * S); ctx.lineTo((x + 10.4) * S, (y - 6.6) * S);
  ctx.lineTo((x + 11.4) * S, (y - 5.6) * S); ctx.lineTo((x + 6.2) * S, (y - 4.9) * S); ctx.fill();
}
function renderDarts(t, m = match) {
  const mode = DART_MODES.find(d => d.id === m.mode), ME = m.leftName || CHIEF_NAME;  // leftName: a spectator's screen
  px(0, 0, W, H, "#040c26");
  text(`FLÉCHETTES${mode ? ` · ${mode.label}` : ""} · contre ${m.name}`, 200, 4, "#fbaa08", 6, "center");
  if (m.phase === "menu") {
    text("Choisis un mode de jeu", 200, 28, "#f7f7f7", 5, "center");
    for (const b of DART_MODES) {
      const on = b.id === dartPrefs.mode;
      px(b.x, b.y, b.w, b.h, on ? "#fbaa08" : "#14317a"); px(b.x + 1, b.y + 1, b.w - 2, b.h - 2, on ? "#ffd166" : "#0d2766");
      text(b.label, b.x + b.w / 2, b.y + 4, on ? "#081746" : "#f7f7f7", 7, "center");
      text(b.hint, b.x + b.w / 2, b.y + 17, on ? "#081746" : "#adadad", 4, "center");
    }
    const o = DART_OUT_BTN, dbl = dartPrefs.out === "double";
    px(o.x, o.y, o.w, o.h, "#14317a"); px(o.x + 1, o.y + 1, o.w - 2, o.h - 2, "#0d2766");
    text(`501 / 301 : sortie ${dbl ? "DOUBLE" : "SIMPLE"}  ⇄`, o.x + o.w / 2, o.y + 3, "#51cf66", 6, "center");
    text(dbl ? "finir pile à zéro sur un double ou le bull (règle officielle)" : "finir pile à zéro avec n'importe quelle fléchette", o.x + o.w / 2, o.y + 14, "#adadad", 3.8, "center");
    text("Clic = choisir · Échap = retour", 200, 214, "#adadad", 4.2, "center");
    return;
  }
  drawDartboard();
  for (const d of m.darts) {
    drawDart(d.x, d.y, d.who === "p" ? "#fbaa08" : m.look.shirt);
    text(d.s.label, d.x + 8, d.y - 1, "#f7f7f7", 4, "left");
  }
  if (m.turn === "p" && !m.next && !m.over && m.mouseX != null) {
    const w = dartWobble(t), x = m.mouseX + w.x, y = m.mouseY + w.y;
    px(x - 4, y - 0.3, 3, 0.6, "#fbaa08"); px(x + 1, y - 0.3, 3, 0.6, "#fbaa08");
    px(x - 0.3, y - 4, 0.6, 3, "#fbaa08"); px(x - 0.3, y + 1, 0.6, 3, "#fbaa08");
    const s = dartScore(x, y);  // what is under the sight right now
    if (s.v) { px(x + 4, y + 3, 14, 7, "#081746"); text(s.label, x + 11, y + 3.6, "#fbaa08", 4.6, "center"); }
  }
  // score panel
  const X = 228, row = (who, y) => {
    const me = m[who], cur = m.turn === who && !m.over, name = who === "p" ? ME : m.name;
    text(`${cur ? "▶ " : "  "}${name}`, X, y, cur ? "#fbaa08" : "#f7f7f7", 6);
    if (m.mode === "clock") text(me.at > 20 ? "BULL" : String(me.at), 388, y, "#f7f7f7", 8, "right");
    else if (m.mode !== "cricket") {
      text(String(me.rem), 388, y - 1, "#f7f7f7", 9, "right");
      if (me.thrown) text(`moy. ${(me.scored / me.thrown * 3).toFixed(1)}`, X + 8, y + 8, "#adadad", 3.8);
    }
  };
  px(X - 6, 18, 172, 192, "#0d2766");
  text(`Manche ${Math.min(m.round, DART_ROUNDS[m.mode])} / ${DART_ROUNDS[m.mode]}`, X, 22, "#adadad", 4.2);
  if (m.mode === "cricket") {
    const sym = n => ["", "/", "X", "⊗"][n];
    text(ME, 262, 32, m.turn === "p" ? "#fbaa08" : "#f7f7f7", 5, "center"); text(m.name, 356, 32, m.turn === "a" ? "#fbaa08" : "#f7f7f7", 5, "center");
    CRICKET.forEach((n, i) => {
      const y = 42 + i * 11, shut = m.p.marks[n] >= 3 && m.a.marks[n] >= 3;
      text(sym(m.p.marks[n]), 262, y, "#51cf66", 7, "center"); text(sym(m.a.marks[n]), 356, y, "#51cf66", 7, "center");
      text(n === 25 ? "BULL" : String(n), 309, y + 1, shut ? "#5a6480" : "#fbaa08", 6, "center");
    });
    text(`${m.p.pts}`, 262, 122, "#f7f7f7", 8, "center"); text("pts", 309, 125, "#adadad", 4.5, "center"); text(`${m.a.pts}`, 356, 122, "#f7f7f7", 8, "center");
  } else {
    row("p", 36); row("a", 60);
    if (m.mode === "clock") text("cible actuelle de chacun", X, 82, "#adadad", 4.2);
    else {
      const single = !dartsDouble(m), hint = m.turn === "p" && !m.over && !m.next && m.p.rem <= 180 ? dartsCheckout(m.p.rem, 3 - m.darts.length, single) : "";
      text(hint ? `Finish : ${hint}` : single ? "Sortie simple : finir pile à zéro" : "Sortie par un double (bull = D25)", X, 82, hint ? "#51cf66" : "#adadad", 4.4);
    }
  }
  const darts = m.darts.map(d => d.s.label);
  text(`Volée : ${darts.join(" · ") || "—"}`, X, 140, "#f7f7f7", 5);
  if (m.mode === "501" || m.mode === "301") text(`Total : ${m.darts.reduce((n, d) => n + d.s.v, 0)}`, X, 152, "#adadad", 4.6);
  text(clip(m.msg, 34), X, 164, "#fbaa08", 5);
  if (m.why) { text(clip(m.why, 44), X, 173, "#ff6b6b", 4); text(`score remis à ${m[m.turn].rem}`, X, 180, "#adadad", 3.8); }
  text("Souris = viser (ça tremble !) · clic = lancer", X, 192, "#adadad", 3.8);
  text("Échap = abandonner", X, 200, "#adadad", 3.8);
  drawPerson(372, 230, m.look, { smile: dartsLeader(m) === "a" });
  if (m.over) {
    const won = m.ps > m.as;
    px(110, 96, 180, 40, "#081746"); px(112, 98, 176, 36, won ? "#51cf66" : "#ff6b6b");
    text(won ? (m.leftName ? `${m.leftName.toUpperCase()} GAGNE` : "VICTOIRE !") : `${m.name.toUpperCase()} GAGNE`, 200, 102, "#081746", 10, "center"); text(mode.label, 200, 120, "#081746", 6, "center");
  }
}

class Darts extends MiniGame {
  constructor() { super("darts", "Fléchettes"); }
  init() { return { phase: "menu" }; }
  step(_m, dt, t) { stepDarts(dt, t); }
  render(m, t) { renderDarts(t, m); }
  click(_m, p, t) { dartsClick(p, t); }
}
new Darts();

/* ---------- over the network (games/online.js) ---------- */
export const dartsNetStart = () => dartsStart(dartPrefs.mode);  // the challenger's mode and finish rule
export const dartsState = m => ({ mode: m.mode, out: m.out, turn: m.turn, round: m.round, p: m.p, a: m.a, msg: m.msg, why: m.why, next: m.next ? 1 : 0, ps: m.ps, as: m.as, over: !!m.over,
  darts: m.darts.map(d => [Math.round(d.x * 10) / 10, Math.round(d.y * 10) / 10, d.s.label, d.s.v, d.who]) });
// the screen of the other player (turned: he is "p") or of a spectator (as is)
export function dartsView(v, m, turned) {
  const sw = w => turned ? (w === "p" ? "a" : "p") : w;
  const yours = "À toi : 3 fléchettes.", msg = !turned ? (v.msg === yours ? `${m.leftName} lance…` : v.msg) : v.msg === yours ? `${m.name} lance…` : v.turn === "a" && /lance…$/.test(v.msg) ? yours : v.msg;
  return { phase: "play", mode: v.mode, out: v.out, turn: sw(v.turn), round: v.round, p: turned ? v.a : v.p, a: turned ? v.p : v.a, msg, why: v.why, next: v.next, over: v.over ? 1 : 0,
    ps: turned ? v.as : v.ps, as: turned ? v.ps : v.as, darts: (v.darts || []).map(([x, y, label, val, who]) => ({ x, y, s: { label, v: val }, who: sw(who) })),
    name: m.name, look: m.look, leftName: m.leftName, mouseX: m.mouseX, mouseY: m.mouseY };
}
// where a dart thrown by a click lands: the sight trembles, the hand too
export function dartsAimAt(p, t) { const w = dartWobble(t); return { x: p.x + w.x + gauss() * 1.4, y: p.y + w.y + gauss() * 1.4 }; }
