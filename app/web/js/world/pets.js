// Pets: Brume now has needs (hunger, affection) and a bowl to fill (a buy-mode object), she walks to it and eats;
// a dog, Biscuit, can be adopted in the buy mode (🐾 Animaux): it wanders around the office, visits the devs at
// work, and the chief can pet it, feed it or throw it a ball. Kept in this browser.

import { walkStep } from "./motion.js";
import { hub, provide } from "../hub.js";
import { isoDrawing, petRot } from "../iso/engine.js";
import { CAT_NAME, CHIEF_NAME, DOOR, LANE, TEAM, badge, chief, ents, px } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { bubble, stepOf } from "./scene.js";
import { clamp, crewAdd } from "../sims/crew.js";
import { officeRoute } from "./chief.js";
import { pick, view } from "./lounge.js";
import { cat, catPath, petCat } from "./cat.js";
import { esc } from "../core/data.js";
import { burst, sfx, toast } from "../sims/progress.js";
import { fmtSim, spend, wallet } from "../sims/money.js";
import { BUY_CATS, dustAt, furni, renderBuy, saveBuild } from "./build.js";
import { addMoodlet } from "../sims/moods.js";

export let petBook = new SaveSlot("office-pets", { cat: { faim: 80, love: 70 }, dog: null, at: Date.now() }).data;
const savePets = () => { petBook.at = Date.now(); SaveSlot.get("office-pets").save(petBook); };
export const DOG_NAME = "Biscuit", DOG_PRICE = 2000;

/* ---------- Brume's needs and her bowl ---------- */
const bowl = () => furni.items.find(i => i.type === "bowl" && i.room === "office");

{ // time away: Brume was fed by the night guard, but she missed you
  const min = Math.min(600, (Date.now() - (petBook.at || Date.now())) / 60000);
  petBook.cat.faim = Math.max(30, petBook.cat.faim - min * 0.1); petBook.cat.love = clamp(petBook.cat.love - min * 0.05);
}
function stepPets() {
  const c = petBook.cat;
  c.faim = clamp(c.faim - 1); c.love = clamp(c.love - 0.5);  // per minute
  const b = bowl();
  if (c.faim < 50 && b?.on && cat.mode !== "walk") {  // hungry, the bowl is full: she goes and eats
    cat.mode = "walk"; cat.path = catPath(b.x + 5, b.y + 4); cat.next = { mode: "sit" }; cat.say = "Miam ?"; cat.sayUntil = performance.now() + 2000;
    setTimeout(() => { const bb = bowl(); if (bb?.on) { bb.on = false; c.faim = 100; c.love = clamp(c.love + 5); cat.say = "Mmmh 🐟"; cat.sayUntil = performance.now() + 2500; saveBuild(); savePets(); } }, 9000);
  } else if (c.faim < 30 && Math.random() < 0.3) { cat.say = "Miaou… (gamelle vide)"; cat.sayUntil = performance.now() + 3000; }
  else if (c.love < 30 && Math.random() < 0.3) { cat.say = "Miaou… (un câlin ?)"; cat.sayUntil = performance.now() + 3000; }
  if (petBook.dog) { const d = petBook.dog; d.faim = clamp(d.faim - 1.2); d.love = clamp(d.love - 0.6); if (d.faim < 50 && b?.on) { b.on = false; d.faim = 100; dog.say = "Wouf ! 🍖"; dog.sayUntil = performance.now() + 2500; saveBuild(); } }
  savePets();
}
setInterval(stepPets, 60000);
// petting Brume also fills her affection
const petCatBefore = petCat;
hub.petCat = function () { petCatBefore(); petBook.cat.love = clamp(petBook.cat.love + 15); savePets(); };
function fillBowl(it) {
  if (it.on) return toast("GAMELLE", "Déjà pleine", "");
  if (!spend(5, "Croquettes")) return;
  it.on = true; saveBuild(); sfx("commit"); dustAt(it);
}

/* ---------- Biscuit the dog ---------- */
const dog = { x: 120, y: LANE, path: [], mode: "walk", until: 0, say: "", sayUntil: 0, dir: 1, ball: null, visit: null };
function dogGo(x, y) { dog.path = officeRoute(dog.x, dog.y, x, y); dog.mode = "walk"; }
function stepDog(dt, t) {
  if (!petBook.dog) return;
  if (dog.path.length) {
    hub.routeAhead(dog.path, dog.x, dog.y, "office");  // around the furniture (world/route.js)
    const dx = dog.path[0].x - dog.x; if (Math.abs(dx) > 0.5) dog.dir = dx > 0 ? 1 : -1;
    if (!walkStep(dog, dog.path, dt, dog.ball ? 0.09 : 0.045, "office")) return;  // with some weight (world/motion.js)
    if (!dog.path.length) {
      dog.mode = "sit"; dog.until = t + 4000 + Math.random() * 8000;
      if (dog.ball) { dog.ball = null; dog.say = "🎾 !"; dog.sayUntil = t + 2000; dogGo(chief.x + 10, chief.y); petBook.dog.love = clamp(petBook.dog.love + 12); crewAdd(CHIEF_NAME, { ennui: -10 }); }
      if (dog.visit) { const e = [...ents.values()].find(x => x.who === dog.visit && x.seated); if (e) { addMoodlet(e.who, "dog", "🐶", `${DOG_NAME} est venu me voir`, 4, 30); e.fxKind = "commit"; e.fxMsg = "🐶 Coucou Biscuit !"; e.fxUntil = t + 2600; } dog.visit = null; }
    }
    return;
  }
  if (t < dog.until) return;
  // next: visit a dev at work, follow the chief, or wander along the walkways
  const working = [...ents.values()].filter(e => e.seated && !e.leaving && e.who);
  const r = Math.random();
  if (r < 0.35 && working.length) { const e = pick(working); dog.visit = e.who; dogGo(e.desk.x + 14, e.desk.y + 26); }
  else if (r < 0.55 && chief.room === "office") dogGo(Math.max(12, chief.x - 12), Math.max(76, chief.y));
  else dogGo(20 + Math.random() * 480, pick([LANE, 168, 254]));
}
function drawDog(t) {
  if (!petBook.dog || view !== "office") return;
  const walking = dog.path.length > 0, f = walking ? Math.floor(stepOf(dog, dog.x, dog.y) * 1.4) % 2 : Math.floor(t / 600) % 2;  // the paws follow the ground covered; sitting: the tail
  if (isoDrawing()) ART.isodog.draw(dog.x, dog.y, { frame: f, sit: !walking, rot: walking ? petRot(dog, dog.dir) : 0 });  // in volume (svg/iso.js)
  else ART.dog.draw(dog.x, dog.y, { frame: f, sit: !walking }, { flip: dog.dir < 0 });
  if (dog.ball && dog.ballAt) { const k = Math.min(1, (t - dog.ballAt) / 700); px(dog.ball.x0 + (dog.ball.x - dog.ball.x0) * k, dog.ball.y0 + (dog.ball.y - dog.ball.y0) * k - Math.sin(k * Math.PI) * 18, 2.4, 2.4, "#d4e157"); }
  badge(dog.x, dog.y + 1, `🐶 ${DOG_NAME}`, "#c98b4f");
  if (t < dog.sayUntil) bubble(dog.x, dog.y - 13, dog.say, "#f4f2ea", undefined, "dog");
}
const hitDog = (x, y) => petBook.dog && view === "office" && Math.abs(x - dog.x) <= 9 && y >= dog.y - 12 && y <= dog.y + 2 ? "dog" : null;
function dogPie() { return [["pet", "🤗", "Caresser"], ["ball", "🎾", "Lancer la balle"], ["feed", "🍖", "Nourrir · § 5"]]; }
function dogAction(id) {
  const t = performance.now(), d = petBook.dog;
  if (id === "pet") { d.love = clamp(d.love + 15); dog.say = "Wouf ! ❤️"; dog.sayUntil = t + 2000; burst(dog.x, dog.y - 8, ["#ff6b6b", "#e98fc4"], 5, 0.4); crewAdd(CHIEF_NAME, { ennui: -5, moral: 3 }); }
  if (id === "feed") { if (!spend(5, "Croquettes")) return; d.faim = 100; dog.say = "Miam ! 🍖"; dog.sayUntil = t + 2000; }
  if (id === "ball") {  // the ball flies from the chief, Biscuit runs for it and brings it back
    const x = 30 + Math.random() * 460, y = pick([LANE, 168, 254]);
    dog.ball = { x0: chief.x, y0: chief.y - 14, x, y }; dog.ballAt = t; dog.say = "!!!"; dog.sayUntil = t + 1200;
    dogGo(x, y);
  }
  savePets();
}
export function adoptDog() {
  if (petBook.dog || !spend(DOG_PRICE, `Adoption de ${DOG_NAME}`)) return;
  petBook.dog = { faim: 90, love: 60, since: Date.now() }; savePets();
  dog.x = DOOR.x; dog.y = DOOR.y + 2; dogGo(200, LANE);
  for (const n of TEAM) addMoodlet(n, "newdog", "🐶", `${DOG_NAME} est arrivé`, 6, 240);
  toast("ADOPTION 🐶", `${DOG_NAME} rejoint le bureau !`, "Clique sur lui : caresser, nourrir, lancer la balle.");
  sfx("achievement"); renderBuy();
}
function petsGridHtml() {
  return `<div class="bitem${petBook.dog ? " own" : ""}"><span class="bthumb big">🐶</span><b>Adopter ${DOG_NAME}</b><span class="muted" style="font-size:14px">Un chien qui se promène, rend visite aux devs et joue à la balle.</span>
    <span class="price">${petBook.dog ? "✓ adopté" : fmtSim(DOG_PRICE)}</span>${petBook.dog ? "" : `<button data-adopt="dog"${wallet.funds < DOG_PRICE ? " disabled" : ""}>Adopter</button>`}</div>`;
}
document.getElementById("buy").addEventListener("click", ev => { if (ev.target.closest("[data-adopt]")) adoptDog(); });
// ChiefOS → Équipe: the pets too
function petsRowHtml() {
  const c = petBook.cat, bar = v => `<span class="pbar"><i style="width:${Math.round(v)}%;background:${hub.needColor(v)}"></i></span>`;
  return `<div class="osrow"><b>🐈 ${esc(CAT_NAME)}</b><span>faim ${bar(c.faim)} câlins ${bar(c.love)}</span><span class="muted">${bowl()?.on ? "gamelle pleine" : "gamelle vide"}</span></div>`
    + (petBook.dog ? `<div class="osrow"><b>🐶 ${DOG_NAME}</b><span>faim ${bar(petBook.dog.faim)} câlins ${bar(petBook.dog.love)}</span><span class="muted">au bureau</span></div>` : "");
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get DOG_NAME() { return DOG_NAME; }, get dog() { return dog; }, get dogAction() { return dogAction; }, get dogPie() { return dogPie; }, get drawDog() { return drawDog; }, get fillBowl() { return fillBowl; }, get hitDog() { return hitDog; }, get petBook() { return petBook; }, get petsGridHtml() { return petsGridHtml; }, get petsRowHtml() { return petsRowHtml; }, get stepDog() { return stepDog; } });
