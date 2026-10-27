// The project in focus, shared by every code view of ChiefOS: chosen once (the bar on top of 🧭 Vue d'ensemble,
// 🦊 GitLab, 🔴 Pipelines, 🐞 Erreurs and the generated apps), it filters all of them; « Tous les projets » shows
// everything. A project is a GitLab project path (group/name), the projects listed are the ones the data shows (MRs,
// red pipelines). Its Sentry project is found when its slug, or the service it watches (🚚 Livraisons), is the last
// part of the path; otherwise the user picks it (or none) in the bar, kept with the choice. Without a known Sentry
// project, the errors are not filtered and the bar says so: nothing is matched by guess beyond that rule.

import { esc } from "../core/data.js";
import { SaveSlot } from "../save/slot.js";
import { renderChiefOs } from "./chiefos.js";
import { glMrs, glPipes } from "./gitlab.js";
import { sentryState } from "../apps/errors.js";

export const project = new SaveSlot("office-project", { id: "", sentry: {} }).data;  // sentry: path → slug ("" = none)
let picking = false;
const save = () => SaveSlot.get("office-project").save(project);
const pathOfRef = ref => String(ref || "").split("!")[0];
const last = path => path.split("/").pop();

// the GitLab projects the data knows, the most active first
export function knownProjects() {
  const n = new Map(), add = p => p && n.set(p, (n.get(p) || 0) + 1);
  for (const m of [...(glMrs?.review || []), ...(glMrs?.mine || []), ...(glMrs?.assigned || [])]) add(pathOfRef(m.ref));
  for (const p of glPipes?.pipelines || []) add(p.project);
  if (project.id) add(project.id);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([p]) => p);
}
// the Sentry project of a GitLab path: the user's choice, else the rule (slug or service = last part of the path)
export function sentryOf(path) {
  if (!path) return null;
  if (path in project.sentry) return project.sentry[path] || null;
  const name = last(path), s = sentryState();
  return (s.projects || []).find(p => p.slug === name || p.service === name)?.slug || null;
}
// does an item belong to the project in focus? (everything does with « Tous les projets »)
export const inProject = {
  mr: m => !project.id || pathOfRef(m.ref) === project.id,
  pipe: p => !project.id || p.project === project.id,
  // a Sentry item by its project slug (or the service of a deploy alert); unfiltered when no Sentry project is known
  sentry: slug => !project.id || !sentryOf(project.id) || slug === sentryOf(project.id) || slug === last(project.id),
  // a row of a generated app, by its view's scope [kind, key]
  row: (scope, r) => !project.id || !scope?.length ? true : scope[0] === "gitlab_ref" ? pathOfRef(r[scope[1]]) === project.id
    : scope[0] === "gitlab_project" ? r[scope[1]] === project.id : scope[0] === "sentry" ? inProject.sentry(r[scope[1]]) : true,
};
export const sentryFiltered = () => !!project.id && !!sentryOf(project.id);

export function projectBarHtml({ sentry = false } = {}) {
  const list = knownProjects(), s = sentryState(), slug = sentryOf(project.id);
  const pick = `<label class="pjpick"><span aria-hidden="true">📁</span><select data-pj-select aria-label="Projet en cours">
    <option value="">Tous les projets</option>${list.map(p => `<option value="${esc(p)}"${p === project.id ? " selected" : ""}>${esc(p)}</option>`).join("")}</select></label>`;
  if (!project.id) return `<div class="pjbar">${pick}<span class="muted">Choisis un projet : Vue d'ensemble, GitLab, Pipelines, Erreurs et tes applications se filtrent dessus.</span></div>`;
  const sentryPart = !s.configured ? "" : picking
    ? `<label class="pjpick">🐞 <select data-pj-sentry aria-label="Projet Sentry de ${esc(project.id)}"><option value="">aucun</option>${(s.projects || []).map(p => `<option value="${esc(p.slug)}"${p.slug === slug ? " selected" : ""}>${esc(p.slug)}</option>`).join("")}</select></label>`
    : `<span class="muted">🐞 ${slug ? `Sentry : <b>${esc(slug)}</b>` : `Sentry : non associé${sentry ? " (erreurs non filtrées)" : ""}`}</span><button data-pj-sentry-edit>${slug ? "Changer" : "Associer"}</button>`;
  return `<div class="pjbar on">${pick}${sentryPart}<button data-pj-clear title="Revenir à tous les projets">✕</button></div>`;
}

document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.matches?.("[data-pj-select]")) { project.id = t.value; picking = false; save(); renderChiefOs(); }
  else if (t.matches?.("[data-pj-sentry]")) { project.sentry[project.id] = t.value; picking = false; save(); renderChiefOs(); }
});
document.addEventListener("click", ev => {
  const b = ev.target.closest?.("[data-pj-clear], [data-pj-sentry-edit]"); if (!b) return;
  if (b.hasAttribute("data-pj-clear")) { project.id = ""; picking = false; save(); }
  else picking = true;
  renderChiefOs();
});
