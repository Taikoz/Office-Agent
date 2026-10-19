// The kitchen counter: a coffee (a cup in hand) or a bite; cooking itself is in social.js.

import { hash } from "../core/core.js";
import { cupHold } from "../world/scene.js";
import { SPRITES } from "../svg/sprites.js";
import { Activity } from "./base.js";

class KitchenActivity extends Activity {
  wall() { SPRITES.kitchen.draw(158, 30); }
  // at the counter: makes the coffee (hands on the machine), then drinks it, a sip now and then
  dress(l, opts, t) { const k = ((t / 1000 + hash(l.name)) % 14); return k < 3.5 ? { ...opts, arms: "reach", back: true, frame: Math.floor(t / 300) } : { ...opts, hold: cupHold(true, hash(l.name), t) }; }
}
new KitchenActivity({ id: "kitchen", label: "se fait un café", icon: "☕", task: "Se fait un café",
  fx: { cafe: 5, ennui: -1 }, serves: ["faim", "cafe"], needs: { faim: 40 },
  chief: { fx: { faim: 40, cafe: 25 }, line: "Un petit encas 🍕" },
  lines: ["Qui a fini le lait ?", "Double espresso, minimum.", "Il est bon ce café."] });
