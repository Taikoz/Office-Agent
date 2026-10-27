// Who walks around: the team and the chief (PersonArt), Brume the cat, Biscuit the dog, and the plumbob over a head.

import { ART, Figure, R, SvgArt, shade } from "./base.js";
import { personSvg } from "./people.js";
import { BUST_BOX, PORTRAIT_BOX } from "./pixelpeople.js";

// people (outlined, shaded, 9 hair styles, glasses, beards, outfits, hats), standing on their feet
// look: sex ("f" or a man), skin, hair, shirt, style (hair 0-8), glasses (true / "square" / "round" / "sun"), and for a custom sim (the chief, chief.js):
// outfit (tux, suit, shirt, hoodie, tshirt, polo), tie, pants, shoes, beard (stubble, short, full, mustache, goatee)
// the visible traits of a look (the cache key of its images; a look also carries other fields)
const LOOK_TRAITS = ["sex", "skin", "hair", "shirt", "style", "head", "eyes", "mouth", "glasses", "outfit", "tie", "pants", "shoes", "beard", "beardColor", "scarf", "wand", "jetpack", "parrot", "katana", "lei"];
export const lookTraits = look => Object.fromEntries(LOOK_TRAITS.map(k => [k, look[k]]));
export const lookKey = look => LOOK_TRAITS.map(k => look[k]).join("|");
// the person in 2D (portraits, the chief's editor, the faces of the HUD): the same drawing as in the office (svg/people.js),
// from the front or from behind; a portrait crops its head and shoulders (PORTRAIT_BOX)
class PersonArt extends Figure {
  constructor() { super("person", 10, 39, 20, 40, { outline: 0.22 }); }
  shadow({ seated = false }) { return seated ? null : [3.6, 0.8, 0.28]; }
  body(state) { return personSvg(state, { view: state.back ? "back" : "front" }); }
}
ART.person = new PersonArt();
// the viewBox of a face (the HUD, the needs panel): the head and the top of the shoulders; of a bust (the visio): to the chest
export { BUST_BOX, PORTRAIT_BOX };


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
