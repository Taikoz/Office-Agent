// Side panel (agent details) and canvas input.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, DESKS, H, TEAM, W, booted, chief, clip, curSession, current, cv, data, detailTimer, ents, fetchAgent, mmx, selected, specialty, storeStamp, typeColor } from "../core/core.js";
import { boardPagers, flipBoard } from "../world/scene.js";
import { crew, renderTeam } from "../sims/crew.js";
import { chiefLoungeAct, chiefToLounge, chiefToOffice } from "../world/chief.js";
import { loungeSay, loungers, pick, renderMate, setView, view } from "../world/lounge.js";
import { laser } from "../world/fun.js";
import { Incident } from "../incidents/base.js";
import { renderShop } from "../world/shop.js";
import { challenge, endMatch, match } from "../games/base.js";
import { cat, petCat } from "../world/cat.js";
import { STATUS_FR, ago, esc, renderHud } from "../core/data.js";
import { renderStore } from "../agents/mmx.js";

/* ---------- detail panel ---------- */
export const panel = document.getElementById("panel");
const STEP_ICON = { done: "✓", current: "▶", todo: "·" };

// what is under the pointer, in the room on screen (js/rooms/): an id the click below acts on
function hit(ev) {
  if (!booted) return null;
  const { x, y, uid, wall } = canvasPoint(ev);
  if (uid != null && wall === "back" && !hub.buy.on) { const own = hub.Room.current().hit(x, y); if (own && own !== `item:${uid}`) return own; }  // on the right wall: the board's cards, the whiteboard, the TV first
  if (uid != null) {  // an object bought (build.js), in front of anything else drawn there; the MMX cabinet and the trophies keep their panels
    const role = hub.defOf(hub.itemByUid(uid)?.type)?.role;
    return role === "mmx" ? "store" : role === "trophies" ? "trophies" : `item:${uid}`;
  }
  return hub.Room.current().hit(x, y);
}
// the point of the scene under the pointer; in isometric view, the 2D point drawn there (iso/engine.js toScene),
// with sx, sy: where it is on the screen (a menu opens there)
export function canvasPoint(ev) {
  const r = cv.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * W, sy = (ev.clientY - r.top) / r.height * H;
  const room = booted && hub.Room.current();
  if (room?.iso?.()) { const p = hub.ISO.toScene(sx, sy, hub.buy.on && !!(hub.buy.placing || hub.buy.moving)); return { ...p, sx, sy }; }  // uid: an object bought, drawn there
  return { x: sx, y: sy, sx, sy };
}

// mouse wheel over a board column with several pages: flip it
cv.addEventListener("wheel", ev => {
  if (!booted || view !== "office") return;
  const { x, y } = canvasPoint(ev), pg = boardPagers.find(b => x >= b.x && x <= b.x + b.w && y >= 4 && y <= b.y + b.h);
  if (!pg) return;
  ev.preventDefault();
  flipBoard(pg.st, ev.deltaY > 0 ? 1 : -1);
}, { passive: false });
cv.addEventListener("mousemove", ev => { const p = canvasPoint(ev); laser.x = p.x; laser.y = p.y; laser.over = true; if (match) { match.mouseY = p.y; match.mouseX = p.x; } const id = hit(ev); hub.setHover?.(id, ev); cat.hover = id === "cat"; cv.classList.toggle("hover", !!id); cv.classList.toggle("hover-store", id === "store"); });
cv.addEventListener("mouseleave", () => { hub.hideHover?.(); cv.classList.remove("hover-store"); cat.hover = false; laser.over = false; if (match) match.mouseY = match.mouseX = null; });
cv.addEventListener("click", ev => {
  if (hub.ISO.takeDrag()) return;  // the scene was dragged (iso/engine.js camera), not clicked
  hub.closePie();
  if (hub.buy.on && view !== "game") return hub.buyClick(canvasPoint(ev));  // buy mode: place, pick, move, sell (build.js)
  if (hub.Room.current().click(canvasPoint(ev), performance.now())) return;  // a game, the meeting room's board and TV (js/rooms/)
  const id = hit(ev);
  if (!id) {  // an empty spot of the floor: the chief walks there
    const p = canvasPoint(ev);
    hub.Room.current().floorClick(p);
    return;
  }
  if (id.startsWith("chiefact:")) return chiefLoungeAct(id.slice(9));
  if (id === "cat") return petCat();
  if (id === "lounge") return chiefToLounge();                                        // the office door: he goes on a break
  if (id === "office") return view === "lounge" && chief.room === "lounge" ? chiefToOffice() : setView("office");
  if (id.startsWith("happen:")) return hub.Happening.clickId(id.slice(7));
  if (id === "meet-table") return hub.startMeeting();
  if (id === "dog") return hub.openPie("dog", null, canvasPoint(ev));  // the break-room door: back to work
  if (id.startsWith("incident:")) return Incident.solveId(id.slice(9));
  if (id.startsWith("item:")) {  // Sims pie of the object (the dining table: the meal on it)
    const it = hub.itemByUid(id.slice(5));
    if (it && hub.defOf(it.type).role === "table" && it.room === "lounge") return hub.openPie("table", null, canvasPoint(ev));
    return hub.itemPieItems(id.slice(5)).length ? hub.openPie("item", id.slice(5), canvasPoint(ev)) : null;
  }
  if (id.startsWith("boss:")) return hub.whackBoss(id.slice(5));
  if (id.startsWith("boardpg:")) { const [, st, dir] = id.split(":"); return flipBoard(st, +dir); }
  if (id.startsWith("chief:")) return hub.chiefOrder(id.slice(6));
  if (id.startsWith("desk:")) { if (performance.now() - hub.launchDrop > 400) openPanel(`launch:${id.slice(5)}`); return; }
  if (id.startsWith("duel:")) {
    const skin = id.slice(5), here = [...loungers.values()].filter(l => !l.called && !l.path.length);
    const opp = here.find(l => l.spot?.act.id === skin) || here[Math.floor(Math.random() * here.length)];
    return opp ? challenge(opp.name, skin) : hub.toast("SALLE DE REPOS", "Personne pour jouer", "Tout le monde est au bureau.");
  }
  if (id.startsWith("mate:")) {  // Sims pie menu around the dev (the needs window, when open, also switches to that dev)
    if (hub.simsOpen) hub.selectSim(id.slice(5));
    loungeSay(id.slice(5), pick(["Salut chef !", "Oui ?", "Hey !", "Tu veux quelque chose ?"]));
    return hub.openPie("mate", id.slice(5), canvasPoint(ev));
  }
  if (id === "kitchen" || id === "table") return hub.openPie(id, null, canvasPoint(ev));
  const a = curSession()?.agents.find(x => x.id === id), who = ents.get(id)?.who;
  if (hub.simsOpen && who && !a?.question) return hub.selectSim(who);
  if (a && !a.question) return hub.openPie("worker", id, canvasPoint(ev));  // Sims pie: screen, coffee, cheer, hint (social.js)
  openPanel(id);  // a question is answered in the side panel
});
document.getElementById("rows").addEventListener("click", ev => {
  if (ev.target.closest("a")) return;  // MR / ticket links open in a new tab
  const tool = ev.target.closest("[data-history], [data-relaunch], [data-comic]");
  if (tool?.dataset.comic) return hub.openComic?.(tool.dataset.comic);
  if (tool?.dataset.history) return openPanel(`ticket:${tool.dataset.history}`);
  if (tool?.dataset.relaunch) return hub.relaunch(tool.dataset.relaunch);
  const rv = ev.target.closest("[data-review]");
  if (rv) { const i = DESKS.findIndex(hub.freeDesk); return openPanel(`launch:${Math.max(0, i)}:${rv.dataset.review}:feature-builder`); }
  const tr = ev.target.closest("[data-id]"); if (tr) openPanel(tr.dataset.id);
});
document.getElementById("p-close").onclick = closePanel;
document.addEventListener("keydown", ev => { if (ev.key !== "Escape") return; if (view === "game" && match?.phase === "menu") { hub.match = null; return setView("lounge"); } if (view === "game" && match) { match.ps = Math.min(match.ps, 4); match.as = 5; return endMatch(); } if (hub.closeOverlays()) return; if (!hub.pcBox.hidden) hub.closePc(); else if (panel.classList.contains("open") || hub.perfBox.hidden) closePanel(); else hub.togglePerf(false); });

export function openPanel(id) {
  hub.selected = id;
  panel.classList.add("open"); panel.setAttribute("aria-hidden", "false");
  clearInterval(detailTimer);
  loadDetail(); hub.detailTimer = setInterval(loadDetail, 2000);
  renderHud();
}

export function closePanel() {
  hub.selected = null; clearInterval(detailTimer); hub.launchKey = null; hub.ticketShown = null;
  document.getElementById("p-q").innerHTML = ""; hub.shownQ = null;
  document.getElementById("p-store").hidden = true; hub.storeStamp = null;
  document.getElementById("p-game").hidden = true;
  panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true");
  renderHud();
}

export function hhmm(ts) { return ts ? new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""; }

export async function loadDetail() {
  if (!selected) return;
  const store = selected === "store", trophies = selected === "trophies";
  document.getElementById("p-store").hidden = !store;
  document.getElementById("p-game").hidden = !trophies;
  if (selected === "shop") {
    document.getElementById("p-main").hidden = true; document.getElementById("p-game").hidden = false;
    const tag = document.getElementById("p-tag");
    tag.textContent = "BOUTIQUE"; tag.style.background = "#fbaa08";
    document.getElementById("p-title").textContent = "Déco et chapeaux";
    document.getElementById("p-mission").textContent = "Dépense l'argent du foyer (§), gagné à chaque mission livrée. Les achats restent dans ce navigateur.";
    if (!document.getElementById("p-game").contains(document.activeElement)) renderShop();
    return;
  }
  if (selected.startsWith("ticket:")) {
    document.getElementById("p-main").hidden = true; document.getElementById("p-game").hidden = false;
    const tag = document.getElementById("p-tag");
    tag.textContent = "TICKET"; tag.style.background = "#fbaa08";
    const id = selected.slice(7);
    document.getElementById("p-title").textContent = `${id}${data.tickets?.[id]?.summary ? ` — ${data.tickets[id].summary}` : ""}`;
    document.getElementById("p-mission").textContent = "Tous les agents passés sur ce ticket, du plus ancien au plus récent.";
    hub.renderTicket(id);
    return;
  }
  if (selected.startsWith("launch:")) {
    document.getElementById("p-main").hidden = true; document.getElementById("p-game").hidden = false;
    const tag = document.getElementById("p-tag");
    tag.textContent = "LANCER"; tag.style.background = "#51cf66";
    const [desk, ticket] = selected.slice(7).split(":");
    document.getElementById("p-title").textContent = ticket ? `Nouvel agent sur ${ticket}` : `Bureau libre de ${TEAM[+desk] || "?"}`;
    document.getElementById("p-mission").textContent = "Choisis l'agent et sa mission. Astuce : glisse un ticket du tableau sur un bureau libre.";
    hub.renderLaunch(selected.slice(7));
    return;
  }
  if (selected.startsWith("mate:")) {
    document.getElementById("p-main").hidden = true; document.getElementById("p-game").hidden = false;
    const tag = document.getElementById("p-tag");
    tag.textContent = "ÉQUIPE"; tag.style.background = "#4090d7";
    document.getElementById("p-title").textContent = selected.slice(5);
    document.getElementById("p-mission").textContent = "Discute, offre un café, encourage ou envoie vers une activité. Purement pour le jeu : ça ne change rien au travail des agents.";
    renderMate(selected.slice(5));
    return;
  }
  if (selected === "team") {
    document.getElementById("p-main").hidden = true; document.getElementById("p-game").hidden = false;
    const tag = document.getElementById("p-tag");
    tag.textContent = "ÉQUIPE"; tag.style.background = "#51cf66";
    document.getElementById("p-title").textContent = `${[...ents.values()].filter(e => e.who && !e.leaving).length} / ${TEAM.length} au bureau`;
    document.getElementById("p-mission").textContent = "Jauges simulées à partir du vrai travail des agents (temps de travail, tests, MR, blocages, pauses café). Purement pour le jeu : elles ne changent rien au travail des agents.";
    renderTeam();
    return;
  }
  if (trophies) {
    document.getElementById("p-main").hidden = true;
    const tag = document.getElementById("p-tag");
    tag.textContent = "SUCCÈS"; tag.style.background = "#fbaa08";
    document.getElementById("p-title").textContent = hub.game ? `${hub.game.achievements.filter(a => a.unlocked).length} / ${hub.game.achievements.length} succès` : "Succès";
    document.getElementById("p-mission").textContent = "Calculé depuis les transcripts, le journal d'audit et MMX. L'XP récompense les résultats (livré, tests verts, MR…), pas l'activité.";
    hub.renderTrophies();
    return;
  }
  if (store) {
    document.getElementById("p-main").hidden = true;
    const tag = document.getElementById("p-tag");
    tag.textContent = "MMX"; tag.style.background = "#c9a24b";
    document.getElementById("p-mission").textContent = "Ce que la mémoire MMX contient (lecture seule). En vert : rangé il y a moins de 2 min.";
    if (storeStamp !== mmx?.stamp) renderStore();
    return;
  }
  hub.renderQuestion(hub.currentQuestion());
  const orphan = selected.startsWith("q:");
  document.getElementById("p-main").hidden = orphan;
  if (orphan) {
    const q = hub.currentQuestion();
    const tag = document.getElementById("p-tag");
    tag.textContent = "question"; tag.style.background = "#fbaa08";
    document.getElementById("p-title").textContent = q?.from || "Question d'un agent";
    document.getElementById("p-mission").textContent = q ? "Agent non retrouvé dans les sessions affichées." : "Question déjà répondue.";
    return;
  }
  if (!current) return;
  let d;
  try {
    if (DEMO) d = await fetchAgent(selected);
    else {
      d = await fetchAgent(selected, { cache: "no-store" });
      if (!d) { document.getElementById("p-now").textContent = "Agent introuvable (session vidée ?)"; return; }
    }
  } catch (err) { document.getElementById("p-now").textContent = `serveur injoignable (${err.message})`; return; }
  if (!d) return;
  const isChief = d.id === "chief";
  const tag = document.getElementById("p-tag");
  tag.textContent = isChief ? `${CHIEF_NAME} · ${d.type}` : `${crew.ids[d.id] ? `${crew.ids[d.id]} · ` : ""}${specialty(d.type)}`; tag.title = d.type; tag.style.background = isChief ? "#fbaa08" : typeColor(d.type);
  const yt = data.tickets[d.ticket];
  document.getElementById("p-title").textContent = `${d.ticket || (isChief ? (d.type === "tech-lead" ? "Tech lead" : "Chef de session") : "Sans ticket")}${yt?.state ? ` · ${yt.state}` : ""}`;
  document.getElementById("p-mission").textContent = d.description || d.prompt || "";
  const pr = d.progress, bar = document.getElementById("p-bar");
  bar.className = `bar ${d.status}`;
  bar.querySelector("i").style.width = `${pr.pct}%`;
  bar.querySelector("b").textContent = `${pr.pct} %`;
  document.getElementById("p-plabel").textContent = `${STATUS_FR[d.status] || d.status} · ${pr.label}`;
  document.getElementById("p-psrc").textContent = pr.source === "todo" ? "d'après sa todo-list" : "estimé d'après ses actions";
  document.getElementById("p-steps").innerHTML = pr.steps.map(s => `<li class="${s.state}">${STEP_ICON[s.state]} ${esc(s.label)}</li>`).join("");
  const now = d.status === "blocked" ? `⚠ ${d.lastError}` : d.status === "done" ? (d.lastText ? `Livré : ${d.lastText}` : "Livré ✓")
    : d.idle > 45 ? `… réfléchit (rien depuis ${ago(d.idle)})` : d.action || "démarre…";
  document.getElementById("p-now").textContent = now;
  const started = d.started ? Math.round((Date.now() - Date.parse(d.started)) / 1000) : null;
  document.getElementById("p-stats").innerHTML = [["outils", d.tools], ["erreurs", d.errors], ["tokens", d.tokens], ["durée", started !== null ? ago(started) : "—"]]
    .map(([k, v]) => `<div><small>${k}</small>${esc(v)}</div>`).join("");
  document.getElementById("p-count").textContent = d.eventCount > d.events.length ? `(${d.events.length} derniers / ${d.eventCount})` : "";
  const tl = document.getElementById("p-tl"), stick = tl.parentElement.scrollTop < 8;
  tl.innerHTML = d.events.slice().reverse().map(e => `<li class="${e.kind}"><time>${hhmm(e.t)}</time><span>${
    e.kind === "tool" ? `<span class="tool">${esc(e.tool)}</span> ${esc(e.label)}` : e.kind === "error" ? `✗ ${esc(clip(e.label, 200))}` : `« ${esc(clip(e.label, 200))} »`}</span></li>`).join("");
  if (stick) tl.parentElement.scrollTop = 0;
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get closePanel() { return closePanel; }, get loadDetail() { return loadDetail; } });
