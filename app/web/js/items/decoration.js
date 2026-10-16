// Decoration without action: a poster on the wall, rugs on the floor.

import { ART } from "../svg/base.js";
import { Item } from "./base.js";

class Decoration extends Item {}
new Decoration({ type: "poster", cat: "deco", name: "Poster", price: 400, room: "any", wall: true, w: 13, h: 18, desc: "Se pose au mur.", art: ART.poster,
  styles: [{ id: "nuit", name: "Nuit", sw: "#081746" }, { id: "rouge", name: "Rouge", sw: "#8f2b46", map: { "#081746": "#8f2b46" } }, { id: "vert", name: "Vert", sw: "#2f6e3c", map: { "#081746": "#2f6e3c" } }] });
new Decoration({ type: "rug", cat: "deco", name: "Tapis", price: 250, room: "any", rug: true, w: 60, h: 16, desc: "Au sol, sous les meubles.", art: ART.rug,
  styles: [{ id: "marine", name: "Marine", sw: "#1b4590" }, { id: "bordeaux", name: "Bordeaux", sw: "#8f2b46", map: { "#163a7a": "#6b2d3c", "#1b4590": "#8f2b46" } },
    { id: "vert", name: "Vert", sw: "#2f6e3c", map: { "#163a7a": "#234f2d", "#1b4590": "#2f6e3c" } }, { id: "gris", name: "Gris", sw: "#5a5866", map: { "#163a7a": "#3a3a48", "#1b4590": "#5a5866", "#fbaa08": "#c8c4bc" } }] });
new Decoration({ type: "bigrug", cat: "deco", name: "Grand tapis", price: 600, room: "any", rug: true, w: 150, h: 12, desc: "Le grand tapis à liseré.", art: ART.bigrug,
  styles: [{ id: "marine", name: "Marine", sw: "#1b4590" }, { id: "bordeaux", name: "Bordeaux", sw: "#8f2b46", map: { "#163a7a": "#6b2d3c", "#1b4590": "#8f2b46" } }] });
