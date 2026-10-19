// The espresso machine breaks down: no coffee breaks until the chief fixes it.

import { hub } from "../hub.js";
import { COFFEE } from "../core/core.js";
import { Incident } from "./base.js";

class CoffeeBreakdown extends Incident {
  constructor() { super("coffee"); this.uid = null; }
  machine() { return COFFEE.uid && hub.itemByUid(COFFEE.uid); }  // the one the team uses (world/place.js: the best of the office)
  weight() { return this.machine() ? 1 : 0; }  // no machine bought: nothing to break
  get at() { const m = this.uid && hub.itemByUid(this.uid); if (!m) return null; const [x0, y0, x1, y1] = hub.footOf(m); return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: 34 }; }
  start(t) { this.uid = this.machine()?.uid ?? null; super.start(t); hub.toast("INCIDENT", "La machine à café est en panne !", "Clique dessus pour la réparer : sans elle, pas de pause café."); }
  draw(_t, blink) { if (!this.at) { this.on = false; return; }  // sold or put away: nothing left to fix
    const a = this.at; if (a && Math.random() < 0.02) hub.smoke(a.x, a.y - 20); }
  hit(x, y) { const m = this.uid && hub.itemByUid(this.uid); if (!m) return false; const [x0, y0, x1, y1] = hub.footOf(m); return x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1; }
  solve(t) { super.solve(t); const a = this.at; if (a) hub.burst(a.x, a.y, ["#fbaa08", "#f7f7f7", "#5aa9ff"], 16); Incident.reward("Machine à café réparée", "Les pauses café reprennent."); }
}
new CoffeeBreakdown();
