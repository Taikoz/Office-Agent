// What the team says in the break room: real little conversations instead of a line and a "Grave." A topic is chosen
// from the context (the hour, the day, the season, the tests' weather, the needs, the traits, the relationship, the
// activity, the pets, the office news), then up to four lines go back and forth: an opener, an answer that depends on
// the listener (agrees, jokes, disagrees, too tired, a loner's grunt), a follow-up, a last word.
// Placeholders: {a} the speaker, {b} the listener, {x} another teammate, {chief}, {cat}, {dog}, {news}, {dish}.

import { hub } from "../hub.js";
import { CAT_NAME, CHIEF_NAME, TEAM } from "../core/core.js";
import { mate } from "../sims/crew.js";
import { hasTrait } from "../sims/moods.js";
import { clockNow } from "../sims/days.js";
import { weather } from "../agents/events2.js";
import { jukebox } from "../world/shop.js";
import { TOPICS } from "./dialogue-lines.js";

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;

/* ---------- general answers, when a thread has none of that kind (a question does not get the same as a statement) ---------- */
const GEN = {
  yes: ["Ah ouais ?", "Pas faux.", "Je vois.", "Sérieux ?", "C'est clair.", "Intéressant.", "Je comprends.", "Ah, carrément."],
  fun: ["Ha ha !", "😂", "Classique.", "T'es pas croyable.", "Pfff 😄", "Je le note, celle-là."],
  no: ["Mouais…", "Tu crois ?", "Bof.", "Hmm, je sais pas.", "Ça se discute."],
  qyes: ["Oui, carrément !", "Pourquoi pas !", "Bonne question…", "Ah, j'y pensais justement.", "Oui, volontiers."],
  qfun: ["Ça dépend qui paie.", "Joker !", "Je réponds pas sans mon avocat.", "Question piège ?"],
  qno: ["Non, pas trop.", "Pas pour moi, merci.", "Aucune idée.", "Plus tard, peut-être."],
};
// how the listener may answer anything, whatever was said
const SHORT = ["Mmh.", "Ouais.", "Ok.", "Hm.", "Si tu le dis.", "…", "Ah."];
const TIRED = ["Je suis trop crevé pour en parler.", "Laisse-moi deux secondes de répit.", "Je dors debout, là.", "Mon cerveau est en veille.", "Repose-moi la question demain."];
const GLUM = ["Ça m'est un peu égal aujourd'hui.", "Pas le moral pour ça.", "J'ai la tête ailleurs, désolé.", "Si tu veux…"];
const SNARK = ["Toi, je t'ai pas sonné.", "Tu me parles, là ?", "Super. Passionnant.", "Ah, t'es encore là, toi.", "Si c'est toi qui le dis…"];
// a follow-up and its last word, when a thread has none
const AFTER = [["Bref.", "Ouais."], ["Bon, j'y retourne.", "À plus !"], ["Et toi, ça va ?", "Ça va, tranquille."], ["On en reparle à la pause ?", "Ça marche."],
  ["Je dis ça, je dis rien.", "Ha ha, je note."], ["Enfin voilà.", "Je vois."]];
const LAST = ["Ok.", "Ça marche.", "Ha ha.", "Carrément.", "Bonne idée.", "Ouais."];

// "opener | yes;… | fun;… | no;… | follow => last;…" → a thread
const split = s => (s || "").split(";").map(x => x.trim()).filter(Boolean);
function thread(str) {
  const [open, yes, fun, no, after] = str.split("|").map(x => x.trim());
  return { open, yes: split(yes), fun: split(fun), no: split(no), after: split(after).map(p => p.split("=>").map(x => x.trim())) };
}
const cache = new Map();
const threadsOf = (t, c) => (typeof t.threads === "function" ? t.threads(c) : t.threads).map(s => cache.get(s) || cache.set(s, thread(s)).get(s));

/* ---------- more to say at each activity (their own lines, js/activities/, come too) ---------- */
const ACT_MORE = {
  sofa: ["Ce film est trop long.", "Qui a la télécommande ?", "Encore un épisode et j'y retourne.", "Le méchant, c'est le majordome.", "Monte le son !", "J'ai déjà vu celui-là.", "Ce canapé est trop confortable."],
  pingpong: ["Smash !", "Let, on la rejoue.", "11-9, je mène !", "Revers lifté, admire.", "Elle était dehors, celle-là !", "Service gagnant !", "T'as un coup droit de fou."],
  babyfoot: ["Pas de pissette !", "Gamelle !", "Demi, on change ?", "But du gardien, ça compte double !", "Tu roulettes, là.", "Défense en béton.", "Ah, la barre de demis…"],
  arcade: ["Nouveau record !", "Encore une pièce…", "Le boss final est impossible.", "J'ai mis mes initiales en haut.", "Combo x12 !", "Game over… encore."],
  darts: ["180 !!!", "Dans le mille.", "Double 20, propre.", "J'ai visé le 20, j'ai eu le 1.", "Il me reste 32, double 16.", "Ma fléchette est dans le mur 😅"],
  read: ["Ce livre sur l'architecture est top.", "Un chapitre et j'y retourne.", "Je relis le livre sur le clean code.", "Ce roman, je le lâche plus.", "Chut, je suis au passage clé."],
  chat: ["Bon, on refait le monde ?", "T'as vu la dernière MR ?", "Alors, raconte.", "Tu sais pas la nouvelle ?", "On parle de quoi ?"],
  karaoke: ["🎤 Encore une !", "🎶 Le refrain, tous ensemble !", "J'ai pas la voix, mais j'ai le cœur.", "🎵 Un, deux, trois !", "Applaudissez !"],
  kitchen: ["Qui a fini le lait ?", "Double espresso, minimum.", "Il est bon ce café.", "Qui a laissé sa tasse dans l'évier ?", "Ça sent bon ici.", "Le micro-ondes est encore sale."],
  boardgame: ["Je prends la rue de la Paix.", "Échec et mat !", "Tu triches, là.", "À toi de jouer !", "Double six !", "Je pose mon dernier joker.", "Qui a lu les règles ?"],
};

/* ---------- the chief talks with someone, or does something to them (social/interactions.js) ---------- */
export const MORE_INTERACTIONS = {
  talk: { lines: ["Alors, quoi de neuf ?", "Ça avance, ton ticket ?", "T'as passé un bon week-end ?", "Comment tu te sens aujourd'hui ?", "Tu veux qu'on en parle ?", "Raconte-moi ta journée.",
      "Des idées pour l'équipe ?", "Tu bosses sur quoi en ce moment ?", "Besoin de quelque chose ?"],
    yes: ["Tranquille, et toi ?", "Ça roule !", "Raconte !", "Plutôt bien, merci chef.", "J'ai bien avancé ce matin.", "On a fini la feature, enfin !", "J'aurais une idée pour les tests…",
      "Grosse journée, mais ça va.", "Content que tu demandes."], no: ["Mouais…", "Pas trop envie de parler.", "Plus tard, si tu veux.", "Je suis un peu sous l'eau, là.", "Bof, rien de spécial."] },
  compliment: { lines: ["Ta dernière MR était super propre.", "T'as géré sur ce bug !", "Ton code est d'une clarté…", "T'as sauvé la démo, merci.", "J'adore travailler avec toi.", "Super idée en réunion."],
    yes: ["Merci, ça fait plaisir !", "Oh, t'es gentil 😊", "Ça me motive à fond.", "Merci chef, vraiment.", "Je rougis, là."], no: ["Tu veux quoi en échange ?", "Sérieux ? Je trouvais ça moyen."] },
  joke: { lines: ["C'est un dev qui entre dans un bar…", "Pourquoi les devs confondent Halloween et Noël ? OCT 31 = DEC 25 !", "J'ai une blague sur UDP, mais pas sûr que tu la reçoives.",
      "Il y a 10 sortes de gens : ceux qui comprennent le binaire et les autres.", "Combien de devs pour changer une ampoule ? Aucun, c'est un problème matériel.",
      "Un SQL entre dans un bar, va voir deux tables : « Je peux me joindre à vous ? »", "Ma blague sur la récursion ? Elle est dans ma blague sur la récursion.", "Le meilleur commit : « fix ». Le deuxième : « fix 2 »."],
    yes: ["HAHAHA 😂", "Excellente !", "Pfff… j'adore.", "Je la ressors en stand-up.", "Celle-là, je la connaissais pas !", "Ha ! Je vais la voler."], no: ["…", "Elle est nulle 😅", "Je l'ai pas comprise.", "Tu me l'as déjà faite."] },
  tease: { lines: ["Encore un console.log en prod ?", "Joli pull. Très… audacieux.", "T'as encore oublié les tests ?", "Ton bureau, c'est un musée de tasses.", "T'es arrivé à quelle heure, déjà ?"],
    yes: ["Ha ha, t'es bête 😄", "Tu vas voir, toi !", "Touché.", "C'est mon style !"], no: ["Pas drôle.", "Sérieux ?", "Bof, celle-là…"] },
  cheer: { lines: ["On lâche rien !", "Tu vas tout casser aujourd'hui.", "Je crois en toi.", "Ce ticket, il est à toi.", "T'es le meilleur pour ça."], yes: ["Merci chef !", "Allez, on y va !", "Ça me booste !", "Je vais le finir, promis."] },
};

/* ---------- the context of a conversation ---------- */
const HOLIDAY = d => { const m = d.getMonth() + 1, j = d.getDate(); return (m === 10 && j >= 20) || (m === 11 && j <= 1) ? "halloween" : m === 12 || (m === 1 && j <= 6) ? "noel" : null; };
const BEST = ["sofachester", "sofabaroque", "sofacloud", "stovepro", "fridgeus", "armlounge", "armbergere", "pinball", "vrstation", "kisland", "chairegg", "jukebox", "karaoke"];
function contextOf(a, b, extra) {
  const d = clockNow(), ma = mate(a.name), lounge = hub.itemsIn?.("lounge") || [];
  const best = BEST.map(t => lounge.find(i => i.type === t)).find(Boolean);
  const traits = ["gourmand", "fetard", "solitaire", "perfectionniste", "cafeinomane", "bavard", "zen", "sportif", "levetot", "ambitieux"].filter(t => hasTrait(a.name, t));
  return {
    a: a.name, b: b?.name || "", ma, h: d.getHours(), dow: d.getDay(), season: hub.seasonNow?.() || "", weather: weather(), holiday: HOLIDAY(d),
    act: a.spot?.act?.id || "", actLines: [...(a.spot?.act?.lines || []), ...(ACT_MORE[a.spot?.act?.id] || [])], rel: b ? hub.rel(a.name, b.name) : 0, traits, trait: traits.length ? pick(traits) : null,
    best: best && hub.defOf(best.type).name.toLowerCase(), music: !!jukebox.playing, dog: hub.petBook?.dog ? hub.DOG_NAME : null, ...extra,
  };
}
function fill(s, c, others) {
  return s.replaceAll("{a}", c.a).replaceAll("{b}", c.b || "toi").replaceAll("{x}", c.x || pick(others) || "quelqu'un").replaceAll("{chief}", CHIEF_NAME).replaceAll("{cat}", CAT_NAME)
    .replaceAll("{dog}", c.dog || "le chien").replaceAll("{crush}", c.crush || "").replaceAll("{dish}", c.dish || "plat").replaceAll("{cook}", c.cook || "le chef").replaceAll("{best}", c.best || "canapé");
}

/* ---------- a conversation: [[name, text], …] ---------- */
// extra: news (lines about the office), noDesk, duel, crush, dish, cook, coffeeBroken (from world/lounge.js)
export function converse(a, b, extra = {}) {
  const c = contextOf(a, b, extra), others = TEAM.filter(n => n !== a.name && n !== b?.name);
  c.x = pick(others);
  // a topic that fits the moment (by weight), then one of its threads
  const ok = TOPICS.filter(t => !t.when || t.when(c)).map(t => ({ t, th: threadsOf(t, c).filter(x => b || !x.open.includes("{b}")) })).filter(x => x.th.length);
  let r = Math.random() * ok.reduce((s, x) => s + x.t.w, 0), got = ok[0];
  for (const x of ok) { r -= x.t.w; if (r <= 0) { got = x; break; } }
  const th = pick(got.th), q = th.open.trim().endsWith("?");
  const end = t => /[.!?…»)\p{Extended_Pictographic}]$/u.test(t) ? t : `${t}.`;  // a line always ends like a sentence
  const say = (who, pool) => [who, end(fill(pick(pool), c, others))];
  const out = [say(a.name, [th.open])];
  if (!b) return out;
  // the answer: who is listening, how they feel, what they think of the speaker
  const mb = mate(b.name), loner = hasTrait(b.name, "solitaire"), chatty = c.traits.includes("bavard") || hasTrait(b.name, "bavard");
  const kind = k => th[k].length ? th[k] : GEN[q ? `q${k}` : k];
  let pool, mood = "";
  if (loner && chance(0.35)) { pool = SHORT; mood = "short"; }
  else if (c.rel < -20 && chance(0.6)) { pool = chance(0.5) ? kind("no") : SNARK; mood = "cold"; }
  else if (mb.fatigue >= 75 && chance(0.45)) { pool = TIRED; mood = "tired"; }
  else if (mb.moral <= 30 && chance(0.45)) { pool = GLUM; mood = "glum"; }
  else { const k = Math.random(); pool = kind(k < 0.5 ? "yes" : k < 0.8 ? "fun" : "no"); }
  out.push(say(b.name, pool));
  // a follow-up and a last word between friends and chatterboxes; a loner, a tired or sad one keeps it short
  const more = mood ? 0 : chatty || c.rel >= 40 ? 2 : chance(0.6) ? (chance(0.5) ? 2 : 1) : 0;
  if (more) {
    const [follow, last] = th.after.length && chance(0.85) ? pick(th.after) : pick(AFTER);
    out.push(say(a.name, [follow]));
    if (more >= 2) out.push(say(b.name, [last || pick(LAST)]));
  }
  return out;
}
// how many lines the base holds (for the curious)
export function dialogueSize(c = { weather: "sun", season: "automne", holiday: "halloween", trait: "bavard", duel: "won", news: [], actLines: [] }) {
  const th = TOPICS.flatMap(t => typeof t.threads === "function" ? t.threads(c) : t.threads).map(thread);
  return { threads: th.length, lines: th.reduce((s, x) => s + 1 + x.yes.length + x.fun.length + x.no.length + x.after.flat().length, 0) };
}
