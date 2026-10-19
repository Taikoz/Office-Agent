// The day counts, Sims style: the team arrives in the morning and goes home in the evening (devs on a mission stay),
// the break room is empty at night and on weekends. Friday from 17:00 is afterwork (on the terrace once it is built),
// and after a good week (5 missions delivered or more) it becomes the party of the week, with a team bonus.
// ?hour=20&day=5 in the URL previews another time.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, H, TEAM, W, ctx, ents, px, fillScreen } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crewAdd } from "./crew.js";
import { LD, LOUNGE_CORRIDOR, loungeSay, loungers, pick, sendTo } from "../world/lounge.js";
import { sfx, toast } from "./progress.js";
import { focusMode } from "../ui/ux.js";
import { earn, saveWallet, wallet } from "./money.js";
import { cooking, eaters } from "../social/kitchen.js";
import { addMoodlet, traitK } from "./moods.js";
import { wantEvent } from "./wants.js";

export const CLOCK_Q = new URLSearchParams(location.search);
export function clockNow() {
  const d = new Date();
  if (CLOCK_Q.has("hour")) d.setHours(+CLOCK_Q.get("hour"), d.getMinutes());
  if (CLOCK_Q.has("day")) d.setDate(d.getDate() + ((+CLOCK_Q.get("day") - d.getDay() + 7) % 7));
  return d;
}
const WORK = { start: 8, end: 19 };
const isWeekend = (d = clockNow()) => d.getDay() === 0 || d.getDay() === 6;
export function workHours(d = clockNow()) { const h = d.getHours() + d.getMinutes() / 60; return !isWeekend(d) && h >= WORK.start && h < (d.getDay() === 5 ? 20 : WORK.end); }
function afterworkTime(d = clockNow()) { const h = d.getHours() + d.getMinutes() / 60; return d.getDay() === 5 && h >= 17 && h < 20; }
export const onMission = name => [...ents.values()].some(e => e.who === name && !e.leaving);
// at home: outside working hours, unless an agent called the dev in (then it works late, see moods.js)
export const atHome = name => !workHours() && !onMission(name);

export let dayState = { wasWork: null, party: null, partyWeek: new SaveSlot("office-party", { week: "" }).data };
export const weekId = (d = clockNow()) => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t.toISOString().slice(0, 10); };
const missionsThisWeek = () => wallet.log.filter(l => !l.spend && new Date(l.t) >= new Date(weekId())).length;

// party spots: along the break-room corridor, or on the terrace (construct.js)
const PARTY_SPOTS = [150, 172, 194, 216, 238, 260, 284, 306, 328, 120, 98, 76].map((x, i) => ({ x, y: i % 2 ? 106 : 96 }));
const PARTY_ACT = { id: "party", label: "à l'afterwork", pose: { arms: "up" }, fx: { ennui: -6, fatigue: 1, moral: 2 }, cup: true };

function stepDays(t) {
  const work = workHours(), d = clockNow();
  // morning and evening: hello and goodbye
  if (dayState.wasWork !== null && work !== dayState.wasWork) toast(work ? "BONJOUR ☀️" : "BONNE SOIRÉE 🌙", work ? "L'équipe arrive au bureau" : "L'équipe rentre à la maison", work ? "La salle de repos se remplit." : "Ceux qui ont une mission restent finir.");
  dayState.wasWork = work;
  for (const [name, l] of loungers) if (!l.called && atHome(name) && !l.party) {  // leaves through the door, like when called
    l.called = true; l.home = true; l.busy = false; l.say = pick(["À demain !", "Bonne soirée !", "Je file !"]); l.sayUntil = t + 2500;
    l.path = [...(l.spot?.via ? [{ ...l.spot.via }] : []), { x: l.spot?.via ? l.spot.via.x : l.x, y: LOUNGE_CORRIDOR }, { x: LD.x, y: LOUNGE_CORRIDOR }, { ...LD }];
    l.spot = null;
  }
  // at home, needs come back (sleep, family dinner)
  const k = 1 / 60;  // per second of this 1 s step
  for (const n of TEAM) if (atHome(n)) crewAdd(n, { fatigue: -2 * k, faim: 1.5 * k, ennui: -0.5 * k, cafe: 0.5 * k, social: 0.5 * k });
  // Friday afterwork
  if (afterworkTime(d) && !dayState.party && !focusMode) startParty(t);
  if (dayState.party && !afterworkTime(d)) endParty();
  if (dayState.party) stepParty(t);
}
setInterval(() => stepDays(performance.now()), 1000);

function startParty(t) {
  const big = missionsThisWeek() >= 5 && dayState.partyWeek.week !== weekId();
  const wet = ["rain", "storm"].includes(hub.weather?.());  // the weather the windows show (real or the tests'): rain sends it indoors
  dayState.party = { since: t, big, terrace: hub.hasRoom("terrace") && !wet, rained: hub.hasRoom("terrace") && wet };
  if (big) {
    dayState.partyWeek.week = weekId(); SaveSlot.get("office-party").save(dayState.partyWeek);
    earn(500); wallet.log.unshift({ key: `party:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: "Prime d'équipe : belle semaine", total: 500 }); saveWallet();
  }
  toast(big ? "FÊTE DE LA SEMAINE 🎉" : "AFTERWORK 🍻", big ? `${missionsThisWeek()} missions livrées cette semaine !` : "C'est vendredi !", `${dayState.party.terrace ? "Sur la terrasse" : dayState.party.rained ? "En salle de repos : il pleut sur la terrasse ☔" : "En salle de repos"}${big ? " · prime d'équipe +§ 500" : ""}`);
  sfx(big ? "level" : "achievement");
}
function stepParty(t) {
  const p = dayState.party, free = [...loungers.values()].filter(l => !l.called && !l.party && !l.path.length && !eaters.has(l.name) && cooking?.cook !== l.name);
  for (const l of free) {
    const used = new Set([...loungers.values()].filter(x => x.party).map(x => x.partySpot));
    const i = PARTY_SPOTS.findIndex((_, k) => !used.has(k)); if (i < 0) break;
    l.party = true; l.partySpot = i; l.busy = true;
    if (p.terrace) { l.partyRoom = "terrace"; l.say = "Direction la terrasse ! 🍻"; l.sayUntil = t + 2500; }
    sendTo(l, { ...PARTY_SPOTS[i], act: PARTY_ACT }, t); l.next = Infinity;
    addMoodlet(l.name, "party", p.big ? "🎉" : "🍻", p.big ? "Fête de la semaine" : "Afterwork", (p.big ? 15 : 10) * traitK(l.name, "party"), 120);
    wantEvent(l.name, "party");
  }
  if (Math.floor(t / 7000) !== Math.floor((t - 1000) / 7000)) {  // now and then, a toast in the crowd
    const party = [...loungers.values()].filter(l => l.party && !l.path.length);
    if (party.length) loungeSay(pick(party).name, pick(["Santé ! 🍻", "Bon week-end !", "Quelle semaine !", "Encore une !", "🎶 ♪♪", p.big ? "Champagne ! 🍾" : "Tchin !"]), t);
  }
}
function endParty() {
  for (const l of loungers.values()) if (l.party) { l.party = false; l.partyRoom = null; l.busy = false; l.next = 0; }
  dayState.party = null;
}
// over the break room: garland and disco lights during the party
// (along: in isometric view, the point at u ∈ 0..1 of the walls' top, where the garland hangs)
export function drawPartyOver(room, t, along = null) {
  if (!dayState.party || (room === "lounge") === !!dayState.party.terrace) return;
  const flag = k => ["#ff6b6b", "#fbaa08", "#51cf66", "#5aa9ff", "#b48cff"][(k + Math.floor(t / 400)) % 5 | 0];
  if (along) for (let k = 0; k <= 60; k++) { const p = along(k / 60); px(p.x - 1, p.y + Math.abs(Math.sin(k * Math.PI / 6)) * 3, 2, 2.4, flag(k)); }
  else for (let x = 4; x < W; x += 10) px(x, 6 + Math.sin(x / 18) * 2, 2, 2.4, flag(x / 10));
  if (dayState.party.big) for (let i = 0; i < 6; i++) { const x = (i * 71 + t / 30) % W, y = 20 + ((t / 15 + i * 40) % 180); px(x, y, 1.6, 1.6, ["#ff6b9a", "#fbaa08", "#5fd38d"][i % 3]); }
  ctx.globalAlpha = 0.08; fillScreen(["#ff6b9a", "#5aa9ff", "#fbaa08"][Math.floor(t / 600) % 3]); ctx.globalAlpha = 1;
}
export function emptyLoungeText() {
  if (dayState.party?.terrace) return "Tout le monde est sur la terrasse ! 🍻";
  if (!workHours()) return isWeekend() ? "C'est le week-end : tout le monde est à la maison 🏡" : "Tout le monde est rentré à la maison 🌙";
  return "Tout le monde est au bureau !";
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get atHome() { return atHome; }, get clockNow() { return clockNow; } });
