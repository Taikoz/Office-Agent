// ChiefOS → 📊 Tableau de bord: the agents over 7, 30 or 90 days (/api/dashboard). The period on top (it scopes
// everything below), the headline tiles with their trend, then the charts: runs per day (delivered, blocked, others,
// stacked), the estimated cost per day, success per kind of agent, why they get blocked. Charts: ui/charts.js.

import { specialty } from "../core/core.js";
import { esc, money } from "../core/data.js";
import { durH } from "../agents/report.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { CH, area, bars, columns, compact, dataTable, legend, tile } from "../ui/charts.js";

let dash = null, dashDays = 30, loading = false;
function demoDash() {
  const perDay = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10); const runs = 2 + (i * 7) % 6; return { day: d, runs, done: runs - 1 - (i % 3 === 0 ? 1 : 0), blocked: i % 3 === 0 ? 1 : 0, cost: +(runs * 1.7 + (i % 5)).toFixed(2), seconds: runs * 900 }; });
  return { days: 30, perDay, perType: [{ type: "feature-builder", runs: 21, done: 17, blocked: 3, cost: 52.1, avgCost: 2.48, avgMin: 31.5, rate: 81, errors: 40 }, { type: "mr-reviewer", runs: 14, done: 14, blocked: 0, cost: 8.4, avgCost: 0.6, avgMin: 6.2, rate: 100, errors: 3 }, { type: "e2e-test-writer", runs: 6, done: 3, blocked: 3, cost: 19.8, avgCost: 3.3, avgMin: 44, rate: 50, errors: 31 }],
    causes: [{ cause: "délai dépassé", n: 3 }, { cause: "tests", n: 2 }, { cause: "dépendance", n: 1 }] };
}
async function loadDash() {
  loading = true;
  try { dash = DEMO ? demoDash() : await (await fetch(`/api/dashboard?days=${dashDays}`, { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { dash = { error: true }; }
  loading = false; renderChiefOs();
}
const dayLabel = iso => new Date(`${iso}T12:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const short = iso => new Date(`${iso}T12:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
// the kind of agent in sentence case (specialty() is the uppercase badge of the office)
const kindName = t => { const s = specialty(t).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const STACK = [{ key: "done", label: "Livrés", color: CH.done }, { key: "blocked", label: "Bloqués", color: CH.blocked }, { key: "other", label: "Autres (en cours, abandonnés)", color: CH.other }];

function dashboardAppHtml() {
  const period = `<div class="chfilters"><span class="chseg" role="group" aria-label="Période">${[7, 30, 90].map(x => `<button data-dash="${x}" class="${dashDays === x ? "on" : ""}" aria-pressed="${dashDays === x}">${x} jours</button>`).join("")}</span>
    <span class="muted">Coûts estimés au tarif API, même sur abonnement.</span></div>`;
  if (!dash) { if (!loading) loadDash(); return `${period}<p class="muted osloading" role="status">Calcul sur ${dashDays} jours…</p>`; }
  if (dash.error) return `${period}<div class="oserror" role="alert"><b>Le serveur ne répond pas</b><span>Le tableau de bord se calcule à partir des transcripts.</span><div class="osacts"><button data-dash="${dashDays}">↻ Réessayer</button></div></div>`;
  // every day of the period, the quiet ones at zero: the time axis stays continuous
  const d = dash, byDay = Object.fromEntries(d.perDay.map(x => [x.day, x])), iso = t => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const first = d.perDay.length ? Math.max(Date.parse(`${d.perDay[0].day}T12:00`), Date.now() - (dashDays - 1) * 864e5) : Date.now();
  const days = Array.from({ length: Math.max(1, Math.round((Date.now() - first) / 864e5) + 1) }, (_, i) => iso(first + i * 864e5))
    .map(day => { const x = byDay[day] || { day, runs: 0, done: 0, blocked: 0, cost: 0, seconds: 0 }; return { ...x, other: Math.max(0, x.runs - x.done - x.blocked) }; });
  const active = days.filter(x => x.runs).length;
  const tot = k => days.reduce((s, x) => s + x[k], 0), runs = tot("runs"), done = tot("done"), blocked = tot("blocked"), cost = tot("cost");
  if (!runs) return `${period}<div class="osempty"><span class="osemptyic" aria-hidden="true">📊</span><b>Aucun agent sur ${dashDays} jours</b><span>Les graphiques se remplissent dès qu'un sous-agent travaille.</span></div>`;
  const rate = Math.round(100 * done / runs);
  const tiles = `<div class="chtiles">
    ${tile({ label: "Runs", value: runs, spark: days.map(x => x.runs), hint: `${(runs / Math.max(1, active)).toFixed(1)} par jour actif · ${active} jour${active > 1 ? "s" : ""}` })}
    ${tile({ label: "Livrés", value: `${rate} %`, spark: days.filter(x => x.runs).map(x => x.done / x.runs), hint: `${done} sur ${runs}`, tone: rate >= 80 ? "good" : rate < 50 ? "bad" : "" })}
    ${tile({ label: "Bloqués", value: blocked, spark: days.map(x => x.blocked), color: CH.blocked, hint: blocked ? `${Math.round(100 * blocked / runs)} % des runs` : "aucun 🎉" })}
    ${tile({ label: "Coût estimé", value: money(cost), spark: days.map(x => x.cost), color: CH.money, hint: `${money(cost / runs)} par run` })}
    ${tile({ label: "Temps agents", value: durH(tot("seconds")), spark: days.map(x => x.seconds), color: CH.money, hint: `${durH(tot("seconds") / runs)} par run` })}</div>`;
  const perDay = columns({ rows: days.map(x => ({ ...x, label: dayLabel(x.day), short: short(x.day) })), stack: STACK, aria: "Runs par jour : livrés, bloqués, autres" });
  const costDay = area({ rows: days.map(x => ({ label: dayLabel(x.day), short: short(x.day), value: x.cost })), name: "Coût estimé", fmt: v => money(v), tickFmt: v => `$${compact(v)}`, aria: "Coût estimé par jour" });
  const types = [...d.perType].sort((a, b) => b.runs - a.runs);
  const perType = bars({ rows: types.map(t => ({ key: kindName(t.type), label: esc(kindName(t.type)), values: { done: t.done, blocked: t.blocked, other: Math.max(0, t.runs - t.done - t.blocked) },
    meta: `${t.rate} % livrés · ${money(t.avgCost)} / run · ${t.avgMin} min · ${t.errors} erreur${t.errors > 1 ? "s" : ""}` })), stack: STACK });
  const causes = d.causes.length ? bars({ rows: d.causes.map(c => ({ key: c.cause, label: esc(c.cause), values: { n: c.n } })), stack: [{ key: "n", label: "Blocages", color: CH.blocked }], fmt: v => `${v}×` })
    : `<div class="cvclear">✓ Aucun blocage sur la période.</div>`;
  return `${period}${tiles}
    <section class="chcard chwide"><div class="chhead"><h4>Runs par jour</h4>${legend(STACK.map(k => [k.label, k.color]))}</div>${perDay}
      ${dataTable(["Jour", "Runs", "Livrés", "Bloqués", "Coût", "Temps"], days.map(x => [x.day, x.runs, x.done, x.blocked, money(x.cost), durH(x.seconds)]))}</section>
    <section class="chcard chwide"><div class="chhead"><h4>Coût estimé par jour</h4><span class="muted">${money(cost)} sur la période</span></div>${costDay}</section>
    <div class="chgrid2"><section class="chcard"><div class="chhead"><h4>Par type d'agent</h4>${legend(STACK.slice(0, 2).map(k => [k.label, k.color]))}</div>${perType}</section>
      <section class="chcard"><div class="chhead"><h4>Pourquoi ils bloquent</h4><span class="muted">${blocked} blocage${blocked > 1 ? "s" : ""}</span></div>${causes}</section></div>
    <p class="muted">Détail par ticket et par projet : 💸 Coûts. Les erreurs déjà vues sont rappelées dans le formulaire de lancement.</p>`;
}

class DashboardApp extends OsApp {
  constructor() { super("dashboard", "📊", "Tableau de bord", "#1c71d8"); }
  render() { return dashboardAppHtml(); }
  click(b) {
    if (!b.dataset.dash) return false;
    dashDays = +b.dataset.dash; dash = null; renderChiefOs();
    return true;
  }
}
new DashboardApp();
