// Start an agent from the office: click a free desk (or drop a board ticket on it), pick the agent and its mission.
// The server opens `claude --agent <name>` in a new terminal: the session stays interactive, permissions still go to you.

import { hub, provide } from "../hub.js";
import { DESKS, TEAM, clip, cv, ents, px, text } from "../core/core.js";
import { boardCards } from "../world/scene.js";
import { view } from "../world/lounge.js";
import { esc } from "../core/data.js";
import { canvasPoint, openPanel } from "../ui/panel.js";
import { toast } from "../sims/progress.js";
import { launchPreset } from "./ticket.js";
import { failHintsHtml } from "../apps/debriefs.js";

let launchAgents = null, launchKey = null, launchArmed = 0, drag = null, launchDrop = 0;
const LAUNCH_PROMPTS = {
  "feature-builder": t => `Deliver ${t || "ABC-"}`,
  "tech-lead": t => `Deliver ${t || "ABC-"} end to end`,
  "mr-reviewer": t => `Review the MR of ${t || "ABC-"}`,
  "security-auditor": t => `Security audit of ${t || "ABC-"} MR`,
  "e2e-test-writer": t => `Write the e2e tests for ${t || "ABC-"}`,
  "audit-security-code": () => "audit-security-code ",
  "board-cleaner": () => "Clean the board <URL> for <name>",
};

const freeDesk = d => ![...ents.values()].some(e => e.desk === d && !e.leaving);
function hitDesk(x, y) {
  const i = DESKS.findIndex(d => freeDesk(d) && x >= d.x - 18 && x <= d.x + 18 && y >= d.y - 24 && y <= d.y + 24);
  return i < 0 ? null : `desk:${i}`;
}
function hitBoardCard(x, y) { return boardCards.find(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || null; }

// drag a ticket from the board: a sticky note follows the mouse, dropped on a free desk it opens the launch form
cv.addEventListener("mousedown", ev => {
  if (view !== "office") return;
  const p = canvasPoint(ev), c = hitBoardCard(p.x, p.y);
  if (c?.agent.ticket) { drag = { ticket: c.agent.ticket, from: c.agent, x: p.x, y: p.y, moved: false }; ev.preventDefault(); }
});
addEventListener("mousemove", ev => { if (!drag) return; const p = canvasPoint(ev); drag.moved ||= Math.hypot(p.x - drag.x, p.y - drag.y) > 3; drag.x = p.x; drag.y = p.y; });
addEventListener("mouseup", () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.moved) return openPanel(`ticket:${d.ticket}`);  // a click on a board ticket: its history
  const desk = hitDesk(d.x, d.y);
  if (desk) { d.dropped = true; launchDrop = performance.now(); openPanel(`launch:${desk.slice(5)}:${d.ticket}:${d.from.type}`); }
});
function drawDrag(t) {
  if (!drag?.moved) return;
  const over = hitDesk(drag.x, drag.y);
  if (over) { const d = DESKS[+over.slice(5)]; px(d.x - 20, d.y - 26, 40, 2, "#51cf66"); px(d.x - 20, d.y + 24, 40, 2, "#51cf66"); }
  px(drag.x - 14, drag.y - 5, 28, 9, "#fff7b8"); px(drag.x - 14, drag.y - 5, 1.5, 9, "#fbaa08");
  text(drag.ticket, drag.x - 11, drag.y - 4, "#0c2470", 4.6);
}

async function renderLaunch(arg) {
  const [desk, ticket = "", fromType = ""] = arg.split(":");
  const key = arg;
  if (launchKey === key) return;
  launchKey = key; launchArmed = 0;
  if (!launchAgents) {
    try { launchAgents = DEMO ? Object.keys(LAUNCH_PROMPTS).sort() : await (await fetch("/api/agents")).json(); }
    catch (_) { launchAgents = Object.keys(LAUNCH_PROMPTS).sort(); }
  }
  const preset = launchPreset; hub.launchPreset = null;
  const pick = preset?.agent || (fromType === "feature-builder" ? "mr-reviewer" : "feature-builder");
  const box = document.getElementById("p-game");
  box.innerHTML = `<div class="launch">
    <label>Agent <select id="l-agent">${launchAgents.map(a => `<option${a === pick ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></label>
    <label>Mission <textarea id="l-prompt" rows="4" maxlength="2000"></textarea></label>
    <p class="muted">Ouvre un terminal avec <code>claude --agent …</code> dans le dossier <code>launch_dir</code> de la config. La session est interactive : tu valides chaque permission comme d'habitude. Le dev arrivera au bureau ${esc(TEAM[+desk] || "")} ou à un autre bureau libre.</p>
    <div id="l-hints"></div>
    <div class="acts"><button id="l-go">🚀 Lancer</button></div><div id="l-msg" class="muted"></div></div>`;
  const agentSel = box.querySelector("#l-agent"), prompt = box.querySelector("#l-prompt");
  const hints = () => { const h = box.querySelector("#l-hints"); if (h) h.innerHTML = failHintsHtml(agentSel.value); };  // traps already met (debrief.js)
  const fill = () => { prompt.value = (LAUNCH_PROMPTS[agentSel.value] || (t => t))(ticket); hints(); };
  if (preset) { prompt.value = preset.prompt; hints(); } else fill();
  agentSel.onchange = fill;
  box.querySelector("#l-go").onclick = () => launchGo(agentSel.value, prompt.value);
}

async function launchGo(agent, prompt) {
  const btn = document.getElementById("l-go"), msg = document.getElementById("l-msg");
  if (performance.now() > launchArmed) {  // first click arms, second launches
    launchArmed = performance.now() + 4000; btn.textContent = "Confirmer le lancement ?"; msg.textContent = `${agent} — « ${clip(prompt, 80)} »`;
    setTimeout(() => { if (performance.now() > launchArmed && btn.isConnected) btn.textContent = "🚀 Lancer"; }, 4100);
    return;
  }
  launchArmed = 0; btn.disabled = true;
  if (DEMO) { msg.textContent = "Démo : rien n'est lancé."; btn.disabled = false; btn.textContent = "🚀 Lancer"; return; }
  try {
    const res = await fetch("/api/launch", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
      body: JSON.stringify({ agent, prompt }) });
    const out = await res.json();
    msg.textContent = out.ok ? `✓ ${out.output} — il apparaîtra au bureau dès qu'il démarre.` : `Échec : ${out.output || out.error}`;
    if (out.ok) toast("LANCEMENT", `${agent} lancé`, clip(prompt, 80));
  } catch (err) { msg.textContent = `serveur injoignable (${err.message})`; }
  btn.disabled = false; btn.textContent = "🚀 Lancer";
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get LAUNCH_PROMPTS() { return LAUNCH_PROMPTS; }, get drawDrag() { return drawDrag; }, get freeDesk() { return freeDesk; }, get hitDesk() { return hitDesk; }, get launchDrop() { return launchDrop; }, get launchKey() { return launchKey; }, set launchKey(v) { launchKey = v; }, get renderLaunch() { return renderLaunch; } });
