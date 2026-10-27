// ChiefOS → ⏰ Planification: agents launched at a set time by the server (office/schedules.py), in a terminal as usual.

import { hub } from "../hub.js";
import { clip } from "../core/core.js";
import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { termTargets } from "./terminal.js";

let sched = null, schedEdit = null, schedMsg = "";
const DAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
async function loadSched() {
  try { sched = DEMO ? { items: [{ id: "d1", name: "Nettoyage du board", agent: "youtrack-board-cleaner", prompt: "Nettoie le board", cwd: "", days: [0], time: "09:00", enabled: true, last: "" }], log: [], agents: ["youtrack-board-cleaner", "security-auditor"] }
    : await (await fetch("/api/schedules", { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { sched = { items: [], log: [], agents: [], error: true }; }
  if (!termTargets && !DEMO) { try { hub.termTargets = await (await fetch("/api/blueprint/targets")).json(); } catch (_) { hub.termTargets = []; } }
  renderChiefOs();
}
async function schedAct(body) {
  if (DEMO) { schedMsg = "Démo : rien n'est enregistré."; return renderChiefOs(); }
  try {
    const res = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) });
    const out = await res.json(); if (!res.ok) throw new Error(out.error);
    sched = out; schedEdit = null; schedMsg = body.action === "run" ? "✓ Lancé." : "✓ Enregistré.";
  } catch (err) { schedMsg = `✗ ${err.message}`; }
  renderChiefOs();
}
function scheduleAppHtml() {
  if (!sched) { loadSched(); return `<p class="muted osloading" role="status">Chargement…</p>`; }
  const e = schedEdit, agentsList = sched.agents || [];
  const form = e ? `<div class="schedform"><h4>${e.id ? "MODIFIER" : "NOUVELLE"} PLANIFICATION</h4>
      <div class="osrow"><b>Nom</b><span><input data-sf="name" value="${esc(e.name || "")}" placeholder="Nettoyage du board"></span><span></span></div>
      <div class="osrow"><b>Agent</b><span><select data-sf="agent">${agentsList.map(a => `<option${a === e.agent ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></span><span></span></div>
      <div class="osrow"><b>Mission</b><span><textarea data-sf="prompt" rows="3" placeholder="Ce que l'agent doit faire">${esc(e.prompt || "")}</textarea></span><span></span></div>
      <div class="osrow"><b>Dossier</b><span><select data-sf="cwd"><option value="">dossier de lancement habituel</option>${(termTargets || []).map(t => `<option value="${esc(t.path)}"${t.path === e.cwd ? " selected" : ""}>${esc(t.label)}</option>`).join("")}</select></span><span></span></div>
      <div class="osrow"><b>Quand</b><span class="schedays">${DAYS_FR.map((d, i) => `<label><input type="checkbox" data-sd="${i}"${(e.days || []).includes(i) ? " checked" : ""}> ${d}</label>`).join("")} à <input type="time" data-sf="time" value="${esc(e.time || "09:00")}"></span><span></span></div>
      <div class="osacts"><button data-sc="save" class="ubok">Enregistrer</button><button data-sc="cancel">Annuler</button></div></div>` : "";
  return `<div class="osacts"><b>⏰ Agents planifiés</b><button data-sc="new" class="ubok">＋ Nouvelle</button><span class="muted">${esc(schedMsg)}</span></div>
    <p class="muted">Le serveur de l'Office lance l'agent à l'heure dite (dans un terminal, tu valides les permissions comme d'habitude). Il doit tourner à ce moment-là : une heure manquée de plus de 15 min est sautée.</p>
    ${form}
    ${sched.items.map(i => `<div class="osrow"><b>${i.enabled ? "🟢" : "⚪"} ${esc(i.name)}</b><span>${esc(i.agent)} · ${i.days.map(d => DAYS_FR[d]).join(", ")} à ${esc(i.time)}${i.cwd ? ` · ${esc(i.cwd.replace(/^\/home\/[^/]+/, "~"))}` : ""}<br><small class="muted">${esc(clip(i.prompt, 120))}${i.last ? ` · dernier : ${esc(i.last)}` : ""}</small></span>
      <span class="osacts"><button data-sc="run" data-id="${esc(i.id)}" title="Lancer maintenant">▶</button><button data-sc="toggle" data-id="${esc(i.id)}">${i.enabled ? "Pause" : "Activer"}</button><button data-sc="edit" data-id="${esc(i.id)}">✏️</button><button data-sc="del" data-id="${esc(i.id)}">🗑</button></span></div>`).join("") || (e ? "" : `<p class="muted">Aucune planification.</p>`)}
    ${sched.log.length ? `<h4>DERNIERS LANCEMENTS</h4>${sched.log.slice(0, 15).map(l => `<div class="osrow"><b>${l.ok ? "✓" : "✗"} ${esc(l.name)}</b><span class="muted">${esc(l.output)} · ${esc(l.why)}</span><span class="muted">${new Date(l.t * 1000).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")}` : ""}`;
}

class ScheduleApp extends OsApp {
  constructor() { super("schedule", "⏰", "Planification", "#26a269"); }
  render() { return scheduleAppHtml(); }
  input(ev) { const t = ev.target; if (t.dataset.sf && schedEdit) schedEdit[t.dataset.sf] = t.value; }
  change(ev) {
    const t = ev.target;
    if (t.dataset.sf && schedEdit) schedEdit[t.dataset.sf] = t.value;
    if (t.dataset.sd !== undefined && schedEdit) { const d = new Set(schedEdit.days || []); t.checked ? d.add(+t.dataset.sd) : d.delete(+t.dataset.sd); schedEdit.days = [...d].sort(); }
  }
  click(b) {
    const sc = b.dataset.sc; if (!sc) return false;
    if (sc === "new") { schedEdit = { name: "", agent: (sched.agents || [])[0], prompt: "", cwd: "", days: [0, 1, 2, 3, 4], time: "09:00", enabled: true }; renderChiefOs(); }
    else if (sc === "cancel") { schedEdit = null; renderChiefOs(); }
    else if (sc === "edit") { schedEdit = structuredClone(sched.items.find(i => i.id === b.dataset.id)); renderChiefOs(); }
    else if (sc === "save") schedAct({ action: "save", item: schedEdit });
    else schedAct({ action: { del: "delete", toggle: "toggle", run: "run" }[sc], id: b.dataset.id });
    return true;
  }
}
new ScheduleApp();
