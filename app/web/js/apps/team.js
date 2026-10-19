// ChiefOS → 👥 Équipe: each member at a glance (mood, career, traits, best skill, desk, where, wants) and the agent
// type of their desk (one dev = one kind of agent, saved in team.json), the vacant posts to fill (careers.js), the pets.

import { hub } from "../hub.js";
import { ROLES, TEAM, specialty } from "../core/core.js";
import { toast } from "../sims/progress.js";
import { mate, moodWord } from "../sims/crew.js";
import { esc } from "../core/data.js";
import { SKILLS, skillLevel, skillXp } from "../sims/skills.js";
import { fmtSim, wallet } from "../sims/money.js";
import { devHasDesk } from "../world/build.js";
import { TRAITS, traitsOf } from "../sims/moods.js";
import { wantsFor } from "../sims/wants.js";
import { atHome, onMission } from "../sims/days.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

// the agent types one can give a desk: the user's agents, then Claude Code's own
const roleChoices = () => [...new Set([...Object.keys(OFFICE_CFG.agents || {}).filter(t => t !== "tech-lead"), "general-purpose", "Explore", "Plan", ...ROLES])];
const roleSelect = n => {
  const i = TEAM.indexOf(n), cur = ROLES[i] || "";
  return `<br><select class="teamrole" data-role-desk="${i}" aria-label="Agent de ${esc(n)}" title="Le type d'agent dont ${esc(n)} prend les missions">${roleChoices().map(t => `<option value="${esc(t)}"${t === cur ? " selected" : ""}>🤖 ${esc(specialty(t))}${t !== specialty(t).toLowerCase() ? ` (${esc(t)})` : ""}</option>`).join("")}</select>`;
};
async function saveRole(desk, type) {
  const roles = TEAM.map((_, i) => i === desk ? type : ROLES[i] || "general-purpose");
  if (DEMO) { ROLES.splice(0, ROLES.length, ...roles); return toast("👥 ÉQUIPE", "Démo", "Rôle changé pour cette page seulement."); }
  try {
    const r = await (await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ roles }) })).json();
    if (!r.ok) return toast("👥 ÉQUIPE", "Rôle non enregistré", r.output || r.error || "");
    ROLES.splice(0, ROLES.length, ...roles);
    toast("👥 ÉQUIPE", `${TEAM[desk]} prend les missions ${specialty(type)}`, "Valable dès le prochain agent de ce type.");
  } catch (_) { toast("👥 ÉQUIPE", "Serveur injoignable", ""); }
  renderChiefOs();
}

class TeamApp extends OsApp {
  constructor() { super("team", "👥", "Équipe", "#a3417d", { live: true }); }
  render() {
    return TEAM.map(n => {
      if (hub.isVacant(n)) return `<div class="osrow"><b>🪑 poste vacant</b><span class="muted">${esc(n)} a démissionné.</span><button data-recruit="${esc(n)}"${wallet.funds < hub.RECRUIT_PRICE ? " disabled" : ""}>Recruter · ${fmtSim(hub.RECRUIT_PRICE)}</button></div>`;
      const m = mate(n), best = SKILLS.filter(([id]) => skillXp(n, id) > 0).sort((a, b) => skillXp(n, b[0]) - skillXp(n, a[0]))[0];
      const where = onMission(n) ? "🖥️ en mission" : atHome(n) ? "🏡 à la maison" : "☕ salle de repos";
      return `<div class="osrow"><b>${esc(n)} <span style="color:${hub.moodColor(m.moral)}">◆</span> <small class="muted">${esc(hub.careerTitle(n))}</small>${roleSelect(n)}</b><span>${traitsOf(n).map(id => TRAITS[id].icon).join(" ")} · ${esc(moodWord(m))}${best ? ` · ${best[1]} niv. ${skillLevel(n, best[0])}` : ""}${!devHasDesk(n) ? " · 😠 sans bureau" : ""}</span><span class="muted">${where} · ${wantsFor(n).map(w => w.icon).join("")}</span></div>`;
    }).join("") + hub.petsRowHtml();
  }
  change(ev) { const t = ev.target; if (t.dataset?.roleDesk !== undefined) { saveRole(+t.dataset.roleDesk, t.value); t.blur(); } }
  click(b) {
    if (!b.dataset.recruit) return false;
    hub.recruit(b.dataset.recruit); renderChiefOs();
    return true;
  }
}
new TeamApp();
