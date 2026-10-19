// Polling /api/state, tabs and HUD table.

import { hub, provide } from "../hub.js";
import { ALL, build, curSession, current, data, selected, specialty, typeColor } from "./core.js";
import { sync } from "../agents/entities.js";
import { crew } from "../sims/crew.js";

/* ---------- data ---------- */
export function ago(sec) { return sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${Math.round(sec / 3600)} h`; }
export const STATUS_FR = { working: "au travail", done: "livré", blocked: "bloqué", gone: "parti", asking: "question" };
export const k = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
// an agent "turns in circles": many tools in a row without a code edit or a test run, for a while
export function isStuck(a) {
  const g = a.game, now = data.now || Date.now() / 1000;
  return a.status === "working" && !!g && g.sinceProgress >= 30 && now - (g.progressT || g.first || now) > 600;
}
// a dev opened an MR and no mr-reviewer has looked at it in this session yet
export function awaitingReview(a, session) {
  const mr = a.game?.mr;
  return !!mr && a.type !== "mr-reviewer" && !(session?.agents || []).some(r => r.type === "mr-reviewer"
    && ((a.ticket && r.ticket === a.ticket) || r.game?.mrSeen === mr));
}
export const money = v => `$${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)}`;
export const mrLabel = url => `MR !${(url.match(/merge_requests\/(\d+)/) || [])[1] || "?"}`;
export function ticketLink(ticket) {
  const base = data.links?.youtrack;
  return base ? `<a href="${esc(base)}/issue/${encodeURIComponent(ticket)}" target="_blank" rel="noopener">${esc(ticket)}</a>` : esc(ticket);
}
// end of mission: tests, files, MR (shown on the card once delivered, and in the notification)
export function missionSummary(a, html = true) {
  const g = a.game || {}, parts = [];
  if (g.tests) parts.push(g.tests.ok ? `✓ ${g.tests.n || ""} tests verts` : `✗ ${g.tests.n} tests rouges`);
  if (g.fileCount) parts.push(`${g.fileCount} fichier${g.fileCount > 1 ? "s" : ""} modifié${g.fileCount > 1 ? "s" : ""}`);
  if (g.mr) parts.push(html ? `<a href="${esc(g.mr)}" target="_blank" rel="noopener">${mrLabel(g.mr)}</a>` : mrLabel(g.mr));
  return parts.join(" · ");
}

export function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

export function renderHud() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  const all = document.createElement("button");
  all.className = current === ALL ? "on" : "";
  all.innerHTML = `<span class="dot ${data.sessions.some(s => s.agents.some(a => a.status === "working")) ? "live" : ""}"></span>Toutes (${data.sessions.length})`;
  all.title = "Toutes les sessions dans le même bureau";
  all.onclick = () => { if (current !== ALL) { hub.closePanel(); hub.current = ALL; hub.clearScene(); sync(curSession()); renderHud(); } };
  tabs.appendChild(all);
  const s = curSession();
  hub.refreshCollisions();
  // one card per agent, busiest first: who, what, status, current action, counters
  const order = { asking: 0, blocked: 1, working: 2, done: 3, gone: 4 };
  const rank = a => a.permission && a.status === "working" ? -1 : order[a.status] ?? 5;  // waiting for your go comes first
  const agents = (s?.agents || []).slice().reverse().sort((a, b) => rank(a) - rank(b));
  document.getElementById("rows").innerHTML = agents.map(a => {
    const yt = data.tickets[a.ticket];
    const started = a.started ? Math.round((Date.now() - Date.parse(a.started)) / 1000) : null;
    const now = a.status === "blocked" ? a.lastError : a.status === "asking" ? `? ${a.question?.question || ""}` : a.status === "done" ? "Mission livrée" : a.action;
    const g = a.game || {}, stuck = isStuck(a), over = hub.overBudget(a), review = awaitingReview(a, s), sum = a.status === "done" ? missionSummary(a) : g.mr ? missionSummary(a) : "";
    const nowS = data.now || Date.now() / 1000;
    return `<div class="card${a.id === selected ? " sel" : ""}${a.permission && a.status === "working" ? " perm" : ""}${stuck ? " stuck" : ""}${over ? " over" : ""}" data-id="${esc(a.id)}" style="--c:${typeColor(a.type)}" title="${esc(a.description)}">
      <div class="top"><b>${esc(crew.ids[a.id] || specialty(a.type))}</b>${crew.ids[a.id] ? `<small class="sk" title="compétence pour ce travail">${hub.skillTag(crew.ids[a.id], a.type)}</small>` : ""}<span class="s-${a.status}">${STATUS_FR[a.status] || a.status}</span>
        <span class="tag" style="background:${typeColor(a.type)}" title="${esc(a.type)}">${esc(specialty(a.type))}</span></div>
      <div class="what">${a.ticket ? `${ticketLink(a.ticket)}${yt?.state ? ` · ${esc(yt.state)}` : ""} — ` : ""}${esc(a.description)}</div>
      <div class="act">${esc(now || "démarre…")}</div>
      ${a.permission && a.status === "working" ? `<div class="permline">🔐 attend ta permission dans son terminal : ${esc(a.permission.detail || a.permission.tool)} · ${ago(Math.round(nowS - a.permission.created))}</div>` : ""}
      ${stuck ? `<div class="warnline">🌀 tourne en rond ? ${g.sinceProgress} outils sans modif ni test depuis ${ago(Math.round(nowS - (g.progressT || g.first)))}</div>` : ""}
      ${hub.collisionLine(a)}
      ${over ? `<div class="overline">💸 budget dépassé : ${money(g.cost)} pour ${money(hub.budgetOf(a.type))}</div>` : ""}
      ${sum ? `<div class="sum">${sum}</div>` : ""}
      ${hub.salaryLine(a)}
      ${review ? `<div class="review">📝 attend une review <button data-review="${esc(a.ticket || "")}">Lancer la review</button></div>` : ""}
      ${hub.ciLine(a)}
      ${g.cost ? hub.budgetBar(a) : ""}
      ${hub.cardTools(a)}
      <div class="meta"><span>${a.tools} outils · ${k(a.tokens || 0)} tokens${g.cost ? ` · ${money(g.cost)}` : ""}${a.errors ? ` · <span class="s-blocked">${a.errors} err.</span>` : ""}</span><span>${started !== null ? ago(started) : ""}${hub.etaText(a)}</span></div>
    </div>`;
  }).join("");
  const busy = agents.filter(a => a.status === "working" || a.status === "asking" || a.status === "blocked").length;
  document.getElementById("count").textContent = agents.length ? `${busy}/${agents.length}` : "";
  document.getElementById("empty").textContent = !s ? "Aucune session active." : !s.agents.length ? "Aucun sous-agent : le chef s'en occupe." : "";
}

export async function poll() {
  try {
    hub.data = DEMO ? hub.demo() : await (await fetch("/api/state", { cache: "no-store" })).json();
    // reload a tab opened before index.html changed, so it never runs stale code
    if (data.build) { if (build && build !== data.build) return location.reload(); hub.build = data.build; }
    sync(curSession());
    hub.gameEvents(curSession());
    renderHud();
    hub.renderTimeline(curSession());
    hub.renderWall();
    hub.notifyChanges();
    const working = data.sessions.reduce((n, s) => n + s.agents.filter(a => a.status === "working").length, 0);
    hub.renderBadge();
    if (!hub.perfBox.hidden) hub.renderSessionPerf();
    if (selected) hub.renderQuestion(hub.currentQuestion());
    document.getElementById("status").textContent =
      `${DEMO ? "DÉMO · " : ""}${data.sessions.length} session(s) · ${working} dev(s) au travail · maj ${new Date().toLocaleTimeString("fr-FR")}`
      + (hub.game?.cost ? ` · coût estimé (équivalent API) : ${money(hub.game.cost.today)} aujourd'hui, ${money(hub.game.cost.week)} sur 7 j` : "");
  } catch (err) {
    document.getElementById("status").textContent = `serveur injoignable — relancer server.py (${err.message})`;
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get awaitingReview() { return awaitingReview; }, get esc() { return esc; }, get isStuck() { return isStuck; } });
