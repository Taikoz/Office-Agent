// The office: the room, the issue board, the bought objects, the podium and the chief, the desks and the devs at
// work with their bubbles, the cat, the dog, the incidents and happenings, the effects over everything.

import { hub } from "../hub.js";
import { CAB, CHIEF_NAME, DESKS, W, badge, chief, clip, curSession, current, cv, ents, hash, px, selected, specialty, text, typeColor } from "../core/core.js";
import { ART } from "../svg/base.js";
import { bubble, drawBoard, drawCabinet, drawDesk, drawPerson, drawRoom, hitBoardPager } from "../world/scene.js";
import { crew, moodLine } from "../sims/crew.js";
import { CHIEF_LOOK, chiefWalk, drawConsole } from "../world/chief.js";
import { drawLaser } from "../world/fun.js";
import { Incident } from "../incidents/base.js";
import { nameTag } from "../world/shop.js";
import { cat, drawCat } from "../world/cat.js";
import { awaitingReview, isStuck, money } from "../core/data.js";
import { FRAME, FX_BG, SHELF, drawBell, drawBoss, drawFx } from "../sims/progress.js";
import { overBudget } from "../agents/budget.js";
import { ciFailed } from "../agents/ticket.js";
import { drawAlarm, drawCake, drawFloaters, hitBoss } from "../agents/events2.js";
import { collisionMap, shortFile } from "../agents/insight.js";
import { drawSeasonOver } from "../ui/ux.js";
import { drawCashFx } from "../sims/money.js";
import { drawBuyOverlay, drawChiefPc, drawRoomItems, hitItem } from "../world/build.js";
import { chiefPhrase } from "../world/chiefedit.js";
import { Happening } from "../happenings/base.js";
import { Room } from "./base.js";

class OfficeRoom extends Room {
  constructor() { super("office", "🏢 Bureau"); }
  render(t) {
    const session = curSession();
    drawRoom(t);
    drawBoard(session);
    drawRoomItems("office", t);
    hub.drawNight();
    // chief on his podium
    const ch = session?.chief;
    ART.podium.draw(210, 84.6);
    drawConsole(t);
    const asking = [...ents.values()].filter(e => e.asking && !e.path.length);
    if (chief.room === "office") {
      const onPodium = chief.at === "podium" && !chief.path.length, walking = chief.path.length > 0;
      const waving = onPodium && !ch?.question && (t < chief.wave || (ch && !ch.finished && ch.idle < 20));
      const gaming = chief.at === "console" && !chief.path.length, asleep = gaming && ch?.idle > 900;
      if (!(["pc", "chiefos"].includes(chief.at) && !walking)) drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, frame: Math.floor(t / (walking ? 180 : gaming ? 140 : 250)), smile: !asleep,
        arms: waving ? "baton" : gaming && !asleep ? "type" : chief.at === "coffee" && !chief.path.length ? "up" : "down", back: gaming || (walking && chief.path[0].y < chief.y), seated: gaming });
      if (chief.cup) { px(chief.x + 4, chief.y - 13, 2.5, 3, "#f4f2ea"); px(chief.x + 4, chief.y - 13, 2.5, 0.8, "#6d4a2e"); }
      text(CHIEF_NAME.toUpperCase(), chief.x, chief.y + (onPodium ? 7 : 2), "#fbaa08", 4.6, "center");
      const cx = chief.x, cy = chief.y + 2;
      let say = "";
      if (ch?.question) { bubble(cx, cy - 25, `? ${clip(ch.question.question, 38)}`, "#fbaa08", "#081746"); say = null; }
      else if (asking.length) say = asking.length > 1 ? `${asking.length} questions → à toi de trancher !` : "Question de l'équipe → à toi !";
      else if (t < (chief.until || 0)) say = chief.bubble;
      else if (!session) say = "Personne au bureau.";
      else if (chief.at === "coffee") say = "☕ petite pause";
      else if (gaming) say = asleep ? "zZz…" : (t / 1000) % 14 < 3 ? "GG !" : "🎮 appelle-moi si besoin";
      else if (ch.finished || ch.idle > 120) say = ch.idle > 900 ? "zZz…" : chiefPhrase() || "J'attends tes ordres.";  // his catchphrase (chiefedit.js)
      else if (ents.get("chief")?.agent.solo) say = `${ents.get("chief").who} est dessus 👍`;
      else if (say !== null) say = clip(ch.action, 40);
      if (say) bubble(cx, cy - 25, say);
    } else {  // gone to the break room: a note on the podium
      text("☕ en pause", 222, 78, "#fbaa08", 4.4, "center");
      if (ch?.question) bubble(222, 72, `? ${clip(ch.question.question, 38)}`, "#fbaa08", "#081746");
    }

    const byDesk = new Map([...ents.values()].filter(e => !e.leaving).map(e => [e.desk, e]));
    for (const d of DESKS) drawDesk(d, byDesk.get(d), t);
    drawChiefPc(t);
    drawCake(t);
    drawCabinet(t, cv.classList.contains("hover-store"));
    Incident.drawAll(t);  // js/incidents/
    drawCat(t);
    hub.drawDog(t);
    const order = [...ents.values()].sort((a, b) => a.y - b.y);
    for (const e of order) {
      if (e.queued) continue;  // still waiting outside
      const a = e.agent, f = Math.floor(t / 180);
      if (selected === a.id) {
        const bob = Math.sin(t / 200) * 1.5, mx = e.seated ? e.desk.x : e.x, my = e.seated ? e.desk.y - 30 : e.y - 34;
        px(mx - 3, my + bob, 6, 2, "#fbaa08"); px(mx - 2, my + 2 + bob, 4, 1.5, "#fbaa08"); px(mx - 1, my + 3.5 + bob, 2, 1.5, "#fbaa08");
      }
      if (e.seated) {
        const st = a.status;
        const stuck = isStuck(a), pulling = stuck && Math.floor(t / 700) % 2 === 0;  // pulls its hair out, on and off
        const shake = st === "blocked" || pulling ? Math.sin(t / 40) * 0.5 : 0;
        const celebrate = st === "done" && a.idle < 20;
        px(e.x - 6, e.y - 6, 12, 3, "#3a3a48");
        const party = t < (e.fxUntil || 0) && ["pass", "mr", "boss", "verify"].includes(e.fxKind);
        drawPerson(e.x + shake, e.y, e.look, { seated: true, back: true, arms: celebrate || party || pulling ? "up" : st === "working" ? "type" : "down", frame: f });
        if (a.game?.boss) drawBoss(e.desk.x - 28 + (t - (e.bossHitAt || 0) < 180 ? 2 : 0), e.desk.y + 10, a.game.boss, t, t - (e.bossHitAt || 0) < 500);
        if (e.fxKind === "mr" && t < e.fxUntil) drawBell(e.desk.x + 13, e.desk.y - 24, t);
        badge(e.desk.x, e.desk.y + 23, e.who ? nameTag(e.who) : specialty(a.type), typeColor(a.type));
        if (a.ticket) text(a.ticket, e.desk.x, e.desk.y + 29.5, "#d5eeff", 4.2, "center");
        let msg = "", bg = "#f4f2ea", fg = "#1c1c24";
        if (st === "working") msg = a.idle > 45 ? "… réfléchit" : clip(a.action, 34);
        else if (st === "blocked") { msg = clip(a.lastError || "bloqué", 34); bg = "#ff6b6b"; }
        else if (st === "done") { msg = "Livré ✓"; bg = "#51cf66"; }
        if (stuck) { msg = Math.floor(t / 5000) % 2 ? "🤯 ça tourne en rond…" : clip(a.action, 30); bg = "#ff9f43"; }
        else if (collisionMap.has(a.id) && Math.floor(t / 4000) % 2 === 0) { const c = collisionMap.get(a.id); msg = `😠 ${crew.ids[c.other.id] || "quelqu'un"} touche à ${clip(shortFile(c.file), 18)} !`; bg = "#ff9f43"; }
        else if (ciFailed(a) && Math.floor(t / 5000) % 2 === 0) { msg = "😩 la CI a cassé"; bg = "#ff6b6b"; fg = "#fff"; }
        else if (overBudget(a) && st === "working" && Math.floor(t / 6000) % 3 === 0) { msg = `💸 ${money(a.game.cost)} : budget dépassé`; bg = "#ff6b6b"; fg = "#fff"; }
        const waitsReview = awaitingReview(a, session);
        const mood = st !== "blocked" && !stuck && !waitsReview && moodLine(e, t);
        if (mood) { msg = mood; bg = "#d5eeff"; }
        if (t < (e.fxUntil || 0)) { msg = e.fxMsg; bg = FX_BG[e.fxKind] || bg; fg = e.fxKind === "fail" ? "#fff" : "#1c1c24"; }
        if (waitsReview) hub.drawReviewSign(e.desk.x + 12, e.desk.y - 20, t);
        else bubble(e.desk.x, e.desk.y - 16, msg, bg, fg);
      } else {
        const paused = !!e.pauseUntil, still = paused || !e.path.length;
        drawPerson(e.x, e.y, e.look, { frame: still ? 0 : f, back: ["pick", "file", "coffee", "standup", "pair"].includes(e.pose) || (!still && e.path[0].y < e.y),
          arms: e.pose === "pick" || e.pose === "file" ? "up" : "down" });
        if (e.errand && e.pose !== "file") {  // carries its papers to the MMX cabinet
          const n = Math.min(3, e.errand.items.length);
          for (let k = 0; k < n; k++) px(e.x + 3 + k * 0.8, e.y - 14 - k * 1.2, 5, 4, k % 2 ? "#fff7b8" : "#f4f2ea");
          if (!still) bubble(e.x, e.y - 24, `→ MMX : ${e.errand.label}`);
        } else if (e.cup) { px(e.x + 4, e.y - 13, 2.5, 3, "#f4f2ea"); px(e.x + 4, e.y - 13, 2.5, 0.8, "#6d4a2e"); }  // coffee cup
        else if (e.picked && !e.asking && !e.leaving && !still) px(e.x + 4, e.y - 13, 3.5, 3.5, "#fff7b8");  // carries its ticket
        if (e.pose === "coffee") bubble(e.x, e.y - 24, a.status === "blocked" ? "☕ je souffle un coup" : "☕ pause café", "#d6a77f");
        if (e.pose === "file") bubble(e.x, e.y - 24, e.errand?.pendingOnly ? `${e.errand.label} → à valider` : `Je range ${e.errand?.label || ""}`, "#51cf66");
        if (e.pose === "pick") bubble(e.x, e.y - 24, a.ticket ? `Je prends ${a.ticket}` : "Je prends ce ticket");
        if (e.pose === "alarm") bubble(e.x, e.y - 24, "🚨 faille critique !", "#ff6b6b", "#fff");
        if (e.pose === "cake" && Math.floor(t / 2500) % 3 === 0) bubble(e.x, e.y - 24, ["🎂 miam", "bravo !", "🎉"][hash(e.who || "") % 3], "#f4c2d7");
        if (e.pose === "pair" && Math.floor(t / 4000) % 3 === 0) bubble(e.x, e.y - 24, hub.pairBubble(e), "#b48cff");
        if (e.asking && !e.path.length) {
          bubble(e.x, e.y - 24, `? ${clip(a.question?.question || "question", 30)}`, "#fbaa08", "#081746");
          if (a.ticket) text(a.ticket, e.x, e.y + 7.5, "#d5eeff", 4.2, "center");
        }
        badge(e.x, e.y + 2, e.who ? nameTag(e.who) : specialty(a.type), typeColor(a.type));
      }
    }
    Happening.drawAll(t);  // power cut, client visit (js/happenings/)
    if (!ents.size && session) text("Aucun dev sur cette session — le chef travaille seul.", W / 2, 150, "#d5eeff", 5, "center");
    for (const e of ents.values()) if (!e.queued && !e.leaving) hub.drawEmotion(e.who, e.seated ? e.x + 10 : e.x, e.seated ? e.y - 12 : e.y - 25, t);
    if (chief.room === "office") hub.drawEmotion(CHIEF_NAME, chief.x, chief.y - (chief.at === "console" && !chief.path.length ? 18 : 25), t);
    drawFx(t);
    drawLaser(t);
    hub.drawDrag(t);
    drawFloaters(t);
    drawCashFx(t);
    drawSeasonOver(t);
    drawAlarm(t);
    drawBuyOverlay("office", t);
  }
  hit(x, y) {
    const pager = hitBoardPager(x, y);  // before people: a dev walking past the board must not hide its arrows
    if (pager) return pager;
    const hp = Happening.hitAt(x, y) || hub.hitDog(x, y); if (hp) return hp;  // client visit, breaker box (js/happenings/), the dog (pets.js)
    if (Math.abs(x - cat.x) <= 7 && y >= cat.y - 10 && y <= cat.y + 2) return "cat";
    const boss = hitBoss(x, y);
    if (boss) return boss;
    for (const e of ents.values()) {
      if (e.leaving || e.queued) continue;
      const box = e.seated ? [e.desk.x - 18, e.desk.y - 24, e.desk.x + 18, e.desk.y + 30] : [e.x - 7, e.y - 22, e.x + 7, e.y + 1];
      if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) return e.agent.id;
    }
    const thing = Incident.hitAt(x, y) || hitItem(x, y, "office");  // bought objects (build.js), desks included
    if (thing) return thing;
    const desk = hub.hitDesk(x, y);
    if (desk) return desk;
    // the chief is yours: coffee machine, console corner, podium
    if (x >= 316 && x <= 334 && y >= 44 && y <= 66) return "chief:coffee";
    if (x >= 146 && x <= 174 && y >= 62 && y <= 96) return "chief:console";
    if (x >= 208 && x <= 236 && y >= 82 && y <= 94 && chief.at !== "podium") return "chief:podium";
    if (x >= 350 && x <= 384 && y >= 8 && y <= 70) return "lounge";
    if (chief.room === "office" && Math.abs(x - chief.x) <= 12 && y >= chief.y - 26 && y <= chief.y + 8 && current) return "chief";
    if ((x >= SHELF.x - 2 && x <= SHELF.x + SHELF.w + 2 && y >= SHELF.y - 8 && y <= SHELF.y + 4)
      || (x >= FRAME.x - 2 && x <= FRAME.x + FRAME.w + 2 && y >= FRAME.y - 2 && y <= FRAME.y + FRAME.h + 8)) return "trophies";
    if (x >= CAB.x - 3 && x <= CAB.x + CAB.w + 3 && y >= CAB.y - 16 && y <= CAB.y + CAB.h + 6) return "store";
    return null;
  }
  floorClick(p) { chiefWalk(p); }
}
new OfficeRoom();
