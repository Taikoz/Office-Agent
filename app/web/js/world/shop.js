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
  // the chief's clothes (theme: the buy mode's 🎭 Thèmes): chief: what it changes on his look (its first key tells if it is worn)
  { id: "hat:wizard", name: "Chapeaux pointus pour l'équipe", price: 1500, desc: "Toute l'équipe coiffée d'un chapeau de sorcier.", hat: true, theme: "magie", icon: "🎩" },
  { id: "chief:robe", name: "Robe de sorcier", price: 1500, desc: `Pour ${CHIEF_NAME} : une longue robe nuit, liseré et fermoir dorés (couleurs dans « Créer ton chef »).`, chief: { outfit: "robe", shirt: "#2a2350", tie: "#d4a640" }, theme: "magie", icon: "🧙" },
  { id: "chief:wizard", name: "Chapeau pointu", price: 900, desc: `Pour ${CHIEF_NAME} : large bord, ruban doré, pointe pliée, une étoile.`, chief: { hat: "wizard" }, theme: "magie", icon: "🎩" },
  { id: "chief:scarf", name: "Écharpe rayée", price: 400, desc: `Pour ${CHIEF_NAME} : quatre coloris de maison au choix dans « Créer ton chef ».`, chief: { scarf: "#8f2b2b,#d4a640" }, theme: "magie", icon: "🧣" },
  { id: "hat:visor", name: "Visières holo pour l'équipe", price: 1500, desc: "Toute l'équipe en visière holographique cyan.", hat: true, theme: "scifi", icon: "🥽" },
  { id: "chief:flight", name: "Combinaison spatiale", price: 1800, desc: `Pour ${CHIEF_NAME} : d'une pièce, panneau de poitrine lumineux, bandes de couleur (réglables dans « Créer ton chef »).`, chief: { outfit: "flight", shirt: "#e6e8ee", tie: "#00e5ff" }, theme: "scifi", icon: "👨‍🚀" },
  { id: "chief:helmet", name: "Casque d'astronaute", price: 1200, desc: `Pour ${CHIEF_NAME} : une bulle de verre sur un col d'acier.`, chief: { hat: "helmet" }, theme: "scifi", icon: "🪖" },
  { id: "chief:visor", name: "Visière holo", price: 700, desc: `Pour ${CHIEF_NAME} : un bandeau de lumière cyan devant les yeux.`, chief: { hat: "visor" }, theme: "scifi", icon: "🥽" },
  { id: "chief:jetpack", name: "Jetpack", price: 1600, desc: `Pour ${CHIEF_NAME} : deux réservoirs sur le dos ; des flammes sous lui quand il marche.`, chief: { jetpack: "1" }, theme: "scifi", icon: "🚀" },
  { id: "hat:tophat", name: "Hauts-de-forme pour l'équipe", price: 1300, desc: "Toute l'équipe en haut-de-forme noir à ruban rouge.", hat: true, theme: "manoir", icon: "🎩" },
  { id: "chief:vampire", name: "Cape de vampire", price: 1600, desc: `Pour ${CHIEF_NAME} : un habit noir, un jabot, une grande cape au col montant doublée de rouge (couleurs dans « Créer ton chef »).`, chief: { outfit: "vampire", shirt: "#1c1c24", tie: "#8f1f2a" }, theme: "manoir", icon: "🧛" },
  { id: "chief:tophat", name: "Haut-de-forme", price: 800, desc: `Pour ${CHIEF_NAME} : soie noire, ruban rouge sang.`, chief: { hat: "tophat" }, theme: "manoir", icon: "🎩" },
  { id: "hat:tricorne", name: "Tricornes pour l'équipe", price: 1300, desc: "Tout l'équipage en tricorne noir galonné d'or.", hat: true, theme: "pirate", icon: "🏴‍☠️" },
  { id: "chief:pirate", name: "Habit de capitaine", price: 1700, desc: `Pour ${CHIEF_NAME} : une longue redingote à boutons d'or, une chemise à jabot, une ceinture de flanelle (couleurs dans « Créer ton chef »).`, chief: { outfit: "pirate", shirt: "#1e2a4a", tie: "#8f1f2a" }, theme: "pirate", icon: "🧥" },
  { id: "chief:tricorne", name: "Tricorne de capitaine", price: 900, desc: `Pour ${CHIEF_NAME} : feutre noir, galon d'or, une tête de mort sur le devant.`, chief: { hat: "tricorne" }, theme: "pirate", icon: "🏴‍☠️" },
  { id: "chief:patch", name: "Bandeau sur l'œil", price: 300, desc: `Pour ${CHIEF_NAME} : un cache-œil de cuir noir (il voit très bien des deux yeux, c'est pour le style).`, chief: { glasses: "patch" }, theme: "pirate", icon: "🏴‍☠️" },
  { id: "chief:parrot", name: "Perroquet d'épaule", price: 1200, desc: `Pour ${CHIEF_NAME} : un ara rouge perché sur son épaule, qui le suit partout.`, chief: { parrot: "1" }, theme: "pirate", icon: "🦜" },
  { id: "hat:hachimaki", name: "Hachimaki pour l'équipe", price: 900, desc: "Toute l'équipe ceinte du bandeau blanc au soleil rouge : on ne lâche rien.", hat: true, theme: "japon", icon: "🎌" },
  { id: "chief:kimono", name: "Kimono", price: 1600, desc: `Pour ${CHIEF_NAME} : un kimono long aux cols croisés et sa ceinture obi (couleurs dans « Créer ton chef »).`, chief: { outfit: "kimono", shirt: "#22336a", tie: "#c9a040" }, theme: "japon", icon: "👘" },
  { id: "chief:kasa", name: "Chapeau kasa", price: 700, desc: `Pour ${CHIEF_NAME} : un chapeau conique de paille tressée, noué sous le menton.`, chief: { hat: "kasa" }, theme: "japon", icon: "👒" },
  { id: "chief:katana", name: "Katana", price: 1400, desc: `Pour ${CHIEF_NAME} : un sabre au fourreau de laque noire, sa poignée tressée de rouge, à la hanche.`, chief: { katana: "1" }, theme: "japon", icon: "🗡️" },
  { id: "hat:straw", name: "Chapeaux de paille pour l'équipe", price: 900, desc: "Toute l'équipe en chapeau de paille à ruban rouge : c'est l'été.", hat: true, theme: "plage", icon: "👒" },
  { id: "chief:hawaii", name: "Chemise hawaïenne", price: 900, desc: `Pour ${CHIEF_NAME} : col ouvert, fleurs d'hibiscus (couleurs dans « Créer ton chef »).`, chief: { outfit: "hawaii", shirt: "#3ab8d8", tie: "#ff6a8a" }, theme: "plage", icon: "🌺" },
  { id: "chief:straw", name: "Chapeau de paille", price: 500, desc: `Pour ${CHIEF_NAME} : un panama de paille, un ruban rouge.`, chief: { hat: "straw" }, theme: "plage", icon: "👒" },
  { id: "chief:lei", name: "Collier de fleurs", price: 400, desc: `Pour ${CHIEF_NAME} : un lei hawaïen de fleurs roses, jaunes et blanches.`, chief: { lei: "1" }, theme: "plage", icon: "🌸" },
  { id: "chief:wand", name: "Baguette magique", price: 600, desc: `Pour ${CHIEF_NAME} : en bois de houx, une étincelle au bout. Il la lève en dirigeant l'équipe.`, chief: { wand: "1" }, theme: "magie", icon: "🪄" },
];
const CHIEF_OFF = { outfit: "tux", hat: "", scarf: "", wand: "", jetpack: "", glasses: "", parrot: "", katana: "", lei: "" };  // taken off: back to the default
const chiefWorn = it => { const [k, v] = Object.entries(it.chief)[0]; return hub.CHIEF_LOOK?.[k] === v || (k === "scarf" && !!hub.CHIEF_LOOK?.scarf); };
const earnedXp = () => hub.game ? Object.values(hub.game.xp || {}).reduce((n, g) => n + (g.xp || 0), 0) : null;
const has = id => shop.owned.includes(id) && !shop.off.includes(id);
export function shopAction(act, id) {
  const it = SHOP.find(i => i.id === id); if (!it) return;
  if (act === "buy") {
    if (shop.owned.includes(id) || !hub.spend(it.price, it.name)) return;
    shop.owned.push(id); hub.sfx("achievement"); hub.toast("BOUTIQUE", `${it.name} acheté`, `−${hub.fmtSim(it.price)}`);
    if (it.hat) shop.hat = id.slice(4);
    if (id === "crown") shop.crown = true;
    if (it.chief) hub.wearChief(it.chief);
  } else if (act === "toggle") {
    if (it.chief) { const [k] = Object.keys(it.chief); hub.wearChief(chiefWorn(it) ? { [k]: CHIEF_OFF[k] } : it.chief); }
    else if (it.hat) shop.hat = shop.hat === id.slice(4) ? "" : id.slice(4);
    else if (id === "crown") shop.crown = !shop.crown;
    else shop.off = shop.off.includes(id) ? shop.off.filter(x => x !== id) : [...shop.off, id];
    if (id === "jukebox" && !has("jukebox")) jukebox.playing = false;
  }
  SaveSlot.get("office-shop").save(shop); renderShop();
}
export function itemOn(it) { return it.chief ? chiefWorn(it) : it.hat ? shop.hat === it.id.slice(4) : it.id === "crown" ? shop.crown : has(it.id); }
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
