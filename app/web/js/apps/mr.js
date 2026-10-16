// ChiefOS → 🔀 Merge requests: the MRs opened by the agents of the session, and the way to 🦊 GitLab (all of mine).

import { clip, curSession, specialty } from "../core/core.js";
import { crew } from "../sims/crew.js";
import { esc, mrLabel, ticketLink } from "../core/data.js";
import { pipeTag } from "../agents/ticket.js";
import { OsApp } from "./base.js";

class MrApp extends OsApp {
  constructor() { super("mr", "🔀", "Merge requests", "#6e49cb", { live: true }); }
  render() {
    const agents = curSession()?.agents || [], name = a => crew.ids[a.id] || specialty(a.type), mrs = agents.filter(a => a.game?.mr);
    return `<h4>AGENTS DE LA SESSION (${mrs.length})</h4>` + (mrs.length ? mrs.map(a => `<div class="osrow"><b>${esc(name(a))}${a.ticket ? ` · ${ticketLink(a.ticket)}` : ""}</b><span><a href="${esc(a.game.mr)}" target="_blank" rel="noopener">${mrLabel(a.game.mr)} ↗</a>${pipeTag(a.game.mr)}</span><span class="muted">${esc(clip(a.description, 60))}</span></div>`).join("")
      : `<p class="muted">Pas de merge request ouverte par les agents de la session.</p>`)
      + `<h4>GITLAB</h4><div class="osrow"><b>🦊 Tes merge requests</b><span class="muted">à relire, les miennes, assignées ; le détail de chaque MR (discussions, CI, fichiers)</span><button data-os-app="gitlab">Ouvrir 🦊 GitLab</button></div>`;
  }
}
new MrApp();
