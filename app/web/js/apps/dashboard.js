// ChiefOS → 📊 Tableau de bord: the agents over 7, 30 or 90 days (/api/dashboard): runs, cost and time per day,
// success per kind of agent, why they get blocked.

import { specialty } from "../core/core.js";
import { esc, money } from "../core/data.js";
import { durH } from "../agents/report.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

let dash = null, dashDays = 30;
function demoDash() {
  const perDay = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10); const runs = 2 + (i * 7) % 6; return { day: d, runs, done: runs - (i % 3), blocked: i % 3 === 0 ? 1 : 0, cost: +(runs * 1.7).toFixed(2), seconds: runs * 900 }; });
  return { days: 30, perDay, perType: [{ type: "feature-builder", runs: 21, done: 17, blocked: 3, cost: 52.1, avgCost: 2.48, avgMin: 31.5, rate: 81, errors: 40 }, { type: "mr-reviewer", runs: 14, done: 14, blocked: 0, cost: 8.4, avgCost: 0.6, avgMin: 6.2, rate: 100, errors: 3 }, { type: "e2e-test-writer", runs: 6, done: 3, blocked: 3, cost: 19.8, avgCost: 3.3, avgMin: 44, rate: 50, errors: 31 }],
    causes: [{ cause: "délai dépassé", n: 3 }, { cause: "tests", n: 2 }, { cause: "dépendance", n: 1 }] };
}
async function loadDash() {
  try { dash = DEMO ? demoDash() : await (await fetch(`/api/dashboard?days=${dashDays}`, { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { dash = { error: true }; }
  renderChiefOs();
}
function dashboardAppHtml() {
  if (!dash) { loadDash(); return `<p class="muted">Calcul sur ${dashDays} jours…</p>`; }
  if (dash.error) return `<p class="muted">Serveur injoignable.</p>`;
  const d = dash, tot = k => d.perDay.reduce((s, x) => s + x[k], 0), runs = tot("runs");
  const W = 640, H = 150, n = Math.max(1, d.perDay.length), bw = W / n, maxR = Math.max(1, ...d.perDay.map(x => x.runs)), maxC = Math.max(0.01, ...d.perDay.map(x => x.cost));
  const bars = d.perDay.map((x, i) => { const h = (x.runs / maxR) * (H - 30), hd = (x.done / maxR) * (H - 30); return `<g><title>${x.day} : ${x.runs} run(s), ${x.done} livré(s), ${x.blocked} bloqué(s), ${money(x.cost)}</title><rect x="${i * bw + 3}" y="${H - 18 - h}" width="${bw - 6}" height="${h}" rx="3" fill="#5e5c64"/><rect x="${i * bw + 3}" y="${H - 18 - hd}" width="${bw - 6}" height="${hd}" rx="3" fill="#2da160"/></g>`; }).join("");
  const line = d.perDay.map((x, i) => `${i ? "L" : "M"}${i * bw + bw / 2} ${H - 18 - (x.cost / maxC) * (H - 30)}`).join(" ");
  const labels = d.perDay.map((x, i) => i % Math.ceil(n / 8) === 0 ? `<text x="${i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${x.day.slice(5)}</text>` : "").join("");
  return `<div class="osacts"><b>📊 Agents sur</b>${[7, 30, 90].map(x => `<button data-dash="${x}" class="${dashDays === x ? "ubok" : ""}">${x} jours</button>`).join("")}</div>
    <div class="rstats"><div>runs<b>${runs}</b></div><div>livrés<b>${tot("done")} <small>(${runs ? Math.round(100 * tot("done") / runs) : 0} %)</small></b></div><div>bloqués<b>${tot("blocked")}</b></div><div>coût estimé<b>${money(tot("cost"))}</b></div><div>temps agents<b>${durH(tot("seconds"))}</b></div><div>coût moyen / run<b>${money(runs ? tot("cost") / runs : 0)}</b></div></div>
    <h4>PAR JOUR — runs (gris), livrés (vert), coût (orange)</h4>
    <svg class="dashchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Runs et coût par jour">${bars}<path d="${line}" fill="none" stroke="#e95420" stroke-width="2.5"/>${labels}</svg>
    <h4>PAR TYPE D'AGENT</h4>${d.perType.map(t => `<div class="osrow"><b>${esc(specialty(t.type))}</b><span><span class="dashrate"><i style="width:${t.rate}%;background:${t.rate >= 80 ? "#2da160" : t.rate >= 50 ? "#e9be74" : "#ec5941"}"></i></span> ${t.rate} % livrés · ${t.runs} run(s) · ${t.blocked} bloqué(s)</span><span class="muted">${money(t.avgCost)} / run · ${t.avgMin} min · ${t.errors} erreurs</span></div>`).join("") || `<p class="muted">Aucun run.</p>`}
    <h4>POURQUOI ILS BLOQUENT</h4>${d.causes.length ? d.causes.map(c => `<div class="osrow"><b>${esc(c.cause)}</b><span><span class="dashrate"><i style="width:${Math.round(100 * c.n / d.causes[0].n)}%;background:#ec5941"></i></span></span><span class="muted">${c.n} fois</span></div>`).join("") : `<p class="muted">Aucun blocage sur la période. 🎉</p>`}
    <p class="muted">Coûts estimés au tarif API. Détail par ticket : 💸 Coûts ; erreurs déjà vues : formulaire de lancement.</p>`;
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
