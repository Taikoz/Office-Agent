// Mission debriefs and memory of failures (read-only on the agents).
// Debrief: each delivered mission gets a sheet (mission, files changed, key commands, errors met, time, cost, tests,
// MR), copyable as Markdown for the MR or the ticket (ChiefOS → Débriefs, 🧾 on the card).
// Failures: a blocked, abandoned or looping run leaves its cause (timeout, permission, missing dependency, tests,
// network…); the next launch of the same kind of agent suggests an instruction that avoids the trap.

import { hub, provide } from "../hub.js";
import { clip, curSession, fetchAgent, specialty } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crew } from "../sims/crew.js";
import { esc, isStuck, money, ticketLink } from "../core/data.js";
import { toast } from "../sims/progress.js";
import { payKey } from "../sims/money.js";
import { OsApp } from "./base.js";
import { openChiefOs, renderChiefOs } from "../ui/chiefos.js";
import { CH, bars, tile } from "../ui/charts.js";

let debriefBook = new SaveSlot("office-debriefs", { list: [] }).data;
let failBook = new SaveSlot("office-failures", { list: [] }).data;
const saveDebriefs = () => SaveSlot.get("office-debriefs").save(debriefBook), saveFails = () => SaveSlot.get("office-failures").save(failBook);

const KEY_CMD = /\b(git (commit|push|checkout|switch|merge|rebase)|pytest|npm (run|test|ci|install)|pnpm|yarn|uv run|make|cargo|go test|docker|gl\.py|yt\.py|playwright|tsc|ruff|eslint|alembic)\b/;
async function buildDebrief(a) {
  const key = payKey(a);
  if (debriefBook.list.some(d => d.key === key)) return;
  let d = null;
  try { d = await fetchAgent(a.id); } catch (_) { /* transcript gone: summary from the state only */ }
  const g = a.game || {}, mins = g.first && g.last ? Math.round((g.last - g.first) / 60) : null;
  const files = [...new Set((d?.edits || []).map(e => e.file || e.path).filter(Boolean))].slice(-15);
  const cmds = (d?.terminal || []).filter(c => KEY_CMD.test(c.cmd)).slice(-10).map(c => ({ cmd: clip(c.cmd, 140), failed: !!c.failed }));
  const errors = (d?.events || []).filter(e => e.kind === "error").slice(-4).map(e => clip(e.label, 160));
  debriefBook.list.unshift({ key, t: Date.now(), who: crew.ids[a.id] || specialty(a.type), type: a.type, ticket: a.ticket || "", mission: clip(a.description || d?.prompt || "", 300),
    mins, cost: g.cost || 0, tools: a.tools || 0, errorsN: a.errors || 0, tests: g.tests || null, mr: g.mr || "", fileCount: g.fileCount || files.length, files, cmds, errors });
  debriefBook.list = debriefBook.list.slice(0, 40); saveDebriefs();
}
function debriefMarkdown(x) {
  return [`## Débrief — ${x.ticket || x.type} (${x.who})`, "", `**Mission** : ${x.mission}`, "",
    `- Durée : ${x.mins ?? "?"} min · ${x.tools} outils · coût estimé ${money(x.cost)}${x.errorsN ? ` · ${x.errorsN} erreur(s)` : ""}`,
    `- Tests : ${x.tests ? (x.tests.ok ? `verts${x.tests.n ? ` (${x.tests.n})` : ""}` : `rouges (${x.tests.n})`) : "—"}`, `- MR : ${x.mr || "—"}`,
    "", `### Fichiers modifiés (${x.fileCount})`, ...(x.files.length ? x.files.map(f => `- \`${f}\``) : ["- —"]),
    "", "### Commandes clés", ...(x.cmds.length ? x.cmds.map(c => `- \`${c.cmd}\`${c.failed ? " ✗" : ""}`) : ["- —"]),
    ...(x.errors.length ? ["", "### Erreurs rencontrées", ...x.errors.map(e => `- ${e}`)] : [])].join("\n");
}
let debriefSel = null;
// the traps met by the agents (memory of failures), most frequent first: what to warn the next launch about
function trapsHtml() {
  const counts = {};
  for (const f of failBook.list) counts[f.kind] = (counts[f.kind] || 0) + 1;
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([kind, n]) => { const k = FAIL_KINDS.find(x => x[0] === kind) || classifyFail(""); return { key: k[2], label: esc(k[2]), values: { n }, meta: esc(k[3]) }; });
  return `<section class="chcard"><div class="chhead"><h4>Pièges rencontrés</h4><span class="muted">${failBook.list.length} blocage${failBook.list.length > 1 ? "s" : ""} retenu${failBook.list.length > 1 ? "s" : ""} ; rappelés au lancement d'un agent du même type</span></div>
    ${rows.length ? bars({ rows, stack: [{ key: "n", label: "Fois", color: CH.blocked }], fmt: v => `${v}×` }) : `<div class="cvclear">✓ Aucun piège retenu pour l'instant.</div>`}</section>`;
}
// one debrief as a sheet: who and when, the mission, the figures, then files, commands and errors
function sheetHtml(x) {
  const tests = x.tests ? (x.tests.ok ? `✓ verts${x.tests.n ? ` (${x.tests.n})` : ""}` : `✗ rouges (${x.tests.n})`) : "—";
  return `<article class="dbsheet"><div class="dbhead"><span><b>${x.ticket ? ticketLink(x.ticket) : esc(specialty(x.type))}</b><small>${esc(x.who)} · ${esc(specialty(x.type))} · ${new Date(x.t).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</small></span>
      <span class="osacts"><button data-copy-debrief="${esc(x.key)}">📋 Copier en Markdown</button>${x.mr ? `<a class="dbmr" href="${esc(x.mr)}" target="_blank" rel="noopener">Ouvrir la MR ↗</a>` : ""}</span></div>
    ${x.mission ? `<p class="dbmission">${esc(x.mission)}</p>` : ""}
    <div class="chtiles">${tile({ label: "Durée", value: x.mins == null ? "—" : `${x.mins} min` })}${tile({ label: "Outils", value: x.tools })}${tile({ label: "Coût estimé", value: money(x.cost) })}
      ${tile({ label: "Tests", value: tests, tone: x.tests ? (x.tests.ok ? "good" : "bad") : "" })}${tile({ label: "Erreurs", value: x.errorsN, tone: x.errorsN ? "bad" : "" })}</div>
    <section class="chcard"><div class="chhead"><h4>Fichiers modifiés</h4><span class="muted">${x.fileCount}</span></div>${x.files.length ? `<div class="dbfiles">${x.files.map(f => `<code>${esc(f)}</code>`).join("")}</div>` : `<p class="muted">Aucun.</p>`}</section>
    <section class="chcard"><div class="chhead"><h4>Commandes clés</h4><span class="muted">${x.cmds.length}</span></div>${x.cmds.length ? `<ol class="dbcmds">${x.cmds.map(c => `<li class="${c.failed ? "bad" : ""}"><span aria-label="${c.failed ? "échec" : "réussie"}">${c.failed ? "✗" : "✓"}</span><code>${esc(c.cmd)}</code></li>`).join("")}</ol>` : `<p class="muted">Aucune.</p>`}</section>
    ${x.errors.length ? `<section class="chcard"><div class="chhead"><h4>Erreurs rencontrées</h4></div><ul class="dberrs">${x.errors.map(e => `<li>${esc(e)}</li>`).join("")}</ul></section>` : ""}</article>`;
}
function debriefsAppHtml() {
  const list = debriefBook.list;
  if (!list.length) return `<div class="osempty"><span class="osemptyic" aria-hidden="true">🧾</span><b>Pas encore de débrief</b><span>Une fiche se crée à chaque mission livrée : mission, fichiers, commandes, erreurs, coût.</span></div>${trapsHtml()}`;
  const x = list.find(d => d.key === debriefSel) || list[0];
  return `<div class="dbwrap"><nav class="dblist" aria-label="Débriefs">${list.map(d => `<button data-debrief="${esc(d.key)}" class="${d === x ? "on" : ""}"${d === x ? ' aria-current="true"' : ""}><b>${esc(d.ticket || specialty(d.type))}</b><span>${esc(d.who)} · ${money(d.cost)}${d.tests ? (d.tests.ok ? " · ✓" : " · ✗") : ""}</span><small>${new Date(d.t).toLocaleString("fr-FR", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small></button>`).join("")}</nav>
    <div class="dbmain">${sheetHtml(x)}${trapsHtml()}</div></div>`;
}
OsApp.listen("debriefs", "click", async ev => {
  const b = ev.target.closest("[data-debrief], [data-copy-debrief]"); if (!b) return;
  if (b.dataset.debrief) { debriefSel = b.dataset.debrief; return renderChiefOs(); }
  const x = debriefBook.list.find(d => d.key === b.dataset.copyDebrief);
  try { await navigator.clipboard.writeText(debriefMarkdown(x)); toast("DÉBRIEF", "Copié ✓", "Markdown dans le presse-papiers."); } catch (_) { toast("DÉBRIEF", "Copie impossible", "Le navigateur a refusé le presse-papiers."); }
});
// the 🧾 tool on a delivered card
function debriefTool(a) { return a.status === "done" && debriefBook.list.some(d => d.key === payKey(a)) ? `<button data-debrief-card="${esc(payKey(a))}" title="Le débrief de la mission">🧾 débrief</button>` : ""; }
document.getElementById("rows").addEventListener("click", ev => { const b = ev.target.closest("[data-debrief-card]"); if (b) { ev.stopPropagation(); debriefSel = b.dataset.debriefCard; openChiefOs("debriefs"); } }, true);

/* ---------- memory of failures ---------- */
const FAIL_KINDS = [
  ["timeout", /timeout|timed out|exceeded|délai/i, "⏱️ délai dépassé", "Si une commande ou un test dépasse le délai : cible un seul fichier de test, augmente le timeout, ou lance-le en arrière-plan."],
  ["permission", /permission|denied|EACCES|forbidden|403|not allowed/i, "🔒 permission", "Vérifie les droits avant d'agir (fichier, dépôt, token) et demande au lieu de réessayer en boucle."],
  ["dependency", /not found|ENOENT|No module named|cannot find module|command not found|ModuleNotFoundError/i, "📦 dépendance manquante", "Installe ou vérifie les dépendances (uv sync, npm ci…) avant de lancer les tests."],
  ["tests", /assert|FAILED|test.*fail|expect\(/i, "🧪 tests rouges", "Lance les tests ciblés tôt, et lis l'erreur complète avant de modifier le code."],
  ["network", /ECONN|network|fetch failed|getaddrinfo|5\d\d |unreachable/i, "🌐 réseau", "En cas d'erreur réseau, réessaie une fois puis signale-le au lieu d'insister."],
  ["loop", /tourne en rond/i, "🌀 boucle", "Fixe un plan court (3 étapes) et arrête-toi pour demander si une étape échoue deux fois."],
];
const failSeen = new Set();
function classifyFail(text) { return FAIL_KINDS.find(([, re]) => re.test(text || "")) || ["other", null, "❓ autre", "Découpe la mission en étapes plus petites et vérifie chacune."]; }
function watchFailures() {
  for (const a of curSession()?.agents || []) {
    const bad = a.status === "blocked" || a.status === "gone" ? a.lastError || a.status : isStuck(a) ? "tourne en rond" : null;
    const key = `${payKey(a)}|${a.status}`;
    if (!bad || failSeen.has(key)) continue;
    failSeen.add(key);
    if (failBook.list.some(f => f.key === key)) continue;
    const [kind, , label] = classifyFail(bad);
    failBook.list.unshift({ key, t: Date.now(), type: a.type, ticket: a.ticket || "", kind, label, error: clip(String(bad), 200) });
    failBook.list = failBook.list.slice(0, 80); saveFails();
  }
}
setInterval(watchFailures, 5000);
// for the launch form: the traps already met by this kind of agent, most frequent first
function failHints(type) {
  const counts = {};
  for (const f of failBook.list) if (f.type === type) counts[f.kind] = (counts[f.kind] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([kind, n]) => { const k = FAIL_KINDS.find(x => x[0] === kind) || classifyFail(""); return { kind, n, label: k[2], hint: k[3] }; });
}
export function failHintsHtml(type) {
  const hints = failHints(type);
  if (!hints.length) return "";
  return `<div class="hints"><b>⚠️ Déjà vu avec ${esc(type)}</b>${hints.map(h => `<div><span>${h.label} ×${h.n}</span><button type="button" data-hint="${esc(h.hint)}">➕ Ajouter la consigne</button></div>`).join("")}</div>`;
}
document.getElementById("p-game").addEventListener("click", ev => {
  const b = ev.target.closest("[data-hint]"); if (!b) return;
  const p = document.getElementById("l-prompt"); if (!p) return;
  if (!p.value.includes(b.dataset.hint)) p.value = `${p.value.trim()}\n\nAttention (déjà vu) : ${b.dataset.hint}`;
  b.disabled = true; b.textContent = "✓ ajoutée";
});

class DebriefsApp extends OsApp {
  constructor() { super("debriefs", "🧾", "Débriefs", "#77216f"); }
  render() { return debriefsAppHtml(); }
}
new DebriefsApp();

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get buildDebrief() { return buildDebrief; }, get debriefTool() { return debriefTool; } });
