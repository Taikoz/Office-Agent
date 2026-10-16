// Game layer: bosses, XP, achievements, quests, 8-bit sounds.

import { hub, provide } from "../hub.js";
import { DOOR, W, ctx, ents, px, selected, specialty, text, typeColor } from "../core/core.js";
import { Flag } from "../save/flag.js";
import { ART } from "../svg/base.js";
import { drawPerson } from "../world/scene.js";
import { lookFor } from "../agents/entities.js";
import { crewAdd } from "./crew.js";
import { setView, view } from "../world/lounge.js";
import { catCheer } from "../world/cat.js";
import { esc } from "../core/data.js";
import { loadDetail, openPanel } from "../ui/panel.js";

/* ---------- game: scene events, bosses, XP, achievements, quests, sounds ---------- */
export const SHELF = { x: 233, y: 47, w: 50 }, FRAME = { x: 292, y: 5, w: 20, h: 26 };
export const FX_BG = { pass: "#51cf66", fail: "#ff6b6b", mr: "#fbaa08", push: "#5aa9ff", commit: "#d5eeff", verify: "#5aa9ff", boss: "#fbaa08" };
export let game = null, gameSeen = null, banner = null;
export const evSeen = new Map(), particles = [], planes = [];
let recentCups = new Map();

export function burst(x, y, colors, n = 18, spread = 1, up = 1) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) n = Math.min(n, 4);
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 0.06 * spread, vy: -Math.random() * 0.07 * up,
    g: 0.00012, life: 0, max: 900 + Math.random() * 900, c: colors[i % colors.length], s: 1 + Math.random() });
}
function rain(x, y, color) {
  for (let i = 0; i < 16; i++) particles.push({ x: x - 14 + Math.random() * 28, y: y - 30 - Math.random() * 10, vx: 0, vy: 0.02 + Math.random() * 0.02,
    g: 0, life: 0, max: 1300, c: color, s: 1 });
}
export function smoke(x, y, c = "#6b6478") {
  for (let i = 0; i < 10; i++) particles.push({ x: x - 3 + Math.random() * 6, y, vx: (Math.random() - 0.5) * 0.01, vy: -0.012 - Math.random() * 0.01,
    g: 0, life: -i * 120, max: 1600, c, s: 2.2 });
}

function react(a, ev) {
  const e = ents.get(a.id);
  const kind = { tests_pass: "pass", tests_fail: "fail", boss_defeated: "boss", to_verify: "verify" }[ev.kind] || ev.kind;
  sfx(kind);
  if (["mr", "verify", "boss"].includes(kind)) catCheer();
  if (!e || e.queued) return;
  crewAdd(e.who, { pass: { moral: 5 }, fail: { moral: -6, fatigue: 2 }, push: { moral: 3 }, commit: { moral: 2 }, mr: { moral: 10 },
    verify: { moral: 8, ennui: -5 }, boss: { moral: 15 } }[kind] || {});
  const x = e.seated ? e.desk.x : e.x, y = e.seated ? e.desk.y - 6 : e.y - 10, now = performance.now();
  const msg = { pass: `Tests verts ✓${ev.n ? ` (${ev.n})` : ""}`, fail: `✗ ${ev.n || 1} test(s) rouge(s)`, push: "git push ✈", mr: "MR ouverte !",
    commit: "commit ✓", verify: "→ To Verify ✓", boss: "BOSS VAINCU !" }[kind];
  if (!msg) return;
  e.fxKind = kind; e.fxMsg = msg; e.fxUntil = now + (kind === "boss" ? 3200 : 2600);
  if (kind === "pass") rain(x, y, "#51cf66");
  else if (kind === "fail") smoke(x, y - 12);
  else if (kind === "push") planes.push({ x, y: y - 10, sx: x, sy: y - 10, t0: now });
  else if (kind === "boss" && e.seated) burst(e.desk.x - 28, e.desk.y + 4, ["#fbaa08", "#ff6b6b", "#fff7b8", "#fbaa08"], 30, 1.4);
  else if (kind === "mr" || kind === "verify") burst(x, y - 16, ["#fbaa08", "#5aa9ff", "#51cf66"], 14);
  else if (kind === "commit") burst(x, y - 14, ["#d5eeff"], 6, 0.4);
}

function gameEvents(session) {
  for (const a of session?.agents || []) {
    const g = a.game;
    if (!g) continue;
    const seen = evSeen.get(a.id);
    evSeen.set(a.id, g.evCount);
    if (seen === undefined) continue;  // first sight: no replay of the past
    g.events.filter(ev => ev.i > seen).slice(-3).forEach((ev, i) => setTimeout(() => react(a, ev), i * 900));
  }
}

function stepFx(dt, t) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life < 0) continue;
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life > p.max) particles.splice(i, 1);
  }
  for (let i = planes.length - 1; i >= 0; i--) if (t - planes[i].t0 > 2600) planes.splice(i, 1);
}

export function drawFx(t) {
  if (hub.focusMode) return;
  for (const p of particles) if (p.life >= 0) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
    px(p.x, p.y, p.s, p.s, p.c);
  }
  ctx.globalAlpha = 1;
  for (const pl of planes) {  // paper plane: desk → door, with a little arc
    const k = Math.min(1, (t - pl.t0) / 2400), x = pl.sx + (DOOR.x - pl.sx) * k, y = pl.sy + (DOOR.y - 10 - pl.sy) * k - Math.sin(k * Math.PI) * 18;
    px(x - 3, y, 6, 1.2, "#f4f2ea"); px(x - 1, y - 1.5, 3, 1.5, "#f7f7f7"); px(x + 2, y - 0.6, 2, 1, "#d5eeff");
  }
  if (banner && t < banner.until) {  // LEVEL UP
    const k = Math.min(1, (banner.until - t) / 400), bob = Math.sin(t / 120) * 1.2;
    ctx.globalAlpha = k;
    px(W / 2 - 92, 96 + bob, 184, 24, "#1c1c24"); px(W / 2 - 90, 98 + bob, 180, 20, banner.color);
    text(banner.title, W / 2, 98.5 + bob, "#1c1c24", 9, "center");
    text(banner.sub, W / 2, 109 + bob, "#1c1c24", 5, "center");
    ctx.globalAlpha = 1;
  }
}

export function drawBoss(x, y, boss, t, stunned = false) {
  const bob = Math.sin(t / 220) * 1, leg = Math.floor(t / 160) % 2;
  ART.bug.draw(x - 10, y - 13 + bob, { frame: leg, stunned });
  const w = 18;
  px(x - w / 2, y - 15, w, 3, "#1c1c24"); px(x - w / 2 + 0.5, y - 14.5, (w - 1) * boss.hp / Math.max(1, boss.max), 2, "#ff6b6b");
  text(`BUG ×${boss.hp}`, x, y - 20.5, "#ff6b6b", 3.6, "center");
}

export function drawBell(x, y, t) {
  const sw = Math.sin(t / 70) * 1.5;
  ART.bell.draw(x - 4 + sw, y - 0.6);
}

function drawShelf(t) {
  const list = game?.achievements || [];
  ART.shelf.draw(SHELF.x - 1, SHELF.y, { w: SHELF.w });
  list.forEach((a, i) => {
    const x = SHELF.x + 1 + i * (SHELF.w - 2) / Math.max(12, list.length), y = SHELF.y - 5;
    ART.cup.draw(x - 0.6, y - 1.2, { on: !!a.unlocked });
    const fresh = recentCups.get(a.id);
    if (fresh && t - fresh < 6000 && Math.floor(t / 200) % 2) px(x + 2.4, y - 0.8, 1, 1, "#fff");
  });
  text("SUCCÈS", SHELF.x + SHELF.w / 2, SHELF.y + 2, "#adadad", 3.8, "center");
}

function drawEmployee(t) {
  const { x, y, w, h } = FRAME, emp = game?.employee;
  px(x - 1, y - 1, w + 2, h + 2, "#c9a24b"); px(x, y, w, h, "#0c2470");
  if (emp) {
    px(x, y + h * 0.55, w, h * 0.45, typeColor(emp.type) + "55");
    drawPerson(x + w / 2, y + h - 1, lookFor(emp.type, emp.type), { smile: true });
    text("★", x + w - 3, y + 0.5, "#fbaa08", 4.5, "center");
  } else text("?", x + w / 2, y + 7, "#adadad", 9, "center");
  text("EMPLOYÉ SEMAINE", x + w / 2, y + h + 1.5, "#c9a24b", 3, "center");
}

export async function pollGame() {
  let g;
  try { g = DEMO ? hub.demoGame() : await (await fetch("/api/game", { cache: "no-store" })).json(); } catch (_) { return; }
  const unlocked = new Set(g.achievements.filter(a => a.unlocked).map(a => a.id));
  const levels = Object.fromEntries(Object.entries(g.xp).map(([k, v]) => [k, v.level]));
  if (gameSeen) {
    const fresh = g.achievements.filter(a => a.unlocked && !gameSeen.unlocked.has(a.id));
    fresh.forEach((a, i) => setTimeout(() => {
      toast("SUCCÈS DÉBLOQUÉ", `🏆 ${a.name}`, a.desc); sfx("achievement");
      recentCups.set(a.id, performance.now());
      burst(SHELF.x + SHELF.w / 2, SHELF.y - 4, ["#fbaa08", "#fff7b8", "#51cf66", "#fbaa08"], 26, 1.6);
    }, i * 1500));
    for (const [type, lv] of Object.entries(levels)) if (gameSeen.levels[type] && lv > gameSeen.levels[type]) {
      banner = { title: "LEVEL UP !", sub: `${specialty(type)} → NIV. ${lv}`, color: typeColor(type), until: performance.now() + 3500 };
      toast("LEVEL UP", `${specialty(type)} niveau ${lv}`, `${g.xp[type].xp} XP au total`, "lvl"); sfx("level");
      hub.startCake(specialty(type), lv);
    }
    if (g.employee?.type && g.employee.type !== gameSeen.employee) toast("EMPLOYÉ DE LA SEMAINE", specialty(g.employee.type), `${g.employee.xp} XP sur 7 jours`);
  }
  gameSeen = { unlocked, levels, employee: g.employee?.type };
  game = g;
  renderQuests(); hub.renderUsage(); hub.checkAlerts();
  if (selected === "trophies") loadDetail();
}

export function toast(kicker, title, body, cls = "") {
  const box = document.getElementById("toasts"), el = document.createElement("div");
  el.className = `toast ${cls}`;
  el.innerHTML = `<small>${esc(kicker)}</small><b>${esc(title)}</b>${body ? `<p>${esc(body)}</p>` : ""}`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 6000);
  while (box.children.length > 4) box.firstChild.remove();
}

function renderQuests() {
  const q = game?.quests || [];
  const done = q.filter(x => x.n >= x.target).length;
  document.getElementById("qcount").textContent = q.length ? `${done}/${q.length}` : "";
  document.getElementById("quests").innerHTML = q.map(x => {
    const ok = x.n >= x.target, ko = x.failed;
    return `<div class="q ${ok ? "ok" : ko ? "ko" : ""}" title="${esc(x.label)}">${ok ? "✓" : ko ? "✗" : "○"} <span class="lbl">${esc(x.label)}</span>${x.target > 1 ? `<span class="track"><i style="width:${Math.round(100 * x.n / x.target)}%"></i></span> ${x.n}/${x.target}` : ""}</div>`;
  }).join("");
}

function renderTrophies() {
  if (!game) return;
  const emp = game.employee, xp = Object.entries(game.xp).sort((a, b) => b[1].xp - a[1].xp);
  const fmt = ts => ts ? new Date(ts * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";
  document.getElementById("p-game").innerHTML = `
    <h3>EMPLOYÉ DE LA SEMAINE</h3>
    <div class="emp">${emp ? `<span class="tag" style="background:${typeColor(emp.type)}">${esc(specialty(emp.type))}</span> ${emp.xp} XP gagnés sur 7 jours` : "Personne cette semaine."}</div>
    <h3>NIVEAUX</h3>
    ${xp.map(([type, g]) => `<div class="xp"><span><span class="tag" style="background:${typeColor(type)}">${esc(specialty(type))}</span> NIV. ${g.level}</span>
      <span class="track"><i style="width:${Math.round(100 * (g.xp - g.from) / (g.to - g.from))}%;background:${typeColor(type)}"></i></span><span class="muted">${g.xp} XP</span></div>`).join("")}
    <h3>SUCCÈS ${game.achievements.filter(a => a.unlocked).length}/${game.achievements.length}</h3>
    ${game.achievements.map(a => `<div class="ach ${a.unlocked ? "" : "off"}"><span class="cup">🏆</span><div>${esc(a.name)}<p>${esc(a.desc)}</p></div>
      <span class="muted">${a.unlocked ? fmt(a.at) || "✓" : `${a.n}/${a.target}`}</span></div>`).join("")}
    <h3>BARÈME XP</h3><p class="muted">livré +100 · sans erreur +50 · moins de 5 min +30 · tests verts +20 (5 max/run) · push +30 · MR +50 · To Verify +40 · boss vaincu +60 · faille haute/critique +40, moyenne +15. Niveau L à partir de 50·(L−1)² XP.</p>`;
}
document.getElementById("trophybtn").onclick = () => openPanel("trophies");
document.getElementById("teambtn").onclick = () => openPanel("team");
document.getElementById("shopbtn").onclick = () => openPanel("shop");
document.getElementById("p-game").addEventListener("click", ev => { const c = ev.target.closest("[data-mate]"); if (c && selected === "team") openPanel(`mate:${c.dataset.mate}`); });
document.getElementById("loungebtn").onclick = () => setView(view === "lounge" ? "office" : "lounge");
setInterval(() => setView(view), 1000);  // keeps the head count fresh

// 8-bit sounds, synthesized (no file); off by default, the choice is remembered
export const SFX = {
  meow: [[740, .07, "triangle"], [988, .06, "triangle"], [620, .22, "triangle"]],
  pass: [[523, .08], [659, .08], [784, .14]], fail: [[220, .15, "sawtooth"], [165, .28, "sawtooth"]], push: [[392, .06], [523, .06], [784, .1]],
  mr: [[880, .1, "triangle"], [1175, .3, "triangle"]], verify: [[660, .08, "triangle"], [990, .2, "triangle"]], commit: [[660, .05]],
  boss: [[392, .07], [523, .07], [659, .07], [1047, .32]], level: [[523, .09], [659, .09], [784, .09], [1047, .09], [1319, .35]],
  achievement: [[784, .1, "triangle"], [1047, .1, "triangle"], [1568, .32, "triangle"]],
};
let audio = null, soundOn = false;
const soundFlag = new Flag("office-sound");
soundOn = soundFlag.on;
export function sfx(kind) {
  if (!soundOn || !SFX[kind]) return;
  try {
    audio = audio || new AudioContext();
    let at = audio.currentTime + 0.01;
    for (const [f, d, type = "square"] of SFX[kind]) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.05, at); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(g).connect(audio.destination); o.start(at); o.stop(at + d);
      at += d * 0.9;
    }
  } catch (_) { /* audio unavailable */ }
}
function renderSoundBtn() { const b = document.getElementById("sndbtn"); b.innerHTML = `${soundOn ? "🔊" : "🔈"}<span class="lbl"> SON : ${soundOn ? "ON" : "OFF"}</span>`; b.classList.toggle("on", soundOn); }
document.getElementById("sndbtn").onclick = () => {
  soundOn = !soundOn;
  soundFlag.set(soundOn);
  renderSoundBtn(); sfx("pass");
};
renderSoundBtn();

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get audio() { return audio; }, set audio(v) { audio = v; }, get burst() { return burst; }, get drawEmployee() { return drawEmployee; }, get drawShelf() { return drawShelf; }, get evSeen() { return evSeen; }, get game() { return game; }, get gameEvents() { return gameEvents; }, get particles() { return particles; }, get planes() { return planes; }, get rain() { return rain; }, get renderTrophies() { return renderTrophies; }, get sfx() { return sfx; }, get smoke() { return smoke; }, get soundOn() { return soundOn; }, get stepFx() { return stepFx; }, get toast() { return toast; }, set toast(v) { toast = v; } });
