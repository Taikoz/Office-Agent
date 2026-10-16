// Household funds, Sims style (§ simflouz): each mission delivered pays the team a salary that grows with its complexity
// (kind of agent, tools used, files changed, time spent, green tests, merge request, errors). The money buys the shop's
// decor and the groceries for cooking. Kept in this browser (never in demo); nothing here touches the agents.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, TEAM, agentRef, ctx, curSession, ents, firstLoad, specialty, text } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crew, crewAdd, mate } from "./crew.js";
import { esc, isStuck } from "../core/data.js";
import { SFX, burst, sfx, toast } from "./progress.js";
import { budgetOf, budgetsOn, overBudget } from "../agents/budget.js";
import { gainSkill, skillInfo, skillLevel, skillOf } from "./skills.js";

const WALLET_KEY = "office-wallet";
// 2: a new game, 25 000 § to furnish the empty rooms (build.js)
export let wallet = new SaveSlot(WALLET_KEY, { funds: 25000, earned: 0, paid: [], log: [], init: false }, { version: 2, migrations: { 2: v => ({ ...v, funds: 25000, log: [] }) } }).data;
export const saveWallet = () => SaveSlot.get(WALLET_KEY).save(wallet);
export const fmtSim = n => `§ ${Math.round(n).toLocaleString("fr-FR")}`;
SFX.cash = [[1319, .05], [1568, .05], [2093, .2, "triangle"]];

/* ---------- salary: the more complex the mission, the better it pays ---------- */
const TYPE_PAY = { "feature-builder": 400, "tech-lead": 350, "audit-security-code": 350, "guardian-test-writer": 300, "e2e-test-writer": 300,
  "security-auditor": 250, "mr-reviewer": 150, "youtrack-board-cleaner": 100 };
const STARS = [[400, 1], [800, 2], [1400, 3], [2200, 4], [Infinity, 5]];
function salaryOf(a) {
  const g = a.game || {}, mins = g.first && g.last ? Math.max(0, g.last - g.first) / 60 : 0;
  const parts = [
    [`Mission ${specialty(a.type)}`, TYPE_PAY[a.type] ?? 200],
    [`${a.tools || 0} outils`, Math.min(600, (a.tools || 0) * 4)],
    [`${g.fileCount || 0} fichier(s) modifié(s)`, Math.min(800, (g.fileCount || 0) * 40)],
    [`${Math.round(mins)} min de travail`, Math.min(600, Math.round(mins * 6))],
    [`${Math.round((a.tokens || 0) / 1000)}k tokens`, Math.min(400, Math.round((a.tokens || 0) / 2000))],
    ["Tests verts", g.tests?.ok ? Math.min(300, 50 + (g.tests.n || 0) * 5) : 0],
    ["Merge request", g.mr ? 250 : 0],
    [`${a.errors || 0} erreur(s)`, -Math.min(200, (a.errors || 0) * 10)],
  ].filter(p => p[1]);
  const base = parts.reduce((s, p) => s + p[1], 0), stars = STARS.find(([max]) => base < max)[1];
  const who = crew.ids[a.id], happy = who && mate(who).moral >= 80;
  if (happy) parts.push(["Bonne humeur +10 %", Math.round(base * 0.1)]);
  // efficiency: fast, clean and cheap pays more; going round in circles or over budget costs (moods.js, budget.js)
  if (mins > 0 && mins < 15 && (a.tools || 0) >= 5) parts.push(["Rapide (< 15 min) +15 %", Math.round(base * 0.15)]);
  if (!a.errors && (a.tools || 0) >= 5) parts.push(["Zéro erreur +10 %", Math.round(base * 0.1)]);
  if (budgetsOn() && g.cost > 0 && g.cost <= budgetOf(a.type) * 0.5) parts.push(["Économe (< 50 % du budget) +10 %", Math.round(base * 0.1)]);
  if (overBudget(a)) parts.push(["Budget dépassé −15 %", -Math.round(base * 0.15)]);
  if (hub.wasStuck(a)) parts.push(["A tourné en rond −20 %", -Math.round(base * 0.2)]);
  const grade = TEAM.includes(who) ? hub.gradeOf(who) : 0;  // careers.js: +5 % per grade above Junior
  if (grade) parts.push([`Grade ${hub.CAREER[grade][0]} +${grade * 5} %`, Math.round(base * 0.05 * grade)]);
  const lvl = TEAM.includes(who) ? skillLevel(who, skillOf(a.type)) : 1;  // expertise (skills.js): +5 % per level above 1
  if (lvl > 1) parts.push([`Expertise ${skillInfo(skillOf(a.type))[2]} niv. ${lvl} +${(lvl - 1) * 5} %`, Math.round(base * 0.05 * (lvl - 1))]);
  const total = Math.max(50, Math.round(parts.reduce((s, p) => s + p[1], 0) / 10) * 10);
  return { total, stars, parts };
}
const starText = n => "★".repeat(n) + "☆".repeat(5 - n);
// on a mission card: what the mission pays (estimated while it runs)
function salaryLine(a) {
  const key = payKey(a), paid = wallet.log.find(l => l.key === key);
  if (paid) return `<div class="pay">💰 +${fmtSim(paid.total)} versés · <span title="complexité">${starText(paid.stars)}</span></div>`;
  if (!["working", "asking", "blocked", "done"].includes(a.status)) return "";
  const s = salaryOf(a);
  return `<div class="pay muted">💰 ~${fmtSim(s.total)} à la livraison · <span title="complexité">${starText(s.stars)}</span></div>`;
}

/* ---------- payday: watch every session for missions that just got delivered ---------- */
let payKeys = null;
// agents as shown in the office (ids of the current view); the key stays the same whatever the view: session, agent, start
export const payKey = a => `${agentRef(a.id).join("|")}|${a.started || ""}`;
function checkPayday() {
  if (firstLoad) return;  // the office is not built yet
  if (!payKeys) payKeys = new Set(wallet.paid);
  const done = (curSession()?.agents || []).filter(a => a.status === "done");
  if (!wallet.init) {  // first visit: past missions are not paid again, only those delivered from now on
    for (const a of done) payKeys.add(payKey(a));
    wallet.init = true; return persistPaid();
  }
  for (const a of done) if (!payKeys.has(payKey(a))) pay(a);
}
function persistPaid() { wallet.paid = [...payKeys].slice(-400); saveWallet(); }
function pay(a) {
  const key = payKey(a); payKeys.add(key);
  const s = salaryOf(a), who = crew.ids[a.id] || specialty(a.type);
  earn(s.total);
  wallet.earned += s.total;
  wallet.log.unshift({ key, t: Date.now(), who, ticket: a.ticket || "", type: a.type, total: s.total, stars: s.stars, parts: s.parts });
  wallet.log = wallet.log.slice(0, 60);
  persistPaid();
  sfx("cash");
  toast("SALAIRE", `${who} a livré${a.ticket ? ` ${a.ticket}` : ""} : +${fmtSim(s.total)}`, `Complexité ${starText(s.stars)} · ${s.parts.slice(1, 4).map(p => p[0]).join(" · ")}`);
  if (crew.ids[a.id]) crewAdd(crew.ids[a.id], { moral: 4 + s.stars * 2 });
  gainSkill(a, s.stars);
  if (crew.ids[a.id]) hub.careerMission(crew.ids[a.id]);  // careers.js
  hub.countWeekly?.("deliver");  // weekly.js
  hub.buildDebrief(a);  // debrief.js
  if (crew.ids[a.id]) hub.wantEvent(crew.ids[a.id], "deliver");
  const e = ents.get(a.id);
  if (e) { const x = e.seated ? e.desk.x : e.x, y = e.seated ? e.desk.y - 22 : e.y - 30; cashFx.push({ x, y, txt: `+${fmtSim(s.total)}`, born: performance.now() }); burst(x, y, ["#fbaa08", "#ffd43b", "#51cf66"], 14 + s.stars * 4); }
}
setInterval(checkPayday, 2000);

/* ---------- spending: shop and groceries; the funds count up or down on screen ---------- */
let shownFunds = wallet.funds, fundsFlash = null;
export function earn(n) { wallet.funds += n; fundsFlash = { txt: `+${fmtSim(n)}`, up: true, at: performance.now() }; saveWallet(); }
export function spend(n, what) {
  if (wallet.funds < n) { toast("ARGENT", "Pas assez de simflouz", `${what} : ${fmtSim(n)}, il reste ${fmtSim(wallet.funds)}.`); return false; }
  wallet.funds -= n; fundsFlash = { txt: `−${fmtSim(n)}`, up: false, at: performance.now() }; saveWallet(); sfx("commit");
  wallet.log.unshift({ key: `spend:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: what, total: -n });
  wallet.log = wallet.log.slice(0, 60);
  return true;
}
export const canAfford = n => wallet.funds >= n;

// floating "+§ 840" over the desk of the dev who got paid (office canvas)
export const cashFx = [];
export function drawCashFx(t) {
  for (let i = cashFx.length - 1; i >= 0; i--) {
    const f = cashFx[i], k = (t - f.born) / 2600;
    if (k >= 1) { cashFx.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, (1 - k) * 2);
    text(f.txt, f.x + 0.4, f.y - k * 18 + 0.4, "#1c1c24", 7, "center");
    text(f.txt, f.x, f.y - k * 18, "#7dff9a", 7, "center");
    ctx.globalAlpha = 1;
  }
}

/* ---------- the funds by your sim (bottom-left) and the statement ---------- */
const fundsBtn = document.getElementById("live-funds"), ledger = document.getElementById("ledger");
function renderFunds() {
  const diff = wallet.funds - shownFunds;
  shownFunds = Math.abs(diff) < 1 ? wallet.funds : shownFunds + diff * 0.12;  // counts up, like the Sims
  fundsBtn.querySelector("b").textContent = fmtSim(shownFunds);
  const fl = fundsBtn.querySelector(".flash"), on = fundsFlash && performance.now() - fundsFlash.at < 2500;
  fl.textContent = on ? fundsFlash.txt : ""; fl.className = `flash${on ? fundsFlash.up ? " up" : " dn" : ""}`;
}
setInterval(renderFunds, 60);
function renderLedger() {
  const today = new Date().toDateString(), log = wallet.log;
  const inToday = log.filter(l => !l.spend && new Date(l.t).toDateString() === today).reduce((s, l) => s + l.total, 0);
  const outToday = log.filter(l => l.spend && new Date(l.t).toDateString() === today).reduce((s, l) => s - l.total, 0);
  ledger.innerHTML = `<div class="lhead"><b>💰 ${fmtSim(wallet.funds)}</b><button class="x" data-ledger="close" title="Fermer">×</button></div>
    <div class="muted">Aujourd'hui : <span class="in">+${fmtSim(inToday)}</span> · <span class="out">−${fmtSim(outToday)}</span> · gagnés en tout : ${fmtSim(wallet.earned)}</div>
    <div class="lrows">${log.length ? log.slice(0, 25).map(l => l.spend
      ? `<div class="lrow out"><span>🛒 ${esc(l.label)}</span><b>−${fmtSim(-l.total)}</b></div>`
      : `<details class="lrow"><summary><span>✅ ${esc(l.who)}${l.ticket ? ` · ${esc(l.ticket)}` : ""} <small>${starText(l.stars)}</small></span><b class="in">+${fmtSim(l.total)}</b></summary>
        <ul>${l.parts.map(([lab, v]) => `<li><span>${esc(lab)}</span><span class="${v < 0 ? "out" : ""}">${v < 0 ? "−" : "+"}${fmtSim(Math.abs(v))}</span></li>`).join("")}</ul></details>`).join("")
      : `<p class="muted">Pas encore de salaire : chaque mission livrée par un agent rapporte de l'argent, d'autant plus qu'elle est complexe (outils, fichiers, durée, tests, MR).</p>`}</div>`;
}
function toggleLedger(open = ledger.hidden) { ledger.hidden = !open; fundsBtn.setAttribute("aria-expanded", open); if (open) renderLedger(); }
fundsBtn.onclick = () => toggleLedger();
ledger.addEventListener("click", ev => { if (ev.target.closest('[data-ledger="close"]')) toggleLedger(false); });
document.addEventListener("pointerdown", ev => { if (!ledger.hidden && !ledger.contains(ev.target) && !fundsBtn.contains(ev.target)) toggleLedger(false); });

// a mission going round in circles costs money while it lasts: § 10 a minute, shown over the desk (moods.js isStuck)
setInterval(() => {
  for (const a of curSession()?.agents || []) {
    if (!isStuck(a) || a.status !== "working") continue;
    const n = Math.min(10, wallet.funds); if (!n) continue;
    wallet.funds -= n; saveWallet();
    const who = crew.ids[a.id] || specialty(a.type), key = `drain:${a.id}`;
    const row = wallet.log.find(l => l.key === key);
    if (row) { row.total -= n; row.t = Date.now(); } else wallet.log.unshift({ key, t: Date.now(), who, spend: true, label: `Boucle de ${who} : tokens perdus`, total: -n });
    const e = ents.get(a.id); if (e) cashFx.push({ x: e.desk.x, y: e.desk.y - 22, txt: `−${fmtSim(n)}`, born: performance.now() });
    fundsFlash = { txt: `−${fmtSim(n)}`, up: false, at: performance.now() };
  }
}, 60000);

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get fmtSim() { return fmtSim; }, get salaryLine() { return salaryLine; }, get spend() { return spend; }, get wallet() { return wallet; } });
