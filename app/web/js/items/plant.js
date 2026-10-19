import { hub } from "../hub.js";
// A giant plant: a click waters it (drops for a moment).

import { CHIEF_NAME, px } from "../core/core.js";
import { crewAdd } from "../sims/crew.js";
import { Item } from "./base.js";

export class Plant extends Item {
  over(it, t, G) {  // watered: drops falling on it
    if (t >= (it.wetUntil || 0)) return;
    const [x0, y0, x1, y1] = this.footprint(it);
    for (let k = 0; k < 4; k++) G.put(0, 0, (x0 + x1) / 2, (y0 + y1) / 2, 30 - ((t / 90 + k * 3) % 8) * 2, () => px(-3 + k * 2.4, 0, 0.6, 1.2, "#8ec5ff"));
  }
  isoState(it) { return { dry: hub.Incident.get("plant")?.on && hub.Incident.get("plant").uid === it.uid }; }  // thirsty (incidents/plant.js)
  pie() { return [["water", "💧", "Arroser"]]; }
  act(it, id) { if (id !== "water") return false; it.wetUntil = performance.now() + 2500; crewAdd(CHIEF_NAME, { ennui: -2 }); return true; }
}
new Plant({ type: "plant", cat: "plantes", name: "Plante géante", price: 300, room: "any", w: 16, d: 16, art: "isobigplant", plant: true, desc: "Clic : l'arroser.",
  styles: [{ id: "verte", name: "Verte", sw: "#3f9e4f" }, { id: "automne", name: "Automne", sw: "#e07a2f", map: { "#3f9e4f": "#e07a2f", "#2f7a3a": "#c45a1f", "#5fbf6d": "#f2a65a" } },
    { id: "blanc", name: "Pot blanc", sw: "#f4f2ea", map: { "#b0603a": "#e6e2d8", "#c9744a": "#f4f2ea" } }] });
new Plant({ type: "potplant", cat: "plantes", name: "Plante en pot", price: 60, room: "any", w: 12, d: 12, art: "isopotplant", plant: true, desc: "Une petite plante verte. Clic : l'arroser.",
  styles: [{ id: "verte", name: "Verte", sw: "#3f9e4f" }] });
