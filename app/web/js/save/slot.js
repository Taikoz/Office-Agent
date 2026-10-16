// What the game keeps in this browser. Each piece of state is a SaveSlot: its key (office-*), its defaults, its version
// and the migrations from older versions. A slot reads itself once (defaults merged in), and writes on save(); in demo
// mode nothing is read or written. Every slot is listed in SaveSlot.all: the save file (save/file.js) collects them.
//
//   SaveSlot   an object or a list (the wallet, the build, the friendships…)
//   └─ Flag    an on/off preference (sound, focus, notifications…)

export class SaveSlot {
  static all = new Map();  // key → slot
  static get(key) { return SaveSlot.all.get(key); }

  // version: bumped when the shape changes, with migrations[n](old) turning version n - 1 into n;
  // live: changed in place without save() (moodlets, wants): written when the game goes to the save file
  constructor(key, defaults, { version = 1, migrations = {}, live = false } = {}) {
    Object.assign(this, { key, defaults, version, migrations, live });
    this.data = this.load();
    SaveSlot.all.set(key, this);
  }
  static copy(v) { return v && typeof v === "object" ? structuredClone(v) : v; }
  static isObject(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  // the stored value as parsed JSON, undefined when there is none (or in demo, or storage blocked)
  read() {
    if (DEMO) return undefined;
    try { const raw = localStorage.getItem(this.key); return raw === null ? undefined : JSON.parse(raw); } catch (_) { return undefined; }
  }
  load() {
    let v = this.read();
    if (v === undefined) return SaveSlot.copy(this.defaults);
    const from = SaveSlot.isObject(v) && v._v ? v._v : 1;
    for (let n = from + 1; n <= this.version; n++) v = this.migrations[n] ? this.migrations[n](v) : v;
    if (SaveSlot.isObject(v)) delete v._v;
    return SaveSlot.isObject(this.defaults) && SaveSlot.isObject(v) ? { ...SaveSlot.copy(this.defaults), ...v } : v;
  }
  // writes `value` (by default the slot's data; a new object replaces it)
  save(value = this.data) {
    this.data = value;
    if (DEMO) return;
    const out = this.version > 1 && SaveSlot.isObject(value) ? { ...value, _v: this.version } : value;
    try { localStorage.setItem(this.key, JSON.stringify(out)); } catch (_) { /* storage blocked: kept for this page only */ }
  }
  static flushLive() { for (const s of SaveSlot.all.values()) if (s.live) s.save(); }
}
