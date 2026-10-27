// ChiefOS → 🎫 Tickets: the tickets the agents work on, and the backlog to drop on a free desk.

import { clip, curSession, data, specialty } from "../core/core.js";
import { crew } from "../sims/crew.js";
import { esc, ticketLink } from "../core/data.js";
import { OsApp } from "./base.js";

class TicketsApp extends OsApp {
  constructor() { super("tickets", "🎫", "Tickets", "#7764d8", { live: true }); }
  render() {
    const agents = curSession()?.agents || [], name = a => crew.ids[a.id] || specialty(a.type);
    const mine = [...new Set(agents.map(a => a.ticket).filter(Boolean))], back = (data.backlog || []).filter(b => !mine.includes(b.id));
    const row = (id, who, extra) => { const yt = data.tickets?.[id]; return `<div class="osrow"><b>${ticketLink(id)}${yt?.state ? ` <small class="muted">${esc(yt.state)}</small>` : ""}</b><span>${esc(clip(yt?.summary || extra || "", 90))}</span><span class="muted">${esc(who)}</span></div>`; };
    return `<h4>EN COURS AVEC LES AGENTS</h4>${mine.length ? mine.map(id => row(id, agents.filter(a => a.ticket === id).map(name).join(", "))).join("") : `<p class="osnone">Aucun ticket en cours avec un agent.</p>`}
      <h4>BACKLOG · À GLISSER SUR UN BUREAU LIBRE</h4>${back.length ? back.map(b => row(b.id, "à prendre", b.summary)).join("") : `<p class="osfine">✓ Backlog vide : rien à prendre.</p>`}`;
  }
}
new TicketsApp();
