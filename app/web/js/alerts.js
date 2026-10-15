"use strict";
// Smart alerts, each with an action: an agent re-reading the same file over and over, the same error coming back at
// several agents, a merge request waiting for a review for hours, an agent going round in circles. Listed in ChiefOS →
// Alertes (relaunch with an instruction, launch a review, open the dev's screen), announced by a toast and a browser
// notification when new. Read-only on the agents: an action only opens the usual forms.

const smartAlerts = new Map();  // key → { key, icon, title, body, agent, action, t }
const alertSeen = new Set();
let alertBusy = false;
function raise(key, icon, title, body, agent, action) {
  const a = { key, icon, title, body, agent, action, t: Date.now() };
  smartAlerts.set(key, a);
  if (alertSeen.has(key)) return;
  alertSeen.add(key);
  toast("ALERTE", `${icon} ${title}`, `${body} → ChiefOS, Alertes.`);
  notify(`${icon} ${title}`, body, null, agent || null);
}
const normErr = e => String(e || "").toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 70);
async function checkAlerts2() {
  if (alertBusy || firstLoad) return;
  alertBusy = true;
  try {
    const s = curSession(), agents = s?.agents || [], live = new Set();
    const name = a => crew.ids[a.id] || specialty(a.type);
    // 1. re-reading the same file in a loop (working agents, from their last events)
    for (const a of agents.filter(x => x.status === "working").slice(0, 5)) {
      const d = await fetchAgent(a.id).catch(() => null); if (!d) continue;
      const reads = {};
      for (const e of (d.events || []).slice(-40)) if (e.kind === "tool" && /^(Read|Grep|Glob)$/.test(e.tool)) reads[e.label] = (reads[e.label] || 0) + 1;
      const [label, n] = Object.entries(reads).sort((x, y) => y[1] - x[1])[0] || [];
      if (n >= 6) { const k = `reread:${a.id}:${label}`; live.add(k); raise(k, "🔁", `${name(a)} relit en boucle`, `${clip(label, 60)} : ${n} fois sur ses 40 dernières actions.`, a.id, "relaunch"); }
    }
    // 2. the same error at several agents
    const byErr = {};
    for (const a of agents) if (a.lastError && ["blocked", "working", "gone"].includes(a.status)) (byErr[normErr(a.lastError)] = byErr[normErr(a.lastError)] || []).push(a);
    for (const [err, list] of Object.entries(byErr)) if (list.length >= 2) {
      const k = `sameerr:${err}`; live.add(k);
      raise(k, "🧬", `Même erreur chez ${list.length} agents`, `${list.map(name).join(", ")} : « ${clip(list[0].lastError, 70)} »`, list[0].id, "relaunch");
    }
    // 3. an MR waiting for a review for more than 2 hours
    for (const a of agents) if (a.game?.mr && awaitingReview(a, s) && (data.now || Date.now() / 1000) - (a.game.last || 0) > 7200) {
      const k = `review:${a.id}`; live.add(k);
      raise(k, "⏳", `MR sans review depuis ${Math.round(((data.now || Date.now() / 1000) - a.game.last) / 3600)} h`, `${name(a)}${a.ticket ? ` · ${a.ticket}` : ""} : personne ne l'a relue.`, a.id, "review");
    }
    // 4. going round in circles
    for (const a of agents) if (isStuck(a)) { const k = `stuck:${a.id}`; live.add(k); raise(k, "🌀", `${name(a)} tourne en rond`, `${a.game?.sinceProgress || "?"} outils sans modification ni test.`, a.id, "relaunch"); }
    for (const k of [...smartAlerts.keys()]) if (!live.has(k)) smartAlerts.delete(k);  // solved: gone from the list
  } finally { alertBusy = false; }
}
setInterval(checkAlerts2, 60000);
setTimeout(checkAlerts2, 8000);

function alertsAppHtml() {
  const list = [...smartAlerts.values()].sort((a, b) => b.t - a.t);
  if (!list.length) return `<p class="muted">Rien à signaler : pas de relecture en boucle, d'erreur commune, de MR oubliée ni d'agent qui tourne en rond. 👌</p>`;
  return list.map(a => {
    const agent = curSession()?.agents.find(x => x.id === a.agent);
    const act = a.action === "review" && agent ? `<button data-alert-review="${esc(agent.ticket || "")}">Lancer une review</button>`
      : agent ? `<button data-alert-relaunch="${esc(agent.id)}">🔁 Relancer avec une consigne</button>` : "";
    return `<div class="osrow"><b>${a.icon} ${esc(a.title)}</b><span>${esc(a.body)}</span><span class="osacts">${act}${agent ? `<button data-alert-screen="${esc(agent.id)}">🖥️ Écran</button>` : ""}</span></div>`;
  }).join("");
}
document.getElementById("chiefos").addEventListener("click", ev => {
  const b = ev.target.closest("[data-alert-relaunch], [data-alert-review], [data-alert-screen]"); if (!b) return;
  closeChiefOs();
  if (b.dataset.alertRelaunch) relaunch(b.dataset.alertRelaunch);
  else if (b.dataset.alertScreen) openPc(b.dataset.alertScreen);
  else { const i = DESKS.findIndex(freeDesk); openPanel(`launch:${Math.max(0, i)}:${b.dataset.alertReview}:feature-builder`); }
});
