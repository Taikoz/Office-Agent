// Decoration without action: a poster on the wall, rugs on the floor.

import { ART } from "../svg/base.js";
import { Item } from "./base.js";

class Decoration extends Item {}
new Decoration({ type: "poster", cat: "cadres", name: "Poster", price: 120, room: "any", kind: "wall", w: 13, h: 18, desc: "Se pose au mur.", art2d: ART.poster,
  styles: [{ id: "nuit", name: "Nuit", sw: "#081746" }, { id: "rouge", name: "Rouge", sw: "#8f2b46", map: { "#081746": "#8f2b46" } }, { id: "vert", name: "Vert", sw: "#2f6e3c", map: { "#081746": "#2f6e3c" } }] });
