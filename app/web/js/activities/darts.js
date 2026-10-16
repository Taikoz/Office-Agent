// The dartboard on the wall: darts planted in it while someone plays, the arm up to throw now and then.

import { hash } from "../core/core.js";
import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class DartsActivity extends Activity {
  wall(t) { ART.dartboard.draw(296, 18, { darts: this.users() ? Math.floor(t / 1500) % 4 : 0 }); }
  dress(l, opts, t) { return (t / 1000 + hash(l.name)) % 3 < 0.5 ? { ...opts, arms: "up" } : opts; }
}
new DartsActivity({ id: "darts", label: "joue aux fléchettes", icon: "🎯", task: "Fléchettes", spots: [{ x: 303, y: 104 }],
  pose: { back: true }, fx: { ennui: -3 }, serves: ["fun"], sport: true,
  chief: { fx: { ennui: -15 }, line: "Aux fléchettes 🎯" }, duel: [293, 15, 20, 20],
  lines: ["180 !!!", "Dans le mille."] });
