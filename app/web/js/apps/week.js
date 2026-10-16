// ChiefOS → 🗓️ Semaine: the report of the week, the days since Monday summed up, copyable as Markdown;
// ready on Friday at 17:00 (a toast and a notification).

import { hub } from "../hub.js";
import { specialty } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { esc } from "../core/data.js";
import { toast } from "../sims/progress.js";
import { demoReport, durH, isoDay } from "../agents/report.js";
import { clockNow, weekId } from "../sims/days.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

let weekData = null;
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
OsApp.listen("week", "click", async ev => {
  const b = ev.target.closest("[data-week]"); if (!b) return;
  if (b.dataset.week === "reload") { weekData = null; return renderChiefOs(); }
  try { await navigator.clipboard.writeText(weekMarkdown(weekData)); toast("SEMAINE", "Copié ✓", "Markdown dans le presse-papiers."); } catch (_) { toast("SEMAINE", "Copie impossible", ""); }
});
// Friday 17:00: the week's report is ready
let weekTold = new SaveSlot("office-weektold", { week: "" }).data;
setInterval(() => {
  const d = clockNow();
  if (d.getDay() !== 5 || d.getHours() < 17 || weekTold.week === weekId()) return;
  weekTold.week = weekId(); SaveSlot.get("office-weektold").save(weekTold); weekData = null;
  toast("RAPPORT DE LA SEMAINE 🗓️", "Prêt à partager", "ChiefOS → Semaine : copie en Markdown pour ton équipe.");
  hub.notify("Rapport de la semaine prêt", "ChiefOS → Semaine", null, null);
}, 60000);

class WeekApp extends OsApp {
  constructor() { super("week", "🗓️", "Semaine", "#19b6ee"); }
  render() { return weekAppHtml(); }
}
new WeekApp();
