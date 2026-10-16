// The rooms built in construction mode (construct.js): a meeting room and a terrace, on the room bar once built.

import { hub } from "../hub.js";
import { H, S, W, badge, ctx, hash, px, text } from "../core/core.js";
import { ART } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { SKY, skyPhase } from "../svg/sky.js";
import { FLOOR_Y, bubble, drawPerson } from "../world/scene.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { loungers } from "../world/lounge.js";
import { nameTag } from "../world/shop.js";
import { doorSprite, drawWall, roomFloorCanvas } from "../world/decor.js";
import { drawBuyOverlay, drawRoomItems, hitItem, roomDepthItems } from "../world/build.js";
import { PARTY_SPOTS, afterworkTime, clockNow, dayState, drawPartyOver } from "../sims/days.js";
import { Room } from "./base.js";

class BuiltRoom extends Room {
  get open() { return hub.con.rooms.includes(this.id); }
  // the door back to the office, the bought objects
  hit(x, y) {
    if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
    return hitItem(x, y, this.id);
  }
  // the wall and floor of its decor, a baseboard, its title, the door back to the office, the rugs and wall objects
  shell(t, title) {
    drawWall(this.id);
    ctx.drawImage(roomFloorCanvas(this.id, H - FLOOR_Y, []), 0, Math.round(FLOOR_Y * S));
    px(0, 66.5, W, 3.5, "#2a1f18"); px(0, 66.5, W, 0.6, "#4a3828");
    text(title, 200, 4, "#fbaa08", 6, "center");
    doorSprite("office").draw(8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
    drawRoomItems(this.id, t, "rug"); drawRoomItems(this.id, t, "wall");
  }
}

// the meeting room: a whiteboard, slides, the table where the free devs sit for a minute (startMeeting, construct.js)
class MeetingRoom extends BuiltRoom {
  constructor() { super("meeting", "🤝 Réunion"); }
  render(t) {
    this.shell(t, "SALLE DE RÉUNION");
    // whiteboard with a chart, a screen with slides
    px(60, 16, 70, 40, "#e8e8ee"); px(60, 16, 70, 2, "#b8b8c4"); [12, 20, 16, 28, 24, 34].forEach((h, i) => px(68 + i * 9, 50 - h, 6, h, ["#5aa9ff", "#51cf66", "#fbaa08"][i % 3])); text("OBJECTIFS", 95, 19, "#22212a", 4, "center");
    px(270, 18, 64, 36, "#1c1c24"); px(272, 20, 60, 32, hub.meeting.on ? "#2e5d9e" : "#14141c");
    if (hub.meeting.on) { text(["Roadmap", "Sprint", "Démo", "Questions ?"][Math.floor(t / 4000) % 4], 302, 30, "#f7f7f7", 6, "center"); }
    const items = [{ y: 150, draw: () => ART.meettable.draw(130, 136) }];
    for (const s of hub.MEET_SEATS) items.push({ y: s.y - 2, draw: () => ART.meetchair.draw(s.x - 5, s.y - 10) });
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n); if (!l || !hub.meeting.on) return; const s = hub.MEET_SEATS[i]; items.push({ y: s.y, draw: () => drawPerson(s.x, s.y, l.look, { seated: true, back: s.y < 150, frame: Math.floor(t / 400) + i, smile: true }) }); });
    if (hub.meeting.on) items.push({ y: 151, draw: () => drawPerson(115, 151, CHIEF_LOOK, { tux: true, arms: "baton", frame: Math.floor(t / 600), smile: true }) });
    items.push(...roomDepthItems("meeting", t));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    hub.meeting.who.forEach((n, i) => { const l = loungers.get(n); if (l && hub.meeting.on && Math.floor(t / 2500 + i) % 4 === 0) bubble(hub.MEET_SEATS[i].x, hub.MEET_SEATS[i].y - 22, ["D'accord.", "Bonne idée !", "Je m'en occupe.", "Et les tests ?"][i % 4]); });
    if (!hub.meeting.on) text("Clique sur la table pour réunir l'équipe", 200, 200, "#d5eeff", 5, "center");
    drawBuyOverlay("meeting", t);
  }
  hit(x, y) { return x >= 128 && x <= 272 && y >= 132 && y <= 168 ? "meet-table" : super.hit(x, y); }
}
new MeetingRoom();

// the terrace: open sky, the city, a wooden deck, string lights, the barbecue; the afterwork happens here
class TerraceRoom extends BuiltRoom {
  constructor() { super("terrace", "🌿 Terrasse"); }
  render(t) {
    const { phase } = skyPhase();
    const st = SKY[phase];  // full-width sky (ART.sky is window-sized)
    ART.terracesky.draw(0, 0, { stops: st });
    if (phase === "night") ART.terracemoon.draw(318, 10, { bg: st[0] });
    else { const h = clockNow().getHours() + clockNow().getMinutes() / 60, k = Math.max(0, Math.min(1, (h - 6) / 15)); px(20 + k * 360 - 5, 46 - Math.sin(k * Math.PI) * 34 - 5, 10, 10, phase === "day" ? "#ffe066" : "#ff9f43"); }
    if (phase === "night") for (let i = 0; i < 30; i++) if ((Math.floor(t / 600) + i) % 6) px((i * 53) % W, (i * 17) % 50, 0.8, 0.8, "#f4f2ff");
    for (let i = 0; i < 14; i++) { const h = 16 + (hash(`b${i}`) % 26), x = i * 30 - 4; px(x, 72 - h, 26, h, phase === "night" ? "#1c1b2e" : "#5a6378"); if (phase === "night") for (let w = 0; w < 6; w++) if ((hash(`w${i}${w}`) % 3) === 0) px(x + 4 + (w % 3) * 7, 72 - h + 4 + Math.floor(w / 3) * 6, 2.4, 2.4, "#ffd77a"); }
    for (let y = 72; y < H; y += 6) { px(0, y, W, 6, (y / 6) % 2 ? "#9a7550" : "#8a6a48"); px(0, y, W, 0.5, "#6d5238"); }
    px(0, 70, W, 3, "#4a3826"); for (let x = 2; x < W; x += 12) px(x, 58, 1.6, 14, "#4a3826"); px(0, 58, W, 1.6, "#5c3d27");
    for (let x = 6; x < W; x += 14) { const on = phase !== "day" || dayState.party; px(x, 12 + Math.sin(x / 30) * 3, 1.8, 2.4, on ? ["#ffd43b", "#ff9f43", "#fff3b0"][x % 3] : "#c8c4bc"); }
    text("TERRASSE", 200, 4, "#fbaa08", 6, "center");
    doorSprite("lounge").draw(8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
    drawRoomItems("terrace", t, "rug");
    const items = [
      { y: 112, draw: () => { ART.bbq.draw(330, 92); if (dayState.party) for (let i = 0; i < 3; i++) px(334 + i * 6, 88 - ((t / 40 + i * 9) % 12), 2, 2, "rgba(220,220,230,.5)"); } },
      ...[[60, 160], [100, 170], [300, 190]].map(([x, y]) => ({ y, draw: () => ART.deckchair.draw(x - 10, y - 12) })),
      { y: 214, draw: () => SPRITES.plant.draw(368, 196) }, { y: 214, draw: () => SPRITES.plant.draw(20, 196) },
    ];
    for (const l of loungers.values()) if (l.partyRoom === "terrace" && !l.path.length) {
      const sp = PARTY_SPOTS[l.partySpot] || { x: l.x, y: l.y }, x = sp.x, y = sp.y + 70;
      items.push({ y, draw: () => { drawPerson(x, y, l.look, { arms: Math.floor(t / 500 + hash(l.name)) % 2 ? "up" : "down", frame: Math.floor(t / 300), smile: true }); px(x + 4, y - 13, 2.5, 3, "#f4c430"); } });
      items.push({ y: y + 0.1, draw: () => { badge(x, y + 2, nameTag(l.name), "#4090d7"); if (t < l.sayUntil) bubble(x, y - 24, l.say, "#f7f7f7", "#081746"); } });
    }
    items.push(...roomDepthItems("terrace", t));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    if (!dayState.party) text(afterworkTime() ? "L'afterwork commence…" : "L'afterwork du vendredi (17 h) se tient ici 🍻", 200, 140, "#f7f7f7", 5, "center");
    hub.drawSeasonTerrace(t);  // seasons.js
    drawPartyOver("terrace", t);
    drawBuyOverlay("terrace", t);
  }
}
new TerraceRoom();
