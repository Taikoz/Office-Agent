// The objects of the buy mode (build.js). Each kind is an Item: its card in the shop (category, name, price, room,
// size, styles), its art (js/svg/), what the art shows now (on, open, hot…), what is drawn behind or over it, and what
// a click offers in the pie menu. The kinds register themselves in CATALOG (js/items/*.js), in the order of the shop.
// A placed object is a plain record { uid, type, style, room, x, y, on… } saved with the build (build.js).

import { hub } from "../hub.js";
import { ctx } from "../core/core.js";

export const CATALOG = [];
export class Item {
  // type, cat, name, price, room ("office", "lounge" or "any"), w, h, desc, art (ART.x), styles [{ id, name, sw, map? }];
  // flags: slot (a dev's desk spot), unique, wall (hung on the wall), rug (on the floor, under everything)
  constructor(def) { Object.assign(this, def); CATALOG.push(this); }
  state(_it, _t) { return !!_it.on; }       // what the art shows: on / open / hot
  thumbState() { return false; }            // the state shown on the shop's card
  artState(_style) { return {}; }           // more state for the art, from the style (curtains…)
  behind(_it, _t) {}                        // drawn before the object
  over(_it, _t) {}                          // drawn after it
  pie(_it) { return []; }                   // its actions in the pie menu: [id, icon, label, lock?]
  act(_it, _id) { return false; }           // runs one of them; true when handled
  center(_it) { return ""; }                // more lines in the middle of the pie menu
  artFor(style, on) { return { on, map: style.map || null, ...this.artState(style) }; }
  draw(it, t, alpha = 1) {
    if (alpha < 1) ctx.globalAlpha = alpha;
    this.behind(it, t);
    this.art.draw(it.x, it.y, this.artFor(hub.styleOf(it), this.state(it, t)));
    ctx.globalAlpha = 1;
    if (alpha >= 1) this.over(it, t);
  }
}
