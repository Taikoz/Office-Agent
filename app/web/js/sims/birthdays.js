// Each dev's birthday: one day a year, stable (from the name): a cake, a happy moodlet, a pie action to wish it.
// ?event=birthday in the URL: today is the first dev's. The random happenings of the day: js/happenings/.

import { hub, provide } from "../hub.js";
import { TEAM, hash } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { sfx, toast } from "./progress.js";
import { RECIPES, dish } from "../social/kitchen.js";
import { addMoodlet } from "./moods.js";
import { CLOCK_Q, clockNow, workHours } from "./days.js";

const bdayDone = new SaveSlot("office-bday", { day: "" }).data;
const dayOfYear = (d = clockNow()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
const forcedBday = CLOCK_Q.get("event") === "birthday" ? TEAM[0] : null;
const isBirthday = name => TEAM.includes(name) && (name === forcedBday || hash(`${name}:bday`) % 365 + 1 === dayOfYear());
function checkBirthdays() {
  const today = clockNow().toDateString();
  if (bdayDone.day === today || !workHours()) return;
  const who = TEAM.find(isBirthday); if (!who) return;
  bdayDone.day = today; SaveSlot.get("office-bday").save(bdayDone);
  addMoodlet(who, "bday", "🎂", "C'est mon anniversaire", 12, 480);
  for (const n of TEAM) if (n !== who) addMoodlet(n, "bdayteam", "🥳", `Anniversaire de ${who}`, 3, 240);
  const cake = RECIPES.find(r => r.id === "gateau");
  if (!dish) hub.dish = { recipe: cake, portions: cake.portions, burnt: false, cook: "la boulangerie", at: performance.now() };
  toast("ANNIVERSAIRE 🎂", `C'est l'anniversaire de ${who} !`, "Un gâteau attend en salle de repos. Va lui souhaiter (clic sur le dev → 🎁).");
  sfx("level");
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get checkBirthdays() { return checkBirthdays; }, get isBirthday() { return isBirthday; } });
