// ChiefOS → 🌐 Réseau: open the office to the internal network (another chief joins with the address and the code),
// or join someone's; who is there, a chat, a few emotes. What goes through: names, looks, positions, the chat; never
// the agents' work (office/net.py).

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { closeChiefOs, osApp, renderChiefOs } from "../ui/chiefos.js";
import { hub } from "../hub.js";
import { codeFor, endVisit, host, join, lastJoin, leave, net, startVisit } from "../world/peers.js";

let msg = "", lastAddr = lastJoin().addr || "", typed = { code: codeFor(lastJoin().addr || "") }, found = [], autoOpen = false;
const api = body => fetch("/api/net", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }).then(r => r.json());
// the offices open on the internal network (their beacons, office/net.py discover), while this window is open
async function discover() { try { const o = await api({ action: "discover" }); found = o.offices || []; autoOpen = !!(await api({ action: "status" })).auto; } catch (_) { found = []; } }
const demo = () => typeof DEMO !== "undefined" && DEMO;

function html() {
  if (demo()) return `<p class="muted">Le réseau n'est pas disponible en mode démo.</p>`;
  const st = net.status, on = !!net.sid;
  const head = !on ? `
    <div class="osrow"><b>🏠 Héberger</b><span class="muted">Ouvre ton bureau sur le réseau interne : un autre chef le rejoint avec ton adresse et un code à 6 caractères. Rien du travail des agents n'est partagé, seulement les chefs et le chat.</span><button data-net="host">Ouvrir mon bureau</button></div>
    <div class="osrow"><b>🚪 Rejoindre</b><span><input id="net-addr" placeholder="192.168.1.20:8766" value="${esc(lastAddr)}" aria-label="Adresse du bureau"> <input id="net-code" placeholder="CODE" maxlength="6" size="7" aria-label="Code" style="text-transform:uppercase" value="${esc(typed.code)}"></span><button data-net="join">Rejoindre</button></div>
    <h3>Bureaux ouverts sur le réseau</h3><div class="netpeers">${found.length ? found.map(o => { const a = `${o.ip}:${o.port}`; return `<span class="chip">🏢 ${esc(o.name || "Bureau")} <span class="muted">· ${esc(a)}${codeFor(a) ? " · code connu" : ""}</span><button data-pick="${esc(a)}">${codeFor(a) ? "Rejoindre" : "Choisir"}</button></span>`; }).join("")
      : `<span class="muted">Aucun pour l'instant (cherche toutes les 3 s). Le pare-feu peut bloquer la découverte (UDP ${8768}) : l'adresse à la main marche toujours.</span>`}</div>
    <div class="osrow"><b>⚙️ Au démarrage</b><span class="muted">Rouvrir mon bureau au réseau quand le serveur démarre (même code : les autres reviennent seuls).</span><button data-net="auto">${autoOpen ? "✓ Activé" : "Activer"}</button></div>`
    : `<div class="rstats">${net.mode === "host" ? `<div>adresse<b>${esc(st?.ip || "")}:${esc(String(st?.port || ""))}</b></div><div>code<b>${esc(st?.code || "")}</b></div>` : `<div>connecté à<b>${esc(net.addr)}</b></div>`}<div>chefs présents<b>${net.peers.length + 1}</b></div></div>
    ${net.mode === "host" ? `<p class="muted">Donne le code à l'autre chef : ton bureau apparaît dans sa liste « Bureaux ouverts » (ou l'adresse à la main). Le code reste le même après un redémarrage. Si rien ne passe, le pare-feu de ta machine bloque peut-être le port ${esc(String(st?.port || 8766))}.</p>
      <div class="osrow"><b>🔑 Code</b><span class="muted">Un nouveau code : ceux qui ont l'ancien ne peuvent plus entrer.</span><button data-net="newcode">Nouveau code</button></div>
      <div class="osrow"><b>⚙️ Au démarrage</b><span class="muted">Rouvrir ce bureau au réseau quand le serveur démarre.</span><button data-net="auto">${autoOpen ? "✓ Activé" : "Activer"}</button></div>` : ""}
    <div class="osrow"><b>${net.mode === "host" ? "🏠 Ton bureau est ouvert" : "🌐 Tu es connecté"}</b><span class="muted">${net.error ? `⚠️ ${esc(net.error)}` : "Chacun reste dans son bureau. « Visiter » t'emmène chez un autre chef ; ceux qui viennent chez toi apparaissent dans tes pièces."}</span><button data-net="leave">${net.mode === "host" ? "Fermer mon bureau" : "Se déconnecter"}</button></div>
    ${net.visit ? `<div class="osrow"><b>🚪 En visite chez ${esc(net.visit.name)}</b><span class="muted">Ton chef t'attend dans ton bureau.</span><button data-net="home">Rentrer</button></div>` : ""}
    <h3>Connectés</h3><div class="netpeers">${net.peers.length ? net.peers.map(p => {
      const where = p.visiting ? (p.visiting === net.pid ? "chez toi" : `en visite chez ${esc(net.peers.find(x => x.pid === p.visiting)?.name || "quelqu'un")}`) : "chez lui";
      return `<span class="chip">${p.host ? "👑" : "🌐"} ${esc(p.name)} <span class="muted">· ${where}</span>${net.visit?.pid === p.pid ? "" : `<button data-visit="${esc(p.pid)}">Visiter</button>`}</span>`; }).join("") : `<span class="muted">Personne d'autre pour l'instant.</span>`}</div>
    <p class="muted">💬 Pour discuter : l'app Messages. 📱 Pour inviter un collègue chez toi : le téléphone, en bas à gauche.</p>`;
  return `${head}${msg ? `<p class="${/^⚠️/.test(msg) ? "err" : "muted"}">${esc(msg)}</p>` : ""}`;
}

class NetworkApp extends OsApp {
  constructor() { super("network", "🌐", "Réseau", "#2a9a9a"); }
  render() { return html(); }
  badge() { return net.sid ? net.peers.length : 0; }
  click(b) {
    const run = async fn => { msg = "…"; renderChiefOs(); try { await fn(); msg = ""; } catch (err) { msg = `⚠️ ${err.message}`; } renderChiefOs(); };
    if (b.dataset.net === "host") return run(() => host()), true;
    if (b.dataset.net === "join") return run(() => join(document.getElementById("net-addr").value.trim(), document.getElementById("net-code").value)), true;
    if (b.dataset.net === "leave") return run(() => leave()), true;
    if (b.dataset.net === "newcode") return run(async () => { net.status = { ...net.status, ...(await api({ action: "newcode" })) }; }), true;
    if (b.dataset.net === "auto") return run(async () => { await api({ action: "auto", on: !autoOpen }); autoOpen = !autoOpen; }), true;
    if (b.dataset.pick) { lastAddr = b.dataset.pick; typed.code = codeFor(lastAddr); if (typed.code) return run(() => join(lastAddr, typed.code)), true; renderChiefOs(); document.getElementById("net-code")?.focus(); return true; }
    if (b.dataset.net === "home") { endVisit(); renderChiefOs(); return true; }
    if (b.dataset.visit) { run(async () => { await startVisit(b.dataset.visit); closeChiefOs(); }); return true; }
    return false;
  }
}
new NetworkApp();
// what is typed is kept across refreshes; the window refreshes itself, never while a field is being typed in
OsApp.listen("network", "input", ev => { if (ev.target.id === "net-addr") lastAddr = ev.target.value; if (ev.target.id === "net-code") typed.code = ev.target.value; });
setInterval(() => { if (!hub.osBox?.hidden && osApp === "network" && !hub.osBox.contains(document.activeElement)) renderChiefOs(); }, 1500);
setInterval(() => { if (!hub.osBox?.hidden && osApp === "network" && !demo()) discover(); }, 3000);
