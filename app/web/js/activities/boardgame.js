// The board game on the low table: two players, the pawns move turn after turn.

import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class BoardgameActivity extends Activity {
  furniture(t) {
    const n = this.users();
    return [{ y: 208, draw: () => ART.boardgame.draw(236, 196, { frame: n > 1 ? Math.floor(t / 2200) % 4 : 0 }) }];
  }
}
new BoardgameActivity({ id: "boardgame", label: "joue à un jeu de société", icon: "🎲", task: "Jeu de société", spots: [{ x: 252, y: 194, via: { x: 285, y: 194 } }, { x: 252, y: 218, via: { x: 285, y: 218 }, back: true }],
  pose: { seated: true }, fx: { ennui: -3, moral: 1 }, serves: ["social", "fun"], social: true,
  chief: { fx: { ennui: -12, social: 14 }, line: "Qui veut une partie ? 🎲" }, area: [236, 196, 34, 14],
  lines: ["Je prends la rue de la Paix.", "Échec et mat !", "Tu triches, là.", "À toi de jouer !", "Double six !"], want: { label: "Faire un jeu de société", pay: 60, pts: 60 } });
