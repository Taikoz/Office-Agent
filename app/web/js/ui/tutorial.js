// The tutorial of a new game: a card over the office that walks through the first steps (the buy mode, a desk, its
// computer, a chair, coffee, the break room, the needs, the weekly challenges). Each step moves on by itself once
// done; the button it is about glows. It starts on a new game (nothing bought yet), and again from the menu.

import { hub } from "../hub.js";
import { COFFEE, DESKS } from "../core/core.js";
import { Flag } from "../save/flag.js";

const STEPS = [
  { title: "Bienvenue dans ton bureau 👑", text: "Tu es le chef. Chaque agent Claude Code qui travaille devient un dev de ton équipe, à son bureau. Ta partie commence avec 25 000 § et des pièces vides : à toi de les aménager.", next: true },
  { title: "Ouvre le mode achat", text: "Clique sur 🛒 ACHAT en bas à droite : tout s'y achète, des bureaux aux néons.", target: "#buybtn", done: () => hub.buy?.on },
  { title: "Achète un bureau", text: "Catégorie 🗄️ Bureaux : choisis un modèle, puis « Placer » et clique sur le sol. R pour le tourner.", target: "#buy .bcats", done: () => DESKS.some(d => !d.floor) },
  { title: "Pose un ordinateur dessus", text: "Catégorie 🖥️ Électronique : un ordinateur se pose sur le plateau d'un bureau. Son écran montrera le travail du dev.", target: "#buy .bcats", done: () => (hub.itemsIn?.("office") || []).some(it => it.on_ && hub.GAME_OF?.[it.type]) },
  { title: "Une chaise devant", text: "Catégorie 🪑 Chaises : pose-la devant le bureau, elle se tourne toute seule et le dev s'y assoit.", target: "#buy .bcats", done: () => DESKS.some(d => d.chair) },
  { title: "Du café pour l'équipe", text: "Catégorie ☕ Café : sans machine, pas de pause café. Les meilleures machines font plus de bien.", target: "#buy .bcats", done: () => COFFEE.ok },
  { title: "Aménage la salle de repos", text: "Onglet ☕ Repos en haut du mode achat : un canapé, des poufs, un jeu… Les devs libres y vont d'eux-mêmes selon leurs besoins.", target: "#buy .tabs", done: () => (hub.itemsIn?.("lounge") || []).some(it => hub.defOf(it.type).act) },
  { title: "Les besoins de l'équipe", text: "Ferme le mode achat. En bas à gauche, ton foyer : clique sur un portrait pour voir ses besoins (faim, énergie, fun, social, café).", target: "#live .household", done: () => hub.simsOpen },
  { title: "Les défis de la semaine", text: "À droite, sous les quêtes du jour : trois défis par semaine qui rapportent des § et des étoiles. Les étoiles montent le niveau du bureau et débloquent les objets de luxe.", target: "#weekly", next: true },
  { title: "À toi de jouer 🎉", text: "Agrandis les pièces, construis la terrasse, la salle de sport, la bibliothèque (🏗️ Construction). Le tutoriel se relance depuis le menu.", next: true, last: true },
];
const flag = new Flag("office-tutorial-done");
let step = -1, box = null, lit = null;
function show() {
  if (lit) { lit.classList.remove("tuto-hl"); lit = null; }
  if (step < 0 || step >= STEPS.length) { if (box) box.hidden = true; return; }
  const s = STEPS[step];
  if (!box) {
    box = document.createElement("section"); box.id = "tuto"; box.setAttribute("role", "dialog"); box.setAttribute("aria-live", "polite"); document.body.append(box);
    box.addEventListener("click", ev => { const b = ev.target.closest("[data-tuto]"); if (!b) return; if (b.dataset.tuto === "skip") stop(); else advance(); });
  }
  box.hidden = false;
  box.innerHTML = `<span class="n">${step + 1}/${STEPS.length}</span><b>${s.title}</b><p>${s.text}</p>
    <div class="acts"><button data-tuto="skip">${s.last ? "Fermer" : "Passer le tutoriel"}</button>${s.next ? `<button data-tuto="next" class="go">${s.last ? "Terminer" : "Suivant"}</button>` : `<span class="wait">En attente…</span>`}</div>`;
  if (s.target) { lit = document.querySelector(s.target); lit?.classList.add("tuto-hl"); }
}
function advance() { step++; if (step >= STEPS.length) return stop(); show(); }
function stop() { step = -1; flag.set(true); show(); }
export function startTutorial() { step = 0; show(); }
// a step done moves on (and the glow follows its button, which may appear later: the buy mode's categories)
setInterval(() => {
  if (step < 0) return;
  const s = STEPS[step];
  if (s.done?.()) { hub.sfx?.("commit"); advance(); return; }
  if (s.target && !lit?.isConnected) { lit = document.querySelector(s.target); lit?.classList.add("tuto-hl"); }
}, 600);
// a new game (nothing bought, not in the demo): it starts by itself
// (after the first-run screen that names the team, core/setup.js: it waits until that one is closed)
const autoStart = setInterval(() => {
  if (typeof DEMO !== "undefined" && DEMO) return clearInterval(autoStart);
  if (!document.getElementById("setup")?.hidden) return;
  clearInterval(autoStart);
  if (!flag.on && !["office", "lounge"].some(r => (hub.itemsIn?.(r) || []).length)) startTutorial();
}, 2500);
document.getElementById("tutobtn")?.addEventListener("click", () => startTutorial());
