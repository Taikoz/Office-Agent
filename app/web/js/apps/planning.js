// Planning of the day (ChiefOS → Planning): pick tickets from the backlog, an agent for each, a number of agents at
// once, then "Lancer la journée": the chief launches them one after the other through the usual launch (a terminal
// with claude --agent, where you validate permissions as usual), never more at once than chosen, a pause between two.
// The office then hands each new agent to the most skilled free dev (skills.js). In a git project, each agent of the
// day can get a worktree of its own (`--worktree`): several at once without sharing their files.

import { hub } from "../hub.js";
import { chief, clip, curSession, data } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { esc } from "../core/data.js";
import { toast } from "../sims/progress.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

export let plan = new SaveSlot("office-plan", { queue: [], max: 2, running: false, launched: [], lastAt: 0, cwd: "", worktree: true }).data;
const savePlan = () => SaveSlot.get("office-plan").save(plan);
let planPick = {}, planAgents = null, planTargets = null;
async function planTargetList() {  // the recent projects (blueprints.targets), for the folder of the day
  try { planTargets = DEMO ? [{ path: "~/repos/demo", label: "~/repos/demo", git: true }] : (await (await fetch("/api/blueprint/targets")).json()).filter(t => t.kind === "repo"); }
  catch (_) { planTargets = []; }
  renderChiefOs();
}
async function planAgentList() {
  if (planAgents) return planAgents;
  try { planAgents = DEMO ? Object.keys(hub.LAUNCH_PROMPTS).sort() : await (await fetch("/api/agents")).json(); } catch (_) { planAgents = Object.keys(hub.LAUNCH_PROMPTS).sort(); }
  return planAgents;
}
function planCandidates() {
  const busy = new Set((curSession()?.agents || []).filter(a => a.status !== "done").map(a => a.ticket));
  const queued = new Set(plan.queue.map(q => q.ticket));
  return (data.backlog || []).filter(b => !busy.has(b.id) && !queued.has(b.id));
}
function planAppHtml() {
  if (!planAgents) { planAgentList().then(renderChiefOs); return `<p class="muted">Chargement des agents…</p>`; }
  if (!planTargets) { planTargetList(); return `<p class="muted">Chargement des projets…</p>`; }
  const git = !!planTargets.find(t => t.path === plan.cwd)?.git;
  const opts = sel => planAgents.map(a => `<option${a === sel ? " selected" : ""}>${esc(a)}</option>`).join("");
  const cands = planCandidates();
  const running = (curSession()?.agents || []).filter(a => ["working", "asking", "blocked"].includes(a.status)).length;
  return `<div class="rstats"><div>file<b>${plan.queue.length}</b></div><div>lancés aujourd'hui<b>${plan.launched.filter(l => new Date(l.t).toDateString() === new Date().toDateString()).length}</b></div><div>agents en cours<b>${running}</b></div>
      <div>en même temps<b><select id="plan-max">${[1, 2, 3, 4].map(n => `<option${n === plan.max ? " selected" : ""}>${n}</option>`).join("")}</select></b></div></div>
    <div class="osrow"><b>Projet</b><span><select id="plan-cwd"><option value="">dossier de lancement habituel</option>${planTargets.map(t => `<option value="${esc(t.path)}"${t.path === plan.cwd ? " selected" : ""}>${esc(t.label)}${t.git ? "" : " (pas git)"}</option>`).join("")}</select></span>
      <label title="${git ? "chaque agent sur sa propre branche, dans .claude/worktrees/" : "choisis un projet git"}"><input type="checkbox" id="plan-wt"${plan.worktree && git ? " checked" : ""}${git ? "" : " disabled"}> 🌿 un worktree par agent</label></div>
    <h4>BACKLOG</h4>${cands.length ? cands.map(b => `<div class="osrow"><b><label><input type="checkbox" data-plan-check="${esc(b.id)}"${planPick[b.id] ? " checked" : ""}> ${esc(b.id)}</label></b><span>${esc(clip(b.summary || "", 80))}</span>
      <select data-plan-agent="${esc(b.id)}">${opts(planPick[b.id]?.agent || "feature-builder")}</select></div>`).join("") : `<p class="muted">Rien dans le backlog (tickets YouTrack non pris).</p>`}
    <div class="osacts"><button data-plan="add">➕ Ajouter la sélection à la file</button></div>
    <h4>FILE DE LA JOURNÉE</h4>${plan.queue.length ? plan.queue.map((q, i) => `<div class="osrow"><b>${i + 1}. ${esc(q.ticket)}</b><span>${esc(q.agent)}</span><button data-plan-drop="${i}">Retirer</button></div>`).join("") : `<p class="muted">Vide.</p>`}
    <div class="osacts"><button data-plan="go"${plan.queue.length ? "" : " disabled"}>${plan.running ? "⏸ Mettre en pause" : "▶ Lancer la journée"}</button><span class="muted">${plan.running ? "Le chef lance la suite dès qu'une place se libère (pause de 2 min entre deux lancements)." : "Chaque lancement ouvre un terminal, comme le bouton Lancer."}</span></div>`;
}
OsApp.listen("planning", "change", ev => {
  if (ev.target.id === "plan-max") { plan.max = +ev.target.value; savePlan(); }
  if (ev.target.id === "plan-cwd") { plan.cwd = ev.target.value; savePlan(); renderChiefOs(); }
  if (ev.target.id === "plan-wt") { plan.worktree = ev.target.checked; savePlan(); }
  const c = ev.target.closest("[data-plan-check]"); if (c) { if (c.checked) planPick[c.dataset.planCheck] = { agent: document.querySelector(`[data-plan-agent="${CSS.escape(c.dataset.planCheck)}"]`)?.value || "feature-builder" }; else delete planPick[c.dataset.planCheck]; }
  const s = ev.target.closest("[data-plan-agent]"); if (s && planPick[s.dataset.planAgent]) planPick[s.dataset.planAgent].agent = s.value;
});
let planArmed = 0;
OsApp.listen("planning", "click", ev => {
  const b = ev.target.closest("[data-plan], [data-plan-drop]"); if (!b) return;
  if (b.dataset.planDrop) { plan.queue.splice(+b.dataset.planDrop, 1); savePlan(); return renderChiefOs(); }
  if (b.dataset.plan === "add") { for (const [ticket, p] of Object.entries(planPick)) plan.queue.push({ ticket, agent: p.agent }); planPick = {}; savePlan(); return renderChiefOs(); }
  if (b.dataset.plan === "go") {
    if (plan.running) { plan.running = false; savePlan(); return renderChiefOs(); }
    if (performance.now() > planArmed) { planArmed = performance.now() + 4000; b.textContent = `Confirmer : ${plan.queue.length} lancement(s) ?`; return; }
    plan.running = true; plan.lastAt = 0; savePlan(); toast("PLANNING", "Journée lancée", `${plan.queue.length} ticket(s), ${plan.max} agent(s) à la fois.`); stepPlan(); renderChiefOs();
  }
});
async function stepPlan() {
  if (!plan.running) return;
  if (!plan.queue.length) { plan.running = false; savePlan(); toast("PLANNING", "File terminée", "Tous les tickets de la journée sont lancés."); return; }
  const running = (curSession()?.agents || []).filter(a => ["working", "asking", "blocked"].includes(a.status)).length;
  if (running >= plan.max || Date.now() - plan.lastAt < 120000) return;  // a free place, and the previous one had time to show up
  const q = plan.queue.shift(); plan.lastAt = Date.now(); savePlan();
  const prompt = (hub.LAUNCH_PROMPTS[q.agent] || (t => t))(q.ticket);
  if (DEMO) { toast("PLANNING (démo)", `${q.agent} sur ${q.ticket}`, "Démo : rien n'est lancé."); return; }
  try {
    const res = await fetch("/api/launch", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ agent: q.agent, prompt, cwd: plan.cwd || "", worktree: !!(plan.cwd && plan.worktree) }) });
    const out = await res.json();
    if (out.ok) { plan.launched.unshift({ t: Date.now(), ...q }); plan.launched = plan.launched.slice(0, 50); chief.bubble = `${q.ticket} : je lance ${q.agent} !`; chief.until = performance.now() + 4000; toast("PLANNING", `${q.agent} lancé sur ${q.ticket}`, clip(prompt, 80)); }
    else { plan.queue.unshift(q); plan.running = false; toast("PLANNING", "Lancement refusé, file en pause", out.output || out.error || ""); }
  } catch (err) { plan.queue.unshift(q); plan.running = false; toast("PLANNING", "Serveur injoignable, file en pause", err.message); }
  savePlan();
}
setInterval(stepPlan, 15000);

class PlanningApp extends OsApp {
  constructor() { super("planning", "📅", "Planning", "#0e8420"); }
  render() { return planAppHtml(); }
}
new PlanningApp();
