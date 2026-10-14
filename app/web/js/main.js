"use strict";
// Boot: first layout, polling loops and the animation loop. Loaded last.

let last = performance.now();
let loopErrors = 0;
// one bad frame must not freeze the office: log it (once in a while) and keep animating
function loop(t) {
  requestAnimationFrame(loop);
  try { step(Math.min(64, t - last), t); last = t; render(t); }
  catch (err) { last = t; if (loopErrors++ % 300 === 0) console.error("[office] frame", err); }
}

resize();
let perfPref = "";
try { perfPref = localStorage.getItem("office-perf") || ""; } catch (_) { /* storage blocked */ }
poll().then(() => { if (perfPref) togglePerf(true); }); setInterval(poll, 2000);
pollMmx(); setInterval(pollMmx, 3000);
pollGame(); setInterval(pollGame, 8000);
booted = true;
requestAnimationFrame(loop);
