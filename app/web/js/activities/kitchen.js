// The kitchen counter: a coffee (a cup in hand) or a bite; cooking itself is in social.js.

import { px } from "../core/core.js";
import { SPRITES } from "../svg/sprites.js";
import { Activity } from "./base.js";

class KitchenActivity extends Activity {
  wall() { SPRITES.kitchen.draw(158, 30); }
  after(l) { px(l.x + 4, l.y - 13, 2.5, 3, "#f4f2ea"); px(l.x + 4, l.y - 13, 2.5, 0.8, "#6d4a2e"); }
}
new KitchenActivity({ id: "kitchen", label: "se fait un café", icon: "☕", task: "Se fait un café", spots: [{ x: 174, y: 84 }, { x: 198, y: 84 }],
  fx: { cafe: 5, ennui: -1 }, serves: ["faim", "cafe"], needs: { faim: 40 },
  chief: { fx: { faim: 40, cafe: 25 }, line: "Un petit encas 🍕" },
  lines: ["Qui a fini le lait ?", "Double espresso, minimum.", "Il est bon ce café."] });
