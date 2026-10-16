// Careers, Sims style: each dev climbs from Junior to Lead with the missions it delivers and its best skill; a
// promotion is celebrated (cake, a big happy moodlet) and raises its salary. A dev unhappy for too long thinks about
// leaving, then resigns: its post stays vacant until you recruit someone (ChiefOS → Équipe). Kept in this browser.

import { hub, provide } from "../hub.js";
import { TEAM } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { mate } from "./crew.js";
import { LD, LOUNGE_CORRIDOR, loungers } from "../world/lounge.js";
import { sfx, toast } from "./progress.js";
import { startCake } from "../agents/events2.js";
import { SKILLS, skillLevel } from "./skills.js";
import { spend } from "./money.js";
import { addMoodlet } from "./moods.js";
import { onMission } from "./days.js";

const CAREER = [["Junior", 0, 0], ["Confirmé", 5, 3], ["Senior", 15, 5], ["Expert", 30, 7], ["Lead", 50, 9]];  // [title, missions, best skill]
const RECRUITS = ["Inès", "Jules", "Karim", "Léa", "Malik", "Nina", "Oscar", "Paul", "Rose", "Sami", "Théo", "Yasmine", "Zoé", "Noé", "Lina", "Victor"];
export let careerBook = new SaveSlot("office-careers", { missions: {}, grade: {}, unhappy: {}, warned: {}, vacant: [], renames: {}, newbies: {} }).data;
export const saveCareers = () => SaveSlot.get("office-careers").save(careerBook);
// recruits replaced people who left: applied before the game uses the names
for (let i = 0; i < TEAM.length; i++) for (let guard = 0; careerBook.renames[TEAM[i]] && guard < 20; guard++) TEAM[i] = careerBook.renames[TEAM[i]];

export const isVacant = name => careerBook.vacant.includes(name);
export const bestSkillLevel = name => Math.max(1, ...SKILLS.map(([id]) => skillLevel(name, id)));
export function gradeOf(name) {
  const n = careerBook.missions[name] || 0, best = bestSkillLevel(name);
  let g = 0; CAREER.forEach(([, m, s], i) => { if (n >= m && best >= s) g = i; });
  return g;
}
export const careerTitle = name => TEAM.includes(name) ? (isVacant(name) ? "poste vacant" : CAREER[gradeOf(name)][0]) : "Chef";

// a delivered mission (money.js payday): one more on its record, maybe a promotion
function careerMission(name) {
  if (!TEAM.includes(name)) return;
  careerBook.missions[name] = (careerBook.missions[name] || 0) + 1;
  const before = careerBook.grade[name] || 0, now = gradeOf(name);
  if (now > before) {
    careerBook.grade[name] = now;
    const title = CAREER[now][0];
    addMoodlet(name, "promo", "🎓", `Promu ${title}`, 20, 480);
    for (const n of TEAM) if (n !== name) addMoodlet(n, "promoteam", "🥂", `Promotion de ${name}`, 3, 120);
    toast("PROMOTION 🎉", `${name} devient ${title} !`, `${careerBook.missions[name]} missions livrées · salaire +${now * 5} %`, "lvl");
    sfx("level"); startCake(`${name} : ${title}`, now + 1);
  }
  saveCareers();
}

// unhappy for long: a warning after an hour, a resignation after three (never in the middle of a mission)
function stepCareers() {
  if (DEMO) return;
  for (const n of TEAM) {
    if (isVacant(n)) continue;
    const low = mate(n).moral < 25;
    careerBook.unhappy[n] = Math.max(0, (careerBook.unhappy[n] || 0) + (low ? 1 : -2));
    const u = careerBook.unhappy[n];
    if (u >= 60 && !careerBook.warned[n]) {
      careerBook.warned[n] = true;
      toast("MORAL EN BERNE 😟", `${n} pense à démissionner`, "Son humeur est au plus bas depuis une heure : besoins, bureau, café, encouragements…");
      hub.notify(`${n} pense à démissionner`, "Son humeur est au plus bas depuis une heure.", null, null);
    }
    if (u < 30) careerBook.warned[n] = false;
    if (u >= 180 && !onMission(n)) resign(n);
  }
  saveCareers();
}
setInterval(stepCareers, 60000);
function resign(name) {
  careerBook.vacant.push(name); careerBook.unhappy[name] = 0; careerBook.warned[name] = false;
  const l = loungers.get(name);
  if (l) { l.called = true; l.busy = false; l.say = "Je démissionne. Adieu !"; l.sayUntil = performance.now() + 3000; l.path = [{ x: l.x, y: LOUNGE_CORRIDOR }, { x: LD.x, y: LOUNGE_CORRIDOR }, { ...LD }]; l.spot = null; }
  for (const n of TEAM) if (n !== name && !isVacant(n)) addMoodlet(n, "resign", "😢", `${name} est parti`, -5, 240);
  toast("DÉMISSION", `${name} a quitté l'équipe`, "Son poste est vacant : recrute quelqu'un dans ChiefOS → Équipe (§ 1 500).");
  saveCareers();
}
const RECRUIT_PRICE = 1500;
function recruit(oldName) {
  if (!isVacant(oldName) || !spend(RECRUIT_PRICE, "Recrutement")) return;
  const name = RECRUITS.find(r => !TEAM.includes(r) && !Object.values(careerBook.renames).includes(r)) || `Recrue ${TEAM.length + 1}`;
  const i = TEAM.indexOf(oldName);
  TEAM[i] = name; careerBook.renames[oldName] = name;
  careerBook.vacant = careerBook.vacant.filter(n => n !== oldName);
  careerBook.newbies[name] = Date.now();
  saveCareers();
  toast("RECRUTEMENT 🤝", `Bienvenue à ${name} !`, `Junior, au bureau de ${oldName}. Un parrain va l'accueillir.`);
  sfx("achievement");
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get CAREER() { return CAREER; }, get RECRUIT_PRICE() { return RECRUIT_PRICE; }, get careerMission() { return careerMission; }, get careerTitle() { return careerTitle; }, get gradeOf() { return gradeOf; }, get isVacant() { return isVacant; }, get recruit() { return recruit; } });
