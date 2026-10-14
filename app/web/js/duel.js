"use strict";
// Ping-pong duels against a dev; the baby-foot is in foosball.js, the darts in darts.js.

/* mini-games in the break room: ping-pong or baby-foot against a dev, first to 5 */
let duels = store("office-duels", { scores: {}, log: [] });
let match = null;
function challenge(name, skin) {
  if (!loungers.has(name)) return;
  if (skin === "darts") match = { name, skin, phase: "menu", ps: 0, as: 0, over: 0, look: loungers.get(name).look };
  else if (skin === "babyfoot") match = { name, skin, ps: 0, as: 0, over: 0, look: loungers.get(name).look, ...footInit() };
  else match = { name, skin, ps: 0, as: 0, py: 116, ay: 116, ball: null, serveAt: performance.now() + 900, over: 0, look: loungers.get(name).look };
  view = "game"; closePanel(); loungeSay(name, "Prépare-toi à perdre !");
}
function serve(dir) { const a = (Math.random() - 0.5) * 0.6; match.ball = { x: 200, y: 116, vx: dir * 0.13 * Math.cos(a), vy: 0.13 * Math.sin(a) }; }
const keysDown = new Set();
addEventListener("keydown", ev => { if (view === "game" && ["ArrowUp", "ArrowDown", "w", "s", "z"].includes(ev.key)) { keysDown.add(ev.key); ev.preventDefault(); } });
addEventListener("keyup", ev => keysDown.delete(ev.key));
function stepGame(dt, t) {
  const m = match; if (!m) return;
  if (m.skin === "darts") return stepDarts(dt, t);
  if (m.skin === "babyfoot") return stepFoot(dt, t);
  if (m.over) { if (t > m.over) endMatch(); return; }
  if (keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("z")) m.py -= 0.16 * dt;
  if (keysDown.has("ArrowDown") || keysDown.has("s")) m.py += 0.16 * dt;
  if (m.mouseY != null) m.py += Math.max(-0.2 * dt, Math.min(0.2 * dt, m.mouseY - m.py));
  m.py = Math.max(52, Math.min(180, m.py));
  if (!m.ball) { if (t > m.serveAt) serve(Math.random() < 0.5 ? -1 : 1); return; }
  const b = m.ball, st = mate(m.name), skill = 0.07 * (1 - st.fatigue / 250) * (0.85 + st.moral / 400);
  if (b.vx > 0) m.ay += Math.max(-skill * dt, Math.min(skill * dt, b.y - m.ay)); else m.ay += Math.max(-0.03 * dt, Math.min(0.03 * dt, 116 - m.ay));
  m.ay = Math.max(52, Math.min(180, m.ay));
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (b.y < 42 || b.y > 190) { b.vy = -b.vy; b.y = Math.max(42, Math.min(190, b.y)); }
  const paddle = (px0, py0, side) => {
    if (Math.abs(b.x - px0) < 3 && Math.abs(b.y - py0) < 13 && Math.sign(b.vx) === side) {
      b.vx = -b.vx * 1.06; b.vy += (b.y - py0) * 0.006; b.x = px0 - side * 3; sfx("commit");
    }
  };
  paddle(40, m.py, -1); paddle(360, m.ay, 1);
  if (b.x < 20 || b.x > 380) {
    if (b.x < 20) m.as++; else m.ps++;
    sfx(b.x < 20 ? "fail" : "pass"); m.ball = null; m.serveAt = t + 1100;
    if (m.ps >= 5 || m.as >= 5) m.over = t + 2600;
  }
}
function endMatch() {
  const m = match, won = m.ps > m.as, sc = duels.scores[m.name] || { w: 0, l: 0 };
  if (won) sc.w++; else sc.l++;
  duels.scores[m.name] = sc;
  duels.log = [...(duels.log || []), { t: Date.now(), name: m.name, won, skin: m.skin }].filter(x => Date.now() - x.t < 35 * 86_400_000);
  save("office-duels", duels);
  crewAdd(m.name, won ? { moral: -3, ennui: -8 } : { moral: 8, ennui: -8 });
  view = "lounge"; match = null;
  loungeSay(m.name, won ? `Revanche, ${CHIEF_NAME} ! 😤` : "GG chef, trop facile 😎");
  const l = loungers.get(m.name); if (l) l.lastDuel = won ? "lost" : "won";
}
/* weekly tournament: every duel counts, 3 points for the winner, 1 for the loser; last week's champion wears the cup */
function weekStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
function tournament(offsetWeeks = 0) {
  const from = weekStart(Date.now()) - offsetWeeks * 7 * 86_400_000, to = from + 7 * 86_400_000, pts = {};
  for (const x of duels.log || []) {
    if (x.t < from || x.t >= to) continue;
    const [win, lose] = x.won ? [CHIEF_NAME, x.name] : [x.name, CHIEF_NAME];
    pts[win] = (pts[win] || 0) + 3; pts[lose] = (pts[lose] || 0) + 1;
  }
  return Object.entries(pts).sort((a, b) => b[1] - a[1]);
}
const champion = () => tournament(1)[0]?.[0] || null;
function drawTournament(t) {
  const x = 44, y = 10, w = 50, h = 48, rank = tournament(0);
  art(`slate:${w}x${h}`, x - 1, y - 1, w + 2, h + 2, () => slateArt(w, h));
  text("🏆 TOURNOI", x + w / 2, y + 1.5, "#fbaa08", 4.4, "center");
  text("cette semaine", x + w / 2, y + 7, "#adadad", 3.4, "center");
  if (!rank.length) text("aucun duel", x + w / 2, y + 22, "#d5eeff", 4, "center");
  rank.slice(0, 4).forEach(([name, p], i) => {
    text(`${i + 1}. ${clip(name, 8)}`, x + 3, y + 13 + i * 8, i ? "#d5eeff" : "#fbaa08", 4.2);
    text(String(p), x + w - 3, y + 13 + i * 8, "#f7f7f7", 4.2, "right");
  });
  const c = champion();
  if (c) text(`champion : ${clip(c, 9)}`, x + w / 2, y + h - 6, "#51cf66", 3.4, "center");
}

function renderGame(t) {
  const m = match;
  if (m.skin === "darts") return renderDarts(t);
  if (m.skin === "babyfoot") return renderFoot(t);
  px(0, 0, W, H, "#040c26");
  px(14, 38, 372, 156, "#f7f7f7"); px(16, 40, 368, 152, "#1f8a5a");
  px(199.4, 40, 1.2, 152, "#f7f7f7"); px(16, 115.5, 368, 0.6, "#f7f7f7");
  const pad = (x, y, c) => px(x - 1.5, y - 11, 3, 22, c);
  pad(40, m.py, "#fbaa08"); pad(360, m.ay, m.look.shirt);
  if (m.ball) px(m.ball.x - 1.5, m.ball.y - 1.5, 3, 3, "#f7f7f7");
  text(`${CHIEF_NAME}  ${m.ps}  —  ${m.as}  ${m.name}`, 200, 12, "#f7f7f7", 9, "center");
  text("PING-PONG · premier à 5", 200, 26, "#fbaa08", 4.5, "center");
  text("Souris ou ↑ / ↓ (Z/S) · Échap pour abandonner", 200, 210, "#adadad", 4.2, "center");
  drawPerson(26, 230, CHIEF_LOOK, { tux: true, smile: true }); drawPerson(374, 230, m.look, { smile: m.as >= m.ps });
  if (m.over) { px(110, 96, 180, 40, "#081746"); px(112, 98, 176, 36, m.ps > m.as ? "#51cf66" : "#ff6b6b");
    text(m.ps > m.as ? "VICTOIRE !" : `${m.name.toUpperCase()} GAGNE`, 200, 102, "#081746", 10, "center"); text(`${m.ps} — ${m.as}`, 200, 120, "#081746", 6, "center"); }
}
