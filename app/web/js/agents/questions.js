// Blocking questions asked by the agents, answered in the page.

import { hub, provide } from "../hub.js";
import { curSession, data, selected } from "../core/core.js";
import { esc, poll } from "../core/data.js";
import { openPanel } from "../ui/panel.js";

/* ---------- questions ---------- */
let shownQ = null;
export const sentQ = new Set();

function currentQuestion() {
  if (!selected) return null;
  if (selected.startsWith("q:")) return data.questions.find(q => q.id === selected.slice(2)) || null;
  const s = curSession();
  return (selected === "chief" ? s?.chief.question : s?.agents.find(a => a.id === selected)?.question) || null;
}

function renderQuestion(q) {
  const box = document.getElementById("p-q");
  if (!q) {
    if (shownQ) box.innerHTML = sentQ.has(shownQ) ? `<h3>QUESTION</h3><div class="q">Réponse envoyée ✓ — l'agent reprend.</div>` : "";
    shownQ = null; return;
  }
  if (shownQ === q.id) return;  // keep what the user is typing
  shownQ = q.id;
  box.innerHTML = `<h3>QUESTION POUR TOI${q.from ? ` · ${esc(q.from)}` : ""}</h3><div class="q">
    <p class="qq">${esc(q.question)}</p>${q.context ? `<p class="muted">${esc(q.context)}</p>` : ""}
    <div class="opts">${(q.options || []).map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join("")}</div>
    <textarea id="q-free" rows="2" placeholder="Autre réponse…" aria-label="Autre réponse"></textarea>
    <button id="q-send">Envoyer</button> <span id="q-msg" class="muted"></span></div>`;
  box.querySelectorAll(".opts button").forEach(b => { b.onclick = () => sendAnswer(q.id, q.options[+b.dataset.i]); });
  box.querySelector("#q-send").onclick = () => { const v = box.querySelector("#q-free").value.trim(); if (v) sendAnswer(q.id, v); };
}

// send an answer (the side panel, the phone's Agents app): "" when it went, else why it did not
export async function answerQuestion(id, answer) {
  let err = "";
  if (DEMO) hub.demoAnswered.add(id);
  else try {
    const res = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
      body: JSON.stringify({ id, answer }) });
    if (!res.ok) err = `Échec (${res.status}) — page à recharger ?`;
  } catch (e) { err = `serveur injoignable (${e.message})`; }
  if (!err) { sentQ.add(id); hub.countWeekly?.("answer"); poll(); }
  return err;
}
async function sendAnswer(id, answer) {
  const box = document.getElementById("p-q"), msg = box.querySelector("#q-msg");
  box.querySelectorAll("button, textarea").forEach(x => { x.disabled = true; });
  const err = await answerQuestion(id, answer);
  msg.textContent = err || "Envoyé ✓ — l'agent reprend.";
  if (err) box.querySelectorAll("button, textarea").forEach(x => { x.disabled = false; });
}

function renderBadge() {
  const n = data.questions?.length || 0, b = document.getElementById("qbadge");
  b.hidden = !n;
  b.textContent = `? ${n} question${n > 1 ? "s" : ""} en attente`;
  document.title = n ? `(${n}) Agent Office` : "Agent Office";
}

document.getElementById("qbadge").onclick = () => {
  const q = data.questions?.[0];
  if (!q) return;
  for (const s of data.sessions) {
    const who = s.chief.question?.id === q.id ? "chief" : s.agents.find(a => a.question?.id === q.id)?.id;
    if (!who) continue;
    return openPanel(who === "chief" ? who : `${s.id}|${who}`);
  }
  openPanel(`q:${q.id}`);
};

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get currentQuestion() { return currentQuestion; }, get renderBadge() { return renderBadge; }, get renderQuestion() { return renderQuestion; }, get shownQ() { return shownQ; }, set shownQ(v) { shownQ = v; } });
