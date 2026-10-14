"use strict";
// Blocking questions asked by the agents, answered in the page.

/* ---------- questions ---------- */
let shownQ = null;
const sentQ = new Set();

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

async function sendAnswer(id, answer) {
  const box = document.getElementById("p-q"), msg = box.querySelector("#q-msg");
  box.querySelectorAll("button, textarea").forEach(x => { x.disabled = true; });
  let ok = false;
  if (DEMO) { demoAnswered.add(id); ok = true; }
  else try {
    const res = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
      body: JSON.stringify({ id, answer }) });
    ok = res.ok;
    if (!ok) msg.textContent = `Échec (${res.status}) — page à recharger ?`;
  } catch (err) { msg.textContent = `serveur injoignable (${err.message})`; }
  if (ok) { sentQ.add(id); msg.textContent = "Envoyé ✓ — l'agent reprend."; poll(); }
  else box.querySelectorAll("button, textarea").forEach(x => { x.disabled = false; });
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
