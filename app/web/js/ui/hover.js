// Hovering an object bought: its outline glows on the floor (iso/rooms.js floorShade) and a label follows the pointer:
// its name, its state (world/upkeep.js: scale, thirst, cups, a jam…), what a click does.

import { hub, provide } from "../hub.js";
import { esc } from "../core/data.js";
import { cv } from "../core/core.js";

const tip = document.createElement("div");
tip.className = "hovertip"; tip.hidden = true; document.body.appendChild(tip);
let hoverUid = null;
// id: what panel.js hit() found under the pointer ("item:12"…); ev: the mouse event
function setHover(id, ev) {
  const uid = id?.startsWith("item:") ? +id.slice(5) : null, it = uid != null && !hub.buy?.on ? hub.itemByUid(uid) : null;
  hoverUid = it ? uid : null;
  if (!it) { tip.hidden = true; return; }
  const d = hub.defOf(it.type), line = hub.upkeepLine?.(it) || "";
  tip.innerHTML = `<b>${esc(d.name)}</b>${line ? `<span>${esc(line)}</span>` : ""}<i>clic : actions</i>`;
  tip.hidden = false;
  tip.style.left = `${Math.min(innerWidth - tip.offsetWidth - 8, ev.clientX + 14)}px`; tip.style.top = `${Math.max(8, ev.clientY - tip.offsetHeight - 10)}px`;
}
const hideHover = () => { hoverUid = null; tip.hidden = true; };
// off the scene (a window over it, a panel): no label left behind
addEventListener("mousemove", ev => { if (ev.target !== cv && !tip.hidden) hideHover(); }, { passive: true });
addEventListener("mousedown", hideHover, { passive: true });

provide({ get hoverUid() { return hoverUid; }, get setHover() { return setHover; }, get hideHover() { return hideHover; } });
