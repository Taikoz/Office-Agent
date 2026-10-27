// ChiefOS → 💸 Coûts: where the tokens go over 30 days (/api/costs). Tiles (total, runs, time, median per ticket),
// then the cost per project and the most expensive tickets as bars, each split by outcome of its runs (the bar's
// length is its cost), the "gouffres" (more than twice the median, or blocked twice) flagged. Charts: ui/charts.js.

import { specialty } from "../core/core.js";
import { esc, money, ticketLink } from "../core/data.js";
import { durH } from "../agents/report.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { CH, bars, dataTable, legend, tile } from "../ui/charts.js";

let costsData = null, loading = false, allTickets = false;
function demoCosts() {
  return { days: 30, total: { runs: 21, cost: 38.4, seconds: 52000 }, projects: [{ key: "front", runs: 12, cost: 24.1, seconds: 31000, done: 9, blocked: 2, types: { "feature-builder": 8 } }, { key: "billing-api", runs: 9, cost: 14.3, seconds: 21000, done: 8, blocked: 0, types: { "feature-builder": 5 } }],
    tickets: [{ key: "DEMO-101", runs: 5, cost: 14.2, seconds: 16000, done: 2, blocked: 2, types: { "feature-builder": 3, "mr-reviewer": 2 } }, { key: "DEMO-102", runs: 2, cost: 3.1, seconds: 4000, done: 2, blocked: 0, types: { "security-auditor": 2 } }, { key: "DEMO-104", runs: 3, cost: 6.8, seconds: 9000, done: 1, blocked: 1, types: { "e2e-test-writer": 3 } }] };
}
async function loadCosts() {
  loading = true;
  try { costsData = DEMO ? demoCosts() : await (await fetch("/api/costs?days=30", { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { costsData = { error: true }; }
  loading = false; renderChiefOs();
}
// a bar's length is the cost; it is split in proportion to the runs' outcome (delivered, blocked, others)
const STACK = [{ key: "done", label: "Livrés", color: CH.done }, { key: "blocked", label: "Bloqués", color: CH.blocked }, { key: "other", label: "Autres", color: CH.other }];
// the kind of agent in sentence case (specialty() is the uppercase badge of the office)
const kindName = t => { const s = specialty(t).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const split = t => { const n = Math.max(1, t.runs), other = Math.max(0, t.runs - t.done - t.blocked); return { done: t.cost * t.done / n, blocked: t.cost * t.blocked / n, other: t.cost * other / n }; };
const meta = t => `${t.runs} run${t.runs > 1 ? "s" : ""} · ${durH(t.seconds)} · ${t.done} livré${t.done > 1 ? "s" : ""}${t.blocked ? ` · ${t.blocked} bloqué${t.blocked > 1 ? "s" : ""}` : ""} · ${esc(Object.entries(t.types).map(([k, n]) => `${kindName(k)} ×${n}`).join(", "))}`;

function costsAppHtml() {
  if (!costsData) { if (!loading) loadCosts(); return `<p class="muted osloading" role="status">Calcul des coûts sur 30 jours…</p>`; }
  if (costsData.error) return `<div class="oserror" role="alert"><b>Le serveur ne répond pas</b><span>Les coûts se calculent à partir des transcripts.</span></div>`;
  const c = costsData, sorted = c.tickets.map(t => t.cost).sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] || 0;
  const pit = t => t.cost > Math.max(1, median * 2) || t.blocked >= 2;
  if (!c.total.runs) return `<div class="osempty"><span class="osemptyic" aria-hidden="true">💸</span><b>Aucune dépense sur 30 jours</b><span>Les coûts apparaissent dès qu'un sous-agent travaille.</span></div>`;
  const pits = c.tickets.filter(pit), top = c.tickets.slice(0, allTickets ? 60 : 12);
  const tiles = `<div class="chtiles">
    ${tile({ label: "Coût sur 30 jours", value: money(c.total.cost), hint: `${money(c.total.cost / Math.max(1, c.total.runs))} par run` })}
    ${tile({ label: "Runs", value: c.total.runs, hint: `${c.tickets.length} ticket${c.tickets.length > 1 ? "s" : ""}, ${c.projects.length} projet${c.projects.length > 1 ? "s" : ""}` })}
    ${tile({ label: "Temps agents", value: durH(c.total.seconds) })}
    ${tile({ label: "Médiane par ticket", value: money(median), hint: pits.length ? `${pits.length} gouffre${pits.length > 1 ? "s" : ""} 🕳️` : "aucun gouffre", tone: pits.length ? "bad" : "good" })}</div>`;
  const row = (t, isTicket) => ({ key: t.key, label: isTicket ? ticketLink(t.key) : esc(t.key), values: split(t), meta: meta(t), flag: isTicket && pit(t) ? ' <span class="pit" title="Plus du double de la médiane, ou bloqué deux fois : à découper ?">🕳️ gouffre</span>' : "" });
  const total = t => t.values.done + t.values.blocked + t.values.other;
  return `${tiles}
    <section class="chcard"><div class="chhead"><h4>Par projet</h4>${legend(STACK.map(k => [k.label, k.color]))}</div>
      ${bars({ rows: c.projects.map(p => row(p, false)), stack: STACK, fmt: money, total })}</section>
    <section class="chcard"><div class="chhead"><h4>Tickets les plus chers</h4><span class="muted">la longueur est le coût, découpé selon l'issue des runs</span></div>
      ${top.length ? bars({ rows: top.map(t => row(t, true)), stack: STACK, fmt: money, total }) : `<p class="muted">Aucun ticket sur la période.</p>`}
      ${c.tickets.length > 12 ? `<div class="osacts"><button data-costs="all">${allTickets ? "Montrer les 12 premiers" : `Voir les ${Math.min(60, c.tickets.length)} tickets`}</button></div>` : ""}
      ${dataTable(["Ticket", "Coût", "Runs", "Livrés", "Bloqués", "Temps"], c.tickets.map(t => [t.key, money(t.cost), t.runs, t.done, t.blocked, durH(t.seconds)]))}</section>
    <p class="muted">Coût estimé au tarif API (équivalent, même sur abonnement). 🕳️ gouffre = plus du double de la médiane, ou bloqué deux fois : à découper ?</p>`;
}

class CostsApp extends OsApp {
  constructor() { super("costs", "💸", "Coûts", "#f99b11"); }
  render() { return costsAppHtml(); }
  click(b) { if (b.dataset.costs !== "all") return false; allTickets = !allTickets; renderChiefOs(); return true; }
}
new CostsApp();
