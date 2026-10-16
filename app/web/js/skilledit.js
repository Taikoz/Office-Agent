"use strict";
// ChiefOS → 📝 Skills & agents: the skills, agents and slash commands already in ~/.claude and in the projects' .claude
// (office/claudefiles.py). Grouped by place, searchable; edit (Ctrl+S; a file changed on disk meanwhile is not
// overwritten silently), preview, duplicate under a new name, move to the trash, or reopen as a Blueprint.

const se = { files: null, err: "", sel: null, doc: null, dirty: false, q: "", kind: "", preview: false, msg: "", dup: false, armed: 0 };
const seHdr = () => ({ "X-Office-Token": TOKEN });
async function seLoad() {
  try { const r = await fetch("/api/claudefiles", { headers: seHdr() }); const out = await r.json(); if (!r.ok) throw new Error(out.error); se.files = out.files; se.err = ""; }
  catch (err) { se.files = []; se.err = err.message; }
  seRender();
}
async function seOpen(path) {
  if (se.dirty && performance.now() > se.armed) { se.armed = performance.now() + 4000; se.msg = "Modifications non enregistrées : reclique pour les abandonner."; return seRender(); }
  se.sel = path; se.doc = null; se.dirty = false; se.msg = ""; se.dup = false; seRender();
  try { const r = await fetch(`/api/claudefile?path=${encodeURIComponent(path)}`, { headers: seHdr() }); const out = await r.json(); if (!r.ok) throw new Error(out.error); se.doc = out; }
  catch (err) { se.msg = `✗ ${err.message}`; }
  seRender();
}
async function sePost(body) {
  if (DEMO) throw new Error("Démo : rien n'est modifié.");
  const r = await fetch("/api/claudefile", { method: "POST", headers: { ...seHdr(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(out.error || `HTTP ${r.status}`); e.changed = out.changed; throw e; }
  return out;
}
async function seSave(force = false) {
  const ta = osBox.querySelector(".setext"); if (!ta || !se.doc) return;
  try {
    const out = await sePost({ path: se.doc.path, content: ta.value, mtime: se.doc.mtime, force });
    se.doc = { ...se.doc, content: ta.value, mtime: out.mtime }; se.dirty = false; se.msg = "✓ Enregistré (l'ancienne version est gardée dans ~/.claude/agent-office/backups)";
    seLoad();
  } catch (err) {
    se.msg = err.changed ? "⚠️ Le fichier a changé sur le disque depuis son ouverture. « Écraser quand même » ou recharge-le." : `✗ ${err.message}`;
    se.conflict = !!err.changed; seRender();
  }
}
const seKinds = { skill: ["🧠", "Skill"], agent: ["🤖", "Agent"], command: ["⌨️", "Commande"] };
function seListHtml() {
  if (!se.files) { seLoad(); return `<p class="muted">Recherche dans tes .claude…</p>`; }
  const q = se.q.toLowerCase(), list = se.files.filter(f => (!se.kind || f.kind === se.kind) && (!q || `${f.name} ${f.description} ${f.scope}`.toLowerCase().includes(q)));
  const groups = [...new Set(list.map(f => f.scope))];
  return `<div class="seside"><input class="sesearch" placeholder="Rechercher…" value="${esc(se.q)}" aria-label="Rechercher">
    <div class="sekinds">${[["", "Tout"], ["skill", "Skills"], ["agent", "Agents"], ["command", "Commandes"]].map(([k, l]) => `<button data-se-kind="${k}" class="${se.kind === k ? "on" : ""}">${l}</button>`).join("")}</div>
    ${se.err ? `<p class="s-blocked">${esc(se.err)}</p>` : ""}
    <div class="selist">${groups.map(g => `<h4>${esc(g)}</h4>${list.filter(f => f.scope === g).map(f => `<button data-se-open="${esc(f.path)}" class="${se.sel === f.path ? "on" : ""}" title="${esc(f.path)}"><span>${seKinds[f.kind][0]} ${esc(f.name)}${f.link ? " 🔗" : ""}</span><small>${esc(clip(f.description, 90))}</small></button>`).join("")}`).join("") || `<p class="muted">Rien trouvé.</p>`}</div>
    <p class="muted sefoot">${se.files.length} fichier(s) · <button data-se="reload">↻</button></p></div>`;
}
function seDocHtml() {
  if (!se.sel) return `<div class="seempty"><div class="brbig">📝</div><p>Choisis un skill, un agent ou une commande.</p><p class="muted">Ceux de ~/.claude et des .claude de tes projets récents. 🧩 Blueprints sert à en créer de nouveaux.</p></div>`;
  if (!se.doc) return `<p class="muted">${esc(se.msg || "Ouverture…")}</p>`;
  const f = se.files?.find(x => x.path === se.doc.path) || {}, rel = se.doc.path.replace(/^.*?\/\.claude\//, ".claude/");
  return `<div class="sehead"><b>${seKinds[f.kind || "skill"][0]} ${esc(f.name || "")}</b><code>${esc(rel)}</code><span class="muted">${esc(f.scope || "")}</span></div>
    <div class="osacts"><button data-se="save" class="ubok"${se.dirty ? "" : " disabled"}>💾 Enregistrer</button>${se.conflict ? `<button data-se="force">Écraser quand même</button>` : ""}
      <button data-se="preview">${se.preview ? "✏️ Éditer" : "👁 Aperçu"}</button><button data-se="dup">⧉ Dupliquer</button>${f.kind !== "command" ? `<button data-se="blueprint">🧩 Ouvrir en Blueprint</button>` : ""}<button data-se="trash">🗑 Corbeille</button>
      <span class="muted">${esc(se.msg)}</span></div>
    ${se.dup ? `<div class="osrow"><b>Nouveau nom</b><span><input class="sedupname" value="${esc((f.name || "copie") + "-copie")}" spellcheck="false"></span><button data-se="dodup" class="ubok">Créer la copie</button></div>` : ""}
    ${se.preview ? `<div class="gldesc sepreview">${mdLite(se.doc.content.replace(/^---[\s\S]*?\n---\n?/, m => "```\n" + m + "```\n"))}</div>` : `<textarea class="setext" spellcheck="false">${esc(se.doc.content)}</textarea>`}`;
}
function skillsAppHtml() { return `<div class="seapp">${seListHtml()}<div class="semain">${seDocHtml()}</div></div>`; }
function seRender() { const app = osBox.querySelector(".seapp"); if (app && osApp === "skills") { const ta = app.querySelector(".setext"), val = ta?.value; app.outerHTML = skillsAppHtml(); if (val != null && se.dirty) { const t2 = osBox.querySelector(".setext"); if (t2) t2.value = val; } } }
// the Markdown back into a Blueprint: frontmatter, "Quand l'utiliser", inputs, numbered steps, rules (best effort)
function mdToBlueprint(md, kind) {
  const meta = {}, fm = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fm) for (const l of fm[1].split("\n")) { const [k, ...v] = l.split(":"); if (k && v.length) meta[k.trim()] = v.join(":").trim(); }
  const b = newBp(kind === "agent" ? "agent" : "skill"), start = b.nodes[0];
  b.name = (meta.name || "importe").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 64); b.description = meta.description || "";
  if (kind === "agent") { b.settings.model = meta.model || "inherit"; b.settings.color = meta.color || "blue"; b.settings.tools = (meta.tools || "").split(",").map(s => s.trim()).filter(t => AGENT_TOOLS.includes(t)); }
  const section = name => { const m = md.match(new RegExp(`^##\\s+${name}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "mi")); return m ? m[1].trim() : ""; };
  start.props.when = section("Quand l'utiliser").split("\n")[0] || "";
  let prev = start, x = 340;
  const add = (type, props) => { const n = { id: nid(), type, x, y: 120, props }; b.nodes.push(n); b.links.push({ from: prev.id, port: "out", to: n.id }); prev = n; x += 280; };
  for (const l of section("Entrées").split("\n")) { const m = l.match(/^\s*-\s*`?([\w-]+)`?\s*(?:—|-|:)?\s*(.*)$/); if (m) add("input", { name: m[1], desc: m[2].replace(/\((obligatoire|optionnel)\)/, "").trim(), required: /optionnel/.test(m[2]) ? "non" : "oui" }); }
  const body = section("Étapes") || md.replace(/^---[\s\S]*?\n---/, "");
  for (const l of body.split("\n")) { const m = l.match(/^\s*(?:\d+[.)]|[-*])\s+(.+)$/); if (m && !/^Si |^Sinon/.test(m[1])) add("step", { text: m[1].trim() }); }
  let ry = 300; for (const l of section("Règles").split("\n")) { const m = l.match(/^\s*-\s+(.+)$/); if (m) { b.nodes.push({ id: nid(), type: "rule", x: 340, y: ry, props: { text: m[1] } }); ry += 120; } }
  return b;
}
osBox.addEventListener("input", ev => {
  if (ev.target.classList?.contains("setext")) { if (!se.dirty) { se.dirty = true; se.msg = "modifié"; const b = osBox.querySelector('[data-se="save"]'); if (b) b.disabled = false; osBox.querySelector(".semain .osacts .muted").textContent = "modifié"; } }
  if (ev.target.classList?.contains("sesearch")) { se.q = ev.target.value; const pos = ev.target.selectionStart; seRender(); const s = osBox.querySelector(".sesearch"); s.focus(); s.setSelectionRange(pos, pos); }
});
osBox.addEventListener("keydown", ev => { if (ev.target.classList?.contains("setext") && (ev.ctrlKey || ev.metaKey) && ev.key === "s") { ev.preventDefault(); seSave(); } });
osBox.addEventListener("click", async ev => {
  if (!ev.target.closest?.(".seapp")) return;
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.seOpen) return seOpen(b.dataset.seOpen);
  if (b.dataset.seKind !== undefined) { se.kind = b.dataset.seKind; return seRender(); }
  const a = b.dataset.se, f = se.files?.find(x => x.path === se.doc?.path);
  if (a === "reload") { se.files = null; return seRender(); }
  if (a === "save") return seSave(); if (a === "force") { se.conflict = false; return seSave(true); }
  if (a === "preview") { const ta = osBox.querySelector(".setext"); if (ta && se.dirty) se.doc.content = ta.value; se.preview = !se.preview; return seRender(); }
  if (a === "dup") { se.dup = !se.dup; return seRender(); }
  if (a === "dodup") {
    const name = osBox.querySelector(".sedupname").value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = f.kind === "skill" ? se.doc.path.replace(/\/skills\/[^/]+\/SKILL\.md$/, `/skills/${name}/SKILL.md`) : se.doc.path.replace(/\/[^/]+\.md$/, `/${name}.md`);
    const content = (osBox.querySelector(".setext")?.value ?? se.doc.content).replace(/^(name:\s*).*$/m, `$1${name}`);
    try { await sePost({ path, content }); se.files = null; se.dup = false; await seLoad(); return seOpen(path); } catch (err) { se.msg = `✗ ${err.message}`; return seRender(); }
  }
  if (a === "trash") {
    if (performance.now() > se.armed) { se.armed = performance.now() + 4000; se.msg = "Reclique sur 🗑 pour mettre à la corbeille (~/.claude/agent-office/trash)."; return seRender(); }
    try { await sePost({ action: "delete", path: se.doc.path }); se.sel = null; se.doc = null; se.files = null; se.msg = ""; return seRender(); } catch (err) { se.msg = `✗ ${err.message}`; return seRender(); }
  }
  if (a === "blueprint") { bp = mdToBlueprint(osBox.querySelector(".setext")?.value ?? se.doc.content, f.kind); bpSel = null; persistBp(); osApp = "blueprint"; renderChiefOs(); setTimeout(fitBp, 50); toast("BLUEPRINT", `« ${bp.name} » importé`, "Les étapes sont devenues des blocs « Étape libre » : relie, complète, puis publie."); }
});
