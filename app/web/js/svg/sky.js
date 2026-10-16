// Windows and the sky behind them: curtains (velours, lin, store, aucun), glass glints, the sky gradient by the hour,
// moon, sun, clouds, lightning, the terrace sky; drawSky() puts them together with the weather.

import { hub } from "../hub.js";
import { S, W, ctx, px } from "../core/core.js";
import { ART, R, StaticArt, SvgArt, shade } from "./base.js";

// style: velours (default), lin (straight linen panels), store (roller blind), aucun (bare window); color: the fabric (decor.js)
class WindowArt extends SvgArt {
  constructor() { super("window", 58, 41); }
  body({ style = "velours", color = "#8f2b46" }) {
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
}
ART.window = new WindowArt();

// glints on the glass, drawn without the outline (an outline would turn them grey)
ART.glints = new StaticArt("glints", 58, 41, `<path fill="#ffffff" fill-opacity=".4" d="M10 9h3l-5 6v-3zM33 9h2l-4 5v-2.4zM40 24h4l-7 8.4v-4z"/>`, { outline: false });

export const SKY = {
  night: ["#0b1033", "#1a2558", "#2a3a78"], dawn: ["#41609f", "#e9a07e", "#ffd59a"],
  day: ["#3f95e0", "#79bdf2", "#c4e6ff"], dusk: ["#2b2d6e", "#b9567a", "#f6a35c"],
};

const SKY_GREY = { snow: ["#9aa8bd", "#c3cdda", "#e6ebf2"], cloud: ["#7f98b8", "#a9bbd0", "#d3dde8"], rain: ["#4f5f7c", "#6f7e98", "#93a1b6"], storm: ["#262c45", "#3a425f", "#535c78"] };

export function skyPhase() {
  const d = typeof hub.clockNow === "function" ? hub.clockNow() : new Date(), h = d.getHours() + d.getMinutes() / 60;
  return { h, phase: h < 5.5 || h >= 21.5 ? "night" : h < 8 ? "dawn" : h < 18 ? "day" : "dusk" };
}

class SkyArt extends SvgArt {
  constructor() { super("sky", 46, 28, { outline: false }); }
  body({ stops }) {
    return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".55" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs>`
      + `<rect x="0" y="0" width="46" height="28" fill="url(#sky)"/>`;
  }
}
ART.sky = new SkyArt();

export const CLOUD_TONES = {
  day: ["#ffffff", "#eef4fb", "#c9d8ea"], dawn: ["#fff1e6", "#f6c7b8", "#d99a9a"], dusk: ["#f9c9b8", "#d98fa0", "#8f5a86"],
  night: ["#5d6a9a", "#46527f", "#323c63"], snow: ["#f4f6fb", "#dfe5ee", "#c3cdda"], cloud: ["#eef1f5", "#cfd6df", "#a8b3c1"], rain: ["#9aa5b5", "#7e8a9c", "#626d80"], storm: ["#6a7288", "#4f566b", "#3a4054"],
};

// moon and sun behind the window glass
class MoonArt extends SvgArt {
  constructor() { super("moon", 7, 7, { outline: false }); }
  body({ bg }) { return `<circle cx="3.5" cy="3.5" r="3.2" fill="#f4efc9"/><circle cx="5" cy="2.6" r="2.8" fill="${bg}"/><circle cx="2" cy="4.4" r=".5" fill="#d9d3a8"/>`; }
}
ART.moon = new MoonArt();
class SunArt extends SvgArt {
  constructor() { super("sun", 10, 10, { outline: false }); }
  body({ color }) {
    return `<circle cx="5" cy="5" r="5" fill="${color}" fill-opacity=".25"/><circle cx="5" cy="5" r="3.6" fill="${color}" fill-opacity=".35"/><circle cx="5" cy="5" r="2.4" fill="${color}"/><circle cx="4.3" cy="4.3" r=".9" fill="#fff8d0"/>`;
  }
}
ART.sun = new SunArt();
ART.bolt = new StaticArt("bolt", 8, 16, `<path fill="#fff7b0" d="M5 0L1 8h3l-2 8 6-10H5l2-6z"/>`, { outline: false });
// puffy clouds: three shapes (a, b, c), shaded with a tone [top, middle, low]
class CloudArt extends SvgArt {
  static SHAPES = {  // [cx, cy, r] puffs over a flat base
    a: [[4, 5, 3], [8, 3.4, 3.6], [12.4, 4.6, 3], [15.4, 5.6, 2.2]],
    b: [[3.4, 4.4, 2.4], [7, 3, 3], [10.4, 4.2, 2.4]],
    c: [[4, 5, 2.6], [8.4, 3.2, 3.4], [13, 3.8, 3.2], [17.4, 5.2, 2.4], [20.4, 6, 1.6]],
  };
  constructor() { super("cloud", 0, 9.2, { outline: false }); }
  width(kind) { return Math.max(...CloudArt.SHAPES[kind].map(([x, , r]) => x + r)) + 0.4; }
  box({ kind }) { return [0, 0, this.width(kind), this.h]; }
  body({ kind, tone }) {
    const [top, mid, low] = tone, shapes = CloudArt.SHAPES[kind], w = this.width(kind);
    let g = R(1.4, 5.4, w - 2.4, 3.2, mid);
    for (const [x, y, r] of shapes) g += `<circle cx="${x}" cy="${y + 1.2}" r="${r}" fill="${low}"/>`;
    for (const [x, y, r] of shapes) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${mid}"/>`;
    for (const [x, y, r] of shapes) g += `<circle cx="${x - r * 0.25}" cy="${y - r * 0.3}" r="${r * 0.55}" fill="${top}"/>`;
    return g;
  }
}
ART.cloud = new CloudArt();
// the terrace (construct.js): a sky as wide as the scene, and its moon
class TerraceSkyArt extends SvgArt {
  constructor() { super("terracesky", 0, 72, { outline: false }); }
  box() { return [0, 0, W, this.h]; }
  body({ stops: st }) {
    return `<defs><linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${st[0]}"/><stop offset=".6" stop-color="${st[1]}"/><stop offset="1" stop-color="${st[2]}"/></linearGradient></defs><rect width="${W}" height="72" fill="url(#tsky)"/>`;
  }
}
ART.terracesky = new TerraceSkyArt();
class TerraceMoonArt extends SvgArt {
  constructor() { super("terracemoon", 12, 12, { outline: false }); }
  body({ bg }) { return `<circle cx="6" cy="6" r="5.4" fill="#f4efc9"/><circle cx="8.4" cy="4.6" r="4.6" fill="${bg}"/>`; }
}
ART.terracemoon = new TerraceMoonArt();

/* the sky behind a window: gradient by the real hour (night, dawn, day, dusk), the sun on its course, moon and
   twinkling stars at night, clouds drifting with parallax; the weather of today's tests (weather()) greys the sky,
   adds clouds, rain and lightning. Drawn clipped to the glass (46 × 28 at x0, y0). */
export function drawSky(x0, y0, t) {
  const W0 = 46, H0 = 28, { h, phase } = skyPhase(), w = typeof hub.weather === "function" ? hub.weather() : "clear";
  const grey = SKY_GREY[w], still = hub.focusMode, tt = still ? 0 : t;
  ctx.save(); ctx.beginPath(); ctx.rect(Math.round(x0 * S), Math.round(y0 * S), Math.round(W0 * S), Math.round(H0 * S)); ctx.clip();
  const stops = grey ? (phase === "night" ? ["#141a33", "#1d2545", "#2a3354"] : grey) : SKY[phase];
  ART.sky.draw(x0, y0, { stops });
  // stars and moon at night, the sun by day
  if (phase === "night") {
    if (!grey) for (let i = 0; i < 14; i++) { const sx = x0 + (i * 17.3) % W0, sy = y0 + (i * 7.9) % 18; if ((Math.floor(tt / 500) + i) % 5) px(sx, sy, i % 4 ? 0.5 : 0.8, i % 4 ? 0.5 : 0.8, "#f4f2ff"); }
    ART.moon.draw(x0 + 33, y0 + 3, { bg: stops[0] });
  } else if (!grey || w === "cloud") {
    const k = phase === "day" ? (h - 8) / 10 : phase === "dawn" ? 0.05 : 0.95, sx = x0 + 4 + k * (W0 - 8), sy = y0 + (phase === "day" ? 16 - Math.sin(k * Math.PI) * 12 : 21);
    ART.sun.draw(sx - 5, sy - 5, { color: phase === "day" ? "#ffe066" : "#ff9f43" });
  }
  // clouds: far ones slow and small, near ones faster; more and greyer when tests go badly
  const tone = CLOUD_TONES[grey ? w : phase], n = { clear: 2, sun: 2, cloud: 4, rain: 5, storm: 6, snow: 4 }[w] || 2;
  for (let i = 0; i < n; i++) {
    const kind = "abc"[i % 3], cw = ART.cloud.width(kind), speed = 900 - i * 120, span = W0 + cw + 6;
    const cx = x0 - cw - 3 + ((tt / speed + i * 23) % span), cy = y0 + 1 + (i * 5.3) % 13;
    ART.cloud.draw(cx, cy, { kind, tone });
  }
  if (w === "snow") for (let i = 0; i < 18; i++) px(x0 + ((i * 7.3 + tt / 90) % W0), y0 + ((i * 11.7 + tt / 45) % H0), 0.9, 0.9, "#ffffff");  // real weather (seasons.js)
  if (w === "rain" || w === "storm") for (let i = 0; i < 16; i++) {
    const rx = x0 + ((i * 7.3 + tt / 25) % W0), ry = y0 + 6 + ((i * 11.7 + tt / 9) % (H0 - 6));
    px(rx, ry, 0.5, 2.2, "#b8d4ff");
  }
  if (w === "storm" && !still && Math.floor(t / 130) % 37 === 0) {
    px(x0, y0, W0, H0, "rgba(255,255,255,.55)");
    ART.bolt.draw(x0 + 18, y0 + 4);
  }
  ctx.restore();
}
