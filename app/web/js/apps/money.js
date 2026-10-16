// ChiefOS → 💰 Comptes: the household funds (money.js), today's ins and outs, the last operations.

import { esc } from "../core/data.js";
import { fmtSim, wallet } from "../sims/money.js";
import { wantBook } from "../sims/wants.js";
import { OsApp } from "./base.js";

class MoneyApp extends OsApp {
  constructor() { super("money", "💰", "Comptes", "#38b44a", { live: true }); }
  render() {
    const today = new Date().toDateString(), log = wallet.log.filter(l => new Date(l.t).toDateString() === today);
    const inT = log.filter(l => l.total > 0).reduce((s, l) => s + l.total, 0), outT = log.filter(l => l.total < 0).reduce((s, l) => s - l.total, 0);
    return `<div class="rstats"><div>solde<b>${fmtSim(wallet.funds)}</b></div><div>entrées du jour<b>+${fmtSim(inT)}</b></div><div>sorties du jour<b>−${fmtSim(outT)}</b></div><div>gagnés en tout<b>${fmtSim(wallet.earned)}</b></div><div>points de satisfaction<b>${wantBook.points}</b></div></div>
      ${wallet.log.slice(0, 15).map(l => `<div class="osrow"><b>${l.total >= 0 ? "＋" : "－"} ${fmtSim(Math.abs(l.total))}</b><span>${esc(l.label || `${l.who}${l.ticket ? ` · ${l.ticket}` : ""}`)}</span><span class="muted">${new Date(l.t).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")}`;
  }
}
new MoneyApp();
