// The GitLab client of ChiefOS (office/gitlab.py): its state, loading, and the actions of ⚙️ Réglages (address and a
// personal token, read_api; kept by the server, never shown back) and 🔴 Pipelines (relaunch an agent with the failed
// job's log). The apps: apps/settings.js, apps/pipes.js, apps/gitlab.js (🦊 the merge requests).

import { hub } from "../hub.js";
import { DESKS } from "../core/core.js";
import { openPanel } from "./panel.js";
import { toast } from "../sims/progress.js";
import { OsApp } from "../apps/base.js";
import { closeChiefOs, renderChiefOs } from "./chiefos.js";

export let glStatus = null, glMrs = null, glPipes = null, glMsg = "", glBusy = false, glDraftUrl = null;
const GL_DEMO = {
  status: { configured: true, url: "https://gitlab.example.com", user: "taikoz" },
  mrs: { configured: true, user: "taikoz", url: "https://gitlab.example.com",
    review: [{ id: 1, iid: 1564, title: "APP-412 Export CSV des polices", url: "https://gitlab.example.com/demo/cogito/-/merge_requests/1564", ref: "demo/cogito!1564", branch: "APP-412-export", target: "main", author: "alice", authorName: "Alice Martin", labels: ["frontend", "priority::medium"], draft: false, conflicts: false, status: "not_approved", threadsOk: true, notes: 3, created: new Date(Date.now() - 2 * 86400e3).toISOString(), ci: "success", approved: 0, approvalsLeft: 1 }],
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
export const notConfigured = () => `<div class="osrow"><b>🦊 GitLab non relié</b><span class="muted">Ajoute ton adresse GitLab et un jeton (lecture seule) pour voir tes MR et les pipelines rouges.</span><button data-os-app="settings">⚙️ Réglages</button></div>`;

OsApp.listen(["settings", "pipes"], "click", async ev => {  // their buttons (apps/settings.js, apps/pipes.js)
  const b = ev.target.closest("[data-gl]"); if (!b) return;
  const act = b.dataset.gl;
  if (act === "stats") { closeChiefOs(); return document.getElementById("perfbtn").click(); }
  if (act === "reload-pipes") { glPipes = null; return renderChiefOs(); }
  if (act === "fix") {
    const p = glPipes?.pipelines?.[+b.dataset.i]; if (!p) return;
    return launchWith("feature-builder", `La CI est rouge sur ${p.project} (branche ${p.ref}${p.mr ? `, MR ${p.mr.ref}` : ""}) : job « ${p.job} » (${p.jobUrl || p.url}).\n\nFin du log :\n${p.log.split("\n").slice(-25).join("\n")}\n\nTrouve la cause, corrige-la sur la branche ${p.ref} et pousse la correction.`);
  }
  if (act === "save" || act === "forget") {
    if (DEMO) { glMsg = "Démo : rien n'est enregistré."; return renderChiefOs(); }
    // read the fields before the "Vérification…" re-render empties them
    const body = act === "forget" ? { forget: true } : { url: document.getElementById("gl-url").value, token: document.getElementById("gl-token").value };
    if (act === "save") glDraftUrl = body.url;
    glBusy = true; glMsg = ""; renderChiefOs();
    try {
      const res = await fetch("/api/gitlab/config", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) });
      const out = await res.json();
      if (res.status === 403) throw new Error("page périmée : recharge-la (Ctrl+Maj+R)");
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      glStatus = out; glMrs = glPipes = null; glDraftUrl = null;
      glMsg = act === "forget" ? "Jeton oublié." : `✓ Connecté en tant que @${out.user}.`;
      if (act === "save") toast("GITLAB", "Relié ✓", `@${out.user} · ${out.url}`);
    } catch (err) { glMsg = `✗ ${err.message}`; }
    glBusy = false; renderChiefOs();
  }
});
