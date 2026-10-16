// The rooms. Each is a Room: what it draws each frame (render), what is under the pointer (hit: an id the click acts
// on, panel.js), what a click on its empty floor does (the chief walks there). The room on screen is `view`
// (lounge.js setView); the room bar lists the open ones (construct.js). Rooms: js/rooms/*.js.

import { hub, provide } from "../hub.js";
import { view } from "../world/lounge.js";

export class Room {
  static all = new Map();  // id → room
  static get(id) { return Room.all.get(id); }
  static current() { return Room.all.get(view) || Room.all.get("office"); }
  constructor(id, label) { Object.assign(this, { id, label }); Room.all.set(id, this); }
  get open() { return true; }   // on the room bar
  render(_t) {}
  hit(_x, _y) { return null; }
  floorClick(_p) {}
  click(_p, _t) { return false; }  // a click the room takes itself (a game, the meeting room's board and TV): true
  step(_dt, _t) {}
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get Room() { return Room; } });
