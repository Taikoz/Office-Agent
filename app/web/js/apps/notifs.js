// ChiefOS → 🔔 Notifications: every toast and alert kept 30 days, filterable, and what happened since your last visit.
// Wraps toast() and notify(): loaded after notify.js.

import { hub } from "../hub.js";
import { data } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { esc } from "../core/data.js";
import { toast } from "../sims/progress.js";
import { fmtSim, wallet } from "../sims/money.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { notify } from "../core/notify.js";

let notifBook = new SaveSlot("office-notifs", { list: [], seen: 0, lastVisit: 0 }).data;
const saveNotifs = () => SaveSlot.get("office-notifs").save(notifBook);
notifBook.list = notifBook.list.filter(n => Date.now() - n.t < 30 * 86400000);  // kept 30 days
const visitStart = Date.now(), prevVisit = notifBook.lastVisit || 0;
setInterval(() => { notifBook.lastVisit = Date.now(); saveNotifs(); }, 60000);
addEventListener("beforeunload", () => { notifBook.lastVisit = Date.now(); saveNotifs(); });
const toastBefore = toast;
hub.toast = function (kicker, title, body, cls) {  // every toast is kept in the notification centre
  notifBook.list.unshift({ t: Date.now(), k: String(kicker || ""), title: String(title || ""), body: String(body || "") });
  notifBook.list = notifBook.list.slice(0, 400); saveNotifs();
  return toastBefore(kicker, title, body, cls);
};
const notifyBefore = notify;
hub.notify = function (title, body, ...rest) {
  notifBook.list.unshift({ t: Date.now(), k: "NOTIFICATION", title: String(title || ""), body: String(body || "") });
  notifBook.list = notifBook.list.slice(0, 400); saveNotifs();
  return notifyBefore(title, body, ...rest);
};
const NOTIF_CATS = [["", "Tout"], ["agents", "Agents", /SALAIRE|MERGE|ALERTE|NOTIFICATION|PLANNING|LANCEMENT|DÉBRIEF|COMPÉTENCE|PROMOTION|DÉMISSION|RECRUTEMENT/], ["jeu", "Bureau", /ENVIE|AMITIÉ|CUISINE|BOUTIQUE|MODE ACHAT|CONSTRUCTION|AFTERWORK|FÊTE|ANNIVERSAIRE|VISITE|COUPURE|LIVRAISON|INCIDENT|RÉGLÉ|RÉCOMPENSE|ADOPTION|PARRAINAGE/], ["outils", "Outils", /GITLAB|BLUEPRINT|SAUVEGARDE|IMPORT|MÉTÉO|RAPPORT|SEMAINE|CHIEFOS/]];
const nf = { cat: "", q: "" };
const unreadNotifs = () => notifBook.list.filter(n => n.t > (notifBook.seen || 0)).length;
function notifsAppHtml() {
  const cat = NOTIF_CATS.find(c => c[0] === nf.cat), q = nf.q.toLowerCase();
  const list = notifBook.list.filter(n => (!cat?.[2] || cat[2].test(n.k)) && (!q || `${n.k} ${n.title} ${n.body}`.toLowerCase().includes(q)));
  const since = notifBook.list.filter(n => n.t > prevVisit && n.t < visitStart), paid = wallet.log.filter(l => !l.spend && l.t > prevVisit);
  const summary = prevVisit ? `<div class="nfsum"><b>Depuis ta dernière visite</b> (${new Date(prevVisit).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}) :
      ${paid.length} mission(s) livrée(s)${paid.length ? ` (+${fmtSim(paid.reduce((s, l) => s + l.total, 0))})` : ""} · ${since.length} notification(s) · ${data.questions?.length || 0} question(s) en attente</div>` : "";
  notifBook.seen = Date.now(); saveNotifs();
  return `${summary}<div class="glbar"><span class="gllogo">🔔</span><b>Notifications</b><span class="muted">${notifBook.list.length} gardées</span><input class="glsearch nfsearch" placeholder="Filtrer…" value="${esc(nf.q)}" aria-label="Filtrer"><button data-nf="clear" title="Tout effacer">🗑</button></div>
    <nav class="gltabs">${NOTIF_CATS.map(([id, l]) => `<button data-nf-cat="${id}" class="${nf.cat === id ? "on" : ""}">${l}</button>`).join("")}</nav>
    ${list.slice(0, 200).map(n => `<div class="osrow nfrow"><b><small class="muted">${esc(n.k)}</small><br>${esc(n.title)}</b><span class="muted">${esc(n.body)}</span><span class="muted">${new Date(n.t).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("") || `<p class="muted">Rien ici.</p>`}`;
}

class NotifsApp extends OsApp {
  constructor() { super("notifs", "🔔", "Notifications", "#c64600"); }
  render() { return notifsAppHtml(); }
  badge() { return unreadNotifs(); }
  input(ev) { if (ev.target.classList.contains("nfsearch")) { nf.q = ev.target.value; this.refreshKeeping(".nfsearch"); } }
  click(b) {
    if (b.dataset.nfCat !== undefined) nf.cat = b.dataset.nfCat;
    else if (b.dataset.nf === "clear") { notifBook.list = []; saveNotifs(); }
    else return false;
    renderChiefOs();
    return true;
  }
}
new NotifsApp();
