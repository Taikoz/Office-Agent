// A window for any wall (construct.js): the sky of the hour and the weather behind the glass (svg/sky.js), curtains by style.

import { ART } from "../svg/base.js";
import { drawSky } from "../svg/sky.js";
import { Item } from "./base.js";

class WindowItem extends Item {
  artState(st) { return { style: st.curtain, color: st.color }; }
  behind(it, t) { drawSky(it.x + 6, it.y + 8, t); }
}
new WindowItem({ type: "window", cat: "fenetres", name: "Fenêtre à rideaux", price: 350, room: "any", kind: "wall", w: 58, h: 41, art2d: ART.window, desc: "Au mur, avec le ciel de l'heure et la météo des tests.",
  styles: [{ id: "velours", name: "Rideaux velours", sw: "#8f2b46", curtain: "velours", color: "#8f2b46" }, { id: "lin", name: "Rideaux lin", sw: "#e8e2d0", curtain: "lin", color: "#e8e2d0" },
    { id: "store", name: "Store", sw: "#c9a24b", curtain: "store", color: "#c9a24b" }, { id: "nu", name: "Sans rideaux", sw: "#8ec5ff", curtain: "aucun", color: "#8f2b46" }] });
