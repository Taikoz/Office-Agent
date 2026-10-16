// Buy mode, Sims style. The rooms are delivered bare (plaster, concrete): everything is bought with the household
// funds and placed by hand, in the isometric view: furniture on the floor on a grid, turned a quarter at a time (R),
// small objects on the top of a desk or a table, frames and windows on the walls, rugs, the walls' paper and the floor.
// Placed objects can be moved, turned, restyled or sold back (75 %). In live mode they are used (world/place.js): a
// desk is a dev's work station, chairs are sat on, the coffee machine gives the breaks, the games are played.

import { hub, provide } from "../hub.js";
import { CAB, CHIEF_NAME, DESKS, DOOR, S, TEAM, W, chief, ctx, cv, ents, fillScreen, hash, px, roomSize, text, typeColor } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { IK, OX, OY, P } from "../iso/engine.js";
import { ART } from "../svg/base.js";
import { drawPerson } from "./scene.js";
import { crewAdd } from "../sims/crew.js";
import { CHIEF_LOOK, chiefGo, chiefToOffice } from "./chief.js";
import { setView, view } from "./lounge.js";
import { SHOP, itemOn, jukebox, shop, shopAction, toggleJukebox } from "./shop.js";
import { DECOR_COLORS, DECOR_TYPES, applyDecor, decor, decorSwatch, rugCanvas } from "./decor.js";
import { esc } from "../core/data.js";
import { canvasPoint } from "../ui/panel.js";
import { sfx, toast } from "../sims/progress.js";
import { earn, fmtSim, saveWallet, spend, wallet } from "../sims/money.js";
import { cookLevel } from "../social/relations.js";
import { HELPER, PAN, RECIPES, SEATS, STOVE, TABLE, recipeLock, shopItems } from "../social/kitchen.js";
import { say } from "../social/people.js";
import { closePie } from "../ui/pie.js";
import { CATALOG } from "../items/base.js";
import { footDims, footOf, rotRect, spotsOf, surfaceOf, syncDesks, syncOffice, unrotRect } from "./place.js";

const BUILD_KEY = "office-build", SELL_RATE = 0.75, MAX_ITEMS = 200, GRID = 4;
// 2: a new game: the rooms bare, everything to buy (and 25 000 § in the wallet, sims/money.js)
export let furni = new SaveSlot(BUILD_KEY, { items: [], seq: 0 }, { version: 2, migrations: { 2: () => ({ items: [], seq: 0 }) } }).data;
export const saveBuild = () => { SaveSlot.get(BUILD_KEY).save(furni); syncAll(); };

/* ---------- the catalog: categories (the objects are in js/items/) ---------- */
export const BUY_CATS = [["bureau", "🗄️", "Bureaux"], ["chaises", "🪑", "Chaises"], ["fauteuils", "🛋️", "Fauteuils"], ["canapes", "🛋️", "Canapés"], ["poufs", "🫘", "Poufs"], ["tables", "🍽️", "Tables"], ["electronique", "🖥️", "Électronique"],
  ["tableaux", "🖼️", "Tableaux"], ["cadres", "🖼️", "Posters"], ["neons", "🌈", "Néons"], ["horloges", "🕰️", "Horloges"], ["rangement", "📚", "Rangement"], ["cafe", "☕", "Café"], ["cuisine", "🍳", "Cuisine"], ["loisirs", "🎮", "Loisirs"],
  ["plantes", "🪴", "Plantes"], ["deco", "🐠", "Déco"], ["lumiere", "💡", "Lumière"], ["fenetres", "🪟", "Fenêtres"], ["tapis", "🟫", "Tapis"],
  ["murs", "🧱", "Murs"], ["sols", "🟨", "Sols"], ["exterieur", "🌿", "Extérieur"], ["animaux", "🐾", "Animaux"], ["construction", "🏗️", "Construction"], ["garde", "🎩", "Garde-robe"]];
export const defOf = type => CATALOG.find(d => d.type === type);
const styleOf = it => { const d = defOf(it.type); return d.styles.find(s => s.id === it.style) || d.styles[0]; };
export const itemsIn = room => (furni.items || []).filter(it => it.room === room && defOf(it.type));
const itemByUid = uid => (furni.items || []).find(it => it.uid === +uid);
export const hasDesk = slot => !!DESKS[slot] && !DESKS[slot].floor;
export const devHasDesk = name => TEAM.includes(name) && hasDesk(TEAM.indexOf(name));
// its rect: on its wall (2D strip), or its footprint on the floor
export const itemRect = it => { const d = defOf(it.type); if (d.kind === "wall") return { x: it.x, y: it.y, w: d.w, h: d.h }; const [x0, y0, x1, y1] = footOf(it, d); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
const sellPrice = it => Math.round(defOf(it.type).price * SELL_RATE / 10) * 10;
const deskStyle = slot => { const it = (furni.items || []).find(o => defOf(o.type)?.workstation && o.slot === slot); return it ? styleOf(it) : null; };

/* ---------- drawing what is not a piece of furniture: rugs on the floor, objects on the walls ---------- */
export const drawItem = (it, t, alpha = 1) => defOf(it.type).draw2d(it, t, alpha);
function drawRug(it, alpha = 1) {
  const d = defOf(it.type), st = styleOf(it), [fw, fd] = footDims(d, it.rot), c = rugCanvas(d.shape || "uni", st.c || st.sw, fw, fd);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(c, Math.round(it.x * S), Math.round(it.y * S));
  ctx.globalAlpha = 1;
}
// layer "rug": the rugs (inside the floor's transform); "wall": the objects on the right wall; "leftwall": on the left one
export function drawRoomItems(room, t, layer = "rug") {
  for (const it of itemsIn(room)) {
    if (buy.moving && buy.moving.uid === it.uid) continue;
    const d = defOf(it.type);
    if (layer === "rug" && d.kind === "rug") drawRug(it);
    else if (layer === "wall" && d.kind === "wall" && (it.side || "back") === "back") wallItem(it, t, "back");
    else if (layer === "leftwall" && d.kind === "wall" && it.side === "left") wallItem(it, t, "left");
  }
}
// a wall object, clickable where it is drawn (a left-wall one too)
function wallItem(it, t, side) { drawItem(it, t); if (hub.ISO.drawing) hub.ISO.wallRegion(side, itemRect(it), it.uid); }
export const roomDepthItems = () => [];
// a dev without a desk works on the floor, with a laptop on his knees
function drawNoDesk(d, ent, t) {
  if (!ent) return;
  px(d.x - 5.5, d.y + 13, 11, 6, "#2a2a33"); px(d.x - 4.8, d.y + 13.7, 9.6, 4.6, ent.agent.status === "working" ? "#13233a" : "#222230");
  if (ent.agent.status === "working") for (let l = 0; l < 3; l++) px(d.x - 4 + (l % 2), d.y + 14.4 + l * 1.4, 3 + ((hash(ent.agent.id) + l * 5 + Math.floor(t / 300)) % 5), 0.6, typeColor(ent.agent.type));
  px(d.x - 6, d.y + 18.6, 12, 0.8, "#55556a");
}

/* ---------- what follows the objects: the work stations, the office's spots, the kitchen, the dining table ---------- */
// the kitchen of the break room: a stove and a fridge, whatever their model (items/*.js cook: "stove" / "fridge")
function kitchenStove() { return itemsIn("lounge").find(it => defOf(it.type).cook === "stove") || null; }
const kitchenReady = () => !!kitchenStove() && itemsIn("lounge").some(it => defOf(it.type).cook === "fridge");
function syncKitchen() {
  const s = kitchenStove();
  if (s) {
    const [x0, y0, x1, y1] = footOf(s), sp = spotsOf(s)[0];
    Object.assign(PAN, { x: Math.round((x0 + x1) / 2) - 5, y: 46, fx: (x0 + x1) / 2, fy: (y0 + y1) / 2, z: 16.2 });
    Object.assign(STOVE, { x: Math.round(sp.x), y: Math.round(sp.y) });
    Object.assign(HELPER, { x: STOVE.x > 40 ? STOVE.x - 18 : STOVE.x + 18, y: STOVE.y });
  }
  const table = itemsIn("lounge").find(it => defOf(it.type).role === "table");
  if (table) {
    const r = itemRect(table), seats = spotsOf(table);
    Object.assign(TABLE, { x: r.x, y: r.y, w: r.w, h: r.h, uid: table.uid });
    seats.forEach((sp, i) => { if (SEATS[i]) Object.assign(SEATS[i], { x: Math.round(sp.x), y: Math.round(sp.y), back: sp.face[1] < 0 || sp.face[0] < 0, via: null }); });
  } else TABLE.uid = null;
}
function syncAll() {
  for (const d of CATALOG) if (d.anchor) d.anchor((furni.items || []).find(i => i.type === d.type) || null);  // what hangs where (the board, the cabinet…)
  syncDesks(); syncOffice(); syncKitchen(); hub.syncMeeting?.(); hub.revalidateSpots?.();
}
// in front of an object, where someone stands to use it
function frontOf(it) {
  const sp = spotsOf(it)[0]; if (sp) return { x: Math.round(sp.x), y: Math.round(sp.y) };
  const r = itemRect(it); return { x: Math.round(r.x + r.w / 2), y: Math.min(roomSize(it.room).h - 10, Math.max(76, r.y + r.h + 8)) };
}

/* ---------- live mode: using the objects ---------- */
export function hitItem(x, y, room) {
  const its = itemsIn(room).filter(it => buy.on || defOf(it.type).kind !== "rug").sort((a, b) => (itemRect(b).y + itemRect(b).h) - (itemRect(a).y + itemRect(a).h));
  const it = its.find(i => { const r = itemRect(i); return x >= r.x - 1 && x <= r.x + r.w + 1 && y >= r.y - 1 && y <= r.y + r.h + 1; });
  return it ? `item:${it.uid}` : null;
}
function itemPieItems(uid, sub) {
  const it = itemByUid(uid); if (!it) return [];
  if (sub === "cook") return RECIPES.map(rc => [`cook:${rc.id}`, rc.icon, rc.label, !kitchenReady() && rc.lvl <= cookLevel(CHIEF_NAME) ? "frigo + gazinière" : recipeLock(rc, cookLevel(CHIEF_NAME))]);
  if (sub === "shop") return shopItems();
  const out = defOf(it.type).pie(it);  // js/items/
  if (defOf(it.type).role === "coffee" && it.room === "office") out.unshift(["coffee", "☕", "Prendre un café"]);
  if (defOf(it.type).role === "console") out.unshift(["play", "🎮", "Jouer à la console"]);
  if (defOf(it.type).role === "podium") out.unshift(["podium", "🎤", "Retour au podium"]);
  if (defOf(it.type).role === "conftable") out.unshift(["meet", "🤝", "Réunir l'équipe"]);
  return out;
}
function itemPieCenter(uid) {
  const it = itemByUid(uid); if (!it) return "";
  const d = defOf(it.type);
  return `<b>${esc(d.name)}</b><span class="muted">${esc(styleOf(it).name)}</span>${d.center(it)}`;
}
function itemPieAction(uid, id) {
  const it = itemByUid(uid); if (!it) return;
  if (id === "coffee") return hub.chiefOrder("coffee");
  if (id === "play") return hub.chiefOrder("console");
  if (id === "podium") return hub.chiefOrder("podium");
  if (id === "meet") return hub.startMeeting();
  defOf(it.type).act(it, id);  // js/items/
}
// the chief on a free computer: he walks to the desk, sits and plays a while, then goes back to his podium
function chiefToPc(slot) {
  const go = () => {
    const d = DESKS[slot]; if ([...ents.values()].some(e => e.desk === d && !e.leaving)) return say(CHIEF_NAME, "Quelqu'un y travaille.");
    // the computer on this desk sets the game (ui/pcgames.js); without one, nothing to play
    const pc = d.uid && itemsIn("office").find(o => o.on_ === d.uid && hub.GAME_OF?.[o.type]);
    if (!pc) return say(CHIEF_NAME, "Il n'y a pas d'ordinateur sur ce bureau.");
    chiefGo({ x: d.x, y: d.y + 22 }, c => { c.at = "pc"; c.pcSlot = slot; c.pcUntil = performance.now() + 14000; hub.openPcGame?.(pc.type, true); });
    chief.manual = true;
  };
  if (hub.chiefBusyNow()) return say(CHIEF_NAME, "Pas maintenant, l'équipe a besoin de moi !");
  if (chief.room === "lounge") { chief.pendingOffice = go; chiefToOffice(); } else go();
}
function stepBuild(t) {
  syncKitchen();
  if (chief.pendingOffice && chief.room === "office") { const fn = chief.pendingOffice; chief.pendingOffice = null; fn(); }
  if (chief.at === "pc" && !chief.path.length && (t > chief.pcUntil || hub.chiefBusyNow())) chiefGo("podium");
  if (chief.at === "pc" && !chief.path.length && [...ents.values()].some(e => e.desk === DESKS[chief.pcSlot] && !e.leaving && !e.queued)) chiefGo("podium");
}
// the chief seated at a computer (his own desk: ChiefOS, or a dev's: a game)
export function drawChiefPc(t) {
  if (chief.room === "office" && chief.at === "chiefos" && !chief.path.length) return drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, seated: true, back: true, dir: [0, -1], arms: "type", frame: Math.floor(t / 140) });
  if (chiefPcSlot() < 0) return;
  drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, seated: true, back: true, dir: DESKS[chief.pcSlot]?.face || [0, -1], arms: "type", frame: Math.floor(t / 140) });
}
// the desk where the chief plays (-1: none), and the game on its screen
export const chiefPcSlot = () => chief.room === "office" && chief.at === "pc" && !chief.path.length ? chief.pcSlot : -1;
// the screen while the chief plays: the game of this computer (ui/pcgames.js GAME_OF), in miniature
export function drawChiefPcScreen(d, t, type = "pc") {
  const f = Math.floor(t / 200) % 2, k = (t / 60) % 12, x = d.x - 7, y = d.y - 11, game = hub.GAME_OF?.[type] || "breakout";
  const bg = { snake: "#0e1a10", breakout: "#10142a", invaders: "#06060e", flappy: "#7fc4ff", pong: "#0a0a0a", runner: "#f4f2ea", racer: "#1c1c22" }[game];
  px(x, y, 14, 8, bg);
  if (game === "snake") { for (let i = 0; i < 4; i++) px(x + ((k + 8 - i) % 12) + 1, y + 4, 1, 1, i ? "#3aaf4a" : "#7dff8a"); px(x + 11, y + 2, 1, 1, "#ff6b6b"); }
  else if (game === "breakout") { for (let i = 0; i < 6; i++) px(x + 1 + i * 2.1, y + 1, 1.8, 1, ["#ff6b6b", "#ff9a3b", "#ffe14d", "#51cf66", "#3bc4ff", "#b46bff"][i]); px(x + k, y + 6.6, 3, 0.6, "#f4f2ea"); px(x + 13 - k, y + 3 + f, 0.8, 0.8, "#f4f2ea"); }
  else if (game === "invaders") { for (let i = 0; i < 5; i++) px(x + 1 + i * 2.5 + f * 0.5, y + 1.5, 1.4, 1, "#ff4fb8"); px(x + 2 + (k % 10), y + 6.5, 1.6, 1, "#4dff88"); px(x + 2.6 + (k % 10), y + 6.5 - (t / 40) % 5, 0.3, 0.8, "#fff"); }
  else if (game === "flappy") { px(x + 4 + (12 - k) % 12, y, 1.4, 3, "#51cf66"); px(x + 4 + (12 - k) % 12, y + 5.5, 1.4, 2.5, "#51cf66"); px(x + 3, y + 3.5 + f, 1.2, 1, "#c0303a"); }
  else if (game === "pong") { px(x + 0.6, y + 2 + f, 0.6, 3, "#f4f2ea"); px(x + 12.8, y + 3 - f, 0.6, 3, "#f4f2ea"); px(x + 1 + Math.abs(6 - k / 1) * 2, y + 1 + (k % 6), 0.8, 0.8, "#f4f2ea"); }
  else if (game === "runner") { px(x, y + 6.4, 14, 0.3, "#3a3a46"); px(x + 2, y + 4.6 - f * 1.4, 1.2, 1.6, "#3a3a46"); px(x + 13 - k, y + 5.2, 0.8, 1.2, "#c0303a"); }
  else { px(x + 4, y, 6, 8, "#2e2e38"); px(x + 6.8, y + ((k * 2) % 8), 0.3, 1.4, "#f4f2ea"); px(x + 7, y + 5.4, 1.4, 2, "#ff3b3b"); px(x + 5, y + (k % 8) - 1, 1.4, 2, "#3bc4ff"); }
}

/* ---------- buy mode ---------- */
export const buy = { on: false, cat: "bureau", sel: null, style: null, rot: 0, placing: null, moving: null, pick: null, mx: -99, my: -99, sx: -99, sy: -99 };
const buyBox = document.getElementById("buy"), buyTool = document.getElementById("buytool"), buyBtn = document.getElementById("buybtn");
export function toggleBuy(open = !buy.on) {
  buy.on = open; buy.placing = buy.moving = buy.pick = null;
  document.body.classList.toggle("buy-on", open); buyBox.hidden = !open; buyBtn.classList.toggle("on", open); buyBtn.setAttribute("aria-expanded", open);
  buyTool.hidden = true; closePie(); if (open) { if (view === "game") setView("lounge"); renderBuy(); }
}
const thumbs = new Map();
function thumbUrl(def, st) {
  const key = `${def.type}|${st.id}`;
  if (thumbs.has(key)) return thumbs.get(key);
  let url = "";
  if (def.thumb) url = def.thumb(st);
  else if (def.kind === "wall") url = def.art2d.url(def.artFor(st, def.thumbState()));
  else if (def.kind === "rug") url = rugCanvas(def.shape || "uni", st.c || st.sw, def.w, def.d).toDataURL();
  else if (def.thumbArt) url = ART[def.thumbArt]?.url(def.artFor(st, def.thumbState())) || "";
  else if (def.parts) {  // several arts: the main one (the seat of a sofa…)
    const p = def.parts[def.parts.length - 1]; url = ART[p.art]?.url({ ...def.artFor(st, def.thumbState()) }) || "";
  } else url = ART[def.art]?.url(def.artFor(st, def.thumbState())) || "";
  thumbs.set(key, url);
  return url;
}
const PAINT = { murs: { key: "wall", color: "wallColor", price: 400, label: "Murs" }, sols: { key: "floor", color: "floorColor", price: 600, label: "Sol" } };
function paintGrid(cat, room) {
  const P2 = PAINT[cat], cur = decor[room] || {};
  return DECOR_TYPES[P2.key].map(([type, label]) => {
    const colors = DECOR_COLORS[P2.color].slice(0, 8);
    return `<div class="bitem paint"><b>${esc(label)}</b><div class="pswatches">${colors.map(c => `<button class="psw${cur[P2.key] === type && cur[P2.color] === c ? " on" : ""}" data-paint="${cat}|${type}|${c}" title="${esc(label)} · ${c} · ${fmtSim(P2.price)}"><img alt="" src="${decorSwatch(P2.key === "wall" ? "wall" : "floor", type, c)}"></button>`).join("")}</div></div>`;
  }).join("");
}
export function renderBuy() {
  if (!buy.on) return;
  const room = hub.curRoom();
  const cats = BUY_CATS.map(([id, ic, label]) => `<button data-cat="${id}" class="${buy.cat === id ? "on" : ""}" title="${label}"><span class="ic">${ic}</span><span class="lbl">${label}</span></button>`).join("");
  let grid = "", detail = "";
  if (PAINT[buy.cat]) grid = paintGrid(buy.cat, room) + `<p class="muted">${PAINT[buy.cat].label} de cette pièce : ${fmtSim(PAINT[buy.cat].price)} le changement.</p>`;
  else if (buy.cat === "garde") {
    grid = SHOP.map(it => { const own = shop.owned.includes(it.id);
      return `<div class="bitem${own ? " own" : ""}"><span class="bthumb big">${it.hat ? "🧢" : "👑"}</span><b>${esc(it.name)}</b><span class="price">${own ? (itemOn(it) ? "✓ porté" : "possédé") : fmtSim(it.price)}</span>
        <button data-wear="${it.id}"${!own && wallet.funds < it.price ? " disabled" : ""}>${own ? (itemOn(it) ? "Retirer" : "Porter") : "Acheter"}</button></div>`; }).join("");
  } else {
    const defs = CATALOG.filter(d => d.cat === buy.cat);
    grid = (buy.cat === "animaux" ? hub.petsGridHtml() : "") + (buy.cat === "construction" ? hub.constructGridHtml() : "") + defs.map(d => { const ok = d.okIn(room), st = d.styles[0];
      const lock = hub.lockedFor?.(d);  // the office's level unlocks the dearest (sims/weekly.js)
      return `<button class="bitem${buy.sel === d.type ? " on" : ""}${lock ? " locked" : ""}" data-sel="${d.type}"${ok ? "" : ` disabled title="Pas dans cette pièce"`}${lock ? ` title="Niveau du bureau ${hub.unlockOf(d)} requis"` : ""}>
        <img class="bthumb" alt="" src="${thumbUrl(d, st)}"><b>${esc(d.name)}</b><span class="price">${lock ? `🔒 niv. ${hub.unlockOf(d)}` : fmtSim(d.price)}</span></button>`; }).join("")
      || `<p class="muted">Rien ici.</p>`;
    const d = buy.sel && defOf(buy.sel);
    if (d) {
      const st = d.styles.find(s => s.id === buy.style) || d.styles[0], lock = hub.lockedFor?.(d), off = !d.okIn(room) || wallet.funds < d.price || lock;
      detail = `<div class="bdetail"><img class="bthumb big" alt="" src="${thumbUrl(d, st)}"><div class="bdesc"><b>${esc(d.name)} · ${esc(st.name)}</b><span class="muted">${esc(d.desc)}</span>${lock ? `<span class="lockmsg">🔒 Débloqué au niveau ${hub.unlockOf(d)} du bureau (tu es niveau ${hub.officeLevel()}) : réussis des défis de la semaine.</span>` : ""}
        ${d.styles.length > 1 ? `<div class="swatches">${d.styles.map(s => `<button data-style="${s.id}" class="${s.id === st.id ? "on" : ""}" title="${esc(s.name)}" style="--sw:${s.sw}"></button>`).join("")}</div>` : ""}
        <div class="bacts"><button data-place="hand"${off ? " disabled" : ""}>🖐 Placer · ${fmtSim(d.price)}</button><button data-place="auto"${off || d.kind === "top" ? " disabled" : ""}>✨ Placement auto</button></div></div></div>`;
    }
  }
  buyBox.innerHTML = `<div class="bhead"><b>🛒 MODE ACHAT</b><span class="tabs">${["office", "lounge", ...hub.con.rooms].map(r => `<button data-room="${r}" class="${room === r ? "on" : ""}">${hub.Room.get(r).label}</button>`).join("")}</span>
    <span class="bfunds">💰 ${fmtSim(wallet.funds)}</span><button class="x" data-buy="close" title="Quitter le mode achat (Échap)">×</button></div>
    <div class="bbody"><nav class="bcats">${cats}</nav><div class="bgrid">${grid}</div>${detail}</div>
    <p class="bhint muted">${buy.placing || buy.moving ? "Clic pour poser (vert = ça rentre) · R ou clic droit… : tourner · Échap : annuler" : "Clic sur un objet de la pièce : style, tourner, déplacer, vendre. Glisser : se déplacer, molette : zoomer."}</p>`;
}
buyBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.buy === "close") return toggleBuy(false);
  if (b.dataset.room) { setView(b.dataset.room); buy.placing = buy.moving = buy.pick = null; buyTool.hidden = true; return renderBuy(); }
  if (b.dataset.cat) { buy.cat = b.dataset.cat; buy.sel = null; return renderBuy(); }
  if (b.dataset.sel) { buy.sel = b.dataset.sel; buy.style = defOf(buy.sel).styles[0].id; return renderBuy(); }
  if (b.dataset.style) { buy.style = b.dataset.style; return renderBuy(); }
  if (b.dataset.project) return hub.buyProject(b.dataset.project);
  if (b.dataset.paint) return buyPaint(...b.dataset.paint.split("|"));
  if (b.dataset.wear) { const it = SHOP.find(i => i.id === b.dataset.wear); shopAction(shop.owned.includes(it.id) ? "toggle" : "buy", it.id); return renderBuy(); }
  if (b.dataset.place === "hand") { buy.placing = { type: buy.sel, style: buy.style }; buy.pick = null; buyTool.hidden = true; return renderBuy(); }
  if (b.dataset.place === "auto") return autoPlace(buy.sel, buy.style);
});
function buyPaint(cat, type, color) {
  const P2 = PAINT[cat], room = hub.curRoom(), cur = decor[room] || {};
  if (cur[P2.key] === type && cur[P2.color] === color) return;
  if (!spend(P2.price, `${P2.label} : ${type}`)) return;
  applyDecor(room, { [P2.key]: type, [P2.color]: color }); sfx("commit"); renderBuy();
}

/* ---------- where an object can go ---------- */
// what stays (fixed): the doors and their way in
const FIXED_WALL = {  // the doors (and the office's breaker box)
  get office() { return [[211, 24, 12, 16], [DOOR.x - 16, 8, 36, 62]]; },
  lounge: [[6, 8, 36, 62], [265, 10, 30, 58], [314, 10, 30, 58]],
  meeting: [[6, 8, 36, 62]],
  terrace: [],
};
const FIXED_FLOOR = {
  office: () => [[DOOR.x - 16, 70, 32, 22]],
  lounge: () => [[6, 70, 36, 24], [265, 70, 30, 18], [314, 70, 30, 18]],
  meeting: () => [[6, 70, 36, 24]],
  terrace: () => [[2, 70, 50, 30]],
};
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const snap = v => Math.round(v / GRID) * GRID;
// a spot for this kind of object under the pointer p (a 2D point; p.sx, p.sy: on the screen): { x, y, side?, on_? } or null
export function placement(type, p, room, rot = 0, ignore = null) {
  const d = defOf(type), R = roomSize(room);
  if (!d.okIn(room)) return null;
  if (d.kind === "wall") { const s = wallGuess(d, p, room, ignore); return s && !s.bad ? { x: s.x, y: s.y, side: s.side } : null; }
  const [fw, fd] = footDims(d, rot);
  if (d.kind === "top") {  // on the top of a desk, a table, a counter: under the pointer at that height
    const w = hub.ISO.toWorld(p.sx, p.sy);
    for (const o of itemsIn(room).filter(o => o.uid !== ignore && defOf(o.type).surface).sort((a, b) => surfaceOf(b).z - surfaceOf(a).z)) {
      const s = surfaceOf(o), f = hub.ISO.floorAtZ(w.x, w.y, s.z);
      const r = ((o.rot || 0) + rot) % (d.rots || 4), [fw, fd] = footDims(d, r);  // turned like what it stands on (a screen toward the desk's seat), R turns it from there
      if (f.x < s.x || f.x > s.x + s.w || f.y < s.y || f.y > s.y + s.d) continue;
      const x = Math.max(s.x, Math.min(s.x + s.w - fw, f.x - fw / 2)), y = Math.max(s.y, Math.min(s.y + s.d - fd, f.y - fd / 2));
      if (fw > s.w + 0.1 || fd > s.d + 0.1) return null;
      const me = { x, y, w: fw, h: fd };
      if (itemsIn(room).some(q => q.uid !== ignore && q.on_ === o.uid && overlap(me, itemRect(q)))) return null;
      return { x, y, on_: o.uid, rot: r };
    }
    return null;
  }
  if (p.y < 60 || p.x < -10 || p.x > R.w + 10 || p.y > R.h + 10) return null;
  const x = Math.max(2, Math.min(R.w - 2 - fw, snap(p.x - fw / 2))), y = Math.max(70, Math.min(R.h - 2 - fd, snap(p.y - fd / 2)));  // kept inside, against a wall
  const me = { x, y, w: fw, h: fd };
  if (d.kind !== "rug") {
    if (FIXED_FLOOR[room]().some(([fx, fy, w, h]) => overlap(me, { x: fx, y: fy, w, h }))) return null;
    for (const o of itemsIn(room)) { const od = defOf(o.type); if (o.uid === ignore || od.kind !== "floor" || o.on_) continue; if (overlap(me, itemRect(o))) return null; }
  } else for (const o of itemsIn(room)) if (o.uid !== ignore && defOf(o.type).kind === "rug" && overlap(me, itemRect(o))) return null;
  return { x, y };
}
// a wall object goes on the wall nearest the pointer, Sims style, at its hanging height (eye level unless it says);
// bad: it does not fit there (a door, another object, a wall it does not go on)
const hangOf = d => d.hang ?? Math.max(2, Math.min(66 - d.h, Math.round(34 - d.h / 2)));
function wallFits(d, room, s, ignore = null) {
  const len = s.side === "back" ? roomSize(room).w : roomSize(room).h - 70, me = { x: s.x, y: s.y, w: d.w, h: d.h };
  if (d.sides && !d.sides.includes(s.side)) return false;  // the board, the whiteboard: on the right wall only
  if (s.x < 2 || s.x + d.w > len - 2) return false;
  if (s.side === "back" && (FIXED_WALL[room] || []).some(([fx, fy, fw, fh]) => overlap(me, { x: fx, y: fy, w: fw, h: fh }))) return false;
  return !itemsIn(room).some(o => o.uid !== ignore && defOf(o.type).kind === "wall" && (o.side || "back") === s.side && overlap(me, itemRect(o)));
}
function wallGuess(d, p, room, ignore = null) {
  if (room === "terrace" || p.sx == null || p.sx < 0) return null;
  const w = hub.ISO.toWorld(p.sx, p.sy), n = hub.ISO.nearWall(w.x, w.y); if (!n) return null;
  const len = n.side === "back" ? roomSize(room).w : roomSize(room).h - 70;
  const s = { side: n.side, x: Math.max(2, Math.min(len - 2 - d.w, snap(n.x - d.w / 2))), y: hangOf(d) };
  return { ...s, bad: !wallFits(d, room, s, ignore) };
}
function placeAt(type, style, spot, room, rot) {
  if ((furni.items || []).length >= MAX_ITEMS) { toast("MODE ACHAT", "Trop d'objets", `${MAX_ITEMS} au maximum.`); return false; }
  const d = defOf(type);
  if (d.unique && furni.items.some(i => i.type === type)) { toast("MODE ACHAT", `Un seul ${d.name.toLowerCase()}`, "Déplace celui qui est déjà là."); return false; }
  if (hub.lockedFor?.(d)) { toast("MODE ACHAT", "Pas encore débloqué", `Niveau ${hub.unlockOf(d)} du bureau requis.`); return false; }
  if (!spend(d.price, d.name)) return false;
  const it = { uid: ++furni.seq, type, style, room, rot: d.kind === "wall" ? 0 : rot, ...spot, ...(d.light ? { on: true } : {}) };
  furni.items.push(it); saveBuild(); sfx("achievement");
  dustAt(it);
  if (d.workstation && it.slot != null) { const n = TEAM[it.slot]; crewAdd(n, { moral: 15 }); toast("MODE ACHAT", `${n} a un bureau`, "Ajoute un ordinateur dessus et une chaise devant."); }
  return true;
}
function autoPlace(type, style) {
  const room = hub.curRoom(), R = roomSize(room), d = defOf(type);
  if (d.kind === "wall") {  // along the walls, from the back corner
    if (room !== "terrace") for (const side of d.sides || ["back", "left"]) for (let x = 4; x < (side === "back" ? R.w : R.h - 70); x += GRID) {
      const s = { side, x, y: hangOf(d) };
      if (wallFits(d, room, s)) { placeAt(type, style, s, room, 0); return renderBuy(); }
    }
    return toast("MODE ACHAT", "Pas de place au mur", `${d.name} : fais de la place au mur.`);
  }
  for (let ring = 0; ring < 60; ring++) for (let k = -ring; k <= ring; k++) for (const [dx, dy] of [[k, -ring], [k, ring], [-ring, k], [ring, k]]) {
    const p = { x: R.w / 2 + dx * 8, y: 70 + (R.h - 70) / 2 + dy * 8 }, sp = placement(type, p, room, buy.rot);
    if (sp) { placeAt(type, style, sp, room, buy.rot); return renderBuy(); }
  }
  toast("MODE ACHAT", "Pas de place libre", `${d.name} : place-le à la main ou fais de la place.`);
}
const dust = [];
export function dustAt(it) { const r = itemRect(it), wall = defOf(it.type).kind === "wall"; for (let i = 0; i < 12; i++) dust.push({ x: r.x + Math.random() * r.w, y: wall ? 76 : r.y + r.h - Math.random() * 4, born: performance.now(), vx: (Math.random() - 0.5) * 0.02 }); }

function buyClick(p) {
  const room = hub.curRoom();
  if (buy.placing || buy.moving) {
    const type = (buy.placing || buy.moving).type, sp = placement(type, p, room, buy.rot, buy.moving?.uid);
    if (!sp) { sfx("fail"); return; }
    if (buy.placing) placeAt(type, buy.placing.style, sp, room, buy.rot);
    else {
      const it = buy.moving, was = { x: it.x, y: it.y, rot: it.rot || 0 };
      delete it.side; delete it.on_;
      Object.assign(it, sp, { room, rot: sp.rot ?? (defOf(it.type).kind === "wall" ? 0 : buy.rot) });
      carryTop(it, was);  // what stands on it moves (and turns) with it
      saveBuild(); dustAt(it); sfx("commit");
    }
    buy.placing = buy.moving = null; renderBuy(); return;
  }
  const id = p.uid != null ? `item:${p.uid}` : hitItem(p.x, p.y, room);
  buy.pick = id ? itemByUid(id.slice(5)) : null;
  renderTool();
}
// the toolbar of a picked object: styles (free), turn, move, sell
function renderTool() {
  const it = buy.pick; if (!it) { buyTool.hidden = true; return; }
  const d = defOf(it.type), rect = cv.getBoundingClientRect();
  buyTool.innerHTML = `<b>${esc(d.name)}</b><span class="muted">${esc(styleOf(it).name)}${d.workstation && it.slot != null ? ` · bureau de ${esc(TEAM[it.slot])}` : ""}</span>
    ${d.styles.length > 1 ? `<div class="swatches">${d.styles.map(s => `<button data-restyle="${s.id}" class="${s.id === it.style ? "on" : ""}" title="${esc(s.name)}" style="--sw:${s.sw}"></button>`).join("")}</div>` : ""}
    <div class="bacts">${d.kind !== "wall" && d.rots > 1 ? `<button data-tool="turn">↻ Tourner</button>` : ""}<button data-tool="move">✋ Déplacer</button><button data-tool="sell">💲 Vendre +${fmtSim(sellPrice(it))}</button></div>`;
  const q = hub.ISO.toScreen(isoTopOf(it));  // where its top is on the screen, through the camera
  buyTool.style.left = `${Math.max(10, Math.min(innerWidth - 270, rect.left + q.x / W * rect.width - 130))}px`;
  buyTool.style.top = `${Math.max(64, rect.top + q.y / 232 * rect.height - 128)}px`;
  buyTool.hidden = false;
}
// what stands on an object follows it when it moves or turns: the same place on it, turned as much
function carryTop(host, was) {
  const hd = defOf(host.type), steps = ((host.rot || 0) - was.rot + 4) % 4;
  for (const o of furni.items) if (o.on_ === host.uid) {
    const od = defOf(o.type), [ow, odp] = footDims(od, o.rot);
    const model = unrotRect(hd, was.rot, [o.x - was.x, o.y - was.y, ow, odp]), [nx, ny] = rotRect(hd, host.rot || 0, model);
    o.x = host.x + nx; o.y = host.y + ny; o.room = host.room;
    o.rot = ((o.rot || 0) + steps) % (od.rots || 4);
    const [nw, nd] = footDims(od, o.rot), s = surfaceOf(host);  // its footprint turned: kept on the top
    if (s) { o.x = Math.max(s.x, Math.min(s.x + s.w - nw, o.x)); o.y = Math.max(s.y, Math.min(s.y + s.d - nd, o.y)); }
  }
}
// a quarter turn, in place (if it still fits)
function turnItem(it) {
  const d = defOf(it.type), rot = (it.rot + 1) % (d.rots || 4), [cx, cy] = [it.x + footDims(d, it.rot)[0] / 2, it.y + footDims(d, it.rot)[1] / 2];
  const sp = d.kind === "top" ? { x: it.x, y: it.y, on_: it.on_ } : placement(it.type, { x: cx, y: cy, sx: -1, sy: -1 }, it.room, rot, it.uid);
  if (!sp) { sfx("fail"); toast("MODE ACHAT", "Pas la place de le tourner", "Déplace-le d'abord."); return; }
  const was = { x: it.x, y: it.y, rot: it.rot || 0 };
  Object.assign(it, sp, { rot }); carryTop(it, was); saveBuild(); sfx("commit"); renderTool();
}
buyTool.addEventListener("click", ev => {
  const b = ev.target.closest("button"), it = buy.pick; if (!b || !it) return;
  if (b.dataset.restyle) { it.style = b.dataset.restyle; saveBuild(); dustAt(it); sfx("commit"); return renderTool(); }
  if (b.dataset.tool === "turn") return turnItem(it);
  if (b.dataset.tool === "move") { const host = it.on_ && itemByUid(it.on_); buy.moving = it; buy.rot = ((it.rot || 0) - (host?.rot || 0) + 4) % (defOf(it.type).rots || 4); buy.pick = null; buyTool.hidden = true; return renderBuy(); }  // on a desk: turned from the desk's way
  if (b.dataset.tool === "sell") sellItem(it);
});
function sellItem(it) {
  const tops = furni.items.filter(o => o.on_ === it.uid), v = [it, ...tops].reduce((s, o) => s + sellPrice(o), 0);
  furni.items = furni.items.filter(x => x !== it && !tops.includes(x)); saveBuild();
  earn(v); wallet.log.unshift({ key: `sell:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: `Vente : ${defOf(it.type).name}`, total: v }); saveWallet();
  if (it.type === "jukebox" && jukebox.uid === it.uid && jukebox.playing) toggleJukebox();
  if (defOf(it.type).workstation && it.slot != null) { const n = TEAM[it.slot]; crewAdd(n, { moral: -20 }); toast("MODE ACHAT", `${n} n'a plus de bureau 😠`, "Il travaillera par terre tant qu'il n'en a pas un nouveau."); }
  else toast("MODE ACHAT", `${defOf(it.type).name} vendu`, `+${fmtSim(v)} (${Math.round(SELL_RATE * 100)} % du prix${tops.length ? ", avec ce qu'il y avait dessus" : ""})`);
  sfx("commit"); buy.pick = null; buyTool.hidden = true; renderBuy();
}
cv.addEventListener("mousemove", ev => { if (!buy.on) return; const p = canvasPoint(ev); buy.mx = p.x; buy.my = p.y; buy.sx = p.sx; buy.sy = p.sy; });
cv.addEventListener("contextmenu", ev => { if (buy.on && (buy.placing || buy.moving)) { ev.preventDefault(); buy.rot = (buy.rot + 1) % (defOf((buy.placing || buy.moving).type).rots || 4); } });
addEventListener("keydown", ev => {
  if (!buy.on || ev.target.closest?.("input, textarea")) return;
  if (ev.key === "r" || ev.key === "R") {  // R turns, in the buy mode (not the day's report)
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (buy.placing || buy.moving) buy.rot = (buy.rot + 1) % (defOf((buy.placing || buy.moving).type).rots || 4); else if (buy.pick) turnItem(buy.pick);
    return;
  }
  if (ev.key === "Delete" && buy.pick) return sellItem(buy.pick);
  if (ev.key !== "Escape") return;
  ev.stopImmediatePropagation();
  if (buy.placing || buy.moving) { buy.placing = buy.moving = null; renderBuy(); } else if (buy.pick) { buy.pick = null; buyTool.hidden = true; } else toggleBuy(false);
}, true);
buyBtn.onclick = () => toggleBuy();
document.getElementById("shopbtn").onclick = () => toggleBuy(true);
setInterval(() => { if (buy.on) { const f = buyBox.querySelector(".bfunds"); if (f) f.textContent = `💰 ${fmtSim(wallet.funds)}`; } }, 500);

/* ---------- over the room in the buy mode ---------- */
// the top of an object on the world (isometric view), for its toolbar
function isoTopOf(it) {
  const d = defOf(it.type), r = itemRect(it);
  if (d.kind === "wall") return it.side === "left" ? P(0, roomSize(it.room).h - r.x - r.w / 2, (70 - r.y) * IK) : { x: OX + (r.x + r.w / 2) * IK, y: OY + (r.x + r.w / 2) * IK / 2 - (70 - r.y) * IK };
  return P(r.x + r.w / 2, r.y + r.h / 2, (ART[d.art]?.H || 20) + d.baseZ(it));
}
export function drawBuyOverlayIso(room, t, G) {
  for (let i = dust.length - 1; i >= 0; i--) { const p = dust[i], k = (t - p.born) / 900; if (k > 1) { dust.splice(i, 1); continue; } ctx.globalAlpha = 1 - k; G.put(p.x, p.y, p.x, Math.max(72, p.y), 0, () => px(p.x + p.vx * (t - p.born), p.y - k * 8, 1.2, 1.2, "#f4f2ea")); ctx.globalAlpha = 1; }
  if (!buy.on) return;
  fillScreen("rgba(20,18,28,.14)");
  const outline = (r, col, side = null, z = 0) => {
    const draw = () => { ctx.strokeStyle = col; ctx.lineWidth = S * 0.8; ctx.strokeRect(r.x * S, r.y * S, r.w * S, r.h * S); };
    if (side === "back") return G.onBackWall(draw);
    if (side === "left") return G.onLeftWall(draw);
    if (z) { ctx.save(); ctx.translate(0, -z * S); G.onFloor(draw); ctx.restore(); return; }
    G.onFloor(draw);
  };
  if (buy.pick && buy.pick.room === room) {
    const it = buy.pick, d = defOf(it.type), k = 0.5 + Math.sin(t / 200) * 0.5;
    outline(itemRect(it), `rgba(95,211,141,${0.5 + k * 0.5})`, d.kind === "wall" ? it.side || "back" : null, d.baseZ(it));
  }
  const ghost = buy.placing || buy.moving;
  if (!ghost || buy.mx < -50) return;
  const type = ghost.type, d = defOf(type), p = { x: buy.mx, y: buy.my, sx: buy.sx, sy: buy.sy }, sp = placement(type, p, room, buy.rot, buy.moving?.uid), col = sp ? "#5fd38d" : "#ff6b6b";
  const [fw, fd] = footDims(d, buy.rot);
  const g = { uid: -1, type, style: ghost.style, room, rot: buy.rot, ...(sp || { x: snap(buy.mx - fw / 2), y: snap(buy.my - fd / 2) }) };
  if (d.kind === "wall") {  // on the nearest wall, red where it does not fit
    const s = wallGuess(d, p, room, buy.moving?.uid); if (!s) return;
    const gw = { ...g, x: s.x, y: s.y, side: s.side };
    (s.side === "left" ? G.onLeftWall : G.onBackWall).call(G, () => drawItem(gw, t, s.bad ? 0.4 : 0.75));
    return outline(itemRect(gw), s.bad ? "#ff6b6b" : "#5fd38d", s.side);
  }
  if (d.kind === "rug") { G.onFloor(() => drawRug(g, 0.75)); return outline(itemRect(g), col); }
  if (d.kind === "top" && !sp) return;
  for (const piece of d.pieces(g, t, G, 0.7)) piece.draw();
  outline(itemRect(g), col, null, d.baseZ(g));
}
export function drawBuyOverlay() {}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get buy() { return buy; }, get buyClick() { return buyClick; }, get chiefToPc() { return chiefToPc; }, get defOf() { return defOf; }, get deskStyle() { return deskStyle; }, get devHasDesk() { return devHasDesk; }, get drawNoDesk() { return drawNoDesk; }, get frontOf() { return frontOf; }, get itemByUid() { return itemByUid; }, get itemPieAction() { return itemPieAction; }, get itemPieCenter() { return itemPieCenter; }, get itemPieItems() { return itemPieItems; }, get itemsIn() { return itemsIn; }, get kitchenReady() { return kitchenReady; }, get kitchenStove() { return kitchenStove; }, get saveBuild() { return saveBuild; }, get stepBuild() { return stepBuild; }, get styleOf() { return styleOf; }, get syncAll() { return syncAll; } });
setTimeout(syncAll, 0);  // once every object kind is registered (js/items/)
