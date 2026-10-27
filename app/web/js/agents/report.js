// Evening report: what the agents delivered, the MRs, the tickets moved to To Verify, what got stuck. Copyable as Markdown.

import { hub } from "../hub.js";
import { clip, specialty } from "../core/core.js";
import { esc, mrLabel, ticketLink } from "../core/data.js";
import { toast } from "../sims/progress.js";

const reportBox = document.getElementById("report"), reportDay = document.getElementById("report-day");
let reportData = null;

export function isoDay(offset) { const d = new Date(Date.now() - offset * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
reportDay.innerHTML = [0, 1, 2, 3, 4, 5, 6].map(i => `<option value="${isoDay(i)}">${i === 0 ? "aujourd'hui" : i === 1 ? "hier" : isoDay(i)}</option>`).join("");

export function durH(sec) { return sec < 3600 ? `${Math.round(sec / 60)} min` : `${(sec / 3600).toFixed(1)} h`; }
const who = r => `${specialty(r.type)}${r.ticket ? ` · ${r.ticket}` : ""}`;

async function loadReport() {
  const body = document.getElementById("report-body");
  body.innerHTML = `<p class="muted">Chargement…</p>`;
  try {
    reportData = DEMO ? demoReport(reportDay.value) : await (await fetch(`/api/report?day=${reportDay.value}`)).json();
  } catch (err) { body.innerHTML = `<p class="muted">Serveur injoignable (${esc(err.message)})</p>`; return; }
  body.innerHTML = reportHtml(reportData);
}
// the report as HTML, also shown in the chief's office (chiefos.js)
export function reportHtml(r) {
  const mr = x => x.mr ? ` — <a href="${esc(x.mr)}" target="_blank" rel="noopener">${mrLabel(x.mr)}</a>${hub.pipeTag(x.mr)}` : "";
  const list = (items, f) => items.length ? `<ul>${items.map(f).join("")}</ul>` : `<p class="muted osnone">Rien pour l'instant.</p>`;
  return `<div class="rstats">
      <div>runs<b>${r.runs.length}</b></div><div>livrés<b>${r.delivered.length}</b></div><div>MR ouvertes<b>${r.mrs.length}</b></div>
      <div>To Verify<b>${r.verified.length}</b></div><div>questions<b>${r.questions}</b></div><div>bloqués / abandonnés<b>${r.stuck.length}</b></div>
      <div>temps agents<b>${durH(r.seconds)}</b></div></div>
    <h4>LIVRÉ</h4>${list(r.delivered, x => `<li>${esc(who(x))} — ${esc(clip(x.description, 70))}${mr(x)}${x.tests ? ` · ${x.tests.ok ? "tests verts" : "tests rouges"}` : ""}</li>`)}
    <h4>MERGE REQUESTS</h4>${list(r.mrs, x => `<li>${esc(who(x))}${mr(x)}</li>`)}
    <h4>PASSÉS EN TO VERIFY</h4>${list(r.verified, t => `<li>${ticketLink(t)}</li>`)}
    <h4>BLOQUÉS OU ABANDONNÉS</h4>${list(r.stuck, x => `<li>${esc(who(x))} — ${esc(clip(x.lastError || x.description, 90))}</li>`)}
    <h4>ENCORE EN COURS</h4>${list(r.active, x => `<li>${esc(who(x))} — ${esc(clip(x.description, 70))}</li>`)}`;
}

function reportMarkdown() {
  const r = reportData; if (!r) return "";
  const line = x => `- ${who(x)} — ${x.description}${x.mr ? ` — ${x.mr}` : ""}`;
  const sec = (title, items, f) => `\n## ${title}\n${items.length ? items.map(f).join("\n") : "- —"}\n`;
  return `# Rapport agents — ${r.day}\n\n${r.runs.length} runs · ${r.delivered.length} livrés · ${r.mrs.length} MR · ${r.verified.length} To Verify · ${r.questions} questions · ${r.stuck.length} bloqués · ${durH(r.seconds)} de temps agents\n`
    + sec("Livré", r.delivered, line) + sec("Merge requests", r.mrs, line) + sec("Passés en To Verify", r.verified, t => `- ${t}`)
    + sec("Bloqués ou abandonnés", r.stuck, x => `- ${who(x)} — ${x.lastError || x.description}`) + sec("Encore en cours", r.active, line);
}

function toggleReport(show) {
  if (hub.openOverlay("report", show)) loadReport();
}
document.getElementById("reportbtn").onclick = () => toggleReport(reportBox.hidden);
document.getElementById("report-close").onclick = () => toggleReport(false);
reportDay.onchange = loadReport;
document.getElementById("report-copy").onclick = async () => {
  try { await navigator.clipboard.writeText(reportMarkdown()); toast("RAPPORT", "Copié ✓", "Markdown dans le presse-papiers."); }
  catch (_) { toast("RAPPORT", "Copie impossible", "Le navigateur a refusé l'accès au presse-papiers."); }
};

export function demoReport(day) {
  const runs = [
    { type: "feature-builder", ticket: "DEMO-101", description: "Deliver DEMO-101", status: "done", mr: "https://gitlab.example.com/demo/-/merge_requests/42", tests: { ok: true } },
    { type: "mr-reviewer", ticket: "DEMO-103", description: "Review MR !1564", status: "done" },
    { type: "e2e-test-writer", ticket: "DEMO-104", description: "E2E DEMO-104", status: "blocked", lastError: "Timeout 30000ms waiting for selector" },
  ];
  return { day, runs, delivered: runs.filter(r => r.status === "done"), mrs: runs.filter(r => r.mr), verified: ["DEMO-103"],
    stuck: runs.filter(r => r.status === "blocked"), active: [], questions: 1, seconds: 5400 };
}
