// Buy mode, Sims style: a catalog of objects with styles (desks with their computer, lamps, fridges, stoves, aquarium,
// jukebox, plants, posters, rugs), bought with the household funds and placed in the office or the break room —
// by hand (the object follows the mouse, green where it fits) or automatically. Placed objects can be moved, restyled
// or sold back (75 %). In live mode they are interactive: a lamp lights up, the fridge gives a snack, the stove cooks,
// the aquarium is fed, the jukebox plays, a free computer is for the chief. Desks are objects too: a dev whose desk was
// sold works on a cardboard box, and is not happy about it.

import { hub, provide } from "../hub.js";
import { CAB, CHIEF_NAME, DESKS, H, S, TEAM, W, chief, ctx, cv, ents, hash, px, text, typeColor } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { R, outlineDefs, svgUrl } from "../svg/base.js";
import { SPRITES } from "../svg/sprites.js";
import { drawPerson } from "./scene.js";
import { crewAdd } from "../sims/crew.js";
import { CHIEF_LOOK, chiefGo, chiefToOffice } from "./chief.js";
import { setView, view } from "./lounge.js";
import { SHOP, itemOn, jukebox, shop, shopAction, toggleJukebox } from "./shop.js";
import { decor, woodSprite } from "./decor.js";
import { esc } from "../core/data.js";
import { canvasPoint } from "../ui/panel.js";
import { sfx, toast } from "../sims/progress.js";
import { earn, fmtSim, saveWallet, spend, wallet } from "../sims/money.js";
import { cookLevel } from "../social/relations.js";
import { HELPER, PAN, RECIPES, STOVE, recipeLock, shopItems } from "../social/kitchen.js";
import { say } from "../social/people.js";
import { closePie } from "../ui/pie.js";
import { CATALOG } from "../items/base.js";

const BUILD_KEY = "office-build", SELL_RATE = 0.75, MAX_ITEMS = 60;
export let furni = new SaveSlot(BUILD_KEY, { items: null, seq: 0 }).data;
export const saveBuild = () => SaveSlot.get(BUILD_KEY).save(furni);

/* ---------- the catalog: categories (the objects are in js/items/) ---------- */
export const BUY_CATS = [["bureau", "🪑", "Bureaux"], ["lumiere", "💡", "Éclairage"], ["cuisine", "🍳", "Cuisine"], ["deco", "🪴", "Déco"], ["loisirs", "🎵", "Loisirs"], ["garde", "🎩", "Garde-robe"]];
const defOf = type => CATALOG.find(d => d.type === type);
const styleOf = it => { const d = defOf(it.type); return d.styles.find(s => s.id === it.style) || d.styles[0]; };
const itemsIn = room => (furni.items || []).filter(it => it.room === room);
const deskItem = slot => (furni.items || []).find(it => it.type === "desk" && it.slot === slot);
export const hasDesk = slot => !!deskItem(slot);
export const devHasDesk = name => TEAM.includes(name) && hasDesk(TEAM.indexOf(name));
const itemRect = it => { const d = defOf(it.type); return it.type === "desk" ? { x: DESKS[it.slot].x - 18, y: DESKS[it.slot].y - 14, w: 36, h: 30 } : { x: it.x, y: it.y, w: d.w, h: d.h }; };
const sellPrice = it => Math.round(defOf(it.type).price * SELL_RATE / 10) * 10;

// first visit: the 8 desks, a fridge and a stove in the break room, and the decor already bought in the old shop
function seedBuild() {
  if (furni.items) return;
  const items = [], add = (type, style, room, x, y, extra = {}) => items.push({ uid: ++furni.seq, type, style, room, x, y, ...extra });
  DESKS.forEach((d, i) => add("desk", "decor", "office", d.x - 18, d.y - 14, { slot: i }));
  add("fridge", "blanc", "lounge", 216, 30); add("stove", "blanc", "lounge", 200, 44);
  const old = { lamp: ["lamp", "noire", 213, 22, { on: true }], aquarium: ["aquarium", "lagon", 235, 49], jukebox: ["jukebox", "classique", 262, 46],
    rug: ["bigrug", "marine", 150, 100], bigplant: ["plant", "verte", 376, 192], poster: ["poster", "nuit", 385, 24] };
  for (const [id, [type, style, x, y, extra]] of Object.entries(old)) if (shop.owned.includes(id) && !shop.off.includes(id)) add(type, style, "office", x, y, extra);
  furni.items = items; saveBuild();
}
seedBuild();

/* ---------- drawing the objects ---------- */
// each kind draws itself (js/items/): its art in the style bought, and what goes behind or over it
const drawItem = (it, t, alpha = 1) => defOf(it.type).draw(it, t, alpha);
// office: everything behind the desks and the people (rugs first); break room: rugs and wall objects here,
// the standing ones join the depth-sorted furniture (roomDepthItems)
export function drawRoomItems(room, t, layer = "all") {
  const its = itemsIn(room).filter(it => it.type !== "desk" && !(buy.moving && buy.moving.uid === it.uid));
  const rugs = its.filter(it => defOf(it.type).rug), rest = its.filter(it => !defOf(it.type).rug).sort((a, b) => (a.y + defOf(a.type).h) - (b.y + defOf(b.type).h));
  if (layer === "all" || layer === "rug") rugs.forEach(it => drawItem(it, t));
  if (layer === "all") rest.forEach(it => drawItem(it, t));
  if (layer === "wall") rest.filter(it => defOf(it.type).wall).forEach(it => drawItem(it, t));
}
export function roomDepthItems(room, t) {
  return itemsIn(room).filter(it => it.type !== "desk" && !defOf(it.type).rug && !defOf(it.type).wall && !(buy.moving && buy.moving.uid === it.uid))
    .map(it => ({ y: it.y + defOf(it.type).h - 2, draw: () => drawItem(it, t) }));
}
// a desk with its computer, in the style bought; no desk: a cardboard box and a laptop for the dev who sits there
function deskStyle(slot) { const it = deskItem(slot); return it ? styleOf(it) : null; }
const monitorSprite = map => SPRITES.monitor.recolor(map);
function drawNoDesk(d, ent, t) {
  if (!ent) return;
  px(d.x - 8, d.y + 5, 16, 11, "#b98b55"); px(d.x - 8, d.y + 5, 16, 1.4, "#d2a56d"); px(d.x - 1, d.y + 5, 2, 11, "#a37744"); px(d.x - 8, d.y + 15.4, 16, 0.8, "#00000044");
  px(d.x - 5.5, d.y - 0.5, 11, 6, "#2a2a33"); px(d.x - 4.8, d.y + 0.2, 9.6, 4.6, ent.agent.status === "working" ? "#13233a" : "#222230");
  if (ent.agent.status === "working") for (let l = 0; l < 3; l++) px(d.x - 4 + (l % 2), d.y + 1 + l * 1.4, 3 + ((hash(ent.agent.id) + l * 5 + Math.floor(t / 300)) % 5), 0.6, typeColor(ent.agent.type));
  px(d.x - 6, d.y + 4.6, 12, 0.8, "#55556a");
}

/* ---------- the kitchen follows the stove ---------- */
function kitchenStove() { return itemsIn("lounge").find(it => it.type === "stove") || null; }
const kitchenReady = () => !!kitchenStove() && itemsIn("lounge").some(it => it.type === "fridge");
function syncKitchen() {
  const s = kitchenStove(); if (!s) return;
  Object.assign(PAN, { x: s.x + 2, y: s.y - 1 });
  Object.assign(STOVE, { x: s.x + 7, y: Math.min(222, s.y + 24 + 16) });
  Object.assign(HELPER, { x: STOVE.x > 40 ? STOVE.x - 22 : STOVE.x + 22, y: STOVE.y });
}
// in front of an object, where a sim stands to use it
function frontOf(it) { const r = itemRect(it); return { x: Math.round(r.x + r.w / 2), y: Math.min(222, Math.max(76, r.y + r.h + 14)) }; }

/* ---------- live mode: using the objects ---------- */
export function hitItem(x, y, room) {
  const its = itemsIn(room).filter(it => buy.on || !defOf(it.type).rug).sort((a, b) => (itemRect(b).y + itemRect(b).h) - (itemRect(a).y + itemRect(a).h));
  const it = its.find(i => { const r = itemRect(i); return x >= r.x - 1 && x <= r.x + r.w + 1 && y >= r.y - 1 && y <= r.y + r.h + 1; });
  return it ? `item:${it.uid}` : null;
}
const itemByUid = uid => (furni.items || []).find(it => it.uid === +uid);
function itemPieItems(uid, sub) {
  const it = itemByUid(uid); if (!it) return [];
  if (sub === "cook") return RECIPES.map(rc => [`cook:${rc.id}`, rc.icon, rc.label, !kitchenReady() && rc.lvl <= cookLevel(CHIEF_NAME) ? "frigo + gazinière" : recipeLock(rc, cookLevel(CHIEF_NAME))]);
  if (sub === "shop") return shopItems();
  return defOf(it.type).pie(it);  // js/items/
}
function itemPieCenter(uid) {
  const it = itemByUid(uid); if (!it) return "";
  const d = defOf(it.type);
  return `<b>${esc(d.name)}</b><span class="muted">${esc(styleOf(it).name)}</span>${d.center(it)}`;
}
function itemPieAction(uid, id) {
  const it = itemByUid(uid); if (!it) return;
  defOf(it.type).act(it, id);  // js/items/
}
// the chief on a free computer: he walks to the desk, sits and plays a while, then goes back to his podium
function chiefToPc(slot) {
  const go = () => { const d = DESKS[slot]; if ([...ents.values()].some(e => e.desk === d && !e.leaving)) return say(CHIEF_NAME, "Quelqu'un y travaille."); chiefGo({ x: d.x, y: d.y + 22 }, c => { c.at = "pc"; c.pcSlot = slot; c.pcUntil = performance.now() + 14000; }); chief.manual = true; };
  if (hub.chiefBusyNow()) return say(CHIEF_NAME, "Pas maintenant, l'équipe a besoin de moi !");
  if (chief.room === "lounge") { chief.pendingOffice = go; chiefToOffice(); } else go();
}
function stepBuild(t) {
  syncKitchen();
  if (chief.pendingOffice && chief.room === "office") { const fn = chief.pendingOffice; chief.pendingOffice = null; fn(); }
  if (chief.at === "pc" && !chief.path.length && (t > chief.pcUntil || hub.chiefBusyNow())) chiefGo("podium");
  if (chief.at === "pc" && !chief.path.length && [...ents.values()].some(e => e.desk === DESKS[chief.pcSlot] && !e.leaving && !e.queued)) chiefGo("podium");
}
// the chief seated at a computer, drawn after the desks
export function drawChiefPc(t) {
  if (chief.room === "office" && chief.at === "chiefos" && !chief.path.length) return drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, seated: true, back: true, arms: "type", frame: Math.floor(t / 140) });
  if (chief.room !== "office" || chief.at !== "pc" || chief.path.length) return;
  const d = DESKS[chief.pcSlot], f = Math.floor(t / 200) % 2;
  px(d.x - 7, d.y - 11, 14, 8, "#1d3b2a"); px(d.x - 7 + ((t / 60) % 12), d.y - 6, 2, 2, "#ffd43b"); px(d.x - 6, d.y - 4.4, 12, 1, "#51cf66"); px(d.x + 2 - f, d.y - 9, 2, 2, "#ff6b6b");
  drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, seated: true, back: true, arms: "type", frame: Math.floor(t / 140) });
}

/* ---------- buy mode ---------- */
export const buy = { on: false, cat: "bureau", sel: null, style: null, placing: null, moving: null, pick: null, mx: -99, my: -99 };
const buyBox = document.getElementById("buy"), buyTool = document.getElementById("buytool"), buyBtn = document.getElementById("buybtn");
export function toggleBuy(open = !buy.on) {
  buy.on = open; buy.placing = buy.moving = buy.pick = null;
  document.body.classList.toggle("buy-on", open); buyBox.hidden = !open; buyBtn.classList.toggle("on", open); buyBtn.setAttribute("aria-expanded", open);
  buyTool.hidden = true; closePie(); if (open) { if (view === "game") setView("lounge"); renderBuy(); }
}
function thumbSvg(def, st) {
  let body;
  const w = def.w, h = def.h;
  if (def.type === "desk") {
    const wood = st.wood || decor.office.wood;
    body = `<g transform="translate(8 0)">${monitorSprite(st.screen).body()}</g><g transform="translate(0 11)">${woodSprite("desk", wood).body()}</g>` + R(10, 2, 16, 10, "#13233a");
    if (st.rgb) body += R(1, 29, 34, 0.8, "#b48cff");
    return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${w + 2} ${h + 2}">${outlineDefs(0.4)}<g filter="url(#o)">${body}</g></svg>`);
  }
  return def.art.url(def.artFor(st, def.thumbState()));
}
const roomOk = (def, room) => def.room === "any" || def.room === room;
export function renderBuy() {
  if (!buy.on) return;
  const room = hub.curRoom();
  const cats = BUY_CATS.map(([id, ic, label]) => `<button data-cat="${id}" class="${buy.cat === id ? "on" : ""}" title="${label}"><span class="ic">${ic}</span><span class="lbl">${label}</span></button>`).join("");
  let grid = "", detail = "";
  if (buy.cat === "construction") {  // projects (construct.js) and the objects of the category
    grid = hub.constructGridHtml() + CATALOG.filter(d => d.cat === "construction").map(d => `<button class="bitem${buy.sel === d.type ? " on" : ""}" data-sel="${d.type}"><img class="bthumb" alt="" src="${thumbSvg(d, d.styles[0])}"><b>${esc(d.name)}</b><span class="price">${fmtSim(d.price)}</span></button>`).join("");
    const d = buy.sel && defOf(buy.sel);
    if (d && d.cat === "construction") { const st = d.styles.find(s => s.id === buy.style) || d.styles[0];
      detail = `<div class="bdetail"><img class="bthumb big" alt="" src="${thumbSvg(d, st)}"><div class="bdesc"><b>${esc(d.name)} · ${esc(st.name)}</b><span class="muted">${esc(d.desc)}</span>
        <div class="swatches">${d.styles.map(s => `<button data-style="${s.id}" class="${s.id === st.id ? "on" : ""}" title="${esc(s.name)}" style="--sw:${s.sw}"></button>`).join("")}</div>
        <div class="bacts"><button data-place="hand"${wallet.funds < d.price ? " disabled" : ""}>🖐 Placer · ${fmtSim(d.price)}</button><button data-place="auto"${wallet.funds < d.price ? " disabled" : ""}>✨ Placement auto</button></div></div></div>`; }
  } else if (buy.cat === "garde") {
    grid = SHOP.map(it => { const own = shop.owned.includes(it.id);
      return `<div class="bitem${own ? " own" : ""}"><span class="bthumb big">${it.hat ? "🧢" : "👑"}</span><b>${esc(it.name)}</b><span class="price">${own ? (itemOn(it) ? "✓ porté" : "possédé") : fmtSim(it.price)}</span>
        <button data-wear="${it.id}"${!own && wallet.funds < it.price ? " disabled" : ""}>${own ? (itemOn(it) ? "Retirer" : "Porter") : "Acheter"}</button></div>`; }).join("");
  } else {
    const defs = CATALOG.filter(d => d.cat === buy.cat);
    grid = (buy.cat === "animaux" ? hub.petsGridHtml() : "") + defs.map(d => { const ok = roomOk(d, room), st = d.styles[0];
      return `<button class="bitem${buy.sel === d.type ? " on" : ""}" data-sel="${d.type}"${ok ? "" : ` disabled title="${d.room === "office" ? "Seulement au bureau" : "Seulement en salle de repos"}"`}>
        <img class="bthumb" alt="" src="${thumbSvg(d, st)}"><b>${esc(d.name)}</b><span class="price">${fmtSim(d.price)}</span></button>`; }).join("")
      || `<p class="muted">Rien ici.</p>`;
    const d = buy.sel && defOf(buy.sel);
    if (d) {
      const st = d.styles.find(s => s.id === buy.style) || d.styles[0];
      detail = `<div class="bdetail"><img class="bthumb big" alt="" src="${thumbSvg(d, st)}"><div class="bdesc"><b>${esc(d.name)} · ${esc(st.name)}</b><span class="muted">${esc(d.desc)}</span>
        <div class="swatches">${d.styles.map(s => `<button data-style="${s.id}" class="${s.id === st.id ? "on" : ""}" title="${esc(s.name)}" style="--sw:${s.sw}"></button>`).join("")}</div>
        <div class="bacts"><button data-place="hand"${!roomOk(d, room) || wallet.funds < d.price ? " disabled" : ""}>🖐 Placer · ${fmtSim(d.price)}</button><button data-place="auto"${!roomOk(d, room) || wallet.funds < d.price ? " disabled" : ""}>✨ Placement auto</button></div></div></div>`;
    }
  }
  buyBox.innerHTML = `<div class="bhead"><b>🛒 MODE ACHAT</b><span class="tabs">${["office", "lounge", ...hub.con.rooms].map(r => `<button data-room="${r}" class="${room === r ? "on" : ""}">${hub.Room.get(r).label}</button>`).join("")}</span>
    <span class="bfunds">💰 ${fmtSim(wallet.funds)}</span><button class="x" data-buy="close" title="Quitter le mode achat (Échap)">×</button></div>
    <div class="bbody"><nav class="bcats">${cats}</nav><div class="bgrid">${grid}</div>${detail}</div>
    <p class="bhint muted">${buy.placing || buy.moving ? "Clic sur la scène pour poser (vert = ça rentre) · clic droit ou Échap pour annuler" : "Clic sur un objet de la scène : style, déplacer, vendre."}</p>`;
}
buyBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.buy === "close") return toggleBuy(false);
  if (b.dataset.room) { setView(b.dataset.room); buy.placing = buy.moving = buy.pick = null; buyTool.hidden = true; return renderBuy(); }
  if (b.dataset.cat) { buy.cat = b.dataset.cat; buy.sel = null; return renderBuy(); }
  if (b.dataset.sel) { buy.sel = b.dataset.sel; buy.style = defOf(buy.sel).styles[0].id; return renderBuy(); }
  if (b.dataset.style) { buy.style = b.dataset.style; return renderBuy(); }
  if (b.dataset.project) return hub.buyProject(b.dataset.project);
  if (b.dataset.wear) { const it = SHOP.find(i => i.id === b.dataset.wear); shopAction(shop.owned.includes(it.id) ? "toggle" : "buy", it.id); return renderBuy(); }
  if (b.dataset.place === "hand") { buy.placing = { type: buy.sel, style: buy.style }; buy.pick = null; buyTool.hidden = true; return renderBuy(); }
  if (b.dataset.place === "auto") return autoPlace(buy.sel, buy.style);
});

// where an object can stand: inside the room, on the floor (or on the wall), without overlapping another object
function placement(type, x, y, room, ignore) {
  const d = defOf(type);
  if (d.slot) {  // desks snap to the desk spots of the office
    if (room !== "office") return null;
    let best = null;
    DESKS.forEach((s, i) => { const dist = Math.hypot(s.x - x, s.y - y); if ((!hasDesk(i) || deskItem(i)?.uid === ignore) && dist < 40 && (!best || dist < best.dist)) best = { slot: i, dist }; });
    return best && { slot: best.slot, x: DESKS[best.slot].x - 18, y: DESKS[best.slot].y - 14 };
  }
  x = Math.round(x - d.w / 2); y = Math.round(y - d.h + 2);
  if (x < 3 || x + d.w > W - 3) return null;
  if (d.wall) { if (y < 4 || y + d.h > 64) return null; }
  else if (y + d.h < 66 || y + d.h > 228 || y < 14) return null;
  const me = { x, y, w: d.w, h: d.h }, base = r => d.wall ? r : { x: r.x, y: r.y + r.h - 7, w: r.w, h: 7 };
  const hitR = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const o of itemsIn(room)) {
    if (o.uid === ignore || !!defOf(o.type).rug !== !!d.rug || !!defOf(o.type).wall !== !!d.wall) continue;
    if (hitR(base(me), base(itemRect(o)))) return null;
  }
  if (room === "office" && !d.rug && !d.wall) {  // not on a desk spot, the podium or the cabinet
    for (const s of DESKS) if (hitR(base(me), { x: s.x - 20, y: s.y - 6, w: 40, h: 32 })) return null;
    if (hitR(base(me), { x: 204, y: 80, w: 36, h: 14 }) || hitR(base(me), { x: CAB.x - 2, y: CAB.y, w: CAB.w + 4, h: CAB.h + 2 })) return null;
  }
  return { x, y };
}
function placeAt(type, style, spot, room) {
  if ((furni.items || []).length >= MAX_ITEMS) { toast("MODE ACHAT", "Trop d'objets", `${MAX_ITEMS} au maximum.`); return false; }
  const d = defOf(type);
  if (d.unique && furni.items.some(i => i.type === type)) { toast("MODE ACHAT", `Un seul ${d.name.toLowerCase()}`, "Déplace celui qui est déjà là."); return false; }
  if (!spend(d.price, d.name)) return false;
  const it = { uid: ++furni.seq, type, style, room, x: spot.x, y: spot.y, ...(d.slot ? { slot: spot.slot } : {}), ...(type === "lamp" ? { on: true } : {}) };
  furni.items.push(it); saveBuild(); sfx("achievement");
  dustAt(it);
  if (type === "desk") { const n = TEAM[it.slot]; crewAdd(n, { moral: 15 }); toast("MODE ACHAT", `${n} a de nouveau un bureau`, "Il est ravi."); }
  return true;
}
function autoPlace(type, style) {
  const room = hub.curRoom(), d = defOf(type);
  if (d.slot) { const i = DESKS.findIndex((_, k) => !hasDesk(k)); if (i < 0) return toast("MODE ACHAT", "Tous les bureaux sont là", "Vends-en un pour en changer."); placeAt(type, style, { slot: i, x: DESKS[i].x - 18, y: DESKS[i].y - 14 }, room); return renderBuy(); }
  const ys = d.wall ? [30, 20, 40] : [150, 120, 180, 100, 205, 84], xs = [];  // from the middle of the room outward, clear of the HUD corners
  for (let k = 0; k <= W / 2 - 40; k += 8) xs.push(W / 2 + k, W / 2 - k);
  for (const y of ys) for (const x of xs) { const sp = placement(type, x, y, room); if (sp) { placeAt(type, style, sp, room); return renderBuy(); } }
  toast("MODE ACHAT", "Pas de place libre", "Place-le à la main ou fais de la place.");
}
const dust = [];
export function dustAt(it) { const r = itemRect(it); for (let i = 0; i < 12; i++) dust.push({ x: r.x + Math.random() * r.w, y: r.y + r.h - Math.random() * 4, born: performance.now(), vx: (Math.random() - 0.5) * 0.02 }); }

function buyClick(p) {
  const room = hub.curRoom();
  if (buy.placing || buy.moving) {
    const type = (buy.placing || buy.moving).type, sp = placement(type, p.x, p.y, room, buy.moving?.uid);
    if (!sp) { sfx("fail"); return; }
    if (buy.placing) placeAt(type, buy.placing.style, sp, room);
    else {
      const it = buy.moving, oldSlot = it.slot;
      Object.assign(it, sp, { room }); saveBuild(); dustAt(it); sfx("commit");
      if (it.type === "desk" && oldSlot !== it.slot) { crewAdd(TEAM[oldSlot], { moral: -15 }); toast("MODE ACHAT", `${TEAM[oldSlot]} n'a plus de bureau 😠`, `Le bureau va à ${TEAM[it.slot]}.`); }
    }
    buy.placing = buy.moving = null; renderBuy(); return;
  }
  const id = room === "office" ? hitItem(p.x, p.y, "office") || deskSlotHit(p) : hitItem(p.x, p.y, "lounge");
  buy.pick = id ? itemByUid(id.slice(5)) : null;
  renderTool();
}
function deskSlotHit(p) { const i = DESKS.findIndex(d => hasDesk(DESKS.indexOf(d)) && Math.abs(p.x - d.x) <= 18 && p.y >= d.y - 14 && p.y <= d.y + 16); return i < 0 ? null : `item:${deskItem(i).uid}`; }
// the toolbar of a picked object: styles (free), move, sell
function renderTool() {
  const it = buy.pick; if (!it) { buyTool.hidden = true; return; }
  const d = defOf(it.type), r = itemRect(it), rect = cv.getBoundingClientRect();
  buyTool.innerHTML = `<b>${esc(d.name)}</b><span class="muted">${esc(styleOf(it).name)}${it.type === "desk" ? ` · bureau de ${esc(TEAM[it.slot])}` : ""}</span>
    <div class="swatches">${d.styles.map(s => `<button data-restyle="${s.id}" class="${s.id === it.style ? "on" : ""}" title="${esc(s.name)}" style="--sw:${s.sw}"></button>`).join("")}</div>
    <div class="bacts"><button data-tool="move">✋ Déplacer</button><button data-tool="sell">💲 Vendre +${fmtSim(sellPrice(it))}</button></div>`;
  buyTool.style.left = `${Math.max(10, Math.min(innerWidth - 270, rect.left + (r.x + r.w / 2) / W * rect.width - 130))}px`;
  buyTool.style.top = `${Math.max(64, rect.top + r.y / H * rect.height - 128)}px`;
  buyTool.hidden = false;
}
buyTool.addEventListener("click", ev => {
  const b = ev.target.closest("button"), it = buy.pick; if (!b || !it) return;
  if (b.dataset.restyle) { it.style = b.dataset.restyle; saveBuild(); dustAt(it); sfx("commit"); return renderTool(); }
  if (b.dataset.tool === "move") { buy.moving = it; buy.pick = null; buyTool.hidden = true; return renderBuy(); }
  if (b.dataset.tool === "sell") sellItem(it);
});
function sellItem(it) {
  const v = sellPrice(it);
  furni.items = furni.items.filter(x => x !== it); saveBuild();
  earn(v); wallet.log.unshift({ key: `sell:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: `Vente : ${defOf(it.type).name}`, total: v }); saveWallet();
  if (it.type === "jukebox" && jukebox.uid === it.uid && jukebox.playing) toggleJukebox();
  if (it.type === "desk") { const n = TEAM[it.slot]; crewAdd(n, { moral: -20 }); toast("MODE ACHAT", `${n} n'a plus de bureau 😠`, "Il travaillera sur un carton tant qu'il n'en a pas un nouveau."); }
  else toast("MODE ACHAT", `${defOf(it.type).name} vendu`, `+${fmtSim(v)} (${Math.round(SELL_RATE * 100)} % du prix)`);
  sfx("commit"); buy.pick = null; buyTool.hidden = true; renderBuy();
}
cv.addEventListener("mousemove", ev => { if (!buy.on) return; const p = canvasPoint(ev); buy.mx = p.x; buy.my = p.y; });
cv.addEventListener("contextmenu", ev => { if (buy.on && (buy.placing || buy.moving)) { ev.preventDefault(); buy.placing = buy.moving = null; renderBuy(); } });
addEventListener("keydown", ev => {
  if (!buy.on || ev.key !== "Escape") return;
  ev.stopImmediatePropagation();
  if (buy.placing || buy.moving) { buy.placing = buy.moving = null; renderBuy(); } else if (buy.pick) { buy.pick = null; buyTool.hidden = true; } else toggleBuy(false);
}, true);
buyBtn.onclick = () => toggleBuy();
document.getElementById("shopbtn").onclick = () => toggleBuy(true);
setInterval(() => { if (buy.on) { const f = buyBox.querySelector(".bfunds"); if (f) f.textContent = `💰 ${fmtSim(wallet.funds)}`; } }, 500);

// over the scene: lamp light, sawdust of a new object, and in buy mode the free desk spots, the picked object, the ghost
export function drawBuyOverlay(room, t) {
  const h = hub.clockNow().getHours(), night = h < 8 || h >= 19;
  for (const it of itemsIn(room)) if (it.type === "lamp" && it.on && !(hub.Happening.get("power").on && room === "office")) {
    const cx = (it.x + 5.5) * S, cy = (it.y + 4) * S, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 46 * S);
    g.addColorStop(0, `rgba(255,214,120,${night ? 0.32 : 0.12})`); g.addColorStop(1, "rgba(255,214,120,0)");
    ctx.fillStyle = g; ctx.fillRect(cx - 46 * S, cy - 46 * S, 92 * S, 92 * S);
  }
  for (let i = dust.length - 1; i >= 0; i--) { const p = dust[i], k = (t - p.born) / 900; if (k > 1) { dust.splice(i, 1); continue; } ctx.globalAlpha = 1 - k; px(p.x + p.vx * (t - p.born), p.y - k * 8, 1.2, 1.2, "#f4f2ea"); ctx.globalAlpha = 1; }
  if (!buy.on) return;
  ctx.fillStyle = "rgba(20,18,28,.18)"; ctx.fillRect(0, 0, W * S, H * S);  // a light veil, Sims buy mode
  if (room === "office") DESKS.forEach((d, i) => {
    if (hasDesk(i) && !(buy.moving?.type === "desk" && buy.moving.slot === i)) return;
    ctx.setLineDash([3 * S, 2 * S]); ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = S * 0.6; ctx.strokeRect((d.x - 18) * S, (d.y - 14) * S, 36 * S, 30 * S); ctx.setLineDash([]);
    text(`bureau de ${TEAM[i]}`, d.x, d.y, "#ffffffaa", 4, "center");
  });
  if (buy.pick && buy.pick.room === room) { const r = itemRect(buy.pick), k = 0.5 + Math.sin(t / 200) * 0.5; ctx.strokeStyle = `rgba(95,211,141,${0.5 + k * 0.5})`; ctx.lineWidth = S; ctx.strokeRect((r.x - 1) * S, (r.y - 1) * S, (r.w + 2) * S, (r.h + 2) * S); }
  const ghost = buy.placing || buy.moving;
  if (ghost && buy.mx > 0) {
    const type = ghost.type, d = defOf(type), sp = placement(type, buy.mx, buy.my, room, buy.moving?.uid);
    const g = { type, style: ghost.style, room, ...(sp || { x: Math.round(buy.mx - d.w / 2), y: Math.round(buy.my - d.h + 2), slot: null }) };
    if (type === "desk") {
      const x = sp ? sp.x : buy.mx - 18, y = sp ? sp.y : buy.my - 14, st = d.styles.find(s => s.id === ghost.style) || d.styles[0];
      ctx.globalAlpha = 0.7; monitorSprite(st.screen).draw(x + 8, y); woodSprite("desk", st.wood || decor.office.wood).draw(x, y + 11); ctx.globalAlpha = 1;
      ctx.strokeStyle = sp ? "#5fd38d" : "#ff6b6b"; ctx.lineWidth = S; ctx.strokeRect(x * S, y * S, 36 * S, 30 * S);
    } else {
      drawItem({ ...g, uid: -1 }, t, 0.7);
      ctx.strokeStyle = sp ? "#5fd38d" : "#ff6b6b"; ctx.lineWidth = S; ctx.strokeRect(g.x * S, g.y * S, d.w * S, d.h * S);
    }
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get buy() { return buy; }, get buyClick() { return buyClick; }, get chiefToPc() { return chiefToPc; }, get deskStyle() { return deskStyle; }, get devHasDesk() { return devHasDesk; }, get drawNoDesk() { return drawNoDesk; }, get frontOf() { return frontOf; }, get itemByUid() { return itemByUid; }, get itemPieAction() { return itemPieAction; }, get itemPieCenter() { return itemPieCenter; }, get itemPieItems() { return itemPieItems; }, get itemsIn() { return itemsIn; }, get kitchenReady() { return kitchenReady; }, get kitchenStove() { return kitchenStove; }, get monitorSprite() { return monitorSprite; }, get saveBuild() { return saveBuild; }, get stepBuild() { return stepBuild; }, get styleOf() { return styleOf; } });
