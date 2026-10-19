// ChiefOS → 🧭 Process: how the work with the agents goes, and what to change (office/improve.py, read locally).
// Tabs: Process (the delivery rules of CLAUDE.md: guardian, security audit, review, no Claude attribution), Tickets (is
// a ticket ready for an agent, and its chance of success learnt from the past ones), Agents (did the last change of an
// agent's definition make it better or worse), Échecs (why the missions that went wrong went wrong), Contexte (cache,
// files read again, huge outputs, compactions), Modèles (which model each agent needs, the saving), Permissions (rules
// to add to ~/.claude/settings.json, the refusals), MMX (duplicates, entries never found: archive proposals).
// Actions: launch the missing agent (pre-filled form), ignore, add a permission rule, propose an MMX archive.

import { clip } from "../core/core.js";
import { ago, esc, ticketLink } from "../core/data.js";
import { toast } from "../sims/progress.js";
import { launchWith } from "../ui/gitlab.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { OsApp } from "./base.js";

const TABS = [["process", "✅ Process"], ["tickets", "🎫 Tickets"], ["agents", "🤖 Agents"], ["failures", "💥 Échecs"], ["context", "🧠 Contexte"],
  ["models", "⚖️ Modèles"], ["permissions", "🔐 Permissions"], ["mmx", "🗄️ MMX"]];
const data = {}, loading = {};
let tab = "process", confirmRule = null, diffShown = null, msg = "";

const post = body => fetch("/api/process", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }).then(r => r.json());
async function load(t = tab, force = false) {
  if (loading[t] || DEMO) return; loading[t] = true;
  try { data[t] = await (await fetch(`/api/process?tab=${t}${force ? "&force=1" : ""}`, { headers: { "X-Office-Token": TOKEN } })).json(); }
  catch (_) { data[t] = { error: true }; }
  loading[t] = false;
  renderChiefOs();
}
const since = t => { if (!t) return "?"; const s = Math.max(0, Math.round(Date.now() / 1000 - t)); return s >= 172800 ? `${Math.round(s / 86400)} j` : ago(s); };
const pct = v => v == null ? "—" : `${v} %`;
const mrLink = url => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">MR !${esc(url.split("/").pop())}</a>` : "";
const gauge = (v, good = 80, bad = 50) => `<span class="prgauge ${v == null ? "" : v >= good ? "ok" : v >= bad ? "mid" : "bad"}"><i style="width:${v ?? 0}%"></i></span>`;

/* ---------- Process ---------- */
const LAUNCH_PROMPT = {
  "guardian-test-writer": m => `Écris les tests e2e de ${m.ticket || ""}${m.mr ? ` (MR ${m.mr})` : ""}.`,
  "security-auditor": m => `Audit sécurité de ${m.ticket || ""}${m.mr ? ` — MR ${m.mr}` : ""}.`,
  "mr-reviewer": m => `Review de la MR ${m.mr || ""}${m.ticket ? ` (${m.ticket})` : ""}.`,
};
function processHtml(d) {
  const rules = d.rules.map(r => `<div class="prcard"><div class="prhead"><b>${esc(r.label)}</b>${gauge(r.rate)}<span>${r.ok} fait${r.ok > 1 ? "s" : ""} · <b class="${r.missing.length ? "prbad" : ""}">${r.missing.length} oublié${r.missing.length > 1 ? "s" : ""}</b>${r.waiting ? ` · ${r.waiting} en attente (< 2 h)` : ""}</span></div>
    ${r.missing.map(m => `<div class="prline"><span>${m.ticket ? ticketLink(m.ticket) : ""} ${mrLink(m.mr)} <small class="muted">${esc(m.project)} · ${esc(m.by)} · il y a ${since(m.at)}</small><br><small class="muted">${esc(clip(m.description, 110))}</small></span>
      <span class="osacts"><button class="ubok" data-pr-launch="${esc(r.then)}" data-pr-ticket="${esc(m.ticket || "")}" data-pr-mr="${esc(m.mr || "")}">▶ Lancer ${esc(r.then)}</button><button data-pr-ignore="${esc(m.key)}">Ignorer</button></span></div>`).join("")}</div>`).join("");
  const attr = d.attributions.length ? `<h4>ATTRIBUTION CLAUDE (interdite)</h4><div class="prcard">${d.attributions.map(a => `<div class="prline"><span><b class="prbad">${esc(a.agent)}</b> <small class="muted">${esc(a.project)} · il y a ${since(a.at)}</small><br><code>${esc(clip(a.command, 180))}</code></span><span class="osacts"><button data-pr-ignore="${esc(a.key)}">Vu</button></span></div>`).join("")}</div>
    <p class="muted">Un commit déjà poussé garde sa ligne : à corriger par un amend / rebase si la branche n'est pas encore fusionnée.</p>` : `<p class="prgood">✓ Aucune attribution Claude dans les commits, MR et tickets des ${d.days} derniers jours.</p>`;
  return `<p class="muted">Règles de livraison de ton CLAUDE.md, vérifiées sur les missions des ${d.days} derniers jours (par ticket ou par MR).${d.custom ? " Règles personnalisées (process_rules)." : " À changer avec « process_rules » dans ~/.claude/agent-office.json."}</p>${rules}${attr}`;
}

/* ---------- Tickets ---------- */
function ticketsHtml(d) {
  if (!d.enabled) return `<p class="muted">YouTrack n'est pas configuré (clé « youtrack_tools » de ~/.claude/agent-office.json).</p>`;
  const hist = d.past ? `<p class="muted">Historique : ${d.past} tickets passés par feature-builder / tech-lead, ${d.base} % finis avec une MR. ${d.buckets.filter(b => b.n).map(b => `Ticket ${b.label} : ${pct(b.rate)} (${b.n})`).join(" · ")}.</p>` : `<p class="muted">Pas encore d'historique de tickets livrés pour estimer les chances.</p>`;
  const row = t => t.score == null ? `<div class="prline"><span>${ticketLink(t.id)} ${esc(t.summary)}</span><small class="muted">lecture du ticket…</small></div>`
    : `<div class="prline"><span class="prscore ${t.score >= 70 ? "ok" : t.score >= 40 ? "mid" : "bad"}">${t.score}</span><span>${ticketLink(t.id)} <b>${esc(clip(t.summary, 90))}</b> <small class="muted">${esc(t.kind || "")} · ${esc(t.state || "")}</small>
      <br><small>${t.plus.map(p => `<span class="prok">✓ ${esc(p)}</span>`).join(" ")} ${t.minus.map(p => `<span class="prko">✗ ${esc(p)}</span>`).join(" ")}</small></span>
      <span class="prchance">${t.chance == null ? `<small class="muted">chance : pas assez<br>d'historique</small>` : `<b>${t.chance} %</b><small class="muted">de réussite<br>(${t.similar} comparables)</small>`}</span>
      <span class="osacts"><button class="${t.score >= 60 ? "ubok" : ""}" data-pr-build="${esc(t.id)}">▶ feature-builder</button></span></div>`;
  return `<p class="muted">Ton backlog YouTrack noté avant de le confier à un agent : description, critères d'acceptation, repro / maquette, repères concrets, projet nommé ; moins les questions ouvertes et les tickets trop gros.</p>${hist}
    <div class="prcard">${d.items.map(row).join("") || `<p class="muted">Backlog vide.</p>`}</div>`;
}

/* ---------- Agents ---------- */
function agentsHtml(d) {
  const card = a => {
    const bad = a.verdict.some(v => v.level === "bad");
    return `<div class="prcard ${bad ? "prwarn" : ""}"><div class="prhead"><b>🤖 ${esc(a.agent)}</b><span>${a.runs} mission(s)</span>${a.verdict.map(v => `<span class="prchip ${v.level}">${v.level === "bad" ? "▼" : "▲"} ${esc(v.text)}</span>`).join("")}</div>
      ${a.versions.length ? `<table class="prtable"><tr><th>Version</th><th>Missions</th><th>Livré</th><th>Bloqué</th><th>Boucles</th><th>Erreurs</th><th>Coût</th><th>Durée</th></tr>
        ${a.versions.map((v, i) => `<tr class="${i === a.versions.length - 1 ? "on" : ""}"><td>${esc(v.label)}${v.why ? ` <small class="muted">${esc(v.why)}</small>` : ""}</td><td>${v.n}</td>${v.n ? `<td>${pct(v.done)}</td><td>${pct(v.blocked)}</td><td>${pct(v.loops)}</td><td>${v.errors}</td><td>${v.cost} $</td><td>${v.minutes} min</td>` : `<td colspan="6" class="muted">aucune mission</td>`}</tr>`).join("")}</table>` : ""}
      ${a.snaps.length >= 2 ? `<span class="osacts"><button data-pr-diff="${esc(a.agent)}" data-pr-hash="${esc(a.snaps.at(-2).hash)}">Voir ce qui a changé depuis le ${new Date(a.snaps.at(-2).t * 1000).toLocaleDateString("fr-FR")}</button></span>` : ""}
      ${diffShown?.agent === a.agent ? `<pre class="prdiff">${diffShown.diff.split("\n").map(l => `<span class="${l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : ""}">${esc(l)}</span>`).join("\n")}</pre>` : ""}</div>`;
  };
  return `<p class="muted">Chaque mission compte pour la version de la fiche de l'agent (.claude/agents/*.md) en vigueur à son départ. Une modification est repérée par git, par les éditions de Claude ou la date du fichier. Verdict dès ${d.minRuns} missions de chaque côté. Une copie de chaque fiche est gardée pour comparer les prochaines versions.</p>${d.agents.map(card).join("")}`;
}

/* ---------- Échecs ---------- */
function failuresHtml(d) {
  const max = Math.max(1, ...d.weeks.map(w => w.runs));
  const weeks = `<div class="prweeks">${d.weeks.map(w => `<div title="${w.bad} / ${w.runs} mission(s) ratée(s)"><span class="prbar"><i class="all" style="height:${100 * w.runs / max}%"></i><i class="bad" style="height:${100 * w.bad / max}%"></i></span><small>${new Date(w.start * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</small><small>${w.runs ? Math.round(100 * w.bad / w.runs) : 0} %</small></div>`).join("")}</div>`;
  return `<p class="muted">${d.bad} mission(s) ratée(s) sur ${d.runs} en ${d.days} jours : bloquées, abandonnées, qui ont tourné en rond, finies tests rouges ou avec la CI cassée. Cause devinée à partir de ce qu'elles ont laissé.</p>
    <div class="prsplit">${weeks}<div class="prcauses">${d.causes.map(c => `<div class="prcause"><b>${esc(c.label)} <span class="prn">${c.n}</span></b><small>${esc(c.advice)}</small></div>`).join("") || `<p class="prgood">✓ Rien à signaler.</p>`}</div></div>
    <h4>MISSIONS</h4><div class="prcard">${d.items.map(i => `<div class="prline"><span><b>${esc(d.labels[i.cause] || i.cause)}</b> · ${esc(i.type)} <small class="muted">${esc(i.why)} · ${esc(i.project)} · il y a ${since(i.at)}</small> ${i.ticket ? ticketLink(i.ticket) : ""} ${mrLink(i.mr)}
      <br><small class="muted">${esc(clip(i.description, 110))}</small>${i.evidence ? `<br><code>${esc(clip(i.evidence, 170))}</code>` : ""}</span>
      <span class="osacts"><button data-pr-retry="${esc(i.type)}" data-pr-desc="${esc(i.description)}" data-pr-cause="${esc(i.cause)}" data-pr-ticket="${esc(i.ticket || "")}">🔁 Relancer</button></span></div>`).join("")}</div>`;
}

/* ---------- Contexte ---------- */
function contextHtml(d) {
  const k = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : n;
  return `<p class="muted">${d.transcripts} transcripts sur ${d.days} jours. Le cache relit le contexte déjà envoyé à 10 % du prix : plus il est haut, mieux c'est. Une sortie d'outil de plus de ${k(d.bigLimit)} caractères remplit le contexte pour rien.</p>
    <table class="prtable"><tr><th>Qui</th><th>Missions</th><th>Coût (≈ API)</th><th>Cache</th><th>Relectures / mission</th><th>Grosses sorties / mission</th><th>Saturé</th></tr>
    ${d.agents.map(a => `<tr><td><b>${esc(a.agent)}</b></td><td>${a.runs}</td><td>${a.cost} $</td><td>${gauge(a.cacheHit, 85, 60)} ${pct(a.cacheHit)}</td><td>${a.rereadsPerRun}</td><td>${a.bigPerRun}</td><td>${a.compacted ? `<b class="prbad">${a.compacted}</b>` : "0"}</td></tr>`).join("")}</table>
    <h4>À FAIRE</h4>${d.agents.filter(a => a.tips.length).map(a => `<div class="prcause"><b>${esc(a.agent)}</b>${a.tips.map(t => `<small>• ${esc(t)}</small>`).join("")}</div>`).join("") || `<p class="prgood">✓ Rien de notable.</p>`}
    <h4>LES PLUS GROSSES SORTIES</h4><div class="prcard">${d.bigOutputs.map(b => `<div class="prline"><span><code>${esc(b.what)}</code></span><small class="muted">${b.n} fois · ${k(b.avgChars)} caractères en moyenne</small></div>`).join("") || `<p class="muted">Aucune.</p>`}</div>`;
}

/* ---------- Modèles ---------- */
function modelsHtml(d) {
  return `<p class="muted">Le modèle qui a fait le travail de chaque agent sur ${d.days} jours, la part de missions réussies et le coût (équivalent API). Les mêmes jetons recalculés au prix d'un modèle moins cher donnent l'économie.${d.saving ? ` <b>Économie possible : ≈ ${d.saving} $ / ${d.days} j.</b>` : ""}</p>
    ${d.agents.map(a => `<div class="prcard"><div class="prhead"><b>🤖 ${esc(a.agent)}</b>${a.families.map(f => `<span class="prchip">${esc(f.family)} · ${f.runs} mission(s) · ${f.rate} % réussies · ${f.avgCost} $ / mission</span>`).join("")}</div>
      ${a.advice ? `<div class="pradvice ${a.advice.kind}">${a.advice.kind === "switch" ? "💡" : a.advice.kind === "try" ? "🧪" : "⬆️"} ${esc(a.advice.text).replace(/`([^`]+)`/g, "<code>$1</code>")}${a.advice.saving ? ` <b>≈ −${a.advice.saving} $ / ${d.days} j</b>` : ""}</div>` : ""}</div>`).join("")}
    <p class="muted">Le modèle se règle dans la fiche de l'agent (ChiefOS → 📝 Skills & agents), ligne <code>model:</code> de l'en-tête.</p>`;
}

/* ---------- Permissions ---------- */
const LEVEL = { read: ["📖", "Lecture"], write: ["✏️", "Écriture (confirmation)"], risky: ["⚠️", "Risquée : jamais en un clic"] };
function permissionsHtml(d) {
  const sugg = lv => d.suggestions.filter(s => s.level === lv).map(s => `<div class="prline"><span><code>${esc(s.rule)}</code> <small class="muted">${s.n} fois · ${s.sessions} sessions</small></span>
    <span class="osacts">${lv === "risky" ? `<small class="muted">à ajouter à la main</small>` : confirmRule === s.rule ? `<button class="ubok" data-pr-perm="${esc(s.rule)}" data-pr-confirm="1">Confirmer l'ajout</button>` : `<button class="${lv === "read" ? "ubok" : ""}" data-pr-perm="${esc(s.rule)}">+ Autoriser</button>`}</span></div>`).join("");
  const groups = ["read", "write", "risky"].map(lv => { const h = sugg(lv); return h ? `<h4>${LEVEL[lv][0]} ${LEVEL[lv][1].toUpperCase()}</h4><div class="prcard">${h}</div>` : ""; }).join("");
  return `<p class="muted">Commandes lancées souvent (${d.days} jours, au moins 2 sessions) qu'aucune règle <code>allow</code> ne couvre (${d.allowCount} règle(s) aujourd'hui${d.mode ? `, mode ${esc(d.mode)}` : ""}). Une règle évite une demande d'autorisation ou un passage par le classifieur du mode auto. Elle s'écrit dans <code>${esc(d.settings)}</code> (copie gardée en settings.json.office-bak).</p>
    ${groups || `<p class="prgood">✓ Tout ce qui revient est déjà autorisé.</p>`}
    <h4>REFUSÉES</h4><div class="prcard">${d.denials.map(x => `<div class="prline"><span><b>${x.kind === "auto" ? "🤖 mode auto" : "✋ toi"}</b>${x.reason ? ` <span class="prchip bad">${esc(x.reason)}</span>` : ""} <code>${esc(clip(x.what, 80))}</code> <small class="muted">${x.n} fois · ${esc(x.agents.join(", "))}</small></span>
      <span class="osacts">${x.rule ? (confirmRule === x.rule ? `<button class="ubok" data-pr-perm="${esc(x.rule)}" data-pr-confirm="1">Confirmer</button>` : `<button data-pr-perm="${esc(x.rule)}">+ Autoriser</button>`) : ""}</span></div>`).join("") || `<p class="muted">Aucun refus.</p>`}</div>
    ${d.added.length ? `<h4>AJOUTÉES PAR AGENT OFFICE</h4><div class="prcard">${d.added.map(r => `<div class="prline"><code>${esc(r)}</code><span class="osacts"><button data-pr-unperm="${esc(r)}">Retirer</button></span></div>`).join("")}</div>` : ""}`;
}

/* ---------- MMX ---------- */
function mmxHtml(d) {
  if (!d.enabled) return `<p class="muted">MMX n'est pas configuré (clé « mmx » de ~/.claude/agent-office.json).</p>`;
  const pending = new Set(d.pending);
  const entry = e => `<span><b>${esc(e.id)}</b> <small class="muted">${esc(e.t)} · p${e.p ?? "?"} · ${esc((e.tags || []).join(", "))}</small><br><small>${esc(clip(e.d, 220))}</small></span>`;
  const archive = (e, why) => pending.has(e.id) ? `<small class="muted">proposition en attente</small>` : `<button data-pr-archive="${esc(e.id)}" data-pr-why="${esc(why)}">Proposer l'archivage</button>`;
  return `<p class="muted">${d.entries} fiches actives · ${d.searches} transcript(s) ont cherché dans MMX en ${d.days} jours. Une proposition est seulement ajoutée à staging/PROPOSALS.json (vérifiée par <code>mmx.py validate</code>) : elle ne s'applique qu'après ta validation dans l'armoire MMX.</p>
    <h4>DOUBLONS PROBABLES</h4>${d.duplicates.map(p => `<div class="prcard"><div class="prline">${entry(p.a)}<span class="osacts">${archive(p.a, `Doublon de ${p.b.id} (${p.sim} % de mots communs)`)}</span></div><div class="prline">${entry(p.b)}<span class="osacts">${archive(p.b, `Doublon de ${p.a.id} (${p.sim} % de mots communs)`)}</span></div><small class="muted">${p.sim} % de mots en commun</small></div>`).join("") || `<p class="prgood">✓ Aucun.</p>`}
    <h4>À RELIRE ENSEMBLE (contradiction possible)</h4>${d.together.map(p => `<div class="prcard"><div class="prline">${entry(p.a)}</div><div class="prline">${entry(p.b)}</div><small class="muted">même sujet (${esc(p.tags.join(", "))}), l'une interdit ce que l'autre semble permettre</small></div>`).join("") || `<p class="prgood">✓ Aucune.</p>`}
    <h4>JAMAIS RETROUVÉES (${d.days} j)</h4><div class="prcard">${d.never.map(e => `<div class="prline">${entry(e)}<span class="osacts">${archive(e, `Jamais retrouvée par mmx.py search en ${d.days} jours`)}</span></div>`).join("") || `<p class="prgood">✓ Toutes servent (ou ont moins de 30 jours).</p>`}</div>
    ${d.stale.length ? `<h4>PAS MISES À JOUR DEPUIS LONGTEMPS</h4><div class="prcard">${d.stale.map(e => `<div class="prline">${entry(e)}<small class="muted">${e.age} j</small><span class="osacts">${archive(e, `Pas mise à jour depuis ${e.age} jours`)}</span></div>`).join("")}</div>` : ""}`;
}

const VIEW = { process: processHtml, tickets: ticketsHtml, agents: agentsHtml, failures: failuresHtml, context: contextHtml, models: modelsHtml, permissions: permissionsHtml, mmx: mmxHtml };
function processAppHtml() {
  const d = data[tab];
  const body = DEMO ? `<p class="muted">Pas de démo : cet outil lit tes vrais transcripts.</p>` : !d ? (load(), `<p class="muted">Analyse des transcripts…</p>`)
    : d.error ? `<p class="muted">Serveur injoignable (ou ancienne version : redémarre Agent Office).</p>` : VIEW[tab](d);
  return `<div class="prapp"><div class="prtabs">${TABS.map(([id, label]) => `<button class="${tab === id ? "on" : ""}" data-pr-tab="${id}">${label}${id === "process" && missingCount() ? ` <span class="prn">${missingCount()}</span>` : ""}</button>`).join("")}
    <span class="prtools">${d?.at ? `<small class="muted">calculé il y a ${since(d.at)}</small>` : ""}<button data-pr-reload>↻</button></span></div>${msg ? `<p class="prmsg">${esc(msg)}</p>` : ""}${body}</div>`;
}
function missingCount() { const d = data.process; return d?.rules ? d.rules.reduce((n, r) => n + r.missing.length, 0) + d.attributions.length : 0; }

class ProcessApp extends OsApp {
  constructor() { super("process", "🧭", "Process", "#5fd38d"); }
  render() { return processAppHtml(); }
  open() { if (data[tab] && !loading[tab]) load(tab); }
  badge() { return missingCount(); }
  click(b) {
    const d = b.dataset, say = (m, ok = true) => { msg = m; if (ok) toast("🧭 PROCESS", m, ""); renderChiefOs(); };
    if (d.prTab) { tab = d.prTab; msg = ""; confirmRule = null; renderChiefOs(); return true; }
    if (d.prReload !== undefined) { load(tab, true); return true; }
    if (d.prLaunch) { const m = { ticket: d.prTicket, mr: d.prMr }; launchWith(d.prLaunch, (LAUNCH_PROMPT[d.prLaunch] || (x => `${x.ticket} ${x.mr}`))(m).trim()); return true; }
    if (d.prBuild) { launchWith("feature-builder", d.prBuild); return true; }
    if (d.prRetry) {
      const cause = data.failures?.causes.find(c => c.cause === d.prCause);
      launchWith(d.prRetry, `${d.prTicket ? `${d.prTicket} — ` : ""}${d.prDesc}\n\nReprise : la dernière tentative a échoué (${cause?.label || d.prCause}). ${cause?.advice || ""}`.trim());
      return true;
    }
    if (d.prIgnore) {
      const key = d.prIgnore;
      for (const r of data.process?.rules || []) r.missing = r.missing.filter(m => m.key !== key);
      if (data.process) data.process.attributions = data.process.attributions.filter(a => a.key !== key);
      renderChiefOs(); post({ action: "ignore", key }).catch(() => {});
      return true;
    }
    if (d.prPerm) {
      post({ action: "perm-add", rule: d.prPerm, confirm: !!d.prConfirm }).then(r => {
        if (r.confirm) { confirmRule = d.prPerm; return say("Commande qui écrit : clique sur Confirmer pour l'autoriser.", false); }
        confirmRule = null;
        if (!r.ok) return say(`Non ajoutée : ${r.error}`, false);
        say(`${r.rule} ajoutée à ~/.claude/settings.json`); load("permissions", true);
      }).catch(() => say("serveur injoignable", false));
      return true;
    }
    if (d.prUnperm) { post({ action: "perm-remove", rule: d.prUnperm }).then(r => { say(r.ok ? `${d.prUnperm} retirée` : r.error, r.ok); load("permissions", true); }); return true; }
    if (d.prArchive) {
      post({ action: "mmx-archive", id: d.prArchive, reason: d.prWhy }).then(r => {
        if (!r.ok) return say(`MMX : ${r.error}`, false);
        say(`${r.proposal} (archiver ${d.prArchive}) en attente : valide-la dans l'armoire MMX`); load("mmx", true);
      }).catch(() => say("serveur injoignable", false));
      return true;
    }
    if (d.prDiff) {
      if (diffShown?.agent === d.prDiff) { diffShown = null; renderChiefOs(); return true; }
      post({ action: "agent-diff", agent: d.prDiff, hash: d.prHash }).then(r => { diffShown = r.diff ? r : null; if (!r.diff) say(r.error || "diff indisponible", false); else renderChiefOs(); });
      return true;
    }
    return false;
  }
}
new ProcessApp();

// the process check once 40 s after the page opens, then every 30 min: the icon's badge counts the missing steps
if (!DEMO) { setTimeout(() => load("process"), 40000); setInterval(() => load("process"), 30 * 60 * 1000); }
