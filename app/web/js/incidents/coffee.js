// The espresso machine breaks down: no coffee breaks until the chief fixes it.

import { hub } from "../hub.js";
import { ART } from "../svg/base.js";
import { Incident } from "./base.js";

class CoffeeBreakdown extends Incident {
  constructor() { super("coffee"); }
  start(t) { super.start(t); hub.toast("INCIDENT", "La machine à café est en panne !", "Clique dessus pour la réparer : sans elle, pas de pause café."); }
  draw(_t, blink) { ART.brokencoffee.draw(320, 48.4, { on: !!blink }); if (Math.random() < 0.02) hub.smoke(325, 50); this.mark(336, 44, blink); }
  hit(x, y) { return x >= 314 && x <= 336 && y >= 40 && y <= 68; }
  solve(t) { super.solve(t); hub.burst(325, 52, ["#fbaa08", "#f7f7f7", "#5aa9ff"], 16); Incident.reward("Machine à café réparée", "Les pauses café reprennent."); }
}
new CoffeeBreakdown();
