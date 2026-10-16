// The arcade cabinet: attract mode, or a shoot'em up while someone plays.

import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class ArcadeActivity extends Activity {
  furniture(t) {
    const on = this.users() > 0;
    return [{ y: 70, draw: () => ART.arcade.draw(350, 34, { frame: Math.floor(t / (on ? 250 : 600)) % 2, playing: on }) }];
  }
}
new ArcadeActivity({ id: "arcade", label: "joue à l'arcade", icon: "🕹️", task: "Joue à l'arcade", spots: [{ x: 361, y: 86 }],
  pose: { arms: "type", back: true }, fx: { ennui: -3 }, serves: ["fun"], sport: true,
  chief: { fx: { ennui: -20 }, line: "Une partie 🎮" }, area: [350, 34, 22, 36],
  lines: ["Nouveau record !", "Encore une pièce…"], want: { label: "Battre son record à l'arcade", pay: 60, pts: 50 } });
