// Shop (decor and hats bought with the household funds, money.js) and kudos.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, ents, selected } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crewAdd } from "../sims/crew.js";
import { loungeSay } from "./lounge.js";
import { today } from "./fun.js";

/* shop: spend the household funds (§, earned by the missions, money.js) on decor and hats */
export let shop = new SaveSlot("office-shop", { spent: 0, owned: [], off: [], hat: "", crown: false }).data;
export const SHOP = [
  { id: "hat:cap", name: "Casquette de l'équipe", price: 1000, desc: "Pour toute l'équipe.", hat: true },
  { id: "hat:beanie", name: "Bonnet", price: 750, desc: "Pour toute l'équipe.", hat: true },
  { id: "hat:party", name: "Chapeau de fête", price: 1250, desc: "Pour toute l'équipe.", hat: true },
  { id: "crown", name: "Couronne du chef", price: 2500, desc: `Pour ${CHIEF_NAME}.` },
];
const earnedXp = () => hub.game ? Object.values(hub.game.xp || {}).reduce((n, g) => n + (g.xp || 0), 0) : null;
const has = id => shop.owned.includes(id) && !shop.off.includes(id);
export function shopAction(act, id) {
  const it = SHOP.find(i => i.id === id); if (!it) return;
  if (act === "buy") {
    if (shop.owned.includes(id) || !hub.spend(it.price, it.name)) return;
    shop.owned.push(id); hub.sfx("achievement"); hub.toast("BOUTIQUE", `${it.name} acheté`, `−${hub.fmtSim(it.price)}`);
    if (it.hat) shop.hat = id.slice(4);
    if (id === "crown") shop.crown = true;
  } else if (act === "toggle") {
    if (it.hat) shop.hat = shop.hat === id.slice(4) ? "" : id.slice(4);
    else if (id === "crown") shop.crown = !shop.crown;
    else shop.off = shop.off.includes(id) ? shop.off.filter(x => x !== id) : [...shop.off, id];
    if (id === "jukebox" && !has("jukebox")) jukebox.playing = false;
  }
  SaveSlot.get("office-shop").save(shop); renderShop();
}
export function itemOn(it) { return it.hat ? shop.hat === it.id.slice(4) : it.id === "crown" ? shop.crown : has(it.id); }
export function renderShop() {
  const bal = hub.wallet.funds;
  document.getElementById("p-game").innerHTML = `<div class="emp">Argent du foyer : <b>${hub.fmtSim(bal)}</b> <span class="muted">(chaque mission livrée rapporte un salaire, d'autant plus gros qu'elle est complexe)</span></div>`
    + SHOP.map(it => { const own = shop.owned.includes(it.id);
      return `<div class="mate" style="--c:${own ? "#51cf66" : "#11379e"}"><div class="top"><b>${hub.esc(it.name)}</b><span class="muted">${hub.fmtSim(it.price)}</span></div>
        <div class="muted">${hub.esc(it.desc)}</div><div class="acts">${own ? `<button data-shop="toggle" data-id="${it.id}">${itemOn(it) ? "✓ Activé — retirer" : "Activer"}</button>`
        : `<button data-shop="buy" data-id="${it.id}"${bal < it.price ? " disabled" : ""}>Acheter</button>`}</div></div>`; }).join("");
}
document.getElementById("p-game").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-shop]"); if (b && selected === "shop") shopAction(b.dataset.shop, b.dataset.id);
});
// the jukebox (or a connected speaker): a press plays the first station, the next press the next one, then it stops;
// the music itself is played by world/ambience.js, from where the jukebox stands
export const jukebox = { playing: false, uid: null, type: "jukebox", station: 0 };
export const STATIONS = [{ id: "jazz", name: "🎷 Jazz du bureau" }, { id: "synth", name: "🌆 Synthwave" }, { id: "chip", name: "👾 Chiptune" }];
export function pressJukebox(it) {
  if (jukebox.playing && jukebox.uid === it.uid) { if (++jukebox.station >= STATIONS.length) Object.assign(jukebox, { playing: false, station: 0 }); }
  else Object.assign(jukebox, { playing: true, uid: it.uid, type: it.type, station: 0 });
  if (jukebox.playing && !hub.soundOn) hub.toast("JUKEBOX", "La musique tourne en silence", "Active le son (🔊 en bas à droite) pour l'entendre.");
  return jukebox.playing ? STATIONS[jukebox.station].name : "";
}
export function toggleJukebox() { jukebox.playing = !jukebox.playing; jukebox.station = 0; }

/* kudos: one star at a time, the most starred of the day is the crush of the day */
let kudos = new SaveSlot("office-kudos", { day: today(), counts: {}, total: {} }).data;
function giveKudos(name) {
  if (kudos.day !== today()) kudos = { day: today(), counts: {}, total: kudos.total };
  const before = crushOfDay();
  hub.countWeekly?.("kudos");
  kudos.counts[name] = (kudos.counts[name] || 0) + 1; kudos.total[name] = (kudos.total[name] || 0) + 1; SaveSlot.get("office-kudos").save(kudos);
  crewAdd(name, { moral: 5 }); loungeSay(name, "Merci pour le kudos ! ⭐"); hub.wantEvent(name, "kudos");
  const e = [...ents.values()].find(x => x.who === name && x.seated); if (e) { e.fxKind = "verify"; e.fxMsg = "⭐ Kudos !"; e.fxUntil = performance.now() + 2600; }
  hub.sfx("commit");
  const after = crushOfDay(); if (after && after !== before) hub.toast("COUP DE CŒUR DU JOUR", after, `${kudos.counts[after]} kudos aujourd'hui`);
}
function crushOfDay() {
  if (kudos.day !== today()) return null;
  const best = Object.entries(kudos.counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}
export function nameTag(name) {
  const n = kudos.day === today() ? kudos.counts[name] || 0 : 0;
  return `${hub.champion() === name ? "🏆 " : ""}${crushOfDay() === name ? "♥ " : ""}${name}${n ? ` ★${n}` : ""}`;
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get crushOfDay() { return crushOfDay; }, get giveKudos() { return giveKudos; }, get kudos() { return kudos; }, get nameTag() { return nameTag; }, get shop() { return shop; } });
