// The day in a minute (🎬 TIMELAPSE in the menu): while the office is on screen, a picture of it every 30 s (the three
// layers of the scene, small, in WebP), kept in this browser (IndexedDB, the last 3 days) with the day's events (a
// question, a delivery, an MR, a red CI…: core/notify.js). Played back fast, with the time and the events over it;
// exported as a video (MP4 when the browser can, else WebM) to show at the stand-up or on Slack. In the demo, a picture
// every 2 s, kept in memory only. Nothing leaves the browser.

import { hub } from "../hub.js";
import { cv } from "../core/core.js";
import { esc } from "../core/data.js";
import { toast } from "../sims/progress.js";

const EVERY = DEMO ? 2000 : 30000, KEEP_DAYS = 3, WIDTH = 640;
const dayOf = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/* ---------- storage: IndexedDB (memory in the demo) ---------- */
const mem = { frames: [], events: [] };
let dbp = null;
function db() {
  if (DEMO || !("indexedDB" in window)) return null;
  dbp ||= new Promise(res => {
    const r = indexedDB.open("office-timelapse", 1);
    r.onupgradeneeded = () => { for (const s of ["frames", "events"]) r.result.createObjectStore(s, { autoIncrement: true }).createIndex("day", "day"); };
    r.onsuccess = () => res(r.result); r.onerror = () => res(null);
  });
  return dbp;
}
async function put(store, rec) {
  const d = await db(); if (!d) { mem[store].push(rec); if (store === "frames" && mem.frames.length > 600) mem.frames.shift(); return; }
  try { d.transaction(store, "readwrite").objectStore(store).add(rec); } catch (_) { /* full or closed: this picture is lost */ }
}
async function byDay(store, day) {
  const d = await db(); if (!d) return mem[store].filter(r => r.day === day);
  return new Promise(res => { const r = d.transaction(store).objectStore(store).index("day").getAll(day); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); });
}
async function days() {
  const d = await db(); if (!d) return [...new Set(mem.frames.map(r => r.day))];
  return new Promise(res => { const out = new Set(), r = d.transaction("frames").objectStore("frames").index("day").openKeyCursor(null, "nextunique");
    r.onsuccess = () => { const c = r.result; if (c) { out.add(c.key); c.continue(); } else res([...out]); }; r.onerror = () => res([]); });
}
async function prune() {  // the days older than KEEP_DAYS go
  const d = await db(); if (!d) return;
  const keep = new Set(Array.from({ length: KEEP_DAYS }, (_, i) => dayOf(Date.now() - i * 86400e3)));
  for (const s of ["frames", "events"]) {
    const r = d.transaction(s, "readwrite").objectStore(s).openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) return; if (!keep.has(c.value.day)) c.delete(); c.continue(); };
  }
}
prune(); setInterval(prune, 3600e3);  // a tab left open for days

/* ---------- capture: right after a frame is drawn (main.js), the office on screen ---------- */
const shot = document.createElement("canvas");
let lastShot = 0, shooting = false;
hub.afterFrame = t => {
  if (shooting || t - lastShot < EVERY || document.hidden || hub.view !== "office" || (hub.ISO?.room && hub.ISO.room !== "office")) return;  // our own office only
  lastShot = t;
  const layers = [document.getElementById("c-back"), document.getElementById("c-world"), cv].filter(c => c && c.width && getComputedStyle(c).display !== "none");
  if (!layers.length) return;
  shot.width = WIDTH; shot.height = Math.round(WIDTH * cv.height / cv.width);
  const g = shot.getContext("2d"); g.fillStyle = "#17161d"; g.fillRect(0, 0, shot.width, shot.height);
  for (const c of layers) g.drawImage(c, 0, 0, shot.width, shot.height);  // in the frame's own task: the WebGL layer still holds its picture
  shooting = true;
  shot.toBlob(blob => { shooting = false; if (blob) put("frames", { day: dayOf(Date.now()), t: Date.now(), blob }); }, "image/webp", 0.55);
};
// an event of the day (core/notify.js): shown when the playback passes its time
hub.timelapseEvent = label => put("events", { day: dayOf(Date.now()), t: Date.now(), label });

/* ---------- the player ---------- */
const box = document.createElement("section");
box.id = "timelapse"; box.className = "overlay"; box.hidden = true; box.setAttribute("aria-label", "Timelapse");
box.innerHTML = `<div class="perfhead"><span>🎬 TIMELAPSE <span class="muted" id="tl-info"></span></span>
  <select id="tl-day" aria-label="Jour"></select>
  <button class="x" data-t="play" title="Lecture / pause (Espace)">▶</button><button class="x" data-t="speed" title="Vitesse">×1</button>
  <button class="x" data-t="export" title="Enregistrer la vidéo du jour (moins d'une minute)">🎥 Vidéo</button><button class="x" data-t="close" title="Fermer (Échap)">×</button></div>
  <div class="tl-stage"><canvas id="tl-cv" width="1280" height="720" aria-label="Le bureau en accéléré"></canvas></div>
  <input id="tl-seek" type="range" min="0" max="0" value="0" aria-label="Position">`;
document.querySelector("main").append(box);
const view = box.querySelector("#tl-cv"), info = box.querySelector("#tl-info"), seek = box.querySelector("#tl-seek"), daySel = box.querySelector("#tl-day"), playBtn = box.querySelector("[data-t=play]"), speedBtn = box.querySelector("[data-t=speed]");
let frames = [], events = [], i = 0, playing = false, speed = 1, timer = null, recorder = null;

// a frame on the player's canvas, its size fixed (the recorder needs it): the picture fitted in, the time, the events
let drawSeq = 0;
async function frameAt(k) {
  const f = frames[k]; if (!f) return;
  const my = ++drawSeq, bmp = await createImageBitmap(f.blob).catch(() => null);
  if (my !== drawSeq) { bmp?.close?.(); return; }  // a later frame was asked for meanwhile (seeking)
  const g = view.getContext("2d"), W = view.width, H = view.height;
  g.fillStyle = "#17161d"; g.fillRect(0, 0, W, H);
  if (bmp) { const k2 = Math.min(W / bmp.width, H / bmp.height), w = bmp.width * k2, h = bmp.height * k2; g.imageSmoothingEnabled = false; g.drawImage(bmp, (W - w) / 2, (H - h) / 2, w, h); bmp.close?.(); }
  const time = new Date(f.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  g.font = "bold 64px VT323, monospace"; g.fillStyle = "#081746cc"; g.fillRect(20, H - 96, 210, 76); g.fillStyle = "#fbaa08"; g.fillText(time, 40, H - 38);
  const near = events.filter(e => e.t <= f.t && f.t - e.t < EVERY * 6).slice(-3);
  g.font = "28px Ubuntu, sans-serif";
  near.forEach((e, n) => { const txt = e.label, w = g.measureText(txt).width + 32; g.fillStyle = "#081746dd"; g.fillRect(20, 20 + n * 52, w, 44); g.fillStyle = "#fff"; g.fillText(txt, 36, 52 + n * 52); });
  g.font = "22px VT323, monospace"; g.fillStyle = "#ffffffaa"; g.fillText("AGENT OFFICE", W - 160, H - 24);
  seek.value = k;
}
const fps = () => (recorder ? Math.max(12, frames.length / 55) : 12) * speed;
// one frame after the other, each painted before the next is asked for; at the end, the video is closed
async function step() {
  if (!playing) return;
  if (i >= frames.length - 1) { pause(); if (recorder) setTimeout(() => recorder?.stop(), 400); return; }
  const t0 = performance.now();
  i++; await frameAt(i);
  if (playing) timer = setTimeout(step, Math.max(0, 1000 / fps() - (performance.now() - t0)));
}
function play() { if (!frames.length) return; if (i >= frames.length - 1) i = 0; playing = true; playBtn.textContent = "⏸"; step(); }
function pause() { playing = false; playBtn.textContent = "▶"; clearTimeout(timer); }
// the export stopped before its end (pause, seek, closed, Escape): no video
function cancelExport() { if (!recorder) return; recorder.cancelled = true; recorder.stop(); }
async function load(day) {
  pause(); [frames, events] = await Promise.all([byDay("frames", day), byDay("events", day)]);
  frames.sort((a, b) => a.t - b.t); events.sort((a, b) => a.t - b.t); i = 0; seek.max = Math.max(0, frames.length - 1);
  const span = frames.length ? `${new Date(frames[0].t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → ${new Date(frames.at(-1).t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "";
  info.textContent = frames.length ? `${frames.length} images · ${span} · ${events.length} événements` : "";
  if (frames.length) frameAt(0);
  else { const g = view.getContext("2d"); g.fillStyle = "#17161d"; g.fillRect(0, 0, 1280, 720); g.fillStyle = "#aaa"; g.font = "30px Ubuntu, sans-serif";
    g.fillText("Pas encore d'images pour ce jour.", 60, 330); g.fillText(`Le timelapse se remplit pendant que le bureau est affiché (une image toutes les ${EVERY / 1000} s).`, 60, 380); }
}
export async function openTimelapse() {
  const ds = (await days()).sort().reverse(), today = dayOf(Date.now());
  if (!ds.includes(today)) ds.unshift(today);
  daySel.innerHTML = ds.map(d => `<option value="${d}">${d === today ? "aujourd'hui" : esc(d)}</option>`).join("");
  hub.openOverlay("timelapse", true); await load(daySel.value);
}
daySel.onchange = () => load(daySel.value);
seek.oninput = () => { cancelExport(); pause(); i = +seek.value; frameAt(i); };
box.addEventListener("keydown", ev => { if (ev.key === " " && ev.target.tagName !== "SELECT") { ev.preventDefault(); if (playing) { cancelExport(); pause(); } else play(); } });
// closed any way (×, Escape, another panel opened over it): the playback stops, an export is dropped
new MutationObserver(() => { if (box.hidden) { cancelExport(); pause(); } }).observe(box, { attributes: true, attributeFilter: ["hidden"] });
box.addEventListener("click", ev => {
  const c = ev.target.closest("[data-t]")?.dataset.t; if (!c) return;
  if (c === "close") return hub.openOverlay("timelapse", false);  // the observer below stops the rest
  if (c === "play") { if (playing) { cancelExport(); pause(); } else play(); return; }
  if (c === "speed") { speed = speed >= 4 ? 1 : speed * 2; speedBtn.textContent = `×${speed}`; return; }
  if (c === "export") return exportVideo();
});
// the video: the whole day played once into a recorder, under a minute
function exportVideo() {
  if (!frames.length || recorder) return;
  const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(t => window.MediaRecorder?.isTypeSupported(t));
  if (!type) return toast("🎬 TIMELAPSE", "Vidéo impossible", "Ce navigateur ne sait pas enregistrer une vidéo.");
  const chunks = [], ext = type.startsWith("video/mp4") ? "mp4" : "webm";
  recorder = new MediaRecorder(view.captureStream(30), { mimeType: type, videoBitsPerSecond: 4_000_000 });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const cancelled = recorder?.cancelled; recorder = null; speed = 1; speedBtn.textContent = "×1";
    if (cancelled) return toast("🎬 TIMELAPSE", "Vidéo annulée", "L'enregistrement a été interrompu.");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(chunks, { type })); a.download = `timelapse-${daySel.value}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000); toast("🎬 TIMELAPSE", "Vidéo prête ✓", `timelapse-${daySel.value}.${ext}`);
  };
  recorder.start(); speed = 1; i = 0; frameAt(0); toast("🎬 TIMELAPSE", "Enregistrement…", "La journée défile une fois ; la vidéo se télécharge à la fin.");
  setTimeout(play, 300);
}
hub.openTimelapse = openTimelapse;
document.getElementById("timelapsebtn").onclick = () => openTimelapse();
