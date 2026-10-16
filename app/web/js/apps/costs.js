// ChiefOS → 💸 Coûts: costs per ticket and per project over 30 days (/api/costs), where the tokens go, with the
// "gouffres" (expensive or often blocked tickets) singled out.

import { specialty } from "../core/core.js";
import { esc, money, ticketLink } from "../core/data.js";
import { durH } from "../agents/report.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

let costsData = null;
function demoCosts() {
  return { days: 30, total: { runs: 21, cost: 38.4, seconds: 52000 }, projects: [{ key: "front", runs: 12, cost: 24.1, seconds: 31000, done: 9, blocked: 2, types: { "feature-builder": 8 } }, { key: "billing-api", runs: 9, cost: 14.3, seconds: 21000, done: 8, blocked: 0, types: { "feature-builder": 5 } }],
    tickets: [{ key: "DEMO-101", runs: 5, cost: 14.2, seconds: 16000, done: 2, blocked: 2, types: { "feature-builder": 3, "mr-reviewer": 2 } }, { key: "DEMO-102", runs: 2, cost: 3.1, seconds: 4000, done: 2, blocked: 0, types: { "security-auditor": 2 } }, { key: "DEMO-104", runs: 3, cost: 6.8, seconds: 9000, done: 1, blocked: 1, types: { "e2e-test-writer": 3 } }] };
}
async function loadCosts() {
  try { costsData = DEMO ? demoCosts() : await (await fetch("/api/costs?days=30")).json(); } catch (_) { costsData = { error: true }; }
  renderChiefOs();
}
function costsAppHtml() {
  if (!costsData) { loadCosts(); return `<p class="muted">Calcul des coûts sur 30 jours…</p>`; }
  if (costsData.error) return `<p class="muted">Serveur injoignable.</p>`;
  const c = costsData, costs = c.tickets.map(t => t.cost).sort((a, b) => a - b), median = costs[Math.floor(costs.length / 2)] || 0;
  const pit = t => t.cost > Math.max(1, median * 2) || t.blocked >= 2;
  const row = (t, isTicket) => `<div class="osrow"><b>${isTicket ? ticketLink(t.key) : esc(t.key)}${isTicket && pit(t) ? ' <span class="pit">🕳️ gouffre</span>' : ""}</b><span>${money(t.cost)} · ${t.runs} run(s) · ${durH(t.seconds)} · ${t.done} livré(s)${t.blocked ? ` · <span class="s-blocked">${t.blocked} bloqué(s)</span>` : ""}</span><span class="muted">${esc(Object.entries(t.types).map(([k, n]) => `${specialty(k)} ×${n}`).join(", "))}</span></div>`;
  return `<div class="rstats"><div>30 jours<b>${money(c.total.cost)}</b></div><div>runs<b>${c.total.runs}</b></div><div>temps agents<b>${durH(c.total.seconds)}</b></div><div>coût médian / ticket<b>${money(median)}</b></div></div>
    <p class="muted">Coût estimé au tarif API (équivalent, même sur abonnement). 🕳️ = plus du double de la médiane, ou bloqué deux fois : à découper ?</p>
    <h4>PAR TICKET</h4>${c.tickets.slice(0, 25).map(t => row(t, true)).join("") || `<p class="muted">—</p>`}
    <h4>PAR PROJET</h4>${c.projects.map(p => row(p, false)).join("") || `<p class="muted">—</p>`}`;
}

class CostsApp extends OsApp {
  constructor() { super("costs", "💸", "Coûts", "#f99b11"); }
  render() { return costsAppHtml(); }
}
new CostsApp();
