// ChiefOS → 💬 Messages, while connected to other chiefs (ChiefOS → Réseau): a conversation with everyone and one with
// each chief. Nothing is saved: the messages live in the network server's memory and in this page, gone when the
// office closes (office/net.py).

import { esc } from "../core/data.js";
import { hub } from "../hub.js";
import { OsApp } from "./base.js";
import { osApp, renderChiefOs } from "../ui/chiefos.js";
import { conv, net, sendChat, unread } from "../world/peers.js";

let draft = "", sel = "all";
const time = t => new Date(t * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const nameOf = key => key === "all" ? "Tout le monde" : net.peers.find(p => p.pid === key)?.name || "Parti";
const EMOTES = ["👋", "😂", "👍", "🎉", "☕", "🔥", "❤️"];

function html() {
  if (!net.sid) return `<p class="muted">Connecte-toi d'abord à un bureau (ChiefOS → 🌐 Réseau).</p>`;
  const keys = ["all", ...net.peers.map(p => p.pid)];
  if (!keys.includes(sel)) sel = "all";
  net.open = osApp === "messages" ? sel : "";
  const c = conv(sel); c.unread = 0;
  const list = keys.map(k => { const u = conv(k).unread, last = conv(k).msgs.filter(m => m.kind === "text").at(-1);
    return `<button class="conv${k === sel ? " on" : ""}" data-conv="${esc(k)}"><b>${k === "all" ? "👥" : "🌐"} ${esc(nameOf(k))}</b>${u ? `<span class="n">${u}</span>` : ""}<span class="muted">${last ? esc(`${last.from === net.pid ? "Toi" : last.name} : ${last.text}`).slice(0, 40) : "…"}</span></button>`; }).join("");
  const msgs = c.msgs.map(m => m.kind === "system" ? `<div class="sys">${time(m.t)} · ${esc(m.text)}</div>`
    : `<div class="msg ${m.from === net.pid ? "me" : ""}">${m.from === net.pid || sel !== "all" ? "" : `<b>${esc(m.name)}</b>`}<span>${esc(m.text)}</span><small>${time(m.t)}</small></div>`).join("") || `<p class="muted">Aucun message. Dis bonjour !</p>`;
  return `<div class="msgapp"><nav>${list}<p class="muted lock">🔒 Rien n'est enregistré : tout s'efface quand le bureau ferme.</p></nav>
    <section><header>${sel === "all" ? "👥" : "🌐"} ${esc(nameOf(sel))}${sel === "all" ? "" : `<span class="muted"> · privé</span>`}</header><div class="msgs" id="msgs">${msgs}</div>
    <div class="emotes">${EMOTES.map(e => `<button data-emote="${e}">${e}</button>`).join("")}</div>
    <div class="netsend"><input id="msg-in" maxlength="200" placeholder="Écrire à ${esc(nameOf(sel))}…" value="${esc(draft)}" aria-label="Message"><button data-send>Envoyer</button></div></section></div>`;
}
const scrollDown = () => { const m = document.getElementById("msgs"); if (m) m.scrollTop = m.scrollHeight; };

class MessagesApp extends OsApp {
  constructor() { super("messages", "💬", "Messages", "#3bc4ff"); }
  away() { return !net.sid; }  // only while connected
  render() { return html(); }
  mount() { scrollDown(); }
  badge() { return net.sid ? unread() : 0; }
  click(b) {
    if (b.dataset.conv) { sel = b.dataset.conv; draft = ""; renderChiefOs(); scrollDown(); return true; }
    const send = text => { if (!text.trim()) return; sendChat(text, sel === "all" ? "" : sel).catch(err => hub.toast?.("MESSAGES", "Pas envoyé", err.message)); draft = ""; setTimeout(() => { renderChiefOs(); scrollDown(); document.getElementById("msg-in")?.focus(); }, 350); };
    if (b.dataset.send !== undefined) { send(document.getElementById("msg-in").value); return true; }
    if (b.dataset.emote) { send(b.dataset.emote); return true; }
    return false;
  }
}
new MessagesApp();
OsApp.listen("messages", "input", ev => { if (ev.target.id === "msg-in") draft = ev.target.value; });
OsApp.listen("messages", "keydown", ev => { if (ev.key === "Enter" && ev.target.id === "msg-in") { ev.preventDefault(); document.querySelector("#chiefos [data-send]")?.click(); } });
// new messages show up by themselves (never while typing); the conversation shown is marked read
let seen = 0;
setInterval(() => {
  if (hub.osBox?.hidden || osApp !== "messages") { net.open = ""; return; }
  const n = net.chat.length; if (n === seen) return;  // only when something new came
  seen = n; const typing = document.activeElement?.id === "msg-in";
  renderChiefOs(); scrollDown(); if (typing) { const i = document.getElementById("msg-in"); i?.focus(); i?.setSelectionRange(draft.length, draft.length); }
}, 800);
