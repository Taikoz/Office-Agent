"use strict";
// Personality traits and moodlets, Sims style. Each sim has two traits (gourmand, party animal, loner, perfectionist…)
// that change how fast its needs drop and how strongly it reacts. Moodlets are short emotions with a weight on the mood
// ("🎉 MR fusionnée +15, 1 h"): many come from the real work of the agents (red or green tests, broken CI, merged or
// refused MR, blocked, going round in circles, mission delivered). Purely a game: nothing here touches the agents.

/* ---------- traits ---------- */
const TRAITS = {
  gourmand: { icon: "🍕", name: "Gourmand", desc: "A faim plus vite, adore manger.", faim: 1.5, eat: 2 },
  fetard: { icon: "🎉", name: "Fêtard", desc: "S'ennuie vite ; vit pour les afterworks.", fun: 1.5, party: 2 },
  solitaire: { icon: "🎧", name: "Solitaire", desc: "Le social baisse lentement ; les conversations le touchent moins.", social: 0.5, talk: 0.6 },
  perfectionniste: { icon: "🧐", name: "Perfectionniste", desc: "Les tests rouges le minent, les verts le comblent.", tests: 2 },
  cafeinomane: { icon: "☕", name: "Caféinomane", desc: "Le café baisse deux fois plus vite.", cafe: 2 },
  bavard: { icon: "💬", name: "Bavard", desc: "Le social baisse vite ; adore discuter.", social: 1.6, talk: 1.5 },
  zen: { icon: "🧘", name: "Zen", desc: "Les mauvaises nouvelles le touchent moitié moins.", bad: 0.5 },
  sportif: { icon: "🏓", name: "Sportif", desc: "Les jeux de la salle de repos lui font deux fois plus de bien.", games: 2 },
  levetot: { icon: "🌅", name: "Lève-tôt", desc: "En forme le matin, fatigué le soir.", morning: true },
  ambitieux: { icon: "🚀", name: "Ambitieux", desc: "Livrer le rend très heureux ; ses compétences montent plus vite.", deliver: 2, skill: 1.5 },
};
const TRAIT_IDS = Object.keys(TRAITS);
// two traits per sim, stable (from its name)
function traitsOf(name) {
  const h = hash(`${name}:traits`), a = TRAIT_IDS[h % TRAIT_IDS.length];
  let b = TRAIT_IDS[(h >> 4) % TRAIT_IDS.length];
  if (b === a) b = TRAIT_IDS[(TRAIT_IDS.indexOf(a) + 3) % TRAIT_IDS.length];
  return [a, b];
}
const hasTrait = (name, id) => traitsOf(name).includes(id);
const traitK = (name, key) => traitsOf(name).reduce((k, id) => k * (TRAITS[id][key] ?? 1), 1);
function traitsHtml(name) {
  return `<div class="traits">${traitsOf(name).map(id => { const t = TRAITS[id]; return `<span class="trait" title="${esc(t.desc)}">${t.icon} ${esc(t.name)}</span>`; }).join("")}</div>`;
}
// what the traits change, per minute, on top of the usual needs (sims.js, crew.js)
function stepTraits(dt) {
  const k = dt / 60000, h = clockNow().getHours();
  for (const n of [CHIEF_NAME, ...TEAM]) {
    const d = {}, l = loungers.get(n), act = l && !l.path.length && !l.called && l.spot?.act.id;
    if (traitK(n, "faim") !== 1) d.faim = -0.8 * (traitK(n, "faim") - 1);
    if (traitK(n, "social") !== 1) d.social = -0.6 * (traitK(n, "social") - 1);
    if (traitK(n, "cafe") !== 1) d.cafe = -1 * (traitK(n, "cafe") - 1);
    if (traitK(n, "fun") !== 1) d.ennui = 1 * (traitK(n, "fun") - 1);
    if (hasTrait(n, "sportif") && ["pingpong", "babyfoot", "arcade", "darts"].includes(act)) d.ennui = (d.ennui || 0) - 3;
    if (hasTrait(n, "levetot")) d.fatigue = h < 12 ? -1 : h >= 17 ? 1.5 : 0;
    for (const key in d) d[key] *= k;
    crewAdd(n, d);
  }
}

/* ---------- moodlets ---------- */
const moodlets = store("office-moodlets", {});  // name → [{ id, icon, label, val, until }], saved by persist.js
function addMoodlet(name, id, icon, label, val, mins) {
  if (!name) return;
  if (val < 0) val *= traitK(name, "bad");
  const list = (moodlets[name] = (moodlets[name] || []).filter(m => m.id !== id));
  list.push({ id, icon, label, val: Math.round(val), until: Date.now() + mins * 60000 });
}
function activeMoodlets(name) {
  const now = Date.now(), list = (moodlets[name] || []).filter(m => m.until > now);
  moodlets[name] = list;
  return list;
}
const moodletSum = name => activeMoodlets(name).reduce((s, m) => s + m.val, 0);
function moodletsHtml(name) {
  const list = activeMoodlets(name).sort((a, b) => Math.abs(b.val) - Math.abs(a.val)).slice(0, 6);
  if (!list.length) return "";
  return `<div class="moodlets">${list.map(m => `<span class="ml ${m.val >= 0 ? "up" : "dn"}" title="${esc(m.label)} · encore ${Math.max(1, Math.round((m.until - Date.now()) / 60000))} min">${m.icon} ${esc(m.label)} <b>${m.val >= 0 ? "+" : ""}${m.val}</b></span>`).join("")}</div>`;
}

/* ---------- the real work of the agents → emotions ---------- */
const workMemo = new Map();  // agent id → what was already seen
const stuckSeen = new Set(); // agents that went round in circles at some point (money.js: salary malus)
const wasStuck = a => stuckSeen.has(a.id);
function deskFx(a, msg, kind) { const e = ents.get(a.id); if (e && e.seated) { e.fxKind = kind; e.fxMsg = msg; e.fxUntil = performance.now() + 2800; } }
function watchWork() {
  if (firstLoad) return;
  for (const a of curSession()?.agents || []) {
    const who = crew.ids[a.id]; if (!who) continue;
    const g = a.game || {}, m = workMemo.get(a.id) || { t: g.last || 0, streak: 0, fresh: true };
    if (m.fresh) {  // first sight: remember the state, react to nothing already past
      m.fresh = false; m.status = a.status; m.pipe = JSON.stringify(pipeOf(g.mr) || null); m.t = Math.max(m.t, ...(g.timeline || []).map(e => e.t || 0), 0);
      workMemo.set(a.id, m); continue;
    }
    for (const ev of (g.timeline || []).filter(e => (e.t || 0) > m.t).sort((x, y) => x.t - y.t)) {
      m.t = ev.t;
      if (ev.kind === "tests_fail") {
        m.streak++;
        addMoodlet(who, "testsred", "😣", "Tests rouges", -6 * traitK(who, "tests"), 15);
        if (m.streak >= 3) { addMoodlet(who, "testsdepressed", "😫", `${m.streak} échecs d'affilée`, -15 * traitK(who, "tests"), 30); deskFx(a, "😫 encore rouge…", "fail"); }
      } else if (ev.kind === "tests_pass") {
        if (m.streak) { addMoodlet(who, "relief", "😌", "Soulagé : enfin vert", 8 * traitK(who, "tests"), 20); deskFx(a, "😌 enfin vert !", "pass"); }
        else addMoodlet(who, "testsgreen", "✅", "Tests verts", 4 * traitK(who, "tests"), 15);
        m.streak = 0; moodlets[who] = activeMoodlets(who).filter(x => x.id !== "testsred" && x.id !== "testsdepressed");
      } else if (ev.kind === "mr") addMoodlet(who, "mr", "📬", "MR ouverte", 6, 30);
    }
    const p = pipeOf(g.mr), pk = JSON.stringify(p || null);
    if (pk !== m.pipe) {
      const was = JSON.parse(m.pipe || "null") || {};
      if (p?.state === "merged" && was.state !== "merged") {
        addMoodlet(who, "merged", "🎉", "MR fusionnée", 15, 60); deskFx(a, "🎉 mergé !", "mr");
        for (const n of TEAM) if (n !== who) addMoodlet(n, "teammerge", "🤝", "L'équipe livre", 3, 30);
        toast("MERGE", `${who} : MR fusionnée 🎉`, a.ticket || "");
      } else if (p?.state === "closed" && was.state !== "closed") { addMoodlet(who, "refused", "🚫", "MR refusée", -15, 60); deskFx(a, "🚫 MR refusée…", "fail"); }
      else if (p?.ci === "failed" && was.ci !== "failed") addMoodlet(who, "cired", "💥", "CI cassée", -10, 30);
      else if (p?.ci === "success" && was.ci !== "success") { addMoodlet(who, "cigreen", "🟢", "CI verte", 5, 30); moodlets[who] = activeMoodlets(who).filter(x => x.id !== "cired"); }
      m.pipe = pk;
    }
    if (a.status !== m.status) {
      if (a.status === "blocked") addMoodlet(who, "blocked", "🧱", "Bloqué", -8, 20);
      if (a.status === "done") { addMoodlet(who, "delivered", "🏁", "Mission livrée", 10 * traitK(who, "deliver"), 60); moodlets[who] = activeMoodlets(who).filter(x => x.id !== "blocked"); }
      if (a.status === "working" && m.status === "blocked") moodlets[who] = activeMoodlets(who).filter(x => x.id !== "blocked");
      m.status = a.status;
    }
    if (isStuck(a)) { stuckSeen.add(a.id); addMoodlet(who, "stuck", "🌀", "Tourne en rond", -10, 5); }
    if (clockNow().getHours() >= 20 || clockNow().getHours() < 7) if (a.status === "working") addMoodlet(who, "overtime", "🌙", "Heures sup", -5, 10);
    workMemo.set(a.id, m);
  }
}
setInterval(watchWork, 2000);
