"use strict";
// The chief's office: a desk of his own next to the podium (a buy-mode object), with ChiefOS on its computer — the
// questions waiting, the merge requests and their CI, the tickets, the report of the day, the accounts and the team at a
// glance, without leaving the game. Links still open GitLab or YouTrack in a new tab.

function chiefDeskArt() {
  return R(0, 12, 34, 4, "#5c3d27") + R(0, 12, 34, 1, "#8a6a4a") + R(2, 16, 3, 10, "#4a3826") + R(29, 16, 3, 10, "#4a3826") + R(20, 16, 10, 8, "#4a3826")
    + R(7, 0, 20, 11, "#1c1c24") + R(8, 1, 18, 9, "#2e5d9e") + R(9, 2, 8, 1, "#fbaa08") + R(9, 4, 14, 0.8, "#d5eeff") + R(9, 6, 11, 0.8, "#d5eeff") + R(16, 11, 2, 1.4, "#1c1c24")
    + R(3, 10, 3, 2.4, "#f4f2ea") + R(10, 11, 12, 1, "#3a3a44");
}
CATALOG.push({ type: "chiefdesk", cat: "bureau", name: "Bureau du chef", price: 1500, room: "office", unique: true, w: 34, h: 26,
  desc: "Ton bureau, avec ChiefOS : questions, MR, tickets, rapport, comptes et équipe.", art: () => chiefDeskArt(),
  styles: [{ id: "noyer", name: "Noyer", sw: "#5c3d27" }, { id: "blanc", name: "Laqué blanc", sw: "#e6e2d8", map: { "#5c3d27": "#e6e2d8", "#8a6a4a": "#ffffff", "#4a3826": "#c8c4bc" } },
    { id: "noir", name: "Noir", sw: "#2a2a33", map: { "#5c3d27": "#2a2a33", "#8a6a4a": "#3a3a44", "#4a3826": "#1c1c24" } }] });
// every office gets one, once (selling it is allowed)
if (furni.items && !furni.chiefSeeded) {
  if (!furni.items.some(i => i.type === "chiefdesk")) furni.items.push({ uid: ++furni.seq, type: "chiefdesk", style: "noyer", room: "office", x: 250, y: 70 });
  furni.chiefSeeded = true; saveBuild();
}
const chiefDesk = () => furni.items.find(i => i.type === "chiefdesk");

// the chief walks to his desk, sits, and ChiefOS opens
function chiefToDesk() {
  const it = chiefDesk(); if (!it) return openChiefOs();
  const go = () => chiefGo({ x: it.x + 17, y: it.y + 30 }, c => { c.at = "chiefos"; openChiefOs(); });
  if (chiefBusyNow()) { openChiefOs(); return; }  // the team waits: the screen opens at once
  if (chief.room === "lounge") { chief.pendingOffice = go; chiefToOffice(); } else go();
}

/* ---------- ChiefOS ---------- */
const osBox = document.getElementById("chiefos");
let osApp = "questions", osReport = null;
const OS_APPS = [["questions", "📬", "Questions"], ["alerts", "🚨", "Alertes"], ["planning", "📅", "Planning"], ["mr", "🔀", "Merge requests"], ["tickets", "🎫", "Tickets"],
  ["debriefs", "🧾", "Débriefs"], ["report", "📋", "Rapport du jour"], ["week", "🗓️", "Semaine"], ["costs", "💸", "Coûts"], ["money", "💰", "Comptes"], ["team", "👥", "Équipe"], ["meteo", "🌦️", "Météo"]];
// apps of other modules (alerts.js, planning.js, debrief.js, weekly.js, seasons.js)
const OS_RENDER = { alerts: () => alertsAppHtml(), planning: () => planAppHtml(), debriefs: () => debriefsAppHtml(), week: () => weekAppHtml(), costs: () => costsAppHtml(), meteo: () => meteoAppHtml() };
function openChiefOs(app) { if (app) osApp = app; osOverview = false; osBox.hidden = false; renderChiefOs(); }
function closeChiefOs() { osBox.hidden = true; if (chief.at === "chiefos") chief.at = "free"; }
function osAppHtml() {
  if (OS_RENDER[osApp]) return OS_RENDER[osApp]();
  const agents = curSession()?.agents || [], name = a => crew.ids[a.id] || specialty(a.type);
  if (osApp === "questions") {
    const qs = data.questions || [];
    return qs.length ? qs.map(q => `<div class="osrow"><b>❓ ${esc(q.from || "un agent")}</b><span>${esc(clip(q.question, 140))}</span><button data-os-q="${esc(q.id)}">Répondre</button></div>`).join("")
      : `<p class="muted">Aucune question en attente. 👌</p>`;
  }
  if (osApp === "mr") {
    const mrs = agents.filter(a => a.game?.mr);
    return mrs.length ? mrs.map(a => `<div class="osrow"><b>${esc(name(a))}${a.ticket ? ` · ${ticketLink(a.ticket)}` : ""}</b><span><a href="${esc(a.game.mr)}" target="_blank" rel="noopener">${mrLabel(a.game.mr)} ↗</a>${pipeTag(a.game.mr)}</span><span class="muted">${esc(clip(a.description, 60))}</span></div>`).join("")
      : `<p class="muted">Pas de merge request ouverte par les agents de la session.</p>`;
  }
  if (osApp === "tickets") {
    const mine = [...new Set(agents.map(a => a.ticket).filter(Boolean))], back = (data.backlog || []).filter(b => !mine.includes(b.id));
    const row = (id, who, extra) => { const yt = data.tickets?.[id]; return `<div class="osrow"><b>${ticketLink(id)}${yt?.state ? ` <small class="muted">${esc(yt.state)}</small>` : ""}</b><span>${esc(clip(yt?.summary || extra || "", 90))}</span><span class="muted">${esc(who)}</span></div>`; };
    return `<h4>EN COURS AVEC LES AGENTS</h4>${mine.length ? mine.map(id => row(id, agents.filter(a => a.ticket === id).map(name).join(", "))).join("") : `<p class="muted">—</p>`}
      <h4>BACKLOG (À GLISSER SUR UN BUREAU)</h4>${back.length ? back.map(b => row(b.id, "à prendre", b.summary)).join("") : `<p class="muted">—</p>`}`;
  }
  if (osApp === "report") {
    if (!osReport) { (DEMO ? Promise.resolve(demoReport(isoDay(0))) : fetch(`/api/report?day=${isoDay(0)}`).then(r => r.json())).then(r => { osReport = r; renderChiefOs(); }).catch(() => { osReport = { error: true }; renderChiefOs(); }); return `<p class="muted">Chargement…</p>`; }
    return osReport.error ? `<p class="muted">Serveur injoignable.</p>` : reportHtml(osReport);
  }
  if (osApp === "money") {
    const today = new Date().toDateString(), log = wallet.log.filter(l => new Date(l.t).toDateString() === today);
    const inT = log.filter(l => l.total > 0).reduce((s, l) => s + l.total, 0), outT = log.filter(l => l.total < 0).reduce((s, l) => s - l.total, 0);
    return `<div class="rstats"><div>solde<b>${fmtSim(wallet.funds)}</b></div><div>entrées du jour<b>+${fmtSim(inT)}</b></div><div>sorties du jour<b>−${fmtSim(outT)}</b></div><div>gagnés en tout<b>${fmtSim(wallet.earned)}</b></div><div>points de satisfaction<b>${wantBook.points}</b></div></div>
      ${wallet.log.slice(0, 15).map(l => `<div class="osrow"><b>${l.total >= 0 ? "＋" : "－"} ${fmtSim(Math.abs(l.total))}</b><span>${esc(l.label || `${l.who}${l.ticket ? ` · ${l.ticket}` : ""}`)}</span><span class="muted">${new Date(l.t).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")}`;
  }
  return TEAM.map(n => {
    if (isVacant(n)) return `<div class="osrow"><b>🪑 poste vacant</b><span class="muted">${esc(n)} a démissionné.</span><button data-recruit="${esc(n)}"${wallet.funds < RECRUIT_PRICE ? " disabled" : ""}>Recruter · ${fmtSim(RECRUIT_PRICE)}</button></div>`;
    const m = mate(n), best = SKILLS.filter(([id]) => skillXp(n, id) > 0).sort((a, b) => skillXp(n, b[0]) - skillXp(n, a[0]))[0];
    const where = onMission(n) ? "🖥️ en mission" : atHome(n) ? "🏡 à la maison" : "☕ salle de repos";
    return `<div class="osrow"><b>${esc(n)} <span style="color:${moodColor(m.moral)}">◆</span> <small class="muted">${esc(careerTitle(n))}</small></b><span>${traitsOf(n).map(id => TRAITS[id].icon).join(" ")} · ${esc(moodWord(m))}${best ? ` · ${best[1]} niv. ${skillLevel(n, best[0])}` : ""}${!devHasDesk(n) ? " · 😠 sans bureau" : ""}</span><span class="muted">${where} · ${wantsFor(n).map(w => w.icon).join("")}</span></div>`;
  }).join("") + petsRowHtml();
}
// Ubuntu look (GNOME, Yaru): top bar with Activités and the clock, the dock on the left, the app in a window;
// Activités (or ⋮⋮⋮ in the dock) shows the grid of applications with a search field
const APP_TINT = { questions: "#e95420", alerts: "#c7162b", planning: "#0e8420", mr: "#fc6d26", tickets: "#7764d8", debriefs: "#77216f",
  report: "#2c7ae0", week: "#19b6ee", costs: "#f99b11", money: "#38b44a", team: "#a3417d", meteo: "#3fa9f5" };
let osOverview = false, osFilter = "";
function osBadge(id) { const n = id === "questions" ? data.questions?.length : id === "alerts" ? smartAlerts.size : 0; return n ? `<b class="osbadge">${n}</b>` : ""; }
function renderChiefOs() {
  if (osBox.hidden) return;
  const now = clockNow(), [, icon, label] = OS_APPS.find(a => a[0] === osApp) || OS_APPS[0];
  const day = now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }), time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dock = OS_APPS.map(([id, ic, l]) => `<button data-os-app="${id}" class="${osApp === id && !osOverview ? "on" : ""}" title="${esc(l)}" style="--tint:${APP_TINT[id] || "#77216f"}"><span class="ic">${ic}</span>${osBadge(id)}</button>`).join("");
  const apps = OS_APPS.filter(([, , l]) => !osFilter || l.toLowerCase().includes(osFilter.toLowerCase()));
  const body = osOverview
    ? `<div class="ubover"><input class="ubsearch" placeholder="Rechercher une application…" value="${esc(osFilter)}" aria-label="Rechercher une application">
        <div class="ubgrid">${apps.map(([id, ic, l]) => `<button data-os-app="${id}" style="--tint:${APP_TINT[id] || "#77216f"}"><span class="ic">${ic}</span>${osBadge(id)}<small>${esc(l)}</small></button>`).join("") || `<p>Aucune application.</p>`}</div></div>`
    : `<section class="ubwin"><div class="ubhead"><span class="ubappic" style="--tint:${APP_TINT[osApp] || "#77216f"}">${icon}</span><b>${esc(label)}</b>
        <span class="ubctl"><button data-os="overview" title="Réduire">–</button><button data-os="max" title="Agrandir">▢</button><button class="x" data-os="close" title="Fermer (Échap)">×</button></span></div>
        <div class="osapp">${osAppHtml()}</div></section>`;
  osBox.innerHTML = `<div class="ubtop"><button class="ubact${osOverview ? " on" : ""}" data-os="overview">Activités</button><span class="ubtitle">${icon} ${esc(label)}</span>
      <span class="ubclock">${esc(day)}  ${time}</span><span class="ubsys"><span title="Réseau">📶</span><span title="Son">🔊</span><span title="Batterie">🔋</span><button data-os="close" title="Éteindre ChiefOS (Échap)">⏻</button></span></div>
    <div class="ubdesk"><nav class="ubdock">${dock}<span class="ubsep"></span><button data-os="overview" class="ubshow${osOverview ? " on" : ""}" title="Afficher les applications">⋮⋮⋮</button></nav>${body}</div>`;
  if (osOverview) { const s = osBox.querySelector(".ubsearch"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}
osBox.addEventListener("input", ev => { if (ev.target.classList.contains("ubsearch")) { osFilter = ev.target.value; renderChiefOs(); } });
osBox.addEventListener("keydown", ev => { if (ev.target.classList.contains("ubsearch") && ev.key === "Enter") { const first = osBox.querySelector(".ubgrid [data-os-app]"); if (first) first.click(); } });
osBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.os === "close") return closeChiefOs();
  if (b.dataset.os === "overview") { osOverview = !osOverview; osFilter = ""; return renderChiefOs(); }
  if (b.dataset.os === "max") { osBox.classList.toggle("max"); return; }
  if (b.dataset.osApp) { osApp = b.dataset.osApp; osOverview = false; osFilter = ""; if (osApp === "report") osReport = null; return renderChiefOs(); }
  if (b.dataset.osQ) { closeChiefOs(); openPanel(`q:${b.dataset.osQ}`); }
  if (b.dataset.recruit) { recruit(b.dataset.recruit); renderChiefOs(); }
});
addEventListener("keydown", ev => { if (ev.key === "Escape" && !osBox.hidden) { ev.stopImmediatePropagation(); closeChiefOs(); } }, true);
document.getElementById("osbtn").onclick = () => chiefToDesk();
// live apps refresh every 3 s; forms and long pages stay still
setInterval(() => { if (!osBox.hidden && !osOverview && !["report", "planning", "meteo", "debriefs", "week", "costs"].includes(osApp)) { const sc = osBox.querySelector(".osapp")?.scrollTop; renderChiefOs(); const a = osBox.querySelector(".osapp"); if (a) a.scrollTop = sc || 0; } }, 3000);
