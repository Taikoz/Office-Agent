"use strict";
// ChiefOS → 🦊 GitLab, a page of its own: tabs for the merge requests linked to me (to review, mine, assigned, all,
// with search), and one MR in full — merge widget (pipeline, approvals, threads, conflicts, draft), then Aperçu
// (description), Discussions (threads on the code and comments), Pipeline (stages and jobs, a job's log on click) and
// Fichiers (changed files, coloured diff). Actions prefill the usual launch form: review, address the comments, fix the CI.

const glv = { tab: "review", q: "", open: null, sub: "overview", detail: null, err: "", unresolvedOnly: false, files: new Set(), job: null };
const AV_COLORS = ["#e24329", "#fc6d26", "#6e49cb", "#1f75cb", "#108548", "#c17d10", "#dd2b0e", "#5943b6", "#0b5cad", "#217645"];
const avatar = (u, size = 26) => { const n = u?.name || u?.username || u || "?"; return `<span class="glav" style="--av:${AV_COLORS[hash(String(u?.username || n)) % AV_COLORS.length]};--s:${size}px" title="${esc(n)}">${esc(n.split(/[\s._-]+/).map(w => w[0]).join("").slice(0, 2).toUpperCase())}</span>`; };
const label = l => { const [k, v] = l.split("::"); const c = AV_COLORS[hash(k) % AV_COLORS.length]; return v ? `<span class="gllabel scoped" style="--lc:${c}"><b>${esc(k)}</b>${esc(v)}</span>` : `<span class="gllabel" style="--lc:${c}">${esc(l)}</span>`; };
const GL_STATUS_FR = { success: "réussi", failed: "échoué", running: "en cours", pending: "en attente", created: "créé", canceled: "annulé", skipped: "sauté", manual: "manuel", scheduled: "planifié" };
const ciIcon = s => `<span class="glci ${esc(s || "none")}" title="${esc(GL_STATUS_FR[s] || s || "pas de pipeline")}">${{ success: "✓", failed: "✕", running: "◔", pending: "⏸", created: "○", canceled: "⊘", skipped: "»", manual: "⚙" }[s] || "–"}</span>`;
const glDur = s => s == null ? "" : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")}`;
// the bits of Markdown GitLab comments use, on escaped text (links only to http(s))
function mdLite(src) {
  const blocks = String(src || "").split(/```/);
  return blocks.map((b, i) => i % 2 ? `<pre class="glcode">${esc(b.replace(/^\w*\n/, ""))}</pre>` : esc(b)
    .replace(/^#{1,6} (.+)$/gm, "<b class=\"glh\">$1</b>").replace(/^\s*[-*] \[x\] (.+)$/gim, "☑ $1").replace(/^\s*[-*] \[ \] (.+)$/gm, "☐ $1").replace(/^\s*[-*] (.+)$/gm, "• $1")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>")).join("");
}

/* ---------- demo data (?demo=1) ---------- */
const GLV_DEMO = {
  "7:42": { configured: true, project: 7, iid: 42, title: "DEMO-101 Règles de remise", description: "## Quoi\nAjoute les règles de remise au panier.\n\n- [x] remise par palier\n- [ ] remise fidélité\n\nVoir `cart.total()`.", state: "opened", draft: false,
    webUrl: "https://gitlab.example.com/demo/api/-/merge_requests/42", ref: "demo/api!42", source: "DEMO-101-discount", target: "main", author: { name: "Taikoz", username: "taikoz" },
    assignees: [{ name: "Taikoz", username: "taikoz" }], reviewers: [{ name: "Alice Martin", username: "alice" }], labels: ["backend", "priority::high"], created: new Date(Date.now() - 5 * 3600e3).toISOString(),
    conflicts: true, mergeStatus: "conflict", threadsOk: false, upvotes: 1, changes: "3", approvals: { required: 1, left: 0, by: [{ name: "Alice Martin", username: "alice" }] },
    pipeline: { id: 991, status: "failed", url: "https://gitlab.example.com/demo/api/-/pipelines/991", sha: "3f2a1c9e", updated: new Date().toISOString() },
    jobs: [{ id: 5519, name: "ruff", stage: "lint", status: "success", duration: 12 }, { id: 5520, name: "mypy", stage: "lint", status: "success", duration: 31 },
      { id: 5521, name: "pytest", stage: "test", status: "failed", duration: 41 }, { id: 5522, name: "e2e", stage: "test", status: "skipped" }, { id: 5523, name: "deploy-staging", stage: "deploy", status: "manual" }],
    threads: [{ id: "a", resolvable: true, resolved: false, file: "checkout/cart.py", line: 48, notes: [{ author: { name: "Alice Martin", username: "alice" }, body: "La remise fidélité s'applique avant le palier ? Il faudrait un test pour ce cas.", created: new Date(Date.now() - 3 * 3600e3).toISOString() }, { author: { name: "Taikoz", username: "taikoz" }, body: "Bonne remarque, je l'ajoute.", created: new Date(Date.now() - 2 * 3600e3).toISOString() }] },
      { id: "b", resolvable: true, resolved: true, file: "checkout/rules.py", line: 12, notes: [{ author: { name: "Alice Martin", username: "alice" }, body: "Nom de variable : `pct` → `percent` ?", created: new Date(Date.now() - 4 * 3600e3).toISOString() }] },
      { id: "c", resolvable: false, resolved: false, file: "", notes: [{ author: { name: "Alice Martin", username: "alice" }, body: "**Très propre** dans l'ensemble 👍", created: new Date(Date.now() - 3600e3).toISOString() }] },
      { id: "s", system: true, notes: [{ author: { name: "Taikoz", username: "taikoz" }, body: "added 2 commits", system: true, created: new Date(Date.now() - 1800e3).toISOString() }] }],
    files: [{ path: "checkout/cart.py", adds: 14, dels: 3, diff: "@@ -40,7 +40,18 @@ class Cart:\n     def total(self):\n-        return sum(i.price for i in self.items)\n+        base = sum(i.price for i in self.items)\n+        return apply_rules(base, self.rules)" },
      { path: "checkout/rules.py", new: true, adds: 22, dels: 0, diff: "@@ -0,0 +1,22 @@\n+def apply_rules(total, rules):\n+    for rule in rules:\n+        total = rule(total)\n+    return total" },
      { path: "tests/checkout/test_cart.py", adds: 9, dels: 0, diff: "@@ -10,0 +11,9 @@\n+def test_discount():\n+    assert Cart([...]).total() == 85.0" }] },
};
GLV_DEMO["1:1564"] = { ...GLV_DEMO["7:42"], project: 1, iid: 1564, title: "DEMO-412 Export CSV des factures", ref: "demo/front!1564", source: "DEMO-412-export", author: { name: "Alice Martin", username: "alice" },
  conflicts: false, mergeStatus: "not_approved", threadsOk: true, approvals: { required: 1, left: 1, by: [] }, pipeline: { ...GLV_DEMO["7:42"].pipeline, status: "success" }, jobs: GLV_DEMO["7:42"].jobs.map(j => ({ ...j, status: j.status === "failed" ? "success" : j.status })),
  threads: [GLV_DEMO["7:42"].threads[2]], webUrl: "https://gitlab.example.com/demo/front/-/merge_requests/1564" };

/* ---------- loading ---------- */
async function glvOpen(project, iid) {
  glv.open = { project, iid }; glv.detail = null; glv.err = ""; glv.sub = "overview"; glv.files = new Set(); glv.job = null; renderChiefOs();
  try { glv.detail = DEMO ? GLV_DEMO[`${project}:${iid}`] || GLV_DEMO["7:42"] : await glGet(`mr?project=${project}&iid=${iid}`); }
  catch (err) { glv.err = err.message; }
  renderChiefOs();
}
async function glvJob(job) {
  const d = glv.detail; glv.job = { ...job, log: null }; renderChiefOs();
  try { glv.job.log = DEMO ? "tests/checkout/test_cart.py::test_discount FAILED\nE   AssertionError: assert 90.0 == 85.0\n=========== 1 failed, 213 passed in 41.2s ===========\nERROR: Job failed: exit code 1" : (await glGet(`job?project=${d.project}&job=${job.id}`)).log; }
  catch (err) { glv.job.log = `✗ ${err.message}`; }
  renderChiefOs();
}

/* ---------- the list ---------- */
function glvListHtml() {
  if (!DEMO && glStatus && !glStatus.configured) return notConfigured();
  if (!glMrs) { glLoad("mrs"); return `<p class="muted">Lecture de GitLab…</p>`; }
  if (glMrs.error) return `<div class="osrow"><b>🦊 GitLab</b><span class="s-blocked">${esc(glMrs.error)}</span><button data-os-app="settings">⚙️ Réglages</button></div>`;
  const all = [...glMrs.review, ...glMrs.mine, ...glMrs.assigned];
  const lists = { review: glMrs.review, mine: glMrs.mine, assigned: glMrs.assigned, all };
  const q = glv.q.toLowerCase(), list = lists[glv.tab].filter(m => !q || `${m.title} ${m.ref} ${m.branch} ${m.author} ${(m.labels || []).join(" ")}`.toLowerCase().includes(q));
  const tabs = [["review", "À relire"], ["mine", "Les miennes"], ["assigned", "Assignées"], ["all", "Toutes"]];
  return `<div class="glbar"><span class="gllogo">🦊</span><b>Merge requests</b><span class="muted">@${esc(glMrs.user)} · ${esc(glMrs.url)}</span>
      <input class="glsearch" placeholder="Rechercher (titre, branche, auteur, label)…" value="${esc(glv.q)}" aria-label="Rechercher"><button data-gl="reload-mrs" title="Actualiser">↻</button></div>
    <nav class="gltabs">${tabs.map(([id, l]) => `<button data-glv-tab="${id}" class="${glv.tab === id ? "on" : ""}">${l} <span class="glcount">${lists[id].length}</span></button>`).join("")}</nav>
    <div class="gllist">${list.length ? list.map(m => `<button class="glmr" data-glv-open="${m.project}:${m.iid}">
        ${ciIcon(m.ci)}<span class="glmain"><b>${m.draft ? '<span class="gldraft">Brouillon</span> ' : ""}${esc(m.title)}</b>
          <small>${esc(m.ref)} · <code>${esc(m.branch)}</code>${m.target ? ` → <code>${esc(m.target)}</code>` : ""} · par ${esc(m.authorName || m.author)} · il y a ${ago2(m.created)}</small>
          <span class="gllabels">${(m.labels || []).map(label).join("")}</span></span>
        <span class="glmeta">${m.conflicts ? '<span class="glwarn" title="Conflits">⚠️</span>' : ""}${!m.threadsOk ? '<span title="Discussions ouvertes">💬!</span>' : ""}
          <span title="Commentaires">💬 ${m.notes || 0}</span><span title="Approbations">👍 ${m.approved}${m.approvalsLeft != null ? `/${m.approved + m.approvalsLeft}` : ""}</span>${avatar({ username: m.author, name: m.authorName || m.author })}</span></button>`).join("")
      : `<p class="muted glempty">Aucune merge request ici.</p>`}</div>`;
}

/* ---------- one merge request ---------- */
function glvChecks(d) {
  const unresolved = d.threads.filter(t => t.resolvable && !t.resolved).length, req = d.approvals.required ?? 0, got = d.approvals.by.length;
  const checks = [
    [d.pipeline ? d.pipeline.status === "success" : null, `Pipeline ${d.pipeline ? GL_STATUS_FR[d.pipeline.status] || d.pipeline.status : "absent"}`, d.pipeline ? `<a href="${esc(d.pipeline.url)}" target="_blank" rel="noopener">#${d.pipeline.id}</a>` : ""],
    [d.approvals.left === 0 || req === 0, `Approbations : ${got}${req ? ` sur ${req} requise${req > 1 ? "s" : ""}` : ""}`, d.approvals.by.map(p => avatar(p, 20)).join("")],
    [!unresolved, unresolved ? `${unresolved} discussion${unresolved > 1 ? "s" : ""} non résolue${unresolved > 1 ? "s" : ""}` : "Toutes les discussions sont résolues", ""],
    [!d.conflicts, d.conflicts ? "Conflits avec la branche cible" : "Pas de conflit", ""],
    [!d.draft, d.draft ? "Brouillon" : "Prête (pas un brouillon)", ""],
  ];
  const blockers = checks.filter(c => c[0] === false).length;
  const head = d.state === "merged" ? `<b class="glok">✓ Fusionnée</b>` : d.state === "closed" ? `<b class="glko">Fermée</b>` : blockers ? `<b class="glko">✕ ${blockers} point${blockers > 1 ? "s" : ""} bloquant${blockers > 1 ? "s" : ""}</b>` : `<b class="glok">✓ Prête à fusionner</b>`;
  return `<div class="glwidget"><div class="glwhead">${head}<span class="muted">${esc(d.mergeStatus || "")}</span></div>${checks.map(([ok, text, extra]) => `<div class="glcheck"><span class="${ok === null ? "glna" : ok ? "glok" : "glko"}">${ok === null ? "–" : ok ? "✓" : "✕"}</span><span>${text}</span><span>${extra}</span></div>`).join("")}</div>`;
}
function glvOverview(d) {
  return `<div class="glgrid"><div class="gldesc">${d.description ? mdLite(d.description) : `<p class="muted">Pas de description.</p>`}</div>
    <aside class="glside"><div><small>AUTEUR</small>${avatar(d.author, 22)} ${esc(d.author.name || d.author.username)}</div>
      <div><small>RELECTEURS</small>${d.reviewers.length ? d.reviewers.map(p => `${avatar(p, 22)} ${esc(p.name || p.username)}`).join("<br>") : "aucun"}</div>
      <div><small>ASSIGNÉS</small>${d.assignees.length ? d.assignees.map(p => `${avatar(p, 22)} ${esc(p.name || p.username)}`).join("<br>") : "aucun"}</div>
      <div><small>LABELS</small><span class="gllabels">${d.labels.length ? d.labels.map(label).join("") : "aucun"}</span></div>
      <div><small>DATES</small>ouverte il y a ${ago2(d.created)}${d.merged ? `<br>fusionnée il y a ${ago2(d.merged)}` : ""}</div></aside></div>`;
}
function glvThreads(d) {
  const code = d.threads.filter(t => !t.system && (!glv.unresolvedOnly || (t.resolvable && !t.resolved))), sys = d.threads.filter(t => t.system);
  const note = n => `<div class="glnote">${avatar(n.author)}<div><div class="glnh"><b>${esc(n.author.name || n.author.username)}</b> <span class="muted">@${esc(n.author.username)} · il y a ${ago2(n.created)}</span></div><div class="glnb">${mdLite(n.body)}</div></div></div>`;
  return `<div class="osacts"><label><input type="checkbox" data-glv-unresolved${glv.unresolvedOnly ? " checked" : ""}> Non résolues seulement</label></div>`
    + (code.length ? code.map(t => `<div class="glthread${t.resolvable ? t.resolved ? " resolved" : " open" : ""}"><div class="glth">${t.file ? `<code>📄 ${esc(t.file)}${t.line ? `:${t.line}` : ""}</code>` : "<span>💬 Commentaire</span>"}${t.resolvable ? `<span class="${t.resolved ? "glok" : "glko"}">${t.resolved ? "✓ résolue" : "● à résoudre"}</span>` : ""}</div>${t.notes.map(note).join("")}</div>`).join("") : `<p class="muted">Aucune discussion${glv.unresolvedOnly ? " non résolue" : ""}.</p>`)
    + (sys.length ? `<details class="glsys"><summary>Activité (${sys.length})</summary>${sys.flatMap(t => t.notes).map(n => `<div>${esc(n.author.username)} ${esc(n.body)} <span class="muted">· il y a ${ago2(n.created)}</span></div>`).join("")}</details>` : "");
}
function glvPipeline(d) {
  if (!d.pipeline) return `<p class="muted">Pas de pipeline pour cette merge request.</p>`;
  const stages = [...new Set(d.jobs.map(j => j.stage))];
  return `<div class="glpipehead">${ciIcon(d.pipeline.status)}<b>Pipeline #${d.pipeline.id} ${esc(GL_STATUS_FR[d.pipeline.status] || d.pipeline.status)}</b><span class="muted">${d.pipeline.sha ? `commit <code>${esc(d.pipeline.sha)}</code> · ` : ""}il y a ${ago2(d.pipeline.updated || d.updated)}</span><a href="${esc(d.pipeline.url)}" target="_blank" rel="noopener">Ouvrir ↗</a></div>
    <div class="glstages">${stages.map(s => `<div class="glstage"><small>${esc(s)}</small>${d.jobs.filter(j => j.stage === s).map(j => `<button class="gljob ${esc(j.status)}${glv.job?.id === j.id ? " on" : ""}" data-glv-job="${j.id}" title="${esc(GL_STATUS_FR[j.status] || j.status)}${j.allowFailure ? " (échec permis)" : ""}">${ciIcon(j.status)}<span>${esc(j.name)}</span><small>${glDur(j.duration)}</small></button>`).join("")}</div>`).join("")}</div>
    ${glv.job ? `<div class="gljoblog"><div class="osacts"><b>Log de ${esc(glv.job.name)}</b>${glv.job.url ? `<a href="${esc(glv.job.url)}" target="_blank" rel="noopener">Ouvrir ↗</a>` : ""}${glv.job.log && glv.job.status === "failed" ? `<button data-glv-act="fixjob" class="ubok">🔁 Relancer un agent avec ce log</button>` : ""}</div><pre class="md">${glv.job.log == null ? "Chargement…" : esc(glv.job.log)}</pre></div>` : `<p class="muted">Clique sur un job pour voir la fin de son log.</p>`}`;
}
function glvFiles(d) {
  const adds = d.files.reduce((s, f) => s + f.adds, 0), dels = d.files.reduce((s, f) => s + f.dels, 0);
  const line = l => `<div class="${l.startsWith("+") ? "add" : l.startsWith("-") ? "del" : l.startsWith("@@") ? "hunk" : ""}">${esc(l) || " "}</div>`;
  return `<div class="osacts"><span>${d.files.length} fichier${d.files.length > 1 ? "s" : ""} · <span class="gladd">+${adds}</span> <span class="gldel">−${dels}</span></span><button data-glv-act="allfiles">${glv.files.size ? "Tout replier" : "Tout déplier"}</button></div>`
    + d.files.map((f, i) => `<div class="glfile"><button class="glfh" data-glv-file="${i}"><span>${glv.files.has(i) ? "▾" : "▸"}</span><code>${esc(f.path)}</code>${f.new ? '<span class="gltag new">nouveau</span>' : f.deleted ? '<span class="gltag del">supprimé</span>' : f.renamed ? `<span class="gltag">renommé de ${esc(f.old)}</span>` : ""}
        <span class="glstat"><span class="gladd">+${f.adds}</span> <span class="gldel">−${f.dels}</span><i style="--a:${f.adds};--d:${f.dels}"></i></span></button>${glv.files.has(i) ? `<div class="gldiff">${f.diff.split("\n").map(line).join("")}${f.truncated ? '<div class="hunk">… diff tronqué (voir dans GitLab)</div>' : ""}</div>` : ""}</div>`).join("");
}
function glvDetailHtml() {
  if (glv.err) return `<div class="osacts"><button data-glv-back>← Retour</button></div><p class="s-blocked">${esc(glv.err)}</p>`;
  const d = glv.detail; if (!d) return `<div class="osacts"><button data-glv-back>← Retour</button></div><p class="muted">Chargement de la merge request…</p>`;
  const unresolved = d.threads.filter(t => t.resolvable && !t.resolved).length, failed = d.jobs.filter(j => j.status === "failed" && !j.allowFailure);
  const subs = [["overview", "Aperçu", ""], ["threads", "Discussions", d.threads.filter(t => !t.system).length], ["pipeline", "Pipeline", d.pipeline ? ciIcon(d.pipeline.status) : ""], ["files", "Fichiers", d.files.length]];
  const state = d.state === "merged" ? '<span class="glstate merged">Fusionnée</span>' : d.state === "closed" ? '<span class="glstate closed">Fermée</span>' : d.draft ? '<span class="glstate draft">Brouillon</span>' : '<span class="glstate open">Ouverte</span>';
  return `<div class="osacts"><button data-glv-back>← Merge requests</button><span class="muted">${esc(d.ref)}</span></div>
    <div class="glhead"><h2>${esc(d.title)}</h2><div class="glsub">${state} ${avatar(d.author, 20)} <b>${esc(d.author.name || d.author.username)}</b> veut fusionner <code>${esc(d.source)}</code> dans <code>${esc(d.target)}</code></div>
      <div class="osacts"><a class="glbtn" href="${esc(d.webUrl)}" target="_blank" rel="noopener">Ouvrir dans GitLab ↗</a><button data-glv-act="review">🔍 Lancer une review</button>${unresolved ? `<button data-glv-act="comments" class="ubok">💬 ${unresolved > 1 ? `Traiter les ${unresolved} retours` : "Traiter le retour"}</button>` : ""}${failed.length ? `<button data-glv-act="fixci" class="ubok">🔁 Corriger la CI</button>` : ""}</div></div>
    ${glvChecks(d)}
    <nav class="gltabs">${subs.map(([id, l, n]) => `<button data-glv-sub="${id}" class="${glv.sub === id ? "on" : ""}">${l} ${n !== "" ? `<span class="glcount">${n}</span>` : ""}</button>`).join("")}</nav>
    <div class="glpane">${glv.sub === "threads" ? glvThreads(d) : glv.sub === "pipeline" ? glvPipeline(d) : glv.sub === "files" ? glvFiles(d) : glvOverview(d)}</div>`;
}
function gitlabAppHtml() { return `<div class="glapp">${glv.open ? glvDetailHtml() : glvListHtml()}</div>`; }

/* ---------- events ---------- */
const osEl = document.getElementById("chiefos");
osEl.addEventListener("input", ev => { if (ev.target.classList.contains("glsearch")) { glv.q = ev.target.value; const pos = ev.target.selectionStart; renderChiefOs(); const s = osEl.querySelector(".glsearch"); s.focus(); s.setSelectionRange(pos, pos); } });
osEl.addEventListener("change", ev => { if (ev.target.matches("[data-glv-unresolved]")) { glv.unresolvedOnly = ev.target.checked; renderChiefOs(); } });
osEl.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-glv-tab], [data-glv-open], [data-glv-back], [data-glv-sub], [data-glv-file], [data-glv-job], [data-glv-act]"); if (!b) return;
  if (b.dataset.glvTab) { glv.tab = b.dataset.glvTab; return renderChiefOs(); }
  if (b.dataset.glvOpen) { const [p, i] = b.dataset.glvOpen.split(":").map(Number); return glvOpen(p, i); }
  if (b.hasAttribute("data-glv-back")) { glv.open = null; glv.detail = null; return renderChiefOs(); }
  if (b.dataset.glvSub) { glv.sub = b.dataset.glvSub; return renderChiefOs(); }
  if (b.dataset.glvFile) { const i = +b.dataset.glvFile; glv.files.has(i) ? glv.files.delete(i) : glv.files.add(i); return renderChiefOs(); }
  const d = glv.detail;
  if (b.dataset.glvJob) return glvJob(d.jobs.find(j => j.id === +b.dataset.glvJob));
  const act = b.dataset.glvAct;
  if (act === "allfiles") { glv.files = glv.files.size ? new Set() : new Set(d.files.map((_, i) => i)); return renderChiefOs(); }
  if (act === "review") return launchWith("mr-reviewer", `Review la MR ${d.ref} (${d.webUrl}) : « ${d.title} », ${d.source} → ${d.target}.`);
  if (act === "comments") {
    const items = d.threads.filter(t => t.resolvable && !t.resolved).map(t => `- ${t.file ? `${t.file}${t.line ? `:${t.line}` : ""}` : "général"} — @${t.notes[0].author.username} : ${t.notes.map(n => n.body.replace(/\s+/g, " ")).join(" / ")}`);
    return launchWith("feature-builder", `Traite les retours de review de la MR ${d.ref} (${d.webUrl}) sur la branche ${d.source} :\n${items.join("\n")}\n\nCorrige chaque point, réponds dans la discussion si un point n'est pas à appliquer, et pousse sur ${d.source}.`);
  }
  if (act === "fixci" || act === "fixjob") {
    const job = act === "fixjob" ? glv.job : d.jobs.find(j => j.status === "failed" && !j.allowFailure);
    let log = act === "fixjob" ? glv.job.log : "";
    if (!log) { try { log = DEMO ? "AssertionError: assert 90.0 == 85.0" : (await glGet(`job?project=${d.project}&job=${job.id}`)).log; } catch (_) { log = ""; } }
    return launchWith("feature-builder", `La CI de la MR ${d.ref} (${d.webUrl}) est rouge : job « ${job.name} » (stage ${job.stage}).\n\nFin du log :\n${String(log).split("\n").slice(-30).join("\n")}\n\nTrouve la cause, corrige-la sur la branche ${d.source} et pousse la correction.`);
  }
});
