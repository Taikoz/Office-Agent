// ChiefOS → ☀️ Aujourd'hui, the screen ChiefOS opens on: three answers at a glance — what waits for you, what runs, what
// was delivered today — each a click away from its detail (À traiter, the dev's screen, the report of the day).

import { CHIEF_NAME, clip, curSession, data, specialty } from "../core/core.js";
import { crew } from "../sims/crew.js";
import { esc, mrLabel, ticketLink } from "../core/data.js";
import { demoReport, isoDay } from "../agents/report.js";
import { closeChiefOs, renderChiefOs } from "../ui/chiefos.js";
import { openPc } from "../agents/pc.js";
import { OsApp } from "./base.js";
import { smartAlerts } from "./alerts.js";

const REPORT_TTL = 60_000;
const STATUS = { working: "au travail", blocked: "bloqué" };

class TodayApp extends OsApp {
  constructor() { super("today", "☀️", "Aujourd'hui", "#f2a900", { live: true }); this.report = null; this.at = 0; }
  open() { this.at = 0; }
  badge() { return 0; }  // À traiter carries the count
  loadReport() {
    if (Date.now() - this.at < REPORT_TTL) return;
    this.at = Date.now();
    (DEMO ? Promise.resolve(demoReport(isoDay(0))) : fetch(`/api/report?day=${isoDay(0)}`).then(r => r.json()))
      .then(r => { this.report = r; renderChiefOs(); }).catch(() => { this.report = { error: true }; });
  }
  render() {
    this.loadReport();
    const qs = data.questions || [], al = smartAlerts.size, waiting = qs.length + al;
    const name = a => crew.ids[a.id] || specialty(a.type);
    const running = (curSession()?.agents || []).filter(a => STATUS[a.status]).sort((a, b) => (b.status === "blocked") - (a.status === "blocked"));
    const r = this.report, done = r && !r.error ? r.delivered : null;
    // each count in its colour (orange: it waits for you, red: an agent is blocked, blue: at work, green: delivered) and a door to its detail
    const card = (label, n, state, sub, act) => `<button class="tdcard ${state}" ${act}><b>${n ?? "…"}</b><span>${label}</span><small>${sub}</small></button>`;
    const blocked = running.filter(a => a.status === "blocked").length, hour = new Date().getHours();
    return `<div class="tdhello"><b>${hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour"} ${esc(CHIEF_NAME)}</b><span class="muted">${esc(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} · ${waiting ? `${waiting} chose${waiting > 1 ? "s" : ""} t'attend${waiting > 1 ? "ent" : ""}` : "rien ne t'attend"}</span></div>
      <div class="tdcards">${card("t'attendent", waiting, waiting ? "warn" : "ok", waiting ? "questions et alertes" : "tout est traité", `data-os-app="inbox"`)}
      ${card("en cours", running.length, blocked ? "bad" : running.length ? "run" : "", blocked ? `${blocked} bloqué${blocked > 1 ? "s" : ""}` : running.length ? "voir son écran" : "aucun agent au travail", running.length ? `data-today-screen="${esc(running[0].id)}"` : "disabled")}
      ${card("livrés aujourd'hui", done?.length, done?.length ? "ok" : "", "le rapport du jour", `data-os-app="report"`)}</div>
      <h4>CE QUI T'ATTEND</h4>${waiting ? `${qs.slice(0, 3).map(q => `<div class="osrow"><b>❓ ${esc(q.from || "un agent")}</b><span>${esc(clip(q.question, 120))}</span><button data-os-q="${esc(q.id)}">Répondre</button></div>`).join("")}
        ${al ? `<div class="osrow"><b>🚨 ${al} alerte${al > 1 ? "s" : ""}</b><span class="muted">${esc([...smartAlerts.values()].slice(0, 2).map(x => x.title).join(" · "))}</span><span></span></div>` : ""}
        <div class="osacts"><button data-os-app="inbox">📥 Tout voir dans À traiter</button></div>` : `<p class="osfine">✓ Rien ne t'attend : aucune question, aucune alerte.</p>`}
      <h4>EN COURS</h4>${running.length ? running.map(a => `<div class="osrow"><b>${a.status === "blocked" ? "⛔" : "⚙️"} ${esc(name(a))}${a.ticket ? ` · ${ticketLink(a.ticket)}` : ""}</b><span class="muted">${STATUS[a.status]} — ${esc(clip(a.description, 70))}</span><button data-today-screen="${esc(a.id)}">🖥️ Écran</button></div>`).join("")
        : `<p class="osnone">Aucun agent ne travaille en ce moment. Clique un bureau libre du bureau pour en lancer un.</p>`}
      <h4>LIVRÉ AUJOURD'HUI</h4>${!r ? `<p class="muted osloading" role="status">Chargement…</p>` : r.error ? `<p class="oserror" role="alert"><b>Serveur injoignable</b><span>Le rapport du jour n'a pas pu être lu ; il est relu toutes les minutes.</span></p>` : done.length
        ? done.slice(0, 8).map(x => `<div class="osrow"><b>✅ ${esc(clip(x.description, 70))}</b><span>${x.mr ? `<a href="${esc(x.mr)}" target="_blank" rel="noopener">${mrLabel(x.mr)} ↗</a>` : ""}${x.tests ? ` · ${x.tests.ok ? "tests verts" : "tests rouges"}` : ""}</span><span></span></div>`).join("")
          + `<div class="osacts"><button data-os-app="report">📋 Rapport complet</button></div>`
        : `<p class="osnone">Rien de livré pour l'instant.</p>`}`;
  }
  click(b, ev) {
    if (b.dataset.todayScreen) { closeChiefOs(); openPc(b.dataset.todayScreen); return true; }
    return OsApp.get("questions").click(b, ev);
  }
}
new TodayApp();
