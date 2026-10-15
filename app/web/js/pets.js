"use strict";
// Pets: Brume now has needs (hunger, affection) and a bowl to fill (a buy-mode object), she walks to it and eats;
// a dog, Biscuit, can be adopted in the buy mode (🐾 Animaux): it wanders around the office, visits the devs at
// work, and the chief can pet it, feed it or throw it a ball. Kept in this browser.

let petBook = store("office-pets", { cat: { faim: 80, love: 70 }, dog: null, at: Date.now() });
const savePets = () => { petBook.at = Date.now(); save("office-pets", petBook); };
const DOG_NAME = "Biscuit", DOG_PRICE = 2000;

/* ---------- Brume's needs and her bowl ---------- */
function bowlArt(full) { return R(0, 2, 10, 3, "#d64545") + R(1, 2, 8, 0.8, "#ff6b6b") + (full ? R(2, 1, 6, 1.4, "#c9a24b") + R(3, 0.5, 1.2, 0.8, "#e0b85a") + R(6, 0.6, 1, 0.8, "#e0b85a") : R(2, 2.4, 6, 0.6, "#5a1f1f")); }
CATALOG.push({ type: "bowl", cat: "animaux", name: "Gamelle", price: 80, room: "any", w: 10, h: 5, desc: "Pour Brume (et Biscuit). Clic : la remplir (§ 5).", art: (st, full) => bowlArt(full),
  styles: [{ id: "rouge", name: "Rouge", sw: "#d64545" }, { id: "bleue", name: "Bleue", sw: "#4090d7", map: { "#d64545": "#4090d7", "#ff6b6b": "#5aa9ff" } }] });
BUY_CATS.splice(BUY_CATS.length - 1, 0, ["animaux", "🐾", "Animaux"]);
if (furni.items && !furni.bowlSeeded) { furni.items.push({ uid: ++furni.seq, type: "bowl", style: "rouge", room: "office", x: 8, y: 104, on: true }); furni.bowlSeeded = true; saveBuild(); }
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
petCat = function () { petCatBefore(); petBook.cat.love = clamp(petBook.cat.love + 15); savePets(); };
function fillBowl(it) {
  if (it.on) return toast("GAMELLE", "Déjà pleine", "");
  if (!spend(5, "Croquettes")) return;
  it.on = true; saveBuild(); sfx("commit"); dustAt(it);
}

/* ---------- Biscuit the dog ---------- */
const dog = { x: 120, y: LANE, path: [], mode: "walk", until: 0, say: "", sayUntil: 0, dir: 1, ball: null, visit: null };
function dogArt(frame, sit, back) {
  const fur = "#c98b4f", dark = "#8a5a2e", leg = frame ? 0.8 : 0;
  if (sit) return R(3, 4, 8, 6, fur) + R(9, 1, 5, 5, fur) + R(13, 3, 2, 1.6, dark) + R(9, 0, 2, 2.4, dark) + R(11.6, 2.4, 0.9, 0.9, "#1c1c24") + R(4, 9, 2, 2, fur) + R(9, 9, 2, 2, fur) + R(1, 4 + (frame ? 0 : 1), 2.4, 1.2, dark);
  return R(2, 4, 10, 4, fur) + R(10, 1, 5, 5, fur) + R(14, 3, 2, 1.6, dark) + R(10, 0, 2, 2.4, dark) + R(12.6, 2.4, 0.9, 0.9, "#1c1c24")
    + R(3, 8, 1.6, 3 - leg, fur) + R(9, 8, 1.6, 2.2 + leg, fur) + R(5, 8, 1.6, 2.2 + leg, dark) + R(11, 8, 1.6, 3 - leg, dark) + R(0, 3 + (frame ? 0 : 1), 2.6, 1.4, dark);
}
function dogGo(x, y) { dog.path = officeRoute(dog.x, dog.y, x, y); dog.mode = "walk"; }
function stepDog(dt, t) {
  if (!petBook.dog) return;
  if (dog.path.length) {
    const tgt = dog.path[0], dx = tgt.x - dog.x, dy = tgt.y - dog.y, dist = Math.hypot(dx, dy), sp = (dog.ball ? 0.09 : 0.045) * dt;
    if (Math.abs(dx) > 0.5) dog.dir = dx > 0 ? 1 : -1;
    if (dist > sp) { dog.x += dx / dist * sp; dog.y += dy / dist * sp; return; }
    dog.x = tgt.x; dog.y = tgt.y; dog.path.shift();
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
  else dogGo(20 + Math.random() * 340, pick([LANE, 150, 212]));
}
function drawDog(t) {
  if (!petBook.dog || view !== "office") return;
  const walking = dog.path.length > 0, f = Math.floor(t / (dog.ball ? 90 : 160)) % 2;
  art(`dog:${f}:${!walking}`, dog.x - 8, dog.y - 11, 16, 11, () => dogArt(f, !walking), { flip: dog.dir < 0 });
  if (dog.ball && dog.ballAt) { const k = Math.min(1, (t - dog.ballAt) / 700); px(dog.ball.x0 + (dog.ball.x - dog.ball.x0) * k, dog.ball.y0 + (dog.ball.y - dog.ball.y0) * k - Math.sin(k * Math.PI) * 18, 2.4, 2.4, "#d4e157"); }
  badge(dog.x, dog.y + 1, `🐶 ${DOG_NAME}`, "#c98b4f");
  if (t < dog.sayUntil) bubble(dog.x, dog.y - 13, dog.say, "#f4f2ea");
}
const hitDog = (x, y) => petBook.dog && view === "office" && Math.abs(x - dog.x) <= 9 && y >= dog.y - 12 && y <= dog.y + 2 ? "dog" : null;
function dogPie() { return [["pet", "🤗", "Caresser"], ["ball", "🎾", "Lancer la balle"], ["feed", "🍖", "Nourrir · § 5"]]; }
function dogAction(id) {
  const t = performance.now(), d = petBook.dog;
  if (id === "pet") { d.love = clamp(d.love + 15); dog.say = "Wouf ! ❤️"; dog.sayUntil = t + 2000; burst(dog.x, dog.y - 8, ["#ff6b6b", "#e98fc4"], 5, 0.4); crewAdd(CHIEF_NAME, { ennui: -5, moral: 3 }); }
  if (id === "feed") { if (!spend(5, "Croquettes")) return; d.faim = 100; dog.say = "Miam ! 🍖"; dog.sayUntil = t + 2000; }
  if (id === "ball") {  // the ball flies from the chief, Biscuit runs for it and brings it back
    const x = 30 + Math.random() * 320, y = pick([LANE, 150, 212]);
    dog.ball = { x0: chief.x, y0: chief.y - 14, x, y }; dog.ballAt = t; dog.say = "!!!"; dog.sayUntil = t + 1200;
    dogGo(x, y);
  }
  savePets();
}
function adoptDog() {
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
  const c = petBook.cat, bar = v => `<span class="pbar"><i style="width:${Math.round(v)}%;background:${needColor(v)}"></i></span>`;
  return `<div class="osrow"><b>🐈 ${esc(CAT_NAME)}</b><span>faim ${bar(c.faim)} câlins ${bar(c.love)}</span><span class="muted">${bowl()?.on ? "gamelle pleine" : "gamelle vide"}</span></div>`
    + (petBook.dog ? `<div class="osrow"><b>🐶 ${DOG_NAME}</b><span>faim ${bar(petBook.dog.faim)} câlins ${bar(petBook.dog.love)}</span><span class="muted">au bureau</span></div>` : "");
}
