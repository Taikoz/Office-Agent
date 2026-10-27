// ChiefOS → 🧭 Vue d'ensemble, the first tab of Code & CI: where the code stands at a glance — four counters (to review,
// my MRs, red pipelines, production errors), then « À faire maintenant », one list of what needs you, the most urgent
// first, each with its one action (fix the CI, address the comments, review, look at the error, merge), then my MRs and
// those to review side by side. A click on an MR opens it in full in 🦊 GitLab; on an error, in 🐞 Erreurs.

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { ago2, glLoad, glMrs, glPipes, glStatus, launchWith, notConfigured, glError } from "../ui/gitlab.js";
import { openMr, openMrList } from "./gitlab.js";
import { openSentry, sentryState } from "./errors.js";
import { inProject, projectBarHtml } from "../ui/project.js";

const REFRESH = 120_000;  // the server keeps GitLab 60 s; a page left open reads it again every 2 min
const view = { at: 0, busy: false };
async function load(force = false) {
  if (view.busy || DEMO && view.at) return;
  view.busy = true; view.at = Date.now();
  await Promise.all([glLoad("mrs", force), glLoad("pipelines", force)]);
  view.busy = false; renderChiefOs();
}

const CI = { success: ["ok", "CI verte"], failed: ["bad", "CI rouge"], running: ["run", "CI en cours"], pending: ["run", "CI en attente"], created: ["run", "CI en attente"], manual: ["warn", "CI manuelle"], canceled: ["off", "CI annulée"], skipped: ["off", "CI sautée"] };
const chip = (cls, text, title = "") => `<span class="cvchip ${cls}"${title ? ` title="${esc(title)}"` : ""}>${text}</span>`;
const ready = m => m.ci === "success" && !m.conflicts && m.threadsOk && !m.draft && m.approvalsLeft === 0;
function mrChips(m) {
  const [cls, label] = CI[m.ci] || ["off", "pas de CI"];
  return chip(cls, `● ${label}`) + (m.conflicts ? chip("bad", "conflit") : "") + (!m.threadsOk ? chip("warn", "retours à traiter") : "")
    + (m.draft ? chip("off", "brouillon") : "") + (m.approvalsLeft === 0 ? chip("ok", "approuvée") : m.approvalsLeft ? chip("off", `${m.approvalsLeft} approbation${m.approvalsLeft > 1 ? "s" : ""} manquante${m.approvalsLeft > 1 ? "s" : ""}`) : "");
}
const mrRow = (m, who) => `<button class="cvmr" data-cv-mr="${m.project}:${m.iid}"><span class="cvmrt"><b>${esc(m.title)}</b><small>${esc(m.ref)} · ${who} · il y a ${ago2(m.updated)}</small></span><span class="cvchips">${mrChips(m)}</span></button>`;

// what needs you, the most urgent first: [level, icon, title, context, actions]; Sentry's lesser alerts stay in 🐞 Erreurs
function todo(mine, review, pipes, sentry) {
  const out = [];
  for (const a of sentry.alerts || []) if (a.level === "high") out.push(["bad", "🐞", a.title, `${a.body} · ${a.project}`, [["Voir l'erreur", `data-cv-er="${esc(a.key.startsWith("new:") ? a.key.slice(4) : "")}"`]]]);
  for (const m of mine) if (m.ci === "failed") out.push(["bad", "🔴", `CI rouge : ${m.title}`, m.ref, [["Corriger avec un agent", `data-cv-fix="${m.project}:${m.iid}"`], ["Ouvrir", `data-cv-mr="${m.project}:${m.iid}"`]]]);
  for (const p of pipes.filter(p => !p.mr)) out.push(["bad", "🔴", `Pipeline rouge sur ${p.ref}`, `${p.project} · job ${p.job || "?"} · il y a ${ago2(p.updated)}`, [["Corriger avec un agent", `data-cv-pipe="${(glPipes?.pipelines || []).indexOf(p)}"`], ["Ouvrir ↗", `data-cv-url="${esc(p.jobUrl || p.url)}"`]]]);
  for (const m of mine) if (m.ci !== "failed" && (m.conflicts || !m.threadsOk)) out.push(["warn", m.conflicts ? "⚠️" : "💬", `${m.conflicts ? "Conflit à résoudre" : "Retours de review à traiter"} : ${m.title}`, m.ref, [["Ouvrir", `data-cv-mr="${m.project}:${m.iid}"`]]]);
  for (const m of [...review].sort((a, b) => Date.parse(a.updated) - Date.parse(b.updated))) out.push(["warn", "👀", `À relire : ${m.title}`, `${m.ref} · par ${m.authorName || m.author} · attend depuis ${ago2(m.updated)}`, [["Relire", `data-cv-mr="${m.project}:${m.iid}"`], ["Review par un agent", `data-cv-review="${m.project}:${m.iid}"`]]]);
  for (const m of mine) if (ready(m)) out.push(["ok", "✅", `Prête à merger : ${m.title}`, `${m.ref} · CI verte, approuvée, sans conflit`, [["Merger dans GitLab ↗", `data-cv-url="${esc(m.url)}"`]]]);
  return out;
}

function codeHomeHtml() {
  if (glStatus && !glStatus.configured && !DEMO) return notConfigured();
  if (!view.busy && (!glMrs || !glPipes || Date.now() - view.at > REFRESH)) load(!!glMrs);
  if (!glMrs || !glPipes) return `<p class="muted osloading" role="status">Lecture de GitLab…</p>`;
  if (glMrs.error) return glError(glMrs.error);
  const all = sentryState(), sentry = { ...all, alerts: all.alerts && all.alerts.filter(a => inProject.sentry(a.project)) };
  const mine = [...(glMrs.mine || []), ...(glMrs.assigned || [])].filter(inProject.mr), review = (glMrs.review || []).filter(inProject.mr), pipes = (glPipes.pipelines || []).filter(inProject.pipe);
  const blocked = mine.filter(m => m.ci === "failed" || m.conflicts || !m.threadsOk).length, prod = (sentry.alerts || []).filter(a => a.level === "high").length;
  const tile = (n, label, sub, state, act) => `<button class="cvtile ${state}" ${act}><b>${n}</b><span>${label}</span><small>${sub}</small></button>`;
  const tiles = tile(review.length, "à relire", review.length ? `la plus ancienne : ${ago2(review.map(m => m.updated).sort()[0])}` : "rien en attente", review.length ? "warn" : "ok", `data-cv-tab="review"`)
    + tile(mine.length, "mes MR ouvertes", blocked ? `${blocked} bloquée${blocked > 1 ? "s" : ""}` : `${mine.filter(ready).length} prête(s) à merger`, mine.some(m => m.ci === "failed" || m.conflicts) ? "bad" : blocked ? "warn" : "ok", `data-cv-tab="mine"`)
    + tile(pipes.length, "pipelines rouges", pipes.length ? "sur tes projets et tes MR" : "tout est vert", pipes.length ? "bad" : "ok", `data-os-app="pipes"`)
    + (!sentry.known ? tile("…", "alertes en prod", "lecture de Sentry…", "off", `data-cv-er=""`) : sentry.configured ? tile(sentry.alerts ? prod : "…", "alertes en prod", sentry.alerts ? (prod ? "pic, nouvelle erreur ou mise en prod" : "rien d'anormal") : "lecture de Sentry…", prod ? "bad" : "ok", `data-cv-er=""`)
      : tile("—", "erreurs en prod", "Sentry non relié", "off", `data-os-app="settings" data-os-section="links"`));
  const list = todo(mine, review, pipes, sentry);
  const actions = list.length ? list.slice(0, 12).map(([lvl, icon, title, ctx, acts]) => `<div class="cvtodo ${lvl}"><span class="cvic">${icon}</span><span class="cvtt"><b>${esc(title)}</b><small>${esc(ctx)}</small></span>
      <span class="cvacts">${acts.map(([l, attr], i) => `<button class="${i ? "" : "cvmain"}" ${attr}>${l}</button>`).join("")}</span></div>`).join("") + (list.length > 12 ? `<p class="muted">… et ${list.length - 12} autre(s).</p>` : "")
    : `<div class="cvclear">✓ Rien ne t'attend : CI verte, aucune review en attente, rien d'anormal en prod.</div>`;
  return `${projectBarHtml()}<div class="cvbar"><span class="muted">${view.busy ? "Actualisation…" : `@${esc(glMrs.user || "")} · à jour il y a ${Math.max(0, Math.round((Date.now() - view.at) / 60000))} min`}</span><button data-cv-reload title="Actualiser">↻ Actualiser</button></div>
    <div class="cvtiles">${tiles}</div>
    <h4>À FAIRE MAINTENANT${list.length ? ` · ${list.length}` : ""}</h4><div class="cvtodos">${actions}</div>
    <div class="cvcols"><section><h4>MES MR · ${mine.length}</h4>${mine.length ? mine.map(m => mrRow(m, "moi")).join("") : `<p class="muted">Aucune MR ouverte.</p>`}</section>
      <section><h4>À RELIRE · ${review.length}</h4>${review.length ? review.map(m => mrRow(m, esc(m.authorName || m.author))).join("") : `<p class="muted">Personne n'attend ta review.</p>`}</section></div>`;
}

const mrOf = key => { const [p, i] = key.split(":").map(Number); return [...(glMrs?.mine || []), ...(glMrs?.assigned || []), ...(glMrs?.review || [])].find(m => m.project === p && m.iid === i); };
OsApp.listen("codehome", "click", ev => {
  const b = ev.target.closest("[data-cv-mr], [data-cv-fix], [data-cv-pipe], [data-cv-review], [data-cv-er], [data-cv-url], [data-cv-tab], [data-cv-reload]"); if (!b) return;
  if (b.hasAttribute("data-cv-reload")) { view.at = 0; return load(true); }
  if (b.dataset.cvUrl) return window.open(b.dataset.cvUrl, "_blank", "noopener");
  if (b.dataset.cvMr) { const [p, i] = b.dataset.cvMr.split(":").map(Number); return openMr(p, i); }
  if (b.dataset.cvTab) { openMrList(b.dataset.cvTab); return renderChiefOs(); }
  if (b.hasAttribute("data-cv-er")) { openSentry(b.dataset.cvEr); return renderChiefOs(); }
  if (b.dataset.cvReview) { const m = mrOf(b.dataset.cvReview); if (m) launchWith("mr-reviewer", `Review la MR ${m.ref} (${m.url}) : « ${m.title} », ${m.branch} → ${m.target}.`); return; }
  if (b.dataset.cvFix) {
    const m = mrOf(b.dataset.cvFix); if (!m) return;
    const p = (glPipes?.pipelines || []).find(x => x.mr?.url === m.url);
    return launchWith("feature-builder", `La CI de la MR ${m.ref} (${m.url}) est rouge${p ? ` : job « ${p.job} » (${p.jobUrl || p.url}).\n\nFin du log :\n${p.log.split("\n").slice(-25).join("\n")}` : ` (${m.ciUrl || m.url}).`}\n\nTrouve la cause, corrige-la sur la branche ${m.branch} et pousse la correction.`);
  }
  if (b.dataset.cvPipe) {
    const p = glPipes?.pipelines?.[+b.dataset.cvPipe]; if (!p) return;
    return launchWith("feature-builder", `La CI est rouge sur ${p.project} (branche ${p.ref}) : job « ${p.job} » (${p.jobUrl || p.url}).\n\nFin du log :\n${p.log.split("\n").slice(-25).join("\n")}\n\nTrouve la cause, corrige-la sur la branche ${p.ref} et pousse la correction.`);
  }
});

class CodeHomeApp extends OsApp {
  constructor() { super("codehome", "🧭", "Vue d'ensemble", "#fc6d26", { live: true }); }
  render() { return codeHomeHtml(); }
  badge() {  // the red CI only: 🐞 Erreurs counts its own alerts (the folder adds them up)
    const mine = [...(glMrs?.mine || []), ...(glMrs?.assigned || [])];
    return mine.filter(m => m.ci === "failed").length + (glPipes?.pipelines || []).filter(p => !p.mr).length;
  }
}
new CodeHomeApp();
