// Brume's bowl (and Biscuit's): a click fills it (pets.js); full while it.on.

import { hub } from "../hub.js";
import { Item } from "./base.js";

class Bowl extends Item {
  pie(it) { return [["fill", "🐟", it.on ? "Gamelle pleine" : "Remplir · § 5", it.on ? "déjà pleine" : ""]]; }
  act(it, id) { if (id !== "fill") return false; hub.fillBowl(it); return true; }
}
new Bowl({ type: "bowl", cat: "animaux", name: "Gamelle", price: 80, room: "any", w: 10, d: 8, walkable: true, desc: "Pour Brume (et Biscuit). Clic : la remplir (§ 5).", art: "isobowl",
  styles: [{ id: "rouge", name: "Rouge", sw: "#d64545" }, { id: "bleue", name: "Bleue", sw: "#4090d7", map: { "#d64545": "#4090d7", "#ff6b6b": "#5aa9ff" } }] });
