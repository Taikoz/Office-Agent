// Seasons and events: birthday cake, Halloween (pumpkins, cobweb, bat), Christmas tree, the galette and its crown.

import { ART, R, StaticArt, SvgArt } from "./base.js";

class CakeArt extends SvgArt {
  constructor() { super("cake", 20, 16); }
  body({ flame = false }) {
    return R(1, 9, 18, 1.6, "#8a6a4a") + R(3, 10.6, 1.6, 5, "#6d5238") + R(15.4, 10.6, 1.6, 5, "#6d5238")
      + `<rect x="4" y="3.6" width="12" height="5.6" rx="1" fill="#f4c2d7"/>` + `<path fill="#fff" d="M4 4.6h12v-0.6q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0q-1 1.4 -2 0z"/>`
      + `<rect x="6" y="1" width="8" height="2.8" rx=".6" fill="#f7f7f7"/>` + [7, 10, 12.6].map((x, i) => `<circle cx="${x}" cy="6.6" r=".55" fill="${["#ff6b6b", "#5aa9ff", "#51cf66"][i]}"/>`).join("")
      + R(9.6, -1.6, 0.8, 2.8, "#5aa9ff") + `<path fill="${flame ? "#ffd43b" : "#ff9f43"}" d="M10 ${flame ? -4.4 : -3.8}Q11 -2.6 10 -1.8Q9 -2.6 10 ${flame ? -4.4 : -3.8}z"/>`;
  }
}
ART.cake = new CakeArt();

class PumpkinArt extends SvgArt {
  constructor() { super("pumpkin", 10, 8.6); }
  body({ glow = false }) {
    const g = glow ? "#ffd43b" : "#ffe680";
    return `<ellipse cx="5" cy="5" rx="4.8" ry="3.6" fill="#e8741c"/><ellipse cx="3" cy="5" rx="1.6" ry="3.4" fill="#f08a2c"/><ellipse cx="7" cy="5" rx="1.6" ry="3.4" fill="#d9661a"/>`
      + R(4.4, 0, 1.2, 1.8, "#3f7a2a") + `<path fill="${g}" d="M2.4 3.6h1.6l-.8 1.2zM6 3.6h1.6l-.8 1.2zM2.6 6.2h4.8l-.6 1h-.8l-.4-.5-.4.5h-.8l-.4-.5-.4.5h-.8z"/>`;
  }
}
ART.pumpkin = new PumpkinArt();

ART.cobweb = new StaticArt("cobweb", 14, 14, `<path fill="none" stroke="#d5d5e0" stroke-width=".35" d="M0 0L14 14M0 0L14 5M0 0L5 14M0 4Q2 2 4 0M0 8Q4.6 4.6 8 0M0 12Q7 7 12 0"/>`, { outline: false });

class BatArt extends SvgArt {
  constructor() { super("bat", 8, 3.6); }
  body({ up = false }) { return `<path fill="#1c1c24" d="M3 1.6h2v1.6H3zM3 2Q1.5 ${up ? 0 : 3} 0 ${up ? 0.6 : 2.6}Q1 2 3 2.8zM5 2Q6.5 ${up ? 0 : 3} 8 ${up ? 0.6 : 2.6}Q7 2 5 2.8z"/>` + R(3.4, 2, 0.4, 0.4, "#ff6b6b") + R(4.2, 2, 0.4, 0.4, "#ff6b6b"); }
}
ART.bat = new BatArt();

class TreeArt extends SvgArt {
  constructor() { super("tree", 16, 26); }
  body({ blink = 0 }) {
    const lights = ["#ff6b6b", "#5aa9ff", "#ffd43b", "#51cf66", "#ff6b9a", "#ffffff"];
    return `<path fill="#2f7a3a" d="M8 1L14 9H11L16 16H12L17 23H-1L4 16H0L5 9H2z"/><path fill="#3f9e4f" d="M8 1L11 5L8 9L5 5zM8 9L12 14L8 16L4 14zM8 16L13 21H3z" opacity=".6"/>`
      + R(6.8, 23, 2.4, 3, "#6d4a2e") + `<path fill="#ffd43b" d="M8 -1.4l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z"/>`
      + [[6, 7], [10, 8], [4, 13], [12, 13], [7, 15], [2, 20], [14, 20], [9, 19.6]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r=".7" fill="${(i + blink) % 2 ? lights[i % 6] : "#1f4a2a"}"/>`).join("");
  }
}
ART.tree = new TreeArt();

ART.galette = new StaticArt("galette", 12, 4.6, `<ellipse cx="6" cy="2.4" rx="6" ry="2.2" fill="#d9a441"/><ellipse cx="6" cy="1.8" rx="5.2" ry="1.6" fill="#e8bd5a"/><path fill="none" stroke="#b07a20" stroke-width=".3" d="M2 1.6Q6 0 10 1.6M2.6 2.6Q6 1 9.4 2.6"/>`);

ART.crown = new StaticArt("crown", 6, 4, `<path fill="#ffd43b" d="M0 4V0.8L1.6 2.4L3 0L4.4 2.4L6 0.8V4z"/>` + R(0, 3.2, 6, 0.8, "#e0a800") + `<circle cx="3" cy="2.6" r=".55" fill="#ff6b6b"/>`);
