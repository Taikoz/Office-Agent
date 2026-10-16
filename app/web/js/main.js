// Boot: first layout, polling loops and the animation loop. Loaded last.

import { hub } from "./hub.js";
import { resize } from "./core/core.js";
import { render, step } from "./agents/entities.js";
import { poll } from "./core/data.js";
import { pollMmx } from "./agents/mmx.js";
import { pollGame } from "./sims/progress.js";
import { perfFlag, togglePerf } from "./agents/perf.js";

let last = performance.now();
let loopErrors = 0;
// one bad frame must not freeze the office: log it (once in a while) and keep animating
function loop(t) {
  requestAnimationFrame(loop);
  if (hub.frameSkip?.(t)) return;  // 30 frames a second when the office is not in use (ui/quality.js)
  try { step(Math.min(64, t - last), t); last = t; render(t); }
  catch (err) { last = t; if (loopErrors++ % 300 === 0) console.error("[office] frame", err); }
}

resize();
poll().then(() => { if (perfFlag.on) togglePerf(true); }); setInterval(poll, 2000);
pollMmx(); setInterval(pollMmx, 3000);
pollGame(); setInterval(pollGame, 8000);
hub.booted = true;
requestAnimationFrame(loop);
