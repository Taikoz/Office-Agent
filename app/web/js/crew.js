"use strict";
// Per-person gauges (fatigue, boredom, morale, coffee) driven by the real work.

/* ---------- crew: fatigue, boredom, morale, coffee ---------- */
// per-person gauges (0-100), driven by what the agent behind each person really does; kept in this browser only
const CREW_KEY = "office-crew";
let crew = { stats: {}, ids: {}, pets: 0, at: Date.now() };
try { Object.assign(crew, JSON.parse(localStorage.getItem(CREW_KEY) || "{}")); } catch (_) { /* storage blocked: fresh team */ }
const clamp = v => Math.max(0, Math.min(100, v));

function mate(name) {
  if (!crew.stats[name]) { const h = hash(name); crew.stats[name] = { fatigue: 10 + h % 20, ennui: 20 + (h >> 2) % 20, moral: 60 + (h >> 4) % 25, cafe: 50 + (h >> 6) % 30 }; }
  const m = crew.stats[name];
  if (m.faim === undefined) { const h = hash(name); m.faim = 55 + (h >> 3) % 35; m.social = 50 + (h >> 5) % 35; }  // Sims needs (sims.js)
  return m;
}
function crewAdd(name, d) { if (!name) return; const m = mate(name); for (const k in d) m[k] = clamp(m[k] + d[k]); }

{ // time spent away since the last visit: everybody rested at home
  const min = Math.min(600, (Date.now() - (crew.at || Date.now())) / 60000);
  for (const n of TEAM) { const m = mate(n); m.fatigue = clamp(m.fatigue - min); m.ennui = clamp(m.ennui + min * 0.2); m.cafe = clamp(m.cafe - min * 0.3); m.moral += (65 - m.moral) * Math.min(1, min / 120); }
}
function saveCrew() {
  crew.at = Date.now();
  const ids = Object.entries(crew.ids); if (ids.length > 60) crew.ids = Object.fromEntries(ids.slice(-60));
  try { localStorage.setItem(CREW_KEY, JSON.stringify(crew)); } catch (_) { /* storage blocked: kept for this page only */ }
}
setInterval(saveCrew, 10000); addEventListener("beforeunload", saveCrew);

// rates per minute, by what the person is doing
function stepCrew(dt) {
  const k = dt / 60000, here = new Map([...ents.values()].filter(e => e.who && !e.queued).map(e => [e.who, e]));
  for (const n of TEAM) {
    const l = loungers.get(n), act = l && !l.path.length && !l.called && l.spot?.act;
    const e = here.get(n), a = e?.agent, d = !e || e.leaving ? { fatigue: -1, ennui: 0.2, cafe: -0.3, ...(act ? act.fx : {}) }
      : e.coffee ? { ennui: -2 }
      : e.asking ? { ennui: 1, fatigue: 0.5 }
      : a.status === "blocked" ? { fatigue: 2, moral: -3, ennui: 1, cafe: -1 }
      : a.status === "done" ? { fatigue: -1, ennui: 3 }
      : a.idle > 45 ? { fatigue: 1, ennui: 2, cafe: -1 }
      : { fatigue: 3, ennui: -4, cafe: -2 };
    if (e && cat.mode === "sleep" && cat.desk === e.desk) { d.ennui = (d.ennui || 0) - 3; d.moral = (d.moral || 0) + 1; }  // Brume on the desk
    for (const key in d) d[key] *= k;
    crewAdd(n, d);
  }
}

function moodWord(m) {
  return m.fatigue >= 80 ? "à bout de forces" : m.faim <= 15 ? "affamé" : m.cafe <= 15 ? "en manque de café" : m.social <= 15 ? "se sent seul" : m.ennui >= 70 ? "s'ennuie" : m.moral <= 25 ? "le moral dans les chaussettes"
    : m.moral >= 80 ? "au top" : "ça va";
}
// now and then, a seated dev says how they feel
function moodLine(e, t) {
  if (focusMode) return null;
  if (!e.who || (t / 1000 + hash(e.who) % 25) % 25 > 3) return "";
  const m = mate(e.who), st = e.agent.status;
  return m.fatigue >= 85 ? "*bâille*" : m.faim <= 15 ? "j'ai trop faim…" : m.cafe <= 15 ? "il me faut un café…" : m.ennui >= 75 && st !== "working" ? "je m'ennuie…"
    : m.moral <= 20 ? "dur dur…" : m.moral >= 90 && st === "working" ? "♪ on est bien" : "";
}

function renderTeam() {
  const here = new Map([...ents.values()].filter(e => e.who && !e.leaving).map(e => [e.who, e]));
  const where = cat.mode === "sleep" ? `dort sur le bureau de ${TEAM[DESKS.indexOf(cat.desk)]}` : cat.mode === "walk" ? "se promène" : "fait sa toilette";
  document.getElementById("p-game").innerHTML = `<div class="mate" style="--c:#fbaa08"><div class="top"><b>${CHIEF_NAME}</b><span class="muted">chef · c'est toi : clique sur la machine à café, la console ou le podium</span></div>
    <div class="muted">${moodWord(mate(CHIEF_NAME))}</div>${needMeters(mate(CHIEF_NAME))}</div>`
    + TEAM.map(n => {
      const e = here.get(n), m = mate(n);
      const l = loungers.get(n);
      const doing = e ? `${specialty(e.agent.type)}${e.agent.ticket ? ` · ${esc(e.agent.ticket)}` : ""}${e.coffee ? " · ☕ pause" : ""}` : l ? `salle de repos · ${l.path.length ? "se déplace" : l.spot?.act.label || "se pose"}` : "salle de repos";
      return `<div class="mate${e ? "" : " away"}" data-mate="${n}" style="--c:${e ? typeColor(e.agent.type) : "#555"};cursor:pointer" title="Ouvrir"><div class="top"><b>${esc(nameTag(n))}</b><span class="muted">${doing}</span></div>
        <div class="muted">${moodWord(m)}</div>
        ${needMeters(m)}</div>`;
    }).join("")
    + `<div class="mate" style="--c:#a3a3ad"><div class="top"><b>🐈 ${CAT_NAME}</b><span class="muted">chat gris du bureau</span></div>
      <div class="muted">${where} · ${crew.pets || 0} câlin(s)</div></div>`
    + (DEMO ? "" : `<button class="x" id="edit-team" style="margin-top:8px">✏️ Modifier l'équipe et le logo</button>`);
}
