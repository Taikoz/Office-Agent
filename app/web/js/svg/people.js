// The team and the chief: the pixel-art sprite pack (svg/pixelpeople.js, app/sprites/). The vector people that
// were drawn here are gone (git history: 0.29.0); this module keeps their entry points.
//
// personSvg(state, { view: "front" | "back", mirror }) → SVG markup, the feet at (0, 0), ~28 units tall standing.
// From the front the person faces left, from behind up-left; mirror turns it the other way. Empty while the atlas
// loads (a fraction of a second at start: the cached images are made again once it is there).
// state: look (sex, skin, hair, style 0-8, shirt, outfit, pants, shoes, beard, glasses…), seated, walk (0-7), breath,
// blink, hat, hold (cup, sip…), tux.

import { pixelSvg } from "./pixelpeople.js";

export function personSvg(s, { view = "front", mirror = false } = {}) {
  return pixelSvg(s, { view, mirror }) || "";
}

// where a hand is, from the feet (scene.js: the steam over a cup, the baton): the view, mirrored or not; which:
// "near" (the hand, or the cup it holds) or "mouth". Measured on the sprites (40×56, 1.6 px per unit, soles at y 51).
export function handPoint(state, back, mirror, which = "near") {
  let p;
  if (back) p = [-5.6, -9.4];                                  // the hand on our side, arm down
  else if (which === "mouth" || state.hold === "sip") p = [-1.9, -19.4];
  else if (state.hold === "cup") p = [-1.9, -14.4];
  else if (state.arms === "baton") p = [-5, -22];
  else p = [-5, -9.4];
  if (state.seated) p = [p[0], p[1] + 4.4];
  return [mirror ? -p[0] : p[0], p[1]];
}
