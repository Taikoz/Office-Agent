// Comfort: keyboard shortcuts and their help (?), focus mode (no ambient animation), seasonal decor.

import { hub, provide } from "../hub.js";
import { W, booted, chief, ents, px } from "../core/core.js";
import { Flag } from "../save/flag.js";
import { ART } from "../svg/base.js";
import { view } from "../world/lounge.js";
import { particles, toast } from "../sims/progress.js";
import { openOverlay } from "../agents/insight.js";

/* focus mode: only what the work says — no cat, weather, particles, coffee walks, stand-ups or chatter */
export let focusMode = false;
const focusFlag = new Flag("office-focus");
focusMode = focusFlag.on;
function renderFocusBtn() {
  const b = document.getElementById("focusbtn");
  b.innerHTML = `🎯<span class="lbl"> FOCUS : ${focusMode ? "ON" : "OFF"}</span>`;
  b.classList.toggle("on", focusMode);
}
function toggleFocus() {
  focusMode = !focusMode;
  focusFlag.set(focusMode);
  renderFocusBtn();
  if (focusMode) { particles.length = 0; hub.cake = null; for (const e of ents.values()) if (e.standup && !e.leaving) hub.standupBack(e); hub.standup.on = false; }
  toast("FOCUS", focusMode ? "Activé" : "Désactivé", focusMode ? "Plus d'animations d'ambiance : seulement l'activité des agents." : "Le bureau reprend vie.");
}
document.getElementById("focusbtn").onclick = toggleFocus;
renderFocusBtn();

/* keyboard shortcuts (ignored while typing or during a mini-game) */
const SHORTCUTS = [
  ["?", "cette aide"], ["A", "aller à la question en attente"], ["M", "mur de toutes les sessions"],
  ["S", "statistiques"], ["R", "rapport du jour"], ["J", "journal des réponses"], ["/", "recherche"], ["L", "salle de repos"],
  ["B", "besoins façon Sims"], ["E", "émotions (losanges au-dessus des têtes)"], ["F", "mode focus"], ["Échap", "fermer"],
];
document.getElementById("help-body").innerHTML = `<table>${SHORTCUTS.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join("")}</table>
  <p class="muted">Astuces : glisse un ticket du tableau sur un bureau libre pour lancer un agent ; clic sur un ticket = son historique ; Maj + souris = laser pour Brume.</p>`;
document.getElementById("help-close").onclick = () => openOverlay("help", false);
document.getElementById("helpbtn").onclick = () => openOverlay("help", document.getElementById("help").hidden);
addEventListener("keydown", ev => {
  if (!booted || view === "game" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.target.closest?.("input, textarea, select, [contenteditable]")) return;
  const k = ev.key, click = id => document.getElementById(id).click();
  const actions = {
    "?": () => openOverlay("help", document.getElementById("help").hidden),
    a: () => click("qbadge"), m: () => click("wallbtn"), s: () => click("perfbtn"), r: () => click("reportbtn"),
    j: () => click("answersbtn"), "/": () => click("searchbtn"), l: () => click("loungebtn"), f: toggleFocus, e: hub.toggleEmotions, b: () => hub.toggleSims(),
  };
  const f = actions[k.toLowerCase?.() === k ? k : k.toLowerCase()];
  if (f) { ev.preventDefault(); f(); }
});
// Échap: the open overlay first (help, report, wall, log, search)
function closeOverlays() {
  const open = [...document.querySelectorAll(".overlay")].some(o => !o.hidden);
  if (open) openOverlay("none", false);
  return open;
}

/* seasonal decor, from the date (preview: ?season=halloween|noel|galette) */
function season() {
  const forced = new URLSearchParams(location.search).get("season");
  if (forced) return forced;
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  if ((m === 10 && day >= 20) || (m === 11 && day === 1)) return "halloween";
  if (m === 12 || (m === 1 && day <= 6)) return "noel";
  if (m === 1) return "galette";
  return null;
}
function drawSeason(t) {
  const s = season();
  if (s === "halloween") {
    for (const [x, y] of [[432, 60], [274, 84], [30, 282]]) {  // pumpkins, lit inside
      const glow = Math.floor(t / 400 + x) % 3 ? 1 : 0;
      ART.pumpkin.draw(x - 5, y - 7, { glow: !!glow });
    }
    ART.cobweb.draw(0, 0);
    ART.cobweb.draw(W - 14, 0, {}, { flip: true });
  } else if (s === "noel") {
    const blink = Math.floor(t / 400) % 2;
    ART.tree.draw(426, 36, { blink });
    for (let i = 0; i < 10; i++) px(372 + i * 5, 7 + (i % 2), 3, 1.2, i % 2 ? "#ff6b6b" : "#51cf66");  // garland over the window
    for (let i = 0; i < 26; i++) px((i * 23 + t / 60) % 560, (i * 37 + t / 40) % 66, 0.8, 0.8, "#ffffff");  // snow in the room's top
  } else if (s === "galette") {
    ART.galette.draw(265, 76.4);
  }
}
// drawn over the people: the Halloween bat, the chief's crown for the galette
export function drawSeasonOver(t) {
  const s = focusMode ? null : season();
  if (s === "halloween") {
    const bx = ((t / 30) % (W + 40)) - 20, by = 30 + Math.sin(t / 300) * 6, up = Math.floor(t / 120) % 2;
    ART.bat.draw(bx - 4, by - 1, { up: !!up });
  } else if (s === "galette") {
    ART.crown.draw(chief.x - 3, chief.y - 28);
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get closeOverlays() { return closeOverlays; }, get drawSeason() { return drawSeason; }, get focusMode() { return focusMode; } });
