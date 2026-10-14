"use strict";
// Shop (decor and hats bought with XP) and kudos.

/* shop: spend the XP earned by the real agents on decor and hats */
let shop = store("office-shop", { spent: 0, owned: [], off: [], hat: "", crown: false });
const SHOP = [
  { id: "lamp", name: "Lampe à pied", price: 150, desc: "S'allume le soir, lumière chaude." },
  { id: "aquarium", name: "Aquarium", price: 300, desc: "Trois poissons. Clique pour les nourrir." },
  { id: "jukebox", name: "Jukebox", price: 400, desc: "Clique pour lancer la musique (son ON)." },
  { id: "rug", name: "Grand tapis", price: 120, desc: "Sous le podium, marine à liseré jaune." },
  { id: "bigplant", name: "Plante géante", price: 60, desc: "Près de l'armoire MMX." },
  { id: "poster", name: "Poster", price: 80, desc: "À côté de la porte de la salle de repos." },
  { id: "hat:cap", name: "Casquette de l'équipe", price: 200, desc: "Pour toute l'équipe.", hat: true },
  { id: "hat:beanie", name: "Bonnet", price: 150, desc: "Pour toute l'équipe.", hat: true },
  { id: "hat:party", name: "Chapeau de fête", price: 250, desc: "Pour toute l'équipe.", hat: true },
  { id: "crown", name: "Couronne du chef", price: 500, desc: `Pour ${CHIEF_NAME}.` },
];
const earnedXp = () => game ? Object.values(game.xp || {}).reduce((n, g) => n + (g.xp || 0), 0) : null;
const has = id => shop.owned.includes(id) && !shop.off.includes(id);
function shopAction(act, id) {
  const it = SHOP.find(i => i.id === id); if (!it) return;
  if (act === "buy") {
    const bal = (earnedXp() ?? 0) - shop.spent;
    if (shop.owned.includes(id) || bal < it.price) return;
    shop.spent += it.price; shop.owned.push(id); sfx("achievement"); toast("BOUTIQUE", `${it.name} acheté`, `−${it.price} XP`);
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
  const earned = earnedXp(), bal = earned === null ? null : earned - shop.spent;
  document.getElementById("p-game").innerHTML = `<div class="emp">Solde : <b>${bal === null ? "…" : `${bal} XP`}</b> <span class="muted">(${earned ?? "…"} gagnés par les agents, ${shop.spent} dépensés)</span></div>`
    + SHOP.map(it => { const own = shop.owned.includes(it.id);
      return `<div class="mate" style="--c:${own ? "#51cf66" : "#11379e"}"><div class="top"><b>${esc(it.name)}</b><span class="muted">${it.price} XP</span></div>
        <div class="muted">${esc(it.desc)}</div><div class="acts">${own ? `<button data-shop="toggle" data-id="${it.id}">${itemOn(it) ? "✓ Activé — retirer" : "Activer"}</button>`
        : `<button data-shop="buy" data-id="${it.id}"${bal === null || bal < it.price ? " disabled" : ""}>Acheter</button>`}</div></div>`; }).join("");
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
const fishFood = [];
function drawShopItems(t) {
  const h = new Date().getHours(), night = h < 8 || h > 18;
  if (has("rug")) art("shoprug", 150, 100, 150, 12, SHOP_RUG_ART, { outline: false });
  if (has("poster")) art("poster", 385, 24, 13, 18, POSTER_ART);
  if (has("lamp")) {
    if (night) { ctx.globalAlpha = 0.18; px(206, 22, 26, 50, "#fbaa08"); ctx.globalAlpha = 1; }
    art(`lamp:${night}`, 213, 22, 11, 46, () => lampArt(night));
  }
  if (has("aquarium")) {
    art("aquarium", 235, 49, 26, 19, AQUARIUM_ART);
    for (let k = 0; k < 3; k++) {
      const period = 16 * 2, u = (t / (40 + k * 17) + k * 7) % period, back = u > 16, fx = 239 + (back ? period - u : u);
      const fy = 52 + k * 2.4 + Math.sin(t / 500 + k) * 0.8 - (fishFood.length ? 1.5 : 0), col = ["#ff8f6b", "#fbaa08", "#ff6b6b"][k];
      art(`fish:${col}`, fx, fy, 4.4, 2.4, () => fishArt(col), { outline: false, flip: !back });
    }
    for (let i = fishFood.length - 1; i >= 0; i--) { const f = fishFood[i]; f.y += 0.02 * 16; px(f.x, f.y, 0.8, 0.8, "#c9a24b"); if (f.y > 58) fishFood.splice(i, 1); }
    if (Math.floor(t / 900) % 3 === 0) px(250 + Math.sin(t / 300), 50 + ((t / 100) % 8), 0.8, 0.8, "#d5eeff");
  }
  if (has("jukebox")) {
    const light = jukebox.playing ? Math.floor(t / 300) % 3 : 3;
    art(`jukebox:${light}`, 262, 46, 16, 22, () => jukeboxArt(light));
    if (jukebox.playing) for (let k = 0; k < 2; k++) { const p = ((t / 1400) + k / 2) % 1; ctx.globalAlpha = 1 - p; text("♪", 270 + k * 6 + Math.sin(p * 6) * 2, 44 - p * 14, "#fbaa08", 5); ctx.globalAlpha = 1; }
  }
  if (has("bigplant")) art("bigplant", 376, 192, 16, 24, BIGPLANT_ART);
}
function hitShop(x, y) {
  if (has("jukebox") && x >= 260 && x <= 280 && y >= 44 && y <= 68) return "jukebox";
  if (has("aquarium") && x >= 234 && x <= 262 && y >= 48 && y <= 68) return "aquarium";
  return null;
}
function feedFish() { for (let k = 0; k < 6; k++) fishFood.push({ x: 240 + Math.random() * 16, y: 50 }); sfx("commit"); }

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
