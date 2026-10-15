"use strict";
// Random happenings during working hours, Sims style: a power cut (screens and lamps off, reset the breaker on the wall),
// a client visit (greet the client before they leave: a bonus, or a disappointed client), pizzas delivered for the
// team, and each dev's birthday (stable, from the name: cake, a happy moodlet, a pie action to wish it).
// ?event=power|client|pizza|birthday in the URL triggers one a few seconds after loading.

const happen = { power: null, visitor: null, next: performance.now() + (8 + Math.random() * 10) * 60000, bdayDone: store("office-bday", { day: "" }) };
const FUSE = { x: 213, y: 26 };  // breaker box, on the office wall between the board and the window

/* ---------- birthdays: one day a year per dev, from its name ---------- */
const dayOfYear = (d = clockNow()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
const forcedBday = CLOCK_Q.get("event") === "birthday" ? TEAM[0] : null;
const isBirthday = name => TEAM.includes(name) && (name === forcedBday || hash(`${name}:bday`) % 365 + 1 === dayOfYear());
function checkBirthdays() {
  const today = clockNow().toDateString();
  if (happen.bdayDone.day === today || !workHours()) return;
  const who = TEAM.find(isBirthday); if (!who) return;
  happen.bdayDone.day = today; save("office-bday", happen.bdayDone);
  addMoodlet(who, "bday", "🎂", "C'est mon anniversaire", 12, 480);
  for (const n of TEAM) if (n !== who) addMoodlet(n, "bdayteam", "🥳", `Anniversaire de ${who}`, 3, 240);
  const cake = RECIPES.find(r => r.id === "gateau");
  if (!dish) dish = { recipe: cake, portions: cake.portions, burnt: false, cook: "la boulangerie", at: performance.now() };
  toast("ANNIVERSAIRE 🎂", `C'est l'anniversaire de ${who} !`, "Un gâteau attend en salle de repos. Va lui souhaiter (clic sur le dev → 🎁).");
  sfx("level");
}

/* ---------- random happenings ---------- */
function startHappening(kind, t = performance.now()) {
  if (kind === "power" && !happen.power) {
    happen.power = { since: t };
    for (const e of ents.values()) if (e.who && !e.leaving) { addMoodlet(e.who, "power", "😱", "Plus de courant", -6, 10); if (e.seated) { e.fxKind = "fail"; e.fxMsg = "😱 mon écran !"; e.fxUntil = t + 3000; } }
    toast("COUPURE DE COURANT ⚡", "Le bureau est dans le noir", "Clique sur le disjoncteur près de la porte pour le réarmer.");
    sfx("fail");
  } else if (kind === "client" && !happen.visitor) {
    const look = { skin: SKINS[hash(String(t)) % SKINS.length], hair: HAIRS[(hash(String(t)) >> 3) % HAIRS.length], shirt: "#1c1c24", style: hash(String(t)) % 5, glasses: Math.random() < 0.4 };
    happen.visitor = { x: DOOR.x, y: DOOR.y + 2, look, path: officeRoute(DOOR.x, DOOR.y + 2, 248, 104), phase: "in", until: t + 75000, say: "", sayUntil: 0 };
    toast("VISITE CLIENT 🤝", "Un client arrive au bureau", "Va l'accueillir (clic sur lui) avant qu'il ne reparte : il pourrait signer un bonus.");
    sfx("push");
  } else if (kind === "pizza") {
    const pizza = RECIPES.find(r => r.id === "pizza");
    dish = { recipe: pizza, portions: 8, burnt: false, cook: "le livreur", at: t };
    for (const n of TEAM) if (!atHome(n)) addMoodlet(n, "pizza", "🍕", "Pizzas offertes", 4, 60);
    toast("LIVRAISON 🍕", "Des pizzas pour l'équipe !", "Elles attendent sur la table de la salle de repos.");
    sfx("achievement");
  }
}
function stepHappen(dt, t) {
  checkBirthdays();
  if (!focusMode && workHours() && t > happen.next) {
    happen.next = t + (12 + Math.random() * 14) * 60000;
    const kinds = ["power", "client", "pizza"].filter(k => !(k === "power" && happen.power) && !(k === "client" && happen.visitor) && !(k === "pizza" && dish));
    if (kinds.length) startHappening(pick(kinds), t);
  }
  if (happen.power && t - happen.power.since > 120000) fixPower(null);  // the building's caretaker in the end
  const v = happen.visitor; if (!v) return;
  if (v.path.length) {
    const tgt = v.path[0], dx = tgt.x - v.x, dy = tgt.y - v.y, dist = Math.hypot(dx, dy), sp = 0.04 * dt;
    if (dist > sp) { v.x += dx / dist * sp; v.y += dy / dist * sp; } else { v.x = tgt.x; v.y = tgt.y; v.path.shift(); }
    if (!v.path.length && v.phase === "in") { v.phase = "wait"; v.say = "Bonjour, je viens voir l'avancement !"; v.sayUntil = t + 4000; }
    if (!v.path.length && v.phase === "out") happen.visitor = null;
    return;
  }
  if (v.phase === "wait" && t > v.until) {  // nobody came
    v.phase = "out"; v.say = "Bon… je repasserai."; v.sayUntil = t + 3000; v.path = officeRoute(v.x, v.y, DOOR.x, DOOR.y + 2);
    addMoodlet(CHIEF_NAME, "client", "😬", "Client mécontent", -10, 60);
    toast("VISITE CLIENT", "Le client est reparti sans être accueilli", "Dommage, pas de bonus cette fois.");
  } else if (v.phase === "wait" && Math.random() < dt / 9000) { v.say = pick(["Hmm, joli bureau.", "C'est eux qui codent ?", "Je peux voir une démo ?", "Il y a quelqu'un ?"]); v.sayUntil = t + 2600; }
}
function fixPower(hero) {
  if (!happen.power) return;
  happen.power = null; burst(FUSE.x + 4, FUSE.y + 6, ["#ffd43b", "#fff7b0"], 14);
  for (const n of TEAM) moodlets[n] = activeMoodlets(n).filter(m => m.id !== "power");
  if (hero) { addMoodlet(hero, "hero", "🦸", "A rétabli le courant", 6, 30); solved("Courant rétabli", "Les écrans se rallument."); }
  else toast("COURANT RÉTABLI", "Le gardien a réarmé le disjoncteur", "");
}
function greetClient() {
  const v = happen.visitor; if (!v || v.phase !== "wait") return;
  const go = () => chiefGo({ x: v.x - 12, y: v.y }, () => {
    const vv = happen.visitor; if (!vv || vv.phase !== "wait") return;
    const bonus = 300 + Math.round(Math.random() * 6) * 100;
    vv.phase = "out"; vv.say = "Excellent travail, je signe ! 🤝"; vv.sayUntil = performance.now() + 3500;
    setTimeout(() => { if (happen.visitor === vv) vv.path = officeRoute(vv.x, vv.y, DOOR.x, DOOR.y + 2); }, 3000);
    chief.bubble = "Bienvenue ! Laissez-moi vous montrer."; chief.until = performance.now() + 3000;
    earn(bonus); wallet.log.unshift({ key: `client:${Date.now()}`, t: Date.now(), who: CHIEF_NAME, spend: true, label: "Client ravi : bonus", total: bonus }); saveWallet();
    addMoodlet(CHIEF_NAME, "client", "🤝", "Client conquis", 10, 60);
    for (const n of TEAM) if (onMission(n)) addMoodlet(n, "client", "😎", "Le client est content", 4, 60);
    toast("VISITE CLIENT", `Client conquis : +${fmtSim(bonus)}`, "Il a adoré la démo.");
    sfx("achievement");
  });
  enqueue("🤝", "Accueillir le client", () => { if (chief.room === "lounge") { chief.pendingOffice = go; chiefToOffice(); } else go(); }, true);
}
function hitHappen(x, y) {
  const v = happen.visitor;
  if (v && Math.abs(x - v.x) <= 7 && y >= v.y - 22 && y <= v.y + 3) return "happen:client";
  if (x >= FUSE.x - 2 && x <= FUSE.x + 10 && y >= FUSE.y - 2 && y <= FUSE.y + 14) return "happen:fuse";
  return null;
}
function happenClick(id) {
  if (id === "client") return greetClient();
  if (id === "fuse") return happen.power ? fixPower(CHIEF_NAME) : toast("DISJONCTEUR", "Tout va bien", "Le courant passe.");
}
// office: the breaker box (blinking during a cut), darkness, black screens; the visitor and its bubble
function drawHappenOffice(t) {
  if (happen.power) {
    ctx.fillStyle = "rgba(4, 4, 14, .55)"; ctx.fillRect(0, 0, cv.width, cv.height);
    for (const d of DESKS) if (hasDesk(DESKS.indexOf(d))) px(d.x - 8, d.y - 12, 16, 10, "#08080c");
  }
  px(FUSE.x, FUSE.y, 8, 12, "#8d929c"); px(FUSE.x + 1, FUSE.y + 1, 6, 10, "#5d6274"); px(FUSE.x + 2, FUSE.y + 3, 4, 2, happen.power ? "#3a3a44" : "#51cf66");
  if (happen.power && Math.floor(t / 300) % 2) { px(FUSE.x + 2, FUSE.y + 7, 4, 2, "#ff6b6b"); text("!", FUSE.x + 4, FUSE.y - 7, "#fbaa08", 5, "center"); }
  const v = happen.visitor; if (!v) return;
  const walking = v.path.length > 0;
  drawPerson(v.x, v.y, v.look, { tux: true, smile: v.phase !== "out" || v.say.includes("signe"), frame: walking ? Math.floor(t / 180) : 0, back: walking && v.path[0].y < v.y });
  px(v.x + 4, v.y - 9, 4, 3, "#5c3d27");  // briefcase
  badge(v.x, v.y + 2, "CLIENT", "#d6a77f");
  if (v.phase === "wait") { const left = Math.max(0, Math.ceil((v.until - t) / 1000)); text(`⏳ ${left} s`, v.x, v.y - 32, "#fbaa08", 4.4, "center"); }
  if (t < v.sayUntil) bubble(v.x, v.y - 24, v.say, "#f4f2ea");
}
if (CLOCK_Q.has("event") && CLOCK_Q.get("event") !== "birthday") setTimeout(() => startHappening(CLOCK_Q.get("event")), 4000);
