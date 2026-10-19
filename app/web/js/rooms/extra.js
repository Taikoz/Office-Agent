// Two more rooms built in construction mode (world/construct.js): the gym and the library. Empty when built, furnished
// from the shop (items/rooms2.js); the free devs of the break room come here now and then (social/visits.js), each on
// the spot of a machine or a place to read, in the pose that goes with it.

import { hub } from "../hub.js";
import { px, roomSize, text } from "../core/core.js";
import { bubble, drawPerson, headroom } from "../world/scene.js";
import { loungers } from "../world/lounge.js";
import { nameTag } from "../world/shop.js";
import { drawWall, roomFloorCanvas } from "../world/decor.js";
import { drawBuyOverlayIso, drawRoomItems } from "../world/build.js";
import { anchored, isoDrawing } from "../iso/engine.js";
import { isoItems, lampsOver, leftWallDecor } from "../iso/rooms.js";
import { badge } from "../core/core.js";
import { BuiltRoom } from "./built.js";

class VisitRoom extends BuiltRoom {
  constructor(id, label, title, tint) { super(id, label); Object.assign(this, { title, tint }); }
  // whoever came here (social/visits.js): on the spot of an object, in its pose
  visitors() { return [...loungers.values()].filter(l => l.partyRoom === this.id && l.roomSpot && !l.path.length); }
  poseOf(l, t) {
    const p = l.roomSpot.pose || {}, f = Math.floor(t / (p.run ? 140 : 400));
    return { seated: !!p.seated, frame: f, dir: l.roomSpot.face, smile: true, back: (l.roomSpot.face?.[1] ?? 0) < 0,
      arms: p.box ? (f % 2 ? "up" : "down") : p.curl || p.lift ? (Math.floor(t / 700) % 2 ? "up" : "down") : p.run || p.pedal || p.row ? "down" : p.book ? "type" : p.zen ? "up" : "down" };
  }
  renderIso(t, G) {
    const R = roomSize(this.id);
    G.back(() => {
      G.shell({ wall: () => drawWall(this.id), wallColor: hub.decor[this.id].wallColor, floor: roomFloorCanvas(this.id, R.h - 70, [], R.w) });
      text(this.title, 200, 3, "#fbaa08", 6, "center");
      G.onFloor(() => drawRoomItems(this.id, t, "rug"));
      G.onBackWall(() => this.wallStrip(t));
      G.onLeftWall(() => leftWallDecor(this.id, t));
    });
    const items = [], here = this.visitors();
    for (const l of here) { const s = l.roomSpot; items.push({ pt: [s.x, s.y], draw: () => G.put(s.x, s.y, s.x, s.y, s.lift || 0, () => { drawPerson(s.x, s.y, l.look, this.poseOf(l, t)); if (l.roomSpot.pose?.book) px(s.x - 3, s.y - 13, 6, 3, "#c0303a"); }) }); }
    this.chiefItem(t, G, items);
    isoItems(this.id, t, G, items);
    G.drawSorted(items);
    lampsOver(this.id);
    this.chiefOver(t);
    for (const l of here) { const s = l.roomSpot; anchored(s.x, s.y, () => { badge(s.x, s.y + 2, nameTag(l.name), this.tint); if (t < l.sayUntil) bubble(s.x, s.y - 24 - headroom() - (s.lift || 0), l.say, "#f7f7f7", "#081746", l.name); }); }
    if (!hub.itemsIn(this.id).length && isoDrawing()) text(`Pièce vide : achète ses meubles (🛒 ACHAT → ${this.id === "gym" ? "Sport" : "Bibliothèque"})`, 200, 26, "#d5eeff", 5, "center");
    drawBuyOverlayIso(this.id, t, G);
  }
}
new VisitRoom("gym", "🏋️ Sport", "SALLE DE SPORT", "#c0303a");
new VisitRoom("library", "📚 Bibliothèque", "BIBLIOTHÈQUE", "#2f6e4c");
