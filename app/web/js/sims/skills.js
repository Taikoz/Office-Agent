// Work skills, Sims style, earned from the real missions: each mission a dev delivers raises the skill of its kind of
// agent (development, tests, security, review, lead, organisation), more for a complex one. The chief then sends the
// most skilled free dev for each new agent, and expertise pays a salary bonus (money.js). Kept in this browser.

import { hub, provide } from "../hub.js";
import { TEAM, ents } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crew, crewAdd, mate } from "./crew.js";
import { esc } from "../core/data.js";
import { sfx, toast } from "./progress.js";

export const SKILLS = [
  ["dev", "💻", "Développement"], ["tests", "🧪", "Tests"], ["secu", "🛡️", "Sécurité"],
  ["review", "🔍", "Review"], ["lead", "🧭", "Pilotage"], ["orga", "📋", "Organisation"], ["explo", "🔭", "Exploration"],
];
const SKILL_XP = [0, 3, 8, 15, 24, 35, 48, 63, 80, 100];
let skillBook = new SaveSlot("office-skills", { xp: {} }).data;
const saveSkills = () => SaveSlot.get("office-skills").save(skillBook);

// the skill an agent works with, from its type (the user's own agents are matched on words of their name)
export function skillOf(type) {
  const t = String(type || "").toLowerCase();
  return /test|guardian|e2e|qa/.test(t) ? "tests" : /secu|audit|pentest/.test(t) ? "secu" : /review/.test(t) ? "review"
    : /lead|plan|archi/.test(t) ? "lead" : /board|clean|youtrack|ticket|archiv/.test(t) ? "orga" : /explore|search|research/.test(t) ? "explo" : "dev";
}
export const skillInfo = id => SKILLS.find(s => s[0] === id) || SKILLS[0];
export const skillXp = (name, id) => skillBook.xp[name]?.[id] || 0;
export const skillLevel = (name, id) => SKILL_XP.filter(x => skillXp(name, id) >= x).length;

// a delivered mission (called once per mission, by the payday of money.js): 1 + its complexity stars, + tests and MR
export function gainSkill(a, stars) {
  const name = crew.ids[a.id]; if (!TEAM.includes(name)) return;
  const id = skillOf(a.type), before = skillLevel(name, id), g = a.game || {};
  const gain = Math.round((1 + stars + (g.tests?.ok ? 1 : 0) + (g.mr ? 1 : 0)) * hub.traitK(name, "skill") * hub.learnBoost(name) * (hub.inspired.delete(name) ? 2 : 1));  // traits, inspiration (wants.js)
  (skillBook.xp[name] = skillBook.xp[name] || {})[id] = skillXp(name, id) + gain;
  saveSkills();
  const after = skillLevel(name, id);
  if (after > before) {
    const [, icon, label] = skillInfo(id);
    toast("COMPÉTENCE", `${name} passe niveau ${after} en ${label} ${icon}`, after >= 5 ? "Un vrai expert : le chef lui confiera ces missions en priorité." : "Le chef s'en souviendra pour les prochaines missions.", "lvl");
    sfx("level"); crewAdd(name, { moral: 10 }); hub.wantEvent(name, "level");
    const e = ents.get(a.id);
    if (e) { e.fxKind = "verify"; e.fxMsg = `${icon} niveau ${after} !`; e.fxUntil = performance.now() + 3000; }
  }
}

// the chief's pick for a new agent: the most skilled free dev for its kind of work, then the least tired
function bestDevFor(a, pool) {
  const id = skillOf(a.type), score = n => skillLevel(n, id) * 12 - mate(n).fatigue * 0.25 + mate(n).moral * 0.05;
  return pool.reduce((b, n) => score(n) > score(b) ? n : b);
}
function skillTag(name, type) {
  if (!TEAM.includes(name)) return "";
  const id = skillOf(type), [, icon] = skillInfo(id);
  return `${icon} niv. ${skillLevel(name, id)}`;
}

// rows of the Sims window: the work skills a dev has, best first (cooking stays below them)
function skillRow(icon, label, lvl, k) {
  return `<div class="skill"><span class="ic">${icon}</span><span class="nl">${esc(label.toUpperCase())}</span><span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < lvl ? "on" : i === lvl ? "part" : ""}"${i === lvl ? ` style="--k:${Math.round(k * 100)}%"` : ""}></i>`).join("")}</span><span class="lv">niv. ${lvl}</span></div>`;
}
export function workSkillsHtml(name) {
  const have = SKILLS.filter(([id]) => skillXp(name, id) > 0).sort((a, b) => skillXp(name, b[0]) - skillXp(name, a[0])).slice(0, 3);
  if (!have.length) return TEAM.includes(name) ? `<div class="skill muted"><span class="ic">💼</span><span>Pas encore de mission livrée : ses compétences montent avec ses missions.</span></div>` : "";
  return have.map(([id, icon, label]) => {
    const lvl = skillLevel(name, id), next = SKILL_XP[lvl], cur = SKILL_XP[lvl - 1];
    return skillRow(icon, label, lvl, next === undefined ? 1 : (skillXp(name, id) - cur) / (next - cur));
  }).join("");
}
// one line for the side panel of a dev
function skillsLine(name) {
  const have = SKILLS.filter(([id]) => skillXp(name, id) > 0).map(([id, icon, label]) => `${icon} ${label} ${skillLevel(name, id)}`);
  return `<p class="muted">Compétences : ${have.length ? esc(have.join(" · ")) : "aucune mission livrée pour l'instant"}</p>`;
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get bestDevFor() { return bestDevFor; }, get skillTag() { return skillTag; }, get skillsLine() { return skillsLine; } });
