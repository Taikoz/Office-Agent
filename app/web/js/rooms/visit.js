// Visiting another chief's office (world/peers.js): its rooms as its page sent them (sizes, decor, furniture), drawn
// with our own furniture code; its team living there (at their desks, in the break room, at the gym…, as its page
// shares it: world/share.js); its owner and its other visitors. Our avatar walks where we click (our chief at home
// stays put). A click on a dev: say hello, talk, cheer, a coffee, a kudos (its page answers); on an object: sit, play,
// take a coffee (our avatar only), or switch a lamp, a blind, the music (its page does it). A bar at the top: its
// rooms, its team (who does what, who works best), and back home.

import { hub } from "../hub.js";
import { CHIEF_NAME, ROOM, badge, px, text } from "../core/core.js";
import { ART } from "../svg/base.js";
import { esc } from "../core/data.js";
import { bubble, drawPerson, headroom } from "../world/scene.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { chiefHat } from "../world/chiefedit.js";
import { DECOR_DEFAULT, decor, doorSprite, drawWall, roomFloorCanvas } from "../world/decor.js";
import { drawRoomItems, furni, itemRect } from "../world/build.js";
import { spotsOf } from "../world/place.js";
import { isoItems, lampsOver, leftWallDecor } from "../iso/rooms.js";
import { drawPeer, emotePose, endVisit, liftOf, net, netPose, personBox, sendAct, smoothed, visitRoom } from "../world/peers.js";
import { Room } from "./base.js";

const ROOM_FR = { office: "Bureau", lounge: "Repos", meeting: "Réunion", terrace: "Terrasse", gym: "Sport", library: "Bibliothèque" };
const HEX = /^#[0-9a-fA-F]{6}$/, WORD = /^[a-zé-ëï]{1,16}$/;
const clamp = (v, a, b, d) => Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : d;
// what another page sent is data: only known kinds, numbers, short words and colours go into our drawing
function cleanDecor(d, room) {
  const out = { ...(DECOR_DEFAULT[room] || DECOR_DEFAULT.office) };
  for (const [k, v] of Object.entries(d || {})) if (k in out && typeof v === "string" && (HEX.test(v) || WORD.test(v))) out[k] = v;
  return out;
}
function cleanItems(list, room) {
  return (Array.isArray(list) ? list : []).filter(it => it && it.room === room && hub.defOf(it.type) && !hub.defOf(it.type).anchor).slice(0, 400).map(it => ({
    uid: clamp(it.uid, 0, 1e9, 0), type: it.type, room: "visit", x: clamp(it.x, -50, 900, 0), y: clamp(it.y, 0, 500, 70), rot: clamp(it.rot, 0, 3, 0) | 0,
    style: typeof it.style === "string" ? it.style.slice(0, 20) : null, ...(it.side === "left" || it.side === "back" ? { side: it.side } : {}),
    ...(it.on_ != null ? { on_: clamp(it.on_, 0, 1e9, 0) } : {}), on: !!it.on, closed: !!it.closed, off: !!it.off }));
}
// the doors of the visited room, where its owner's page has them (rooms/office.js, rooms/lounge.js, rooms/built.js): the
// office's to the break room at its right end, the break room's back to the office and to the meeting room and the
// terrace (when built), the other rooms' back to the office; a click walks there and goes through
const LOUNGE_DOORS = [{ to: "meeting", x: 269, label: "🤝 RÉUNION" }, { to: "terrace", x: 318, label: "🌿 TERRASSE" }];
function doorsOf(v) {
  const has = r => v.layout.rooms.includes(r), out = [];
  if (v.room === "office") { if (has("lounge")) out.push({ to: "lounge", x: ROOM.visit.w - 68, w: 30, kind: "plate", label: "☕ REPOS" }); }
  else if (v.room !== "terrace") out.push({ to: "office", x: 8, w: 30, kind: "back", label: "← BUREAU" });
  if (v.room === "lounge") for (const d of LOUNGE_DOORS) if (has(d.to)) out.push({ ...d, w: 24, kind: "room" });
  return out;
}
function drawDoors(v) {
  for (const d of doorsOf(v)) {
    if (d.kind === "room") { ART.roomdoor.draw(d.x, 19, { room: d.to, built: true }); px(d.x - 2, 12, 28, 6, "#f7f7f7"); text(d.label, d.x + 12, 12.6, "#081746", 3.6, "center"); continue; }
    doorSprite("visit").draw(d.x, 20);
    if (d.kind === "plate") { px(d.x + 1, 10, 28, 8, "#f7f7f7"); text(d.label, d.x + 15, 10.6, "#081746", 4, "center"); }
    else text(d.label, d.x + 15, 14, "#51cf66", 4, "center");
  }
}
// where we come out in the next room: by the door back to the room we left
function entryOf(from, to, layout) {
  const w = clamp(layout.sizes?.[to]?.[0], 400, 840, 560);
  if (to === "office") return { x: w - 54, y: 80 };
  if (to === "lounge") { const d = LOUNGE_DOORS.find(x => x.to === from); return { x: d ? d.x + 12 : 23, y: 80 }; }
  return to === "terrace" ? { x: 50, y: 110 } : { x: 23, y: 80 };
}
function goThrough(d) {
  const v = net.visit; if (!v) return;
  card.close();
  walkTo(d.x + d.w / 2, 76, () => { const from = v.room; visitRoom(d.to, entryOf(from, d.to, v.layout)); });
}

const MOOD = m => m >= 75 ? "😄" : m >= 50 ? "🙂" : m >= 25 ? "😐" : "😟";
const here = v => (v.crew || []).filter(m => m.room === v.room && m.st !== "away");  // away: at an afterwork elsewhere
const score = m => (m.sk || []).reduce((s, k) => s + k[1], 0) * 10 + (m.kudos || 0);

class VisitView extends Room {
  constructor() { super("visit", "🚪 Visite"); this.last = 0; }
  // the visited room's size, decor and furniture in place of ours, for this frame only
  frame(t) {
    const v = net.visit; if (!v) return;
    const s = v.layout.sizes?.[v.room] || [];
    Object.assign(ROOM.visit, { w: clamp(s[0], 400, 840, 560), h: clamp(s[1], 232, 420, 300) });
    if (v.cleanFor !== v.layout || v.cleanRoom !== v.room) {  // cleaned once per plan and room, not every frame
      v.items = cleanItems(v.layout.items, v.room); v.decor = cleanDecor(v.layout.decor?.[v.room], v.room); v.cleanFor = v.layout; v.cleanRoom = v.room; applyLocal(v);
    }
    decor.visit = v.decor;
    const mine = furni.items;
    furni.items = v.items;
    try { super.frame(t); } finally { furni.items = mine; }
  }
  renderIso(t, G) {
    const v = net.visit, R = ROOM.visit, dt = Math.min(60, t - (this.last || t)); this.last = t;
    // our avatar walks to where we clicked, then does what was asked there (sit, play, a coffee…)
    const dx = v.tx - v.x, dy = v.ty - v.y, dist = Math.hypot(dx, dy), sp = 0.085 * dt;
    if (dist > sp) { v.x += dx / dist * sp; v.y += dy / dist * sp; v.dir = [dx, dy]; }
    else { v.x = v.tx; v.y = v.ty; if (v.dir) { v.dir = null; const fn = v.onArrive; v.onArrive = null; fn?.(t); } }
    if (v.pose?.until && t > v.pose.until) v.pose = null;
    const outdoors = v.room === "terrace";
    G.back(() => {
      G.shell(outdoors ? { floor: roomFloorCanvas("visit", R.h - 70, [], R.w), walls: false } : { wall: () => drawWall("visit"), wallColor: decor.visit.wallColor, floor: roomFloorCanvas("visit", R.h - 70, [], R.w) });
      G.onFloor(() => drawRoomItems("visit", t, "rug"));
      if (!outdoors) { G.onBackWall(() => { drawDoors(v); drawRoomItems("visit", t, "wall"); }); G.onLeftWall(() => leftWallDecor("visit", t)); }
    });
    const items = [], over = [];
    isoItems("visit", t, G, items);
    // its team, in this room
    for (const m of here(v)) {
      const s = smoothed(`c:${v.pid}:${m.n}`, m, t), z = liftOf(m, s, t), sel = v.sel === m.n;
      items.push({ pt: [s.x, s.y], draw: () => G.put(s.x, s.y, s.x, s.y, z, () => drawPerson(s.x, s.y, { ...m.look }, netPose(m, s, t, { smile: m.mood >= 50 })), personBox(s.x, s.y)) });
      over.push(() => G.put(s.x, s.y, s.x, s.y, z, () => {
        const seated = !!s.pose?.seated;
        badge(s.x, s.y + (seated ? -3 : 2), m.n, sel ? "#fbaa08" : m.c || "#4090d7");
        if (m.b) bubble(s.x, s.y - (seated ? 22 : 24) - headroom(), m.b, "#f7f7f7", "#081746");
      }));
    }
    // its owner (at home) and its other visitors, in this room; then us
    for (const p of net.peers) {
      const there = p.room === v.room && ((p.pid === v.pid && !p.visiting) || (p.visiting === v.pid && p.pid !== net.pid));
      if (!there) continue;
      const s = smoothed(p.pid, p, t);
      items.push({ pt: [s.x, s.y], draw: () => G.put(s.x, s.y, s.x, s.y, liftOf(p, s, t), () => drawPeer(p, t, s.x, s.y, s), personBox(s.x, s.y)) });
    }
    const walking = !!v.dir, pose = !walking && v.pose ? v.pose : {}, z = pose.z || 0;
    items.push({ pt: [v.x, v.y], draw: () => G.put(v.x, v.y, v.x, v.y, z, () => {
      const em = !walking && net.emote && t < net.emote.until ? net.emote.key : "";
      drawPerson(v.x, v.y, CHIEF_LOOK, emotePose(em, t, { tux: true, smile: true, hat: chiefHat(), dir: walking ? v.dir : pose.dir, seated: !!pose.seated, back: !!pose.back, arms: pose.arms || "down",
        frame: walking ? Math.floor(t / 180) : pose.arms === "type" || pose.arms === "up" ? Math.floor(t / 260) : 0 }));
      if (pose.cup) { px(v.x + 4, v.y - 13, 2.5, 3, "#f4f2ea"); px(v.x + 4, v.y - 13, 2.5, 0.8, "#6d4a2e"); }
    }) });
    G.drawSorted(items);
    lampsOver("visit");
    for (const fn of over) fn();
    G.put(v.x, v.y, v.x, v.y, z, () => {
      badge(v.x, v.y + (pose.seated ? -3 : 2), `${CHIEF_NAME} 👑`, "#fbaa08");
      if (t < v.until) bubble(v.x, v.y - 24 - headroom(), v.bubble, "#f7f7f7", "#081746");
    });
  }
  // a click: a dev, an object, or the floor (our avatar goes there)
  click(p) {
    const v = net.visit; if (!v || !(p.x > -900)) return true;
    const t = performance.now();
    const door = p.y < 72 && doorsOf(v).find(d => p.x >= d.x - 2 && p.x <= d.x + d.w + 2 && p.y >= 8);
    if (door) { goThrough(door); return true; }
    const m = here(v).map(m => ({ m, s: smoothed(`c:${v.pid}:${m.n}`, m, t) })).sort((a, b) => b.s.y - a.s.y)
      .find(({ s }) => Math.abs(p.x - s.x) <= 8 && p.y >= s.y - 26 && p.y <= s.y + 4);
    if (m) { v.sel = m.m.n; card.mate(m.m); return true; }
    const it = [...(v.items || [])].filter(i => hub.defOf(i.type).kind !== "rug").sort((a, b) => (itemRect(b).y + itemRect(b).h) - (itemRect(a).y + itemRect(a).h))
      .find(i => { const r = itemRect(i); return p.x >= r.x - 1 && p.x <= r.x + r.w + 1 && p.y >= r.y - 1 && p.y <= r.y + r.h + 1; });
    if (it && card.item(it)) return true;
    card.close();
    walkTo(p.x, p.y);
    return true;
  }
  hit() { return null; }
}
new VisitView();

function walkTo(x, y, then = null) {
  const v = net.visit; if (!v) return;
  v.tx = Math.max(6, Math.min(ROOM.visit.w - 6, x)); v.ty = Math.max(74, Math.min(ROOM.visit.h - 4, y));
  v.pose = null; v.onArrive = then; v.dir = v.dir || [v.tx - v.x, v.ty - v.y];
}
const say = (text, ms = 3500) => { const v = net.visit; if (v) Object.assign(v, { bubble: text, until: performance.now() + ms }); };
// a switch we just pressed shows at once; the owner's page confirms it with its next plan (world/peers.js)
const pending = new Map();  // uid → { key, value, until }
function applyLocal(v) {
  const t = performance.now();
  for (const [uid, p] of pending) { if (t > p.until) { pending.delete(uid); continue; } const it = v.items.find(i => i.uid === uid); if (it) it[p.key] = p.value; }
}

/* ---------- the card at the bottom: a dev, an object, the team ---------- */
const box = document.createElement("div");
box.id = "visitcard"; box.hidden = true;
document.body.append(box);
const show = html => { if (box.innerHTML !== html) box.innerHTML = html; box.hidden = false; };  // unchanged: the buttons stay (a click is not lost)
const pieOf = it => { try { return hub.defOf(it.type).pie(it) || []; } catch (_) { return []; } };  // made for our own objects: never trust it here
// the field a switch flips (on, off, closed): the one that changes what its menu says
const switchKey = (it, what) => ["on", "off", "closed"].find(k => { const a = pieOf(it).find(x => x[0] === what), b = pieOf({ ...it, [k]: !it[k] }).find(x => x[0] === what); return a && b && a[2] !== b[2]; });
const card = {
  kind: "", target: null,
  close() { box.hidden = true; this.kind = ""; this.target = null; if (net.visit) net.visit.sel = ""; },
  mate(m) {
    this.kind = "mate"; this.target = m.n;
    const skills = (m.sk || []).map(([l, n]) => `<span class="chip">${esc(l)} <b>niv. ${n}</b></span>`).join("") || `<span class="muted">pas encore de mission livrée</span>`;
    show(`<button class="x" data-vc="close" aria-label="Fermer">✕</button>
      <div class="vchead"><b style="color:${HEX.test(m.c) ? m.c : "#4090d7"}">${esc(m.n)}</b><span class="muted">${esc(m.tag || "")} ${esc(m.what || "")}</span><span title="humeur">${MOOD(m.mood)}</span></div>
      <div class="vcskills">${skills}${m.kudos ? `<span class="chip">⭐ ${m.kudos} kudos</span>` : ""}</div>
      <div class="vcacts"><button data-vm="wave">👋 Saluer</button><button data-vm="talk">💬 Discuter</button><button data-vm="cheer">🎉 Encourager</button><button data-vm="coffee">☕ Offrir un café</button><button data-vm="kudos">⭐ Kudos</button></div>`);
  },
  item(it) {
    const def = hub.defOf(it.type), acts = [];
    for (const [id, icon, label] of pieOf(it)) if (["lamp", "blind", "music"].includes(id)) acts.push([`use:${id}`, icon, label]);
    const spots = spotsOf(it, def), activity = def.act && hub.Activity?.get(def.act);
    if (spots.length) acts.push(["sit", activity?.icon || (def.role === "coffee" ? "☕" : "🪑"), activity ? activity.task : def.role === "coffee" ? "Prendre un café" : "S'asseoir"]);
    else if (def.role === "coffee") acts.push(["sit", "☕", "Prendre un café"]);
    if (!acts.length) return false;
    this.kind = "item"; this.target = it.uid;
    show(`<button class="x" data-vc="close" aria-label="Fermer">✕</button>
      <div class="vchead"><b>${esc(def.name || it.type)}</b><span class="muted">chez ${esc(net.visit.name)}</span></div>
      <div class="vcacts">${acts.map(([id, icon, label]) => `<button data-vi="${id}">${icon} ${esc(label)}</button>`).join("")}</div>`);
    return true;
  },
  team() {
    const v = net.visit; if (!v) return;
    this.kind = "team"; this.target = null;
    const crew = [...(v.crew || [])].sort((a, b) => score(b) - score(a));
    const best = crew[0] && score(crew[0]) > 0 ? crew[0] : null;
    show(`<button class="x" data-vc="close" aria-label="Fermer">✕</button>
      <div class="vchead"><b>👥 L'équipe de ${esc(v.name)}</b><span class="muted">${crew.length} dev${crew.length > 1 ? "s" : ""}${best ? ` · 🏆 meilleur : ${esc(best.n)}` : ""}</span></div>
      <div class="vcteam">${crew.length ? crew.map((m, i) => `<button data-vt="${esc(m.n)}"><span class="rk">${i + 1}</span><b>${esc(m.n)}</b><span class="muted">${esc(m.tag || "")} ${esc(m.what || "")}</span>
        <span class="sk">${esc(m.sk?.[0] ? `${m.sk[0][0]} ${m.sk[0][1]}` : "—")}</span><span>${MOOD(m.mood)}</span></button>`).join("") : `<span class="muted">Personne pour l'instant.</span>`}</div>`);
  },
};
const VERB_SAY = { wave: n => `👋 Salut ${n} !`, talk: n => `Alors ${n}, ça va ?`, cheer: n => `Bravo ${n}, continue ! 🎉`, coffee: n => `Tiens ${n}, un café ☕`, kudos: n => `Un kudos pour toi ${n} ⭐` };
box.addEventListener("click", ev => {
  const v = net.visit, b = ev.target.closest("button"); if (!v || !b) return;
  if (b.dataset.vc === "close") return card.close();
  if (b.dataset.vt) {  // the team list: go to that dev
    const m = (v.crew || []).find(x => x.n === b.dataset.vt); if (!m) return;
    if (m.room !== v.room && v.layout.rooms.includes(m.room)) visitRoom(m.room);
    v.sel = m.n; walkTo(m.x + 12, m.y + 8); return card.mate(m);
  }
  if (b.dataset.vm) {  // to a dev: our avatar goes next to them, says it, and their page answers
    const m = (v.crew || []).find(x => x.n === card.target); if (!m) return;
    const verb = b.dataset.vm;
    const go = () => { say(VERB_SAY[verb](m.n)); sendAct(`${verb}:${m.n}`).catch(() => {}); };
    if (m.room === v.room && Math.hypot(v.x - m.x, v.y - m.y) > 26) walkTo(m.x + 12, m.y + 8, go); else go();
    return;
  }
  if (b.dataset.vi) {
    const it = (v.items || []).find(i => i.uid === card.target); if (!it) return;
    const def = hub.defOf(it.type), id = b.dataset.vi;
    if (id.startsWith("use:")) {  // a switch: the owner's page does it; shown here at once
      const what = id.slice(4), key = switchKey(it, what);
      const [fx, fy] = [itemRect(it).x + itemRect(it).w / 2, itemRect(it).y + itemRect(it).h + 6];
      const go = () => {
        sendAct(`use:${it.uid}:${what}`).catch(() => {});
        if (key) { it[key] = !it[key]; pending.set(it.uid, { key, value: it[key], until: performance.now() + 6000 }); }
        say(what === "music" ? "🎵 un peu de musique !" : what === "blind" ? "🌗 voilà" : "💡 et la lumière fut");
      };
      if (def.kind === "wall") go(); else walkTo(fx, Math.max(fy, 76), go);
      return card.close();
    }
    // sit, play, take a coffee: our avatar only
    const s = spotsOf(it, def)[0], activity = def.act && hub.Activity?.get(def.act), r = itemRect(it);
    const spot = s || { x: r.x + r.w / 2, y: r.y + r.h + 6, face: [0, -1] };
    walkTo(spot.x, spot.y, () => {
      const pose = activity?.pose || {}, coffee = def.role === "coffee";
      v.pose = coffee ? { arms: "up", dir: spot.face, cup: true, until: performance.now() + 6000 } : { seated: !!(pose.seated ?? (def.chair || def.seat || s)), arms: pose.arms || "down", back: !!spot.face && spot.face[1] < 0, dir: spot.face, z: s?.lift || 0 };
      say(coffee ? "☕ Merci pour le café !" : activity ? `${activity.icon} ${activity.task}` : "Je me pose un peu.");
    });
    return card.close();
  }
});

/* ---------- the bar at the top while visiting: the rooms of the office, its team, back home ---------- */
const bar = document.createElement("nav");
bar.id = "visitbar"; bar.hidden = true; bar.setAttribute("aria-label", "Visite");
document.body.append(bar);
let barKey = "";
setInterval(() => {
  const v = net.visit, key = v ? `${v.pid}|${v.room}|${v.layout.rooms.join(",")}|${(v.crew || []).length}` : "";
  bar.hidden = !v;
  if (!v && !box.hidden) card.close();
  if (v && card.kind === "team") card.team();  // the list follows what they do
  if (v && card.kind === "mate") { const m = (v.crew || []).find(x => x.n === card.target); if (m) card.mate(m); }
  if (key === barKey) return;
  barKey = key;
  if (v) bar.innerHTML = `<b>🚪 Chez ${esc(v.name)}</b>${v.layout.rooms.filter(r => ROOM_FR[r]).map(r => `<button data-vroom="${r}" class="${r === v.room ? "on" : ""}">${ROOM_FR[r]}${(v.crew || []).some(m => m.room === r) ? ` <small>${(v.crew || []).filter(m => m.room === r).length}</small>` : ""}</button>`).join("")}<button data-vteam>👥 Équipe</button><button data-vbook>📖 Livre d'or</button><button data-vhome class="home">🏠 Rentrer à mon bureau</button>`;
}, 500);
bar.addEventListener("click", ev => {
  const r = ev.target.closest("[data-vroom]"); if (r) { card.close(); const v = net.visit; return visitRoom(r.dataset.vroom, v && entryOf(v.room, r.dataset.vroom, v.layout)); }
  if (ev.target.closest("[data-vteam]")) return card.kind === "team" ? card.close() : card.team();
  if (ev.target.closest("[data-vbook]")) return hub.openPhone?.("book");  // sign its guestbook (social/gifts.js)
  if (ev.target.closest("[data-vhome]")) endVisit();
});
