// One of the office plants is thirsty and wilts until it is watered.

import { hub } from "../hub.js";
import { ART } from "../svg/base.js";
import { Incident } from "./base.js";

class ThirstyPlant extends Incident {
  static PLANTS = [[300, 54], [6, 206]];
  constructor() { super("plant"); this.which = -1; }
  start(t) { super.start(t); this.which = Math.floor(Math.random() * ThirstyPlant.PLANTS.length); hub.toast("ALERTE VERTE", "Une plante a soif", "Clique dessus pour l'arroser."); }
  draw(_t, blink) { const [x, y] = ThirstyPlant.PLANTS[this.which]; ART.wilted.draw(x - 2, y - 6); this.mark(x + 5, y - 7, blink); }
  hit(x, y) { const [px0, py0] = ThirstyPlant.PLANTS[this.which]; return x >= px0 - 3 && x <= px0 + 13 && y >= py0 - 8 && y <= py0 + 14; }
  solve(t) {
    super.solve(t);
    const [x, y] = ThirstyPlant.PLANTS[this.which]; this.which = -1;
    hub.rain(x + 5, y + 6, "#5aa9ff"); Incident.reward("Plante arrosée", "Elle reprend des couleurs.");
  }
}
new ThirstyPlant();
