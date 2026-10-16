// ChiefOS → 📬 Questions: the blocking questions of the agents, each opens its answer panel.

import { clip, data } from "../core/core.js";
import { esc } from "../core/data.js";
import { openPanel } from "../ui/panel.js";
import { OsApp } from "./base.js";
import { closeChiefOs } from "../ui/chiefos.js";

class QuestionsApp extends OsApp {
  constructor() { super("questions", "📬", "Questions", "#e95420", { live: true }); }
  badge() { return data.questions?.length || 0; }
  render() {
    const qs = data.questions || [];
    return qs.length ? qs.map(q => `<div class="osrow"><b>❓ ${esc(q.from || "un agent")}</b><span>${esc(clip(q.question, 140))}</span><button data-os-q="${esc(q.id)}">Répondre</button></div>`).join("")
      : `<p class="muted">Aucune question en attente. 👌</p>`;
  }
  click(b) {
    if (!b.dataset.osQ) return false;
    closeChiefOs(); openPanel(`q:${b.dataset.osQ}`);
    return true;
  }
}
new QuestionsApp();
