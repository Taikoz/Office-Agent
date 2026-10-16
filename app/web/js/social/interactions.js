// What the chief (or a dev) can do with someone: the verbs of the pie menu (talk, joke, hug, tease…) and their effect
// on friendship and mood; and with a dev at work in the office: a coffee, cheers, an idea, its screen.

import { hub } from "../hub.js";
import { CHIEF_NAME, DESK_SP, chief, ents } from "../core/core.js";
import { crewAdd, mate } from "../sims/crew.js";
import { chiefGo, chiefToOffice } from "../world/chief.js";
import { pick } from "../world/lounge.js";
import { isStuck } from "../core/data.js";
import { openPanel } from "../ui/panel.js";
import { toast } from "../sims/progress.js";
import { openPc } from "../agents/pc.js";
import { relaunch } from "../agents/ticket.js";
import { rel, relAdd } from "./relations.js";
import { VISIT_ACT, convos, cooking, eaters } from "./kitchen.js";
import { bond, gesture, here, lounger, say } from "./people.js";

/* ---------- interactions: the pie menu's verbs ---------- */
// need: friendship needed (else refused), ok: success chance, d: [success, failure] friendship change
const TOPICS = ["⚽", "💻", "🍕", "🐈", "☕", "🎮", "🐛", "🚀", "🎬", "🌧️"];
export const INTERACTIONS = {
  talk: { icon: "💬", label: "Discuter", ok: () => 0.9, d: [3, -1], social: 12, lines: ["Alors, quoi de neuf ?", "Ça avance, ton ticket ?", "T'as passé un bon week-end ?"], yes: ["Tranquille, et toi ?", "Ça roule !", "Raconte !"], no: ["Mouais…", "Pas trop envie de parler."] },
  compliment: { icon: "🌟", label: "Complimenter", cat: "amical", ok: m => 0.75 + m.moral / 400, d: [5, -1], social: 10, moral: 6, lines: ["Ta dernière MR était super propre.", "T'as géré sur ce bug !"], yes: ["Merci, ça fait plaisir !", "Oh, t'es gentil 😊"], no: ["Tu veux quoi en échange ?"] },
  hug: { icon: "🤗", label: "Câlin", cat: "amical", need: 40, ok: () => 0.95, d: [8, -6], social: 18, moral: 8, lines: ["Viens là !"], yes: ["Ohh ❤️", "Ça fait du bien."], no: ["Euh… non merci."] },
  highfive: { icon: "✋", label: "Check", cat: "amical", need: 15, ok: () => 0.95, d: [4, -3], social: 8, fun: 4, lines: ["Check !", "Tope là !"], yes: ["Yeah !", "✋ Paf !"], no: ["…je te laisse en plan."] },
  coffee: { icon: "☕", label: "Offrir un café", cat: "amical", ok: () => 1, d: [4, 0], social: 8, cafe: 35, lines: ["Je t'ai fait un café."], yes: ["Merci, j'en rêvais !", "Le meilleur collègue."] },
  cheer: { icon: "🎉", label: "Encourager", cat: "amical", ok: () => 0.95, d: [3, 0], social: 6, moral: 10, lines: ["On lâche rien !", "Tu vas tout casser aujourd'hui."], yes: ["Merci chef !", "Allez, on y va !"] },
  joke: { icon: "😂", label: "Raconter une blague", cat: "drôle", ok: m => 0.35 + (100 - m.ennui) / 300 + m.moral / 400, d: [6, -3], social: 10, fun: 15, lines: ["C'est un dev qui entre dans un bar…", "Pourquoi les devs confondent Halloween et Noël ? OCT 31 = DEC 25 !", "J'ai une blague sur UDP, mais pas sûr que tu la reçoives."], yes: ["HAHAHA 😂", "Excellente !", "Pfff… j'adore."], no: ["…", "Elle était nulle.", "Je l'ai pas comprise."] },
  tease: { icon: "😜", label: "Taquiner", cat: "drôle", ok: (m, r) => r >= 30 ? 0.85 : 0.3, d: [5, -7], social: 6, fun: 8, lines: ["Encore un console.log en prod ?", "Joli pull. Très… audacieux."], yes: ["Ha ha, t'es bête 😄", "Tu vas voir, toi !"], no: ["Pas drôle.", "Sérieux ?"] },
  dance: { icon: "🕺", label: "Danse ridicule", cat: "drôle", ok: m => 0.5 + m.moral / 250, d: [5, -2], social: 6, fun: 18, lines: ["Regarde ça !"], yes: ["😂 Encore !", "J'en peux plus !"], no: ["Je ne connais pas cette personne."] },
  critique: { icon: "🧐", label: "Critiquer son code", cat: "méchant", ok: () => 0.1, d: [2, -10], social: 2, moral: -8, lines: ["Ta fonction de 400 lignes, là…", "Pas un seul test ? Vraiment ?"], yes: ["Bon… t'as pas tort."], no: ["Et le tien, on en parle ?", "C'est bon, lâche-moi."] },
  argue: { icon: "😠", label: "Se disputer", cat: "méchant", ok: () => 0, d: [0, -16], social: -5, moral: -12, lines: ["C'est TOI qui as cassé la CI !", "Tabs, pas espaces. Point."], no: ["N'importe quoi !", "Tu me fatigues 😤"] },
  birthday: { icon: "🎁", label: "Souhaiter son anniversaire", ok: () => 1, d: [10, 0], social: 12, moral: 10, lines: ["Joyeux anniversaire ! 🎂"], yes: ["Merci, trop gentil ! 🥳", "Oh, vous y avez pensé !"] },
  apologize: { icon: "🙏", label: "S'excuser", cat: "amical", max: 15, ok: (m, r) => 0.55 + r / 300 + m.moral / 300, d: [10, -2], social: 8, moral: 4, lines: ["Désolé pour l'autre fois…"], yes: ["C'est oublié 🤝", "Allez, on repart à zéro."], no: ["C'est un peu tard."] },
};
// what a dev does by itself to a colleague, from their relationship
export function autoVerb(r, m) {
  if (r < -20) return Math.random() < 0.5 ? "argue" : "apologize";
  if (r >= 40 && Math.random() < 0.35) return pick(["hug", "highfive"]);
  if (m.ennui > 55 && Math.random() < 0.5) return pick(["joke", "dance"]);
  if (r >= 30 && Math.random() < 0.2) return "tease";
  return Math.random() < 0.6 ? "talk" : pick(["compliment", "joke", "cheer"]);
}

// a conversation: the two face each other, topic icons in bubbles, gestures; the outcome at the end
export const CONVO_MS = 4200;
export function startConvo(a, b, verb) {
  const t = performance.now(), it = INTERACTIONS[verb];
  if (!it || !here(a) || !here(b)) return;
  const la = lounger(a), lb = lounger(b);
  if (la) la.busy = true; if (lb) lb.busy = true;
  convos.push({ a, b, verb, start: t, end: t + CONVO_MS, beat: 0 });
  say(a, pick(it.lines), 2200);
  if (verb === "dance") gesture(a, { arms: "up" }, CONVO_MS - 600);
  if (verb === "hug" || verb === "highfive") gesture(a, { arms: "up" }, 1400);
}
export function stepConvos(t) {
  for (let i = convos.length - 1; i >= 0; i--) {
    const c = convos[i], it = INTERACTIONS[c.verb];
    if (!here(c.a) || !here(c.b)) { convos.splice(i, 1); release(c); continue; }
    const beat = Math.floor((t - c.start) / 900);  // Sims-like chatter: topic icons back and forth
    if (beat !== c.beat && beat >= 2 && t < c.end - 800) { c.beat = beat; say(beat % 2 ? c.b : c.a, `${pick(TOPICS)} ${pick(TOPICS)}`, 850); }
    if (t < c.end) continue;
    convos.splice(i, 1);
    const m = mate(c.b), r = rel(c.a, c.b);
    const refused = (it.need !== undefined && r < it.need) || (it.max !== undefined && r > it.max);
    const ok = !refused && Math.random() < it.ok(m, r);
    bond(c.a, c.b, Math.round(it.d[ok ? 0 : 1] * (it.d[ok ? 0 : 1] > 0 ? hub.traitK(c.b, "talk") : 1)));  // traits (moods.js)
    if (ok) { hub.wantEvent(c.a, "talk", c.b); hub.wantEvent(c.b, "talk", c.a); if (c.verb === "compliment") hub.wantEvent(c.b, "compliment"); }
    say(c.b, refused ? pick(["On n'est pas si proches…", "Euh… non."]) : pick((ok ? it.yes : it.no) || it.no || it.yes), 2800);
    if (ok) gesture(c.b, ["joke", "dance", "hug", "highfive", "tease"].includes(c.verb) ? { arms: "up" } : {}, 1200);
    crewAdd(c.a, { social: Math.max(0, it.social || 0) * 0.8, ennui: -(it.fun || 0) / 2 });
    if (ok) crewAdd(c.b, { social: it.social || 0, moral: it.moral || 0, ennui: -(it.fun || 0), cafe: it.cafe || 0 });
    else crewAdd(c.b, { moral: Math.min(0, it.moral || -2), social: Math.min(0, it.social || 0) });
    setTimeout(() => release(c), 2400);
  }
}
export function release(c) {
  for (const n of [c.a, c.b]) {
    const l = lounger(n); if (!l || eaters.has(n) || cooking?.cook === n || cooking?.helper === n) continue;
    l.busy = false;
    if (l.spot?.act === VISIT_ACT) l.next = 0;  // the visitor goes back to an activity
  }
}


/* ---------- a dev at work (office): the chief brings a coffee, cheers, whispers an idea — or opens its screen ---------- */
export function workerPieItems(id) {
  const e = ents.get(id), a = e?.agent; if (!e) return [];
  const hard = a.status === "blocked" || isStuck(a);
  return [["screen", "🖥️", "Voir son écran"], ["coffee", "☕", "Lui apporter un café"], ["cheer", "🎉", "Encourager"],
    ...(hard ? [["hint", "💡", "Lui souffler une idée"], ["relaunch", "🔁", "Relancer avec une consigne"]] : []), ["fiche", "📋", "Détails"]];
}
// the chief walks to the desk (from the break room through the door if need be), then `fn`
function chiefToDev(e, fn) {
  const go = () => chiefGo({ x: e.desk.x + DESK_SP / 2 - 4, y: e.desk.y + 24 }, () => { if (ents.get(e.agent.id) === e) fn(); });
  if (chief.room === "lounge") { chief.pendingOffice = go; chiefToOffice(); } else go();
}
export function workerAction(id, act) {
  const e = ents.get(id); if (!e) return;
  const who = e.who, fx = (msg, kind) => { e.fxKind = kind; e.fxMsg = msg; e.fxUntil = performance.now() + 2800; };
  if (act === "screen") return openPc(id);
  if (act === "fiche") return openPanel(id);
  if (act === "relaunch") return relaunch(id);
  if (act === "coffee") return hub.enqueue("☕", `Café pour ${who}`, () => {  // by the coffee machine first
    const brew = () => chiefGo("coffee", () => setTimeout(() => chiefToDev(e, served), 1500));
    if (chief.room === "lounge") { chief.pendingOffice = brew; chiefToOffice(); } else brew();
  });
  function served() { crewAdd(who, { cafe: 45 }); hub.addMoodlet(who, "chiefcoffee", "☕", "Café du chef", 6, 60); relAdd(CHIEF_NAME, who, 4); fx("☕ merci chef !", "commit"); say(CHIEF_NAME, "Tiens, un café.", 2000); }
  if (act === "cheer") return hub.enqueue("🎉", `Encourager ${who}`, () => chiefToDev(e, () => {
    const hard = e.agent.status === "blocked" || isStuck(e.agent);
    hub.addMoodlet(who, "cheered", "🎉", "Encouragé par le chef", hard ? 12 : 8, 60); relAdd(CHIEF_NAME, who, 3); fx(hard ? "💪 je m'accroche !" : "🎉 merci !", "verify"); say(CHIEF_NAME, hard ? "Courage, tu vas y arriver !" : "Super boulot !", 2200);
  }));
  if (act === "hint") return hub.enqueue("💡", `Une idée pour ${who}`, () => chiefToDev(e, () => {
    hub.addMoodlet(who, "hint", "💡", "Un coup de pouce", 6, 45); fx("💡 ah mais oui…", "pass"); say(CHIEF_NAME, "Et si tu prenais le problème autrement ?", 2600);
    toast("COUP DE POUCE", `${who} a le moral`, "Pour vraiment débloquer l'agent : 🔁 Relancer avec une consigne.");
  }));
}
