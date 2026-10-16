// A floor lamp: a click switches it on or off.

import { hub } from "../hub.js";
import { sfx } from "../sims/progress.js";
import { Item } from "./base.js";

export class Lamp extends Item {
  thumbState() { return true; }
  pie(it) { return [["lamp", it.on ? "🌑" : "💡", it.on ? "Éteindre" : "Allumer"]]; }
  act(it, id) { if (id !== "lamp") return false; it.on = !it.on; hub.saveBuild(); sfx("commit"); return true; }
}
new Lamp({ type: "lamp", cat: "lumiere", name: "Lampe à pied", price: 150, room: "any", w: 11, d: 11, art: "isolamp", walkable: false, light: 40,
  desc: "Clic : allumer, éteindre. Elle éclaire surtout le soir.",
  styles: [{ id: "noire", name: "Noire", sw: "#3d3d4a" }, { id: "laiton", name: "Laiton", sw: "#c9a24b", map: { "#3d3d4a": "#b8902f", "#55556a": "#e2c06a", "#33333f": "#8a6a1f" } },
    { id: "blanche", name: "Blanche", sw: "#e6e2d8", map: { "#3d3d4a": "#e6e2d8", "#55556a": "#ffffff", "#33333f": "#c8c4bc" } },
    { id: "rose", name: "Abat-jour rose", sw: "#f7c6d4", map: { "#f4efc9": "#f7c6d4", "#ffe8a3": "#ffc2d6", "#de8001": "#d64f7a" } }] });
