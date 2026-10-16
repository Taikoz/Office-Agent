// One of the office plants is thirsty and wilts until it is watered.

import { hub } from "../hub.js";
import { ART } from "../svg/base.js";
import { Incident } from "./base.js";

class ThirstyPlant extends Incident {
  constructor() { super("plant"); this.uid = null; }
  plants() { return hub.itemsIn("office").filter(it => hub.defOf(it.type).plant); }
  weight() { return this.plants().length ? 1 : 0; }  // no plant bought: none to water
  get at() { const p = this.uid && hub.itemByUid(this.uid); if (!p) return null; const [x0, y0, x1, y1] = hub.footOf(p); return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: 30 }; }
  start(t) { const ps = this.plants(); this.uid = ps[Math.floor(Math.random() * ps.length)]?.uid ?? null; super.start(t); hub.toast("ALERTE VERTE", "Une plante a soif", "Clique dessus pour l'arroser."); }
  draw() {}
  hit(x, y) { const p = this.uid && hub.itemByUid(this.uid); if (!p) return false; const [x0, y0, x1, y1] = hub.footOf(p); return x >= x0 - 1 && x <= x1 + 1 && y >= y0 - 1 && y <= y1 + 1; }
  solve(t) {
    super.solve(t);
    const a = this.at; this.uid = null;
    if (a) hub.rain(a.x, a.y - 10, "#5aa9ff"); Incident.reward("Plante arrosée", "Elle reprend des couleurs.");
  }
}
new ThirstyPlant();
