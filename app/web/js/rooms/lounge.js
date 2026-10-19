// The break room: the activities (js/activities/) with the team on them, the kitchen and the dining table (social.js),
// the bought objects, the tournament slate, the chief when he takes a break.

import { hub } from "../hub.js";
import { H, S, W, badge, chief, ctx, px, roomSize, selected, text } from "../core/core.js";
import { ART, shade } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { drawSky } from "../svg/sky.js";
import { P, anchored } from "../iso/engine.js";
import { isoItems, lampsOver, leftWallDecor } from "../iso/rooms.js";
import { bubble, headroom } from "../world/scene.js";
import { chiefLoungeWalk, drawChiefLounge, drawChiefLoungeOver } from "../world/chief.js";
import { ACTS, Activity, inArea } from "../activities/base.js";
import { drawLounger, loungeFloorCanvas, loungers, setView } from "../world/lounge.js";
import { nameTag } from "../world/shop.js";
import { decor, doorSprite, drawWall, drawWindow, woodSprite } from "../world/decor.js";
import { drawTournament } from "../games/base.js";
import { toast } from "../sims/progress.js";
import { PAN, SEATS, TABLE, drawKitchenFx, drawTableTop, socialItems } from "../social/kitchen.js";
import { drawSocialOver } from "../social/people.js";
import { buy, defOf, drawBuyOverlay, drawBuyOverlayIso, drawItem, drawRoomItems, hitItem, itemsIn, renderBuy, roomDepthItems, toggleBuy } from "../world/build.js";
import { drawPartyOver, emptyLoungeText } from "../sims/days.js";
import { Room } from "./base.js";
import { doorOpen, drawDoorOpen } from "../world/physics.js";

class LoungeRoom extends Room {
  // the doors to the rooms built in construction mode (construct.js); not built yet: under work tape, a click opens the
  // construction tab of the buy mode
  static DOORS = [{ room: "meeting", x: 269, label: "🤝 RÉUNION" }, { room: "terrace", x: 318, label: "🌿 TERRASSE" }];
  constructor() { super("lounge", "☕ Repos"); }
  drawDoor(d) {
    const built = hub.con.rooms.includes(d.room);
    drawDoorOpen(() => ART.roomdoor.draw(d.x, 19, { room: d.room, built }), d.x, 19, built ? doorOpen("lounge", d.x + 12) : 0, [2, 2, 20, 46]);
    px(d.x - 2, 12, 28, 6, built ? "#f7f7f7" : "#3a3a44"); text(built ? d.label : "🏗️ BIENTÔT", d.x + 12, 12.6, built ? "#081746" : "#fbaa08", 3.6, "center");
  }
  doorAt(p) {
    return LoungeRoom.DOORS.find(d => p.x >= d.x - 2 && p.x <= d.x + 26 && p.y >= 11 && p.y <= 67);
  }
  click(p) {
    const d = this.doorAt(p); if (!d) return false;
    if (hub.con.rooms.includes(d.room)) setView(d.room);
    else {
      if (!buy.on) toggleBuy(true);
      buy.cat = "construction"; renderBuy();
      toast("CONSTRUCTION", `${d.label.slice(3)} : pas encore construite`, "Construis-la dans l'onglet 🏗️ Construction du mode achat.");
    }
    return true;
  }
  render(t) {
    // room
    drawWall("lounge");
    px(0, 66, W, 4, "#081746");
    ctx.drawImage(loungeFloorCanvas(), 0, Math.round(70 * S));
    drawRoomItems("lounge", t, "rug");
    px(0, 66.5, W, 3.5, "#1a2340"); px(0, 66.5, W, 0.6, "#2c3a66");  // baseboard
    text("SALLE DE REPOS", 200, 4, "#fbaa08", 6, "center");
    drawSky(100, 12, t); drawWindow("lounge", 94, 4); ART.glints.draw(94, 4);
    doorSprite("lounge").draw(8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
    for (const a of ACTS) a.wall(t);  // dartboard, kitchen, TV (js/activities/)
    woodSprite("bookshelf", decor.lounge.wood).draw(240, 28); drawRoomItems("lounge", t, "wall");
    for (const d of LoungeRoom.DOORS) this.drawDoor(d);
    drawTournament(t);
    for (const [x, y] of [[372, 200], [6, 206], [140, 54]]) SPRITES.plant.draw(x - 2, y - 2);
    ART.cornerrug.draw(30, 150);  // the beanbag corner
    // furniture and people, depth-sorted
    const items = ACTS.flatMap(a => a.furniture(t));
    items.push(...socialItems(t), ...roomDepthItems("lounge", t));
    items.push({ y: 70, draw: () => drawKitchenFx(t) });  // pan, flames, over the stove (build.js)
    const here = [...loungers.values()].filter(l => !l.partyRoom);  // gone to the meeting room or the terrace (construct.js)
    for (const l of here) items.push({ y: l.y, draw: () => drawLounger(l, t) });
    if (chief.room === "lounge") items.push({ y: chief.ly, draw: () => drawChiefLounge(t) });
    hub.partyItems?.(t, null, items);  // the devs of the other offices at our afterwork (social/netparty.js)
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    hub.partyOver?.(t, null);
    for (const l of here) badge(l.x, l.y + (l.seated ? -3 : 2), nameTag(l.name), selected === `mate:${l.name}` ? "#fbaa08" : "#4090d7");
    for (const l of here) hub.drawEmotion(l.name, l.x, l.y - (l.seated ? 20 : 25), t);
    drawSocialOver(t);
    if (chief.room === "lounge") drawChiefLoungeOver(t);
    for (const l of here) if (t < l.sayUntil) bubble(l.x, l.y - (l.seated ? 22 : 24), l.say, "#f7f7f7", "#081746", l.name);
    if (!here.length) text(emptyLoungeText(), W / 2, 150, "#d5eeff", 5, "center");
    drawPartyOver("lounge", t);
    drawBuyOverlay("lounge", t);
  }
  hit(x, y) {
    if (this.doorAt({ x, y })) return "room-door";  // taken by click()
    if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
    for (const l of [...loungers.values()].filter(l => !l.partyRoom).sort((a, b) => b.y - a.y)) if (Math.abs(x - l.x) <= 7 && y >= l.y - 22 && y <= l.y + 3) return `mate:${l.name}`;
    const itm = hitItem(x, y, "lounge"); if (itm) return itm;                                           // bought objects (build.js)
    if (TABLE.uid && x >= TABLE.x - 2 && x <= TABLE.x + TABLE.w + 2 && y >= TABLE.y - 2 && y <= TABLE.y + TABLE.h) return "table";
    return null;
  }
  floorClick(p) {
    if (chief.room === "lounge" && p.y > 72) chiefLoungeWalk(p);
  }
  // the break room in isometric view: its doors; everything else is bought (build.js), the team on the spots of the
  // objects (world/place.js)
  renderIso(t, G) {
    const d = decor.lounge, chiefIn = chief.room === "lounge";
    G.back(() => {  // the back layer: the room's shell, what hangs on its walls, the rugs
      G.shell({ wall: () => drawWall("lounge"), wallColor: d.wallColor, floor: loungeFloorCanvas() });
      text("SALLE DE REPOS", 200, 3, "#fbaa08", 6, "center");
      G.onFloor(() => drawRoomItems("lounge", t, "rug"));
      G.onBackWall(() => {
        px(0, 66.5, roomSize("lounge").w, 3.5, "#1a2340"); px(0, 66.5, roomSize("lounge").w, 0.6, "#2c3a66");  // baseboard
        drawDoorOpen(() => doorSprite("lounge").draw(8, 20), 8, 20, doorOpen("lounge", 23)); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
        for (const door of LoungeRoom.DOORS) this.drawDoor(door);
        drawRoomItems("lounge", t, "wall");  // the tournament's slate, frames… (objects bought)
      });
      G.onLeftWall(() => leftWallDecor("lounge", t));
    });
    const items = [];
    isoItems("lounge", t, G, items);
    const stove = hub.kitchenStove();
    if (stove) items.push({ pt: [PAN.fx, PAN.fy + 5.5], draw: () => G.put(PAN.x + 5, PAN.y + 5.6, PAN.fx, PAN.fy, PAN.z, () => drawKitchenFx(t)) });
    if (TABLE.uid) items.push({ pt: [TABLE.x + TABLE.w / 2, TABLE.y + TABLE.h / 2], z: 13, draw: () => G.put(TABLE.x + TABLE.w / 2, TABLE.y + 8, TABLE.x + TABLE.w / 2, TABLE.y + TABLE.h / 2, 12.7, () => drawTableTop(t)) });
    // the team and the chief (up on a seat or a stage: the spot's lift)
    const here = [...loungers.values()].filter(l => !l.partyRoom), lift = (s, walking) => walking ? 0 : s?.lift || 0;
    for (const l of here) items.push({ pt: [l.x, l.y], draw: () => G.put(l.x, l.y, l.x, l.y, lift(l.spot, l.path.length), () => drawLounger(l, t), { x: l.x - 9, y: l.y - 34, w: 18, h: 37, to: { x: l.x, y: l.y - 8 } }) });
    if (chiefIn) items.push({ pt: [chief.lx, chief.ly], draw: () => G.put(chief.lx, chief.ly, chief.lx, chief.ly, lift(chief.lspot, chief.lpath.length), () => drawChiefLounge(t)) });
    hub.partyItems?.(t, G, items);  // the devs of the other offices at our afterwork (social/netparty.js)
    G.drawSorted(items);
    hub.partyOver?.(t, G);
    // over everything: names, moods, what is said, the social life
    for (const l of here) G.put(l.x, l.y, l.x, l.y, lift(l.spot, l.path.length), () => {
      badge(l.x, l.y + (l.seated ? -3 : 2), nameTag(l.name), selected === `mate:${l.name}` ? "#fbaa08" : "#4090d7");
      hub.drawEmotion(l.name, l.x, l.y - (l.seated ? 20 : 25) - headroom(7), t);
      if (t < l.sayUntil) bubble(l.x, l.y - (l.seated ? 22 : 24) - headroom(), l.say, "#f7f7f7", "#081746", l.name);
    });
    drawSocialOver(t);
    if (chiefIn) anchored(chief.lx, chief.ly, () => drawChiefLoungeOver(t));
    lampsOver("lounge");
    if (!here.length) text(emptyLoungeText(), W / 2, 24, "#d5eeff", 5, "center");
    else if (!hub.itemsIn("lounge").length) text("Salle vide : achète un canapé, une machine à café, des jeux… (🛒 ACHAT)", W / 2, 24, "#d5eeff", 5, "center");
    drawBuyOverlayIso("lounge", t, G);
    const R = roomSize("lounge"), D = R.h - 70;  // the garland along the walls
    drawPartyOver("lounge", t, u => { const L = D / (D + R.w); return u < L ? P(0, R.h - D * u / L, 42) : P(R.w * (u - L) / (1 - L), 70, 42); });
  }
}
new LoungeRoom();
