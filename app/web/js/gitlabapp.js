"use strict";
// ChiefOS × GitLab (office/gitlab.py): ⚙️ Réglages to enter the GitLab address and a personal token (read_api; kept by the
// server, never shown back), 🔀 Merge requests (to review, mine, assigned: CI, approvals, threads, conflicts) and
// 🔴 Pipelines (red pipelines of my projects and MRs, with the end of the failed job's log). Each item opens GitLab, and
// can launch an agent through the usual form (prefilled: review, or fix the CI with the log).

let glStatus = null, glMrs = null, glPipes = null, glMsg = "", glBusy = false, glDraftUrl = null;
const GL_DEMO = {
  status: { configured: true, url: "https://gitlab.example.com", user: "taikoz" },
  mrs: { configured: true, user: "taikoz", url: "https://gitlab.example.com",
    review: [{ id: 1, iid: 1564, title: "DEMO-412 Export CSV des factures", url: "https://gitlab.example.com/demo/front/-/merge_requests/1564", ref: "demo/front!1564", branch: "DEMO-412-export", target: "main", author: "alice", authorName: "Alice Martin", labels: ["frontend", "priority::medium"], draft: false, conflicts: false, status: "not_approved", threadsOk: true, notes: 3, created: new Date(Date.now() - 2 * 86400e3).toISOString(), ci: "success", approved: 0, approvalsLeft: 1 }],
    mine: [{ id: 2, iid: 42, title: "DEMO-101 Règles de remise", url: "https://gitlab.example.com/demo/api/-/merge_requests/42", ref: "demo/api!42", branch: "DEMO-101-discount", target: "main", author: "taikoz", authorName: "Taikoz", labels: ["backend", "priority::high"], draft: false, conflicts: true, status: "conflict", threadsOk: false, notes: 7, created: new Date(Date.now() - 5 * 3600e3).toISOString(), ci: "failed", approved: 1, approvalsLeft: 0 }],
    assigned: [] },
  pipelines: { configured: true, pipelines: [{ project: "demo/api", projectId: 7, ref: "DEMO-101-discount", pipeline: 991, url: "https://gitlab.example.com/demo/api/-/pipelines/991", updated: new Date().toISOString(), job: "pytest", stage: "test", jobUrl: "https://gitlab.example.com/demo/api/-/jobs/5521",
    log: "tests/checkout/test_cart.py::test_discount FAILED\nE   AssertionError: assert 90.0 == 85.0\nE    +  where 90.0 = cart.total()\n=========== 1 failed, 213 passed in 41.2s ===========\nERROR: Job failed: exit code 1", mr: { ref: "demo/api!42", url: "https://gitlab.example.com/demo/api/-/merge_requests/42", title: "DEMO-101 Règles de remise" } }] },
};
async function glGet(what) {
  if (DEMO) return GL_DEMO[what];
  const res = await fetch(`/api/gitlab/${what}`); const body = await res.json();
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
async function glLoad(what, force = false) {
  try {
    if (what === "status") glStatus = await glGet("status");
    if (what === "mrs" && (force || !glMrs)) glMrs = await glGet("mrs");
    if (what === "pipelines" && (force || !glPipes)) glPipes = await glGet("pipelines");
  } catch (err) { (what === "mrs" ? (glMrs = { error: err.message }) : what === "pipelines" ? (glPipes = { error: err.message }) : (glStatus = { error: err.message })); }
  renderChiefOs();
}
glLoad("status");
const ago2 = iso => { const s = (Date.now() - Date.parse(iso)) / 1000; return s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} j`; };
const CI_ICON = { success: "🟢", failed: "🔴", running: "🔵", pending: "⏳", created: "⏳", canceled: "⚪", skipped: "⚪", manual: "✋" };
// the launch form, prefilled (launch.js reads launchPreset)
function launchWith(agent, prompt) { launchPreset = { agent, prompt }; closeChiefOs(); const i = DESKS.findIndex(freeDesk); openPanel(`launch:${Math.max(0, i)}:`); }
const notConfigured = () => `<div class="osrow"><b>🦊 GitLab non relié</b><span class="muted">Ajoute ton adresse GitLab et un jeton (lecture seule) pour voir tes MR et les pipelines rouges.</span><button data-os-app="settings">⚙️ Réglages</button></div>`;

/* ---------- ⚙️ Réglages ---------- */
function settingsAppHtml() {
  if (!glStatus) return `<p class="muted">Chargement…</p>`;
  const st = glStatus, url = st.url || "https://gitlab.com";
  const create = `${url}/-/user_settings/personal_access_tokens?name=Agent%20Office&scopes=read_api`;
  return `<h4>GITLAB</h4>
    <div class="osrow"><b>État</b><span>${st.error ? `<span class="s-blocked">${esc(st.error)}</span>` : st.configured ? `✅ connecté en tant que <b>@${esc(st.user)}</b> sur ${esc(st.url)}` : "non relié"}</span><span>${st.configured ? `<button data-gl="forget">Oublier le jeton</button>` : ""}</span></div>
    <div class="osrow"><b>Adresse</b><span><input id="gl-url" value="${esc(glDraftUrl ?? st.url ?? "")}" placeholder="https://gitlab.com ou https://gitlab.mon-entreprise.fr" aria-label="Adresse GitLab"></span><span></span></div>
    <div class="osrow"><b>Jeton personnel</b><span><input id="gl-token" type="password" autocomplete="off" placeholder="${st.configured ? "•••••• enregistré (laisser vide pour le garder)" : "glpat-…"}" aria-label="Jeton GitLab"></span><span><a href="${esc(create)}" target="_blank" rel="noopener">Créer un jeton ↗</a></span></div>
    <div class="osacts"><button data-gl="save" class="ubok"${glBusy ? " disabled" : ""}>${glBusy ? "Vérification…" : "Enregistrer et tester"}</button><span class="muted">${esc(glMsg)}</span></div>
    <p class="muted">Droit <b>read_api</b> suffisant (lecture seule). Le jeton reste sur cette machine (<code>~/.claude/agent-office/gitlab.json</code>, lisible par toi seul) : la page ne le revoit jamais et il n'est pas dans la sauvegarde. Le serveur interroge GitLab lui-même.</p>
    ${dockSettingsHtml()}
    <h4>AUTRES RÉGLAGES</h4>
    <div class="osrow"><b>🌦️ Météo réelle</b><span class="muted">${meteo.on ? `activée · ${esc(meteo.city)}` : "désactivée"}</span><button data-os-app="meteo">Ouvrir</button></div>
    <div class="osrow"><b>📅 Agents en parallèle</b><span class="muted">${plan.max} à la fois pour le planning</span><button data-os-app="planning">Ouvrir</button></div>
    <div class="osrow"><b>💸 Budgets par mission</b><span class="muted">dans les statistiques</span><button data-gl="stats">Ouvrir</button></div>`;
}
document.getElementById("chiefos").addEventListener("click", async ev => {
  const b = ev.target.closest("[data-gl]"); if (!b) return;
  const act = b.dataset.gl;
  if (act === "stats") { closeChiefOs(); return document.getElementById("perfbtn").click(); }
  if (act === "reload-mrs") { glMrs = null; return renderChiefOs(); }
  if (act === "reload-pipes") { glPipes = null; return renderChiefOs(); }
  if (act === "review") { const mr = [...(glMrs?.review || []), ...(glMrs?.mine || []), ...(glMrs?.assigned || [])].find(m => String(m.id) === b.dataset.id); return launchWith("mr-reviewer", `Review la MR ${mr.ref} (${mr.url}) : « ${mr.title} ».`); }
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

/* ---------- 🔀 Merge requests: the agents' ones, and with GitLab mine, to review, assigned ---------- */
function mrRowHtml(m, canReview) {
  const ci = m.ci ? `<a href="${esc(m.ciUrl || m.url)}" target="_blank" rel="noopener" title="CI ${esc(m.ci)}">${CI_ICON[m.ci] || "⚪"} CI</a>` : `<span class="muted">pas de CI</span>`;
  const flags = [m.draft ? "📝 brouillon" : "", m.conflicts ? "⚠️ conflits" : "", !m.threadsOk ? "💬 discussions ouvertes" : "", m.approvalsLeft === 0 ? `✅ approuvée (${m.approved})` : m.approvalsLeft ? `👍 ${m.approved} · encore ${m.approvalsLeft}` : ""].filter(Boolean).join(" · ");
  return `<div class="osrow"><b><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.ref)} ↗</a></b><span>${esc(clip(m.title, 80))}<br><small class="muted">@${esc(m.author)} · il y a ${ago2(m.created)} · ${ci}${flags ? ` · ${flags}` : ""}</small></span>
    <span>${canReview ? `<button data-gl="review" data-id="${m.id}">🔍 Lancer une review</button>` : ""}</span></div>`;
}
function glMrsHtml() {
  if (glStatus && !glStatus.configured && !DEMO) return notConfigured();
  if (!glMrs) { glLoad("mrs"); return `<p class="muted">Lecture de GitLab…</p>`; }
  if (glMrs.error) return `<div class="osrow"><b>🦊 GitLab</b><span class="s-blocked">${esc(glMrs.error)}</span><button data-os-app="settings">⚙️ Réglages</button></div>`;
  const sec = (title, list, review) => `<h4>${title} (${list.length})</h4>${list.length ? list.map(m => mrRowHtml(m, review)).join("") : `<p class="muted">Rien.</p>`}`;
  return `<div class="osacts"><span class="muted">🦊 @${esc(glMrs.user)}</span><button data-gl="reload-mrs">↻ Actualiser</button></div>`
    + sec("À RELIRE", glMrs.review, true) + sec("LES MIENNES", glMrs.mine, false) + sec("ASSIGNÉES À MOI", glMrs.assigned, true);
}

/* ---------- 🔴 Pipelines ---------- */
function pipesAppHtml() {
  if (glStatus && !glStatus.configured && !DEMO) return notConfigured();
  if (!glPipes) { glLoad("pipelines"); return `<p class="muted">Recherche des pipelines rouges…</p>`; }
  if (glPipes.error) return `<div class="osrow"><b>🦊 GitLab</b><span class="s-blocked">${esc(glPipes.error)}</span><button data-os-app="settings">⚙️ Réglages</button></div>`;
  const list = glPipes.pipelines || [];
  return `<div class="osacts"><span class="muted">${list.length ? `${list.length} pipeline(s) rouge(s) sur tes projets récents et tes MR` : "Tout est vert sur tes projets récents et tes MR. 🟢"}</span><button data-gl="reload-pipes">↻ Actualiser</button></div>`
    + list.map((p, i) => `<div class="pipe"><div class="osrow"><b>🔴 ${esc(p.project)}</b><span>branche <code>${esc(p.ref)}</code>${p.mr ? ` · <a href="${esc(p.mr.url)}" target="_blank" rel="noopener">${esc(p.mr.ref)}</a>` : ""} · job <a href="${esc(p.jobUrl || p.url)}" target="_blank" rel="noopener">${esc(p.job || "?")}</a> (${esc(p.stage || "")}) · il y a ${ago2(p.updated)}</span>
      <button data-gl="fix" data-i="${i}">🔁 Relancer un agent avec ce log</button></div>${p.log ? `<details><summary>Fin du log</summary><pre class="md">${esc(p.log)}</pre></details>` : ""}</div>`).join("");
}
