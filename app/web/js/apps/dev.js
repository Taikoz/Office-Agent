// Cheats, like in the Sims (typed in the ChiefOS terminal, apps/terminal.js): "testingcheats true" opens this hidden
// app, "motherlode" and "kaching" give money. Only the game moves (money, needs, skills, rooms…): never the agents.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, TEAM } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { mate } from "../sims/crew.js";
import { Incident } from "../incidents/base.js";
import { SHOP, renderShop, shop } from "../world/shop.js";
import { esc } from "../core/data.js";
import { sfx } from "../sims/progress.js";
import { weather } from "../agents/events2.js";
import { SKILLS, saveSkills, skillBook } from "../sims/skills.js";
import { earn, fmtSim, saveWallet, wallet } from "../sims/money.js";
import { relAdd, saveSocial, social } from "../social/relations.js";
import { INGREDIENTS, pantry, savePantry } from "../social/kitchen.js";
import { addMoodlet } from "../sims/moods.js";
import { Happening } from "../happenings/base.js";
import { PROJECTS, buyProject } from "../world/construct.js";
import { OsApp } from "./base.js";
import { openChiefOs, renderChiefOs } from "../ui/chiefos.js";
import { careerBook, isVacant, saveCareers } from "../sims/careers.js";
import { DOG_NAME, DOG_PRICE, adoptDog, petBook } from "../world/pets.js";
import { WEATHER_FR } from "../world/seasons.js";

const CHEATS = {
  "testingcheats true": () => openChiefOs("dev"), "testingcheats on": () => openChiefOs("dev"),
  motherlode: () => devMoney(50000, "motherlode"), kaching: () => devMoney(1000, "kaching"), rosebud: () => devMoney(1000, "rosebud"),
};
// a line typed in the terminal: true when it was a cheat (then it never reaches the shell)
function runCheat(line) {
  const fn = CHEATS[line.trim().toLowerCase().replace(/\s+/g, " ")];
  if (fn) fn();
  return !!fn;
}
function devMoney(n, why) { earn(n); wallet.log.unshift({ key: `cheat:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: `Cheat : ${why}`, total: n }); saveWallet(); sfx("achievement"); }
const devEveryone = () => [CHIEF_NAME, ...TEAM.filter(n => !isVacant(n))];
let devMsg = "";
const DEV_EVENT = { coffee: "☕ machine en panne", spill: "💧 flaque", croissants: "🥐 croissants", plant: "🪴 plante assoiffée", power: "⚡ coupure de courant", client: "🤝 visite client", pizza: "🍕 pizzas" };
const DEV_ACTIONS = {
  // money
  "money:1000": () => devMoney(1000, "kaching"), "money:50000": () => devMoney(50000, "motherlode"),
  "money:zero": () => { wallet.funds = 0; saveWallet(); return "Fonds à zéro."; },
  // needs and mood
  "needs:full": () => { for (const n of devEveryone()) { const m = hub.ensureNeeds(mate(n), n); Object.assign(m, { faim: 100, social: 100, cafe: 100, fatigue: 0, ennui: 0, moral: 100 }); } return "Besoins au maximum pour tout le monde."; },
  "needs:low": () => { for (const n of devEveryone()) { const m = hub.ensureNeeds(mate(n), n); Object.assign(m, { faim: 15, social: 15, cafe: 10, fatigue: 85, ennui: 85 }); } return "Besoins au plus bas : voyons comment ils se débrouillent."; },
  "mood:happy": () => { for (const n of devEveryone()) addMoodlet(n, "cheat", "✨", "Inspiré (cheat)", 15, 60); return "Tout le monde est inspiré une heure."; },
  // skills, careers, friendships, cooking
  "skills:max": () => { for (const n of TEAM) { skillBook.xp[n] ||= {}; for (const [id] of SKILLS) skillBook.xp[n][id] = 100; } saveSkills(); return "Compétences au niveau 10."; },
  "careers:lead": () => { for (const n of TEAM) { careerBook.missions[n] = Math.max(careerBook.missions[n] || 0, 50); careerBook.grade[n] = 4; } saveCareers(); return "Toute l'équipe passe Lead (avec les compétences au max)."; },
  "friends:max": () => { for (const n of TEAM) relAdd(CHIEF_NAME, n, 200); saveSocial(); return "Meilleurs amis avec tout le monde."; },
  "cook:max": () => { for (const n of devEveryone()) social.cook[n] = 54; saveSocial(); return "Cuisine au niveau 10 pour tous."; },
  // house
  "fridge:fill": () => { for (const k of Object.keys(INGREDIENTS)) pantry[k] = (pantry[k] || 0) + 10; savePantry(); return "Frigo rempli (10 de chaque)."; },
  "build:all": () => { for (const p of PROJECTS) while (p.ok() && !p.done()) { earn(p.price); buyProject(p.id); } return "Tout est construit."; },
  "shop:all": () => { shop.owned = [...new Set([...shop.owned, ...SHOP.map(i => i.id)])]; SaveSlot.get("office-shop").save(shop); renderShop(); return "Boutique débloquée."; },
  "dog:adopt": () => { if (petBook.dog) return `${DOG_NAME} est déjà là.`; earn(DOG_PRICE); adoptDog(); return `${DOG_NAME} adopté.`; },
  // events
  ...Object.fromEntries([...Incident.all.keys()].map(id => [`incident:${id}`, () => { Incident.get(id).start(performance.now()); return "Incident déclenché."; }])),
  ...Object.fromEntries([...Happening.all.keys()].map(id => [`happen:${id}`, () => { Happening.get(id).start(performance.now()); return "Événement déclenché."; }])),
};
// what the windows show, forced (null: the tests of the day or the real weather, as usual)
let devWeather = null;
const weatherBeforeDev = weather;
hub.weather = function () { return devWeather || weatherBeforeDev(); };

class DevApp extends OsApp {
  constructor() { super("dev", "🧪", "Mode dev", "#2f9e44", { hidden: true }); }
  render() {
    const btn = (id, label) => `<button data-dev="${id}">${label}</button>`;
    const row = (title, desc, buttons) => `<div class="osrow"><b>${title}</b><span class="muted">${desc}</span><span class="osacts">${buttons}</span></div>`;
    return `<div class="devhead"><b>testingcheats true</b><span class="muted">Mode dev : seulement le jeu (argent, besoins, compétences, pièces…), jamais les agents.${DEMO ? " Démo : rien n'est gardé." : ""}</span></div>
      <h4>ARGENT</h4>${row(`💰 ${fmtSim(wallet.funds)}`, "les fonds du foyer", btn("money:1000", "+§ 1 000") + btn("money:50000", "+§ 50 000") + btn("money:zero", "§ 0"))}
      <h4>ÉQUIPE</h4>${row("Besoins", "faim, énergie, fun, social, café, humeur", btn("needs:full", "Tout au max") + btn("needs:low", "Tout au plus bas") + btn("mood:happy", "✨ Inspirés"))}
      ${row("Progression", "compétences, carrières", btn("skills:max", "Compétences niv. 10") + btn("careers:lead", "Tous Lead"))}
      ${row("Relations", "amitiés avec le chef, cuisine", btn("friends:max", "Meilleurs amis") + btn("cook:max", "Cuisine niv. 10"))}
      <h4>BUREAU</h4>${row("Maison", "frigo, construction, boutique, chien", btn("fridge:fill", "Remplir le frigo") + btn("build:all", "Tout construire") + btn("shop:all", "Débloquer la boutique") + btn("dog:adopt", `Adopter ${DOG_NAME}`))}
      ${row("Météo", "aux fenêtres", ["auto", "clear", "cloud", "rain", "storm", "snow"].map(w => `<button data-dev-weather="${w}" class="${(devWeather || "auto") === w ? "ubok" : ""}">${w === "auto" ? "normale" : WEATHER_FR[w] || w}</button>`).join(""))}
      <h4>ÉVÉNEMENTS</h4>${row("Incidents", "à régler d'un clic", [...Incident.all.keys()].map(id => btn(`incident:${id}`, DEV_EVENT[id] || id)).join(""))}
      ${row("Journée", "événements aléatoires", [...Happening.all.keys()].map(id => btn(`happen:${id}`, DEV_EVENT[id] || id)).join(""))}
      <p class="muted">${esc(devMsg)}</p>`;
  }
  click(b) {
    if (b.dataset.devWeather) { devWeather = b.dataset.devWeather === "auto" ? null : b.dataset.devWeather; renderChiefOs(); return true; }
    const fn = DEV_ACTIONS[b.dataset.dev]; if (!fn) return false;
    devMsg = fn() || "✓"; renderChiefOs();
    return true;
  }
}
new DevApp();

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get runCheat() { return runCheat; } });
