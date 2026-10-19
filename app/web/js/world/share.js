// Our team as the chiefs who visit us see it (world/peers.js → office/net.py clean_crew): who is where, how they
// stand, what they do in a word (at work, thinking, blocked, delivered, coffee, which game), their mood, their best
// skills and kudos. Never what the agents work on: no ticket, file, command or question goes out.
// And what a visitor does here: talks to a dev, cheers them, offers a coffee, a kudos, waves; switches a lamp, a
// blind, the music. Only those (the server checks them too), at most one every 1.5 s per visitor.

import { hub } from "../hub.js";
import { CAT_NAME, ents, specialty, typeColor } from "../core/core.js";
import { cat } from "./cat.js";
import { isStuck } from "../core/data.js";
import { crewAdd, mate, moodLine } from "../sims/crew.js";
import { SKILLS, skillLevel, skillXp } from "../sims/skills.js";
import { chairNear, deskItemOf, surfaceOf } from "./place.js";
import { loungeSay, loungerPose, loungers } from "./lounge.js";
import { toast } from "../sims/progress.js";
import { Room } from "../rooms/base.js";
import { lookTraits } from "../svg/figures.js";
import { devHold } from "./scene.js";

const said = new Map();  // name → { text, until }: what a dev answered a visitor
const ROOM_WHAT = { gym: "à la salle de sport", library: "à la bibliothèque", meeting: "en réunion", terrace: "sur la terrasse" };
const ROOM_ST = { gym: "sport", library: "read", meeting: "meeting", terrace: "party" };
const dirOf = (p, x, y) => p ? [Math.round((p.x - x) * 10) / 10, Math.round((p.y - y) * 10) / 10] : null;

function common(name, t) {
  const m = mate(name), s = said.get(name);
  const sk = SKILLS.filter(([id]) => skillXp(name, id) > 0).sort((a, b) => skillXp(name, b[0]) - skillXp(name, a[0])).slice(0, 3)
    .map(([id, icon, label]) => [`${icon} ${label}`, skillLevel(name, id)]);
  return { mood: Math.round(m.moral), kudos: hub.kudos?.total?.[name] || 0, sk, reply: s && t < s.until ? s.text : "" };
}

// at their desk or walking in the office
function officeDev(e, t) {
  const a = e.agent, name = e.who || specialty(a.type), st = a.status;
  let out;
  if (e.seated) {
    const think = st === "working" && a.idle > 45;
    out = { st: st === "blocked" ? "blocked" : st === "done" ? "done" : st === "working" ? (think ? "think" : "work") : "rest",
      b: st === "blocked" ? "😵 bloqué" : st === "done" ? "Livré ✓" : think ? "… réfléchit" : st === "working" ? "💻 au travail" : "",
      pose: { seated: true, back: true, dir: e.desk?.face || [0, -1], arms: st === "working" ? "type" : st === "done" && a.idle < 20 ? "up" : "down", z: !e.desk?.floor && chairNear("office", e.x, e.y) ? 3 : 0 } };
    if (isStuck(a)) out.b = "🌀 ça coince un peu";
    const mood = st !== "blocked" && moodLine(e, t); if (mood) out.b = mood;
  } else {
    const still = !!e.pauseUntil || !e.path.length;
    out = { st: e.pose === "coffee" ? "coffee" : e.asking && still ? "question" : "walk",
      b: e.pose === "coffee" ? "☕ pause café" : e.asking && still ? "❓ attend le chef" : "",
      pose: { dir: still ? null : dirOf(e.path[0], e.x, e.y), walk: !still, back: !still && e.path[0].y < e.y, arms: e.pose === "pick" || e.pose === "file" ? "up" : e.pose === "coffee" ? "reach" : "down", hold: devHold(e, still, t) } };
  }
  const c = common(name, t);
  return { n: name, room: "office", x: e.x, y: e.y, look: lookTraits(e.look), tag: specialty(a.type), c: typeColor(a.type), what: `au bureau · ${{ work: "au travail", think: "réfléchit", blocked: "bloqué", done: "a livré", coffee: "pause café", question: "attend le chef", rest: "à son poste", walk: "se déplace" }[out.st]}`,
    ...c, ...out, b: c.reply || out.b };
}

// in the break room, or gone to another room (the gym, the library, a meeting, the terrace)
function lounger(l, t) {
  const c = common(l.name, t), base = { n: l.name, look: lookTraits(l.look), tag: "", c: "#4090d7", ...c, b: c.reply || (t < l.sayUntil ? l.say : "") };
  if (l.netAway) return { ...base, room: "lounge", x: l.x, y: l.y, st: "away", what: "à l'afterwork commun", pose: {} };  // social/netparty.js
  if (!l.partyRoom) {
    const pose = loungerPose(l, t), walking = l.path.length > 0, act = !walking && l.spot?.act;
    return { ...base, room: "lounge", x: l.x, y: l.y, st: walking ? "walk" : "rest", what: `salle de repos · ${walking ? "se déplace" : act?.label || "se pose"}`,
      pose: { seated: !!pose.seated, back: !!pose.back, arms: pose.arms || "down", hold: pose.hold || "", dir: pose.dir || null, walk: walking, z: walking ? 0 : l.spot?.lift || 0 } };
  }
  const room = l.partyRoom, what = ROOM_WHAT[room] || "ailleurs", st = ROOM_ST[room] || "rest";
  if (l.roomSpot) {  // the gym, the library (rooms/extra.js)
    const s = l.roomSpot, p = Room.get(room)?.poseOf?.(l, t) || {};
    return { ...base, room, x: s.x, y: s.y, st, what, pose: { seated: !!p.seated, back: !!p.back, arms: p.arms || "down", dir: p.dir || null, z: s.lift || 0 } };
  }
  if (room === "meeting" && hub.meeting?.on) {
    const i = hub.meeting.who.indexOf(l.name), s = hub.MEET_SEATS?.[i];
    if (s) return { ...base, room, x: s.x, y: s.y, st, what, pose: { seated: true, back: s.back ?? s.y > 150, dir: s.face || null, z: s.lift || 0 } };
  }
  if (room === "terrace" && !l.path.length) {
    const T = Room.get("terrace"), s = T?.partySpotOf?.(l), p = s ? T.poseOf(l, t) : {};  // on the furniture bought (rooms/built.js)
    if (s) return { ...base, room, x: s.x, y: s.y, st, what, pose: { seated: !!p.seated, back: !!p.back, arms: p.arms || "down", dir: p.dir || null, z: s.lift || 0 } };
  }
  return null;
}

// the pets of the office (world/cat.js, world/pets.js): where they are, walking, sitting or asleep (on a desk: its top)
function pets(t) {
  const out = [], base = { look: {}, tag: "", c: "#c98b4f", mood: 80, kudos: 0, sk: [], st: "rest", what: "" };
  if (!hub.focusMode) {
    const desk = cat.mode === "sleep" && cat.desk && deskItemOf(cat.desk), top = desk && surfaceOf(desk);
    out.push({ ...base, n: CAT_NAME, pet: "cat", room: "office", x: cat.x, y: cat.y, pm: cat.mode === "sleep" ? "sleep" : cat.mode === "walk" || cat.mode === "chase" ? "walk" : "sit",
      fx: top ? top.x + top.w * 0.25 : cat.x, fy: top ? top.y + top.h / 2 : cat.y, pose: { z: top ? top.z : 0, dir: [cat.dir || 1, 0] }, b: t < cat.sayUntil ? cat.say : "" });
  }
  const dog = hub.dog;
  if (hub.petBook?.dog && dog) out.push({ ...base, n: hub.DOG_NAME, pet: "dog", room: "office", x: dog.x, y: dog.y, pm: dog.path.length ? "walk" : "sit", fx: dog.x, fy: dog.y,
    pose: { z: 0, dir: [dog.dir || 1, 0] }, b: t < dog.sayUntil ? dog.say : "" });
  return out;
}
export function crewSnapshot(t) {
  const out = [], seen = new Set();
  for (const e of ents.values()) {
    if (e.leaving || e.queued) continue;
    const m = officeDev(e, t); out.push(m); seen.add(m.n);
  }
  for (const l of loungers.values()) if (!seen.has(l.name)) { const m = lounger(l, t); if (m) out.push(m); }
  out.push(...(hub.partyCrew?.(t) || []));  // the guests of our afterwork (social/netparty.js)
  return [...pets(t), ...out].slice(0, 24);
}

/* ---------- what a visitor does here ---------- */
const last = new Map();  // visitor's pid → when it last did something
const SAFE = ["lamp", "blind", "music"];
function reply(name, text, t) {
  said.set(name, { text, until: t + 4500 });
  if (loungers.has(name)) loungeSay(name, text, t);
  const e = [...ents.values()].find(x => x.who === name && x.seated);
  if (e) { e.fxKind = "verify"; e.fxMsg = text; e.fxUntil = t + 3000; }
}
function answer(name, from) {
  const m = mate(name);
  const pool = m.fatigue >= 70 ? ["Un peu crevé, mais ça tient !", "La journée est longue…"] : m.moral >= 80 ? ["Au top ! Bienvenue chez nous 😄", "Super journée, et toi ?"]
    : m.cafe <= 25 ? ["Ça irait mieux avec un café…"] : m.ennui >= 70 ? ["On s'ennuie un peu ici !"] : [`Salut ${from} ! Ça va bien.`, "Tranquille, ça avance.", `Hey ${from} ! Tu visites ?`];
  return pool[Math.floor(Math.random() * pool.length)];
}
export function applyAct(m, t = performance.now()) {
  if (t - (last.get(m.from) || -1e9) < 1500) return;
  last.set(m.from, t);
  const [verb, a, b] = String(m.text).split(":"), from = String(m.name || "un visiteur").slice(0, 24);
  if (verb === "use") {
    const it = hub.itemByUid?.(a), def = it && hub.defOf(it.type);
    if (!it || !SAFE.includes(b) || !def.pie(it).some(x => x[0] === b)) return;
    def.perform(it, b);
    toast("🌐 VISITE", `${from} ${b === "music" ? "touche à la musique" : b === "blind" ? (it.closed ? "ferme le store" : "ouvre le store") : "joue avec la lumière"}`, def.name || "");
    return;
  }
  if (verb === "pet") {  // a visitor pets our cat or our dog
    if (a === CAT_NAME) Object.assign(cat, { say: "Ronron… ❤️", sayUntil: t + 2500, jump: t + 1300 });
    else if (a === hub.DOG_NAME && hub.dog) Object.assign(hub.dog, { say: "Wouf ! ❤️", sayUntil: t + 2500 });
    else return;
    return toast("🌐 VISITE", `${from} caresse ${a}`, "");
  }
  const name = a, known = loungers.has(name) || [...ents.values()].some(e => e.who === name);
  if (!known) return;
  if (verb === "talk") { crewAdd(name, { social: 8 }); reply(name, answer(name, from), t); }
  else if (verb === "cheer") { crewAdd(name, { moral: 6 }); reply(name, `Merci ${from} ! 💪`, t); }
  else if (verb === "coffee") { crewAdd(name, { cafe: 30 }); reply(name, `Merci pour le café ${from} ☕`, t); }
  else if (verb === "kudos") { hub.giveKudos?.(name); reply(name, `Un kudos de ${from} ⭐ merci !`, t); }
  else if (verb === "wave") reply(name, `👋 Salut ${from} !`, t);
  else return;
  toast("🌐 VISITE", `${from} ${{ talk: "discute avec", cheer: "encourage", coffee: "offre un café à", kudos: "donne un kudos à", wave: "salue" }[verb]} ${name}`, "");
}
