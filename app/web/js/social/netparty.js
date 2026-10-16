// The afterwork of all the connected offices (the phone's Afterwork). The chief who throws it invites every connected
// chief; the ones who say yes come to his break room (a visit) and their free devs with them: at home those devs are
// away (partyRoom "remote"), in his break room they stand around with a drink and chat with his own devs. Everyone
// visiting sees them (world/share.js puts them in his team). 15 minutes, or until he stops it. Nothing is kept.

import { hub, provide } from "../hub.js";
import { badge, px, roomSize } from "../core/core.js";
import { bubble, drawPerson, headroom, stepOf } from "../world/scene.js";
import { call, net, startVisit, visitRoom } from "../world/peers.js";
import { LD, loungeSay, loungers, pick } from "../world/lounge.js";
import { toast } from "../sims/progress.js";

const MINUTES = 15;
export const party = { mine: false, until: 0, guests: new Map(), joined: "", joinedName: "", folks: new Map(), chatAt: 0 };
// guests: pid → its chief's name (at our party); folks: "pid:name" → a dev of theirs in our break room
const send = (to, text) => call("chat", { sid: net.sid, kind: "party", to, text });
const LINES = ["Santé ! 🍻", "Vous bossez sur quoi en ce moment ?", "Chez nous la CI est toute verte 😎", "Trop bien votre salle de repos !", "Qui a fait la déco ?",
  "On fait un baby-foot après ?", "Votre chef est sympa ?", "J'ai livré trois MR aujourd'hui 💪", "Ça fait du bien de voir du monde !", "Il reste des chips ?",
  "Vous avez une machine à café de luxe…", "Faudrait faire ça plus souvent !", "Le vendredi, c'est sacré 🍻", "Vous testez en e2e vous aussi ?", "J'adore votre jukebox 🎵",
  "Notre chat dort sur les claviers, et le vôtre ?", "Un petit toast à nos chefs !", "On parle pas boulot, promis 🤐"];
const REPLIES = ["Santé ! 🍻", "Haha, pareil chez nous !", "Bienvenue chez nous 😄", "Carrément !", "Faut absolument qu'on se refasse ça", "On vous met une raclée au baby-foot 😎",
  "Tchin ! 🥂", "Chez nous aussi c'est la folie", "Trop content que vous soyez venus !"];

/* ---------- throwing one ---------- */
export async function startParty() {
  if (!net.sid) throw new Error("connecte-toi d'abord (Réseau)");
  if (party.joined) throw new Error(`tu es à l'afterwork de ${party.joinedName}`);
  const asked = net.peers.filter(p => p.status !== "dnd");
  if (!asked.length) throw new Error("personne de disponible en ligne");
  Object.assign(party, { mine: true, until: performance.now() + MINUTES * 60000 });
  await Promise.all(asked.map(p => send(p.pid, "start").catch(() => {})));
  const free = [...loungers.values()].filter(l => !l.partyRoom); if (free.length) loungeSay(pick(free).name, "Afterwork commun ! 🍻");
  toast("🍻 AFTERWORK COMMUN", "Invitations envoyées", "Les équipes des autres bureaux vont arriver dans ta salle de repos.");
}
export function stopParty(tell = true) {
  if (!party.mine) return;
  if (tell) for (const pid of party.guests.keys()) send(pid, "stop").catch(() => {});
  Object.assign(party, { mine: false, until: 0 }); party.guests.clear(); party.folks.clear();
  toast("🍻 AFTERWORK", "C'est fini", "Merci à tous !");
}

/* ---------- going to one: our free devs come along ---------- */
function goAway(on) {
  for (const l of loungers.values()) {
    if (on && !l.called && !l.busy && !l.partyRoom) Object.assign(l, { netAway: true, partyRoom: "remote", busy: true, path: [], spot: null });
    else if (!on && l.netAway) { Object.assign(l, { netAway: false, partyRoom: null, busy: false, next: 0 }); loungeSay(l.name, "Super afterwork ! 🍻"); }
  }
}
export function leaveParty(tell = true) {
  if (!party.joined) return;
  if (tell) send(party.joined, "leave").catch(() => {});
  toast("🍻 AFTERWORK", `Retour de chez ${party.joinedName}`, "Ton équipe rentre au bureau.");
  party.joined = ""; party.joinedName = ""; goAway(false);
}
hub.answerParty = async (r, yes) => {
  if (!yes) return;
  Object.assign(party, { joined: r.from, joinedName: r.name });
  await send(r.from, "join");
  goAway(true);
  await startVisit(r.from); visitRoom("lounge");
};
hub.onPartyMsg = (m, t) => {
  if (m.text === "start") {
    if (party.mine || party.joined || net.presence === "dnd" || net.ringing) return;
    net.ringing = { kind: "party", from: m.from, name: m.name, at: t }; hub.phoneRing?.();
  } else if (m.text === "join" && party.mine) { party.guests.set(m.from, m.name); toast("🍻 AFTERWORK", `${m.name} arrive`, "avec son équipe !"); }
  else if (m.text === "leave" && party.mine) { party.guests.delete(m.from); for (const k of [...party.folks.keys()]) if (k.startsWith(`${m.from}:`)) party.folks.delete(k); }
  else if (m.text === "stop" && party.joined === m.from) leaveParty(false);
};
hub.partyAway = () => !!party.joined;                                  // world/peers.js: our team is sent while away
hub.partyWant = () => party.mine ? [...party.guests.keys()] : [];      // world/peers.js: the teams we want
// their devs (world/share.js marks them "away"), placed around the middle of our break room
hub.partyCrews = crews => {
  if (!party.mine) return;
  const t = performance.now(), R = roomSize("lounge");
  for (const [pid, list] of Object.entries(crews)) {
    const from = party.guests.get(pid); if (!from) continue;
    for (const d of list.filter(x => x.st === "away")) {
      const key = `${pid}:${d.n}`;
      let f = party.folks.get(key);
      if (!f) {
        const i = party.folks.size, a = i * 2.4, r = 20 + 9 * Math.floor(i / 6);
        f = { pid, from, n: d.n, look: d.look, mood: d.mood, x: LD.x, y: LD.y + 12, tx: R.w * 0.55 + Math.cos(a) * r * 1.4, ty: 70 + (R.h - 70) * 0.55 + Math.sin(a) * r, say: "", until: 0 };
        party.folks.set(key, f);
      }
      f.seen = t; f.mood = d.mood;
    }
  }
  for (const [k, f] of party.folks) if (t - (f.seen || 0) > 4000) party.folks.delete(k);
};

/* ---------- in our break room (rooms/lounge.js) ---------- */
function stepFolks(t) {
  const dt = Math.min(250, t - (party.stepAt || t)); party.stepAt = t;  // the same pace however slow the frames
  for (const f of party.folks.values()) {
    const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy), sp = 0.05 * dt;
    if (d > sp) { f.x += dx / d * sp; f.y += dy / d * sp; f.dir = [dx, dy]; } else { f.x = f.tx; f.y = f.ty; f.dir = null; }
  }
  if (t > party.chatAt && party.folks.size) {  // someone says something; one of ours answers now and then
    party.chatAt = t + 3000 + Math.random() * 3500;
    const f = pick([...party.folks.values()]); f.say = pick(LINES); f.until = t + 3500;
    const ours = [...loungers.values()].filter(l => !l.partyRoom && !l.path.length);
    if (ours.length && Math.random() < 0.55) setTimeout(() => loungeSay(pick(ours).name, pick(REPLIES)), 1400);
  }
}
const folkPose = (f, t, i) => f.dir ? { step: stepOf(f, f.x, f.y), dir: f.dir, smile: true } : { arms: Math.floor(t / 600 + i) % 3 ? "down" : "up", frame: 0, smile: f.mood >= 40, dir: [[1, 0], [0, 1], [-1, 0], [0, 1]][i % 4] };
const drink = (f, t) => { if (!f.dir) px(f.x + 4, f.y - 13, 2.5, 3, "#f4c430"); };
export function partyItems(t, G, items) {
  if (!party.mine || !party.folks.size) return;
  stepFolks(t);
  [...party.folks.values()].forEach((f, i) => items.push(G
    ? { pt: [f.x, f.y], draw: () => G.put(f.x, f.y, f.x, f.y, 0, () => { drawPerson(f.x, f.y, f.look, folkPose(f, t, i)); drink(f, t); }) }
    : { y: f.y, draw: () => { drawPerson(f.x, f.y, f.look, folkPose(f, t, i)); drink(f, t); } }));
}
export function partyOver(t, G) {
  if (!party.mine) return;
  for (const f of party.folks.values()) {
    const fn = () => { badge(f.x, f.y + 2, `🌐 ${f.n}`, "#3bc4ff"); if (t < f.until) bubble(f.x, f.y - 24 - headroom(), f.say, "#fff3c4", "#081746"); };
    if (G) G.put(f.x, f.y, f.x, f.y, 0, fn); else fn();
  }
}
// for those who visit us (world/share.js crewSnapshot): our guests, standing in our break room
export function partyCrew(t) {
  if (!party.mine) return [];
  return [...party.folks.values()].map((f, i) => ({ n: `${f.n} · ${f.from}`.slice(0, 24), room: "lounge", x: f.x, y: f.y, look: f.look, tag: `🌐 ${f.from}`, c: "#3bc4ff", st: "party",
    what: "afterwork commun", mood: f.mood, kudos: 0, sk: [], b: t < f.until ? f.say : "", pose: { arms: folkPose(f, t, i).arms || "down", dir: f.dir || null, walk: !!f.dir } }));
}

// the clock of the party, who left, a dev called to work while away
setInterval(() => {
  const t = performance.now();
  if (!net.sid) { if (party.mine) stopParty(false); if (party.joined) leaveParty(false); return; }
  if (party.mine && t > party.until) stopParty();
  if (party.mine) for (const pid of [...party.guests.keys()]) if (!net.peers.some(p => p.pid === pid)) party.guests.delete(pid);
  if (party.joined && !net.peers.some(p => p.pid === party.joined)) leaveParty(false);
  for (const l of loungers.values()) if (l.netAway && l.called) Object.assign(l, { netAway: false, partyRoom: null, busy: false });
}, 1000);

provide({ get party() { return party; }, get partyItems() { return partyItems; }, get partyOver() { return partyOver; }, get partyCrew() { return partyCrew; } });
