"use strict";
// Side panel (agent details) and canvas input.

/* ---------- detail panel ---------- */
const panel = document.getElementById("panel");
const STEP_ICON = { done: "✓", current: "▶", todo: "·" };

function canvasPoint(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
}

function hit(ev) {
  if (!booted) return null;
  const { x, y } = canvasPoint(ev);
  if (view === "lounge") return hitLounge(x, y);
  if (view === "game") return null;
  const pager = hitBoardPager(x, y);  // before people: a dev walking past the board must not hide its arrows
  if (pager) return pager;
  if (Math.abs(x - cat.x) <= 7 && y >= cat.y - 10 && y <= cat.y + 2) return "cat";
  const boss = hitBoss(x, y);
  if (boss) return boss;
  for (const e of ents.values()) {
    if (e.leaving || e.queued) continue;
    const box = e.seated ? [e.desk.x - 18, e.desk.y - 24, e.desk.x + 18, e.desk.y + 30] : [e.x - 7, e.y - 22, e.x + 7, e.y + 1];
    if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) return e.agent.id;
  }
  const thing = hitEvents(x, y) || hitItem(x, y, "office");  // bought objects (build.js), desks included
  if (thing) return thing;
  const desk = hitDesk(x, y);
  if (desk) return desk;
  // the chief is yours: coffee machine, console corner, podium
  if (x >= 316 && x <= 334 && y >= 44 && y <= 66) return "chief:coffee";
  if (x >= 146 && x <= 174 && y >= 62 && y <= 96) return "chief:console";
  if (x >= 208 && x <= 236 && y >= 82 && y <= 94 && chief.at !== "podium") return "chief:podium";
  if (x >= 350 && x <= 384 && y >= 8 && y <= 70) return "lounge";
  if (chief.room === "office" && Math.abs(x - chief.x) <= 12 && y >= chief.y - 26 && y <= chief.y + 8 && current) return "chief";
  if ((x >= SHELF.x - 2 && x <= SHELF.x + SHELF.w + 2 && y >= SHELF.y - 8 && y <= SHELF.y + 4)
    || (x >= FRAME.x - 2 && x <= FRAME.x + FRAME.w + 2 && y >= FRAME.y - 2 && y <= FRAME.y + FRAME.h + 8)) return "trophies";
  if (x >= CAB.x - 3 && x <= CAB.x + CAB.w + 3 && y >= CAB.y - 16 && y <= CAB.y + CAB.h + 6) return "store";
  return null;
}

// mouse wheel over a board column with several pages: flip it
cv.addEventListener("wheel", ev => {
  if (!booted || view !== "office") return;
  const { x, y } = canvasPoint(ev), pg = boardPagers.find(b => x >= b.x && x <= b.x + b.w && y >= 4 && y <= b.y + b.h);
  if (!pg) return;
  ev.preventDefault();
  flipBoard(pg.st, ev.deltaY > 0 ? 1 : -1);
}, { passive: false });
cv.addEventListener("mousemove", ev => { const p = canvasPoint(ev); laser.x = p.x; laser.y = p.y; laser.over = true; if (match) { match.mouseY = p.y; match.mouseX = p.x; } const id = hit(ev); cat.hover = id === "cat"; cv.classList.toggle("hover", !!id); cv.classList.toggle("hover-store", id === "store"); });
cv.addEventListener("mouseleave", () => { cv.classList.remove("hover-store"); cat.hover = false; laser.over = false; if (match) match.mouseY = match.mouseX = null; });
cv.addEventListener("click", ev => {
  closePie();
  if (buy.on && view !== "game") return buyClick(canvasPoint(ev));  // buy mode: place, pick, move, sell (build.js)
  if (view === "game") { if (match?.skin === "darts") dartsClick(canvasPoint(ev), performance.now()); else if (match?.skin === "babyfoot") footKick(performance.now()); return; }
  const id = hit(ev);
  if (!id) {  // an empty spot of the floor: the chief walks there
    const p = canvasPoint(ev);
    if (view === "office") chiefWalk(p); else if (view === "lounge" && chief.room === "lounge" && p.y > 72) chiefLoungeWalk(p);
    return;
  }
  if (id.startsWith("chiefact:")) return chiefLoungeAct(id.slice(9));
  if (id === "cat") return petCat();
  if (id === "lounge") return chiefToLounge();                                        // the office door: he goes on a break
  if (id === "office") return chief.room === "lounge" ? chiefToOffice() : setView("office");  // the break-room door: back to work
  if (["fix-coffee", "clean", "croissants", "water"].includes(id)) return solveEvent(id);
  if (id.startsWith("item:")) return itemPieItems(id.slice(5)).length ? openPie("item", id.slice(5), canvasPoint(ev)) : null;  // Sims pie of the object
  if (id.startsWith("boss:")) return whackBoss(id.slice(5));
  if (id.startsWith("boardpg:")) { const [, st, dir] = id.split(":"); return flipBoard(st, +dir); }
  if (id.startsWith("chief:")) return chiefOrder(id.slice(6));
  if (id.startsWith("desk:")) { if (performance.now() - launchDrop > 400) openPanel(`launch:${id.slice(5)}`); return; }
  if (id.startsWith("duel:")) {
    const skin = id.slice(5), here = [...loungers.values()].filter(l => !l.called && !l.path.length);
    const opp = here.find(l => l.spot?.act.id === skin) || here[Math.floor(Math.random() * here.length)];
    return opp ? challenge(opp.name, skin) : toast("SALLE DE REPOS", "Personne pour jouer", "Tout le monde est au bureau.");
  }
  if (id.startsWith("mate:")) {  // Sims pie menu around the dev (the needs window, when open, also switches to that dev)
    if (simsOpen) selectSim(id.slice(5));
    loungeSay(id.slice(5), pick(["Salut chef !", "Oui ?", "Hey !", "Tu veux quelque chose ?"]));
    return openPie("mate", id.slice(5), canvasPoint(ev));
  }
  if (id === "kitchen" || id === "table") return openPie(id, null, canvasPoint(ev));
  const a = curSession()?.agents.find(x => x.id === id), who = ents.get(id)?.who;
  if (simsOpen && who && !a?.question) return selectSim(who);
  if (a && !a.question) openPc(id); else openPanel(id);  // a question is answered in the side panel
});
document.getElementById("rows").addEventListener("click", ev => {
  if (ev.target.closest("a")) return;  // MR / ticket links open in a new tab
  const tool = ev.target.closest("[data-history], [data-relaunch]");
  if (tool?.dataset.history) return openPanel(`ticket:${tool.dataset.history}`);
  if (tool?.dataset.relaunch) return relaunch(tool.dataset.relaunch);
  const rv = ev.target.closest("[data-review]");
  if (rv) { const i = DESKS.findIndex(freeDesk); return openPanel(`launch:${Math.max(0, i)}:${rv.dataset.review}:feature-builder`); }
  const tr = ev.target.closest("[data-id]"); if (tr) openPanel(tr.dataset.id);
});
document.getElementById("p-close").onclick = closePanel;
document.addEventListener("keydown", ev => { if (ev.key !== "Escape") return; if (view === "game" && match?.phase === "menu") { match = null; return setView("lounge"); } if (view === "game" && match) { match.ps = Math.min(match.ps, 4); match.as = 5; return endMatch(); } if (closeOverlays()) return; if (!pcBox.hidden) closePc(); else if (panel.classList.contains("open") || perfBox.hidden) closePanel(); else togglePerf(false); });

function openPanel(id) {
  selected = id;
  panel.classList.add("open"); panel.setAttribute("aria-hidden", "false");
  clearInterval(detailTimer);
  loadDetail(); detailTimer = setInterval(loadDetail, 2000);
  renderHud();
}

function closePanel() {
  selected = null; clearInterval(detailTimer); launchKey = null; ticketShown = null;
  document.getElementById("p-q").innerHTML = ""; shownQ = null;
  document.getElementById("p-store").hidden = true; storeStamp = null;
  document.getElementById("p-game").hidden = true;
  panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true");
  renderHud();
}

function hhmm(ts) { return ts ? new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""; }

async function loadDetail() {
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
    renderTicket(id);
    return;
  }
  if (selected.startsWith("launch:")) {
    document.getElementById("p-main").hidden = true; document.getElementById("p-game").hidden = false;
    const tag = document.getElementById("p-tag");
    tag.textContent = "LANCER"; tag.style.background = "#51cf66";
    const [desk, ticket] = selected.slice(7).split(":");
    document.getElementById("p-title").textContent = ticket ? `Nouvel agent sur ${ticket}` : `Bureau libre de ${TEAM[+desk] || "?"}`;
    document.getElementById("p-mission").textContent = "Choisis l'agent et sa mission. Astuce : glisse un ticket du tableau sur un bureau libre.";
    renderLaunch(selected.slice(7));
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
    document.getElementById("p-title").textContent = game ? `${game.achievements.filter(a => a.unlocked).length} / ${game.achievements.length} succès` : "Succès";
    document.getElementById("p-mission").textContent = "Calculé depuis les transcripts, le journal d'audit et MMX. L'XP récompense les résultats (livré, tests verts, MR…), pas l'activité.";
    renderTrophies();
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
  renderQuestion(currentQuestion());
  const orphan = selected.startsWith("q:");
  document.getElementById("p-main").hidden = orphan;
  if (orphan) {
    const q = currentQuestion();
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
