// ChiefOS → 👥 Équipe: each member at a glance (mood, career, traits, best skill, desk, where, wants), the vacant
// posts to fill (careers.js) and the pets.

import { hub } from "../hub.js";
import { TEAM } from "../core/core.js";
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

class TeamApp extends OsApp {
  constructor() { super("team", "👥", "Équipe", "#a3417d", { live: true }); }
  render() {
    return TEAM.map(n => {
      if (hub.isVacant(n)) return `<div class="osrow"><b>🪑 poste vacant</b><span class="muted">${esc(n)} a démissionné.</span><button data-recruit="${esc(n)}"${wallet.funds < hub.RECRUIT_PRICE ? " disabled" : ""}>Recruter · ${fmtSim(hub.RECRUIT_PRICE)}</button></div>`;
      const m = mate(n), best = SKILLS.filter(([id]) => skillXp(n, id) > 0).sort((a, b) => skillXp(n, b[0]) - skillXp(n, a[0]))[0];
      const where = onMission(n) ? "🖥️ en mission" : atHome(n) ? "🏡 à la maison" : "☕ salle de repos";
      return `<div class="osrow"><b>${esc(n)} <span style="color:${hub.moodColor(m.moral)}">◆</span> <small class="muted">${esc(hub.careerTitle(n))}</small></b><span>${traitsOf(n).map(id => TRAITS[id].icon).join(" ")} · ${esc(moodWord(m))}${best ? ` · ${best[1]} niv. ${skillLevel(n, best[0])}` : ""}${!devHasDesk(n) ? " · 😠 sans bureau" : ""}</span><span class="muted">${where} · ${wantsFor(n).map(w => w.icon).join("")}</span></div>`;
    }).join("") + hub.petsRowHtml();
  }
  click(b) {
    if (!b.dataset.recruit) return false;
    hub.recruit(b.dataset.recruit); renderChiefOs();
    return true;
  }
}
new TeamApp();
