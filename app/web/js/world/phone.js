// The phone, a smartphone of our own (bottom left, by the household): a lock-free home screen (wallpaper, clock
// widget, app icons with their badges, a dock) and its apps. 📞 Téléphone: the connected chiefs, "Inviter" calls one of
// them to our office; a call coming in rings full screen (accept: we go to the caller's office, world/peers.js
// startVisit). 💬 Messages: the conversations of ChiefOS → Messages (everyone, or one chief), nothing saved. 🚪 Visites:
// whose office to visit, back home. 🏓 Défis: ping-pong or baby-foot against another chief (games/online.js). 🍻
// Afterwork: all the offices in our break room (social/netparty.js). 😀 Emotes. 🟢 Statut (⛔ declines calls and
// challenges). 📹 Visio: a video call with avatars (world/visio.js). 🎁 Cadeaux and 📖 Livre d'or (social/gifts.js).
// 🌐 Réseau: ChiefOS → Réseau (host, join). The bar at the bottom: back home.

import { hub } from "../hub.js";
import { esc } from "../core/data.js";
import { clockNow } from "../sims/days.js";
import { EMOTE_INFO, PRESENCE_INFO, answerCall, conv, emote, endVisit, invite, net, sendChat, setPresence, startVisit, unread, visitRoom } from "./peers.js";
import { DUEL_GAMES, challengeChief, watchDuel } from "../games/online.js";
import { GIFTS, giftsGot, guestbook, sendGift, signGuestbook } from "../social/gifts.js";
import { callVisio } from "./visio.js";
import { leaveParty, party, startParty, stopParty } from "../social/netparty.js";
import { sfx, toast } from "../sims/progress.js";
import { openChiefOs } from "../ui/chiefos.js";

const btn = document.createElement("button");
btn.id = "phonebtn"; btn.title = "Téléphone"; btn.innerHTML = `📱<span class="n" hidden></span>`;
const box = document.createElement("section");
box.id = "phone"; box.hidden = true; box.setAttribute("aria-label", "Téléphone");
box.innerHTML = `<div class="device"><div class="island"></div><div class="status"><b class="hh"></b><span>📶 <small>Wi-Fi</small> 🔋</span></div><div class="screen"></div><button class="homebar" data-home aria-label="Écran d'accueil"></button></div>`;
document.body.append(btn, box);
const screen = box.querySelector(".screen");
let app = "home", thread = "all", draft = "", key = "", missed = 0;
const calling = new Map();  // pid → when we called (the button waits a little)
const demo = () => typeof DEMO !== "undefined" && DEMO;
const time = t => new Date(t * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const nameOf = k => k === "all" ? "Tout le monde" : net.peers.find(p => p.pid === k)?.name || "Parti";
const initial = n => esc(String(n || "?").slice(0, 1).toUpperCase());
const where = p => p.visiting === net.pid ? "chez toi" : p.visiting ? `en visite chez ${net.peers.find(x => x.pid === p.visiting)?.name || "quelqu'un"}` : "dans son bureau";
const EMOTES = ["👋", "😂", "👍", "🎉", "☕", "🔥"];
const APPS = [
  { id: "phone", icon: "📞", label: "Téléphone", bg: "linear-gradient(#5fe07a,#29a845)", badge: () => missed },
  { id: "messages", icon: "💬", label: "Messages", bg: "linear-gradient(#6ee387,#2fb54d)", badge: () => net.sid ? unread() : 0 },
  { id: "visits", icon: "🚪", label: "Visites", bg: "linear-gradient(#ffcf5a,#fbaa08)", badge: () => 0 },
  { id: "visio", icon: "📹", label: "Visio", bg: "linear-gradient(#6ee387,#1f9d4a)", badge: () => 0 },
  { id: "duels", icon: "🏓", label: "Défis", bg: "linear-gradient(#ff9a7a,#e0482f)", badge: () => net.peers.filter(p => p.duel).length },
  { id: "gifts", icon: "🎁", label: "Cadeaux", bg: "linear-gradient(#ff8fc1,#e0457e)", badge: () => 0 },
  { id: "book", icon: "📖", label: "Livre d'or", bg: "linear-gradient(#e8c48a,#a8743a)", badge: () => bookNew() },
  { id: "party", icon: "🍻", label: "Afterwork", bg: "linear-gradient(#c79bff,#7a3ee0)", badge: () => party.mine ? party.guests.size : 0 },
  { id: "emotes", icon: "😀", label: "Emotes", bg: "linear-gradient(#ffe36e,#f2b705)", badge: () => 0 },
  { id: "status", get icon() { return PRESENCE_INFO[net.presence][0]; }, label: "Statut", bg: "linear-gradient(#e9edf5,#aab3c5)", badge: () => 0 },
  { id: "network", icon: "🌐", label: "Réseau", bg: "linear-gradient(#5ad0ff,#1f7fd6)", badge: () => 0 },
];
let bookSeen = 0;
const bookNew = () => guestbook().filter(e => e.t > bookSeen).length;
try { bookSeen = +localStorage.getItem("office-book-seen") || 0; } catch (_) { /* storage blocked */ }
let giftTo = "";
const dot = p => `<span class="pres" title="${esc(PRESENCE_INFO[p.status]?.[1] || "")}">${PRESENCE_INFO[p.status]?.[0] || ""}</span>`;
const offline = what => `<div class="empty"><div class="big">📡</div><p>${demo() ? "Pas de réseau en mode démo." : `Pas connecté. Ouvre ton bureau ou rejoins celui d'un collègue pour ${what}.`}</p>${demo() ? "" : `<button class="pill" data-open="network">🌐 Ouvrir Réseau</button>`}</div>`;
const head = (title, back = "home") => `<div class="apphead"><button data-go="${back}">‹ ${back === "home" ? "Accueil" : "Retour"}</button><h3>${title}</h3></div>`;

/* ---------- the screens ---------- */
function home(d) {
  const icon = a => { const n = a.badge(); return `<button class="app" data-go="${a.id}"><span class="ic" style="background:${a.bg}">${a.icon}${n ? `<i>${n > 99 ? "99+" : n}</i>` : ""}</span><small>${a.label}</small></button>`; };
  const status = `${PRESENCE_INFO[net.presence][0]} ${net.visit ? `Chez ${esc(net.visit.name)}` : net.sid ? `${net.peers.length + 1} chef${net.peers.length ? "s" : ""} en ligne` : "Hors ligne"}${party.mine ? " · 🍻" : ""}`;
  return `<div class="home"><div class="widget"><b>${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b><span>${esc(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))}</span><small>${status}</small></div>
    <div class="grid">${APPS.map(icon).join("")}${net.visit ? `<button class="app" data-act="home"><span class="ic" style="background:linear-gradient(#ff8a8a,#d23a3a)">🏠</span><small>Rentrer</small></button>` : ""}</div>
    <div class="dock">${["phone", "messages", "duels", "visits"].map(id => icon(APPS.find(a => a.id === id))).join("")}</div></div>`;
}
function phoneApp() {
  if (!net.sid) return head("Téléphone") + offline("appeler un collègue");
  return head("Téléphone") + `<div class="list">${net.peers.length ? net.peers.map(p => `<div class="row"><span class="av">${initial(p.name)}</span><b>${dot(p)} ${esc(p.name)}<small>${esc(p.status === "dnd" ? "ne pas déranger" : where(p))}</small></b>
    ${p.visiting === net.pid ? `<span class="ok">✓ ici</span>` : calling.has(p.pid) ? `<span class="muted">appel…</span>` : p.status === "dnd" ? `<span class="muted">⛔</span>` : `<button class="call" data-call="${esc(p.pid)}" title="Inviter dans ton bureau">📞</button>`}</div>`).join("")
    : `<p class="muted pad">Personne d'autre n'est connecté.</p>`}</div><p class="foot">📞 = inviter : son téléphone sonne, et s'il accepte, il arrive dans ton bureau.</p>`;
}
function messagesApp() {
  if (!net.sid) return head("Messages") + offline("discuter");
  const keys = ["all", ...net.peers.map(p => p.pid)];
  return head("Messages") + `<div class="list">${keys.map(k => { const c = conv(k), last = c.msgs.filter(m => m.kind === "text").at(-1);
    return `<button class="row conv" data-thread="${esc(k)}"><span class="av${k === "all" ? " all" : ""}">${k === "all" ? "👥" : initial(nameOf(k))}</span><b>${esc(nameOf(k))}<small>${last ? esc(`${last.from === net.pid ? "Toi : " : k === "all" ? `${last.name} : ` : ""}${last.text}`) : "Aucun message"}</small></b>
      <span class="meta">${last ? time(last.t) : ""}${c.unread ? `<i>${c.unread}</i>` : ""}</span></button>`; }).join("")}</div><p class="foot">🔒 Rien n'est enregistré : tout s'efface quand le bureau ferme.</p>`;
}
function threadApp() {
  if (!net.sid) return head("Messages") + offline("discuter");
  if (thread !== "all" && !net.peers.some(p => p.pid === thread)) thread = "all";
  const c = conv(thread); c.unread = 0;
  const msgs = c.msgs.map(m => m.kind === "system" ? `<div class="sys">${time(m.t)} · ${esc(m.text)}</div>`
    : `<div class="bub ${m.from === net.pid ? "me" : ""}">${m.from !== net.pid && thread === "all" ? `<b>${esc(m.name)}</b>` : ""}${esc(m.text)}<small>${time(m.t)}</small></div>`).join("") || `<p class="muted pad">Dis bonjour 👋</p>`;
  return head(`${thread === "all" ? "👥" : ""} ${esc(nameOf(thread))}`, "messages") + `<div class="thread" id="ph-msgs">${msgs}</div>
    <div class="emo">${EMOTES.map(e => `<button data-emote="${e}">${e}</button>`).join("")}</div>
    <div class="send"><input id="ph-in" maxlength="200" placeholder="Message" value="${esc(draft)}" aria-label="Message"><button data-send aria-label="Envoyer">↑</button></div>`;
}
function visitsApp() {
  if (!net.sid) return head("Visites") + offline("visiter un bureau");
  const offices = net.peers.filter(p => !p.visiting);
  return head("Visites") + (net.visit ? `<div class="card"><b>🚪 Chez ${esc(net.visit.name)}</b><span class="muted">Ton chef t'attend dans ton bureau.</span><button class="pill" data-act="home">🏠 Rentrer</button></div>` : "")
    + `<div class="list">${offices.length ? offices.map(p => `<div class="row"><span class="av">${initial(p.name)}</span><b>Bureau de ${esc(p.name)}<small>${net.peers.filter(x => x.visiting === p.pid).length} visiteur(s)</small></b>
      ${net.visit?.pid === p.pid ? `<span class="ok">✓ ici</span>` : `<button class="pill" data-visit="${esc(p.pid)}">Visiter</button>`}</div>`).join("") : `<p class="muted pad">Aucun autre bureau ouvert.</p>`}</div>
    <p class="foot">Ceux qui viennent chez toi apparaissent dans tes pièces.</p>`;
}
function visioApp() {
  if (!net.sid) return head("Visio") + offline("faire un appel vidéo");
  return head("Visio") + `<div class="list">${net.peers.length ? net.peers.map(p => `<div class="row"><span class="av">${initial(p.name)}</span><b>${dot(p)} ${esc(p.name)}<small>${p.status === "dnd" ? "ne pas déranger" : "appel vidéo avec ton avatar"}</small></b>
    ${p.status === "dnd" ? `<span class="muted">⛔</span>` : `<button class="call" data-visio="${esc(p.pid)}" title="Appel vidéo">📹</button>`}</div>`).join("") : `<p class="muted pad">Personne d'autre n'est connecté.</p>`}</div>
    <p class="foot">Pas de caméra : il voit ton chef qui parle, bouge et fait des emotes. La voix passe par ton micro, seulement pendant l'appel (refusé : on s'écrit).</p>`;
}
function giftsApp() {
  if (!net.sid) return head("Cadeaux") + offline("offrir un cadeau");
  if (!net.peers.some(p => p.pid === giftTo)) giftTo = net.peers[0]?.pid || "";
  if (!giftTo) return head("Cadeaux") + `<p class="muted pad">Personne d'autre n'est connecté.</p>`;
  const got = giftsGot().slice(0, 4);
  return head("Cadeaux") + `<div class="chips">${net.peers.map(p => `<button class="pill${p.pid === giftTo ? " on" : ""}" data-giftto="${esc(p.pid)}">${esc(p.name)}</button>`).join("")}</div>
    <div class="emogrid">${Object.entries(GIFTS).map(([k, g]) => `<button data-gift="${k}"><span>${g.icon}</span><small>${esc(g.label)}<br>§ ${g.price}</small></button>`).join("")}</div>
    <div class="send"><input id="gift-note" maxlength="200" placeholder="Un petit mot (optionnel)" aria-label="Mot"></div>
    ${got.length ? `<p class="foot">Reçus : ${got.map(g => `${GIFTS[g.id]?.icon || "🎁"} de ${esc(g.from)}`).join(" · ")}</p>` : `<p class="foot">Payé avec ta caisse ; toute son équipe en profite.</p>`}`;
}
function bookApp() {
  bookSeen = Date.now(); try { localStorage.setItem("office-book-seen", String(bookSeen)); } catch (_) { /* storage blocked */ }
  const e = guestbook();
  return head("Livre d'or") + (net.visit ? `<div class="card"><b>✍️ Signer chez ${esc(net.visit.name)}</b><div class="send"><input id="book-in" maxlength="200" placeholder="Un mot pour son livre d'or" aria-label="Mot"><button data-book aria-label="Signer">↑</button></div></div>` : "")
    + `<div class="list">${e.length ? e.map(x => `<div class="row"><span class="av">${initial(x.name)}</span><b>${esc(x.name)}<small style="white-space:normal">« ${esc(x.text)} »</small></b><span class="meta">${new Date(x.t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></div>`).join("")
      : `<p class="muted pad">Personne n'a encore signé ton livre d'or. Les chefs qui te visitent peuvent le faire depuis leur téléphone.</p>`}</div>`;
}
function duelsApp() {
  if (!net.sid) return head("Défis") + offline("défier un collègue");
  const free = net.peers.filter(p => p.status !== "dnd" && !p.duel), live = net.peers.filter(p => p.duel);
  return head("Défis") + `<div class="list">${net.peers.length ? net.peers.map(p => `<div class="row"><span class="av">${initial(p.name)}</span><b>${dot(p)} ${esc(p.name)}<small>${p.status === "dnd" ? "ne pas déranger" : "premier à 5"}</small></b>
    ${free.includes(p) ? Object.entries(DUEL_GAMES).map(([id, [ic, label]]) => `<button class="pill" data-duel="${esc(p.pid)}:${id}" title="Défier au ${label}">${ic}</button>`).join("") : ""}</div>`).join("")
    : `<p class="muted pad">Personne d'autre n'est connecté.</p>`}</div>
    ${live.length ? `<h4 class="sub">En cours</h4><div class="list">${live.map(p => { const [, g, vs] = p.duel.split(":"); return `<div class="row"><span class="av all">${DUEL_GAMES[g]?.[0] || "🎮"}</span><b>${esc(p.name)} vs ${esc(net.peers.find(x => x.pid === vs)?.name || (vs === net.pid ? "toi" : "?"))}<small>${DUEL_GAMES[g]?.[1] || ""}</small></b>${vs === net.pid ? "" : `<button class="pill" data-watch="${esc(p.pid)}">👀 Regarder</button>`}</div>`; }).join("")}</div>` : ""}
    <p class="foot">Son téléphone sonne ; s'il accepte, la partie démarre chez vous deux. En spectateur : 1 à 5 pour encourager. Souris ou ↑ / ↓, Espace pour tirer au baby-foot, Échap pour abandonner. Les résultats vont au tournoi de la semaine.</p>`;
}
function partyApp() {
  if (!net.sid) return head("Afterwork") + offline("lancer un afterwork");
  const left = party.mine ? Math.max(0, Math.ceil((party.until - performance.now()) / 60000)) : 0;
  return head("Afterwork") + (party.mine
    ? `<div class="card"><b>🍻 Afterwork chez toi</b><span class="muted">encore ${left} min · ${party.folks.size} invité(s) dans ta salle de repos</span>
        <span>${[...party.guests.values()].map(n => esc(n)).join(", ") || "<span class=muted>en attente des réponses…</span>"}</span><button class="pill" data-party="stop">Arrêter la fête</button></div>`
    : party.joined
    ? `<div class="card"><b>🍻 À l'afterwork de ${esc(party.joinedName)}</b><span class="muted">Ton équipe libre est là-bas.</span><button class="pill" data-party="go">🚪 Y aller</button><button class="pill" data-party="leave">Rentrer avec l'équipe</button></div>`
    : `<div class="card"><b>🍻 Afterwork commun</b><span class="muted">Invite tous les bureaux connectés dans ta salle de repos : leurs devs libres viennent boire un verre avec les tiens pendant ${15} minutes.</span><button class="pill" data-party="start">Lancer l'afterwork</button></div>`)
    + `<p class="foot">Rien du travail des agents n'est partagé : seulement les devs, leur look et leur humeur.</p>`;
}
function emotesApp() {
  const on = net.emote && performance.now() < net.emote.until ? net.emote.key : "";
  return head("Emotes") + `<div class="emogrid">${Object.entries(EMOTE_INFO).map(([k, [ic, label]]) => `<button class="${k === on ? "on" : ""}" data-emo="${k}"><span>${ic}</span><small>${label}</small></button>`).join("")}</div>
    <p class="foot">Ton chef le fait pendant 4 secondes, chez toi ou en visite ; les autres chefs le voient.</p>`;
}
function statusApp() {
  return head("Statut") + `<div class="list">${Object.entries(PRESENCE_INFO).map(([k, [ic, label]]) => `<button class="row" data-pres="${k}"><span class="av all">${ic}</span><b>${label}<small>${k === "dnd" ? "refuse les appels, défis et afterworks" : k === "dispo" ? "on peut t'appeler" : "affiché à côté de ton nom"}</small></b>${k === net.presence ? `<span class="ok">✓</span>` : ""}</button>`).join("")}</div>
    <p class="foot">Les autres chefs le voient dans leurs contacts et au-dessus de ton chef.</p>`;
}
const RING_WHAT = { visio: () => "appel vidéo 📹", call: () => "t'invite dans son bureau…", duel: r => `te défie au ${DUEL_GAMES[r.skin]?.[1] || "jeu"} ${DUEL_GAMES[r.skin]?.[0] || ""}`, party: () => "lance un afterwork commun 🍻" };
function ringing(r) {
  return `<div class="ring"><span class="av big">${initial(r.name)}</span><b>${esc(r.name)}</b><span>${esc(RING_WHAT[r.kind || "call"](r))}</span>
    <div class="acts"><button data-answer="no" class="no" aria-label="Refuser">✕</button><button data-answer="yes" class="yes" aria-label="Accepter">📞</button></div><div class="lbl"><span>Refuser</span><span>Accepter</span></div></div>`;
}

function render(force = false) {
  const d = clockNow(), hh = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), r = net.ringing, c = app === "thread" ? conv(thread) : null;
  box.querySelector(".hh").textContent = hh;
  const k = `${app}|${thread}|${hh}|${r?.from || ""}|${net.presence}|${party.mine}|${party.joined}|${party.guests.size}|${party.folks.size}|${net.emote?.until || 0}|${net.peers.map(p => p.status + p.duel).join("")}|${giftTo}|${guestbook().length}|${giftsGot().length}|${net.sid}|${net.visit?.pid || ""}|${net.peers.map(p => p.pid + p.visiting).join(",")}|${[...calling.keys()].join(",")}|${net.chat.length}|${unread()}|${missed}|${c?.msgs.length || 0}`;
  if (!force && k === key) return;
  key = k;
  const typing = document.activeElement?.id === "ph-in", kept = [...screen.querySelectorAll("input")].filter(i => i.id !== "ph-in" && i.value).map(i => [i.id, i.value]), focus = document.activeElement?.id;  // what was being typed stays
  screen.className = `screen ${r ? "ringing" : app}`;
  screen.innerHTML = r ? ringing(r) : { home, phone: phoneApp, messages: messagesApp, thread: threadApp, visits: visitsApp, duels: duelsApp, visio: visioApp, gifts: giftsApp, book: bookApp, party: partyApp, emotes: emotesApp, status: statusApp }[app]?.(d) || home(d);
  net.open = !box.hidden && app === "thread" ? thread : "";
  const m = document.getElementById("ph-msgs"); if (m) m.scrollTop = m.scrollHeight;
  if (typing) { const i = document.getElementById("ph-in"); i?.focus(); i?.setSelectionRange(draft.length, draft.length); }
  for (const [id, v] of kept) { const i = document.getElementById(id); if (i) i.value = v; }
  if (focus && focus !== "ph-in" && kept.some(k => k[0] === focus)) document.getElementById(focus)?.focus();
}
const go = a => { app = a; if (a === "phone") missed = 0; render(true); };
function toggle(open = box.hidden) { box.hidden = !open; btn.classList.toggle("on", open); if (open) render(true); else net.open = ""; }
btn.onclick = () => toggle();

box.addEventListener("click", async ev => {
  const b = ev.target.closest("button"); if (!b) return;
  try {
    if (b.dataset.home !== undefined) return go("home");
    if (b.dataset.go) return go(b.dataset.go === "network" ? (openChiefOs("network"), toggle(false), "home") : b.dataset.go);
    if (b.dataset.open === "network") { openChiefOs("network"); return toggle(false); }
    if (b.dataset.thread) { thread = b.dataset.thread; draft = ""; return go("thread"); }
    if (b.dataset.act === "home") { endVisit(); return render(true); }
    if (b.dataset.visit) { await startVisit(b.dataset.visit); return toggle(false); }
    if (b.dataset.call) {
      const pid = b.dataset.call; calling.set(pid, Date.now()); render(true); await invite(pid);
      toast("📱 TÉLÉPHONE", "Ça sonne…", `Invitation envoyée à ${net.peers.find(p => p.pid === pid)?.name || "ton collègue"}.`); sfx("commit");
    }
    if (b.dataset.visio) { await callVisio(b.dataset.visio); return; }
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
    if (b.dataset.answer) { const yes = b.dataset.answer === "yes"; await answerCall(yes); btn.classList.remove("ringing"); if (yes) toggle(false); else render(true); }
    const send = text => { if (!text.trim()) return; sendChat(text, thread === "all" ? "" : thread).catch(err => toast("💬 MESSAGES", "Pas envoyé", err.message)); draft = ""; setTimeout(() => { render(true); document.getElementById("ph-in")?.focus(); }, 350); };
    if (b.dataset.send !== undefined) send(document.getElementById("ph-in").value);
    if (b.dataset.emote) send(b.dataset.emote);
  } catch (err) { toast("📱 TÉLÉPHONE", "Échec", err.message); }
});
box.addEventListener("input", ev => { if (ev.target.id === "ph-in") draft = ev.target.value; });
box.addEventListener("keydown", ev => {
  if (ev.target.tagName === "INPUT") ev.stopPropagation();  // the game's shortcuts stay out of it
  if (ev.key === "Enter" && ev.target.id === "ph-in") { ev.preventDefault(); box.querySelector("[data-send]")?.click(); }
  if (ev.key === "Enter" && ev.target.id === "book-in") { ev.preventDefault(); box.querySelector("[data-book]")?.click(); }
  if (ev.key === "Escape") toggle(false);
});

// a call coming in (world/peers.js): the phone rings and opens
hub.phoneClose = () => toggle(false);
hub.openPhone = a => { go(a); toggle(true); };
hub.phoneRing = () => { btn.classList.add("ringing"); sfx("achievement"); toggle(true); };
setInterval(() => {
  if (net.ringing && performance.now() - net.ringing.at > 30000) { net.ringing = null; missed++; btn.classList.remove("ringing"); toast("📱 TÉLÉPHONE", "Appel manqué", ""); }
  if (!net.ringing) btn.classList.remove("ringing");
  for (const [pid, at] of calling) if (Date.now() - at > 20000) calling.delete(pid);  // a call unanswered: try again
  const n = (net.sid ? unread() : 0) + missed, dot = btn.querySelector(".n");
  dot.hidden = !n; dot.textContent = n > 99 ? "99+" : n;
  if (!box.hidden) render();
}, 500);
