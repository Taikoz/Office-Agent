// Objects of the buy mode (lamp, aquarium and its fish, jukebox, plant, poster, rugs, the chief's desk, the bowl),
// and the furniture of the other rooms (shelf, meeting room, terrace). A catalog entry gives its art: ART.lamp…;
// drawItem() passes { on, map } (map: the style's colors).

import { ART, R, StaticArt, SvgArt } from "./base.js";

class LampArt extends SvgArt {
  constructor() { super("lamp", 11, 46); }
  body({ on: lit = false }) {
    return `<ellipse cx="5.5" cy="45" rx="4.4" ry="1" fill="#33333f"/>` + R(4.8, 6, 1.4, 39, "#3d3d4a") + R(4.8, 6, 0.5, 39, "#55556a")
      + `<path fill="${lit ? "#ffe8a3" : "#f4efc9"}" d="M1.6 0h7.8l1.6 6.4H0z"/>` + R(0, 6, 11, 0.8, "#de8001") + (lit ? R(1.6, 0.6, 7.8, 0.6, "#fff7d6") : "");
  }
}
ART.lamp = new LampArt();

ART.aquarium = new StaticArt("aquarium", 26, 19, R(0, 13, 26, 6, "#6d5238") + R(0, 13, 26, 0.8, "#8a6a4a") + R(2, 15.4, 22, 0.5, "#5a4330")
  + R(0, 0, 26, 13.4, "#0d2a6e") + R(1, 1, 24, 11.4, "#3f8fe0") + R(1, 1, 24, 3, "#5aa9ff") + R(1, 10, 24, 2.4, "#d6b07f") + R(1, 10, 24, 0.5, "#e8c89a")
  + `<path fill="#3f9e4f" d="M4 10Q3 7 4.6 4.4Q5 7.4 5.4 10zM20 10Q21.4 6.6 19.6 3.8Q19 7 18.8 10z"/>`
  + R(11, 7.4, 4, 2.8, "#8d8aa0") + R(11.6, 6.4, 0.8, 1, "#8d8aa0") + R(13.6, 6.4, 0.8, 1, "#8d8aa0") + R(12.4, 8.4, 1.2, 1.8, "#3a3a48") + R(1, 1, 24, 0.5, "#d5eeff", ' opacity=".6"'));

class FishArt extends SvgArt {
  constructor() { super("fish", 4.4, 2.4, { outline: false }); }
  body({ color }) { return `<ellipse cx="1.6" cy="1.2" rx="1.6" ry="1" fill="${color}"/><path fill="${color}" d="M3 1.2l1.4-1.1v2.2z"/>` + R(0.6, 0.8, 0.5, 0.5, "#1c1c24"); }
}
ART.fish = new FishArt();

class JukeboxArt extends SvgArt {
  constructor() { super("jukebox", 16, 22); }
  body({ on: light = 3 }) {
    const glow = ["#ff6b6b", "#51cf66", "#5aa9ff", "#7b380c"][light];
    return `<path fill="#b85905" d="M0 8Q0 0 8 0Q16 0 16 8V22H0z"/><path fill="#d9741a" d="M1.4 8Q1.4 1.4 8 1.4Q14.6 1.4 14.6 8z"/>`
      + `<path fill="${glow}" d="M3 8Q3 3 8 3Q13 3 13 8z"/><circle cx="8" cy="7" r="2.6" fill="#1c1c24"/><circle cx="8" cy="7" r=".8" fill="#fbaa08"/>`
      + R(1.4, 9, 13.2, 1, "#e0e0ea") + R(2.4, 11, 11.2, 8, "#7b380c") + [0, 1, 2, 3, 4].map(k => R(3 + k * 2.2, 12, 1.2, 6, "#5a2808")).join("") + R(0, 20.4, 16, 1.6, "#5a2808");
  }
}
ART.jukebox = new JukeboxArt();

ART.bigplant = new StaticArt("bigplant", 16, 24, `<path fill="#b0603a" d="M3 17h10l-1.2 7H4.2z"/>` + R(2.2, 16, 11.6, 2, "#c9744a") + R(3, 16.8, 10, 0.6, "#4a3826")
  + [[8, 16, -6, -11], [8, 16, 5.6, -12], [8, 16, -2, -15], [8, 16, 7, -5], [8, 16, -7, -4]].map(([x, y, dx, dy], i) =>
    `<path fill="${i % 2 ? "#3f9e4f" : "#2f7a3a"}" d="M${x} ${y}Q${x + dx * 0.2} ${y + dy * 0.7} ${x + dx} ${y + dy}Q${x + dx * 0.8} ${y + dy * 0.3} ${x} ${y}Z"/>`
    + `<path fill="none" stroke="#5fbf6d" stroke-width=".3" d="M${x} ${y}Q${x + dx * 0.3} ${y + dy * 0.6} ${x + dx * 0.9} ${y + dy * 0.95}"/>`).join(""));

ART.poster = new StaticArt("poster", 13, 18, R(0, 0, 13, 18, "#f7f7f7") + R(1, 1, 11, 16, "#081746") + Array.from({ length: 7 }, (_, k) => R(1.6 + (k * 3.7) % 10, 2 + (k * 5.3) % 13, 0.5, 0.5, "#fff")).join("")
  + `<path fill="#e8e8f0" d="M6.5 3.4Q8.4 6 8.2 9.6H4.8Q4.6 6 6.5 3.4z"/><circle cx="6.5" cy="6.6" r=".9" fill="#5aa9ff"/>`
  + `<path fill="#ff6b6b" d="M4.8 8.2l-1.4 2.2h1.4zM8.2 8.2l1.4 2.2H8.2z"/><path fill="#fbaa08" d="M5.4 9.6h2.2l-1.1 2.8z"/>` + R(3.4, 13.6, 6.2, 1.6, "#fbaa08") + R(4.2, 14.1, 4.6, 0.6, "#081746"));

ART.bigrug = new StaticArt("bigrug", 150, 12, R(0, 0, 150, 12, "#fbaa08") + R(1, 1, 148, 10, "#163a7a") + R(2.4, 2.4, 145.2, 7.2, "#1b4590")
  + Array.from({ length: 12 }, (_, k) => `<circle cx="${8 + k * 12.2}" cy="6" r="1.5" fill="#fbaa08"/><circle cx="${8 + k * 12.2}" cy="6" r=".7" fill="#163a7a"/>`).join("")
  + R(2.4, 2.4, 145.2, 0.4, "#fbaa08") + R(2.4, 9.2, 145.2, 0.4, "#fbaa08"), { outline: false });

class RugArt extends SvgArt {
  constructor() { super("rug", 60, 16, { outline: false }); }
  body() {
    return R(0, 0, 60, 16, "#fbaa08") + R(1, 1, 58, 14, "#163a7a") + R(2.6, 2.6, 54.8, 10.8, "#1b4590")
      + Array.from({ length: 5 }, (_, k) => `<circle cx="${8 + k * 11}" cy="8" r="2" fill="#fbaa08"/><circle cx="${8 + k * 11}" cy="8" r=".9" fill="#163a7a"/>`).join("")
      + R(2.6, 2.6, 54.8, 0.4, "#fbaa08") + R(2.6, 13, 54.8, 0.4, "#fbaa08");
  }
}
ART.rug = new RugArt();

class ChiefDeskArt extends SvgArt {
  constructor() { super("chiefdesk", 34, 26); }
  body() {
    return R(0, 12, 34, 4, "#5c3d27") + R(0, 12, 34, 1, "#8a6a4a") + R(2, 16, 3, 10, "#4a3826") + R(29, 16, 3, 10, "#4a3826") + R(20, 16, 10, 8, "#4a3826")
      + R(7, 0, 20, 11, "#1c1c24") + R(8, 1, 18, 9, "#2e5d9e") + R(9, 2, 8, 1, "#fbaa08") + R(9, 4, 14, 0.8, "#d5eeff") + R(9, 6, 11, 0.8, "#d5eeff") + R(16, 11, 2, 1.4, "#1c1c24")
      + R(3, 10, 3, 2.4, "#f4f2ea") + R(10, 11, 12, 1, "#3a3a44");
  }
}
ART.chiefdesk = new ChiefDeskArt();

class BowlArt extends SvgArt {
  constructor() { super("bowl", 10, 5); }
  body({ on: full = false }) { return R(0, 2, 10, 3, "#d64545") + R(1, 2, 8, 0.8, "#ff6b6b") + (full ? R(2, 1, 6, 1.4, "#c9a24b") + R(3, 0.5, 1.2, 0.8, "#e0b85a") + R(6, 0.6, 1, 0.8, "#e0b85a") : R(2, 2.4, 6, 0.6, "#5a1f1f")); }
}
ART.bowl = new BowlArt();

// the achievements shelf (progress.js), as wide as asked
class ShelfArt extends SvgArt {
  constructor() { super("shelf", 0, 3.8); }
  box({ w }) { return [0, 0, w + 2, this.h]; }
  body({ w }) { return R(0, 0, w + 2, 1.6, "#8a6a4a") + R(0, 0, w + 2, 0.5, "#a88660") + `<path fill="#6d5238" d="M1.4 1.6h1.2l-1.2 2.2zM${w - 0.6} 1.6h1.2v2.2z"/>`; }
}
ART.shelf = new ShelfArt();
// (the meeting room and the terrace: svg/meeting.js, svg/terrace.js)

// a door of the break room to a built room (rooms/lounge.js): its frame, the leaf in the room's style (walnut with a
// glass strip for the meeting room, a glass door with the sky for the terrace), its plate; not built yet: work tape
class RoomDoorArt extends SvgArt {
  constructor() { super("roomdoor", 24, 48); }
  body({ room = "meeting", built = false }) {
    let g = R(0, 0, 24, 48, "#061238") + R(2, 2, 20, 46, room === "terrace" ? "#c9ccd6" : "#6d4a2e") + R(2, 2, 1, 46, "#ffffff", ' fill-opacity=".18"');
    if (room === "terrace") {  // glass, the sky behind, a push bar
      g += R(4, 4, 16, 40, "#8ec5ff") + R(4, 4, 16, 14, "#bfe3f5") + `<path fill="#ffffff" fill-opacity=".45" d="M6 5h3l-4 8v-3zM14 5h2l-6 12h-2z"/>` + R(4, 30, 16, 14, "#7fb8e8")
        + R(3, 24, 18, 1.6, "#8d929c") + R(3, 24, 18, 0.5, "#e0e3ea");
    } else {  // walnut with a glass strip and a steel handle
      g += R(5, 5, 14, 18, "#5c3d27") + R(5, 27, 14, 17, "#5c3d27") + R(10, 6, 4, 16, "#bfe3f5", ' fill-opacity=".8"') + R(17, 25, 3, 1.4, "#c9ccd6") + R(17, 25, 1, 3, "#c9ccd6");
    }
    if (!built) g += `<path fill="#fbaa08" d="M0 14l24 14v4L0 18zM0 32l24 -14v4L0 36z"/>` + `<path fill="#1c1c24" d="M4 16.3l3 1.8v4l-3 -1.8zM12 21l3 1.8v4l-3 -1.8zM20 25.7l3 1.8v2l-3 -1.8zM4 33.7l3 -1.8v4l-3 1.8zM12 29l3 -1.8v4l-3 1.8zM20 24.3l3 -1.8v2.6l-3 1.8z"/>`;
    return g;
  }
}
ART.roomdoor = new RoomDoorArt();
