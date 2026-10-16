// The fridge: a snack for the chief, the groceries (its ingredients, social.js), cooking with the stove.

import { hub } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { ART } from "../svg/base.js";
import { crewAdd } from "../sims/crew.js";
import { spend } from "../sims/money.js";
import { fridgeLine } from "../social/kitchen.js";
import { chiefDo, chiefTo, say } from "../social/people.js";
import { enqueue } from "../ui/actions.js";
import { Appliance } from "./appliance.js";

class Fridge extends Appliance {
  state(it, t) { return t < (it.openUntil || 0); }  // open a moment after a snack or the groceries
  pie() { return [["snack", "🥪", "Encas · § 5"], ["s:shop", "🛒", "Faire les courses…"], ["s:cook", "🍳", "Cuisiner…"]]; }
  act(it, id) {
    if (id !== "snack") return super.act(it, id);
    enqueue("🥪", "Encas du frigo", () => chiefDo(() => chiefTo(hub.frontOf(it), { id: "fridge", label: "fouille le frigo", pose: { back: true } }, () => {
      if (!spend(5, "Encas du frigo")) return;
      it.openUntil = performance.now() + 2200; crewAdd(CHIEF_NAME, { faim: 30 }); say(CHIEF_NAME, "🥪 Miam.", 2200);
    })));
    return true;
  }
  center() { return `<span class="muted">🧊 ${fridgeLine()}</span>`; }
}
new Fridge({ type: "fridge", cat: "cuisine", name: "Réfrigérateur", price: 500, room: "lounge", w: 18, h: 38, desc: "Encas pour le chef ; avec une gazinière, on peut cuisiner.",
  art: ART.fridge, styles: Appliance.styles({ blanc: "Blanc", inox: "Inox", rouge: "Rétro rouge", menthe: "Rétro menthe", noir: "Noir mat" }) });
