// The break-room activities. Each one is an Activity: where people stand or sit (spots), their pose, what it does to
// the team (fx, crew.js; needs, sims.js) and to the chief, what is said there, the want it fulfills (wants.js), where
// the chief clicks to do it, and how it is drawn (its furniture, animated while someone uses it). They register in
// ACTS (js/activities/*.js), in the order the break room offers them; lounge.js puts the team on their spots.

import { hub, provide } from "../hub.js";
import { chief } from "../core/core.js";

export const ACTS = [];
export class Activity {
  // id; label: what a dev there does ("joue au ping-pong"); icon and task: the chief's action bar ("Ping-pong");
  // pose (drawPerson options); fx: per tick on the team (crew.js); serves: the needs it
  // fills, most first (sims.js); needs: per minute on a dev's needs; social: it raises the social need; sport: the
  // "sportif" trait enjoys it more (moods.js); chief: { fx per minute, line said when he goes }; duel: a game you
  // can challenge a dev to (duel.js); lines: chat;
  // want: { label, pay, pts } (wants.js)
  constructor(def) { Object.assign(this, { pose: {}, fx: {}, serves: [], lines: [], chief: { fx: {}, line: "" } }, def); ACTS.push(this); }
  static get(id) { return ACTS.find(a => a.id === id); }
  // its spots: those of the objects bought for it in the break room (items/*.js act, world/place.js spotsOf)
  get spots() {
    if (!hub.itemsIn) return [];
    return hub.itemsIn("lounge").filter(it => hub.defOf(it.type).act === this.id).flatMap(it => hub.spotsOf(it).map(s => ({ ...s, back: !!s.face && s.face[1] < 0 })));
  }
  // who is here now: the devs settled on a spot (not walking), and the chief
  devs() { return [...hub.loungers.values()].filter(l => l.spot?.act === this && !l.path.length); }
  chiefHere() { return chief.room === "lounge" && chief.lspot?.act === this && !chief.lpath.length; }
  users() { return this.devs().length + (this.chiefHere() ? 1 : 0); }
  /* ---------- drawing ---------- */
  wall(_t) {}                              // on the wall, behind everyone
  furniture(_t) { return []; }             // [{ y, draw }] sorted with the people by depth
  dress(_l, opts, _t) { return opts; }     // the pose of someone here, adjusted (frame, arms…)
  after(_l, _t) {}                         // drawn over someone here (a cup, a book, a mic)
}
export const inArea = (r, x, y) => r && x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get Activity() { return Activity; } });
