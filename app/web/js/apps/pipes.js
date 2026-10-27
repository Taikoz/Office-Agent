// ChiefOS → 🔴 Pipelines: the red pipelines of my recent projects and MRs (gitlab.js), one card each — the project and
// its branch, the MR, the failed job and its stage, how long ago — with the end of the failed job's log in a terminal,
// and the two ways out: fix it with an agent (the launch form, prefilled with the log), or open the job in GitLab.

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { ago2, glLoad, glPipes, glStatus, notConfigured, glError } from "../ui/gitlab.js";
import { inProject, projectBarHtml } from "../ui/project.js";

const LOG_LINES = 14;
const open = new Set();  // pipelines whose whole log tail is shown
// GitLab's job logs start each line with a timestamp and a stream marker (2026-10-26T19:09:40.06Z 01O+): only the time stays, dimmed
const STAMP = /^(\d{4}-\d\d-\d\dT(\d\d:\d\d:\d\d)[\d.]*Z) \d{2}[OE]\+?\s?/;
const logLine = line => { const m = STAMP.exec(line), text = m ? line.slice(m[0].length) : line; return `${m ? `<i>${m[2]}</i> ` : ""}<span class="${logClass(text)}">${esc(text) || " "}</span>`; };
const logClass = line => /error|failed|failure|exception|traceback|assert/i.test(line) ? "bad" : /warn/i.test(line) ? "warn" : /passed|success|ok\b/i.test(line) ? "ok" : "";

function card(p, i) {
  const [group, name] = [p.project.split("/").slice(0, -1).join("/"), p.project.split("/").pop()], lines = (p.log || "").split("\n"), full = open.has(p.pipeline);
  const shown = full ? lines : lines.slice(-LOG_LINES);
  return `<article class="ppcard"><div class="pphead"><span class="ppdot" aria-hidden="true"></span><span class="pptitle"><b>${esc(name)}</b><small>${esc(group)}</small></span>
      <span class="ppmeta"><code class="ppref">⎇ ${esc(p.ref)}</code>${p.mr ? `<a href="${esc(p.mr.url)}" target="_blank" rel="noopener" title="${esc(p.mr.title)}">${esc(p.mr.ref)} ↗</a>` : ""}<span class="muted">il y a ${ago2(p.updated)}</span></span></div>
    <div class="ppjob"><span class="cvchip bad">✗ ${esc(p.job || "job ?")}</span>${p.stage ? `<span class="cvchip off">étape ${esc(p.stage)}</span>` : ""}<span class="muted">pipeline #${esc(String(p.pipeline))}</span></div>
    ${p.log ? `<pre class="ppterm" aria-label="Fin du log du job">${shown.map(logLine).join("\n")}</pre>
      ${lines.length > LOG_LINES ? `<button class="linklike" data-pp-log="${esc(String(p.pipeline))}">${full ? "Réduire le log" : `Voir les ${lines.length} dernières lignes`}</button>` : ""}` : `<p class="muted">Pas de log lisible pour ce job.</p>`}
    <div class="osacts"><button class="primary" data-gl="fix" data-i="${i}">🔁 Corriger avec un agent</button><a class="ppopen" href="${esc(p.jobUrl || p.url)}" target="_blank" rel="noopener">Ouvrir le job dans GitLab ↗</a></div></article>`;
}

function pipesAppHtml() {
  if (glStatus && !glStatus.configured && !DEMO) return notConfigured();
  if (!glPipes) { glLoad("pipelines"); return `${projectBarHtml()}<p class="muted osloading" role="status">Recherche des pipelines rouges…</p>`; }
  if (glPipes.error) return glError(glPipes.error);
  const all = glPipes.pipelines || [], list = all.filter(inProject.pipe), hidden = all.length - list.length;
  const head = `<div class="cvbar"><span class="muted">${list.length ? `${list.length} pipeline${list.length > 1 ? "s" : ""} rouge${list.length > 1 ? "s" : ""} sur tes projets récents et tes MR` : ""}${hidden ? ` · ${hidden} sur d'autres projets` : ""}</span><button data-gl="reload-pipes" title="Relire GitLab">↻ Actualiser</button></div>`;
  return `${projectBarHtml()}${head}${list.length ? `<div class="pplist">${list.map(p => card(p, all.indexOf(p))).join("")}</div>`
    : `<div class="cvclear">✓ Tout est vert sur ${hidden ? "ce projet" : "tes projets récents et tes MR"}.</div>`}`;
}

class PipesApp extends OsApp {
  constructor() { super("pipes", "🔴", "Pipelines", "#e01b24"); }
  render() { return pipesAppHtml(); }
  click(b) { if (!b.dataset.ppLog) return false; const id = +b.dataset.ppLog; open.has(id) ? open.delete(id) : open.add(id); renderChiefOs(); return true; }
}
new PipesApp();
