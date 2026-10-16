// The free devs of the break room go to the gym or the library now and then (rooms/extra.js): to the gym when they are
// bored (sportsmen first), to the library when they are tired or want some calm (loners first). They take a free spot
// of a machine or a place to read, stay a minute or two, and come back better: fun and mood from the gym (more
// tired), rest and calm from the library.

import { hub } from "../hub.js";

import { crewAdd, mate } from "../sims/crew.js";
import { addMoodlet, hasTrait } from "../sims/moods.js";
import { loungeSay, loungers } from "../world/lounge.js";

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const ROOMS = {
  gym: { wants: (n, m) => m.ennui >= 45 || hasTrait(n, "sportif") ? (hasTrait(n, "sportif") ? 0.5 : 0.25) : 0.05,
    go: ["Je vais me défouler à la salle 💪", "Petite séance de sport ?", "Allez, un peu de cardio !"],
    there: ["Encore une série !", "Je transpire le bug.", "Dix kilomètres, facile.", "Mes bras !", "Le cardio, ça vide la tête.", "Qui me spotte au banc ?"],
    back: { ennui: -22, moral: 6, fatigue: 8, social: 4 }, moodlet: ["gym", "💪", "Séance de sport"] },
  library: { wants: (n, m) => m.fatigue >= 50 || hasTrait(n, "solitaire") || m.ennui >= 55 ? (hasTrait(n, "solitaire") ? 0.45 : 0.22) : 0.04,
    go: ["Je vais lire un peu à la bibliothèque 📚", "Un peu de calme, ça me fera du bien.", "Je file finir mon livre."],
    there: ["Chut…", "Ce chapitre est génial.", "J'apprends plein de trucs.", "On est bien, ici.", "Encore une page…", "Ce livre sur l'architecture est top."],
    back: { fatigue: -14, ennui: -12, moral: 4 }, moodlet: ["library", "📚", "Un moment de lecture"] },
};
// the free spots of a room: its objects with spots (def.visit), not taken
function freeSpots(room) {
  const taken = new Set([...loungers.values()].filter(l => l.partyRoom === room && l.roomSpot).map(l => l.roomSpot.key));
  return hub.itemsIn(room).flatMap(it => { const d = hub.defOf(it.type); if (d.visit !== room && d.act !== "read") return []; return hub.spotsOf(it).map(s => ({ ...s, pose: d.pose || (d.act === "read" ? { seated: true, book: true } : {}) })); })
    .filter(s => !taken.has(s.key));
}
function stepVisits(t) {
  if (hub.focusMode) return;
  for (const [room, R] of Object.entries(ROOMS)) {
    if (!hub.con.rooms.includes(room)) continue;
    // who comes back
    for (const l of loungers.values()) if (l.partyRoom === room && l.roomSpot && t > l.visitUntil) {
      crewAdd(l.name, R.back); addMoodlet(l.name, R.moodlet[0], R.moodlet[1], R.moodlet[2], hasTrait(l.name, room === "gym" ? "sportif" : "solitaire") ? 6 : 4, 60);
      Object.assign(l, { partyRoom: null, roomSpot: null, busy: false, next: 0 }); loungeSay(l.name, room === "gym" ? "Ça fait du bien ! 💪" : "Me revoilà, reposé.", t);
    }
    // who goes
    const spots = freeSpots(room); if (!spots.length) continue;
    for (const l of loungers.values()) {
      if (l.called || l.busy || l.party || l.partyRoom || l.path.length || t < (l.visitNext || 0)) continue;
      l.visitNext = t + 40000 + Math.random() * 40000;
      if (Math.random() > R.wants(l.name, mate(l.name))) continue;
      const s = spots.shift();
      loungeSay(l.name, pick(R.go), t);
      Object.assign(l, { busy: true, partyRoom: room, roomSpot: s, visitUntil: t + 60000 + Math.random() * 60000, spot: null, path: [] });
      if (!spots.length) break;
    }
    // what they say there
    for (const l of loungers.values()) if (l.partyRoom === room && l.roomSpot && t > l.sayUntil + 6000 && Math.random() < 0.01) { l.say = pick(R.there); l.sayUntil = t + 3000; }
  }
}
setInterval(() => stepVisits(performance.now()), 1000);
