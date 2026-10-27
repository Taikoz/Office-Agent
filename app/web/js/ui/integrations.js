// ChiefOS → ⚙️ Réglages → 🔌 Intégrations: every external service in one place, built from the server's catalogue
// (office/integrations.py). A service shows its state (connected, token refused, expired, insufficient rights,
// unreachable…), who or where it is connected as, what it can do per domain, the apps that use it, and its form —
// generated from the fields the connector declares (an address, a token, an organisation, a channel…). A secret is
// never shown back: its field stays empty and keeps the saved one. After a change, the event "office:integration"
// tells the apps of that service to read their status again (ui/gitlab.js, apps/errors.js, apps/support.js).

import { esc } from "../core/data.js";
import { OsApp } from "../apps/base.js";
import { renderChiefOs } from "./chiefos.js";
import { toast } from "../sims/progress.js";

export const intg = { cat: null, conns: {}, error: "", open: null, busy: "", msg: {}, confirm: "" };
const call = async (path, body) => {
  const res = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }
    : { headers: { "X-Office-Token": TOKEN } });
  const out = await res.json().catch(() => ({}));
  if (res.status === 403 && out.error === "interdit") throw new Error("page périmée : recharge-la (Ctrl+Maj+R)");
  if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
  return out;
};
export async function loadIntegrations() {
  try {
    const d = await call("/api/integrations");
    intg.cat = d; intg.conns = Object.fromEntries(d.connections.map(c => [c.id, c])); intg.error = "";
  } catch (e) { intg.error = e.message; }
  renderChiefOs();
}
// a connection that needs the user: refused, expired, insufficient, unreachable, misconfigured
export const integrationsBroken = () => Object.values(intg.conns).some(c => !["connected", "not_configured"].includes(c.state));

const CHIP = { connected: "ok", not_configured: "off", expired: "warn", insufficient: "warn", unreachable: "warn", invalid: "bad", error: "bad" };
const appName = id => { const a = OsApp.get(id); return a ? `${a.icon} ${a.label}` : id; };

function formHtml(c, conn) {
  const method = c.auth[0], st = intg.msg[c.id] || "", busy = intg.busy === c.id, saved = conn.settings || {};
  const base = (document.getElementById(`ih-${c.id}-url`)?.value || saved.url || "").replace(/\/$/, "");
  const create = method.createUrl.includes("{url}") ? (base ? method.createUrl.replace("{url}", base) : "") : method.createUrl;
  const field = f => {
    const id = `ih-${c.id}-${f.key}`, connected = conn.state !== "not_configured";
    const input = f.kind === "secret"
      ? `<input id="${id}" type="password" autocomplete="off" placeholder="${connected ? "•••••• enregistré (laisser vide pour le garder)" : esc(f.placeholder)}" aria-label="${esc(f.label)}">`
      : `<input id="${id}" value="${esc(saved[f.key] || "")}" placeholder="${esc(f.placeholder)}" aria-label="${esc(f.label)}">`;
    return `<div class="osrow"><b>${esc(f.label)}${f.required ? " *" : ""}</b><span>${input}${f.help ? `<small class="muted">${esc(f.help)}</small>` : ""}</span>
      <span>${f.kind === "secret" && create ? `<a href="${esc(create)}" target="_blank" rel="noopener">Créer un jeton ↗</a>` : ""}</span></div>`;
  };
  return `<div class="ihform">${method.fields.map(field).join("")}
    ${method.scopes.length ? `<p class="muted">${esc(method.label)} · droits nécessaires : ${method.scopes.map(s => `<b>${esc(s)}</b>`).join(", ")} (lecture seule).</p>` : ""}
    <div class="osacts"><button class="ubok" data-ih-save="${c.id}"${busy ? " disabled" : ""}>${busy ? "Vérification…" : "Enregistrer et tester"}</button><button data-ih-open="">Fermer</button><span class="muted" role="status">${esc(st)}</span></div>
    <p class="muted">Le jeton reste sur cette machine, chiffré : la page ne le revoit jamais et il n'est pas dans la sauvegarde. Le serveur interroge ${esc(c.name)} lui-même et n'y écrit jamais.</p></div>`;
}

function cardHtml(c) {
  const conn = intg.conns[c.id] || { state: "not_configured", detail: "non relié", apps: c.apps }, busy = intg.busy === c.id, linked = conn.state !== "not_configured";
  const domains = c.capabilities.map(k => `<span class="cvchip off" title="${esc(intg.cat.domains[k.domain] || k.domain)}">${esc(k.label)}</span>`).join("");
  const apps = (conn.apps || []).filter(id => OsApp.get(id)).map(id => `<button class="ihapp" data-os-app="${id}">${esc(appName(id))}</button>`).join("");
  const why = linked && conn.state !== "connected" ? `<div class="oserror" role="alert"><b>${esc(intg.cat.states[conn.state] || conn.state)}</b><span>${esc(conn.detail)}</span>
      <small>${conn.state === "unreachable" ? "Vérifie l'adresse et ton réseau (VPN ?), puis Vérifier." : "Crée un nouveau jeton et enregistre-le : les applications reprennent seules."}</small></div>` : "";
  return `<section class="ihcard ${CHIP[conn.state] || "off"}" aria-label="${esc(c.name)}">
    <div class="ihhead"><span class="ihic" aria-hidden="true">${c.icon}</span><span class="ihtt"><b>${esc(c.name)}</b><small>${esc(linked ? conn.account || c.description : c.description)}</small></span>
      <span class="cvchip ${CHIP[conn.state] || "off"}">● ${esc(intg.cat.states[conn.state] || conn.state)}</span></div>
    ${why}
    <div class="ihcaps">${domains}</div>
    ${apps ? `<div class="ihapps"><span class="muted">Utilisé par</span>${apps}</div>` : ""}
    ${conn.expires ? `<p class="muted">Jeton valable jusqu'au ${esc(new Date(conn.expires).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }))}${conn.scopes?.length ? ` · droits ${esc(conn.scopes.join(", "))}` : ""}</p>` : ""}
    <div class="osacts">${intg.open === c.id ? "" : `<button class="${linked ? "" : "primary"}" data-ih-open="${c.id}">${linked ? "Modifier" : "Connecter"}</button>`}
      ${linked ? `<button data-ih-check="${c.id}"${busy ? " disabled" : ""}>${busy ? "Vérification…" : "Vérifier"}</button>
      <button data-ih-forget="${c.id}">${intg.confirm === c.id ? "Confirmer la déconnexion" : "Déconnecter"}</button>` : ""}
      ${intg.open === c.id ? "" : `<span class="muted" role="status">${esc(intg.msg[c.id] || "")}</span>`}</div>
    ${intg.open === c.id ? formHtml(c, conn) : ""}</section>`;
}

export function integrationsHtml() {
  if (!intg.cat && !intg.error) { loadIntegrations(); return `<p class="muted osloading" role="status">Chargement…</p>`; }
  if (intg.error) return `<div class="oserror" role="alert"><b>Le catalogue des intégrations ne répond pas</b><span>${esc(intg.error)}</span><div class="osacts"><button data-ih-reload>↻ Réessayer</button></div></div>`;
  const all = intg.cat.connectors, linked = all.filter(c => intg.conns[c.id]?.state !== "not_configured"), free = all.filter(c => !linked.includes(c));
  return `${linked.length ? `<h4>CONNECTÉS · ${linked.length}</h4>${linked.map(cardHtml).join("")}` : ""}
    ${free.length ? `<h4>DISPONIBLES · ${free.length}</h4>${free.map(cardHtml).join("")}` : ""}
    <p class="muted">Chaque service est en lecture seule : Agent Office ne fait que les lectures que son connecteur déclare. Un service déconnecté ou dont le jeton a expiré ne supprime aucune application : elles attendent qu'il soit reconnecté.</p>`;
}

const changed = id => window.dispatchEvent(new CustomEvent("office:integration", { detail: id }));
async function act(id, fn) {
  intg.busy = id; intg.msg[id] = ""; renderChiefOs();
  try { intg.msg[id] = await fn(); } catch (e) { intg.msg[id] = `⚠️ ${e.message}`; }
  intg.busy = ""; await loadIntegrations();
}
OsApp.listen("settings", "click", ev => {
  const b = ev.target.closest("[data-ih-open], [data-ih-save], [data-ih-check], [data-ih-forget], [data-ih-reload]"); if (!b) return;
  if (b.hasAttribute("data-ih-reload")) { intg.error = ""; intg.cat = null; return loadIntegrations(); }
  if (b.hasAttribute("data-ih-open")) { intg.open = b.dataset.ihOpen || null; intg.confirm = ""; return renderChiefOs(); }
  if (b.dataset.ihCheck) {
    const id = b.dataset.ihCheck;
    return act(id, async () => { const c = await call(`/api/integrations/check?id=${encodeURIComponent(id)}`); return c.state === "connected" ? "✅ La connexion répond." : `⚠️ ${c.detail}`; });
  }
  if (b.dataset.ihForget) {
    const id = b.dataset.ihForget;
    if (intg.confirm !== id) { intg.confirm = id; return renderChiefOs(); }
    intg.confirm = "";
    if (DEMO) { intg.msg[id] = "Démo : rien n'est modifié."; return renderChiefOs(); }
    return act(id, async () => { await call("/api/integrations/config", { id, forget: true }); changed(id); return "Déconnecté : le jeton est effacé de cette machine."; });
  }
  if (b.dataset.ihSave) {
    const id = b.dataset.ihSave, c = intg.cat.connectors.find(x => x.id === id);
    // read the fields before the "Vérification…" re-render empties them
    const values = Object.fromEntries(c.auth[0].fields.map(f => [f.key, document.getElementById(`ih-${id}-${f.key}`)?.value || ""]));
    if (DEMO) { intg.msg[id] = "Démo : rien n'est enregistré."; return renderChiefOs(); }
    return act(id, async () => {
      const conn = await call("/api/integrations/config", { id, values });
      intg.open = null; changed(id);
      toast(c.name.toUpperCase(), "Relié ✓", conn.account || "");
      return `✅ Connecté${conn.account ? ` : ${conn.account}` : ""}.`;
    });
  }
});
setTimeout(() => { if (typeof DEMO === "undefined" || !DEMO) loadIntegrations(); }, 2500);  // the « ! » on Réglages when a token stopped working
