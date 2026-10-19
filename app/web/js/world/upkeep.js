// The objects live and get dirty, and people look after them (a pure game: nothing touches the agents).
//  - the coffee machine scales up with each cup (it.wear): from 40 % its coffee is slower and weaker, white crust at its
//    foot, a warning over it; "Détartrer" makes it like new;
//  - the plants get thirsty with the hours (it.wear): they droop and yellow, a drop over them; "Arroser";
//  - the desks: a dev back from its coffee leaves the empty cup there (it.mess); on its next break it takes the oldest
//    one back to the machine; "Débarrasser" (the chief takes them all on a tray to the machine). Brume, waking up on a
//    desk with cups, may knock one over: a puddle to mop up (incidents/spill.js), a broken cup in the bin;
//  - the bin (items/upkeep.js) fills with the papers filed in MMX: "Vider" (the chief takes the bag out by the door);
//  - the printer prints the report of the day (the chief brings it to ChiefOS), and jams now and then: "Débloquer".
// The chief's jobs go through his action queue (ui/actions.js): he walks there with his tool (a watering can, a tray,
// a bin bag), works a moment, and feels better. The team helps too: a dev done with its mission waters a thirsty plant,
// or brings a coffee to a stuck colleague. A tidy office (plants watered, desks cleared, bin emptied, machine clean)
// lifts the team's mood; a messy one weighs on it. Reading in the break room teaches (skill XP).
// State on the objects' records (saved with the build, seen by the visitors); the poses in svg/iso.js (hold).

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, COFFEE, DESKS, DOOR, LANE, S, chief, ctx, ents, fromDesk, px, raw, text, toDesk } from "../core/core.js";
import { ART } from "../svg/base.js";
import { P } from "../iso/engine.js";
import { chiefGo, chiefToLounge, chiefToOffice } from "./chief.js";
import { footOf, rotDir, surfaceOf } from "./place.js";
import { cat } from "./cat.js";
import { isStuck } from "../core/data.js";
import { enqueue } from "../ui/actions.js";
import { openChiefOs } from "../ui/chiefos.js";
import { SKILLS, saveSkills, skillBook } from "../sims/skills.js";

const PLANT_HOURS = 5;   // a plant gets from watered to parched in 5 hours
const PER_CUP = 6;       // scale per cup of coffee
const MAX_MESS = 4;      // cups left on one desk
const JAM = 0.2;         // a print in five jams
const kindOf = it => {
  const d = hub.defOf(it.type); if (!d) return "";
  if (d.role === "coffee") return "scale"; if (it.type === "trashbin") return "trash"; if (d.role === "printer") return "printer";
  if (d.plant || d.cat === "plantes" || it.type === "bonsai") return "thirst"; if (d.cat === "bureau") return "desk"; return "";
};
const say = (msg, ms = 3000) => { chief.bubble = msg; chief.until = performance.now() + ms; };
let dirty = false;  // the plants' thirst: saved once a minute; what people do: saved at once
const save = () => { dirty = false; hub.saveBuild?.(); };

/* ---------- the coffee: its scale ---------- */
// what the machine's scale leaves of a cup: 1 (clean) to 0.55 (very scaled)
export function coffeeQuality() { const m = COFFEE.uid && hub.itemByUid(COFFEE.uid); return m ? 1 - 0.45 * Math.max(0, ((m.wear || 0) - 40) / 60) : 1; }
export function usedCoffee() { const m = COFFEE.uid && hub.itemByUid(COFFEE.uid); if (m) { m.wear = Math.min(100, (m.wear || 0) + PER_CUP); save(); } }

/* ---------- the desks: cups left there; the bin ---------- */
export function leaveMess(deskUid) {
  const it = deskUid && hub.itemByUid(deskUid); if (!it) return;
  it.mess = [...(it.mess || []), { k: "cup", s: Math.floor(Math.random() * 1000) }].slice(-MAX_MESS); save();
}
export function takeMess(deskUid) {  // the oldest cup, taken back to the machine
  const it = deskUid && hub.itemByUid(deskUid); if (!it?.mess?.length) return false;
  it.mess = it.mess.slice(1); save(); return true;
}
// something thrown away (papers filed in MMX, a broken cup): into the office's bin, if there is one
export function trashAdd(n) { const b = hub.itemsIn("office").find(it => it.type === "trashbin"); if (b) { b.wear = Math.min(100, (b.wear || 0) + n); save(); } }

/* ---------- the chief at work ---------- */
const TOOL = { thirst: "can" };
const LABEL = { scale: ["🧽", "Détartrer"], thirst: ["💧", "Arroser"], desk: ["🧺", "Débarrasser"], trash: ["🗑️", "Vider la poubelle"], printer: ["🖨️", "Imprimer le rapport du jour"], jam: ["🔧", "Débloquer l'imprimante"] };
const DUR = { scale: 3500, thirst: 2400, desk: 1600, trash: 1300, printer: 2600, jam: 3000 };
function frontOf(it) {
  const [x0, , x1, y1] = footOf(it), d = hub.defOf(it.type);
  if (d.role === "coffee") return { x: COFFEE.x, y: COFFEE.y };
  return { x: (x0 + x1) / 2, y: y1 + 7 };
}
function serve(it, kind) {
  if (hub.chiefBusyNow()) return say("Pas maintenant, l'équipe a besoin de moi !");
  const go = () => {
    chief.svc = null; chief.svcArrive = null;
    const f = frontOf(it), [x0, y0, x1, y1] = footOf(it);
    chief.carry = TOOL[kind] || ""; chief.manual = true;
    const arrive = () => {
      const [hx, hy] = chief.room === "office" ? [chief.x, chief.y] : [chief.lx, chief.ly];
      chief.at = "service"; chief.svc = { uid: it.uid, kind, until: performance.now() + DUR[kind], dir: [(x0 + x1) / 2 - hx, (y0 + y1) / 2 - hy] };
      poke(it); hub.sfx?.("tap");
      if (kind === "printer") it.printUntil = performance.now() + DUR.printer;
    };
    if (it.room === "office") chiefGo(f, arrive);
    else { chief.lspot = null; chief.lpath = [{ x: f.x, y: f.y }]; chief.loungeNext = null; chief.svcArrive = arrive; }
  };
  // through his action queue, like any order (ui/actions.js); from another room he goes there first
  enqueue(LABEL[kind][0], LABEL[kind][1], () => {
    if (it.room === chief.room) go();
    else if (it.room === "office") { chief.pendingOffice = go; chiefToOffice(); }
    else if (it.room === "lounge") { chiefToLounge(); chief.loungeNext = go; }
    else say("Je n'ai pas encore la clé de cette pièce 😅");
  });
}
function finish(it, kind) {
  const [x0, y0, x1, y1] = footOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, office = it.room === "office";
  const fx = (colors, n) => office ? hub.burst?.(cx, cy - 10, colors, n) : hub.burstLounge?.(cx, cy - 10, colors, n);
  let next = null;  // where he goes after: { to, carry, then }
  if (kind === "scale") { it.wear = 0; fx(["#f7f7f7", "#d5eeff", "#fbaa08"], 18); hub.toast("ENTRETIEN", "Machine détartrée ✨", "Le café retrouve son goût (et sa vitesse)."); }
  if (kind === "thirst") watered(it);
  if (kind === "desk") {
    const n = it.mess?.length || 0; it.mess = [];
    if (n) { hub.toast("ENTRETIEN", `${n} tasse${n > 1 ? "s" : ""} débarrassée${n > 1 ? "s" : ""} 🧺`, "Un bureau rangé, un dev serein."); if (COFFEE.ok && office) next = { to: { x: COFFEE.x, y: COFFEE.y }, carry: "tray" }; }
  }
  if (kind === "trash") { it.wear = 0; fx(["#9aa0ad", "#f4f2ea"], 10); next = office ? { to: { x: DOOR.x, y: DOOR.y + 4 }, carry: "bag" } : null; hub.toast("ENTRETIEN", "Poubelle vidée 🗑️", "Le sac part par la porte."); }
  if (kind === "jam") { it.jam = false; fx(["#51cf66", "#f7f7f7"], 10); hub.toast("ENTRETIEN", "Imprimante débloquée 🔧", "Elle repart."); }
  if (kind === "printer") {
    if (Math.random() < JAM) { it.jam = true; it.printUntil = 0; say("😤 Bourrage papier !"); hub.toast("BOURRAGE", "L'imprimante s'est bloquée", "Clique dessus pour la débloquer."); hub.sfx?.("fail"); }
    else next = { to: "podium", carry: "papers", then: () => openChiefOs("report") };
  }
  hub.crewAdd?.(CHIEF_NAME, { moral: 2 }); if (kind !== "printer" || !it.jam) hub.sfx?.("commit"); save();
  chief.carry = next?.carry || "";
  if (!office) { chief.at = "lounge"; return; }
  if (next?.to === "podium") chiefGo("podium", () => { chief.carry = ""; next.then?.(); });
  else if (next) chiefGo(next.to, () => { chief.at = "service"; chief.svc = { kind: "drop", until: performance.now() + 800, dir: [0, -1] }; });
  else chiefGo("podium");
}
function watered(it) {
  const [x0, y0, x1, y1] = footOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  it.wear = 0; it._helper = null;
  if (it.room === "office") hub.rain?.(cx, cy - 12, "#5aa9ff"); else hub.burstLounge?.(cx, cy - 10, ["#5aa9ff", "#a8d8ff"]);
  const inc = hub.Incident?.get("plant"); if (inc?.on && inc.uid === it.uid) inc.solve(performance.now());
  save();
}

/* ---------- the team helps ---------- */
// a dev done with its mission, seated, rested enough, not already busy: free to help
const freeDev = (e, t) => e.seated && !e.leaving && !e.queued && !e.asking && !e.coffee && !e.errand && !e.helping && e.agent?.status === "done"
  && DESKS.includes(e.desk) && t > (e.helpNext || 0) && !hub.focusMode;
// from its desk, through stops, back to its seat (agents/entities.js walks it: waits, poses, callbacks)
function sendDev(e, stops, t) {
  const back = toDesk(e.desk), seat = back.pop();
  e.helping = true; e.seated = false; e.helpNext = t + 8 * 60000;
  e.path = [...fromDesk(e.desk), ...stops, ...back, { ...seat, on: x => { x.helping = false; x.carry = ""; x.faceDir = null; } }];
}
function teamHelps(t) {
  const devs = [...ents.values()];
  if (devs.some(e => e.helping)) return;  // one helper at a time
  const helper = devs.find(e => freeDev(e, t)); if (!helper) return;
  // a stuck colleague: a coffee brought to its desk
  const sad = devs.find(e => e !== helper && e.seated && !e.leaving && DESKS.includes(e.desk) && (e.agent?.status === "blocked" || isStuck(e.agent)) && t > (e.giftNext || 0));
  if (sad && COFFEE.ok && !hub.Incident?.get("coffee")?.on && !devs.some(x => x.coffee)) {
    sad.giftNext = t + 15 * 60000;
    const d = sad.desk, stand = { x: d.x + 10, y: d.y + 25 }, q = coffeeQuality();
    sendDev(helper, [{ x: COFFEE.x, y: LANE }, { ...COFFEE, wait: (COFFEE.cup?.wait || 4500) * (2 - q), pose: "coffee" },
      { x: COFFEE.x, y: COFFEE.y, on: x => { x.cup = true; usedCoffee(); } }, { x: COFFEE.x, y: LANE }, { x: stand.x, y: LANE },
      { ...stand, wait: 1800, pose: "give", on: x => { x.faceDir = [-1, -1]; } },
      { ...stand, on: x => {
        x.cup = false; hub.crewAdd?.(sad.who, { moral: 6, cafe: 30 }); hub.crewAdd?.(x.who, { moral: 3 });
        sad.fxKind = "talk"; sad.fxMsg = `☕ merci ${x.who} !`; sad.fxUntil = performance.now() + 3200; hub.bond?.(x.who, sad.who, 4);
      } }, { x: stand.x, y: LANE }], t);
    helper.fxKind = "talk"; helper.fxMsg = `☕ un café pour ${sad.who}`; helper.fxUntil = t + 2600;
    return;
  }
  // a thirsty plant of the office: watered
  const plant = hub.itemsIn("office").find(it => kindOf(it) === "thirst" && (it.wear || 0) >= 60 && !it._helper && chief.svc?.uid !== it.uid);
  if (plant) {
    plant._helper = helper.id;
    const f = frontOf(plant), [x0, y0, x1, y1] = footOf(plant);
    helper.carry = "can";
    sendDev(helper, [{ x: f.x, y: LANE }, { ...f, wait: 2400, pose: "water", on: x => { x.faceDir = [(x0 + x1) / 2 - f.x, (y0 + y1) / 2 - f.y]; } },
      { ...f, on: x => { watered(plant); x.carry = ""; hub.crewAdd?.(x.who, { moral: 3 }); x.fxKind = "talk"; x.fxMsg = "💧 elle avait soif"; x.fxUntil = performance.now() + 2400; } }, { x: f.x, y: LANE }], t);
  }
}

/* ---------- a tidy office, a happy team ---------- */
export function tidiness() {
  const all = hub.itemsIn("office"), plants = all.filter(it => kindOf(it) === "thirst"), cups = all.reduce((s, it) => s + (it.mess?.length || 0), 0);
  const bin = all.find(it => it.type === "trashbin"), m = COFFEE.uid && hub.itemByUid(COFFEE.uid);
  let score = 100;
  score -= plants.length ? plants.reduce((s, p) => s + Math.max(0, (p.wear || 0) - 50), 0) / plants.length : 0;
  score -= cups * 4 + Math.max(0, ((bin?.wear || 0) - 60)) * 0.5 + Math.max(0, ((m?.wear || 0) - 60)) * 0.4;
  return Math.max(0, Math.round(score));
}
function moodOfOffice() {
  const s = tidiness(), names = [...ents.values()].filter(e => e.who && !e.leaving && !e.queued).map(e => e.who);
  if (s >= 85) for (const n of names) hub.addMoodlet?.(n, "tidy", "✨", "Bureau impeccable", 2, 8);
  else if (s < 50) for (const n of names) hub.addMoodlet?.(n, "messy", "🗑️", "Bureau en bazar", -2, 8);
}

/* ---------- reading teaches (the break room's armchair) ---------- */
function reading() {
  for (const l of hub.loungers?.values() || []) {
    if (l.path?.length || l.spot?.act?.id !== "read") continue;
    const xp = skillBook.xp[l.name] ||= {}, best = SKILLS.map(s => s[0]).sort((a, b) => (xp[b] || 0) - (xp[a] || 0))[0];
    xp[best] = (xp[best] || 0) + 2; saveSkills();
    if (Math.random() < 0.3) hub.floatUp?.(l.x, l.y - 26, "📖 +XP", "#5aa9ff");
  }
}

function step(t) {
  // the chief's work: arrived in the break room, working, done
  if (chief.svcArrive && chief.room === "lounge" && !chief.lpath.length) { const fn = chief.svcArrive; chief.svcArrive = null; fn(); }
  if (chief.at === "service" && chief.svc && t > chief.svc.until) {
    const s = chief.svc; chief.svc = null;
    if (s.kind === "drop") { chief.carry = ""; chief.at = "free"; chiefGo("podium"); }
    else { const it = hub.itemByUid(s.uid); if (it) finish(it, s.kind); else { chief.carry = ""; chief.at = "free"; } }
  }
  if (hub.chiefBusyNow() && (chief.svc || chief.carry)) { chief.svc = null; chief.carry = ""; chief.svcArrive = null; }
  if (t - (step.last || 0) < 1000) return;
  const dt = t - (step.last || t); step.last = t;
  // the plants get thirsty
  for (const room of ["office", "lounge", "meeting", "terrace"]) for (const it of hub.itemsIn(room)) if (kindOf(it) === "thirst") {
    const w = Math.min(100, (it.wear || 0) + dt / (PLANT_HOURS * 3600000) * 100); if (Math.floor(w) !== Math.floor(it.wear || 0)) dirty = true; it.wear = w;
  }
  // Brume wakes up on a desk with cups: sometimes one goes over
  if (step.catDesk && !cat.desk) {
    const it = step.catDesk.uid && hub.itemByUid(step.catDesk.uid), spill = hub.Incident?.get("spill");
    if (it?.mess?.length && spill && !spill.on && Math.random() < 0.35) {
      it.mess = it.mess.slice(1); trashAdd(10); spill.start(t);
      const [x0, , x1, y1] = footOf(it); spill.at = { x: (x0 + x1) / 2 + 6, y: y1 + 6 };
      hub.toast("OUPS", "Brume a fait tomber une tasse du bureau", "Clique sur la flaque pour nettoyer, et pense à débarrasser.");
    }
  }
  step.catDesk = cat.desk;
  if (t - (step.help || 0) > 20000) { step.help = t; teamHelps(t); }
  if (t - (step.mood || 0) > 5 * 60000) { step.mood = t; moodOfOffice(); }
  if (t - (step.read || 0) > 60000) { step.read = t; reading(); }
  if (dirty && t - (step.saved || 0) > 60000) { step.saved = t; dirty = false; hub.saveBuild?.(); }
}

/* ---------- a delivery: the chief raises his cup (or his arms) ---------- */
function cheer() {
  if (chief.room !== "office" || chief.path.length || chief.svc) return;
  chief.cheerUntil = performance.now() + 2600; say(chief.cup ? "🥂 Santé, bravo l'équipe !" : "🎉 Bravo l'équipe !", 2600);
}

/* ---------- a little life when used: the object bounces (world/physics.js), a click ---------- */
export function poke(it) { if (it) it._poke = performance.now(); }

/* ---------- the pie menu (world/build.js) ---------- */
function pie(it) {
  const k = kindOf(it); if (!k) return [];
  if (k === "desk") { const n = it.mess?.length || 0; return [["upkeep", LABEL.desk[0], n ? `${LABEL.desk[1]} (${n})` : LABEL.desk[1], n ? "" : "rien à ranger"]]; }
  if (k === "printer") return it.jam ? [["upkeep", ...LABEL.jam]] : [["upkeep", ...LABEL.printer]];
  const w = it.wear || 0;
  return [["upkeep", LABEL[k][0], LABEL[k][1], w < 12 ? ({ scale: "comme neuve", thirst: "pas soif", trash: "déjà vide" }[k]) : ""]];
}
function act(it, id) {
  poke(it); hub.sfx?.("tap");
  if (id !== "upkeep" || !kindOf(it)) return false;
  const k = kindOf(it); serve(it, k === "printer" && it.jam ? "jam" : k); return true;
}
function center(it) {
  const k = kindOf(it); if (!k) return "";
  if (k === "desk") { const n = it.mess?.length || 0; return n ? `<span class="muted">☕ ${n} tasse${n > 1 ? "s" : ""} vide${n > 1 ? "s" : ""} sur le bureau</span>` : ""; }
  if (k === "printer") return `<span class="muted">${it.jam ? '🔴 <b style="color:#ff6b6b">bourrage papier</b>' : "🟢 prête"}</span>`;
  const w = Math.round(it.wear || 0), lbl = { scale: "Tartre", thirst: "Soif", trash: "Remplie" }[k], c = w >= 80 ? "#ff6b6b" : w >= 50 ? "#fbaa08" : "#51cf66";
  return `<span class="muted">${LABEL[k][0]} ${lbl} : <b style="color:${c}">${w} %</b>${k === "scale" && w >= 40 ? " · café moins bon" : ""}</span>`;
}
// a short line for the hover label (ui/hover.js)
function stateLine(it) {
  const k = kindOf(it); if (!k) return "";
  if (k === "desk") { const n = it.mess?.length || 0; return n ? `☕ ${n} tasse${n > 1 ? "s" : ""}` : ""; }
  if (k === "printer") return it.jam ? "🔴 bourrage" : "🟢 prête";
  const w = Math.round(it.wear || 0); return w < 12 ? "" : `${LABEL[k][0]} ${{ scale: "tartre", thirst: "soif", trash: "remplie" }[k]} ${w} %`;
}

/* ---------- drawn on the objects (items/base.js pieces, in its piece) ---------- */
function cupAt(x, y, z, seed) {
  const p = P(x, y, z), cx = p.x * S, cy = p.y * S, w = 1.7 * S, h = 2.1 * S;
  raw.drawn = true;
  ctx.fillStyle = "#1c1c24"; ctx.fillRect(cx - w / 2 - 0.35 * S, cy - h - 0.35 * S, w + 0.7 * S, h + 0.6 * S);  // outline
  ctx.fillStyle = "#f4f2ea"; ctx.fillRect(cx - w / 2, cy - h, w, h);
  ctx.fillStyle = "#d8d4ca"; ctx.fillRect(cx + w * 0.15, cy - h, w * 0.35, h);  // its shaded side
  ctx.fillStyle = seed % 3 ? "#6d4a2e" : "#b08a60"; ctx.fillRect(cx - w / 2 + 0.25 * S, cy - h + 0.1 * S, w - 0.5 * S, 0.45 * S);  // a coffee ring inside
  ctx.fillStyle = "#f4f2ea"; ctx.fillRect(cx + w / 2, cy - h * 0.75, 0.5 * S, 0.9 * S);  // the handle
}
function overlay(it, t) {
  const k = kindOf(it); if (!k || hub.focusMode) return;
  const [x0, y0, x1, y1] = footOf(it), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, H = ART[hub.defOf(it.type).art]?.H || 24;
  if (k === "desk" && it.mess?.length) {
    // on its top, by the edge where the dev sits, from one end (beside the keyboard)
    const s = surfaceOf(it) || { x: x0, y: y0, w: x1 - x0, d: y1 - y0, z: Math.min(16, H * 0.55) };
    const [fx, fy] = rotDir(it.rot || 0, [0, 1]), [tx, ty] = [-fy, fx], half = (fx ? s.d : s.w) / 2, deep = (fx ? s.w : s.d) / 2;
    const mx = s.x + s.w / 2, my = s.y + s.d / 2;
    it.mess.forEach((m, i) => { const a = half - 3 - i * 3.6 - (m.s % 2), b = deep - 2.6 - (m.s % 3) * 0.7; cupAt(mx + fx * b + tx * a, my + fy * b + ty * a, s.z, m.s); });
  }
  if (k === "scale" && (it.wear || 0) >= 45) {  // the white crust at its foot, and a warning
    const a = Math.min(1, ((it.wear || 0) - 45) / 40);
    raw.drawn = true; ctx.save(); ctx.globalAlpha = 0.55 + 0.35 * a;
    for (let i = 0; i < 5; i++) { const p = P(x0 + 2 + i * (x1 - x0 - 4) / 4, y1, 1 + (i % 2)); ctx.fillStyle = "#eef0ea"; ctx.fillRect(p.x * S, p.y * S - (1 + a * 1.5) * S, 0.9 * S, (1 + a * 1.5) * S); }
    ctx.restore();
    if ((it.wear || 0) >= 80 && Math.floor(t / 500) % 2) { const p = P(cx, cy, Math.min(40, H) + 6); px(p.x - 2.6, p.y - 3.4, 5.2, 5.2, "#fbaa08"); text("!", p.x, p.y - 3.2, "#081746", 4.6, "center"); }
  }
  if (k === "thirst" && (it.wear || 0) >= 70 && Math.floor(t / 600) % 2) {  // a drop over it: thirsty
    const p = P(cx, cy, Math.min(40, H) + 5), x = p.x, y = p.y;
    px(x - 0.6, y - 4.2, 1.2, 1, "#5aa9ff"); px(x - 1.2, y - 3.2, 2.4, 1.6, "#5aa9ff"); px(x - 1.6, y - 1.6, 3.2, 1.8, "#5aa9ff"); px(x - 1.2, y + 0.2, 2.4, 0.8, "#3b82d6"); px(x - 0.8, y - 1.4, 0.7, 0.9, "#d5eeff");
  }
}
// how a thirsty plant stands (world/physics.js): drooping, yellowing
function plantState(it) {
  if (kindOf(it) !== "thirst") return null;
  const k = Math.max(0, ((it.wear || 0) - 50) / 50); if (!k) return null;
  const r = 255, g = Math.round(255 - 25 * k), b = Math.round(255 - 120 * k);
  return { droop: -0.09 * k, tint: (r << 16) | (g << 8) | b };
}

provide({ get coffeeQuality() { return coffeeQuality; }, get usedCoffee() { return usedCoffee; }, get leaveMess() { return leaveMess; }, get trashAdd() { return trashAdd; }, get poke() { return poke; }, get upkeepLine() { return stateLine; }, get tidiness() { return tidiness; }, get cheer() { return cheer; }, get takeMess() { return takeMess; }, get stepUpkeep() { return step; },
  get upkeepPie() { return pie; }, get upkeepAct() { return act; }, get upkeepCenter() { return center; }, get itemOverlay() { return overlay; }, get plantState() { return plantState; } });
