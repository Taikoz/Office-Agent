"use strict";
// Office logo (uploaded at setup) and pixel-art SVG sprites, rasterized once per scale.

/* ---------- office logo: header, favicon, wall sign ---------- */
let LOGO_DATA = null;  // the logo as a data URL: an SVG rasterized from a data URL cannot load /logo itself
if (OFFICE_CFG.logo) {
  const head = document.getElementById("logo");
  head.src = OFFICE_CFG.logo; head.hidden = false;
  document.querySelector("link[rel=icon]").href = OFFICE_CFG.logo;
  fetch(OFFICE_CFG.logo).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }))
    .then(url => { LOGO_DATA = url; SPRITES.sign[2] = signArt(); for (const k of [...spriteImgs.keys()]) if (k.startsWith("sign@")) spriteImgs.delete(k); })
    .catch(() => { /* keep the name on the sign */ });
}
const escXml = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// the wall sign: the logo, or the office name in navy letters
function signArt() {
  const frame = `<rect x="0" y="0" width="37" height="10" fill="#061238"/><rect x="1" y="1" width="35" height="8" fill="#f7f7f7"/><rect x="1" y="8" width="35" height="1" fill="#dadada"/>`;
  if (LOGO_DATA) return frame + `<image href="${LOGO_DATA}" x="2" y="1.6" width="33" height="6" preserveAspectRatio="xMidYMid meet"/>`;
  const name = escXml((OFFICE_CFG.office || "AGENT OFFICE").toUpperCase());
  return frame + `<text x="18.5" y="6.6" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="4.6" fill="#081746"`
    + `${name.length > 11 ? ' textLength="32" lengthAdjust="spacingAndGlyphs"' : ""} shape-rendering="geometricPrecision">${name}</text>`;
}

// pixel-art SVG sprites, in scene units (1 = one scene pixel, halves allowed for detail), rasterized once per scale
const SPRITES = {
  window: [54, 37, `
    <rect x="0" y="0" width="54" height="1.5" fill="#c9a24b"/>
    <path fill="#061238" fill-rule="evenodd" d="M2 2h50v32H2zM4 4h46v28H4z"/><rect x="2" y="2" width="50" height="1" fill="#1a3a8a"/>
    <rect x="26" y="4" width="2" height="28" fill="#061238"/><rect x="4" y="17" width="46" height="2" fill="#061238"/>
    <path fill="#fff" fill-opacity=".28" d="M9 6h3v1H9zM8 7h2v1H8zM7 8h2v2H7zM31 6h3v1h-3zM30 7h2v1h-2zM44 21h2v1h-2zM43 22h2v1h-2z"/>
    <rect x="0" y="1.5" width="7" height="29" fill="#8f3b52"/><path fill="#6f2b40" d="M2 1.5h1v29H2zM5 1.5h1v29H5z"/><rect x="0" y="19" width="7" height="1.5" fill="#c9a24b"/>
    <rect x="47" y="1.5" width="7" height="29" fill="#8f3b52"/><path fill="#6f2b40" d="M49 1.5h1v29h-1zM52 1.5h1v29h-1z"/><rect x="47" y="19" width="7" height="1.5" fill="#c9a24b"/>
    <rect x="1" y="33" width="52" height="2" fill="#a07c58"/><rect x="1" y="35" width="52" height="1" fill="#6d5238"/>`],
  coffee: [18, 22, `
    <rect x="1" y="21.4" width="16" height="0.6" fill="#000" fill-opacity=".35"/>
    <rect x="2" y="2" width="14" height="20" fill="#2a2a33"/><rect x="2" y="2" width="1" height="20" fill="#3d3d4a"/><rect x="15" y="2" width="1" height="20" fill="#1f1f27"/>
    <rect x="3" y="0" width="12" height="3" fill="#4a4a58"/><rect x="4" y="0.5" width="10" height="1.5" fill="#6d4a2e"/><path fill="#8a5d3a" d="M5 0.5h1v1H5zM8 1h1v1H8zM11 0.5h1v1h-1z"/>
    <rect x="4" y="4.5" width="10" height="5.5" fill="#1b3a5c"/><rect x="4.5" y="5" width="9" height="4.5" fill="#5aa9ff"/>
    <rect x="5.5" y="6" width="5" height="0.8" fill="#dff1ff"/><rect x="5.5" y="7.6" width="3" height="0.8" fill="#dff1ff"/>
    <rect x="5" y="11" width="2" height="1.5" fill="#ff6b6b"/><rect x="8" y="11" width="2" height="1.5" fill="#51cf66"/><rect x="11" y="11" width="2" height="1.5" fill="#fbaa08"/>
    <rect x="5" y="13.5" width="8" height="7" fill="#15151c"/><rect x="8" y="13.5" width="2" height="1.5" fill="#8d8aa0"/>
    <rect x="7" y="16.5" width="4" height="3.5" fill="#f4f2ea"/><rect x="11" y="17" width="1" height="2" fill="#f4f2ea"/><rect x="7" y="16.5" width="4" height="0.8" fill="#6d4a2e"/>
    <rect x="5" y="20" width="8" height="1" fill="#555564"/>`],
  plant: [14, 16, `
    <rect x="1" y="8" width="12" height="2" fill="#b86a48"/><rect x="2" y="8" width="10" height="0.8" fill="#4a3826"/>
    <rect x="2" y="10" width="10" height="6" fill="#a0573a"/><rect x="10" y="10" width="2" height="6" fill="#8a4a30"/><rect x="2" y="10" width="10" height="0.8" fill="#7f4329"/>
    <path fill="#2f6e3c" d="M6 2h2v6H6zM3 4h2v4H3zM9 3h2v5H9z"/>
    <path fill="#3f8f4f" d="M5 0h2v3H5zM1 3h2v2H1zM2 5h2v3H2zM10 1h2v3h-2zM11 4h2v2h-2zM7 4h2v4H7z"/>
    <path fill="#5fb36d" d="M5 0h1v1H5zM1 3h1v1H1zM10 1h1v1h-1zM7 4h1v1H7zM11 4h1v1h-1z"/>`],
  door: [30, 50, `
    <rect x="2" y="2" width="26" height="46" fill="#061238"/><rect x="4" y="4" width="22" height="44" fill="#7a5234"/>
    <rect x="4" y="4" width="1" height="44" fill="#946540"/><rect x="25" y="4" width="1" height="44" fill="#5e3e27"/>
    <rect x="7" y="7" width="16" height="15" fill="#6a4629"/><rect x="8" y="8" width="14" height="13" fill="#85593a"/>
    <rect x="7" y="27" width="16" height="18" fill="#6a4629"/><rect x="8" y="28" width="14" height="16" fill="#85593a"/>
    <rect x="20" y="24.5" width="3" height="2.5" fill="#c9a24b"/><rect x="20" y="24.5" width="1.5" height="1" fill="#f2d27b"/>`],
  monitor: [20, 15, `
    <path fill="#1c1c24" fill-rule="evenodd" d="M1 1h18v12H1zM2 2h16v10H2z"/><rect x="1" y="1" width="18" height="0.6" fill="#33333f"/>
    <rect x="16.6" y="12.2" width="0.8" height="0.6" fill="#51cf66"/>
    <path fill="#fff" fill-opacity=".14" d="M3 3h3v1H3zM3 4h1v2H3z"/>
    <rect x="9" y="13" width="2" height="1" fill="#1c1c24"/><rect x="7.5" y="13.6" width="5" height="0.8" fill="#2a2a33"/>`],
  desk: [36, 19, `
    <rect x="5" y="2.2" width="5" height="0.8" fill="#f4f2ea"/><rect x="5.5" y="1.6" width="5" height="0.8" fill="#fff7b8"/>
    <rect x="27" y="0.5" width="3" height="2.5" fill="#f7f7f7"/><rect x="30" y="1" width="0.8" height="1.4" fill="#f7f7f7"/><rect x="27" y="0.5" width="3" height="0.6" fill="#6d4a2e"/>
    <rect x="1" y="3" width="34" height="3" fill="#8a6a4a"/><rect x="1" y="3" width="34" height="0.7" fill="#a07c58"/>
    <rect x="12" y="3.4" width="12" height="1.6" fill="#2a2a33"/><path fill="#55556a" d="M13 3.8h1v0.6h-1zM15 3.8h1v0.6h-1zM17 3.8h1v0.6h-1zM19 3.8h1v0.6h-1zM21 3.8h1v0.6h-1zM14 4.4h7v0.4h-7z"/>
    <rect x="2" y="6" width="32" height="9" fill="#6d5238"/><rect x="2" y="6" width="32" height="0.8" fill="#5e4630"/>
    <rect x="4" y="8" width="10" height="5" fill="#5e4630"/><rect x="5" y="9" width="8" height="3" fill="#765a3e"/><rect x="8" y="10" width="2" height="1" fill="#c9a24b"/>
    <rect x="2" y="15" width="2" height="3" fill="#4a3826"/><rect x="32" y="15" width="2" height="3" fill="#4a3826"/>
    <rect x="1" y="18" width="34" height="1" fill="#000" fill-opacity=".25"/>`],
  tv: [24, 21, `
    <path fill="#1c1c24" fill-rule="evenodd" d="M3 0h18v12H3zM4 1h16v9H4z"/><rect x="3" y="0" width="18" height="0.6" fill="#33333f"/><rect x="18.6" y="10.6" width="0.8" height="0.6" fill="#ff6b6b"/>
    <rect x="11" y="12" width="2" height="1" fill="#1c1c24"/>
    <rect x="1" y="13" width="22" height="7" fill="#6d5238"/><rect x="1" y="13" width="22" height="1" fill="#8a6a4a"/><rect x="12" y="14.5" width="9" height="4.5" fill="#5e4630"/>
    <rect x="3" y="11.4" width="7" height="1.6" fill="#f7f7f7"/><rect x="3" y="12.4" width="7" height="0.6" fill="#b9b4c8"/><rect x="8.5" y="11.8" width="0.8" height="0.5" fill="#5aa9ff"/>
    <rect x="2" y="20" width="2" height="1" fill="#4a3826"/><rect x="20" y="20" width="2" height="1" fill="#4a3826"/>`],
  beanbag: [18, 11, `
    <rect x="1" y="10" width="16" height="1" fill="#000" fill-opacity=".3"/>
    <path fill="#1f75be" d="M3 3h12v1h1v2h1v4H1V6h1V4h1z"/><path fill="#589edc" d="M4 3h5v1H4zM3 4h2v2H3z"/><path fill="#11379e" d="M13 6h3v4h-3zM2 9h14v1H2z"/>`],
  sign: [37, 10, ""],
  dartboard: [14, 14, `
    <rect x="3" y="0" width="8" height="14" fill="#1c1c24"/><rect x="0" y="3" width="14" height="8" fill="#1c1c24"/><rect x="1" y="1" width="12" height="12" fill="#1c1c24"/>
    <rect x="3" y="2" width="8" height="10" fill="#f4efc9"/><rect x="2" y="3" width="10" height="8" fill="#f4efc9"/><rect x="4" y="4" width="6" height="6" fill="#d64545"/>
    <rect x="5" y="5" width="4" height="4" fill="#2f9e44"/><rect x="6" y="6" width="2" height="2" fill="#d64545"/>
    <rect x="9" y="4" width="2.5" height="0.6" fill="#fbaa08"/><rect x="3" y="8" width="2.5" height="0.6" fill="#fbaa08"/>`],
  bookshelf: [26, 40, `
    <rect x="0" y="0" width="26" height="40" fill="#6d5238"/><rect x="2" y="2" width="22" height="36" fill="#4a3826"/>
    ${[0, 1, 2].map(r => { const y = 2 + r * 12; const books = [["#ff6b6b", 3], ["#4090d7", 2], ["#fbaa08", 3], ["#51cf66", 2], ["#e9e4f5", 3], ["#b48cff", 2], ["#ff8f6b", 3]];
      let x = 3, out = ""; for (const [c, w] of books) { if (x + w > 23) break; const h = 7 + ((x * 7 + r * 3) % 3); out += `<rect x="${x}" y="${y + 10 - h}" width="${w}" height="${h}" fill="${c}"/>`; x += w + 0.4; }
      return out + `<rect x="2" y="${y + 10}" width="22" height="2" fill="#6d5238"/>`; }).join("")}`],
  kitchen: [76, 38, `
    <rect x="0" y="0" width="56" height="9" fill="#11379e"/><rect x="0" y="8" width="56" height="1" fill="#081746"/><path fill="#c8c8c8" d="M13 6h3v1h-3zM40 6h3v1h-3z"/><rect x="28" y="0" width="0.6" height="8" fill="#081746"/>
    <rect x="0" y="22" width="56" height="2" fill="#dadada"/><rect x="0" y="24" width="56" height="14" fill="#11379e"/><rect x="18.5" y="24" width="0.6" height="14" fill="#081746"/><rect x="37.5" y="24" width="0.6" height="14" fill="#081746"/>
    <path fill="#c8c8c8" d="M8 27h3v1H8zM27 27h3v1h-3zM46 27h3v1h-3z"/>
    <rect x="6" y="18" width="6" height="4" fill="#2a2a33"/><rect x="7" y="16" width="4" height="2" fill="#2a2a33"/><rect x="7.5" y="19" width="3" height="1.5" fill="#4090d7"/>
    <rect x="20" y="21" width="10" height="1.5" fill="#8d8aa0"/><rect x="24" y="17" width="1" height="4" fill="#c8c8c8"/><rect x="24" y="17" width="3" height="1" fill="#c8c8c8"/>
    <rect x="38" y="19" width="8" height="3" fill="#d6a77f"/><rect x="39" y="17.5" width="2" height="2" fill="#ff6b6b"/><rect x="41.5" y="17" width="2" height="2.5" fill="#fbaa08"/><rect x="43.5" y="18" width="2" height="2" fill="#51cf66"/>
    <rect x="58" y="0" width="18" height="38" fill="#f7f7f7"/><rect x="58" y="14" width="18" height="0.8" fill="#adadad"/><rect x="74" y="0" width="2" height="38" fill="#dadada"/>
    <rect x="60" y="5" width="1" height="6" fill="#888"/><rect x="60" y="17" width="1" height="8" fill="#888"/><rect x="65" y="3" width="2" height="2" fill="#ff6b6b"/><rect x="69" y="6" width="2" height="2" fill="#fbaa08"/>`],
  armchair: [20, 16, `
    <rect x="2" y="0" width="16" height="10" fill="#b85905"/><rect x="2" y="0" width="16" height="1" fill="#de8001"/><rect x="2" y="9" width="16" height="5" fill="#95440b"/>
    <rect x="0" y="5" width="3" height="10" fill="#7b380c"/><rect x="17" y="5" width="3" height="10" fill="#7b380c"/><rect x="0" y="5" width="3" height="1" fill="#b85905"/><rect x="17" y="5" width="3" height="1" fill="#b85905"/>
    <rect x="1" y="15" width="18" height="1" fill="#000" fill-opacity=".3"/>`],
  arcade: [22, 36, `
    <rect x="1" y="0" width="20" height="35" fill="#081746"/><rect x="1" y="0" width="20" height="4" fill="#fbaa08"/><rect x="3" y="1.2" width="16" height="1.5" fill="#ff6b6b"/>
    <path fill="#081746" fill-rule="evenodd" d="M3 4h16v12H3zM4 5h14v10H4z"/><rect x="2" y="17" width="18" height="5" fill="#11379e"/>
    <rect x="6" y="18" width="1.2" height="2.5" fill="#1c1c24"/><rect x="5.4" y="17.4" width="2.4" height="1.4" fill="#ff6b6b"/><rect x="12" y="19" width="1.6" height="1.6" fill="#51cf66"/><rect x="15" y="19" width="1.6" height="1.6" fill="#4090d7"/>
    <rect x="1" y="4" width="1" height="31" fill="#fbaa08"/><rect x="20" y="4" width="1" height="31" fill="#fbaa08"/><rect x="0" y="35" width="22" height="1" fill="#000" fill-opacity=".3"/>`],
  sofa: [56, 16, `
    <rect x="0" y="0" width="56" height="15" fill="#11379e"/><rect x="5" y="1" width="46" height="10" fill="#1f75be"/><rect x="5" y="1" width="46" height="1" fill="#589edc"/>
    <rect x="18.6" y="1" width="0.8" height="10" fill="#11379e"/><rect x="36.6" y="1" width="0.8" height="10" fill="#11379e"/>
    <rect x="0" y="0" width="5" height="15" fill="#0837cb"/><rect x="51" y="0" width="5" height="15" fill="#0837cb"/><rect x="2" y="15" width="3" height="1" fill="#1c1c24"/><rect x="51" y="15" width="3" height="1" fill="#1c1c24"/>`],
  pingpong: [72, 30, `
    <rect x="6" y="22" width="2" height="7" fill="#2a2a33"/><rect x="64" y="22" width="2" height="7" fill="#2a2a33"/><rect x="2" y="29" width="68" height="1" fill="#000" fill-opacity=".3"/>
    <rect x="2" y="2" width="68" height="20" fill="#1f8a5a"/><path fill="none" stroke="#f7f7f7" stroke-width=".6" d="M2.3 2.3h67.4v19.4H2.3zM2.3 12h67.4"/><rect x="2" y="22" width="68" height="1.5" fill="#156b44"/>
    <rect x="35.4" y="0" width="1.2" height="24" fill="#f7f7f7"/><rect x="35" y="0" width="2" height="1" fill="#1c1c24"/><rect x="35" y="23" width="2" height="1" fill="#1c1c24"/>`],
  babyfoot: [48, 24, `
    <rect x="0" y="2" width="48" height="20" fill="#6d5238"/><rect x="3" y="5" width="42" height="14" fill="#2f9e44"/><rect x="23.7" y="5" width="0.6" height="14" fill="#f7f7f7"/>
    <rect x="3" y="10" width="1.5" height="4" fill="#f7f7f7"/><rect x="43.5" y="10" width="1.5" height="4" fill="#f7f7f7"/>
    ${[9, 17, 31, 39].map((x, i) => `<rect x="${x}" y="0" width="0.8" height="24" fill="#c8c8c8"/>` + [7, 12, 16].map(y => `<rect x="${x - 0.8}" y="${y}" width="2.4" height="1.6" fill="${i % 2 ? "#ff6b6b" : "#4090d7"}"/>`).join("")).join("")}
    <rect x="2" y="22" width="2" height="2" fill="#4a3826"/><rect x="44" y="22" width="2" height="2" fill="#4a3826"/>`],
  cabinet: [24, 47, `
    <rect x="1" y="2" width="22" height="44" fill="#5d6274"/><rect x="20.5" y="2" width="2.5" height="44" fill="#4a4f5f"/><rect x="1" y="2" width="1" height="44" fill="#6f7589"/>
    <rect x="0" y="0" width="24" height="3" fill="#7a8094"/><rect x="0" y="0" width="24" height="0.8" fill="#9aa0b4"/>
    ${[0, 1, 2].map(i => { const y = 5 + i * 13.5; return `<rect x="3" y="${y}" width="18" height="11" fill="#6f7589"/><rect x="3" y="${y}" width="18" height="0.6" fill="#8a90a6"/>
      <rect x="3" y="${y + 10.4}" width="18" height="0.6" fill="#4a4f5f"/><rect x="8" y="${y + 1.5}" width="8" height="2" fill="#f4f2ea"/>
      <rect x="9" y="${y + 4}" width="6" height="2" fill="#c9ccd8"/><rect x="9" y="${y + 5.4}" width="6" height="0.6" fill="#8a90a6"/>`; }).join("")}
    <rect x="2" y="46" width="20" height="1" fill="#000" fill-opacity=".3"/>`],
};
const spriteImgs = new Map(), spriteLast = new Map();
SPRITES.sign[2] = signArt();
function sprite(name, x, y) {
  const [w, h, body] = SPRITES[name], key = `${name}@${S}`;
  let img = spriteImgs.get(key);
  if (!img) {
    img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w * S)}" height="${Math.round(h * S)}" shape-rendering="crispEdges">${body}</svg>`);
    spriteImgs.set(key, img);
  }
  if (img.complete && img.naturalWidth) spriteLast.set(name, img); else img = spriteLast.get(name);  // previous scale while the new one loads
  if (img) ctx.drawImage(img, Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S));
}
