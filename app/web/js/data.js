"use strict";
// Polling /api/state, tabs and HUD table.

/* ---------- data ---------- */
function ago(sec) { return sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.round(sec / 60)} min` : `${Math.round(sec / 3600)} h`; }
const STATUS_FR = { working: "au travail", done: "livré", blocked: "bloqué", gone: "parti", asking: "question" };
const k = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
// an agent "turns in circles": many tools in a row without a code edit or a test run, for a while
function isStuck(a) {
  const g = a.game, now = data.now || Date.now() / 1000;
  return a.status === "working" && !!g && g.sinceProgress >= 30 && now - (g.progressT || g.first || now) > 600;
}
// a dev opened an MR and no mr-reviewer has looked at it in this session yet
function awaitingReview(a, session) {
  const mr = a.game?.mr;
  return !!mr && a.type !== "mr-reviewer" && !(session?.agents || []).some(r => r.type === "mr-reviewer"
    && ((a.ticket && r.ticket === a.ticket) || r.game?.mrSeen === mr));
}
const money = v => `$${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)}`;
const mrLabel = url => `MR !${(url.match(/merge_requests\/(\d+)/) || [])[1] || "?"}`;
function ticketLink(ticket) {
  const base = data.links?.youtrack;
  return base ? `<a href="${esc(base)}/issue/${encodeURIComponent(ticket)}" target="_blank" rel="noopener">${esc(ticket)}</a>` : esc(ticket);
}
// end of mission: tests, files, MR (shown on the card once delivered, and in the notification)
function missionSummary(a, html = true) {
  const g = a.game || {}, parts = [];
  if (g.tests) parts.push(g.tests.ok ? `✓ ${g.tests.n || ""} tests verts` : `✗ ${g.tests.n} tests rouges`);
  if (g.fileCount) parts.push(`${g.fileCount} fichier${g.fileCount > 1 ? "s" : ""} modifié${g.fileCount > 1 ? "s" : ""}`);
  if (g.mr) parts.push(html ? `<a href="${esc(g.mr)}" target="_blank" rel="noopener">${mrLabel(g.mr)}</a>` : mrLabel(g.mr));
  return parts.join(" · ");
}

function esc(s) { return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function renderHud() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  const all = document.createElement("button");
  all.className = current === ALL ? "on" : "";
  all.innerHTML = `<span class="dot ${data.sessions.some(s => s.agents.some(a => a.status === "working")) ? "live" : ""}"></span>Toutes (${data.sessions.length})`;
  all.title = "Toutes les sessions dans le même bureau";
  all.onclick = () => { if (current !== ALL) { closePanel(); current = ALL; clearScene(); sync(curSession()); renderHud(); } };
  tabs.appendChild(all);
  const s = curSession();
  refreshCollisions();
  // one card per agent, busiest first: who, what, status, current action, counters
  const order = { asking: 0, blocked: 1, working: 2, done: 3, gone: 4 };
  const agents = (s?.agents || []).slice().reverse().sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));
  document.getElementById("rows").innerHTML = agents.map(a => {
    const yt = data.tickets[a.ticket];
    const started = a.started ? Math.round((Date.now() - Date.parse(a.started)) / 1000) : null;
    const now = a.status === "blocked" ? a.lastError : a.status === "asking" ? `? ${a.question?.question || ""}` : a.status === "done" ? "Mission livrée" : a.action;
    const g = a.game || {}, stuck = isStuck(a), over = overBudget(a), review = awaitingReview(a, s), sum = a.status === "done" ? missionSummary(a) : g.mr ? missionSummary(a) : "";
    const nowS = data.now || Date.now() / 1000;
    return `<div class="card${a.id === selected ? " sel" : ""}${stuck ? " stuck" : ""}${over ? " over" : ""}" data-id="${esc(a.id)}" style="--c:${typeColor(a.type)}" title="${esc(a.description)}">
      <div class="top"><b>${esc(crew.ids[a.id] || specialty(a.type))}</b><span class="s-${a.status}">${STATUS_FR[a.status] || a.status}</span>
        <span class="tag" style="background:${typeColor(a.type)}" title="${esc(a.type)}">${esc(specialty(a.type))}</span></div>
      <div class="what">${a.ticket ? `${ticketLink(a.ticket)}${yt?.state ? ` · ${esc(yt.state)}` : ""} — ` : ""}${esc(a.description)}</div>
      <div class="act">${esc(now || "démarre…")}</div>
      ${stuck ? `<div class="warnline">🌀 tourne en rond ? ${g.sinceProgress} outils sans modif ni test depuis ${ago(Math.round(nowS - (g.progressT || g.first)))}</div>` : ""}
      ${collisionLine(a)}
      ${over ? `<div class="overline">💸 budget dépassé : ${money(g.cost)} pour ${money(budgetOf(a.type))}</div>` : ""}
      ${sum ? `<div class="sum">${sum}</div>` : ""}
      ${review ? `<div class="review">📝 attend une review <button data-review="${esc(a.ticket || "")}">Lancer la review</button></div>` : ""}
      ${ciLine(a)}
      ${g.cost ? budgetBar(a) : ""}
      ${cardTools(a)}
      <div class="meta"><span>${a.tools} outils · ${k(a.tokens || 0)} tokens${g.cost ? ` · ${money(g.cost)}` : ""}${a.errors ? ` · <span class="s-blocked">${a.errors} err.</span>` : ""}</span><span>${started !== null ? ago(started) : ""}${etaText(a)}</span></div>
    </div>`;
  }).join("");
  const busy = agents.filter(a => a.status === "working" || a.status === "asking" || a.status === "blocked").length;
  document.getElementById("count").textContent = agents.length ? `${busy}/${agents.length}` : "";
  document.getElementById("empty").textContent = !s ? "Aucune session active." : !s.agents.length ? "Aucun sous-agent : le chef s'en occupe." : "";
}

async function poll() {
  try {
    data = DEMO ? demo() : await (await fetch("/api/state", { cache: "no-store" })).json();
    // reload a tab opened before index.html changed, so it never runs stale code
    if (data.build) { if (build && build !== data.build) return location.reload(); build = data.build; }
    sync(curSession());
    gameEvents(curSession());
    renderHud();
    renderTimeline(curSession());
    renderWall();
    notifyChanges();
    const working = data.sessions.reduce((n, s) => n + s.agents.filter(a => a.status === "working").length, 0);
    renderBadge();
    if (!perfBox.hidden) renderSessionPerf();
    if (selected) renderQuestion(currentQuestion());
    document.getElementById("status").textContent =
      `${DEMO ? "DÉMO · " : ""}${data.sessions.length} session(s) · ${working} dev(s) au travail · maj ${new Date().toLocaleTimeString("fr-FR")}`
      + (game?.cost ? ` · coût estimé (équivalent API) : ${money(game.cost.today)} aujourd'hui, ${money(game.cost.week)} sur 7 j` : "");
  } catch (err) {
    document.getElementById("status").textContent = `serveur injoignable — relancer server.py (${err.message})`;
  }
}
