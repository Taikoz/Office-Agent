// The beanbags of the corner rug: two devs chat there.

import { SPRITES } from "../svg/sprites.js";
import { Activity } from "./base.js";

class ChatActivity extends Activity {
  furniture() { return [{ y: 180, draw: () => { SPRITES.beanbag.draw(50, 176); SPRITES.beanbag.draw(100, 176); } }]; }
}
new ChatActivity({ id: "chat", label: "discute sur le pouf", icon: "💬", task: "Papote", spots: [{ x: 59, y: 184, via: { x: 40, y: 184 } }, { x: 109, y: 184, via: { x: 125, y: 184 } }],
  pose: { seated: true }, fx: { fatigue: -2, ennui: -2, moral: 1 }, serves: ["social", "energie"], social: true,
  chief: { fx: { social: 20, ennui: -4 }, line: "On papote ? 💬" }, area: [50, 176, 70, 14],
  lines: ["Bon, on refait le monde ?", "T'as vu la dernière MR ?"] });
