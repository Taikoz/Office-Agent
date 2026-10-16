// Sims-style HUD over the full-screen office: your sim (the chief) and his action queue bottom-left, the day, the hour,
// the sun and the moon bottom-center, the round needs button bottom-right; the options in a drop-down menu at the top,
// the missions in a panel that folds away on the right.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief, curSession } from "../core/core.js";
import { Flag } from "../save/flag.js";
import { ART } from "../svg/base.js";
import { lookKey } from "../svg/figures.js";
import { mate, moodWord } from "../sims/crew.js";
import { CHIEF_LOOK } from "../world/chief.js";
import { setView, view } from "../world/lounge.js";
import { esc } from "../core/data.js";
import { actQueue, cancelAction, chiefActivity } from "./actions.js";
import { chiefHat } from "../world/chiefedit.js";
import { clockNow } from "../sims/days.js";
import { moodColor, simPortrait } from "../sims/sims.js";

/* ---------- drop-down menu of options ---------- */
const menuBtn = document.getElementById("menubtn"), menuBox = document.getElementById("tools");
function toggleMenu(open = menuBox.hidden) {
  menuBox.hidden = !open; menuBtn.setAttribute("aria-expanded", open); menuBtn.classList.toggle("on", open);
}
menuBtn.onclick = ev => { ev.stopPropagation(); toggleMenu(); };
menuBox.addEventListener("click", ev => { if (ev.target.closest("button")) toggleMenu(false); });  // an option was picked
document.addEventListener("pointerdown", ev => { if (!menuBox.hidden && !ev.target.closest(".menuwrap")) toggleMenu(false); });
addEventListener("keydown", ev => { if (ev.key === "Escape" && !menuBox.hidden) { ev.stopImmediatePropagation(); toggleMenu(false); menuBtn.focus(); } }, true);

/* ---------- missions panel and timeline, both folding away (remembered in this browser) ---------- */
const sideBtn = document.getElementById("sidebtn"), tlBtn = document.getElementById("tlbtn");
const sideFlag = new Flag("office-side"), timelineFlag = new Flag("office-timeline");
function toggleSide(open = document.body.classList.contains("side-off")) {
  document.body.classList.toggle("side-off", !open); sideBtn.classList.toggle("on", open); sideBtn.setAttribute("aria-expanded", open);
  sideFlag.set(open);
}
function toggleTimeline(open = !document.body.classList.contains("tl-on")) {
  document.body.classList.toggle("tl-on", open); tlBtn.classList.toggle("on", open); timelineFlag.set(open);
  if (open) hub.renderTimeline(curSession());
}
sideBtn.onclick = () => toggleSide();
tlBtn.onclick = () => toggleTimeline();
toggleSide(sideFlag.on);
toggleTimeline(timelineFlag.on);

/* ---------- bottom-left: your sim and its action queue ---------- */
const liveFace = document.getElementById("live-face"), liveQueue = document.getElementById("live-queue");
let liveHtml = "", faceKey = "";
function renderLive() {
  const m = mate(CHIEF_NAME), col = moodColor(m.moral);
  const key = `${col}|${m.moral >= 50}|${lookKey(CHIEF_LOOK)}|${chiefHat()}`;  // the look may change (chiefedit.js)
  if (key !== faceKey) {
    faceKey = key;
    liveFace.innerHTML = `<svg class="crystal" viewBox="0 0 12 20" aria-hidden="true"><path fill="${col}" d="M6 0L11 9L6 20L1 9Z"/><path fill="#fff" fill-opacity=".5" d="M6 0L3.5 9H6Z"/><path fill="#000" fill-opacity=".2" d="M6 20L11 9H6Z"/></svg>${simPortrait(CHIEF_NAME)}`;
    liveFace.style.setProperty("--m", col);
  }
  document.getElementById("live-name").textContent = `${CHIEF_NAME} 👑`;
  const mood = document.getElementById("live-mood");
  mood.textContent = moodWord(m); mood.style.setProperty("--m", col);
  const now = chiefActivity();
  const cur = `<button class="act cur" ${now.id ? `data-cancel="${now.id}" title="${esc(now.label)} — clic pour annuler"` : `title="${esc(now.label)}" disabled`}>
    <span class="ic">${now.icon}</span>${now.id ? '<span class="x">×</span>' : ""}</button><span class="curlbl">${esc(now.label)}</span>`;
  const next = actQueue.map(a => `<button class="act" data-cancel="${a.id}" title="${esc(a.label)} — clic pour annuler"><span class="ic">${a.icon}</span><span class="x">×</span></button>`).join("");
  const html = cur + next;
  if (html !== liveHtml) liveQueue.innerHTML = liveHtml = html;  // rebuilt only when the queue changes: a click in progress is not lost
  liveQueue.querySelector(".cur")?.style.setProperty("--p", `${Math.round((now.progress ?? 0) * 100)}%`);
}
liveQueue.addEventListener("click", ev => { const b = ev.target.closest("[data-cancel]"); if (b) { cancelAction(+b.dataset.cancel); renderLive(); } });
liveFace.onclick = () => { if (view !== "game") setView(chief.room === "lounge" ? "lounge" : "office"); };
setInterval(renderLive, 250);

/* ---------- bottom-center: day, hour, sun and moon (the real clock) ---------- */
const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
let clockMin = -1;
function renderClock() {
  const d = clockNow();  // real clock, or ?hour= / ?day= (days.js)
  if (d.getMinutes() === clockMin) return;
  clockMin = d.getMinutes();
  const h = d.getHours();
  document.getElementById("clock-dial").innerHTML = ART.dial.body(d);
  document.getElementById("clock-time").textContent = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("clock-day").textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString("fr-FR", { month: "short" })}`;
  document.getElementById("clock-phase").textContent = h < 6 || h >= 21 ? "🌙 Nuit" : h < 8 ? "🌅 Aube" : h < 12 ? "☀️ Matin" : h < 14 ? "🍽️ Midi" : h < 18 ? "☀️ Après-midi" : "🌇 Soirée";
}
renderClock(); setInterval(renderClock, 5000);

/* ---------- missions count on the toggle ---------- */
setInterval(() => { document.getElementById("sidecount").textContent = document.getElementById("count").textContent; }, 1000);

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get faceKey() { return faceKey; }, set faceKey(v) { faceKey = v; } });
