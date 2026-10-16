// The stove: cooking (with a fridge, social.js); its oven lights up while something cooks, and it can catch fire.

import { hub } from "../hub.js";
import { cooking, fire } from "../social/kitchen.js";
import { pieAction } from "../ui/pie.js";
import { Appliance } from "./appliance.js";

export class Stove extends Appliance {
  state(it) { return !!(cooking?.arrived && cooking.stage === 1 && hub.kitchenStove() === it); }
  pie() { return [fire ? ["fire", "🧯", "Éteindre le feu"] : ["s:cook", "🍳", "Cuisiner…"]]; }
  act(it, id) { if (id !== "fire") return super.act(it, id); pieAction("kitchen", null, "fire"); return true; }
}
new Stove({ type: "stove", cat: "cuisine", cook: "stove", name: "Gazinière", price: 400, room: "any", w: 14, d: 10, rots: 2, art: "isostove", spots: [{ x: 7, y: 18, face: [0, -1] }],
  desc: "Pour cuisiner (il faut aussi un frigo). Le four s'allume pendant la cuisson.", styles: Appliance.styles({ blanc: "Blanche", inox: "Inox", noir: "Noire", rouge: "Rétro rouge" }) });
