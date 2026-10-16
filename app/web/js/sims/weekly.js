// Progression: three challenges a week (deliver, open MRs, beat the tests' boss, win duels, a happy team…), each worth
// simflouz and a star once claimed; the office's level (its agents' XP and the stars) unlocks the dearest objects of
// the shop (world/build.js). Counted in this browser, never in the demo.

import { hub, provide } from "../hub.js";
import { TEAM, hash } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { esc } from "../core/data.js";
import { mate } from "./crew.js";
import { earn, fmtSim } from "./money.js";
import { sfx, toast } from "./progress.js";

const POOL = [
  { id: "deliver", label: "Livrer 10 missions", kind: "deliver", target: 10, pay: 2500 },
  { id: "mr", label: "Ouvrir 5 MR", kind: "mr", target: 5, pay: 1500 },
  { id: "verify", label: "5 tickets en To Verify", kind: "verify", target: 5, pay: 1500 },
  { id: "boss", label: "Vaincre 3 boss de tests", kind: "boss", target: 3, pay: 1200 },
  { id: "pass", label: "20 lancers de tests verts", kind: "pass", target: 20, pay: 1000 },
  { id: "coffee", label: "10 pauses café de l'équipe", kind: "coffee", target: 10, pay: 600 },
  { id: "duel", label: "Gagner 3 duels en salle de repos", kind: "duelwin", target: 3, pay: 1000 },
  { id: "kudos", label: "Donner 5 kudos", kind: "kudos", target: 5, pay: 600 },
  { id: "pc", label: "Battre 2 records sur les PC", kind: "pcrecord", target: 2, pay: 800 },
  { id: "mood", label: "Une équipe de bonne humeur (moyenne ≥ 70)", live: () => TEAM.reduce((s, n) => s + mate(n).moral, 0) / Math.max(1, TEAM.length) >= 70 ? 1 : 0, target: 1, pay: 1200 },
];
// the week: its Monday, as a key
const weekKey = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };
const demo = () => typeof DEMO !== "undefined" && DEMO;
export let weekly = new SaveSlot("office-weekly", { week: "", n: {}, claimed: [], stars: 0 }).data;
const save = () => { if (!demo()) SaveSlot.get("office-weekly").save(weekly); };
function roll() { if (weekly.week !== weekKey()) { weekly.week = weekKey(); weekly.n = {}; weekly.claimed = []; save(); } }
roll();
// the three of this week (the same for the whole week)
export function challenges() {
  roll();
  const h = hash(weekly.week), pool = [...POOL], picks = [];
  for (let i = 0; i < 3; i++) picks.push(pool.splice((h >> (i * 4)) % pool.length, 1)[0]);
  return picks.map(c => ({ ...c, n: Math.min(c.target, c.live ? c.live() : weekly.n[c.kind] || 0), claimed: weekly.claimed.includes(c.id) }));
}
// something happened that a challenge counts
export function countWeekly(kind, k = 1) { roll(); weekly.n[kind] = (weekly.n[kind] || 0) + k; save(); renderWeekly(); }
function claim(id) {
  const c = challenges().find(x => x.id === id); if (!c || c.claimed || c.n < c.target) return;
  weekly.claimed.push(id); weekly.stars++; save(); earn(c.pay); sfx("achievement");
  toast("DÉFI RÉUSSI ⭐", c.label, `+${fmtSim(c.pay)} et une étoile pour le bureau (niveau ${officeLevel()}).`);
  renderWeekly(); hub.renderBuy?.();
}

/* ---------- the office's level: the agents' XP (game.py levels) and the stars ---------- */
export function officeLevel() {
  const xpLevels = Object.values(hub.game?.xp || {}).reduce((s, x) => s + (x.level || 0), 0);
  return 1 + Math.floor(xpLevels / 6) + (weekly.stars || 0);
}
// the level an object needs: its own, else from its price (the luxury pieces wait a little)
export const unlockOf = def => def.unlock ?? (def.price >= 3000 ? 6 : def.price >= 2000 ? 4 : def.price >= 1400 ? 2 : 0);
export const lockedFor = def => unlockOf(def) > officeLevel();

/* ---------- the panel on the right, under the day's quests ---------- */
function renderWeekly() {
  const box = document.getElementById("weekly"); if (!box) return;
  const cs = challenges(), done = cs.filter(c => c.claimed).length;
  document.getElementById("wcount").textContent = `${done}/3 · niv. ${officeLevel()} ⭐${weekly.stars}`;
  box.innerHTML = cs.map(c => { const ok = c.n >= c.target;
    return `<div class="q ${c.claimed ? "ok" : ""}" title="${esc(c.label)} · ${fmtSim(c.pay)}">${c.claimed ? "⭐" : ok ? "🎁" : "○"} <span class="lbl">${esc(c.label)}</span>${c.target > 1 ? `<span class="track"><i style="width:${Math.round(100 * c.n / c.target)}%"></i></span> ${c.n}/${c.target}` : ""}${ok && !c.claimed ? `<button data-claim="${c.id}">+${fmtSim(c.pay)}</button>` : ""}</div>`; }).join("");
}
document.getElementById("weekly")?.addEventListener("click", ev => { const b = ev.target.closest("[data-claim]"); if (b) claim(b.dataset.claim); });
setInterval(renderWeekly, 5000); setTimeout(renderWeekly, 1500);

provide({ get countWeekly() { return countWeekly; }, get lockedFor() { return lockedFor; }, get officeLevel() { return officeLevel; }, get unlockOf() { return unlockOf; } });
