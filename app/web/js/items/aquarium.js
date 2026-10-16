// The aquarium: three fish swimming back and forth; a click feeds them (they rise to the food).

import { CHIEF_NAME, px } from "../core/core.js";
import { ART } from "../svg/base.js";
import { crewAdd } from "../sims/crew.js";
import { sfx } from "../sims/progress.js";
import { Item } from "./base.js";

const fishFoods = new Map();  // uid → the food falling in the water
class Aquarium extends Item {
  over(it, t) {
    const food = fishFoods.get(it.uid) || [];
    for (let k = 0; k < 3; k++) {
      const period = 32, u = (t / (40 + k * 17) + k * 7 + it.uid) % period, back = u > 16, fx = it.x + 4 + (back ? period - u : u);
      const fy = it.y + 3 + k * 2.4 + Math.sin(t / 500 + k) * 0.8 - (food.length ? 1.5 : 0), col = ["#ff8f6b", "#fbaa08", "#ff6b6b"][k];
      ART.fish.draw(fx, fy, { color: col }, { flip: !back });
    }
    for (let i = food.length - 1; i >= 0; i--) { const f = food[i]; f.y += 0.3; px(f.x, f.y, 0.8, 0.8, "#c9a24b"); if (f.y > it.y + 9) food.splice(i, 1); }
    if (Math.floor(t / 900) % 3 === 0) px(it.x + 15 + Math.sin(t / 300), it.y + 1 + ((t / 100) % 8), 0.8, 0.8, "#d5eeff");
  }
  pie() { return [["feed", "🐟", "Nourrir les poissons"]]; }
  act(it, id) {
    if (id !== "feed") return false;
    const f = fishFoods.get(it.uid) || [];
    for (let k = 0; k < 6; k++) f.push({ x: it.x + 5 + Math.random() * 16, y: it.y + 1 });
    fishFoods.set(it.uid, f); crewAdd(CHIEF_NAME, { ennui: -3 }); sfx("commit");
    return true;
  }
}
new Aquarium({ type: "aquarium", cat: "loisirs", name: "Aquarium", price: 1500, room: "any", w: 26, h: 19, desc: "Trois poissons. Clic : les nourrir.", art: ART.aquarium,
  styles: [{ id: "lagon", name: "Lagon", sw: "#3f8fe0" }, { id: "tropical", name: "Tropical", sw: "#2fbfb0", map: { "#3f8fe0": "#2fbfb0", "#5aa9ff": "#5fe0d0", "#0d2a6e": "#0d5a54" } }] });
