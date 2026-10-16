// The office: the test bug, the podium, the team plant, incidents, achievement cups, the MR bell, the espresso
// machine, the issue board and its sticky notes, the gaming corner (TV game, console).

import { ART, R, StaticArt, SvgArt } from "./base.js";

class BugArt extends SvgArt {
  constructor() { super("bug", 20, 15); }
  body({ frame = 0, stunned = false }) {
    const leg = (side, k) => {
      const y0 = 6 + k * 1.7, lift = (frame + k) % 2 ? 0.7 : 0;
      return `<path fill="none" stroke="#3a1a5a" stroke-width=".8" d="M${10 + side * 3} ${y0}L${10 + side * 6.4} ${y0 - 1 + lift}L${10 + side * 7.4} ${y0 + 1.4 + lift}"/>`;
    };
    let g = "";
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g += leg(s, k);
    g += `<path fill="none" stroke="#3a1a5a" stroke-width=".5" d="M9 3.2Q7 0.6 5 1.2M11 3.2Q13 0.6 15 1.2"/>`;
    g += `<ellipse cx="10" cy="9.6" rx="5.2" ry="4.4" fill="#7a3aa8"/><ellipse cx="8.2" cy="7.6" rx="1.7" ry="0.9" fill="#c9a2ef" opacity=".85"/>`;
    g += R(9.8, 5.6, 0.4, 8.2, "#4a1f70") + `<circle cx="7.6" cy="11" r=".8" fill="#5a2a80"/><circle cx="12.4" cy="10.4" r=".8" fill="#5a2a80"/><circle cx="12" cy="12.6" r=".6" fill="#5a2a80"/>`;
    g += `<rect x="7" y="3" width="6" height="3.6" rx="1.3" fill="#3a1a5a"/><path fill="#2a1240" d="M8 6.4l-0.8 1.4h1.2zM12 6.4l0.8 1.4h-1.2z"/>`;
    g += stunned ? `<path stroke="#fff" stroke-width=".4" d="M7.8 4.1l1.2 1.2M9 4.1l-1.2 1.2M11 4.1l1.2 1.2M12.2 4.1l-1.2 1.2"/>`
      : `<circle cx="8.6" cy="4.6" r=".8" fill="#ff3b3b"/><circle cx="11.4" cy="4.6" r=".8" fill="#ff3b3b"/><rect x="8.3" y="4.2" width=".4" height=".4" fill="#fff"/><rect x="11.1" y="4.2" width=".4" height=".4" fill="#fff"/>`;
    return g;
  }
}
ART.bug = new BugArt();

ART.podium = new StaticArt("podium", 24, 8.2, R(0, 6.4, 24, 1.8, "#8a6a4a") + R(0, 6.4, 24, 0.5, "#a88660")
  + R(2, 2.2, 20, 4.4, "#6d5238") + R(7, 2.2, 0.5, 4.4, "#5a4330") + R(16.5, 2.2, 0.5, 4.4, "#5a4330")
  + R(1, 0.6, 22, 1.8, "#a07c58") + R(1, 0.6, 22, 0.5, "#c49a6c") + R(9, 3, 6, 2.6, "#fbaa08") + R(9.6, 3.6, 4.8, 1.4, "#081746") + `<circle cx="13.4" cy="4.3" r=".45" fill="#fbaa08"/>`);

class TeamPlantArt extends SvgArt {
  constructor() { super("teamplant", 20, 37); }
  body({ n = 1, dry = false, frame = 0 }) {
    const h = 4 + n * 2.4, base = 30, leaf = dry ? "#b09440" : "#3f9e4f", leaf2 = dry ? "#94782f" : "#5fbf6d", vein = dry ? "#7a6428" : "#2f7a3a";
    let g = `<path fill="#b0603a" d="M4.6 ${base}h10.8l-1.2 7h-8.4z"/>` + R(3.8, base - 1.2, 12.4, 2, "#c9744a") + R(3.8, base - 1.2, 12.4, 0.5, "#e08a5c") + R(5, base - 0.4, 10, 0.8, "#4a3826");
    g += R(9.6, base - h, 0.8, h, dry ? "#7a6a3a" : "#2f7a3a");
    for (let i = 0; i < Math.max(1, Math.floor(h / 3.2)); i++) {
      const y = base - 2 - i * 3.2, side = i % 2 ? 1 : -1, sway = frame ? 0.4 : -0.4, droop = dry ? 1.6 : 0;
      const x0 = 10 + (side > 0 ? 0.4 : -0.4);
      g += `<path fill="${i % 2 ? leaf : leaf2}" d="M${x0} ${y}Q${x0 + side * 2.4 + sway} ${y - 2.4 + droop} ${x0 + side * 4.6 + sway} ${y - 0.6 + droop * 1.4}Q${x0 + side * 2.2 + sway} ${y + 0.8 + droop} ${x0} ${y}Z"/>`;
      g += `<path fill="none" stroke="${vein}" stroke-width=".25" d="M${x0} ${y}Q${x0 + side * 2.4 + sway} ${y - 1 + droop} ${x0 + side * 4 + sway} ${y - 0.6 + droop * 1.4}"/>`;
    }
    if (n >= 6 && !dry) g += `<circle cx="10" cy="${base - h - 1.2}" r="1.8" fill="#ff6b9a"/><circle cx="8.6" cy="${base - h - 1.6}" r=".9" fill="#ff8fb4"/><circle cx="11.4" cy="${base - h - 1.6}" r=".9" fill="#ff8fb4"/><circle cx="10" cy="${base - h - 1.2}" r=".7" fill="#ffd43b"/>`;
    return g;
  }
}
ART.teamplant = new TeamPlantArt();

ART.spill = new StaticArt("spill", 23, 9, `<ellipse cx="9" cy="6.4" rx="8.4" ry="2.6" fill="#6d4a2e"/><ellipse cx="6" cy="5.6" rx="3.6" ry="1.4" fill="#7d5636"/>`
  + `<ellipse cx="5" cy="5.2" rx="1.6" ry=".5" fill="#fff" opacity=".35"/>` + R(13.2, 2.6, 3.2, 2.4, "#f4f2ea") + R(13.2, 2.6, 3.2, 0.6, "#d9d6cc") + R(16.4, 3.2, 0.8, 1.2, "#f4f2ea")
  + `<path fill="#fbaa08" d="M19.5 0l3 6h-6z"/>` + R(19.2, 2, 0.6, 2.2, "#081746") + R(19.2, 4.6, 0.6, 0.6, "#081746") + R(18.6, 6, 1.8, 1, "#8d8aa0"));

ART.croissants = new StaticArt("croissants", 16, 11, R(0, 4, 16, 7, "#f7c6d9") + R(0, 4, 16, 1.6, "#e98fc4") + R(1, 5.4, 14, 0.4, "#fff", ' opacity=".5"')
  + [2, 6.6, 10.6].map((x, i) => `<path fill="${i % 2 ? "#e0952a" : "#d98018"}" d="M${x} 4Q${x + 2.4} ${0.6 + i * 0.3} ${x + 4.6} 4Z"/><path fill="none" stroke="#a85a0a" stroke-width=".3" d="M${x + 1.4} 3.4l.4 -1.6M${x + 3} 3.2l-.3 -1.6"/>`).join(""));

class BrokenCoffeeArt extends SvgArt {
  constructor() { super("brokencoffee", 10, 5.6); }
  body({ on = false }) {  return R(0, 0, 10, 5.6, "#2a0f14") + R(0.6, 0.6, 8.8, 4.4, on ? "#ff3b3b" : "#7a1a24") + `<path fill="none" stroke="#fff" stroke-width=".35" opacity=".8" d="M2 1l2 1.6 -1 1.2 2.4 1.4M7 0.8l-1 1.8 1.4 1"/>`;}
}
ART.brokencoffee = new BrokenCoffeeArt();

class WiltedPlantArt extends SvgArt {
  constructor() { super("wilted", 14, 15); }
  body() {
    return `<path fill="#b86a48" d="M2 9h10l-1 5H3z"/>` + R(1.4, 8.2, 11.2, 1.6, "#c9744a") + R(2.4, 9, 9.2, 0.6, "#4a3826")
      + `<path fill="none" stroke="#8a6a3a" stroke-width=".8" d="M7 9Q7 5 5 3.6M7 9Q8 4.6 10.6 4M7 9Q6 6.4 3 6.6"/>`
      + `<path fill="#b09440" d="M4.6 3.4l-2 2.4 1.6.6zM10.6 3.8l1.8 2.2-1.6.4zM2.8 6.4l-1.8 1.4 1.4.8z"/>` + R(9, 13.6, 1, 0.6, "#a07c58") + R(4, 14, 1.2, 0.5, "#a07c58");
  }
}
ART.wilted = new WiltedPlantArt();

class CupArt extends SvgArt {
  constructor() { super("cup", 6.4, 6); }
  body({ on = false }) {
    const c = on ? "#fbaa08" : "#13286a", d = on ? "#c98a08" : "#0b1a4a", hl = on ? "#fff3b0" : "#2a4290";
    return `<path fill="${c}" d="M0.6 0h4.8v1.6Q5.4 3.6 3 3.8Q0.6 3.6 0.6 1.6z"/>` + `<path fill="none" stroke="${c}" stroke-width=".5" d="M0.6 0.6Q-0.5 0.6 -0.4 1.4Q-0.3 2.4 0.9 2.4M5.4 0.6Q6.5 0.6 6.4 1.4Q6.3 2.4 5.1 2.4"/>`
      + R(1.2, 0.4, 0.6, 2, hl) + R(2.6, 3.7, 0.8, 1, d) + R(1.6, 4.6, 2.8, 0.8, d) + R(1.2, 5.3, 3.6, 0.7, c);
  }
}
ART.cup = new CupArt();

ART.bell = new StaticArt("bell", 8, 8.4, `<path fill="#fbaa08" d="M1 6Q1 0.6 4 0.6Q7 0.6 7 6z"/>` + R(0, 5.6, 8, 1.2, "#e09a08") + R(3.4, -0.6, 1.2, 1.4, "#c9a24b") + `<circle cx="4" cy="7.4" r=".8" fill="#8a6a4a"/>` + R(2, 1.6, 0.8, 3, "#fff3b0"));

class CoffeeMachineArt extends SvgArt {
  constructor() { super("coffeemachine", 18, 22); }
  body({ frame = 0, brewing = false }) {
    let g = `<ellipse cx="9" cy="22.4" rx="8.4" ry=".8" fill="#000" fill-opacity=".3"/>`
      + `<rect x="1.6" y="2" width="14.8" height="20" rx="1.2" fill="#b8bcc8"/>` + R(2.4, 2.8, 1.6, 18.6, "#e2e5ec") + R(14.6, 2.8, 1.2, 18.6, "#8d92a3")
      + `<rect x="1" y="0.6" width="16" height="2.4" rx=".6" fill="#6f7488"/>` + R(1, 0.6, 16, 0.6, "#9aa0b2");
    for (const x of [3.4, 7.2, 11]) g += R(x, -0.8, 2.6, 1.6, "#f4f2ea") + R(x, -0.8, 2.6, 0.4, "#c9c5b8");  // cups warming on top
    // display (where the "broken" overlay lands)
    g += R(3.6, 4.2, 10.8, 6, "#1c2433") + R(4, 4.4, 10, 5.6, brewing ? "#0e3a5c" : "#13283d");
    if (brewing) {
      g += R(5, 8.2, 8, 0.9, "#2a4a6a") + R(5, 8.2, 2 + frame * 2, 0.9, "#51cf66");
      g += `<path fill="#d5eeff" d="M6.6 5.4h3.4v1.8q0 .8 -.8 .8h-1.8q-.8 0 -.8 -.8zM10 5.8h.8v1h-.8z"/>`;
    } else g += `<path fill="#5aa9ff" d="M6.6 5.6h3.4v1.8q0 .8 -.8 .8h-1.8q-.8 0 -.8 -.8zM10 6h.8v1h-.8z"/>` + R(11.4, 5.8, 1.6, 0.6, "#5aa9ff") + R(11.4, 7, 1.6, 0.6, "#5aa9ff");
    g += R(4, 4.4, 10, 0.5, "#ffffff", ' fill-opacity=".15"');
    g += `<circle cx="5.6" cy="11.4" r=".7" fill="#ff6b6b"/><circle cx="9" cy="11.4" r=".7" fill="${brewing ? "#51cf66" : "#2f7a3a"}"/><circle cx="12.4" cy="11.4" r=".7" fill="#fbaa08"/>`;
    // group head, portafilter, steam wand
    g += R(6.4, 12.6, 5.2, 1.4, "#55596a") + R(7, 14, 4, 0.8, "#3a3d4a") + R(11.6, 13.2, 4.2, 0.9, "#1c1c24") + R(15.2, 13, 1, 1.3, "#1c1c24")
      + R(3, 12, 0.8, 5, "#d5d9e4") + R(2.8, 16.6, 1.2, 0.8, "#9aa0b2");
    // the cup on the drip tray, filling while it brews
    if (brewing) {
      g += R(8.6, 15, 0.8, 1 + frame * 0.6, "#6d4a2e") + (frame % 2 ? R(8.7, 16.8, 0.6, 0.6, "#6d4a2e") : "");
      g += R(7, 17, 4, 2.8, "#f4f2ea") + R(7, 17, 4, 0.7, frame >= 2 ? "#6d4a2e" : "#c9c5b8") + `<path fill="none" stroke="#f4f2ea" stroke-width=".5" d="M11 17.6q1 0 1 .8t-1 .8"/>`;
      g += `<path fill="none" stroke="#f7f7f7" stroke-opacity=".6" stroke-width=".35" d="M12.6 ${16.6 - frame * 0.4}q.6 -.8 0 -1.6q-.6 -.8 0 -1.6M13.8 ${16.8 - frame * 0.3}q.6 -.8 0 -1.6"/>`;  // steam
    }
    g += R(3.6, 19.8, 10.8, 1.4, "#3a3d4a");
    for (let x = 4.4; x < 14; x += 1.4) g += R(x, 20, 0.6, 1, "#1c1c24");
    g += R(7.4, 2.9, 3.2, 0.9, "#081746") + `<circle cx="9.9" cy="3.35" r=".3" fill="#fbaa08"/>`;  // brand plate
    return g;
  }
}
ART.coffeemachine = new CoffeeMachineArt();

export const BOARD_COLS = [["TO DO", "todo", "#9fb3d9"], ["EN COURS", "working", "#fbaa08"], ["BLOQUÉ", "blocked", "#ff6b6b"], ["LIVRÉ", "done", "#51cf66"]];

class BoardArt extends SvgArt {
  constructor() { super("board", 0, 0); }
  box({ w, h }) { return [0, 0, w + 8, h + 9]; }
  body({ w, h }) {
    const cw = w / BOARD_COLS.length, F = 3;  // frame thickness; the surface starts at (F, F)
    let g = R(0, 0, w + 2 * F, h + 2 * F, "#9aa0b2") + R(0, 0, w + 2 * F, 0.8, "#d5d9e4") + R(0, 0, 0.8, h + 2 * F, "#c4c9d6")
      + R(w + 2 * F - 0.8, 0, 0.8, h + 2 * F, "#6f7488") + R(0, h + 2 * F - 0.8, w + 2 * F, 0.8, "#6f7488")
      + R(F - 0.5, F - 0.5, w + 1, h + 1, "#5d6275") + R(F, F, w, h, "#fbfbf7");
    // light streaks across the glossy surface
    g += `<path fill="#ffffff" fill-opacity=".9" d="M${F + w * 0.55} ${F}h7l-14 ${h}h-7zM${F + w * 0.68} ${F}h2.5l-14 ${h}h-2.5z"/>`
      + `<path fill="#e9ecf2" fill-opacity=".7" d="M${F} ${F + h - 3}h${w}v3h-${w}z"/>`;
    BOARD_COLS.forEach(([, , color], i) => {
      const cx = F + i * cw;
      g += R(cx + 4, F + 0.8, cw - 8, 5.6, color, ' fill-opacity=".9"') + R(cx + 4, F + 0.8, cw - 8, 0.6, "#ffffff", ' fill-opacity=".45"')
        + `<path fill="${color}" fill-opacity=".9" d="M${cx + 4} ${F + 0.8}l-0.8 1.2 0.8 1.2 -0.8 1.2 0.8 1.2v0.8zM${cx + cw - 4} ${F + 0.8}l0.8 1.2 -0.8 1.2 0.8 1.2 -0.8 1.2v0.8z"/>`;
      if (i) g += `<path fill="none" stroke="#3b4a7a" stroke-opacity=".55" stroke-width=".5" d="M${cx} ${F + 2}l.2 ${h * 0.3}-.3 ${h * 0.35}.2 ${h * 0.3}"/>`;  // hand-drawn separator
    });
    // aluminium tray with markers and an eraser
    const ty = h + 2 * F - 0.4;
    g += R(-1, ty, w + 2 * F + 2, 2.4, "#b8bcc8") + R(-1, ty, w + 2 * F + 2, 0.6, "#e0e3ea") + R(-1, ty + 2, w + 2 * F + 2, 0.6, "#6f7488");
    [["#d64545", 24], ["#2f6ad6", 34], ["#2f9e44", 44]].forEach(([c, x]) => { g += R(x, ty - 1.2, 8, 1.4, "#f2f2f2") + R(x + 6, ty - 1.2, 2, 1.4, c) + R(x + 8, ty - 0.9, 0.8, 0.8, c); });
    g += R(w - 30, ty - 2.2, 12, 2.4, "#3a3a48") + R(w - 30, ty - 0.6, 12, 0.8, "#c9c1a8");
    return g;
  }
}
ART.board = new BoardArt();

// a sticky note: shadow, adhesive band, curled bottom-right corner
class StickyArt extends SvgArt {
  constructor() { super("sticky", 43, 8, { outline: false }); }
  box({ w = 43, h = 8 }) { return [0, 0, w, h]; }
  body({ fill, edge, w = 43, h = 8 }) {
    return R(0.6, 0.7, w, h, "#000", ' fill-opacity=".18"') + `<path fill="${fill}" d="M0 0h${w}v${h - 2.2}l-2.2 2.2H0z"/>`
      + R(0, 0, w, 1.4, edge, ' fill-opacity=".55"') + `<path fill="${edge}" d="M${w} ${h - 2.2}l-2.2 2.2v-2.2z"/>` + `<path fill="#000" fill-opacity=".12" d="M${w - 2.2} ${h}l2.2 -2.2h-1.2z"/>`;
  }
}
ART.sticky = new StickyArt();

export const STICKY = { ticket: ["#fff3a0", "#e8c94a"], other: ["#ffd9ec", "#e9a2c4"], backlog: ["#ffffff", "#9fb3d9"], done: ["#d8f5d0", "#8fd18a"], blocked: ["#ffd6d0", "#f08a7c"] };

class TvGameArt extends SvgArt {
  constructor() { super("tvgame", 16, 9, { outline: false }); }
  body({ frame = 0 }) {
    let g = R(0, 0, 16, 9, "#4fa3e8") + R(0, 0, 16, 3, "#7fc4ff") + `<ellipse cx="4" cy="7" rx="5" ry="2.4" fill="#3f8f4f"/><ellipse cx="12" cy="7.4" rx="5" ry="2" fill="#2f7a3a"/>`
      + R(0, 7, 16, 2, "#8a5d3a") + Array.from({ length: 8 }, (_, k) => R(k * 2, 7, 1.8, 0.6, "#51cf66")).join("") + R(3 + frame * 0.2, 2, 3, 1, "#fff") + R(10 - frame * 0.2, 1.4, 3.4, 1, "#fff");
    return g;
  }
}
ART.tvgame = new TvGameArt();

class HeroArt extends SvgArt {
  constructor() { super("hero", 2.4, 3.4, { outline: false }); }
  body({ frame = 0 }) { return R(0.4, 0, 1.6, 0.8, "#ff6b6b") + R(0.2, 0.8, 2, 1, "#f1c7a3") + R(0.2, 1.8, 2, 1, "#5aa9ff") + R(frame ? 0 : 0.4, 2.8, 0.7, 0.6, "#3a3a48") + R(frame ? 1.8 : 1.4, 2.8, 0.7, 0.6, "#3a3a48"); }
}
ART.hero = new HeroArt();

ART.console = new StaticArt("console", 14.6, 5.4, `<rect x="0" y="0" width="9" height="2.6" rx=".6" fill="#2a2a33"/>` + R(0.6, 0.6, 3, 0.5, "#51cf66") + R(6.6, 0.6, 1.6, 1.2, "#3d3d4a")
  + `<path fill="none" stroke="#1c1c24" stroke-width=".4" d="M9 1.6Q11 2 11.4 3.6"/><rect x="10.2" y="3.4" width="4.4" height="2" rx=".9" fill="#3d3d4a"/>` + R(10.8, 4, 0.8, 0.8, "#fbaa08") + R(13, 4, 0.8, 0.8, "#ff6b6b"));
