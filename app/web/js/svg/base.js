// SVG art of the office, as classes. Everything drawn in SVG derives from SvgArt: a piece knows its box and writes its
// SVG for a state ({ frame, on, playing… }); SvgArt turns it into an image once per state and scale and draws it on
// the canvas (or gives a data URL for the HTML). The pieces live in js/svg/*.js and register in ART (or SPRITES).
//
//   SvgArt            a piece in a w×h box, the team's dark outline around it, a 1-unit margin for that outline
//   ├─ StaticArt      one fixed SVG (podium, posters, incidents…)
//   ├─ Sprite         a flat pixel sprite, no outline nor margin (sprites.js); derive() gives recolored copies
//   └─ Figure         someone or something standing on a point (feet, paws): its box is around that point,
//                     a shadow under it (people, Brume, Biscuit)

import { S, ctx } from "../core/core.js";

// rect helper: R(x, y, w, h, color, extra attributes)
export const R = (x, y, w, h, c, more = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${more}/>`;
export function shade(hex, k) {
  const n = parseInt(hex.slice(1, 7), 16), f = c => Math.max(0, Math.min(255, Math.round(c * k))).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
// every listed color swapped (an object's style: { "#from": "#to" })
const recolor = (svg, map) => map ? svg.replace(/#[0-9a-f]{6}/gi, c => map[c.toLowerCase()] || c) : svg;
export const escXml = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const svgUrl = markup => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
export const outlineDefs = radius => `<defs><filter id="o" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="${radius}" result="d"/>`
  + `<feFlood flood-color="#120f1a"/><feComposite in2="d" operator="in" result="ol"/><feMerge><feMergeNode in="ol"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;

export const ART = {};  // every piece by name: ART.arcade.draw(x, y, { frame, playing })

// while the isometric view captures a piece for PixiJS (iso/pixi.js), the images become sprites instead of being drawn
export const artHook = { emit: null };

export class SvgArt {
  static images = new Map();  // `${name}|${state}@${scale}` → Image
  static last = new Map();    // `${name}|${state}` → the image of the previous scale, shown while the new one loads

  // outline: the radius of the dark contour (false: none); pad: margin around the box (room for the contour)
  constructor(name, w, h, { outline = 0.4, pad = 1 } = {}) {
    Object.assign(this, { name, w, h, outline, pad });
  }
  /* ---------- to override ---------- */
  body(_state) { return ""; }               // the SVG drawn in the box, outlined
  under(_state) { return ""; }              // drawn below, without outline (a shadow)
  box(_state) { return [0, 0, this.w, this.h]; }  // x, y, w, h in scene units, relative to the point given to draw()
  stateKey(state) { return JSON.stringify(state); }
  /* ---------- SVG ---------- */
  // the whole <svg>; scale: pixels per unit (null: no pixel size, for the HTML)
  markup(state = {}, scale = S) {
    const [bx, by, w, h] = this.box(state), p = this.pad, W2 = w + 2 * p, H2 = h + 2 * p;
    const size = scale ? ` width="${Math.round(W2 * scale)}" height="${Math.round(H2 * scale)}"` : "";
    const body = recolor(this.body(state), state.map), filter = this.outline ? ' filter="url(#o)"' : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bx - p} ${by - p} ${W2} ${H2}"${size} shape-rendering="crispEdges">`
      + `${this.outline ? outlineDefs(this.outline) : ""}${this.under(state)}<g${filter}>${body}</g></svg>`;
  }
  url(state = {}) { return svgUrl(this.markup(state, null)); }
  /* ---------- canvas ---------- */
  image(state = {}) {
    const id = `${this.name}|${this.stateKey(state)}`, key = `${id}@${S}`, imgs = SvgArt.images;
    let img = imgs.get(key);
    if (!img) {
      if (imgs.size > 1500) { let k = 0; for (const old of imgs.keys()) { imgs.delete(old); if (++k >= 300) break; } }  // the oldest go (a clock's seconds), not the whole cache
      img = new Image(); img.src = svgUrl(this.markup(state)); imgs.set(key, img);
    }
    if (img.complete && img.naturalWidth) { SvgArt.last.set(id, img); return img; }
    return SvgArt.last.get(id) || null;
  }
  // draws the piece at x, y (its box is placed relative to that point); flip: mirrored left-right around the box center.
  // false while the image is not ready yet
  draw(x, y, state = {}, { flip = false } = {}) {
    const img = this.image(state);
    if (!img) return false;
    const [bx, by, w, h] = this.box(state), p = this.pad, dw = Math.round((w + 2 * p) * S), dh = Math.round((h + 2 * p) * S), dy = Math.round((y + by - p) * S);
    if (artHook.emit) { artHook.emit(img, Math.round((x + bx - p) * S), dy, dw, dh, flip); return true; }  // a sprite of the isometric view (iso/pixi.js)
    if (flip) {
      ctx.save(); ctx.translate(Math.round((x + bx + w / 2) * S), 0); ctx.scale(-1, 1);
      ctx.drawImage(img, Math.round((-w / 2 - p) * S), dy, dw, dh); ctx.restore();
    } else ctx.drawImage(img, Math.round((x + bx - p) * S), dy, dw, dh);
    return true;
  }
  // forget the images (an SVG that depends on something outside its state changed: the office logo)
  reset() { for (const map of [SvgArt.images, SvgArt.last]) for (const k of [...map.keys()]) if (k.startsWith(`${this.name}|`)) map.delete(k); }
}

export class StaticArt extends SvgArt {
  constructor(name, w, h, svg, opts) { super(name, w, h, opts); this.svg = svg; }
  body() { return typeof this.svg === "function" ? this.svg() : this.svg; }
  stateKey(state) { return state.map ? JSON.stringify(state.map) : ""; }
}

// a flat pixel sprite drawn at its top-left corner; derived copies (wood tone, screen color…) are cached by suffix
export class Sprite extends StaticArt {
  constructor(name, w, h, svg) { super(name, w, h, svg, { outline: false, pad: 0 }); this.copies = new Map(); }
  derive(suffix, transform) {
    if (!this.copies.has(suffix)) this.copies.set(suffix, new Sprite(`${this.name}~${suffix}`, this.w, this.h, transform(this.body())));
    return this.copies.get(suffix);
  }
  recolor(map) { return map ? this.derive(Object.values(map).join(""), svg => recolor(svg, map)) : this; }
}

// standing on a point: box = [-ox, -oy, w, h] around the feet; shadow(state) under it
export class Figure extends SvgArt {
  constructor(name, ox, oy, w, h, opts = {}) { super(name, w, h, { pad: 0, ...opts }); Object.assign(this, { ox, oy }); }
  box() { return [-this.ox, -this.oy, this.w, this.h]; }
  shadow(_state) { return null; }  // [rx, ry, opacity]
  under(state) { const s = this.shadow(state); return s ? `<ellipse cx="0" cy="0" rx="${s[0]}" ry="${s[1]}" fill="#000" fill-opacity="${s[2]}"/>` : ""; }
}
