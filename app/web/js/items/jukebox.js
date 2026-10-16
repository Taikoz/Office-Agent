// The jukebox: a click plays or stops the music (shop.js); its lights cycle and notes rise while it plays.

import { ctx, text } from "../core/core.js";
import { ART } from "../svg/base.js";
import { jukebox, toggleJukebox } from "../world/shop.js";
import { Item } from "./base.js";

class Jukebox extends Item {
  playing(it) { return jukebox.playing && jukebox.uid === it.uid; }
  state(it, t) { return this.playing(it) ? Math.floor(t / 300) % 3 : 3; }  // its light 0-2, 3: off
  thumbState() { return 3; }
  over(it, t) {
    if (!this.playing(it)) return;
    for (let k = 0; k < 2; k++) { const p = ((t / 1400) + k / 2) % 1; ctx.globalAlpha = 1 - p; text("♪", it.x + 8 + k * 6 + Math.sin(p * 6) * 2, it.y - 2 - p * 14, "#fbaa08", 5); ctx.globalAlpha = 1; }
  }
  pie(it) { const on = this.playing(it); return [["music", on ? "⏹" : "▶", on ? "Couper la musique" : "Lancer la musique"]]; }
  act(it, id) {
    if (id !== "music") return false;
    if (jukebox.playing && jukebox.uid !== it.uid) toggleJukebox();
    jukebox.uid = it.uid; toggleJukebox();
    return true;
  }
}
new Jukebox({ type: "jukebox", cat: "loisirs", name: "Jukebox", price: 2000, room: "any", w: 16, h: 22, desc: "Clic : lancer ou couper la musique (♪ SON).", art: ART.jukebox,
  styles: [{ id: "classique", name: "Classique", sw: "#b85905" }, { id: "neon", name: "Néon", sw: "#8f4fe0", map: { "#b85905": "#6b2fb8", "#d9741a": "#8f4fe0", "#7b380c": "#3a1a6b", "#5a2808": "#2a0f4f" } }] });
