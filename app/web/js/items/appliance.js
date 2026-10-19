// Kitchen appliances: the same color styles (white, stainless, retro red or mint, matt black) recolor their art.

import { hub } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { RECIPES, shopFor } from "../social/kitchen.js";
import { say } from "../social/people.js";
import { pieAction } from "../ui/pie.js";
import { Item } from "./base.js";

export class Appliance extends Item {
  static COLORS = { blanc: null, inox: { "#f2f2ef": "#c9cdd5", "#d8d8d2": "#a7acb6", "#b8b8b2": "#8d929c" }, rouge: { "#f2f2ef": "#d64545", "#d8d8d2": "#ad3434", "#b8b8b2": "#8a2a2a" },
    menthe: { "#f2f2ef": "#9ad9c0", "#d8d8d2": "#77bfa3", "#b8b8b2": "#5ea28a" }, noir: { "#f2f2ef": "#34343e", "#d8d8d2": "#25252d", "#b8b8b2": "#1c1c24" },
    creme: { "#f2f2ef": "#f2e6c8", "#d8d8d2": "#d9c9a4", "#b8b8b2": "#bba982" }, bleu: { "#f2f2ef": "#3a6ab0", "#d8d8d2": "#2a5090", "#b8b8b2": "#1f3c70" },
    jaune: { "#f2f2ef": "#f2cf5a", "#d8d8d2": "#d9b13b", "#b8b8b2": "#b8922a" } };
  // names: { styleId: label } among COLORS
  static styles(names) { return Object.entries(names).map(([id, name]) => ({ id, name, sw: (Appliance.COLORS[id] || { "#f2f2ef": "#f2f2ef" })["#f2f2ef"], map: Appliance.COLORS[id] })); }
  // shared by the fridge and the stove: cook a recipe (social.js) or shop for one
  perform(it, id) {
    if (id.startsWith("shop:")) { shopFor(RECIPES.find(r => r.id === id.slice(5))); return true; }
    if (id.startsWith("cook:")) {
      if (!hub.kitchenReady()) say(CHIEF_NAME, "Il faut un frigo et une gazinière.");
      else pieAction("kitchen", null, id);
      return true;
    }
    return false;
  }
}
