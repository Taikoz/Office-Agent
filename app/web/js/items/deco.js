// The decoration of the buy mode (🐠 Déco): on the floor a zen fountain, an abstract sculpture, a Japanese folding screen,
// a tall vase with pampas grass, an antique bust; on a desk or a table Newton's cradle, a lava lamp and three candles
// (both light up in the evening, like the lamps: items/lamp.js), a bonsai; on the walls a wooden deer head, a sunburst
// mirror, a gold record. Drawn in svg/isodeco.js; their colours by style.

import "../svg/isodeco.js";
import { DEER, GOLDRECORD, SUNMIRROR } from "../svg/isodeco.js";
import { Item } from "./base.js";
import { Lamp } from "./lamp.js";

const sty = (key, list) => list.map(([id, name, sw, more]) => ({ id, name, sw, ...(more || { [key]: sw }) }));
const pass = st => { const { id: _i, name: _n, sw: _s, ...art } = st; return art; };  // a style's colours go to its drawing
class Deco extends Item {
  artState(st) { return pass(st); }
  isoState(_it, t) { return this.beat ? { frame: Math.floor(t / this.beat) % (this.frames || 4) } : {}; }  // a little life (water, a pendulum…)
}
class DecoLight extends Lamp {  // lit in the evening on its own, or by a click (items/lamp.js)
  artState(st) { return pass(st); }
  isoState(_it, t) { return { frame: Math.floor(t / this.beat) % (this.frames || 4) }; }
}
const deco = def => new Deco({ cat: "deco", room: "any", ...def });

/* ---------- on the floor ---------- */
deco({ type: "fountain", name: "Fontaine zen", price: 680, w: 14, d: 14, art: "isofountain", beat: 260, frames: 4,
  desc: "Trois galets empilés, l'eau qui ruisselle, des ronds dans le bassin. Le bruit de l'eau, en vrai, apaise.",
  styles: sty("c", [["pierre", "Pierre grise", "#8d929c"], ["ardoise", "Ardoise", "#4a4f5a"], ["sable", "Grès sable", "#c9b48a"]]) });
deco({ type: "sculpture", name: "Sculpture abstraite", price: 1200, w: 10, d: 10, art: "isosculpture",
  desc: "Deux anneaux de métal entrelacés sur un socle de marbre blanc. Une pièce de galerie.",
  styles: sty("c", [["bronze", "Bronze", "#b07a3a"], ["or", "Doré", "#d4a640"], ["noir", "Acier noir", "#3a3a44"], ["chrome", "Chrome", "#c9ccd6"]]) });
deco({ type: "foldscreen", name: "Paravent japonais", price: 540, w: 24, d: 4, rots: 2, art: "isoscreen",
  desc: "Trois panneaux de papier de riz sur un cadre de bois, une branche de cerisier en fleurs. Pour séparer un coin calme.",
  styles: sty("c", [["noyer", "Noyer", "#5c3d27"], ["laque", "Laque rouge", "#8a1f1f"], ["noir", "Noir", "#1c1c22"], ["clair", "Bois clair", "#b08860"]]) });
deco({ type: "pampas", name: "Vase et herbes de pampa", price: 260, w: 9, d: 9, art: "isovase", beat: 700, frames: 4,
  desc: "Un grand vase émaillé, des plumeaux de pampa qui bougent dans le courant d'air.",
  styles: sty("c", [["terre", "Terre cuite", "#c0643a"], ["blanc", "Blanc mat", "#ece8e0"], ["noir", "Noir", "#2a2a30"], ["sauge", "Vert sauge", "#8aa08a"]]) });
deco({ type: "bust", name: "Buste antique", price: 950, w: 9, d: 9, art: "isobust",
  desc: "Un buste à l'antique sur sa colonne cannelée. Le penseur de l'open space.",
  styles: sty("c", [["marbre", "Marbre blanc", "#ece8e0"], ["bronze", "Bronze patiné", "#7a6a4a"], ["onyx", "Onyx noir", "#3a3a44"]]) });

/* ---------- on a desk or a table ---------- */
deco({ type: "newton", name: "Pendule de Newton", price: 120, kind: "top", w: 8, d: 5, rots: 2, art: "isonewton", beat: 130, frames: 8,
  desc: "Cinq billes d'acier qui se renvoient le mouvement. Hypnotique pendant un build.",
  styles: sty("c", [["noir", "Socle noir", "#2a2a30"], ["noyer", "Socle noyer", "#5c3d27"], ["blanc", "Socle blanc", "#e6e2d8"]]) });
new DecoLight({ type: "lavalamp", cat: "deco", room: "any", name: "Lampe à lave", price: 90, kind: "top", w: 4, d: 4, art: "isolava", beat: 600, frames: 12, light: 8, lightR: 16,
  desc: "La cire monte et redescend dans le verre coloré. S'allume le soir ; clic : allumer, éteindre.",
  styles: [["rose", "Rose", "#ff4fb8"], ["lave", "Lave", "#ff6a2a"], ["bleu", "Bleu", "#3b8bff"], ["vert", "Vert", "#4dff88"]].map(([id, name, c]) => ({ id, name, sw: c, c, lc: c })) });
deco({ type: "bonsai", name: "Bonsaï", price: 180, kind: "top", w: 8, d: 6, rots: 2, art: "isobonsai",
  desc: "Un genévrier taillé en plateaux, dans son pot émaillé sur la mousse. Il a quarante ans.",
  styles: sty("c", [["celadon", "Pot céladon", "#4f7f8f"], ["noir", "Pot noir", "#2a2a30"], ["terre", "Pot terre", "#9a5a3a"]]) });
new DecoLight({ type: "candles", cat: "deco", room: "any", name: "Trio de bougies", price: 45, kind: "top", w: 7, d: 4, rots: 2, art: "isocandles", beat: 140, frames: 4, light: 5, lightR: 14, lc: "#ffc870",
  desc: "Trois bougies dans leurs verres, des flammes qui dansent. S'allument le soir ; clic : allumer, éteindre.",
  styles: sty("c", [["ivoire", "Ivoire", "#f4efe6"], ["miel", "Miel", "#e8c070"], ["rose", "Rose poudré", "#f0c4cc"]]) });

/* ---------- on the walls ---------- */
deco({ type: "deerhead", name: "Tête de cerf géométrique", price: 320, kind: "wall", w: 16, h: 16, art2d: DEER,
  desc: "Un trophée sans chasse : des facettes de bois assemblées sur un médaillon.",
  styles: sty("c", [["chene", "Chêne", "#b08860"], ["noyer", "Noyer", "#6a4630"], ["blanc", "Blanc", "#e6e2d8"]]) });
deco({ type: "sunmirror", name: "Miroir soleil", price: 420, kind: "wall", w: 16, h: 16, art2d: SUNMIRROR,
  desc: "Un miroir rond dans ses rayons dorés, façon années 50.",
  styles: sty("c", [["or", "Doré", "#d4a640"], ["laiton", "Laiton", "#b8902f"], ["noir", "Noir", "#2a2a30"]]) });
deco({ type: "goldrecord", name: "Disque d'or encadré", price: 380, kind: "wall", w: 12, h: 14, art2d: GOLDRECORD,
  desc: "Pour le premier million de lignes livrées. Cadre et plaque gravée.",
  styles: sty("c", [["noir", "Cadre noir", "#1c1c22"], ["blanc", "Cadre blanc", "#e6e2d8"], ["chene", "Cadre chêne", "#8a6a4a"]]) });
