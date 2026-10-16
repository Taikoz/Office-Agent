// ChiefOS → 📋 Rapport du jour (/api/report, report.js): read again each time the app is opened.

import { demoReport, isoDay, reportHtml } from "../agents/report.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

class ReportApp extends OsApp {
  constructor() { super("report", "📋", "Rapport du jour", "#2c7ae0"); this.data = null; }
  open() { this.data = null; }
  render() {
    if (!this.data) {
      const done = r => { this.data = r; renderChiefOs(); };
      (DEMO ? Promise.resolve(demoReport(isoDay(0))) : fetch(`/api/report?day=${isoDay(0)}`).then(r => r.json())).then(done).catch(() => done({ error: true }));
      return `<p class="muted">Chargement…</p>`;
    }
    return this.data.error ? `<p class="muted">Serveur injoignable.</p>` : reportHtml(this.data);
  }
}
new ReportApp();
