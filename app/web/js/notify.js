"use strict";
// Browser notifications: a question, a blocked dev, a delivery, an MR or a dev turning in circles. Off by default.

let notifyOn = false;
try { notifyOn = localStorage.getItem("office-notify") === "1"; } catch (_) { /* storage blocked */ }
const notifySeen = new Map();  // agent id -> last known { status, mr, stuck, q, over }

// the service worker shows the notifications: it is what lets a question be answered from its buttons
let swReg = null;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(r => { swReg = r; }).catch(() => { /* plain notifications then */ });
  navigator.serviceWorker.addEventListener("message", ev => {
    const m = ev.data || {};
    if (m.type === "answered") { sentQ.add(m.id); poll(); toast("QUESTION", "Réponse envoyée ✓", "Depuis la notification — l'agent reprend."); }
    if (m.type === "open") openFromNotification(m.session, m.agent);
  });
}
function openFromNotification(sessionId, agentId) {
  window.focus();
  if (agentId) openPanel(agentId === "chief" || !sessionId ? agentId : `${sessionId}|${agentId}`);
}

function renderNotifyBtn() {
  const b = document.getElementById("notifbtn");
  b.innerHTML = notifyOn ? `🔔<span class="lbl"> ALERTES : ON</span>` : `🔕<span class="lbl"> ALERTES : OFF</span>`;
  b.classList.toggle("on", notifyOn);
}
document.getElementById("notifbtn").onclick = async () => {
  if (!notifyOn) {
    if (!("Notification" in window)) return toast("ALERTES", "Indisponible", "Ce navigateur ne gère pas les notifications.");
    if (Notification.permission !== "granted" && await Notification.requestPermission() !== "granted")
      return toast("ALERTES", "Refusées", "Autorise les notifications pour 127.0.0.1 dans le navigateur.");
  }
  notifyOn = !notifyOn;
  try { localStorage.setItem("office-notify", notifyOn ? "1" : ""); } catch (_) { /* storage blocked */ }
  renderNotifyBtn();
  if (notifyOn) toast("ALERTES", "Activées", "Questions, blocages, livraisons, MR et devs qui tournent en rond.");
};
renderNotifyBtn();

// compare each agent with the previous poll; the first sight of an agent never notifies
function notifyChanges() {
  for (const s of data.sessions) {
    const people = [...s.agents, { ...s.chief, id: `chief:${s.id}`, status: s.chief.question ? "asking" : "working", type: s.chief.agent || "chef" }];
    for (const a of people) {
      const now = { status: a.status, mr: a.game?.mr || null, stuck: isStuck(a), q: a.question?.id || null, over: !a.id.startsWith("chief:") && overBudget(a), ci: pipeOf(a.game?.mr)?.ci || null, clash: collisionMap.get(a.id)?.file || null };
      const prev = notifySeen.get(a.id);
      notifySeen.set(a.id, now);
      if (!prev) continue;
      const chiefRow = a.id.startsWith("chief:"), who = chiefRow ? "La session principale" : crew.ids[a.id] || specialty(a.type);
      const target = chiefRow ? "chief" : a.id;
      if (now.q && now.q !== prev.q) notify(`❓ ${who} a une question`, a.question.question, s.id, target, true, a.question);
      if (chiefRow) continue;
      if (now.status !== prev.status && now.status === "blocked") notify(`⛔ ${who} est bloqué`, a.lastError || a.action, s.id, target, true);
      if (now.status !== prev.status && now.status === "done") notify(`✓ ${who} a livré${a.ticket ? ` ${a.ticket}` : ""}`, missionSummary(a, false) || a.description, s.id, target);
      if (now.mr && now.mr !== prev.mr) notify(awaitingReview(a, s) ? `📝 ${who} attend une review` : `🔔 ${who} a ouvert une MR`, `${a.ticket || ""} ${now.mr}`, s.id, target);
      if (now.ci === "failed" && prev.ci !== "failed") notify(`✗ CI rouge sur la MR de ${who}`, `${a.ticket || ""} ${a.game.mr}`, s.id, target, true);
      if (now.clash && now.clash !== prev.clash && a.id < collisionMap.get(a.id).other.id) { const c = collisionMap.get(a.id); notify(`⚠ Collision : ${who} et ${crew.ids[c.other.id] || specialty(c.other.type)}`, `Les deux modifient ${c.file}`, s.id, target, true); }
      if (now.over && !prev.over) notify(`💸 ${who} dépasse son budget`, `${money(a.game.cost)} pour un budget de ${money(budgetOf(a.type))} — ${a.description}`, s.id, target, true);
      if (now.stuck && !prev.stuck) notify(`🌀 ${who} tourne en rond`, `${a.game.sinceProgress} outils sans modif ni test — ${a.action}`, s.id, target, true);
    }
  }
}

// page in front: a toast for what needs you (the scene already celebrates the rest); otherwise a system notification.
// A question gets its first options as buttons (Chrome shows 2): one click answers, like in the side panel.
function notify(title, body, sessionId, agentId, urgent = false, question = null) {
  if (document.hasFocus()) { if (urgent) toast("ALERTE", title, clip(body, 120)); return; }
  if (!notifyOn || !("Notification" in window) || Notification.permission !== "granted") return;
  const opts = question?.options?.length && !DEMO ? question.options : [];
  const max = Notification.maxActions || 2;
  const base = { body: clip(body, 160), tag: `${agentId}:${title}`, requireInteraction: !!question,
    data: { session: sessionId, agent: agentId, question: question?.id || null, options: opts, token: TOKEN },
    actions: opts.slice(0, max).map((o, i) => ({ action: `opt:${i}`, title: clip(o, 32) })) };
  if (opts.length > max) base.body = clip(`${body} — autres choix dans Agent Office`, 200);
  if (swReg) return void swReg.showNotification(title, base).catch(() => {});
  const n = new Notification(title, { body: base.body, tag: base.tag });
  n.onclick = () => { n.close(); openFromNotification(sessionId, agentId); };
}
