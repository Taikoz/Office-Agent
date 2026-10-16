// The screen of a mini-game in progress (js/games/): not on the room bar; Échap gives up (panel.js).

import { hub } from "../hub.js";
import { MiniGame, match } from "../games/base.js";
import { Room } from "./base.js";

class GameRoom extends Room {
  constructor() { super("game", "🎮 Partie"); }
  get open() { return false; }
  game() { return match && MiniGame.get(match.skin); }
  step(dt, t) { if (match) this.game().step(match, dt, t); }
  render(t) { if (match) { this.game().render(match, t); hub.drawNetOverlay?.(t); } }  // the cheers of a network duel (games/online.js)
  click(p, t) { if (match) this.game().click(match, p, t); return true; }
}
new GameRoom();
