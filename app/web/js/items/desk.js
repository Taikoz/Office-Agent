// A dev's desk (its computer is bought apart, items/furniture.js): a work station, given to the first team member
// without one (world/place.js syncDesks); sold, the dev works sitting on the floor with a laptop.

import { hub } from "../hub.js";
import { DESKS, TEAM, ents } from "../core/core.js";
import { esc } from "../core/data.js";
import { openPanel } from "../ui/panel.js";
import { enqueue } from "../ui/actions.js";
import { Item } from "./base.js";

class Desk extends Item {
  artState(st) { return { w: st.wood || "#8a6a4a", rgb: !!st.rgb }; }
  pie(it) {
    if (it.slot == null) return [];
    const busy = [...ents.values()].some(e => e.desk === DESKS[it.slot] && !e.leaving);
    return [["launch", "🚀", "Lancer un agent ici", busy ? "occupé" : ""], ["usepc", "💻", "Utiliser l'ordinateur", busy ? "occupé" : ""]];
  }
  perform(it, id) {
    if (id === "launch") openPanel(`launch:${it.slot}`);
    else if (id === "usepc") enqueue("💻", "Jouer sur l'ordinateur", () => hub.chiefToPc(it.slot));
    else return false;
    return true;
  }
  center(it) { return `<span class="muted">${it.slot == null ? "aucun dev de libre" : `bureau de ${esc(TEAM[it.slot])}`}</span>`; }
}
new Desk({ type: "desk", cat: "bureau", name: "Bureau", price: 350, room: "office", w: 36, d: 12, art: "isodeskbare", workstation: true, seat: [18, 22],
  surface: { z: 12.6 }, desc: "La place d'un dev (l'ordinateur et la chaise s'achètent à part). Sans bureau, il travaille par terre… et il le vit mal.",
  styles: [{ id: "chene", name: "Chêne", sw: "#8a6a4a", wood: "#8a6a4a" }, { id: "noyer", name: "Noyer", sw: "#5c3d27", wood: "#5c3d27" },
    { id: "blanc", name: "Laqué blanc", sw: "#e6e2d8", wood: "#e6e2d8" }, { id: "gamer", name: "Gamer RGB", sw: "#2a2a33", wood: "#2a2a33", rgb: true }] });

// the other desks: the colours of a style go to the art as they are (svg/iso.js)
export class StyledDesk extends Desk { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
const desk = (o, styles) => new StyledDesk({ cat: "bureau", room: "office", workstation: true, seat: [o.w / 2, o.d + 10], surface: { z: 12.6 }, ...o, styles });
// older
desk({ type: "deskschool", name: "Bureau d'écolier", price: 180, w: 32, d: 12, art: "isodeskschool", surface: { z: 12 }, desc: "Années 60 : pieds en tube, casier, plateau en formica. Petit prix." }, [
  { id: "orange", name: "Formica orange", sw: "#e8843c", top: "#e8843c" }, { id: "eau", name: "Vert d'eau", sw: "#8fcfc0", top: "#8fcfc0" },
  { id: "moutarde", name: "Moutarde", sw: "#d9b13b", top: "#d9b13b" }, { id: "bleu", name: "Bleu ciel", sw: "#6fa3d8", top: "#6fa3d8" }, { id: "creme", name: "Crème", sw: "#efe3c4", top: "#efe3c4", metal: "#8d929c" }]);
desk({ type: "deskmetal", name: "Bureau métallique", price: 240, w: 36, d: 13, art: "isodeskmetal", surface: { z: 12 }, desc: "L'administration des années 70 : tôle, caisson à poignées chromées, sous-main en lino." }, [
  { id: "gris", name: "Gris administration", sw: "#8d929c", c: "#8d929c", top: "#4a5a52" }, { id: "armee", name: "Vert armée", sw: "#5a6b48", c: "#5a6b48", top: "#3a4030" },
  { id: "beige", name: "Beige seventies", sw: "#cdbf9e", c: "#cdbf9e", top: "#6a5a40" }, { id: "olivetti", name: "Bleu machine à écrire", sw: "#4a6a8a", c: "#4a6a8a", top: "#2a3540" }]);
desk({ type: "deskministre", name: "Bureau ministre", price: 1100, w: 40, d: 14, art: "isodeskministre", surface: { z: 13 }, seat: [20, 24], desc: "Ancien, deux caissons, poignées en laiton, sous-main en cuir liseré d'or. Imposant." }, [
  { id: "acajou", name: "Acajou, cuir vert", sw: "#6b2f1d", w: "#6b2f1d", leather: "#2f5d3a" }, { id: "noyer", name: "Noyer, cuir bordeaux", sw: "#4a3020", w: "#4a3020", leather: "#6e1f2a" },
  { id: "merisier", name: "Merisier, cuir noir", sw: "#9a4a2a", w: "#9a4a2a", leather: "#1f1f24" }, { id: "chene", name: "Chêne, cuir marine", sw: "#8a6a4a", w: "#8a6a4a", leather: "#1d2f5a" }]);
// modern
desk({ type: "deskglass", name: "Bureau en verre", price: 520, w: 36, d: 12, art: "isodeskglass", surface: { z: 12 }, desc: "Plateau en verre sur tréteaux : léger, lumineux, on voit à travers." }, [
  { id: "clair", name: "Verre clair, chrome", sw: "#cfeef2", glass: "#cfeef2", leg: "#c9ccd6" }, { id: "fume", name: "Verre fumé, noir", sw: "#3a3f48", glass: "#3a3f48", leg: "#22222a" },
  { id: "bronze", name: "Verre bronze, laiton", sw: "#a0805a", glass: "#a0805a", leg: "#c9a24b" }, { id: "givre", name: "Verre givré, blanc", sw: "#f4f4f4", glass: "#f4f4f4", leg: "#e6e6e6" }]);
desk({ type: "deskstanding", name: "Bureau assis-debout", price: 780, w: 36, d: 12, art: "isodeskstanding", desc: "Motorisé, colonnes télescopiques, télécommande. Moderne et bon pour le dos." }, [
  { id: "blanc", name: "Blanc", sw: "#f0efe9", top: "#f0efe9", leg: "#e6e6e6" }, { id: "noir", name: "Noir", sw: "#2a2a30", top: "#2a2a30", leg: "#1c1c22" },
  { id: "chene", name: "Chêne clair, pieds blancs", sw: "#c9a77a", top: "#c9a77a", leg: "#e6e6e6" }, { id: "noyer", name: "Noyer, pieds noirs", sw: "#5c3d27", top: "#5c3d27", leg: "#1c1c22" },
  { id: "sauge", name: "Vert sauge", sw: "#9caf88", top: "#9caf88", leg: "#f0efe9" }]);
desk({ type: "deskgamer", name: "Bureau gamer", price: 690, w: 40, d: 14, art: "isodeskgamer", seat: [20, 24], desc: "Plateau carbone, tapis de souris XXL, bandeau LED, pieds en Z, crochet à casque." }, [
  { id: "rouge", name: "LED rouge", sw: "#ff3b5c", led: "#ff3b5c" }, { id: "bleu", name: "LED bleue", sw: "#3bb3ff", led: "#3bb3ff" },
  { id: "violet", name: "LED violette", sw: "#b48cff", led: "#b48cff" }, { id: "vert", name: "LED verte", sw: "#51cf66", led: "#51cf66" }]);
// design
desk({ type: "deskscandi", name: "Bureau scandinave", price: 460, w: 34, d: 12, art: "isodeskscandi", surface: { z: 12 }, desc: "Pieds fuselés évasés, tiroir en couleur, bois blond. Doux et lumineux." }, [
  { id: "chene", name: "Chêne, tiroir blanc", sw: "#c9a77a", w: "#c9a77a", drawer: "#f0efe9" }, { id: "noyer", name: "Noyer, tiroir sauge", sw: "#9caf88", w: "#6b4a30", drawer: "#9caf88" },
  { id: "frene", name: "Frêne, tiroir rose poudré", sw: "#e8b4b0", w: "#d9c7a5", drawer: "#e8b4b0" }, { id: "teck", name: "Teck, tiroir moutarde", sw: "#d9a43b", w: "#9a5a2a", drawer: "#d9a43b" }]);
desk({ type: "deskwave", name: "Bureau laqué cascade", price: 950, w: 36, d: 12, art: "isodeskwave", surface: { z: 12.4 }, desc: "Le plateau tombe jusqu'au sol des deux côtés, niche ouverte, liseré contrasté. Pièce de designer." }, [
  { id: "noir", name: "Noir laqué, or", sw: "#1e1e24", c: "#1e1e24", accent: "#c9a24b" }, { id: "blanc", name: "Blanc mat, argent", sw: "#ecebe6", c: "#ecebe6", accent: "#a7acb6" },
  { id: "terracotta", name: "Terracotta, sable", sw: "#c0603e", c: "#c0603e", accent: "#f2d0b0" }, { id: "nuit", name: "Bleu nuit, jaune", sw: "#1d2f5a", c: "#1d2f5a", accent: "#fbaa08" },
  { id: "sapin", name: "Vert sapin, crème", sw: "#2f5d4a", c: "#2f5d4a", accent: "#e6d8b0" }]);
