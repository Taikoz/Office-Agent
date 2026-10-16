// An on/off preference of this browser. Older pages wrote "1" / "0" / "": still read the same way.

import { SaveSlot } from "./slot.js";

export class Flag extends SaveSlot {
  constructor(key, on = false) { super(key, on); this.data = !!this.data; }
  get on() { return this.data; }
  set(on) { this.save(!!on); return this.data; }
  toggle() { return this.set(!this.data); }
}
