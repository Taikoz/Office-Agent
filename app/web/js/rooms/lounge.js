// The break room: the activities (js/activities/) with the team on them, the kitchen and the dining table (social.js),
// the bought objects, the tournament slate, the chief when he takes a break.

import { hub } from "../hub.js";
import { S, W, badge, chief, ctx, px, selected, text } from "../core/core.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { drawSky } from "../svg/sky.js";
import { bubble } from "../world/scene.js";
import { chiefLoungeWalk, drawChiefLounge, drawChiefLoungeOver } from "../world/chief.js";
import { ACTS, inArea } from "../activities/base.js";
import { drawLounger, loungeFloorCanvas, loungers, setView } from "../world/lounge.js";
import { nameTag } from "../world/shop.js";
import { decor, doorSprite, drawWall, drawWindow, woodSprite } from "../world/decor.js";
import { drawTournament } from "../games/base.js";
import { toast } from "../sims/progress.js";
import { TABLE, drawKitchenFx, socialItems } from "../social/kitchen.js";
import { drawSocialOver } from "../social/people.js";
import { buy, drawBuyOverlay, drawRoomItems, hitItem, renderBuy, roomDepthItems, toggleBuy } from "../world/build.js";
import { drawPartyOver, emptyLoungeText } from "../sims/days.js";
import { Room } from "./base.js";

class LoungeRoom extends Room {
  // the doors to the rooms built in construction mode (construct.js); not built yet: under work tape, a click opens the
  // construction tab of the buy mode
  static DOORS = [{ room: "meeting", x: 269, label: "🤝 RÉUNION" }, { room: "terrace", x: 318, label: "🌿 TERRASSE" }];
  constructor() { super("lounge", "☕ Repos"); }
  drawDoor(d) {
    const built = hub.con.rooms.includes(d.room);
    ART.roomdoor.draw(d.x, 19, { room: d.room, built });
    px(d.x - 2, 12, 28, 6, built ? "#f7f7f7" : "#3a3a44"); text(built ? d.label : "🏗️ BIENTÔT", d.x + 12, 12.6, built ? "#081746" : "#fbaa08", 3.6, "center");
  }
  doorAt(p) { return LoungeRoom.DOORS.find(d => p.x >= d.x - 2 && p.x <= d.x + 26 && p.y >= 11 && p.y <= 67); }
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
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    for (const l of here) badge(l.x, l.y + (l.seated ? -3 : 2), nameTag(l.name), selected === `mate:${l.name}` ? "#fbaa08" : "#4090d7");
    for (const l of here) hub.drawEmotion(l.name, l.x, l.y - (l.seated ? 20 : 25), t);
    drawSocialOver(t);
    if (chief.room === "lounge") drawChiefLoungeOver(t);
    for (const l of here) if (t < l.sayUntil) bubble(l.x, l.y - (l.seated ? 22 : 24), l.say, "#f7f7f7", "#081746");
    if (!here.length) text(emptyLoungeText(), W / 2, 150, "#d5eeff", 5, "center");
    drawPartyOver("lounge", t);
    drawBuyOverlay("lounge", t);
  }
  hit(x, y) {
    if (this.doorAt({ x, y })) return "room-door";  // taken by click()
    if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
    const duel = ACTS.find(a => inArea(a.duel, x, y)); if (duel) return `duel:${duel.id}`;  // challenge a dev (duel.js)
    for (const l of [...loungers.values()].filter(l => !l.partyRoom).sort((a, b) => b.y - a.y)) if (Math.abs(x - l.x) <= 7 && y >= l.y - 22 && y <= l.y + 3) return `mate:${l.name}`;
    const itm = hitItem(x, y, "lounge"); if (itm) return itm;                                           // bought objects (build.js)
    if (x >= 158 && x <= 214 && y >= 30 && y <= 70) return "kitchen";                                  // pie menu: cook, snack, fire
    if (x >= TABLE.x - 2 && x <= TABLE.x + TABLE.w + 2 && y >= TABLE.y - 2 && y <= TABLE.y + TABLE.h) return "table";
    if (chief.room === "lounge") {  // the chief is here: the furniture is for him too
      const act = ACTS.find(a => inArea(a.area, x, y));
      if (act) return `chiefact:${act.id}`;
    }
    return null;
  }
  floorClick(p) { if (chief.room === "lounge" && p.y > 72) chiefLoungeWalk(p); }
}
new LoungeRoom();
