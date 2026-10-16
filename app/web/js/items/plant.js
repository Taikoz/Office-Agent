// A giant plant: a click waters it (drops for a moment).

import { CHIEF_NAME, px } from "../core/core.js";
import { ART } from "../svg/base.js";
import { crewAdd } from "../sims/crew.js";
import { Item } from "./base.js";

class Plant extends Item {
  over(it, t) { if (t < (it.wetUntil || 0)) for (let k = 0; k < 4; k++) px(it.x + 4 + k * 2.4, it.y + 8 + ((t / 90 + k * 3) % 8), 0.6, 1.2, "#8ec5ff"); }
  pie() { return [["water", "💧", "Arroser"]]; }
  act(it, id) { if (id !== "water") return false; it.wetUntil = performance.now() + 2500; crewAdd(CHIEF_NAME, { ennui: -2 }); return true; }
}
new Plant({ type: "plant", cat: "deco", name: "Plante géante", price: 300, room: "any", w: 16, h: 24, desc: "Clic : l'arroser.", art: ART.bigplant,
  styles: [{ id: "verte", name: "Verte", sw: "#3f9e4f" }, { id: "automne", name: "Automne", sw: "#e07a2f", map: { "#3f9e4f": "#e07a2f", "#2f7a3a": "#c45a1f", "#5fbf6d": "#f2a65a" } },
    { id: "blanc", name: "Pot blanc", sw: "#f4f2ea", map: { "#b0603a": "#e6e2d8", "#c9744a": "#f4f2ea" } }] });
