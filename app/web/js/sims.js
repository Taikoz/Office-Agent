"use strict";
// Sims-like needs on top of the crew gauges: hunger, energy, fun, social, coffee, and a mood they drive.
// ÉMOTIONS mode shows a plumbob above every head and thought bubbles for what is lacking; objects can be clicked to care
// for the team (kitchen, sofa, arcade, armchair, coffee machine, pizza). Purely a game: nothing here touches the agents.

/* needs: full = good (energy and fun read the existing fatigue and boredom gauges) */
const NEEDS = [
  ["faim", "FAIM", "#ff9f43", m => m.faim, "🍕"],
  ["energie", "ÉNERGIE", "#5aa9ff", m => 100 - m.fatigue, "💤"],
  ["fun", "FUN", "#b48cff", m => 100 - m.ennui, "🎮"],
  ["social", "SOCIAL", "#ff6b9a", m => m.social, "💬"],
  ["cafe", "CAFÉ", "#d6a77f", m => m.cafe, "☕"],
];
const needOf = (m, id) => NEEDS.find(n => n[0] === id)[3](m);
function lowestNeed(m) { return NEEDS.map(n => [n, n[3](m)]).sort((a, b) => a[1] - b[1])[0]; }
function needMeters(m) {
  return NEEDS.map(([, label, c, get]) => { const v = Math.round(get(m)); return `<div class="meter" style="--c:${v < 25 ? "#ff6b6b" : c}"><span>${label}</span><span class="track"><i style="width:${v}%"></i></span><span>${v}</span></div>`; }).join("")
    + `<div class="meter" style="--c:#51cf66"><span>HUMEUR</span><span class="track"><i style="width:${Math.round(m.moral)}%"></i></span><span>${Math.round(m.moral)}</span></div>`;
}
// the two new needs get a value the first time a person is met
function ensureNeeds(m, name) { if (m.faim === undefined) { const h = hash(name); m.faim = 55 + (h >> 3) % 35; m.social = 50 + (h >> 5) % 35; } return m; }

// per minute: hunger always goes down (faster at work), social drops alone at the desk and rises in the break room;
// eating in the kitchen fills up fast; the mood drifts toward the average of the needs
function stepNeeds(dt) {
  stepChiefNeeds(dt); replanLoungers(performance.now());
  const k = dt / 60000, atDesk = new Set([...ents.values()].filter(e => e.who && !e.leaving && e.seated).map(e => e.who));
  for (const n of TEAM) {
    const m = ensureNeeds(mate(n), n), l = loungers.get(n), act = l && !l.path.length && l.spot?.act.id;
    m.faim = clamp(m.faim - (atDesk.has(n) ? 1.2 : 0.6) * k + (act === "kitchen" ? 40 * k : 0));
    m.social = clamp(m.social + (atDesk.has(n) ? -0.8 : ["chat", "pingpong", "babyfoot", "sofa"].includes(act) ? 4 : 0.5) * k);
    const avg = NEEDS.reduce((s, x) => s + x[3](m), 0) / NEEDS.length;
    m.moral = clamp(m.moral + (avg - m.moral) * 0.04 * k * 10);
  }
}

/* ÉMOTIONS mode: plumbob (green, yellow, red by mood) and a thought bubble for the most urgent need */
let emotions = false;
try { emotions = localStorage.getItem("office-emotions") === "1"; } catch (_) { /* storage blocked */ }
function renderEmotionsBtn() {
  const b = document.getElementById("emotionsbtn");
  b.innerHTML = `💎<span class="lbl"> ÉMOTIONS</span>`; b.classList.toggle("on", emotions);
}
function toggleEmotions() {
  emotions = !emotions;
  try { localStorage.setItem("office-emotions", emotions ? "1" : ""); } catch (_) { /* kept for this page only */ }
  renderEmotionsBtn();
  toast("ÉMOTIONS", emotions ? "Affichées" : "Masquées", emotions ? "Losange d'humeur et besoin urgent au-dessus de chaque tête. Les devs se débrouillent seuls ; toi, tu t'occupes du chef (machine à café, console, podium)." : "");
}
document.getElementById("emotionsbtn").onclick = toggleEmotions;
renderEmotionsBtn();

function plumbobArt(color, narrow) {
  const w = narrow ? 2 : 5, x = 3 - w / 2;
  return `<path fill="${color}" d="M3 0L${x + w} 4.6L3 10L${x} 4.6Z"/><path fill="#fff" fill-opacity=".55" d="M3 0L${x + w * 0.3} 4.6L3 4.6Z"/><path fill="#000" fill-opacity=".18" d="M3 10L${x + w} 4.6L3 4.6Z"/>`;
}
function drawEmotion(name, x, headY, t) {
  if (!emotions || focusMode || !name) return;
  const m = ensureNeeds(mate(name), name), mood = m.moral, col = mood >= 60 ? "#51cf66" : mood >= 35 ? "#ffd43b" : "#ff6b6b";
  const narrow = Math.floor((t + hash(name)) / 350) % 4 === 1, bob = Math.sin((t + hash(name)) / 400) * 0.8;
  art(`plumbob:${col}:${narrow}`, x - 3, headY - 12 + bob, 6, 10, () => plumbobArt(col, narrow));
  const [need, v] = lowestNeed(m);
  if (v < 30 && Math.floor((t + hash(name) * 7) / 2500) % 3 === 0) {  // thought bubble, Sims style
    px(x + 4, headY - 4, 1, 1, "#f7f7f7"); px(x + 5.5, headY - 6, 1.4, 1.4, "#f7f7f7");
    px(x + 6, headY - 14, 9, 7, "#f7f7f7"); px(x + 5.4, headY - 13.4, 10.2, 5.8, "#f7f7f7");
    text(need[4], x + 10.5, headY - 13.4, "#081746", 4.6, "center");
  }
}

/* autonomy: a dev picks the break-room activity that serves its most urgent need; a dev on a mission finishes it first
   (the needs wait), and goes to eat, sleep or play once back in the break room */
const ACT_SERVES = { kitchen: ["faim", "cafe"], sofa: ["energie", "social"], read: ["energie", "fun"], chat: ["social", "energie"],
  pingpong: ["fun", "social"], babyfoot: ["fun", "social"], arcade: ["fun"], darts: ["fun"] };
const NEED_LINES = { faim: "J'ai faim, je vais manger 🍕", cafe: "Il me faut un café ☕", energie: "Je suis crevé, pause canapé 💤", fun: "Allez, une partie 🎮", social: "Quelqu'un pour papoter ? 💬" };
function urgentNeed(name) { const [need, v] = lowestNeed(mate(name)); return v < 40 ? need[0] : null; }
// break-room re-planning: a dev whose current activity does not serve an urgent need (< 25) moves, at most every 20 s
function replanLoungers(t) {
  for (const [name, l] of loungers) {
    if (l.called || l.path.length || t < (l.replanAt || 0)) continue;
    const [need, v] = lowestNeed(mate(name));
    if (v >= 25 || (ACT_SERVES[l.spot?.act.id] || []).includes(need[0])) continue;
    l.replanAt = t + 20000;
    const sp = pickSpot(name);
    if (sp && sp !== l.spot) { sendTo(l, sp, t); loungeSay(name, NEED_LINES[need[0]], t); }
  }
}

/* the chief is yours: click the coffee machine (coffee + croissant), the console (a game), the podium (back to work).
   He refuses to leave while the team needs him (a question, a dev arriving). His needs drop while he leads. */
function chiefBusyNow() { const ch = curSession()?.chief; return !!(ch?.question || arrivals.length || [...ents.values()].some(e => e.asking)); }
function chiefOrder(where) {
  const t = performance.now();
  if (where !== "podium" && chiefBusyNow()) { chief.bubble = "Pas maintenant, l'équipe a besoin de moi !"; chief.until = t + 3000; return; }
  if (chief.room === "lounge") return chiefToOffice(where);  // from the break room: back through the door first
  if (where === "coffee") {
    if (events.coffee) { chief.bubble = "La machine est en panne…"; chief.until = t + 3000; return; }
    chiefGo("coffee", c => { c.coffeeUntil = performance.now() + 6000; smoke(COFFEE.x, 56, "#d5eeff"); });
  } else if (where === "console") chiefGo("console", c => { c.cup = false; });
  else chiefGo("podium");
  chief.manual = true;
}
function stepChiefNeeds(dt) {
  const k = dt / 60000, m = mate(CHIEF_NAME), here = !chief.path.length, t = performance.now();
  const leading = chief.at === "podium" && chief.room === "office", gaming = chief.at === "console" && here, sipping = chief.at === "coffee" && here;
  const act = chief.room === "lounge" && !chief.lpath.length ? chief.lspot?.act.id : null;  // break-room activity, like the team
  const lounge = { kitchen: { faim: 40, cafe: 25 }, sofa: { fatigue: -15, social: 3 }, read: { fatigue: -10, ennui: -6 }, chat: { social: 20, ennui: -4 },
    arcade: { ennui: -20 }, darts: { ennui: -15 }, pingpong: { ennui: -15, social: 6 }, babyfoot: { ennui: -15, social: 6 } }[act] || {};
  crewAdd(CHIEF_NAME, Object.fromEntries(Object.entries(lounge).map(([key, v]) => [key, v * k])));
  crewAdd(CHIEF_NAME, {
    faim: -0.7 * k, cafe: -1 * k,
    fatigue: (gaming ? -6 : leading ? 1.2 : 0) * k, ennui: (gaming ? -10 : leading && !chiefBusyNow() ? 1.5 : 0.5) * k,
    social: (chiefBusyNow() || arrivals.length ? 3 : -0.4) * k,
  });
  const avg = NEEDS.reduce((sum, x) => sum + x[3](m), 0) / NEEDS.length;
  m.moral = clamp(m.moral + (avg - m.moral) * 0.4 * k);
  if (sipping && chief.coffeeUntil && t > chief.coffeeUntil) { chief.coffeeUntil = 0; chief.cup = true; crewAdd(CHIEF_NAME, { cafe: 60, faim: 35, fatigue: -10 }); chief.bubble = "🥐 café + croissant, parfait."; chief.until = t + 3000; chiefGo("podium", c => { c.cup = false; }); }
}
