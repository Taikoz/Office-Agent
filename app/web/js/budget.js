"use strict";
// Budget per mission: a ceiling in $ (API-equivalent estimate) per agent type; over it, the card turns red and an alert goes out.
// Kept in this browser; edited in the STATS overlay. Off when Claude Code runs on a subscription (no per-token billing),
// unless forced on.

const BUDGET_DEFAULTS = { "feature-builder": 5, "tech-lead": 15, "mr-reviewer": 2, "security-auditor": 3, "e2e-test-writer": 4,
  "audit-security-code": 10, "board-cleaner": 2, default: 3 };
let budgets = { ...BUDGET_DEFAULTS };
try { Object.assign(budgets, JSON.parse(localStorage.getItem("office-budgets") || "{}")); } catch (_) { /* defaults */ }

let budgetForce = false;
try { budgetForce = localStorage.getItem("office-budget-force") === "1"; } catch (_) { /* storage blocked */ }
const budgetsOn = () => budgetForce || data.billing?.mode !== "subscription";

const budgetOf = type => budgets[type] ?? budgets.default;
const overBudget = a => budgetsOn() && (a.game?.cost || 0) > budgetOf(a.type);

function budgetBar(a) {
  if (!budgetsOn()) return "";
  const c = a.game?.cost || 0, b = budgetOf(a.type), pct = Math.min(100, Math.round(100 * c / b));
  return `<div class="budget${c > b ? " over" : pct >= 80 ? " near" : ""}" title="${money(c)} sur un budget de ${money(b)}"><i style="width:${pct}%"></i></div>`;
}

function renderBudgets() {
  const box = document.getElementById("perf-budgets");
  if (box.contains(document.activeElement)) return;  // keep what is being typed
  const sub = data.billing?.mode === "subscription";
  const head = sub ? `<p class="muted span">${budgetForce ? "Activés manuellement" : "Désactivés"} : ${esc(data.billing.label)}.
    <label class="force"><input type="checkbox" id="budget-force"${budgetForce ? " checked" : ""}> activer quand même</label></p>` : "";
  if (!budgetsOn()) { box.innerHTML = head; return; }
  const types = [...new Set([...Object.keys(BUDGET_DEFAULTS).filter(t => t !== "default"), "default"])];
  box.innerHTML = head + types.map(t => `<label>${esc(t === "default" ? "autres agents" : specialty(t))}
    <span>$<input type="number" min="0.1" step="0.5" data-type="${esc(t)}" value="${budgetOf(t)}"></span></label>`).join("");
}
document.getElementById("perf-budgets").addEventListener("change", ev => {
  if (ev.target.id === "budget-force") {
    budgetForce = ev.target.checked;
    try { localStorage.setItem("office-budget-force", budgetForce ? "1" : ""); } catch (_) { /* kept for this page only */ }
    ev.target.blur(); renderBudgets(); renderHud(); return;
  }
  const t = ev.target.dataset.type, v = parseFloat(ev.target.value);
  if (!t || !(v > 0)) return;
  budgets[t] = v;
  try { localStorage.setItem("office-budgets", JSON.stringify(budgets)); } catch (_) { /* kept for this page only */ }
  renderHud();
});
