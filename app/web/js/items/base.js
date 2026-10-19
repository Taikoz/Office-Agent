// The objects of the buy mode (build.js), Sims style. Each kind is an Item: its card in the shop (category, name,
// price, rooms, styles), where it goes and its size (world/place.js), its art, what the art shows now (on, open, hot…),
// what using it does (its spots, its role) and what a click offers in the pie menu. The kinds register themselves in
// CATALOG (js/items/*.js), in the order of the shop.
// A placed object is a plain record { uid, type, style, room, x, y, rot, on_?, side?, slot?, on… } saved with the build:
//  - kind "floor": (x, y) the corner of its footprint on the floor (w × d modeled facing +y, turned by rot);
//  - kind "top": the same on the top of another object (on_: that object's uid; a computer on a desk);
//  - kind "rug": a footprint on the floor, under everything;
//  - kind "wall": on a wall (side "back" along x, "left" along y), x along it, y the top of its art in the 2D wall
//    strip (0..70), w × h its art's size.

import { hub } from "../hub.js";
import { S, ctx } from "../core/core.js";
import { ART } from "../svg/base.js";
import { P } from "../iso/engine.js";
import { PX } from "../iso/pixi.js";
import { footOf, partsOf, surfaceOf } from "../world/place.js";

export const CATALOG = [];
const mulTint = (a, b) => [16, 8, 0].reduce((v, s) => v | (Math.round(((a >> s) & 255) * ((b >> s) & 255) / 255) << s), 0);
export class Item {
  // type, cat, name, price, room ("any" or a list), desc, styles [{ id, name, sw, map? }], kind, w, d (h for a wall
  // object), art (an iso art's name), art2d (a wall object's 2D art), parts [{ art, rect: [x, y, w, d], state? }],
  // spots [{ x, y, face, lift?, pose? }], surface { z, rect? }, rots (4, or 2: no back), role ("coffee", "podium"…),
  // act (an activity of the break room), workstation, seat (the dev's seat at a work station), chair, walkable, unique
  constructor(def) { Object.assign(this, { kind: "floor", room: "any", rots: 4 }, def); CATALOG.push(this); }
  state(_it, _t) { return !!_it.on; }       // what the art shows: on / open / hot
  thumbState() { return false; }            // the state shown on the shop's card
  artState(_style) { return {}; }           // more state for the art, from the style (curtains…)
  isoState(_it, _t) { return {}; }          // more state in the room (frames of an animation…)
  over(_it, _t, _G) {}                      // drawn over it in the room (live screens, notes…)
  pie(_it) { return []; }                   // its actions in the pie menu: [id, icon, label, lock?]
  perform(_it, _id) { return false; }           // runs one of them; true when handled
  center(_it) { return ""; }                // more lines in the middle of the pie menu
  artFor(style, on) { return { on, map: style.map || null, ...this.artState(style) }; }
  okIn(room) { return this.room === "any" || [].concat(this.room).includes(room); }
  // its height above the floor (the top of what stands on a surface)
  baseZ(it) { if (!it.on_) return 0; const p = hub.itemByUid(it.on_); return p ? surfaceOf(p)?.z || 0 : 0; }
  /* ---------- in the room (iso/engine.js) ---------- */
  // its parts, each a piece of the world sorted by depth: [{ fp, draw }]; alpha < 1: a ghost (the buy mode)
  pieces(it, t, G, alpha = 1) {
    const st = { ...this.artFor(hub.styleOf(it), this.state(it, t)), ...this.isoState(it, t) }, z = this.baseZ(it), back = it.rot >= 2, flip = it.rot % 2 === 1;
    const mo = alpha >= 1 ? hub.pieceMotion?.(it, this, t) : null;  // a chair pushed back, a plant in the draught (world/physics.js)
    const out = partsOf(it, this).map((p0, k) => {
      const p = mo ? { ...p0, x: p0.x + mo.dx, y: p0.y + mo.dy } : p0;
      const art = ART[p.art], ps = p.state ? { ...st, ...p.state(it, t) } : st;
      return { fp: [p0.x, p0.y, p0.x + p0.w, p0.y + p0.d], h: (art?.H || 30) + z, z, draw: () => {
        if (!art) return;
        const q = P(p.x, p.y, z + (mo?.lift || 0)), [aw, ad] = flip ? [p.d, p.w] : [p.w, p.d];  // a mirrored art: its back corner moves by (w - d) of the model
        if (alpha < 1) ctx.globalAlpha = alpha;
        const lit = PX.pieceTint; if (mo?.tint) PX.pieceTint = mulTint(lit, mo.tint);  // a thirsty plant yellows (world/upkeep.js)
        if (mo?.sway) {  // leaning from its foot: its top moves, its base stays
          const b = P(p.x + p.w / 2, p.y + p.d / 2, z);
          ctx.save(); ctx.translate(b.x * S, b.y * S); ctx.transform(1, 0, mo.sway, 1, 0, 0); ctx.translate(-b.x * S, -b.y * S);
          art.draw(flip ? q.x - (aw - ad) * 0.6 : q.x, q.y, back ? { ...ps, back: true } : ps, { flip });
          ctx.restore();
        } else art.draw(flip ? q.x - (aw - ad) * 0.6 : q.x, q.y, back ? { ...ps, back: true } : ps, { flip });
        PX.pieceTint = lit; ctx.globalAlpha = 1;
        if (k === 0 && alpha >= 1) hub.itemOverlay?.(it, t);  // its state: cups left on it, scale, thirst (world/upkeep.js)
        if (alpha >= 1) G.boxRegion(p.x, p.y, p.x + p.w, p.y + p.d, Math.max(4, (art.H || 20) * 0.85), { x: (p.x + p.w / 2), y: (p.y + p.d / 2), uid: it.uid });
        if (k === 0 && alpha >= 1) this.over(it, t, G);
      } };
    });
    return out;
  }
  footprint(it) { return footOf(it, this); }
  // a wall object or a rug: its 2D art at its place (drawn on the wall, on the floor plane)
  behind(_it, _t) {}
  draw2d(it, t, alpha = 1) {
    if (alpha < 1) ctx.globalAlpha = alpha;
    this.behind(it, t);
    this.art2d?.draw(it.x, it.y, this.artFor(hub.styleOf(it), this.state(it, t)));
    ctx.globalAlpha = 1;
  }
}
