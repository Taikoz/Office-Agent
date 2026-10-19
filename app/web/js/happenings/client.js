// A client visits the office: greet them (click) before they leave, and they may sign a bonus; nobody came: a
// disappointed client.

import { walkStep } from "../world/motion.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, DOOR, HAIRS, SKINS, TEAM, badge, chief, hash, px, text } from "../core/core.js";
import { bubble, drawPerson, headroom, stepOf } from "../world/scene.js";
import { chiefGo, chiefToOffice, officeRoute } from "../world/chief.js";
import { pick } from "../world/lounge.js";
import { sfx, toast } from "../sims/progress.js";
import { earn, fmtSim, saveWallet, wallet } from "../sims/money.js";
import { enqueue } from "../ui/actions.js";
import { addMoodlet } from "../sims/moods.js";
import { onMission } from "../sims/days.js";
import { Happening } from "./base.js";

class ClientVisit extends Happening {
  constructor() { super("client"); this.visitor = null; }
  get on() { return !!this.visitor; }
  start(t) {
    if (this.on) return;
    const look = { skin: SKINS[hash(String(t)) % SKINS.length], hair: HAIRS[(hash(String(t)) >> 3) % HAIRS.length], shirt: "#1c1c24", style: hash(String(t)) % 5, glasses: Math.random() < 0.4 };
    this.visitor = { x: DOOR.x, y: DOOR.y + 2, look, path: officeRoute(DOOR.x, DOOR.y + 2, 308, 110), phase: "in", until: t + 75000, say: "", sayUntil: 0 };
    toast("VISITE CLIENT 🤝", "Un client arrive au bureau", "Va l'accueillir (clic sur lui) avant qu'il ne reparte : il pourrait signer un bonus.");
    sfx("push");
  }
  step(dt, t) {
    const v = this.visitor; if (!v) return;
    if (v.path.length) {
      hub.routeAhead(v.path, v.x, v.y, "office");  // around the furniture (world/route.js)
      walkStep(v, v.path, dt, 0.04, "office");  // with some weight, making way (world/motion.js)
      if (!v.path.length && v.phase === "in") { v.phase = "wait"; v.say = "Bonjour, je viens voir l'avancement !"; v.sayUntil = t + 4000; }
      if (!v.path.length && v.phase === "out") this.visitor = null;
      return;
    }
    if (v.phase === "wait" && t > v.until) {  // nobody came
      v.phase = "out"; v.say = "Bon… je repasserai."; v.sayUntil = t + 3000; v.path = officeRoute(v.x, v.y, DOOR.x, DOOR.y + 2);
      addMoodlet(CHIEF_NAME, "client", "😬", "Client mécontent", -10, 60);
      toast("VISITE CLIENT", "Le client est reparti sans être accueilli", "Dommage, pas de bonus cette fois.");
    } else if (v.phase === "wait" && Math.random() < dt / 9000) { v.say = pick(["Hmm, joli bureau.", "C'est eux qui codent ?", "Je peux voir une démo ?", "Il y a quelqu'un ?"]); v.sayUntil = t + 2600; }
  }
  // the visitor, a briefcase, the time left, its bubble
  draw(t) {
    const v = this.visitor; if (!v) return;
    const walking = v.path.length > 0;
    drawPerson(v.x, v.y, v.look, { tux: true, smile: v.phase !== "out" || v.say.includes("signe"), frame: walking ? Math.floor(t / 180) : 0, step: walking ? stepOf(v, v.x, v.y) : null, back: walking && v.path[0].y < v.y, dir: walking ? [v.path[0].x - v.x, v.path[0].y - v.y] : null });
    px(v.x + 4, v.y - 9, 4, 3, "#5c3d27");  // briefcase
    badge(v.x, v.y + 2, "CLIENT", "#d6a77f");
    if (v.phase === "wait") { const left = Math.max(0, Math.ceil((v.until - t) / 1000)); text(`⏳ ${left} s`, v.x, v.y - 32, "#fbaa08", 4.4, "center"); }
    if (t < v.sayUntil) bubble(v.x, v.y - 24 - headroom(), v.say, "#f4f2ea", undefined, v.name);
  }
  hit(x, y) { const v = this.visitor; return !!v && Math.abs(x - v.x) <= 7 && y >= v.y - 22 && y <= v.y + 3; }
  // the chief goes to greet them: a bonus, and everyone is proud
  click() {
    const v = this.visitor; if (!v || v.phase !== "wait") return;
    const go = () => chiefGo({ x: v.x - 12, y: v.y }, () => {
      const vv = this.visitor; if (!vv || vv.phase !== "wait") return;
      const bonus = 300 + Math.round(Math.random() * 6) * 100;
      vv.phase = "out"; vv.say = "Excellent travail, je signe ! 🤝"; vv.sayUntil = performance.now() + 3500;
      setTimeout(() => { if (this.visitor === vv) vv.path = officeRoute(vv.x, vv.y, DOOR.x, DOOR.y + 2); }, 3000);
      chief.bubble = "Bienvenue ! Laissez-moi vous montrer."; chief.until = performance.now() + 3000;
      earn(bonus); wallet.log.unshift({ key: `client:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: "Client ravi : bonus", total: bonus }); saveWallet();
      addMoodlet(CHIEF_NAME, "client", "🤝", "Client conquis", 10, 60);
      for (const n of TEAM) if (onMission(n)) addMoodlet(n, "client", "😎", "Le client est content", 4, 60);
      toast("VISITE CLIENT", `Client conquis : +${fmtSim(bonus)}`, "Il a adoré la démo.");
      sfx("achievement");
    });
    enqueue("🤝", "Accueillir le client", () => { if (chief.room === "lounge") { chief.pendingOffice = go; chiefToOffice(); } else go(); }, true);
  }
}
new ClientVisit();
