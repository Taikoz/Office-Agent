"use strict";
// Deeper relationships: rivals (friendship at −40 or less) needle each other when they work at the same time, best
// friends (70 or more) work better as a pair, and every newcomer (a recruit or a hire of the bigger open space) gets
// a sponsor, the most senior dev, for two weeks: both are happy about it, and the newcomer learns faster.

const RIVAL = -40, BUDDY = 70, SPONSOR_DAYS = 14;
let bondBook = store("office-bonds", { sponsors: {} });
const saveBonds = () => save("office-bonds", bondBook);
const newcomers = () => TEAM.filter(n => (careerBook.newbies[n] || (con.hires.includes(n) && (careerBook.newbies[n] = Date.now()))) && Date.now() - careerBook.newbies[n] < SPONSOR_DAYS * 86400000);
const sponsorOf = name => bondBook.sponsors[name] || null;
const sponseesOf = name => Object.entries(bondBook.sponsors).filter(([n, s]) => s === name && newcomers().includes(n)).map(([n]) => n);
const rivalsOf = name => TEAM.filter(o => o !== name && !isVacant(o) && rel(name, o) <= RIVAL);
const buddiesOf = name => TEAM.filter(o => o !== name && !isVacant(o) && rel(name, o) >= BUDDY);

function stepBonds() {
  // a sponsor for each newcomer: the most senior dev who is not a newcomer itself
  const fresh = newcomers();
  for (const n of fresh) if (!bondBook.sponsors[n] || isVacant(bondBook.sponsors[n])) {
    const s = TEAM.filter(o => o !== n && !fresh.includes(o) && !isVacant(o)).sort((a, b) => gradeOf(b) - gradeOf(a) || bestSkillLevel(b) - bestSkillLevel(a))[0];
    if (!s) continue;
    bondBook.sponsors[n] = s; relAdd(n, s, 15); saveBonds();
    toast("PARRAINAGE 🎓", `${s} parraine ${n}`, "Pendant deux semaines : accueil, conseils, et le nouveau apprend plus vite.");
  }
  for (const n of fresh) { const s = sponsorOf(n); if (s) { addMoodlet(n, "sponsored", "🎓", `Parrainé par ${s}`, 4, 2); addMoodlet(s, "sponsor", "🎓", `Parrain de ${n}`, 3, 2); } }
  // at work at the same time: rivals needle each other, buddies push each other
  const working = TEAM.filter(onMission);
  for (const n of working) {
    const r = rivalsOf(n).filter(o => working.includes(o)), b = buddiesOf(n).filter(o => working.includes(o));
    if (r.length) addMoodlet(n, "rival", "😤", `Rivalité avec ${r[0]}`, -4, 2);
    if (b.length) addMoodlet(n, "buddy", "🤜🤛", `En binôme avec ${b[0]}`, 5, 2);
  }
}
setInterval(stepBonds, 60000);
setTimeout(stepBonds, 5000);
// skill learning of a newcomer with a sponsor (skills.js)
const learnBoost = name => sponsorOf(name) && newcomers().includes(name) ? 1.5 : 1;
// the special bonds of a sim, for the needs window
function bondsHtml(name) {
  const parts = [];
  if (sponsorOf(name) && newcomers().includes(name)) parts.push(`🎓 parrain : ${esc(sponsorOf(name))}`);
  for (const n of sponseesOf(name)) parts.push(`🎓 parraine ${esc(n)}`);
  for (const n of buddiesOf(name)) parts.push(`🤜🤛 binôme : ${esc(n)}`);
  for (const n of rivalsOf(name)) parts.push(`😤 rival : ${esc(n)}`);
  return parts.length ? `<div class="bonds">${parts.map(p => `<span>${p}</span>`).join("")}</div>` : "";
}
