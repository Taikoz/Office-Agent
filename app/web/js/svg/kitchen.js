// The kitchen: fridge and stove (buy mode, recolored by style), the dining table, stools, plates and the dish.

import { ART, R, SvgArt } from "./base.js";

class FridgeArt extends SvgArt {
  constructor() { super("fridge", 18, 38); }
  body({ on: open = false }) {
    const body = R(0, 0, 18, 38, "#f2f2ef") + R(16, 0, 2, 38, "#d8d8d2") + R(0, 13, 18, 0.8, "#b8b8b2") + R(0, 37.2, 18, 0.8, "#1c1c24", ' opacity=".3"');
    if (open) {  // door open: lit shelves and food
      return body + R(1, 1, 15, 11.4, "#eaf6ff") + R(1, 14.4, 15, 22, "#eaf6ff") + [5, 9, 19, 25, 31].map(y => R(1, y, 15, 0.6, "#bcd2e4")).join("")
        + R(2.4, 6.4, 3, 2.6, "#ff6b6b") + R(7, 6.8, 2.4, 2.2, "#51cf66") + R(10.6, 5.6, 2, 3.4, "#fbaa08") + R(3, 15.6, 4, 3.4, "#f7f7f7") + R(9, 16, 5, 3, "#d6a77f")
        + R(2.6, 21.6, 6, 3.4, "#e8b04c") + R(10.4, 22, 3, 3, "#b48cff") + R(3, 27.4, 10, 3.6, "#ff9f43") + R(0, 0, 2.4, 38, "#d8d8d2");
    }
    return body + R(2, 4, 1, 6, "#9a9aa6") + R(2, 16, 1, 10, "#9a9aa6") + R(8, 3, 2, 2, "#ff6b6b") + R(12, 6, 2, 2, "#fbaa08") + R(9, 17, 5, 6, "#fffbe6") + R(9.6, 18.4, 3.6, 0.5, "#9a9aa6") + R(9.6, 20, 2.6, 0.5, "#9a9aa6");
  }
}
ART.fridge = new FridgeArt();

class StoveArt extends SvgArt {
  constructor() { super("stove", 14, 24); }
  body({ on: hot = false }) {
    return R(0, 0, 14, 3, "#d8d8d2") + [2, 5.6, 9.2].map(x => R(x, 0.9, 1.6, 1.2, "#3a3a44")).join("")
      + R(0, 3, 14, 2, "#2a2a33") + R(1.4, 3.4, 4.4, 1, "#55556a") + R(8.2, 3.4, 4.4, 1, "#55556a")
      + R(0, 5, 14, 19, "#f2f2ef") + R(12.6, 5, 1.4, 19, "#d8d8d2") + R(2.5, 6.6, 9, 0.8, "#9a9aa6")
      + R(1.5, 8, 11, 12, "#d8d8d2") + R(3, 10, 8, 6, hot ? "#ff9f43" : "#3a3a44") + (hot ? R(3.6, 10.6, 6.8, 1.2, "#ffd43b") : R(3.6, 10.6, 2, 1, "#55556a"))
      + R(0.6, 23.2, 2, 0.8, "#1c1c24") + R(11.4, 23.2, 2, 0.8, "#1c1c24");
  }
}
ART.stove = new StoveArt();

// wooden table with a gingham tablecloth
class TableArt extends SvgArt {
  constructor() { super("table", 48, 15); }
  box({ w, h }) { return [0, 0, w, h]; }
  body({ w, h }) {
    return R(0, 0, w, h - 4, "#a0764e") + R(0, 0, w, 1, "#c79a6b") + R(0, h - 5, w, 1, "#6d5238") + R(2, h - 4, 2, 4, "#4a3826") + R(w - 4, h - 4, 2, 4, "#4a3826")
      + R(4, 2, w - 8, h - 8, "#f4f2ea") + R(4, 2, w - 8, 0.6, "#fff")
      + Array.from({ length: Math.floor((w - 8) / 4) }, (_, i) => R(4 + i * 4, 2, 2, h - 8, "#ff6b6b", ' fill-opacity=".35"')).join("")
      + [0, 1].map(j => R(4, 3 + j * 3, w - 8, 1.4, "#ff6b6b", ' fill-opacity=".3"')).join("");
  }
}
ART.table = new TableArt();

class StoolArt extends SvgArt {
  constructor() { super("stool", 8, 6); }
  body() { return R(0, 0, 8, 2, "#8a6a4a") + R(0, 0, 8, 0.6, "#b08b63") + R(1, 2, 1, 4, "#4a3826") + R(6, 2, 1, 4, "#4a3826"); }
}
ART.stool = new StoolArt();

class PlateArt extends SvgArt {
  constructor() { super("plate", 7, 3, { outline: false }); }
  body({ food, top, burnt = false, k = 1 }) {
    // k: 0 empty … 1 full
    const f = burnt ? "#3a2a1e" : food;
    return R(0, 1, 7, 2, "#f7f7f7") + R(1, 0.4, 5, 0.8, "#dadada") + (k > 0 ? R(1.6, 0, 3.8 * k, 1.4, f) + (burnt ? "" : R(2.4, 0, 1, 0.8, top)) : "");
  }
}
ART.plate = new PlateArt();

class DishArt extends SvgArt {
  constructor() { super("dish", 14, 6); }
  body({ food, top, burnt = false, n, max }) {
    const f = burnt ? "#3a2a1e" : food, k = n / max;
    return R(0, 3, 14, 3, "#dadada") + R(1, 2, 12, 1.4, "#f7f7f7") + R(0, 5.4, 14, 0.6, "#9aa3b5")
      + (n ? R(2, 3 - 2.4 * k, 10, 2.4 * k + 0.4, f) + (burnt ? R(4, 2, 2, 1, "#111") : R(3.4, 3 - 2.4 * k, 1.4, 1, top) + R(7.5, 3.4 - 2.4 * k, 1.4, 1, top) + R(9.6, 3 - 2.4 * k, 1, 1, top)) : "");
  }
}
ART.dish = new DishArt();
