// Team life at the office, not only in the break room: desk neighbours chat a little (social/dialogue.js), a dev at the
// coffee machine talks with whoever is near, colleagues react when someone opens a MR, ships a ticket, beats the tests'
// boss or breaks the tests; and two events: a hackathon now and then, a welcome drink when someone is hired.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, COFFEE, TEAM, chief, ents } from "../core/core.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { atHome } from "../sims/days.js";
import { sfx, toast } from "../sims/progress.js";
import { Happening } from "../happenings/base.js";
import { converse } from "./dialogue.js";
import { loungeSay, loungers } from "../world/lounge.js";

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const seated = () => [...ents.values()].filter(e => e.who && e.seated && !e.leaving && !e.queued && !e.asking);
// a line over a dev at its desk (rooms/office.js shows e.fxMsg)
function sayAtDesk(e, msg, ms = 2800) { e.fxKind = "talk"; e.fxMsg = msg; e.fxUntil = performance.now() + ms; }
// a conversation played line by line over the people who say it
function play(talk, who) {
  talk.forEach(([name, text], i) => setTimeout(() => {
    if (name === CHIEF_NAME) { chief.bubble = text; chief.until = performance.now() + 2800; return; }
    const e = who.get(name); if (e && !e.leaving) sayAtDesk(e, text);
  }, i * 2900));
}

/* ---------- desk neighbours and the coffee machine ---------- */
let nextDesk = performance.now() + 30000;
function stepOfficeTalk(t) {
  if (hub.focusMode) return;
  // two neighbours talk now and then (not when one is blocked or asking)
  if (t > nextDesk) {
    nextDesk = t + 35000 + Math.random() * 30000;
    const devs = seated().filter(e => e.agent?.status !== "blocked" && t > (e.fxUntil || 0)), pairs = [];
    for (const a of devs) for (const b of devs) if (a !== b && Math.hypot(a.desk.x - b.desk.x, a.desk.y - b.desk.y) < 95) pairs.push([a, b]);
    if (pairs.length) {
      const [a, b] = pick(pairs);
      const talk = converse({ name: a.who }, { name: b.who }, { news: [], noDesk: false });
      play(talk, new Map([[a.who, a], [b.who, b]]));
      hub.relAdd?.(a.who, b.who, 1);
    }
  }
  // at the coffee machine: a word with the chief or a colleague nearby, else a line to itself
  for (const e of ents.values()) {
    const there = e.pose === "coffee" && e.who && Math.hypot(e.x - COFFEE.x, e.y - COFFEE.y) < 6;
    if (!there) { e.coffeeTalk = false; continue; }
    if (e.coffeeTalk) continue;
    e.coffeeTalk = true;
    const nearChief = chief.room === "office" && Math.hypot(chief.x - COFFEE.x, chief.y - COFFEE.y) < 50;
    const mate = seated().find(x => Math.hypot(x.desk.x - COFFEE.x, x.desk.y - COFFEE.y) < 90);
    if (nearChief || mate) {
      const other = nearChief ? { name: CHIEF_NAME } : { name: mate.who };
      play(converse({ name: e.who, spot: { act: { id: "kitchen", lines: [] } } }, other, { news: [] }), new Map([[e.who, e], ...(mate ? [[mate.who, mate]] : [])]));
    } else sayAtDesk(e, pick(["Ah, un café bien mérité ☕", "Allez, une pause et j'y retourne.", "Ce café va me sauver.", "Mmmh, ça sent bon.", "Encore une petite tasse…"]));
  }
}

/* ---------- colleagues react to what one does (sims/progress.js react) ---------- */
const REACT = {
  mr: ["Bravo {n} ! 👏", "Belle MR, {n} !", "Je la relis tout de suite.", "GG {n} !", "Elle a l'air propre, celle-là.", "Envoie le lien, {n} !"],
  verify: ["Encore un de livré 🎉", "Bien joué {n} !", "To Verify, joli !", "Ça avance, l'équipe !", "Une de plus au tableau ✓", "Chapeau, {n}."],
  boss: ["BOSS VAINCU 🏆", "Respect {n} !", "Enfin ces tests !", "On t'applaudit, {n} !", "Le bug n'a pas tenu 💪"],
  fail: ["Courage {n}…", "Besoin d'un coup de main ?", "Ça arrive à tout le monde.", "On regarde ensemble ?", "La CI t'en veut aujourd'hui.", "Respire, ça va passer."],
};
function colleaguesReact(e, kind) {
  const lines = REACT[kind]; if (!lines || !e?.who) return;
  const others = seated().filter(x => x !== e && performance.now() > (x.fxUntil || 0)).sort(() => Math.random() - 0.5).slice(0, kind === "fail" ? 1 : 2);
  others.forEach((x, i) => setTimeout(() => {
    if (x.leaving) return;
    sayAtDesk(x, pick(lines).replaceAll("{n}", e.who));
    hub.relAdd?.(x.who, e.who, kind === "fail" ? 2 : 1);
  }, 900 + i * 1100));
  if (others.length && kind === "fail") addMoodlet(e.who, "supported", "🤝", "L'équipe me soutient", 3, 30);
  if (others.length && kind !== "fail") addMoodlet(e.who, "applause", "👏", "Applaudi par l'équipe", 3, 30);
}

/* ---------- events ---------- */
// the hackathon: an hour of ideas (10 minutes of the office's time), everyone gets a boost; the break room talks about it
class Hackathon extends Happening {
  constructor() { super("hackathon"); this.until = 0; }
  get on() { return performance.now() < this.until; }
  canStart() { return !this.on && new Date().getDay() !== 0 && new Date().getDay() !== 6; }
  start(t) {
    this.until = t + 10 * 60000; this.ideas = 0;
    for (const n of TEAM) if (!atHome(n)) { crewAdd(n, { ennui: -15, moral: 6, social: 10 }); addMoodlet(n, "hackathon", "🚀", "Hackathon !", 6, 10); }
    toast("HACKATHON 🚀", "L'équipe se lance un défi", "Dix minutes d'idées folles : les devs en parlent partout.");
    sfx("achievement");
  }
  step(dt, t) {
    if (!this.until) return;
    if (this.on && Math.random() < dt / 20000) { this.ideas++; const e = pick(seated()); if (e) sayAtDesk(e, pick(["💡 Et si on faisait un bot pour le café ?", "💡 J'ai une idée de génie !", "💡 On refait tout en Rust ?", "💡 Un dashboard pour Brume !", "💡 Une IA qui écrit les stand-ups !"])); }
    if (!this.on) { this.until = 0; toast("HACKATHON 🏁", "Fin du hackathon", `${this.ideas} idée(s) géniale(s) notée(s) au tableau.`); for (const n of TEAM) if (!atHome(n)) crewAdd(n, { moral: 4 }); }
  }
}
new Hackathon();
// the welcome drink: when someone is hired (world/construct.js), the team toasts their arrival
class Welcome extends Happening {
  constructor() { super("welcome"); this.until = 0; }
  get on() { return performance.now() < this.until; }
  canStart() { return false; }  // only when someone arrives
  start(t, names = []) {
    if (!names.length) return;
    this.until = t + 5 * 60000; this.names = names;
    for (const n of TEAM) if (!atHome(n)) { crewAdd(n, { social: 15, moral: 5 }); addMoodlet(n, "welcome", "🥂", `Pot d'accueil de ${names.join(" et ")}`, 5, 15); }
    toast("POT D'ACCUEIL 🥂", `Bienvenue à ${names.join(" et ")} !`, "L'équipe trinque en salle de repos.");
    sfx("achievement");
    const lines = ["Bienvenue {n} ! 🥂", "Ravi de t'avoir dans l'équipe, {n} !", "{n}, tu prends ton café comment ?", "Santé ! 🥂", "On t'a gardé une part de gâteau, {n}."];
    [...loungers.values()].slice(0, 4).forEach((l, i) => setTimeout(() => loungeSay(l.name, pick(lines).replaceAll("{n}", pick(names))), 800 + i * 1500));
  }
}
new Welcome();

setInterval(() => stepOfficeTalk(performance.now()), 1000);

provide({ get colleaguesReact() { return colleaguesReact; } });
