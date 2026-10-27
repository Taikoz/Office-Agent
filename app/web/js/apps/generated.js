// ChiefOS → the generated apps (office/apps.py): made in ⚙️ Réglages → 🔌 Intégrations from a connector's view (MR à
// relire, Pipelines rouges, Erreurs du jour, Fil du channel…), one generic window for all of them. Its rows come from
// /api/apps/data, which runs the view's declared read on the server: the page never names the operation. A lost
// connection shows why and a way to reconnect; the app stays installed. Ids: gen-<id>, shown in the simple mode too.

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs, setOsApp } from "../ui/chiefos.js";

const REFRESH = 120_000;
export const genApps = { list: [], loaded: false, error: "" };
const cache = {};  // app id → { state, rows, detail, connection, at, busy, error }
export const genCall = async (path, body) => {
  const res = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }
    : { headers: { "X-Office-Token": TOKEN } });
  const out = await res.json().catch(() => ({}));
  if (res.status === 403 && out.error === "interdit") throw new Error("page périmée : recharge-la (Ctrl+Maj+R)");
  if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
  return out;
};

// the records, and one OsApp per record (removed when its record is gone)
export async function loadApps() {
  try {
    const d = await genCall("/api/apps");
    genApps.list = d.apps; genApps.loaded = true; genApps.error = "";
  } catch (e) { genApps.error = e.message; return renderChiefOs(); }
  const ids = new Set(genApps.list.map(a => `gen-${a.id}`));
  for (const [id, app] of OsApp.all) if (app instanceof GeneratedApp && !ids.has(id)) { OsApp.all.delete(id); OsApp.SIMPLE.delete(id); }
  for (const rec of genApps.list) {
    const app = OsApp.get(`gen-${rec.id}`) || new GeneratedApp(rec);
    Object.assign(app, { rec, icon: rec.icon, label: rec.name, hidden: rec.state === "disabled" });
    OsApp.SIMPLE.add(app.id);
  }
  renderChiefOs();
}
// create, update (rename, enable, disable) or delete a record, then read them all again
export async function appAction(body) {
  const out = await genCall("/api/apps", body);
  if (body.action !== "create") delete cache[body.id];
  await loadApps();
  return out;
}
export const openGenerated = id => { setOsApp(`gen-${id}`); renderChiefOs(); };

async function loadRows(id) {
  const c = cache[id] ||= { rows: [], at: 0 };
  if (c.busy) return;
  c.busy = true;
  try { Object.assign(c, await genCall(`/api/apps/data?id=${encodeURIComponent(id)}`), { error: "" }); } catch (e) { c.error = e.message; }
  c.at = Date.now(); c.busy = false; renderChiefOs();
}

const ago = v => {
  const t = typeof v === "number" ? v * 1000 : Date.parse(v); if (!t) return esc(String(v || ""));
  const s = (Date.now() - t) / 1000;
  return s < 3600 ? `il y a ${Math.max(1, Math.round(s / 60))} min` : s < 86400 ? `il y a ${Math.round(s / 3600)} h` : `il y a ${Math.round(s / 86400)} j`;
};
const LEVEL = { failed: "bad", fatal: "bad", error: "bad", success: "ok", warning: "warn", running: "run", pending: "run", manual: "warn", info: "off" };
const cell = (kind, v) => kind === "date" ? ago(v) : kind === "level" ? (v ? `<span class="cvchip ${LEVEL[v] || "off"}">${esc(String(v))}</span>` : "—")
  : kind === "num" ? esc(String(v ?? "")) : esc(String(v ?? ""));

class GeneratedApp extends OsApp {
  constructor(rec) { super(`gen-${rec.id}`, rec.icon, rec.name, "#3e8ed0"); this.rec = rec; }
  render() {
    const rec = this.rec, t = rec.template, c = cache[rec.id];
    const head = `<div class="cvbar"><span class="muted">${esc(rec.providerIcon || "")} ${esc(rec.provider || rec.connector)} · ${esc(t?.label || rec.view)}${c?.at ? ` · à jour ${ago(c.at / 1000)}` : ""}</span>
      <span><button data-ga-reload="${rec.id}"${c?.busy ? " disabled" : ""}>${c?.busy ? "Lecture…" : "↻ Actualiser"}</button> <button data-os-app="settings" data-os-section="links" title="Renommer, désactiver ou supprimer dans 🔌 Intégrations">⚙️ Gérer</button></span></div>`;
    if (rec.state === "broken") return `${head}<div class="oserror" role="alert"><b>Ce modèle d'application n'existe plus</b><span>${esc(rec.detail)}</span><small>Supprime l'application dans Réglages → Intégrations.</small></div>`;
    if (!c || (!c.busy && Date.now() - c.at > REFRESH)) loadRows(rec.id);
    if (!c || (c.busy && !c.at)) return `${head}<p class="muted osloading" role="status">Lecture de ${esc(rec.provider || "")}…</p>`;
    if (c.error) return `${head}<div class="oserror" role="alert"><b>Lecture impossible</b><span>${esc(c.error)}</span><div class="osacts"><button data-ga-reload="${rec.id}">↻ Réessayer</button></div></div>`;
    if (c.state === "connection" || rec.state === "connection") {
      return `${head}<div class="oserror" role="alert"><b>${esc(rec.provider)} ne répond plus pour cette application</b><span>${esc(c.detail || rec.detail || "connexion perdue")}</span>
        <small>L'application est conservée : reconnecte ${esc(rec.provider)} et elle reprend seule.</small><div class="osacts"><button class="primary" data-os-app="settings" data-os-section="links">Reconnecter</button></div></div>`;
    }
    if (!c.rows.length) return `${head}<div class="cvclear">✓ Rien à afficher pour l'instant.</div>`;
    const cols = t.columns, link = rec.link;
    return `${head}<div class="gawrap"><table class="gatable"><thead><tr>${cols.map(k => `<th${k.kind === "num" ? ' class="n"' : ""}>${esc(k.label)}</th>`).join("")}</tr></thead>
      <tbody>${c.rows.map(r => `<tr>${cols.map((k, i) => `<td${k.kind === "num" ? ' class="n"' : ""}>${i === 0 && link && r[link] ? `<a href="${esc(r[link])}" target="_blank" rel="noopener noreferrer">${cell(k.kind, r[k.key])}</a>` : cell(k.kind, r[k.key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="muted">${c.rows.length} ligne${c.rows.length > 1 ? "s" : ""} · lecture seule, par la connexion ${esc(rec.provider)} de 🔌 Intégrations.</p>`;
  }
  badge() { return 0; }
}
document.addEventListener("click", ev => {
  const b = ev.target.closest?.("[data-ga-reload]"); if (!b) return;
  delete cache[b.dataset.gaReload]; loadRows(b.dataset.gaReload);
});
// a connection changed in 🔌 Intégrations: the apps read their state and rows again
window.addEventListener("office:integration", () => { for (const k of Object.keys(cache)) delete cache[k]; loadApps(); });
setTimeout(() => { if (typeof DEMO === "undefined" || !DEMO) loadApps(); }, 2000);
