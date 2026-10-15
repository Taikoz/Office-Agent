"use strict";
// Sims-style HUD over the full-screen office: your sim (the chief) and his action queue bottom-left, the day, the hour,
// the sun and the moon bottom-center, the round needs button bottom-right; the options in a drop-down menu at the top,
// the missions in a panel that folds away on the right.

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
const pref = (key, dflt) => { try { const v = localStorage.getItem(key); return v === null ? dflt : v === "1"; } catch (_) { return dflt; } };
const keep = (key, on) => { try { localStorage.setItem(key, on ? "1" : "0"); } catch (_) { /* kept for this page only */ } };
function toggleSide(open = document.body.classList.contains("side-off")) {
  document.body.classList.toggle("side-off", !open); sideBtn.classList.toggle("on", open); sideBtn.setAttribute("aria-expanded", open);
  keep("office-side", open);
}
function toggleTimeline(open = !document.body.classList.contains("tl-on")) {
  document.body.classList.toggle("tl-on", open); tlBtn.classList.toggle("on", open); keep("office-timeline", open);
  if (open) renderTimeline(curSession());
}
sideBtn.onclick = () => toggleSide();
tlBtn.onclick = () => toggleTimeline();
toggleSide(pref("office-side", false));
toggleTimeline(pref("office-timeline", false));

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
// the sun crosses the dial from 7 h to 20 h, the moon the rest of the time; the sky follows the hour
function dialSvg(d) {
  const h = d.getHours() + d.getMinutes() / 60, day = h >= 7 && h < 20;
  const k = day ? (h - 7) / 13 : ((h + 24 - 20) % 24) / 11, a = Math.PI * (1 - k), x = 32 + Math.cos(a) * 24, y = 30 - Math.sin(a) * 22;
  const sky = h < 6 || h >= 21 ? ["#1d1b33", "#2f2a4d"] : h < 8 ? ["#f39c6b", "#ffd59e"] : h < 18 ? ["#6cb6e8", "#bfe3f7"] : h < 21 ? ["#e8835b", "#7a4f8f"] : ["#1d1b33", "#2f2a4d"];
  const stars = day ? "" : [[10, 8], [22, 4], [44, 6], [54, 12], [16, 16]].map(([sx, sy], i) => `<circle cx="${sx}" cy="${sy}" r=".9" fill="#fff" opacity="${0.4 + (i % 3) * 0.25}"/>`).join("");
  const body = day
    ? `<circle cx="${x}" cy="${y}" r="6.5" fill="#ffd43b" opacity=".35"/><circle cx="${x}" cy="${y}" r="4.6" fill="#ffd43b"/><circle cx="${x - 1.4}" cy="${y - 1.4}" r="1.5" fill="#fff7c2"/>`
    : `<circle cx="${x}" cy="${y}" r="4.4" fill="#f4f1e6"/><circle cx="${x + 2}" cy="${y - 1.2}" r="3.8" fill="${sky[0]}"/>`;
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <clipPath id="dome"><path d="M2 32A30 30 0 0 1 62 32Z"/></clipPath></defs>
    <path d="M2 32A30 30 0 0 1 62 32Z" fill="url(#sky)"/><g clip-path="url(#dome)">${stars}${body}</g>
    <path d="M8 30A24 22 0 0 1 56 30" fill="none" stroke="#fff" stroke-opacity=".25" stroke-dasharray="1.5 2"/>
    <rect x="0" y="30" width="64" height="4" rx="2" fill="#4a7a3a"/>`;
}
let clockMin = -1;
function renderClock() {
  const d = clockNow();  // real clock, or ?hour= / ?day= (days.js)
  if (d.getMinutes() === clockMin) return;
  clockMin = d.getMinutes();
  const h = d.getHours();
  document.getElementById("clock-dial").innerHTML = dialSvg(d);
  document.getElementById("clock-time").textContent = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("clock-day").textContent = `${DAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString("fr-FR", { month: "short" })}`;
  document.getElementById("clock-phase").textContent = h < 6 || h >= 21 ? "🌙 Nuit" : h < 8 ? "🌅 Aube" : h < 12 ? "☀️ Matin" : h < 14 ? "🍽️ Midi" : h < 18 ? "☀️ Après-midi" : "🌇 Soirée";
}
renderClock(); setInterval(renderClock, 5000);

/* ---------- missions count on the toggle ---------- */
setInterval(() => { document.getElementById("sidecount").textContent = document.getElementById("count").textContent; }, 1000);
