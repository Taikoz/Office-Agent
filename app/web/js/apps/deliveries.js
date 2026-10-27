// ChiefOS → 🚚 Livraisons: each merged MR of the last days, from the merge to production (office/deliveries.py, GitLab
// read-only): its release tag, the image build, and the envs it reached, read from the deployment repo. Three tabs:
// Tickets (grouped by ticket, the gaps flagged: not released, not in staging, stuck before prod, ticket closed but
// deployed nowhere), Services (the tag of each env) and Prochaine prod (what the next release to prod takes, in Markdown:
// the MRs and their risks — migration, dependencies, config, environment variables —, the commits between prod's tag and
// the other envs', and the settings an env has that prod lacks). One of my MRs reaching staging or prod: a notification.

import { esc, ticketLink } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { ago2, glStatus, notConfigured } from "../ui/gitlab.js";
import { toast } from "../sims/progress.js";
import { SaveSlot } from "../save/slot.js";
import { hub } from "../hub.js";

let dl = null, dlBusy = false;
const view = new SaveSlot("office-deliveries", { tab: "tickets", mine: true, alertsOnly: false }).data;
const saveView = () => SaveSlot.get("office-deliveries").save(view);
const KIND = { dev: "Dev", stg: "Staging", prd: "Prod" };
const envLabel = e => KIND[e.kind] || e.name;

function demo() {
  const d = n => new Date(Date.now() - n * 86400e3).toISOString(), envs = [{ name: "core-dev", kind: "dev" }, { name: "core-stg", kind: "stg" }, { name: "core-prd", kind: "prd" }];
  const env = (dev, stg, prd) => ({ "core-dev": dev, "core-stg": stg, "core-prd": prd });
  const it = (ticket, title, project, days, tag, envs, alerts = [], mine = true) => ({ ticket, ticketState: ticket ? (alerts.some(a => a.includes("ticket")) ? "To Verify" : "In Progress") : null, title, url: "https://gitlab.example.com", ref: `demo/${project}!${100 + days}`,
    author: "taikoz", authorName: "Taikoz", mine, merged: d(days), project: `demo/${project}`, projectId: project === "api" ? 1 : 2, iid: 100 + days, service: project, tag, tagUrl: tag ? "https://gitlab.example.com" : null, image: tag ? { status: "success", url: "" } : null, envs, alerts,
    risks: days === 4 ? [{ kind: "migration", label: "Migration de base", items: ["alembic/versions/0042_discount_rules.py"] }, { kind: "env", label: "Variables d'environnement", items: ["DISCOUNT_MAX_RATE"] }] : days === 1 ? [{ kind: "deps", label: "Dépendances", items: ["uv.lock", "pyproject.toml"] }] : [] });
  const cm = (sha, title, n) => ({ sha, title, author: "Taikoz", date: d(n), url: "https://gitlab.example.com" });
  return { configured: true, days: 14, user: "taikoz", updated: Date.now() / 1000, repo: { path: "demo/k8s-deployments", url: "https://gitlab.example.com", ref: "main" }, envs,
    services: [{ service: "api", apps: ["api"], project: "demo/api", projectUrl: "https://gitlab.example.com", envs: { "core-dev": { tag: "2026.10.16.0", since: d(1) }, "core-stg": { tag: "2026.10.14.1", since: d(2) }, "core-prd": { tag: "2026.10.14.1", since: d(1) } },
      diffs: { "core-dev": { from: "2026.10.14.1", to: "2026.10.16.0", url: "https://gitlab.example.com", total: 3, commits: [cm("82205169", "feat: DEMO-101 règles de remise", 4), cm("48518663", "chore: bump deps", 1), cm("1f2e3d4c", "fix: typo in export header", 2)] } },
      configGaps: [{ env: "core-dev", keys: ["envVariables.discountMaxRate", "envVariables.disableSalesforce"], more: 0 }] },
      { service: "front", apps: ["front"], project: "demo/front", projectUrl: "https://gitlab.example.com", envs: { "core-dev": { tag: "2026.10.19.0", since: d(0) }, "core-stg": { tag: "2026.10.9.0", since: d(9) }, "core-prd": { tag: "2026.10.9.0", since: d(8) } },
        diffs: { "core-dev": { from: "2026.10.9.0", to: "2026.10.19.0", url: "https://gitlab.example.com", total: 2, commits: [cm("a1b2c3d4", "feat: DEMO-101 écran des remises", 3), cm("e5f6a7b8", "feat: DEMO-104 tableau de bord", 9)] } }, configGaps: [] }],
    items: [it("DEMO-101", "feat: DEMO-101 règles de remise", "api", 4, "2026.10.16.0", env(true, false, false), ["mergée il y a 4 j, pas encore en staging"]),
      it("DEMO-101", "feat: DEMO-101 écran des remises", "front", 3, "2026.10.19.0", env(true, false, false)),
      it("DEMO-102", "fix: DEMO-102 export CSV", "api", 6, "2026.10.14.1", env(true, true, true)),
      it("DEMO-104", "feat: DEMO-104 tableau de bord", "front", 9, "2026.10.15.0", env(true, false, false), ["mergée il y a 9 j, pas encore en staging"]),
      it(null, "chore: bump deps", "api", 1, null, env(false, false, false), [], false)] };
}
async function loadDeliveries(force = false) {
  if (dlBusy) return; dlBusy = true;
  try {
    if (DEMO) dl = demo();
    else { const res = await fetch(`/api/gitlab/deliveries${force ? "?force=1" : ""}`), body = await res.json(); dl = res.ok ? body : { error: body.error || `HTTP ${res.status}` }; }
  } catch (err) { dl = { error: err.message }; }
  dlBusy = false; if (dl?.items) notifyMoves(); renderChiefOs();
}
// one of my MRs reached staging or prod since the last look: a toast and a notification (seen stages kept per MR; an
// MR seen for the first time only takes its place, so opening the office does not ring for old news)
const seen = new SaveSlot("office-deliveries-seen", { stages: {} }).data;
function notifyMoves() {
  const keep = {};
  for (const i of dl.items) {
    if (!i.mine || !i.iid) continue;
    const key = `${i.projectId}!${i.iid}`, now = reached(i), before = seen.stages[key];
    keep[key] = now;
    if (!before || RANK.indexOf(now) <= RANK.indexOf(before) || !["stg", "prd"].includes(now)) continue;
    const title = `${now === "prd" ? "🚀" : "🧪"} ${i.ticket || i.ref.split("/").pop()} est ${now === "prd" ? "en production" : "en staging"}`;
    toast("LIVRAISONS", title, `${i.title} (${i.service}${i.tag ? `, release ${i.tag}` : ""})`);
    hub.notify?.(title, `${i.title} — ${i.service}`, null, null);
  }
  seen.stages = keep; SaveSlot.get("office-deliveries-seen").save(seen);
}
// in the background too, for the badge (the server keeps the answer 5 min)
setTimeout(() => { loadDeliveries(); setInterval(loadDeliveries, 300e3); }, DEMO ? 1000 : 20e3);

const shown = () => (dl?.items || []).filter(i => (!view.mine || i.mine) && (!view.alertsOnly || i.alerts.length));
const kindOf = name => dl.envs.find(e => e.name === name)?.kind || "";
const reached = i => { const ks = Object.entries(i.envs).filter(([, ok]) => ok).map(([n]) => kindOf(n)); return ks.includes("prd") ? "prd" : ks.includes("stg") ? "stg" : ks.includes("dev") ? "dev" : i.tag ? "release" : "merged"; };
const RANK = ["merged", "release", "dev", "stg", "prd"], STAGE = { merged: "Mergée", release: "Release", dev: "Dev", stg: "Staging", prd: "Production" };
const link = (url, html, cls = "") => url ? `<a href="${esc(url)}" target="_blank" rel="noopener"${cls ? ` class="${cls}"` : ""}>${html}</a>` : html;
const mrRef = i => `!${esc(i.ref.split("!").pop())}`;
const stageBadge = st => `<span class="dlbadge st-${st}">${STAGE[st]}</span>`;
// what to look at before prod in an MR: one chip per kind, the files or variables in its tooltip
const riskChips = i => (i.risks || []).length ? `<span class="dlrisks">${i.risks.map(r => `<span class="dlrisk rk-${r.kind}" title="${esc(r.items.join("\n"))}">${esc(r.label)}${r.kind === "env" ? ` : ${esc(r.items.slice(0, 3).join(", "))}${r.items.length > 3 ? "…" : ""}` : r.items.length > 1 ? ` · ${r.items.length}` : ""}</span>`).join("")}</span>` : "";
// the progress of one MR: Mergée → Release → each env of its service, as connected steps (done, waiting, failed, n/a)
function stepper(i) {
  const node = (state, label, title, url = "") => `<li class="dln ${state}" title="${esc(title)}">${url ? link(url, `<i></i><span>${label}</span>`, "dlnw") : `<span class="dlnw"><i></i><span>${label}</span></span>`}</li>`;
  const imgFail = i.image?.status === "failed";
  const out = [node("done", "Mergée", `mergée il y a ${ago2(i.merged)}`, i.url),
    node(imgFail ? "fail" : i.tag ? "done" : "wait", "Release", imgFail ? `release ${i.tag} : pipeline en échec` : i.tag ? `release ${i.tag}` : "aucun tag ne contient encore la MR", imgFail ? i.image.url : i.tagUrl || "")];
  for (const e of dl.envs) {
    const ok = i.envs[e.name];
    out.push(ok === undefined ? node("na", envLabel(e), `${i.service} n'est pas déployé en ${e.name}`) : node(ok ? "done" : ok === false ? "wait" : "na", envLabel(e), ok ? `déployé (${e.name})` : ok === false ? `pas encore en ${e.name}` : "inconnu"));
  }
  return `<ol class="dlstepper">${out.join("")}</ol>`;
}

function ticketsTab() {
  const groups = new Map();
  for (const i of shown()) { const k = i.ticket || i.ref; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); }
  if (!groups.size) return `<div class="dlempty">${view.alertsOnly ? "Aucun écart sur la période." : view.mine ? "Aucune de tes MR n'a été mergée sur la période." : "Aucune MR mergée sur la période."}</div>`;
  const head = `<div class="dlrow dlhd"><span>Ticket</span><span>Merge request</span><span>Release</span><span>Progression</span></div>`;
  return `<div class="dlgrid dltickets">${head}${[...groups].map(([, items]) => {
    const t = items[0], low = items.map(reached).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0];
    return `<div class="dlgrp">${items.map((i, n) => `<div class="dlrow">
        <span class="dlticket">${n ? "" : `${t.ticket ? `<b>${ticketLink(t.ticket)}</b>` : `<b class="muted">Sans ticket</b>`}${t.ticketState ? `<small class="dlpill">${esc(t.ticketState)}</small>` : ""}${items.length > 1 ? stageBadge(low) : ""}`}</span>
        <span class="dlmr">${link(i.url, `<span class="dlref">${esc(i.service)} ${mrRef(i)}</span>`)}<span class="dltitle" title="${esc(i.title)}">${esc(i.title)}</span><small>${esc(i.authorName || i.author)} · mergée il y a ${ago2(i.merged)}</small>${riskChips(i)}</span>
        <span>${i.tag ? link(i.tagUrl, `<code>${esc(i.tag)}</code>`) : `<span class="muted">—</span>`}</span>
        <span>${stepper(i)}</span>
      </div>${i.alerts.map(a => `<div class="dlwarn"><b>Écart</b> ${esc(a)}</div>`).join("")}`).join("")}</div>`;
  }).join("")}</div>`;
}
function servicesTab() {
  const cols = `grid-template-columns: minmax(180px, 1.3fr) repeat(${dl.envs.length}, minmax(140px, 1fr))`;
  return `<div class="dlgrid">
    <div class="dlrow dlhd" style="${cols}"><span>Service</span>${dl.envs.map(e => `<span>${esc(envLabel(e))} <small>${esc(e.name)}</small></span>`).join("")}</div>
    ${dl.services.map(s => {
      const its = (dl.items || []).filter(i => i.service === s.service);
      return `<div class="dlrow" style="${cols}"><span class="dlmr">${link(s.projectUrl, `<b>${esc(s.service)}</b>`)}<small>${esc(s.project)}</small></span>${dl.envs.map(e => {
        const x = s.envs[e.name]; if (!x) return `<span class="muted">—</span>`;
        const waiting = its.filter(i => i.envs[e.name] === false).length;
        const ahead = s.diffs?.[e.name];
        return `<span class="dlenv">${link(x.url || dl.repo.url, `<code>${esc(x.tag)}</code>`)}<small>${x.since ? `mis à jour il y a ${ago2(x.since)}` : "&nbsp;"}</small>${ahead ? `<small>${link(ahead.url, `${ahead.total} commit${ahead.total > 1 ? "s" : ""} d'avance sur la prod`)}</small>` : ""}${waiting ? `<small class="dlwait">${waiting} MR en attente</small>` : ""}</span>`;
      }).join("")}</div>`;
    }).join("")}</div>`;
}
// what the next release to prod takes, per service: the merged MRs not in prod yet, where they are now
function nextProd() {
  const prd = dl.envs.filter(e => e.kind === "prd").map(e => e.name);
  return dl.services.filter(s => prd.some(p => s.envs[p])).map(s => {
    const p = prd.find(x => s.envs[x]), items = (dl.items || []).filter(i => i.service === s.service && i.envs[p] === false);
    const diffs = Object.entries(s.diffs || {}).sort(([a], [b]) => RANK.indexOf(kindOf(b)) - RANK.indexOf(kindOf(a)));
    return { s, p, items, diffs, gaps: s.configGaps || [] };
  }).filter(x => x.items.length || x.diffs.length || x.gaps.length);
}
const envName = n => envLabel(dl.envs.find(e => e.name === n) || { name: n });
function nextMarkdown() {
  return nextProd().map(({ s, p, items, diffs, gaps }) => {
    const out = [`## ${s.service} — prod : ${s.envs[p].tag}`, ""];
    if (items.length) out.push("### Merge requests", ...items.map(i => `- ${i.ticket ? `${i.ticket} ` : ""}${i.title} (${i.ref}, @${i.author}) — ${STAGE[reached(i)]}${i.tag ? `, release ${i.tag}` : ""}${(i.risks || []).length ? ` — ⚠ ${i.risks.map(r => `${r.label} (${r.items.join(", ")})`).join(" ; ")}` : ""}`), "");
    for (const [env, c] of diffs) out.push(`### ${envName(env)} ${c.to} vs prod ${c.from} : ${c.total} commit(s)`, ...c.commits.map(x => `- ${x.sha} ${x.title} (${x.author})`), "");
    if (gaps.length) out.push("### Config absente en prod", ...gaps.map(g => `- ${envName(g.env)} : ${g.keys.join(", ")}${g.more ? ` (+${g.more})` : ""}`), "");
    return out.join("\n").trim();
  }).join("\n\n");
}
function nextTab() {
  const next = nextProd();
  if (!next.length) return `<div class="dlempty">Tout ce qui a été mergé sur la période est en production.</div>`;
  return `<p class="dlnote">Ce que la prochaine mise en production emportera, par service (toutes les MR de l'équipe), avec ce qu'il faut vérifier avant.</p>` + next.map(({ s, p, items, diffs, gaps }) => {
    const risky = items.flatMap(i => i.risks || []), count = k => risky.filter(r => r.kind === k).length;
    const summary = [["migration", "migration"], ["env", "variable d'env."], ["config", "config / build"], ["deps", "dépendances"]].filter(([k]) => count(k)).map(([k, l]) => `<span class="dlrisk rk-${k}">${count(k)} ${l}</span>`).join("");
    return `<section class="dlsec">
      <div class="dlsechd"><b>${esc(s.service)}</b><span>en production <code>${esc(s.envs[p].tag)}</code></span>${summary ? `<span class="dlrisks">${summary}</span>` : ""}<span class="dlcount">${items.length} MR</span></div>
      ${items.length ? `<div class="dlgrid">${items.map(i => `<div class="dlrow dlnext"><span>${i.ticket ? `<b>${ticketLink(i.ticket)}</b>` : `<span class="muted">—</span>`}</span><span class="dlmr">${link(i.url, `<span class="dltitle">${esc(i.title)}</span>`)}<small>${mrRef(i)} · ${esc(i.authorName || i.author)}</small>${riskChips(i)}</span><span>${i.tag ? `<code>${esc(i.tag)}</code>` : ""}</span><span>${stageBadge(reached(i))}</span></div>`).join("")}</div>` : ""}
      ${diffs.map(([env, c]) => `<details class="dldet"><summary><b>${esc(envName(env))}</b> <code>${esc(c.to)}</code> vs prod <code>${esc(c.from)}</code><span>${c.error ? `<span class="dlerr">${esc(c.error)}</span>` : `${c.total} commit${c.total > 1 ? "s" : ""} d'écart`}</span>${link(c.url, "Comparer dans GitLab ↗", "dlext")}</summary>
        <div class="dlcommits">${c.commits.map(x => `<div>${link(x.url, `<code>${esc(x.sha)}</code>`)}<span class="dltitle">${esc(x.title)}</span><small>${esc(x.author)}${x.date ? ` · il y a ${ago2(x.date)}` : ""}</small></div>`).join("")}${c.total > c.commits.length ? `<small>… et ${c.total - c.commits.length} autres</small>` : ""}</div></details>`).join("")}
      ${gaps.length ? `<details class="dldet"><summary><b>Config absente en prod</b><span>${gaps.map(g => `${esc(envName(g.env))} : ${g.keys.length + g.more} réglage${g.keys.length + g.more > 1 ? "s" : ""}`).join(" · ")}</span>${link(s.envs[p].url, "Valeurs de prod ↗", "dlext")}</summary>
        <div class="dlcommits">${gaps.map(g => `<div><b>${esc(envName(g.env))}</b><span class="dlkeys">${g.keys.map(k => `<code>${esc(k)}</code>`).join(" ")}${g.more ? ` <small>+${g.more}</small>` : ""}</span></div>`).join("")}</div></details>` : ""}
    </section>`;
  }).join("");
}

function deliveriesHtml() {
  if (glStatus && !glStatus.configured && !DEMO) return notConfigured();
  if (!dl) { loadDeliveries(); return `<div class="dl"><div class="dlempty osloading" role="status">Lecture du dépôt de déploiement et des merge requests…</div></div>`; }
  if (dl.error) return `<div class="dl"><div class="dlempty dlerr">${esc(dl.error)} <button data-dl="reload">Réessayer</button></div></div>`;
  if (dl.configured === false) return notConfigured();
  if (!dl.repo) return `<div class="dl"><div class="dlempty"><b>Dépôt de déploiement non configuré.</b> Ajoute dans <code>~/.claude/agent-office.json</code> : <code>"deploy_repo": "groupe/projet-des-déploiements"</code> (valeurs Helm en <code>applications/&lt;app&gt;/&lt;env&gt;/*.yaml</code> ; <code>deploy_path</code>, <code>deploy_projects</code> au besoin), puis relance l'Office.</div></div>`;
  const all = dl.items || [], gaps = all.filter(i => i.alerts.length).length, mineGaps = all.filter(i => i.mine && i.alerts.length).length;
  const inPrd = all.filter(i => reached(i) === "prd").length, waiting = all.length - inPrd;
  const kpi = (label, value, sub = "", cls = "") => `<div class="dlkpi ${cls}"><span>${label}</span><b>${value}</b><small>${sub}</small></div>`;
  const tab = (id, label, n) => `<button data-dl="tab" data-tab="${id}" class="${view.tab === id ? "on" : ""}">${label}${n != null ? `<em>${n}</em>` : ""}</button>`;
  const toggle = (key, label, on) => `<label class="dltoggle"><input type="checkbox" data-dl="${key}"${on ? " checked" : ""}><i></i>${label}</label>`;
  return `<div class="dl">
    <div class="dlkpis">${kpi("Mergées", all.length, `sur ${dl.days} jours`)}${kpi("En production", inPrd, all.length ? `${Math.round(inPrd / all.length * 100)} %` : "")}${kpi("En attente", waiting, "pas encore en prod")}${kpi("Écarts", gaps, `dont ${mineGaps} sur tes MR`, gaps ? "warn" : "")}</div>
    <div class="dlbar"><div class="dlseg">${tab("tickets", "Tickets", shown().length)}${tab("services", "Services", dl.services.length)}${tab("next", "Prochaine prod", nextProd().reduce((t, x) => t + x.items.length, 0))}</div>
      ${view.tab === "tickets" ? `${toggle("mine", "Mes MR", view.mine)}${toggle("alerts", "Écarts seulement", view.alertsOnly)}` : ""}
      <span class="dlmeta">${link(dl.repo.url, esc(dl.repo.path))}${dl.updated ? ` · lu il y a ${ago2(new Date(dl.updated * 1000).toISOString())}` : ""}</span>
      ${view.tab === "next" ? `<button class="dlbtn" data-dl="copy">Copier en Markdown</button>` : ""}<button class="dlbtn" data-dl="reload"${dlBusy ? " disabled" : ""} title="Relire GitLab">↻ Actualiser</button></div>
    ${view.tab === "services" ? servicesTab() : view.tab === "next" ? nextTab() : ticketsTab()}</div>`;
}

class DeliveriesApp extends OsApp {
  constructor() { super("deliveries", "🚚", "Livraisons", "#2a7ab0"); }
  render() { return deliveriesHtml(); }
  badge() { return (dl?.items || []).filter(i => i.mine && i.alerts.length).length; }
  click(b) {
    const a = b.dataset.dl; if (!a) return false;
    if (a === "tab") { view.tab = b.dataset.tab; saveView(); renderChiefOs(); }
    if (a === "reload") { dl = null; loadDeliveries(true); renderChiefOs(); }
    if (a === "copy") navigator.clipboard.writeText(nextMarkdown()).then(() => toast("LIVRAISONS", "Copié ✓", "Markdown dans le presse-papiers."), () => toast("LIVRAISONS", "Copie impossible", ""));
    return true;
  }
  change(ev) {
    const a = ev.target.dataset?.dl; if (!a) return;
    if (a === "mine") view.mine = ev.target.checked;
    if (a === "alerts") view.alertsOnly = ev.target.checked;
    saveView(); renderChiefOs();
  }
}
new DeliveriesApp();
