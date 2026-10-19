// Break room: activities, chats, mate panel.

import { standing, walkStep } from "./motion.js";
import { hub, provide } from "../hub.js";
import { CHIEF_NAME, H, TEAM, chief, curSession, ents, hash, selected, specialty, typeColor, roomSize } from "../core/core.js";
import { drawPerson, stepOf } from "./scene.js";
import { lookFor } from "../agents/entities.js";
import { crew, crewAdd, mate, moodWord } from "../sims/crew.js";
import { converse } from "../social/dialogue.js";
import { ACTS } from "../activities/base.js";

/* ---------- break room ---------- */
// every team member not called by an agent waits here: activities, chats between them, and you can talk to them
export const LD = { x: 23, y: 72 };                     // door back to the office, in the break room
export const LOUNGE_CORRIDOR = 100;
// every spot of every activity (js/activities/: on the objects bought), with its activity
const SPOTS = () => ACTS.flatMap(a => a.spots.map(s => ({ ...s, act: a })));
export const loungers = new Map();
export let view = "office", loungeReady = false, nextChat = 0;
const chatQueue = [];

// break room floor (decor.js: carpet tiles by default, a round rug in the middle), drawn once per scale and setting
export function loungeFloorCanvas() { const R = roomSize("lounge"); return hub.roomFloorCanvas("lounge", R.h - 70, [[130, 44, 140, 52]], R.w); }

function spotFree(sp) { return ![...loungers.values()].some(l => l.spot?.key === sp.key && !l.called) && chief.lspot?.key !== sp.key; }
// the activity that serves the most urgent need (sims.js); otherwise a random free one
// standing somewhere and chatting, when nothing bought is free (an empty break room)
const STAND = { id: "stand", label: "discute debout", icon: "💬", task: "Discute", pose: {}, fx: { ennui: -0.3 }, serves: ["social"], lines: [], chief: { fx: {}, line: "" } };
function standSpot() {
  const R = roomSize("lounge");
  for (let k = 0; k < 20; k++) {
    const x = 40 + Math.random() * (R.w - 80), y = 100 + Math.random() * (R.h - 130);
    if (hub.isFree("lounge", x, y)) return { x, y, key: `stand:${Math.round(x)}:${Math.round(y)}`, act: STAND, face: [Math.random() < 0.5 ? 1 : -1, 0] };
  }
  return { x: 80, y: 120, key: "stand:80:120", act: STAND };
}
// after the buy mode: who stood on a spot gone (an object sold or moved) picks another one
export function revalidateSpots() {
  const keys = new Set(SPOTS().map(s => s.key));
  for (const l of loungers.values()) {
    if (l.partyRoom) continue;  // in another room (the terrace, the gym…): not the break room's business
    if (l.spot && !l.spot.key?.startsWith("stand:") && !keys.has(l.spot.key)) { l.spot = null; l.next = 0; l.busy = false; }
    else if (l.spot?.key?.startsWith("stand:") && keys.size && !l.busy) l.next = 0;  // something new to use: they go
  }
  if (chief.lspot && !chief.lspot.key?.startsWith("stand:") && !keys.has(chief.lspot.key)) chief.lspot = null;
}
export function pickSpot(name) {
  const free = SPOTS().filter(spotFree);
  if (!free.length) return standSpot();
  const [need, v] = hub.lowestNeed(mate(name));
  const pref = v < 60 && free.filter(s => (hub.ACT_SERVES[s.act.id] || [])[0] === need[0] || (v < 40 && (hub.ACT_SERVES[s.act.id] || []).includes(need[0])));
  const pool = pref?.length ? pref : free;
  return pool[Math.floor(Math.random() * pool.length)];
}
function mateIntent(name, l, e) {
  if (e) return "En mission : il finit son travail avant de penser à ses besoins.";
  const need = hub.urgentNeed(name);
  return need ? `Besoin le plus urgent : ${hub.NEEDS.find(n => n[0] === need)[1].toLowerCase()} — il s'en occupe tout seul.` : "Tout va bien : il se détend en attendant une mission.";
}
function loungeRoute(_l, sp) { return [{ x: sp.x, y: sp.y }]; }  // around the furniture as they walk (world/route.js)
export function sendTo(l, sp, t) {
  if (!sp) return;
  l.path = loungeRoute(l, sp); l.spot = sp; l.next = t + 40000 + Math.random() * 50000;
}
export function loungeSay(name, msg, t = performance.now()) {
  const l = loungers.get(name); if (!l) return;
  l.say = msg; l.sayUntil = t + 3200;
}

function stepLounge(dt, t) {
  const inOffice = new Set([...ents.values()].map(e => e.who).filter(Boolean));
  for (const name of TEAM) {
    const l = loungers.get(name);
    if (!inOffice.has(name) && !l && !hub.atHome(name) && !hub.isVacant(name)) {  // at home in the evening (days.js)  // back from the office (or first load): settles on an activity
      const n = { name, look: { ...lookFor(name, null), shirt: CASUAL[hash(name) % CASUAL.length], team: true }, x: LD.x, y: LD.y, path: [], spot: null, next: 0, say: "", sayUntil: 0 };
      loungers.set(name, n);
      const sp = pickSpot(name);
      if (!loungeReady && sp) { n.x = sp.x; n.y = sp.y; n.spot = sp; n.next = t + Math.random() * 60000; }
      else { sendTo(n, sp, t); n.path.unshift({ x: LD.x, y: LOUNGE_CORRIDOR }); n.say = "Je suis de retour !"; n.sayUntil = t + 2500; hub.snd?.("door", { room: "lounge", pan: 0.6 }); }
    } else if (inOffice.has(name) && l && !l.called) {  // called by an agent: leaves through the door
      l.called = true; l.say = "On m'appelle, j'y vais !"; l.sayUntil = t + 2500; setTimeout(() => hub.snd?.("door", { room: "lounge", pan: 0.6 }), 4000);
      l.path = [...(l.spot?.via ? [{ ...l.spot.via }] : []), { x: l.spot?.via ? l.spot.via.x : l.x, y: LOUNGE_CORRIDOR }, { x: LD.x, y: LOUNGE_CORRIDOR }, { ...LD }];
      l.spot = null;
    }
  }
  loungeReady = true;
  for (const [name, l] of loungers) {
    if (l.path.length) {
      hub.routeAhead(l.path, l.x, l.y, "lounge");  // around the furniture (world/route.js)
      walkStep(l, l.path, dt, 0.04, "lounge");  // with some weight, making way for the others (world/motion.js)
      if (!l.path.length && l.called) loungers.delete(name);
    } else {
      if (!l.partyRoom) standing("lounge", l, l.x, l.y);  // the others walk around them (world/motion.js)
      if (!l.called && !l.busy && !l.partyRoom && t > l.next) sendTo(l, pickSpot(name) || l.spot, t);
    }
  }
  // conversations
  while (chatQueue.length && t >= chatQueue[0].at) { const c = chatQueue.shift(); loungeSay(c.name, c.text, t); }
  if (t > nextChat) {
    nextChat = t + 5000 + Math.random() * 5000;
    const idle = [...loungers.values()].filter(l => !l.called && !l.busy && !l.path.length && t > l.sayUntil && t > (l.talkUntil || 0));
    if (idle.length) {
      const a = idle[Math.floor(Math.random() * idle.length)];
      const b = idle.filter(x => x !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      // a little conversation (social/dialogue.js): the lines go back and forth, a few seconds apart
      const talk = converse(a, b, chatContext(a));
      talk.forEach(([name, text], i) => i ? chatQueue.push({ name, text, at: t + i * 2900 }) : loungeSay(name, text, t));
      chatQueue.sort((p, q) => p.at - q.at);
      const end = t + talk.length * 2900;
      a.talkUntil = end; if (b) { b.talkUntil = end; if (Math.hypot(a.x - b.x, a.y - b.y) < 60) hub.relAdd(a.name, b.name, talk.length > 2 ? 2 : 1); }
      nextChat = Math.max(nextChat, t + 3000 + talk.length * 1500);
    }
  }
}

const CASUAL = ["#e98fc4", "#7fd6d6", "#d6a77f", "#9aa3b5", "#b48cff", "#ff8f6b", "#4090d7", "#51cf66"];
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function officeNews() {
  const session = curSession(), news = [];
  for (const a of session?.agents || []) {
    const who = crew.ids[a.id];
    if (!who) continue;
    if (a.status === "done") news.push(`${who} a livré ${a.ticket || "son ticket"} !`);
    else if (a.status === "blocked") news.push(`${who} est bloqué sur ${a.ticket || "son ticket"}…`);
    else if (a.status === "working") news.push(`${who} bosse sur ${a.ticket || "un truc"}.`);
  }
  if (chief.at === "console") news.push(`${CHIEF_NAME} est encore sur la console…`);
  else if (chief.at === "coffee") news.push(`${CHIEF_NAME} est parti se faire un café.`);
  return news;
}
// what the office gives to talk about (social/dialogue.js converse)
function chatContext(a) {
  return { news: officeNews(), noDesk: !hub.devHasDesk(a.name), duel: a.lastDuel || null, crush: hub.crushOfDay(), coffeeBroken: hub.Incident.get("coffee").on,
    dish: hub.dish?.portions ? hub.dish.recipe.label.toLowerCase() : null, cook: hub.dish?.cook || null };
}
function moodAnswer(name) {
  const m = mate(name), w = moodWord(m);
  return pick(m.fatigue >= 70 ? ["Honnêtement ? Je suis crevé.", "J'ai besoin d'une sieste, chef.", "Je tiens debout grâce au café."]
    : m.faim <= 25 ? ["J'ai faim, je file à la cuisine.", "On mange quand ?", "Mon ventre gargouille, chef."]
    : m.social <= 25 ? ["Content que tu viennes me parler !", "Ça fait du bien de discuter.", "Je me sentais un peu seul."]
    : m.cafe <= 25 ? ["Ça irait mieux avec un café…", "Un café et je suis à toi.", "Mon niveau de caféine est critique."]
    : m.ennui >= 70 ? ["Je m'ennuie, donne-moi un ticket !", "Il se passe rien, chef…", "J'ai fini de compter les dalles du plafond."]
    : m.moral >= 80 ? ["Au top, prêt à livrer !", "Jamais été aussi motivé.", "Super journée, merci chef !"]
    : [`Ça va, ${w === "ça va" ? "tranquille" : w}.`, "Ça va, et toi chef ?", "Tranquille, ça avance.", "Pas mal, pas mal."]);
}

// interactions from the side panel
function mateAction(name, act) {
  const t = performance.now();
  if (act === "talk") loungeSay(name, moodAnswer(name), t);
  else if (act === "cheer") { crewAdd(name, { moral: 10, ennui: -5 }); loungeSay(name, "On lâche rien !", t); }
  else if (act === "kudos") hub.giveKudos(name);
  else if (act.startsWith("duel:")) return hub.challenge(name, act.slice(5));
  hub.loadDetail();
}
export function renderMate(name) {
  const box = document.getElementById("p-game");
  if (box.contains(document.activeElement) && document.activeElement.tagName === "SELECT") return;  // don't reset an open select
  const e = [...ents.values()].find(x => x.who === name && !x.leaving), l = loungers.get(name), m = mate(name);
  const where = e ? `au bureau · ${specialty(e.agent.type)}${e.agent.ticket ? ` · ${hub.esc(e.agent.ticket)}` : ""}` : l ? `salle de repos · ${l.called ? "appelé au bureau" : l.path.length ? "se déplace" : l.spot?.act.label || "se pose"}` : "—";
  box.innerHTML = `<div class="mate" style="--c:${e ? typeColor(e.agent.type) : "#4090d7"}"><div class="top"><b>${name}</b><span class="muted">${where}</span></div>
    <div class="muted">${moodWord(m)}${l?.say && performance.now() < l.sayUntil ? ` · « ${hub.esc(l.say)} »` : ""}</div>
    ${hub.needMeters(m)}</div>
    ${hub.mateSocialHtml(name)}
    ${hub.skillsLine(name)}
    <div class="acts"><button data-act="talk"${l ? "" : " disabled"}>💬 Discuter</button><button data-act="cheer">🎉 Encourager</button><button data-act="kudos">⭐ Kudos</button></div>
    ${l && !l.called ? `<div class="acts"><button data-act="duel:pingpong">🏓 Défier au ping-pong</button><button data-act="duel:babyfoot">⚽ Défier au baby-foot</button><button data-act="duel:darts">🎯 Défier aux fléchettes</button></div>` : ""}
    <p class="muted">⭐ ${hub.kudos.total[name] || 0} kudos au total${hub.crushOfDay() === name ? " · ♥ coup de cœur du jour" : ""} · duels : ${(hub.duels.scores[name]?.w || 0)} victoire(s) pour toi, ${(hub.duels.scores[name]?.l || 0)} pour ${name}</p>
    <p class="muted">${hub.esc(mateIntent(name, l, e))}</p>
    <p class="muted">${e ? "Au travail : il ne parle qu'en salle de repos." : "Clique sur un dev en salle de repos : menu d'actions façon Sims (discuter, blagues, câlin, cuisiner ensemble…)."}</p>`;
}
document.getElementById("p-game").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-act]");
  if (b && selected?.startsWith("mate:")) mateAction(selected.slice(5), b.dataset.act);
});

export function setView(v) {
  view = v;
  if (typeof hub.renderRoomBar === "function") hub.renderRoomBar();
  document.getElementById("loungebtn").classList.toggle("on", v === "lounge");
  document.getElementById("loungebtn").innerHTML = v === "lounge" ? `🏢<span class="lbl"> RETOUR AU BUREAU</span>` : `☕<span class="lbl"> SALLE DE REPOS</span> (${loungers.size})`;
}

// how a dev of the break room stands now (drawPerson options): also what the visitors of the office see (world/share.js)
export function loungerPose(l, t) {
  const walking = l.path.length > 0, act = !walking && l.spot?.act, f = Math.floor(t / (walking ? 180 : 260));
  let opts = { frame: walking ? f : 0, step: walking ? stepOf(l, l.x, l.y) : null, talk: t < (l.sayUntil || 0), back: walking && l.path[0].y < l.y, smile: mate(l.name).moral >= 50, dir: walking ? [l.path[0].x - l.x, l.path[0].y - l.y] : l.spot?.face };
  if (act) {
    opts = { ...opts, ...act.pose, frame: act.pose.arms === "type" || act.pose.arms === "reach" || act.pose.hold === "paddle" ? f : 0 };
    if (act.dress) opts = act.dress(l, opts, t);  // an Activity (js/activities/); cooking, eating… are plain objects (social.js)
    if (l.spot.back) opts.back = true;
  }
  if (l.gesture && t < l.gesture.until) opts = { ...opts, ...l.gesture.pose, frame: f };  // social gestures (social.js)
  return opts;
}
export function drawLounger(l, t) {
  const opts = loungerPose(l, t), act = !l.path.length && l.spot?.act;
  drawPerson(l.x, l.y, l.look, opts);
  act?.after?.(l, t);  // a cup, a book, a mic
  l.seated = !!opts.seated;
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get revalidateSpots() { return revalidateSpots; }, get LD() { return LD; }, get LOUNGE_CORRIDOR() { return LOUNGE_CORRIDOR; }, get loungers() { return loungers; }, get setView() { return setView; }, get spotFree() { return spotFree; }, get stepLounge() { return stepLounge; }, get view() { return view; }, set view(v) { view = v; } });
