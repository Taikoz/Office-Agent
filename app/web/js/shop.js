"use strict";
// Shop (decor and hats bought with the household funds, money.js) and kudos.

/* shop: spend the household funds (§, earned by the missions, money.js) on decor and hats */
let shop = store("office-shop", { spent: 0, owned: [], off: [], hat: "", crown: false });
const SHOP = [
  { id: "hat:cap", name: "Casquette de l'équipe", price: 1000, desc: "Pour toute l'équipe.", hat: true },
  { id: "hat:beanie", name: "Bonnet", price: 750, desc: "Pour toute l'équipe.", hat: true },
  { id: "hat:party", name: "Chapeau de fête", price: 1250, desc: "Pour toute l'équipe.", hat: true },
  { id: "crown", name: "Couronne du chef", price: 2500, desc: `Pour ${CHIEF_NAME}.` },
];
const earnedXp = () => game ? Object.values(game.xp || {}).reduce((n, g) => n + (g.xp || 0), 0) : null;
const has = id => shop.owned.includes(id) && !shop.off.includes(id);
function shopAction(act, id) {
  const it = SHOP.find(i => i.id === id); if (!it) return;
  if (act === "buy") {
    if (shop.owned.includes(id) || !spend(it.price, it.name)) return;
    shop.owned.push(id); sfx("achievement"); toast("BOUTIQUE", `${it.name} acheté`, `−${fmtSim(it.price)}`);
    if (it.hat) shop.hat = id.slice(4);
    if (id === "crown") shop.crown = true;
  } else if (act === "toggle") {
    if (it.hat) shop.hat = shop.hat === id.slice(4) ? "" : id.slice(4);
    else if (id === "crown") shop.crown = !shop.crown;
    else shop.off = shop.off.includes(id) ? shop.off.filter(x => x !== id) : [...shop.off, id];
    if (id === "jukebox" && !has("jukebox")) jukebox.playing = false;
  }
  save("office-shop", shop); renderShop();
}
function itemOn(it) { return it.hat ? shop.hat === it.id.slice(4) : it.id === "crown" ? shop.crown : has(it.id); }
function renderShop() {
  const bal = wallet.funds;
  document.getElementById("p-game").innerHTML = `<div class="emp">Argent du foyer : <b>${fmtSim(bal)}</b> <span class="muted">(chaque mission livrée rapporte un salaire, d'autant plus gros qu'elle est complexe)</span></div>`
    + SHOP.map(it => { const own = shop.owned.includes(it.id);
      return `<div class="mate" style="--c:${own ? "#51cf66" : "#11379e"}"><div class="top"><b>${esc(it.name)}</b><span class="muted">${fmtSim(it.price)}</span></div>
        <div class="muted">${esc(it.desc)}</div><div class="acts">${own ? `<button data-shop="toggle" data-id="${it.id}">${itemOn(it) ? "✓ Activé — retirer" : "Activer"}</button>`
        : `<button data-shop="buy" data-id="${it.id}"${bal < it.price ? " disabled" : ""}>Acheter</button>`}</div></div>`; }).join("");
}
document.getElementById("p-game").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-shop]"); if (b && selected === "shop") shopAction(b.dataset.shop, b.dataset.id);
});
const jukebox = { playing: false, i: 0, timer: null };
const TUNE = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
function toggleJukebox() {
  jukebox.playing = !jukebox.playing; clearInterval(jukebox.timer);
  if (!jukebox.playing) return;
  if (!soundOn) toast("JUKEBOX", "La musique tourne en silence", "Active ♪ SON pour l'entendre.");
  jukebox.timer = setInterval(() => {
    if (!jukebox.playing || !soundOn) return;
    try {
      audio = audio || new AudioContext();
      const o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + 0.01, f = TUNE[jukebox.i++ % TUNE.length];
      o.type = "triangle"; o.frequency.value = f; g.gain.setValueAtTime(0.025, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      o.connect(g).connect(audio.destination); o.start(at); o.stop(at + 0.24);
    } catch (_) { /* audio unavailable */ }
  }, 260);
}

/* kudos: one star at a time, the most starred of the day is the crush of the day */
let kudos = store("office-kudos", { day: today(), counts: {}, total: {} });
function giveKudos(name) {
  if (kudos.day !== today()) kudos = { day: today(), counts: {}, total: kudos.total };
  const before = crushOfDay();
  kudos.counts[name] = (kudos.counts[name] || 0) + 1; kudos.total[name] = (kudos.total[name] || 0) + 1; save("office-kudos", kudos);
  crewAdd(name, { moral: 5 }); loungeSay(name, "Merci pour le kudos ! ⭐");
  const e = [...ents.values()].find(x => x.who === name && x.seated); if (e) { e.fxKind = "verify"; e.fxMsg = "⭐ Kudos !"; e.fxUntil = performance.now() + 2600; }
  sfx("commit");
  const after = crushOfDay(); if (after && after !== before) toast("COUP DE CŒUR DU JOUR", after, `${kudos.counts[after]} kudos aujourd'hui`);
}
function crushOfDay() {
  if (kudos.day !== today()) return null;
  const best = Object.entries(kudos.counts).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}
function nameTag(name) {
  const n = kudos.day === today() ? kudos.counts[name] || 0 : 0;
  return `${champion() === name ? "🏆 " : ""}${crushOfDay() === name ? "♥ " : ""}${name}${n ? ` ★${n}` : ""}`;
}
