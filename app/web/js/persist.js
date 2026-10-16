"use strict";
// The progress is also kept in a file on this machine (~/.claude/agent-office/save.json, office/savegame.py): every
// `office-*` key of this browser, sent every 30 s when something changed and when the page closes. On load the newest
// save wins (index.html restores it before the game starts). Menu: save now, export to a file, import a file.

const SAVE_SKIP = new Set(["office-saved-at"]);
let saveRefused = false, lastSaveSig = "", lastSaveAt = +(localStorage.getItem("office-saved-at") || 0) || 0;
function collectSave() {
  save("office-moodlets", moodlets); save("office-wantslist", wantsOf);  // in-memory parts of the game
  const keys = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^office-[a-z0-9-]{1,40}$/.test(k) && !SAVE_SKIP.has(k)) keys[k] = localStorage.getItem(k); } } catch (_) { /* storage blocked */ }
  return keys;
}
async function saveToFile(manual = false, keepalive = false) {
  if (DEMO) { if (manual) toast("SAUVEGARDE", "Pas en mode démo", "La démo ne garde rien."); return; }
  const keys = collectSave(), sig = JSON.stringify(keys);
  if (!manual && sig === lastSaveSig) return;
  const savedAt = Date.now();
  // this browser holds the newest progress from now on: a reload must not restore an older file over it (the save sent
  // while the page closes can arrive after the next page has read the file)
  try { localStorage.setItem("office-saved-at", String(savedAt)); } catch (_) { /* storage blocked */ }
  try {
    const res = await fetch("/api/save", { method: "POST", keepalive, headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ savedAt, keys }) });
    const out = await res.json().catch(() => ({}));
    if (res.status === 403) {  // a stale tab (token of another server run) or a server from before 0.5.0
      if (!saveRefused) { saveRefused = true; toast("SAUVEGARDE REFUSÉE (403)", "Le serveur ne reconnaît pas cette page", "Recharge la page (Ctrl+Maj+R). Si ça persiste, redémarre le serveur : office.py stop puis /office."); }
      return;
    }
    if (!res.ok || !out.ok) throw new Error(out.output || `HTTP ${res.status}`);
    saveRefused = false;
    lastSaveSig = sig; lastSaveAt = savedAt;
    try { localStorage.setItem("office-saved-at", String(savedAt)); } catch (_) { /* storage blocked */ }
    if (manual) toast("SAUVEGARDE 💾", "Partie sauvegardée", out.output);
  } catch (err) { if (manual) toast("SAUVEGARDE", "Échec de la sauvegarde", err.message); }
}
setInterval(() => saveToFile(), 30000);
addEventListener("beforeunload", () => { saveToFile(false, true); });

// export: the same content, as a file to keep or carry to another machine
function exportSave() {
  const blob = new Blob([JSON.stringify({ savedAt: Date.now(), keys: collectSave() }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `agent-office-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// import: a saved file replaces this browser's progress, then the page reloads on it
const importInput = Object.assign(document.createElement("input"), { type: "file", accept: "application/json,.json", hidden: true });
document.body.append(importInput);
importInput.onchange = async () => {
  const f = importInput.files[0]; importInput.value = ""; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || typeof data.keys !== "object") throw new Error("ce n'est pas une sauvegarde Agent Office");
    for (const [k, v] of Object.entries(data.keys)) if (/^office-[a-z0-9-]{1,40}$/.test(k) && typeof v === "string") localStorage.setItem(k, v);
    lastSaveSig = ""; await saveToFile(false);
    toast("IMPORT", "Partie importée", "Rechargement…"); setTimeout(() => location.reload(), 900);
  } catch (err) { toast("IMPORT", "Fichier refusé", err.message); }
};
document.getElementById("savebtn").onclick = () => saveToFile(true);
document.getElementById("exportbtn").onclick = exportSave;
document.getElementById("importbtn").onclick = () => importInput.click();
