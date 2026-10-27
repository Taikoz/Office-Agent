// ChiefOS → 🐞 Erreurs: the Sentry errors of the organisation, through the server (office/sentry.py: the token stays
// there, entered in ChiefOS → Réglages → 🔌 Intégrations). Two tabs:
//   Tableau de bord — each project with errors of the day, split by environment (prod, staging, dev…), its issues;
//     a click on an issue: Claude Haiku sums it up (cause, fix, severity, the agent fit to fix it) and drafts a YouTrack
//     Bug, editable; « Créer le ticket » asks a second click, then the agent can be launched (the usual launch form).
//   Alertes — checked every 2 min even with the app closed: a spike, a new error, errors after a deploy to prod
//     (ChiefOS → Livraisons); each alert rings once (toast + notification).

import { esc, ticketLink } from "../core/data.js";
import { hub } from "../hub.js";
import { OsApp } from "./base.js";
import { osApp, renderChiefOs, setOsApp } from "../ui/chiefos.js";
import { ago2, launchWith } from "../ui/gitlab.js";
import { toast } from "../sims/progress.js";
import { SaveSlot } from "../save/slot.js";
import { inProject, projectBarHtml, sentryFiltered } from "../ui/project.js";

let st = null, data = null, dash = null, loading = false, dashLoading = false, first = true;
const seen = new SaveSlot("office-errors-seen", { keys: [] }).data;  // alerts already notified
const view = new SaveSlot("office-errors-view", { tab: "dash" }).data;
// the issue open in the detail window, and per issue: { loading, error, a (analysis), edit: { summary, description, severity, priority }, confirm, creating, ticket }
let openId = null;
const iss = {};
const get = what => fetch(`/api/sentry/${what}`, { headers: { "X-Office-Token": TOKEN } }).then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`); return b; });
const post = (what, body) => fetch(`/api/sentry/${what}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) })
  .then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`); return b; });
const link = (url, html, cls = "") => url ? `<a href="${esc(url)}" target="_blank" rel="noopener"${cls ? ` class="${cls}"` : ""}>${html}</a>` : html;
const LEVEL = { fatal: "Fatal", error: "Erreur", warning: "Avertissement", info: "Info" };
const KIND = { prd: "Production", stg: "Staging", dev: "Dev" };
const SEVERITIES = ["Low - S4", "Medium - S3", "High - S2"], PRIORITIES = ["3 - Low priority", "2 - Nice to have", "1 - Required", "0 - Emergency"];

/* ---------- demo ---------- */
const iso = m => new Date(Date.now() - m * 60e3).toISOString();
const h = (base, last) => [...Array(23)].map((_, i) => Math.max(0, Math.round(base + Math.sin(i) * base / 3))).concat(last);
const dIssue = (id, short, title, project, count, firstMin, level = "error") => ({ id, short, title, culprit: "billing_api.kanban.application", level, count, users: 3, first: iso(firstMin), last: iso(2), url: "https://sentry.example.com", project, projectSlug: project === "15" ? "billing-api" : "ledger-api", hourly: h(count / 30, count / 10), day: count, unhandled: true });
function demo() {
  const top = [dIssue("1", "BILLING-API-4K", "IntegrityError: duplicate key value violates unique constraint \"uq_collaborator\"", "15", 412, 60 * 30), dIssue("2", "BILLING-API-4M", "TimeoutError: Salesforce sync took too long", "15", 96, 180), dIssue("3", "LEDGER-API-1Z", "KeyError: 'currency'", "14", 24, 60 * 50, "warning")];
  return { configured: true, url: "https://sentry.example.com", org: "demo", environments: ["production"], updated: Date.now() / 1000,
    projects: [{ id: "15", slug: "billing-api", name: "billing-api", platform: "python", hourly: h(12, 58), issues: 14, new: 2, day: 334, spike: { last: 58, avg: 12, ratio: 4.8 } },
      { id: "14", slug: "ledger-api", name: "ledger-api", platform: "python", hourly: h(1, 1), issues: 3, new: 0, day: 24, spike: null }],
    top, new: [top[1]], totals: { day: 358, new: 1, spikes: 1, issues: 17 },
    deploys: [{ service: "billing-api", tag: "2026.10.14.1", since: iso(5 * 60), projects: ["15"], rate: { before: 9.4, after: 31.2 }, new: [top[1]], newCount: 1 }],
    alerts: [{ key: "d1", kind: "deploy", level: "high", project: "billing-api", title: "Après la mise en prod de billing-api 2026.10.14.1", body: "1 nouvelle erreur, 31.2/h contre 9.4/h avant", url: "" },
      { key: "s1", kind: "spike", level: "high", project: "billing-api", title: "Pic d'erreurs sur billing-api", body: "58 erreurs dans la dernière heure, ×4.8 la moyenne de la journée (12/h)", url: "" }] };
}
function demoDash() {
  const d = demo(), [a, b, c] = d.top, e = (name, kind, issues) => ({ name, kind, issues, day: issues.reduce((t, i) => t + i.day, 0), new: 1, url: "https://sentry.example.com" });
  return { configured: true, url: d.url, org: "demo", updated: Date.now() / 1000, alerts: d.alerts, totals: d.totals,
    projects: [{ ...d.projects[0], service: "billing-api", url: d.url, quiet: [], envs: [e("prd", "prd", [a, b]), e("stg", "stg", [{ ...a, id: "11", day: 12, count: 12 }]), e("dev", "dev", [{ ...b, id: "12", day: 40, count: 40 }])] },
      { ...d.projects[1], service: "ledger-api", url: d.url, quiet: ["develoment"], envs: [e("production", "prd", [c]), e("staging", "stg", [])].filter(x => x.issues.length) }] };
}
const demoAnalysis = i => ({ id: i.id, short: i.short, title: i.title, url: i.url, env: "prd", service: i.projectSlug, at: Date.now() / 1000,
  summary: "L'ajout d'un collaborateur échoue quand il est déjà présent sur la demande : l'API renvoie une erreur 500 aux souscripteurs.",
  cause: "Le service insère le collaborateur sans vérifier qu'il existe déjà (kanban/application/quote_request_service.py:212), la contrainte uq_collaborator rejette l'insertion.",
  fix: "Rendre l'ajout idempotent : ignorer un collaborateur déjà présent, ou faire un upsert, et renvoyer 200.",
  severity: "High - S2", priority: "1 - Required", agent: "feature-builder", agentWhy: "Correctif ciblé dans billing-api, avec tests.",
  ticketSummary: "[Kanban] Backend — Fix 500 when adding a collaborator twice (billing-api)",
  ticketDescription: "## Context\nAdding a collaborator who is already on the quote request raises `IntegrityError` (unique constraint `uq_collaborator`): 412 events in 24 h in production.\n\nSentry: https://sentry.example.com\n\n## Tech changes\n- `kanban/application/quote_request_service.py`: skip a collaborator already present (or upsert).\n\n## Success criteria\n- [ ] Adding an existing collaborator returns 200 and keeps a single row\n- [ ] Unit test covering the duplicate case\n- [ ] The Sentry issue stops occurring", ticket: null });

/* ---------- loading ---------- */
async function loadStatus() { try { st = DEMO ? { configured: true, url: "https://sentry.example.com", org: "demo", environments: ["production"], grafana: "https://grafana.example.com" } : await get("status"); } catch (e) { st = { configured: false, error: e.message }; } }
// the automatic check: new alerts (a key not seen yet) ring once; the first load of the page only takes note
async function check() {
  if (loading || !st?.configured) return;
  loading = true;
  await null;  // never inside the render that asked for it
  try {
    data = DEMO ? demo() : await get("check");
    const fresh = data.alerts.filter(a => !seen.keys.includes(a.key));
    if (fresh.length && !first && !(osApp === "errors" && !hub.osBox?.hidden)) {
      for (const a of fresh.slice(0, 3)) { toast("🐞 ERREURS", a.title, a.body); hub.notify?.(`🐞 ${a.title}`, a.body, null, null, a.level === "high"); }
    }
    seen.keys = [...new Set([...seen.keys, ...data.alerts.map(a => a.key)])].slice(-400); SaveSlot.get("office-errors-seen").save(seen);
    first = false;
  } catch (e) { data = { error: e.message }; }
  loading = false;
  if (osApp === "errors") renderChiefOs();
}
async function loadDash() {
  if (dashLoading || !st?.configured) return;
  dashLoading = true;
  await null;  // never inside the render that asked for it (the demo answers at once)
  try { dash = DEMO ? demoDash() : await get("dashboard"); } catch (e) { dash = { error: e.message }; }
  dashLoading = false;
  if (osApp === "errors") renderChiefOs();
}
setTimeout(async () => { await loadStatus(); check(); }, DEMO ? 1500 : 8000);
setInterval(() => { if (st?.configured) check(); }, 120e3);
setInterval(() => { if (st?.configured && osApp === "errors" && !hub.osBox?.hidden && view.tab === "dash") loadDash(); }, 120e3);

/* ---------- one issue: Haiku's analysis, the YouTrack Bug, the agent ---------- */
const findIssue = id => dash?.projects?.flatMap(p => p.envs.flatMap(e => e.issues)).find(i => i.id === id) || data?.top?.find(i => i.id === id) || data?.new?.find(i => i.id === id);
// the analysis runs on the server, in the background (Grafana in the user's Chrome first when ticked, then Haiku):
// started, then followed every 3 s until it is done or failed; its step shows in the window
const grafanaPref = new SaveSlot("office-errors-grafana", { on: true }).data;
const STEP = { grafana: "Lecture de Grafana dans ton Chrome (logs et dashboard du service autour de l'heure de l'erreur)…", haiku: "Claude Haiku 5 rédige le résumé et le correctif…" };
async function analyze(id, force = false) {
  const s = iss[id] ||= {};
  if (s.loading) return;
  const withGrafana = !!st?.grafana && grafanaPref.on;
  s.loading = true; s.error = ""; s.step = withGrafana ? "grafana" : "haiku"; s.since = Date.now(); renderChiefOs();
  try {
    if (DEMO) {
      if (withGrafana) { await new Promise(r => setTimeout(r, 1500)); s.step = "haiku"; renderChiefOs(); }
      await new Promise(r => setTimeout(r, 900)); s.a = demoAnalysis(findIssue(id));
    } else {
      let r = await post("analyze", { id, force, grafana: withGrafana });
      while (r.state === "grafana" || r.state === "haiku") {
        if (s.step !== r.state) { s.step = r.state; renderChiefOs(); }
        await new Promise(res => setTimeout(res, 3000));
        r = await get(`analysis?id=${encodeURIComponent(id)}`);
      }
      if (r.state !== "done") throw new Error(r.error || "analyse interrompue");
      s.a = r.analysis;
    }
    s.edit = { summary: s.a.ticketSummary, description: s.a.ticketDescription, severity: s.a.severity, priority: s.a.priority };
    s.ticket = s.a.ticket || null; s.confirm = false;
  } catch (e) { s.error = e.message; }
  s.loading = false; renderChiefOs();
}
async function createTicket(id) {
  const s = iss[id];
  if (!s?.a || s.creating) return;
  if (!s.confirm) { s.confirm = true; renderChiefOs(); return; }  // the second click creates it
  s.creating = true; s.error = ""; renderChiefOs();
  try {
    s.ticket = DEMO ? { id: "DEMO-321", url: "https://youtrack.example.com/issue/DEMO-321", agent: s.a.agent } : await post("ticket", { id, ...s.edit });
    toast("🐞 ERREURS", `Ticket ${s.ticket.id} créé`, s.edit.summary);
  } catch (e) { s.error = e.message; }
  s.creating = false; s.confirm = false; renderChiefOs();
}
function launchAgent(id) {
  const s = iss[id]; if (!s?.a || !s.ticket) return;
  const a = s.a;
  launchWith(a.agent, `Corrige le bug ${s.ticket.id} (${s.ticket.url}) : ${s.edit.summary}.\n\nErreur Sentry ${a.short} (${a.url}), environnement ${a.env || "?"}, service ${a.service || "?"}.\n\nRésumé : ${a.summary}\nCause probable : ${a.cause}\nCorrectif proposé : ${a.fix}\n\nLis le ticket, vérifie la cause dans le code, corrige avec des tests, puis suis ta procédure habituelle (branche, vérifications, MR).`);
}
function detailHtml() {
  const i = findIssue(openId); if (!i) return "";
  const s = iss[openId] || {}, a = s.a, e = s.edit || {};
  const opt = (list, v) => list.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
  const steps = st?.grafana && grafanaPref.on ? ["grafana", "haiku"] : ["haiku"];
  const body = s.loading ? `<div class="dlempty erprogress">${steps.map(k => `<div class="${k === s.step ? "now" : steps.indexOf(k) < steps.indexOf(s.step) ? "done" : ""}">${k === s.step ? "⏳" : steps.indexOf(k) < steps.indexOf(s.step) ? "✓" : "·"} ${STEP[k]}</div>`).join("")}<small>depuis ${Math.round((Date.now() - (s.since || Date.now())) / 1000)} s · tu peux fermer cette fenêtre, l'analyse continue</small></div>`
    : !a ? `<div class="erintro"><p>Claude Haiku 5 lit le dernier événement de cette erreur (l'exception, les lignes de code en cause, l'environnement, la version ; jamais l'utilisateur ni la requête) et propose un résumé, la cause probable, le correctif, la sévérité et l'agent adapté, avec le brouillon du ticket YouTrack.</p>
        ${st?.grafana ? `<label class="dltoggle"><input type="checkbox" data-er-grafana${grafanaPref.on ? " checked" : ""}><i></i>D'abord lire Grafana dans mon Chrome (ouvre un onglet, 1 à 3 min, lecture seule)</label>` : `<p class="dlnote">Grafana n'est pas renseigné (Réglages → Intégrations → Sentry) : l'analyse se fait sur Sentry seul.</p>`}
        <button class="dlbtn ubok" data-er="analyze">✨ Analyser avec Haiku 5</button></div>`
    : `<div class="ersum"><div><span>Résumé</span><p>${esc(a.summary)}</p></div><div><span>Cause probable</span><p>${esc(a.cause)}</p></div><div><span>Correctif proposé</span><p>${esc(a.fix)}</p></div>
        <div class="ermeta"><span class="erlvl ${a.severity.startsWith("High") ? "lv-fatal" : a.severity.startsWith("Medium") ? "lv-warning" : ""}">${esc(a.severity)}</span><span class="erlvl">${esc(a.priority)}</span><span class="erlvl">Agent : ${esc(a.agent)}</span><small>${esc(a.agentWhy)}</small>
        <button class="dlbtn" data-er="reanalyze" title="Nouvelle analyse (un appel de plus)">↻</button></div>
        ${a.grafana ? `<details class="dldet"><summary><b>Ce que Grafana montre</b><span>logs et métriques autour de l'heure de l'erreur</span></summary><pre class="ergrafana">${esc(a.grafana)}</pre></details>` : a.grafanaError ? `<p class="dlnote">Grafana : ${esc(a.grafanaError)} (analyse faite sur Sentry seul).</p>` : ""}</div>
      <h4>TICKET YOUTRACK</h4>
      ${s.ticket ? `<div class="erdone"><b>✅ ${ticketLink(s.ticket.id)}</b><span>créé${s.ticket.at ? ` il y a ${ago2(new Date(s.ticket.at * 1000).toISOString())}` : ""} pour cette erreur</span>${link(s.ticket.url, "Ouvrir ↗", "dlext")}
          <button class="dlbtn ubok" data-er="launch">🚀 Lancer ${esc(a.agent)} sur ${esc(s.ticket.id)}</button></div>
          <p class="dlnote">Le formulaire de lancement s'ouvre prérempli : tu valides l'agent et la mission avant qu'il démarre.</p>`
      : `<div class="erform"><label>Titre<input data-er-edit="summary" value="${esc(e.summary)}"></label>
          <label>Description (Markdown)<textarea data-er-edit="description" rows="12">${esc(e.description)}</textarea></label>
          <div class="erform2"><label>Sévérité<select data-er-edit="severity">${opt(SEVERITIES, e.severity)}</select></label><label>Priorité<select data-er-edit="priority">${opt(PRIORITIES, e.priority)}</select></label>
          <span class="dlnote">Bug · ${esc(a.env && !/prd|prod/i.test(a.env) ? "Dev" : "Production")} · Maintenance · assigné à toi${a.service ? ` · Subsystem ${esc(a.service)}` : ""}</span></div>
          <div class="erbtns"><button class="dlbtn ${s.confirm ? "erconfirm" : "ubok"}" data-er="ticket"${s.creating ? " disabled" : ""}>${s.creating ? "Création…" : s.confirm ? "Confirmer : créer le ticket dans YouTrack" : "Créer le ticket YouTrack"}</button>${s.confirm ? `<button class="dlbtn" data-er="unconfirm">Annuler</button>` : ""}</div></div>`}`;
  return `<div class="ermodal" data-er="close-bg"><div class="erpanel" role="dialog" aria-label="Erreur ${esc(i.short)}">
    <div class="erphead">${levelBadge(i.level)}<div class="dlmr"><b class="dltitle" title="${esc(i.title)}">${esc(i.title)}</b><small>${esc(i.short)} · ${esc(i.projectSlug)} · ${i.day || i.count} événements sur 24 h · ${i.users} utilisateur${i.users > 1 ? "s" : ""} · vue il y a ${ago2(i.last)}</small></div>
      ${link(i.url, "Sentry ↗", "dlext")}<button class="dlbtn" data-er="close" data-esc title="Fermer (Échap)">✕</button></div>
    ${s.error ? `<div class="dlwarn eralert high"><b>Erreur</b><span>${esc(s.error)}</span></div>` : ""}${body}</div></div>`;
}

/* ---------- rendering ---------- */
const bars = series => { const max = Math.max(10, ...series); /* a floor: a few errors an hour stay low */ return `<span class="erbars" aria-hidden="true">${series.map((n, i) => `<i style="height:${Math.max(4, Math.round(n / max * 100))}%" class="${i === series.length - 1 ? "now" : ""}" title="${n}"></i>`).join("")}</span>`; };
const levelBadge = l => `<span class="erlvl lv-${esc(l)}">${esc(LEVEL[l] || l)}</span>`;
const ticketChip = id => { const t = iss[id]?.ticket; return t ? `<span class="erlvl lv-ok">${esc(t.id)}</span>` : ""; };
const issueRow = i => `<div class="dlrow errow" data-er="open" data-id="${esc(i.id)}" tabindex="0" role="button"><span>${levelBadge(i.level)}</span><span class="dlmr"><span class="dltitle" title="${esc(i.title)}">${esc(i.title)}</span><small>${esc(i.short)} · ${esc(i.projectSlug)}${i.culprit ? ` · ${esc(i.culprit)}` : ""}</small></span>
  <span class="ernum"><b>${i.day || i.count}</b><small>${i.day ? "24 h" : "total"}</small></span><span class="ernum"><b>${i.users}</b><small>util.</small></span><span><small>vue il y a ${ago2(i.last)}<br>apparue il y a ${ago2(i.first)}</small>${ticketChip(i.id)}</span></div>`;
const envIssue = i => `<button class="erissue" data-er="open" data-id="${esc(i.id)}"><span class="erdot lv-${esc(i.level)}"></span><span class="dlmr"><span class="dltitle" title="${esc(i.title)}">${esc(i.title)}</span><small>${esc(i.short)} · vue il y a ${ago2(i.last)}${time24(i.first) ? " · <b class=\"ernew\">nouvelle</b>" : ""}</small></span><span class="ernum"><b>${i.day || i.count}</b><small>${i.users} util.</small></span>${ticketChip(i.id)}</button>`;
const time24 = isoStr => Date.now() - Date.parse(isoStr) < 86400e3;

function dashHtml() {
  if (!dash) { loadDash(); return `<div class="dlempty osloading" role="status">Lecture des projets et de leurs environnements…</div>`; }
  if (dash.error) return `<div class="dlempty dlerr">${esc(dash.error)} <button class="dlbtn" data-er="reload">Réessayer</button></div>`;
  const projects = dash.projects.filter(p => inProject.sentry(p.slug) || inProject.sentry(p.service));
  if (!projects.length) return `<div class="dlempty">Aucune erreur sur les dernières 24 h${dash.projects.length ? " pour ce projet" : ""}.</div>`;
  return projects.map(p => `<section class="erproject${p.spike ? " spike" : ""}">
      <div class="erphead"><div class="dlmr"><b>${link(p.url, esc(p.name))}</b><small>${esc(p.platform || "")}${p.service ? ` · service ${esc(p.service)}` : ""}${p.quiet.length ? ` · sans erreur : ${esc(p.quiet.join(", "))}` : ""}</small></div>
        ${bars(p.hourly)}<span class="ernum"><b>${p.day}</b><small>24 h</small></span><span class="ernum"><b>${p.hourly.at(-1) || 0}</b><small>dernière h</small></span>
        ${p.spike ? `<span class="erlvl lv-fatal">Pic ×${p.spike.ratio}</span>` : p.new ? `<span class="erlvl lv-warning">${p.new} nouvelle${p.new > 1 ? "s" : ""}</span>` : `<span class="erlvl">Stable</span>`}</div>
      <div class="erenvs">${p.envs.map(e => `<div class="erenv env-${e.kind || "other"}"><div class="erenvhd"><b>${esc(KIND[e.kind] || e.name)}</b><small>${esc(e.name)}</small><span>${e.day} err. · ${e.issues.length} problème${e.issues.length > 1 ? "s" : ""}${e.new ? ` · <b class="ernew">${e.new} nouvelle${e.new > 1 ? "s" : ""}</b>` : ""}</span>${link(e.url, "↗", "dlext")}</div>
        <div class="erlist">${e.issues.slice(0, 8).map(envIssue).join("")}${e.issues.length > 8 ? `<small class="ermore">+ ${e.issues.length - 8} autres dans Sentry</small>` : ""}</div></div>`).join("") || `<div class="dlempty">Aucune erreur par environnement.</div>`}</div></section>`).join("");
}
function alertsHtml() {
  if (!data) { check(); return `<div class="dlempty osloading" role="status">Lecture des erreurs Sentry…</div>`; }
  if (data.error) return `<div class="dlempty dlerr">${esc(data.error)} <button class="dlbtn" data-er="reload">Réessayer</button></div>`;
  const shown = { alerts: data.alerts.filter(a => inProject.sentry(a.project)), new: data.new.filter(i => inProject.sentry(i.projectSlug)), top: data.top.filter(i => inProject.sentry(i.projectSlug)), deploys: data.deploys.filter(d => inProject.sentry(d.service)) };
  const alerts = shown.alerts.length ? `<div class="eralerts">${shown.alerts.map(a => `<div class="dlwarn eralert ${a.level === "high" ? "high" : ""}"><b>${{ spike: "Pic", new: "Nouvelle", deploy: "Mise en prod" }[a.kind] || "Alerte"}</b><span><strong>${esc(a.title)}</strong> — ${esc(a.body)}</span>${a.url ? link(a.url, "Ouvrir ↗", "dlext") : ""}</div>`).join("")}</div>` : `<div class="dlempty">Aucune alerte : pas de pic, pas de nouvelle erreur après une mise en prod.</div>`;
  const deploys = shown.deploys.length ? `<h4>APRÈS LES MISES EN PROD</h4>${shown.deploys.map(d => `<details class="dldet"${d.newCount ? " open" : ""}><summary><b>${esc(d.service)}</b> <code>${esc(d.tag)}</code><span>en prod depuis ${ago2(d.since)}</span><span>${d.newCount ? `<b class="s-blocked">${d.newCount} nouvelle${d.newCount > 1 ? "s" : ""} erreur${d.newCount > 1 ? "s" : ""}</b>` : "aucune nouvelle erreur"}</span>${d.rate ? `<span>${d.rate.before}/h avant → <b class="${d.rate.after > d.rate.before * 2 ? "s-blocked" : ""}">${d.rate.after}/h après</b></span>` : ""}</summary>
      ${d.new.length ? `<div class="dlcommits">${d.new.map(i => `<div>${levelBadge(i.level)}${link(i.url, `<span class="dltitle">${esc(i.title)}</span>`)}<small>${esc(i.short)} · apparue il y a ${ago2(i.first)}</small></div>`).join("")}</div>` : ""}</details>`).join("")}` : "";
  return `<h4>ALERTES</h4>${alerts}${deploys}
    ${shown.new.length ? `<h4>NOUVELLES ERREURS (24 H)</h4><div class="dlgrid">${shown.new.map(issueRow).join("")}</div>` : ""}
    <h4>LES PLUS FRÉQUENTES</h4><div class="dlgrid">${shown.top.slice(0, 15).map(issueRow).join("") || `<div class="dlempty">Rien à signaler.</div>`}</div>`;
}
function errorsHtml() {
  if (!st) { loadStatus().then(renderChiefOs); return `<div class="dl"><div class="dlempty osloading" role="status">Chargement…</div></div>`; }
  if (!st.configured) return `<div class="dl"><div class="dlempty"><span class="osemptyic" aria-hidden="true">🐞</span><b>Sentry n'est pas encore relié</b><span>Ajoute ton adresse Sentry et un jeton en lecture seule pour suivre les erreurs de production.</span><button class="dlbtn primary" data-os-app="settings" data-os-section="links">Relier Sentry</button></div></div>`;
  if (!data) check();
  // the counters of the project in focus when its Sentry project is known (ui/project.js), else of the organisation
  const mine = data?.projects && sentryFiltered() ? data.projects.filter(p => inProject.sentry(p.slug)) : null;
  const t = mine ? { day: mine.reduce((n, p) => n + p.day, 0), new: mine.reduce((n, p) => n + p.new, 0), spikes: mine.filter(p => p.spike).length, issues: data.top.filter(i => inProject.sentry(i.projectSlug)).length } : data?.totals;
  const nAlerts = (data?.alerts || []).filter(a => inProject.sentry(a.project)).length, kpi = (label, value, sub = "", cls = "") => `<div class="dlkpi ${cls}"><span>${label}</span><b>${value}</b><small>${sub}</small></div>`;
  const tab = (id, label, n) => `<button data-er="tab" data-tab="${id}" class="${view.tab === id ? "on" : ""}">${label}${n != null ? `<em>${n}</em>` : ""}</button>`;
  return `${projectBarHtml({ sentry: true })}<div class="dl">
    ${t ? `<div class="dlkpis">${kpi("Erreurs 24 h", t.day, `${t.issues} problèmes ouverts`)}${kpi("Nouvelles", t.new, "apparues en 24 h", t.new ? "warn" : "")}${kpi("Pics", t.spikes, "dernière heure ≥ ×3", t.spikes ? "warn" : "")}${kpi("Alertes", nAlerts, "pics, nouvelles, mises en prod", nAlerts ? "warn" : "")}</div>` : ""}
    <div class="dlbar"><div class="dlseg">${tab("dash", "Tableau de bord", dash?.projects?.filter(p => inProject.sentry(p.slug) || inProject.sentry(p.service)).length)}${tab("alerts", "Alertes", data ? nAlerts : null)}</div>
      <span class="dlmeta">${link(st.url, esc((st.url || "").replace(/^https?:\/\//, "")))} · ${esc(st.org)}${data?.updated ? ` · vérifié il y a ${ago2(new Date(data.updated * 1000).toISOString())}, toutes les 2 min` : ""}</span>
      <button class="dlbtn" data-er="reload"${loading || dashLoading ? " disabled" : ""}>↻ Actualiser</button></div>
    ${view.tab === "alerts" ? alertsHtml() : dashHtml()}</div>${openId ? detailHtml() : ""}`;
}

// for 🧭 Vue d'ensemble: what the automatic check found (null until its first answer), and one issue opened here
// the projects: their slug, and the service each one watches when 🚚 Livraisons knows it (ui/project.js matches them)
const sentryProjects = () => { const svc = Object.fromEntries((dash?.projects || []).map(p => [p.slug, p.service || ""])); return (data?.projects || dash?.projects || []).map(p => ({ slug: p.slug, service: svc[p.slug] || p.service || "", hourly: p.hourly || [], day: p.day || 0 })); };
export const sentryState = () => ({ known: !!st, configured: !!st?.configured, error: data?.error || st?.error || "", alerts: data?.alerts || null, top: data?.top || [], projects: sentryProjects() });
export function openSentry(id) { setOsApp("errors"); if (id) openId = id; else { view.tab = "alerts"; SaveSlot.get("office-errors-view").save(view); } }

class ErrorsApp extends OsApp {
  constructor() { super("errors", "🐞", "Erreurs", "#c01c28"); }
  render() { return errorsHtml(); }
  badge() { return (data?.alerts || []).filter(a => a.level === "high").length; }  // the lesser ones: in the Alertes tab, no number
  click(b) {
    const act = b.dataset.er; if (!act) return false;
    if (act === "reload") { data = null; dash = null; check(); if (view.tab === "dash") loadDash(); renderChiefOs(); }
    if (act === "tab") { view.tab = b.dataset.tab; SaveSlot.get("office-errors-view").save(view); renderChiefOs(); }
    if (act === "open") { openId = b.dataset.id; renderChiefOs(); }
    if (act === "close") { openId = null; renderChiefOs(); }
    if (act === "analyze") analyze(openId);
    if (act === "reanalyze") analyze(openId, true);
    if (act === "ticket") createTicket(openId);
    if (act === "unconfirm") { iss[openId].confirm = false; renderChiefOs(); }
    if (act === "launch") launchAgent(openId);
    return true;
  }
  input(ev) { if (ev.target.hasAttribute?.("data-er-grafana")) { grafanaPref.on = ev.target.checked; SaveSlot.get("office-errors-grafana").save(grafanaPref); return; } const k = ev.target.dataset?.erEdit; if (k && iss[openId]?.edit) { iss[openId].edit[k] = ev.target.value; if (iss[openId].confirm) { iss[openId].confirm = false; } } }
  change(ev) { this.input(ev); }
}
new ErrorsApp();
setInterval(() => { if (openId && iss[openId]?.loading && osApp === "errors" && !hub.osBox?.hidden) renderChiefOs(); }, 1000);  // the seconds of a running analysis
// a click beside the detail window, or Escape, closes it; the issue rows (divs) open it with Enter too
OsApp.listen("errors", "click", ev => {
  if (openId && ev.target.classList?.contains("ermodal")) { openId = null; renderChiefOs(); return; }
  const row = !openId && ev.target.closest?.(".errow");  // a row of the Alertes tab (not a button: ChiefOS does not pass it on)
  if (row && !ev.target.closest("a")) { openId = row.dataset.id; renderChiefOs(); }
});
OsApp.listen("errors", "keydown", ev => {
  if (ev.key === "Enter" && ev.target.matches?.(".errow")) { openId = ev.target.dataset.id; renderChiefOs(); }
});

/* ---------- 🔌 Intégrations connected, changed or disconnected Sentry: read its state again ---------- */
window.addEventListener("office:integration", ev => {
  if (ev.detail !== "sentry") return;
  data = dash = null; first = true;
  loadStatus().then(() => { if (st?.configured) check(); renderChiefOs(); });
});
