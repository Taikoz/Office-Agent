// While you were away: when the office opens (or comes back on screen) two hours or more after it was last seen, what
// the agents did since — delivered, MRs, To Verify, blocked, the time and the cost — and what waits for you now (the
// questions: answered from the phone). Also from the menu (☀️ PENDANT TON ABSENCE). The reports of the days covered
// (/api/report, agents/report.js) cut at the last visit; when the page was last seen is kept in this browser.

import { hub } from "../hub.js";
import { CHIEF_NAME, data } from "../core/core.js";
import { esc, money } from "../core/data.js";
import { demoReport, durH, isoDay, reportHtml } from "../agents/report.js";

const KEY = "office-lastseen", GAP = 2 * 3600e3;
const lastSeen = () => { try { return +localStorage.getItem(KEY) || 0; } catch (_) { return 0; } };
const markSeen = () => { if (!DEMO) try { localStorage.setItem(KEY, String(Date.now())); } catch (_) { /* storage blocked */ } };
const away = lastSeen();  // the visit before this one
setInterval(() => { if (!document.hidden) markSeen(); }, 60000);
addEventListener("pagehide", markSeen);
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hiddenAt = Date.now(); markSeen(); return; }
  if (hiddenAt && Date.now() - hiddenAt >= GAP) openMorning(hiddenAt, true);  // left open all night, back on screen
  markSeen();
});

const box = document.createElement("section");
box.id = "morning"; box.className = "overlay"; box.hidden = true; box.setAttribute("aria-label", "Pendant ton absence");
document.querySelector("main").append(box);
box.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.m === "close") hub.openOverlay("morning", false);
  if (b.dataset.m === "answer") { hub.openOverlay("morning", false); hub.openPhone?.("agents"); }
  if (b.dataset.m === "report") document.getElementById("reportbtn").click();
});

// what happened since `since` (ms): the runs of the days covered, the last moves after it
async function sinceThen(since) {
  if (DEMO) return demoReport(isoDay(0));
  const days = Math.min(5, Math.ceil((Date.now() - since) / 86400e3) + 1);
  const reps = await Promise.all(Array.from({ length: days }, (_, i) => fetch(`/api/report?day=${isoDay(i)}`).then(r => r.json()).catch(() => null)));
  const byId = new Map();
  for (const r of reps) for (const x of r?.runs || []) byId.set(`${x.session}|${x.id}`, x);
  const runs = [...byId.values()].filter(x => (x.last || 0) * 1000 >= since);
  return { runs, delivered: runs.filter(x => x.status === "done"), mrs: runs.filter(x => x.mr), verified: [...new Set(runs.filter(x => x.verify && x.ticket).map(x => x.ticket))],
    stuck: runs.filter(x => ["blocked", "gone"].includes(x.status)), active: runs.filter(x => ["working", "asking"].includes(x.status)),
    questions: runs.reduce((s, x) => s + (x.asks || 0), 0), seconds: runs.reduce((s, x) => s + Math.max(0, (x.last || 0) - (x.first || x.last || 0)), 0),
    cost: runs.reduce((s, x) => s + (x.cost || 0), 0) };
}
const ago = ms => { const h = Math.round(ms / 3600e3); return h < 48 ? `${h} h` : `${Math.round(h / 24)} jours`; };

// auto: only when something happened or waits
export async function openMorning(since = away || Date.now() - 12 * 3600e3, auto = false) {
  const r = await sinceThen(since), waiting = data.questions?.length || 0;
  if (auto && !r.runs.length && !waiting) return;
  const when = new Date(since).toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" });
  const hour = new Date().getHours(), hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon retour" : "Bonsoir";
  box.innerHTML = `<div class="perfhead"><span>☀️ PENDANT TON ABSENCE <span class="muted">${DEMO ? "(démo)" : `depuis ${esc(when)} · ${ago(Date.now() - since)}`}</span></span>
      <button class="x" data-m="report" title="Le rapport complet du jour">Rapport du jour</button><button class="x" data-m="close" title="Fermer (Échap)">×</button></div>
    <div class="mhello"><b>${hello}, ${esc(CHIEF_NAME)} !</b>
      <span>${r.runs.length ? `${r.runs.length} mission${r.runs.length > 1 ? "s" : ""} ont bougé : ${r.delivered.length} livrée${r.delivered.length > 1 ? "s" : ""}, ${r.mrs.length} MR, ${r.stuck.length} bloquée${r.stuck.length > 1 ? "s" : ""}${r.seconds ? `, ${durH(r.seconds)} de travail` : ""}${r.cost ? `, ${money(r.cost)} estimés` : ""}.` : "Rien n'a bougé : l'équipe t'attendait."}</span>
      ${waiting ? `<button class="go" data-m="answer">❓ Répondre ${waiting > 1 ? `aux ${waiting} questions` : "à la question"} en attente</button>` : `<span class="muted">Aucune question en attente.</span>`}
      <button class="pill" data-m="close">C'est parti ▶</button></div>
    ${reportHtml(r)}`;
  hub.openOverlay("morning", true);
}
hub.openMorning = openMorning;
document.getElementById("morningbtn").onclick = () => openMorning();
// at the opening: once the first state has come in
if (!DEMO && away && Date.now() - away >= GAP) setTimeout(() => openMorning(away, true), 2500);
setTimeout(markSeen, 4000);
