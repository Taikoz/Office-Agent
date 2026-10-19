// Who walks around: the team and the chief (PersonArt), Brume the cat, Biscuit the dog, and the plumbob over a head.

import { ART, Figure, R, SvgArt, shade } from "./base.js";

// people (outlined, shaded, 9 hair styles, glasses, beards, outfits, hats), standing on their feet
// look: skin, hair, shirt, style (hair 0-8), glasses (true / "square" / "round" / "sun"), and for a custom sim (the chief, chief.js):
// outfit (tux, suit, shirt, hoodie, tshirt, polo), tie, pants, shoes, beard (stubble, short, full, mustache, goatee)
// the visible traits of a look (the cache key of its images; a look also carries other fields)
const LOOK_TRAITS = ["skin", "hair", "shirt", "style", "glasses", "outfit", "tie", "pants", "shoes", "beard", "beardColor", "scarf", "wand"];
export const lookTraits = look => Object.fromEntries(LOOK_TRAITS.map(k => [k, look[k]]));
export const lookKey = look => LOOK_TRAITS.map(k => look[k]).join("|");
class PersonArt extends Figure {
  constructor() { super("person", 9, 25, 18, 26, { outline: 0.45 }); }
  shadow({ seated = false }) { return seated ? null : [4.5, 0.9, 0.28]; }
  body({ look, frame = 0, back = false, seated = false, arms = "down", tux = false, smile = false, hat = "" }) {
    const outfit = look.outfit || (tux ? "tux" : "tshirt"), dark = outfit === "tux";
    const shirt = dark ? (look.outfit ? look.shirt : "#1c1c24") : look.shirt, sh = shade(shirt, 0.72), skin = look.skin, skd = shade(skin, 0.84), hair = look.hair, hl = shade(hair, 1.45);
    const pants = look.pants || "#2f3550", shoes = look.shoes || "#17141c", tie = look.tie || "#d64545", beardC = look.beardColor || hair;
    const ty = -12, hy = -19, st = look.style || 0, bald = st === 5;
    let g = "";
    const robe = outfit === "robe";
    if (!seated && robe) {  // the robe down to the shoes, its trim, the shoes peeking
      const lo = frame % 2 ? 1 : -1;
      g += R(-3.4, -1 + Math.min(0, lo) * 0.5, 2.6, 1.1, shoes) + R(0.8, -1 - Math.max(0, lo) * 0.5, 2.6, 1.1, shoes);
      g += `<path fill="${shirt}" d="M-4 -5.4H4L4.8 -0.6H-4.8Z"/>` + R(2.6, -5.4, 1.6, 4.8, sh) + R(-4.8, -1.2, 9.6, 0.6, sh) + (back ? "" : R(-0.4, -5.4, 0.8, 4.8, tie));
    } else if (!seated) {
      const lo = frame % 2 ? 1 : -1;
      g += R(-3, -5, 2, 5 + Math.min(0, lo), pants) + R(1, -5, 2, 5 - Math.max(0, lo), pants) + R(-1.6, -5, 0.6, 3, shade(pants, 0.75)) + R(2.4, -5, 0.6, 3, shade(pants, 0.75));
      g += R(-3.6, -1 + Math.min(0, lo), 2.6, 1.1, shoes) + R(1, -1 - Math.max(0, lo), 2.6, 1.1, shoes);
    }
    // hood behind the head
    if (outfit === "hoodie" && back) g += R(-3.4, hy + 3.6, 6.8, 4, shade(shirt, 0.85));
    // torso
    g += R(-4, ty, 8, 7, shirt) + R(2.8, ty, 1.2, 7, sh) + R(-4, ty + 6.2, 8, 0.8, sh);
    if (!back) {
      if (outfit === "tux") g += R(-1, ty, 2, 4.5, "#f4f2ea") + R(-0.3, ty + 2.2, 0.6, 0.6, "#1c1c24") + R(-0.3, ty + 3.6, 0.6, 0.6, "#1c1c24") + R(-2.2, ty, 4.4, 1.5, tie) + R(-0.5, ty, 1, 1.5, shade(tie, 0.8));
      else if (outfit === "suit") g += `<path fill="#f4f2ea" d="M-1.6 ${ty}h3.2l-1.6 3.4z"/>` + R(-0.5, ty + 0.4, 1, 4.6, tie) + R(-0.7, ty + 0.2, 1.4, 1, shade(tie, 0.8)) + R(-2.6, ty, 0.6, 4, sh) + R(2, ty, 0.6, 4, sh);
      else if (outfit === "shirt") g += `<path fill="${shade(shirt, 1.25)}" d="M-2.4 ${ty}h1.8l-0.6 1.6zM0.6 ${ty}h1.8l-1.2 1.6z"/>` + R(-1, ty, 2, 1, skd) + [1.8, 3.4, 5].map(y => R(-0.3, ty + y, 0.6, 0.6, shade(shirt, 0.6))).join("");
      else if (outfit === "hoodie") g += R(-2.6, ty, 5.2, 1.6, shade(shirt, 0.85)) + R(-1, ty, 2, 1, skd) + R(-1.2, ty + 1.4, 0.4, 2.2, "#f4f2ea") + R(0.8, ty + 1.4, 0.4, 2.2, "#f4f2ea") + R(-2.2, ty + 4, 4.4, 2, sh);
      else if (robe) g += R(-0.4, ty, 0.8, 7, tie) + `<path fill="${sh}" d="M-2.4 ${ty}h4.8l-2.4 2.2z"/>` + R(-0.7, ty + 0.4, 1.4, 1, "#d4a640");
      else if (outfit === "polo") g += R(-1, ty, 2, 1.2, skd) + R(-2.4, ty, 1.4, 1.2, shade(shirt, 1.3)) + R(1, ty, 1.4, 1.2, shade(shirt, 1.3)) + R(-0.3, ty + 1.4, 0.6, 0.6, shade(shirt, 0.6)) + R(-0.3, ty + 2.6, 0.6, 0.6, shade(shirt, 0.6));
      else g += R(-1, ty, 2, 1.2, skd) + R(-2.2, ty, 1.2, 1.4, shade(shirt, 1.25)) + R(1, ty, 1.2, 1.4, shade(shirt, 1.25));
    }
    // arms
    const arm = (x, y, h, hy2) => R(x, y, 2, h, shirt) + R(x + (x < 0 ? 0 : 1.4), y, 0.6, h, sh) + R(x, hy2, 2, 1.6, skin);
    if (arms === "up") g += arm(-6, ty - 5, 6, ty - 6.4) + arm(4, ty - 5, 6, ty - 6.4);
    else if (arms === "type") { const a = frame % 2; g += arm(-6, ty + 1, 4, ty - 1 + a) + arm(4, ty + 1, 4, ty - a); }
    else if (arms === "baton") { const lift = frame % 2 ? -3 : 0; g += arm(-6, ty + 1, 5, ty + 6) + arm(4, ty - 2 + lift, 6, ty - 3.4 + lift); }
    else g += arm(-6, ty + 1, 6, ty + 7) + arm(4, ty + 1, 6, ty + 7);
    if (look.wand && !back) g += arms === "up" ? R(4.7, ty - 11, 0.6, 5, "#5a3a24") + R(4.6, ty - 11.6, 0.8, 0.8, "#fff3b0") : arms !== "type" && !seated ? `<path stroke="#5a3a24" stroke-width=".6" stroke-linecap="round" d="M5.2 ${ty + 8}l3 -3.4"/>` + R(7.8, ty + 4.2, 0.8, 0.8, "#fff3b0") : "";
    if (look.scarf) {  // a striped scarf around the neck, one end down the front
      const [sa, sb = "#f4f2ea"] = String(look.scarf).split(",");
      g += R(-3.2, ty - 0.8, 6.4, 1.8, sa) + [-2.2, -0.2, 1.8].map(x => R(x, ty - 0.8, 0.7, 1.8, sb)).join("");
      if (!back) g += R(0.8, ty + 1, 1.6, 4.8, sa) + R(0.8, ty + 2.2, 1.6, 0.6, sb) + R(0.8, ty + 3.8, 1.6, 0.6, sb) + R(0.8, ty + 5.4, 1.6, 0.4, sb);
    }
    // head
    if (back) {
      g += R(-3.6, hy + 3, 0.7, 1.6, skd) + R(2.9, hy + 3, 0.7, 1.6, skd) + R(-1.5, hy + 6.2, 3, 0.9, skd);
      g += bald ? R(-3.2, hy - 0.2, 6.4, 6.5, skin) + R(-3.2, hy + 4, 6.4, 1.6, hair) : R(-3.2, hy - 0.6, 6.4, 6.9, hair) + R(-2, hy - 0.4, 2.4, 0.6, hl);
      if (st === 2) g += R(-3.4, hy + 4, 6.8, 4.4, hair);
      if (st === 6) g += R(-3.6, hy + 4, 7.2, 6.6, hair) + R(-3.6, hy + 9.8, 7.2, 0.8, shade(hair, 0.8));
    } else {
      g += R(-3, hy, 6, 7, skin) + R(-3, hy + 6, 6, 1, skd) + R(-3.6, hy + 3, 0.7, 1.6, skd) + R(2.9, hy + 3, 0.7, 1.6, skd);
      g += R(-2, hy + 3.4, 1, 1.2, "#1a1a1a") + R(1, hy + 3.4, 1, 1.2, "#1a1a1a") + R(-1.7, hy + 3.5, 0.4, 0.4, "#fff") + R(1.3, hy + 3.5, 0.4, 0.4, "#fff");
      g += R(-2.7, hy + 5, 1, 0.6, "#e88a8a", ' fill-opacity=".55"') + R(1.7, hy + 5, 1, 0.6, "#e88a8a", ' fill-opacity=".55"');
      const b = look.beard;
      if (b === "stubble") g += R(-3, hy + 4.8, 6, 2.2, beardC, ' fill-opacity=".35"');
      else if (b === "short") g += R(-3, hy + 5.2, 6, 1.8, beardC) + R(-3, hy + 4, 0.8, 1.4, beardC) + R(2.2, hy + 4, 0.8, 1.4, beardC);
      else if (b === "full") g += R(-3.2, hy + 4, 6.4, 3.4, beardC) + R(-3.6, hy + 3, 0.8, 2.4, beardC) + R(2.8, hy + 3, 0.8, 2.4, beardC) + R(-1.6, hy + 7.2, 3.2, 0.8, beardC);
      else if (b === "goatee") g += R(-0.9, hy + 5.8, 1.8, 1.8, beardC);
      if (b === "mustache" || b === "goatee" || b === "full") g += R(-1.8, hy + 5, 3.6, 0.7, shade(beardC, 0.85));
      g += smile ? R(-1, hy + 5.7, 2, 0.6, "#7a2b2b") + R(-1.4, hy + 5.2, 0.5, 0.5, "#7a2b2b") + R(0.9, hy + 5.2, 0.5, 0.5, "#7a2b2b") : R(-0.6, hy + 5.8, 1.2, 0.5, "#8a4a4a");
      const gl = look.glasses === true ? "square" : look.glasses;
      if (gl === "square") g += `<path fill="none" stroke="#1c1c24" stroke-width=".45" d="M-2.6 ${hy + 3}h2v1.8h-2zM0.6 ${hy + 3}h2v1.8h-2zM-0.6 ${hy + 3.6}h1.2"/>`;
      else if (gl === "round") g += `<g fill="none" stroke="#7a5a2e" stroke-width=".45"><circle cx="-1.5" cy="${hy + 3.9}" r="1.1"/><circle cx="1.5" cy="${hy + 3.9}" r="1.1"/><path d="M-0.4 ${hy + 3.8}h0.8"/></g>`;
      else if (gl === "sun") g += R(-2.7, hy + 3, 2.2, 1.8, "#1c1c24") + R(0.5, hy + 3, 2.2, 1.8, "#1c1c24") + R(-0.6, hy + 3.4, 1.2, 0.5, "#1c1c24") + R(-2.4, hy + 3.2, 0.7, 0.4, "#ffffff", ' fill-opacity=".5"');
      if (!bald) g += R(-3.4, hy - 0.6, 6.8, 2.4, hair) + R(-2, hy - 0.4, 2.4, 0.6, hl);
      else g += R(-3.4, hy + 2, 0.9, 2, hair) + R(2.5, hy + 2, 0.9, 2, hair) + R(-1.6, hy + 0.4, 1.4, 0.6, shade(skin, 1.15));
      if (st === 2) g += R(-3.6, hy + 1.8, 1.2, 6.6, hair) + R(2.4, hy + 1.8, 1.2, 6.6, hair);
      else if (st === 6) g += R(-3.8, hy + 1.8, 1.4, 9, hair) + R(2.4, hy + 1.8, 1.4, 9, hair);
      else if (st === 4) g += R(-3.4, hy + 1.8, 3.6, 1, hair) + R(-3.4, hy + 1.8, 0.8, 1.6, hair);
      else if (!bald) g += R(-3.4, hy + 1.8, 0.9, 2, hair) + R(2.5, hy + 1.8, 0.9, 2, hair);
    }
    if (st === 1) g += R(-3, hy - 1.6, 1.2, 1.1, hair) + R(-0.6, hy - 2.1, 1.2, 1.6, hair) + R(1.8, hy - 1.6, 1.2, 1.1, hair);
    if (st === 3) g += R(-1.4, hy - 2.7, 2.8, 2.2, hair) + R(-0.8, hy - 2.5, 1, 0.5, hl);
    if (st === 7) g += `<circle cx="0" cy="${hy - 1.8}" r="1.8" fill="${hair}"/>` + R(-0.6, hy - 2.8, 1, 0.5, hl);
    if (st === 8) g += R(-0.9, hy - 3.2, 1.8, 3, hair) + R(-0.5, hy - 3.2, 0.6, 2.4, hl);
    if (hat === "cap") g += R(-3.6, hy - 1.8, 7.2, 2.6, "#081746") + R(-0.6, hy - 1.4, 1.2, 1.2, "#fbaa08") + (back ? "" : R(-0.5, hy + 0.4, 5.4, 1, "#081746"));
    else if (hat === "beanie") g += R(-3.7, hy - 2.2, 7.4, 3, "#ff6b6b") + R(-3.7, hy + 0.3, 7.4, 1, "#c92a2a") + R(-0.8, hy - 3.4, 1.6, 1.4, "#f7f7f7");
    else if (hat === "party") g += `<path fill="#b48cff" d="M-2.6 ${hy}L0 ${hy - 5}L2.6 ${hy}Z"/>` + R(-1, hy - 2, 0.8, 0.8, "#fbaa08") + R(0.5, hy - 1, 0.8, 0.8, "#51cf66") + R(-0.6, hy - 5.8, 1.2, 1.2, "#fbaa08");
    else if (hat === "crown") g += `<path fill="#fbaa08" d="M-3 ${hy + 0.5}V${hy - 2.5}L-1.5 ${hy - 1}L0 ${hy - 3.2}L1.5 ${hy - 1}L3 ${hy - 2.5}V${hy + 0.5}Z"/>` + R(-0.5, hy - 0.8, 1, 1, "#ff6b6b");
    else if (hat === "wizard") g += `<path fill="#2a2350" d="M-3.2 ${hy + 0.2}L0.4 ${hy - 7.4}Q2.6 ${hy - 9} 4.2 ${hy - 7.6}Q2.4 ${hy - 7.6} 2 ${hy - 6}L3.2 ${hy + 0.2}Z"/>` + R(-5, hy - 0.2, 10, 1, "#2a2350") + R(-3.1, hy - 1.3, 6.2, 0.9, "#d4a640") + R(-0.8, hy - 4, 1, 1, "#ffe14d");
    else if (hat === "fedora") g += R(-4.6, hy - 0.2, 9.2, 1, "#4a3826") + R(-3, hy - 3, 6, 3, "#5c4632") + R(-3, hy - 1, 6, 0.8, "#1c1c24");
    else if (hat === "headset") g += `<path fill="none" stroke="#2a2a33" stroke-width=".9" d="M-3.6 ${hy + 3}V${hy - 0.4}Q0 ${hy - 3.6} 3.6 ${hy - 0.4}V${hy + 3}"/>` + R(-4.4, hy + 2, 1.6, 2.6, "#2a2a33") + R(2.8, hy + 2, 1.6, 2.6, "#2a2a33") + (back ? "" : `<path fill="none" stroke="#2a2a33" stroke-width=".4" d="M-3.6 ${hy + 4.4}Q-3 ${hy + 6.4} -1 ${hy + 6.2}"/>` + R(-1.4, hy + 5.8, 0.9, 0.9, "#ff6b6b"));
    return g;
  }
}
ART.person = new PersonArt();


// Brume: grey tabby, green eyes; poses walk (2 frames), sit (tail sweeping, 2 = blink), sleep; she faces right
const CAT_C = { fur: "#a3a3ad", furD: "#8a8a96", stripe: "#6e6e7a", belly: "#d4d4dc", ear: "#e8a0b0", eye: "#8bd36b", pupil: "#1c1c24", nose: "#e88a9a" };
class CatArt extends Figure {
  constructor() { super("cat", 11, 15, 22, 16); }
  shadow({ pose }) { return [pose === "sleep" ? 6 : 5.5, 0.8, 0.25]; }
  body({ pose = "sit", frame = 0 }) {
    const c = CAT_C;
    const ear = (x, y = -10.2) => `<path fill="${c.fur}" d="M${x} ${y}L${x + 0.9} ${y - 2.4}L${x + 1.9} ${y}Z"/><path fill="${c.ear}" d="M${x + 0.5} ${y - 0.2}L${x + 0.9} ${y - 1.4}L${x + 1.4} ${y - 0.2}Z"/>`;
    const whiskers = (x, y) => `<path stroke="#f2f2f6" stroke-width=".22" fill="none" d="M${x} ${y}l2 -0.5M${x} ${y + 0.5}l2.1 0.2M${x - 2.6} ${y}l-1.8 -0.5M${x - 2.6} ${y + 0.5}l-1.9 0.2"/>`;
    let g = "";
    if (pose === "walk") {
      const f = frame % 2, tail = f ? "M-4.6 -5.6C-7 -6 -7.6 -8.6 -6.6 -10.6" : "M-4.6 -5.6C-7.4 -5.4 -8.4 -7.6 -8 -9.8";
      g += `<path fill="none" stroke="${c.fur}" stroke-width="1.5" stroke-linecap="round" d="${tail}"/>`;
      // legs: diagonal pairs swap at each frame
      const legs = f ? [[-4.3, 0], [-2.6, -0.6], [1.6, -0.6], [3.2, 0]] : [[-4.3, -0.6], [-2.6, 0], [1.6, 0], [3.2, -0.6]];
      for (const [x, lift] of legs) g += `<rect x="${x}" y="${-3.2 + lift}" width="1.2" height="${3.2}" fill="${x < 0 ? c.furD : c.fur}"/><rect x="${x - 0.1}" y="${-0.7 + lift}" width="1.5" height="0.7" fill="${c.belly}"/>`;
      g += `<rect x="-5.2" y="-6.6" width="9.6" height="4" rx="1.7" fill="${c.fur}"/><rect x="-4" y="-3.4" width="7" height="0.9" rx="0.4" fill="${c.belly}"/>`;
      g += `<path fill="${c.stripe}" d="M-3.4 -6.6h0.8v1.7h-0.8zM-1.5 -6.6h0.8v1.9h-0.8zM0.4 -6.6h0.8v1.7h-0.8z"/>`;
      g += ear(3.2) + ear(5.9);
      g += `<rect x="2.8" y="-10.4" width="5.6" height="4.8" rx="1.6" fill="${c.fur}"/><rect x="3.4" y="-7.4" width="4.6" height="1.7" rx="0.8" fill="${c.belly}"/>`;
      g += `<path fill="${c.stripe}" d="M4.6 -10.4h0.6v1h-0.6zM5.8 -10.4h0.6v1.2h-0.6z"/>`;
      g += `<rect x="4" y="-8.9" width="1" height="1.2" fill="${c.eye}"/><rect x="4.4" y="-8.8" width="0.4" height="1" fill="${c.pupil}"/>`;
      g += `<rect x="6.6" y="-8.9" width="1" height="1.2" fill="${c.eye}"/><rect x="7" y="-8.8" width="0.4" height="1" fill="${c.pupil}"/>`;
      g += `<rect x="5.6" y="-7.4" width="0.8" height="0.5" fill="${c.nose}"/>` + whiskers(8.4, -7);
    } else if (pose === "sleep") {
      g += `<path fill="none" stroke="${c.fur}" stroke-width="1.5" stroke-linecap="round" d="M-5 -1.4C-4.6 0.4 2 0.6 4.4 -0.6"/>`;
      g += `<ellipse cx="-0.5" cy="-2.7" rx="5.4" ry="2.8" fill="${c.fur}"/><ellipse cx="-0.8" cy="-1.4" rx="3.6" ry="0.9" fill="${c.belly}"/>`;
      g += `<path fill="${c.stripe}" d="M-3.4 -5.3h0.8v1.6h-0.8zM-1.4 -5.5h0.8v1.8h-0.8zM0.6 -5.3h0.8v1.6h-0.8z"/>`;
      g += `<path fill="${c.fur}" d="M2.2 -4.6L2.8 -6.6L3.8 -4.8ZM4.4 -4.8L5.4 -6.6L5.8 -4.4Z"/><path fill="${c.ear}" d="M2.7 -4.9L2.9 -5.9L3.4 -4.9Z"/>`;
      g += `<rect x="1.8" y="-5" width="4.6" height="3.8" rx="1.6" fill="${c.fur}"/><rect x="2.4" y="-2.6" width="3.6" height="1.2" rx="0.6" fill="${c.belly}"/>`;
      g += `<path fill="none" stroke="${c.pupil}" stroke-width=".4" d="M2.7 -3.4h1M4.6 -3.4h1"/><rect x="3.9" y="-2.5" width="0.7" height="0.4" fill="${c.nose}"/>`;
    } else {  // sitting, facing the viewer slightly turned, tail sweeping the floor
      const wag = frame % 2 ? "M-2.6 -0.8C-5.4 -0.6 -6.8 -1.8 -6.4 -4.2" : "M-2.6 -0.8C-5.6 -1 -6.2 -2.8 -5 -4.8";
      g += `<path fill="none" stroke="${c.fur}" stroke-width="1.5" stroke-linecap="round" d="${wag}"/>`;
      g += `<rect x="-3.2" y="-7.6" width="6.4" height="7.6" rx="2.6" fill="${c.fur}"/><rect x="-1.6" y="-6.8" width="3.2" height="4.6" rx="1.4" fill="${c.belly}"/>`;
      g += `<path fill="${c.stripe}" d="M-3.2 -5.6h1v0.7h-1zM-3.2 -4h1.1v0.7h-1.1zM2.2 -5.6h1v0.7h-1zM2.1 -4h1.1v0.7h-1.1z"/>`;
      g += `<rect x="-1.5" y="-2.2" width="1.3" height="2.2" fill="${c.fur}"/><rect x="0.2" y="-2.2" width="1.3" height="2.2" fill="${c.fur}"/>`;
      g += `<rect x="-1.6" y="-0.7" width="1.5" height="0.7" fill="${c.belly}"/><rect x="0.1" y="-0.7" width="1.5" height="0.7" fill="${c.belly}"/>`;
      g += ear(-3, -11.8) + ear(1.1, -11.8);
      g += `<rect x="-3.1" y="-12.2" width="6.2" height="5" rx="1.8" fill="${c.fur}"/><rect x="-1.8" y="-9" width="3.6" height="1.6" rx="0.8" fill="${c.belly}"/>`;
      g += `<path fill="${c.stripe}" d="M-1.3 -12.2h0.6v1.1h-0.6zM0 -12.2h0.6v1.3h-0.6zM1.2 -12.2h0.6v1.1h-0.6z"/>`;
      const blink = frame === 2;  // eyes closed now and then
      g += blink ? `<path fill="none" stroke="${c.pupil}" stroke-width=".4" d="M-2.2 -10h1.2M1 -10h1.2"/>`
        : `<rect x="-2.2" y="-10.6" width="1.2" height="1.3" fill="${c.eye}"/><rect x="-1.8" y="-10.5" width="0.45" height="1.1" fill="${c.pupil}"/>`
        + `<rect x="1" y="-10.6" width="1.2" height="1.3" fill="${c.eye}"/><rect x="1.4" y="-10.5" width="0.45" height="1.1" fill="${c.pupil}"/>`;
      g += `<rect x="-0.4" y="-9.1" width="0.8" height="0.5" fill="${c.nose}"/>` + whiskers(2.6, -8.8);
    }
    return g;
  }
}
ART.cat = new CatArt();

// Biscuit, seen from the side (facing right), drawn in a 16 × 11 box whose bottom middle is his paws
class DogArt extends Figure {
  constructor() { super("dog", 8, 11, 16, 11, { pad: 1 }); }
  body(state) { return `<g transform="translate(-8 -11)">${this.side(state)}</g>`; }
  side({ frame = 0, sit = false }) {
    const fur = "#c98b4f", dark = "#8a5a2e", leg = frame ? 0.8 : 0;
    if (sit) return R(3, 4, 8, 6, fur) + R(9, 1, 5, 5, fur) + R(13, 3, 2, 1.6, dark) + R(9, 0, 2, 2.4, dark) + R(11.6, 2.4, 0.9, 0.9, "#1c1c24") + R(4, 9, 2, 2, fur) + R(9, 9, 2, 2, fur) + R(1, 4 + (frame ? 0 : 1), 2.4, 1.2, dark);
    return R(2, 4, 10, 4, fur) + R(10, 1, 5, 5, fur) + R(14, 3, 2, 1.6, dark) + R(10, 0, 2, 2.4, dark) + R(12.6, 2.4, 0.9, 0.9, "#1c1c24")
      + R(3, 8, 1.6, 3 - leg, fur) + R(9, 8, 1.6, 2.2 + leg, fur) + R(5, 8, 1.6, 2.2 + leg, dark) + R(11, 8, 1.6, 3 - leg, dark) + R(0, 3 + (frame ? 0 : 1), 2.6, 1.4, dark);
  }
}
ART.dog = new DogArt();

// the Sims crystal over a head, in the color of the mood; it turns (narrow); the active sim wears a bigger one
class PlumbobArt extends SvgArt {
  constructor() { super("plumbob", 6, 10); }
  box({ big = false }) { return big ? [0, 0, 8, 13] : [0, 0, 6, 10]; }
  body({ color, narrow = false, big = false }) {
    const w = narrow ? 2 : 5, x = 3 - w / 2;
    const g = `<path fill="${color}" d="M3 0L${x + w} 4.6L3 10L${x} 4.6Z"/><path fill="#fff" fill-opacity=".55" d="M3 0L${x + w * 0.3} 4.6L3 4.6Z"/><path fill="#000" fill-opacity=".18" d="M3 10L${x + w} 4.6L3 4.6Z"/>`;
    return big ? `<g transform="scale(1.3)">${g}</g>` : g;
  }
}
ART.plumbob = new PlumbobArt();
