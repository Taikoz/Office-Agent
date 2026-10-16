// How hard the office works to draw itself (ChiefOS → Réglages → Performances).
//  - The resolution of the three layers of the scene (iso/pixi.js): pixel art does not need every device pixel; on a
//    high-density screen a layer stays under a pixel budget, never under one pixel per CSS pixel (a pixel art blown
//    up by 1.2 looks uneven). In "auto" it steps down when the frames come too slowly, and keeps the lower step only
//    if the frames really came faster (a browser held at 30 frames a second, on battery, gains nothing: back up, and
//    no new try for 10 minutes); back up after a minute of smooth frames.
//  - The frame rate: 30 frames a second instead of 60 when the window is not the one in use, after 2 minutes without
//    touching anything, or in "économie" (where the panels lose their blur too: it is redone at every frame).
// Kept in this browser.

import { hub, provide } from "../hub.js";
import { resize } from "../core/core.js";

const BUDGET = 2_500_000;     // pixels per layer, at most
const MIN = 0.8;              // the lowest resolution in auto (pixels per CSS pixel)
const IDLE = 120_000;         // ms without input: a slower pace
export const quality = { mode: "auto", r: 0, fps: 0, capped: false, why: "" };
try { const m = localStorage.getItem("office-quality"); if (["auto", "high", "eco"].includes(m)) quality.mode = m; } catch (_) { /* storage blocked */ }

const dpr = () => window.devicePixelRatio || 1;
// the best resolution the budget allows for the scene's size on screen (CSS pixels)
function ceiling(cssW, cssH) { return Math.min(dpr(), Math.max(1, Math.sqrt(BUDGET / Math.max(1, cssW * cssH)))); }
// core/core.js resize: pixels of the layers per CSS pixel
function renderRes(cssW, cssH) {
  const top = ceiling(cssW, cssH);
  if (quality.mode === "high") return dpr();
  if (quality.mode === "eco") return Math.min(top, 0.75);
  if (!quality.r || quality.r > top) quality.r = top;
  return quality.r;
}
export function setQuality(mode) {
  quality.mode = mode; quality.r = 0; bad = good = 0; trial = null; lockUntil = 0;
  try { localStorage.setItem("office-quality", mode); } catch (_) { /* storage blocked */ }
  document.body.classList.toggle("eco", mode === "eco");
  resize();
}
document.body.classList.toggle("eco", quality.mode === "eco");

/* ---------- the pace: main.js asks before each frame ---------- */
let lastInput = performance.now(), lastDrawn = 0, winStart = 0, winFrames = 0, winSum = 0, winSq = 0, bad = 0, good = 0, lastDown = -1e9;
let trial = null, lockUntil = 0;  // trial: a step down being checked { from, fps, at, n }
for (const ev of ["pointermove", "pointerdown", "keydown", "wheel"]) addEventListener(ev, () => { lastInput = performance.now(); }, { passive: true, capture: true });
function frameSkip(t) {
  const idle = t - lastInput > IDLE, away = !document.hasFocus();
  quality.capped = quality.mode === "eco" || idle || away;
  quality.why = quality.mode === "eco" ? "économie" : away ? "fenêtre en arrière-plan" : idle ? "inactif" : "";
  if (quality.capped && t - lastDrawn < 31) return true;  // 30 frames a second
  const gap = t - lastDrawn; lastDrawn = t;
  if (gap < 250) { winFrames++; winSum += gap; winSq += gap * gap; }  // a gap of seconds: the tab was hidden
  if (t - winStart < 2000) return false;
  // every 2 s: the frames drawn, and in auto (in use, not capped) the resolution follows
  quality.fps = winFrames ? Math.round(1000 / (winSum / winFrames)) : 0;
  const avg = winFrames ? winSum / winFrames : 0, jitter = winFrames ? Math.sqrt(Math.max(0, winSq / winFrames - avg * avg)) : 0;
  winStart = t; winFrames = 0; winSum = 0; winSq = 0;
  if (quality.mode !== "auto" || quality.capped || !avg) { bad = good = 0; return false; }
  // a step down being checked: kept only if the frames came at least 12 % faster
  if (trial && ++trial.n >= 2) {
    if (quality.fps < trial.fps * 1.12) { quality.r = trial.from; lockUntil = t + 600_000; resize(); }
    trial = null; bad = good = 0; return false;
  }
  if (trial) return false;
  // frames at a steady 30 a second: the browser or the screen holds them there, fewer pixels would change nothing
  const held = Math.abs(avg - 33.3) < 2.5 && jitter < 3;
  if (avg > 25 && !held && t > lockUntil) { good = 0; if (++bad >= 2 && quality.r > MIN) { trial = { from: quality.r, fps: quality.fps, n: 0 }; quality.r = Math.max(MIN, quality.r * 0.85); bad = 0; lastDown = t; resize(); } }
  else if (avg < 18) { bad = 0; if (++good >= 8 && t - lastDown > 60_000) { const r = quality.r; quality.r = r / 0.85; good = 0; resize(); if (quality.r === r) good = 0; } }
  else bad = good = 0;
  return false;
}

provide({ get frameSkip() { return frameSkip; }, get renderRes() { return renderRes; }, get quality() { return quality; } });
