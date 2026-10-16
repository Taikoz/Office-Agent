// A power cut: the office in the dark, black screens, lamps off; reset the breaker box on the wall (or the building's
// caretaker does it after 2 minutes).

import { CHIEF_NAME, DESKS, TEAM, ctx, cv, ents, px, text } from "../core/core.js";
import { Incident } from "../incidents/base.js";
import { burst, sfx, toast } from "../sims/progress.js";
import { hasDesk } from "../world/build.js";
import { activeMoodlets, addMoodlet, moodlets } from "../sims/moods.js";
import { Happening } from "./base.js";

class PowerCut extends Happening {
  static FUSE = { x: 213, y: 26 };  // the breaker box, on the office wall between the board and the window
  constructor() { super("power"); this.since = null; }
  get on() { return this.since !== null; }
  start(t) {
    if (this.on) return;
    this.since = t;
    for (const e of ents.values()) if (e.who && !e.leaving) { addMoodlet(e.who, "power", "😱", "Plus de courant", -6, 10); if (e.seated) { e.fxKind = "fail"; e.fxMsg = "😱 mon écran !"; e.fxUntil = t + 3000; } }
    toast("COUPURE DE COURANT ⚡", "Le bureau est dans le noir", "Clique sur le disjoncteur près de la porte pour le réarmer.");
    sfx("fail");
  }
  step(_dt, t) { if (this.on && t - this.since > 120000) this.fix(null); }
  fix(hero) {
    if (!this.on) return;
    const F = PowerCut.FUSE;
    this.since = null; burst(F.x + 4, F.y + 6, ["#ffd43b", "#fff7b0"], 14);
    for (const n of TEAM) moodlets[n] = activeMoodlets(n).filter(m => m.id !== "power");
    if (hero) { addMoodlet(hero, "hero", "🦸", "A rétabli le courant", 6, 30); Incident.reward("Courant rétabli", "Les écrans se rallument."); }
    else toast("COURANT RÉTABLI", "Le gardien a réarmé le disjoncteur", "");
  }
  // the breaker box (blinking during a cut), the darkness, black screens
  draw(t) {
    const F = PowerCut.FUSE;
    if (this.on) {
      ctx.fillStyle = "rgba(4, 4, 14, .55)"; ctx.fillRect(0, 0, cv.width, cv.height);
      for (const d of DESKS) if (hasDesk(DESKS.indexOf(d))) px(d.x - 8, d.y - 12, 16, 10, "#08080c");
    }
    px(F.x, F.y, 8, 12, "#8d929c"); px(F.x + 1, F.y + 1, 6, 10, "#5d6274"); px(F.x + 2, F.y + 3, 4, 2, this.on ? "#3a3a44" : "#51cf66");
    if (this.on && Math.floor(t / 300) % 2) { px(F.x + 2, F.y + 7, 4, 2, "#ff6b6b"); text("!", F.x + 4, F.y - 7, "#fbaa08", 5, "center"); }
  }
  hit(x, y) { const F = PowerCut.FUSE; return x >= F.x - 2 && x <= F.x + 10 && y >= F.y - 2 && y <= F.y + 14; }
  click() { if (this.on) this.fix(CHIEF_NAME); else toast("DISJONCTEUR", "Tout va bien", "Le courant passe."); }
}
new PowerCut();
