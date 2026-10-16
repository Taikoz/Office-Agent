// The karaoke stage: lyrics on the screen, speakers pulsing, notes rising; the singer holds the mic.

import { px, text } from "../core/core.js";
import { ART } from "../svg/base.js";
import { Activity } from "./base.js";

class KaraokeActivity extends Activity {
  furniture(t) {
    const on = this.users() > 0;
    return [{ y: 112, draw: () => {
      ART.karaoke.draw(346, 104, { frame: on ? Math.floor(t / 300) % 4 : 0, on });
      if (on && Math.floor(t / 600) % 2) text(["♪", "♫"][Math.floor(t / 1200) % 2], 356 + (Math.floor(t / 600) % 3) * 12, 106 - (t / 60) % 8, "#fbaa08", 5, "center");
    } }];
  }
  after(l) { px(l.x - 5, l.y - 17, 1.2, 4, "#2b2b33"); px(l.x - 5.4, l.y - 18.4, 2, 2, "#9aa0ad"); }
}
new KaraokeActivity({ id: "karaoke", label: "chante au karaoké", icon: "🎤", task: "Karaoké", spots: [{ x: 366, y: 132 }],
  pose: { arms: "up" }, fx: { ennui: -4, moral: 1 }, serves: ["fun", "social"], social: true,
  chief: { fx: { ennui: -18, social: 8 }, line: "🎤 Un, deux, un, deux…" }, area: [346, 104, 46, 36],
  lines: ["🎤 Libéréééée, délivréééée !", "🎵 I will survive !", "🎶 Encore une !", "🎤 Merci Agent Office !"], want: { label: "Chanter au karaoké", pay: 70, pts: 60 } });
