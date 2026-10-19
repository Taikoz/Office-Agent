// More break-room activities, on the furniture of the catalog (items/catalog3.js): a game of pool (two players, one at
// each end, cue in hand), a game of chess (two players on the stools of the chess table), the piano (one player, the
// notes rising over the keys).

import { text } from "../core/core.js";
import { Activity } from "./base.js";

new Activity({ id: "billiard", label: "joue au billard", icon: "🎱", task: "Billard",
  pose: { arms: "reach" }, fx: { ennui: -3, moral: 1 }, serves: ["fun", "social"], social: true,
  chief: { fx: { ennui: -14, social: 10 }, line: "La 8 dans le coin, je l'annonce 🎱" },
  lines: ["La 8 dans le coin.", "Joli coup !", "J'ai raté la bande…", "Tu me laisses une chance ?", "Rayées ou pleines ?"], want: { label: "Faire un billard", pay: 60, pts: 60 } });

new Activity({ id: "chess", label: "joue aux échecs", icon: "♟️", task: "Échecs",
  pose: { seated: true }, fx: { ennui: -2, moral: 1, fatigue: 1 }, serves: ["fun", "social"], social: true,
  chief: { fx: { ennui: -10, social: 10 }, line: "Les blancs commencent ♟️" },
  lines: ["Échec.", "Je réfléchis…", "Le gambit de la dame, classique.", "Pat ?!", "Joli sacrifice."], want: { label: "Jouer aux échecs", pay: 50, pts: 50 } });

class PianoActivity extends Activity {
  // the notes, rising and fading over the player
  after(l, t) {
    for (let i = 0; i < 3; i++) {
      const k = ((t / 1400) + i / 3) % 1;
      text(["♪", "♫", "♩"][i], l.x - 4 + i * 4 + Math.sin(k * 6 + i) * 2, l.y - 38 - k * 12, `rgba(251,170,8,${(1 - k).toFixed(2)})`, 5, "center");
    }
  }
}
new PianoActivity({ id: "piano", label: "joue du piano", icon: "🎹", task: "Piano",
  pose: { seated: true, arms: "type" }, fx: { ennui: -3, moral: 2 }, serves: ["fun"],
  chief: { fx: { ennui: -14, moral: 4 }, line: "Un petit morceau 🎹" },
  lines: ["♪ La lettre à Élise…", "Un peu de ragtime ?", "J'ai appris ça au conservatoire.", "♪ Le thème de Tetris !"], want: { label: "Jouer du piano", pay: 50, pts: 50 } });
