// The GitLab client of ChiefOS (office/gitlab.py): its state, loading, and the actions of 🔴 Pipelines (relaunch an
// agent with the failed job's log). The address and the token are set in ⚙️ Réglages → 🔌 Intégrations
// (ui/integrations.js). The apps: apps/codehome.js, apps/pipes.js, apps/gitlab.js (🦊 the merge requests).

import { hub } from "../hub.js";
import { esc } from "../core/data.js";
import { DESKS } from "../core/core.js";
import { openPanel } from "./panel.js";
import { OsApp } from "../apps/base.js";
import { closeChiefOs, renderChiefOs } from "./chiefos.js";

export let glStatus = null, glMrs = null, glPipes = null;
const GL_DEMO = {
  status: { configured: true, url: "https://gitlab.example.com", user: "taikoz" },
  mrs: { configured: true, user: "taikoz", url: "https://gitlab.example.com",
    review: [{ id: 1, iid: 1564, title: "DEMO-412 Export CSV des factures", url: "https://gitlab.example.com/demo/front/-/merge_requests/1564", ref: "demo/front!1564", branch: "DEMO-412-export", target: "main", author: "alice", authorName: "Alice Martin", labels: ["frontend", "priority::medium"], draft: false, conflicts: false, status: "not_approved", threadsOk: true, notes: 3, created: new Date(Date.now() - 2 * 86400e3).toISOString(), ci: "success", approved: 0, approvalsLeft: 1 }],
    mine: [{ id: 2, iid: 42, title: "DEMO-101 Règles de remise", url: "https://gitlab.example.com/demo/api/-/merge_requests/42", ref: "demo/api!42", branch: "DEMO-101-discount", target: "main", author: "taikoz", authorName: "Taikoz", labels: ["backend", "priority::high"], draft: false, conflicts: true, status: "conflict", threadsOk: false, notes: 7, created: new Date(Date.now() - 5 * 3600e3).toISOString(), ci: "failed", approved: 1, approvalsLeft: 0 }],
    assigned: [] },
  pipelines: { configured: true, pipelines: [{ project: "demo/api", projectId: 7, ref: "DEMO-101-discount", pipeline: 991, url: "https://gitlab.example.com/demo/api/-/pipelines/991", updated: new Date().toISOString(), job: "pytest", stage: "test", jobUrl: "https://gitlab.example.com/demo/api/-/jobs/5521",
    log: "tests/checkout/test_cart.py::test_discount FAILED\nE   AssertionError: assert 90.0 == 85.0\nE    +  where 90.0 = cart.total()\n=========== 1 failed, 213 passed in 41.2s ===========\nERROR: Job failed: exit code 1", mr: { ref: "demo/api!42", url: "https://gitlab.example.com/demo/api/-/merge_requests/42", title: "DEMO-101 Règles de remise" } }] },
};
export async function glGet(what) {
  if (DEMO) return GL_DEMO[what];
  const res = await fetch(`/api/gitlab/${what}`); const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
export async function glLoad(what, force = false) {
  try {
    if (what === "status") glStatus = await glGet("status");
    if (what === "mrs" && (force || !glMrs)) glMrs = await glGet("mrs");
    if (what === "pipelines" && (force || !glPipes)) glPipes = await glGet("pipelines");
  } catch (err) { (what === "mrs" ? (glMrs = { error: err.message }) : what === "pipelines" ? (glPipes = { error: err.message }) : (glStatus = { error: err.message })); }
  renderChiefOs();
}
glLoad("status");
export const ago2 = iso => { const s = (Date.now() - Date.parse(iso)) / 1000; return s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} j`; };
const CI_ICON = { success: "🟢", failed: "🔴", running: "🔵", pending: "⏳", created: "⏳", canceled: "⚪", skipped: "⚪", manual: "✋" };
// the launch form, prefilled (launch.js reads launchPreset)
export function launchWith(agent, prompt) { hub.launchPreset = { agent, prompt }; closeChiefOs(); const i = DESKS.findIndex(hub.freeDesk); openPanel(`launch:${Math.max(0, i)}:`); }
// GitLab answered with an error: what happened, and where to fix it
export const glError = msg => `<div class="oserror" role="alert"><b>GitLab ne répond pas comme prévu</b><span>${esc(msg)}</span><small>Vérifie l'adresse et le jeton (droit read_api, pas expiré) dans Réglages → Intégrations.</small><div class="osacts"><button data-os-app="settings" data-os-section="links">Ouvrir les intégrations</button><button data-gl-retry>↻ Réessayer</button></div></div>`;
export const notConfigured = () => `<div class="osempty"><span class="osemptyic" aria-hidden="true">🦊</span><b>GitLab n'est pas encore relié</b><span>Ajoute ton adresse GitLab et un jeton en lecture seule pour voir tes MR, celles à relire et les pipelines rouges.</span><div class="osacts"><button class="primary" data-os-app="settings" data-os-section="links">Relier GitLab</button></div></div>`;

OsApp.listen(["gitlab", "codehome", "pipes"], "click", ev => { if (ev.target.closest("[data-gl-retry]")) { glLoad("mrs", true); glLoad("pipelines", true); } });
OsApp.listen(["settings", "pipes"], "click", async ev => {  // their buttons (apps/settings.js, apps/pipes.js)
  const b = ev.target.closest("[data-gl]"); if (!b) return;
  const act = b.dataset.gl;
  if (act === "stats") { closeChiefOs(); return document.getElementById("perfbtn").click(); }
  if (act === "reload-pipes") { glPipes = null; return renderChiefOs(); }
  if (act === "fix") {
    const p = glPipes?.pipelines?.[+b.dataset.i]; if (!p) return;
    return launchWith("feature-builder", `La CI est rouge sur ${p.project} (branche ${p.ref}${p.mr ? `, MR ${p.mr.ref}` : ""}) : job « ${p.job} » (${p.jobUrl || p.url}).\n\nFin du log :\n${p.log.split("\n").slice(-25).join("\n")}\n\nTrouve la cause, corrige-la sur la branche ${p.ref} et pousse la correction.`);
  }
});
// 🔌 Intégrations connected, changed or disconnected GitLab: read its state again, the lists with it
window.addEventListener("office:integration", ev => { if (ev.detail === "gitlab") { glMrs = glPipes = null; glLoad("status"); } });
