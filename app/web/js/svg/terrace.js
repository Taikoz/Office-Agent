// The roof terrace (rooms/built.js): the city behind a glass railing, the stair kiosk with its glass door, a deck of
// wooden boards, a pergola over the banquet table, the bar and its neon sign, the grill, the fire pit, an outdoor
// lounge under a parasol, striped deckchairs, planters, string lights. Lit pieces take the hour (day, dusk, night).

import { ART, R, SvgArt, shade } from "./base.js";

const TERRACE_TONES = {  // the city by the hour: far buildings, near buildings, their shade, lit windows
  day: { far: "#9fb4cf", near: "#5d6f8c", side: "#4a5a75", win: "#a9cdf0", lit: "#fff3c4" },
  dawn: { far: "#b39ab3", near: "#6c5d7f", side: "#55496a", win: "#e7b9a3", lit: "#ffe0a6" },
  dusk: { far: "#7d5f8a", near: "#3e3558", side: "#2f2845", win: "#6a5a85", lit: "#ffcf6e" },
  night: { far: "#2a2f55", near: "#1a1d38", side: "#13152b", win: "#232846", lit: "#ffd77a" },
};
const shadeOf = (h, k) => shade(h, k);

// the skyline, two layers: far towers in the haze, near blocks with windows, a water tower, an antenna (blinking red at night)
class CityArt extends SvgArt {
  constructor() { super("city", 400, 50, { outline: false, pad: 0 }); }
  body({ phase = "day", blink = 0 }) {
    const c = TERRACE_TONES[phase] || TERRACE_TONES.day, rnd = n => { const v = Math.sin(n * 91.7) * 4375.85; return v - Math.floor(v); };
    let g = "";
    // far layer: tall slim towers
    for (let i = 0, x = -6; x < 400; i++) {
      const w = 14 + Math.floor(rnd(i) * 16), h = 26 + Math.floor(rnd(i + 40) * 22);
      g += R(x, 50 - h, w, h, c.far);
      if (i % 3 === 1) g += `<path fill="${c.far}" d="M${x + w / 2 - 1} ${50 - h}l1 -6l1 6z"/>`;  // spire
      x += w + 2 + Math.floor(rnd(i + 80) * 8);
    }
    // near layer: blocks with window grids, rooftop details
    for (let i = 0, x = -4; x < 400; i++) {
      const w = 24 + Math.floor(rnd(i + 7) * 22), h = 14 + Math.floor(rnd(i + 13) * 20), top = 50 - h;
      g += R(x, top, w, h, c.near) + R(x + w - 3, top, 3, h, c.side) + R(x, top, w, 0.8, shadeOf(c.near, 1.2));
      for (let wy = top + 3; wy < 48; wy += 4) for (let wx = x + 2; wx < x + w - 5; wx += 4) {
        const on = phase === "night" || phase === "dusk" ? rnd(wx * 3 + wy) < (phase === "night" ? 0.45 : 0.25) : false;
        g += R(wx, wy, 2, 2.2, on ? c.lit : c.win, on ? "" : ' fill-opacity=".55"');
      }
      if (i % 4 === 2) g += R(x + 5, top - 7, 7, 5, shadeOf(c.side, 1.1)) + R(x + 6, top - 2, 1, 2, c.side) + R(x + 10, top - 2, 1, 2, c.side)
        + `<path fill="${shadeOf(c.side, 1.1)}" d="M${x + 4.6} ${top - 7}h7.8l-3.9 -2.4z"/>`;  // water tower
      if (i % 5 === 0) {
        g += R(x + w / 2, top - 10, 0.6, 10, c.side);  // antenna
        if (phase === "night" || phase === "dusk") g += `<circle cx="${x + w / 2 + 0.3}" cy="${top - 10}" r=".9" fill="${blink ? "#ff4d4d" : "#7a1f1f"}"/>`;
      }
      x += w + 1 + Math.floor(rnd(i + 99) * 5);
    }
    return g;
  }
}
ART.city = new CityArt();

// the glass railing: steel posts, glass panels with glints, a wooden handrail
class RailingArt extends SvgArt {
  constructor() { super("railing", 400, 18, { outline: false, pad: 0 }); }
  body({ night = false }) {
    let g = R(0, 15, 400, 3, "#3d3a45") + R(0, 15, 400, 0.6, "#5a5664");
    for (let x = 0; x < 400; x += 40) {
      g += R(x + 1, 3, 38, 12, night ? "#3b4f72" : "#bfe3f5", ' fill-opacity=".35"') + R(x + 1, 3, 38, 0.6, "#ffffff", ' fill-opacity=".35"')
        + `<path fill="#ffffff" fill-opacity=".22" d="M${x + 8} 3h4l-6 12h-4zM${x + 15} 3h1.6l-6 12h-1.6z"/>`;
      g += R(x, 2, 1.6, 13, "#8d929c") + R(x, 2, 0.5, 13, "#c4c9d6");
    }
    g += R(0, 0, 400, 2.6, "#8a5d3a") + R(0, 0, 400, 0.8, "#b07a4a") + R(0, 2.2, 400, 0.4, "#5c3d27");
    return g;
  }
}
ART.railing = new RailingArt();

// the deck: wooden boards in staggered lengths, gaps, grain, screws, the railing's shadow
class DeckArt extends SvgArt {
  constructor() { super("deck", 400, 160, { outline: false, pad: 0 }); }
  body() {
    const tones = ["#b07a4a", "#a8724a", "#b98455", "#a46d42"], rnd = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
    let g = R(0, 0, 400, 160, "#5c3d27");
    for (let row = 0, y = 0; y < 160; row++, y += 7) {
      for (let x = -(row % 3) * 23, k = 0; x < 400; k++) {
        const w = 46 + Math.floor(rnd(row * 31 + k) * 40), col = tones[Math.floor(rnd(row * 7 + k * 3) * tones.length)];
        g += R(x + 0.4, y + 0.4, w - 0.8, 6.2, col) + R(x + 0.4, y + 0.4, w - 0.8, 0.6, shade(col, 1.12));
        for (let gx = x + 6; gx < x + w - 6; gx += 11 + rnd(gx) * 9) g += R(gx, y + 2 + rnd(gx + y) * 3, 4 + rnd(gx * 2) * 5, 0.35, shade(col, 0.86));  // grain
        g += R(x + 2, y + 3, 0.7, 0.7, "#6d5238") + R(x + w - 3, y + 3, 0.7, 0.7, "#6d5238");  // screws
        x += w;
      }
    }
    for (let k = 0; k < 8; k++) g += R(0, k, 400, 1, "#140c06", ` fill-opacity="${0.32 - k * 0.04}"`);  // the railing's shadow
    return g;
  }
}
ART.deck = new DeckArt();

// the stair kiosk: concrete, a flat roof with a vent, a glass door lit from inside, a wall lamp
class KioskArt extends SvgArt {
  constructor() { super("kiosk", 44, 62); }
  body({ night = false }) {
    return R(0, 6, 44, 56, "#8f8c96") + R(0, 6, 4, 56, "#a5a2ad") + R(40, 6, 4, 56, "#77747e") + R(-1, 3, 46, 4, "#6d6a75") + R(-1, 3, 46, 1, "#9b98a4")
      + R(30, -1, 8, 4, "#5d5a66") + R(31, -2, 6, 1, "#47454f")  // vent
      + R(9, 18, 26, 44, "#2f3442") + R(11, 20, 22, 42, night ? "#f2c66d" : "#9fc6dd") + R(21.6, 20, 0.8, 42, "#2f3442") + R(11, 38, 22, 0.8, "#2f3442")
      + `<path fill="#ffffff" fill-opacity="${night ? 0.15 : 0.4}" d="M12 21h4l-4 8zM23 21h3l-3 6z"/>` + R(18, 40, 1.4, 5, "#c9ccd6") + R(25, 40, 1.4, 5, "#c9ccd6")
      + R(8, 13, 28, 4, "#081746") + R(36, 22, 3, 4, "#2a2a33") + R(36.4, 26, 2.2, 1.6, night ? "#ffe9a8" : "#d9d3a8");
  }
}
ART.kiosk = new KioskArt();

// the pergola: wooden posts and beams, a vine with leaves (and grapes in late summer), the banquet table and two benches
class PergolaArt extends SvgArt {
  constructor() { super("pergola", 124, 74); }
  body({ season = "été" }) {
    const leaf = { hiver: null, automne: ["#d9822b", "#b85c1f"], printemps: ["#7fcf6a", "#5fb85a"], "été": ["#3f9e4f", "#2f7a3a"] }[season];
    let g = "";
    // back posts
    g += R(6, 4, 3, 44, "#6d4a2e") + R(115, 4, 3, 44, "#6d4a2e");
    // banquet table: top, cloth runner, legs; benches
    g += R(16, 44, 92, 4, "#9a6a40") + R(16, 44, 92, 1, "#c08a5a") + R(30, 44.4, 64, 2.6, "#f4f2ea", ' fill-opacity=".85"') + R(20, 48, 3, 10, "#6d4a2e") + R(101, 48, 3, 10, "#6d4a2e");
    for (const x of [26, 44, 62, 80, 96]) g += `<ellipse cx="${x}" cy="45.4" rx="2.6" ry="1" fill="#f7f7f7"/>` + R(x + 3, 42, 1.2, 3, "#3f9e4f") + R(x + 3, 41.4, 1.2, 0.8, "#c9ccd6");  // plates, bottles
    g += R(14, 52, 96, 3, "#8a5d3a") + R(14, 52, 96, 0.8, "#b07a4a") + R(18, 55, 2, 6, "#5c3d27") + R(104, 55, 2, 6, "#5c3d27");
    g += R(14, 62, 96, 3, "#8a5d3a") + R(14, 62, 96, 0.8, "#b07a4a") + R(18, 65, 2, 6, "#5c3d27") + R(104, 65, 2, 6, "#5c3d27");
    // front posts and the roof beams
    g += R(2, 6, 4, 66, "#8a5d3a") + R(2, 6, 1, 66, "#a8774c") + R(118, 6, 4, 66, "#8a5d3a") + R(118, 6, 1, 66, "#a8774c");
    g += R(-2, 2, 128, 4, "#8a5d3a") + R(-2, 2, 128, 1, "#b07a4a");
    for (let x = 4; x < 124; x += 10) g += R(x, 0, 2, 7, "#6d4a2e") + R(x, 0, 2, 0.8, "#8a5d3a");
    // the vine along the beam and down a post
    if (leaf) {
      for (let x = 0; x < 124; x += 3.4) { const y = 6 + Math.sin(x / 7) * 1.8; g += `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="1.5" fill="${leaf[(x * 7) % 2 < 1 ? 0 : 1]}"/>`; }
      for (let y = 10; y < 54; y += 4) g += `<ellipse cx="${4 + Math.sin(y) * 1.2}" cy="${y}" rx="1.8" ry="1.3" fill="${leaf[y % 8 < 4 ? 0 : 1]}"/>`;
      if (season === "été" || season === "automne") for (const x of [30, 70, 104]) g += `<circle cx="${x}" cy="10" r="1" fill="#6b2f6e"/><circle cx="${x + 1.2}" cy="11.2" r="1" fill="#7e3a82"/><circle cx="${x - 1}" cy="11.4" r="1" fill="#6b2f6e"/>`;
    } else for (let x = 0; x < 124; x += 6) g += `<path fill="none" stroke="#5c3d27" stroke-width=".5" d="M${x} 6q2 2 4 0"/>`;  // bare vine in winter
    return g;
  }
}
ART.pergola = new PergolaArt();

// the bar: a wooden counter with lights, beer taps, bottles on the back shelf, the AFTERWORK neon sign
class BarArt extends SvgArt {
  constructor() { super("bar", 88, 56); }
  body({ neon = false }) {
    let g = R(4, 0, 80, 14, "#2a2a33") + R(4, 0, 80, 1, "#3d3d4a");  // neon box
    g += `<text x="44" y="10" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="8" fill="${neon ? "#ff5fa2" : "#6b3d55"}" shape-rendering="geometricPrecision"${neon ? ' style="filter:drop-shadow(0 0 1px #ff5fa2)"' : ""}>AFTERWORK</text>`;
    g += R(10, 14, 1.4, 6, "#3d3d4a") + R(76, 14, 1.4, 6, "#3d3d4a");
    g += R(2, 20, 84, 4, "#5c3d27") + R(2, 20, 84, 0.8, "#8a5d3a");  // back shelf
    const bottles = ["#2f9e44", "#8f2b46", "#d9a441", "#4090d7", "#f4f2ea", "#2f9e44", "#c45a1f", "#8f2b46", "#d9a441", "#4090d7"];
    bottles.forEach((col, i) => { const x = 6 + i * 8; g += R(x, 14 + (i % 2), 3, 6 - (i % 2), col) + R(x + 1, 12 + (i % 2), 1, 2, col); });
    g += R(0, 30, 88, 4, "#3a3a44") + R(0, 30, 88, 1, "#5a5a68");  // counter top
    for (const x of [22, 30, 38]) g += R(x, 23, 2, 7, "#c9ccd6") + R(x - 1, 22, 4, 1.6, "#e0e3ea") + R(x, 21, 2, 1.2, ["#fbaa08", "#ff6b6b", "#51cf66"][(x - 22) / 8]);  // taps
    g += R(58, 26, 4, 4, "#fbaa08", ' fill-opacity=".8"') + R(58, 26, 4, 1, "#fff3b0") + R(66, 27, 3, 3, "#f4f2ea");  // a pint, a glass
    g += R(2, 34, 84, 22, "#8a5d3a");
    for (let x = 4; x < 84; x += 7) g += R(x, 34, 6, 22, x % 14 < 7 ? "#9a6a40" : "#8a5d3a") + R(x, 34, 0.4, 22, "#5c3d27");
    g += R(2, 34, 84, 1.4, neon ? "#ffd27a" : "#6d4a2e") + R(2, 54, 84, 2, "#5c3d27");
    return g;
  }
}
ART.bar = new BarArt();
class BarStoolArt extends SvgArt {
  constructor() { super("barstool", 8, 14); }
  body() { return `<ellipse cx="4" cy="1.6" rx="4" ry="1.6" fill="#2a2a33"/>` + R(3.4, 2, 1.2, 10, "#8d929c") + R(1, 8, 6, 0.8, "#8d929c") + `<ellipse cx="4" cy="13" rx="3" ry=".9" fill="#5a5664"/>`; }
}
ART.barstool = new BarStoolArt();

// the kettle grill on its legs; the coals glow and the lid is up while it cooks
class GrillArt extends SvgArt {
  constructor() { super("grill", 26, 30); }
  body({ on = false }) {
    let g = R(4, 16, 1.4, 13, "#3a3a44") + R(20.6, 16, 1.4, 13, "#3a3a44") + R(12.3, 18, 1.4, 11, "#3a3a44") + R(2, 26, 22, 1, "#3a3a44");
    g += `<path fill="#1c1c24" d="M1 12h24q0 9 -12 9t-12 -9z"/>` + R(1, 11, 24, 1.6, "#3a3a44");
    if (on) g += R(3, 10, 20, 1.6, "#ff9f43") + R(5, 9.4, 3, 1, "#ffd43b") + R(12, 9.4, 3, 1, "#ff6b35") + R(18, 9.4, 3, 1, "#ffd43b")
      + R(6, 8.2, 4, 1.4, "#d64545") + R(14, 8.2, 5, 1.4, "#e8b04c")  // sausages, a skewer
      + `<path fill="#1c1c24" d="M17 1q8 0 8 9h-2q0 -7 -6 -7z"/>`;  // lid up
    else g += `<path fill="#1c1c24" d="M1 11q0 -9 12 -9t12 9z"/>` + R(12, 0, 2, 2, "#8d929c");
    g += R(24, 13, 2, 0.8, "#8d929c");
    return g;
  }
}
ART.grill = new GrillArt();

// the fire pit: a stone ring, logs, flames in three frames when lit
class FirePitArt extends SvgArt {
  constructor() { super("firepit", 30, 22); }
  body({ lit = false, frame = 0 }) {
    let g = `<ellipse cx="15" cy="17" rx="15" ry="5" fill="#5a5664"/><ellipse cx="15" cy="16" rx="12" ry="3.6" fill="#2a2a33"/>`;
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; g += `<ellipse cx="${(15 + Math.cos(a) * 13.4).toFixed(2)}" cy="${(17 + Math.sin(a) * 4.4).toFixed(2)}" rx="2.6" ry="1.6" fill="${k % 2 ? "#8d8aa0" : "#a5a2ad"}"/>`; }
    g += `<path fill="#6d4a2e" d="M8 16l14 -3l1 1.6l-14 3zM8 13l14 3l-1 1.6l-14 -3z"/>`;
    if (lit) {
      const f = [[0, 0, 0], [1, -1, 1], [-1, 1, 0]][frame % 3];
      g += `<path fill="#ff6b35" d="M9 15q0 -6 ${3 + f[0]} -11q1 4 3 5q1 -5 ${4 + f[1]} -8q2 6 3 9q1 -3 2 -4q1 5 -1 9z"/>`
        + `<path fill="#ffd43b" d="M11.4 15q0 -4 2 -7q1 3 2 3q1 -3 ${2.6 + f[2]} -5q1.6 4 1.6 6q0 2 -1.4 3z"/>` + `<ellipse cx="15" cy="15.4" rx="5" ry="1.2" fill="#fff3b0" fill-opacity=".8"/>`;
    }
    return g;
  }
}
ART.firepit = new FirePitArt();

// the outdoor lounge: a rattan L-shaped sofa with navy cushions and yellow pillows, a low table with a lantern
class OutdoorSofaArt extends SvgArt {
  constructor() { super("outsofa", 96, 36); }
  body() {
    let g = R(0, 8, 96, 22, "#6d4a2e") + R(0, 8, 96, 1, "#8a5d3a");
    for (let x = 1; x < 96; x += 3) g += R(x, 9, 0.6, 21, "#5c3d27", ' fill-opacity=".6"');  // rattan weave
    g += R(2, 2, 92, 10, "#163a7a") + R(2, 2, 92, 1.2, "#2a55a8") + R(31, 3, 0.6, 9, "#0e2a5c") + R(63, 3, 0.6, 9, "#0e2a5c");  // back cushions
    g += R(2, 13, 92, 8, "#1b4590") + R(2, 13, 92, 1, "#3a66b8") + R(32, 13, 0.6, 8, "#0e2a5c") + R(64, 13, 0.6, 8, "#0e2a5c");  // seat
    g += R(0, 4, 4, 22, "#5c3d27") + R(92, 4, 4, 22, "#5c3d27");  // arms
    g += `<path fill="#fbaa08" d="M8 4l8 -1l1 7l-8 1z"/><path fill="#ffd27a" d="M80 4l8 1l-1 7l-8 -1z"/>`;  // pillows
    g += R(2, 30, 4, 4, "#3a2a1e") + R(90, 30, 4, 4, "#3a2a1e");
    return g;
  }
}
ART.outsofa = new OutdoorSofaArt();
class LowTableArt extends SvgArt {
  constructor() { super("lowtable", 30, 14); }
  body({ lit = false }) {
    return R(0, 6, 30, 3, "#8a5d3a") + R(0, 6, 30, 0.8, "#b07a4a") + R(2, 9, 2, 5, "#5c3d27") + R(26, 9, 2, 5, "#5c3d27")
      + R(12, 0, 6, 6, "#2a2a33") + R(13, 1, 4, 4, lit ? "#ffd27a" : "#f4efc9", lit ? "" : ' fill-opacity=".5"') + R(12, -1, 6, 1, "#3d3d4a")  // lantern
      + R(22, 4, 3, 2, "#f4f2ea") + R(4, 4.4, 5, 1.6, "#d64545");  // a cup, a book
  }
}
ART.lowtable = new LowTableArt();

// a big parasol: navy and yellow panels, a fringe, the pole and its weighted base
class ParasolArt extends SvgArt {
  constructor() { super("parasol", 56, 70); }
  body() {
    let g = R(27.3, 10, 1.4, 56, "#c9ccd6") + `<ellipse cx="28" cy="67" rx="7" ry="2" fill="#3a3a44"/>`;
    const panels = 8;
    for (let k = 0; k < panels; k++) {
      const x0 = k * 56 / panels, x1 = (k + 1) * 56 / panels;
      g += `<path fill="${k % 2 ? "#fbaa08" : "#163a7a"}" d="M28 0L${x0} 14Q${(x0 + x1) / 2} 16 ${x1} 14Z"/>`;
    }
    for (let x = 1; x < 56; x += 2.4) g += R(x, 14.4, 1, 1.6, x % 4.8 < 2.4 ? "#163a7a" : "#fbaa08");
    g += `<circle cx="28" cy="0.6" r="1.2" fill="#c9ccd6"/>`;
    return g;
  }
}
ART.parasol = new ParasolArt();

// a deckchair: wooden frame, navy and yellow striped canvas, a towel
class DeckChairArt extends SvgArt {
  constructor() { super("chaise", 28, 18); }
  body({ towel = "#ff6b6b" }) {
    let g = `<path fill="#8a5d3a" d="M2 17l6 -15h2l-6 15zM24 17l-4 -8h2l4 8z"/>` + R(4, 9, 22, 1.4, "#6d4a2e");
    const canvas = "M8 2L20 9L26 10L24 12L18 11L6 5Z";
    g += `<path fill="#f4f2ea" d="${canvas}"/>`;
    for (let k = 0; k < 4; k++) g += `<path fill="${k % 2 ? "#fbaa08" : "#163a7a"}" fill-opacity=".9" d="M${8 + k * 4} ${2 + k * 2.2}l3 1.8l-2 3l-3 -1.6z"/>`;
    g += `<path fill="${towel}" d="M17 9l7 1l-1 2l-7 -1z"/>`;
    return g;
  }
}
ART.chaise = new DeckChairArt();

// a wooden planter: lavender (summer), tulips (spring), heather (autumn) or a little snow (winter); or an olive tree in a pot
class PlanterArt extends SvgArt {
  constructor() { super("planter", 34, 22); }
  body({ season = "été" }) {
    const flower = { printemps: ["#ff6b9a", "#ffd43b", "#ffffff"], "été": ["#9b7fd4", "#b48cff", "#8467c4"], automne: ["#c45a8a", "#d9822b", "#a8477a"], hiver: null }[season];
    let g = R(0, 12, 34, 10, "#8a5d3a") + R(0, 12, 34, 1.2, "#b07a4a") + R(11, 13, 0.5, 9, "#5c3d27") + R(22, 13, 0.5, 9, "#5c3d27") + R(1, 11, 32, 2, "#4a3826");
    for (let x = 3; x < 32; x += 3) {
      g += R(x, 4 + (x % 2), 0.7, 8 - (x % 2), season === "hiver" ? "#6d7a5a" : "#4f8f4a");
      if (flower) g += R(x - 0.6, 2 + (x % 3), 2, 2.4, flower[x % 3]);
    }
    if (season === "hiver") g += R(0, 10, 34, 1.6, "#f4f6fb") + R(2, 3, 30, 1, "#f4f6fb", ' fill-opacity=".7"');
    return g;
  }
}
ART.planter = new PlanterArt();
class OliveTreeArt extends SvgArt {
  constructor() { super("olive", 26, 40); }
  body({ season = "été" }) {
    const leaves = season === "hiver" ? ["#7c8a70", "#6d7a5a"] : ["#7fa36a", "#5f8a55"];
    let g = `<path fill="#c9744a" d="M6 30h14l-2 10h-10z"/>` + R(5, 28, 16, 3, "#b0603a") + R(5, 28, 16, 0.8, "#e08a5c");
    g += `<path fill="#6d5238" d="M12 30q-1 -8 1 -14q-4 -3 -5 -6l1 -1q3 3 5 5q2 -4 6 -6l1 1q-4 3 -5 7q0 6 -1 14z"/>`;
    for (const [x, y, r] of [[13, 8, 7], [7, 10, 5], [19, 9, 5], [13, 3, 5], [9, 15, 4], [18, 15, 4]]) g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${leaves[(x + y) % 2]}"/>`;
    for (const [x, y] of [[10, 6], [16, 4], [20, 11], [8, 13], [14, 12]]) g += `<ellipse cx="${x}" cy="${y}" rx="1" ry=".6" fill="#c8d9b8"/>`;
    if (season === "hiver") g += `<path fill="#f4f6fb" d="M7 4q6 -5 12 0q-6 -2 -12 0z"/>`;
    return g;
  }
}
ART.olive = new OliveTreeArt();

// the A-frame chalkboard by the bar; the text is drawn over it by the room
class ChalkboardArt extends SvgArt {
  constructor() { super("chalkboard", 30, 26); }
  body() {
    return `<path fill="#6d4a2e" d="M3 26l3 -26h2l-3 26zM27 26l-3 -26h-2l3 26z"/>` + R(4, 2, 22, 17, "#8a5d3a") + R(5, 3, 20, 15, "#24352c") + R(5, 3, 20, 15, "#2c4235", ' fill-opacity=".6"')
      + R(18, 14, 4, 1, "#e0e0e0", ' fill-opacity=".5"');
  }
}
ART.chalkboard = new ChalkboardArt();
