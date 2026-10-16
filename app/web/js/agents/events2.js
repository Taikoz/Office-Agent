// Office signals from the real work: usage gauge, weather at the window (today's tests), security alarm (high/critical
// findings), cake on a level up, the team plant (MRs of the week), and whacking the test boss (cosmetic).

import { hub, provide } from "../hub.js";
import { LANE, chief, clip, ctx, current, cv, ents, fromDesk, px, text, toDesk } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { bubble } from "../world/scene.js";
import { burst, game, sfx, toast } from "../sims/progress.js";

/* usage: tokens processed over a sliding 5 h window and 7 days, all sessions; the subscription's exact cap is not known */
const kTok = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n);
function renderUsage() {
  const u = game?.usage, box = document.getElementById("usage"), ratioEl = document.getElementById("usage-ratio");
  if (!u) { box.textContent = ""; ratioEl.textContent = ""; return; }
  const ratio = u.h5Prev ? u.h5 / u.h5Prev : null, max = Math.max(1, ...u.hourly), h = new Date().getHours();
  ratioEl.textContent = ratio ? `×${ratio.toFixed(1)} vs hier` : "";
  ratioEl.className = ratio > 1.3 ? "up" : ratio && ratio < 0.8 ? "down" : "";
  box.innerHTML = `5 h : <b>${kTok(u.h5)}</b> tokens · 7 j : ${kTok(u.d7)}
    <div class="bars">${u.hourly.map((v, i) => `<i class="${i === 23 ? "now" : ""}" style="height:${Math.max(2, Math.round(100 * v / max))}%" title="${(h - 23 + i + 24) % 24} h : ${kTok(v)} tokens"></i>`).join("")}</div>
    <div class="muted" title="Entrée + écriture de cache + sortie, hors lecture de cache. Le plafond exact de l'abonnement n'est pas exposé : c'est une tendance, pas un pourcentage du quota.">tokens/heure sur 24 h · tendance, pas le quota exact</div>`;
}

/* weather at the window, from today's test runs (drawn by drawSky in art.js) */
export function weather() {
  const d = game?.today;
  if (!d || !(d.pass + d.fail)) return "clear";
  if (!d.fail) return "sun";
  if (d.fail > d.pass) return "storm";
  return d.fail * 2 > d.pass ? "rain" : "cloud";
}

/* security alarm: a new high or critical finding → beacon, red pulse, the auditor runs to the lead */
let alarmSeen = null, alarm = null;
const SEV_FR = { critical: "critique", high: "haute" };
const alarmSlot = new SaveSlot("office-alarms", null);  // null: first visit, no replay of the past
if (alarmSlot.data) alarmSeen = new Set(alarmSlot.data);
function checkAlerts() {
  const list = game?.alerts || [];
  const first = alarmSeen === null;  // first visit: no replay of the past
  if (first) alarmSeen = new Set();
  for (const f of list) {
    const id = `${f.id}:${f.t}`;
    if (alarmSeen.has(id)) continue;
    alarmSeen.add(id);
    if (first) continue;
    alarm = { until: performance.now() + 20000, f };
    sfx("fail"); setTimeout(() => sfx("fail"), 400);
    hub.notify(`🚨 Faille ${SEV_FR[f.severity] || f.severity} trouvée`, `${f.vulnerability || ""} — ${f.repo || ""} ${f.file || ""}`, current, null, true);
    const auditor = [...ents.values()].find(e => !e.leaving && e.seated && /security|audit/.test(e.agent.type));
    if (auditor) {
      auditor.seated = false;
      auditor.path = [...fromDesk(auditor.desk), { x: 212, y: LANE }, { x: 212, y: 101, wait: 7000, pose: "alarm" }, { x: 212, y: LANE }, ...toDesk(auditor.desk)];
    }
    chief.wave = performance.now() + 4000; chief.until = performance.now() + 8000; chief.bubble = `🚨 ${clip(f.vulnerability || "faille", 26)} !`;
  }
  alarmSlot.save([...alarmSeen].slice(-200));
}
export function drawAlarm(t) {
  if (!alarm || t > alarm.until) { alarm = null; return; }
  const on = Math.floor(t / 250) % 2 === 0;
  px(337, 2, 8, 4, "#5a1010"); px(338, 0, 6, 3, on ? "#ff3b3b" : "#7a1a1a");
  if (on) { ctx.fillStyle = "rgba(255, 40, 40, 0.10)"; ctx.fillRect(0, 0, cv.width, cv.height); }
}

/* cake when a specialty levels up: the seated devs gather around it */
export let cake = null;
const CAKE = { x: 120, y: 100 }, CAKE_SPOTS = [{ x: 104, y: 103 }, { x: 136, y: 103 }, { x: 110, y: 92 }, { x: 130, y: 92 }, { x: 96, y: 96 }, { x: 144, y: 96 }];
export function startCake(label, lv) {
  if (hub.focusMode) return;
  const t = performance.now();
  cake = { until: t + 20000, label, lv };
  burst(CAKE.x, CAKE.y - 6, ["#fbaa08", "#ff6b6b", "#51cf66", "#5aa9ff"], 30, 1.6);
  chief.wave = t + 3000; chief.until = t + 6000; chief.bubble = `🎂 ${label} niveau ${lv} !`;
  const devs = [...ents.values()].filter(e => e.seated && !e.leaving && !e.asking && !e.errand && !e.coffee && !e.visiting && !e.standup);
  devs.slice(0, CAKE_SPOTS.length).forEach((e, i) => {
    e.standup = true; e.seated = false;
    e.path = [...fromDesk(e.desk), { x: CAKE_SPOTS[i].x, y: LANE }, { ...CAKE_SPOTS[i], on: x => { x.pose = "cake"; } }];
  });
}
export function stepCake(t) {
  if (!cake || t < cake.until) return;
  cake = null;
  for (const e of ents.values()) if (e.pose === "cake" || (e.standup && !hub.standup.on)) hub.standupBack(e);
}
export function drawCake(t) {
  if (!cake || hub.focusMode) return;
  const { x, y } = CAKE, flame = Math.floor(t / 150) % 2;
  ART.cake.draw(x - 10, y - 9, { flame });
  if (Math.floor(t / 3000) % 2) bubble(x, y - 14, `🎂 ${cake.label} niv. ${cake.lv}`, "#f4c2d7");
}

/* team plant: grows with the MRs of the week, wilts when nothing shipped for 2 days */
function drawTeamPlant(t) {
  const n = Math.min(10, game?.week?.mr || 0), last = game?.week?.lastMr, dry = !last || Date.now() / 1000 - last > 2 * 86_400;
  const x = 12, base = 214, f = Math.floor(t / 900) % 2;
  ART.teamplant.draw(x - 10, base - 30, { n, dry, frame: f });
  text(dry ? `MR 7 j : ${n} · à arroser` : `MR 7 j : ${n}`, x + 9, base + 2, dry ? "#d6a77f" : "#a5e6b0", 3.6);
}

/* whack the test boss: purely cosmetic, the real fix is still the dev's job */
const floaters = [];
export function hitBoss(x, y) {
  for (const e of ents.values()) {
    if (!e.agent.game?.boss || e.leaving || !e.seated) continue;
    const bx = e.desk.x - 28, by = e.desk.y + 10;
    if (Math.abs(x - bx) <= 7 && y >= by - 10 && y <= by + 3) return `boss:${e.agent.id}`;
  }
  return null;
}
function whackBoss(id) {
  const e = ents.get(id); if (!e) return;
  const t = performance.now(), bx = e.desk.x - 28, by = e.desk.y + 4;
  e.bossHitAt = t; e.bossHits = (e.bossHits || 0) + 1;
  burst(bx, by, ["#9a54c8", "#7a3aa8", "#fff"], 10, 1.2);
  floaters.push({ x: bx, y: by - 6, t0: t, text: e.bossHits % 10 === 0 ? "COMBO !" : "-1" });
  sfx("commit");
  if (e.bossHits % 10 === 0) toast("CHASSE AU BUG", `${e.bossHits} coups !`, "Le bug tient bon : seuls des tests verts le battront pour de bon.");
}
export function drawFloaters(t) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i], k = (t - f.t0) / 900;
    if (k > 1) { floaters.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - k; text(f.text, f.x, f.y - k * 8, "#ffd43b", 4.6, "center"); ctx.globalAlpha = 1;
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get alarm() { return alarm; }, get cake() { return cake; }, set cake(v) { cake = v; }, get checkAlerts() { return checkAlerts; }, get drawTeamPlant() { return drawTeamPlant; }, get renderUsage() { return renderUsage; }, get startCake() { return startCake; }, get weather() { return weather; }, set weather(v) { weather = v; }, get whackBoss() { return whackBoss; } });
