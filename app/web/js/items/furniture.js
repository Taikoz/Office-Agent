// The furniture of the buy mode: work (computers, chairs, podium, console), coffee, kitchen, living room, games,
// decoration, outdoors, meeting room. An object tied to a break-room activity (act: activities/*.js) is where the team
// does it: its spots are the activity's places; a click lets the chief use it, or challenge someone on a game.

import { hub } from "../hub.js";
import { CAB, DESKS, S, STAND, ctx, curSession, cv, withCtx, drawerUntil, ents, inTransit, mmx, px, text } from "../core/core.js";
import { BOARD_AT, drawBoard } from "../world/scene.js";
import { FRAME, SHELF } from "../sims/progress.js";
import { TOURNEY, drawTournament } from "../games/base.js";
import { footOf, spotsOf } from "../world/place.js";
import { drawDeskScreen } from "../world/scene.js";
import { chiefPcSlot, drawChiefPcScreen } from "../world/build.js";
import { usersOf } from "../world/place.js";
import { clockNow, dayState } from "../sims/days.js";
import { ART } from "../svg/base.js";
import { enqueue } from "../ui/actions.js";
import { Item } from "./base.js";

export class Furniture extends Item {
  pie(it) {
    const a = this.act && hub.Activity.get(this.act);
    if (!a) return [];
    const out = [["use", a.icon, a.task]];
    if (a.duel) out.push(["duel", "⚔️", "Défier quelqu'un"]);
    return out;
  }
  act(it, id) {
    const a = this.act && hub.Activity.get(this.act);
    if (!a) return false;
    if (id === "use") { enqueue(a.icon, a.task, () => hub.chiefUseItem(it)); return true; }
    if (id === "duel") { hub.duelAt(it, a); return true; }
    return false;
  }
  center(it) { const n = usersOf(it); return n ? `<span class="muted">${n} en train d'en profiter</span>` : ""; }
}
const add = def => new Furniture(def);
const COLORS = (names) => Object.entries(names).map(([id, [name, c]]) => ({ id, name, sw: c, c }));
const CHAIR_C = COLORS({ ardoise: ["Ardoise", "#3a3f52"], marine: ["Marine", "#22336a"], rouge: ["Rouge", "#8f2b46"], vert: ["Vert", "#2f6e3c"], blanc: ["Blanc", "#c9ccd6"] });
const BAG_C = COLORS({ bleu: ["Bleu", "#1f75be"], orange: ["Orange", "#de8001"], rouge: ["Rouge", "#d64545"], vert: ["Vert", "#2f9e44"], violet: ["Violet", "#8f4fe0"] });
const WOOD = [{ id: "chene", name: "Chêne", sw: "#8a6a4a", w: "#8a6a4a" }, { id: "noyer", name: "Noyer", sw: "#5c3d27", w: "#5c3d27" }, { id: "blanc", name: "Laqué blanc", sw: "#e6e2d8", w: "#e6e2d8" }, { id: "noir", name: "Laqué noir", sw: "#2a2a33", w: "#3a3a44" }];
// the hour, the season, the Friday afterwork: what an object shows outdoors (a lit fire pit, the neon of the bar)
const envNow = t => { const h = clockNow().getHours(), dim = h >= 19 || h < 8, party = !!dayState.party; return { dim, party, lit: dim || party, season: hub.seasonNow(), still: hub.focusMode, t }; };
export class Colored extends Furniture { isoState(it, t) { return this.env ? this.env(envNow(t), it) : {}; } artState(st) { return { ...(st.c ? { c: st.c } : {}), ...(st.w ? { w: st.w } : {}), ...(st.kind ? { kind: st.kind } : {}), ...(st.towel ? { towel: st.towel } : {}) }; } }
const addC = def => new Colored(def);

/* ---------- work ---------- */
export class Computer extends Colored {
  // the screen(s): the work of the dev of this desk (or the chief's game), painted live on the monitor; screens:
  // [{ x, y, z, w, h }] where each is on the model (its front plane at y), tint: a CRT's phosphor (the style's)
  over(it, t, G) {
    if (it.rot >= 2) return;  // seen from behind
    const desk = it.on_ && hub.itemByUid(it.on_), slot = desk?.slot, d = slot != null ? DESKS[slot] : null, e = d && [...ents.values()].find(x => x.desk === d && !x.leaving);
    const power = hub.Happening.get("power")?.on, tint = hub.styleOf(it).tint;
    const draw = () => {
      if (power) return px(0, 0, 16, 10, "#08080c");
      if (d && chiefPcSlot() === slot) drawChiefPcScreen({ x: 8, y: 12 }, t); else drawDeskScreen({ x: 8, y: 12 }, e, t);
      if (tint) { ctx.globalAlpha = 0.4; px(0, 0, 16, 10, tint); ctx.globalAlpha = 1; for (let y = 0; y < 10; y += 1.4) px(0, y, 16, 0.4, "rgba(0,0,0,.3)"); }
    };
    for (const s of this.screens || [{ x: 2, y: 1.85, z: 3, w: 16, h: 8 }]) {
      const z = this.baseZ(it) + s.z, kx = s.w / 16, ky = s.h / 10;
      if (it.rot === 0) G.face("x", it.x + s.x, it.y + s.y, z, 0, 10, draw, kx, ky);
      else G.face("y", it.x + s.y, it.y + s.x + s.w, z, 0, 10, draw, kx, ky);  // turned: the screen on the side toward +x, read from front to back
    }
  }
}
new Computer({ type: "pc", cat: "electronique", name: "Ordinateur", price: 600, room: "any", kind: "top", w: 22, d: 8, art: "isopc", rots: 4,
  desc: "Se pose sur un bureau : l'écran montre le travail du dev. Clic : jouer dessus.", styles: [{ id: "bureau", name: "Bureautique", sw: "#c9ccd6", kind: "bureau" }] });
new Computer({ type: "pcgamer", cat: "electronique", name: "PC gamer", price: 1400, room: "any", kind: "top", w: 22, d: 8, art: "isopc", rots: 4,
  desc: "Une tour à LED pour les pauses jeu. Se pose sur un bureau.", styles: [{ id: "gamer", name: "Néon", sw: "#b48cff", kind: "gamer" }] });
addC({ type: "podium", cat: "bureau", name: "Podium du chef", price: 400, room: "office", unique: true, w: 28, d: 12, art: "isopodium", role: "podium", spots: [{ x: 14, y: 6, face: [0, 1] }],
  desc: "Là où tu diriges l'équipe.", styles: [{ id: "marine", name: "Marine", sw: "#11379e" }] });
addC({ type: "console", cat: "electronique", name: "Coin console", price: 800, room: "office", unique: true, w: 24, d: 7, rots: 2, art: "isoconsoletv", role: "console", spots: [{ x: 12, y: 20, face: [0, -1] }],
  desc: "Une télé et une console : tu y joues quand l'équipe n'a pas besoin de toi.", styles: WOOD });

/* ---------- seats ---------- */
const CHAIR_PARTS = [{ art: "isochairback", rect: [0, 0, 12, 2] }, { art: "isochair", rect: [0, 1, 12, 10] }];
addC({ type: "officechair", cat: "chaises", name: "Chaise de bureau", price: 120, room: "any", w: 12, d: 11, parts: CHAIR_PARTS, chair: true, walkable: true, spots: [{ x: 6, y: 6, face: [0, 1], lift: 3 }],
  desc: "Une chaise à roulettes, au bureau ou en réunion. Tourne-la vers le bureau.", styles: CHAIR_C });
// the shop's chairs: from scrap to throne (svg/iso.js chairArts); a back part and a seat part, the sitter between them
class ShopChair extends Colored { artState(st) { const { id: _i, name: _n, sw: _s, ...art } = st; return art; } }
const sty = (key, list) => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
function chair(type, name, price, tier, desc, styles, { w = 12, d = 11, seatZ = 9 } = {}) {
  const k = type.slice(5);
  new ShopChair({ type, cat: "chaises", name, price, room: "any", w, d, chair: true, walkable: true, thumbArt: `isoc${k}full`, desc: `${tier} · ${desc}`, styles,
    parts: k === "crate" ? [{ art: "isoccrate", rect: [0, 1, w, d - 1] }] : [{ art: `isoc${k}back`, rect: [0, 0, w, 2] }, { art: `isoc${k}`, rect: [0, 1, w, d - 1] }],
    spots: [{ x: w / 2, y: d / 2 + 0.5, face: [0, 1], lift: Math.max(0, Math.round(seatZ - 6.2)) }] });
}
chair("chaircrate", "Caisse de récup", 15, "💸 Pauvre", "Une caisse à fruits retournée. Ça dépanne.", sty("c", [["brut", "Bois brut", "#a8845a"], ["bleu", "Peinte en bleu", "#4a6a9a"], ["rouge", "Peinte en rouge", "#9a3a2a"], ["vert", "Peinte en vert", "#4a7a4a"]]), { seatZ: 8 });
chair("chairplastic", "Chaise de jardin en plastique", 25, "💸 Pauvre", "La monobloc, indestructible et moche.", sty("c", [["blanc", "Blanc", "#f0efe9"], ["vert", "Vert", "#3e7a46"], ["bleu", "Bleu", "#3a6ab0"], ["rouge", "Rouge", "#b8332a"]]), { seatZ: 8.6 });
chair("chairfolding", "Chaise pliante", 30, "💸 Pauvre", "En métal, celle des salles des fêtes.", sty("c", [["gris", "Gris", "#8d929c"], ["beige", "Beige", "#cdbf9e"], ["noir", "Noir", "#2a2a30"], ["kaki", "Kaki", "#6b6b48"]]));
chair("chairbistrot", "Chaise bistrot", 90, "🙂 Abordable", "Bois courbé et assise cannée, comme au café.", sty("w", [["noir", "Noir", "#1f1f24"], ["naturel", "Naturel", "#a8784a"], ["rouge", "Rouge", "#8f2b2b"], ["vert", "Vert", "#2f5d3a"]]), { seatZ: 8.4 });
chair("chairshell", "Chaise coque", 180, "✨ Moderne", "Coque moulée sur pieds en bois, un classique du mid-century.", sty("c", [["blanc", "Blanc", "#f0efe9"], ["jaune", "Jaune", "#e8c23a"], ["rose", "Rose", "#e8a4b0"], ["menthe", "Menthe", "#9fd8c4"], ["noir", "Noir", "#2a2a30", { c: "#2a2a30", leg: "#5c3d27" }]]));
chair("chairghost", "Chaise transparente", 220, "✨ Moderne", "Polycarbonate : elle disparaît presque.", sty("c", [["cristal", "Cristal", "#dff3f7"], ["fume", "Fumé", "#4a4f58"], ["ambre", "Ambre", "#e0a040"], ["rose", "Rose", "#f2b6c6"]]), { seatZ: 8.6 });
chair("chairmesh", "Chaise ergonomique", 260, "✨ Moderne", "Dossier en résille, appui-tête, accoudoirs : le dos dit merci.", sty("c", [["noir", "Noir", "#2a2a33"], ["gris", "Gris", "#8d929c"], ["bleu", "Bleu", "#2f5d9a"], ["vert", "Vert", "#3e8e5a"]]));
chair("chairgamer", "Fauteuil gamer", 350, "✨ Moderne", "Baquet de course, liserés de couleur, coussin de nuque.", sty("c", [["rouge", "Noir et rouge", "#d23a2a", { c: "#1c1c22", accent: "#d23a2a" }], ["bleu", "Noir et bleu", "#2a7ad0", { c: "#1c1c22", accent: "#2a7ad0" }],
  ["rose", "Blanc et rose", "#f28ab0", { c: "#f0efe9", accent: "#f28ab0" }], ["vert", "Noir et vert", "#3ec46a", { c: "#1c1c22", accent: "#3ec46a" }]]));
chair("chairchester", "Chaise Chesterfield", 700, "💼 Riche", "Capitonnée, accoudoirs roulés, clous de laiton.", sty("c", [["anglais", "Vert anglais", "#1f4a32"], ["brun", "Cuir brun", "#5a3420"], ["roi", "Bleu roi", "#1d3a8a"], ["bordeaux", "Bordeaux", "#6e1f2a"]]));
chair("chairwassily", "Fauteuil en tube", 750, "🎨 Créateur", "Tubes chromés et sangles de cuir, tout droit du Bauhaus.", sty("c", [["noir", "Cuir noir", "#1c1c22"], ["cognac", "Cognac", "#9a5a2a"], ["blanc", "Blanc", "#ece8e0"], ["gris", "Gris", "#6a6a72"]]), { seatZ: 7.8 });
chair("chairexec", "Fauteuil de direction", 900, "💼 Riche", "Cuir capitonné, dossier haut, piètement chromé : on s'y sent patron.", sty("c", [["noir", "Noir", "#1c1c22"], ["cognac", "Cognac", "#9a5a2a"], ["bordeaux", "Bordeaux", "#6e1f2a"], ["blanc", "Blanc", "#ece8e0"]]));
chair("chairpanton", "Chaise ruban", 600, "🎨 Créateur", "Une seule pièce en S, sans pieds : icône pop.", sty("c", [["rouge", "Rouge", "#d23a2a"], ["orange", "Orange", "#ef7d22"], ["blanc", "Blanc", "#f4f2ea"], ["noir", "Noir", "#1f1f24"], ["bleu", "Bleu", "#2a6fd0"]]));
chair("chairegg", "Fauteuil œuf", 1200, "🎨 Créateur", "Une coque enveloppante qui pivote : on s'y cache pour réfléchir.", sty("c", [["orange", "Orange", "#ef7d22", { c: "#ef7d22", inner: "#f7c08a" }], ["rouge", "Rouge", "#b8231f", { c: "#b8231f", inner: "#e87a70" }],
  ["blanc", "Blanc", "#f0efe9", { c: "#f0efe9", inner: "#c9ccd6" }], ["turquoise", "Turquoise", "#2a9a9a", { c: "#2a9a9a", inner: "#9fd8d0" }]]), { w: 14, d: 12, seatZ: 10 });
chair("chairlouis", "Fauteuil Louis XVI", 1500, "👑 Luxe", "Bois doré cannelé, velours, médaillon : versaillais.", sty("c", [["bleu", "Velours bleu", "#2a4a8a"], ["rouge", "Velours rouge", "#8f1f2a"], ["vert", "Velours vert", "#2f6e4c"], ["rose", "Rose poudré", "#d8a0a8"]]), { seatZ: 9.4 });
chair("chairthrone", "Trône", 3000, "👑 Luxe", "Doré à la feuille, dossier à couronne, rubis. Pour le chef, évidemment.", sty("c", [["pourpre", "Pourpre", "#5a1f6e"], ["rouge", "Rouge", "#8f1f2a"], ["emeraude", "Émeraude", "#1f6e4a"], ["noir", "Noir", "#1c1c22"]]), { seatZ: 8.6 });
// armchairs (read), sofas (watch the TV together), beanbags (chat): from scrap to gold, in colours (svg/iso.js seatArts)
function seatItem(type, cat, act, name, price, tier, desc, styles, { w, d, art, spots, lift = 2 }) {
  const parts = art ? null : [{ art: `iso${type}back`, rect: [0, 0, w, 6] }, { art: `iso${type}`, rect: [0, 6, w, d - 6] }];
  new ShopChair({ type, cat, act, name, price, room: "any", w, d, desc: `${tier} · ${desc}`, styles, ...(art ? { art, walkable: true } : { parts, thumbArt: `iso${type}full` }),
    spots: spots.map(([x, y]) => ({ x, y, face: [0, 1], lift })) });
}
const arm = (type, name, price, tier, desc, styles) => seatItem(type, "fauteuils", "read", name, price, tier, desc, styles, { w: 24, d: 18, spots: [[12, 12]] });
arm("armrecup", "Vieux fauteuil", 80, "💸 Pauvre", "Récupéré sur le trottoir : une pièce rapiécée, la bourre qui dépasse, un plaid pour cacher le reste.", sty("c", [["moutarde", "Moutarde", "#b8902a"], ["marron", "Marron", "#7a4a2a"], ["olive", "Vert olive", "#6b6b38"], ["gris", "Gris", "#7a7a80"]]));
arm("armrattan", "Fauteuil en rotin", 220, "🙂 Abordable", "Tressé, coussins moelleux : un air de vacances.", sty("w", [["blanc", "Naturel, coussin blanc", "#f0efe9", { w: "#c49a5a", k: "#f0efe9" }], ["vert", "Naturel, coussin vert", "#7a9a6a", { w: "#c49a5a", k: "#7a9a6a" }],
  ["noir", "Noir, coussin beige", "#2a2a30", { w: "#3a3a40", k: "#d9c7a5" }], ["miel", "Miel, coussin terracotta", "#c0603e", { w: "#b07a3a", k: "#c0603e" }]]));
arm("armcocoon", "Fauteuil cocon", 520, "✨ Moderne", "Arrondi, en tissu bouclette : on s'y love.", sty("c", [["ecru", "Bouclette écru", "#ece4d4"], ["terracotta", "Terracotta", "#c0603e"], ["sauge", "Vert sauge", "#9caf88"], ["gris", "Gris perle", "#b8b8bc"]]));
arm("armrecliner", "Fauteuil relax", 650, "✨ Moderne", "Inclinable avec appui-tête et levier : la sieste est garantie.", sty("c", [["gris", "Gris", "#6a6a72"], ["noir", "Noir", "#2a2a30"], ["bleu", "Bleu", "#2f4a7a"], ["chocolat", "Chocolat", "#4a3020"]]));
arm("armclub", "Fauteuil club", 1100, "💼 Riche", "Cuir patiné, accoudoirs ronds : celui du fumoir.", sty("c", [["cognac", "Cognac", "#9a5a2a"], ["chocolat", "Chocolat", "#4a2a1a"], ["noir", "Noir", "#1c1c22"], ["vert", "Vert anglais", "#1f4a32"]]));
arm("armlounge", "Fauteuil lounge", 2200, "🎨 Créateur", "Coques en bois cintré, cuir capitonné, pied pivotant : l'icône des années 50.", sty("c", [["noyer", "Noyer, cuir noir", "#1c1c22", { w: "#5c3d27", c: "#1c1c22" }], ["palissandre", "Palissandre, cognac", "#9a5a2a", { w: "#3a2218", c: "#9a5a2a" }],
  ["chene", "Chêne, cuir blanc", "#ece8e0", { w: "#c9a77a", c: "#ece8e0" }], ["bordeaux", "Noyer, bordeaux", "#6e1f2a", { w: "#5c3d27", c: "#6e1f2a" }]]));
arm("armbergere", "Bergère dorée", 2500, "👑 Luxe", "Bois sculpté à la feuille d'or, velours : digne d'un salon royal.", sty("c", [["bleu", "Velours bleu", "#2a4a8a"], ["rouge", "Velours rouge", "#8f1f2a"], ["vert", "Velours vert", "#2f6e4c"], ["rose", "Rose poudré", "#d8a0a8"]]));
const sofa = (type, name, price, tier, desc, styles, w, n) => seatItem(type, "canapes", "sofa", name, price, tier, desc, styles, { w, d: 22, lift: 3, spots: Array.from({ length: n }, (_, i) => [Math.round(w * (i + 1) / (n + 1)), 14]) });
sofa("sofaold", "Canapé défoncé", 200, "💸 Pauvre", "Un deux places fatigué : un coussin qui s'enfonce, une tache, la bourre qui sort.", sty("c", [["marron", "Marron", "#7a4a2a"], ["vert", "Vert bouteille", "#2f5d3a"], ["orange", "Orange 70s", "#c8682a"], ["gris", "Gris", "#6a6a72"]]), 40, 2);
sofa("sofafuton", "Banquette futon", 280, "💸 Pauvre", "Un matelas plié sur des lattes en pin.", sty("c", [["noir", "Noir", "#1c1c22"], ["rouge", "Rouge", "#8f2b2b"], ["bleu", "Bleu", "#2a4a7a"], ["ecru", "Écru", "#ddd2bb"]]), 44, 2);
sofa("sofa2", "Canapé deux places", 450, "🙂 Abordable", "En tissu, pieds en bois : simple et confortable.", sty("c", [["gris", "Gris", "#8d929c"], ["bleu", "Bleu", "#4a6a9a"], ["vert", "Vert", "#5a8a6a"], ["rose", "Rose", "#d8a0a8"]]), 40, 2);
sofa("sofamodern", "Canapé moderne", 900, "✨ Moderne", "Trois places bas, pieds métal fins, coussins carrés.", sty("c", [["anthracite", "Anthracite", "#3a3f48"], ["canard", "Bleu canard", "#1f5a6a"], ["moutarde", "Moutarde", "#c89a2a"], ["beige", "Beige", "#cdbf9e"], ["terracotta", "Terracotta", "#b8583a"]]), 56, 3);
sofa("sofacurve", "Canapé velours côtelé", 1500, "🎨 Créateur", "Velours à larges côtes, socle noir, esprit seventies.", sty("c", [["emeraude", "Émeraude", "#1f6e4a"], ["rose", "Vieux rose", "#c8848c"], ["ocre", "Ocre", "#c08a2a"], ["nuit", "Bleu nuit", "#1d2f5a"]]), 58, 3);
sofa("sofachester", "Chesterfield trois places", 1800, "💼 Riche", "Cuir capitonné, accoudoirs roulés, clous de laiton.", sty("c", [["brun", "Cuir brun", "#5a3420"], ["anglais", "Vert anglais", "#1f4a32"], ["bordeaux", "Bordeaux", "#6e1f2a"], ["noir", "Noir", "#1c1c22"]]), 58, 3);
sofa("sofacloud", "Canapé nuage", 2400, "🎨 Créateur", "Des coussins énormes et moelleux : on s'y enfonce.", sty("c", [["blanc", "Blanc", "#f0efe9"], ["perle", "Gris perle", "#c9c9cf"], ["rose", "Rose", "#f0c4cc"], ["ciel", "Bleu ciel", "#bcd8f0"]]), 60, 3);
sofa("sofabaroque", "Canapé baroque", 4000, "👑 Luxe", "Cadre doré sculpté, velours capitonné, trois couronnes au dossier.", sty("c", [["rouge", "Velours rouge", "#8f1f2a"], ["bleu", "Bleu roi", "#2a3a8a"], ["vert", "Vert empire", "#1f5a3a"], ["noir", "Noir", "#1c1c22"]]), 60, 3);
const pf = (type, name, price, tier, desc, styles, w, d, lift = 0) => seatItem(type, "poufs", "chat", name, price, tier, desc, styles, { w, d, art: `iso${type}`, lift, spots: [[w / 2, d / 2]] });
pf("poufpneu", "Pouf pneu", 30, "💸 Pauvre", "Un vieux pneu, un coussin dessus : la récup' a du style.", sty("c", [["rouge", "Coussin rouge", "#d23a2a"], ["bleu", "Coussin bleu", "#2a6fd0"], ["jaune", "Coussin jaune", "#e8c23a"], ["vert", "Coussin vert", "#3e8e5a"]]), 16, 16, 1);
pf("pouftricot", "Pouf tricoté", 90, "🙂 Abordable", "En grosse maille, tout doux.", sty("c", [["ecru", "Écru", "#ece4d4"], ["gris", "Gris", "#9a9aa0"], ["moutarde", "Moutarde", "#d9a43b"], ["rose", "Rose", "#e8b4b0"], ["vert", "Vert", "#8aa878"]]), 14, 14);
pf("poufcube", "Pouf cube", 160, "✨ Moderne", "Un cube de velours sur petits pieds.", sty("c", [["bleu", "Bleu", "#2a6fd0"], ["vert", "Vert", "#2f6e4c"], ["rose", "Rose", "#d88aa0"], ["moutarde", "Moutarde", "#c89a2a"]]), 14, 14, 1);
pf("poufpoire", "Pouf poire géant", 180, "✨ Moderne", "Un énorme sac de billes où l'on s'écroule.", sty("c", [["orange", "Orange", "#ef7d22"], ["violet", "Violet", "#7a4ab0"], ["vert", "Vert pomme", "#6ac04a"], ["gris", "Gris", "#6a6a72"]]), 20, 16);
pf("poufcuir", "Pouf capitonné", 450, "💼 Riche", "Cuir capitonné, cerclé et pieds en laiton.", sty("c", [["noir", "Noir", "#1c1c22"], ["cognac", "Cognac", "#9a5a2a"], ["blanc", "Blanc", "#ece8e0"], ["bordeaux", "Bordeaux", "#6e1f2a"]]), 16, 16, 1);
pf("poufgalets", "Poufs galets", 600, "🎨 Créateur", "Trois galets de mousse de tailles différentes.", sty("c", [["sauge", "Sauge", "#9caf88"], ["sable", "Sable", "#d9c7a5"], ["ardoise", "Ardoise", "#5a6070"], ["corail", "Corail", "#e88a6a"]]), 22, 16, 1);
pf("poufmaroc", "Pouf marocain brodé", 900, "👑 Luxe", "Cuir tanné à la main, broderies au fil d'or.", sty("c", [["cognac", "Cognac", "#9a5a2a"], ["rouge", "Rouge", "#8f1f2a"], ["bleu", "Bleu Majorelle", "#2a3ab0"], ["vert", "Vert", "#1f6e4a"]]), 16, 16, 1);
addC({ type: "stool", cat: "chaises", name: "Tabouret", price: 60, room: "any", w: 10, d: 10, art: "isostool", chair: true, walkable: true, desc: "Autour d'une table.", styles: [{ id: "bois", name: "Bois", sw: "#8a6a4a" }] });
addC({ type: "barstool", cat: "chaises", name: "Tabouret de bar", price: 90, room: "any", w: 8, d: 8, art: "isobarstool", chair: true, walkable: true, desc: "Haut, devant un bar.", styles: [{ id: "orange", name: "Orange", sw: "#de8001" }] });
addC({ type: "cushion", cat: "poufs", name: "Coussin de sol", price: 40, room: "any", w: 14, d: 10, art: "isocushion", chair: true, walkable: true, desc: "Pour s'asseoir par terre.", styles: BAG_C });
addC({ type: "beanbag", cat: "poufs", name: "Pouf", price: 150, room: "any", w: 18, d: 14, art: "isobeanbag", act: "chat", walkable: true, spots: [{ x: 9, y: 7, face: [0, 1] }],
  desc: "Pour papoter (il en faut deux).", styles: BAG_C });
addC({ type: "armchair", cat: "fauteuils", name: "Fauteuil", price: 450, room: "any", w: 24, d: 18, act: "read", parts: [{ art: "isoarmback", rect: [0, 0, 24, 6] }, { art: "isoarmseat", rect: [0, 6, 24, 12] }],
  spots: [{ x: 12, y: 12, face: [0, 1], lift: 2 }], desc: "Pour lire au calme.", styles: [{ id: "cognac", name: "Cognac", sw: "#b85905" }] });
addC({ type: "sofa", cat: "canapes", name: "Canapé", price: 900, room: "any", w: 56, d: 22, act: "sofa", parts: [{ art: "isosofaback", rect: [0, 0, 56, 6] }, { art: "isosofa", rect: [0, 6, 56, 16] }],
  spots: [14, 28, 42].map(x => ({ x, y: 14, face: [0, 1], lift: 3 })), desc: "Trois places, face à la télé.", styles: [{ id: "bleu", name: "Bleu", sw: "#1f75be" }] });

/* ---------- coffee, kitchen ---------- */
addC({ type: "espresso", cat: "cafe", name: "Machine à espresso", price: 900, room: "any", w: 22, d: 7, rots: 2, art: "isocoffee", role: "coffee", act: "kitchen", spots: [{ x: 11, y: 15, face: [0, -1] }],
  desc: "Sur son meuble : la pause café de l'équipe (au bureau) et un café en salle de repos.", styles: [{ id: "inox", name: "Inox", sw: "#c9cdd5" }] });
addC({ type: "counter", cat: "cuisine", name: "Plan de travail", price: 700, room: "any", w: 42, d: 10, rots: 2, art: "isocounter", act: "kitchen", surface: { z: 16.4 },
  spots: [{ x: 12, y: 18, face: [0, -1] }, { x: 30, y: 18, face: [0, -1] }], desc: "Évier, cafetière, planche à découper.", styles: [{ id: "marine", name: "Marine", sw: "#11379e" }] });
addC({ type: "dining", cat: "tables", name: "Table à manger", price: 450, room: "any", w: 48, d: 18, art: "isodining", role: "table", surface: { z: 12.7 },
  spots: [{ x: 12, y: -4, face: [0, 1] }, { x: 36, y: -4, face: [0, 1] }, { x: 12, y: 24, face: [0, -1] }, { x: 36, y: 24, face: [0, -1] }],
  desc: "Les repas de l'équipe (quatre places).", styles: [{ id: "vichy", name: "Nappe vichy", sw: "#ff6b6b" }] });

/* ---------- living room ---------- */
class Tv extends Colored { isoState(it) { return { on: hub.itemsIn(it.room).some(o => hub.defOf(o.type).act === "sofa" && usersOf(o) > 0), frame: Math.floor(performance.now() / 700) % 4 }; } }
new Tv({ type: "tvunit", cat: "electronique", name: "Meuble télé", price: 700, room: "any", w: 26, d: 8, art: "isotvunit", desc: "S'allume quand quelqu'un s'installe sur le canapé.", styles: WOOD });
addC({ type: "bookshelf", cat: "rangement", name: "Bibliothèque", price: 350, room: "any", w: 26, d: 7, rots: 2, art: "isobookshelf", desc: "Des livres plein les étagères.", styles: WOOD });
addC({ type: "lowtable", cat: "tables", name: "Table basse", price: 200, room: "any", w: 28, d: 12, art: "isolowtable", env: e => ({ lit: e.lit }), surface: { z: 7.6 }, desc: "Avec sa lanterne.", styles: [{ id: "teck", name: "Teck", sw: "#a0764e" }] });

/* ---------- games ---------- */
class Game extends Colored {}
new (class extends Game { isoState(it, t) { const on = usersOf(it) > 0; return { frame: Math.floor(t / (on ? 250 : 600)) % 2, playing: on }; } })(
  { type: "arcade", cat: "loisirs", name: "Borne d'arcade", price: 2500, room: "any", w: 22, d: 14, rots: 2, art: "isoarcade", act: "arcade", spots: [{ x: 11, y: 21, face: [0, -1] }], desc: "Un shoot'em up et un mode démo.", styles: [{ id: "violet", name: "Violet", sw: "#3b1d6e" }] });
new (class extends Game { isoState(it) { return { idle: !usersOf(it) }; } })(
  { type: "pingpong", cat: "loisirs", name: "Table de ping-pong", price: 1200, room: "any", w: 68, d: 20, art: "isopingpong", act: "pingpong", spots: [{ x: -6, y: 10, face: [1, 0] }, { x: 74, y: 10, face: [-1, 0] }], desc: "Pour deux. Clic : défier quelqu'un.", styles: [{ id: "vert", name: "Vert", sw: "#1f8a5a" }] });
new (class extends Game { isoState(it, t) { return { shift: usersOf(it) ? Math.round(Math.sin(t / 160) * 2) / 2 : 0 }; } })(
  { type: "babyfoot", cat: "loisirs", name: "Baby-foot", price: 1100, room: "any", w: 44, d: 24, art: "isobabyfoot", act: "babyfoot", spots: [{ x: 22, y: -8, face: [0, 1] }, { x: 22, y: 32, face: [0, -1] }], desc: "Rouges contre bleus. Clic : défier quelqu'un.", styles: [{ id: "bois", name: "Bois", sw: "#8a5d3a" }] });
new (class extends Game { isoState(it, t) { const on = usersOf(it) > 0; return { frame: on ? Math.floor(t / 300) % 4 : 0, on }; } })(
  { type: "karaoke", cat: "loisirs", name: "Scène de karaoké", price: 1800, room: "any", w: 48, d: 32, art: "isostage", act: "karaoke", spots: [{ x: 24, y: 24, face: [0, 1], lift: 4 }], desc: "Enceintes, projecteur, micro.", styles: [{ id: "violet", name: "Violet", sw: "#7a44ad" }] });
new (class extends Game { isoState(it, t) { return { frame: usersOf(it) > 1 ? Math.floor(t / 2200) % 4 : 0 }; } })(
  { type: "gametable", cat: "tables", name: "Table de jeux", price: 300, room: "any", w: 34, d: 12, art: "isogametable", act: "boardgame", spots: [{ x: -8, y: 6, face: [1, 0] }, { x: 42, y: 6, face: [-1, 0] }], desc: "Un jeu de société pour deux.", styles: [{ id: "bois", name: "Bois", sw: "#7a4b32" }] });

class Dartboard extends Furniture {
  state(it, t) { return usersOf(it) ? Math.floor(t / 1500) % 4 : 0; }
  artFor(_style, darts) { return { darts }; }
}
new Dartboard({ type: "dartboard", cat: "loisirs", name: "Cible de fléchettes", price: 300, room: "any", kind: "wall", w: 14, h: 14, art2d: ART.dartboard, act: "darts", wallSpot: 34,
  desc: "Au mur. Clic : défier quelqu'un.", styles: [{ id: "classique", name: "Classique", sw: "#2f9e44" }] });

/* ---------- decoration ---------- */
addC({ type: "olive", cat: "plantes", name: "Olivier", price: 450, room: "any", w: 22, d: 22, art: "isoolive", env: e => ({ season: e.season }), desc: "Dans un grand bac.", styles: [{ id: "vert", name: "Vert", sw: "#7a9a5a" }] });
addC({ type: "planter", cat: "plantes", name: "Jardinière", price: 200, room: "any", w: 32, d: 10, art: "isoplanter", env: e => ({ season: e.season }), desc: "Des fleurs selon la saison.", styles: [{ id: "bois", name: "Bois", sw: "#7a5636" }] });
class TeamPlant extends Furniture { isoState(_it, t) { const wk = hub.game?.week, n = Math.min(10, wk?.mr || 0), dry = !wk?.lastMr || Date.now() / 1000 - wk.lastMr > 2 * 86_400; return { n, dry, frame: Math.floor(t / 900) % 2 }; } }
new TeamPlant({ type: "teamplant", cat: "plantes", name: "Plante de l'équipe", price: 100, room: "any", unique: true, w: 18, d: 18, art: "isoteamplant", plant: true,
  desc: "Elle pousse avec les MR de la semaine et fane sans MR pendant deux jours.", styles: [{ id: "verte", name: "Verte", sw: "#3f9e4f" }] });

/* ---------- outdoors ---------- */
addC({ type: "bar", cat: "exterieur", name: "Bar", price: 2200, room: "any", w: 88, d: 26, rots: 2, art: "isobar", env: e => ({ neon: e.lit }), surface: { z: 22, rect: [0, 12, 88, 14] }, desc: "Comptoir, bouteilles, néon.", styles: [{ id: "bois", name: "Bois", sw: "#8a5d3a" }] });
addC({ type: "grill", cat: "exterieur", name: "Barbecue", price: 600, room: "any", w: 20, d: 14, art: "isogrill", env: e => ({ on: e.party || e.season === "été" }), desc: "S'allume pour l'afterwork.", styles: [{ id: "noir", name: "Noir", sw: "#1c1c24" }] });
addC({ type: "firepit", cat: "exterieur", name: "Brasero", price: 700, room: "any", w: 28, d: 24, art: "isofirepit", env: e => ({ lit: e.lit || e.season === "hiver", frame: e.still ? 0 : Math.floor(e.t / 160) % 3 }), desc: "Allumé le soir.", styles: [{ id: "pierre", name: "Pierre", sw: "#8d929c" }] });
addC({ type: "parasol", cat: "exterieur", name: "Parasol", price: 250, room: "any", w: 16, d: 16, art: "isoparasol", walkable: false, desc: "À rayures.", styles: [{ id: "jaune", name: "Jaune et marine", sw: "#fbaa08" }] });
addC({ type: "pergola", cat: "exterieur", name: "Pergola et banquet", price: 3000, room: "any", w: 122, d: 48, art: "isopergola", env: e => ({ season: e.season }), desc: "Une grande table sous une treille.", styles: [{ id: "chene", name: "Chêne", sw: "#8a6a4a" }] });
addC({ type: "outsofa", cat: "exterieur", name: "Canapé d'extérieur", price: 1100, room: "any", w: 92, d: 20, rots: 2, art: "isooutsofa", desc: "Teck et coussins.", styles: [{ id: "creme", name: "Crème", sw: "#efe6d2" }] });
addC({ type: "chaise", cat: "exterieur", name: "Transat", price: 250, room: "any", w: 28, d: 12, rots: 2, art: "isochaise", chair: true, desc: "Avec sa serviette.",
  styles: [{ id: "rouge", name: "Serviette rouge", sw: "#ff6b6b", towel: "#ff6b6b" }, { id: "verte", name: "Serviette verte", sw: "#51cf66", towel: "#51cf66" }, { id: "bleue", name: "Serviette bleue", sw: "#5aa9ff", towel: "#5aa9ff" }] });

class Chalkboard extends Colored {
  over(it, _t, G) {  // the afterwork's menu, chalked on the board
    if (it.rot >= 2) return;
    const e = envNow(performance.now()), grill = hub.itemsIn(it.room).some(o => o.type === "grill") && (e.party || e.season === "été");
    const words = () => { text("AFTERWORK", 9.5, -15, "#f2f2f2", 3.2, "center"); text(e.party ? "C'EST PARTI !" : "VEN. 17 H", 9.5, -10, e.party ? "#fbaa08" : "#cfe8d6", 3.2, "center"); text(grill ? "BBQ 🔥" : "🍻", 9.5, -5, "#ff9f43", 3.2, "center"); };
    if (it.rot === 0) G.face("x", it.x + 2.5, it.y + 5, 6, 0, 0, words, 1, 1); else G.face("y", it.x + 5, it.y + 21.5, 6, 0, 0, words, 1, 1);
  }
}
new Chalkboard({ type: "chalkboard", cat: "exterieur", name: "Ardoise", price: 150, room: "any", w: 24, d: 8, rots: 2, art: "isochalkboard", desc: "Le menu de l'afterwork.", styles: [{ id: "ardoise", name: "Ardoise", sw: "#2a3a2e" }] });

/* ---------- the meeting room ---------- */
addC({ type: "conftable", cat: "tables", name: "Table de réunion", price: 1500, room: "any", w: 140, d: 28, art: "isoconftable", role: "conftable", desc: "Ajoute des chaises autour : clic sur la table pour réunir l'équipe.", styles: [{ id: "chene", name: "Chêne", sw: "#8a5d3a" }] });

/* ---------- rugs: under everything, in the floor's plane (build.js draws them) ---------- */
const RUG_C = COLORS({ marine: ["Marine", "#22336a"], terracotta: ["Terracotta", "#d9824f"], bordeaux: ["Bordeaux", "#8f2b46"], sapin: ["Sapin", "#2f6e3c"], prune: ["Prune", "#4a2f6b"], moutarde: ["Moutarde", "#c9a24b"], gris: ["Gris", "#5a5866"] });
for (const [type, name, shape, w, d, price] of [["rugedge", "Tapis à liseré", "liseré", 60, 40, 250], ["ruground", "Tapis rond", "rond", 50, 50, 220], ["rugpersian", "Tapis persan", "persan", 72, 44, 480],
  ["rugstripes", "Tapis rayé", "rayé", 60, 36, 200], ["rugplain", "Tapis uni", "uni", 48, 32, 120], ["rugbig", "Grand tapis", "liseré", 140, 60, 700]])
  new Item({ type, cat: "tapis", name, price, kind: "rug", shape, w, d, desc: "Au sol, sous les meubles.", styles: RUG_C });

/* ---------- what hangs on the walls and follows the game: the boards, the trophies, the cabinet ---------- */
// a wall piece painted by the game (its position: anchor(it), or offscreen when it is not bought or sold)
class WallPiece extends Furniture {
  draw2d(it, t, alpha = 1) { if (alpha < 1) ctx.globalAlpha = alpha; this.paint(it, t, it.uid < 0); ctx.globalAlpha = 1; }
  // the buy menu's thumbnail: its ghost painted on a canvas of its size
  thumb() {
    const c = document.createElement("canvas"); c.width = Math.ceil(this.w * S); c.height = Math.ceil(this.h * S);
    try { withCtx(c.getContext("2d"), () => this.paint({ uid: -1, type: this.type, x: 0, y: 0 }, performance.now(), true)); } catch (_) { return ""; }
    return c.toDataURL();
  }
}
const off = o => Object.assign(o, { x: -999, y: -999 });
new (class extends WallPiece {
  paint(it, _t, ghost) { drawBoard(curSession(), ghost ? { x: it.x, y: it.y } : BOARD_AT, !ghost); }
  anchor(it) { if (it) Object.assign(BOARD_AT, { x: it.x, y: it.y }); else off(BOARD_AT); }
})({ type: "ticketboard", cat: "tableaux", name: "Tableau des tickets", price: 800, room: "office", unique: true, kind: "wall", sides: ["back"], w: 202, h: 64,
  desc: "Les tickets des agents : à faire, en cours, bloqués, livrés. Les devs viennent y prendre le leur ; glisse un ticket sur un bureau libre.", styles: [{ id: "blanc", name: "Blanc", sw: "#f4f2ea" }] });
new (class extends WallPiece {
  paint(it, t, ghost) { hub.drawShelf(t, ghost ? { x: it.x + 2, y: it.y + 9, w: 50 } : SHELF); }
  anchor(it) { if (it) Object.assign(SHELF, { x: it.x + 2, y: it.y + 9 }); else off(SHELF); }
})({ type: "trophyshelf", cat: "tableaux", name: "Étagère des succès", price: 300, room: "any", unique: true, kind: "wall", w: 54, h: 14, role: "trophies",
  desc: "Les coupes des succès de l'équipe. Clic : la liste.", styles: [{ id: "bois", name: "Bois", sw: "#8a6a4a" }] });
new (class extends WallPiece {
  paint(it, t, ghost) { hub.drawEmployee(t, ghost ? { x: it.x + 2, y: it.y + 2, w: 20, h: 26 } : FRAME); }
  anchor(it) { if (it) Object.assign(FRAME, { x: it.x + 2, y: it.y + 2 }); else off(FRAME); }
})({ type: "employeeframe", cat: "tableaux", name: "Employé de la semaine", price: 200, room: "any", unique: true, kind: "wall", w: 24, h: 36, role: "trophies",
  desc: "Le portrait du meilleur de la semaine.", styles: [{ id: "or", name: "Doré", sw: "#c9a24b" }] });
new (class extends WallPiece {
  paint(it, t, ghost) { drawTournament(t, ghost ? { x: it.x + 1, y: it.y + 1 } : TOURNEY); }
  anchor(it) { if (it) Object.assign(TOURNEY, { x: it.x + 1, y: it.y + 1 }); else off(TOURNEY); }
})({ type: "tourneyslate", cat: "tableaux", name: "Ardoise du tournoi", price: 150, room: "any", unique: true, kind: "wall", w: 52, h: 50,
  desc: "Le classement des duels de la semaine.", styles: [{ id: "ardoise", name: "Ardoise", sw: "#2a3a2e" }] });
const meeting = () => hub.Room.get("meeting"), mp = () => hub.MEET_PIECES;
new (class extends WallPiece {
  paint(it, _t, ghost) { meeting()?.drawWhiteboard(ghost ? { x: it.x + 3, y: it.y + 3, w: 142, h: 42 } : mp().BOARD); }
  anchor(it) { if (it) Object.assign(mp().BOARD, { x: it.x + 3, y: it.y + 3 }); else off(mp().BOARD); }
})({ type: "whiteboard", cat: "tableaux", name: "Tableau blanc", price: 450, room: "any", unique: true, kind: "wall", sides: ["back"], w: 152, h: 56,
  desc: "On dessine dessus à la souris (feutres, gomme, éponge ; Ctrl+Z).", styles: [{ id: "blanc", name: "Blanc", sw: "#fbfbf7" }] });
new (class extends WallPiece {
  paint(it, t, ghost) { meeting()?.drawTv(t, ghost ? { x: it.x + 2, y: it.y + 2, w: 100, h: 42 } : mp().TV); }
  anchor(it) { if (it) Object.assign(mp().TV, { x: it.x + 2, y: it.y + 2 }); else off(mp().TV); }
})({ type: "walltv", cat: "electronique", name: "Télé murale", price: 1200, room: "any", unique: true, kind: "wall", sides: ["back"], w: 108, h: 58,
  desc: "Agents en direct, tickets, l'heure, un dessin animé. Clic : changer de chaîne.", styles: [{ id: "noir", name: "Noir", sw: "#14141c" }] });
new (class extends WallPiece {
  paint(it, _t, ghost) { meeting()?.drawClock(ghost ? { x: it.x, y: it.y } : mp().CLOCK); }
  anchor(it) { if (it) Object.assign(mp().CLOCK, { x: it.x, y: it.y }); else off(mp().CLOCK); }
})({ type: "wallclock", cat: "horloges", name: "Horloge", price: 80, room: "any", unique: true, kind: "wall", w: 16, h: 16, desc: "À l'heure réelle.", styles: [{ id: "noire", name: "Noire", sw: "#2a2a33" }] });

// the MMX filing cabinet: the memory's entries are filed in it (agents/mmx.js); clic: what it holds
class Cabinet extends Furniture {
  isoState(_it, t) { return { open: t < drawerUntil, pending: Math.max(0, (mmx?.pending.length || 0) - inTransit.pending) }; }
  over(it, _t, G) {
    const [x0, y0, x1, y1] = footOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, stored = Math.max(0, (mmx?.count || 0) - inTransit.entries), pending = Math.max(0, (mmx?.pending.length || 0) - inTransit.pending);
    G.put(0, 0, cx, cy, 52, () => { text("MMX", 0, 0, cv.classList.contains("hover-store") ? "#fbaa08" : "#d5eeff", 4.6, "center"); if (pending) { px(8, 0.6, 6, 5, "#fbaa08"); text(String(pending), 11, 0.2, "#1c1c24", 3.6, "center"); } });
    G.put(0, 0, cx, y1 + 1, -1, () => text(String(stored), 0, 0, "#adadad", 4.2, "center"));
  }
  anchor(it) {
    if (!it) return Object.assign(CAB, { x: -999, y: -999, ok: false });
    const [x0, y0] = footOf(it), sp = spotsOf(it)[0];
    Object.assign(CAB, { x: x0, y: y0 - 32, ok: true }); Object.assign(STAND, { x: Math.round(sp.x), y: Math.round(sp.y) });
  }
}
new Cabinet({ type: "mmxcabinet", cat: "rangement", name: "Armoire MMX", price: 600, room: "office", unique: true, w: 22, d: 12, rots: 2, art: "isocabinet", role: "mmx", spots: [{ x: 11, y: 20, face: [0, -1] }],
  desc: "La mémoire de l'équipe : les fiches y sont rangées par les devs. Clic : son contenu.", styles: [{ id: "gris", name: "Gris", sw: "#8a90a6" }] });
