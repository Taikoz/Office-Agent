// Random happenings during working hours, Sims style. Each kind is a Happening: whether it can happen now, what starting
// it does, how it lives (step), how it is drawn in the office, where to click and what the click does. One every 12 to
// 26 minutes, never twice the same at once. Kinds: js/happenings/*.js. ?event=power|client|pizza in the URL starts one
// a few seconds after loading (birthdays: birthdays.js).

import { hub, provide } from "../hub.js";
import { pick } from "../world/lounge.js";
import { focusMode } from "../ui/ux.js";
import { CLOCK_Q, workHours } from "../sims/days.js";

export class Happening {
  static all = new Map();  // id → happening
  static next = performance.now() + (8 + Math.random() * 10) * 60000;
  constructor(id) { this.id = id; Happening.all.set(id, this); }
  static get(id) { return Happening.all.get(id); }
  /* ---------- to override ---------- */
  get on() { return false; }   // happening now
  canStart() { return !this.on; }
  start(_t) {}
  step(_dt, _t) {}
  draw(_t) {}                  // in the office
  hit(_x, _y) { return false; }
  click() {}
  /* ---------- all of them ---------- */
  static stepAll(dt, t) {
    if (!focusMode && workHours() && t > Happening.next) {
      Happening.next = t + (12 + Math.random() * 14) * 60000;
      const kinds = [...Happening.all.values()].filter(h => h.canStart());
      if (kinds.length) pick(kinds).start(t);
    }
    for (const h of Happening.all.values()) h.step(dt, t);
  }
  static drawAll(t) { for (const h of Happening.all.values()) h.draw(t); }
  static hitAt(x, y) { for (const h of Happening.all.values()) if (h.hit(x, y)) return `happen:${h.id}`; return null; }
  static clickId(id) { Happening.get(id)?.click(); }
}
if (CLOCK_Q.has("event")) setTimeout(() => Happening.get(CLOCK_Q.get("event"))?.start(performance.now()), 4000);

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get Happening() { return Happening; } });
