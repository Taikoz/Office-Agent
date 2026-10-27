// Boot: first layout, polling loops and the animation loop. Loaded last.

import { hub, provide } from "./hub.js";
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
  if (hub.dormant) { last = t; return; }  // the office is open in another tab (ui/onetab.js)
  if (hub.frameSkip?.(t)) return;  // 30 frames a second, fewer when the office is not in use (ui/quality.js)
  try { step(Math.min(64, t - last), t); last = t; render(t); hub.afterFrame?.(t); }  // afterFrame: the timelapse's picture (ui/timelapse.js)
  catch (err) { last = t; if (loopErrors++ % 300 === 0) console.error("[office] frame", err); }
}

// the polls stop while the tab sleeps (ui/onetab.js) and come back at once when it wakes up
const awake = fn => () => { if (!hub.dormant) fn(); };
resize();
poll().then(() => { if (perfFlag.on) togglePerf(true); }); setInterval(awake(poll), 2000);
pollMmx(); setInterval(awake(pollMmx), 3000);
pollGame(); setInterval(awake(pollGame), 8000);
provide({ wakeUp() { last = performance.now(); resize(); poll(); pollMmx(); pollGame(); } });
hub.booted = true;
requestAnimationFrame(loop);
