// The jukebox: a click plays the music, the next ones change the station, then it stops (shop.js, world/ambience.js);
// its lights cycle and notes rise while it plays.

import { hub } from "../hub.js";
import { ctx, text } from "../core/core.js";
import { STATIONS, jukebox, pressJukebox } from "../world/shop.js";
import { Item } from "./base.js";

class Jukebox extends Item {
  playing(it) { return jukebox.playing && jukebox.uid === it.uid; }
  state(it, t) { return this.playing(it) ? Math.floor(t / 300) % 3 : 3; }  // its light 0-2, 3: off
  thumbState() { return 3; }
  over(it, t, G) {
    if (!this.playing(it)) return;
    const [x0, y0, x1, y1] = this.footprint(it);
    for (let k = 0; k < 2; k++) { const p = ((t / 1400) + k / 2) % 1; ctx.globalAlpha = 1 - p; G.put(0, 0, (x0 + x1) / 2, (y0 + y1) / 2, 32 + p * 14, () => text("♪", -3 + k * 6 + Math.sin(p * 6) * 2, 0, "#fbaa08", 5)); ctx.globalAlpha = 1; }
  }
  pie(it) { const on = this.playing(it), last = jukebox.station >= STATIONS.length - 1; return [["music", on ? (last ? "⏹" : "⏭") : "▶", on ? (last ? "Couper la musique" : "Station suivante") : "Lancer la musique"]]; }
  perform(it, id) {
    if (id !== "music") return false;
    const st = pressJukebox(it);
    hub.toast("JUKEBOX", st || "Musique coupée", st ? "Clic encore : station suivante." : "");
    return true;
  }
}
new Jukebox({ type: "jukebox", cat: "electronique", name: "Jukebox", price: 2000, room: "any", w: 16, d: 12, rots: 2, art: "isojukebox", desc: "Clic : lancer la musique, changer de station (jazz, synthwave, chiptune), couper.",
  styles: [{ id: "classique", name: "Classique", sw: "#b85905" }, { id: "neon", name: "Néon", sw: "#8f4fe0", map: { "#b85905": "#6b2fb8", "#d9741a": "#8f4fe0", "#7b380c": "#3a1a6b", "#5a2808": "#2a0f4f" } }] });
