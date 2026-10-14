"use strict";
// Dev's computer modal.

/* ---------- dev's computer (modal) ---------- */
const pcBox = document.getElementById("pc");
let pcId = null, pcTimer = null;
function openPc(id) {
  pcId = id; scrPick = null; scrKey = ""; termSeen = 0; termAgent = null;
  document.getElementById("term").dataset.sig = "";
  pcBox.hidden = false;
  clearInterval(pcTimer); loadPc(); pcTimer = setInterval(loadPc, 2000);
}
function closePc() { pcId = null; clearInterval(pcTimer); clearInterval(typing); pcBox.hidden = true; }
async function loadPc() {
  if (!pcId || !current) return;
  let d;
  try {
    if (DEMO) d = await fetchAgent(pcId);
    else {
      d = await fetchAgent(pcId, { cache: "no-store" });
      if (!d) { document.getElementById("pc-title").textContent = "Agent introuvable (session vidée ?)"; return; }
    }
  } catch (err) { document.getElementById("pc-title").textContent = `serveur injoignable (${err.message})`; return; }
  if (!d || d.id !== pcId && pcId !== "chief") return;
  const st = d.status === "done" ? "livré ✓" : d.status === "blocked" ? "bloqué" : d.idle > 45 ? "réfléchit…" : "au travail";
  document.getElementById("pc-title").textContent = `${crew.ids[d.id] ? `${crew.ids[d.id]} · ` : ""}${specialty(d.type)} · ${d.ticket || clip(d.description, 50)} — ${st}`;
  document.getElementById("pc-clock").textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  renderScreen(d); renderTerm(d);
}
document.getElementById("pc-close").onclick = closePc;
document.getElementById("pc-details").onclick = () => { const id = pcId; closePc(); openPanel(id); };
pcBox.addEventListener("click", ev => { if (ev.target === pcBox) closePc(); });
