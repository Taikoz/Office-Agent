// Ticket history, relaunch of a stuck agent, GitLab state of the MRs (pipeline, merged).

import { hub, provide } from "../hub.js";
import { DESKS, clip, curSession, data, fetchAgent, specialty, typeColor } from "../core/core.js";
import { STATUS_FR, esc, isStuck, mrLabel, ticketLink } from "../core/data.js";
import { openPanel } from "../ui/panel.js";

/* GitLab state of an MR, from the server's background fetch through gl.py */
const CI_FR = { success: "CI verte", failed: "CI rouge", running: "CI en cours", pending: "CI en attente", created: "CI en attente", canceled: "CI annulée", skipped: "CI sautée" };
export const pipeOf = url => (url && data.pipelines?.[url]) || null;
export function pipeTag(url) {
  const p = pipeOf(url);
  if (!p) return "";
  if (p.state === "merged") return ` <span class="ci-merged">· fusionnée ✓</span>`;
  return p.ci ? ` <span class="ci-${esc(p.ci)}">· ${CI_FR[p.ci] || esc(p.ci)}</span>` : "";
}
function ciLine(a) {
  const p = pipeOf(a.game?.mr);
  if (!p || (!p.ci && p.state !== "merged")) return "";
  const label = p.state === "merged" ? `<span class="ci-merged">MR fusionnée ✓</span>`
    : `<a class="ci-${esc(p.ci)}" href="${esc(p.ciUrl || a.game.mr)}" target="_blank" rel="noopener">${p.ci === "success" ? "✓" : p.ci === "failed" ? "✗" : "⏳"} ${CI_FR[p.ci] || esc(p.ci)}</a>`;
  return `<div class="ci">${label}</div>`;
}
export const ciFailed = a => pipeOf(a.game?.mr)?.ci === "failed" && pipeOf(a.game?.mr)?.state !== "merged";

/* card tools: history of the ticket, relaunch of a stuck run */
function cardTools(a) {
  const b = [];
  if (a.ticket) b.push(`<button data-history="${esc(a.ticket)}" title="Tous les agents passés sur ce ticket">🕘 historique</button>`);
  const dbf = hub.debriefTool(a); if (dbf) b.push(dbf);  // debrief.js
  if (a.status === "done" || (a.tools || 0) >= 20) b.push(`<button data-comic="${esc(a.id)}" title="La mission racontée en BD (à coller dans la MR ou sur Slack)">🎞️ BD</button>`);
  if (["blocked", "gone"].includes(a.status) || isStuck(a)) b.push(`<button data-relaunch="${esc(a.id)}" title="Relancer la même mission avec une consigne de reprise">🔁 relancer</button>`);
  return b.length ? `<div class="tools2">${b.join("")}</div>` : "";
}

export let launchPreset = null, relaunchN = 0;
export async function relaunch(agentId) {
  const s = curSession(), a = s?.agents.find(x => x.id === agentId);
  if (!a) return;
  let prompt = a.description;
  if (!DEMO) try {
    const d = await fetchAgent(agentId);
    prompt = d?.prompt || prompt;
  } catch (_) { /* the short description will do */ }
  const why = a.status === "blocked" ? `bloquée sur : ${a.lastError || a.action}` : isStuck(a) ? `tournait en rond (${a.game.sinceProgress} outils sans modif ni test)` : `s'est arrêtée (dernière action : ${a.action})`;
  launchPreset = { agent: a.type, prompt: `${prompt}\n\nReprise : la tentative précédente ${why}. Reprends depuis l'état actuel du dépôt et de la branche, sans refaire ce qui est déjà fait.`,
    worktree: a.worktreePath ? { path: a.worktreePath, name: a.worktree } : null };  // its worktree: picked up there, not a new one
  const desk = Math.max(0, DESKS.findIndex(hub.freeDesk));
  openPanel(`launch:${desk}:${a.ticket || ""}::retry${++relaunchN}`);
}

/* history of one ticket: every agent run on it over 30 days */
let ticketShown = null;
async function renderTicket(id) {
  if (ticketShown === id) return;
  ticketShown = id;
  const box = document.getElementById("p-game");
  box.innerHTML = `<p class="muted">Chargement…</p>`;
  let runs = [];
  try { runs = DEMO ? demoTicket(id) : await (await fetch(`/api/ticket?id=${encodeURIComponent(id)}`)).json(); }
  catch (err) { box.innerHTML = `<p class="muted">Serveur injoignable (${esc(err.message)})</p>`; return; }
  const when = t => t ? new Date(t * 1000).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "?";
  box.innerHTML = `<p>${ticketLink(id)} · ${runs.length} run(s) sur 30 jours${data.tickets?.[id]?.state ? ` · ${esc(data.tickets[id].state)}` : ""}</p>`
    + (runs.map(r => `<div class="hist" style="--c:${typeColor(r.type)}"><b>${esc(specialty(r.type))}</b> <span class="s-${r.status}">${STATUS_FR[r.status] || r.status}</span>
      <div>${esc(clip(r.description, 80))}</div>
      <div class="muted">${when(r.first)} → ${when(r.last)} · ${r.files} fichier(s)${r.tests ? ` · ${r.tests.ok ? "tests verts" : "tests rouges"}` : ""}${r.mr ? ` · <a href="${esc(r.mr)}" target="_blank" rel="noopener">${mrLabel(r.mr)}</a>${pipeTag(r.mr)}` : ""}</div></div>`).join("")
      || `<p class="muted">Aucun agent sur ce ticket ces 30 derniers jours.</p>`)
    + `<div class="acts"><button id="t-launch">🚀 Lancer un agent sur ${esc(id)}</button></div>`;
  box.querySelector("#t-launch").onclick = () => openPanel(`launch:${Math.max(0, DESKS.findIndex(hub.freeDesk))}:${id}:${runs.at(-1)?.type || ""}`);
}
function demoTicket(id) {
  const now = Date.now() / 1000;
  return [{ type: "feature-builder", status: "done", description: `Deliver ${id}`, first: now - 7200, last: now - 5400, files: 4, tests: { ok: true }, mr: "https://gitlab.example.com/demo/-/merge_requests/42" },
    { type: "mr-reviewer", status: "done", description: `Review the MR of ${id}`, first: now - 5000, last: now - 4700, files: 0 }];
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get cardTools() { return cardTools; }, get ciLine() { return ciLine; }, get launchPreset() { return launchPreset; }, set launchPreset(v) { launchPreset = v; }, get pipeTag() { return pipeTag; }, get relaunch() { return relaunch; }, get renderTicket() { return renderTicket; }, get ticketShown() { return ticketShown; }, set ticketShown(v) { ticketShown = v; } });
