// The games on the computers: the chief sits at a dev's desk and plays a real little game, in a window over the office,
// with the keyboard. Each computer has its own (a snake on the retro one, invaders on the gamer one…); the best score
// is kept in this browser. Its screen in the office shows the same game.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief } from "../core/core.js";
import { crewAdd } from "../sims/crew.js";
import { sfx, toast } from "../sims/progress.js";

const W = 160, H = 100;
const rnd = (a, b) => a + Math.random() * (b - a);
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/* ---------- the games: init(), step(s, dt, keys, pressed), draw(g, s); s.score, s.over ---------- */
export const PC_GAMES = {
  snake: { name: "Snake", icon: "🐍", keys: "Flèches pour tourner", bg: "#0e1a10",
    init: () => ({ body: [[8, 5], [7, 5], [6, 5]], dir: [1, 0], next: [1, 0], food: [14, 7], acc: 0, score: 0 }),
    step(s, dt, k) {
      for (const [key, d] of [["ArrowUp", [0, -1]], ["ArrowDown", [0, 1]], ["ArrowLeft", [-1, 0]], ["ArrowRight", [1, 0]]]) if (k[key] && (d[0] !== -s.dir[0] || d[1] !== -s.dir[1])) s.next = d;
      s.acc += dt; if (s.acc < Math.max(60, 130 - s.score * 3)) return; s.acc = 0; s.dir = s.next;
      const h = [s.body[0][0] + s.dir[0], s.body[0][1] + s.dir[1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= 20 || h[1] >= 12 || s.body.some(([x, y]) => x === h[0] && y === h[1])) { s.over = true; return; }
      s.body.unshift(h);
      if (h[0] === s.food[0] && h[1] === s.food[1]) { s.score++; sfx("commit"); do s.food = [Math.floor(rnd(0, 20)), Math.floor(rnd(0, 12))]; while (s.body.some(([x, y]) => x === s.food[0] && y === s.food[1])); }
      else s.body.pop();
    },
    draw(g, s) { g.fillStyle = "#ff6b6b"; g.fillRect(s.food[0] * 8 + 1, s.food[1] * 8 + 2, 6, 6); s.body.forEach(([x, y], i) => { g.fillStyle = i ? "#3aaf4a" : "#7dff8a"; g.fillRect(x * 8, y * 8 + 2, 7, 7); }); } },
  breakout: { name: "Casse-briques", icon: "🧱", keys: "Flèches gauche / droite", bg: "#10142a",
    init() { const bricks = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) bricks.push({ x: 4 + c * 15.2, y: 10 + r * 6, w: 14, h: 5, r }); return { px: 64, bx: 80, by: 70, vx: 0.06, vy: -0.07, bricks, score: 0 }; },
    step(s, dt, k) {
      s.px = Math.max(0, Math.min(W - 30, s.px + ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * 0.15 * dt));
      s.bx += s.vx * dt; s.by += s.vy * dt;
      if (s.bx < 2 || s.bx > W - 2) s.vx *= -1; if (s.by < 2) s.vy = Math.abs(s.vy);
      if (s.by > 92 && s.by < 96 && s.bx > s.px - 2 && s.bx < s.px + 32) { s.vy = -Math.abs(s.vy) * 1.02; s.vx = (s.bx - (s.px + 15)) / 15 * 0.09; sfx("commit"); }
      if (s.by > H) s.over = true;
      const b = s.bricks.find(q => hit({ x: s.bx - 1.5, y: s.by - 1.5, w: 3, h: 3 }, q));
      if (b) { s.bricks.splice(s.bricks.indexOf(b), 1); s.vy *= -1; s.score++; if (!s.bricks.length) s.over = true; }
    },
    draw(g, s) { s.bricks.forEach(b => { g.fillStyle = ["#ff6b6b", "#ff9a3b", "#ffe14d", "#51cf66", "#3bc4ff"][b.r]; g.fillRect(b.x, b.y, b.w, b.h); }); g.fillStyle = "#f4f2ea"; g.fillRect(s.px, 94, 30, 3); g.fillRect(s.bx - 1.5, s.by - 1.5, 3, 3); } },
  invaders: { name: "Invaders", icon: "👾", keys: "Flèches pour bouger, Espace pour tirer", bg: "#06060e",
    init() { const al = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) al.push({ x: 14 + c * 16, y: 8 + r * 10, w: 9, h: 6, r }); return { x: 75, al, shots: [], bombs: [], dx: 0.02, cd: 0, score: 0 }; },
    step(s, dt, k, pressed) {
      s.x = Math.max(2, Math.min(W - 12, s.x + ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * 0.12 * dt)); s.cd -= dt;
      if (pressed[" "] && s.cd <= 0) { s.shots.push({ x: s.x + 4.5, y: 88, w: 1, h: 3 }); s.cd = 350; sfx("commit"); }
      const edge = s.al.some(a => (a.x + a.w > W - 2 && s.dx > 0) || (a.x < 2 && s.dx < 0));
      for (const a of s.al) { if (edge) a.y += 4; else a.x += s.dx * dt; } if (edge) s.dx *= -1.08;
      if (Math.random() < dt / 700 && s.al.length) { const a = s.al[Math.floor(rnd(0, s.al.length))]; s.bombs.push({ x: a.x + 4, y: a.y + 6, w: 1.5, h: 3 }); }
      s.shots.forEach(p => { p.y -= 0.16 * dt; }); s.bombs.forEach(p => { p.y += 0.07 * dt; });
      for (const p of s.shots) { const a = s.al.find(q => hit(p, q)); if (a) { s.al.splice(s.al.indexOf(a), 1); p.y = -9; s.score += 10; } }
      s.shots = s.shots.filter(p => p.y > -5); s.bombs = s.bombs.filter(p => p.y < H);
      if (s.bombs.some(p => hit(p, { x: s.x, y: 89, w: 10, h: 5 })) || s.al.some(a => a.y > 82)) s.over = true;
      if (!s.al.length) Object.assign(s, PC_GAMES.invaders.init(), { score: s.score + 100, x: s.x });
    },
    draw(g, s) { s.al.forEach(a => { g.fillStyle = ["#ff4fb8", "#b46bff", "#3bc4ff", "#4dff88"][a.r]; g.fillRect(a.x, a.y, a.w, a.h); g.fillStyle = "#06060e"; g.fillRect(a.x + 2, a.y + 2, 1.5, 1.5); g.fillRect(a.x + 5.5, a.y + 2, 1.5, 1.5); });
      g.fillStyle = "#4dff88"; g.fillRect(s.x, 90, 10, 4); g.fillRect(s.x + 4, 88, 2, 2); g.fillStyle = "#fff"; s.shots.forEach(p => g.fillRect(p.x, p.y, p.w, p.h)); g.fillStyle = "#ff6b6b"; s.bombs.forEach(p => g.fillRect(p.x, p.y, p.w, p.h)); } },
  flappy: { name: "Flappy Bug", icon: "🐞", keys: "Espace pour battre des ailes", bg: "#7fc4ff",
    init: () => ({ y: 45, vy: 0, pipes: [], t: 0, score: 0 }),
    step(s, dt, k, pressed) {
      if (pressed[" "] || pressed.ArrowUp) { s.vy = -0.16; sfx("commit"); }
      s.vy += 0.0006 * dt; s.y += s.vy * dt; s.t -= dt;
      if (s.t <= 0) { s.t = 1500; s.pipes.push({ x: W, gap: rnd(25, 70), done: false }); }
      for (const p of s.pipes) { p.x -= 0.05 * dt; if (!p.done && p.x < 30) { p.done = true; s.score++; } }
      s.pipes = s.pipes.filter(p => p.x > -14);
      const me = { x: 32, y: s.y - 3, w: 7, h: 6 };
      if (s.y < 0 || s.y > H || s.pipes.some(p => hit(me, { x: p.x, y: 0, w: 12, h: p.gap - 14 }) || hit(me, { x: p.x, y: p.gap + 14, w: 12, h: H }))) s.over = true;
    },
    draw(g, s) { g.fillStyle = "#51cf66"; s.pipes.forEach(p => { g.fillRect(p.x, 0, 12, p.gap - 14); g.fillRect(p.x, p.gap + 14, 12, H); });
      g.fillStyle = "#c0303a"; g.fillRect(32, s.y - 3, 7, 6); g.fillStyle = "#1c1c22"; g.fillRect(36, s.y - 2, 1.5, 1.5); g.fillRect(34, s.y - 3, 0.6, 6); g.fillStyle = "#3a9a3a"; g.fillRect(0, H - 4, W, 4); } },
  pong: { name: "Pong", icon: "🏓", keys: "Flèches haut / bas — premier à 7", bg: "#0a0a0a",
    init: () => ({ y: 40, ai: 40, bx: 80, by: 50, vx: 0.07, vy: 0.04, me: 0, cpu: 0, score: 0 }),
    step(s, dt, k) {
      s.y = Math.max(0, Math.min(H - 18, s.y + ((k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0)) * 0.12 * dt));
      s.ai += Math.sign(s.by - 9 - s.ai) * Math.min(Math.abs(s.by - 9 - s.ai), 0.065 * dt);
      s.bx += s.vx * dt; s.by += s.vy * dt; if (s.by < 1 || s.by > H - 1) s.vy *= -1;
      if (s.bx < 8 && s.by > s.y && s.by < s.y + 18 && s.vx < 0) { s.vx = Math.abs(s.vx) * 1.05; s.vy = (s.by - s.y - 9) / 9 * 0.07; sfx("commit"); }
      if (s.bx > W - 8 && s.by > s.ai && s.by < s.ai + 18 && s.vx > 0) { s.vx = -Math.abs(s.vx) * 1.03; }
      if (s.bx < 0 || s.bx > W) { if (s.bx > W) s.me++; else s.cpu++; Object.assign(s, { bx: 80, by: 50, vx: (s.bx > W ? -1 : 1) * 0.07, vy: rnd(-0.05, 0.05) }); s.score = s.me; }
      if (s.me >= 7 || s.cpu >= 7) s.over = true;
    },
    draw(g, s) { g.fillStyle = "#f4f2ea"; g.fillRect(4, s.y, 3, 18); g.fillRect(W - 7, s.ai, 3, 18); g.fillRect(s.bx - 1.5, s.by - 1.5, 3, 3); for (let y = 0; y < H; y += 8) g.fillRect(79.5, y, 1, 4);
      g.font = "10px monospace"; g.fillText(String(s.me), 60, 12); g.fillText(String(s.cpu), 94, 12); } },
  runner: { name: "Dino du build", icon: "🦖", keys: "Espace pour sauter", bg: "#f4f2ea",
    init: () => ({ y: 0, vy: 0, obs: [], t: 800, speed: 0.08, score: 0, dist: 0 }),
    step(s, dt, k, pressed) {
      if ((pressed[" "] || pressed.ArrowUp) && s.y === 0) { s.vy = 0.2; sfx("commit"); }
      s.vy -= 0.0007 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) s.vy = 0;
      s.t -= dt; s.speed += dt * 0.000004; s.dist += s.speed * dt; s.score = Math.floor(s.dist / 10);
      if (s.t <= 0) { s.t = rnd(700, 1500); s.obs.push({ x: W, w: rnd(4, 8), h: rnd(6, 12) }); }
      for (const o of s.obs) o.x -= s.speed * dt; s.obs = s.obs.filter(o => o.x > -10);
      if (s.obs.some(o => hit({ x: 20, y: 80 - s.y - 10, w: 8, h: 10 }, { x: o.x, y: 80 - o.h, w: o.w, h: o.h }))) s.over = true;
    },
    draw(g, s) { g.fillStyle = "#3a3a46"; g.fillRect(0, 80, W, 1); g.fillRect(20, 70 - s.y, 8, 10); g.fillRect(26, 67 - s.y, 5, 4); g.fillStyle = "#c0303a"; s.obs.forEach(o => g.fillRect(o.x, 80 - o.h, o.w, o.h)); } },
  racer: { name: "Course de nuit", icon: "🏎️", keys: "Flèches gauche / droite", bg: "#1c1c22",
    init: () => ({ lane: 1, x: 70, cars: [], t: 0, speed: 0.07, off: 0, score: 0, dist: 0 }),
    step(s, dt, k, pressed) {
      if (pressed.ArrowLeft) s.lane = Math.max(0, s.lane - 1); if (pressed.ArrowRight) s.lane = Math.min(2, s.lane + 1);
      s.x += (40 + s.lane * 30 - s.x) * Math.min(1, dt / 80); s.speed += dt * 0.000005; s.off = (s.off + s.speed * dt) % 20;
      s.dist += s.speed * dt; s.score = Math.floor(s.dist / 10); s.t -= dt;
      if (s.t <= 0) { s.t = rnd(450, 900); s.cars.push({ lane: Math.floor(rnd(0, 3)), y: -16, c: ["#3bc4ff", "#ffe14d", "#b46bff", "#51cf66"][Math.floor(rnd(0, 4))] }); }
      for (const c of s.cars) c.y += s.speed * 0.6 * dt; s.cars = s.cars.filter(c => c.y < H + 20);
      if (s.cars.some(c => hit({ x: s.x, y: 78, w: 12, h: 16 }, { x: 40 + c.lane * 30, y: c.y, w: 12, h: 16 }))) s.over = true;
    },
    draw(g, s) { g.fillStyle = "#2e2e38"; g.fillRect(30, 0, 92, H); g.fillStyle = "#f4f2ea"; for (let y = -20 + s.off; y < H; y += 20) { g.fillRect(64, y, 2, 10); g.fillRect(94, y, 2, 10); }
      s.cars.forEach(c => { g.fillStyle = c.c; g.fillRect(40 + c.lane * 30, c.y, 12, 16); }); g.fillStyle = "#ff3b3b"; g.fillRect(s.x, 78, 12, 16); g.fillStyle = "#ffe8a0"; g.fillRect(s.x + 1, 78, 3, 2); g.fillRect(s.x + 8, 78, 3, 2); } },
};
// which game on which computer
export const GAME_OF = { pcretro: "snake", pc: "breakout", pcgamer: "invaders", laptop: "flappy", pcaio: "pong", pcdual: "runner", pcultra: "racer" };

/* ---------- the window over the office ---------- */
let box = null, run = null;
const best = id => { try { return +localStorage.getItem(`office-pcgame-${id}`) || 0; } catch (_) { return 0; } };
const saveBest = (id, v) => { if (typeof DEMO !== "undefined" && DEMO) return; try { localStorage.setItem(`office-pcgame-${id}`, String(v)); } catch (_) { /* private window */ } };
function frame(t) {
  if (!run) return;
  const dt = Math.min(50, t - run.last); run.last = t;
  const g = run.g, game = PC_GAMES[run.id];
  if (!run.s.over) { game.step(run.s, dt, run.keys, run.pressed); run.pressed = {}; if (run.s.over) gameOver(); }
  else if (run.pressed[" "] || run.pressed.Enter) { run.s = game.init(); run.pressed = {}; }
  g.setTransform(run.k, 0, 0, run.k, 0, 0);  // the recent computers draw finely (ui/pcgames2.js: hd)
  g.fillStyle = game.bg; g.fillRect(0, 0, W, H); game.draw(g, run.s);
  if (run.s.over) { g.fillStyle = "#000a"; g.fillRect(0, 34, W, 30); g.fillStyle = "#fbaa08"; g.font = "10px monospace"; g.textAlign = "center"; g.fillText("GAME OVER", W / 2, 46); g.fillStyle = "#f4f2ea"; g.font = "7px monospace"; g.fillText("Espace : rejouer · Échap : quitter", W / 2, 57); g.textAlign = "left"; }
  box.querySelector(".sc").textContent = `Score ${run.s.score} · Record ${Math.max(best(run.id), run.s.score)}`;
  requestAnimationFrame(frame);
}
function gameOver() {
  const id = run.id, sc = run.s.score;
  if (sc > best(id)) { saveBest(id, sc); hub.countWeekly?.("pcrecord"); toast("RECORD 🏆", `${PC_GAMES[id].name} : ${sc}`, "Nouveau record sur cet ordinateur !"); sfx("achievement"); hub.addMoodlet?.(CHIEF_NAME, "pcrecord", "🏆", `Record à ${PC_GAMES[id].name}`, 5, 60); }
  else sfx("fail");
  crewAdd(CHIEF_NAME, { ennui: -8 });
}
export function openPcGame(type, seated = chief.at === "pc") {
  const id = GAME_OF[type] || "breakout", game = PC_GAMES[id];
  if (!box) {
    box = document.createElement("section"); box.id = "pcgame"; box.setAttribute("role", "dialog");
    box.innerHTML = `<header><b></b><span class="sc"></span><button class="x" title="Quitter (Échap)">×</button></header><canvas width="${W}" height="${H}"></canvas><footer></footer>`;
    document.body.append(box);
    box.querySelector(".x").onclick = () => closePcGame();
  }
  box.querySelector("b").textContent = `${game.icon} ${game.name}`; box.querySelector("footer").textContent = game.keys;
  box.hidden = false;
  const cv = box.querySelector("canvas"), k = game.hd ? 3 : 1;
  if (cv.width !== W * k) { cv.width = W * k; cv.height = H * k; }
  cv.classList.toggle("hd", !!game.hd);
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  run = { id, g, k, s: game.init(), keys: {}, pressed: {}, last: performance.now(), seated };
  if (chief.at === "pc") chief.pcUntil = Infinity;  // he stays seated while he plays
  requestAnimationFrame(frame);
}
export function closePcGame() {
  if (!run) return;
  run = null; box.hidden = true;
  if (chief.at === "pc") chief.pcUntil = performance.now();  // back to the podium (build.js stepBuild)
}
addEventListener("keydown", ev => {
  if (!run) return;
  if (ev.key === "Escape") { ev.stopImmediatePropagation(); closePcGame(); return; }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Enter"].includes(ev.key)) { ev.preventDefault(); ev.stopImmediatePropagation(); if (!run.keys[ev.key]) run.pressed[ev.key] = true; run.keys[ev.key] = true; }
}, true);
addEventListener("keyup", ev => { if (run) run.keys[ev.key] = false; }, true);
// the chief left the computer (the team needs him): the game closes
setInterval(() => { if (run?.seated && chief.at !== "pc") closePcGame(); }, 500);
export const pcGameOn = () => !!run;

provide({ get GAME_OF() { return GAME_OF; }, get PC_GAMES() { return PC_GAMES; }, get openPcGame() { return openPcGame; }, get pcGameOn() { return pcGameOn; } });
