// Insight on the work: YouTrack backlog on the board, file collisions between agents, time left, decision log, search.

import { hub, provide } from "../hub.js";
import { clip, data, specialty, typeColor } from "../core/core.js";
import { crew } from "../sims/crew.js";
import { STATUS_FR, ago, esc, ticketLink } from "../core/data.js";
import { openPanel } from "../ui/panel.js";
import { game } from "../sims/progress.js";
import { perfBox, togglePerf } from "./perf.js";

/* backlog: my open YouTrack tickets (Submitted…) that no agent of the open sessions works on */
function backlogCards() {
  const taken = new Set(data.sessions.flatMap(s => s.agents.map(a => a.ticket)).filter(Boolean));
  return (data.backlog || []).filter(b => !taken.has(b.id)).map(b => ({ id: `yt:${b.id}`, ticket: b.id, type: "backlog", description: b.summary, backlog: true }));
}

/* collisions: two running agents editing the same file */
const RUNNING = new Set(["working", "asking", "blocked"]);
function collisions() {
  const byFile = new Map(), out = new Map();
  for (const s of data.sessions) for (const a of s.agents) {
    if (!RUNNING.has(a.status)) continue;
    const m = { ...a, id: `${s.id}|${a.id}` };  // as shown in the merged view
    for (const f of a.game?.files || []) { if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push([a, m]); }
  }
  for (const [file, agents] of byFile) {
    if (agents.length < 2) continue;
    for (const [a, am] of agents) for (const [b, bm] of agents) if (a !== b && !out.has(a.id)) { out.set(a.id, { other: b, file }); out.set(am.id, { other: bm, file }); }
  }
  return out;
}
export let collisionMap = new Map();
function refreshCollisions() { collisionMap = collisions(); }
export const shortFile = f => f.split("/").slice(-2).join("/");
function collisionLine(a) {
  const c = collisionMap.get(a.id);
  return c ? `<div class="overline">⚠ collision : ${esc(crew.ids[c.other.id] || specialty(c.other.type))} modifie aussi ${esc(shortFile(c.file))}</div>` : "";
}

/* time left: the median duration of the delivered runs of the same type (30 days) */
function etaText(a) {
  const med = game?.durations?.[a.type];
  if (!med || a.status !== "working" || !a.started) return "";
  const elapsed = (Date.now() - Date.parse(a.started)) / 1000;
  if (elapsed > med * 1.5) return " · plus long que d'habitude";
  return elapsed < med ? ` · ~${ago(Math.round(med - elapsed))} restantes` : " · bientôt fini ?";
}

/* overlays shared by the decision log and the search */
export function openOverlay(id, show) {
  for (const o of document.querySelectorAll(".overlay")) if (o.id !== id) o.hidden = true;
  if (show && !perfBox.hidden) togglePerf(false);
  const box = document.getElementById(id);
  if (box) box.hidden = !show;
  for (const [bid, oid] of [["reportbtn", "report"], ["wallbtn", "wall"], ["answersbtn", "answers"], ["searchbtn", "search"], ["helpbtn", "help"]])
    document.getElementById(bid).classList.toggle("on", !document.getElementById(oid).hidden);
  return !!box && show;
}

/* decision log: every question the agents asked and what you answered */
let answersData = [];
async function loadAnswers() {
  const body = document.getElementById("answers-body");
  try { answersData = DEMO ? demoAnswers() : await (await fetch("/api/answers")).json(); }
  catch (err) { body.innerHTML = `<p class="muted">Serveur injoignable (${esc(err.message)})</p>`; return; }
  renderAnswers();
}
function renderAnswers() {
  const q = document.getElementById("answers-q").value.trim().toLowerCase();
  const when = t => t ? new Date(t * 1000).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const rows = answersData.filter(x => !q || `${x.question} ${x.answer} ${x.from} ${x.context}`.toLowerCase().includes(q));
  document.getElementById("answers-body").innerHTML = rows.map(x => `<div class="hist" style="--c:var(--accent)">
      <div class="muted">${when(x.answered || x.created)} · ${esc(x.from || "agent")}</div>
      <div>❓ ${esc(x.question)}</div>${x.context ? `<div class="muted">${esc(clip(x.context, 160))}</div>` : ""}
      <div class="s-done">→ ${esc(x.answer)}</div></div>`).join("") || `<p class="muted">${answersData.length ? "Rien ne correspond." : "Aucune réponse sur 30 jours."}</p>`;
}
document.getElementById("answersbtn").onclick = () => { if (openOverlay("answers", document.getElementById("answers").hidden)) loadAnswers(); };
document.getElementById("answers-close").onclick = () => openOverlay("answers", false);
document.getElementById("answers-q").addEventListener("input", renderAnswers);
function demoAnswers() {
  const now = Date.now() / 1000;
  return [{ question: "Le filtre doit-il inclure les MR en Draft ?", answer: "Non, seulement les MR prêtes", from: "DEMO-103 review", context: "Change la requête GitLab.", created: now - 7200, answered: now - 7100 },
    { question: "Faut-il migrer les anciennes données ?", answer: "Oui, avec un script idempotent", from: "DEMO-101", created: now - 90000, answered: now - 89000 }];
}

/* search: who touched a file, which command, which mission — 7 days */
let searchTimer = null;
async function runSearch() {
  const q = document.getElementById("search-q").value.trim(), body = document.getElementById("search-body");
  if (q.length < 2) { body.innerHTML = `<p class="muted">Tape au moins 2 caractères : un fichier, une commande, un ticket…</p>`; return; }
  let rows = [];
  try { rows = DEMO ? [] : await (await fetch(`/api/search?q=${encodeURIComponent(q)}`)).json(); }
  catch (err) { body.innerHTML = `<p class="muted">Serveur injoignable (${esc(err.message)})</p>`; return; }
  const when = t => t ? new Date(t * 1000).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  body.innerHTML = rows.map(r => `<div class="hist" style="--c:${typeColor(r.type)}" data-ticket="${esc(r.ticket || "")}">
      <b>${esc(specialty(r.type))}</b> ${r.ticket ? ticketLink(r.ticket) : ""} <span class="s-${r.status}">${STATUS_FR[r.status] || r.status}</span> <span class="muted">${when(r.last)}</span>
      <div>${esc(clip(r.description, 90))}</div>
      ${r.matchFiles.map(f => `<div class="muted">📄 ${esc(f)}</div>`).join("")}${r.matchCommands.map(c => `<div class="muted">$ ${esc(clip(c, 110))}</div>`).join("")}</div>`).join("")
    || `<p class="muted">${DEMO ? "Recherche indisponible en démo." : "Aucun run ne correspond sur 7 jours."}</p>`;
}
document.getElementById("searchbtn").onclick = () => { if (openOverlay("search", document.getElementById("search").hidden)) { document.getElementById("search-q").focus(); runSearch(); } };
document.getElementById("search-close").onclick = () => openOverlay("search", false);
document.getElementById("search-q").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 300); });
document.getElementById("search-body").addEventListener("click", ev => {
  if (ev.target.closest("a")) return;
  const t = ev.target.closest("[data-ticket]")?.dataset.ticket;
  if (t) { openOverlay("search", false); openPanel(`ticket:${t}`); }
});

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get backlogCards() { return backlogCards; }, get collisionLine() { return collisionLine; }, get etaText() { return etaText; }, get openOverlay() { return openOverlay; }, get refreshCollisions() { return refreshCollisions; } });
