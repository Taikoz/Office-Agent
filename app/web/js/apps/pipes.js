// ChiefOS → 🔴 Pipelines: the red pipelines of my recent projects and MRs, with the end of the failed job's log (gitlab.js).

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { ago2, glLoad, glPipes, glStatus, notConfigured } from "../ui/gitlab.js";

function pipesAppHtml() {
  if (glStatus && !glStatus.configured && !DEMO) return notConfigured();
  if (!glPipes) { glLoad("pipelines"); return `<p class="muted">Recherche des pipelines rouges…</p>`; }
  if (glPipes.error) return `<div class="osrow"><b>🦊 GitLab</b><span class="s-blocked">${esc(glPipes.error)}</span><button data-os-app="settings">⚙️ Réglages</button></div>`;
  const list = glPipes.pipelines || [];
  return `<div class="osacts"><span class="muted">${list.length ? `${list.length} pipeline(s) rouge(s) sur tes projets récents et tes MR` : "Tout est vert sur tes projets récents et tes MR. 🟢"}</span><button data-gl="reload-pipes">↻ Actualiser</button></div>`
    + list.map((p, i) => `<div class="pipe"><div class="osrow"><b>🔴 ${esc(p.project)}</b><span>branche <code>${esc(p.ref)}</code>${p.mr ? ` · <a href="${esc(p.mr.url)}" target="_blank" rel="noopener">${esc(p.mr.ref)}</a>` : ""} · job <a href="${esc(p.jobUrl || p.url)}" target="_blank" rel="noopener">${esc(p.job || "?")}</a> (${esc(p.stage || "")}) · il y a ${ago2(p.updated)}</span>
      <button data-gl="fix" data-i="${i}">🔁 Relancer un agent avec ce log</button></div>${p.log ? `<details><summary>Fin du log</summary><pre class="md">${esc(p.log)}</pre></details>` : ""}</div>`).join("");
}

class PipesApp extends OsApp {
  constructor() { super("pipes", "🔴", "Pipelines", "#e01b24"); }
  render() { return pipesAppHtml(); }
}
new PipesApp();
