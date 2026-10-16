// A dev's desk with its computer, one per spot (slot). Drawn by drawDesk (scene.js) with its dev; sold, the dev works
// on a cardboard box.

import { hub } from "../hub.js";
import { DESKS, TEAM, ents } from "../core/core.js";
import { esc } from "../core/data.js";
import { openPanel } from "../ui/panel.js";
import { enqueue } from "../ui/actions.js";
import { Item } from "./base.js";

class Desk extends Item {
  draw() {}
  pie(it) {
    const busy = [...ents.values()].some(e => e.desk === DESKS[it.slot] && !e.leaving);
    return [["launch", "🚀", "Lancer un agent ici", busy ? "occupé" : ""], ["usepc", "💻", "Utiliser l'ordinateur", busy ? "occupé" : ""]];
  }
  act(it, id) {
    if (id === "launch") openPanel(`launch:${it.slot}`);
    else if (id === "usepc") enqueue("💻", "Jouer sur l'ordinateur", () => hub.chiefToPc(it.slot));
    else return false;
    return true;
  }
  center(it) { return `<span class="muted">bureau de ${esc(TEAM[it.slot])}</span>`; }
}
new Desk({ type: "desk", cat: "bureau", name: "Bureau + ordinateur", price: 600, room: "office", slot: true, w: 36, h: 30,
  desc: "La place d'un dev. Sans bureau, il travaille sur un carton… et il le vit mal.",
  styles: [{ id: "decor", name: "Bois du décor", sw: "#8a6a4a" }, { id: "noyer", name: "Noyer", sw: "#5c3d27", wood: "#5c3d27" },
    { id: "blanc", name: "Laqué blanc", sw: "#e6e2d8", wood: "#e6e2d8", screen: { "#1c1c24": "#d8d4cc", "#2a2a33": "#bdb8b0", "#33333f": "#f4f2ea" } },
    { id: "gamer", name: "Gamer RGB", sw: "#2a2a33", wood: "#2a2a33", rgb: true }] });
