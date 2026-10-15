"use strict";
// Costs per ticket and per project over 30 days (ChiefOS → Coûts, /api/costs): where the tokens go, with the
// "gouffres" (expensive or often blocked tickets) singled out. And the report of the week (ChiefOS → Semaine): the
// days since Monday summed up, copyable as Markdown; ready on Friday at 17:00 (a toast and a notification).

let costsData = null, weekData = null;
function demoCosts() {
  return { days: 30, total: { runs: 21, cost: 38.4, seconds: 52000 }, projects: [{ key: "front", runs: 12, cost: 24.1, seconds: 31000, done: 9, blocked: 2, types: { "feature-builder": 8 } }, { key: "billing-api", runs: 9, cost: 14.3, seconds: 21000, done: 8, blocked: 0, types: { "feature-builder": 5 } }],
    tickets: [{ key: "DEMO-101", runs: 5, cost: 14.2, seconds: 16000, done: 2, blocked: 2, types: { "feature-builder": 3, "mr-reviewer": 2 } }, { key: "DEMO-102", runs: 2, cost: 3.1, seconds: 4000, done: 2, blocked: 0, types: { "security-auditor": 2 } }, { key: "DEMO-104", runs: 3, cost: 6.8, seconds: 9000, done: 1, blocked: 1, types: { "e2e-test-writer": 3 } }] };
}
async function loadCosts() {
  try { costsData = DEMO ? demoCosts() : await (await fetch("/api/costs?days=30")).json(); } catch (_) { costsData = { error: true }; }
  renderChiefOs();
}
function costsAppHtml() {
  if (!costsData) { loadCosts(); return `<p class="muted">Calcul des coûts sur 30 jours…</p>`; }
  if (costsData.error) return `<p class="muted">Serveur injoignable.</p>`;
  const c = costsData, costs = c.tickets.map(t => t.cost).sort((a, b) => a - b), median = costs[Math.floor(costs.length / 2)] || 0;
  const pit = t => t.cost > Math.max(1, median * 2) || t.blocked >= 2;
  const row = (t, isTicket) => `<div class="osrow"><b>${isTicket ? ticketLink(t.key) : esc(t.key)}${isTicket && pit(t) ? ' <span class="pit">🕳️ gouffre</span>' : ""}</b><span>${money(t.cost)} · ${t.runs} run(s) · ${durH(t.seconds)} · ${t.done} livré(s)${t.blocked ? ` · <span class="s-blocked">${t.blocked} bloqué(s)</span>` : ""}</span><span class="muted">${esc(Object.entries(t.types).map(([k, n]) => `${specialty(k)} ×${n}`).join(", "))}</span></div>`;
  return `<div class="rstats"><div>30 jours<b>${money(c.total.cost)}</b></div><div>runs<b>${c.total.runs}</b></div><div>temps agents<b>${durH(c.total.seconds)}</b></div><div>coût médian / ticket<b>${money(median)}</b></div></div>
    <p class="muted">Coût estimé au tarif API (équivalent, même sur abonnement). 🕳️ = plus du double de la médiane, ou bloqué deux fois : à découper ?</p>
    <h4>PAR TICKET</h4>${c.tickets.slice(0, 25).map(t => row(t, true)).join("") || `<p class="muted">—</p>`}
    <h4>PAR PROJET</h4>${c.projects.map(p => row(p, false)).join("") || `<p class="muted">—</p>`}`;
}

/* ---------- the week ---------- */
function weekDays() { const out = [], d = clockNow(), back = (d.getDay() + 6) % 7; for (let i = back; i >= 0; i--) out.push(isoDay(i)); return out; }
async function loadWeek() {
  try {
    const days = weekDays(), reps = await Promise.all(days.map(day => DEMO ? Promise.resolve(demoReport(day)) : fetch(`/api/report?day=${day}`).then(r => r.json())));
    const sum = k => reps.reduce((n, r) => n + (Array.isArray(r[k]) ? r[k].length : r[k] || 0), 0);
    weekData = { from: days[0], to: days.at(-1), runs: sum("runs"), delivered: reps.flatMap(r => r.delivered), mrs: reps.flatMap(r => r.mrs), verified: [...new Set(reps.flatMap(r => r.verified))],
      stuck: reps.flatMap(r => r.stuck), questions: sum("questions"), seconds: sum("seconds"), perDay: days.map((day, i) => ({ day, delivered: reps[i].delivered.length, runs: reps[i].runs.length })) };
  } catch (_) { weekData = { error: true }; }
  renderChiefOs();
}
function weekMarkdown(w) {
  const line = x => `- ${specialty(x.type)}${x.ticket ? ` · ${x.ticket}` : ""} — ${x.description}${x.mr ? ` — ${x.mr}` : ""}`;
  return [`# Semaine des agents — ${w.from} → ${w.to}`, "", `${w.runs} runs · ${w.delivered.length} livrés · ${w.mrs.length} MR · ${w.verified.length} To Verify · ${w.stuck.length} bloqués · ${w.questions} questions · ${durH(w.seconds)} de temps agents`,
    "", "## Par jour", ...w.perDay.map(d => `- ${d.day} : ${d.delivered} livré(s) sur ${d.runs} run(s)`),
    "", "## Livré", ...(w.delivered.length ? w.delivered.map(line) : ["- —"]), "", "## Passés en To Verify", ...(w.verified.length ? w.verified.map(t => `- ${t}`) : ["- —"]),
    "", "## Bloqués ou abandonnés", ...(w.stuck.length ? w.stuck.map(x => `- ${specialty(x.type)}${x.ticket ? ` · ${x.ticket}` : ""} — ${x.lastError || x.description}`) : ["- —"])].join("\n");
}
function weekAppHtml() {
  if (!weekData) { loadWeek(); return `<p class="muted">Rassemblement des rapports de la semaine…</p>`; }
  if (weekData.error) return `<p class="muted">Serveur injoignable.</p>`;
  const w = weekData, max = Math.max(1, ...w.perDay.map(d => d.runs));
  return `<div class="rstats"><div>runs<b>${w.runs}</b></div><div>livrés<b>${w.delivered.length}</b></div><div>MR<b>${w.mrs.length}</b></div><div>To Verify<b>${w.verified.length}</b></div><div>bloqués<b>${w.stuck.length}</b></div><div>temps agents<b>${durH(w.seconds)}</b></div></div>
    <div class="weekbars">${w.perDay.map(d => `<div title="${d.day} : ${d.delivered} livré(s) / ${d.runs} run(s)"><i style="height:${Math.round(d.runs / max * 100)}%"></i><b style="height:${Math.round(d.delivered / max * 100)}%"></b><span>${["lun", "mar", "mer", "jeu", "ven", "sam", "dim"][(new Date(d.day).getDay() + 6) % 7]}</span></div>`).join("")}</div>
    <div class="osacts"><button data-week="copy">📋 Copier en Markdown</button><button data-week="reload">↻ Actualiser</button></div><pre class="md">${esc(weekMarkdown(w))}</pre>`;
}
document.getElementById("chiefos").addEventListener("click", async ev => {
  const b = ev.target.closest("[data-week]"); if (!b) return;
  if (b.dataset.week === "reload") { weekData = null; return renderChiefOs(); }
  try { await navigator.clipboard.writeText(weekMarkdown(weekData)); toast("SEMAINE", "Copié ✓", "Markdown dans le presse-papiers."); } catch (_) { toast("SEMAINE", "Copie impossible", ""); }
});
// Friday 17:00: the week's report is ready
let weekTold = store("office-weektold", { week: "" });
setInterval(() => {
  const d = clockNow();
  if (d.getDay() !== 5 || d.getHours() < 17 || weekTold.week === weekId()) return;
  weekTold.week = weekId(); save("office-weektold", weekTold); weekData = null;
  toast("RAPPORT DE LA SEMAINE 🗓️", "Prêt à partager", "ChiefOS → Semaine : copie en Markdown pour ton équipe.");
  notify("Rapport de la semaine prêt", "ChiefOS → Semaine", null, null);
}, 60000);
