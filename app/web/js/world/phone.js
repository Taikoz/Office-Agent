// The phone, a smartphone of our own: its button sits in the household strip, right of the team portraits, and the phone
// opens above it. A home screen (wallpaper, clock, a "who's online" and a "status" widget, app icons with their badges,
// a dock) and its apps, iOS style (large titles, grouped lists, avatars colored by name with a presence dot).
// 📞 Téléphone: the connected chiefs, "Inviter" calls one of them to our office; a call coming in rings full screen
// (accept: we go to the caller's office, world/peers.js startVisit). 💬 Messages: the conversations of ChiefOS → Messages
// (everyone, or one chief), nothing saved. 🚪 Visites: whose office to visit, back home. 🏓 Défis: ping-pong or baby-foot
// against another chief (games/online.js). 🍻 Afterwork: all the offices in our break room (social/netparty.js).
// 😀 Emotes. 🟢 Statut (⛔ declines calls and challenges). 📹 Visio: a video call with avatars (world/visio.js).
// 🎁 Cadeaux and 📖 Livre d'or (social/gifts.js). 🌐 Réseau: ChiefOS → Réseau (host, join). The bar at the bottom: home.
// 🤖 Agents: the agents' blocking questions, answered from their options or in words (agents/questions.js), and who is
// on a mission (a tap opens its panel). Recent calls (in, out, missed) are kept in this browser. Banners, iOS style,
// drop at the top of the screen for a message, a question or a missed call (hub.phoneBanner; core/notify.js); a tap
// opens the right app. In the demo, three made-up colleagues answer, nothing goes on the network.

import { hub } from "../hub.js";
import { esc } from "../core/data.js";
import { CHIEF_NAME, clip, data, specialty } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crew } from "../sims/crew.js";
import { answerQuestion, sentQ } from "../agents/questions.js";
import { openPanel } from "../ui/panel.js";
import { clockNow } from "../sims/days.js";
import { EMOTE_INFO, PRESENCE_INFO, answerCall, conv, emote, endVisit, invite, net, sendChat, setPresence, startVisit, unread, visitRoom } from "./peers.js";
import { DUEL_GAMES, challengeChief, watchDuel } from "../games/online.js";
import { GIFTS, giftsGot, guestbook, sendGift, signGuestbook } from "../social/gifts.js";
import { callVisio } from "./visio.js";
import { leaveParty, party, startParty, stopParty } from "../social/netparty.js";
import { sfx, toast } from "../sims/progress.js";
import { openChiefOs } from "../ui/chiefos.js";

const btn = document.createElement("button");
btn.id = "phonebtn"; btn.title = "Téléphone"; btn.setAttribute("aria-label", "Téléphone");
btn.innerHTML = `<svg viewBox="0 0 16 24" aria-hidden="true"><rect x="1" y="1" width="14" height="22" rx="3.4" fill="#0b1236" stroke="currentColor" stroke-width="1.6"/><rect x="3.2" y="4.6" width="9.6" height="14.6" rx="1.2" fill="#3bc4ff" fill-opacity=".55"/><rect x="5.6" y="2.4" width="4.8" height="1.3" rx=".65" fill="currentColor"/><rect x="5.8" y="20.3" width="4.4" height="1" rx=".5" fill="currentColor"/></svg><span class="n" hidden></span>`;
const box = document.createElement("section");
box.id = "phone"; box.hidden = true; box.setAttribute("aria-label", "Téléphone");
box.innerHTML = `<div class="device"><div class="island"></div>
  <div class="status"><b class="hh"></b><span class="sicons"><span class="bars"><i></i><i></i><i></i><i></i></span>
    <svg class="wifi" viewBox="0 0 16 12" aria-hidden="true"><path fill="#fff" d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.7 10.7 0 0 0 8 .4C5.1.4 2.5 1.5.5 3.4l1.2 1.3A9 9 0 0 1 8 2.2Zm0 3.5c1.5 0 2.8.5 3.8 1.5L13 5.9A7.2 7.2 0 0 0 8 3.9c-1.9 0-3.7.7-5 2l1.2 1.3C5.2 6.2 6.5 5.7 8 5.7Zm0 3.4c-.6 0-1.1.2-1.5.6L8 11.4l1.5-1.7c-.4-.4-.9-.6-1.5-.6Z"/></svg>
    <span class="batt"><i></i></span></span></div>
  <div class="scr"></div><button class="homebar" data-home aria-label="Écran d'accueil" title="Accueil"></button></div>`;
const team = document.getElementById("live-team");
if (team) team.after(btn); else document.body.append(btn);  // in the household strip, right of the devs
document.body.append(box);
const screen = box.querySelector(".scr");
let app = "home", thread = "all", draft = "", key = "", missed = 0, shown = "";
const calling = new Map();  // pid → when we called (the button waits a little)
const demo = () => typeof DEMO !== "undefined" && DEMO;
const DEMO_PEERS = [{ pid: "d1", name: "Camille", status: "dispo" }, { pid: "d2", name: "Hugo", status: "occupe" }, { pid: "d3", name: "Inès", status: "reunion" }];
const DEMO_LINES = ["Haha, bien vu 😄", "Je regarde ça tout de suite.", "Café dans 5 min ?", "Mes agents sont en feu aujourd'hui 🔥", "Top, merci !"];
const peers = () => demo() ? DEMO_PEERS : net.peers;
const online = () => demo() || !!net.sid;
// the recent calls: in, out, missed, declined (kept in this browser, the 30 last)
const callLog = new SaveSlot("office-calls", []);
function logCall(name, pid, dir, kind = "call") { callLog.data.unshift({ name, pid, dir, kind, t: Date.now() }); callLog.data.splice(30); callLog.save(); }
const time = t => new Date(t * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const nameOf = k => k === "all" ? "Tout le monde" : peers().find(p => p.pid === k)?.name || "Parti";
const initial = n => esc(String(n || "?").slice(0, 1).toUpperCase());
const hue = n => { let h = 7; for (const c of String(n || "")) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const av = (name, cls = "", st = "") => `<span class="av ${cls}" style="--h:${hue(name)}">${initial(name)}${st ? `<i class="pd ${esc(st)}" title="${esc(PRESENCE_INFO[st]?.[1] || "")}"></i>` : ""}</span>`;
const where = p => p.visiting === net.pid ? "chez toi" : p.visiting ? `en visite chez ${peers().find(x => x.pid === p.visiting)?.name || "quelqu'un"}` : "dans son bureau";
const EMOTES = ["👋", "😂", "👍", "🎉", "☕", "🔥"];
const CHEVRON = `<svg viewBox="0 0 11 18" aria-hidden="true"><path d="M9 2 2 9l7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW = `<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const APPS = [
  { id: "phone", icon: "📞", label: "Téléphone", bg: "linear-gradient(#6ff08a,#22b04a)", badge: () => missed },
  { id: "messages", icon: "💬", label: "Messages", bg: "linear-gradient(#6ff08a,#22b04a)", badge: () => online() ? unread() : 0 },
  { id: "visits", icon: "🚪", label: "Visites", bg: "linear-gradient(#ffd66e,#f29f05)", badge: () => 0 },
  { id: "visio", icon: "📹", label: "Visio", bg: "linear-gradient(#5ac8fa,#0a6ee0)", badge: () => 0 },
  { id: "duels", icon: "🏓", label: "Défis", bg: "linear-gradient(#ff9f80,#e0402a)", badge: () => peers().filter(p => p.duel).length },
  { id: "gifts", icon: "🎁", label: "Cadeaux", bg: "linear-gradient(#ff9ac8,#de3b78)", badge: () => 0 },
  { id: "book", icon: "📖", label: "Livre d'or", bg: "linear-gradient(#f0cf95,#a8743a)", badge: () => bookNew() },
  { id: "party", icon: "🍻", label: "Afterwork", bg: "linear-gradient(#cfa6ff,#7036d8)", badge: () => party.mine ? party.guests.size : 0 },
  { id: "emotes", icon: "😀", label: "Emotes", bg: "linear-gradient(#ffe878,#f0ad00)", badge: () => 0 },
  { id: "status", get icon() { return PRESENCE_INFO[net.presence][0]; }, label: "Statut", bg: "linear-gradient(#f2f4f8,#a9b2c4)", badge: () => 0 },
  { id: "network", icon: "🌐", label: "Réseau", bg: "linear-gradient(#64d2ff,#1a6fd0)", badge: () => 0 },
  { id: "agents", icon: "🤖", label: "Agents", bg: "linear-gradient(#ffd25a,#e08a00)", badge: () => (data.questions || []).filter(q => !sentQ.has(q.id)).length },
];
const DOCK = ["phone", "messages", "agents", "visits"];
let bookSeen = 0;
const bookNew = () => guestbook().filter(e => e.t > bookSeen).length;
try { bookSeen = +localStorage.getItem("office-book-seen") || 0; } catch (_) { /* storage blocked */ }
let giftTo = "";
const nobody = `<div class="empty"><div class="big">👤</div><p>Personne d'autre n'est connecté pour l'instant.</p></div>`;
const offline = what => `<div class="empty"><div class="big">📡</div><p>${demo() ? "Pas de réseau en mode démo." : `Pas connecté. Ouvre ton bureau ou rejoins celui d'un collègue pour ${what}.`}</p>${demo() ? "" : `<button class="pill" data-open="network">🌐 Ouvrir Réseau</button>`}</div>`;
const head = (title, back = "home") => `<div class="apphead"><button class="back" data-go="${back}">${CHEVRON}${back === "home" ? "Accueil" : "Retour"}</button><h3>${title}</h3></div>`;
const page = (title, body, back) => head(title, back) + `<div class="body">${body}</div>`;
const row = (left, name, sub, right = "", tag = "div", attrs = "") => `<${tag} class="row"${attrs}>${left}<span class="txt"><b>${name}</b>${sub ? `<small>${sub}</small>` : ""}</span>${right}</${tag}>`;
const subOf = p => p.status === "dnd" ? "ne pas déranger" : where(p);

/* ---------- the screens ---------- */
function home(d) {
  const icon = a => { const n = a.badge(); return `<button class="app" data-go="${a.id}" title="${a.label}"><span class="ic" style="background:${a.bg}">${a.icon}${n ? `<i>${n > 99 ? "99+" : n}</i>` : ""}</span><small>${a.label}</small></button>`; };
  const on = online() ? peers() : [], pres = PRESENCE_INFO[net.presence];
  const people = `<button class="wid" data-go="phone"><span class="k">${online() ? "En ligne" : "Réseau"}</span>
    <span class="faces">${on.length ? on.slice(0, 4).map(p => av(p.name, "sm", p.status)).join("") : `<span class="av sm ghost">${online() ? "👤" : "📡"}</span>`}</span>
    <b>${online() ? `${on.length + 1} chef${on.length ? "s" : ""}` : "Hors ligne"}</b><small>${online() ? (on.length ? esc(on.map(p => p.name).join(", ")) : "rien que toi") : "Ouvre Réseau"}</small></button>`;
  const status = `<button class="wid" data-go="status"><span class="k">Statut</span><span class="big">${pres[0]}</span><b>${esc(pres[1])}</b><small>${party.mine ? "🍻 afterwork chez toi" : "toucher pour changer"}</small></button>`;
  return `<div class="home"><div class="clock"><span>${esc(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</span><b>${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b></div>
    ${net.visit ? `<button class="banner" data-act="home">🚪<b>En visite chez ${esc(net.visit.name)}</b><span>Rentrer</span></button>` : ""}
    <div class="widgets">${people}${status}</div>
    <div class="grid">${APPS.filter(a => !DOCK.includes(a.id)).map(icon).join("")}</div>
    <div class="dock">${DOCK.map(id => icon(APPS.find(a => a.id === id))).join("")}</div></div>`;
}
function recents() {
  const ic = { in: "↙", out: "↗", missed: "↙", no: "↙" }, word = { in: "reçu", out: "sortant", missed: "manqué", no: "refusé" };
  return callLog.data.length ? `<h4 class="sub">Récents</h4><div class="group">${callLog.data.slice(0, 12).map(c => { const p = peers().find(x => x.pid === c.pid);
    return row(av(c.name), `<span style="${c.dir === "missed" ? "color:#ff453a" : ""}">${esc(c.name)}</span>`, `${ic[c.dir]} ${c.kind === "visio" ? "📹 " : ""}${word[c.dir]} · ${new Date(c.t).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}`,
      p && p.status !== "dnd" ? `<button class="call" data-call="${esc(p.pid)}" title="Rappeler" aria-label="Rappeler ${esc(p.name)}">📞</button>` : ""); }).join("")}</div>` : "";
}
function phoneApp() {
  if (!online()) return page("Téléphone", offline("appeler un collègue") + recents());
  return page("Téléphone", (peers().length ? `<h4 class="sub">Contacts</h4><div class="group">${peers().map(p => row(av(p.name, "", p.status), esc(p.name), esc(subOf(p)),
    p.visiting === net.pid && !demo() ? `<span class="ptag ok">✓ ici</span>` : calling.has(p.pid) ? `<span class="ptag">appel…</span>` : p.status === "dnd" ? `<span class="ptag">⛔</span>` : `<button class="call" data-call="${esc(p.pid)}" title="Inviter dans ton bureau" aria-label="Inviter ${esc(p.name)}">📞</button>`)).join("")}</div>`
    : `<div class="group"><p class="muted pad">Personne d'autre n'est connecté.</p></div>`) + recents()
    + `<p class="note">📞 Inviter : son téléphone sonne, et s'il accepte, il arrive dans ton bureau.</p>`);
}
// the agents: their questions to answer, who is on a mission
const STATUS_FR = { working: ["●", "au travail"], asking: ["❓", "attend ta réponse"], blocked: ["⛔", "bloqué"] };
function agentsApp() {
  const qs = data.questions || [], who = q => { for (const s of data.sessions || []) { if (s.chief.question?.id === q.id) return "Session principale"; const a = s.agents.find(x => x.question?.id === q.id); if (a) return crew.ids[`${s.id}|${a.id}`] || specialty(a.type); } return q.from || "Un agent"; };
  const live = (data.sessions || []).flatMap(s => s.agents.filter(a => STATUS_FR[a.status]).map(a => ({ s, a })));
  const today = hub.game?.today;
  return page("Agents", `<h4 class="sub">Questions ${qs.length ? `· ${qs.length}` : ""}</h4>` + (qs.length ? qs.map(q => sentQ.has(q.id)
      ? `<div class="pcard"><span class="muted">❓ ${esc(who(q))}</span><b>${esc(clip(q.question, 120))}</b><span class="ptag ok">✓ Réponse envoyée, l'agent reprend</span></div>`
      : `<div class="pcard qcard"><span class="muted">❓ ${esc(who(q))}</span><b>${esc(clip(q.question, 220))}</b>${q.context ? `<small class="muted">${esc(clip(q.context, 160))}</small>` : ""}
        <div class="opts">${(q.options || []).map((o, i) => `<button class="pill soft" data-qa="${esc(q.id)}" data-i="${i}">${esc(o)}</button>`).join("")}</div>
        <div class="send" style="width:100%"><input id="qa-${esc(q.id)}" maxlength="500" placeholder="Autre réponse…" aria-label="Autre réponse"><button class="on" data-qa="${esc(q.id)}" data-free aria-label="Envoyer">${ARROW}</button></div></div>`).join("")
      : `<div class="group"><p class="muted pad">Aucune question en attente 👍</p></div>`)
    + `<h4 class="sub">En mission ${live.length ? `· ${live.length}` : ""}</h4>` + (live.length ? `<div class="group">${live.map(({ s, a }) => { const name = crew.ids[`${s.id}|${a.id}`] || specialty(a.type), [ic, st] = STATUS_FR[a.status];
      return row(av(name), esc(name), `${a.ticket ? `${esc(a.ticket)} · ` : ""}${esc(clip(a.status === "working" ? a.action || st : st, 60))}`, `<span class="ptag${a.status === "working" ? " ok" : ""}">${ic}</span>`, "button", ` data-agent="${esc(`${s.id}|${a.id}`)}"`); }).join("")}</div>`
      : `<div class="group"><p class="muted pad">Personne en mission.</p></div>`)
    + (today ? `<p class="note">Aujourd'hui : ✓ ${today.pass || 0} lancers de tests verts · ✗ ${today.fail || 0} rouges.</p>` : ""));
}
function messagesApp() {
  if (!online()) return head("Messages") + offline("discuter");
  const keys = ["all", ...peers().map(p => p.pid)];
  return page("Messages", `<div class="group">${keys.map(k => { const c = conv(k), last = c.msgs.filter(m => m.kind === "text").at(-1);
    return row(k === "all" ? `<span class="av all">👥</span>` : av(nameOf(k), "", peers().find(p => p.pid === k)?.status), esc(nameOf(k)),
      last ? esc(`${last.from === net.pid ? "Toi : " : k === "all" ? `${last.name} : ` : ""}${last.text}`) : "Aucun message",
      `<span class="meta">${last ? time(last.t) : ""}${c.unread ? `<i>${c.unread}</i>` : ""}</span>`, "button", ` data-thread="${esc(k)}"`); }).join("")}</div>
    <p class="note">🔒 Rien n'est enregistré : tout s'efface quand le bureau ferme.</p>`);
}
function threadApp() {
  if (!online()) return head("Messages", "messages") + offline("discuter");
  if (thread !== "all" && !peers().some(p => p.pid === thread)) thread = "all";
  const c = conv(thread); c.unread = 0;
  const msgs = c.msgs.map(m => m.kind === "system" ? `<div class="sys">${time(m.t)} · ${esc(m.text)}</div>`
    : `<div class="bub ${m.from === net.pid ? "me" : ""}">${m.from !== net.pid && thread === "all" ? `<b>${esc(m.name)}</b>` : ""}${esc(m.text)}<small>${time(m.t)}</small></div>`).join("") || `<div class="empty"><div class="big">👋</div><p>Dis bonjour !</p></div>`;
  const face = thread === "all" ? `<span class="av sm all">👥</span>` : av(nameOf(thread), "sm", peers().find(p => p.pid === thread)?.status);
  return `<div class="apphead chat"><button class="back" data-go="messages">${CHEVRON}Retour</button><span class="who">${face}<b>${esc(nameOf(thread))}</b></span><span></span></div>
    <div class="thread" id="ph-msgs">${msgs}</div>
    <div class="emo">${EMOTES.map(e => `<button data-emote="${e}" title="Envoyer ${e}">${e}</button>`).join("")}</div>
    <div class="send"><input id="ph-in" maxlength="200" placeholder="Message" value="${esc(draft)}" aria-label="Message"><button data-send class="${draft.trim() ? "on" : ""}" aria-label="Envoyer">${ARROW}</button></div>`;
}
function visitsApp() {
  if (!online()) return head("Visites") + offline("visiter un bureau");
  const offices = peers().filter(p => !p.visiting);
  return page("Visites", (net.visit ? `<div class="pcard hero"><span class="big">🚪</span><b>Chez ${esc(net.visit.name)}</b><span class="muted">Ton équipe t'attend dans ton bureau.</span><button class="pill" data-act="home">🏠 Rentrer</button></div>` : "")
    + `<h4 class="sub">Bureaux ouverts</h4>` + (offices.length ? `<div class="group">${offices.map(p => { const n = peers().filter(x => x.visiting === p.pid).length;
      return row(av(p.name, "", p.status), `Bureau de ${esc(p.name)}`, n ? `${n} visiteur${n > 1 ? "s" : ""}` : "personne en visite",
        net.visit?.pid === p.pid ? `<span class="ptag ok">✓ ici</span>` : `<button class="pill" data-visit="${esc(p.pid)}">Visiter</button>`); }).join("")}</div>`
      : `<div class="group"><p class="muted pad">Aucun autre bureau ouvert.</p></div>`)
    + `<p class="note">Ceux qui viennent chez toi apparaissent dans tes pièces.</p>`);
}
function visioApp() {
  if (!online()) return head("Visio") + offline("faire un appel vidéo");
  if (!peers().length) return head("Visio") + nobody;
  return page("Visio", `<div class="group">${peers().map(p => row(av(p.name, "", p.status), esc(p.name), p.status === "dnd" ? "ne pas déranger" : "appel vidéo avec ton avatar",
    p.status === "dnd" ? `<span class="ptag">⛔</span>` : `<button class="call vid" data-visio="${esc(p.pid)}" title="Appel vidéo" aria-label="Appel vidéo avec ${esc(p.name)}">📹</button>`)).join("")}</div>
    <p class="note">Pas de caméra : il voit ton chef qui parle, bouge et fait des emotes. La voix passe par ton micro, seulement pendant l'appel (refusé : on s'écrit).</p>`);
}
function giftsApp() {
  if (!online()) return head("Cadeaux") + offline("offrir un cadeau");
  if (!peers().some(p => p.pid === giftTo)) giftTo = peers()[0]?.pid || "";
  if (!giftTo) return head("Cadeaux") + nobody;
  const got = giftsGot().slice(0, 4);
  return page("Cadeaux", `<h4 class="sub">Pour</h4><div class="chips">${peers().map(p => `<button class="${p.pid === giftTo ? "on" : ""}" data-giftto="${esc(p.pid)}">${av(p.name, "", p.status)}<span>${esc(p.name)}</span></button>`).join("")}</div>
    <div class="emogrid">${Object.entries(GIFTS).map(([k, g]) => `<button data-gift="${k}" title="Offrir : ${esc(g.label)}"><span>${g.icon}</span><small>${esc(g.label)}<br>§ ${g.price}</small></button>`).join("")}</div>
    <div class="send"><input id="gift-note" maxlength="200" placeholder="Un petit mot (optionnel)" aria-label="Mot"></div>
    ${got.length ? `<h4 class="sub">Reçus</h4><div class="group">${got.map(g => row(`<span class="av all">${GIFTS[g.id]?.icon || "🎁"}</span>`, esc(GIFTS[g.id]?.label || "Cadeau"), `de ${esc(g.from)}`)).join("")}</div>` : ""}
    <p class="note">Payé avec ta caisse ; toute son équipe en profite.</p>`);
}
function bookApp() {
  bookSeen = Date.now(); try { localStorage.setItem("office-book-seen", String(bookSeen)); } catch (_) { /* storage blocked */ }
  const e = guestbook();
  return page("Livre d'or", (net.visit ? `<div class="pcard"><b>✍️ Signer chez ${esc(net.visit.name)}</b><div class="send" style="width:100%"><input id="book-in" maxlength="200" placeholder="Un mot pour son livre d'or" aria-label="Mot"><button data-book class="on" aria-label="Signer">${ARROW}</button></div></div>` : "")
    + (e.length ? `<div class="group">${e.map(x => `<div class="row">${av(x.name)}<span class="txt"><b>${esc(x.name)}</b><small class="wrap">« ${esc(x.text)} »</small></span><span class="meta">${new Date(x.t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></div>`).join("")}</div>`
      : `<div class="empty"><div class="big">📖</div><p>Personne n'a encore signé ton livre d'or. Les chefs qui te visitent peuvent le faire depuis leur téléphone.</p></div>`));
}
function duelsApp() {
  if (!online()) return head("Défis") + offline("défier un collègue");
  if (!peers().length) return head("Défis") + nobody;
  const free = peers().filter(p => p.status !== "dnd" && !p.duel), live = peers().filter(p => p.duel);
  return page("Défis", `<h4 class="sub">Défier</h4><div class="group">${peers().map(p => row(av(p.name, "", p.status), esc(p.name), p.status === "dnd" ? "ne pas déranger" : p.duel ? "en pleine partie" : "premier à 5",
    free.includes(p) ? Object.entries(DUEL_GAMES).map(([id, [ic, label]]) => `<button class="pill g" data-duel="${esc(p.pid)}:${id}" title="Défier au ${label}">${ic}</button>`).join("") : "")).join("")}</div>
    ${live.length ? `<h4 class="sub">En cours</h4><div class="group">${live.map(p => { const [, g, vs] = p.duel.split(":");
      return row(`<span class="av all">${DUEL_GAMES[g]?.[0] || "🎮"}</span>`, `${esc(p.name)} vs ${esc(peers().find(x => x.pid === vs)?.name || (vs === net.pid ? "toi" : "?"))}`, DUEL_GAMES[g]?.[1] || "",
        vs === net.pid ? "" : `<button class="pill soft" data-watch="${esc(p.pid)}">👀 Regarder</button>`); }).join("")}</div>` : ""}
    <p class="note">Son téléphone sonne ; s'il accepte, la partie démarre chez vous deux. En spectateur : 1 à 5 pour encourager. Souris ou ↑ / ↓, Espace pour tirer au baby-foot, Échap pour abandonner. Les résultats vont au tournoi de la semaine.</p>`);
}
function partyApp() {
  if (!online()) return head("Afterwork") + offline("lancer un afterwork");
  const left = party.mine ? Math.max(0, Math.ceil((party.until - performance.now()) / 60000)) : 0;
  return page("Afterwork", (party.mine
    ? `<div class="pcard hero"><span class="big">🍻</span><b>Afterwork chez toi</b><span class="muted">encore ${left} min · ${party.folks.size} invité(s) dans ta salle de repos</span>
        <span>${[...party.guests.values()].map(n => esc(n)).join(", ") || `<span class="muted">en attente des réponses…</span>`}</span><button class="pill warn" data-party="stop">Arrêter la fête</button></div>`
    : party.joined
    ? `<div class="pcard hero"><span class="big">🍻</span><b>À l'afterwork de ${esc(party.joinedName)}</b><span class="muted">Ton équipe libre est là-bas.</span><div class="acts"><button class="pill" data-party="go">🚪 Y aller</button><button class="pill soft" data-party="leave">Rentrer avec l'équipe</button></div></div>`
    : `<div class="pcard hero"><span class="big">🍻</span><b>Afterwork commun</b><span class="muted">Invite tous les bureaux connectés dans ta salle de repos : leurs devs libres viennent boire un verre avec les tiens pendant ${15} minutes.</span><button class="pill" data-party="start">Lancer l'afterwork</button></div>`)
    + `<p class="note">Rien du travail des agents n'est partagé : seulement les devs, leur look et leur humeur.</p>`);
}
function emotesApp() {
  const on = net.emote && performance.now() < net.emote.until ? net.emote.key : "";
  return page("Emotes", `<div class="emogrid">${Object.entries(EMOTE_INFO).map(([k, [ic, label]]) => `<button class="${k === on ? "on" : ""}" data-emo="${k}"><span>${ic}</span><small>${label}</small></button>`).join("")}</div>
    <p class="note">Ton chef le fait pendant 4 secondes, chez toi ou en visite ; les autres chefs le voient.</p>`);
}
function statusApp() {
  return page("Statut", `<div class="group">${Object.entries(PRESENCE_INFO).map(([k, [ic, label]]) => row(`<span class="av all" style="background:#ffffff14">${ic}</span>`, label,
    k === "dnd" ? "refuse les appels, défis et afterworks" : k === "dispo" ? "on peut t'appeler" : "affiché à côté de ton nom",
    k === net.presence ? `<span class="check">✓</span>` : "", "button", ` data-pres="${k}"`)).join("")}</div>
    <p class="note">Les autres chefs le voient dans leurs contacts et au-dessus de ton chef.</p>`);
}
const RING_WHAT = { visio: () => "appel vidéo 📹", call: () => "t'invite dans son bureau…", duel: r => `te défie au ${DUEL_GAMES[r.skin]?.[1] || "jeu"} ${DUEL_GAMES[r.skin]?.[0] || ""}`, party: () => "lance un afterwork commun 🍻" };
function ringing(r) {
  return `<div class="ring"><span class="lbl0">Agent Office · appel entrant</span><b>${esc(r.name)}</b><span>${esc(RING_WHAT[r.kind || "call"](r))}</span>${av(r.name, "big")}
    <div class="acts"><div><button data-answer="no" class="no" aria-label="Refuser"><span>📞</span></button>Refuser</div><div><button data-answer="yes" class="yes" aria-label="Accepter">📞</button>Accepter</div></div></div>`;
}

function render(force = false) {
  const d = clockNow(), hh = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), r = net.ringing, c = app === "thread" ? conv(thread) : null;
  box.querySelector(".hh").textContent = hh;
  box.classList.toggle("offline", !online());
  const k = `${app}|${thread}|${hh}|${r?.from || ""}|${net.presence}|${party.mine}|${party.joined}|${party.guests.size}|${party.folks.size}|${net.emote?.until || 0}|${peers().map(p => p.status + p.duel).join("")}|${giftTo}|${guestbook().length}|${giftsGot().length}|${online()}|${net.visit?.pid || ""}|${peers().map(p => p.pid + p.visiting).join(",")}|${[...calling.keys()].join(",")}|${net.chat.length}|${unread()}|${missed}|${c?.msgs.length || 0}|${(data.questions || []).map(q => q.id + sentQ.has(q.id)).join()}|${(data.sessions || []).flatMap(s => s.agents.map(a => a.status + a.action)).join().length}|${callLog.data.length}`;
  if (!force && k === key) return;
  key = k;
  const typing = document.activeElement?.id === "ph-in", kept = [...screen.querySelectorAll("input")].filter(i => i.id !== "ph-in" && i.value).map(i => [i.id, i.value]), focus = document.activeElement?.id;  // what was being typed stays
  const view = r ? "ringing" : app, moved = view !== shown; shown = view;
  screen.className = `scr ${view}${moved ? " enter" : ""}`;
  screen.style.setProperty("--h", r ? hue(r.name) : "");
  screen.innerHTML = r ? ringing(r) : { home, phone: phoneApp, messages: messagesApp, thread: threadApp, visits: visitsApp, duels: duelsApp, visio: visioApp, gifts: giftsApp, book: bookApp, party: partyApp, emotes: emotesApp, status: statusApp, agents: agentsApp }[app]?.(d) || home(d);
  net.open = !box.hidden && app === "thread" ? thread : "";
  const m = document.getElementById("ph-msgs"); if (m) m.scrollTop = m.scrollHeight;
  if (typing) { const i = document.getElementById("ph-in"); i?.focus(); i?.setSelectionRange(draft.length, draft.length); }
  for (const [id, v] of kept) { const i = document.getElementById(id); if (i) i.value = v; }
  if (focus && focus !== "ph-in" && kept.some(k => k[0] === focus)) document.getElementById(focus)?.focus();
}
// the phone opens above its button (bottom left, in the household strip), inside the window
function place() {
  const r = btn.getBoundingClientRect(), w = box.offsetWidth || 304;
  if (!r.width) { box.style.left = "14px"; box.style.bottom = "70px"; box.style.height = ""; return; }  // the strip is hidden (buy mode)
  box.style.left = `${Math.round(Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)))}px`;
  box.style.bottom = `${Math.round(innerHeight - r.top + 12)}px`;
  box.style.height = `${Math.round(Math.max(320, Math.min(624, r.top - 24)))}px`;
}
addEventListener("resize", () => { if (!box.hidden) place(); });
const go = a => { app = a; if (a === "phone") missed = 0; render(true); };
function toggle(open = box.hidden) { const was = !box.hidden; box.hidden = !open; btn.classList.toggle("on", open); btn.setAttribute("aria-expanded", String(open)); if (open) { if (!was) shown = ""; place(); render(true); } else net.open = ""; }
btn.onclick = () => toggle();

box.addEventListener("click", async ev => {
  const b = ev.target.closest("button"); if (!b) return;
  try {
    if (b.dataset.home !== undefined) return go("home");
    if (b.dataset.go) return go(b.dataset.go === "network" ? (openChiefOs("network"), toggle(false), "home") : b.dataset.go);
    if (b.dataset.open === "network") { openChiefOs("network"); return toggle(false); }
    if (b.dataset.thread) { thread = b.dataset.thread; draft = ""; return go("thread"); }
    if (b.dataset.act === "home") { endVisit(); return render(true); }
    if (b.dataset.qa) {  // an agent's question: one of its options, or the words typed
      const q = (data.questions || []).find(x => x.id === b.dataset.qa); if (!q) return render(true);
      const answer = b.dataset.free !== undefined ? document.getElementById(`qa-${q.id}`)?.value.trim() : q.options?.[+b.dataset.i];
      if (!answer) return;
      b.disabled = true; const err = await answerQuestion(q.id, answer);
      if (err) { b.disabled = false; toast("🤖 AGENTS", "Pas envoyé", err); } else sfx("commit");
      return render(true);
    }
    if (b.dataset.agent) { openPanel(b.dataset.agent); return toggle(false); }
    if (demo() && (b.dataset.visit || b.dataset.call || b.dataset.visio || b.dataset.watch || b.dataset.gift || b.dataset.duel || b.dataset.party || b.dataset.book !== undefined)) {
      if (b.dataset.call || b.dataset.visio) { const p = peers().find(x => x.pid === (b.dataset.call || b.dataset.visio)); logCall(p?.name || "?", p?.pid, "out", b.dataset.visio ? "visio" : "call"); render(true); }
      return toast("📱 DÉMO", "Rien ne part sur le réseau", "En démo, les collègues sont imaginaires.");
    }
    if (b.dataset.visit) { await startVisit(b.dataset.visit); return toggle(false); }
    if (b.dataset.call) {
      const pid = b.dataset.call, name = peers().find(p => p.pid === pid)?.name || "ton collègue"; calling.set(pid, Date.now()); logCall(name, pid, "out"); render(true); await invite(pid);
      toast("📱 TÉLÉPHONE", "Ça sonne…", `Invitation envoyée à ${name}.`); sfx("commit");
    }
    if (b.dataset.visio) { logCall(peers().find(p => p.pid === b.dataset.visio)?.name || "?", b.dataset.visio, "out", "visio"); await callVisio(b.dataset.visio); return; }
    if (b.dataset.watch) { watchDuel(b.dataset.watch); return toggle(false); }
    if (b.dataset.giftto) { giftTo = b.dataset.giftto; return render(true); }
    if (b.dataset.gift) { if (await sendGift(giftTo, b.dataset.gift, document.getElementById("gift-note")?.value || "")) render(true); return; }
    if (b.dataset.book !== undefined) { const i = document.getElementById("book-in"); if (i?.value.trim()) { await signGuestbook(i.value); i.value = ""; } return; }
    if (b.dataset.duel) { const [pid, skin] = b.dataset.duel.split(":"); await challengeChief(pid, skin); return toggle(false); }
    if (b.dataset.party === "start") { await startParty(); return render(true); }
    if (b.dataset.party === "stop") { stopParty(); return render(true); }
    if (b.dataset.party === "leave") { leaveParty(); return render(true); }
    if (b.dataset.party === "go") { await startVisit(party.joined); visitRoom("lounge"); return toggle(false); }
    if (b.dataset.emo) { emote(b.dataset.emo); sfx("commit"); return render(true); }
    if (b.dataset.pres) { setPresence(b.dataset.pres); return render(true); }
    if (b.dataset.answer) {
      const yes = b.dataset.answer === "yes", r = net.ringing;
      if (r && ["call", "visio"].includes(r.kind || "call")) logCall(r.name, r.from, yes ? "in" : "no", r.kind === "visio" ? "visio" : "call");
      await answerCall(yes); btn.classList.remove("ringing"); if (yes) toggle(false); else render(true);
    }
    const send = text => { if (!text.trim()) return; if (demo()) return demoSend(text);
      sendChat(text, thread === "all" ? "" : thread).catch(err => toast("💬 MESSAGES", "Pas envoyé", err.message)); draft = ""; setTimeout(() => { render(true); document.getElementById("ph-in")?.focus(); }, 350); };
    if (b.dataset.send !== undefined) send(document.getElementById("ph-in").value);
    if (b.dataset.emote) send(b.dataset.emote);
  } catch (err) { toast("📱 TÉLÉPHONE", "Échec", err.message); }
});
// the demo's chat: our message, and a made-up colleague answers a moment later
function demoSend(text) {
  const key = thread, now = () => Date.now() / 1000;
  conv(key).msgs.push({ kind: "text", from: net.pid, name: CHIEF_NAME, text: text.trim(), t: now() }); draft = ""; render(true);
  setTimeout(() => {
    const p = key === "all" ? DEMO_PEERS[Math.floor(Math.random() * DEMO_PEERS.length)] : DEMO_PEERS.find(x => x.pid === key); if (!p) return;
    conv(key).msgs.push({ kind: "text", from: p.pid, name: p.name, text: DEMO_LINES[Math.floor(Math.random() * DEMO_LINES.length)], t: now() });
    if (net.open !== key) { conv(key).unread++; hub.phoneBanner({ icon: "💬", app: "thread", thread: key, title: p.name, body: "Nouveau message" }); }
    render(true);
  }, 1500 + Math.random() * 1500);
}
box.addEventListener("input", ev => { if (ev.target.id === "ph-in") { draft = ev.target.value; box.querySelector("[data-send]")?.classList.toggle("on", !!draft.trim()); } });
box.addEventListener("keydown", ev => {
  if (ev.target.tagName === "INPUT") ev.stopPropagation();  // the game's shortcuts stay out of it
  if (ev.key === "Enter" && ev.target.id === "ph-in") { ev.preventDefault(); box.querySelector("[data-send]")?.click(); }
  if (ev.key === "Enter" && ev.target.id === "book-in") { ev.preventDefault(); box.querySelector("[data-book]")?.click(); }
  if (ev.key === "Escape") toggle(false);
});

/* ---------- the banners: a notification drops at the top of the screen; a tap opens the app ---------- */
const banners = document.createElement("div");
banners.id = "phonebanners"; banners.setAttribute("aria-live", "polite"); document.body.append(banners);
hub.phoneBanner = ({ icon = "📱", app: to = "home", thread: th = "", title, body = "" }) => {
  if (!box.hidden && app === to && (to !== "thread" || thread === th)) return true;  // already looking at it
  const el = document.createElement("button");
  el.className = "pbanner"; el.innerHTML = `<span class="ic">${icon}</span><span class="txt"><b>${esc(title)}</b>${body ? `<small>${esc(clip(body, 110))}</small>` : ""}</span><time>maintenant</time>`;
  const gone = () => { el.classList.add("out"); setTimeout(() => el.remove(), 350); };
  el.onclick = () => { if (th) { thread = th; draft = ""; } hub.openPhone(to); el.remove(); };
  banners.prepend(el); while (banners.children.length > 3) banners.lastChild.remove();
  setTimeout(gone, 6500);
  return true;
};

// a call coming in (world/peers.js): the phone rings and opens
hub.phoneClose = () => toggle(false);
hub.openPhone = a => { go(a); toggle(true); };
hub.phoneRing = () => { btn.classList.add("ringing"); sfx("achievement"); toggle(true); };
setInterval(() => {
  if (net.ringing && performance.now() - net.ringing.at > 30000) {
    const r = net.ringing; net.ringing = null; missed++; btn.classList.remove("ringing");
    if (["call", "visio"].includes(r.kind || "call")) logCall(r.name, r.from, "missed", r.kind === "visio" ? "visio" : "call");
    hub.phoneBanner({ icon: "📞", app: "phone", title: "Appel manqué", body: `${r.name} ${RING_WHAT[r.kind || "call"](r)}` });
  }
  if (!net.ringing) btn.classList.remove("ringing");
  for (const [pid, at] of calling) if (Date.now() - at > 20000) calling.delete(pid);  // a call unanswered: try again
  const n = (online() ? unread() : 0) + missed + (data.questions?.length || 0), dot = btn.querySelector(".n");
  dot.hidden = !n; dot.textContent = n > 99 ? "99+" : n;
  if (!box.hidden) render();
}, 500);
