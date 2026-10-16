// The office: the room, the issue board, the bought objects, the podium and the chief, the desks and the devs at
// work with their bubbles, the cat, the dog, the incidents and happenings, the effects over everything.

import { hub } from "../hub.js";
import { CAB, CHIEF_NAME, DESKS, DOOR, H, W, fillScreen, badge, chief, clip, ctx, curSession, current, cv, drawerUntil, ents, hash, inTransit, mmx, px, selected, specialty, text, typeColor } from "../core/core.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { bubble, coffeeState, drawBoard, drawCabinet, drawDesk, drawDeskScreen, drawPerson, drawRoom, drawRoomWall, floorCanvas, hitBoardPager, headroom, stepOf } from "../world/scene.js";
import { crew, moodLine } from "../sims/crew.js";
import { CHIEF_LOOK, chiefWalk, consolePlaying, drawConsole, drawConsoleScreen } from "../world/chief.js";
import { drawLaser, laser } from "../world/fun.js";
import { Incident } from "../incidents/base.js";
import { nameTag } from "../world/shop.js";
import { cat, drawCat, drawCatSay } from "../world/cat.js";
import { awaitingReview, isStuck, money } from "../core/data.js";
import { FRAME, FX_BG, SHELF, drawBell, drawBoss, drawFx } from "../sims/progress.js";
import { overBudget } from "../agents/budget.js";
import { ciFailed } from "../agents/ticket.js";
import { drawAlarm, drawCake, drawFloaters, hitBoss } from "../agents/events2.js";
import { collisionMap, shortFile } from "../agents/insight.js";
import { drawSeasonOver } from "../ui/ux.js";
import { drawCashFx } from "../sims/money.js";
import { chiefPcSlot, drawBuyOverlay, drawBuyOverlayIso, drawChiefPc, drawChiefPcScreen, drawRoomItems, hitItem } from "../world/build.js";
import { chiefPhrase } from "../world/chiefedit.js";
import { Happening } from "../happenings/base.js";
import { P, anchored } from "../iso/engine.js";
import { OFFICE_SPOTS, chairNear, deskItemOf, surfaceOf } from "../world/place.js";
import { isoItems, lampsOver, leftWallDecor, nightOver } from "../iso/rooms.js";
import { Room } from "./base.js";

class OfficeRoom extends Room {
  constructor() { super("office", "🏢 Bureau"); }
  // the chief: on his podium, walking, at the coffee machine or the console; his bubble (layer: body, over or all)
  drawChief(t, session, layer = "all") {
    const ch = session?.chief, asking = [...ents.values()].filter(e => e.asking && !e.path.length);
    if (chief.room !== "office") {  // gone to the break room: a note on the podium
      if (layer === "body") return;
      text("☕ en pause", 282, 78, "#fbaa08", 4.4, "center");
      if (ch?.question) bubble(282, 72, `? ${clip(ch.question.question, 38)}`, "#fbaa08", "#081746");
      return;
    }
    const onPodium = chief.at === "podium" && !chief.path.length, walking = chief.path.length > 0;
    const gaming = chief.at === "console" && !chief.path.length, asleep = gaming && ch?.idle > 900;
    if (layer !== "over") {
      const waving = onPodium && !ch?.question && (t < chief.wave || (ch && !ch.finished && ch.idle < 20));
      if (!(["pc", "chiefos"].includes(chief.at) && !walking)) drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, frame: Math.floor(t / (walking ? 180 : gaming ? 140 : 250)), step: walking ? stepOf(chief, chief.x, chief.y) : null, smile: !asleep,
        arms: waving ? "baton" : gaming && !asleep ? "type" : chief.at === "coffee" && !chief.path.length ? "up" : "down", back: gaming || (walking && chief.path[0].y < chief.y), seated: gaming,
        dir: walking ? [chief.path[0].x - chief.x, chief.path[0].y - chief.y] : null });
      if (chief.cup) { px(chief.x + 4, chief.y - 13, 2.5, 3, "#f4f2ea"); px(chief.x + 4, chief.y - 13, 2.5, 0.8, "#6d4a2e"); }
    }
    if (layer === "body") return;
    text(CHIEF_NAME.toUpperCase(), chief.x, chief.y + (onPodium ? 7 : 2), "#fbaa08", 4.6, "center");
    const cx = chief.x, cy = chief.y + 2;
    let say = "";
    if (ch?.question) { bubble(cx, cy - 25 - headroom(), `? ${clip(ch.question.question, 38)}`, "#fbaa08", "#081746"); say = null; }
    else if (asking.length) say = asking.length > 1 ? `${asking.length} questions → à toi de trancher !` : "Question de l'équipe → à toi !";
    else if (t < (chief.until || 0)) say = chief.bubble;
    else if (!session) say = "Personne au bureau.";
    else if (chief.at === "coffee") say = "☕ petite pause";
    else if (gaming) say = asleep ? "zZz…" : (t / 1000) % 14 < 3 ? "GG !" : "🎮 appelle-moi si besoin";
    else if (ch.finished || ch.idle > 120) say = ch.idle > 900 ? "zZz…" : chiefPhrase() || "J'attends tes ordres.";  // his catchphrase (chiefedit.js)
    else if (ents.get("chief")?.agent.solo) say = `${ents.get("chief").who} est dessus 👍`;
    else if (say !== null) say = clip(ch.action, 40);
    if (say) bubble(cx, cy - 25 - headroom(), say);
  }
  // a dev: seated at work (its desk's bubble, badge, boss, bell) or walking (what it carries, its bubble)
  drawEnt(e, t, session, layer = "all") {
    const a = e.agent, f = Math.floor(t / 180), body = layer !== "over", over = layer !== "body";
    if (over && selected === a.id) {
      const bob = Math.sin(t / 200) * 1.5, mx = e.seated ? e.desk.x : e.x, my = e.seated ? e.desk.y - 30 : e.y - 34;
      px(mx - 3, my + bob, 6, 2, "#fbaa08"); px(mx - 2, my + 2 + bob, 4, 1.5, "#fbaa08"); px(mx - 1, my + 3.5 + bob, 2, 1.5, "#fbaa08");
    }
    if (e.seated) {
      const st = a.status;
      const stuck = isStuck(a), pulling = stuck && Math.floor(t / 700) % 2 === 0;  // pulls its hair out, on and off
      if (body) {
        const shake = st === "blocked" || pulling ? Math.sin(t / 40) * 0.5 : 0;
        const celebrate = st === "done" && a.idle < 20;
        if (layer === "all") px(e.x - 6, e.y - 6, 12, 3, "#3a3a48");
        const party = t < (e.fxUntil || 0) && ["pass", "mr", "boss", "verify"].includes(e.fxKind);
        drawPerson(e.x + shake, e.y, e.look, { seated: true, back: true, dir: e.desk?.face || [0, -1], arms: celebrate || party || pulling ? "up" : st === "working" ? "type" : "down", frame: f });
        if (a.game?.boss) drawBoss(e.desk.x - 28 + (t - (e.bossHitAt || 0) < 180 ? 2 : 0), e.desk.y + 10, a.game.boss, t, t - (e.bossHitAt || 0) < 500);
      }
      if (!over) return;
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
      return;
    }
    const paused = !!e.pauseUntil, still = paused || !e.path.length;
    if (body) {
      drawPerson(e.x, e.y, e.look, { frame: still ? 0 : f, step: still ? null : stepOf(e, e.x, e.y), back: ["pick", "file", "coffee", "standup", "pair"].includes(e.pose) || (!still && e.path[0].y < e.y), dir: still ? null : [e.path[0].x - e.x, e.path[0].y - e.y],
        arms: e.pose === "pick" || e.pose === "file" ? "up" : "down" });
      if (e.errand && e.pose !== "file") {  // carries its papers to the MMX cabinet
        const n = Math.min(3, e.errand.items.length);
        for (let k = 0; k < n; k++) px(e.x + 3 + k * 0.8, e.y - 14 - k * 1.2, 5, 4, k % 2 ? "#fff7b8" : "#f4f2ea");
      } else if (e.cup) { px(e.x + 4, e.y - 13, 2.5, 3, "#f4f2ea"); px(e.x + 4, e.y - 13, 2.5, 0.8, "#6d4a2e"); }  // coffee cup
      else if (e.picked && !e.asking && !e.leaving && !still) px(e.x + 4, e.y - 13, 3.5, 3.5, "#fff7b8");  // carries its ticket
    }
    if (!over) return;
    if (e.errand && e.pose !== "file" && !still) bubble(e.x, e.y - 24 - headroom(), `→ MMX : ${e.errand.label}`);
    if (e.pose === "coffee") bubble(e.x, e.y - 24 - headroom(), a.status === "blocked" ? "☕ je souffle un coup" : "☕ pause café", "#d6a77f");
    if (e.pose === "file") bubble(e.x, e.y - 24 - headroom(), e.errand?.pendingOnly ? `${e.errand.label} → à valider` : `Je range ${e.errand?.label || ""}`, "#51cf66");
    if (e.pose === "pick") bubble(e.x, e.y - 24 - headroom(), a.ticket ? `Je prends ${a.ticket}` : "Je prends ce ticket");
    if (e.pose === "alarm") bubble(e.x, e.y - 24 - headroom(), "🚨 faille critique !", "#ff6b6b", "#fff");
    if (e.pose === "cake" && Math.floor(t / 2500) % 3 === 0) bubble(e.x, e.y - 24 - headroom(), ["🎂 miam", "bravo !", "🎉"][hash(e.who || "") % 3], "#f4c2d7");
    if (e.pose === "pair" && Math.floor(t / 4000) % 3 === 0) bubble(e.x, e.y - 24 - headroom(), hub.pairBubble(e), "#b48cff");
    if (e.asking && !e.path.length) {
      bubble(e.x, e.y - 24 - headroom(), `? ${clip(a.question?.question || "question", 30)}`, "#fbaa08", "#081746");
      if (a.ticket) text(a.ticket, e.x, e.y + 7.5, "#d5eeff", 4.2, "center");
    }
    badge(e.x, e.y + 2, e.who ? nameTag(e.who) : specialty(a.type), typeColor(a.type));
  }
  render(t) {
    const session = curSession();
    drawRoom(t);
    drawBoard(session);
    drawRoomItems("office", t);
    hub.drawNight();
    ART.podium.draw(210, 84.6);
    drawConsole(t);
    this.drawChief(t, session);
    const byDesk = new Map([...ents.values()].filter(e => !e.leaving).map(e => [e.desk, e]));
    for (const d of DESKS) drawDesk(d, byDesk.get(d), t);
    drawChiefPc(t);
    drawCake(t);
    drawCabinet(t, cv.classList.contains("hover-store"));
    Incident.drawAll(t);  // js/incidents/
    drawCat(t);
    hub.drawDog(t);
    for (const e of [...ents.values()].sort((a, b) => a.y - b.y)) if (!e.queued) this.drawEnt(e, t, session);
    Happening.drawAll(t);  // power cut, client visit (js/happenings/)
    this.drawOver(t, session);
    drawBuyOverlay("office", t);
  }
  // over everything: the moods, the effects, the laser, the ticket dragged, the money, the season, the alarm
  drawOver(t, session) {
    if (!ents.size && session) text("Aucun dev sur cette session — le chef travaille seul.", W / 2, 150, "#d5eeff", 5, "center");
    for (const e of ents.values()) if (!e.queued && !e.leaving) anchored(e.x, e.y, () => hub.drawEmotion(e.who, e.seated && !headroom() ? e.x + 10 : e.x, e.seated ? (headroom() ? e.y - 26 : e.y - 12) : e.y - 25 - headroom(7), t));
    if (chief.room === "office") anchored(chief.x, chief.y, () => hub.drawEmotion(CHIEF_NAME, chief.x, chief.y - (chief.at === "console" && !chief.path.length ? 18 : 25) - headroom(7), t));
    drawFx(t);
    anchored(laser.x, laser.y, () => drawLaser(t));
    hub.drawDrag(t);
    drawFloaters(t);
    drawCashFx(t);
    anchored(chief.x, chief.y, () => drawSeasonOver(t));
    drawAlarm(t);
    if (hub.ISO.drawing) drawBuyOverlayIso("office", t, hub.ISO);
  }
  // the office in isometric view: its door; everything else is bought (build.js), the board and the MMX cabinet too; the team at their desks (on the floor without one), the chief, the pets
  renderIso(t, G) {
    const session = curSession(), d = hub.decor.office, power = Happening.get("power");
    G.back(() => {  // the back layer: the room's shell, what hangs on its walls, the rugs
      G.shell({ wall: () => hub.drawWall("office"), wallColor: d.wallColor, floor: floorCanvas("office") });
      G.onBackWall(() => {
        drawRoomWall(t, "office", true);
        drawRoomItems("office", t, "wall");  // the board, the trophies… (objects bought)
        power.draw(t, "fuse");
      });
      G.onLeftWall(() => leftWallDecor("office", t));
      G.onFloor(() => drawRoomItems("office", t, "rug"));
    });
    const items = [];
    isoItems("office", t, G, items);
    if (hub.cake && !hub.focusMode) items.push({ fp: [hub.CAKE.x - 8, hub.CAKE.y - 8, hub.CAKE.x + 8, hub.CAKE.y + 8], draw: () => { const p = P(hub.CAKE.x - 8, hub.CAKE.y - 8); ART.isocake.draw(p.x, p.y, { flame: Math.floor(t / 150) % 2 }); } });
    // the incidents: in volume, their "!" over them
    const blink = Math.floor(t / 300) % 2, mark = (inc, x, y, z) => G.put(0, 0, x, y, z, () => inc.mark(0, 0, blink));
    for (const inc of Incident.all.values()) if (inc.on) {
      if (inc.id === "spill" && inc.at) { const { x, y } = inc.at; items.push({ fp: [x - 10, y - 6, x + 10, y + 6], h: 20, draw: () => { const p = P(x - 10, y - 6); ART.isospill.draw(p.x, p.y); G.boxRegion(x - 10, y - 6, x + 10, y + 6, 4, { x, y }); mark(inc, x, y, 12); } }); }
      else if (inc.id === "croissants") { const c = inc.spot(); items.push({ fp: [c.x - 8, c.y - 6, c.x + 8, c.y + 6], h: 24, draw: () => { const p = P(c.x - 8, c.y - 6); ART.isocroissants.draw(p.x, p.y); G.boxRegion(c.x - 8, c.y - 6, c.x + 8, c.y + 6, 8, { x: c.x, y: c.y }); mark(inc, c.x, c.y, 14); } }); }
      else if (inc.at) items.push({ pt: [inc.at.x, inc.at.y + 1], draw: () => mark(inc, inc.at.x, inc.at.y, inc.at.z || 30) });  // the coffee machine, a plant: the object is drawn, its "!" over it
    }
    const client = Happening.get("client");
    if (client?.visitor) { const v = client.visitor; items.push({ pt: [v.x, v.y], draw: () => anchored(v.x, v.y, () => client.draw(t), { x: v.x - 9, y: v.y - 34, w: 18, h: 37, to: { x: v.x, y: v.y - 8 } }) }); }
    if (!hub.focusMode) {
      const desk = cat.mode === "sleep" && cat.desk && deskItemOf(cat.desk), top = desk && surfaceOf(desk);
      const box = { x: cat.x - 9, y: cat.y - 16, w: 18, h: 19, to: { x: cat.x, y: cat.y - 4 } };
      items.push(top ? { pt: [top.x + top.w / 2, top.y + top.h / 2], z: top.z, draw: () => G.put(cat.x, cat.y, top.x + top.w * 0.25, top.y + top.h / 2, top.z, () => drawCat(t), box) }
        : { pt: [cat.x, cat.y], draw: () => anchored(cat.x, cat.y, () => drawCat(t), box) });
    }
    if (hub.petBook.dog) { const dg = hub.dog; items.push({ pt: [dg.x, dg.y], draw: () => anchored(dg.x, dg.y, () => hub.drawDog(t), { x: dg.x - 11, y: dg.y - 20, w: 22, h: 23, to: { x: dg.x, y: dg.y - 4 } }) }); }
    // the chief and the team (on their chair when there is one)
    const lift = () => chief.at === "podium" && !chief.path.length && OFFICE_SPOTS.podium ? 5 : 0;
    const seatLift = (x, y) => chairNear("office", x, y) ? 3 : 0;
    if (chief.room === "office") {
      const seatedPc = ["pc", "chiefos"].includes(chief.at) && !chief.path.length;
      items.push({ pt: [chief.x, chief.y], draw: () => {
        G.put(chief.x, chief.y, chief.x, chief.y, seatedPc ? seatLift(chief.x, chief.y) : lift(), () => { this.drawChief(t, session, "body"); if (seatedPc) drawChiefPc(t); },
          { x: chief.x - 9, y: chief.y - 34, w: 18, h: 37, to: { x: chief.x, y: chief.y - 8 } });
      } });
    }
    const entLift = e => e.seated && !e.desk.floor ? seatLift(e.x, e.y) : 0;
    for (const e of ents.values()) if (!e.queued) items.push({ pt: [e.x, e.y], draw: () => {
      const box = { x: e.x - 9, y: e.y - (e.seated ? 30 : 34), w: 18, h: e.seated ? 32 : 37, to: { x: e.x, y: e.y - 8 } };  // the whole avatar
      G.put(e.x, e.y, e.x, e.y, entLift(e), () => { this.drawEnt(e, t, session, "body"); if (e.seated && e.desk.floor) hub.drawNoDesk(e.desk, e, t); }, box);
      if (e.seated && e.agent.game?.boss) {  // the test boss can be whacked
        const p = P(e.x, e.y, 3), dx = p.x - e.x, dy = p.y - e.y, bx = e.desk.x - 28, by = e.desk.y + 10;
        G.region(bx - 7 + dx, by - 10 + dy, 14, 13, (sx, sy) => ({ x: sx - dx, y: sy - dy }));
      }
    } });
    G.drawSorted(items);
    // the night, the power cut, then what is said, the names, the moods, the effects
    nightOver();
    lampsOver("office");
    if (power.on) { fillScreen("rgba(4, 4, 14, .55)"); G.onBackWall(() => power.draw(t, "fuse")); }
    if (hub.cake && !hub.focusMode && Math.floor(t / 3000) % 2) anchored(hub.CAKE.x, hub.CAKE.y, () => bubble(hub.CAKE.x, hub.CAKE.y - 14, `🎂 ${hub.cake.label} niv. ${hub.cake.lv}`, "#f4c2d7"));
    if (cat.mode === "sleep" && cat.desk) G.put(cat.x, cat.y, cat.x, cat.desk.y + 8, 12.6, () => drawCatSay(t)); else anchored(cat.x, cat.y, () => drawCatSay(t));
    G.put(chief.x, chief.y, chief.x, chief.y, lift(), () => this.drawChief(t, session, "over"));
    for (const e of [...ents.values()].sort((a, b) => a.y - b.y)) if (!e.queued) G.put(e.x, e.y, e.x, e.y, entLift(e), () => this.drawEnt(e, t, session, "over"));
    this.drawOver(t, session);
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
    // the chief is yours (the coffee machine, the console, the podium: objects bought, build.js); the door
    if (x >= DOOR.x - 16 && x <= DOOR.x + 18 && y >= 8 && y <= 70) return "lounge";  // the door (at the right end, construct.js)
    if (chief.room === "office" && Math.abs(x - chief.x) <= 12 && y >= chief.y - 26 && y <= chief.y + 8 && current) return "chief";
    if ((x >= SHELF.x - 2 && x <= SHELF.x + SHELF.w + 2 && y >= SHELF.y - 8 && y <= SHELF.y + 4)
      || (x >= FRAME.x - 2 && x <= FRAME.x + FRAME.w + 2 && y >= FRAME.y - 2 && y <= FRAME.y + FRAME.h + 8)) return "trophies";
    if (x >= CAB.x - 3 && x <= CAB.x + CAB.w + 3 && y >= CAB.y - 16 && y <= CAB.y + CAB.h + 6) return "store";
    return null;
  }
  floorClick(p) { chiefWalk(p); }
}
new OfficeRoom();
