"use strict";
// Decor editor (🎨 DÉCO, D): wall, floor, wood, rug, curtains and door of the office and of the break room.
// Kept in the localStorage; the floor and the wall are painted once per scale and per setting.

const DECOR_DEFAULT = {
  office: { wall: "lambris", wallColor: "#2f4f4f", floor: "parquet", floorColor: "#5f4936", wood: "#8a6a4a",
    rug: "liseré", rugColor: "#3a3a48", curtain: "velours", curtainColor: "#8f2b46", door: "panneaux", doorColor: "#7a5234" },
  lounge: { wall: "lambris", wallColor: "#8c5a3c", floor: "moquette", floorColor: "#b5ad9e", wood: "#8a6a4a",
    rug: "rond", rugColor: "#d9824f", curtain: "velours", curtainColor: "#8f2b46", door: "panneaux", doorColor: "#7a5234" },
};
const DECOR_TYPES = {
  wall: [["lambris", "Lambris"], ["uni", "Uni"], ["rayures", "Rayures"], ["briques", "Briques"], ["papier", "Papier peint"], ["boiserie", "Boiserie basse"]],
  floor: [["parquet", "Parquet"], ["chevron", "Point de Hongrie"], ["moquette", "Moquette"], ["carrelage", "Carrelage"], ["damier", "Damier"], ["beton", "Béton ciré"]],
  rug: [["liseré", "Liseré"], ["uni", "Uni"], ["rayé", "Rayé"], ["persan", "Persan"], ["rond", "Rond"], ["aucun", "Aucun"]],
  curtain: [["velours", "Velours"], ["lin", "Lin"], ["store", "Store"], ["aucun", "Aucun"]],
  door: [["panneaux", "Panneaux"], ["vitrée", "Vitrée"], ["lisse", "Lisse"]],
};
const WOODS = [["Chêne", "#8a6a4a"], ["Noyer", "#5c3d27"], ["Érable", "#c9a06a"], ["Merisier", "#9a4f2e"], ["Wengé", "#3b2a20"],
  ["Bouleau", "#d8c3a0"], ["Laqué blanc", "#e6e2d8"], ["Laqué noir", "#2a2a33"]];
const DECOR_COLORS = {
  wallColor: ["#0d2766", "#14317a", "#2b2d42", "#3d5a80", "#2f4f4f", "#4a5d3a", "#6b2d3c", "#8c5a3c", "#c9b79c", "#e8e2d0", "#7a7f8c", "#1c1c24"],
  floorColor: ["#5f4936", "#7a5a3c", "#a07850", "#c9a374", "#3b2a20", "#3a4a73", "#4a4a52", "#8c8c8c", "#b5ad9e", "#2f3e2f", "#6b2d3c", "#d8d2c4"],
  rugColor: ["#22336a", "#d9824f", "#8f2b46", "#2f6e3c", "#4a2f6b", "#c9a24b", "#1f75be", "#3a3a48", "#b8643c", "#e8e2d0"],
  curtainColor: ["#8f2b46", "#22336a", "#2f6e3c", "#c9a24b", "#e8e2d0", "#4a2f6b", "#b8643c", "#3a3a48", "#d98fa0", "#5aa9ff"],
  doorColor: [...WOODS.map(w => w[1]), "#081746", "#2f6e3c", "#8f2b46", "#7a8094"],
};
const DECOR_ROWS = [  // [type key, color key, label]; the wood has named presets instead of types
  ["wall", "wallColor", "Murs"], ["floor", "floorColor", "Sol"], [null, "wood", "Bois"],
  ["rug", "rugColor", "Tapis"], ["curtain", "curtainColor", "Rideaux"], ["door", "doorColor", "Porte"],
];

let decor = (() => {
  const s = store("office-decor", {});
  return { office: { ...DECOR_DEFAULT.office, ...(s.office || {}) }, lounge: { ...DECOR_DEFAULT.lounge, ...(s.lounge || {}) } };
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

// a rug in the box (x0, y0, w, h): fringes on the short sides, as on the office rugs
function paintRug(p, x0, y0, w, h, type, base) {
  const { rect, ellipse } = p, dark = shade(base, 0.7), light = shade(base, 1.3);
  if (type === "aucun") return;
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
function roomFloorCanvas(room, h, rugs) {
  const d = decor[room], sig = `${S}|${decorSig(room, ["floor", "floorColor", "rug", "rugColor"])}|${JSON.stringify(rugs)}`;
  if (floorCaches[room]?.sig === sig) return floorCaches[room].c;
  const p = decorPainter(W, h);
  paintFloor(p, W, h, d.floor, d.floorColor);
  for (const [x, y, w, hh] of rugs) paintRug(p, x, y, w, hh, d.rug, d.rugColor);
  for (let k = 0; k < 8; k++) p.rect(0, k, W, 1, `rgba(10, 8, 30, ${0.28 - k * 0.035})`);  // shade cast by the wall
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
  } else if (d.wall === "boiserie") {  // wainscot in the furniture wood below the chair rail
    const wood = d.wood;
    rect(0, 40, W, 30, shade(wood, 0.85)); rect(0, 40, W, 1.2, shade(wood, 1.15));
    for (let x = 3; x < W; x += 24) { rect(x, 43, 20, 20, shade(wood, 0.75)); rect(x + 1, 44, 18, 18, shade(wood, 0.95)); rect(x + 1, 44, 18, 0.5, shade(wood, 1.12)); }
  }
  for (let y = 0; y < 6; y++) rect(0, y, W, 1, `rgba(0, 0, 0, ${0.18 - y * 0.03})`);  // ceiling shade
  wallCaches[room] = { sig, c: p.c };
  return p.c;
}
function drawWall(room) { ctx.drawImage(roomWallCanvas(room), 0, 0); }

/* ---------- recolored sprites: wood furniture and doors ---------- */
const WOOD_TONES = { "#a07c58": 1.16, "#8a6a4a": 1, "#765a3e": 0.85, "#6d5238": 0.79, "#5e4630": 0.68, "#4a3826": 0.54 };
function woodSprite(name, base) {
  if (base === DECOR_DEFAULT.office.wood) return name;
  const key = `${name}~${base}`;
  if (!SPRITES[key]) {
    const [w, h, body] = SPRITES[name];
    SPRITES[key] = [w, h, body.replace(/#[0-9a-f]{6}/gi, c => WOOD_TONES[c.toLowerCase()] ? shade(base, WOOD_TONES[c.toLowerCase()]) : c)];
  }
  return key;
}
function doorSprite(room) {
  const { door: style, doorColor: c } = decor[room], key = `door:${style}:${c}`;
  if (SPRITES[key]) return key;
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
  SPRITES[key] = [30, 50, b];
  return key;
}
// the window with this room's curtains (art.js windowArt)
function drawWindow(room, x, y) {
  const { curtain, curtainColor } = decor[room];
  art(`window:${curtain}:${curtainColor}`, x, y, 58, 41, () => windowArt(curtain, curtainColor));
}

/* ---------- the editor panel ---------- */
let decorOpen = false, decorRoom = "office";
const decorBox = document.getElementById("decor"), decorBtn = document.getElementById("decorbtn");
function toggleDecor(open = !decorOpen) {
  decorOpen = open;
  decorBox.hidden = !open; decorBtn.classList.toggle("on", open); decorBtn.setAttribute("aria-expanded", open);
  if (open) { decorRoom = view === "lounge" ? "lounge" : "office"; renderDecor(); }
}
function renderDecor() {
  const d = decor[decorRoom], chip = (k, v, label, on) => `<button class="chip${on ? " on" : ""}" data-k="${k}" data-v="${v}">${esc(label)}</button>`;
  const rows = DECOR_ROWS.map(([tk, ck, label]) => {
    const lbl = tk ? label : decorRoom === "office" ? "Bureaux (bois)" : "Meubles (bois)";
    const types = tk ? DECOR_TYPES[tk].map(([v, l]) => chip(tk, v, l, d[tk] === v)).join("") : WOODS.map(([l, v]) => chip(ck, v, l, d[ck] === v)).join("");
    const sw = tk ? (DECOR_COLORS[ck] || []).map(c => `<button class="sw${d[ck] === c ? " on" : ""}" data-k="${ck}" data-v="${c}" style="--c:${c}" title="${c}" aria-label="${c}"></button>`).join("") : "";
    return `<div class="drow"><div class="dl">${lbl}</div><div class="chips">${types}</div>
      <div class="sws">${sw}<label class="pick" title="Couleur personnalisée"><input type="color" data-k="${ck}" value="${d[ck]}"><span>autre…</span></label></div></div>`;
  }).join("");
  decorBox.innerHTML = `<div class="dhead"><b>🎨 DÉCO</b>
      <div class="tabs">${[["office", "🏢 Bureau"], ["lounge", "☕ Salle de repos"]].map(([r, l]) => `<button data-room="${r}"${decorRoom === r ? ' class="on"' : ""}>${l}</button>`).join("")}</div>
      <button class="x" data-close title="Fermer (D)">×</button></div>
    ${rows}
    <div class="dfoot"><button data-reset>↺ Réinitialiser cette pièce</button><button data-copy>⇄ Copier vers ${decorRoom === "office" ? "la salle de repos" : "le bureau"}</button></div>`;
}
function setDecor(k, v, rerender = true) {
  decor[decorRoom][k] = v; save("office-decor", decor);
  if (rerender) renderDecor();
}
decorBtn.onclick = () => toggleDecor();
decorBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.close !== undefined) return toggleDecor(false);
  if (b.dataset.room) { decorRoom = b.dataset.room; if (view !== "game") setView(decorRoom); return renderDecor(); }
  if (b.dataset.reset !== undefined) { decor[decorRoom] = { ...DECOR_DEFAULT[decorRoom] }; save("office-decor", decor); return renderDecor(); }
  if (b.dataset.copy !== undefined) { const other = decorRoom === "office" ? "lounge" : "office"; decor[other] = { ...decor[decorRoom] }; save("office-decor", decor); toast("DÉCO", "Style copié", other === "office" ? "Vers le bureau." : "Vers la salle de repos."); return; }
  if (b.dataset.k) setDecor(b.dataset.k, b.dataset.v);
});
decorBox.addEventListener("input", ev => { if (ev.target.type === "color") setDecor(ev.target.dataset.k, ev.target.value, false); });  // live preview
decorBox.addEventListener("change", ev => { if (ev.target.type === "color") renderDecor(); });
