"use strict";
// Wants, Sims style: each dev has three wants of the moment ("Manger une pizza", "Discuter avec Ali", "Livrer une
// mission"…). One fulfilled pays the household (§), gives satisfaction points and a happy moodlet; a want left aside
// expires and another one comes. Satisfaction points buy rewards (energy potion, inspiration…) in the needs window.

const WANT_LIFE = 45 * 60000;
let wantBook = store("office-wants", { points: 0, done: 0 });
const saveWants = () => save("office-wants", wantBook);
const wantsOf = store("office-wantslist", {});  // name → [{ id, icon, label, kind, arg, pay, pts, until }], saved by persist.js

// the kinds of wants; `arg` makes some precise (a recipe, an activity, a colleague)
function wantPool(name) {
  const friends = [CHIEF_NAME, ...TEAM].filter(o => o !== name).sort((a, b) => rel(name, b) - rel(name, a)).slice(0, 3);
  const pool = [
    { kind: "eat", icon: "🍽️", label: "Manger un bon plat", pay: 80, pts: 60 },
    ...RECIPES.slice(0, 4).map(r => ({ kind: "eat", arg: r.id, icon: r.icon, label: `Manger : ${r.label.toLowerCase()}`, pay: 120, pts: 90 })),
    { kind: "act", arg: "babyfoot", icon: "⚽", label: "Jouer au baby-foot", pay: 60, pts: 50 },
    { kind: "act", arg: "pingpong", icon: "🏓", label: "Jouer au ping-pong", pay: 60, pts: 50 },
    { kind: "act", arg: "arcade", icon: "🕹️", label: "Battre son record à l'arcade", pay: 60, pts: 50 },
    { kind: "act", arg: "sofa", icon: "📺", label: "Regarder la télé", pay: 40, pts: 40 },
    { kind: "act", arg: "read", icon: "📖", label: "Lire dans le fauteuil", pay: 40, pts: 40 },
    { kind: "coffee", icon: "☕", label: "Boire un café", pay: 30, pts: 30 },
    ...friends.map(f => ({ kind: "talk", arg: f, icon: "💬", label: `Discuter avec ${f}`, pay: 80, pts: 70 })),
    { kind: "compliment", icon: "🌟", label: "Recevoir un compliment", pay: 70, pts: 70 },
    { kind: "kudos", icon: "⭐", label: "Recevoir un kudos", pay: 70, pts: 70 },
    { kind: "deliver", icon: "🏁", label: "Livrer une mission", pay: 250, pts: 150 },
    { kind: "level", icon: "📈", label: "Monter de niveau", pay: 300, pts: 200 },
    { kind: "cook", icon: "🍳", label: "Cuisiner pour l'équipe", pay: 150, pts: 120 },
    { kind: "party", icon: "🍻", label: "Aller à l'afterwork", pay: 100, pts: 100 },
  ];
  if (hasTrait(name, "gourmand")) pool.push(pool[1], pool[2]);  // traits weigh on the wants
  if (hasTrait(name, "sportif")) pool.push(pool.find(w => w.arg === "babyfoot"), pool.find(w => w.arg === "pingpong"));
  if (hasTrait(name, "ambitieux")) pool.push(pool.find(w => w.kind === "deliver"), pool.find(w => w.kind === "level"));
  if (hasTrait(name, "bavard")) pool.push(...pool.filter(w => w.kind === "talk"));
  if (hasTrait(name, "fetard")) pool.push(pool.find(w => w.kind === "party"));
  return pool;
}
function rollWants(name) {
  const list = (wantsOf[name] = (wantsOf[name] || []).filter(w => w.until > Date.now() && !w.done));
  const pool = wantPool(name);
  for (let guard = 0; list.length < 3 && guard < 30; guard++) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (list.some(x => x.kind === w.kind && x.arg === w.arg)) continue;
    list.push({ ...w, until: Date.now() + WANT_LIFE * (0.6 + Math.random() * 0.8) });
  }
  return list;
}
function wantsFor(name) { return rollWants(name); }

// something happened to `name`: a want of the same kind (and argument) is fulfilled
function wantEvent(name, kind, arg = null) {
  if (!TEAM.includes(name)) return;
  const w = wantsFor(name).find(x => x.kind === kind && (x.arg == null || x.arg === arg));
  if (!w) return;
  w.done = true;
  earn(w.pay); wallet.log.unshift({ key: `want:${Date.now()}`, t: Date.now(), who: name, spend: true, label: `Envie de ${name} : ${w.label}`, total: w.pay }); saveWallet();
  wantBook.points += w.pts; wantBook.done++; saveWants();
  addMoodlet(name, `want:${w.kind}`, "😊", "Envie réalisée", 6, 30);
  toast("ENVIE RÉALISÉE", `${name} : ${w.icon} ${w.label}`, `+${fmtSim(w.pay)} · +${w.pts} points de satisfaction`);
  sfx("verify");
  const p = posOf(name) || (() => { const e = [...ents.values()].find(x => x.who === name && !x.leaving); return e && { x: e.seated ? e.desk.x : e.x, y: e.seated ? e.desk.y : e.y }; })();
  if (p) { cashFx.push({ x: p.x, y: p.y - 30, txt: `${w.icon} +${fmtSim(w.pay)}`, born: performance.now() }); }
  setTimeout(() => rollWants(name), 30000);
}

// the break-room activities reached, coffees taken: watched here rather than hooked everywhere
const lastAct = {};
function watchWants() {
  for (const l of loungers.values()) {
    const act = !l.path.length && !l.called ? l.spot?.act.id : null;
    if (act && lastAct[l.name] !== act) { wantEvent(l.name, "act", act); if (act === "kitchen") wantEvent(l.name, "coffee"); }
    lastAct[l.name] = act;
  }
  for (const e of ents.values()) if (e.who && e.pose === "coffee" && !e.wantCoffee) { e.wantCoffee = true; wantEvent(e.who, "coffee"); }
}
setInterval(watchWants, 1000);

/* ---------- rewards bought with satisfaction points ---------- */
const REWARDS = [
  { id: "energy", icon: "⚡", name: "Potion d'énergie", pts: 150, desc: "Énergie et café au max.", run: n => crewAdd(n, { fatigue: -100, cafe: 100 }) },
  { id: "inspired", icon: "💡", name: "Inspiration", pts: 300, desc: "+15 d'humeur pendant 2 h, et sa prochaine mission compte double en compétence.", run: n => { addMoodlet(n, "inspired", "💡", "Inspiré", 15, 120); inspired.add(n); } },
  { id: "spa", icon: "🧖", name: "Journée spa", pts: 600, desc: "Tous ses besoins au max.", run: n => crewAdd(n, { fatigue: -100, ennui: -100, cafe: 100, faim: 100, social: 100 }) },
  { id: "team", icon: "🎊", name: "Bonne humeur d'équipe", pts: 900, desc: "+10 d'humeur pour toute l'équipe pendant 3 h.", run: () => TEAM.forEach(n => addMoodlet(n, "teamreward", "🎊", "Équipe gâtée", 10, 180)) },
];
const inspired = new Set();  // next mission counts double in skill (skills.js)
function buyReward(id, name) {
  const r = REWARDS.find(x => x.id === id); if (!r || wantBook.points < r.pts) return;
  wantBook.points -= r.pts; saveWants(); r.run(name); sfx("achievement");
  toast("RÉCOMPENSE", `${r.icon} ${r.name}`, r.id === "team" ? "Pour toute l'équipe." : `Pour ${name}.`);
}

// the needs window: wants of the shown sim, satisfaction points and rewards
function wantsHtml(name) {
  if (!TEAM.includes(name)) return `<div class="wants"><span class="nl">ENVIES</span><span class="muted">Le chef n'a pas d'envies : il exauce celles de l'équipe. · 🏅 ${wantBook.points} pts</span></div>`;
  const list = wantsFor(name);
  return `<div class="wants"><span class="nl">ENVIES</span>${list.map(w => `<span class="want${w.done ? " done" : ""}" title="${esc(w.label)} · +${fmtSim(w.pay)}, +${w.pts} pts">${w.icon}<small>${esc(w.label)}</small></span>`).join("")}</div>
    <div class="rewards"><span class="nl">🏅 ${wantBook.points} pts</span>${REWARDS.map(r => `<button data-reward="${r.id}" title="${esc(r.desc)}"${wantBook.points < r.pts ? " disabled" : ""}>${r.icon} ${esc(r.name)} · ${r.pts}</button>`).join("")}</div>`;
}
document.getElementById("sims").addEventListener("click", ev => { const b = ev.target.closest("[data-reward]"); if (b) { buyReward(b.dataset.reward, simSel); renderSims(); } });
