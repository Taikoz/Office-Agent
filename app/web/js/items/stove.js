// The stove: cooking (with a fridge, social.js); its oven lights up while something cooks, and it can catch fire.

import { hub } from "../hub.js";
import { ART } from "../svg/base.js";
import { cooking, fire } from "../social/kitchen.js";
import { pieAction } from "../ui/pie.js";
import { Appliance } from "./appliance.js";

class Stove extends Appliance {
  state(it) { return !!(cooking?.arrived && cooking.stage === 1 && hub.kitchenStove() === it); }
  pie() { return [fire ? ["fire", "🧯", "Éteindre le feu"] : ["s:cook", "🍳", "Cuisiner…"]]; }
  act(it, id) { if (id !== "fire") return super.act(it, id); pieAction("kitchen", null, "fire"); return true; }
}
new Stove({ type: "stove", cat: "cuisine", name: "Gazinière", price: 400, room: "lounge", w: 14, h: 24, desc: "Pour cuisiner (il faut aussi un frigo). Le four s'allume pendant la cuisson.",
  art: ART.stove, styles: Appliance.styles({ blanc: "Blanche", inox: "Inox", noir: "Noire", rouge: "Rétro rouge" }) });
