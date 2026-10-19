// ChiefOS → 💡 Idées: what the last two weeks of transcripts say about the way we work (office/insights.py, read
// locally): tasks done by hand again and again (→ a skill / agent / hook to write, or the existing one to use), the
// same request typed on several days, the errors that keep coming back (and what usually fixed them), the user's
// corrections. Nothing is ever created: "Ouvrir dans Blueprints" drafts it there. Claude Haiku (off by default, 3 calls
// a day at most) only writes the name, the reason and the steps. A new proposal: a dev at work says so, once.

import { hub } from "../hub.js";
import { clip, ents } from "../core/core.js";
import { esc } from "../core/data.js";
import { SaveSlot } from "../save/slot.js";
import { toast } from "../sims/progress.js";
import { OsApp } from "./base.js";
import { newBp, nid, persistBp } from "./blueprint.js";
import { openChiefOs, renderChiefOs, setOsApp } from "../ui/chiefos.js";

const post = body => fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }).then(r => r.json());
const seenSlot = new SaveSlot("office-ideas-seen", { keys: [] });
const KIND = { task: ["🔁", "Tâche répétée à la main"], request: ["🗣️", "Demande qui revient"], error: ["😖", "Erreur qui revient"], corrections: ["✋", "Tu corriges souvent"] };
const TYPE_FR = { skill: "🧠 skill", agent: "🤖 agent", hook: "🪝 hook", command: "⌨️ commande", existing: "♻️ déjà là" };
let ideas = null, busy = false, msg = "", loading = false;

function demoIdeas() {
  return { transcripts: 42, days: 14, aiOn: false, aiUsed: 0, aiMax: 3, engine: "cli", items: [
    { key: "task:gl.py mr-create > yt.py command > gl.py mr-note", kind: "task", steps: ["gl.py mr-create", "yt.py command", "gl.py mr-note"], examples: ["python3 -I tools/gl.py mr-create --title …", "python3 -I yt.py command DEMO-12 \"State To Verify\"", ""],
      count: 9, sessions: 7, days: ["2026-10-06", "2026-10-09", "2026-10-13", "2026-10-15"], projects: ["front"], existing: null,
      ai: { type: "skill", name: "livrer-mr-et-ticket", why: "Fait 9 fois à la main en 2 semaines : MR, ticket en To Verify, note de MR.", description: "Quand une branche est prête à être livrée.", steps: ["Créer la MR assignée", "Passer le ticket en To Verify", "Commenter la MR avec le résumé"] } },
    { key: "err:Bash|(eval):N: == not found", kind: "error", tool: "Bash", signature: "(eval):N: == not found", count: 16, sessions: 6, days: ["2026-10-10", "2026-10-14", "2026-10-16"], samples: ["Exit code 1\n(eval):1: === not found"], fix: "", projects: ["Office-Agent"],
      ai: { cause: "Sous zsh, un mot qui commence par = est développé en chemin de commande (echo === échoue).", remedy: "Ligne de CLAUDE.md : sous zsh, citer les séparateurs (echo '===')." } },
    { key: "fix:corrections", kind: "corrections", count: 6, days: ["2026-10-12", "2026-10-15"], projects: ["front"], samples: [{ day: "2026-10-15", project: "front", text: "non passe pas par storybook" }, { day: "2026-10-12", project: "front", text: "pas ça, garde le design existant" }], ai: null },
  ] };
}

async function load(force = false) {
  if (loading) return; loading = true;
  try { ideas = DEMO ? demoIdeas() : await (await fetch(`/api/insights${force ? "?force=1" : ""}`, { headers: { "X-Office-Token": TOKEN } })).json(); }
  catch (_) { ideas = { error: true }; }
  loading = false;
  announce();
  renderChiefOs();
}

// a proposal never seen: a dev at work says it, once (and a toast)
function announce() {
  if (!ideas?.items || DEMO) return;
  const seen = new Set(seenSlot.data.keys), fresh = ideas.items.filter(i => !seen.has(i.key));
  if (!fresh.length) return;
  seenSlot.data.keys = [...seen, ...fresh.map(i => i.key)].slice(-300); seenSlot.save();
  const first = fresh[0], what = first.kind === "error" ? "cette erreur revient sans arrêt" : first.kind === "corrections" ? "tu me reprends souvent, on devrait l'écrire" : "on refait toujours la même chose, j'ai une idée";
  const dev = [...ents.values()].find(e => e.seated && !e.leaving);
  if (dev) { dev.fxKind = "quip"; dev.fxMsg = `💡 Chef, ${what} !`; dev.fxUntil = performance.now() + 9000; }
  toast("💡 IDÉES", `${fresh.length} nouvelle(s) proposition(s)`, "ChiefOS → 💡 Idées : des tâches à automatiser, des erreurs qui reviennent.");
}

const daysTxt = it => `${it.count} fois · ${it.days.length} jour(s)${it.sessions ? ` · ${it.sessions} session(s)` : ""}${it.projects?.length ? ` · ${it.projects.join(", ")}` : ""}`;
function itemHtml(it) {
  const [icon, label] = KIND[it.kind] || ["•", it.kind], ai = it.ai || {};
  let body = "";
  if (it.kind === "task") body = `<code class="idsteps">${it.steps.map(esc).join(" → ")}</code>${it.examples?.find(Boolean) ? `<small class="muted">ex. ${esc(clip(it.examples.find(Boolean), 140))}</small>` : ""}`;
  else if (it.kind === "request") body = `<span>Mots : ${it.words.map(w => `<b>${esc(w)}</b>`).join(", ")}</span>${it.prompts.map(p => `<small class="muted">« ${esc(clip(p, 140))} »</small>`).join("")}`;
  else if (it.kind === "error") body = `<code>${esc(it.tool)} : ${esc(it.signature)}</code>${it.fix ? `<small>✅ corrigé en général par <code>${esc(clip(it.fix, 140))}</code></small>` : ""}`;
  else body = it.samples.slice(0, 4).map(s => `<small class="muted">${esc(s.day)} · « ${esc(clip(s.text, 120))} »</small>`).join("");
  const proposal = it.kind === "task" || it.kind === "request";
  const why = ai.why || (proposal ? `Fait ${it.count} fois sur ${it.days.length} jours, sans skill ni agent.` : "");
  return `<div class="osrow idrow"><b>${icon} ${label}${ai.type ? ` · ${TYPE_FR[ai.type] || esc(ai.type)}${ai.name ? ` <code>${esc(ai.name)}</code>` : ""}` : ""}</b>
    <span class="muted">${daysTxt(it)}</span>${body}
    ${why ? `<span>💬 ${esc(why)}</span>` : ""}${ai.description ? `<span class="muted">Déclencheur : ${esc(ai.description)}</span>` : ""}
    ${ai.steps?.length ? `<ol class="idol">${ai.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
    ${ai.cause ? `<span>🔎 ${esc(ai.cause)}</span>` : ""}${ai.remedy ? `<span>🩹 ${esc(ai.remedy)}</span>` : ""}
    ${ai.rules?.length ? `<span>📏 À ajouter au CLAUDE.md :</span><ul class="idol">${ai.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
    ${it.existing ? `<span>♻️ Proche de ${it.existing.kind} <b>${esc(it.existing.name)}</b> (${esc(it.existing.scope)}) : l'utiliser plutôt que tout refaire à la main ?</span>` : ""}
    <span class="osacts">${proposal || ai.remedy || ai.rules ? `<button data-id-bp="${esc(it.key)}" class="ubok">🧩 Ouvrir dans Blueprints</button>` : ""}<button data-id-drop="${esc(it.key)}">Ignorer 30 j</button></span></div>`;
}

function ideasHtml() {
  if (!ideas) { load(); return `<p class="muted">Lecture des transcripts des 14 derniers jours…</p>`; }
  if (ideas.error) return `<p class="muted">Serveur injoignable (ou ancienne version : redémarre Agent Office).</p>`;
  const groups = [["task", "request"], ["error"], ["corrections"]].map(k => ideas.items.filter(i => k.includes(i.kind)));
  const engine = ideas.engine === "none" ? "ni clé API ni commande claude" : ideas.engine === "api" ? "ta clé API" : "ton compte Claude Code";
  return `<div class="idapp"><p class="muted">${ideas.transcripts} transcripts sur ${ideas.days} jours, analysés sur cette machine. Rien n'est créé : une proposition s'ouvre en brouillon dans Blueprints.</p>
    <div class="osacts"><button data-id-ai class="${ideas.aiOn ? "ubok" : ""}">✨ Textes par Claude Haiku : ${ideas.aiOn ? "ON" : "OFF"}</button>
      ${ideas.aiOn ? `<button data-id-write${busy || ideas.aiBusy ? " disabled" : ""}>Rédiger maintenant</button>` : ""}<button data-id-reload>↻ Relire</button>
      <span class="muted">${ideas.aiOn ? `${ideas.aiUsed}/${ideas.aiMax} appels aujourd'hui, via ${engine} ; seul un résumé (compteurs, exemples courts, secrets masqués) est envoyé.` : "Sans Haiku : les constats seuls, rien ne quitte la machine."}${msg ? ` — ${esc(msg)}` : ""}</span></div>
    <h4>À AUTOMATISER</h4>${groups[0].map(itemHtml).join("") || `<p class="muted">Rien qui revienne assez souvent (3 sessions sur 3 jours) hors de tes agents et skills.</p>`}
    <h4>ERREURS QUI REVIENNENT</h4>${groups[1].map(itemHtml).join("") || `<p class="muted">Aucune erreur répétée.</p>`}
    ${groups[2].length ? `<h4>TES CORRECTIONS</h4>${groups[2].map(itemHtml).join("")}` : ""}</div>`;
}

// the proposal as a Blueprints draft (kept in this browser; nothing written to disk until Publier)
function draft(it) {
  const ai = it.ai || {}, bp = newBp(ai.type === "agent" ? "agent" : "skill");  // a hook is drafted as a skill: its blocks are shell ones
  const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  bp.name = slug(ai.name || (it.steps || it.words || [it.kind]).join(" ")) || bp.name;
  bp.description = ai.description || ai.remedy || `Automatise : ${(it.steps || it.words || []).join(" → ")}`;
  const start = bp.nodes[0];
  start.props = { when: ai.description || `Quand il faut ${(it.steps || it.words || []).join(", ")}.`, role: "", keywords: (it.words || it.steps || []).slice(0, 6).join(", ") };
  const steps = ai.steps?.length ? ai.steps.map(t => ["step", { text: t }])
    : it.kind === "task" ? it.steps.map((s, i) => ["bash", { cmd: it.examples?.[i] || s, why: "" }])
    : (ai.rules || [ai.remedy || "?"]).map(t => ["rule", { text: t }]);
  let prev = start, x = 340;
  for (const [type, props] of steps) {
    const n = { id: nid(), type, x, y: type === "rule" ? 300 : 120, props };
    bp.nodes.push(n);
    if (type !== "rule") { bp.links.push({ from: prev.id, port: "out", to: n.id }); prev = n; }
    x += 280;
  }
  return bp;
}

class IdeasApp extends OsApp {
  constructor() { super("ideas", "💡", "Idées", "#fbaa08"); }
  render() { return ideasHtml(); }
  open() { if (ideas && !loading) load(); }
  badge() { if (!ideas?.items) return 0; const seen = new Set(seenSlot.data.keys); return ideas.items.filter(i => !seen.has(i.key)).length; }
  click(b) {
    const it = key => ideas?.items.find(i => i.key === key);
    if (b.dataset.idBp !== undefined) {
      const x = it(b.dataset.idBp); if (!x) return true;
      hub.bp = draft(x); hub.bpSel = null; persistBp();
      setOsApp("blueprint"); openChiefOs("blueprint");
      toast("🧩 BLUEPRINTS", "Brouillon prêt", "Relis-le, puis 💾 Enregistrer ou Publier : rien n'est créé tant que tu ne publies pas.");
      return true;
    }
    if (b.dataset.idDrop !== undefined) {
      const key = b.dataset.idDrop;
      ideas.items = ideas.items.filter(i => i.key !== key); renderChiefOs();
      if (!DEMO) post({ action: "dismiss", key }).catch(() => {});
      return true;
    }
    if (b.dataset.idAi !== undefined) {
      if (DEMO) { msg = "Démo : rien n'est envoyé."; renderChiefOs(); return true; }
      post({ action: "ai", on: !ideas.aiOn }).then(r => { ideas.aiOn = !!r.aiOn; msg = ""; load(); }).catch(() => { msg = "serveur injoignable"; renderChiefOs(); });
      return true;
    }
    if (b.dataset.idWrite !== undefined) {
      busy = true; msg = "Claude Haiku rédige…"; renderChiefOs();
      post({ action: "write" }).then(r => { msg = r.error ? { limit: "limite du jour atteinte", engine: "ni clé API ni commande claude", failed: "échec, réessaie plus tard" }[r.error] || r.error : `${r.written} texte(s) écrit(s)`; })
        .catch(() => { msg = "serveur injoignable"; }).finally(() => { busy = false; load(true); });
      return true;
    }
    if (b.dataset.idReload !== undefined) { msg = ""; load(true); return true; }
    return false;
  }
}
new IdeasApp();

// a first look 20 s after the page opens, then every 30 min: new proposals get announced even with ChiefOS closed
if (!DEMO) { setTimeout(() => load(), 20000); setInterval(() => load(), 30 * 60 * 1000); }
