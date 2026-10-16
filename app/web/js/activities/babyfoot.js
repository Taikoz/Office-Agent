// The baby-foot: the rods slide while two devs play; the one on the far side is seen from the back.

import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class BabyfootActivity extends Activity {
  furniture(t) {
    const on = this.devs().length > 0;
    return [{ y: 176, draw: () => { const sh = on ? Math.round(Math.sin(t / 160) * 2) / 2 : 0; ART.babyfoot.draw(298, 166, { shift: sh }); } }];
  }
  dress(l, opts) { return l.spot.y > 180 ? { ...opts, back: true } : opts; }  // the far side
}
new BabyfootActivity({ id: "babyfoot", label: "joue au baby-foot", icon: "⚽", task: "Baby-foot", spots: [{ x: 322, y: 162 }, { x: 322, y: 202, via: { x: 290, y: 202 } }],
  pose: { arms: "type" }, fx: { ennui: -4, moral: 1 }, serves: ["fun", "social"], social: true, sport: true,
  chief: { fx: { ennui: -15, social: 6 }, line: "Baby ! ⚽" }, duel: [298, 166, 48, 24],
  lines: ["Pas de pissette !", "Gamelle !", "Demi, on change ?"], want: { label: "Jouer au baby-foot", pay: 60, pts: 50 } });
