// Two objects of everyday office life, looked after like the others (world/upkeep.js): a pedal bin that fills up (the
// papers filed in MMX, the cups Brume breaks) and is emptied by the chief, and a printer that prints the report of the
// day (the chief brings it back to ChiefOS) and jams now and then.

import { shade } from "../svg/base.js";
import { ISO_KIT, IsoArt, ipt } from "../svg/iso.js";
import { Item } from "./base.js";

const { n2, ibox, iell, icyl, reg } = ISO_KIT;
const art = (name, w, d, H, body) => reg(class extends IsoArt { constructor() { super(name, w, d, H); } body(o) { return body(o); } });

/* ---------- the pedal bin: brushed metal, its lid, its pedal; papers sticking out when full ---------- */
art("isotrash", 7, 7, 16, ({ c = "#8d929c", fill = 0 }) => {
  let g = iell(3.5, 3.5, 0, 3.6, "#000", ' fill-opacity=".22"');
  g += icyl(3.5, 3.5, 0, 9.5, 2.9, c, shade(c, 1.2));
  const [x, y] = ipt(3.5, 3.5, 0);
  g += `<path fill="#fff" fill-opacity=".22" d="M${n2(x - 2.2)} ${n2(y - 9.2)}h0.8v8.6h-0.8z"/><path fill="#000" fill-opacity=".18" d="M${n2(x + 1.2)} ${n2(y - 9.2)}h1.3v8.8h-1.3z"/>`;  // its round side lit from the left
  g += ibox(2.6, 5.9, 1.8, 1.2, 0, 0.6, [shade(c, 0.8), shade(c, 0.6), shade(c, 0.5)]);  // the pedal
  if (fill >= 3) for (const [px, py, z, w] of [[2.2, 2.6, 9.6, 1.6], [3.8, 3, 9.8, 1.4], [3, 4, 9.5, 1.8]]) g += ibox(px, py, w, 1.2, z, 1.4 + (fill - 3), ["#f4f2ea", "#e6e2d8", "#cfcac0"]);  // papers sticking out
  g += icyl(3.5, 3.5, fill >= 4 ? 10.6 : 9.5, 0.8, 3, shade(c, 0.85), shade(c, 1.3));  // the lid (lifted when it overflows)
  return g;
});

/* ---------- the printer: a light grey body, the paper tray, the output, its status light ---------- */
art("isoprinter", 12, 9, 12, ({ c = "#e6e8ec", jam = false, frame = -1 }) => {
  const C = [shade(c, 1.05), c, shade(c, 0.78)];
  let g = iell(6, 4.5, 0, 7, "#000", ' fill-opacity=".2"');
  g += ibox(0, 0, 12, 9, 0, 6.5, C);                                          // the body
  g += ibox(1, 1, 10, 7, 6.5, 1.2, [shade(c, 0.9), shade(c, 0.82), shade(c, 0.66)]);  // the scanner lid
  g += ibox(2, 9, 8, 0.6, 1.2, 1.8, ["#3a3f48", "#2a2d34", "#1c1f24"]);       // the output slot
  const out = frame < 0 ? 2.2 : 0.8 + frame * 0.9;                            // the sheet coming out while it prints
  g += ibox(3, 9.2, 6, out, 2.2, 0.15, ["#ffffff", "#f4f2ea", "#d8d4ca"]);
  g += ibox(9.4, 6.2, 1.6, 1.4, 7.7, 0.25, ["#2a2d34", "#1c1f24", "#141619"]);  // the panel
  g += iell(10.2, 6.9, 7.98, 0.38, jam ? "#ff4d4d" : frame >= 0 ? "#ffd43b" : "#51cf66");  // its light: red jammed, yellow printing
  return g;
});

class Trash extends Item {
  artState(st) { return { c: st.c }; }
  isoState(it) { return { fill: Math.min(4, Math.floor((it.wear || 0) / 25)) }; }
}
new Trash({ type: "trashbin", cat: "deco", name: "Poubelle à pédale", price: 45, w: 7, d: 7, art: "isotrash", room: "any",
  desc: "Elle se remplit (les papiers rangés dans MMX, les tasses cassées) : clic pour la vider.",
  styles: [["inox", "Inox", "#8d929c"], ["noir", "Noir mat", "#3a3d44"], ["blanc", "Blanc", "#e6e2d8"], ["jaune", "Jaune Descartes", "#fbaa08"]].map(([id, name, c]) => ({ id, name, sw: c, c })) });

class Printer extends Item {
  artState(st) { return { c: st.c }; }
  isoState(it, t) { return { jam: !!it.jam, frame: t < (it.printUntil || 0) ? Math.floor(t / 180) % 4 : -1 }; }
}
new Printer({ type: "printer", cat: "electronique", name: "Imprimante", price: 220, w: 12, d: 9, art: "isoprinter", room: "any", role: "printer",
  desc: "Imprime le rapport du jour (le chef te l'apporte dans ChiefOS). Elle se bloque parfois.",
  styles: [["gris", "Gris clair", "#e6e8ec"], ["noir", "Noir", "#4a4e58"]].map(([id, name, c]) => ({ id, name, sw: c, c })) });
