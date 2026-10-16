// ChiefOS → 🧠 MMX: the memory explored (modules, search, priority, an entry in detail) and the pending proposals
// to validate (mmx.py approve + apply, /api/mmx/validate).

import { clip, mmx } from "../core/core.js";
import { esc } from "../core/data.js";
import { pollMmx } from "../agents/mmx.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

const mx = { q: "", mod: "", p: 0, sel: null, msg: "", busy: false };
function mmxAppHtml() {
  if (!mmx) return `<p class="muted">Lecture de MMX…</p>`;
  if (mmx.disabled) return `<div class="osrow"><b>🧠 MMX</b><span class="muted">Mémoire MMX non configurée (clé « mmx » de ~/.claude/agent-office.json).</span></div>`;
  const q = mx.q.toLowerCase(), all = mmx.modules.flatMap(m => m.entries.map(e => ({ ...e, mod: m.id, modLabel: m.label })));
  const list = all.filter(e => (!mx.mod || e.mod === mx.mod) && (!mx.p || e.p >= mx.p) && (!q || `${e.id} ${e.d} ${(e.tags || []).join(" ")}`.toLowerCase().includes(q)))
    .sort((a, b) => (b.p || 0) - (a.p || 0) || String(b.updated || "").localeCompare(String(a.updated || "")));
  const e = all.find(x => x.id === mx.sel);
  return `<div class="mxapp"><div class="glbar"><span class="gllogo">🧠</span><b>MMX</b><span class="muted">${all.length} fiches · ${mmx.pending.length} proposition(s)</span>
      <input class="glsearch mxsearch" placeholder="Rechercher (texte, id, tag)…" value="${esc(mx.q)}" aria-label="Rechercher"></div>
    <nav class="gltabs">${[["", "Tout", all.length], ...mmx.modules.map(m => [m.id, m.label, m.entries.length])].map(([id, l, n]) => `<button data-mx-mod="${id}" class="${mx.mod === id ? "on" : ""}">${esc(l)} <span class="glcount">${n}</span></button>`).join("")}</nav>
    <div class="osacts"><span class="muted">Priorité min.</span>${[0, 3, 4, 5].map(p => `<button data-mx-p="${p}" class="${mx.p === p ? "ubok" : ""}">${p ? `p${p}+` : "toutes"}</button>`).join("")}</div>
    ${mmx.pending.length ? `<h4>PROPOSITIONS EN ATTENTE</h4>${mmx.pending.map(p => `<div class="osrow"><b>${esc(p.op || "?")} ${esc(p.target || p.id)}</b><span>${esc(clip(p.d || p.reason || "", 160))}</span><button data-mx-ok="${esc(p.id)}"${mx.busy ? " disabled" : ""}>Valider</button></div>`).join("")}
      <div class="osacts"><button data-mx-ok="__all" class="ubok"${mx.busy ? " disabled" : ""}>Tout valider</button><span class="muted">${esc(mx.msg)}</span></div>` : ""}
    <div class="mxgrid"><div class="gllist">${list.map(x => `<button class="glmr" data-mx-sel="${esc(x.id)}"><span class="mxp p${x.p || 0}">p${x.p ?? "?"}</span><span class="glmain"><b>${esc(x.id)} <small class="muted">${esc(x.t || "")}</small></b><small>${esc(clip(x.d || "", 140))}</small>
        <span class="gllabels">${(x.tags || []).slice(0, 6).map(t => `<span class="gllabel" style="--lc:#5e5c64">${esc(t)}</span>`).join("")}</span></span><span class="glmeta">${esc(x.updated || "")}</span></button>`).join("") || `<p class="muted glempty">Rien trouvé.</p>`}</div>
      ${e ? `<aside class="mxside"><b>${esc(e.id)}</b><span class="muted">${esc(e.modLabel)} · ${esc(e.t || "")} · ${esc(e.st || "")}</span><p>${esc(e.d || "")}</p>
        <div><small>PRIORITÉ</small> p${e.p ?? "?"} · <small>CONFIANCE</small> ${Math.round((e.c || 0) * 100)} % · <small>SOURCE</small> ${esc(e.s || "")}</div>
        <div class="gllabels">${(e.tags || []).map(t => `<span class="gllabel" style="--lc:#5e5c64">${esc(t)}</span>`).join("")}</div>
        ${(e.r || []).length ? `<div><small>LIENS</small> ${e.r.map(r => `<button data-mx-sel="${esc(r.id || r)}">${esc(r.id || r)}</button>`).join(" ")}</div>` : ""}
        <div class="muted">créée ${esc(e.created || "?")} · modifiée ${esc(e.updated || "?")}</div></aside>` : ""}</div></div>`;
}
async function mmxValidate(ids) {
  if (DEMO) { mx.msg = "Démo : rien n'est validé."; return renderChiefOs(); }
  mx.busy = true; renderChiefOs();
  try {
    const res = await fetch("/api/mmx/validate", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ ids }) });
    const out = await res.json(); mx.msg = out.ok ? "✓ Validé et appliqué." : `✗ ${out.output || out.error}`; pollMmx();
  } catch (err) { mx.msg = `✗ ${err.message}`; }
  mx.busy = false; setTimeout(renderChiefOs, 800);
}

class MmxApp extends OsApp {
  constructor() { super("mmx", "🧠", "MMX", "#813d9c"); }
  render() { return mmxAppHtml(); }
  input(ev) { if (ev.target.classList.contains("mxsearch")) { mx.q = ev.target.value; this.refreshKeeping(".mxsearch"); } }
  click(b) {
    if (b.dataset.mxMod !== undefined) mx.mod = b.dataset.mxMod;
    else if (b.dataset.mxP !== undefined) mx.p = +b.dataset.mxP;
    else if (b.dataset.mxSel) mx.sel = b.dataset.mxSel;
    else if (b.dataset.mxOk) { mmxValidate(b.dataset.mxOk === "__all" ? mmx.pending.map(p => p.id) : [b.dataset.mxOk]); return true; }
    else return false;
    renderChiefOs();
    return true;
  }
}
new MmxApp();
