// The armchair by the bookshelf: someone reads there (a red book in hand).

import { px } from "../core/core.js";
import { SPRITES } from "../svg/sprites.js";
import { Activity } from "./base.js";

class ReadActivity extends Activity {
  furniture() { return [{ y: 85, draw: () => SPRITES.armchair.draw(250, 78) }]; }
  after(l) { px(l.x - 3, l.y - 9, 6, 3.5, "#ff6b6b"); }
}
new ReadActivity({ id: "read", label: "lit dans le fauteuil", icon: "📖", task: "Lit", spots: [{ x: 260, y: 92 }],
  pose: { seated: true }, fx: { ennui: -1, fatigue: -2 }, serves: ["energie", "fun"],
  chief: { fx: { fatigue: -10, ennui: -6 }, line: "Un peu de lecture 📖" }, area: [240, 28, 34, 66],
  lines: ["Ce livre sur le DDD est top.", "Un chapitre et j'y retourne."], want: { label: "Lire dans le fauteuil", pay: 40, pts: 40 } });
