// ChiefOS → 🌐 Réseau: open the office to the internal network (another chief joins with the address and the code),
// or join someone's; who is there, a chat, a few emotes. What goes through: names, looks, positions, the chat; never
// the agents' work (office/net.py).

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { closeChiefOs, osApp, renderChiefOs } from "../ui/chiefos.js";
import { hub } from "../hub.js";
import { endVisit, host, join, leave, net, startVisit } from "../world/peers.js";

let msg = "", lastAddr = "", typed = { code: "" };
try { lastAddr = JSON.parse(localStorage.getItem("office-net-last") || "{}").addr || ""; } catch (_) { /* storage blocked */ }
const demo = () => typeof DEMO !== "undefined" && DEMO;

function html() {
  if (demo()) return `<p class="muted">Le réseau n'est pas disponible en mode démo.</p>`;
  const st = net.status, on = !!net.sid;
  const head = !on ? `
    <div class="osrow"><b>🏠 Héberger</b><span class="muted">Ouvre ton bureau sur le réseau interne : un autre chef le rejoint avec ton adresse et un code à 6 caractères. Rien du travail des agents n'est partagé, seulement les chefs et le chat.</span><button data-net="host">Ouvrir mon bureau</button></div>
    <div class="osrow"><b>🚪 Rejoindre</b><span><input id="net-addr" placeholder="192.168.1.20:8766" value="${esc(lastAddr)}" aria-label="Adresse du bureau"> <input id="net-code" placeholder="CODE" maxlength="6" size="7" aria-label="Code" style="text-transform:uppercase" value="${esc(typed.code)}"></span><button data-net="join">Rejoindre</button></div>`
    : `<div class="rstats">${net.mode === "host" ? `<div>adresse<b>${esc(st?.ip || "")}:${esc(String(st?.port || ""))}</b></div><div>code<b>${esc(st?.code || "")}</b></div>` : `<div>connecté à<b>${esc(net.addr)}</b></div>`}<div>chefs présents<b>${net.peers.length + 1}</b></div></div>
    ${net.mode === "host" ? `<p class="muted">Donne l'adresse et le code à l'autre chef (ChiefOS → Réseau → Rejoindre). Si rien ne passe, le pare-feu de ta machine bloque peut-être le port ${esc(String(st?.port || 8766))}.</p>` : ""}
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
    if (b.dataset.net === "home") { endVisit(); renderChiefOs(); return true; }
    if (b.dataset.visit) { run(async () => { await startVisit(b.dataset.visit); closeChiefOs(); }); return true; }
    return false;
  }
}
new NetworkApp();
// what is typed is kept across refreshes; the window refreshes itself, never while a field is being typed in
OsApp.listen("network", "input", ev => { if (ev.target.id === "net-addr") lastAddr = ev.target.value; if (ev.target.id === "net-code") typed.code = ev.target.value; });
setInterval(() => { if (!hub.osBox?.hidden && osApp === "network" && !hub.osBox.contains(document.activeElement)) renderChiefOs(); }, 1500);
