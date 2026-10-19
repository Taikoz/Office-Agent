// The aquarium: three fish swimming back and forth; a click feeds them (they rise to the food).

import { CHIEF_NAME, px } from "../core/core.js";
import { ART } from "../svg/base.js";
import { crewAdd } from "../sims/crew.js";
import { sfx } from "../sims/progress.js";
import { Item } from "./base.js";

const fishFoods = new Map();  // uid → the food falling in the water
class Aquarium extends Item {
  isoState(_it, t) { return { frame: Math.floor(t / 500) % 8 }; }  // the fish swimming in the isometric view
  pie() { return [["feed", "🐟", "Nourrir les poissons"]]; }
  perform(it, id) {
    if (id !== "feed") return false;
    const f = fishFoods.get(it.uid) || [];
    for (let k = 0; k < 6; k++) f.push({ x: it.x + 5 + Math.random() * 16, y: it.y + 1 });
    fishFoods.set(it.uid, f); crewAdd(CHIEF_NAME, { ennui: -3 }); sfx("commit");
    return true;
  }
}
new Aquarium({ type: "aquarium", cat: "deco", name: "Aquarium", price: 1500, room: "any", desc: "Trois poissons. Clic : les nourrir.", w: 26, d: 12, rots: 2, art: "isoaquarium",
  styles: [{ id: "lagon", name: "Lagon", sw: "#3f8fe0" }, { id: "tropical", name: "Tropical", sw: "#2fbfb0", map: { "#3f8fe0": "#2fbfb0", "#5aa9ff": "#5fe0d0", "#0d2a6e": "#0d5a54" } }] });
