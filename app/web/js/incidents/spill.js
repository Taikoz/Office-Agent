// Brume knocks over a coffee somewhere on a walkway: a puddle to mop up.

import { hub } from "../hub.js";
import { CAT_NAME, LANE } from "../core/core.js";
import { ART } from "../svg/base.js";
import { Incident } from "./base.js";

class Spill extends Incident {
  constructor() { super("spill"); this.at = null; }
  start(t) {
    super.start(t);
    const y = [LANE, 150, 212][Math.floor(Math.random() * 3)], x = 60 + Math.random() * 260;
    this.at = { x, y };
    hub.cat.mode = "walk"; hub.cat.path = hub.catPath(x + 8, y); hub.cat.next = { mode: "sit" }; hub.cat.say = "Oups."; hub.cat.sayUntil = t + 6000;
    hub.toast("OUPS", `${CAT_NAME} a renversé un café`, "Clique sur la flaque pour nettoyer.");
  }
  draw(_t, blink) { const { x, y } = this.at; ART.spill.draw(x - 9, y - 4); this.mark(x, y - 5, blink); }
  hit(x, y) { return Math.abs(x - this.at.x) <= 9 && Math.abs(y - this.at.y) <= 6; }
  solve(t) {
    super.solve(t);
    const s = this.at; this.at = null;
    hub.burst(s.x, s.y - 2, ["#d5eeff", "#f7f7f7"], 14, 0.6); hub.cat.say = "Mrrp."; hub.cat.sayUntil = t + 1500;
    Incident.reward("Flaque nettoyée", "Le sol brille.");
  }
}
new Spill();
