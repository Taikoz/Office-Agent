// The arcade cabinet: attract mode, or a shoot'em up while someone plays.

import { hub } from "../hub.js";
import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class ArcadeActivity extends Activity {
  // at the VR station (items/gadgets.js): the headset on, the arms up in the virtual world
  dress(l, opts, t) { const it = l.spot?.uid && hub.itemByUid(l.spot.uid); return it?.type === "vrstation" ? { ...opts, hat: "vr", arms: Math.floor(t / 700) % 2 ? "up" : "down", back: false } : opts; }
  furniture(t) {
    const on = this.users() > 0;
    return [{ y: 70, draw: () => ART.arcade.draw(350, 34, { frame: Math.floor(t / (on ? 250 : 600)) % 2, playing: on }) }];
  }
}
new ArcadeActivity({ id: "arcade", label: "joue à l'arcade", icon: "🕹️", task: "Joue à l'arcade",
  pose: { arms: "reach", back: true }, fx: { ennui: -3 }, serves: ["fun"], sport: true,
  chief: { fx: { ennui: -20 }, line: "Une partie 🎮" },
  lines: ["Nouveau record !", "Encore une pièce…"], want: { label: "Battre son record à l'arcade", pay: 60, pts: 50 } });
