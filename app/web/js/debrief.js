"use strict";
// Mission debriefs and memory of failures (read-only on the agents).
// Debrief: each delivered mission gets a sheet (mission, files changed, key commands, errors met, time, cost, tests,
// MR), copyable as Markdown for the MR or the ticket (ChiefOS → Débriefs, 🧾 on the card).
// Failures: a blocked, abandoned or looping run leaves its cause (timeout, permission, missing dependency, tests,
// network…); the next launch of the same kind of agent suggests an instruction that avoids the trap.

let debriefBook = store("office-debriefs", { list: [] });
let failBook = store("office-failures", { list: [] });
const saveDebriefs = () => save("office-debriefs", debriefBook), saveFails = () => save("office-failures", failBook);

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
function debriefsAppHtml() {
  const list = debriefBook.list;
  if (!list.length) return `<p class="muted">Pas encore de débrief : il se crée à chaque mission livrée.</p>`;
  const x = list.find(d => d.key === debriefSel) || list[0];
  return `<div class="osgrid"><div class="oslist">${list.map(d => `<button data-debrief="${esc(d.key)}" class="${d === x ? "on" : ""}"><b>${esc(d.ticket || specialty(d.type))}</b> · ${esc(d.who)}<small>${new Date(d.t).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</small></button>`).join("")}</div>
    <div><div class="osacts"><button data-copy-debrief="${esc(x.key)}">📋 Copier en Markdown</button>${x.mr ? `<a href="${esc(x.mr)}" target="_blank" rel="noopener">Ouvrir la MR ↗</a>` : ""}${x.ticket ? ticketLink(x.ticket) : ""}</div><pre class="md">${esc(debriefMarkdown(x))}</pre></div></div>`;
}
document.getElementById("chiefos").addEventListener("click", async ev => {
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
function failHintsHtml(type) {
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
