// Friendships between everybody (−100 to 100, a level name and color), and the cooking skill of each sim; kept in this
// browser (never in demo). Shown in the Sims window and in a dev's panel.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, TEAM, hash } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { esc } from "../core/data.js";
import { workSkillsHtml } from "../sims/skills.js";

/* ---------- friendships and cooking skill, kept in this browser (never in demo) ---------- */
const socialSlot = new SaveSlot("office-social", { rel: {}, cook: {}, meals: 0 });
export let social = socialSlot.data;
export const saveSocial = () => socialSlot.save(social);
setInterval(saveSocial, 10000); addEventListener("beforeunload", saveSocial);

const relKey = (a, b) => [a, b].sort().join("|");
// a pair that never met gets a small, stable affinity
export function rel(a, b) { const k = relKey(a, b); if (social.rel[k] === undefined) social.rel[k] = hash(k) % 21 - 5; return social.rel[k]; }
export function relAdd(a, b, d) { if (!a || !b || a === b) return; social.rel[relKey(a, b)] = Math.max(-100, Math.min(100, rel(a, b) + d)); }
const REL_LEVELS = [[-60, "Ennemi juré", "#ff6b6b"], [-20, "Tendu", "#ff9f43"], [15, "Connaissance", "#9aa3b5"], [40, "Copain", "#a9e34b"], [70, "Ami", "#51cf66"], [101, "Meilleur ami", "#ff6b9a"]];
export const relLevel = v => REL_LEVELS.find(([max]) => v < max);
// cooking skill: levels 1-10 from the dishes cooked; the devs start with a little experience, the chief from scratch
const COOK_XP = [0, 2, 5, 9, 14, 20, 27, 35, 44, 54];
export const cookXp = n => social.cook[n] ?? (n === CHIEF_NAME ? 0 : hash(`${n}:cook`) % 10);
export const cookLevel = n => COOK_XP.filter(x => cookXp(n) >= x).length;
const everyone = () => [CHIEF_NAME, ...TEAM];

/* ---------- the Sims window: relationships and cooking skill of the shown sim ---------- */
export function simSocialHtml(name) {
  const rels = everyone().filter(o => o !== name).map(o => [o, rel(name, o)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
  const lvl = cookLevel(name), next = COOK_XP[lvl], cur = COOK_XP[lvl - 1], k = next === undefined ? 1 : (cookXp(name) - cur) / (next - cur);
  return `<div class="social">${workSkillsHtml(name)}<div class="skill"><span class="ic">🍳</span><span class="nl">CUISINE</span><span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < lvl ? "on" : i === lvl ? "part" : ""}"${i === lvl ? ` style="--k:${Math.round(k * 100)}%"` : ""}></i>`).join("")}</span><span class="lv">niv. ${lvl}</span></div>
    <div class="rels">${rels.map(([o, r]) => { const [, label, col] = relLevel(r); return `<button data-sim="${esc(o)}" title="${esc(o)} · ${esc(label)} (${r})"><span class="pf">${hub.simPortrait(o)}</span><span class="rn">${esc(o)}<small style="color:${col}">${esc(label)}</small></span><span class="rbar"><i style="left:${r < 0 ? 50 + r / 2 : 50}%;width:${Math.abs(r) / 2}%;background:${col}"></i></span></button>`; }).join("")}</div></div>`;
}
// the side panel of a dev: the chief's relationship and the dev's best friend
function mateSocialHtml(name) {
  const r = rel(CHIEF_NAME, name), [, label, col] = relLevel(r);
  const best = TEAM.filter(o => o !== name).map(o => [o, rel(name, o)]).sort((a, b) => b[1] - a[1])[0];
  return `<p class="muted">Avec toi : <b style="color:${col}">${esc(label)}</b> (${r}) · meilleur pote : ${esc(best[0])} (${esc(relLevel(best[1])[1].toLowerCase())}) · 🍳 cuisine niv. ${cookLevel(name)}</p>`;
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get mateSocialHtml() { return mateSocialHtml; }, get rel() { return rel; }, get relAdd() { return relAdd; } });
