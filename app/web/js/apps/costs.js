// ChiefOS → 💸 Coûts: where the money goes over 7, 30 or 90 days, every transcript included (main sessions and
// subagents, /api/spend, spend.py), then the tickets of the agents (/api/costs, history.py). The period on top; tiles
// (total with its trend, the 30-day projection, the daily average, what the cache saved, the subagents' share); the
// cost per day (sessions and subagents stacked); per model, per kind of token, per project, per agent; the most
// expensive sessions and missions; the tickets split by the outcome of their runs, the « gouffres » flagged.
// Every figure is an API-equivalent estimate: on a subscription nothing is billed per token. Charts: ui/charts.js.

import { specialty } from "../core/core.js";
import { esc, money, ticketLink } from "../core/data.js";
import { durH } from "../agents/report.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { CH, bars, columns, compact, dataTable, legend, tile } from "../ui/charts.js";

let days = 30, sp = null, tk = null, loading = false, allTickets = false;
// colours validated for colour blindness on the ChiefOS card surface (blue, orange, aqua, yellow)
const FAMILY = { sonnet: ["Sonnet", "#3987e5"], opus: ["Opus", "#d95926"], haiku: ["Haiku", "#199e70"], fable: ["Fable", "#c98500"] };
const KIND = [["in", "Entrée", "#3987e5", "les tokens envoyés, hors cache"], ["cw", "Écrits en cache", "#d95926", "facturés 1,25 × l'entrée"], ["cr", "Lus du cache", "#199e70", "le moins cher : le contexte déjà envoyé"], ["out", "Sortie", "#c98500", "ce que le modèle écrit, le plus cher"]];
const SPLIT = [{ key: "sub", label: "Sous-agents", color: "#3987e5" }, { key: "main", label: "Sessions principales", color: "#d95926" }];
const OUTCOME = [{ key: "done", label: "Livrés", color: CH.done }, { key: "blocked", label: "Bloqués", color: CH.blocked }, { key: "other", label: "Autres", color: CH.other }];

function demo() {
  const daily = Array.from({ length: 30 }, (_, i) => ({ day: new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10), main: +(1 + (i % 4) * 0.8).toFixed(2), sub: +((i * 7) % 9 * 0.9).toFixed(2) }));
  const total = daily.reduce((s, d) => s + d.main + d.sub, 0);
  return { days: 30, total: +total.toFixed(2), previous: +(total * 0.82).toFixed(2), main: +daily.reduce((s, d) => s + d.main, 0).toFixed(2), sub: +daily.reduce((s, d) => s + d.sub, 0).toFixed(2),
    transcripts: 84, activeDays: 30, perDay: +(total / 30).toFixed(2), projection30: +total.toFixed(2), saved: 312.4, daily,
    families: [{ family: "opus", cost: 140.2, calls: 2100, in: 2e6, cw: 9e6, cr: 160e6, out: 2.1e6 }, { family: "sonnet", cost: 41.5, calls: 1300, in: 1e6, cw: 4e6, cr: 70e6, out: 1.1e6 }, { family: "haiku", cost: 1.9, calls: 400, in: 3e5, cw: 1e6, cr: 9e6, out: 2e5 }],
    tokens: { in: { tokens: 3.3e6, cost: 15.1 }, cw: { tokens: 14e6, cost: 63.2 }, cr: { tokens: 239e6, cost: 46.7 }, out: { tokens: 3.4e6, cost: 58.6 } },
    projects: [{ key: "front", cost: 96.3, runs: 40 }, { key: "billing-api", cost: 61.2, runs: 31 }, { key: "infra", cost: 26.1, runs: 13 }],
    agents: [{ key: "session principale", cost: 71.4, runs: 22 }, { key: "feature-builder", cost: 80.1, runs: 30 }, { key: "mr-reviewer", cost: 18.2, runs: 25 }, { key: "security-auditor", cost: 13.9, runs: 7 }],
    top: [{ cost: 18.4, sub: true, agent: "feature-builder", project: "front", ticket: "DEMO-101", description: "Implémenter l'export CSV des factures", last: Date.now() / 1000 - 9e4 },
      { cost: 12.1, sub: false, agent: "session principale", project: "billing-api", ticket: null, description: "", last: Date.now() / 1000 - 3e5 }] };
}
const demoTickets = () => ({ days: 30, total: { runs: 21, cost: 38.4, seconds: 52000 }, projects: [], tickets: [{ key: "DEMO-101", runs: 5, cost: 14.2, seconds: 16000, done: 2, blocked: 2, types: { "feature-builder": 3, "mr-reviewer": 2 } }, { key: "DEMO-102", runs: 2, cost: 3.1, seconds: 4000, done: 2, blocked: 0, types: { "security-auditor": 2 } }] });

async function load() {
  loading = true;
  const get = path => fetch(path, { headers: { "X-Office-Token": TOKEN } }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  try { [sp, tk] = DEMO ? [demo(), demoTickets()] : await Promise.all([get(`/api/spend?days=${days}`), get(`/api/costs?days=${days}`)]); } catch (e) { sp = { error: e.message }; }
  loading = false; renderChiefOs();
}
// the kind of agent in sentence case (specialty() is the uppercase badge of the office)
const kindName = t => { const s = specialty(t).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const who = a => a === "session principale" ? "Session principale" : a === "agent" ? "Sous-agent" : kindName(a);
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const dayLabel = d => new Date(`${d}T12:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const short = d => new Date(`${d}T12:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
const isoDay = t => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const one = (rows, color = CH.money) => bars({ rows, stack: [{ key: "c", label: "Coût", color }], fmt: money });

function tilesHtml(s) {
  const trend = s.previous && s.previousComplete ? Math.round(100 * (s.total - s.previous) / s.previous) : null;
  return `<div class="chtiles">
    ${tile({ label: `Coût sur ${days} jours`, value: money(s.total), spark: s.daily.map(d => d.main + d.sub), color: CH.money,
      hint: trend == null ? (s.previousComplete ? "pas de période précédente" : "période précédente incomplète (transcripts effacés)") : `${trend > 0 ? "↑" : trend < 0 ? "↓" : "="} ${Math.abs(trend)} % vs les ${days} jours d'avant`, tone: trend != null && trend > 25 ? "bad" : "" })}
    ${tile({ label: "Projection 30 jours", value: money(s.projection30), hint: `${money(s.perDay)} par jour en moyenne` })}
    ${tile({ label: "Économisé par le cache", value: money(s.saved), hint: `${compact(s.tokens.cr.tokens)} tokens relus au tarif du cache`, tone: "good" })}
    ${tile({ label: "Sous-agents", value: `${pct(s.sub, s.total)} %`, hint: `${money(s.sub)} ; sessions principales ${money(s.main)}` })}
    ${tile({ label: "Conversations", value: s.transcripts, hint: `${s.activeDays} jour${s.activeDays > 1 ? "s" : ""} actif${s.activeDays > 1 ? "s" : ""} · ${money(s.total / Math.max(1, s.transcripts))} chacune` })}</div>`;
}
function dailyHtml(s) {
  // every day of the period, the quiet ones at zero: the time axis stays continuous
  const by = Object.fromEntries(s.daily.map(d => [d.day, d])), first = s.daily.length ? Math.max(Date.parse(`${s.daily[0].day}T12:00`), Date.now() - (days - 1) * 864e5) : Date.now();
  const rows = Array.from({ length: Math.max(1, Math.round((Date.now() - first) / 864e5) + 1) }, (_, i) => isoDay(first + i * 864e5))
    .map(day => ({ ...(by[day] || { main: 0, sub: 0 }), day, label: dayLabel(day), short: short(day) }));
  return `<section class="chcard"><div class="chhead"><h4>Coût par jour</h4>${legend(SPLIT.map(k => [k.label, k.color]))}</div>
    ${columns({ rows, stack: SPLIT, fmt: v => `$${compact(v)}`, aria: "Coût estimé par jour, sous-agents et sessions principales" })}
    <p class="muted">Une conversation compte le jour de sa dernière activité.</p>
    ${dataTable(["Jour", "Sous-agents", "Sessions", "Total"], rows.filter(r => r.main || r.sub).map(r => [r.day, money(r.sub), money(r.main), money(r.sub + r.main)]))}</section>`;
}
function modelsHtml(s) {
  const fams = s.families.filter(f => f.cost > 0), name = f => FAMILY[f]?.[0] || f;
  const models = fams.length ? bars({ rows: fams.map(f => ({ key: name(f.family), label: esc(name(f.family)), values: { [f.family]: f.cost },
    meta: `${pct(f.cost, s.total)} % · ${compact(f.calls)} appels · ${compact(f.out)} tokens écrits` })),
    stack: fams.map(f => ({ key: f.family, label: name(f.family), color: FAMILY[f.family]?.[1] || CH.other })), fmt: money }) : `<p class="muted">Aucun appel.</p>`;
  const tokens = bars({ rows: KIND.map(([k, label, , hint]) => ({ key: label, label: esc(label), values: { [k]: s.tokens[k].cost }, meta: `${compact(s.tokens[k].tokens)} tokens · ${esc(hint)}` })),
    stack: KIND.map(([k, label, color]) => ({ key: k, label, color })), fmt: money });
  return `<div class="chgrid2"><section class="chcard"><div class="chhead"><h4>Par modèle</h4></div>${models}</section>
    <section class="chcard"><div class="chhead"><h4>Par type de token</h4><span class="muted">le cache a évité ${money(s.saved)}</span></div>${tokens}</section></div>`;
}
function whereHtml(s) {
  const list = (items, name) => items.length ? one(items.slice(0, 10).map(x => ({ key: name(x.key), label: esc(name(x.key)), values: { c: x.cost }, meta: `${x.runs} conversation${x.runs > 1 ? "s" : ""} · ${pct(x.cost, s.total)} %` })))
    : `<p class="muted">Rien sur la période.</p>`;
  return `<div class="chgrid2"><section class="chcard"><div class="chhead"><h4>Par projet</h4></div>${list(s.projects, k => k)}</section>
    <section class="chcard"><div class="chhead"><h4>Par agent</h4></div>${list(s.agents, who)}</section></div>`;
}
function topHtml(s) {
  if (!s.top.length) return "";
  return `<section class="chcard"><div class="chhead"><h4>Les plus chères</h4><span class="muted">sessions et missions de la période</span></div>
    ${one(s.top.slice(0, 10).map(t => ({ key: t.description || who(t.agent), label: `${t.ticket ? `${ticketLink(t.ticket)} · ` : ""}${esc(t.description || (t.sub ? "Mission sans description" : "Conversation principale"))}`,
      values: { c: t.cost }, meta: `${esc(who(t.agent))} · ${esc(t.project || "?")} · ${new Date(t.last * 1000).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}` })))}</section>`;
}
function ticketsHtml() {
  if (!tk || !tk.tickets?.length) return "";
  const sorted = tk.tickets.map(t => t.cost).sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] || 0;
  const pit = t => t.cost > Math.max(1, median * 2) || t.blocked >= 2, pits = tk.tickets.filter(pit).length;
  // a bar's length is the ticket's cost, split in proportion to the outcome of its runs
  const split = t => { const r = Math.max(1, t.runs), other = Math.max(0, t.runs - t.done - t.blocked); return { done: t.cost * t.done / r, blocked: t.cost * t.blocked / r, other: t.cost * other / r }; };
  const list = tk.tickets.slice(0, allTickets ? 60 : 10);
  return `<section class="chcard"><div class="chhead"><h4>Par ticket</h4><span class="muted">sous-agents seulement · médiane ${money(median)}${pits ? ` · ${pits} gouffre${pits > 1 ? "s" : ""} 🕳️` : ""}</span>${legend(OUTCOME.map(k => [k.label, k.color]))}</div>
    ${bars({ rows: list.map(t => ({ key: t.key, label: ticketLink(t.key), values: split(t),
      meta: `${t.runs} run${t.runs > 1 ? "s" : ""} · ${durH(t.seconds)} · ${esc(Object.entries(t.types).map(([k, c]) => `${kindName(k)} ×${c}`).join(", "))}`,
      flag: pit(t) ? ' <span class="pit" title="Plus du double de la médiane, ou bloqué deux fois : à découper ?">🕳️ gouffre</span>' : "" })), stack: OUTCOME, fmt: money })}
    ${tk.tickets.length > 10 ? `<div class="osacts"><button data-costs="all">${allTickets ? "Montrer les 10 premiers" : `Voir les ${Math.min(60, tk.tickets.length)} tickets`}</button></div>` : ""}
    ${dataTable(["Ticket", "Coût", "Runs", "Livrés", "Bloqués", "Temps"], tk.tickets.map(t => [t.key, money(t.cost), t.runs, t.done, t.blocked, durH(t.seconds)]))}</section>`;
}

function costsAppHtml() {
  const period = `<div class="chfilters"><span class="chseg" role="group" aria-label="Période">${[7, 30, 90].map(x => `<button data-costs-days="${x}" class="${days === x ? "on" : ""}" aria-pressed="${days === x}">${x} jours</button>`).join("")}</span>
    <span class="muted">Estimation au tarif de l'API, même sur abonnement : rien n'est facturé au token.</span></div>`;
  if (!sp) { if (!loading) load(); return `${period}<p class="muted osloading" role="status">Calcul des coûts sur ${days} jours…</p>`; }
  if (sp.error) return `${period}<div class="oserror" role="alert"><b>Le calcul n'a pas abouti</b><span>${esc(sp.error)}</span><div class="osacts"><button data-costs-days="${days}">↻ Réessayer</button></div></div>`;
  if (!sp.total) return `${period}<div class="osempty"><span class="osemptyic" aria-hidden="true">💸</span><b>Aucune dépense sur ${days} jours</b><span>Les coûts apparaissent dès qu'une conversation Claude Code travaille.</span></div>`;
  return `${period}${tilesHtml(sp)}${dailyHtml(sp)}${modelsHtml(sp)}${whereHtml(sp)}${topHtml(sp)}${ticketsHtml()}`;
}

class CostsApp extends OsApp {
  constructor() { super("costs", "💸", "Coûts", "#f99b11"); }
  render() { return costsAppHtml(); }
  click(b) {
    if (b.dataset.costsDays) { days = +b.dataset.costsDays; sp = tk = null; renderChiefOs(); return true; }
    if (b.dataset.costs === "all") { allTickets = !allTickets; renderChiefOs(); return true; }
    return false;
  }
}
new CostsApp();
