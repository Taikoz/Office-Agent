// Wall: every active session at once, each as a mini office (one square per desk). Click closes it (the office always shows every session).

import { hub, provide } from "../hub.js";
import { clip, current, data, specialty, typeColor } from "../core/core.js";
import { esc, isStuck } from "../core/data.js";

const wallBox = document.getElementById("wall");
const WALL_ICON = { working: "⚙", asking: "?", blocked: "⛔", done: "✓", gone: "·" };

function renderWall() {
  if (wallBox.hidden) return;
  document.getElementById("wall-body").innerHTML = data.sessions.map(s => {
    const live = s.agents.some(a => a.status === "working") || (!s.chief.finished && s.chief.idle < 120);
    const agents = s.agents.filter(a => a.status !== "gone").slice(-8);
    const desks = Array.from({ length: 8 }, (_, i) => {
      const a = agents[i];
      if (!a) return `<div class="wdesk"></div>`;
      return `<div class="wdesk on" style="--c:${typeColor(a.type)}" title="${esc(a.description)}"><span class="n">${esc(specialty(a.type))}</span>
        <span class="s s-${a.status}">${isStuck(a) ? "🌀" : WALL_ICON[a.status] || ""}</span><div class="a">${esc(a.ticket || "")} ${esc(clip(a.action || "", 24))}</div></div>`;
    }).join("");
    const q = (s.chief.question ? 1 : 0) + s.agents.filter(a => a.status === "asking").length;
    return `<div class="wsess${s.id === current ? " on" : ""}" data-session="${esc(s.id)}">
      <div class="t"><b><span class="dot${live ? " live" : ""}"></span>${esc(s.project)} · ${esc(clip(s.title, 34))}</b>${q ? `<span class="s-asking">? ${q}</span>` : ""}</div>
      <div class="muted">${esc(clip(s.chief.finished || s.chief.idle > 120 ? "chef en attente" : s.chief.action, 50))} · ${s.agents.filter(a => a.status === "working").length} au travail</div>
      <div class="wdesks">${desks}</div></div>`;
  }).join("") || `<p class="muted">Aucune session active.</p>`;
}
function toggleWall(show) {
  if (hub.openOverlay("wall", show)) renderWall();
}
document.getElementById("wallbtn").onclick = () => toggleWall(wallBox.hidden);
document.getElementById("wall-close").onclick = () => toggleWall(false);
document.getElementById("wall-body").addEventListener("click", ev => {
  const s = ev.target.closest("[data-session]");
  if (!s) return;
  toggleWall(false);
});

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get renderWall() { return renderWall; } });
