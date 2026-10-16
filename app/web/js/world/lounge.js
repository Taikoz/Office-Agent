// Break room: activities, chats, mate panel.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, H, TEAM, chief, curSession, ents, hash, selected, specialty, typeColor } from "../core/core.js";
import { drawPerson } from "./scene.js";
import { lookFor } from "../agents/entities.js";
import { crew, crewAdd, mate, moodWord } from "../sims/crew.js";
import { ACTS } from "../activities/base.js";

/* ---------- break room ---------- */
// every team member not called by an agent waits here: activities, chats between them, and you can talk to them
export const LD = { x: 23, y: 72 };                     // door back to the office, in the break room
export const LOUNGE_CORRIDOR = 100;
// every spot of every activity (js/activities/), with its activity
const SPOTS = ACTS.flatMap(a => a.spots.map(s => ({ ...s, act: a })));
export const loungers = new Map();
export let view = "office", loungeReady = false, nextChat = 0;
const chatQueue = [];

// break room floor (decor.js: carpet tiles by default, a round rug in the middle), drawn once per scale and setting
export function loungeFloorCanvas() { return hub.roomFloorCanvas("lounge", H - 70, [[130, 44, 140, 52]]); }

function spotFree(sp) { return ![...loungers.values()].some(l => l.spot === sp && !l.called); }
// the activity that serves the most urgent need (sims.js); otherwise a random free one
export function pickSpot(name) {
  const free = SPOTS.filter(spotFree);
  if (!free.length) return null;
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
function loungeRoute(l, sp) {
  const pts = [];
  if (l.spot?.via) pts.push({ ...l.spot.via });
  pts.push({ x: pts.length ? pts[0].x : l.x, y: LOUNGE_CORRIDOR });
  pts.push({ x: sp.via ? sp.via.x : sp.x, y: LOUNGE_CORRIDOR });
  if (sp.via) pts.push({ ...sp.via });
  pts.push({ x: sp.x, y: sp.y });
  return pts;
}
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
      else { sendTo(n, sp, t); n.path.unshift({ x: LD.x, y: LOUNGE_CORRIDOR }); n.say = "Je suis de retour !"; n.sayUntil = t + 2500; }
    } else if (inOffice.has(name) && l && !l.called) {  // called by an agent: leaves through the door
      l.called = true; l.say = "On m'appelle, j'y vais !"; l.sayUntil = t + 2500;
      l.path = [...(l.spot?.via ? [{ ...l.spot.via }] : []), { x: l.spot?.via ? l.spot.via.x : l.x, y: LOUNGE_CORRIDOR }, { x: LD.x, y: LOUNGE_CORRIDOR }, { ...LD }];
      l.spot = null;
    }
  }
  loungeReady = true;
  for (const [name, l] of loungers) {
    if (l.path.length) {
      const tgt = l.path[0], dx = tgt.x - l.x, dy = tgt.y - l.y, dist = Math.hypot(dx, dy), sp = 0.04 * dt;
      if (dist > sp) { l.x += dx / dist * sp; l.y += dy / dist * sp; }
      else { l.x = tgt.x; l.y = tgt.y; l.path.shift(); }
      if (!l.path.length && l.called) loungers.delete(name);
    } else if (!l.called && !l.busy && t > l.next) sendTo(l, pickSpot(name) || l.spot, t);
  }
  // conversations
  while (chatQueue.length && t >= chatQueue[0].at) { const c = chatQueue.shift(); loungeSay(c.name, c.text, t); }
  if (t > nextChat) {
    nextChat = t + 5000 + Math.random() * 5000;
    const idle = [...loungers.values()].filter(l => !l.called && !l.busy && !l.path.length && t > l.sayUntil);
    if (idle.length) {
      const a = idle[Math.floor(Math.random() * idle.length)];
      const b = idle.filter(x => x !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      loungeSay(a.name, chatLine(a, b), t);
      if (b) { chatQueue.push({ name: b.name, text: replyLine(b, a), at: t + 2600 }); if (Math.hypot(a.x - b.x, a.y - b.y) < 60) hub.relAdd(a.name, b.name, 1); }
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
function chatLine(a, b) {
  const m = mate(a.name), opts = [];
  if (a.spot?.act.lines) opts.push(pick(a.spot.act.lines));
  if (m.fatigue >= 70) opts.push("Je suis lessivé…");
  if (!hub.devHasDesk(a.name)) opts.push("On m'a vendu mon bureau… 😠", "Je bosse sur un carton maintenant.");
  if (m.ennui >= 70) opts.push("On s'ennuie, appelez-nous !");
  if (m.cafe <= 25) opts.push("Il me faut un café, vite.");
  if (m.moral >= 80) opts.push("Quelle équipe, franchement !");
  const news = officeNews(); if (news.length) opts.push(pick(news));
  if (a.lastDuel === "lost") opts.push(`J'ai perdu contre ${CHIEF_NAME}… je veux ma revanche.`);
  if (a.lastDuel === "won") opts.push(`J'ai battu ${CHIEF_NAME}, vous auriez vu ça !`);
  const crush = hub.crushOfDay(); if (crush && crush !== a.name) opts.push(`Bravo ${crush} pour le coup de cœur du jour !`);
  if (hub.Incident.get("coffee").on) opts.push("La machine du bureau est en panne, heureusement qu'on a celle-ci.");
  if (b && hub.rel(a.name, b.name) >= 70) opts.push(pick([`${b.name}, t'es vraiment le meilleur.`, `On se fait un resto ce soir, ${b.name} ?`]));
  if (b && hub.rel(a.name, b.name) < -20) opts.push(pick([`Tiens, ${b.name}… 🙄`, `${b.name}, rends-moi mon mug.`]));
  if (hub.dish?.portions) opts.push(`Il reste ${hub.dish.recipe.label.toLowerCase()}, merci ${hub.dish.cook} !`);
  if (b) opts.push(pick([`${b.name}, revanche au baby ?`, `${b.name}, tu bosses sur quoi ?`, `${b.name}, t'as vu Brume ce matin ?`, `${b.name}, on se fait un café ?`]));
  opts.push(pick(["Qui a cassé la pipeline ?", "Vivement vendredi.", "J'ai rêvé en Python cette nuit.", "Brume a encore dormi sur mon clavier.", "Le tableau est plein aujourd'hui."]));
  return pick(opts);
}
function replyLine(b) {
  const m = mate(b.name);
  return pick([...(m.fatigue >= 70 ? ["Moi aussi, je suis cuit."] : []), ...(m.moral >= 80 ? ["Carrément !"] : []), ...(m.moral <= 30 ? ["Bof…"] : []),
    "Grave.", "Pas faux.", "Ha ha !", "Je t'avoue…", "Chut, je me concentre.", "Ça marche.", "Clairement."]);
}
function moodAnswer(name) {
  const m = mate(name), w = moodWord(m);
  return m.fatigue >= 70 ? "Honnêtement ? Je suis crevé." : m.faim <= 25 ? "J'ai faim, je file à la cuisine." : m.social <= 25 ? "Content que tu viennes me parler !" : m.cafe <= 25 ? "Ça irait mieux avec un café…" : m.ennui >= 70 ? "Je m'ennuie, donne-moi un ticket !"
    : m.moral >= 80 ? "Au top, prêt à livrer !" : `Ça va, ${w === "ça va" ? "tranquille" : w}.`;
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

export function drawLounger(l, t) {
  const walking = l.path.length > 0, act = !walking && l.spot?.act, f = Math.floor(t / (walking ? 180 : 260));
  let opts = { frame: walking ? f : 0, back: walking && l.path[0].y < l.y, smile: mate(l.name).moral >= 50 };
  if (act) {
    opts = { ...opts, ...act.pose, frame: act.pose.arms === "type" ? f : 0 };
    if (act.dress) opts = act.dress(l, opts, t);  // an Activity (js/activities/); cooking, eating… are plain objects (social.js)
    if (l.spot.back) opts.back = true;
  }
  if (l.gesture && t < l.gesture.until) opts = { ...opts, ...l.gesture.pose, frame: f };  // social gestures (social.js)
  drawPerson(l.x, l.y, l.look, opts);
  act?.after?.(l, t);  // a cup, a book, a mic
  l.seated = !!opts.seated;
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get LD() { return LD; }, get LOUNGE_CORRIDOR() { return LOUNGE_CORRIDOR; }, get loungers() { return loungers; }, get setView() { return setView; }, get spotFree() { return spotFree; }, get stepLounge() { return stepLounge; }, get view() { return view; }, set view(v) { view = v; } });
