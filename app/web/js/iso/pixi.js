// The isometric view in three layers, stacked over each other at the size of the scene:
//  - the back layer (a 2D canvas): the floor, the walls and what hangs on them, the sky of the terrace;
//  - the world (PixiJS, WebGL): the furniture, the objects, the team, the chief, the pets, sorted by depth;
//  - the scene's canvas on top: bubbles, names, moods, effects, and the pointer (it takes the clicks).
// A piece of the world is captured while its usual drawing code runs: every SVG image it draws (svg/base.js artHook)
// becomes a sprite with the canvas transform of that moment; what it paints by hand (px, text: a screen, a cup) lands
// on a small canvas of its own, a sprite over it. Without WebGL, the pieces are drawn on the scene's canvas as before.

import * as PIXI from "../vendor/pixi.min.js";
import { S, ctx, cv, raw, withCtx } from "../core/core.js";
import { artHook } from "../svg/base.js";

PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
const back = document.createElement("canvas"), world = document.createElement("canvas");
back.id = "c-back"; world.id = "c-world";
for (const c of [back, world]) { c.className = "isolayer"; c.style.display = "none"; c.setAttribute("aria-hidden", "true"); }
cv.before(back, world);
const backCtx = back.getContext("2d");
let app = null, failed = false;
function pixi() {
  if (app || failed) return app;
  try { app = new PIXI.Application({ view: world, width: cv.width, height: cv.height, backgroundAlpha: 0, antialias: false, resolution: 1, autoStart: false, sharedTicker: false }); }
  catch (e) { failed = true; console.warn("Agent Office: no WebGL, the isometric view is drawn on the canvas", e); }
  return app;
}

// textures of the SVG images and of the pieces' own canvases
const textures = new WeakMap();
function texFor(src) {
  let t = textures.get(src);
  if (!t) { t = new PIXI.Texture(new PIXI.BaseTexture(src)); textures.set(src, t); }
  return t;
}
// sprites and small canvases, reused frame after frame
const sprites = [], scratch = [];
let nSprite = 0, nScratch = 0;
function sprite() {
  let s = sprites[nSprite++];
  if (!s) { s = new PIXI.Sprite(); sprites.push(s); }
  s.alpha = 1; return s;
}
function scratchCanvas(w, h) {
  let k = scratch[nScratch++];
  if (!k) { const c = document.createElement("canvas"); k = { c, g: c.getContext("2d") }; scratch.push(k); }
  if (k.c.width < w || k.c.height < h) {  // grows only: its texture is rebuilt then
    k.c.width = Math.max(k.c.width, w); k.c.height = Math.max(k.c.height, h); k.g.imageSmoothingEnabled = false;
    if (k.tex) k.tex.destroy(true);
    k.tex = new PIXI.Texture(new PIXI.BaseTexture(k.c));
  }
  if (!k.tex) k.tex = new PIXI.Texture(new PIXI.BaseTexture(k.c));
  return k;
}

export const PX = {
  get on() { return !!app && !failed; },
  // a frame starts: the layers at the scene's size and place, the back layer cleared, the world emptied, the
  // scene's canvas cleared (it only carries what floats over the world now)
  begin(cam = { x: 0, y: 0 }, z = 1) {
    if (!pixi()) return false;
    for (const c of [back, world]) {
      c.style.display = "";
      if (c.style.width !== cv.style.width || c.style.height !== cv.style.height) { c.style.width = cv.style.width; c.style.height = cv.style.height; }
      c.style.left = `${cv.offsetLeft}px`; c.style.top = `${cv.offsetTop}px`;
    }
    if (back.width !== cv.width || back.height !== cv.height) { back.width = cv.width; back.height = cv.height; backCtx.imageSmoothingEnabled = false; }
    if (app.renderer.width !== cv.width || app.renderer.height !== cv.height) app.renderer.resize(cv.width, cv.height);
    backCtx.setTransform(1, 0, 0, 1, 0, 0); backCtx.clearRect(0, 0, back.width, back.height);
    backCtx.setTransform(z, 0, 0, z, -cam.x * z * S, -cam.y * z * S);  // the camera
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    document.body.classList.add("iso-layers");
    app.stage.removeChildren(); nSprite = 0; nScratch = 0;
    app.stage.scale.set(z); app.stage.position.set(-cam.x * z * S, -cam.y * z * S);
    return true;
  },
  // what is painted behind the world
  back(fn) { return this.on ? withCtx(backCtx, fn) : fn(); },
  // one piece of the world; box: where it can draw on the screen (scene units), for its own canvas
  piece(box, draw) {
    if (!this.on) return draw();
    const bx = Math.floor(box.x * S), by = Math.floor(box.y * S), bw = Math.ceil(box.w * S) + 2, bh = Math.ceil(box.h * S) + 2;
    const k = scratchCanvas(bw, bh), g = k.g, first = app.stage.children.length;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh); g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, -bx, -by);
    artHook.emit = (img, x0, y0, dw, dh, flip) => {
      const m = g.getTransform(), sx = (flip ? -dw : dw) / (img.naturalWidth || img.width), sy = dh / (img.naturalHeight || img.height), ox = flip ? x0 + dw : x0;
      const s = sprite(); s.texture = texFor(img); s.alpha = g.globalAlpha;
      s.transform.setFromMatrix(new PIXI.Matrix(m.a * sx, m.b * sx, m.c * sy, m.d * sy, m.a * ox + m.c * y0 + m.e + bx, m.b * ox + m.d * y0 + m.f + by));
      app.stage.addChild(s);
    };
    raw.drawn = false;
    try { withCtx(g, draw); } finally { artHook.emit = null; }
    if (raw.drawn) {  // painted by hand: over the images of the piece
      k.tex.frame = new PIXI.Rectangle(0, 0, bw, bh); k.tex.updateUvs(); k.tex.baseTexture.update();
      const s = sprite(); s.texture = k.tex; s.transform.setFromMatrix(new PIXI.Matrix(1, 0, 0, 1, bx, by));
      app.stage.addChild(s);
    } else nScratch--;  // nothing painted: its canvas serves the next piece
    return first;
  },
  end() { if (this.on) app.renderer.render(app.stage); },
  // back to the 2D view: the layers hidden
  off() { if (back.style.display === "none") return; back.style.display = world.style.display = "none"; document.body.classList.remove("iso-layers"); },
};
