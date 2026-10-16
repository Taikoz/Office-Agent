// The break room games and furniture: arcade, ping-pong, baby-foot, darts, TV show, the beanbag rug, the tournament
// slate, karaoke, board game.

import { ART, R, SvgArt } from "./base.js";

// arcade cabinet: blinking marquee, attract mode or a shoot'em up when someone plays, joystick, buttons, coin door
class ArcadeArt extends SvgArt {
  constructor() { super("arcade", 22, 36); }
  body({ frame = 0, playing = false }) {
    const on = frame % 2;
    let g = `<path fill="#3b1d6e" d="M1 4L3 0H19L21 4V36H1z"/>` + R(1, 4, 2, 32, "#2a1450") + R(19, 4, 2, 32, "#2a1450")
      + `<path fill="#ff6b9a" d="M1 9l2 -1v9l-2 1zM21 9l-2 -1v9l2 1z"/>` + R(3, 0.6, 16, 4.4, on ? "#fbaa08" : "#de8001");
    for (let i = 0; i < 6; i++) g += R(4 + i * 2.6, 1.4, 1.2, 1.2, (i + on) % 2 ? "#fff3b0" : "#ff6b6b");
    g += R(3, 5, 16, 12.6, "#0a0a12") + R(4, 6, 14, 10.4, playing ? "#0b1640" : "#10102a");
    if (playing) {  // shoot'em up: ship, shots, enemies
      g += `<path fill="#51cf66" d="M${9 + on} 15l1.4 -1.6 1.4 1.6z"/>` + R(10.2 + on, 11 - on, 0.4, 1.4, "#fff3b0") + R(10.2 + on, 8 + on, 0.4, 1.2, "#fff3b0");
      for (let i = 0; i < 4; i++) g += R(5.4 + i * 3 + on * 0.6, 7, 1.6, 1.1, i % 2 ? "#ff6b6b" : "#b48cff");
    } else {  // attract mode: invaders marching, INSERT COIN blinking
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g += R(5.6 + i * 3 + on * 0.6, 7.2 + j * 2.2, 1.6, 1.1, j ? "#5aa9ff" : "#51cf66");
      if (on) g += R(6, 13.6, 10, 1, "#fbaa08");
    }
    g += R(4, 6, 14, 0.6, "#ffffff", ' fill-opacity=".15"');
    g += `<path fill="#4a2a8a" d="M1 18H21L22 22H0z"/>` + R(5, 18.6, 1, 2, "#1c1c24") + `<circle cx="5.5" cy="18.6" r="1.1" fill="#ff3b3b"/>`
      + `<circle cx="13" cy="20" r=".9" fill="#fbaa08"/><circle cx="15.6" cy="20" r=".9" fill="#5aa9ff"/><circle cx="18" cy="20" r=".9" fill="#51cf66"/>`;
    g += R(7, 24, 8, 7, "#2a1450") + R(8.4, 25.2, 1.4, 2.6, on ? "#ff3b3b" : "#a32020") + R(12.2, 25.2, 1.4, 2.6, on ? "#ff3b3b" : "#a32020") + R(1, 34, 20, 2, "#1c1c24");
    return g;
  }
}
ART.arcade = new ArcadeArt();

// ping-pong table: green top with lines, net, legs; paddles left on the table when nobody plays
class PingpongArt extends SvgArt {
  constructor() { super("pingpong", 72, 28); }
  body({ idle = true }) {
    let g = R(6, 19, 2, 9, "#3a3a48") + R(64, 19, 2, 9, "#3a3a48") + R(30, 19, 2, 8, "#3a3a48") + R(40, 19, 2, 8, "#3a3a48")
      + R(2, 4, 68, 15, "#1f8a5a") + R(2, 19, 68, 2.6, "#156b45") + R(2, 4, 68, 0.6, "#f7f7f7") + R(2, 18.4, 68, 0.6, "#f7f7f7")
      + R(2, 4, 0.6, 15, "#f7f7f7") + R(69.4, 4, 0.6, 15, "#f7f7f7") + R(2, 11.2, 68, 0.4, "#f7f7f7", ' fill-opacity=".8"');
    g += R(35.6, 1, 0.8, 18, "#e0e0ea") + R(35.2, 1, 1.6, 2.4, "#3a3a48") + R(35.2, 17, 1.6, 2.4, "#3a3a48");
    for (let i = 0; i < 8; i++) g += R(35.7, 3 + i * 2, 0.6, 0.3, "#9aa0b2");
    if (idle) g += `<ellipse cx="14" cy="9" rx="2.2" ry="1.8" fill="#d64545"/>` + R(15.6, 8.6, 3, 0.8, "#8a6a4a") + `<ellipse cx="56" cy="14" rx="2.2" ry="1.8" fill="#1c1c24"/>` + R(52.4, 13.6, 3, 0.8, "#8a6a4a") + `<circle cx="22" cy="15" r=".8" fill="#fff"/>`;
    return g;
  }
}
ART.pingpong = new PingpongArt();

// baby-foot seen from above: wooden cabinet, striped field, goal boxes, 8 rods in the real order
// (red: goalkeeper, defence, midfield, attack; blue the mirror), men sliding when played; handles on each team's side
export const FOOT_LINEUP = [["#d64545", 1], ["#d64545", 2], ["#2f6ad6", 3], ["#d64545", 5], ["#2f6ad6", 5], ["#d64545", 3], ["#2f6ad6", 2], ["#2f6ad6", 1]];

class BabyfootArt extends SvgArt {
  constructor() { super("babyfoot", 48, 24); }
  body({ shift = 0 }) {
    const SP = { 1: [0], 2: [-4.4], 3: [-5.2, 0, 5.2], 5: [-6.6, -3.3, 0, 3.3, 6.6] };
    SP[2].push(4.4);
    let g = R(0, 0.6, 48, 22.8, "#8a5d3a") + R(0, 0.6, 48, 1, "#a8774c") + R(0, 21.4, 48, 2, "#6d4a2e");
    for (let i = 0; i < 8; i++) g += R(2 + i * 5.5, 2.4, 5.5, 17.6, i % 2 ? "#2b9240" : "#2f9e44");
    const line = ' stroke="#f7f7f7" stroke-width=".35"';  // R() already writes fill="none": a second fill makes the SVG invalid
    g += R(2, 2.4, 44, 17.6, "none", line) + R(23.85, 2.4, 0.3, 17.6, "#f7f7f7") + `<circle cx="24" cy="11.2" r="2.6" fill="none"${line}/>`
      + R(2, 7.6, 3.6, 7.2, "none", line) + R(42.4, 7.6, 3.6, 7.2, "none", line)
      + R(0.4, 8.4, 1.6, 5.6, "#14141c") + R(46, 8.4, 1.6, 5.6, "#14141c") + R(0.4, 8.4, 1.6, 0.5, "#3a3a46") + R(46, 8.4, 1.6, 0.5, "#3a3a46");
    for (let k = 0; k < 5; k++) g += `<circle cx="${20.6 + k * 1.7}" cy="1.1" r=".55" fill="${k < 2 ? "#d64545" : "#f4efc9"}"/>`;  // score beads
    FOOT_LINEUP.forEach(([c, n], i) => {
      const x = 4.75 + i * 5.5, red = c === "#d64545", dy = (red ? shift : -shift) * 1.2;
      g += R(x - 0.25, -0.8, 0.5, 25.6, "#c9ccd6") + R(x - 0.25, -0.8, 0.15, 25.6, "#eef0f5");
      g += red ? R(x - 0.8, -2, 1.6, 1.8, "#1c1c24") : R(x - 0.8, 24.2, 1.6, 1.8, "#1c1c24");  // handle
      for (const o of SP[n]) {
        const y = 11.2 + o + dy;
        g += R(x - 0.8, y - 0.9, 1.6, 1.8, c) + `<circle cx="${x}" cy="${y}" r=".55" fill="#f1c7a3"/>`;
      }
    });
    return g;
  }
}
ART.babyfoot = new BabyfootArt();

// dartboard: black number ring with ticks, 20 segments, triple and double rings, bull, silver spider;
// darts (steel barrel, flight) planted in it while someone plays
class DartboardArt extends SvgArt {
  constructor() { super("dartboard", 14, 14); }
  body({ darts = 0 }) {
    const c = 7, P = (r, a) => `${(c + Math.cos(a) * r).toFixed(3)} ${(c + Math.sin(a) * r).toFixed(3)}`;
    const seg = (i, r0, r1, col) => {
      const a0 = (i * 18 - 99) * Math.PI / 180, a1 = a0 + Math.PI / 10;
      return `<path fill="${col}" d="M${P(r0, a0)}L${P(r1, a0)}A${r1} ${r1} 0 0 1 ${P(r1, a1)}L${P(r0, a1)}A${r0} ${r0} 0 0 0 ${P(r0, a0)}Z"/>`;
    };
    let g = `<g shape-rendering="geometricPrecision"><circle cx="${c}" cy="${c}" r="7.2" fill="#2a2a34"/><circle cx="${c}" cy="${c}" r="6.9" fill="#14141c"/>`;
    for (let i = 0; i < 20; i++) {
      const dark = i % 2 === 0;
      g += seg(i, 0.95, 3.5, dark ? "#1c1c24" : "#f4efc9") + seg(i, 3.5, 4.05, dark ? "#d64545" : "#2f9e44")
        + seg(i, 4.05, 5.45, dark ? "#1c1c24" : "#f4efc9") + seg(i, 5.45, 6, dark ? "#d64545" : "#2f9e44");
      const a = i * Math.PI / 10 - Math.PI / 2;
      g += i ? `<circle cx="${(c + Math.cos(a) * 6.45).toFixed(3)}" cy="${(c + Math.sin(a) * 6.45).toFixed(3)}" r=".17" fill="#e8e8f0"/>`
        : `<path fill="#f7f7f7" d="M${c - 0.5} 0.3h1v0.5h-1z"/>`;  // the 20 on top
    }
    g += `<circle cx="${c}" cy="${c}" r=".95" fill="#2f9e44"/><circle cx="${c}" cy="${c}" r=".42" fill="#d64545"/>`;
    g += `<g fill="none" stroke="#b8bcc8" stroke-width=".07" opacity=".8">${[3.5, 4.05, 5.45, 6].map(r => `<circle cx="${c}" cy="${c}" r="${r}"/>`).join("")}`;
    for (let i = 0; i < 20; i++) { const a = (i * 18 - 99) * Math.PI / 180; g += `<path d="M${P(0.95, a)}L${P(6, a)}"/>`; }
    g += "</g>";
    // darts: the tip is in the board, the barrel comes out toward the viewer, flight up and to the right
    [[7, 2.2], [9.2, 6.2], [5.6, 7.6]].slice(0, darts).forEach(([x, y]) => {
      const d = [0.78, -0.62], n = [0.62, 0.78], at = k => [x + d[0] * k, y + d[1] * k], pt = (k, w) => { const [a, b] = at(k); return `${(a + n[0] * w).toFixed(2)} ${(b + n[1] * w).toFixed(2)}`; };
      g += `<circle cx="${x}" cy="${y}" r=".22" fill="#0a0a10"/>`
        + `<path stroke="#c8ccd6" stroke-width=".55" stroke-linecap="round" d="M${pt(0.2, 0)}L${pt(1.5, 0)}"/>`
        + `<path stroke="#1c1c24" stroke-width=".3" d="M${pt(1.5, 0)}L${pt(2.3, 0)}"/>`
        + `<path fill="#fbaa08" d="M${pt(2.1, 0)}L${pt(2.7, 0.75)}L${pt(3.5, 0.55)}L${pt(3.3, 0)}Z"/>`
        + `<path fill="#c98500" d="M${pt(2.1, 0)}L${pt(2.7, -0.75)}L${pt(3.5, -0.55)}L${pt(3.3, 0)}Z"/>`;
    });
    return g + "</g>";
  }
}
ART.dartboard = new DartboardArt();

// what is on TV when someone watches: a little cartoon (sky, hills, a runner, the sun or the moon)
class TvShowArt extends SvgArt {
  constructor() { super("tvshow", 16, 9, { outline: false }); }
  body({ frame = 0 }) {
    const night = frame >= 2, x = 2 + (frame % 2) * 3 + (night ? 6 : 0);
    return R(0, 0, 16, 9, night ? "#1b2550" : "#7fc4ff") + `<ellipse cx="4" cy="9" rx="7" ry="3" fill="#3f9e4f"/><ellipse cx="13" cy="9.4" rx="6" ry="2.6" fill="#2f7a3a"/>`
      + `<circle cx="13" cy="2.4" r="1.4" fill="${night ? "#f4efc9" : "#ffd43b"}"/>` + R(x, 4.6, 1.4, 2.2, "#ff6b6b") + R(x + 0.2, 3.6, 1, 1, "#f1c7a3") + R(x + (frame % 2 ? 0 : 0.8), 6.8, 0.6, 0.8, "#1c1c24");
  }
}
ART.tvshow = new TvShowArt();

// the rug of the beanbag corner: navy, yellow diamonds, fringes
class CornerRugArt extends SvgArt {
  constructor() { super("cornerrug", 128, 62, { outline: false }); }
  box({ w = 128, h = 62 }) { return [0, 0, w, h]; }
  body({ w = 128, h = 62 }) {
    let g = R(0, 0, w, h, "#163a7a") + R(2, 2, w - 4, h - 4, "#1b4590") + R(4, 4, w - 8, h - 8, "none", ' stroke="#fbaa08" stroke-width=".8"');
    for (let x = 14; x < w - 8; x += 20) for (let y = 14; y < h - 8; y += 18) g += `<path fill="#fbaa08" fill-opacity=".85" d="M${x} ${y - 3}l3 3 -3 3 -3 -3z"/><path fill="#163a7a" d="M${x} ${y - 1.2}l1.2 1.2 -1.2 1.2 -1.2 -1.2z"/>`;
    for (let x = 1; x < w; x += 2.4) g += R(x, -1.6, 0.6, 1.6, "#e8dcb8") + R(x, h, 0.6, 1.6, "#e8dcb8");
    return g;
  }
}
ART.cornerrug = new CornerRugArt();

// the tournament: a slate in a wooden frame, chalk dust in the corner
class SlateArt extends SvgArt {
  constructor() { super("slate", 0, 0); }
  box({ w, h }) { return [0, 0, w + 2, h + 2]; }
  body({ w, h }) {
    return R(0, 0, w + 2, h + 2, "#8a5d3a") + R(0, 0, w + 2, 0.6, "#a8774c") + R(1, 1, w, h, "#24352c") + R(1, 1, w, h, "#2c4235", ' fill-opacity=".6"')
      + `<path fill="#ffffff" fill-opacity=".06" d="M${w * 0.6} 1h6l-10 ${h}h-6z"/>` + R(4, h - 1.4, 6, 0.8, "#e0e0e0", ' fill-opacity=".5"') + R(w - 8, h - 0.4, 6, 1.4, "#f2f2f2");
  }
}
ART.slate = new SlateArt();

// karaoke corner: a small stage, two speakers whose cones pulse, a screen with the lyrics scrolling, the mic stand
class KaraokeArt extends SvgArt {
  constructor() { super("karaoke", 46, 36); }
  body({ frame = 0, on = false }) {
    const pulse = on && frame % 2 ? 0.6 : 0;
    let g = R(0, 26, 46, 10, "#5b2a86") + R(0, 26, 46, 1.4, "#8a4fc0") + R(0, 34, 46, 2, "#3a1a58");  // stage
    for (let i = 0; i < 7; i++) g += `<circle cx="${3 + i * 6.6}" cy="30.6" r=".7" fill="${on && (i + frame) % 3 === 0 ? "#fbaa08" : "#ffd88a"}"/>`;  // stage lights
    const speaker = x => R(x, 8, 8, 18, "#1c1c24") + R(x + 0.6, 8.6, 6.8, 16.8, "#2b2b33")
      + `<circle cx="${x + 4}" cy="13" r="${2 + pulse * 0.5}" fill="#454552"/><circle cx="${x + 4}" cy="13" r="1" fill="#1c1c24"/>`
      + `<circle cx="${x + 4}" cy="20.4" r="${2.8 + pulse}" fill="#454552"/><circle cx="${x + 4}" cy="20.4" r="1.3" fill="#1c1c24"/>`;
    g += speaker(1) + speaker(37);
    g += R(12, 0, 22, 14, "#14141c") + R(13, 1, 20, 12, on ? "#1b2a6b" : "#0b0b14");  // screen
    if (on) {
      const lines = [[15, 4, 14], [16, 7, 12], [15, 10, 15]];
      lines.forEach(([x, y, w], i) => { g += R(x, y, w, 1, "#f7f7f7", ' fill-opacity=".55"'); if (i === frame % 3) g += R(x, y, w * (0.3 + 0.2 * frame), 1, "#fbaa08"); });
    } else g += R(17, 6, 12, 1.4, "#3a3a50");
    g += R(21, 14, 4, 2, "#2b2b33") + R(22.5, 16, 1, 10, "#2b2b33") + R(20.5, 25.4, 5, 0.8, "#2b2b33");  // screen foot
    if (!on) g += R(30, 15, 0.8, 11, "#9aa0ad") + `<circle cx="30.4" cy="14.6" r="1.1" fill="#2b2b33"/>` + R(28.4, 25.4, 4, 0.8, "#9aa0ad");  // the mic waits on its stand
    return g;
  }
}
ART.karaoke = new KaraokeArt();

// low table with a board game: board, pawns that move turn after turn, dice
class BoardgameArt extends SvgArt {
  constructor() { super("boardgame", 34, 14); }
  body({ frame = 0 }) {
    let g = R(0, 3, 34, 7, "#7a4b32") + R(0, 3, 34, 1, "#9b6544") + R(2, 10, 2, 4, "#5b3a20") + R(30, 10, 2, 4, "#5b3a20");
    g += R(7, 1.6, 20, 7, "#e9dcc0") + R(7.6, 2.2, 18.8, 5.8, "#f7f0dc");
    const cells = ["#c0392b", "#2f9e44", "#2c7ae0", "#fbaa08"];
    for (let i = 0; i < 9; i++) g += R(8 + i * 2.05, 2.4, 1.6, 1, cells[i % 4]) + R(8 + i * 2.05, 6.8, 1.6, 1, cells[(i + 2) % 4]);
    const pos = [[10 + frame * 3, 4.4, "#c0392b"], [24 - frame * 2.6, 5, "#2c7ae0"]];
    for (const [x, y, c] of pos) g += `<circle cx="${x}" cy="${y}" r=".9" fill="${c}"/>`;
    g += R(3, 4.4, 2, 2, "#f7f7f7") + `<circle cx="4" cy="5.4" r=".35" fill="#1c1c24"/>` + R(28.4, 5, 2, 2, "#f7f7f7") + `<circle cx="${29 + (frame % 2) * 0.8}" cy="${5.6 + (frame % 2) * 0.8}" r=".35" fill="#1c1c24"/>`;
    return g;
  }
}
ART.boardgame = new BoardgameArt();
