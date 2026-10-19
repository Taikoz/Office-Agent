// The chief's office: a desk of his own next to the podium (a buy-mode object), with ChiefOS on its computer — the
// questions waiting, the merge requests and their CI, the tickets, the report of the day, the accounts and the team at a
// glance, without leaving the game. Links still open GitLab or YouTrack in a new tab.

import { hub, provide } from "../hub.js";
import { chief } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { chiefGo, chiefToOffice } from "../world/chief.js";
import { esc } from "../core/data.js";
import { furni, saveBuild } from "../world/build.js";
import { clockNow } from "../sims/days.js";
import { OsApp } from "../apps/base.js";

// his desk: the classic one or the holographic command post (items/scifi.js), whichever is in the office
const chiefDesk = () => furni.items.find(i => i.room === "office" && hub.defOf(i.type)?.chiefDesk) || furni.items.find(i => hub.defOf(i.type)?.chiefDesk);
// the look of ChiefOS: Ubuntu, HOLO (futuristic: neon glass, a hexagon dock) or GRIMOIRE (a spell book: leather, gold,
// parchment pages, wax seals) or CRYPTE (a haunted manor: black velvet, gothic arches, candle wax, blood red); auto: the one of the chief's desk (its def's osSkin), Ubuntu otherwise
export const OS_SKINS = [["ubuntu", "Ubuntu", "le bureau classique"], ["holo", "HOLO", "futuriste : verre, néon, hexagones"], ["grimoire", "Grimoire", "un livre de sorts : cuir, dorures, parchemin"],
  ["crypte", "Crypte", "un manoir hanté : velours noir, ogives, cire de bougie, rouge sang"]];
let skinBook = new SaveSlot("office-osskin", { skin: "auto" }).data;
export const osSkin = () => skinBook.skin === "auto" ? hub.defOf(chiefDesk()?.type)?.osSkin || "ubuntu" : skinBook.skin;
export function setOsSkin(skin) { skinBook.skin = skin; SaveSlot.get("office-osskin").save(skinBook); bootUntil = osSkin() !== "ubuntu" ? performance.now() + 1400 : 0; renderChiefOs(); }
let bootUntil = 0;
const BOOT = {
  holo: { title: "CHIEFOS // NEXUS", lines: ["NOYAU QUANTIQUE ........ OK", "LIAISON AGENTS ......... OK", "FLUX GITLAB ............ OK", "MÉMOIRE MMX ............ OK", "INTERFACE HOLOGRAPHIQUE  OK"] },
  grimoire: { title: "Le Grimoire du Chef", lines: ["Les chandelles s'allument…", "Les hiboux sont à leur poste…", "Les portraits se réveillent…", "L'encre des parchemins est fraîche…", "Le grimoire s'ouvre. ✦"] },
  crypte: { title: "Le Manoir s'éveille", lines: ["Les chandelles vacillent…", "Les portraits ouvrent les yeux…", "Les fantômes font l'appel des agents…", "L'horloge sonne minuit…", "Bienvenue au manoir. 🦇"] },
};

// the chief walks to his desk, sits, and ChiefOS opens
function chiefToDesk() {
  const it = chiefDesk(); if (!it) return openChiefOs();
  const sp = hub.spotsOf(it)[0], go = () => chiefGo({ x: sp.x, y: sp.y }, c => { c.at = "chiefos"; openChiefOs(); });
  if (hub.chiefBusyNow()) { openChiefOs(); return; }  // the team waits: the screen opens at once
  if (chief.room !== "office") { chief.pendingOffice = go; chiefToOffice(); } else go();
}

/* ---------- ChiefOS ---------- */
export const osBox = document.getElementById("chiefos");
export let osApp = "questions";  // the app shown (js/apps/*.js, OsApp)
const curApp = () => OsApp.get(osApp) || OsApp.list()[0];
export function openChiefOs(app) {
  if (app) setOsApp(app); osOverview = false;
  if (osBox.hidden && osSkin() !== "ubuntu" && !hub.focusMode) { bootUntil = performance.now() + 1400; setTimeout(renderChiefOs, 1450); }  // the boot sequence
  osBox.hidden = false; renderChiefOs();
}
export function closeChiefOs() { osBox.hidden = true; if (chief.at === "chiefos") chief.at = "free"; }
export function setOsApp(id) { osApp = id; osOverview = false; osFilter = ""; OsApp.get(id)?.open(); }
// Ubuntu look (GNOME, Yaru): top bar with Activités and the clock, the dock on the left, the app in a window;
// Activités (or ⋮⋮⋮ in the dock) shows the grid of applications with a search field
export let osOverview = false, osFilter = "";
function osBadge(id) { const n = OsApp.get(id)?.badge(); return n ? `<b class="osbadge">${n}</b>` : ""; }
/* ---------- the dock: the main apps only, pinned and ordered by the user (right click, drag and drop, Réglages) ---------- */
const DOCK_DEFAULT = ["questions", "notifs", "terminal", "gitlab", "browser", "blueprint", "dashboard", "planning", "settings"];
let dockBook = new SaveSlot("office-dock", { apps: DOCK_DEFAULT }).data;
const dockApps = () => dockBook.apps.filter(id => OsApp.get(id) && !OsApp.get(id).hidden);
function saveDock(apps) { dockBook.apps = [...new Set(apps)]; SaveSlot.get("office-dock").save(dockBook); renderChiefOs(); }
const pinApp = id => { if (!OsApp.get(id)?.hidden) saveDock([...dockApps(), id]); };
const unpinApp = id => saveDock(dockApps().filter(x => x !== id));
function moveApp(id, delta) { const a = dockApps(), i = a.indexOf(id), j = Math.max(0, Math.min(a.length - 1, i + delta)); if (i < 0 || i === j) return; a.splice(i, 1); a.splice(j, 0, id); saveDock(a); }
let osMenu = null;  // the open context menu: { id, x, y, from }
function dockIcon(id, extra = "") {
  const { icon: ic, label: l } = OsApp.get(id);
  return `<button data-os-app="${id}" data-dock="${id}" draggable="true" class="${osApp === id && !osOverview ? "on" : ""}${extra}" title="${esc(l)}" style="--tint:${OsApp.get(id).tint}"><span class="ic">${ic}</span>${osBadge(id)}</button>`;
}
function menuHtml() {
  if (!osMenu) return "";
  const { id } = osMenu, pinned = dockApps().includes(id), i = dockApps().indexOf(id), { icon: ic, label: l } = OsApp.get(id);
  const items = [["open", "Ouvrir"], pinned ? ["unpin", "Retirer du dock"] : ["pin", "Épingler au dock"], ...(pinned && i > 0 ? [["up", "Monter"]] : []), ...(pinned && i < dockApps().length - 1 ? [["down", "Descendre"]] : [])];
  return `<div class="ubmenu" style="left:${osMenu.x}px;top:${osMenu.y}px"><div class="ubmtitle">${ic} ${esc(l)}</div>${items.map(([a, t]) => `<button data-menu="${a}" data-id="${id}">${t}</button>`).join("")}</div>`;
}
export function dockSettingsHtml() {
  const pinned = dockApps(), others = OsApp.list().map(a => a.id).filter(id => !pinned.includes(id));
  const row = (id, isPinned, i) => { const { icon: ic, label: l } = OsApp.get(id); return `<div class="osrow"><b><span class="ubappic" style="--tint:${OsApp.get(id).tint}">${ic}</span> ${esc(l)}</b><span class="muted">${isPinned ? `position ${i + 1}` : "dans Activités"}</span>
    <span class="osacts">${isPinned ? `<button data-dockset="up" data-id="${id}"${i === 0 ? " disabled" : ""} title="Monter">↑</button><button data-dockset="down" data-id="${id}"${i === pinned.length - 1 ? " disabled" : ""} title="Descendre">↓</button><button data-dockset="unpin" data-id="${id}">Retirer</button>` : `<button data-dockset="pin" data-id="${id}">📌 Épingler</button>`}</span></div>`; };
  return `<h4>DOCK</h4><p class="muted">Les applications du dock, dans l'ordre. Aussi : clic droit sur une icône (dock ou Activités), ou glisser-déposer dans le dock.</p>
    ${pinned.map((id, i) => row(id, true, i)).join("")}<h4>AUTRES APPLICATIONS</h4>${others.map(id => row(id, false)).join("") || `<p class="muted">Toutes sont dans le dock.</p>`}
    <div class="osacts"><button data-dockset="reset">↺ Dock par défaut</button></div>`;
}
export function renderChiefOs() {
  if (osBox.hidden) return;
  const now = clockNow(), app = curApp(), { icon, label } = app;
  const skin = osSkin(), holo = skin === "holo", book = skin === "grimoire", crypt = skin === "crypte";
  for (const k of ["holo", "grimoire", "crypte"]) osBox.classList.toggle(k, skin === k);
  const day = now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }), time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const pinned = dockApps(), running = !osOverview && !pinned.includes(osApp) ? osApp : null;  // the open app shows up while it runs, like Ubuntu
  const dock = pinned.map(id => dockIcon(id)).join("") + (running ? `<span class="ubrun"></span>${dockIcon(running, " running")}` : "");
  const apps = OsApp.list().filter(a => !osFilter || a.label.toLowerCase().includes(osFilter.toLowerCase()));
  const body = osOverview
    ? `<div class="ubover"><input class="ubsearch" placeholder="Rechercher une application…" value="${esc(osFilter)}" aria-label="Rechercher une application">
        <div class="ubgrid">${apps.map(({ id, icon: ic, label: l, tint }) => `<button data-os-app="${id}" data-dock="${id}" style="--tint:${tint}"><span class="ic">${ic}</span>${osBadge(id)}${pinned.includes(id) ? '<span class="ubpin" title="Dans le dock">📌</span>' : ""}<small>${esc(l)}</small></button>`).join("") || `<p>Aucune application.</p>`}</div>
        <p class="ubhint">Clic droit sur une application : l'épingler au dock ou l'en retirer.</p></div>`
    : `<section class="ubwin"><div class="ubhead"><span class="ubappic" style="--tint:${app.tint}">${icon}</span><b>${esc(label)}</b>
        <span class="ubctl"><button data-os="overview" title="Réduire">–</button><button data-os="max" title="Agrandir">▢</button><button class="x" data-os="close" title="Fermer (Échap)">×</button></span></div>
        <div class="osapp">${app.render()}</div></section>`;
  const boot = BOOT[skin] && performance.now() < bootUntil ? `<div class="hoboot"><b>${BOOT[skin].title}</b><span>${holo ? `v${now.getFullYear() - 2000}.${now.getMonth() + 1}` : crypt ? "🕯 🦇 🕯" : "✦ ✦ ✦"}</span>${BOOT[skin].lines.map((l, i) => `<i style="--d:${i * 0.22}s">${l}</i>`).join("")}<em></em></div>` : "";
  osBox.innerHTML = `${boot}<div class="ubtop"><button class="ubact${osOverview ? " on" : ""}" data-os="overview">${holo ? "◈ MODULES" : book ? "✦ Sortilèges" : crypt ? "☾ Séances" : "Activités"}</button><span class="ubtitle">${holo ? `▸ ${esc(label).toUpperCase()}` : book ? `📜 ${esc(label)}` : crypt ? `🕯️ ${esc(label)}` : `${icon} ${esc(label)}`}</span>
      <span class="ubclock">${holo ? `${esc(day).toUpperCase()} · ${time} · SYS ✓` : book ? `${esc(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} · ${time.replace(":", " h ")}` : crypt ? `☾ ${esc(day)} · ${time}${now.getHours() === 0 ? " · minuit…" : ""}` : `${esc(day)}  ${time}`}</span><span class="ubsys"><span title="Réseau">📶</span><span title="Son">🔊</span><span title="Batterie">🔋</span><button data-os="close" title="Éteindre ChiefOS (Échap)">⏻</button></span></div>
    <div class="ubdesk"><nav class="ubdock">${dock}<span class="ubsep"></span><button data-os="overview" class="ubshow${osOverview ? " on" : ""}" title="Afficher les applications">⋮⋮⋮</button></nav>${body}</div>${menuHtml()}`;
  if (osOverview) { const s = osBox.querySelector(".ubsearch"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  else app.mount();
}
osBox.addEventListener("input", ev => { if (ev.target.classList.contains("ubsearch")) { osFilter = ev.target.value; renderChiefOs(); } });
osBox.addEventListener("keydown", ev => { if (ev.target.classList.contains("ubsearch") && ev.key === "Enter") { const first = osBox.querySelector(".ubgrid [data-os-app]"); if (first) first.click(); } });
osBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.os === "close") return closeChiefOs();
  if (b.dataset.os === "overview") { osOverview = !osOverview; osFilter = ""; return renderChiefOs(); }
  if (b.dataset.os === "max") { osBox.classList.toggle("max"); return; }
  if (b.dataset.osApp) { setOsApp(b.dataset.osApp); return renderChiefOs(); }
  if (!osOverview && ev.target.closest(".osapp")) curApp().click(b, ev);  // the app's own buttons
});
osBox.addEventListener("input", ev => { if (!osOverview && ev.target.closest(".osapp")) curApp().input(ev); });
osBox.addEventListener("change", ev => { if (!osOverview && ev.target.closest(".osapp")) curApp().change(ev); });
// the handlers an app wired with OsApp.listen: only the app shown gets the events of its window
for (const type of OsApp.EVENTS) osBox.addEventListener(type, ev => {
  if (osOverview || !ev.target.closest?.(".ubwin")) return;
  for (const fn of OsApp.handlers.get(osApp)?.[type] || []) fn(ev);
});
addEventListener("keydown", ev => { if (ev.key === "Escape" && !osBox.hidden && !ev.target.closest?.(".termscreen")) { ev.stopImmediatePropagation(); closeChiefOs(); } }, true);  // Escape belongs to a terminal that has the focus
document.getElementById("osbtn").onclick = () => chiefToDesk();
// live apps refresh every 3 s (not while a field of theirs has the focus); forms and long pages stay still
setInterval(() => { if (!osBox.hidden && !osOverview && curApp().live && !osBox.contains(document.activeElement?.closest("select, input, textarea"))) { const sc = osBox.querySelector(".osapp")?.scrollTop; renderChiefOs(); const a = osBox.querySelector(".osapp"); if (a) a.scrollTop = sc || 0; } }, 3000);

// right click on an app (dock or Activités): its menu; a click elsewhere closes it
osBox.addEventListener("contextmenu", ev => {
  const b = ev.target.closest("[data-dock]"); if (!b) return;
  ev.preventDefault();
  const r = osBox.getBoundingClientRect();
  const br = b.getBoundingClientRect(), inDock = !!b.closest(".ubdock");  // beside the dock icon, under the pointer in Activités
  osMenu = { id: b.dataset.dock, x: Math.min((inDock ? br.right + 8 : ev.clientX) - r.left, r.width - 200), y: Math.min((inDock ? br.top : ev.clientY) - r.top, r.height - 170) };
  renderChiefOs();
});
osBox.addEventListener("click", ev => {
  const m = ev.target.closest("[data-menu]"), d = ev.target.closest("[data-dockset]");
  if (m) {
    ev.stopImmediatePropagation(); const id = m.dataset.id; osMenu = null;
    if (m.dataset.menu === "open") { setOsApp(id); return renderChiefOs(); }
    return m.dataset.menu === "pin" ? pinApp(id) : m.dataset.menu === "unpin" ? unpinApp(id) : moveApp(id, m.dataset.menu === "up" ? -1 : 1);
  }
  if (d) {
    const id = d.dataset.id, a = d.dataset.dockset;
    if (a === "reset") return saveDock(DOCK_DEFAULT);
    return a === "pin" ? pinApp(id) : a === "unpin" ? unpinApp(id) : moveApp(id, a === "up" ? -1 : 1);
  }
  if (osMenu && !ev.target.closest(".ubmenu")) { osMenu = null; renderChiefOs(); }
}, true);
// drag and drop in the dock to reorder; dropped from Activités onto the dock: pinned there
let dragApp = null;
osBox.addEventListener("dragstart", ev => { const b = ev.target.closest("[data-dock]"); if (b) { dragApp = b.dataset.dock; ev.dataTransfer.effectAllowed = "move"; } });
osBox.addEventListener("dragover", ev => { if (dragApp && ev.target.closest(".ubdock")) ev.preventDefault(); });
osBox.addEventListener("drop", ev => {
  if (!dragApp || !ev.target.closest(".ubdock")) return;
  ev.preventDefault();
  const over = ev.target.closest("[data-dock]")?.dataset.dock, a = dockApps().filter(x => x !== dragApp), i = over && over !== dragApp ? a.indexOf(over) : a.length;
  a.splice(i < 0 ? a.length : i, 0, dragApp); dragApp = null; saveDock(a);
});
osBox.addEventListener("dragend", () => { dragApp = null; });

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get OS_SKINS() { return OS_SKINS; }, get osSkin() { return osSkin; }, get setOsSkin() { return setOsSkin; }, get chiefToDesk() { return chiefToDesk; }, get osBox() { return osBox; }, get renderChiefOs() { return renderChiefOs; } });
