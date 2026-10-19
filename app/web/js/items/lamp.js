// A floor lamp: on its own in the evening (Sims style), or switched on or off by a click (and back to automatic).

import { hub } from "../hub.js";
import { sfx } from "../sims/progress.js";
import { Item } from "./base.js";

// lit when switched on, or on its own once the evening comes when nobody switched it (it.on unset); iso/rooms.js lights it
export const lampLit = it => it.on === true || (it.on == null && hub.nightLevel?.() > 0);
export class Lamp extends Item {
  thumbState() { return true; }
  state(it) { return lampLit(it); }
  pie(it) {
    const lit = lampLit(it);
    return [["lamp", lit ? "🌑" : "💡", lit ? "Éteindre" : "Allumer"], ...(it.on != null ? [["lampauto", "🌗", "Automatique (le soir)"]] : [])];
  }
  perform(it, id) {
    if (id === "lamp") it.on = !lampLit(it);
    else if (id === "lampauto") delete it.on;
    else return false;
    hub.saveBuild(); sfx("commit"); return true;
  }
  center(it) { return `<span class="muted">${it.on == null ? "🌗 automatique : s'allume le soir" : it.on ? "💡 allumée" : "🌑 éteinte"}</span>`; }
}
new Lamp({ type: "lamp", cat: "lumiere", name: "Lampe à pied", price: 150, room: "any", w: 11, d: 11, art: "isolamp", walkable: false, light: 40,
  desc: "Clic : allumer, éteindre. Elle éclaire surtout le soir.",
  styles: [{ id: "noire", name: "Noire", sw: "#3d3d4a" }, { id: "laiton", name: "Laiton", sw: "#c9a24b", map: { "#3d3d4a": "#b8902f", "#55556a": "#e2c06a", "#33333f": "#8a6a1f" } },
    { id: "blanche", name: "Blanche", sw: "#e6e2d8", map: { "#3d3d4a": "#e6e2d8", "#55556a": "#ffffff", "#33333f": "#c8c4bc" } },
    { id: "rose", name: "Abat-jour rose", sw: "#f7c6d4", map: { "#f4efc9": "#f7c6d4", "#ffe8a3": "#ffc2d6", "#de8001": "#d64f7a" } }] });
