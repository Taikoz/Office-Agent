// The chief's desk: ChiefOS opens when he sits there (ui/chiefos.js).

import { hub } from "../hub.js";
import { enqueue } from "../ui/actions.js";
import { Item } from "./base.js";

class ChiefDesk extends Item {
  pie() { return [["chiefos", "🖥️", "Ouvrir ChiefOS"]]; }
  act(_it, id) { if (id !== "chiefos") return false; enqueue("🖥️", "ChiefOS", hub.chiefToDesk); return true; }
}
new ChiefDesk({ type: "chiefdesk", cat: "bureau", name: "Bureau du chef", price: 1500, room: "office", unique: true, w: 34, d: 16, art: "isochiefdesk",
  spots: [{ x: 17, y: 24, face: [0, -1] }], desc: "Ton bureau, avec ChiefOS : questions, MR, tickets, rapport, comptes et équipe.",
  styles: [{ id: "noyer", name: "Noyer", sw: "#5c3d27" }, { id: "blanc", name: "Laqué blanc", sw: "#e6e2d8", map: { "#5c3d27": "#e6e2d8", "#8a6a4a": "#ffffff", "#4a3826": "#c8c4bc" } },
    { id: "noir", name: "Noir", sw: "#2a2a33", map: { "#5c3d27": "#2a2a33", "#8a6a4a": "#3a3a44", "#4a3826": "#1c1c24" } }] });
