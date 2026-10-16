// Office incidents, solved by a click (a pure game: nothing touches the agents). Each kind is an Incident: when it
// may happen, what starting it does, how it is drawn with its "!" mark, where to click, what solving it does. At most
// two at once, a new one every 3 to 6 minutes; each solved one cheers the team up. Kinds: js/incidents/*.js.

import { hub, provide } from "../hub.js";
import { ents, px, text } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crewAdd } from "../sims/crew.js";

let incidentLog = new SaveSlot("office-events", { solved: 0 }).data;
export class Incident {
  static all = new Map();  // id → incident
  static next = performance.now() + 60000 + Math.random() * 120000;
  constructor(id) { this.id = id; this.on = false; Incident.all.set(id, this); }
  static get(id) { return Incident.all.get(id); }
  /* ---------- to override ---------- */
  weight() { return 1; }        // chances to be picked (0: not now)
  start(_t) { this.on = true; }
  draw(_t, _blink) {}
  hit(_x, _y) { return false; }
  solve(_t) { this.on = false; }
  /* ---------- shared ---------- */
  // the blinking "!" over it
  mark(x, y, blink) { if (blink) { px(x - 1.5, y - 6, 3, 4, "#fbaa08"); text("!", x, y - 6.4, "#081746", 4.5, "center"); } }
  // a problem solved by the chief (an incident, or the power back: happenings/power.js): the team cheers up
  static reward(title, body) {
    incidentLog.solved++; SaveSlot.get("office-events").save(incidentLog);
    for (const e of ents.values()) if (e.who && !e.leaving && !e.queued) crewAdd(e.who, { moral: 3 });
    hub.toast("RÉGLÉ ✓", title, `${body} (${incidentLog.solved} problème(s) réglé(s) au total)`); hub.sfx("verify");
  }
  /* ---------- all of them ---------- */
  static step(t) {
    if (hub.focusMode || t <= Incident.next) return;
    const all = [...Incident.all.values()];
    if (all.filter(i => i.on).length < 2) {
      const pool = all.filter(i => !i.on).flatMap(i => Array(i.weight()).fill(i));
      if (pool.length) { pool[Math.floor(Math.random() * pool.length)].start(t); hub.sfx("fail"); }
    }
    Incident.next = t + 180000 + Math.random() * 180000;
  }
  static drawAll(t) { const blink = Math.floor(t / 300) % 2; for (const i of Incident.all.values()) if (i.on) i.draw(t, blink); }
  static hitAt(x, y) { for (const i of Incident.all.values()) if (i.on && i.hit(x, y)) return `incident:${i.id}`; return null; }
  static solveId(id) { const i = Incident.get(id); if (i?.on) i.solve(performance.now()); }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get Incident() { return Incident; } });
