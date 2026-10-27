// ChiefOS → 📥 À traiter: one list of what waits for you, the most urgent first — the agents' blocking questions, then
// the alerts (each with its action), then the notifications not seen yet. Questions, Alertes and Notifications keep
// their own apps in the advanced mode (the history, the filters).

import { data } from "../core/core.js";
import { OsApp } from "./base.js";
import { alertsAppHtml, smartAlerts } from "./alerts.js";
import { unseenNotifsHtml } from "./notifs.js";

class InboxApp extends OsApp {
  constructor() { super("inbox", "📥", "À traiter", "#e95420", { live: true }); this.fresh = ""; }
  badge() { return (data.questions?.length || 0) + smartAlerts.size; }
  open() { this.fresh = unseenNotifsHtml(); }  // read once per visit: a refresh does not make them vanish
  render() {
    const n = data.questions?.length || 0, al = smartAlerts.size;
    if (!n && !al && !this.fresh) return `<div class="osempty"><span class="osemptyic" aria-hidden="true">✓</span><b>Rien à traiter</b><span>Aucune question d'agent, aucune alerte, rien de neuf depuis ta dernière visite.</span>${OsApp.advanced ? `<div class="osacts"><button data-os-app="notifs">🔔 Historique des notifications</button></div>` : ""}</div>`;
    return `<h4>❓ QUESTIONS DES AGENTS · ${n}</h4>${n ? OsApp.get("questions").render() : `<p class="osfine">✓ Aucune question en attente.</p>`}
      <h4>🚨 ALERTES · ${al}</h4>${al ? alertsAppHtml() : `<p class="osfine">✓ Rien à signaler.</p>`}
      <h4>🔔 NOUVEAU DEPUIS TA DERNIÈRE VISITE</h4>${this.fresh || `<p class="osnone">Rien de neuf.</p>`}
      <div class="osacts"><button data-os-app="notifs">🔔 Tout l'historique</button></div>`;
  }
  click(b, ev) { return OsApp.get("questions").click(b, ev); }  // « Répondre »; the alerts' buttons: alerts.js
}
new InboxApp();
