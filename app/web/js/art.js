"use strict";
// Pixel-art SVG pieces drawn at runtime (variants: frame, state, color), with the team's dark outline;
// each variant is rasterized once per scale. Static decor stays in SPRITES (sprites.js).

const ART_OUTLINE = `<defs><filter id="o" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="0.4" result="d"/>
  <feFlood flood-color="#120f1a"/><feComposite in2="d" operator="in" result="ol"/><feMerge><feMergeNode in="ol"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
const artImgs = new Map(), artLast = new Map();
// draws `body` (SVG in a w×h box whose origin is the top-left) at x, y; `key` names the variant
function art(key, x, y, w, h, body, { outline = true, flip = false } = {}) {
  const k = `${key}@${S}`;
  let img = artImgs.get(k);
  if (!img) {
    if (artImgs.size > 900) artImgs.clear();
    const inner = typeof body === "function" ? body() : body;
    img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${w + 2} ${h + 2}" width="${Math.round((w + 2) * S)}" height="${Math.round((h + 2) * S)}" shape-rendering="crispEdges">${outline ? ART_OUTLINE : ""}<g${outline ? ' filter="url(#o)"' : ""}>${inner}</g></svg>`);
    artImgs.set(k, img);
  }
  if (img.complete && img.naturalWidth) artLast.set(key, img); else img = artLast.get(key);  // previous scale while loading
  if (!img) return false;
  if (flip) { ctx.save(); ctx.translate(Math.round((x + w / 2) * S), 0); ctx.scale(-1, 1); ctx.drawImage(img, Math.round((-w / 2 - 1) * S), Math.round((y - 1) * S), Math.round((w + 2) * S), Math.round((h + 2) * S)); ctx.restore(); }
  else ctx.drawImage(img, Math.round((x - 1) * S), Math.round((y - 1) * S), Math.round((w + 2) * S), Math.round((h + 2) * S));
  return true;
}
// R(x, y, w, h, color) is the rect helper of scene.js

/* 1. the test bug: a beetle, legs stepping, X eyes when whacked */
function bugArt(frame, stunned) {
  const leg = (side, k) => {
    const y0 = 6 + k * 1.7, lift = (frame + k) % 2 ? 0.7 : 0;
    return `<path fill="none" stroke="#3a1a5a" stroke-width=".8" d="M${10 + side * 3} ${y0}L${10 + side * 6.4} ${y0 - 1 + lift}L${10 + side * 7.4} ${y0 + 1.4 + lift}"/>`;
  };
  let g = "";
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g += leg(s, k);
  g += `<path fill="none" stroke="#3a1a5a" stroke-width=".5" d="M9 3.2Q7 0.6 5 1.2M11 3.2Q13 0.6 15 1.2"/>`;
  g += `<ellipse cx="10" cy="9.6" rx="5.2" ry="4.4" fill="#7a3aa8"/><ellipse cx="8.2" cy="7.6" rx="1.7" ry="0.9" fill="#c9a2ef" opacity=".85"/>`;
  g += R(9.8, 5.6, 0.4, 8.2, "#4a1f70") + `<circle cx="7.6" cy="11" r=".8" fill="#5a2a80"/><circle cx="12.4" cy="10.4" r=".8" fill="#5a2a80"/><circle cx="12" cy="12.6" r=".6" fill="#5a2a80"/>`;
  g += `<rect x="7" y="3" width="6" height="3.6" rx="1.3" fill="#3a1a5a"/><path fill="#2a1240" d="M8 6.4l-0.8 1.4h1.2zM12 6.4l0.8 1.4h-1.2z"/>`;
  g += stunned ? `<path stroke="#fff" stroke-width=".4" d="M7.8 4.1l1.2 1.2M9 4.1l-1.2 1.2M11 4.1l1.2 1.2M12.2 4.1l-1.2 1.2"/>`
    : `<circle cx="8.6" cy="4.6" r=".8" fill="#ff3b3b"/><circle cx="11.4" cy="4.6" r=".8" fill="#ff3b3b"/><rect x="8.3" y="4.2" width=".4" height=".4" fill="#fff"/><rect x="11.1" y="4.2" width=".4" height=".4" fill="#fff"/>`;
  return g;
}

/* 2. the chief's podium: oak stage with a step and the yellow plaque */
const PODIUM_ART = R(0, 6.4, 24, 1.8, "#8a6a4a") + R(0, 6.4, 24, 0.5, "#a88660")
  + R(2, 2.2, 20, 4.4, "#6d5238") + R(7, 2.2, 0.5, 4.4, "#5a4330") + R(16.5, 2.2, 0.5, 4.4, "#5a4330")
  + R(1, 0.6, 22, 1.8, "#a07c58") + R(1, 0.6, 22, 0.5, "#c49a6c") + R(9, 3, 6, 2.6, "#fbaa08") + R(9.6, 3.6, 4.8, 1.4, "#081746") + `<circle cx="13.4" cy="4.3" r=".45" fill="#fbaa08"/>`;

/* 3. the team plant: pot + stem + leaves by stage; dry = yellowed and drooping; flower once lush */
function teamPlantArt(n, dry, frame) {
  const h = 4 + n * 2.4, base = 30, leaf = dry ? "#b09440" : "#3f9e4f", leaf2 = dry ? "#94782f" : "#5fbf6d", vein = dry ? "#7a6428" : "#2f7a3a";
  let g = `<path fill="#b0603a" d="M4.6 ${base}h10.8l-1.2 7h-8.4z"/>` + R(3.8, base - 1.2, 12.4, 2, "#c9744a") + R(3.8, base - 1.2, 12.4, 0.5, "#e08a5c") + R(5, base - 0.4, 10, 0.8, "#4a3826");
  g += R(9.6, base - h, 0.8, h, dry ? "#7a6a3a" : "#2f7a3a");
  for (let i = 0; i < Math.max(1, Math.floor(h / 3.2)); i++) {
    const y = base - 2 - i * 3.2, side = i % 2 ? 1 : -1, sway = frame ? 0.4 : -0.4, droop = dry ? 1.6 : 0;
    const x0 = 10 + (side > 0 ? 0.4 : -0.4);
    g += `<path fill="${i % 2 ? leaf : leaf2}" d="M${x0} ${y}Q${x0 + side * 2.4 + sway} ${y - 2.4 + droop} ${x0 + side * 4.6 + sway} ${y - 0.6 + droop * 1.4}Q${x0 + side * 2.2 + sway} ${y + 0.8 + droop} ${x0} ${y}Z"/>`;
    g += `<path fill="none" stroke="${vein}" stroke-width=".25" d="M${x0} ${y}Q${x0 + side * 2.4 + sway} ${y - 1 + droop} ${x0 + side * 4 + sway} ${y - 0.6 + droop * 1.4}"/>`;
  }
  if (n >= 6 && !dry) g += `<circle cx="10" cy="${base - h - 1.2}" r="1.8" fill="#ff6b9a"/><circle cx="8.6" cy="${base - h - 1.6}" r=".9" fill="#ff8fb4"/><circle cx="11.4" cy="${base - h - 1.6}" r=".9" fill="#ff8fb4"/><circle cx="10" cy="${base - h - 1.2}" r=".7" fill="#ffd43b"/>`;
  return g;
}

/* 4. office incidents */
const SPILL_ART = `<ellipse cx="9" cy="6.4" rx="8.4" ry="2.6" fill="#6d4a2e"/><ellipse cx="6" cy="5.6" rx="3.6" ry="1.4" fill="#7d5636"/>`
  + `<ellipse cx="5" cy="5.2" rx="1.6" ry=".5" fill="#fff" opacity=".35"/>` + R(13.2, 2.6, 3.2, 2.4, "#f4f2ea") + R(13.2, 2.6, 3.2, 0.6, "#d9d6cc") + R(16.4, 3.2, 0.8, 1.2, "#f4f2ea")
  + `<path fill="#fbaa08" d="M19.5 0l3 6h-6z"/>` + R(19.2, 2, 0.6, 2.2, "#081746") + R(19.2, 4.6, 0.6, 0.6, "#081746") + R(18.6, 6, 1.8, 1, "#8d8aa0");
const CROISSANTS_ART = R(0, 4, 16, 7, "#f7c6d9") + R(0, 4, 16, 1.6, "#e98fc4") + R(1, 5.4, 14, 0.4, "#fff", ' opacity=".5"')
  + [2, 6.6, 10.6].map((x, i) => `<path fill="${i % 2 ? "#e0952a" : "#d98018"}" d="M${x} 4Q${x + 2.4} ${0.6 + i * 0.3} ${x + 4.6} 4Z"/><path fill="none" stroke="#a85a0a" stroke-width=".3" d="M${x + 1.4} 3.4l.4 -1.6M${x + 3} 3.2l-.3 -1.6"/>`).join("");
function brokenCoffeeArt(on) {
  return R(0, 0, 10, 5.6, "#2a0f14") + R(0.6, 0.6, 8.8, 4.4, on ? "#ff3b3b" : "#7a1a24") + `<path fill="none" stroke="#fff" stroke-width=".35" opacity=".8" d="M2 1l2 1.6 -1 1.2 2.4 1.4M7 0.8l-1 1.8 1.4 1"/>`;
}
function wiltedPlantArt() {
  return `<path fill="#b86a48" d="M2 9h10l-1 5H3z"/>` + R(1.4, 8.2, 11.2, 1.6, "#c9744a") + R(2.4, 9, 9.2, 0.6, "#4a3826")
    + `<path fill="none" stroke="#8a6a3a" stroke-width=".8" d="M7 9Q7 5 5 3.6M7 9Q8 4.6 10.6 4M7 9Q6 6.4 3 6.6"/>`
    + `<path fill="#b09440" d="M4.6 3.4l-2 2.4 1.6.6zM10.6 3.8l1.8 2.2-1.6.4zM2.8 6.4l-1.8 1.4 1.4.8z"/>` + R(9, 13.6, 1, 0.6, "#a07c58") + R(4, 14, 1.2, 0.5, "#a07c58");
}

/* 5. achievement cups */
function cupArt(on) {
  const c = on ? "#fbaa08" : "#13286a", d = on ? "#c98a08" : "#0b1a4a", hl = on ? "#fff3b0" : "#2a4290";
  return `<path fill="${c}" d="M0.6 0h4.8v1.6Q5.4 3.6 3 3.8Q0.6 3.6 0.6 1.6z"/>` + `<path fill="none" stroke="${c}" stroke-width=".5" d="M0.6 0.6Q-0.5 0.6 -0.4 1.4Q-0.3 2.4 0.9 2.4M5.4 0.6Q6.5 0.6 6.4 1.4Q6.3 2.4 5.1 2.4"/>`
    + R(1.2, 0.4, 0.6, 2, hl) + R(2.6, 3.7, 0.8, 1, d) + R(1.6, 4.6, 2.8, 0.8, d) + R(1.2, 5.3, 3.6, 0.7, c);
}

/* 6. shop decor */
const SHOP_RUG_ART = R(0, 0, 150, 12, "#fbaa08") + R(1, 1, 148, 10, "#163a7a") + R(2.4, 2.4, 145.2, 7.2, "#1b4590")
  + Array.from({ length: 12 }, (_, k) => `<circle cx="${8 + k * 12.2}" cy="6" r="1.5" fill="#fbaa08"/><circle cx="${8 + k * 12.2}" cy="6" r=".7" fill="#163a7a"/>`).join("")
  + R(2.4, 2.4, 145.2, 0.4, "#fbaa08") + R(2.4, 9.2, 145.2, 0.4, "#fbaa08");
const POSTER_ART = R(0, 0, 13, 18, "#f7f7f7") + R(1, 1, 11, 16, "#081746") + Array.from({ length: 7 }, (_, k) => R(1.6 + (k * 3.7) % 10, 2 + (k * 5.3) % 13, 0.5, 0.5, "#fff")).join("")
  + `<path fill="#e8e8f0" d="M6.5 3.4Q8.4 6 8.2 9.6H4.8Q4.6 6 6.5 3.4z"/><circle cx="6.5" cy="6.6" r=".9" fill="#5aa9ff"/>`
  + `<path fill="#ff6b6b" d="M4.8 8.2l-1.4 2.2h1.4zM8.2 8.2l1.4 2.2H8.2z"/><path fill="#fbaa08" d="M5.4 9.6h2.2l-1.1 2.8z"/>` + R(3.4, 13.6, 6.2, 1.6, "#fbaa08") + R(4.2, 14.1, 4.6, 0.6, "#081746");
function lampArt(lit) {
  return `<ellipse cx="5.5" cy="45" rx="4.4" ry="1" fill="#33333f"/>` + R(4.8, 6, 1.4, 39, "#3d3d4a") + R(4.8, 6, 0.5, 39, "#55556a")
    + `<path fill="${lit ? "#ffe8a3" : "#f4efc9"}" d="M1.6 0h7.8l1.6 6.4H0z"/>` + R(0, 6, 11, 0.8, "#de8001") + (lit ? R(1.6, 0.6, 7.8, 0.6, "#fff7d6") : "");
}
const AQUARIUM_ART = R(0, 13, 26, 6, "#6d5238") + R(0, 13, 26, 0.8, "#8a6a4a") + R(2, 15.4, 22, 0.5, "#5a4330")
  + R(0, 0, 26, 13.4, "#0d2a6e") + R(1, 1, 24, 11.4, "#3f8fe0") + R(1, 1, 24, 3, "#5aa9ff") + R(1, 10, 24, 2.4, "#d6b07f") + R(1, 10, 24, 0.5, "#e8c89a")
  + `<path fill="#3f9e4f" d="M4 10Q3 7 4.6 4.4Q5 7.4 5.4 10zM20 10Q21.4 6.6 19.6 3.8Q19 7 18.8 10z"/>`
  + R(11, 7.4, 4, 2.8, "#8d8aa0") + R(11.6, 6.4, 0.8, 1, "#8d8aa0") + R(13.6, 6.4, 0.8, 1, "#8d8aa0") + R(12.4, 8.4, 1.2, 1.8, "#3a3a48") + R(1, 1, 24, 0.5, "#d5eeff", ' opacity=".6"');
function fishArt(color) { return `<ellipse cx="1.6" cy="1.2" rx="1.6" ry="1" fill="${color}"/><path fill="${color}" d="M3 1.2l1.4-1.1v2.2z"/>` + R(0.6, 0.8, 0.5, 0.5, "#1c1c24"); }
function jukeboxArt(light) {
  const glow = ["#ff6b6b", "#51cf66", "#5aa9ff", "#7b380c"][light];
  return `<path fill="#b85905" d="M0 8Q0 0 8 0Q16 0 16 8V22H0z"/><path fill="#d9741a" d="M1.4 8Q1.4 1.4 8 1.4Q14.6 1.4 14.6 8z"/>`
    + `<path fill="${glow}" d="M3 8Q3 3 8 3Q13 3 13 8z"/><circle cx="8" cy="7" r="2.6" fill="#1c1c24"/><circle cx="8" cy="7" r=".8" fill="#fbaa08"/>`
    + R(1.4, 9, 13.2, 1, "#e0e0ea") + R(2.4, 11, 11.2, 8, "#7b380c") + [0, 1, 2, 3, 4].map(k => R(3 + k * 2.2, 12, 1.2, 6, "#5a2808")).join("") + R(0, 20.4, 16, 1.6, "#5a2808");
}
const BIGPLANT_ART = `<path fill="#b0603a" d="M3 17h10l-1.2 7H4.2z"/>` + R(2.2, 16, 11.6, 2, "#c9744a") + R(3, 16.8, 10, 0.6, "#4a3826")
  + [[8, 16, -6, -11], [8, 16, 5.6, -12], [8, 16, -2, -15], [8, 16, 7, -5], [8, 16, -7, -4]].map(([x, y, dx, dy], i) =>
    `<path fill="${i % 2 ? "#3f9e4f" : "#2f7a3a"}" d="M${x} ${y}Q${x + dx * 0.2} ${y + dy * 0.7} ${x + dx} ${y + dy}Q${x + dx * 0.8} ${y + dy * 0.3} ${x} ${y}Z"/>`
    + `<path fill="none" stroke="#5fbf6d" stroke-width=".3" d="M${x} ${y}Q${x + dx * 0.3} ${y + dy * 0.6} ${x + dx * 0.9} ${y + dy * 0.95}"/>`).join("");

/* 7. cake and MR bell */
function cakeArt(flame) {
  return R(1, 9, 18, 1.6, "#8a6a4a") + R(3, 10.6, 1.6, 5, "#6d5238") + R(15.4, 10.6, 1.6, 5, "#6d5238")
    + `<rect x="4" y="3.6" width="12" height="5.6" rx="1" fill="#f4c2d7"/>` + `<path fill="#fff" d="M4 4.6h12v-0.6q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0z"/>`
    + `<rect x="6" y="1" width="8" height="2.8" rx=".6" fill="#f7f7f7"/>` + [7, 10, 12.6].map((x, i) => `<circle cx="${x}" cy="6.6" r=".55" fill="${["#ff6b6b", "#5aa9ff", "#51cf66"][i]}"/>`).join("")
    + R(9.6, -1.6, 0.8, 2.8, "#5aa9ff") + `<path fill="${flame ? "#ffd43b" : "#ff9f43"}" d="M10 ${flame ? -4.4 : -3.8}Q11 -2.6 10 -1.8Q9 -2.6 10 ${flame ? -4.4 : -3.8}z"/>`;
}
const BELL_ART = `<path fill="#fbaa08" d="M1 6Q1 0.6 4 0.6Q7 0.6 7 6z"/>` + R(0, 5.6, 8, 1.2, "#e09a08") + R(3.4, -0.6, 1.2, 1.4, "#c9a24b") + `<circle cx="4" cy="7.4" r=".8" fill="#8a6a4a"/>` + R(2, 1.6, 0.8, 3, "#fff3b0");

/* 8. seasonal decor */
function pumpkinArt(glow) {
  const g = glow ? "#ffd43b" : "#ffe680";
  return `<ellipse cx="5" cy="5" rx="4.8" ry="3.6" fill="#e8741c"/><ellipse cx="3" cy="5" rx="1.6" ry="3.4" fill="#f08a2c"/><ellipse cx="7" cy="5" rx="1.6" ry="3.4" fill="#d9661a"/>`
    + R(4.4, 0, 1.2, 1.8, "#3f7a2a") + `<path fill="${g}" d="M2.4 3.6h1.6l-.8 1.2zM6 3.6h1.6l-.8 1.2zM2.6 6.2h4.8l-.6 1h-.8l-.4-.5-.4.5h-.8l-.4-.5-.4.5h-.8z"/>`;
}
const COBWEB_ART = `<path fill="none" stroke="#d5d5e0" stroke-width=".35" d="M0 0L14 14M0 0L14 5M0 0L5 14M0 4Q2 2 4 0M0 8Q4.6 4.6 8 0M0 12Q7 7 12 0"/>`;
function batArt(up) { return `<path fill="#1c1c24" d="M3 1.6h2v1.6H3zM3 2Q1.5 ${up ? 0 : 3} 0 ${up ? 0.6 : 2.6}Q1 2 3 2.8zM5 2Q6.5 ${up ? 0 : 3} 8 ${up ? 0.6 : 2.6}Q7 2 5 2.8z"/>` + R(3.4, 2, 0.4, 0.4, "#ff6b6b") + R(4.2, 2, 0.4, 0.4, "#ff6b6b"); }
function treeArt(blink) {
  const lights = ["#ff6b6b", "#5aa9ff", "#ffd43b", "#51cf66", "#ff6b9a", "#ffffff"];
  return `<path fill="#2f7a3a" d="M8 1L14 9H11L16 16H12L17 23H-1L4 16H0L5 9H2z"/><path fill="#3f9e4f" d="M8 1L11 5L8 9L5 5zM8 9L12 14L8 16L4 14zM8 16L13 21H3z" opacity=".6"/>`
    + R(6.8, 23, 2.4, 3, "#6d4a2e") + `<path fill="#ffd43b" d="M8 -1.4l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z"/>`
    + [[6, 7], [10, 8], [4, 13], [12, 13], [7, 15], [2, 20], [14, 20], [9, 19.6]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r=".7" fill="${(i + blink) % 2 ? lights[i % 6] : "#1f4a2a"}"/>`).join("");
}
const GALETTE_ART = `<ellipse cx="6" cy="2.4" rx="6" ry="2.2" fill="#d9a441"/><ellipse cx="6" cy="1.8" rx="5.2" ry="1.6" fill="#e8bd5a"/><path fill="none" stroke="#b07a20" stroke-width=".3" d="M2 1.6Q6 0 10 1.6M2.6 2.6Q6 1 9.4 2.6"/>`;
const CROWN_ART = `<path fill="#ffd43b" d="M0 4V0.8L1.6 2.4L3 0L4.4 2.4L6 0.8V4z"/>` + R(0, 3.2, 6, 0.8, "#e0a800") + `<circle cx="3" cy="2.6" r=".55" fill="#ff6b6b"/>`;

/* 9. the gaming corner: a little platformer on the TV, a console and its pad */
function tvGameArt(frame) {
  let g = R(0, 0, 16, 9, "#4fa3e8") + R(0, 0, 16, 3, "#7fc4ff") + `<ellipse cx="4" cy="7" rx="5" ry="2.4" fill="#3f8f4f"/><ellipse cx="12" cy="7.4" rx="5" ry="2" fill="#2f7a3a"/>`
    + R(0, 7, 16, 2, "#8a5d3a") + Array.from({ length: 8 }, (_, k) => R(k * 2, 7, 1.8, 0.6, "#51cf66")).join("") + R(3 + frame * 0.2, 2, 3, 1, "#fff") + R(10 - frame * 0.2, 1.4, 3.4, 1, "#fff");
  return g;
}
function heroArt(frame) { return R(0.4, 0, 1.6, 0.8, "#ff6b6b") + R(0.2, 0.8, 2, 1, "#f1c7a3") + R(0.2, 1.8, 2, 1, "#5aa9ff") + R(frame ? 0 : 0.4, 2.8, 0.7, 0.6, "#3a3a48") + R(frame ? 1.8 : 1.4, 2.8, 0.7, 0.6, "#3a3a48"); }
const CONSOLE_ART = `<rect x="0" y="0" width="9" height="2.6" rx=".6" fill="#2a2a33"/>` + R(0.6, 0.6, 3, 0.5, "#51cf66") + R(6.6, 0.6, 1.6, 1.2, "#3d3d4a")
  + `<path fill="none" stroke="#1c1c24" stroke-width=".4" d="M9 1.6Q11 2 11.4 3.6"/><rect x="10.2" y="3.4" width="4.4" height="2" rx=".9" fill="#3d3d4a"/>` + R(10.8, 4, 0.8, 0.8, "#fbaa08") + R(13, 4, 0.8, 0.8, "#ff6b6b");

/* 10. break room floor (decor.js: carpet tiles by default, a round rug in the middle), drawn once per scale and setting */
function loungeFloorCanvas() { return roomFloorCanvas("lounge", H - 70, [[130, 44, 140, 52]]); }

/* 11. the issue board: aluminium-framed whiteboard, tape headers per column, marker lines, a tray with markers */
const BOARD_COLS = [["TO DO", "todo", "#9fb3d9"], ["EN COURS", "working", "#fbaa08"], ["BLOQUÉ", "blocked", "#ff6b6b"], ["LIVRÉ", "done", "#51cf66"]];
function boardArt(w, h) {
  const cw = w / BOARD_COLS.length, F = 3;  // frame thickness; the surface starts at (F, F)
  let g = R(0, 0, w + 2 * F, h + 2 * F, "#9aa0b2") + R(0, 0, w + 2 * F, 0.8, "#d5d9e4") + R(0, 0, 0.8, h + 2 * F, "#c4c9d6")
    + R(w + 2 * F - 0.8, 0, 0.8, h + 2 * F, "#6f7488") + R(0, h + 2 * F - 0.8, w + 2 * F, 0.8, "#6f7488")
    + R(F - 0.5, F - 0.5, w + 1, h + 1, "#5d6275") + R(F, F, w, h, "#fbfbf7");
  // light streaks across the glossy surface
  g += `<path fill="#ffffff" fill-opacity=".9" d="M${F + w * 0.55} ${F}h7l-14 ${h}h-7zM${F + w * 0.68} ${F}h2.5l-14 ${h}h-2.5z"/>`
    + `<path fill="#e9ecf2" fill-opacity=".7" d="M${F} ${F + h - 3}h${w}v3h-${w}z"/>`;
  BOARD_COLS.forEach(([, , color], i) => {
    const cx = F + i * cw;
    g += R(cx + 4, F + 0.8, cw - 8, 5.6, color, ' fill-opacity=".9"') + R(cx + 4, F + 0.8, cw - 8, 0.6, "#ffffff", ' fill-opacity=".45"')
      + `<path fill="${color}" fill-opacity=".9" d="M${cx + 4} ${F + 0.8}l-0.8 1.2 0.8 1.2 -0.8 1.2 0.8 1.2v0.8zM${cx + cw - 4} ${F + 0.8}l0.8 1.2 -0.8 1.2 0.8 1.2 -0.8 1.2v0.8z"/>`;
    if (i) g += `<path fill="none" stroke="#3b4a7a" stroke-opacity=".55" stroke-width=".5" d="M${cx} ${F + 2}l.2 ${h * 0.3}-.3 ${h * 0.35}.2 ${h * 0.3}"/>`;  // hand-drawn separator
  });
  // aluminium tray with markers and an eraser
  const ty = h + 2 * F - 0.4;
  g += R(-1, ty, w + 2 * F + 2, 2.4, "#b8bcc8") + R(-1, ty, w + 2 * F + 2, 0.6, "#e0e3ea") + R(-1, ty + 2, w + 2 * F + 2, 0.6, "#6f7488");
  [["#d64545", 24], ["#2f6ad6", 34], ["#2f9e44", 44]].forEach(([c, x]) => { g += R(x, ty - 1.2, 8, 1.4, "#f2f2f2") + R(x + 6, ty - 1.2, 2, 1.4, c) + R(x + 8, ty - 0.9, 0.8, 0.8, c); });
  g += R(w - 30, ty - 2.2, 12, 2.4, "#3a3a48") + R(w - 30, ty - 0.6, 12, 0.8, "#c9c1a8");
  return g;
}
// a sticky note: shadow, adhesive band, curled bottom-right corner
function stickyArt(fill, edge, w = 43, h = 8) {
  return R(0.6, 0.7, w, h, "#000", ' fill-opacity=".18"') + `<path fill="${fill}" d="M0 0h${w}v${h - 2.2}l-2.2 2.2H0z"/>`
    + R(0, 0, w, 1.4, edge, ' fill-opacity=".55"') + `<path fill="${edge}" d="M${w} ${h - 2.2}l-2.2 2.2v-2.2z"/>` + `<path fill="#000" fill-opacity=".12" d="M${w - 2.2} ${h}l2.2 -2.2h-1.2z"/>`;
}
const STICKY = { ticket: ["#fff3a0", "#e8c94a"], other: ["#ffd9ec", "#e9a2c4"], backlog: ["#ffffff", "#9fb3d9"], done: ["#d8f5d0", "#8fd18a"], blocked: ["#ffd6d0", "#f08a7c"] };

/* 12. break room games */
// arcade cabinet: blinking marquee, attract mode or a shoot'em up when someone plays, joystick, buttons, coin door
function arcadeArt(frame, playing) {
  const on = frame % 2;
  let g = `<path fill="#3b1d6e" d="M1 4L3 0H19L21 4V36H1z"/>` + R(1, 4, 2, 32, "#2a1450") + R(19, 4, 2, 32, "#2a1450")
    + `<path fill="#ff6b9a" d="M1 9l2 -1v9l-2 1zM21 9l-2 -1v9l2 1z"/>` + R(3, 0.6, 16, 4.4, on ? "#fbaa08" : "#de8001");
  for (let i = 0; i < 6; i++) g += R(4 + i * 2.6, 1.4, 1.2, 1.2, (i + on) % 2 ? "#fff3b0" : "#ff6b6b");
  g += R(3, 5, 16, 12.6, "#0a0a12") + R(4, 6, 14, 10.4, playing ? "#0b1640" : "#10102a");
  if (playing) {  // shoot'em up: ship, shots, enemies
    g += `<path fill="#51cf66" d="M${9 + on} 15l1.4 -1.6 1.4 1.6z"/>` + R(10.2 + on, 11 - on, 0.4, 1.4, "#fff3b0") + R(10.2 + on, 8 + on, 0.4, 1.2, "#fff3b0");
    for (let i = 0; i < 4; i++) g += R(5.4 + i * 3 + on * 0.6, 7, 1.6, 1.1, i % 2 ? "#ff6b6b" : "#b48cff");
  } else {  // attract mode: invaders marching, INSERT COIN blinking
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g += R(5.6 + i * 3 + on * 0.6, 7.2 + j * 2.2, 1.6, 1.1, j ? "#5aa9ff" : "#51cf66");
    if (on) g += R(6, 13.6, 10, 1, "#fbaa08");
  }
  g += R(4, 6, 14, 0.6, "#ffffff", ' fill-opacity=".15"');
  g += `<path fill="#4a2a8a" d="M1 18H21L22 22H0z"/>` + R(5, 18.6, 1, 2, "#1c1c24") + `<circle cx="5.5" cy="18.6" r="1.1" fill="#ff3b3b"/>`
    + `<circle cx="13" cy="20" r=".9" fill="#fbaa08"/><circle cx="15.6" cy="20" r=".9" fill="#5aa9ff"/><circle cx="18" cy="20" r=".9" fill="#51cf66"/>`;
  g += R(7, 24, 8, 7, "#2a1450") + R(8.4, 25.2, 1.4, 2.6, on ? "#ff3b3b" : "#a32020") + R(12.2, 25.2, 1.4, 2.6, on ? "#ff3b3b" : "#a32020") + R(1, 34, 20, 2, "#1c1c24");
  return g;
}
// ping-pong table: green top with lines, net, legs; paddles left on the table when nobody plays
function pingpongArt(idle) {
  let g = R(6, 19, 2, 9, "#3a3a48") + R(64, 19, 2, 9, "#3a3a48") + R(30, 19, 2, 8, "#3a3a48") + R(40, 19, 2, 8, "#3a3a48")
    + R(2, 4, 68, 15, "#1f8a5a") + R(2, 19, 68, 2.6, "#156b45") + R(2, 4, 68, 0.6, "#f7f7f7") + R(2, 18.4, 68, 0.6, "#f7f7f7")
    + R(2, 4, 0.6, 15, "#f7f7f7") + R(69.4, 4, 0.6, 15, "#f7f7f7") + R(2, 11.2, 68, 0.4, "#f7f7f7", ' fill-opacity=".8"');
  g += R(35.6, 1, 0.8, 18, "#e0e0ea") + R(35.2, 1, 1.6, 2.4, "#3a3a48") + R(35.2, 17, 1.6, 2.4, "#3a3a48");
  for (let i = 0; i < 8; i++) g += R(35.7, 3 + i * 2, 0.6, 0.3, "#9aa0b2");
  if (idle) g += `<ellipse cx="14" cy="9" rx="2.2" ry="1.8" fill="#d64545"/>` + R(15.6, 8.6, 3, 0.8, "#8a6a4a") + `<ellipse cx="56" cy="14" rx="2.2" ry="1.8" fill="#1c1c24"/>` + R(52.4, 13.6, 3, 0.8, "#8a6a4a") + `<circle cx="22" cy="15" r=".8" fill="#fff"/>`;
  return g;
}
// baby-foot seen from above: wooden cabinet, striped field, goal boxes, 8 rods in the real order
// (red: goalkeeper, defence, midfield, attack; blue the mirror), men sliding when played; handles on each team's side
const FOOT_LINEUP = [["#d64545", 1], ["#d64545", 2], ["#2f6ad6", 3], ["#d64545", 5], ["#2f6ad6", 5], ["#d64545", 3], ["#2f6ad6", 2], ["#2f6ad6", 1]];
function babyfootArt(shift) {
  const SP = { 1: [0], 2: [-4.4], 3: [-5.2, 0, 5.2], 5: [-6.6, -3.3, 0, 3.3, 6.6] };
  SP[2].push(4.4);
  let g = R(0, 0.6, 48, 22.8, "#8a5d3a") + R(0, 0.6, 48, 1, "#a8774c") + R(0, 21.4, 48, 2, "#6d4a2e");
  for (let i = 0; i < 8; i++) g += R(2 + i * 5.5, 2.4, 5.5, 17.6, i % 2 ? "#2b9240" : "#2f9e44");
  const line = ' stroke="#f7f7f7" stroke-width=".35"';  // R() already writes fill="none": a second fill makes the SVG invalid
  g += R(2, 2.4, 44, 17.6, "none", line) + R(23.85, 2.4, 0.3, 17.6, "#f7f7f7") + `<circle cx="24" cy="11.2" r="2.6" fill="none"${line}/>`
    + R(2, 7.6, 3.6, 7.2, "none", line) + R(42.4, 7.6, 3.6, 7.2, "none", line)
    + R(0.4, 8.4, 1.6, 5.6, "#14141c") + R(46, 8.4, 1.6, 5.6, "#14141c") + R(0.4, 8.4, 1.6, 0.5, "#3a3a46") + R(46, 8.4, 1.6, 0.5, "#3a3a46");
  for (let k = 0; k < 5; k++) g += `<circle cx="${20.6 + k * 1.7}" cy="1.1" r=".55" fill="${k < 2 ? "#d64545" : "#f4efc9"}"/>`;  // score beads
  FOOT_LINEUP.forEach(([c, n], i) => {
    const x = 4.75 + i * 5.5, red = c === "#d64545", dy = (red ? shift : -shift) * 1.2;
    g += R(x - 0.25, -0.8, 0.5, 25.6, "#c9ccd6") + R(x - 0.25, -0.8, 0.15, 25.6, "#eef0f5");
    g += red ? R(x - 0.8, -2, 1.6, 1.8, "#1c1c24") : R(x - 0.8, 24.2, 1.6, 1.8, "#1c1c24");  // handle
    for (const o of SP[n]) {
      const y = 11.2 + o + dy;
      g += R(x - 0.8, y - 0.9, 1.6, 1.8, c) + `<circle cx="${x}" cy="${y}" r=".55" fill="#f1c7a3"/>`;
    }
  });
  return g;
}
// dartboard: black number ring with ticks, 20 segments, triple and double rings, bull, silver spider;
// darts (steel barrel, flight) planted in it while someone plays
function dartboardArt(darts) {
  const c = 7, P = (r, a) => `${(c + Math.cos(a) * r).toFixed(3)} ${(c + Math.sin(a) * r).toFixed(3)}`;
  const seg = (i, r0, r1, col) => {
    const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + Math.PI / 10;
    return `<path fill="${col}" d="M${P(r0, a0)}L${P(r1, a0)}A${r1} ${r1} 0 0 1 ${P(r1, a1)}L${P(r0, a1)}A${r0} ${r0} 0 0 0 ${P(r0, a0)}Z"/>`;
  };
  let g = `<g shape-rendering="geometricPrecision"><circle cx="${c}" cy="${c}" r="7.2" fill="#2a2a34"/><circle cx="${c}" cy="${c}" r="6.9" fill="#14141c"/>`;
  for (let i = 0; i < 20; i++) {
    const dark = i % 2 === 0;
    g += seg(i, 0.95, 3.5, dark ? "#1c1c24" : "#f4efc9") + seg(i, 3.5, 4.05, dark ? "#d64545" : "#2f9e44")
      + seg(i, 4.05, 5.45, dark ? "#1c1c24" : "#f4efc9") + seg(i, 5.45, 6, dark ? "#d64545" : "#2f9e44");
    const a = i * Math.PI / 10 - Math.PI / 2;
    g += i ? `<circle cx="${(c + Math.cos(a) * 6.45).toFixed(3)}" cy="${(c + Math.sin(a) * 6.45).toFixed(3)}" r=".17" fill="#e8e8f0"/>`
      : `<path fill="#f7f7f7" d="M${c - 0.5} 0.3h1v0.5h-1z"/>`;  // the 20 on top
  }
  g += `<circle cx="${c}" cy="${c}" r=".95" fill="#2f9e44"/><circle cx="${c}" cy="${c}" r=".42" fill="#d64545"/>`;
  g += `<g fill="none" stroke="#b8bcc8" stroke-width=".07" opacity=".8">${[3.5, 4.05, 5.45, 6].map(r => `<circle cx="${c}" cy="${c}" r="${r}"/>`).join("")}`;
  for (let i = 0; i < 20; i++) { const a = (i * 18 - 99) * Math.PI / 180; g += `<path d="M${P(0.95, a)}L${P(6, a)}"/>`; }
  g += "</g>";
  // darts: the tip is in the board, the barrel comes out toward the viewer, flight up and to the right
  [[7, 2.2], [9.2, 6.2], [5.6, 7.6]].slice(0, darts).forEach(([x, y]) => {
    const d = [0.78, -0.62], n = [0.62, 0.78], at = k => [x + d[0] * k, y + d[1] * k], pt = (k, w) => { const [a, b] = at(k); return `${(a + n[0] * w).toFixed(2)} ${(b + n[1] * w).toFixed(2)}`; };
    g += `<circle cx="${x}" cy="${y}" r=".22" fill="#0a0a10"/>`
      + `<path stroke="#c8ccd6" stroke-width=".55" stroke-linecap="round" d="M${pt(0.2, 0)}L${pt(1.5, 0)}"/>`
      + `<path stroke="#1c1c24" stroke-width=".3" d="M${pt(1.5, 0)}L${pt(2.3, 0)}"/>`
      + `<path fill="#fbaa08" d="M${pt(2.1, 0)}L${pt(2.7, 0.75)}L${pt(3.5, 0.55)}L${pt(3.3, 0)}Z"/>`
      + `<path fill="#c98500" d="M${pt(2.1, 0)}L${pt(2.7, -0.75)}L${pt(3.5, -0.55)}L${pt(3.3, 0)}Z"/>`;
  });
  return g + "</g>";
}
// what is on TV when someone watches: a little cartoon (sky, hills, a runner, the sun or the moon)
function tvShowArt(frame) {
  const night = frame >= 2, x = 2 + (frame % 2) * 3 + (night ? 6 : 0);
  return R(0, 0, 16, 9, night ? "#1b2550" : "#7fc4ff") + `<ellipse cx="4" cy="9" rx="7" ry="3" fill="#3f9e4f"/><ellipse cx="13" cy="9.4" rx="6" ry="2.6" fill="#2f7a3a"/>`
    + `<circle cx="13" cy="2.4" r="1.4" fill="${night ? "#f4efc9" : "#ffd43b"}"/>` + R(x, 4.6, 1.4, 2.2, "#ff6b6b") + R(x + 0.2, 3.6, 1, 1, "#f1c7a3") + R(x + (frame % 2 ? 0 : 0.8), 6.8, 0.6, 0.8, "#1c1c24");
}
// the rug of the beanbag corner: navy, yellow diamonds, fringes
function cornerRugArt(w, h) {
  let g = R(0, 0, w, h, "#163a7a") + R(2, 2, w - 4, h - 4, "#1b4590") + R(4, 4, w - 8, h - 8, "none", ' stroke="#fbaa08" stroke-width=".8"');
  for (let x = 14; x < w - 8; x += 20) for (let y = 14; y < h - 8; y += 18) g += `<path fill="#fbaa08" fill-opacity=".85" d="M${x} ${y - 3}l3 3 -3 3 -3 -3z"/><path fill="#163a7a" d="M${x} ${y - 1.2}l1.2 1.2 -1.2 1.2 -1.2 -1.2z"/>`;
  for (let x = 1; x < w; x += 2.4) g += R(x, -1.6, 0.6, 1.6, "#e8dcb8") + R(x, h, 0.6, 1.6, "#e8dcb8");
  return g;
}
// the tournament: a slate in a wooden frame, chalk dust in the corner
function slateArt(w, h) {
  return R(0, 0, w + 2, h + 2, "#8a5d3a") + R(0, 0, w + 2, 0.6, "#a8774c") + R(1, 1, w, h, "#24352c") + R(1, 1, w, h, "#2c4235", ' fill-opacity=".6"')
    + `<path fill="#ffffff" fill-opacity=".06" d="M${w * 0.6} 1h6l-10 ${h}h-6z"/>` + R(4, h - 1.4, 6, 0.8, "#e0e0e0", ' fill-opacity=".5"') + R(w - 8, h - 0.4, 6, 1.4, "#f2f2f2");
}

/* 13. the coffee machine: a stainless espresso machine; when someone takes a coffee it brews (progress on the screen,
   coffee dripping into the cup, steam). The screen sits where the "broken" overlay goes (fun.js). */
function coffeeMachineArt(frame, brewing) {
  let g = `<ellipse cx="9" cy="22.4" rx="8.4" ry=".8" fill="#000" fill-opacity=".3"/>`
    + `<rect x="1.6" y="2" width="14.8" height="20" rx="1.2" fill="#b8bcc8"/>` + R(2.4, 2.8, 1.6, 18.6, "#e2e5ec") + R(14.6, 2.8, 1.2, 18.6, "#8d92a3")
    + `<rect x="1" y="0.6" width="16" height="2.4" rx=".6" fill="#6f7488"/>` + R(1, 0.6, 16, 0.6, "#9aa0b2");
  for (const x of [3.4, 7.2, 11]) g += R(x, -0.8, 2.6, 1.6, "#f4f2ea") + R(x, -0.8, 2.6, 0.4, "#c9c5b8");  // cups warming on top
  // display (where the "broken" overlay lands)
  g += R(3.6, 4.2, 10.8, 6, "#1c2433") + R(4, 4.4, 10, 5.6, brewing ? "#0e3a5c" : "#13283d");
  if (brewing) {
    g += R(5, 8.2, 8, 0.9, "#2a4a6a") + R(5, 8.2, 2 + frame * 2, 0.9, "#51cf66");
    g += `<path fill="#d5eeff" d="M6.6 5.4h3.4v1.8q0 .8 -.8 .8h-1.8q-.8 0 -.8 -.8zM10 5.8h.8v1h-.8z"/>`;
  } else g += `<path fill="#5aa9ff" d="M6.6 5.6h3.4v1.8q0 .8 -.8 .8h-1.8q-.8 0 -.8 -.8zM10 6h.8v1h-.8z"/>` + R(11.4, 5.8, 1.6, 0.6, "#5aa9ff") + R(11.4, 7, 1.6, 0.6, "#5aa9ff");
  g += R(4, 4.4, 10, 0.5, "#ffffff", ' fill-opacity=".15"');
  g += `<circle cx="5.6" cy="11.4" r=".7" fill="#ff6b6b"/><circle cx="9" cy="11.4" r=".7" fill="${brewing ? "#51cf66" : "#2f7a3a"}"/><circle cx="12.4" cy="11.4" r=".7" fill="#fbaa08"/>`;
  // group head, portafilter, steam wand
  g += R(6.4, 12.6, 5.2, 1.4, "#55596a") + R(7, 14, 4, 0.8, "#3a3d4a") + R(11.6, 13.2, 4.2, 0.9, "#1c1c24") + R(15.2, 13, 1, 1.3, "#1c1c24")
    + R(3, 12, 0.8, 5, "#d5d9e4") + R(2.8, 16.6, 1.2, 0.8, "#9aa0b2");
  // the cup on the drip tray, filling while it brews
  if (brewing) {
    g += R(8.6, 15, 0.8, 1 + frame * 0.6, "#6d4a2e") + (frame % 2 ? R(8.7, 16.8, 0.6, 0.6, "#6d4a2e") : "");
    g += R(7, 17, 4, 2.8, "#f4f2ea") + R(7, 17, 4, 0.7, frame >= 2 ? "#6d4a2e" : "#c9c5b8") + `<path fill="none" stroke="#f4f2ea" stroke-width=".5" d="M11 17.6q1 0 1 .8t-1 .8"/>`;
    g += `<path fill="none" stroke="#f7f7f7" stroke-opacity=".6" stroke-width=".35" d="M12.6 ${16.6 - frame * 0.4}q.6 -.8 0 -1.6q-.6 -.8 0 -1.6M13.8 ${16.8 - frame * 0.3}q.6 -.8 0 -1.6"/>`;  // steam
  }
  g += R(3.6, 19.8, 10.8, 1.4, "#3a3d4a");
  for (let x = 4.4; x < 14; x += 1.4) g += R(x, 20, 0.6, 1, "#1c1c24");
  g += R(7.4, 2.9, 3.2, 0.9, "#081746") + `<circle cx="9.9" cy="3.35" r=".3" fill="#fbaa08"/>`;  // brand plate
  return g;
}

/* 14. window and curtains: painted frame with mullions, glass glints (the sky, weather and night are drawn behind it),
   wooden sill; velvet curtains with folds and gold tiebacks, brass rod with finials, scalloped valance with a fringe.
   Box: 58 × 41, the glass opening at (6, 8)–(52, 36). */
// glints on the glass, drawn without the outline (an outline would turn them grey)
const WINDOW_GLINTS = `<path fill="#ffffff" fill-opacity=".4" d="M10 9h3l-5 6v-3zM33 9h2l-4 5v-2.4zM40 24h4l-7 8.4v-4z"/>`;
// style: velours (default), lin (straight linen panels), store (roller blind), aucun (bare window); color: the fabric (decor.js)
function windowArt(style = "velours", color = "#8f2b46") {
  const red = color, redD = shade(color, 0.74), redL = shade(color, 1.23), gold = "#d9a441";
  let g = "";
  // frame and glass
  g += `<path fill="#e8e6dc" fill-rule="evenodd" d="M4 6h50v32H4zM6 8h46v28H6z"/>` + R(4, 6, 50, 0.6, "#ffffff") + R(4, 37.4, 50, 0.6, "#b8b4a6")
    + R(6, 8, 46, 0.8, "#000", ' fill-opacity=".25"') + R(6, 8, 0.8, 28, "#000", ' fill-opacity=".18"')
    + R(28.4, 8, 1.6, 28, "#e8e6dc") + R(6, 21.2, 46, 1.6, "#e8e6dc") + R(28.4, 8, 0.4, 28, "#b8b4a6") + R(6, 22.4, 46, 0.4, "#b8b4a6");
  // sill
  g += R(2, 38, 54, 1.8, "#a07c58") + R(2, 38, 54, 0.6, "#c49a6c") + R(3, 39.8, 52, 1, "#6d5238");
  // curtains, gathered by a tieback around two thirds of the height
  const curtain = (x0, dir) => {
    const top = x0, w = 10, tie = 25, waist = 5, bottom = 9.5;
    const outer = dir < 0 ? top : top + w, inner = dir < 0 ? top + w : top;
    const path = `M${outer} 3L${inner} 3Q${inner - dir * 1} ${tie - 6} ${outer - dir * waist} ${tie}Q${outer - dir * (bottom - 1)} ${tie + 6} ${outer - dir * bottom} 38L${outer} 38Z`;
    let c = `<path fill="${red}" d="${path}"/>`;
    for (let k = 1; k <= 3; k++) {  // folds
      const fx = outer - dir * k * 2.4;
      c += `<path fill="none" stroke="${redD}" stroke-width=".6" d="M${fx} 4Q${fx - dir * 0.4} ${tie - 6} ${outer - dir * Math.min(waist - 0.8, k * 1.2)} ${tie}Q${outer - dir * k * 2.6} ${tie + 6} ${outer - dir * k * 2.8} 37.6"/>`;
      c += `<path fill="none" stroke="${redL}" stroke-width=".35" d="M${fx - dir * 0.9} 4Q${fx - dir * 1.2} ${tie - 6} ${outer - dir * Math.min(waist - 0.4, k * 1.3)} ${tie - 0.6}"/>`;
    }
    c += `<path fill="${gold}" d="M${outer - dir * (waist + 0.6)} ${tie - 0.8}h${dir * (waist + 1)}v1.6h${-dir * (waist + 1)}z"/>` + `<circle cx="${outer - dir * (waist + 0.6)}" cy="${tie}" r="1" fill="#f0c860"/>`
      + R(Math.min(outer, outer - dir * bottom), 37.4, bottom, 0.6, redD);
    return c;
  };
  if (style === "aucun") return g;
  if (style === "store") {  // roller blind half down, with its pull cord, and a box at the top
    g += `<path fill="${red}" d="M5 3h48v15H5z"/>` + R(5, 18, 48, 1.2, redD);
    for (let y = 5; y < 18; y += 2.4) g += R(5, y, 48, 0.35, redD, ' fill-opacity=".6"');
    g += R(28.6, 19.2, 0.4, 4, "#e8e6dc") + R(28.1, 23, 1.4, 1.4, "#c9a24b");
    return g + R(3, 1, 52, 2.6, "#e8e6dc") + R(3, 1, 52, 0.6, "#ffffff") + R(3, 3, 52, 0.6, "#b8b4a6");
  }
  if (style === "lin") {  // straight, light linen panels on a thin rod
    const panel = x => { let c = `<path fill="${red}" fill-opacity=".92" d="M${x} 2.4h9v35.6h-9z"/>`;
      for (let k = 1; k < 4; k++) c += R(x + k * 2.3, 2.4, 0.5, 35.6, redD, ' fill-opacity=".5"') + R(x + k * 2.3 - 0.8, 2.4, 0.4, 35.6, redL, ' fill-opacity=".5"');
      for (let k = 0; k < 4; k++) c += `<circle cx="${x + 1 + k * 2.4}" cy="2" r=".7" fill="none" stroke="#7a8094" stroke-width=".35"/>`;
      return c; };
    return g + panel(0.6) + panel(48.4) + R(0, 1.4, 58, 0.8, "#7a8094") + `<circle cx="0.6" cy="1.8" r="1" fill="#9aa0b4"/><circle cx="57.4" cy="1.8" r="1" fill="#9aa0b4"/>`;
  }
  g += curtain(0, -1) + curtain(48, 1);
  // valance with scallops and a gold fringe, brass rod with finials
  let scallops = "M2 2.4H56V5.4";
  for (let x = 56; x > 2; x -= 6) scallops += `Q${x - 3} 8.4 ${x - 6} 5.4`;
  g += `<path fill="${red}" d="${scallops}Z"/>`;
  for (let x = 3; x < 56; x += 1.6) g += R(x, 5.6 + Math.abs(Math.sin(x / 6 * Math.PI)) * 2.2, 0.5, 1.1, gold);
  g += R(0, 1, 58, 1.6, "#c9a24b") + R(0, 1, 58, 0.5, "#f0c860") + `<circle cx="0.6" cy="1.8" r="1.6" fill="#e0b34f"/><circle cx="57.4" cy="1.8" r="1.6" fill="#e0b34f"/>`;
  return g;
}

/* 15. the sky behind the windows: gradient by the real hour (night, dawn, day, dusk), the sun on its course,
   moon and twinkling stars at night, puffy clouds drifting with parallax; the weather of today's tests (weather())
   greys the sky, adds clouds, rain and lightning. Drawn clipped to the glass. */
const SKY = {
  night: ["#0b1033", "#1a2558", "#2a3a78"], dawn: ["#41609f", "#e9a07e", "#ffd59a"],
  day: ["#3f95e0", "#79bdf2", "#c4e6ff"], dusk: ["#2b2d6e", "#b9567a", "#f6a35c"],
};
const SKY_GREY = { snow: ["#9aa8bd", "#c3cdda", "#e6ebf2"], cloud: ["#7f98b8", "#a9bbd0", "#d3dde8"], rain: ["#4f5f7c", "#6f7e98", "#93a1b6"], storm: ["#262c45", "#3a425f", "#535c78"] };
function skyPhase() {
  const d = typeof clockNow === "function" ? clockNow() : new Date(), h = d.getHours() + d.getMinutes() / 60;
  return { h, phase: h < 5.5 || h >= 21.5 ? "night" : h < 8 ? "dawn" : h < 18 ? "day" : "dusk" };
}
function skyGradientArt(stops) {
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".55" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs>`
    + `<rect x="0" y="0" width="46" height="28" fill="url(#sky)"/>`;
}
function cloudArt(kind, tone) {
  const [top, mid, low] = tone;
  const shapes = {  // [cx, cy, r] puffs over a flat base
    a: [[4, 5, 3], [8, 3.4, 3.6], [12.4, 4.6, 3], [15.4, 5.6, 2.2]],
    b: [[3.4, 4.4, 2.4], [7, 3, 3], [10.4, 4.2, 2.4]],
    c: [[4, 5, 2.6], [8.4, 3.2, 3.4], [13, 3.8, 3.2], [17.4, 5.2, 2.4], [20.4, 6, 1.6]],
  }[kind];
  const w = Math.max(...shapes.map(([x, , r]) => x + r)) + 0.4;
  let g = R(1.4, 5.4, w - 2.4, 3.2, mid);
  for (const [x, y, r] of shapes) g += `<circle cx="${x}" cy="${y + 1.2}" r="${r}" fill="${low}"/>`;
  for (const [x, y, r] of shapes) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${mid}"/>`;
  for (const [x, y, r] of shapes) g += `<circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.55}" fill="${top}"/>`;
  return { w, h: 9.2, body: g };
}
const CLOUD_TONES = {
  day: ["#ffffff", "#eef4fb", "#c9d8ea"], dawn: ["#fff1e6", "#f6c7b8", "#d99a9a"], dusk: ["#f9c9b8", "#d98fa0", "#8f5a86"],
  night: ["#5d6a9a", "#46527f", "#323c63"], snow: ["#f4f6fb", "#dfe5ee", "#c3cdda"], cloud: ["#eef1f5", "#cfd6df", "#a8b3c1"], rain: ["#9aa5b5", "#7e8a9c", "#626d80"], storm: ["#6a7288", "#4f566b", "#3a4054"],
};
function drawSky(x0, y0, t) {
  const W0 = 46, H0 = 28, { h, phase } = skyPhase(), w = typeof weather === "function" ? weather() : "clear";
  const grey = SKY_GREY[w], still = focusMode, tt = still ? 0 : t;
  ctx.save(); ctx.beginPath(); ctx.rect(Math.round(x0 * S), Math.round(y0 * S), Math.round(W0 * S), Math.round(H0 * S)); ctx.clip();
  const stops = grey ? (phase === "night" ? ["#141a33", "#1d2545", "#2a3354"] : grey) : SKY[phase];
  art(`sky:${phase}:${w}`, x0, y0, W0, H0, () => skyGradientArt(stops), { outline: false });
  // stars and moon at night, the sun by day
  if (phase === "night") {
    if (!grey) for (let i = 0; i < 14; i++) { const sx = x0 + (i * 17.3) % W0, sy = y0 + (i * 7.9) % 18; if ((Math.floor(tt / 500) + i) % 5) px(sx, sy, i % 4 ? 0.5 : 0.8, i % 4 ? 0.5 : 0.8, "#f4f2ff"); }
    art("moon", x0 + 33, y0 + 3, 7, 7, `<circle cx="3.5" cy="3.5" r="3.2" fill="#f4efc9"/><circle cx="5" cy="2.6" r="2.8" fill="${stops[0]}"/><circle cx="2" cy="4.4" r=".5" fill="#d9d3a8"/>`, { outline: false });
  } else if (!grey || w === "cloud") {
    const k = phase === "day" ? (h - 8) / 10 : phase === "dawn" ? 0.05 : 0.95, sx = x0 + 4 + k * (W0 - 8), sy = y0 + (phase === "day" ? 16 - Math.sin(k * Math.PI) * 12 : 21);
    const col = phase === "day" ? "#ffe066" : "#ff9f43";
    art(`sun:${col}`, sx - 5, sy - 5, 10, 10, `<circle cx="5" cy="5" r="5" fill="${col}" fill-opacity=".25"/><circle cx="5" cy="5" r="3.6" fill="${col}" fill-opacity=".35"/><circle cx="5" cy="5" r="2.4" fill="${col}"/><circle cx="4.3" cy="4.3" r=".9" fill="#fff8d0"/>`, { outline: false });
  }
  // clouds: far ones slow and small, near ones faster; more and greyer when tests go badly
  const tone = CLOUD_TONES[grey ? w : phase], n = { clear: 2, sun: 2, cloud: 4, rain: 5, storm: 6, snow: 4 }[w] || 2;
  for (let i = 0; i < n; i++) {
    const kind = "abc"[i % 3], c = cloudArt(kind, tone), speed = 900 - i * 120, span = W0 + c.w + 6;
    const cx = x0 - c.w - 3 + ((tt / speed + i * 23) % span), cy = y0 + 1 + (i * 5.3) % 13;
    art(`cloud:${kind}:${tone[1]}`, cx, cy, c.w, c.h, c.body, { outline: false });
  }
  if (w === "snow") for (let i = 0; i < 18; i++) px(x0 + ((i * 7.3 + tt / 90) % W0), y0 + ((i * 11.7 + tt / 45) % H0), 0.9, 0.9, "#ffffff");  // real weather (seasons.js)
  if (w === "rain" || w === "storm") for (let i = 0; i < 16; i++) {
    const rx = x0 + ((i * 7.3 + tt / 25) % W0), ry = y0 + 6 + ((i * 11.7 + tt / 9) % (H0 - 6));
    px(rx, ry, 0.5, 2.2, "#b8d4ff");
  }
  if (w === "storm" && !still && Math.floor(t / 130) % 37 === 0) {
    px(x0, y0, W0, H0, "rgba(255,255,255,.55)");
    art("bolt", x0 + 18, y0 + 4, 8, 16, `<path fill="#fff7b0" d="M5 0L1 8h3l-2 8 6-10H5l2-6z"/>`, { outline: false });
  }
  ctx.restore();
}

// karaoke corner: a small stage, two speakers whose cones pulse, a screen with the lyrics scrolling, the mic stand
function karaokeArt(frame, on) {
  const pulse = on && frame % 2 ? 0.6 : 0;
  let g = R(0, 26, 46, 10, "#5b2a86") + R(0, 26, 46, 1.4, "#8a4fc0") + R(0, 34, 46, 2, "#3a1a58");  // stage
  for (let i = 0; i < 7; i++) g += `<circle cx="${3 + i * 6.6}" cy="30.6" r=".7" fill="${on && (i + frame) % 3 === 0 ? "#fbaa08" : "#ffd88a"}"/>`;  // stage lights
  const speaker = x => R(x, 8, 8, 18, "#1c1c24") + R(x + 0.6, 8.6, 6.8, 16.8, "#2b2b33")
    + `<circle cx="${x + 4}" cy="13" r="${2 + pulse * 0.5}" fill="#454552"/><circle cx="${x + 4}" cy="13" r="1" fill="#1c1c24"/>`
    + `<circle cx="${x + 4}" cy="20.4" r="${2.8 + pulse}" fill="#454552"/><circle cx="${x + 4}" cy="20.4" r="1.3" fill="#1c1c24"/>`;
  g += speaker(1) + speaker(37);
  g += R(12, 0, 22, 14, "#14141c") + R(13, 1, 20, 12, on ? "#1b2a6b" : "#0b0b14");  // screen
  if (on) {
    const lines = [[15, 4, 14], [16, 7, 12], [15, 10, 15]];
    lines.forEach(([x, y, w], i) => { g += R(x, y, w, 1, "#f7f7f7", ' fill-opacity=".55"'); if (i === frame % 3) g += R(x, y, w * (0.3 + 0.2 * frame), 1, "#fbaa08"); });
  } else g += R(17, 6, 12, 1.4, "#3a3a50");
  g += R(21, 14, 4, 2, "#2b2b33") + R(22.5, 16, 1, 10, "#2b2b33") + R(20.5, 25.4, 5, 0.8, "#2b2b33");  // screen foot
  if (!on) g += R(30, 15, 0.8, 11, "#9aa0ad") + `<circle cx="30.4" cy="14.6" r="1.1" fill="#2b2b33"/>` + R(28.4, 25.4, 4, 0.8, "#9aa0ad");  // the mic waits on its stand
  return g;
}
// low table with a board game: board, pawns that move turn after turn, dice
function boardgameArt(frame) {
  let g = R(0, 3, 34, 7, "#7a4b32") + R(0, 3, 34, 1, "#9b6544") + R(2, 10, 2, 4, "#5b3a20") + R(30, 10, 2, 4, "#5b3a20");
  g += R(7, 1.6, 20, 7, "#e9dcc0") + R(7.6, 2.2, 18.8, 5.8, "#f7f0dc");
  const cells = ["#c0392b", "#2f9e44", "#2c7ae0", "#fbaa08"];
  for (let i = 0; i < 9; i++) g += R(8 + i * 2.05, 2.4, 1.6, 1, cells[i % 4]) + R(8 + i * 2.05, 6.8, 1.6, 1, cells[(i + 2) % 4]);
  const pos = [[10 + frame * 3, 4.4, "#c0392b"], [24 - frame * 2.6, 5, "#2c7ae0"]];
  for (const [x, y, c] of pos) g += `<circle cx="${x}" cy="${y}" r=".9" fill="${c}"/>`;
  g += R(3, 4.4, 2, 2, "#f7f7f7") + `<circle cx="4" cy="5.4" r=".35" fill="#1c1c24"/>` + R(28.4, 5, 2, 2, "#f7f7f7") + `<circle cx="${29 + (frame % 2) * 0.8}" cy="${5.6 + (frame % 2) * 0.8}" r=".35" fill="#1c1c24"/>`;
  return g;
}
