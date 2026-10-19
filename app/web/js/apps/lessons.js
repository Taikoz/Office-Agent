// ChiefOS → 📚 Leçons: the devs learn from their past missions (office/lessons.py). Lessons are harvested from the
// errors that keep coming back, the questions asked twice, the review remarks and CI breakages of the agents' MRs, the
// user's corrections; the user validates them (text and scope can be changed first); the plugin's hook then adds the
// fitting ones to each new subagent's prompt, and the office measures whether the error / question / remark comes back.
// In the office: a dev starting with lessons says so, a dev delivering without any error thanks them, a lesson validated
// is "appris aujourd'hui", said by the dev of that agent type (one dev = one kind of agent, ChiefOS → Équipe). What each
// dev knows = the lessons of its agent type (and the shared ones it was given), the ones that work, a level.

import { TEAM, clip, devOfType, ents, roleOf, specialty } from "../core/core.js";
import { esc } from "../core/data.js";
import { toast } from "../sims/progress.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

const post = body => fetch("/api/lessons", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }).then(r => r.json());
const KIND = { error: ["😖", "Erreur"], faq: ["❓", "Question"], review: ["🔍", "Revue"], ci: ["🚦", "CI"], correction: ["✋", "Correction"] };
const EFFECT = { ok: ["✅", "efficace"], ko: ["❌", "ne suffit pas : à reformuler"], new: ["🆕", "à l'essai"], used: ["📦", "utilisée"], idle: ["💤", "jamais utilisée"] };
let book = null, loading = false, msg = "", preview = null, showOld = false;
const prev = { agent: "", cwd: "", text: "" };  // what was typed in the preview, kept across renders

function demoBook() {
  const now = Date.now() / 1000;
  return { inject: true, learnedToday: 1, harvest: { at: now - 600, running: false, error: "" },
    expertise: [{ agent: "feature-builder", known: 4, working: 2, given: 9, level: 2 }, { agent: "mr-reviewer", known: 1, working: 0, given: 2, level: 1 }],
    lessons: [
      { id: "L-0004", kind: "faq", status: "pending", text: "Question déjà tranchée par le chef (2 fois) : « Quelle branche cible ? » → « develop ». Ne pas la reposer.", scope: { agent: "feature-builder", project: "front" }, evidence: { count: 2, days: ["2026-10-12", "2026-10-15"] } },
      { id: "L-0002", kind: "error", status: "active", text: "Sous zsh, citer les séparateurs : echo '==='.", scope: { agent: "", project: "" }, evidence: { count: 16, days: ["2026-10-10"] }, effect: "ok", note: "16 fois en 14 j avant → 1 depuis (6 j)", injections: 7 },
      { id: "L-0003", kind: "ci", status: "active", text: "Sur billing-api, lancer make commitlint avant de pousser.", scope: { agent: "", project: "billing-api" }, evidence: { count: 1, days: ["2026-10-14"] }, effect: "new", note: "trop récente pour juger", injections: 1 },
    ] };
}

async function load() {
  if (loading) return; loading = true;
  try { book = DEMO ? demoBook() : await (await fetch("/api/lessons", { headers: { "X-Office-Token": TOKEN } })).json(); }
  catch (_) { book = { error: true }; }
  loading = false;
  renderChiefOs();
}

const agentTypes = () => [...new Set([...Object.keys(OFFICE_CFG.agents || {}), ...(book?.expertise || []).map(e => e.agent)])].sort();
const scopeTxt = sc => [sc?.agent ? specialty(sc.agent) : "tous les agents", sc?.project || "tous les projets"].join(" · ");
const ago = t => { if (!t) return "jamais"; const m = Math.round((Date.now() / 1000 - t) / 60); return m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`; };

function pendingHtml(x) {
  const [icon, label] = KIND[x.kind] || ["•", x.kind];
  return `<div class="osrow idrow" data-ls-row="${x.id}"><b>${icon} ${label} <small class="muted">${x.id} · vu ${x.evidence?.count || 0} fois, ${(x.evidence?.days || []).length} jour(s)</small></b>
    <textarea class="lstext" data-ls-text="${x.id}" rows="2" aria-label="Texte de la leçon">${esc(x.text)}</textarea>
    ${(x.evidence?.examples || []).length ? `<small class="muted">ex. ${x.evidence.examples.slice(0, 2).map(e => esc(clip(String(e), 110))).join(" · ")}</small>` : ""}
    <span class="osacts"><label>Agent <select data-ls-agent="${x.id}"><option value="">tous</option>${agentTypes().map(a => `<option value="${esc(a)}"${a === x.scope?.agent ? " selected" : ""}>${esc(specialty(a))}${TEAM.some(n => roleOf(n) === a) ? ` (${esc(TEAM.find(n => roleOf(n) === a))})` : ""}</option>`).join("")}</select></label>
      <label>Projet <input data-ls-project="${x.id}" value="${esc(x.scope?.project || "")}" placeholder="tous" size="12"></label>
      <button data-ls-ok="${x.id}" class="ubok">✓ Valider</button><button data-ls-no="${x.id}">Rejeter</button></span></div>`;
}

function activeHtml(x) {
  const [icon, label] = KIND[x.kind] || ["•", x.kind], [ei, el] = EFFECT[x.effect] || ["", ""];
  return `<div class="osrow idrow"><b>${icon} ${esc(x.text)}</b>
    <span class="muted">${x.id} · ${label} · ${esc(scopeTxt(x.scope))} · donnée ${x.injections || 0} fois${x.lastInjected ? ` (dernière ${ago(x.lastInjected)})` : ""}</span>
    ${ei ? `<span>${ei} ${el}${x.note ? ` — ${esc(x.note)}` : ""}</span>` : ""}
    <span class="osacts"><button data-ls-arch="${x.id}">Archiver</button></span></div>`;
}

function lessonsHtml() {
  if (!book) { load(); return `<p class="muted">Lecture des leçons…</p>`; }
  if (book.error) return `<p class="muted">Serveur injoignable (ou ancienne version : redémarre Agent Office).</p>`;
  const by = s => book.lessons.filter(x => x.status === s), pending = by("pending"), active = by("active"), old = book.lessons.filter(x => ["archived", "rejected"].includes(x.status));
  const working = active.filter(x => x.effect === "ok").length;
  return `<div class="idapp lsapp">
    <div class="rstats"><div>actives<b>${active.length}</b></div><div>efficaces<b>${working}</b></div><div>à valider<b>${pending.length}</b></div><div>appris aujourd'hui<b>${book.learnedToday}</b></div></div>
    <p class="muted">Chaque nouvel agent reçoit dans son prompt jusqu'à 5 leçons validées qui collent à sa spécialité, son projet et sa mission${book.inject ? "" : " — <b>désactivé</b> (clé « lessons » de agent-office.json)"}. Rien n'est utilisé sans ta validation, et tout reste sur cette machine.</p>
    <div class="osacts"><button data-ls-harvest${book.harvest.running ? " disabled" : ""}>${book.harvest.running ? "Récolte en cours…" : "↻ Récolter maintenant"}</button>
      <span class="muted">Dernière récolte ${ago(book.harvest.at)} : erreurs, questions, revues et CI des MR d'agents, corrections.${book.harvest.error ? ` ⚠️ ${esc(book.harvest.error)}` : ""}${msg ? ` — ${esc(msg)}` : ""}</span></div>
    <h4>CE QUE SAIT CHAQUE DEV</h4>${(n => n ? `<p class="muted">+ ${n} leçon(s) commune(s) à toute l'équipe (sans type d'agent), données à qui en a besoin selon le projet et la mission.</p>` : "")(active.filter(x => !x.scope?.agent).length)}<div class="lsexp">${TEAM.map(n => {
      const role = roleOf(n), e = book.expertise.find(x => x.agent === role) || { known: 0, working: 0, given: 0, level: 0 };
      return `<div><b>${esc(n)}</b><small class="muted">${esc(specialty(role))}</small><span>${e.level ? "⭐".repeat(Math.min(5, e.level)) : "—"}</span><small class="muted">${e.known} leçon(s) · ${e.working} efficace(s)${e.given ? ` · reçues ${e.given} fois` : ""}</small></div>`;
    }).join("")}</div>
    <h4>À VALIDER</h4>${pending.map(pendingHtml).join("") || `<p class="muted">Rien en attente. La récolte repasse toutes les 30 min.</p>`}
    <h4>ACTIVES</h4>${active.map(activeHtml).join("") || `<p class="muted">Aucune leçon validée pour l'instant.</p>`}
    <h4>APERÇU : CE QU'UN AGENT RECEVRAIT</h4>
    <div class="osrow idrow"><span class="osacts"><select class="lsprevagent" aria-label="Agent">${[...agentTypes(), "general-purpose"].map(a => `<option value="${esc(a)}"${a === prev.agent ? " selected" : ""}>${esc(a === "general-purpose" ? a : specialty(a))}</option>`).join("")}</select>
      <input class="lsprevcwd" placeholder="dossier du projet (ex. ~/repos/front)" size="28" aria-label="Dossier" value="${esc(prev.cwd)}"></span>
      <textarea class="lsprevtext" rows="2" placeholder="La mission, ex. « Livre DEMO-1234 : corriger le tri du tableau »" aria-label="Mission">${esc(prev.text)}</textarea>
      <span class="osacts"><button data-ls-preview>Voir</button></span>
      ${preview ? `<pre class="lsblock">${esc(preview.block || "Aucune leçon ne colle à cette mission.")}</pre>` : ""}</div>
    ${old.length ? `<h4><button data-ls-old class="lslink">${showOld ? "▾" : "▸"} ARCHIVÉES ET REJETÉES (${old.length})</button></h4>${showOld ? old.map(x => `<div class="osrow idrow"><span class="muted">${x.id} · ${x.status === "archived" ? "archivée" : "rejetée"} · ${esc(clip(x.text, 160))}</span>${x.status === "archived" ? `<span class="osacts"><button data-ls-restore="${x.id}">Restaurer</button></span>` : ""}</div>`).join("") : ""}` : ""}
  </div>`;
}

// the dev of the lesson's agent type says it (any dev at work for a lesson for everyone)
function learnedCheer(agent) {
  const name = agent ? devOfType(agent) : null;
  const dev = [...ents.values()].find(e => e.seated && !e.leaving && (!name || e.who === name)) || [...ents.values()].find(e => e.seated && !e.leaving);
  if (dev) { dev.fxKind = "quip"; dev.fxMsg = "📚 Noté, chef ! On ne refera plus l'erreur."; dev.fxUntil = performance.now() + 7000; }
  toast("📚 APPRIS AUJOURD'HUI", name ? `${name} a appris une leçon` : "Leçon validée pour toute l'équipe", name ? `Ses prochaines missions ${specialty(agent)} la recevront.` : "Les prochains agents concernés la recevront dans leur mission.");
}

async function act(body, after) {
  if (DEMO) { msg = "Démo : rien n'est enregistré."; return renderChiefOs(); }
  try { const r = await post(body); msg = r.error ? `✗ ${r.error}` : after?.(r) || ""; } catch (_) { msg = "✗ serveur injoignable"; }
  load();
}

class LessonsApp extends OsApp {
  constructor() { super("lessons", "📚", "Leçons", "#2f9e44"); }
  render() { return lessonsHtml(); }
  open() { if (book && !loading) load(); }
  badge() { return book?.lessons ? book.lessons.filter(x => x.status === "pending").length : 0; }
  click(b) {
    const box = attr => document.querySelector(`#chiefos [${attr}]`);
    const d = b.dataset;
    if (d.lsOk) {
      const id = d.lsOk, field = k => box(`data-ls-${k}="${id}"`);
      act({ action: "approve", id, text: field("text")?.value, agent: field("agent")?.value || "", project: field("project")?.value.trim() || "" }, () => { learnedCheer(field("agent")?.value || ""); return ""; });
      return true;
    }
    if (d.lsNo) { act({ action: "reject", id: d.lsNo }); return true; }
    if (d.lsArch) { act({ action: "archive", id: d.lsArch }); return true; }
    if (d.lsRestore) { act({ action: "restore", id: d.lsRestore }); return true; }
    if (d.lsHarvest !== undefined) { act({ action: "harvest" }, () => "récolte lancée"); setTimeout(load, 8000); return true; }
    if (d.lsOld !== undefined) { showOld = !showOld; renderChiefOs(); return true; }
    if (d.lsPreview !== undefined) {
      Object.assign(prev, { agent: document.querySelector("#chiefos .lsprevagent")?.value || "", cwd: document.querySelector("#chiefos .lsprevcwd")?.value || "", text: document.querySelector("#chiefos .lsprevtext")?.value || "" });
      const { agent, cwd, text: prompt } = prev;
      if (DEMO) { preview = { block: "## Leçons des missions précédentes (Agent Office)\n- [L-0002] Sous zsh, citer les séparateurs : echo '==='." }; renderChiefOs(); return true; }
      post({ action: "preview", agent, cwd: cwd.replace(/^~/, ""), prompt }).then(r => { preview = r; renderChiefOs(); }).catch(() => {});
      return true;
    }
    return false;
  }
}
new LessonsApp();

// in the office: a dev starting a mission with lessons says so; delivering with no error, it thanks them (once each)
const said = new Map();  // agent id → "start" | "done"
setInterval(() => {
  if (document.hidden) return;
  for (const e of ents.values()) {
    const a = e.agent, n = a?.lessons?.length || 0;
    if (!n || !e.seated || e.leaving) continue;
    const step = said.get(a.id);
    if (!step && ["working", "asking"].includes(a.status)) {
      said.set(a.id, "start");
      e.fxKind = "quip"; e.fxMsg = e.helper ? `📒 J'ai relu les ${n} leçon${n > 1 ? "s" : ""} de ${e.helper}` : `📚 J'ai relu ${n} leçon${n > 1 ? "s" : ""} avant de commencer`; e.fxUntil = performance.now() + 7000;
    } else if (step === "start" && a.status === "done") {
      said.set(a.id, "done");
      if (!a.errors) { e.fxKind = "quip"; e.fxMsg = "😎 Zéro erreur : les leçons ont payé !"; e.fxUntil = performance.now() + 7000; }
    }
  }
}, 4000);
if (!DEMO) { setTimeout(load, 25000); setInterval(load, 30 * 60 * 1000); }
