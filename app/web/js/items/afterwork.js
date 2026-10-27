// The rooftop afterwork, with the bar of items/bar.js (shop: 🍸 Bar; drawings: svg/isoafterwork.js): Marcel the
// bartender behind the counter (he shakes, pours, wipes glasses, and tells the real news of the agents: who is
// blocked, the red CIs, the MRs waiting for a review), a guinguette string of bulbs (one coloured bulb per real agent:
// green at work, yellow with a question, red blocked, violet turning in circles, blue MR waiting for a review), the
// happy-hour bell (an afterwork now, any day: sims/days.js happyHour), the cocktail menu whose cocktails are named
// after the day (red CIs, blocked agents, MRs), a dance floor whose tiles light up during the party (red when a CI
// breaks; its dancers: rooms/built.js partySpots).

import "../svg/isoafterwork.js";
import { hub } from "../hub.js";
import { CHIEF_NAME, hash, text } from "../core/core.js";
import { awaitingReview, isStuck } from "../core/data.js";
import { say } from "../social/people.js";
import { crewAdd } from "../sims/crew.js";
import { addMoodlet } from "../sims/moods.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { clockNow, dayState, happyHour } from "../sims/days.js";
import { bubble, drawPerson, headroom } from "../world/scene.js";
import { P } from "../iso/engine.js";
import { round, sold } from "./bar.js";
import { Gadget } from "./gadgets.js";

const pick = list => list[Math.floor(Math.random() * list.length)];
const now = () => Date.now();
const still = () => !!hub.focusMode;
const party = () => !!dayState.party;
const BARMAN = "Marcel";
const LOOK = { sex: "m", skin: "#c68a5e", hair: "#2a1c14", shirt: "#f4f2ea", style: 4, outfit: "shirt", tie: "#1c1c22", pants: "#1c1c22", beard: "mustache", beardColor: "#2a1c14" };

/* ---------- what the bar knows of the real agents ---------- */
const agents = () => (hub.data?.sessions || []).flatMap(s => (s.agents || []).map(a => ({ a, s })));
const who = a => a.ticket || a.description || a.type || "un agent";
const redCis = () => Object.values(hub.data?.pipelines || {}).filter(p => p && p.state !== "merged" && p.ci === "failed");
function news() {
  const all = agents(), blocked = all.filter(({ a }) => a.status === "blocked"), stuck = all.filter(({ a }) => isStuck(a)), asking = all.filter(({ a }) => a.status === "asking");
  const working = all.filter(({ a }) => a.status === "working"), review = all.filter(({ a, s }) => a.status === "done" && awaitingReview(a, s));
  return { all, blocked, stuck, asking, working, review, red: redCis() };
}
// the bulbs of the guinguette, one per agent that matters, then warm ones
const BULB = { blocked: "#ff4d4d", stuck: "#b48cff", asking: "#ffd43b", working: "#51cf66", review: "#5aa9ff" };
function agentBulbs() {
  const n = news();
  return [...n.blocked.map(() => BULB.blocked), ...n.stuck.map(() => BULB.stuck), ...n.asking.map(() => BULB.asking), ...n.review.map(() => BULB.review),
    ...n.working.filter(x => !isStuck(x.a)).map(() => BULB.working)];
}
// the cocktails of the day, named after what really happened: [name on the slate, full name, recipe]
function cocktails() {
  const n = news(), out = [];
  if (n.red.length) out.push(["PIPELINE ROUGE", "Le Pipeline Rouge", `tequila, piment, et ${n.red.length} CI rouge${n.red.length > 1 ? "s" : ""} en garniture`]);
  else out.push(["SPRITZ CI VERTE", "Le Spritz de la CI verte", "apérol, prosecco, zéro test rouge"]);
  if (n.blocked.length || n.stuck.length) out.push(["LE DÉBLOQUEUR", "Le Débloqueur", `café serré, rhum ambré, pour ${n.blocked.length + n.stuck.length} agent(s) coincé(s)`]);
  if (n.review.length) out.push([`MERGE ×${n.review.length}`, "Le Merge Request", `${n.review.length} MR qui attendent une review, servies sans relecture`]);
  if (n.asking.length) out.push(["LA QUESTION", "La Question qui fâche", "whisky sec, glace pilée, une réponse attendue"]);
  if (n.working.length) out.push([`LE SPRINT ×${n.working.length}`, "Le Sprint", `gin, tonic, un glaçon par agent au travail (${n.working.length})`]);
  out.push(["HOTFIX DU VENDREDI", "Le Hotfix du vendredi", "vodka, citron vert, déployé direct en prod"], ["MOJITO MAISON", "Le Mojito maison", "menthe, rhum blanc, sirop jaune #FBAA08"]);
  return out;
}
function gossip() {
  const n = news(), lines = [];
  if (n.blocked.length) lines.push(`Psst… ${who(n.blocked[0].a)} est bloqué. Un petit remontant pour lui ? 🥃`);
  if (n.stuck.length) lines.push(`${who(n.stuck[0].a)} tourne en rond depuis un moment… comme mon shaker. 🌀`);
  if (n.red.length) lines.push(`${n.red.length} CI rouge${n.red.length > 1 ? "s" : ""}. Je sors le Pipeline Rouge ? 🌶️`);
  if (n.review.length) lines.push(`${n.review.length} MR attend${n.review.length > 1 ? "ent" : ""} une review. Ça trinquera après le LGTM ✅`);
  if (n.asking.length) lines.push(`Il y a ${n.asking.length} question${n.asking.length > 1 ? "s" : ""} pour toi, chef. Réponds, je te sers après 😉`);
  if (n.working.length) lines.push(`${n.working.length} agent${n.working.length > 1 ? "s" : ""} au boulot en bas. On leur garde des glaçons 🧊`);
  if (!lines.length) lines.push(n.all.length ? "Tout le monde a livré. C'est l'heure de l'apéro ! 🍹" : "Pas un agent en vue. Calme plat au comptoir 🍸");
  return lines;
}
const PARTY_LINES = ["Qui veut un Spritz ? 🍊", "Attention, ça mousse ! 🍺", "La maison offre les cacahuètes 🥜", "Un Mojito, deux pailles ? 🌿", "Musique, maestro ! 🎶",
  "Dernière commande à la cloche 🔔", "Shaker, shaker, shaker… 🍸", "Santé à la prod ! 🥂"];

/* ---------- Marcel, the bartender ---------- */
// what he says and does now (not saved): { say, until, shake }
const talk = new Map();
const marcelSay = (it, msg, ms = 4000) => { talk.set(it.uid, { ...(talk.get(it.uid) || {}), say: msg, until: performance.now() + ms }); };
const shake = (it, ms = 2500) => { talk.set(it.uid, { ...(talk.get(it.uid) || {}), shake: performance.now() + ms }); };
class Barman extends Gadget {
  isoState() { return { party: party() }; }
  // his piece draws up to his bubble (a piece only draws in its box: iso/engine.js boxOf)
  pieces(it, t, G, alpha = 1) {
    const out = super.pieces(it, t, G, alpha), p = out[0];
    if (p) { const [x0, y0, x1, y1] = p.fp, l = P(x0, y1), r = P(x1, y0), top = P(x0, y0, 86), bot = P(x1, y1); p.box = { x: l.x - 70, y: top.y - 8, w: r.x - l.x + 140, h: bot.y - top.y + 16 }; }
    return out;
  }
  center() { return `<span class="muted">🍸 ${BARMAN}, barman depuis 1987 · ${party() ? "en plein service" : "essuie ses verres"}</span>`; }
  over(it, t, G) {
    if (!G) return;
    const [x0, y0, x1] = hub.footOf(it), x = (x0 + x1) / 2, y = y0 + 5, m = talk.get(it.uid) || {}, shaking = (m.shake || 0) > t, busy = party() || shaking;
    const k = still() ? 0 : Math.floor(t / (shaking ? 160 : 700));
    const hold = shaking ? "cocktail" : busy ? ["pour", "pint", "cocktail", "cup"][Math.floor(t / 2400) % 4] : "cup";
    const arms = shaking ? (k % 2 ? "up" : "reach") : "down";
    G.put(x, y, x, y, 5, () => {  // on his duckboard (svg/isoafterwork.js)
      drawPerson(x, y, LOOK, { dir: [0, 1], smile: true, frame: k, arms, hold, talk: (m.until || 0) > t });
      if ((m.until || 0) > t) bubble(x, y - 24 - headroom(), m.say, "#fff3d6", "#081746", BARMAN);
    });
    G.boxRegion(x0, y0, x1, y0 + 8, 40, { x, y: y0 + 4, uid: it.uid });
  }
}
new Barman({ type: "barman", cat: "bar", name: "Marcel, le barman", price: 2500, room: "any", unique: true, w: 14, d: 8, rots: 1, art: "isobarmanpost", walk: false,
  desc: "Marcel, moustache cirée et nœud papillon, sur son tapis derrière le comptoir. Il shake, tire les pressions, essuie ses verres… et il sait tout : qui est bloqué, quelle CI a cassé, quelle MR attend sa review.",
  styles: [{ id: "classique", name: "Chemise blanche, nœud pap'", sw: "#f4f2ea" }],
  actions: [
    ["cocktail", "🍸", "Le cocktail du jour", it => {
      const [, name, recipe] = pick(cocktails()); shake(it, 2600); marcelSay(it, "Un instant, chef… 🍸", 2400); sfx("commit");
      setTimeout(() => { marcelSay(it, `${name} : ${recipe}.`, 5000); hub.chiefHold?.("cocktail"); say(CHIEF_NAME, "Merci Marcel ! 🍸", 2500); crewAdd(CHIEF_NAME, { ennui: -8, social: 6, moral: 3 }); addMoodlet(CHIEF_NAME, "marcel", "🍸", `${name}, par Marcel`, 5, 60); sold(it); }, 2600);
    }],
    ["gossip", "🗞️", "Les potins du comptoir", it => { const l = gossip(); marcelSay(it, l[0], 5500); if (l[1]) setTimeout(() => marcelSay(it, l[1], 5000), 5600); crewAdd(CHIEF_NAME, { social: 4 }); }],
    ["round", "🍻", "Tournée de Marcel · § 30", it => {
      if (!hub.peopleIn(it.room).some(n => n !== CHIEF_NAME)) return marcelSay(it, "Une tournée pour personne ? Sonne d'abord le happy hour, chef 🔔");
      if (!spend(30, "Tournée de Marcel")) return;
      shake(it, 3000); marcelSay(it, "Tournée générale, c'est le chef qui régale ! 🍻"); round(it, "Une tournée", "🍻");
    }],
    ["joke", "😄", "Une blague de barman", it => marcelSay(it, pick(["Un dev entre dans un bar. Il commande 1 bière, 0 bière, -1 bière, 999999 bières, un lézard… 🦎",
      "Le meilleur cocktail ? Le git stash : on le met de côté et on l'oublie. 🍹", "Mon shaker a plus de tests que ta CI, chef. 🍸", "Ici on ne fait pas de rollback, on fait des refills. 🍺"]), 6000)],
  ] });
// during the party, Marcel talks to the crowd now and then (a line of the bar or real news)
setInterval(() => {
  if (!party() || still()) return;
  for (const r of ["terrace", "lounge", "office", "meeting"]) for (const it of hub.itemsIn?.(r) || []) if (it.type === "barman" && Math.random() < 0.35) {
    if (Math.random() < 0.4) shake(it, 2200);
    marcelSay(it, Math.random() < 0.3 ? pick(gossip()) : pick(PARTY_LINES), 3800);
  }
}, 7000);

/* ---------- the guinguette ---------- */
const BULBS = 9, WARM = ["#ffd43b", "#ff9f43", "#fff3b0", "#ff6b9a"];
new class extends Gadget {
  isoState(it, t) {
    const h = clockNow().getHours(), lit = party() || h >= 18 || h < 8 || ["rain", "storm", "cloud"].includes(hub.weather?.()), live = agentBulbs(), chase = party() && !still() ? Math.floor(t / 450) : -1;
    const bulbs = Array.from({ length: BULBS }, (_, i) => live[i] || (lit ? WARM[(i + Math.max(0, chase)) % 4] : null));
    return { bulbs: chase >= 0 ? bulbs.map((c, i) => (i + chase) % 5 === 0 && !live[i] ? null : c) : bulbs, lit: lit || live.length > 0 };
  }
  center() { const n = agentBulbs().length; return `<span class="muted">💡 ${n ? `${n} ampoule${n > 1 ? "s" : ""} d'agent allumée${n > 1 ? "s" : ""}` : "aucun agent en mission"}</span>`; }
}({ type: "guinguette", cat: "bar", name: "Guirlande guinguette", price: 380, room: "any", w: 60, d: 4, rots: 2, art: "isoguinguette", walkable: true,
  desc: "Deux poteaux en bois, un fil, des ampoules : la guinguette s'allume le soir. Les premières ampoules sont les vrais agents : vert au travail, jaune une question, rouge bloqué, violet qui tourne en rond, bleu une MR qui attend sa review.",
  styles: [{ id: "bois", name: "Bois, ampoules chaudes", sw: "#ffd43b" }],
  actions: [["read", "💡", "Lire les ampoules", () => {
    const n = news(), parts = [[n.working.length, "🟢 au travail"], [n.asking.length, "🟡 question"], [n.blocked.length, "🔴 bloqué"], [n.stuck.length, "🟣 tourne en rond"], [n.review.length, "🔵 MR à relire"]].filter(([k]) => k);
    toast("GUINGUETTE 💡", parts.length ? `${n.all.length} agent(s) dans la guirlande` : "Que des ampoules chaudes", parts.map(([k, l]) => `${k} ${l}`).join(" · ") || "Aucun agent en mission : la soirée est libre.");
    say(CHIEF_NAME, parts.length ? "Les ampoules me disent tout de l'équipe 💡" : "Rien que de la lumière douce ce soir ✨", 3000);
  }]] });

/* ---------- the happy-hour bell ---------- */
const ring = new Map();
new class extends Gadget {
  isoState(it, t) { return { swing: (ring.get(it.uid) || 0) > t && !still() ? 1 + Math.floor(t / 140) % 2 : 0 }; }
  center() { const p = dayState.party; return `<span class="muted">🔔 ${p ? p.until ? `happy hour encore ${Math.max(1, Math.round((p.until - now()) / 60000))} min` : "c'est l'afterwork du vendredi" : "sonne-la : afterwork immédiat"}</span>`; }
}({ type: "happybell", cat: "bar", name: "Cloche du happy hour", price: 300, room: "any", kind: "top", w: 6, d: 5, rots: 4, art: "isohappybell",
  desc: "Une cloche de laiton sur sa potence, à poser sur le comptoir. Un coup : happy hour, toute l'équipe libre monte pour 30 min d'afterwork, n'importe quel jour. Deux coups : dernière tournée.",
  styles: [{ id: "laiton", name: "Laiton", sw: "#d4a640" }],
  actions: [
    ["ring", "🔔", "Sonner le happy hour", it => {
      ring.set(it.uid, performance.now() + 1800); sfx("achievement");
      if (!happyHour(30)) return say(CHIEF_NAME, hub.focusMode ? "Mode focus : pas de fête, on bosse 🎯" : "DING ! …c'est déjà la fête 🎉", 3000);
      say(CHIEF_NAME, "DING DING ! Happy hour, tout le monde sur la terrasse ! 🍻", 4000); crewAdd(CHIEF_NAME, { social: 8, moral: 4 });
    }, () => !dayState.party],
    ["last", "🛎️", "Dernière tournée", it => {
      ring.set(it.uid, performance.now() + 2400); sfx("commit"); say(CHIEF_NAME, "Dernière tournée, on ferme ! 🛎️", 3500);
      setTimeout(() => { if (dayState.party?.until) dayState.party.until = now(); }, 6000);
    }, () => !!dayState.party?.until],
  ] });

/* ---------- the cocktail menu ---------- */
new class extends Gadget {
  over(it, _t, G) {
    if (!G || it.rot % 2) return;
    const list = cocktails().slice(0, 5), h = clockNow().getHours();
    const words = () => {
      text("~ COCKTAILS ~", 11, -25, "#fbaa08", 2.8, "center");
      list.forEach(([n], i) => text(n, 11, -21 + i * 3.4, ["#f2f2f2", "#cfe8d6", "#ffd6e0", "#d6e8ff", "#fff3b0"][i], 2.2, "center"));
      text(party() ? "C'EST LA FÊTE !" : h >= 17 ? "HAPPY HOUR 🔔" : "OUVERT DÈS 17 H", 11, -3.6, "#ff9f43", 2.3, "center");
    };
    G.face("x", it.x + 2, it.y + 4.5, 11.8, 0, 0, words, 1, 1);
  }
}({ type: "cocktailmenu", cat: "bar", name: "Carte des cocktails", price: 260, room: "any", w: 26, d: 8, rots: 2, art: "isococktailmenu",
  desc: "Un chevalet, une ardoise encadrée, un citron vert : la carte du soir, réécrite à la craie d'après la journée des agents (Pipeline Rouge si une CI casse, Débloqueur pour les agents coincés, Merge ×N…).",
  styles: [{ id: "chene", name: "Chêne, ardoise", sw: "#22302a" }],
  actions: [["read", "📜", "Lire la carte", () => {
    const list = cocktails();
    toast("CARTE DES COCKTAILS 🍸", `${list.length} cocktails ce soir`, list.slice(0, 4).map(([, n, r]) => `${n} (${r})`).join(" · "));
    say(CHIEF_NAME, `Ce soir, je prends ${list[0][1]} 🍸`, 3000);
  }]] });

/* ---------- the dance floor ---------- */
const DISCO = ["#ff6b9a", "#fbaa08", "#5aa9ff", "#51cf66", "#b48cff", "#3bc4ff"];
new class extends Gadget {
  isoState(it, t) {
    const f = still() ? 0 : Math.floor(t / 420), red = redCis().length > 0, on = party() || (it.ballUntil || 0) > now();
    const tiles = Array.from({ length: 20 }, (_, i) => {
      if (!on) return (i * 7 + f) % 11 === 0 && clockNow().getHours() >= 18 ? "#3a3a5a" : null;
      if (red && (i + f) % 4 === 0) return "#ff3b3b";
      return (hash(`${i}`) + f * (i % 3 + 1)) % 3 ? DISCO[(i * 5 + f) % DISCO.length] : null;
    });
    return { tiles };
  }
}({ type: "dancefloor", cat: "bar", name: "Piste de danse lumineuse", price: 1600, room: "any", w: 50, d: 40, rots: 1, art: "isodancefloor", walkable: true, dance: true,
  desc: "Vingt dalles qui s'allument au rythme pendant l'afterwork, façon disco ; une dalle sur quatre vire au rouge quand une CI des agents casse. Les devs viennent y danser.",
  styles: [{ id: "disco", name: "Disco", sw: "#ff6b9a" }],
  actions: [["ball", "🪩", "Ouvrir le bal", it => {
    it.ballUntil = now() + 60000; hub.chiefHold?.("");
    say(CHIEF_NAME, pick(["Allez, tout le monde sur la piste ! 🪩", "C'est parti pour le disco ! 🕺", "Un petit pas de danse 💃"]), 3500);
    crewAdd(CHIEF_NAME, { ennui: -12, social: 6, moral: 3, fatigue: 3 }); addMoodlet(CHIEF_NAME, "dance", "🕺", "J'ai ouvert le bal", 5, 60); sfx("level");
  }]] });
