// The sofa in front of the TV: a cartoon plays while someone watches.

import { hub } from "../hub.js";
import { px } from "../core/core.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { Activity } from "./base.js";

class SofaActivity extends Activity {
  wall(t) {
    if (this.devs().length) { const f = Math.floor(t / 700) % 4; ART.tvshow.draw(77, 65, { frame: f }); }
    else px(77, 65, 16, 9, "#14141c");
    hub.woodSprite("tv", hub.decor.lounge.wood).draw(73, 64);
  }
  furniture() { return [{ y: 121, draw: () => SPRITES.sofa.draw(58, 110) }]; }
}
new SofaActivity({ id: "sofa", label: "regarde la télé", icon: "📺", task: "Regarde la télé", spots: [{ x: 72, y: 116 }, { x: 86, y: 116 }, { x: 100, y: 116 }],
  pose: { seated: true, back: true }, fx: { fatigue: -3, ennui: -1 }, serves: ["energie", "social"], social: true,
  chief: { fx: { fatigue: -15, social: 3 }, line: "Pause canapé 💤" }, area: [58, 110, 56, 16],
  lines: ["Ce film est nul.", "Mets la suite !", "Chut, c'est le meilleur passage."], want: { label: "Regarder la télé", pay: 40, pts: 40 } });
