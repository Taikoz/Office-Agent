// The ping-pong table: paddles left on it when nobody plays, a ball going back and forth between two players.

import { px } from "../core/core.js";
import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class PingpongActivity extends Activity {
  furniture(t) {
    const n = this.devs().length;
    return [{ y: 135, draw: () => {
      ART.pingpong.draw(194, 122, { idle: !n });
      if (n) { const k = (t / 700) % 2, p = k < 1 ? k : 2 - k; px(200 + p * 60, 132 - Math.sin(p * Math.PI) * 6, 1.5, 1.5, "#f7f7f7"); }
    } }];
  }
}
new PingpongActivity({ id: "pingpong", label: "joue au ping-pong", icon: "🏓", task: "Ping-pong", spots: [{ x: 188, y: 140 }, { x: 272, y: 140 }],
  pose: { arms: "type" }, fx: { ennui: -4, fatigue: 1, moral: 1 }, serves: ["fun", "social"], social: true, sport: true,
  chief: { fx: { ennui: -15, social: 6 }, line: "Échauffement 🏓" }, duel: [194, 124, 72, 28],
  lines: ["Smash !", "Let, on la rejoue.", "11-9, je mène !"], want: { label: "Jouer au ping-pong", pay: 60, pts: 50 } });
