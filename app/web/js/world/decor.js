// The decor of each room: its walls and its floor (bought in the buy mode, build.js), the wood, the curtains and the
// door. Kept in the localStorage; the floor and the wall are painted once per scale and per setting.

import { hub, provide } from "../hub.js";
import { S, W, ctx } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART, Sprite, shade } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";

// a room as it is delivered: plastered walls, a concrete floor (walls and floors are bought in the buy mode, build.js)
const BARE = { wall: "uni", wallColor: "#cfc8bb", floor: "beton", floorColor: "#8f8f8f", wood: "#8a6a4a",
  rug: "aucun", rugColor: "#3a3a48", curtain: "velours", curtainColor: "#8f2b46", door: "panneaux", doorColor: "#7a5234" };
export const DECOR_DEFAULT = { office: { ...BARE }, lounge: { ...BARE }, meeting: { ...BARE }, terrace: { ...BARE, floor: "parquet", floorColor: "#8a6a4a" },
  gym: { ...BARE, floor: "beton", floorColor: "#5a5e68", wallColor: "#d8d4cc" }, library: { ...BARE, wall: "boiserie", wallColor: "#5a3a2a", floor: "chevron", floorColor: "#8a6a4a" } };
export const DECOR_TYPES = {
  wall: [["lambris", "Lambris"], ["uni", "Uni"], ["rayures", "Rayures"], ["briques", "Briques"], ["papier", "Papier peint"], ["boiserie", "Boiserie basse"]],
  floor: [["parquet", "Parquet"], ["chevron", "Point de Hongrie"], ["moquette", "Moquette"], ["carrelage", "Carrelage"], ["damier", "Damier"], ["beton", "Béton ciré"]],
  rug: [["liseré", "Liseré"], ["uni", "Uni"], ["rayé", "Rayé"], ["persan", "Persan"], ["rond", "Rond"], ["aucun", "Aucun"]],
  curtain: [["velours", "Velours"], ["lin", "Lin"], ["store", "Store"], ["aucun", "Aucun"]],
  door: [["panneaux", "Panneaux"], ["vitrée", "Vitrée"], ["lisse", "Lisse"]],
};
// the themes' floors (build.js: in Sols, and on the theme's Sols shelf): [type, label, theme, its own colours]
export const THEME_FLOORS = [
  ["dalles", "Dalles de château", "magie", ["#8d8a80", "#a89c84", "#5a5866", "#7f8a74"]],
  ["plancher", "Plancher de tour", "magie", ["#6b4a2e", "#4a2f1e", "#8a6a4a", "#3a2416"]],
  ["etoile", "Mosaïque à l'étoile", "magie", ["#22336a", "#3a2350", "#5a1e2a", "#1f4a32"]],
  ["tole", "Tôle de pont", "scifi", ["#9aa6b4", "#6a7684", "#4a5562", "#c9d2dc"]],
  ["caillebotis", "Caillebotis lumineux", "scifi", ["#2a3340", "#1c222c", "#3a4450", "#1e1430"]],
  ["hexalum", "Dalles hexagonales", "scifi", ["#dfe4ea", "#9aa6b4", "#2a3340", "#1a2a3a"]],
  ["ciment", "Carreaux de ciment", "manoir", ["#4a1a2a", "#1e3a2a", "#24202a", "#3a1e4a"]],
  ["vieuxparquet", "Parquet qui grince", "manoir", ["#3a2418", "#2a1c1a", "#4a2018", "#5a4a3a"]],
  ["marbrenoir", "Marbre veiné", "manoir", ["#1c1820", "#e8e4dc", "#2a2a33", "#3a1a24"]],
  ["pont", "Pont de navire", "pirate", ["#9a7a52", "#7a5232", "#b8946a", "#5a4030"]],
  ["sable", "Sable de la crique", "pirate", ["#e8d4a0", "#d9c08a", "#f0e2c0", "#c9a46a"]],
  ["tomettes", "Tomettes de la taverne", "pirate", ["#b8603a", "#a04a2e", "#c87a4a", "#8a3a24"]],
  ["tatami", "Tatamis", "japon", ["#b8b46a", "#a8a45a", "#c9c08a", "#8a9a5a"]],
  ["engawa", "Plancher d'engawa", "japon", ["#c9a46a", "#a07a4a", "#5a3a24", "#e0c89a"]],
  ["gravier", "Gravier ratissé", "japon", ["#e8e4d8", "#c9c3b0", "#9a968a", "#d8d0c0"]],
  ["teck", "Deck en teck", "plage", ["#a0703a", "#8a5a2a", "#c9905a", "#7a7468"]],
  ["mosaique", "Mosaïque de piscine", "plage", ["#3ab8d8", "#2a8ab8", "#5ad0c8", "#f4f2ea"]],
  ["jonc", "Natte de jonc", "plage", ["#d9c08a", "#c9a46a", "#b8a070", "#e8d8b0"]],
];
DECOR_TYPES.floor.push(...THEME_FLOORS.map(([id, label]) => [id, label]));
// the themes' walls, painted along the whole room, and their doors for the room's door (build.js: in Murs and Portes,
// and on the theme's shelves): [type, label, theme, its own colours]
export const THEME_WALLS = [
  ["pierre", "Pierre de château", "magie", ["#8d8a80", "#c9b48a", "#5a5866", "#7f8a74"]],
  ["plaques", "Plaques de coque", "scifi", ["#9aa6b4", "#dfe4ea", "#4a5562", "#7a8a7a"]],
  ["damas", "Damas et boiseries", "manoir", ["#4a1a2a", "#1e3a2a", "#3a1e4a", "#24202a"]],
  ["borde", "Bordé goudronné", "pirate", ["#7a5232", "#9a6a3a", "#3a2a1e", "#8a8478"]],
  ["shoji", "Shōji", "japon", ["#3a2a1e", "#c9a46a", "#1c1c22"]],
  ["cabine", "Rayures de cabine", "plage", ["#3a8ad0", "#e8402a", "#5ac8a8", "#f0c040"]],
  ["bambou", "Bambou", "plage", ["#c9b06a", "#8a6a3a", "#e0cc8a"]],
];
export const THEME_DOORS = [
  ["ogive", "Porte ogivale cloutée", "magie", ["#4a2f1e", "#5c3d27", "#2a2026"]],
  ["sas", "Sas coulissant", "scifi", ["#9aa6b4", "#dfe4ea", "#4a5562"]],
  ["heurtoir", "Porte au heurtoir", "manoir", ["#2a1c1a", "#3a2418", "#4a2018"]],
  ["cale", "Porte de cale", "pirate", ["#7a5232", "#9a6a3a", "#3a2a1e"]],
  ["fusumadoor", "Fusuma à la vague", "japon", ["#3a2a1e", "#c9a46a", "#1c1c22"]],
  ["cabinedoor", "Porte de cabine", "plage", ["#3a8ad0", "#e8402a", "#5ac8a8", "#f0c040"]],
];
DECOR_TYPES.wall.push(...THEME_WALLS.map(([id, label]) => [id, label]));
DECOR_TYPES.door.push(...THEME_DOORS.map(([id, label]) => [id, label]));
// a theme's wall has its own chair rail, cornice or beam: the room's is not drawn over it (world/scene.js)
export const wallHasRail = type => type !== "boiserie" && !THEME_WALLS.some(w => w[0] === type);
const WOODS = [["Chêne", "#8a6a4a"], ["Noyer", "#5c3d27"], ["Érable", "#c9a06a"], ["Merisier", "#9a4f2e"], ["Wengé", "#3b2a20"],
  ["Bouleau", "#d8c3a0"], ["Laqué blanc", "#e6e2d8"], ["Laqué noir", "#2a2a33"]];
export const DECOR_COLORS = {
  wallColor: ["#0d2766", "#14317a", "#2b2d42", "#3d5a80", "#2f4f4f", "#4a5d3a", "#6b2d3c", "#8c5a3c", "#c9b79c", "#e8e2d0", "#7a7f8c", "#1c1c24"],
  floorColor: ["#5f4936", "#7a5a3c", "#a07850", "#c9a374", "#3b2a20", "#3a4a73", "#4a4a52", "#8c8c8c", "#b5ad9e", "#2f3e2f", "#6b2d3c", "#d8d2c4"],
  rugColor: ["#22336a", "#d9824f", "#8f2b46", "#2f6e3c", "#4a2f6b", "#c9a24b", "#1f75be", "#3a3a48", "#b8643c", "#e8e2d0"],
  curtainColor: ["#8f2b46", "#22336a", "#2f6e3c", "#c9a24b", "#e8e2d0", "#4a2f6b", "#b8643c", "#3a3a48", "#d98fa0", "#5aa9ff"],
  doorColor: [...WOODS.map(w => w[1]), "#081746", "#2f6e3c", "#8f2b46", "#7a8094"],
};
export const floorColors = type => THEME_FLOORS.find(f => f[0] === type)?.[3] || DECOR_COLORS.floorColor.slice(0, 8);
export const wallColors = type => THEME_WALLS.find(f => f[0] === type)?.[3] || DECOR_COLORS.wallColor.slice(0, 8);
export const doorColors = type => THEME_DOORS.find(f => f[0] === type)?.[3] || DECOR_COLORS.doorColor.slice(0, 8);
const DECOR_ROWS = [  // [type key, color key, label]; the wood has named presets instead of types
  ["wall", "wallColor", "Murs"], ["floor", "floorColor", "Sol"], [null, "wood", "Bois"],
  ["rug", "rugColor", "Tapis"], ["curtain", "curtainColor", "Rideaux"], ["door", "doorColor", "Porte"],
];

export let decor = (() => {
  const s = new SaveSlot("office-decor", {}, { version: 2, migrations: { 2: () => ({}) } }).data;  // 2: a new game, the rooms delivered bare
  return Object.fromEntries(Object.keys(DECOR_DEFAULT).map(r => [r, { ...DECOR_DEFAULT[r], ...(s[r] || {}) }]));
})();
const decorSig = (room, keys) => keys.map(k => decor[room][k]).join("|");
const lum = hex => { const n = parseInt(hex.slice(1, 7), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const decorRnd = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };  // stable "random"

/* ---------- painting helpers on an offscreen canvas, in scene units ---------- */
function decorPainter(w, h) {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
  const rect = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(ww * S), Math.ceil(hh * S)); };
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S)); g.closePath(); g.fill(); };
  const ellipse = (cx, cy, rx, ry, col, stroke = 0) => {
    g.beginPath(); g.ellipse(cx * S, cy * S, rx * S, ry * S, 0, 0, Math.PI * 2);
    if (stroke) { g.strokeStyle = col; g.lineWidth = stroke * S; g.stroke(); } else { g.fillStyle = col; g.fill(); }
  };
  return { c, g, rect, poly, ellipse };
}

function paintFloor(p, w, h, type, base) {
  const { rect, poly } = p, rnd = decorRnd;
  if (paintThemeFloor(p, w, h, type, base)) return;
  if (type === "parquet") {  // staggered planks, grain, a few knots
    const tones = [0.97, 1.04, 0.92, 1.11, 1, 0.89].map(k => shade(base, k)), PH = 6;
    for (let row = 0; row * PH < h; row++) {
      const y = row * PH;
      let x = -rnd(row) * 30, i = 0;
      while (x < w) {
        const len = 26 + Math.floor(rnd(row * 31 + i) * 22), seed = row * 97 + i;
        rect(x, y, len, PH, tones[Math.floor(rnd(seed) * tones.length)]);
        rect(x, y, len, 0.5, "rgba(255, 230, 190, 0.07)");
        for (let k = 0; k < 3; k++) {
          const gy = y + 1.2 + rnd(seed + k * 7) * (PH - 2.4), gx = x + rnd(seed + k * 3) * len * 0.4;
          rect(gx, gy, len * (0.35 + rnd(seed + k) * 0.5), 0.35, rnd(seed + k * 11) > 0.5 ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 220, 170, 0.06)");
        }
        if (rnd(seed * 5) > 0.86) { const kx = x + 4 + rnd(seed * 9) * (len - 8); rect(kx, y + 2.2, 1.6, 1.2, "rgba(40, 25, 15, 0.45)"); }
        rect(x + len - 0.5, y, 0.5, PH, shade(base, 0.62));
        x += len; i++;
      }
      rect(0, y + PH - 0.5, w, 0.5, shade(base, 0.66));
    }
  } else if (type === "chevron") {  // point de Hongrie: columns of slanted planks, alternating direction
    const cw = 10, P = 3, rise = cw / 2;
    for (let j = 0; j * cw < w; j++) {
      const x0 = j * cw, up = j % 2 === 0;
      for (let y = -cw, k = 0; y < h + cw; y += P, k++) {
        const col = shade(base, 0.9 + rnd(j * 131 + k) * 0.2);
        const a = up ? [[x0, y], [x0 + cw, y - rise]] : [[x0, y - rise], [x0 + cw, y]];
        poly([a[0], a[1], [a[1][0], a[1][1] + P], [a[0][0], a[0][1] + P]], col);
        poly([a[0], a[1], [a[1][0], a[1][1] + 0.4], [a[0][0], a[0][1] + 0.4]], shade(base, 0.65));
      }
      rect(x0 + cw - 0.3, 0, 0.3, h, shade(base, 0.7));
    }
  } else if (type === "moquette") {  // carpet tiles, pile direction alternating
    const T = 16;
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      const odd = ((tx + ty) / T) % 2;
      rect(tx, ty, T, T, odd ? shade(base, 0.9) : base);
      for (let k = 1; k < T; k += 2) odd ? rect(tx + 0.5, ty + k, T - 1, 0.4, "rgba(255,255,255,0.05)") : rect(tx + k, ty + 0.5, 0.4, T - 1, "rgba(255,255,255,0.05)");
      rect(tx, ty, T, 0.4, "rgba(0,0,0,0.25)"); rect(tx, ty, 0.4, T, "rgba(0,0,0,0.25)");
    }
  } else if (type === "carrelage") {  // square tiles, grout, a light reflection on each
    const T = 12, grout = lum(base) > 0.5 ? shade(base, 0.75) : shade(base, 1.45);
    rect(0, 0, w, h, grout);
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      rect(tx + 0.5, ty + 0.5, T - 1, T - 1, shade(base, 0.95 + rnd(tx * 7 + ty) * 0.1));
      rect(tx + 1, ty + 1, T - 4, 0.5, "rgba(255,255,255,0.12)");
    }
  } else if (type === "damier") {
    const T = 10, alt = lum(base) < 0.5 ? "#e9e5da" : "#2a2a33";
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      rect(tx, ty, T, T, ((tx + ty) / T) % 2 ? alt : base);
      rect(tx, ty, T, 0.4, "rgba(255,255,255,0.08)");
    }
  } else {  // béton ciré: soft clouds and specks
    rect(0, 0, w, h, base);
    for (let i = 0; i < 70; i++) p.ellipse(rnd(i) * w, rnd(i + 99) * h, 8 + rnd(i + 7) * 22, 4 + rnd(i + 3) * 8, rnd(i + 5) > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)");
    for (let i = 0; i < 500; i++) rect(rnd(i * 3) * w, rnd(i * 5 + 1) * h, 0.4, 0.4, rnd(i * 7) > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)");
    for (let x = 80; x < w; x += 80) rect(x, 0, 0.3, h, "rgba(0,0,0,0.15)");  // expansion joints
  }
}

// the themes' floors (THEME_FLOORS); false: not one of them
function paintThemeFloor(p, w, h, type, base) {
  const { rect, poly, ellipse } = p, rnd = decorRnd, dark = lum(base) < 0.4;
  const crack = (x, y, n, s = 1) => { for (let k = 0; k < n; k++) rect(x + k * 0.8, y + (k % 2 ? 0.4 : -0.2) * s + k * 0.3 * s, 0.9, 0.3, "rgba(0, 0, 0, 0.3)"); };
  const line = (ax, ay, bx, by, wd, col) => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L * wd / 2, ny = dx / L * wd / 2; poly([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], col); };
  if (type === "dalles") {  // castle flagstones: rows of uneven stones, mortar, a crack here and there, moss in the joints
    rect(0, 0, w, h, shade(base, 0.55));
    for (let row = 0, y = 0; y < h; row++) {
      const rh = 7 + Math.floor(rnd(row * 7 + 1) * 4);
      for (let x = -rnd(row + 3) * 10, i = 0; x < w; i++) {
        const len = 8 + Math.floor(rnd(row * 53 + i) * 10), seed = row * 131 + i;
        rect(x + 0.4, y + 0.4, len - 0.8, rh - 0.8, shade(base, 0.84 + rnd(seed) * 0.28));
        rect(x + 0.4, y + 0.4, len - 0.8, 0.5, "rgba(255, 255, 255, 0.08)"); rect(x + 0.4, y + rh - 0.9, len - 0.8, 0.5, "rgba(0, 0, 0, 0.15)");
        if (rnd(seed * 3) > 0.86) crack(x + 2 + rnd(seed) * (len - 6), y + 2 + rnd(seed * 7) * (rh - 4), 4, rnd(seed * 5) > 0.5 ? 1 : -1);
        if (rnd(seed * 11) > 0.9) rect(x + len - 1, y + 1 + rnd(seed) * (rh - 3), 1.2, 1.6, "rgba(90, 122, 58, 0.55)");
        x += len;
      }
      y += rh;
    }
  } else if (type === "plancher") {  // a tower's floor: wide old planks the whole length, iron nails, worn in the middle
    const PH = 9;
    for (let row = 0, y = 0; y < h; row++, y += PH) {
      const c = shade(base, 0.9 + rnd(row * 17) * 0.2);
      rect(0, y, w, PH, c); rect(0, y, w, 0.5, "rgba(255, 230, 190, 0.06)"); rect(0, y + PH - 0.6, w, 0.6, shade(base, 0.5));
      for (let k = 0; k < w / 18; k++) rect(rnd(row * 41 + k) * w, y + 1.4 + rnd(row + k * 3) * (PH - 3), 10 + rnd(k * 7 + row) * 26, 0.35, "rgba(0, 0, 0, 0.14)");
      for (let x = -rnd(row) * 60; x < w; x += 60) { rect(x, y, 0.6, PH, shade(base, 0.55)); for (const dx of [1.6, -2.2]) for (const dy of [2, PH - 3]) rect(x + dx, y + dy, 0.8, 0.8, "#2e2e36"); }
    }
    for (let i = 0; i < 6; i++) ellipse(rnd(i * 5) * w, rnd(i * 9 + 2) * h, 30, 12, "rgba(255, 230, 190, 0.035)");
  } else if (type === "etoile") {  // a mosaic of small tesserae, a gold star every few steps, ringed
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) rect(x + 0.2, y + 0.2, 2.6, 2.6, shade(base, 0.82 + rnd(x * 7 + y * 13) * 0.32));
    const gold = "#d9a441";
    for (let cy = 16, r = 0; cy < h + 16; cy += 32, r++) for (let cx = (r % 2 ? 24 : 0); cx < w + 24; cx += 48) {
      ellipse(cx, cy, 11, 11, gold, 0.6); ellipse(cx, cy, 9, 9, shade(base, 0.6));
      poly(Array.from({ length: 16 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 8, rr = i % 2 ? 3.4 : 8.4; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }), gold);
      poly(Array.from({ length: 16 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 8, rr = i % 2 ? 1.8 : 4.6; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }), "#f2d27a");
    }
  } else if (type === "tole") {  // deck plating: steel plates, seams, the raised diamond pattern, rivets at the corners
    const T = 24;
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      rect(tx, ty, T, T, shade(base, 0.94 + rnd(tx + ty * 3) * 0.12));
      for (let y = 1.5, r = 0; y < T - 1; y += 3, r++) for (let x = 1.5 + (r % 2) * 1.5; x < T - 1.5; x += 3) poly(r % 2 ? [[tx + x, ty + y], [tx + x + 1.6, ty + y - 0.6], [tx + x + 1.9, ty + y - 0.3], [tx + x + 0.3, ty + y + 0.3]] : [[tx + x, ty + y - 0.6], [tx + x + 1.6, ty + y], [tx + x + 1.3, ty + y + 0.3], [tx + x - 0.3, ty + y - 0.3]], shade(base, 1.22));
      rect(tx, ty, T, 0.5, shade(base, 0.6)); rect(tx, ty, 0.5, T, shade(base, 0.6)); rect(tx + 0.5, ty + 0.5, T - 1, 0.4, "rgba(255, 255, 255, 0.12)");
      for (const [dx, dy] of [[2, 2], [T - 3, 2], [2, T - 3], [T - 3, T - 3]]) { rect(tx + dx, ty + dy, 1, 1, shade(base, 0.7)); rect(tx + dx, ty + dy, 0.5, 0.5, "rgba(255, 255, 255, 0.35)"); }
    }
  } else if (type === "caillebotis") {  // a grating of slots in framed panels, a cyan light strip every few panels
    const T = 16;
    rect(0, 0, w, h, shade(base, 0.6));
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      rect(tx + 0.4, ty + 0.4, T - 0.8, T - 0.8, base);
      for (let y = 2; y < T - 2; y += 2) rect(tx + 2, ty + y, T - 4, 0.9, "#0a0e14");
      rect(tx + 0.4, ty + 0.4, T - 0.8, 0.4, "rgba(255, 255, 255, 0.12)");
    }
    for (let x = 32; x < w; x += 64) { rect(x - 1.2, 0, 2.4, h, "rgba(0, 229, 255, 0.18)"); rect(x - 0.4, 0, 0.8, h, "#00e5ff"); }
  } else if (type === "hexalum") {  // hexagonal tiles, joints in light, a few tiles lit
    const r = 5, dx = r * 1.732, dy = r * 1.5;
    rect(0, 0, w, h, shade(base, 0.6));
    for (let row = 0, y = 0; y < h + r; y += dy, row++) for (let i = 0, x = (row % 2) * dx / 2; x < w + r; x += dx, i++) {
      const lit = (i * 7 + row * 3) % 13 === 0, pts = k => Array.from({ length: 6 }, (_, j) => [x + Math.cos(Math.PI / 6 + j * Math.PI / 3) * r * k, y + Math.sin(Math.PI / 6 + j * Math.PI / 3) * r * k]);
      poly(pts(0.96), lit ? "#00e5ff" : shade(base, 1.1)); poly(pts(0.8), lit ? "rgba(160, 250, 255, 0.9)" : shade(base, 0.95 + rnd(i * 31 + row) * 0.08));
    }
  } else if (type === "pont") {  // a ship's deck: long narrow planks, black caulked seams, treenails at the butts, a hatch
    const PH = 4;
    for (let row = 0, y = 0; y < h; row++, y += PH) {
      rect(0, y, w, PH, shade(base, 0.92 + rnd(row * 13) * 0.16)); rect(0, y + PH - 0.5, w, 0.5, "#1c1410");
      for (let x = -rnd(row * 3) * 70; x < w; x += 70) { rect(x, y, 0.5, PH, "#1c1410"); rect(x + 1.2, y + 1.6, 0.7, 0.7, shade(base, 0.6)); rect(x - 1.8, y + 1.6, 0.7, 0.7, shade(base, 0.6)); }
      for (let k = 0; k < w / 30; k++) rect(rnd(row * 41 + k) * w, y + 1 + rnd(row + k * 5) * 2, 8 + rnd(k + row) * 18, 0.25, "rgba(0, 0, 0, 0.12)");
    }
    for (let i = 0; i < 8; i++) ellipse(rnd(i * 7 + 3) * w, rnd(i * 11 + 1) * h, 26, 8, "rgba(255, 255, 255, 0.04)");  // salt-bleached
    const hx = Math.floor(w * 0.62), hy = Math.floor(h * 0.3);  // a grated hatch
    rect(hx, hy, 24, 16, shade(base, 0.6)); rect(hx + 1.5, hy + 1.5, 21, 13, "#1c1410");
    for (let x = hx + 2; x < hx + 22; x += 3) rect(x, hy + 1.5, 1.2, 13, shade(base, 0.85));
    for (let y = hy + 2; y < hy + 14; y += 3) rect(hx + 1.5, y, 21, 1.2, shade(base, 0.8));
  } else if (type === "sable") {  // the sand of a cove: ripples, grains, shells, a starfish, a footprint or two
    rect(0, 0, w, h, base);
    for (let y = 2; y < h; y += 5) for (let x = -rnd(y) * 20; x < w; x += 24) rect(x, y + Math.sin(x / 12) * 1.2, 14 + rnd(x + y) * 8, 0.6, "rgba(120, 90, 40, 0.14)");
    for (let i = 0; i < w * h / 40; i++) rect(rnd(i * 3) * w, rnd(i * 7 + 1) * h, 0.5, 0.5, rnd(i) > 0.5 ? "rgba(255, 255, 255, 0.35)" : "rgba(120, 90, 40, 0.25)");
    for (let i = 0; i < 6; i++) { const x = rnd(i * 17 + 2) * w, y = rnd(i * 23 + 9) * h; ellipse(x, y, 1.6, 1.2, "#f4e2d8"); rect(x - 0.2, y - 1, 0.4, 2, "rgba(200, 140, 120, 0.5)"); }
    for (let i = 0; i < 2; i++) { const cx = rnd(i * 31 + 5) * w, cy = rnd(i * 37 + 4) * h; poly(Array.from({ length: 10 }, (_, j) => { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? 1.2 : 3; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }), "#e8763a"); }
    for (let k = 0; k < 6; k++) ellipse(w * 0.3 + k * 7, h * 0.7 + (k % 2) * 3, 1.2, 1.8, "rgba(120, 90, 40, 0.2)");
  } else if (type === "tomettes") {  // a tavern's hexagonal terracotta tiles, each its own tone, worn, lime joints
    const r = 5, dx = r * 1.732, dy = r * 1.5;
    rect(0, 0, w, h, "#d8ccb4");
    for (let row = 0, y = 0; y < h + r; y += dy, row++) for (let i = 0, x = (row % 2) * dx / 2; x < w + r; x += dx, i++) {
      const pts = k => Array.from({ length: 6 }, (_, j) => [x + Math.cos(Math.PI / 6 + j * Math.PI / 3) * r * k, y + Math.sin(Math.PI / 6 + j * Math.PI / 3) * r * k]);
      poly(pts(0.9), shade(base, 0.86 + rnd(i * 13 + row * 7) * 0.26));
      if (rnd(i * 5 + row) > 0.8) poly(pts(0.5), "rgba(255, 255, 255, 0.07)");
    }
  } else if (type === "teck") {  // a pool deck: teak boards with gaps, stainless screws, sun-bleached streaks
    const PH = 5;
    rect(0, 0, w, h, "#2a2018");
    for (let row = 0, y = 0; y < h; row++, y += PH) {
      rect(0, y, w, PH - 0.8, shade(base, 0.9 + rnd(row * 11) * 0.2)); rect(0, y, w, 0.4, "rgba(255, 255, 255, 0.12)");
      for (let k = 0; k < w / 24; k++) rect(rnd(row * 37 + k) * w, y + 1 + rnd(row + k * 5) * 2.4, 12 + rnd(k + row) * 22, 0.3, "rgba(255, 240, 210, 0.12)");
      for (let x = 20 - (row % 2) * 10; x < w; x += 40) { rect(x, y + 1, 0.6, 0.6, "#c9ccd6"); rect(x, y + PH - 2.2, 0.6, 0.6, "#c9ccd6"); }
    }
  } else if (type === "mosaique") {  // a pool's mosaic: little glass tiles in shades of blue, a band of darker ones, ripples of light
    for (let y = 0; y < h; y += 2.5) for (let x = 0; x < w; x += 2.5) rect(x + 0.2, y + 0.2, 2.1, 2.1, shade(base, 0.85 + rnd(x * 3 + y * 7) * 0.3));
    for (let y = 30; y < h; y += 60) for (let x = 0; x < w; x += 2.5) rect(x + 0.2, y + 0.2, 2.1, 2.1, shade(base, 0.55));
    for (let i = 0; i < w * h / 600; i++) { const x = rnd(i * 13) * w, y = rnd(i * 17 + 3) * h; ellipse(x, y, 6 + rnd(i) * 6, 1.2, "rgba(255, 255, 255, 0.18)"); }
  } else if (type === "jonc") {  // a seagrass mat: woven squares that alternate their direction, a braided border every few
    const T = 8;
    for (let ty = 0, r = 0; ty < h; ty += T, r++) for (let tx = 0, i = 0; tx < w; tx += T, i++) {
      rect(tx, ty, T, T, shade(base, 0.94 + rnd(tx + ty * 5) * 0.12));
      if ((r + i) % 2) for (let k = 0.8; k < T; k += 1.6) rect(tx, ty + k, T, 0.5, "rgba(90, 70, 30, 0.22)");
      else for (let k = 0.8; k < T; k += 1.6) rect(tx + k, ty, 0.5, T, "rgba(90, 70, 30, 0.22)");
    }
  } else if (type === "tatami") {  // tatami mats in the classic pattern (pairs turned), their black cloth borders, the weave
    const L = 36, Wd = 18, edge = "#1c1c22";
    for (let ty = 0, r = 0; ty < h; ty += L, r++) for (let tx = 0, i = 0; tx < w; tx += L, i++) {
      const mats = (r + i) % 2 ? [[tx, ty, Wd, L], [tx + Wd, ty, Wd, L]] : [[tx, ty, L, Wd], [tx, ty + Wd, L, Wd]];
      for (const [x, y, mw, mh] of mats) {
        rect(x, y, mw, mh, shade(base, 0.96 + rnd(x * 3 + y) * 0.08));
        if (mw > mh) for (let k = 1; k < mh; k += 1.2) rect(x, y + k, mw, 0.3, "rgba(0, 0, 0, 0.07)"); else for (let k = 1; k < mw; k += 1.2) rect(x + k, y, 0.3, mh, "rgba(0, 0, 0, 0.07)");
        if (mw > mh) { rect(x, y, mw, 1.2, edge); rect(x, y + mh - 1.2, mw, 1.2, edge); } else { rect(x, y, 1.2, mh, edge); rect(x + mw - 1.2, y, 1.2, mh, edge); }
        rect(x, y, mw, 0.3, "rgba(0, 0, 0, 0.35)"); rect(x, y, 0.3, mh, "rgba(0, 0, 0, 0.35)");
      }
    }
  } else if (type === "engawa") {  // a veranda's floor: long narrow polished boards, a soft sheen, no knots
    const PH = 3.2;
    for (let row = 0, y = 0; y < h; row++, y += PH) {
      rect(0, y, w, PH, shade(base, 0.94 + rnd(row * 7) * 0.12)); rect(0, y + PH - 0.3, w, 0.3, shade(base, 0.62)); rect(0, y, w, 0.4, "rgba(255, 255, 255, 0.1)");
      for (let x = -rnd(row * 5) * 120; x < w; x += 120) rect(x, y, 0.3, PH, shade(base, 0.6));
    }
    for (let i = 0; i < 6; i++) ellipse(rnd(i * 11) * w, rnd(i * 13 + 4) * h, 40, 6, "rgba(255, 255, 255, 0.05)");
  } else if (type === "gravier") {  // raked gravel: parallel lines, rings around a few stones
    rect(0, 0, w, h, base);
    for (let i = 0; i < w * h / 12; i++) rect(rnd(i * 5) * w, rnd(i * 9 + 2) * h, 0.6, 0.6, rnd(i) > 0.5 ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.1)");
    const stones = Array.from({ length: Math.max(2, Math.round(w * h / 30000)) }, (_, k) => [rnd(k * 17 + 3) * w, rnd(k * 29 + 7) * h, 4 + rnd(k) * 4]);
    for (let y = 2; y < h; y += 2.6) rect(0, y, w, 0.5, "rgba(0, 0, 0, 0.12)");
    for (const [x, y, r] of stones) {
      ellipse(x, y, r + 9, (r + 9) * 0.8, base);
      for (const k of [3, 5.6, 8.2]) { ellipse(x, y, r + k, (r + k) * 0.8, "rgba(0, 0, 0, 0.12)"); ellipse(x, y, r + k - 0.5, (r + k - 0.5) * 0.8, base); }
      ellipse(x, y, r, r * 0.8, "#76726a"); ellipse(x - 1, y - 1, r * 0.7, r * 0.5, "#9a968a"); ellipse(x + 1, y - r * 0.4, 1.6, 1, "#5a8a3a");
    }
  } else if (type === "ciment") {  // encaustic tiles: a cream quatrefoil and a diamond on each, a border, a little worn
    const T = 12, cream = "#e8dcc4";
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      const cx = tx + T / 2, cy = ty + T / 2;
      rect(tx, ty, T, T, shade(base, 0.95 + rnd(tx * 3 + ty) * 0.1));
      for (const [ox, oy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) ellipse(cx + ox, cy + oy, 2.2, 2.2, cream);
      ellipse(cx, cy, 2.6, 2.6, base); poly([[cx, cy - 1.8], [cx + 1.8, cy], [cx, cy + 1.8], [cx - 1.8, cy]], "#c9a24b");
      for (const [qx, qy] of [[tx, ty], [tx + T, ty], [tx, ty + T], [tx + T, ty + T]]) poly([[qx, qy - 2], [qx + 2, qy], [qx, qy + 2], [qx - 2, qy]], cream);
      rect(tx, ty, T, 0.35, "rgba(0, 0, 0, 0.3)"); rect(tx, ty, 0.35, T, "rgba(0, 0, 0, 0.3)");
      if (rnd(tx * 7 + ty * 3) > 0.9) ellipse(cx + 2, cy + 1, 3, 2, "rgba(255, 255, 255, 0.08)");
    }
  } else if (type === "vieuxparquet") {  // a dark old parquet: the planks, then dust, cracks, a board gone
    paintFloor(p, w, h, "parquet", base);
    for (let i = 0; i < 10; i++) ellipse(rnd(i * 3 + 1) * w, rnd(i * 7 + 2) * h, 14 + rnd(i) * 22, 5 + rnd(i * 5) * 6, "rgba(200, 190, 170, 0.05)");
    for (let i = 0; i < 18; i++) crack(rnd(i * 13) * w, Math.floor(rnd(i * 17 + 4) * h / 6) * 6 + 2 + rnd(i) * 2, 5 + Math.floor(rnd(i * 3) * 5), rnd(i * 19) > 0.5 ? 1 : -1);
    for (let i = 0; i < 2; i++) { const x = rnd(i * 23 + 7) * (w - 30), y = Math.floor(rnd(i * 29 + 5) * h / 6) * 6; rect(x, y, 18, 6, "#120c0a"); rect(x, y, 18, 0.8, "rgba(0, 0, 0, 0.6)"); }
  } else if (type === "marbrenoir") {  // veined marble slabs, a checker of two tones, thin joints
    const T = 20, vein = dark ? "rgba(232, 228, 240, 0.22)" : "rgba(40, 30, 40, 0.18)";
    for (let ty = 0; ty < h; ty += T) for (let tx = 0; tx < w; tx += T) {
      rect(tx, ty, T, T, ((tx + ty) / T) % 2 ? shade(base, dark ? 1.3 : 0.88) : base);
      for (let v = 0; v < 2; v++) {
        let x = tx + rnd(tx * 3 + ty + v) * T, y = ty;
        for (let k = 0; k < 5; k++) { const nx = x + (rnd(tx + ty * 7 + k + v * 9) - 0.5) * 9, ny = y + T / 5; line(x, y, nx, ny, 0.35, vein); x = nx; y = ny; }
      }
      rect(tx, ty, T, 0.3, dark ? "rgba(217, 164, 65, 0.4)" : "rgba(0, 0, 0, 0.25)"); rect(tx, ty, 0.3, T, dark ? "rgba(217, 164, 65, 0.4)" : "rgba(0, 0, 0, 0.25)");
      rect(tx + 1, ty + 1, T * 0.5, 0.4, "rgba(255, 255, 255, 0.07)");
    }
  } else return false;
  return true;
}

// a rug in the box (x0, y0, w, h): fringes on the short sides, as on the office rugs
function paintRug(p, x0, y0, w, h, type, base) {
  const { rect, ellipse } = p, dark = shade(base, 0.7), light = shade(base, 1.3);
  if (type === "aucun") return;
  if (type === "runes") {  // a circle of runes: rings, marks all around, a star at the heart
    const cx = x0 + w / 2, cy = y0 + h / 2, gold = "#d9a441", rx = w / 2, ry = h / 2;
    ellipse(cx + 1, cy + 1.5, rx, ry, "rgba(0,0,0,0.25)");
    ellipse(cx, cy, rx, ry, dark); ellipse(cx, cy, rx - 2, ry - 2, base); ellipse(cx, cy, rx - 3, ry - 3, gold, 0.6);
    ellipse(cx, cy, rx - 9, ry - 9, gold, 0.5);
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, x = cx + Math.cos(a) * (rx - 6.3), y = cy + Math.sin(a) * (ry - 6.3); rect(x - 0.4, y - 1, 0.8, 2, light); if (k % 2) rect(x - 0.9, y - 0.2, 1.8, 0.5, light); }
    const r = Math.min(rx, ry) - 13;
    p.poly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }), gold);
    return;
  }
  if (type === "rond") {
    const cx = x0 + w / 2, cy = y0 + h / 2;
    ellipse(cx + 1, cy + 1.5, w / 2, h / 2, "rgba(0,0,0,0.25)");
    ellipse(cx, cy, w / 2, h / 2, dark); ellipse(cx, cy, w / 2 - 6, h / 2 - 4, base);
    ellipse(cx, cy, w / 2 - 14, h / 2 - 8, "#fbaa08", 0.8);
    return;
  }
  rect(x0 + 1, y0 + 1.5, w, h, "rgba(0, 0, 0, 0.25)");
  rect(x0, y0, w, h, dark); rect(x0 + 1.5, y0 + 1.5, w - 3, h - 3, base);
  if (type === "liseré") {
    const y = "#fbaa08";
    rect(x0 + 2.5, y0 + 2.5, w - 5, 0.5, y); rect(x0 + 2.5, y0 + h - 3, w - 5, 0.5, y); rect(x0 + 2.5, y0 + 2.5, 0.5, h - 5, y); rect(x0 + w - 3, y0 + 2.5, 0.5, h - 5, y);
    for (let x = x0 + 6; x < x0 + w - 5; x += 6) for (let yy = y0 + 6; yy < y0 + h - 5; yy += 6) rect(x, yy, 0.6, 0.6, "rgba(255, 255, 255, 0.07)");
  } else if (type === "rayé") {
    for (let y = y0 + 4, k = 0; y < y0 + h - 4; y += 4, k++) rect(x0 + 1.5, y, w - 3, 2, k % 2 ? light : dark);
  } else if (type === "grille") {  // a simulator floor: a cyan grid, glowing nodes, a border of light
    const cy = "#00e5ff";
    rect(x0 + 2, y0 + 2, w - 4, 0.6, cy); rect(x0 + 2, y0 + h - 2.6, w - 4, 0.6, cy); rect(x0 + 2, y0 + 2, 0.6, h - 4, cy); rect(x0 + w - 2.6, y0 + 2, 0.6, h - 4, cy);
    for (let x = x0 + 6; x < x0 + w - 4; x += 6) rect(x, y0 + 3, 0.25, h - 6, "rgba(0, 229, 255, 0.35)");
    for (let y = y0 + 6; y < y0 + h - 4; y += 6) rect(x0 + 3, y, w - 6, 0.25, "rgba(0, 229, 255, 0.35)");
    for (let x = x0 + 6, i = 0; x < x0 + w - 4; x += 6) for (let y = y0 + 6; y < y0 + h - 4; y += 6, i++) if (i % 5 === 2) rect(x - 0.5, y - 0.5, 1.2, 1.2, i % 3 ? cy : "#ff3df2");
  } else if (type === "hexa") {  // honeycomb cells, a few lit
    const r = 3.2, dx = r * 1.732, dy = r * 1.5;
    for (let row = 0, y = y0 + 4; y < y0 + h - 3; y += dy, row++) for (let i = 0, x = x0 + 4 + (row % 2) * dx / 2; x < x0 + w - 3; x += dx, i++) {
      const lit = (i * 7 + row * 3) % 11 === 0, pts = Array.from({ length: 6 }, (_, k) => [x + Math.cos(Math.PI / 6 + k * Math.PI / 3) * r, y + Math.sin(Math.PI / 6 + k * Math.PI / 3) * r]);
      p.poly(pts, lit ? "rgba(0, 229, 255, 0.55)" : light);
      p.poly(pts.map(([px2, py2]) => [x + (px2 - x) * 0.82, y + (py2 - y) * 0.82]), lit ? "rgba(0, 229, 255, 0.3)" : base);
    }
  } else if (type === "etoiles") {  // a night sky: a gold border, stars of all sizes, a crescent moon, a comet
    const gold = "#d9a441";
    rect(x0 + 2.5, y0 + 2.5, w - 5, 0.6, gold); rect(x0 + 2.5, y0 + h - 3.1, w - 5, 0.6, gold); rect(x0 + 2.5, y0 + 2.5, 0.6, h - 5, gold); rect(x0 + w - 3.1, y0 + 2.5, 0.6, h - 5, gold);
    for (let k = 0; k < Math.round(w * h / 40); k++) { const v = Math.sin(k * 91.7) * 43758.5453, f = v - Math.floor(v), g2 = Math.sin(k * 17.3) * 9631.1, f2 = g2 - Math.floor(g2); const sz = k % 7 ? 0.5 : 1.1;
      rect(x0 + 5 + f * (w - 10), y0 + 5 + f2 * (h - 10), sz, sz, k % 5 ? "#f4efe2" : gold); }
    const mx = x0 + w * 0.72, my = y0 + h * 0.34, mr = Math.min(w, h) * 0.13;
    ellipse(mx, my, mr, mr, "#f4e7b0"); ellipse(mx + mr * 0.45, my - mr * 0.2, mr * 0.85, mr * 0.85, base);
    for (let k = 0; k < 6; k++) rect(x0 + w * 0.2 + k * 2, y0 + h * 0.66 - k * 1.1, 1.6 - k * 0.2, 0.6, k ? light : "#f4efe2");
  } else if (type === "carte") {  // a treasure map: parchment, the sea's edge, islands, a dotted path to the red X, a compass rose
    const ink = "#5a3a24", sea = "rgba(60, 120, 150, 0.35)";
    rect(x0 + 2, y0 + 2, w - 4, h - 4, sea); rect(x0 + 2, y0 + 2, w - 4, 2, dark); rect(x0 + 2, y0 + h - 4, w - 4, 2, dark);
    for (const [fx, fy, rx, ry] of [[0.3, 0.45, 0.2, 0.26], [0.7, 0.6, 0.16, 0.2], [0.78, 0.22, 0.08, 0.1]]) {
      ellipse(x0 + w * fx, y0 + h * fy, w * rx + 1.2, h * ry + 1.2, ink, 0.6); ellipse(x0 + w * fx, y0 + h * fy, w * rx, h * ry, base);
      for (let k = 0; k < 3; k++) ellipse(x0 + w * fx + (k - 1) * 3, y0 + h * fy - 1, 1.6, 0.8, "#4a7a3a");
    }
    for (let k = 0; k < 9; k++) { const t = k / 8; rect(x0 + w * (0.2 + t * 0.52) - 0.6, y0 + h * (0.5 + Math.sin(t * 5) * 0.1), 1.2, 1.2, "#8f1f2a"); }
    const xx = x0 + w * 0.72, xy = y0 + h * 0.62;
    p.poly([[xx - 3, xy - 3], [xx - 2, xy - 3], [xx + 3, xy + 2], [xx + 2, xy + 2.6]], "#c0303a"); p.poly([[xx + 3, xy - 3], [xx + 2, xy - 3], [xx - 3, xy + 2], [xx - 2, xy + 2.6]], "#c0303a");
    const cx = x0 + w * 0.12, cy = y0 + h * 0.2;
    p.poly([[cx, cy - 5], [cx + 1, cy], [cx, cy + 5], [cx - 1, cy]], ink); p.poly([[cx - 5, cy], [cx, cy - 1], [cx + 5, cy], [cx, cy + 1]], ink);
    for (let k = 0; k < 6; k++) ellipse(x0 + w * (0.55 + k * 0.04), y0 + h * (0.86 + Math.sin(k) * 0.03), 1.6, 1.2, k ? "#3a7a6a" : "#2a5a4a");  // a sea serpent
  } else if (type === "rosevents") {  // a compass rose of sixteen points, ringed with rope
    const cx = x0 + w / 2, cy = y0 + h / 2, R = Math.min(w, h) / 2 - 3, gold = "#d9a441", cream = "#efe2c0";
    ellipse(cx, cy, R, R * (h / w), "#c9a46a"); ellipse(cx, cy, R - 1.4, (R - 1.4) * (h / w), base);
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8 - Math.PI / 2, l = (k % 4 === 0 ? 1 : k % 2 ? 0.5 : 0.72) * (R - 3), wd = k % 4 === 0 ? 2.6 : 1.6;
      const tx = cx + Math.cos(a) * l, ty = cy + Math.sin(a) * l * (h / w), nx = Math.cos(a + Math.PI / 2) * wd, ny = Math.sin(a + Math.PI / 2) * wd * (h / w);
      p.poly([[cx, cy], [cx + nx, cy + ny], [tx, ty]], k % 2 ? cream : gold); p.poly([[cx, cy], [cx - nx, cy - ny], [tx, ty]], k % 2 ? shade(cream, 0.8) : shade(gold, 0.7));
    }
    ellipse(cx, cy, 2.2, 2.2, "#8f1f2a"); ellipse(cx, cy, 1, 1, gold);
    p.poly([[cx, y0 + 2.5], [cx + 1.6, y0 + 5], [cx, y0 + 4.2], [cx - 1.6, y0 + 5]], cream);
  } else if (type === "serviette") {  // a big beach towel: wide stripes, white bands, fringes, an embroidered sun
    for (let x = x0 + 2, k = 0; x < x0 + w - 2; x += (w - 4) / 7, k++) rect(x, y0 + 2, (w - 4) / 7, h - 4, k % 2 ? "#f4f2ea" : base);
    rect(x0 + 2, y0 + 2, w - 4, 1, "rgba(0, 0, 0, 0.1)");
    const cx = x0 + w / 2, cy = y0 + h * 0.3;
    ellipse(cx, cy, 4, 4, "#f0c040"); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; rect(cx + Math.cos(a) * 6 - 0.6, cy + Math.sin(a) * 6 - 0.6, 1.2, 1.2, "#f0c040"); }
  } else if (type === "monstera") {  // tropical leaves on a plain ground: split monstera leaves and palm fronds
    const leaf = lum(base) > 0.5 ? "#2f8a3a" : "#3fae5a", dleaf = shade(leaf, 0.7);
    for (let i = 0; i < 7; i++) {
      const cx = x0 + 6 + decorRnd(i * 7 + 1) * (w - 12), cy = y0 + 6 + decorRnd(i * 11 + 3) * (h - 12), r = 5 + decorRnd(i) * 3;
      if (i % 2) { ellipse(cx, cy, r, r * 0.8, leaf); for (let k = 0; k < 4; k++) rect(cx - r + k * r * 0.5 + 1, cy - 0.3, r * 0.3, 0.6, base); rect(cx - 0.3, cy - r * 0.8, 0.6, r * 1.6, dleaf); }
      else for (let k = -3; k <= 3; k++) p.poly([[cx, cy], [cx + k * 2.2, cy - r], [cx + k * 2.2 + 0.8, cy - r + 0.4]], leaf);
    }
  } else if (type === "vague") {  // the great wave: a deep curl, foam claws, a tiny Fuji under it
    const ink = lum(base) > 0.5 ? "#22336a" : "#e8e0c8", deep = lum(base) > 0.5 ? "#3a5a9a" : "#3a5a8a";
    for (let k = 0; k < 40; k++) { const t = k / 39, x = x0 + 3 + t * (w - 6), y = y0 + h * 0.7 - Math.sin(t * Math.PI) * h * 0.45 * (t < 0.7 ? 1 : 0.6); rect(x, y, (w - 6) / 39 + 0.5, y0 + h - 3 - y, deep); }
    for (let k = 0; k < 14; k++) { const a = Math.PI * 1.1 + k * 0.12, cx = x0 + w * 0.5, cy = y0 + h * 0.42; ellipse(cx + Math.cos(a) * h * 0.22, cy + Math.sin(a) * h * 0.2, 1.3, 1.1, ink); }
    for (let k = 0; k < 12; k++) ellipse(x0 + w * (0.12 + k * 0.03), y0 + h * (0.42 - Math.sin(k / 11 * Math.PI) * 0.25), 1.2, 1.2, "#f4efe0");
    p.poly([[x0 + w * 0.72, y0 + h * 0.66], [x0 + w * 0.78, y0 + h * 0.5], [x0 + w * 0.84, y0 + h * 0.66]], ink); p.poly([[x0 + w * 0.765, y0 + h * 0.54], [x0 + w * 0.78, y0 + h * 0.5], [x0 + w * 0.795, y0 + h * 0.54]], "#f4efe0");
    for (let y = y0 + h * 0.74; y < y0 + h - 3; y += 3) for (let x = x0 + 4; x < x0 + w - 4; x += 6) rect(x, y, 3, 0.5, "rgba(255, 255, 255, 0.4)");
  } else if (type === "sakura") {  // cherry blossoms and petals scattered on a plain ground
    for (let i = 0; i < 18; i++) {
      const cx = x0 + 5 + decorRnd(i * 7) * (w - 10), cy = y0 + 5 + decorRnd(i * 13 + 2) * (h - 10);
      if (i % 3) { rect(cx, cy, 1.4, 0.8, "#f8c8d8"); continue; }
      for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; ellipse(cx + Math.cos(a) * 1.6, cy + Math.sin(a) * 1.6, 1.3, 1.3, "#f8c8d8"); }
      ellipse(cx, cy, 0.8, 0.8, "#e8708a");
    }
  } else if (type === "toile") {  // a cobweb of silver: spokes from the heart, rings of thread, the spider in the middle
    const cx = x0 + w / 2, cy = y0 + h / 2, rx = w / 2 - 3, ry = h / 2 - 3, silver = "rgba(232, 228, 240, 0.75)";
    const ln = (ax, ay, bx, by, wd) => { const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L * wd / 2, ny = dx / L * wd / 2; p.poly([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], silver); };
    const N = 12, at = (k, f) => { const a = k * Math.PI * 2 / N; return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]; };
    for (let k = 0; k < N; k++) ln(cx, cy, ...at(k, 1), 0.35);
    for (const f of [0.18, 0.34, 0.5, 0.66, 0.82, 0.97]) for (let k = 0; k < N; k++) ln(...at(k, f), ...at(k + 1, f * 0.96), 0.25);
    ellipse(cx, cy + 1, 2.2, 2.6, "#0e0a12"); ellipse(cx, cy - 2, 1.4, 1.4, "#0e0a12"); rect(cx - 0.3, cy, 0.6, 0.6, "#c0303a");
    for (const sd of [-1, 1]) for (const dy of [-1.4, 0, 1.4, 2.6]) ln(cx, cy + dy * 0.5, cx + sd * 4, cy + dy * 1.4 - 1, 0.4);
  } else if (type === "elime") {  // an old oriental rug, faded, moth-eaten, holes down to the floor
    const gold = "#b8963a", cx = x0 + w / 2, cy = y0 + h / 2;
    rect(x0 + 1.5, y0 + 1.5, w - 3, 4, dark); rect(x0 + 1.5, y0 + h - 5.5, w - 3, 4, dark); rect(x0 + 1.5, y0 + 1.5, 4, h - 3, dark); rect(x0 + w - 5.5, y0 + 1.5, 4, h - 3, dark);
    for (let x = x0 + 3; x < x0 + w - 3; x += 3) if (decorRnd(x) > 0.2) { rect(x, y0 + 3, 1, 1, gold); rect(x, y0 + h - 4, 1, 1, gold); }
    const r = Math.min(h / 2 - 9, 13);
    p.poly([[cx, cy - r], [cx + r * 1.8, cy], [cx, cy + r], [cx - r * 1.8, cy]], dark); p.poly([[cx, cy - r + 3], [cx + r * 1.8 - 5, cy], [cx, cy + r - 3], [cx - r * 1.8 + 5, cy]], shade(base, 1.15));
    for (let i = 0; i < 40; i++) rect(x0 + 4 + decorRnd(i * 13) * (w - 8), y0 + 4 + decorRnd(i * 29 + 3) * (h - 8), 2 + decorRnd(i) * 4, 0.6, "rgba(255, 255, 255, 0.06)");  // the worn threads
    for (const [fx, fy, fr] of [[0.22, 0.3, 2.6], [0.78, 0.68, 3.2], [0.6, 0.22, 1.6], [0.3, 0.76, 1.8]]) {  // the holes
      ellipse(x0 + w * fx, y0 + h * fy, fr * 1.4, fr, "#4a3a2a"); ellipse(x0 + w * fx, y0 + h * fy, fr * 1.4, fr, light, 0.4);
    }
  } else if (type === "persan") {
    const gold = "#d9a441", cx = x0 + w / 2, cy = y0 + h / 2;
    rect(x0 + 1.5, y0 + 1.5, w - 3, 4, dark); rect(x0 + 1.5, y0 + h - 5.5, w - 3, 4, dark);
    rect(x0 + 1.5, y0 + 1.5, 4, h - 3, dark); rect(x0 + w - 5.5, y0 + 1.5, 4, h - 3, dark);
    for (let x = x0 + 3; x < x0 + w - 3; x += 3) { rect(x, y0 + 3, 1, 1, gold); rect(x, y0 + h - 4, 1, 1, gold); }
    rect(x0 + 6, y0 + 6, w - 12, 0.5, gold); rect(x0 + 6, y0 + h - 6.5, w - 12, 0.5, gold); rect(x0 + 6, y0 + 6, 0.5, h - 12, gold); rect(x0 + w - 6.5, y0 + 6, 0.5, h - 12, gold);
    const r = Math.min(h / 2 - 9, 14);  // central medallion
    p.poly([[cx, cy - r], [cx + r * 1.8, cy], [cx, cy + r], [cx - r * 1.8, cy]], dark);
    p.poly([[cx, cy - r + 3], [cx + r * 1.8 - 5, cy], [cx, cy + r - 3], [cx - r * 1.8 + 5, cy]], light);
    rect(cx - 1, cy - 1, 2, 2, gold);
    for (let x = x0 + 10; x < x0 + w - 10; x += 8) for (let y = y0 + 9; y < y0 + h - 9; y += 7) if (Math.abs(x - cx) / (r * 1.8) + Math.abs(y - cy) / r > 1.3) rect(x, y, 1.2, 1.2, light);
  }
  for (let x = x0 + 1; x < x0 + w; x += 2) { rect(x, y0 - 1, 0.5, 1, "#c9c1a8"); rect(x, y0 + h, 0.5, 1, "#c9c1a8"); }  // fringes
}

// floor of a room (everything below the wall), with its rugs; cached per scale and setting
const floorCaches = {};
export function roomFloorCanvas(room, h, rugs, fw = W) {
  const d = decor[room], sig = `${S}|${fw}|${h}|${decorSig(room, ["floor", "floorColor", "rug", "rugColor"])}|${JSON.stringify(rugs)}`;
  if (floorCaches[room]?.sig === sig) return floorCaches[room].c;
  const p = decorPainter(fw, h);
  paintFloor(p, fw, h, d.floor, d.floorColor);
  for (const [x, y, w, hh] of rugs) paintRug(p, x, y, w, hh, d.rug, d.rugColor);
  for (let k = 0; k < 8; k++) p.rect(0, k, fw, 1, `rgba(10, 8, 30, ${0.28 - k * 0.035})`);  // shade cast by the wall
  floorCaches[room] = { sig, c: p.c };
  return p.c;
}

// the wall, 70 high; the chair rail and the baseboard stay drawn by each room
const wallCaches = {};
function roomWallCanvas(room) {
  const d = decor[room], sig = `${S}|${d.wall}|${d.wallColor}|${d.wood}`;
  if (wallCaches[room]?.sig === sig) return wallCaches[room].c;
  const p = decorPainter(W, 70), { rect } = p, base = d.wallColor, rnd = decorRnd;
  rect(0, 0, W, 70, base);
  if (d.wall === "lambris") for (let x = 0; x < W; x += 16) rect(x, 0, 1, 70, shade(base, 0.87));
  else if (d.wall === "rayures") for (let x = 0; x < W; x += 12) { rect(x, 0, 6, 70, shade(base, 1.12)); rect(x + 6, 0, 0.4, 70, shade(base, 0.85)); }
  else if (d.wall === "briques") {
    rect(0, 0, W, 70, shade(base, 0.7));
    for (let row = 0, y = 0; y < 70; row++, y += 5) for (let x = row % 2 ? -6 : 0, k = 0; x < W; x += 12, k++)
      rect(x + 0.5, y + 0.5, 11, 4, shade(base, 0.92 + rnd(row * 53 + k) * 0.18));
  } else if (d.wall === "papier") {
    const m = shade(base, lum(base) > 0.5 ? 0.85 : 1.25);
    for (let y = 4, r = 0; y < 70; y += 8, r++) for (let x = r % 2 ? 6 : 0; x < W; x += 12) p.poly([[x, y - 2], [x + 2, y], [x, y + 2], [x - 2, y]], m);
  } else if (paintThemeWall(p, W, 70, d.wall, base)) { /* a theme's wall */
  } else if (d.wall === "boiserie") {  // wainscot in the furniture wood below the chair rail
    const wood = d.wood;
    rect(0, 40, W, 30, shade(wood, 0.85)); rect(0, 40, W, 1.2, shade(wood, 1.15));
    for (let x = 3; x < W; x += 24) { rect(x, 43, 20, 20, shade(wood, 0.75)); rect(x + 1, 44, 18, 18, shade(wood, 0.95)); rect(x + 1, 44, 18, 0.5, shade(wood, 1.12)); }
  }
  for (let y = 0; y < 6; y++) rect(0, y, W, 1, `rgba(0, 0, 0, ${0.18 - y * 0.03})`);  // ceiling shade
  wallCaches[room] = { sig, c: p.c };
  return p.c;
}
export function drawWall(room) { ctx.drawImage(roomWallCanvas(room), 0, 0); }

// the themes' walls (THEME_WALLS) on a strip w × h (the room's is 70 high; a buy mode sample 32); false: not one of them
function paintThemeWall(p, w, h, type, base) {
  const { rect, poly, ellipse } = p, rnd = decorRnd, rail = Math.round(h * 0.57);
  if (type === "pierre") {  // dressed stone: courses of blocks, the mortar in the joints, a little moss on the green stone
    rect(0, 0, w, h, shade(base, 0.6));
    for (let row = 0, y = 0; y < h; row++, y += 8) for (let x = -rnd(row * 7) * 14, k = 0; x < w; k++) {
      const bw = 13 + Math.floor(rnd(row * 61 + k) * 9), c = shade(base, 0.86 + rnd(row * 37 + k * 3) * 0.24);
      rect(x + 0.5, y + 0.5, bw - 1, 7, c); rect(x + 0.5, y + 0.5, bw - 1, 0.7, shade(c, 1.14)); rect(x + 0.5, y + 6.8, bw - 1, 0.7, shade(c, 0.78));
      if (rnd(row * 13 + k * 5) > 0.82) rect(x + 2 + rnd(k) * (bw - 6), y + 2 + rnd(row) * 3, 2.5, 0.4, shade(c, 0.72));  // a chip
      if (base === "#7f8a74" && y > h * 0.55 && rnd(row * 29 + k) > 0.6) ellipse(x + rnd(k * 3) * bw, y + 6.5, 2.4, 1, "rgba(70, 110, 50, 0.55)");
      x += bw;
    }
  } else if (type === "plaques") {  // riveted hull plates, a vent now and then, a strip of light along the wall
    rect(0, 0, w, h, shade(base, 0.62));
    for (let y = 0, row = 0; y < h; y += 22, row++) for (let x = row % 2 ? -12 : 0, k = 0; x < w; x += 24, k++) {
      const c = shade(base, 0.92 + rnd(row * 41 + k) * 0.12);
      rect(x + 0.4, y + 0.4, 23.2, 21.2, c); rect(x + 0.4, y + 0.4, 23.2, 0.6, shade(c, 1.18)); rect(x + 0.4, y + 21, 23.2, 0.6, shade(c, 0.75));
      for (const [rx, ry] of [[2, 2], [21.4, 2], [2, 19.4], [21.4, 19.4]]) { rect(x + rx, y + ry, 0.8, 0.8, shade(c, 1.35)); rect(x + rx + 0.4, y + ry + 0.4, 0.4, 0.4, shade(c, 0.6)); }
      if (rnd(row * 17 + k * 7) > 0.84) { rect(x + 6, y + 6, 12, 9, shade(c, 0.5)); for (let s = 0; s < 4; s++) rect(x + 6.5, y + 7 + s * 2, 11, 1, shade(c, 1.1)); }  // a vent
    }
    rect(0, rail - 1.6, w, 3.2, shade(base, 0.45)); rect(0, rail - 0.7, w, 1.4, "#7fe6ff"); rect(0, rail - 0.2, w, 0.4, "#e8fcff");  // the light strip
    rect(0, rail - 2.6, w, 1, "rgba(127, 230, 255, 0.18)"); rect(0, rail + 1.6, w, 1, "rgba(127, 230, 255, 0.18)");
  } else if (type === "damas") {  // damask paper, torn here and there, over dark wood panels; a cornice
    const m = shade(base, 1.45), wood = "#2a1c1a";
    for (let y = 6, r = 0; y < rail; y += 10, r++) for (let x = r % 2 ? 7 : 0; x < w; x += 14) {
      poly([[x, y - 3.4], [x + 2.2, y], [x, y + 3.4], [x - 2.2, y]], m); rect(x - 0.4, y - 4.6, 0.8, 0.8, m); rect(x - 0.4, y + 3.8, 0.8, 0.8, m);
      ellipse(x - 3, y, 0.7, 1.4, m); ellipse(x + 3, y, 0.7, 1.4, m);
    }
    for (let i = 0; i < Math.round(w / 90); i++) {  // the torn paper: the old plaster shows through
      const x = rnd(i * 31 + 3) * (w - 14), y = 6 + rnd(i * 19 + 1) * (rail - 18);
      poly([[x, y], [x + 7, y + 1.5], [x + 12, y + 0.5], [x + 10, y + 5], [x + 4, y + 7], [x + 1, y + 4]], "#8a7a6a");
      poly([[x + 7, y + 1.5], [x + 12, y + 0.5], [x + 9, y + 3]], shade(base, 0.7));
    }
    rect(0, 0, w, 3, wood); rect(0, 3, w, 0.8, shade(wood, 1.6)); rect(0, 3.8, w, 0.6, "rgba(0, 0, 0, 0.4)");  // the cornice
    rect(0, rail, w, h - rail, shade(wood, 1.1)); rect(0, rail, w, 1.4, shade(wood, 1.9)); rect(0, rail + 1.4, w, 0.5, "#120c0a");
    for (let x = 3; x < w; x += 20) { rect(x, rail + 4, 16, h - rail - 9, shade(wood, 0.8)); rect(x + 1, rail + 5, 14, h - rail - 11, shade(wood, 1.25)); rect(x + 1, rail + 5, 14, 0.5, shade(wood, 1.7)); }
  } else if (type === "borde") {  // tarred strakes, their butts pinned with treenails, a wale, a rope rail
    for (let y = 0, row = 0; y < h; y += 6, row++) {
      for (let x = -rnd(row * 11) * 50, k = 0; x < w; k++) {
        const len = 38 + Math.floor(rnd(row * 53 + k) * 34), c = shade(base, 0.84 + rnd(row * 23 + k * 7) * 0.26);
        rect(x, y, len, 6, c); rect(x, y, len, 0.5, shade(c, 1.15)); rect(x, y + 5.4, len, 0.6, "#1a120c"); rect(x + len - 0.5, y, 0.5, 6, "#1a120c");
        rect(x + len - 2.4, y + 1.6, 0.9, 0.9, shade(c, 0.6)); rect(x + len - 2.4, y + 3.6, 0.9, 0.9, shade(c, 0.6));  // the treenails
        x += len;
      }
      for (let k = 0; k < w / 30; k++) if (rnd(row * 7 + k * 13) > 0.7) rect(rnd(row + k * 3) * w, y + 2 + rnd(k) * 2, 6, 0.3, shade(base, 0.7));  // the grain
    }
    rect(0, rail, w, 3.4, shade(base, 0.55)); rect(0, rail, w, 0.6, shade(base, 0.9)); rect(0, rail + 3.4, w, 0.6, "#1a120c");  // the wale
    const ry = Math.round(h * 0.32);
    for (let x = 0; x < w; x += 2) { poly([[x, ry + 1.6], [x + 1.2, ry], [x + 2.2, ry], [x + 1, ry + 1.6]], x % 4 ? "#c9a46a" : "#a0804a"); }  // the rope rail
    rect(0, ry + 1.6, w, 0.4, "rgba(0, 0, 0, 0.35)");
  } else if (type === "shoji") {  // posts of the wood colour, rice paper on a fine lattice, a low kick panel, the lintel
    const wood = base, paper = "#efe8d6", top = 9, kick = Math.round(h * 0.82);
    rect(0, 0, w, top - 2.5, "#e4dcc6"); rect(0, top - 2.5, w, 2.5, wood); rect(0, top - 2.5, w, 0.5, shade(wood, 1.3));  // the plaster, the lintel
    rect(0, top, w, kick - top, paper);
    for (let x = 0; x < w; x += 24) {
      rect(x, top, 2, h - top, wood); rect(x, top, 0.5, h - top, shade(wood, 1.3));  // a post
      for (let gx = x + 2 + 5.5; gx < x + 24; gx += 5.5) rect(gx, top, 0.6, kick - top, shade(wood, 1.1));
      for (let gy = top + 7; gy < kick; gy += 7) rect(x + 2, gy, 22, 0.6, shade(wood, 1.1));
    }
    rect(0, kick, w, h - kick, shade(wood, 0.92)); rect(0, kick, w, 0.8, shade(wood, 1.3));
    for (let i = 0; i < 4; i++) rect(0, top + 1 + i, w, 1, `rgba(255, 244, 214, ${0.12 - i * 0.03})`);  // the light through the paper
  } else if (type === "cabine") {  // painted planks in stripes, a scalloped valance
    const white = "#f4f2ea";
    for (let x = 0, k = 0; x < w; x += 6, k++) { const c = k % 2 ? white : base; rect(x, 0, 6, h, c); rect(x, 0, 0.5, h, shade(c, 1.08)); rect(x + 5.6, 0, 0.4, h, shade(c, 0.72)); }
    for (let x = 0; x < w; x += 2) if (rnd(x * 1.7) > 0.93) rect(x, 8 + rnd(x) * (h - 16), 1.4, 0.4, "rgba(255, 255, 255, 0.5)");  // the paint flaking
    rect(0, 0, w, 3, base); rect(0, 3, w, 0.5, shade(base, 0.7));
    for (let x = 0; x < w; x += 6) { ellipse(x + 3, 3.2, 3, 2.2, base); ellipse(x + 3, 3.2, 1, 0.8, white); }  // the valance
  } else if (type === "bambou") {  // close canes with their nodes, lashings of rope, a thatched coping
    for (let x = 0, k = 0; x < w; x += 4, k++) {
      const c = shade(base, 0.86 + rnd(k * 17) * 0.24);
      rect(x, 0, 4, h, c); rect(x + 0.6, 0, 0.8, h, shade(c, 1.2)); rect(x + 3.4, 0, 0.6, h, shade(c, 0.65));
      for (let y = 4 + rnd(k * 7) * 12; y < h; y += 13 + rnd(k * 3 + y) * 4) { rect(x, y, 4, 0.9, shade(c, 0.7)); rect(x, y + 0.9, 4, 0.4, shade(c, 1.25)); }
    }
    for (const y of [Math.round(h * 0.3), Math.round(h * 0.78)]) for (let x = 0; x < w; x += 4) { rect(x + 1, y, 2, 2.4, "#6a4a2a"); rect(x + 1, y, 2, 0.6, "#a07a4a"); }
    for (let x = 0; x < w; x += 1.5) rect(x, 0, 1.5, 4 + rnd(x * 2.3) * 2.5, shade("#b89a5a", 0.8 + rnd(x * 5.1) * 0.35));  // the thatch
  } else return false;
  return true;
}

// the themes' doors (THEME_DOORS), 30 × 50 like the room's: the frame from 2 to 28, the leaf in 4, 4, 22, 44
function themeDoorSvg(style, c) {
  const hi = shade(c, 1.25), lo = shade(c, 0.72), dk = shade(c, 0.55);
  if (style === "ogive") {  // in a stone arch, a pointed door of planks, iron straps and studs, a ring
    let b = `<path fill="#8d8a80" d="M0 50V16Q0 1 15 0Q30 1 30 16V50Z"/><path fill="#6a675e" d="M2 50V17Q2 3 15 2Q28 3 28 17V50Z"/>`
      + `<path fill="${c}" d="M4 48V18Q4 5 15 4Q26 5 26 18V48Z"/>`;
    for (let x = 9.5; x < 26; x += 5.5) b += `<rect x="${x}" y="5" width="0.6" height="43" fill="${lo}"/>`;
    for (const y of [16, 38]) { b += `<rect x="4" y="${y}" width="22" height="2.2" fill="#2a2a2e"/>`; for (let x = 6; x < 26; x += 4) b += `<rect x="${x}" y="${y + 0.6}" width="1" height="1" fill="#8a8a90"/>`; }
    return b + `<circle cx="20" cy="28" r="2.2" fill="none" stroke="#3a3a40" stroke-width="0.9"/><rect x="19.4" y="25.2" width="1.2" height="1.2" fill="#3a3a40"/>`
      + `<path fill="#a8a498" d="M14 0h2v2h-2zM0 24h2v1H0zM28 30h2v1h-2z"/>`;
  }
  if (style === "sas") {  // two sliding halves, a frame in safety stripes, a light over it
    let b = `<rect x="0" y="0" width="30" height="50" fill="#2a3340"/>`;
    for (let k = 0; k < 25; k++) b += `<rect x="0" y="${k * 2}" width="2" height="2" fill="${k % 2 ? "#1c1c22" : "#f0c020"}"/><rect x="28" y="${k * 2}" width="2" height="2" fill="${k % 2 ? "#f0c020" : "#1c1c22"}"/>`
      + (k < 15 ? `<rect x="${k * 2}" y="0" width="2" height="2" fill="${k % 2 ? "#1c1c22" : "#f0c020"}"/>` : "");
    b += `<rect x="2" y="2" width="26" height="48" fill="#1c222c"/><rect x="4" y="4" width="11" height="44" fill="${c}"/><rect x="15" y="4" width="11" height="44" fill="${shade(c, 0.92)}"/>`
      + `<rect x="14.6" y="4" width="0.8" height="44" fill="${dk}"/><rect x="4" y="4" width="22" height="0.8" fill="${hi}"/>`
      + `<rect x="7" y="10" width="5" height="12" rx="1" fill="#1a2a3a"/><rect x="18" y="10" width="5" height="12" rx="1" fill="#1a2a3a"/><rect x="7.5" y="10.5" width="1.4" height="5" fill="#7fe6ff" fill-opacity=".5"/>`
      + `<rect x="4" y="30" width="22" height="1.2" fill="#f0c020"/><rect x="4" y="32" width="22" height="1.2" fill="#1c1c22"/>`
      + `<rect x="12" y="0" width="6" height="1.6" fill="#7fe6ff"/>`;
    return b;
  }
  if (style === "heurtoir") {  // a heavy door of dark panels, iron hinges, a brass ring knocker
    return `<rect x="2" y="2" width="26" height="48" fill="#120c0a"/><rect x="4" y="4" width="22" height="44" fill="${c}"/>`
      + `<rect x="0" y="0" width="30" height="2.4" fill="#1a1210"/><path fill="#3a2a22" d="M0 0h30v1H0z"/>`
      + `<rect x="7" y="7" width="7" height="16" fill="${lo}"/><rect x="16" y="7" width="7" height="16" fill="${lo}"/><rect x="7" y="27" width="7" height="18" fill="${lo}"/><rect x="16" y="27" width="7" height="18" fill="${lo}"/>`
      + `<rect x="7.6" y="7.6" width="5.8" height="14.8" fill="${hi}"/><rect x="16.6" y="7.6" width="5.8" height="14.8" fill="${hi}"/><rect x="7.6" y="27.6" width="5.8" height="16.8" fill="${hi}"/><rect x="16.6" y="27.6" width="5.8" height="16.8" fill="${hi}"/>`
      + `<rect x="4" y="9" width="6" height="1.6" fill="#2a2a2e"/><rect x="4" y="40" width="6" height="1.6" fill="#2a2a2e"/>`
      + `<circle cx="15" cy="22" r="2.8" fill="none" stroke="#c9a24b" stroke-width="0.9"/><rect x="14" y="18.6" width="2" height="1.6" fill="#c9a24b"/>`
      + `<rect x="21" y="25" width="1.6" height="2.4" fill="#c9a24b"/><path fill="#d8d4cc" fill-opacity=".5" d="M24 4l2 0l0 3zM25 4.6l1-0.6"/>`;
  }
  if (style === "cale") {  // planks, iron bands, a small barred window, a latch
    let b = `<rect x="2" y="2" width="26" height="48" fill="#1a120c"/><rect x="4" y="4" width="22" height="44" fill="${c}"/>`;
    for (let x = 4; x < 26; x += 5.5) b += `<rect x="${x}" y="4" width="5.5" height="44" fill="${shade(c, 0.9 + (x % 3) * 0.06)}"/><rect x="${x + 5}" y="4" width="0.5" height="44" fill="${dk}"/>`;
    for (const y of [9, 38]) b += `<rect x="4" y="${y}" width="22" height="2.4" fill="#3a3a3e"/><rect x="5" y="${y + 0.7}" width="1" height="1" fill="#8a8a90"/><rect x="24" y="${y + 0.7}" width="1" height="1" fill="#8a8a90"/>`;
    return b + `<rect x="10" y="15" width="10" height="8" fill="#0d0a12"/><rect x="10" y="15" width="10" height="8" fill="none" stroke="#3a3a3e" stroke-width="0.8"/>`
      + `<rect x="13" y="15" width="0.8" height="8" fill="#5a5a60"/><rect x="16.2" y="15" width="0.8" height="8" fill="#5a5a60"/>`
      + `<rect x="20" y="27" width="4" height="1.4" fill="#5a5a60"/><rect x="22.6" y="26" width="1.4" height="3.4" fill="#3a3a3e"/>`;
  }
  if (style === "fusumadoor") {  // two painted sliding panels in a lacquered frame: the great wave, a cloud of gold, round pulls
    return `<rect x="2" y="2" width="26" height="48" fill="${dk}"/><rect x="4" y="4" width="22" height="44" fill="${c}"/>`
      + `<rect x="5" y="5" width="9.6" height="42" fill="#e8dcc0"/><rect x="15.4" y="5" width="9.6" height="42" fill="#e4d6b8"/>`
      + `<path fill="#e0b84a" fill-opacity=".8" d="M6 9h6q2 0 2 2h-8zM17 12h6q1.6 0 1.6 1.6h-7.6z"/>`
      + `<path fill="#1f4a8a" d="M5 47V36q4-6 8-2q-3 0-3 3q2-2 4-1V47zM15.4 47V38q4-5 9.6-1V47z"/><path fill="#f4f2ea" d="M7 36q3-3 6-1q-2 0-3 2zM17 37q3-2 6 0q-2 0-3 1z"/>`
      + `<circle cx="12.6" cy="27" r="1.2" fill="${dk}"/><circle cx="17.4" cy="27" r="1.2" fill="${dk}"/><rect x="14.6" y="4" width="0.8" height="44" fill="${dk}"/>`;
  }
  if (style === "cabinedoor") {  // the striped planks of a beach hut, a heart cut out, a valance on top
    let b = `<rect x="2" y="2" width="26" height="48" fill="${dk}"/>`;
    for (let x = 4, k = 0; x < 26; x += 5.5, k++) b += `<rect x="${x}" y="4" width="5.5" height="44" fill="${k % 2 ? "#f4f2ea" : c}"/><rect x="${x + 5.1}" y="4" width="0.4" height="44" fill="#00000033"/>`;
    b += `<path fill="#0d0a12" d="M15 17l-3-3a1.8 1.8 0 0 1 3-2a1.8 1.8 0 0 1 3 2z"/>`;
    for (let x = 0; x < 30; x += 5) b += `<path fill="${c}" d="M${x} 0h5v2.4a2.5 2.5 0 0 1-5 0z"/>`;
    return b + `<rect x="20" y="25" width="3" height="2.5" fill="#c9a24b"/><circle cx="8" cy="34" r="2.2" fill="none" stroke="#e8402a" stroke-width="1"/>`;
  }
  return null;
}

/* ---------- recolored sprites: wood furniture and doors ---------- */
const WOOD_TONES = { "#a07c58": 1.16, "#8a6a4a": 1, "#765a3e": 0.85, "#6d5238": 0.79, "#5e4630": 0.68, "#4a3826": 0.54 };
export function woodSprite(name, base) {
  if (base === DECOR_DEFAULT.office.wood) return SPRITES[name];
  return SPRITES[name].derive(base, svg => svg.replace(/#[0-9a-f]{6}/gi, c => WOOD_TONES[c.toLowerCase()] ? shade(base, WOOD_TONES[c.toLowerCase()]) : c));
}
const doorSprites = new Map();
export const doorSprite = room => { const d = decor[room] || decor.office; return doorArt(d.door, d.doorColor); };
// a door of the given style and colour, 30 × 50; its leaf (world/physics.js drawDoorOpen) is in 4, 4, 22, 44
function doorArt(style, c) {
  const key = `door:${style}:${c}`;
  if (doorSprites.has(key)) return doorSprites.get(key);
  const theme = themeDoorSvg(style, c);
  if (theme) { doorSprites.set(key, new Sprite(key, 30, 50, theme)); return doorSprites.get(key); }
  const hi = shade(c, 1.21), lo = shade(c, 0.77), edge = shade(c, 0.87), fill = shade(c, 1.09);
  let b = `<rect x="2" y="2" width="26" height="46" fill="#061238"/><rect x="4" y="4" width="22" height="44" fill="${c}"/>`
    + `<rect x="4" y="4" width="1" height="44" fill="${hi}"/><rect x="25" y="4" width="1" height="44" fill="${lo}"/>`;
  if (style === "vitrée") b += `<rect x="7" y="7" width="16" height="15" fill="${edge}"/><rect x="8" y="8" width="14" height="13" fill="#9fd0ff"/>`
    + `<rect x="14.6" y="8" width="0.8" height="13" fill="${edge}"/><rect x="8" y="14.1" width="14" height="0.8" fill="${edge}"/>`
    + `<path fill="#fff" fill-opacity=".55" d="M9 9h2l-2 3zM16 9h1.6l-1.6 2.4z"/>`
    + `<rect x="7" y="27" width="16" height="18" fill="${edge}"/><rect x="8" y="28" width="14" height="16" fill="${fill}"/>`;
  else if (style === "lisse") b += `<rect x="9" y="9" width="12" height="1" fill="${lo}" fill-opacity=".5"/><rect x="5" y="42" width="20" height="5" fill="#b8bcc8"/><rect x="5" y="42" width="20" height="0.6" fill="#e0e3ea"/>`;
  else b += `<rect x="7" y="7" width="16" height="15" fill="${edge}"/><rect x="8" y="8" width="14" height="13" fill="${fill}"/>`
    + `<rect x="7" y="27" width="16" height="18" fill="${edge}"/><rect x="8" y="28" width="14" height="16" fill="${fill}"/>`;
  b += `<rect x="20" y="24.5" width="3" height="2.5" fill="#c9a24b"/><rect x="20" y="24.5" width="1.5" height="1" fill="#f2d27b"/>`;
  doorSprites.set(key, new Sprite(key, 30, 50, b));
  return doorSprites.get(key);
}
// the window with this room's curtains (svg/sky.js)
export function drawWindow(room, x, y) {
  const { curtain, curtainColor } = decor[room];
  ART.window.draw(x, y, { style: curtain, color: curtainColor });
}

// a look tried on in the buy mode (build.js): shown in the room, never saved, until it is bought or put back
let trying = null;  // { room, was: the values it hides }
export function tryDecor(room, kv) {
  untryDecor();
  if (!decor[room]) return;
  trying = { room, was: Object.fromEntries(Object.keys(kv).map(k => [k, decor[room][k]])) };
  Object.assign(decor[room], kv);
}
export function untryDecor() { if (trying) { Object.assign(decor[trying.room], trying.was); trying = null; } }
// what a room really has, under what is tried on
export const decorSaved = room => trying?.room === room ? { ...decor[room], ...trying.was } : decor[room] || DECOR_DEFAULT.office;
// a room's walls, door or floor bought in the buy mode (build.js): kept with the decor
export function applyDecor(room, kv) {
  untryDecor();
  decor[room] = { ...(decor[room] || DECOR_DEFAULT.office), ...kv };
  SaveSlot.get("office-decor").save(decor);
}
// a rug bought (build.js): its footprint painted on a canvas (shape: liseré, uni, rayé, persan, rond)
const rugs = new Map();
export function rugCanvas(shape, color, w, d) {
  const key = `${S}|${shape}|${color}|${w}|${d}`;
  if (rugs.has(key)) return rugs.get(key);
  const p = decorPainter(w, d); paintRug(p, 1, 1, w - 2, d - 2, shape, color);
  if (rugs.size > 60) rugs.clear();
  rugs.set(key, p.c); return p.c;
}
// the beach tiles (items/beach.js: rugs laid side by side, walked on, furniture on top): sand, shore, sea. The shape
// f(u, v) of a tile, turned by rot: > 0 sand, < 0 water; the shores meet the tile's edges at their middle, so that a
// straight shore, a point and a cove fit together whichever way they are turned
const TILE_F = { sable: () => 1, mer: () => -1, rivage: (u, v) => v - 0.5 + Math.sin(u * Math.PI) * 0.05,
  pointe: (u, v) => 0.5 - Math.hypot(u - 1, v - 1), crique: (u, v) => Math.hypot(u, v) - 0.5 };
const turnUV = (a, b, r) => r === 1 ? [b, 1 - a] : r === 2 ? [1 - a, 1 - b] : r === 3 ? [1 - b, a] : [a, b];
export const tileF = (shape, a, b, rot = 0) => (TILE_F[shape] || TILE_F.sable)(...turnUV(a, b, ((rot % 4) + 4) % 4));
export const TILE_SAND = "#e8d4a0";
const hexRgb = h => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixHex = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
// a tile painted once per scale, shape, colour and turn: the sand (wet near the water), the water from the shallows to
// the deep; color: the sand's for a sand tile, the water's otherwise
export function tileCanvas(shape, color, w, d, rot = 0) {
  const key = `tile|${S}|${shape}|${color}|${w}|${d}|${rot % 4}`;
  if (rugs.has(key)) return rugs.get(key);
  const p = decorPainter(w, d), { rect, ellipse } = p, sand = shape === "sable" ? color : TILE_SAND, water = shape === "sable" ? "#1a8ab8" : color;
  const st = 0.5;
  for (let y = 0; y < d; y += st) for (let x = 0; x < w; x += st) {
    const fu = tileF(shape, (x + st / 2) / w, (y + st / 2) / d, rot) * w, n = decorRnd(x * 13.1 + y * 7.7);
    let col;
    if (fu > 2.2) col = shade(sand, 0.95 + n * 0.1);
    else if (fu > 0) col = shade(sand, 0.8 + n * 0.05);  // the wet sand
    else col = mixHex(mixHex(water, "#c8f8f0", 0.5), water, Math.max(0, Math.min(1, -fu / 12 + (n - 0.5) * 0.08)));  // the shallows to the deep
    rect(x, y, st, st, col);
  }
  if (shape !== "mer") for (let i = 0; i < 6; i++) {  // the sand's ripples, a shell
    const x = decorRnd(i * 17 + 2) * (w - 6) + 3, y = decorRnd(i * 23 + 5) * (d - 4) + 2;
    if (tileF(shape, x / w, y / d, rot) * w < 4) continue;
    if (i === 0) { ellipse(x, y, 1.2, 0.9, "#f4e2d8"); rect(x - 0.15, y - 0.8, 0.3, 1.4, "rgba(200, 140, 120, 0.5)"); }
    else rect(x, y, 4 + decorRnd(i) * 4, 0.4, "rgba(150, 110, 50, 0.16)");
  }
  if (rugs.size > 80) rugs.clear();
  rugs.set(key, p.c); return p.c;
}
// the water of a tile, live (build.js drawRug): crests of waves that roll across the tiles (in room coordinates, so that
// neighbouring tiles match), glints of sun, and on a shore the foam that comes and goes on the sand
export function drawTileAnim(it, shape, w, d, t) {
  if (shape === "sable" || hub.focusMode) return;
  const X0 = it.x, Y0 = it.y, rot = it.rot || 0, step = 1.6;
  for (let y = 0; y < d; y += step) for (let x = 0; x < w; x += step) {
    const fu = tileF(shape, (x + step / 2) / w, (y + step / 2) / d, rot) * w;
    if (fu >= -0.4) continue;
    const X = X0 + x, Y = Y0 + y, ph = ((Y * 0.7 + Math.sin(X * 0.21) * 2.4 - t / 260) % 9 + 9) % 9;
    if (ph < 1.2) { ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 * (1 - ph / 1.2)).toFixed(2)})`; ctx.fillRect(X * S, Y * S, step * S, 0.6 * S); }
    const h = decorRnd(Math.floor(X * 3.1) + Math.floor(Y * 7.7) * 131);
    if (h > 0.965 && Math.sin(t / 170 + h * 60) > 0.75) { ctx.fillStyle = "#ffffff"; ctx.fillRect((X + 0.5) * S, (Y + 0.5) * S, 0.5 * S, 0.5 * S); }
  }
  if (shape === "mer") return;
  const band = 1.4 + Math.sin(t / 700) * 1.1;  // the swash: the foam climbs the sand and draws back
  for (let y = 0; y < d; y += 1) for (let x = 0; x < w; x += 1) {
    const fu = tileF(shape, (x + 0.5) / w, (y + 0.5) / d, rot) * w - band + 1.4;
    if (fu >= 0 || fu < -2.6) continue;
    ctx.fillStyle = fu > -1 ? "rgba(255, 255, 255, 0.62)" : "rgba(255, 255, 255, 0.24)";
    ctx.fillRect((X0 + x) * S, (Y0 + y) * S, S, S);
  }
}
// a sample of a wall or floor for the buy mode's cards
const swatches = new Map();
export function decorSwatch(kind, type, color) {
  const key = `${kind}|${type}|${color}`;
  if (swatches.has(key)) return swatches.get(key);
  if (kind === "door") { const url = doorArt(type, color).url(); swatches.set(key, url); return url; }
  const was = S; const p = decorPainter(48, 32);
  if (kind === "floor") paintFloor(p, 48, 32, type, color);
  else { p.rect(0, 0, 48, 32, color); if (!paintThemeWall(p, 48, 32, type, color)) paintWallSample(p, type, color); }
  const url = p.c.toDataURL(); swatches.set(key, url); void was;
  return url;
}
function paintWallSample(p, type, base) {
  const { rect } = p;
  if (type === "lambris") for (let x = 0; x < 48; x += 8) rect(x, 0, 0.6, 32, shade(base, 0.87));
  else if (type === "rayures") for (let x = 0; x < 48; x += 8) { rect(x, 0, 4, 32, shade(base, 1.12)); }
  else if (type === "briques") for (let row = 0, y = 0; y < 32; row++, y += 5) for (let x = row % 2 ? -6 : 0; x < 48; x += 12) rect(x + 0.5, y + 0.5, 11, 4, shade(base, 0.85 + ((row + x) % 3) * 0.08));
  else if (type === "papier") for (let y = 4; y < 32; y += 8) for (let x = 2; x < 48; x += 8) rect(x, y, 2, 2, shade(base, 0.82));
  else if (type === "boiserie") { rect(0, 18, 48, 14, "#7a5a3e"); rect(0, 18, 48, 1, "#a07c58"); }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get decor() { return decor; }, get doorSprite() { return doorSprite; }, get wallHasRail() { return wallHasRail; }, get drawWall() { return drawWall; }, get drawWindow() { return drawWindow; }, get roomFloorCanvas() { return roomFloorCanvas; }, get woodSprite() { return woodSprite; } });
