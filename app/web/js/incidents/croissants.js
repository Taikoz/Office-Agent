// A box of croissants by the podium (more likely on Fridays): handing them out cheers everyone up.

import { hub } from "../hub.js";
import { ents } from "../core/core.js";
import { ART } from "../svg/base.js";
import { crewAdd } from "../sims/crew.js";
import { loungeSay, loungers } from "../world/lounge.js";
import { Incident } from "./base.js";

class Croissants extends Incident {
  constructor() { super("croissants"); }
  weight() { return new Date().getDay() === 5 ? 3 : 1; }
  start(t) { super.start(t); hub.toast("LIVRAISON", "Des croissants sont arrivés 🥐", "Clique sur la boîte près du podium pour les distribuer."); }
  // near the podium (or the middle of the office)
  spot() { const p = hub.OFFICE_SPOTS.podium; return p ? { x: p.x + 24, y: p.y + 4 } : { x: 306, y: 96 }; }
  draw(_t, blink) { const c = this.spot(); ART.croissants.draw(c.x - 7, c.y - 10); this.mark(c.x, c.y - 12, blink); }
  hit(x, y) { const c = this.spot(); return Math.abs(x - c.x) <= 10 && Math.abs(y - c.y) <= 9; }
  solve(t) {
    super.solve(t);
    hub.burst(this.spot().x, this.spot().y, ["#de8001", "#fbaa08", "#f4efc9"], 20);
    for (const e of ents.values()) if (e.who && !e.leaving && !e.queued) { crewAdd(e.who, { moral: 6, fatigue: -3 }); if (e.seated) { e.fxKind = "commit"; e.fxMsg = "🥐 Miam !"; e.fxUntil = t + 2600; } }
    for (const l of loungers.values()) { crewAdd(l.name, { moral: 6 }); loungeSay(l.name, "Merci pour les croissants !", t); }
    Incident.reward("Croissants distribués", "Toute l'équipe a le moral.");
  }
}
new Croissants();
