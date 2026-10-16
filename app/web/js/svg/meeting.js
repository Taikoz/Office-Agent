// The meeting room (rooms/built.js): the whiteboard (its drawing is painted over it by the room) with its marker tray,
// the wall TV and its soundbar, the conference table, office chairs, the wall clock.

import { ART, R, SvgArt } from "./base.js";

export const BOARD_INK = [["#1c1c24", "noir"], ["#2f6ad6", "bleu"], ["#d64545", "rouge"], ["#2f9e44", "vert"], ["#e59400", "orange"]];

// the whiteboard: aluminium frame, glossy surface (drawn under the drawing), the tray with its markers, eraser and sponge
class WhiteboardArt extends SvgArt {
  constructor() { super("whiteboard", 148, 56); }
  body({ sel = 0 }) {
    let g = R(0, 0, 148, 48, "#9aa0b2") + R(0, 0, 148, 0.8, "#d5d9e4") + R(147.2, 0, 0.8, 48, "#6f7488") + R(0, 47.2, 148, 0.8, "#6f7488")
      + R(2.5, 2.5, 143, 43, "#5d6275") + R(3, 3, 142, 42, "#fbfbf7");
    g += `<path fill="#ffffff" fill-opacity=".9" d="M90 3h7l-14 42h-7zM102 3h2.5l-14 42h-2.5z"/>` + R(3, 42, 142, 3, "#e9ecf2", ' fill-opacity=".7"');
    // tray
    g += R(-2, 48, 152, 3, "#b8bcc8") + R(-2, 48, 152, 0.7, "#e0e3ea") + R(-2, 50.4, 152, 0.6, "#6f7488");
    BOARD_INK.forEach(([c], i) => {
      const x = 8 + i * 13, lift = i === sel ? -2.2 : 0;
      g += R(x, 46.4 + lift, 10, 2, "#f2f2f2") + R(x + 7, 46.4 + lift, 3, 2, c) + R(x + 10, 46.8 + lift, 1, 1.2, c);
      if (i === sel) g += R(x - 0.6, 51.6, 11.2, 1, c);
    });
    const ex = 8 + BOARD_INK.length * 13 + 4;  // eraser (selected: sel === -1), sponge
    g += R(ex, 46 + (sel === -1 ? -2.2 : 0), 12, 2.6, "#3a3a48") + R(ex, 47.8 + (sel === -1 ? -2.2 : 0), 12, 0.8, "#c9c1a8");
    if (sel === -1) g += R(ex - 0.6, 51.6, 13.2, 1, "#3a3a48");
    g += R(126, 45.4, 14, 3.2, "#fbaa08") + R(126, 47.6, 14, 1, "#2f9e44");
    return g;
  }
}
ART.whiteboard = new WhiteboardArt();

// the wall TV: thin bezel, a power LED, the wall mount's shadow, a soundbar under it
class WallTvArt extends SvgArt {
  constructor() { super("walltv", 108, 58); }
  body({ on = false }) {
    return R(2, 2, 104, 48, "#000000", ' fill-opacity=".25"') + R(0, 0, 104, 48, "#14141c") + R(0, 0, 104, 0.8, "#3a3a46") + R(2, 2, 100, 44, on ? "#0b1020" : "#1c1d26")
      + (on ? "" : `<path fill="#ffffff" fill-opacity=".06" d="M60 2h14l-24 44h-14z"/>`) + R(50, 46.6, 4, 0.8, on ? "#51cf66" : "#ff6b6b")
      + R(24, 52, 56, 5, "#1c1c24") + R(24, 52, 56, 0.8, "#3a3a46") + [30, 34, 38, 66, 70, 74].map(x => R(x, 54, 2, 1.6, "#3a3a46")).join("");
  }
}
ART.walltv = new WallTvArt();

// the conference table: an oak top with a dark edge, laptops, notebooks, water bottles, a speakerphone in the middle
class ConferenceTableArt extends SvgArt {
  constructor() { super("conftable", 152, 42); }
  body() {
    let g = R(14, 30, 4, 12, "#3a2a1e") + R(134, 30, 4, 12, "#3a2a1e") + R(70, 30, 12, 10, "#3a2a1e");
    g += `<rect x="0" y="2" width="152" height="30" rx="14" fill="#5c3d27"/><rect x="0" y="0" width="152" height="29" rx="14" fill="#8a5d3a"/>`
      + `<rect x="3" y="1.6" width="146" height="25" rx="12" fill="#9a6a40"/>` + `<path fill="#ffffff" fill-opacity=".12" d="M30 3h40l-8 20h-40z"/>`;
    // laptops (open, screens toward the back row and toward us), notebooks, bottles, cups
    for (const [x, back] of [[28, true], [66, true], [104, true], [36, false], [86, false], [118, false]]) {
      g += back ? R(x, 4, 14, 7, "#2a2a33") + R(x + 1, 5, 12, 5, "#3f6fb0") + R(x - 1, 11, 16, 2, "#c9ccd6")
        : R(x - 1, 18, 16, 2, "#c9ccd6") + R(x, 20, 14, 6, "#2a2a33") + R(x + 1, 21, 12, 0.6, "#5a5a68");
    }
    for (const [x, y] of [[50, 16], [96, 8], [134, 14]]) g += R(x, y, 7, 5, "#f4f2ea") + R(x, y, 7, 0.8, "#d64545") + R(x + 1, y + 2, 5, 0.4, "#9aa0b2");  // notebooks
    for (const [x, y] of [[20, 14], [60, 18], [124, 6]]) g += R(x, y - 3, 2, 4, "#8ec5ff", ' fill-opacity=".8"') + R(x, y - 3.6, 2, 0.8, "#2f6ad6");  // bottles
    g += `<ellipse cx="76" cy="15" rx="6" ry="2.6" fill="#2a2a33"/><ellipse cx="76" cy="14.4" rx="4" ry="1.4" fill="#3a3a46"/><circle cx="76" cy="14.4" r=".7" fill="#51cf66"/>`;  // speakerphone
    return g;
  }
}
ART.conftable = new ConferenceTableArt();

// an office chair: mesh back, padded seat, a gas column, five wheels; front (back row, behind the table) or back view
class OfficeChairArt extends SvgArt {
  constructor() { super("officechair", 14, 18); }
  body({ back = false }) {
    let g = R(6.2, 11, 1.6, 4, "#3a3a46") + `<path fill="#2a2a33" d="M1 16h12l-1 1h-10z"/>` + `<circle cx="2" cy="17.4" r=".9" fill="#1c1c24"/><circle cx="7" cy="17.6" r=".9" fill="#1c1c24"/><circle cx="12" cy="17.4" r=".9" fill="#1c1c24"/>`;
    g += `<rect x="1" y="9" width="12" height="3" rx="1.2" fill="#2a2a33"/>`;
    g += `<rect x="2" y="0" width="10" height="${back ? 10 : 9}" rx="2" fill="#2a2a33"/><rect x="3" y="1" width="8" height="${back ? 8 : 7}" rx="1.4" fill="#3a3f52"/>`;
    for (let y = 2; y < (back ? 9 : 8); y += 1.4) g += R(3.4, y, 7.2, 0.3, "#55607a");
    if (!back) g += R(0, 8, 2, 1, "#2a2a33") + R(12, 8, 2, 1, "#2a2a33");
    return g;
  }
}
ART.officechair = new OfficeChairArt();

// the wall clock's face (the hands are drawn by the room, at the real time)
class WallClockArt extends SvgArt {
  constructor() { super("wallclock", 16, 16); }
  body() {
    let g = `<g shape-rendering="geometricPrecision"><circle cx="8" cy="8" r="8" fill="#2a2a33"/><circle cx="8" cy="8" r="6.8" fill="#f7f7f2"/>`;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g += `<circle cx="${(8 + Math.sin(a) * 5.6).toFixed(2)}" cy="${(8 - Math.cos(a) * 5.6).toFixed(2)}" r="${k % 3 ? 0.3 : 0.55}" fill="#2a2a33"/>`; }
    return g + `<circle cx="8" cy="8" r=".7" fill="#d64545"/></g>`;
  }
}
ART.wallclock = new WallClockArt();
