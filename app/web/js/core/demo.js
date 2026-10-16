// Demo mode (?demo=1): fake sessions, no storage.

import { hub, provide } from "../hub.js";
import { data } from "./core.js";
import { perfDays } from "../agents/perf.js";

/* ---------- demo ---------- */
const demoAnswered = new Set();
function demoPerf() {
  const days = +perfDays.value, n = days <= 1 ? 24 : days, rnd = (seed, i) => (seed * (i + 3) * 7919) % 5;
  const withDaily = t => ({ ...t, daily: Array.from({ length: n }, (_, i) => rnd(t.runs, i) % 3) });
  return { days, bucket: days <= 1 ? 3600 : 86400, types: [
    { type: "feature-builder", runs: 9, done: 7, gone: 1, active: 1, tokens: 9 * 41000, tools: 9 * 96, errors: 9 * 3.1, seconds: 9 * 1900 },
    { type: "security-auditor", runs: 7, done: 7, gone: 0, active: 0, tokens: 7 * 18000, tools: 7 * 41, errors: 7 * 0.4, seconds: 7 * 640 },
    { type: "mr-reviewer", runs: 6, done: 5, gone: 1, active: 0, tokens: 6 * 12500, tools: 6 * 28, errors: 6 * 0.7, seconds: 6 * 420 },
    { type: "e2e-test-writer", runs: 3, done: 2, gone: 0, active: 1, tokens: 3 * 36000, tools: 3 * 120, errors: 3 * 6, seconds: 3 * 2600 },
  ].map(withDaily) };
}
function demoDetail(id) {
  const s = data.sessions[0], a = s?.agents.find(x => x.id === id);
  if (!a) return id === "chief" ? { id, type: "tech-lead", description: "démo", status: "working", tools: 12, errors: 0, tokens: 3400, idle: 3,
    action: s?.chief.action, progress: { pct: 50, source: "phases", label: "Délégation", steps: [] }, events: [], eventCount: 0 } : null;
  const life = Math.max(0, (Date.now() - Date.parse(a.started)) / 1000);
  const labels = ["Lecture du ticket", "Branche", "Implémentation", "Tests & vérifs", "Commit & push", "Merge request"];
  const reached = a.status === "done" ? labels.length : Math.min(labels.length - 1, Math.floor(life / 12));
  return { ...a, tokens: a.tools * 180, prompt: a.description,
    progress: { pct: a.status === "done" ? 100 : Math.round(100 * (reached + 0.5) / labels.length), source: "phases",
      label: labels[reached] || "Terminé", steps: labels.map((l, i) => ({ label: l, state: i < reached ? "done" : i === reached ? "current" : "todo" })) },
    events: Array.from({ length: a.tools }, (_, i) => ({ t: new Date(Date.parse(a.started) + i * 3000).toISOString(), kind: "tool", tool: "Bash", label: `étape ${i + 1}` })),
    eventCount: a.tools,
    edits: a.type === "feature-builder" ? [
      { t: a.started, tool: "Write", file: "/repos/shop-api/src/checkout/cart.py", old: null, new: "from dataclasses import dataclass\n\n\n@dataclass\nclass Cart:\n    currency: str\n    items: list[str]\n" },
      { t: new Date().toISOString(), tool: "Edit", file: "/repos/shop-api/src/checkout/cart.py", old: "@dataclass\nclass Cart:\n    currency: str\n    items: list[str]\n",
        new: "@dataclass(frozen=True)\nclass Cart:\n    currency: str\n    items: tuple[str, ...]\n\n    def is_euro(self) -> bool:\n        return self.currency == \"EUR\"\n" },
    ] : [], editCount: a.type === "feature-builder" ? 2 : 0,
    terminal: Array.from({ length: Math.min(8, Math.floor(life / 6) + 1) }, (_, i) => {
      const c = [["git fetch origin && git switch -c DEMO-101-discount origin/main", "Crée la branche", "Switched to a new branch 'DEMO-101-discount'"],
        ["uv run pytest tests/checkout -q", "Tests du module", "........................ [100%]\n24 passed in 3.21s"],
        ["make ruff-py", "Lint", "All checks passed!"], ["git status --short", "", " M src/checkout/cart.py"],
        ["uv run pytest -k discount", "Test ciblé", "FAILED tests/checkout/test_cart.py::test_discount - AssertionError"], ["git add -A && git commit -m 'DEMO-101 discount rules'", "Commit", "[DEMO-101-discount 3f2a1c9] DEMO-101 discount rules\n 2 files changed, 14 insertions(+)"],
        ["git push -u origin HEAD", "Push", "branch 'DEMO-101-discount' set up to track 'origin/DEMO-101-discount'."], ["glab mr create", "Ouvre la MR", null]][i];
      return { t: new Date().toISOString(), cmd: c[0], desc: c[1], cwd: "shop-api", out: c[2], failed: i === 4 };
    }), termCount: Math.min(8, Math.floor(life / 6) + 1) };
}
const demoApplied = [];
function demoMmx() {
  const t = (Date.now() - demoStart) / 1000;
  const e = (id, d, p, tags) => ({ id, t: "fact", d, p, tags, st: "active", s: "user", c: 1, r: [], created: "2026-10-12" });
  const knowledge = [e("FACT-0001", "Les tickets vivent dans le projet DEMO.", 3, ["tickets"])];
  if (t > 20) knowledge.push(e("FACT-0099", "Démo : nouvelle connaissance rangée par le security-auditor.", 3, ["démo"]));
  let pending = t > 45 ? [{ id: "PR-0099", op: "add", target: "PROJ-0099", reason: "Résumé d'audit (démo)", d: "Audit DEMO-102 : 0 critique.", status: "pending", created: "2026-10-13" }] : [];
  for (const id of demoApplied) {
    const p = pending.find(x => x.id === id);
    if (p) knowledge.push(e(p.target, p.d, 3, ["démo"]));
  }
  pending = pending.filter(x => !demoApplied.includes(x.id));
  return { stamp: (t > 20) + (t > 45) + demoApplied.length * 10, pending, modules: [
    { id: "MOD-PREFERENCES", label: "Préférences", entries: [e("PREF-0001", "Ne jamais toucher au dossier ~/perso.", 5, ["perso"])] },
    { id: "MOD-KNOWLEDGE", label: "Connaissances", entries: knowledge }] };
}
function demoAgentGame(id, life) {
  const script = { d1: [[10, "tests_fail", 3], [26, "tests_pass", 24], [26.5, "boss_defeated", 3], [36, "commit"], [44, "push"], [55, "mr"]],
    d5: [[18, "tests_fail", 2]], d2: [[30, "tests_pass", 12]], d3: [[40, "to_verify"]] }[id] || [];
  const now = Date.now() / 1000;
  const events = script.filter(s => life >= s[0]).map((s, i) => ({ i: i + 1, kind: s[1], n: s[2] || 0, t: now - (life - s[0]) }));
  const fails = events.filter(e => e.kind === "tests_fail"), last = events.filter(e => e.kind.startsWith("tests_")).pop();
  const stuck = id === "d5" && life > 35, mr = events.some(e => e.kind === "mr") ? "https://gitlab.example.com/demo/-/merge_requests/42" : null;
  return { evCount: events.length, events, boss: last?.kind === "tests_fail" ? { hp: last.n, max: Math.max(...fails.map(f => f.n)) } : null,
    first: now - life, last: now, cost: life * 0.011, files: [`demo/${id}/module.py`], fileCount: Math.min(5, Math.floor(life / 12)), mr,
    tests: last ? { ok: last.kind === "tests_pass", n: last.n } : null, timeline: events,
    progressT: stuck ? now - 720 : now - 5, sinceProgress: stuck ? 34 : 2 };
}
function demoGame() {
  const t = (Date.now() - demoStart) / 1000, step = t > 30;
  const names = [["first_done", "Premier livrable", 1], ["clean", "Sans faute", 1], ["speedrun", "Speedrun", 1], ["shipped", "Expédié", 1], ["green", "Tout vert", 10],
    ["phoenix", "Phénix", 1], ["hunter", "Chasseur", 1], ["elephant", "Mémoire d'éléphant", 10], ["spring", "Ménage de printemps", 5], ["marathon", "Marathon", 1],
    ["team", "Équipe complète", 1], ["centurion", "Centurion", 100]];
  const unlockedIds = new Set(["first_done", "clean", "green", ...(t > 30 ? ["phoenix"] : []), ...(t > 58 ? ["shipped"] : [])]);
  return {
    xp: { "feature-builder": { xp: step ? 1810 : 1700, level: step ? 7 : 6, from: step ? 1800 : 1250, to: step ? 2450 : 1800 },
      "security-auditor": { xp: 325, level: 3, from: 200, to: 450 }, "mr-reviewer": { xp: 1110, level: 5, from: 800, to: 1250 },
      "e2e-test-writer": { xp: 400, level: 3, from: 200, to: 450 }, "board-cleaner": { xp: 130, level: 2, from: 50, to: 200 } },
    achievements: names.map(([id, name, target]) => ({ id, name, desc: "Démo.", target, n: unlockedIds.has(id) ? target : Math.floor(target / 3), unlocked: unlockedIds.has(id), at: unlockedIds.has(id) ? Date.now() / 1000 : null })),
    cost: { today: 12.4, week: 86.2 },
    durations: { "feature-builder": 240, "security-auditor": 120, "mr-reviewer": 90, "e2e-test-writer": 200 },
    usage: { h5: 2.6e6, h5Prev: 1.4e6, d7: 9.8e6, hourly: Array.from({ length: 24 }, (_, i) => Math.round(2e5 * (1 + Math.sin(i / 3)) * (i > 8 ? 1.5 : 0.3))) },
    today: { pass: 5, fail: t > 40 ? 4 : 1 }, week: { mr: 7, lastMr: Date.now() / 1000 - 3600 }, alerts: [],
    employee: { type: "feature-builder", xp: 840 },
    quests: [{ id: "deliver", label: "Livrer 3 runs", n: t > 70 ? 2 : 1, target: 3 }, { id: "mr", label: "Ouvrir une MR", n: t > 58 ? 1 : 0, target: 1 },
      { id: "green", label: "Journée sans test rouge", n: 0, target: 1, failed: t > 12 }, { id: "verify", label: "2 tickets en To Verify", n: t > 40 ? 1 : 0, target: 2 },
      { id: "mmx", label: "Inbox MMX vide", n: 1, target: 1 }],
  };
}
const demoStart = Date.now();
function demo() {
  const t = (Date.now() - demoStart) / 1000;
  const plan = [
    ["d1", "feature-builder", "DEMO-101", "Deliver DEMO-101", 0, 70, ["git fetch origin", "Edit checkout/cart.py", "uv run pytest tests/checkout", "glab mr create"]],
    ["d2", "security-auditor", "DEMO-102", "Security audit DEMO-102", 8, 60, ["git diff main…", "skill secure-review", "audit_log.py add"]],
    ["d3", "board-cleaner", null, "Clean the sprint board", 16, 999, ["tracker board", "tracker search assignee:me", "glab mr list --search DEMO-103", "git grep origin/main"]],
    ["d4", "mr-reviewer", "DEMO-103", "Review MR !1564", 25, 999, ["glab mr diff", "Read routes.py", "uv run pytest -k routes"]],
    ["d5", "e2e-test-writer", "DEMO-104", "E2E tests DEMO-104", 34, 999, ["npx playwright test", "Write checkout.spec.ts"]],
  ];
  const agents = plan.filter(p => t > p[4]).map(([id, type, ticket, description, at, dur, acts]) => {
    const life = t - at;
    const blocked = id === "d5" && life > 20 && life < 40;
    const status = life > dur ? "done" : blocked ? "blocked" : "working";
    return { id, type, ticket, description, status, started: new Date(demoStart + at * 1000).toISOString(),
      action: acts[Math.floor(life / 6) % acts.length], tools: Math.floor(life / 3), tokens: Math.floor(life / 3) * 180, errors: blocked ? 1 : 0,
      lastError: blocked ? "Timeout 30000ms waiting for selector" : "", idle: status === "done" ? Math.floor(life - dur) : 2, game: demoAgentGame(id, life) };
  });
  const q = { id: "demo-q1", question: "Le filtre doit-il inclure les MR en Draft ?", options: ["Oui, toutes", "Non, seulement les MR prêtes", "Seulement les miennes"],
    context: "DEMO-103 — le ticket ne le précise pas, ça change la requête GitLab.", from: "DEMO-103 review", created: demoStart / 1000 + 30 };
  const d4 = agents.find(a => a.id === "d4");
  const questions = [];
  if (d4 && t > 30 && !demoAnswered.has(q.id)) { d4.status = "asking"; d4.question = q; questions.push(q); }
  return {
    tickets: { "DEMO-101": { state: "In Progress" }, "DEMO-102": { state: "To review" }, "DEMO-103": { state: "To Verify" }, "DEMO-104": { state: "In Progress" } },
    questions,
    backlog: [{ id: "DEMO-110", summary: "Export CSV", state: "Submitted" }, { id: "DEMO-111", summary: "Fix sync", state: "Submitted" }],
    pipelines: { "https://gitlab.example.com/demo/-/merge_requests/42": { state: "opened", ci: t > 70 ? "failed" : "running", ciUrl: "https://gitlab.example.com/demo/-/pipelines/1" } },
    sessions: [{ id: "demo", project: "repos", title: "démo — livraison checkout", prompt: "démo",
      chief: { agent: "tech-lead", action: t < 12 ? "TodoWrite" : t < 40 ? "Agent : délègue les tickets" : "Lit le rapport des devs", finished: false, idle: 3, tokens: 5200,
        game: { first: demoStart / 1000 - 60, timeline: [] } }, agents }],
  };
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get demo() { return demo; }, get demoAnswered() { return demoAnswered; }, get demoApplied() { return demoApplied; }, get demoDetail() { return demoDetail; }, get demoGame() { return demoGame; }, get demoMmx() { return demoMmx; }, get demoPerf() { return demoPerf; } });
