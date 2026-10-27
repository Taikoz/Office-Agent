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
// parchment pages, wax seals), CRYPTE (a haunted manor: black velvet, gothic arches, candle wax, blood red) GALION (a
// pirate ship: deck wood, brass, rope, a treasure map) ZEN (a Japanese house: rice paper, ink, red seals) or TROPIC (a
// beach club: a sunset, sand, turquoise, palms); auto: the one of the chief's desk (its def's osSkin), Ubuntu otherwise
export const OS_SKINS = [["ubuntu", "ChiefOS", "le bureau d'Agent Office : sobre, lisible, encre et ambre"], ["holo", "HOLO", "futuriste : verre, néon, hexagones"], ["grimoire", "Grimoire", "un livre de sorts : cuir, dorures, parchemin"],
  ["crypte", "Crypte", "un manoir hanté : velours noir, ogives, cire de bougie, rouge sang"], ["galion", "Galion", "un navire pirate : bois de pont, laiton, cordage, carte au trésor"],
  ["zen", "Zen", "une maison japonaise : papier de riz, encre, sceaux rouges, bambou"],
  ["tropic", "Tropical", "un beach club : coucher de soleil, sable, turquoise, palmiers"]];
let skinBook = new SaveSlot("office-osskin", { skin: "auto" }).data;
export const osSkin = () => skinBook.skin === "auto" ? hub.defOf(chiefDesk()?.type)?.osSkin || "ubuntu" : skinBook.skin;
export function setOsSkin(skin) { skinBook.skin = skin; SaveSlot.get("office-osskin").save(skinBook); bootUntil = osSkin() !== "ubuntu" ? performance.now() + 1400 : 0; renderChiefOs(); }
let bootUntil = 0;
const BOOT = {
  holo: { title: "CHIEFOS // NEXUS", lines: ["NOYAU QUANTIQUE ........ OK", "LIAISON AGENTS ......... OK", "FLUX GITLAB ............ OK", "MÉMOIRE MMX ............ OK", "INTERFACE HOLOGRAPHIQUE  OK"] },
  grimoire: { title: "Le Grimoire du Chef", lines: ["Les chandelles s'allument…", "Les hiboux sont à leur poste…", "Les portraits se réveillent…", "L'encre des parchemins est fraîche…", "Le grimoire s'ouvre. ✦"] },
  tropic: { title: "ChiefOS Beach Club", lines: ["On déplie les transats…", "Le DJ lance son set…", "Le maître-nageur compte les agents…", "Les cocktails sont frappés…", "Aloha ! 🌺"] },
  zen: { title: "禅 ChiefOS", lines: ["On fait glisser les shōji…", "L'encre est broyée…", "Les daruma ouvrent un œil…", "Le gravier est ratissé…", "Bienvenue. お帰りなさい。"] },
  galion: { title: "Le Galion du Chef", lines: ["On hisse le pavillon noir…", "Les canons sont chargés…", "La vigie compte les agents…", "Le perroquet récite les tickets…", "Larguez les amarres ! ⚓"] },
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
export let osApp = "today";  // the app shown (js/apps/*.js, OsApp): « Aujourd'hui » first
// the simple mode (OsApp.SIMPLE) unless Réglages → Mode avancé; and how often each app is opened, to keep what serves
const modeBook = new SaveSlot("office-osmode", { advanced: false }).data;
OsApp.advanced = modeBook.advanced === true;
export function setOsAdvanced(on) { modeBook.advanced = OsApp.advanced = !!on; SaveSlot.get("office-osmode").save(modeBook); renderChiefOs(); }
export const usageBook = new SaveSlot("office-osusage", { since: Date.now(), apps: {} }).data;
function countOpen(id) {
  if (DEMO || !OsApp.get(id)) return;
  const u = usageBook.apps[id] ||= { n: 0, last: 0 }; u.n++; u.last = Date.now();
  SaveSlot.get("office-osusage").save(usageBook);
}
export function resetUsage() { usageBook.since = Date.now(); usageBook.apps = {}; SaveSlot.get("office-osusage").save(usageBook); renderChiefOs(); }
const curApp = () => OsApp.get(osApp) || OsApp.list()[0];
export function openChiefOs(app) {
  if (app) setOsApp(app); else if (osBox.hidden) countOpen(osApp); osOverview = false;
  if (osBox.hidden && osSkin() !== "ubuntu" && !hub.focusMode) { bootUntil = performance.now() + 1400; setTimeout(renderChiefOs, 1450); }  // the boot sequence
  osBox.hidden = false; document.body.classList.toggle("osmax", osBox.classList.contains("max")); renderChiefOs();
}
export function closeChiefOs() { osBox.hidden = true; document.body.classList.remove("osmax"); if (chief.at === "chiefos") chief.at = "free"; }
export function setOsApp(id) { if (id !== osApp) countOpen(id); osApp = id; osOverview = false; osFilter = ""; osFolder = null; const sp = OsApp.spaceOf(id); if (sp) spaceLast[sp.id] = id; OsApp.get(id)?.open(); }
// a space opens on the app last used in it (its first one otherwise); an app id opens that app
const spaceLast = {};
function openEntry(id) {
  const sp = OsApp.space(id); if (!sp) return setOsApp(id);
  const apps = OsApp.appsOf(sp); setOsApp(apps.find(a => a.id === spaceLast[id])?.id || apps[0]?.id || id);
}
/* ---------- folders, like an iPhone: the spaces, saved here (OsApp.setSpaces). A folder opens over the screen; drag an
   app onto a folder to move it there, onto another loose app to make a folder of both, out of an open folder to take it
   out; the folder's title is its name (click to rename); an empty folder goes away ---------- */
// known: the apps the folders have already seen; a new app (a newer version of the office) joins its default folder
// once, an app the user took out of its folder stays out
const folderBook = new SaveSlot("office-folders", { folders: OsApp.DEFAULT_SPACES, known: [] }).data;
{
  const placed = new Set(folderBook.folders.flatMap(f => f.apps)), known = new Set(folderBook.known.length ? folderBook.known : placed);
  for (const def of OsApp.DEFAULT_SPACES) for (const id of def.apps) {
    if (known.has(id) || placed.has(id)) continue;
    const home = folderBook.folders.find(f => f.id === def.id);
    if (home) home.apps.splice(Math.min(def.apps.indexOf(id), home.apps.length), 0, id);  // at its default place
  }
  // the default folders' old names, when the user kept them
  for (const [id, old] of [["inbox", "Boîte de réception"], ["work", "Travail"], ["reports", "Bilans"]]) {
    const f = folderBook.folders.find(x => x.id === id && x.label === old); if (f) f.label = OsApp.DEFAULT_SPACES.find(d => d.id === id).label;
  }
  folderBook.known = [...new Set([...known, ...OsApp.DEFAULT_SPACES.flatMap(d => d.apps)])];
  if (!DEMO) SaveSlot.get("office-folders").save(folderBook);
}
OsApp.setSpaces(folderBook.folders);
let osFolder = null, folderOpened = 0;  // the folder open on screen (its id), and since when (its zoom-in plays once)
function openFolder(id) {
  const apps = OsApp.space(id) ? OsApp.appsOf(OsApp.space(id)) : [];
  if (apps.length === 1) { setOsApp(apps[0].id); return renderChiefOs(); }  // one app in it (the simple mode): no folder to open
  osFolder = id; folderOpened = performance.now(); renderChiefOs();
}
function saveFolders(list = OsApp.SPACES) {
  folderBook.folders = list.filter(s => s.apps.length).map(({ id, label, apps }) => ({ id, label, apps: [...apps] }));
  OsApp.setSpaces(folderBook.folders); SaveSlot.get("office-folders").save(folderBook);
  if (osFolder && !OsApp.space(osFolder)) osFolder = null;
}
const outOfFolders = (...ids) => OsApp.SPACES.map(s => ({ ...s, label: s.label, apps: s.apps.filter(x => !ids.includes(x)) }));
function moveToFolder(appId, folderId) {  // folderId null: out of every folder
  const list = outOfFolders(appId); list.find(s => s.id === folderId)?.apps.push(appId); saveFolders(list); renderChiefOs();
}
function makeFolder(target, dropped) {
  const id = `f${Date.now().toString(36)}`;
  saveFolders([...outOfFolders(target, dropped), { id, label: "Dossier", apps: [target, dropped] }]); openFolder(id);
}
const unfold = id => { saveFolders(OsApp.SPACES.filter(s => s.id !== id)); renderChiefOs(); };
// the icon of a folder: its own (OsApp.SPACE_LOOK) in the default look, its first apps in a 3 × 3 grid in the themes;
// an app: its emoji
const FOLDER_TINT = "#7a7a7a";
const plain = () => osSkin() === "ubuntu";
const tintOf = id => { const sp = OsApp.space(id); return sp ? plain() ? sp.tint : FOLDER_TINT : entry(id)?.tint; };
function iconOf(id, cls = "ic") {
  const sp = OsApp.space(id);
  if (sp && plain()) return `<span class="${cls}">${sp.icon}</span>`;
  return sp ? `<span class="${cls} fold">${OsApp.appsOf(sp).slice(0, 9).map(a => `<i style="--tint:${a.tint}">${a.icon}</i>`).join("")}</span>` : `<span class="${cls}">${OsApp.get(id)?.icon || ""}</span>`;
}
// Ubuntu look (GNOME, Yaru): top bar with Activités and the clock, the dock on the left, the app in a window;
// Activités (or ⋮⋮⋮ in the dock) shows the grid of applications with a search field
export let osOverview = false, osFilter = "";
// a dock entry: a space (OsApp.SPACES) or a single app; a space's badge adds up its apps'
const entry = id => OsApp.space(id) || OsApp.get(id);
const entryShown = id => { const sp = OsApp.space(id); return sp ? OsApp.appsOf(sp).length > 0 : OsApp.shown(OsApp.get(id)); };
function osBadge(id) { const sp = OsApp.space(id), n = sp ? OsApp.appsOf(sp).reduce((t, a) => t + (+a.badge() || 0), 0) : OsApp.get(id)?.badge(); return n ? `<b class="osbadge">${n}</b>` : ""; }
/* ---------- the dock: the spaces (and any app pinned alone), ordered by the user (right click, drag and drop, Réglages) ---------- */
const DOCK_DEFAULT = ["today", ...OsApp.DEFAULT_SPACES.map(s => s.id), "settings"];
// version 2: the dock holds spaces; an older dock (apps) becomes the spaces of its apps, the old default the new one
const OLD_DEFAULT = ["questions", "notifs", "terminal", "gitlab", "browser", "blueprint", "dashboard", "planning", "settings"];
// version 3: « Aujourd'hui » first
let dockBook = new SaveSlot("office-dock", { apps: DOCK_DEFAULT }, { version: 3, migrations: {
  2: old => ({ apps: String(old?.apps) === String(OLD_DEFAULT) ? DOCK_DEFAULT : [...new Set((old?.apps || []).map(id => OsApp.spaceOf(id)?.id || id))] }),
  3: old => ({ apps: [...new Set(["today", ...(old?.apps || [])])] }) } }).data;
const dockApps = () => dockBook.apps.filter(entryShown);
// the dock icon lit for the app shown: the app itself when pinned alone, its space otherwise
const dockOf = id => dockApps().includes(id) ? id : dockApps().includes(OsApp.spaceOf(id)?.id) ? OsApp.spaceOf(id).id : null;
function saveDock(apps) { dockBook.apps = [...new Set(apps)]; SaveSlot.get("office-dock").save(dockBook); renderChiefOs(); }
const pinApp = id => { if (entryShown(id)) saveDock([...dockApps(), id]); };
const unpinApp = id => saveDock(dockApps().filter(x => x !== id));
function moveApp(id, delta) { const a = dockApps(), i = a.indexOf(id), j = Math.max(0, Math.min(a.length - 1, i + delta)); if (i < 0 || i === j) return; a.splice(i, 1); a.splice(j, 0, id); saveDock(a); }
let osMenu = null;  // the open context menu: { id, x, y, from }
function dockIcon(id, extra = "") {
  const { label: l, tint } = entry(id), sp = OsApp.space(id);
  const tip = sp ? `${l} : ${OsApp.appsOf(sp).map(a => a.label).join(", ")}` : l;
  const on = osFolder ? osFolder === id : dockOf(osApp) === id && !osOverview;
  return `<button data-os-open="${id}" data-dock="${id}" draggable="true" class="${on ? "on" : ""}${extra}" title="${esc(tip)}" aria-label="${esc(l)}"${on ? ' aria-current="page"' : ""} style="--tint:${tintOf(id) || tint}">${iconOf(id)}<span class="ublabel">${esc(l)}</span>${osBadge(id)}</button>`;
}
function menuHtml() {
  if (!osMenu) return "";
  const { id } = osMenu, pinned = dockApps().includes(id), i = dockApps().indexOf(id), { icon, label: l } = entry(id), sp = OsApp.space(id), ic = sp ? plain() ? sp.icon : "📁" : icon;
  const items = [["open", "Ouvrir"], pinned ? ["unpin", "Retirer du dock"] : ["pin", "Épingler au dock"], ...(pinned && i > 0 ? [["up", "Monter"]] : []), ...(pinned && i < dockApps().length - 1 ? [["down", "Descendre"]] : []),
    ...(sp ? [["unfold", "Défaire le dossier"]] : OsApp.spaceOf(id) ? [["out", "Sortir du dossier"]] : [])];
  return `<div class="ubmenu${performance.now() - osMenu.at < 250 ? " fresh" : ""}" role="menu" style="left:${osMenu.x}px;top:${osMenu.y}px"><div class="ubmtitle">${ic} ${esc(l)}</div>${items.map(([a, t]) => `<button role="menuitem" data-menu="${a}" data-id="${id}">${t}</button>`).join("")}</div>`;
}
export function dockSettingsHtml() {
  const pinned = dockApps(), others = [...OsApp.SPACES.map(s => s.id), ...OsApp.list().map(a => a.id)].filter(id => entryShown(id) && !pinned.includes(id));
  const where = id => { const sp = OsApp.space(id); return sp ? `dossier : ${OsApp.appsOf(sp).map(a => a.label).join(", ")}` : OsApp.spaceOf(id) ? `dans le dossier ${OsApp.spaceOf(id).label}` : "dans Activités"; };
  const row = (id, isPinned, i) => { const { label: l } = entry(id); return `<div class="osrow"><b><span style="--tint:${tintOf(id)}">${iconOf(id, "ubappic")}</span> ${esc(l)}</b><span class="muted">${isPinned ? `position ${i + 1} · ` : ""}${esc(where(id))}</span>
    <span class="osacts">${isPinned ? `<button data-dockset="up" data-id="${id}"${i === 0 ? " disabled" : ""} title="Monter">↑</button><button data-dockset="down" data-id="${id}"${i === pinned.length - 1 ? " disabled" : ""} title="Descendre">↓</button><button data-dockset="unpin" data-id="${id}">Retirer</button>` : `<button data-dockset="pin" data-id="${id}">📌 Épingler</button>`}</span></div>`; };
  return `<h4>DOCK</h4><p class="muted">Les dossiers (et applications) du dock, dans l'ordre. Un dossier s'ouvre comme sur un iPhone ; ses applications s'affichent ensuite en onglets. Aussi : clic droit sur une icône (dock ou Activités), ou glisser-déposer dans le dock. Dans Activités : glisse une application sur un dossier pour l'y ranger, sur une autre application pour créer un dossier, hors d'un dossier ouvert pour l'en sortir.</p>
    ${pinned.map((id, i) => row(id, true, i)).join("")}<h4>AUTRES DOSSIERS ET APPLICATIONS</h4>${others.map(id => row(id, false)).join("") || `<p class="muted">Toutes sont dans le dock.</p>`}
    <div class="osacts"><button data-dockset="reset">↺ Dock par défaut</button><button data-dockset="resetfolders">↺ Dossiers par défaut</button></div>`;
}
let lastShown = "";
export function renderChiefOs() {
  if (osBox.hidden) return;
  const now = clockNow(), app = curApp(), { icon, label } = app;
  const skin = osSkin(), holo = skin === "holo", book = skin === "grimoire", crypt = skin === "crypte", ship = skin === "galion", zen = skin === "zen", trop = skin === "tropic";
  for (const k of ["holo", "grimoire", "crypte", "galion", "zen", "tropic"]) osBox.classList.toggle(k, skin === k);
  osBox.classList.toggle("aos", skin === "ubuntu");  // the default look (css/11-chiefos-design.css)
  const shownKey = osOverview ? "·overview" : osApp, fresh = shownKey !== lastShown; lastShown = shownKey;
  const day = now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }), time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const pinned = dockApps(), running = !osOverview && !dockOf(osApp) ? osApp : null;  // the open app shows up while it runs, like Ubuntu
  const dock = pinned.map(id => dockIcon(id)).join("") + (running ? `<span class="ubrun" aria-hidden="true"></span>${dockIcon(running, " running")}` : "");
  // Activités, like an iPhone home screen: the folders, then the apps outside every folder; a search lists the apps
  // themselves (a folder's name finds all its apps)
  const q = osFilter.toLowerCase(), hit = a => { const sp = OsApp.spaceOf(a.id); return a.label.toLowerCase().includes(q) || !!sp?.label.toLowerCase().includes(q); };
  const tile = ({ id, label: l, tint }, loose) => `<button data-os-app="${id}" data-dock="${id}"${loose ? ` data-loose="${id}"` : ""} draggable="true" style="--tint:${tint}">${iconOf(id)}${osBadge(id)}${pinned.includes(id) ? '<span class="ubpin" title="Dans le dock">📌</span>' : ""}<small>${esc(l)}</small></button>`;
  const folderTile = sp => `<button data-fold="${sp.id}" data-dock="${sp.id}" draggable="true" style="--tint:${tintOf(sp.id)}" title="${esc(OsApp.appsOf(sp).map(a => a.label).join(", "))}">${iconOf(sp.id)}${osBadge(sp.id)}<small>${esc(sp.label)}</small></button>`;
  const home = q ? OsApp.list().filter(hit).map(a => tile(a)).join("")
    : OsApp.SPACES.filter(sp => OsApp.appsOf(sp).length).map(folderTile).join("") + OsApp.list().filter(a => !OsApp.spaceOf(a.id)).map(a => tile(a, true)).join("");
  const tabs = OsApp.spaceOf(osApp) ? OsApp.appsOf(OsApp.spaceOf(osApp)) : [];
  const fsp = osFolder && OsApp.space(osFolder);
  const folder = fsp ? `<div class="ubfolderbg${performance.now() - folderOpened < 300 ? " fresh" : ""}"><div class="ubfolder"><input class="ubfname" value="${esc(fsp.label)}" maxlength="30" aria-label="Nom du dossier" title="Renommer le dossier">
      <div class="ubgrid">${OsApp.appsOf(fsp).map(a => tile(a)).join("")}</div><p class="ubhint">Glisse une application hors du dossier pour l'en sortir.</p></div></div>` : "";
  const body = osOverview
    ? `<div class="ubover${fresh ? " enter" : ""}"><input class="ubsearch" placeholder="Rechercher une application…" value="${esc(osFilter)}" aria-label="Rechercher une application">
        <div class="ubgrid">${home || `<p>Aucune application.</p>`}</div>
        <p class="ubhint">Glisse une application sur un dossier pour l'y ranger, ou sur une autre pour créer un dossier. Clic droit : épingler au dock, défaire un dossier.</p>
        ${OsApp.advanced ? "" : `<p class="ubhint">Mode simple : ${[...OsApp.all.values()].filter(a => !a.hidden && !a.away() && !OsApp.SIMPLE.has(a.id)).length} applications de plus (atelier, équipe, outils) avec <button data-os-advanced="1">le mode avancé</button>.</p>`}</div>`
    : `<section class="ubwin${fresh ? " enter" : ""}" aria-label="${esc(label)}"><div class="ubhead"><span class="ubappic" style="--tint:${app.tint}">${icon}</span><b>${OsApp.spaceOf(osApp) && skin === "ubuntu" && OsApp.spaceOf(osApp).label !== label ? `<span class="ubcrumb">${esc(OsApp.spaceOf(osApp).label)}</span>` : ""}${esc(label)}</b>
        <span class="ubctl"><button data-os="overview" title="Réduire : revenir à toutes les applications" aria-label="Réduire">–</button><button data-os="max" title="${osBox.classList.contains("max") ? "Restaurer la taille" : "Agrandir"}" aria-label="Agrandir">▢</button><button class="x" data-os="close" title="Fermer ChiefOS (Échap)" aria-label="Fermer">×</button></span></div>
        ${tabs.length > 1 ? `<nav class="ubtabs" aria-label="${esc(OsApp.spaceOf(osApp).label)}">${tabs.map(a => `<button data-os-app="${a.id}" class="${a.id === osApp ? "on" : ""}"${a.id === osApp ? ' aria-current="page"' : ""} style="--tint:${a.tint}">${a.icon} ${esc(a.label)}${osBadge(a.id)}</button>`).join("")}</nav>` : ""}
        <div class="osapp">${app.render()}</div></section>`;
  const boot = BOOT[skin] && performance.now() < bootUntil ? `<div class="hoboot"><b>${BOOT[skin].title}</b><span>${holo ? `v${now.getFullYear() - 2000}.${now.getMonth() + 1}` : crypt ? "🕯 🦇 🕯" : ship ? "⚓ 🏴‍☠️ ⚓" : zen ? "⛩ 🌸 ⛩" : trop ? "🌴 ☀️ 🌴" : "✦ ✦ ✦"}</span>${BOOT[skin].lines.map((l, i) => `<i style="--d:${i * 0.22}s">${l}</i>`).join("")}<em></em></div>` : "";
  osBox.innerHTML = `${boot}<div class="ubtop"><button class="ubact${osOverview ? " on" : ""}" data-os="overview">${holo ? "◈ MODULES" : book ? "✦ Sortilèges" : crypt ? "☾ Séances" : ship ? "⚓ Cap" : zen ? "⛩ Chemins" : trop ? "🌴 Spots" : "Activités"}</button><span class="ubtitle">${holo ? `▸ ${esc(label).toUpperCase()}` : book ? `📜 ${esc(label)}` : crypt ? `🕯️ ${esc(label)}` : ship ? `🗺️ ${esc(label)}` : zen ? `🎴 ${esc(label)}` : trop ? `🌺 ${esc(label)}` : `${icon} ${esc(label)}`}</span>
      <span class="ubclock">${holo ? `${esc(day).toUpperCase()} · ${time} · SYS ✓` : book ? `${esc(now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} · ${time.replace(":", " h ")}` : crypt ? `☾ ${esc(day)} · ${time}${now.getHours() === 0 ? " · minuit…" : ""}` : ship ? `⚓ ${esc(day)} · ${time} · cap au ${["N", "NE", "E", "SE", "S", "SO", "O", "NO"][now.getHours() % 8]}` : zen ? `${esc(day)} · ${time} · ${["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][Math.floor(((now.getHours() + 1) % 24) / 2)]}の刻` : trop ? `☀️ ${esc(day)} · ${time}${now.getHours() >= 18 ? " · happy hour 🍹" : ""}` : `${esc(day)}  ${time}`}</span><span class="ubsys"><button data-os="close" title="Quitter ChiefOS (Échap)" aria-label="Quitter ChiefOS">⏻<span class="ublabel">Quitter</span></button></span></div>
    <div class="ubdesk"><nav class="ubdock" aria-label="Dock">${dock}<span class="ubsep"></span><button data-os="overview" class="ubshow${osOverview ? " on" : ""}" title="Toutes les applications" aria-label="Toutes les applications">⋮⋮⋮<span class="ublabel">Toutes les applis</span></button></nav>${body}${folder}</div>${menuHtml()}`;
  if (osOverview && !fsp) { const s = osBox.querySelector(".ubsearch"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  else app.mount();
}
osBox.addEventListener("input", ev => {
  if (ev.target.classList.contains("ubsearch")) { osFilter = ev.target.value; renderChiefOs(); }
  if (ev.target.classList.contains("ubfname") && OsApp.space(osFolder)) { const name = ev.target.value.trim() || "Dossier"; saveFolders(OsApp.SPACES.map(s => s.id === osFolder ? { ...s, label: name, apps: s.apps } : s)); }
});
osBox.addEventListener("change", ev => { if (ev.target.classList.contains("ubfname")) renderChiefOs(); });
osBox.addEventListener("keydown", ev => { if (ev.target.classList.contains("ubfname") && ev.key === "Enter") ev.target.blur(); if (ev.target.classList.contains("ubsearch") && ev.key === "Enter") { const first = osBox.querySelector(".ubgrid [data-os-app]"); if (first) first.click(); } });
osBox.addEventListener("click", ev => {
  if (osFolder && ev.target.classList?.contains("ubfolderbg")) { osFolder = null; return renderChiefOs(); }  // a click beside the open folder closes it
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.os === "close") return closeChiefOs();
  if (b.dataset.os === "overview") { osOverview = !osOverview; osFilter = ""; osFolder = null; return renderChiefOs(); }
  if (b.dataset.fold) return openFolder(b.dataset.fold);
  if (b.dataset.os === "max") { document.body.classList.toggle("osmax", osBox.classList.toggle("max")); return renderChiefOs(); }  // full screen: the office's own controls step aside (body.osmax)
  if (b.dataset.osAdvanced) return setOsAdvanced(b.dataset.osAdvanced === "1");
  if (b.dataset.osApp) { setOsApp(b.dataset.osApp); if (b.dataset.osSection) OsApp.get(b.dataset.osApp)?.goTo?.(b.dataset.osSection); return renderChiefOs(); }  // a section of it (Réglages → Intégrations)
  if (b.dataset.osOpen) { if (OsApp.space(b.dataset.osOpen)) return osFolder === b.dataset.osOpen ? (osFolder = null, renderChiefOs()) : openFolder(b.dataset.osOpen); openEntry(b.dataset.osOpen); return renderChiefOs(); }
  if (!osOverview && ev.target.closest(".osapp")) curApp().click(b, ev);  // the app's own buttons
});
osBox.addEventListener("input", ev => { if (!osOverview && ev.target.closest(".osapp")) curApp().input(ev); });
osBox.addEventListener("change", ev => { if (!osOverview && ev.target.closest(".osapp")) curApp().change(ev); });
// the handlers an app wired with OsApp.listen: only the app shown gets the events of its window
for (const type of OsApp.EVENTS) osBox.addEventListener(type, ev => {
  if (osOverview || !ev.target.closest?.(".ubwin") || ev.target.closest(".ubtabs")) return;  // the tabs belong to ChiefOS
  for (const fn of OsApp.handlers.get(osApp)?.[type] || []) fn(ev);
});
addEventListener("keydown", ev => { if (ev.key === "Escape" && !osBox.hidden && !ev.target.closest?.(".termscreen")) { ev.stopImmediatePropagation(); const inner = osBox.querySelector("[data-esc]"); if (osMenu) { osMenu = null; renderChiefOs(); } else if (inner) inner.click(); else if (osFolder) { osFolder = null; renderChiefOs(); } else closeChiefOs(); } }, true);  // an app's own window ([data-esc]: its close button), then an open folder, close first  // Escape belongs to a terminal that has the focus
document.getElementById("osbtn").onclick = () => chiefToDesk();
// live apps refresh every 3 s (not while a field of theirs has the focus); forms and long pages stay still
setInterval(() => { if (!osBox.hidden && !osOverview && curApp().live && !osBox.contains(document.activeElement?.closest("select, input, textarea"))) { const sc = osBox.querySelector(".osapp")?.scrollTop; renderChiefOs(); const a = osBox.querySelector(".osapp"); if (a) a.scrollTop = sc || 0; } }, 3000);

// right click on an app (dock or Activités): its menu; a click elsewhere closes it
osBox.addEventListener("contextmenu", ev => {
  const b = ev.target.closest("[data-dock]"); if (!b) return;
  ev.preventDefault();
  const r = osBox.getBoundingClientRect();
  const br = b.getBoundingClientRect(), inDock = !!b.closest(".ubdock");  // beside the dock icon, under the pointer in Activités
  osMenu = { id: b.dataset.dock, at: performance.now(), x: Math.min((inDock ? br.right + 8 : ev.clientX) - r.left, r.width - 200), y: Math.min((inDock ? br.top : ev.clientY) - r.top, r.height - 170) };
  renderChiefOs();
});
osBox.addEventListener("click", ev => {
  const m = ev.target.closest("[data-menu]"), d = ev.target.closest("[data-dockset]");
  if (m) {
    ev.stopImmediatePropagation(); const id = m.dataset.id; osMenu = null;
    if (m.dataset.menu === "open") { if (OsApp.space(id)) return openFolder(id); openEntry(id); return renderChiefOs(); }
    if (m.dataset.menu === "unfold") return unfold(id);
    if (m.dataset.menu === "out") return moveToFolder(id, null);
    return m.dataset.menu === "pin" ? pinApp(id) : m.dataset.menu === "unpin" ? unpinApp(id) : moveApp(id, m.dataset.menu === "up" ? -1 : 1);
  }
  if (d) {
    const id = d.dataset.id, a = d.dataset.dockset;
    if (a === "reset") return saveDock(DOCK_DEFAULT);
    if (a === "resetfolders") { saveFolders(OsApp.DEFAULT_SPACES); return renderChiefOs(); }
    return a === "pin" ? pinApp(id) : a === "unpin" ? unpinApp(id) : moveApp(id, a === "up" ? -1 : 1);
  }
  if (osMenu && !ev.target.closest(".ubmenu")) { osMenu = null; renderChiefOs(); }
}, true);
// drag and drop in the dock to reorder; dropped from Activités onto the dock: pinned there. In Activités, like an
// iPhone: an app dropped onto a folder goes in it, onto a loose app makes a folder of both, out of the open folder leaves it
let dragApp = null;
const dropTarget = ev => {
  if (!dragApp) return null;
  if (ev.target.closest(".ubdock")) return { kind: "dock" };
  if (!OsApp.get(dragApp)) return null;  // a folder only goes to the dock
  const f = ev.target.closest("[data-fold]"), l = ev.target.closest("[data-loose]");
  if (f && !OsApp.space(f.dataset.fold)?.apps.includes(dragApp)) return { kind: "fold", el: f, id: f.dataset.fold };
  if (l && l.dataset.loose !== dragApp && !OsApp.spaceOf(dragApp)) return { kind: "loose", el: l, id: l.dataset.loose };
  if (osFolder && ev.target.classList.contains("ubfolderbg") && OsApp.space(osFolder)?.apps.includes(dragApp)) return { kind: "out" };
  return null;
};
osBox.addEventListener("dragstart", ev => { const b = ev.target.closest("[data-dock]"); if (b) { dragApp = b.dataset.dock; ev.dataTransfer.effectAllowed = "move"; } });
osBox.addEventListener("dragover", ev => {
  const t = dropTarget(ev); if (!t) return;
  ev.preventDefault();
  for (const el of osBox.querySelectorAll(".dropon")) if (el !== t.el) el.classList.remove("dropon");
  t.el?.classList.add("dropon");
});
osBox.addEventListener("dragleave", ev => ev.target.closest?.(".dropon")?.classList.remove("dropon"));
osBox.addEventListener("drop", ev => {
  const t = dropTarget(ev); if (!t) return;
  ev.preventDefault();
  const id = dragApp; dragApp = null;
  if (t.kind === "fold") return moveToFolder(id, t.id);
  if (t.kind === "loose") return makeFolder(t.id, id);
  if (t.kind === "out") { osFolder = null; return moveToFolder(id, null); }
  const over = ev.target.closest("[data-dock]")?.dataset.dock, a = dockApps().filter(x => x !== id), i = over && over !== id ? a.indexOf(over) : a.length;
  a.splice(i < 0 ? a.length : i, 0, id); saveDock(a);
});
osBox.addEventListener("dragend", () => { dragApp = null; });

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get OS_SKINS() { return OS_SKINS; }, get osSkin() { return osSkin; }, get setOsSkin() { return setOsSkin; }, get chiefToDesk() { return chiefToDesk; }, get osBox() { return osBox; }, get renderChiefOs() { return renderChiefOs; } });
