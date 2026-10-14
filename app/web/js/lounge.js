"use strict";
// Break room: activities, chats, mate panel.

/* ---------- break room ---------- */
// every team member not called by an agent waits here: activities, chats between them, and you can talk to them
const LD = { x: 23, y: 72 };                     // door back to the office, in the break room
const LOUNGE_CORRIDOR = 100;
const ACTS = [
  { id: "sofa", label: "regarde la télé", spots: [{ x: 72, y: 116 }, { x: 86, y: 116 }, { x: 100, y: 116 }], pose: { seated: true, back: true }, fx: { fatigue: -3, ennui: -1 },
    lines: ["Ce film est nul.", "Mets la suite !", "Chut, c'est le meilleur passage."] },
  { id: "chat", label: "discute sur le pouf", spots: [{ x: 59, y: 184, via: { x: 40, y: 184 } }, { x: 109, y: 184, via: { x: 125, y: 184 } }], pose: { seated: true }, fx: { fatigue: -2, ennui: -2, moral: 1 },
    lines: ["Bon, on refait le monde ?", "T'as vu la dernière MR ?"] },
  { id: "pingpong", label: "joue au ping-pong", spots: [{ x: 188, y: 140 }, { x: 272, y: 140 }], pose: { arms: "type" }, fx: { ennui: -4, fatigue: 1, moral: 1 },
    lines: ["Smash !", "Let, on la rejoue.", "11-9, je mène !"] },
  { id: "babyfoot", label: "joue au baby-foot", spots: [{ x: 322, y: 162 }, { x: 322, y: 202, via: { x: 290, y: 202 } }], pose: { arms: "type" }, fx: { ennui: -4, moral: 1 },
    lines: ["Pas de pissette !", "Gamelle !", "Demi, on change ?"] },
  { id: "arcade", label: "joue à l'arcade", spots: [{ x: 361, y: 86 }], pose: { arms: "type", back: true }, fx: { ennui: -3 },
    lines: ["Nouveau record !", "Encore une pièce…"] },
  { id: "read", label: "lit dans le fauteuil", spots: [{ x: 260, y: 92 }], pose: { seated: true }, fx: { ennui: -1, fatigue: -2 },
    lines: ["Ce livre sur le DDD est top.", "Un chapitre et j'y retourne."] },
  { id: "kitchen", label: "se fait un café", spots: [{ x: 174, y: 84 }, { x: 198, y: 84 }], pose: {}, fx: { cafe: 5, ennui: -1 }, cup: true,
    lines: ["Qui a fini le lait ?", "Double espresso, minimum.", "Il est bon ce café."] },
  { id: "darts", label: "joue aux fléchettes", spots: [{ x: 303, y: 104 }], pose: { back: true }, fx: { ennui: -3 },
    lines: ["180 !!!", "Dans le mille."] },
];
const SPOTS = ACTS.flatMap(a => a.spots.map(s => ({ ...s, act: a })));
const loungers = new Map();
let view = "office", loungeReady = false, nextChat = 0;
const chatQueue = [];

function spotFree(sp) { return ![...loungers.values()].some(l => l.spot === sp && !l.called); }
// the activity that serves the most urgent need (sims.js); otherwise a random free one
function pickSpot(name) {
  const free = SPOTS.filter(spotFree);
  if (!free.length) return null;
  const [need, v] = lowestNeed(mate(name));
  const pref = v < 60 && free.filter(s => (ACT_SERVES[s.act.id] || [])[0] === need[0] || (v < 40 && (ACT_SERVES[s.act.id] || []).includes(need[0])));
  const pool = pref?.length ? pref : free;
  return pool[Math.floor(Math.random() * pool.length)];
}
function mateIntent(name, l, e) {
  if (e) return "En mission : il finit son travail avant de penser à ses besoins.";
  const need = urgentNeed(name);
  return need ? `Besoin le plus urgent : ${NEEDS.find(n => n[0] === need)[1].toLowerCase()} — il s'en occupe tout seul.` : "Tout va bien : il se détend en attendant une mission.";
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
function sendTo(l, sp, t) {
  if (!sp) return;
  l.path = loungeRoute(l, sp); l.spot = sp; l.next = t + 40000 + Math.random() * 50000;
}
function loungeSay(name, msg, t = performance.now()) {
  const l = loungers.get(name); if (!l) return;
  l.say = msg; l.sayUntil = t + 3200;
}

function stepLounge(dt, t) {
  const inOffice = new Set([...ents.values()].map(e => e.who).filter(Boolean));
  for (const name of TEAM) {
    const l = loungers.get(name);
    if (!inOffice.has(name) && !l) {  // back from the office (or first load): settles on an activity
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
    } else if (!l.called && t > l.next) sendTo(l, pickSpot(name) || l.spot, t);
  }
  // conversations
  while (chatQueue.length && t >= chatQueue[0].at) { const c = chatQueue.shift(); loungeSay(c.name, c.text, t); }
  if (t > nextChat) {
    nextChat = t + 5000 + Math.random() * 5000;
    const idle = [...loungers.values()].filter(l => !l.called && !l.path.length && t > l.sayUntil);
    if (idle.length) {
      const a = idle[Math.floor(Math.random() * idle.length)];
      const b = idle.filter(x => x !== a).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      loungeSay(a.name, chatLine(a, b), t);
      if (b) chatQueue.push({ name: b.name, text: replyLine(b, a), at: t + 2600 });
    }
  }
}

const CASUAL = ["#e98fc4", "#7fd6d6", "#d6a77f", "#9aa3b5", "#b48cff", "#ff8f6b", "#4090d7", "#51cf66"];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
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
  if (m.ennui >= 70) opts.push("On s'ennuie, appelez-nous !");
  if (m.cafe <= 25) opts.push("Il me faut un café, vite.");
  if (m.moral >= 80) opts.push("Quelle équipe, franchement !");
  const news = officeNews(); if (news.length) opts.push(pick(news));
  if (a.lastDuel === "lost") opts.push(`J'ai perdu contre ${CHIEF_NAME}… je veux ma revanche.`);
  if (a.lastDuel === "won") opts.push(`J'ai battu ${CHIEF_NAME}, vous auriez vu ça !`);
  const crush = crushOfDay(); if (crush && crush !== a.name) opts.push(`Bravo ${crush} pour le coup de cœur du jour !`);
  if (events.coffee) opts.push("La machine du bureau est en panne, heureusement qu'on a celle-ci.");
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
  else if (act === "kudos") giveKudos(name);
  else if (act.startsWith("duel:")) return challenge(name, act.slice(5));
  loadDetail();
}
function renderMate(name) {
  const box = document.getElementById("p-game");
  if (box.contains(document.activeElement) && document.activeElement.tagName === "SELECT") return;  // don't reset an open select
  const e = [...ents.values()].find(x => x.who === name && !x.leaving), l = loungers.get(name), m = mate(name);
  const where = e ? `au bureau · ${specialty(e.agent.type)}${e.agent.ticket ? ` · ${esc(e.agent.ticket)}` : ""}` : l ? `salle de repos · ${l.called ? "appelé au bureau" : l.path.length ? "se déplace" : l.spot?.act.label || "se pose"}` : "—";
  box.innerHTML = `<div class="mate" style="--c:${e ? typeColor(e.agent.type) : "#4090d7"}"><div class="top"><b>${name}</b><span class="muted">${where}</span></div>
    <div class="muted">${moodWord(m)}${l?.say && performance.now() < l.sayUntil ? ` · « ${esc(l.say)} »` : ""}</div>
    ${needMeters(m)}</div>
    <div class="acts"><button data-act="talk"${l ? "" : " disabled"}>💬 Discuter</button><button data-act="cheer">🎉 Encourager</button><button data-act="kudos">⭐ Kudos</button></div>
    ${l && !l.called ? `<div class="acts"><button data-act="duel:pingpong">🏓 Défier au ping-pong</button><button data-act="duel:babyfoot">⚽ Défier au baby-foot</button><button data-act="duel:darts">🎯 Défier aux fléchettes</button></div>` : ""}
    <p class="muted">⭐ ${kudos.total[name] || 0} kudos au total${crushOfDay() === name ? " · ♥ coup de cœur du jour" : ""} · duels : ${(duels.scores[name]?.w || 0)} victoire(s) pour toi, ${(duels.scores[name]?.l || 0)} pour ${name}</p>
    <p class="muted">${esc(mateIntent(name, l, e))}</p>
    <p class="muted">${e ? "Au travail : il ne parle qu'en salle de repos." : "Clique sur les devs dans la salle de repos pour leur parler."}</p>`;
}
document.getElementById("p-game").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-act]");
  if (b && selected?.startsWith("mate:")) mateAction(selected.slice(5), b.dataset.act);
});

function setView(v) {
  view = v;
  document.getElementById("loungebtn").classList.toggle("on", v === "lounge");
  document.getElementById("loungebtn").innerHTML = v === "lounge" ? `🏢<span class="lbl"> RETOUR AU BUREAU</span>` : `☕<span class="lbl"> SALLE DE REPOS</span> (${loungers.size})`;
}

function hitLounge(x, y) {
  if (x >= 8 && x <= 40 && y >= 10 && y <= 72) return "office";
  if (x >= 194 && x <= 266 && y >= 124 && y <= 152) return "duel:pingpong";
  if (x >= 298 && x <= 346 && y >= 166 && y <= 190) return "duel:babyfoot";
  if (x >= 293 && x <= 313 && y >= 15 && y <= 35) return "duel:darts";
  for (const l of [...loungers.values()].sort((a, b) => b.y - a.y)) if (Math.abs(x - l.x) <= 7 && y >= l.y - 22 && y <= l.y + 3) return `mate:${l.name}`;
  if (chief.room === "lounge") {  // the chief is here: the furniture is for him too
    const spotAt = [["kitchen", 158, 30, 76, 38], ["sofa", 58, 110, 56, 16], ["arcade", 350, 34, 22, 36], ["read", 240, 28, 34, 66], ["chat", 50, 176, 70, 14]]
      .find(([, ax, ay, w, h]) => x >= ax && x <= ax + w && y >= ay && y <= ay + h);
    if (spotAt) return `chiefact:${spotAt[0]}`;
  }
  return null;
}

function renderLounge(t) {
  // room
  px(0, 0, W, 70, "#14317a");
  for (let x = 0; x < W; x += 16) px(x, 0, 1, 70, "#122c6e");
  px(0, 66, W, 4, "#081746");
  ctx.drawImage(loungeFloorCanvas(), 0, Math.round(70 * S));
  px(0, 66.5, W, 3.5, "#1a2340"); px(0, 66.5, W, 0.6, "#2c3a66");  // baseboard
  text("SALLE DE REPOS", 200, 4, "#fbaa08", 6, "center");
  drawSky(100, 12, t); art("window", 94, 4, 58, 41, windowArt); art("windowglints", 94, 4, 58, 41, WINDOW_GLINTS, { outline: false });
  sprite("door", 8, 20); text("← BUREAU", 23, 14, "#51cf66", 4, "center");
  const darting = [...loungers.values()].some(l => l.spot?.act.id === "darts" && !l.path.length) || chief.lspot?.act.id === "darts";
  art(`dartboard:${darting ? Math.floor(t / 1500) % 4 : 0}`, 296, 18, 14, 14, () => dartboardArt(darting ? Math.floor(t / 1500) % 4 : 0));
  sprite("bookshelf", 240, 28); sprite("kitchen", 158, 30);
  drawTournament(t);
  for (const [x, y] of [[372, 200], [6, 206], [140, 54]]) sprite("plant", x - 2, y - 2);
  art("cornerrug", 30, 150, 128, 62, () => cornerRugArt(128, 62), { outline: false });  // the beanbag corner
  // the TV shows something when someone is on the sofa
  const watching = [...loungers.values()].some(l => l.spot?.act.id === "sofa" && !l.path.length);
  if (watching) { const f = Math.floor(t / 700) % 4; art(`tvshow:${f}`, 77, 65, 16, 9, () => tvShowArt(f), { outline: false }); }
  else px(77, 65, 16, 9, "#14141c");
  sprite("tv", 73, 64);
  // arcade screen
  const arcading = [...loungers.values()].some(l => l.spot?.act.id === "arcade" && !l.path.length) || chief.lspot?.act.id === "arcade";
  const pinging = [...loungers.values()].filter(l => l.spot?.act.id === "pingpong" && !l.path.length).length;
  const footing = [...loungers.values()].some(l => l.spot?.act.id === "babyfoot" && !l.path.length);
  // furniture and people, depth-sorted
  const items = [
    { y: 85, draw: () => sprite("armchair", 250, 78) },
    { y: 70, draw: () => { const f = Math.floor(t / (arcading ? 250 : 600)) % 2; art(`arcade:${f}:${arcading}`, 350, 34, 22, 36, () => arcadeArt(f, arcading)); } },
    { y: 121, draw: () => sprite("sofa", 58, 110) },
    { y: 135, draw: () => { art(`pingpong:${!pinging}`, 194, 122, 72, 28, () => pingpongArt(!pinging)); drawPingBall(t); } },
    { y: 176, draw: () => { const sh = footing ? Math.round(Math.sin(t / 160) * 2) / 2 : 0; art(`babyfoot:${sh}`, 298, 166, 48, 24, () => babyfootArt(sh)); } },
    { y: 180, draw: () => { sprite("beanbag", 50, 176); sprite("beanbag", 100, 176); } },
  ];
  for (const l of loungers.values()) items.push({ y: l.y, draw: () => drawLounger(l, t) });
  if (chief.room === "lounge") items.push({ y: chief.ly, draw: () => drawChiefLounge(t) });
  items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  for (const l of loungers.values()) badge(l.x, l.y + (l.seated ? -3 : 2), nameTag(l.name), selected === `mate:${l.name}` ? "#fbaa08" : "#4090d7");
  for (const l of loungers.values()) drawEmotion(l.name, l.x, l.y - (l.seated ? 20 : 25), t);
  if (chief.room === "lounge") drawChiefLoungeOver(t);
  for (const l of loungers.values()) if (t < l.sayUntil) bubble(l.x, l.y - (l.seated ? 22 : 24), l.say, "#f7f7f7", "#081746");
  if (!loungers.size) text("Tout le monde est au bureau !", W / 2, 150, "#d5eeff", 5, "center");
}
function drawPingBall(t) {
  const players = [...loungers.values()].filter(l => l.spot?.act.id === "pingpong" && !l.path.length).length;
  if (!players) return;
  const k = (t / 700) % 2, p = k < 1 ? k : 2 - k;
  px(200 + p * 60, 132 - Math.sin(p * Math.PI) * 6, 1.5, 1.5, "#f7f7f7");
}
function drawLounger(l, t) {
  const walking = l.path.length > 0, act = !walking && l.spot?.act, f = Math.floor(t / (walking ? 180 : 260));
  let opts = { frame: walking ? f : 0, back: walking && l.path[0].y < l.y, smile: mate(l.name).moral >= 50 };
  if (act) {
    opts = { ...opts, ...act.pose, frame: act.pose.arms === "type" ? f : 0 };
    if (act.id === "darts" && (t / 1000 + hash(l.name)) % 3 < 0.5) opts.arms = "up";
    if (act.id === "babyfoot" && l.spot.y > 180) opts.back = true;
  }
  drawPerson(l.x, l.y, l.look, opts);
  if (act?.cup) { px(l.x + 4, l.y - 13, 2.5, 3, "#f4f2ea"); px(l.x + 4, l.y - 13, 2.5, 0.8, "#6d4a2e"); }
  if (act?.id === "read") px(l.x - 3, l.y - 9, 6, 3.5, "#ff6b6b");
  l.seated = !!opts.seated;
}
