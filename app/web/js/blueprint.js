"use strict";
// ChiefOS → 🧩 Blueprints: design a Claude Code skill or agent visually, Unreal-Blueprint style. Prefab blocks (inputs,
// reading, commands, edits, delegation to an agent, questions, Git, checks, conditions, loops, parallel branches,
// functions, rules, result) are wired on a canvas; the graph compiles to the Markdown of a skill (SKILL.md) or of an
// agent (agents/<name>.md). Publishing: choose the .claude (global, or a project's), then let Claude write it there in
// the proper format (an interactive claude opens in that folder), or write the draft directly. Blueprints are kept in
// this browser (and the save file).

/* ---------- the blocks ---------- */
const BP_CATS = [["start", "▶", "Départ", "#c7162b"], ["input", "📥", "Entrées", "#0e8420"], ["read", "🔎", "Contexte", "#2c7ae0"], ["act", "⚙️", "Actions", "#e95420"],
  ["logic", "🔀", "Logique", "#77216f"], ["func", "ƒ", "Fonctions", "#19b6ee"], ["out", "🏁", "Sortie", "#f99b11"]];
const F = (key, label, kind = "text", extra = {}) => ({ key, label, kind, ...extra });
const BLOCKS = {
  start: { cat: "start", icon: "▶", label: "Départ", outs: ["out"], noIn: true, unique: true,
    fields: [F("when", "Quand l'utiliser", "textarea", { ph: "Quand l'utilisateur demande de… / quand un ticket…" }), F("role", "Rôle (agents)", "textarea", { ph: "Tu es un expert en…" }), F("keywords", "Mots-clés", "text", { ph: "review, MR, sécurité" })],
    sum: p => p.when || "quand l'utiliser ?" },
  input: { cat: "input", icon: "📥", label: "Argument", outs: ["out"], fields: [F("name", "Nom"), F("desc", "Description"), F("required", "Obligatoire", "select", { options: ["oui", "non"] })], sum: p => `${p.name || "?"}${p.required === "non" ? " (optionnel)" : ""}` },
  read: { cat: "read", icon: "📄", label: "Lire des fichiers", outs: ["out"], fields: [F("paths", "Fichiers / motif", "text", { ph: "src/**/*.py, README.md" }), F("why", "Pour quoi faire")], sum: p => p.paths || "?" },
  search: { cat: "read", icon: "🔎", label: "Chercher dans le code", outs: ["out"], fields: [F("pattern", "Motif"), F("where", "Où", "text", { ph: "tout le dépôt" })], sum: p => p.pattern || "?" },
  web: { cat: "read", icon: "🌐", label: "Lire une page web", outs: ["out"], fields: [F("url", "Adresse / sujet"), F("why", "Pour quoi faire")], sum: p => p.url || "?" },
  bash: { cat: "act", icon: "⌨️", label: "Lancer une commande", outs: ["out"], fields: [F("cmd", "Commande", "text", { mono: true }), F("why", "Pourquoi")], sum: p => p.cmd || "?" },
  edit: { cat: "act", icon: "✏️", label: "Modifier du code", outs: ["out"], fields: [F("what", "Quoi faire", "textarea"), F("files", "Fichiers concernés")], sum: p => p.what || "?" },
  write: { cat: "act", icon: "🆕", label: "Créer un fichier", outs: ["out"], fields: [F("path", "Chemin"), F("content", "Contenu attendu", "textarea")], sum: p => p.path || "?" },
  agent: { cat: "act", icon: "🤖", label: "Déléguer à un agent", outs: ["out"], fields: [F("type", "Type d'agent", "text", { ph: "general-purpose, Explore, mr-reviewer…" }), F("mission", "Mission", "textarea")], sum: p => `${p.type || "agent"} : ${p.mission || "?"}` },
  skill: { cat: "act", icon: "🧠", label: "Utiliser un skill", outs: ["out"], fields: [F("name", "Skill"), F("why", "Pour quoi faire")], sum: p => p.name || "?" },
  ask: { cat: "act", icon: "❓", label: "Demander à l'utilisateur", outs: ["out"], fields: [F("question", "Question"), F("options", "Options (séparées par ;)")], sum: p => p.question || "?" },
  git: { cat: "act", icon: "🌿", label: "Git", outs: ["out"], fields: [F("action", "Action", "select", { options: ["créer une branche", "commiter", "pousser", "ouvrir une merge request", "rebaser"] }), F("details", "Détails")], sum: p => `${p.action || "?"}${p.details ? ` — ${p.details}` : ""}` },
  check: { cat: "act", icon: "✅", label: "Vérifier", outs: ["out"], fields: [F("what", "Vérification", "text", { ph: "les tests passent, le lint est propre…" }), F("cmd", "Commande", "text", { mono: true }), F("onfail", "Si ça échoue", "select", { options: ["corriger et recommencer", "s'arrêter et expliquer", "demander à l'utilisateur"] })], sum: p => p.what || p.cmd || "?" },
  if: { cat: "logic", icon: "🔀", label: "Condition", outs: ["then", "else", "next"], fields: [F("cond", "Si…", "text", { ph: "les tests échouent" })], sum: p => `si ${p.cond || "?"}` },
  loop: { cat: "logic", icon: "🔁", label: "Pour chaque", outs: ["body", "next"], fields: [F("each", "Élément"), F("in", "Dans", "text", { ph: "les fichiers modifiés" })], sum: p => `${p.each || "élément"} de ${p.in || "?"}` },
  parallel: { cat: "logic", icon: "⫴", label: "En parallèle", outs: ["a", "b", "next"], fields: [F("note", "Note")], sum: p => p.note || "deux branches en même temps" },
  stop: { cat: "logic", icon: "⛔", label: "Arrêter", outs: [], fields: [F("reason", "Raison / message")], sum: p => p.reason || "fin" },
  func: { cat: "func", icon: "ƒ", label: "Fonction", outs: ["out"], noIn: true, fields: [F("name", "Nom"), F("params", "Paramètres"), F("desc", "Rôle")], sum: p => `${p.name || "?"}(${p.params || ""})` },
  call: { cat: "func", icon: "↪", label: "Appeler une fonction", outs: ["out"], fields: [F("fn", "Fonction", "fnselect"), F("args", "Avec")], sum: p => `${p.fn || "?"}(${p.args || ""})` },
  step: { cat: "act", icon: "📝", label: "Étape libre", outs: ["out"], fields: [F("text", "Instruction", "textarea")], sum: p => p.text || "?" },
  // hooks (shell): the event JSON is in $input
  hjq: { cat: "read", icon: "🔎", label: "Lire un champ de l'événement", hook: true, outs: ["out"], fields: [F("var", "Variable", "text", { ph: "cmd", mono: true }), F("path", "Champ (jq)", "text", { ph: ".tool_input.command", mono: true })], sum: p => `${p.var || "?"} ← ${p.path || "?"}` },
  hcmd: { cat: "act", icon: "⌨️", label: "Commande shell", hook: true, outs: ["out"], fields: [F("cmd", "Commande", "text", { mono: true, ph: "npm run lint --silent" }), F("why", "Pourquoi")], sum: p => p.cmd || "?" },
  hif: { cat: "logic", icon: "🔀", label: "Si (test shell)", hook: true, outs: ["then", "else", "next"], fields: [F("test", "Test", "text", { mono: true, ph: '[[ "$cmd" == *"git push"* ]]' })], sum: p => p.test || "?" },
  hmsg: { cat: "out", icon: "💬", label: "Message à Claude", hook: true, outs: ["out"], fields: [F("msg", "Message")], sum: p => p.msg || "?" },
  hblock: { cat: "out", icon: "⛔", label: "Bloquer l'action", hook: true, outs: [], fields: [F("msg", "Raison (montrée à Claude)")], sum: p => p.msg || "bloqué" },
  output: { cat: "out", icon: "🏁", label: "Résultat", outs: [], fields: [F("format", "Ce qu'il rend", "textarea", { ph: "un résumé, la liste des fichiers, le lien de la MR…" })], sum: p => p.format || "?" },
  rule: { cat: "out", icon: "📏", label: "Règle", outs: [], noIn: true, fields: [F("text", "Règle", "textarea", { ph: "Ne jamais pousser sur main." })], sum: p => p.text || "?" },
};
const PORT_FR = { out: "", then: "alors", else: "sinon", next: "ensuite", body: "corps", a: "A", b: "B" };
const catOf = t => BP_CATS.find(c => c[0] === BLOCKS[t].cat);
const AGENT_TOOLS = ["Read", "Grep", "Glob", "Edit", "Write", "Bash", "WebFetch", "WebSearch", "Agent", "TodoWrite", "NotebookEdit"];

/* ---------- storage, templates ---------- */
let bpBook = store("office-blueprints", { list: [], current: null });
const saveBp = () => save("office-blueprints", bpBook);
let bpSeq = 0;
const nid = () => `n${Date.now().toString(36)}${(bpSeq++).toString(36)}`;
function newBp(kind = "skill", tpl = "blank") {
  const start = { id: nid(), type: "start", x: 60, y: 120, props: {} };
  const bp = { id: `bp${Date.now().toString(36)}`, kind, name: kind === "skill" ? "mon-skill" : kind === "hook" ? "mon-hook" : "mon-agent", description: "", nodes: [start], links: [],
    settings: { tools: [], model: "inherit", color: "blue", hook: { event: "PreToolUse", matcher: "Bash", timeout: "" } } };
  const chain = (...defs) => { let prev = start, x = 340; for (const [type, props] of defs) { const n = { id: nid(), type, x, y: 120, props }; bp.nodes.push(n); bp.links.push({ from: prev.id, port: prev === start ? "out" : "out", to: n.id }); prev = n; x += 280; } return prev; };
  if (kind === "hook" && tpl === "nopush") {
    Object.assign(bp, { name: "pas-de-push-sur-main", description: "Empêche Claude de pousser directement sur main." });
    const read = { id: nid(), type: "hjq", x: 340, y: 120, props: { var: "cmd", path: ".tool_input.command" } };
    const cond = { id: nid(), type: "hif", x: 620, y: 120, props: { test: '[[ "$cmd" =~ git\\ push.*(main|master) ]]' } };
    const block = { id: nid(), type: "hblock", x: 900, y: 60, props: { msg: "Pousser sur main est interdit : crée une branche et une merge request." } };
    bp.nodes.push(read, cond, block); bp.links.push({ from: start.id, port: "out", to: read.id }, { from: read.id, port: "out", to: cond.id }, { from: cond.id, port: "then", to: block.id });
    return bp;
  }
  if (tpl === "review") {
    Object.assign(bp, { name: kind === "skill" ? "revue-mr" : "relecteur-mr", description: "Relit une merge request et laisse des commentaires vérifiés." });
    start.props = { when: "Quand l'utilisateur demande de relire une MR (lien ou numéro).", role: "Tu es un relecteur exigeant et bienveillant.", keywords: "review, MR, relecture" };
    const last = chain(["input", { name: "mr", desc: "Lien ou numéro de la MR", required: "oui" }], ["bash", { cmd: "git diff origin/main...HEAD", why: "voir le diff" }], ["search", { pattern: "TODO|FIXME|console.log", where: "fichiers modifiés" }]);
    const cond = { id: nid(), type: "if", x: last.x + 280, y: 120, props: { cond: "un point critique est trouvé (sécurité, perte de données, régression)" } };
    const ok = { id: nid(), type: "output", x: cond.x + 300, y: 40, props: { format: "Un commentaire par point critique, avec la ligne et une proposition de correction." } };
    const lgtm = { id: nid(), type: "output", x: cond.x + 300, y: 220, props: { format: "Un seul commentaire : LGTM ✅" } };
    const rule = { id: nid(), type: "rule", x: 340, y: 300, props: { text: "Ne jamais approuver ni fusionner la MR." } };
    bp.nodes.push(cond, ok, lgtm, rule); bp.links.push({ from: last.id, port: "out", to: cond.id }, { from: cond.id, port: "then", to: ok.id }, { from: cond.id, port: "else", to: lgtm.id });
  } else if (tpl === "ticket") {
    Object.assign(bp, { name: kind === "skill" ? "livrer-ticket" : "livreur-ticket", description: "Livre un ticket de bout en bout : branche, code, tests, MR." });
    start.props = { when: "Quand l'utilisateur donne un ticket à livrer (ex. DEMO-1234).", role: "Tu es un développeur senior rigoureux.", keywords: "ticket, livrer, feature" };
    const last = chain(["input", { name: "ticket", desc: "Identifiant du ticket", required: "oui" }], ["git", { action: "créer une branche", details: "<TICKET>-<résumé>" }], ["edit", { what: "Implémenter le ticket en suivant les conventions du dépôt.", files: "" }],
      ["check", { what: "les tests passent", cmd: "make test", onfail: "corriger et recommencer" }], ["git", { action: "ouvrir une merge request", details: "assignée à l'utilisateur" }], ["output", { format: "Le lien de la MR et un résumé des changements." }]);
    bp.nodes.push({ id: nid(), type: "rule", x: 340, y: 300, props: { text: "Ne jamais pousser directement sur main." } });
    void last;
  }
  return bp;
}
let bp = bpBook.current || newBp();
let bpSel = null, bpView = { x: 0, y: 0, z: 1 }, bpModal = null, bpTargets = null, bpMsg = "";
const persistBp = () => { bpBook.current = bp; saveBp(); };

/* ---------- compiling the graph to Markdown ---------- */
const nodeById = id => bp.nodes.find(n => n.id === id);
const nextOf = (n, port) => { const l = bp.links.find(x => x.from === n.id && x.port === port); return l ? nodeById(l.to) : null; };
function stepText(n) {
  const p = n.props || {}, cmd = c => c ? ` : \`${c}\`` : "";
  switch (n.type) {
    case "input": return `Récupérer l'argument **${p.name || "?"}**${p.desc ? ` (${p.desc})` : ""}${p.required === "non" ? ", optionnel" : ""}.`;
    case "read": return `Lire ${p.paths || "les fichiers utiles"}${p.why ? ` pour ${p.why}` : ""}.`;
    case "search": return `Chercher \`${p.pattern || "?"}\`${p.where ? ` dans ${p.where}` : ""}.`;
    case "web": return `Consulter ${p.url || "la documentation"}${p.why ? ` pour ${p.why}` : ""}.`;
    case "bash": return `Lancer la commande${cmd(p.cmd)}${p.why ? ` (${p.why})` : ""}.`;
    case "edit": return `Modifier le code : ${p.what || "?"}${p.files ? ` (fichiers : ${p.files})` : ""}.`;
    case "write": return `Créer le fichier \`${p.path || "?"}\`${p.content ? ` : ${p.content}` : ""}.`;
    case "agent": return `Déléguer à un agent **${p.type || "general-purpose"}** : ${p.mission || "?"}`;
    case "skill": return `Utiliser le skill **${p.name || "?"}**${p.why ? ` pour ${p.why}` : ""}.`;
    case "ask": return `Demander à l'utilisateur : « ${p.question || "?"} »${p.options ? ` (choix : ${p.options.split(";").map(s => s.trim()).filter(Boolean).join(" / ")})` : ""}.`;
    case "git": return `Git — ${p.action || "?"}${p.details ? ` : ${p.details}` : ""}.`;
    case "check": return `Vérifier que ${p.what || "tout est correct"}${cmd(p.cmd)}. Si ça échoue : ${p.onfail || "s'arrêter et expliquer"}.`;
    case "stop": return `Arrêter${p.reason ? ` : ${p.reason}` : ""}.`;
    case "call": return `Appliquer la fonction **${p.fn || "?"}**${p.args ? ` avec ${p.args}` : ""}.`;
    case "output": return `Rendre le résultat : ${p.format || "?"}`;
    case "step": return p.text || "";
    default: return "";
  }
}
// a chain of steps from a node, with nested branches (condition, loop, parallel); guards against cycles
function walk(n, depth, seen, out) {
  const pad = "   ".repeat(depth);
  let i = 1;
  while (n && !seen.has(n.id)) {
    seen.add(n.id);
    const mark = depth ? "-" : `${i}.`;
    if (n.type === "if") {
      out.push(`${pad}${mark} Si ${n.props.cond || "?"} :`);
      walk(nextOf(n, "then"), depth + 1, seen, out);
      if (nextOf(n, "else")) { out.push(`${"   ".repeat(depth + 1)}- Sinon :`); walk(nextOf(n, "else"), depth + 2, seen, out); }
      n = nextOf(n, "next");
    } else if (n.type === "loop") {
      out.push(`${pad}${mark} Pour chaque ${n.props.each || "élément"} de ${n.props.in || "?"} :`);
      walk(nextOf(n, "body"), depth + 1, seen, out); n = nextOf(n, "next");
    } else if (n.type === "parallel") {
      out.push(`${pad}${mark} En parallèle${n.props.note ? ` (${n.props.note})` : ""} :`);
      for (const port of ["a", "b"]) if (nextOf(n, port)) { out.push(`${pad}   - Branche ${port.toUpperCase()} :`); walk(nextOf(n, port), depth + 2, seen, out); }
      n = nextOf(n, "next");
    } else { const t = stepText(n); if (t) out.push(`${pad}${mark} ${t}`); n = nextOf(n, "out"); }
    i++;
  }
}
// a hook: a bash script reading the event JSON on stdin; exit 2 blocks the action and shows stderr to Claude
const shq = v => `'${String(v).replace(/'/g, "'\\''")}'`;
function walkSh(n, depth, seen, out) {
  const pad = "  ".repeat(depth);
  while (n && !seen.has(n.id)) {
    seen.add(n.id);
    const p = n.props || {};
    if (n.type === "hif") {
      out.push(`${pad}if ${p.test || "false"}; then`); const before = out.length; walkSh(nextOf(n, "then"), depth + 1, seen, out); if (out.length === before) out.push(`${pad}  :`);
      if (nextOf(n, "else")) { out.push(`${pad}else`); walkSh(nextOf(n, "else"), depth + 1, seen, out); }
      out.push(`${pad}fi`); n = nextOf(n, "next"); continue;
    }
    if (n.type === "hjq") out.push(`${pad}${(p.var || "value").replace(/[^A-Za-z0-9_]/g, "_")}="$(printf '%s' "$input" | jq -r ${shq(p.path || ".")} 2>/dev/null)"`);
    else if (n.type === "hcmd") out.push(`${pad}${p.why ? `# ${p.why}\n${pad}` : ""}${p.cmd || ":"}`);
    else if (n.type === "hmsg") out.push(`${pad}echo ${shq(p.msg || "")} >&2`);
    else if (n.type === "hblock") out.push(`${pad}echo ${shq(p.msg || "Action bloquée par un hook.")} >&2`, `${pad}exit 2`);
    else if (n.type === "stop") out.push(`${pad}exit 0`);
    n = nextOf(n, "out");
  }
}
function compileHook() {
  const h = bp.settings.hook || {}, start = bp.nodes.find(n => n.type === "start"), lines = [];
  walkSh(start && nextOf(start, "out"), 0, new Set([start?.id]), lines);
  return ["#!/usr/bin/env bash", `# Hook « ${bp.name} » — ${h.event || "?"}${h.matcher ? ` (${h.matcher})` : ""}, généré par Agent Office`, ...(bp.description ? [`# ${bp.description}`] : []),
    "# L'événement (JSON) arrive sur l'entrée standard ; exit 2 bloque l'action et montre stderr à Claude.", 'input="$(cat)"', "", ...lines, "", "exit 0", ""].join("\n");
}
const hookEntryPreview = () => { const h = bp.settings.hook || {}; return JSON.stringify({ hooks: { [h.event || "PreToolUse"]: [{ ...(h.matcher && /ToolUse$/.test(h.event || "") ? { matcher: h.matcher } : {}), hooks: [{ type: "command", command: `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/${bp.name}.sh"`, ...(h.timeout ? { timeout: +h.timeout } : {}) }] }] } }, null, 2); };
function compileBp() {
  if (bp.kind === "hook") return compileHook();
  const start = bp.nodes.find(n => n.type === "start") || { props: {} }, sp = start.props || {};
  const inputs = bp.nodes.filter(n => n.type === "input"), funcs = bp.nodes.filter(n => n.type === "func"), rules = bp.nodes.filter(n => n.type === "rule"), outputs = bp.nodes.filter(n => n.type === "output");
  const steps = []; walk(nextOf(start, "out"), 0, new Set([start.id]), steps);
  const when = (sp.when || "").trim(), whenTxt = !when ? "" : /^(quand|lorsque|si|dès que|à chaque)\b/i.test(when) ? when.replace(/^\w/, c => c.toUpperCase()) : `À utiliser quand : ${when}`;
  const desc = [bp.description.trim(), whenTxt].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const title = bp.name.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());
  const front = bp.kind === "skill"
    ? ["---", `name: ${bp.name}`, `description: ${desc || "…"}`, ...(bp.settings.tools.length ? [`allowed-tools: ${bp.settings.tools.join(", ")}`] : []), "---"]
    : ["---", `name: ${bp.name}`, `description: ${desc || "…"}`, ...(bp.settings.tools.length ? [`tools: ${bp.settings.tools.join(", ")}`] : []), `model: ${bp.settings.model || "inherit"}`, `color: ${bp.settings.color || "blue"}`, "---"];
  const body = [`# ${title}`, ""];
  if (bp.kind === "agent" && sp.role) body.push(sp.role, "");
  if (bp.description) body.push(bp.description, "");
  if (sp.when || sp.keywords) body.push("## Quand l'utiliser", ...(sp.when ? [sp.when] : []), ...(sp.keywords ? [`Mots-clés : ${sp.keywords}`] : []), "");
  if (inputs.length) body.push("## Entrées", ...inputs.map(n => `- \`${n.props.name || "?"}\`${n.props.desc ? ` — ${n.props.desc}` : ""}${n.props.required === "non" ? " (optionnel)" : " (obligatoire)"}`), "");
  body.push("## Étapes", ...(steps.length ? steps : ["1. (relie des blocs au Départ)"]), "");
  for (const f of funcs) { const fs = []; walk(nextOf(f, "out"), 0, new Set([f.id]), fs); body.push(`## Fonction ${f.props.name || "?"}(${f.props.params || ""})`, ...(f.props.desc ? [f.props.desc, ""] : []), ...(fs.length ? fs : ["1. …"]), ""); }
  if (rules.length) body.push("## Règles", ...rules.map(n => `- ${n.props.text || "?"}`), "");
  if (outputs.length) body.push("## Résultat attendu", ...outputs.map(n => `- ${n.props.format || "?"}`), "");
  return [...front, "", ...body].join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
// problems shown before publishing
function lintBp() {
  const issues = [];
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(bp.name)) issues.push("Nom : minuscules, chiffres et tirets seulement.");
  if (bp.kind === "hook" && !bp.settings.hook?.event) issues.push("Choisis l'événement du hook.");
  if (bp.kind !== "hook" && !bp.description.trim() && !bp.nodes.find(n => n.type === "start")?.props.when) issues.push("Ajoute une description ou « Quand l'utiliser » (c'est ce qui déclenche le skill).");
  if (!bp.links.some(l => l.from === bp.nodes.find(n => n.type === "start")?.id)) issues.push("Le bloc Départ n'est relié à rien.");
  const linked = new Set(bp.links.flatMap(l => [l.from, l.to]));
  const lonely = bp.nodes.filter(n => !["start", "rule", "func"].includes(n.type) && !linked.has(n.id)).length;
  if (lonely) issues.push(`${lonely} bloc(s) non relié(s) : ils seront ignorés.`);
  for (const c of bp.nodes.filter(n => n.type === "call")) if (!bp.nodes.some(f => f.type === "func" && f.props.name === c.props.fn)) issues.push(`Appel de fonction inconnue : ${c.props.fn || "?"}.`);
  return issues;
}

/* ---------- drawing ---------- */
const NODE_W = 220;
function nodeHtml(n) {
  const b = BLOCKS[n.type], [, , , col] = catOf(n.type);
  return `<div class="bpnode${bpSel === n.id ? " sel" : ""}" data-node="${n.id}" style="left:${n.x}px;top:${n.y}px;--c:${col}">
    <div class="bphead" data-drag="${n.id}">${b.noIn ? "" : `<span class="bpin" data-in="${n.id}" title="Entrée"></span>`}<span>${b.icon}</span><b>${esc(b.label)}</b></div>
    <div class="bpsum">${esc(clip(n.type === "start" && bp.kind === "hook" ? `${bp.settings.hook?.event || "?"}${bp.settings.hook?.matcher ? ` · ${bp.settings.hook.matcher}` : ""}` : b.sum(n.props || {}), 70))}</div>
    <div class="bpouts">${b.outs.map(p => `<span class="bpout" data-out="${n.id}" data-port="${p}" title="Sortie ${esc(PORT_FR[p] || p)}">${esc(PORT_FR[p])}<i></i></span>`).join("")}</div></div>`;
}
// centre of a port, in world coordinates (whatever the zoom)
function portPos(n, kind, port) {
  const world = document.querySelector(".bpworld"), el = document.querySelector(`.bpcanvas [data-node="${n.id}"]`);
  const dot = el && (kind === "in" ? el.querySelector(".bpin") : el.querySelector(`[data-out="${n.id}"][data-port="${port}"] i`));
  if (!world || !dot) return { x: n.x + (kind === "in" ? 0 : NODE_W), y: n.y + 17 };
  const w = world.getBoundingClientRect(), r = dot.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - w.left) / bpView.z, y: (r.top + r.height / 2 - w.top) / bpView.z };
}
const curve = (a, b) => { const dx = Math.max(60, Math.abs(b.x - a.x) / 2); return `M${a.x} ${a.y}C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`; };
function drawLinks(temp) {
  const svg = document.querySelector(".bpwires"); if (!svg) return;
  svg.innerHTML = bp.links.map((l, i) => { const a = nodeById(l.from), b = nodeById(l.to); if (!a || !b) return ""; const pa = portPos(a, "out", l.port), pb = portPos(b, "in");
    return `<path class="bpwire" data-link="${i}" d="${curve(pa, pb)}" style="--c:${catOf(a.type)[3]}"/>`; }).join("") + (temp ? `<path class="bpwire temp" d="${curve(temp.a, temp.b)}"/>` : "");
}
function renderCanvas() {
  const c = document.querySelector(".bpcanvas"); if (!c) return;
  c.querySelector(".bpworld").style.transform = `translate(${bpView.x}px, ${bpView.y}px) scale(${bpView.z})`;
  c.querySelector(".bpnodes").innerHTML = bp.nodes.map(nodeHtml).join("");
  drawLinks();
}
const HOOK_EVENTS = [["PreToolUse", "avant un outil (peut le bloquer)"], ["PostToolUse", "après un outil"], ["UserPromptSubmit", "à chaque message de l'utilisateur"], ["Stop", "quand Claude a fini"], ["SubagentStop", "quand un sous-agent a fini"], ["SessionStart", "au début d'une session"], ["Notification", "à chaque notification"], ["PreCompact", "avant de compacter"]];
function hookSettingsHtml() {
  const h = bp.settings.hook || (bp.settings.hook = { event: "PreToolUse", matcher: "Bash", timeout: "" });
  return `<h4>HOOK</h4><label>Nom<input data-bp-meta="name" value="${esc(bp.name)}" spellcheck="false"></label>
    <label>Description<textarea data-bp-meta="description" rows="2">${esc(bp.description)}</textarea></label>
    <label>Quand<select data-bp-hook="event">${HOOK_EVENTS.map(([e, l]) => `<option value="${e}"${h.event === e ? " selected" : ""}>${e} — ${l}</option>`).join("")}</select></label>
    ${/ToolUse$/.test(h.event) ? `<label>Outils concernés (matcher)<input data-bp-hook="matcher" value="${esc(h.matcher || "")}" placeholder="Bash, Edit|Write, mcp__.*" class="mono" spellcheck="false"></label>` : ""}
    <label>Délai max (s, optionnel)<input data-bp-hook="timeout" value="${esc(h.timeout || "")}" placeholder="60"></label>
    <p class="muted">Le script reçoit l'événement en JSON dans <code>$input</code> (lis un champ avec « Lire un champ de l'événement », ex. <code>.tool_input.command</code> ou <code>.tool_input.file_path</code>). « Bloquer l'action » renvoie le code 2 : Claude voit la raison et ne fait pas l'action.</p>`;
}
function inspectorHtml() {
  const n = bpSel && nodeById(bpSel);
  if (bp.kind === "hook" && (!n || n.type === "start")) return hookSettingsHtml();
  if (!n) {
    const s = bp.settings;
    return `<h4>${bp.kind === "skill" ? "SKILL" : "AGENT"}</h4><label>Nom<input data-bp-meta="name" value="${esc(bp.name)}" spellcheck="false"></label>
      <label>Description<textarea data-bp-meta="description" rows="3" placeholder="Ce que fait ce ${bp.kind === "skill" ? "skill" : "agent"}, en une ou deux phrases.">${esc(bp.description)}</textarea></label>
      ${bp.kind === "agent" ? `<label>Modèle<select data-bp-set="model">${["inherit", "sonnet", "opus", "haiku"].map(m => `<option${s.model === m ? " selected" : ""}>${m}</option>`).join("")}</select></label>
        <label>Couleur<select data-bp-set="color">${["blue", "green", "orange", "purple", "red", "yellow", "pink", "cyan"].map(m => `<option${s.color === m ? " selected" : ""}>${m}</option>`).join("")}</select></label>` : ""}
      <h4>${bp.kind === "skill" ? "OUTILS AUTORISÉS (optionnel)" : "OUTILS (vide = tous)"}</h4><div class="bptools">${AGENT_TOOLS.map(t => `<label><input type="checkbox" data-bp-tool="${t}"${s.tools.includes(t) ? " checked" : ""}> ${t}</label>`).join("")}</div>
      <p class="muted">Clique un bloc pour le régler. Relie une sortie (●) à l'entrée d'un autre bloc. Suppr efface le bloc ou le fil choisi.</p>`;
  }
  const b = BLOCKS[n.type], fns = bp.nodes.filter(f => f.type === "func").map(f => f.props.name).filter(Boolean);
  return `<h4>${b.icon} ${esc(b.label).toUpperCase()}</h4>${b.fields.map(f => {
    const v = n.props[f.key] ?? "";
    if (f.kind === "textarea") return `<label>${esc(f.label)}<textarea data-bp-prop="${f.key}" rows="4" placeholder="${esc(f.ph || "")}">${esc(v)}</textarea></label>`;
    if (f.kind === "select") return `<label>${esc(f.label)}<select data-bp-prop="${f.key}">${f.options.map(o => `<option${v === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
    if (f.kind === "fnselect") return `<label>${esc(f.label)}<select data-bp-prop="${f.key}"><option value="">—</option>${fns.map(o => `<option${v === o ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
    return `<label>${esc(f.label)}<input data-bp-prop="${f.key}" value="${esc(v)}" placeholder="${esc(f.ph || "")}"${f.mono ? ' class="mono"' : ""} spellcheck="false"></label>`;
  }).join("")}${b.unique ? "" : `<div class="osacts"><button data-bp="dup">⧉ Dupliquer</button><button data-bp="del">🗑 Supprimer</button></div>`}`;
}
function modalHtml() {
  if (!bpModal) return "";
  const file = bp.kind === "skill" ? `skills/${esc(bp.name)}/SKILL.md` : bp.kind === "hook" ? `hooks/${esc(bp.name)}.sh` : `agents/${esc(bp.name)}.md`;
  if (bpModal === "preview") return `<div class="bpmodal"><div class="bpmbox"><div class="osacts"><b>Aperçu — ${file}</b><span></span><button data-bp="copy">📋 Copier</button><button data-bp="closemodal">×</button></div><pre class="md">${esc(compileBp())}</pre>
    ${bp.kind === "hook" ? `<h4>ENTRÉE AJOUTÉE À .claude/settings.json</h4><pre class="md">${esc(hookEntryPreview())}</pre>` : ""}</div></div>`;
  if (bpModal === "test") return `<div class="bpmodal"><div class="bpmbox"><div class="osacts"><b>🧪 Tester « ${esc(bp.name)} » sans l'installer</b><span></span><button data-bp="closemodal">×</button></div>
    <p class="muted">Un claude s'ouvre dans le dossier choisi, lit le brouillon et le suit une fois${bp.kind === "hook" ? " (le script est lancé avec un exemple d'événement)" : ""} ; il te dit ensuite ce qui était flou ou manquant. Rien n'est écrit dans .claude.</p>
    <label class="bptarget"><b>Exemple</b><input class="bpexample" placeholder="${bp.kind === "hook" ? "git push origin main" : "ex. relis la MR !1564"}" spellcheck="false"></label>
    <h4>DANS QUEL DOSSIER ?</h4>${bpTargets ? bpTargets.map((t, i) => `<label class="bptarget"><input type="radio" name="bptarget" value="${esc(t.path)}"${i === (bpTargets.length > 1 ? 1 : 0) ? " checked" : ""}> <b>${t.kind === "global" ? "🌍" : "📁"} ${esc(t.label)}</b></label>`).join("") : `<p class="muted">Recherche de tes projets…</p>`}
    <div class="osacts"><button data-bp="dotest" class="ubok">🧪 Lancer le test</button><span class="muted">${esc(bpMsg)}</span></div></div></div>`;
  if (bpModal === "open") return `<div class="bpmodal"><div class="bpmbox"><div class="osacts"><b>Blueprints enregistrés</b><span></span><button data-bp="closemodal">×</button></div>
    ${bpBook.list.length ? bpBook.list.map(x => `<div class="osrow"><b>${x.kind === "skill" ? "🧠" : "🤖"} ${esc(x.name)}</b><span class="muted">${esc(clip(x.description || "", 80))} · ${x.nodes.length} blocs</span><span class="osacts"><button data-bp-load="${x.id}">Ouvrir</button><button data-bp-drop="${x.id}">🗑</button></span></div>`).join("") : `<p class="muted">Aucun pour l'instant : 💾 Enregistrer garde le blueprint en cours.</p>`}
    <h4>NOUVEAU</h4><div class="osacts">${[["skill", "blank", "🧠 Skill vide"], ["agent", "blank", "🤖 Agent vide"], ["hook", "blank", "🪝 Hook vide"], ["hook", "nopush", "🪝 Modèle : pas de push sur main"], [bp.kind, "review", "🔍 Modèle : revue de MR"], [bp.kind, "ticket", "🎫 Modèle : livrer un ticket"]].map(([k, t, l]) => `<button data-bp-new="${k}:${t}">${l}</button>`).join("")}</div></div></div>`;
  // publish
  const issues = lintBp(), list = bpTargets || [];
  return `<div class="bpmodal"><div class="bpmbox"><div class="osacts"><b>🚀 Publier ${bp.kind === "skill" ? "le skill" : "l'agent"} « ${esc(bp.name)} »</b><span></span><button data-bp="closemodal">×</button></div>
    ${issues.length ? `<div class="bpissues">${issues.map(i => `<div>⚠️ ${esc(i)}</div>`).join("")}</div>` : `<p class="glok">✓ Blueprint complet.</p>`}
    <h4>OÙ ?</h4>${bpTargets ? list.map((t, i) => `<label class="bptarget"><input type="radio" name="bptarget" value="${esc(t.path)}"${i === 0 ? " checked" : ""}> <b>${t.kind === "global" ? "🌍" : "📁"} ${esc(t.label)}</b><small class="muted">${t.kind === "global" ? "" : `${t.git ? "dépôt git" : "dossier"}${t.claude ? " · a déjà un .claude" : ""}`}</small></label>`).join("")
      + `<label class="bptarget"><input type="radio" name="bptarget" value="__custom"> <b>✏️ Autre dossier</b><input class="bpcustom" placeholder="~/repos/mon-projet" spellcheck="false"></label>` : `<p class="muted">Recherche de tes projets…</p>`}
    <p class="muted">Fichier créé : <code>&lt;dossier&gt;/.claude/${file}</code>${bp.kind === "hook" ? " + son entrée dans <code>.claude/settings.json</code> (une copie de sauvegarde est gardée)" : ""}</p>
    <h4>COMMENT ?</h4>
    <label class="bptarget"><input type="radio" name="bpmode" value="claude" checked> <b>✨ Laisser Claude l'écrire</b><small class="muted">un claude s'ouvre dans ce dossier, lit le blueprint et écrit le fichier au bon format (tu valides comme d'habitude)</small></label>
    <label class="bptarget"><input type="radio" name="bpmode" value="write"> <b>✍️ Écrire le brouillon directement</b><small class="muted">le Markdown de l'aperçu, tel quel</small></label>
    <div class="osacts"><button data-bp="dopublish" class="ubok">🚀 Publier</button><span class="muted">${esc(bpMsg)}</span></div></div></div>`;
}
function blueprintAppHtml() {
  return `<div class="bpapp">
    <div class="bptop"><span class="bpkind"><button data-bp-kind="skill" class="${bp.kind === "skill" ? "on" : ""}">🧠 Skill</button><button data-bp-kind="agent" class="${bp.kind === "agent" ? "on" : ""}">🤖 Agent</button><button data-bp-kind="hook" class="${bp.kind === "hook" ? "on" : ""}">🪝 Hook</button></span>
      <input class="bpname" data-bp-meta="name" value="${esc(bp.name)}" spellcheck="false" aria-label="Nom">
      <span class="bpspacer"></span><button data-bp="open">📂 Ouvrir / Nouveau</button><button data-bp="save">💾 Enregistrer</button><button data-bp="preview">👁 Aperçu</button><button data-bp="test">🧪 Tester</button><button data-bp="publish" class="ubok">🚀 Publier</button></div>
    <div class="bpbody"><nav class="bppal">${BP_CATS.filter(c => c[0] !== "start").map(([id, ic, label, col]) => `<div class="bpcat" style="--c:${col}"><small>${ic} ${label}</small>${Object.entries(BLOCKS).filter(([t, b]) => b.cat === id && (bp.kind === "hook" ? b.hook || t === "stop" : !b.hook)).map(([t, b]) => `<button data-bp-add="${t}" draggable="true" title="Cliquer ou glisser sur le canevas">${b.icon} ${esc(b.label)}</button>`).join("")}</div>`).join("")}</nav>
      <div class="bpcanvas"><div class="bpworld"><svg class="bpwires"></svg><div class="bpnodes"></div></div>
        <div class="bpzoom"><button data-bp="zin">＋</button><button data-bp="zout">－</button><button data-bp="fit" title="Recentrer">⤢</button></div><div class="bpmsg">${esc(bpMsg)}</div></div>
      <aside class="bpinsp">${inspectorHtml()}</aside></div>${modalHtml()}</div>`;
}
function refreshBp(full) {
  const app = osBox.querySelector(".bpapp"); if (!app) return;
  if (full) { app.outerHTML = blueprintAppHtml(); mountBlueprint(); return; }
  renderCanvas(); app.querySelector(".bpinsp").innerHTML = inspectorHtml();
}

/* ---------- interactions: drag nodes, pan, zoom, wire ports, edit ---------- */
function mountBlueprint() {
  const c = osBox.querySelector(".bpcanvas"); if (!c) return;
  renderCanvas();
  const toWorld = ev => { const r = c.getBoundingClientRect(); return { x: (ev.clientX - r.left - bpView.x) / bpView.z, y: (ev.clientY - r.top - bpView.y) / bpView.z }; };
  let drag = null;
  c.addEventListener("pointerdown", ev => {
    const out = ev.target.closest("[data-out]"), head = ev.target.closest("[data-drag]"), node = ev.target.closest("[data-node]"), wire = ev.target.closest("[data-link]");
    if (ev.button !== 0 && ev.button !== 1) return;
    if (out) { drag = { kind: "wire", from: out.dataset.out, port: out.dataset.port }; }
    else if (head) { const n = nodeById(head.dataset.drag), p = toWorld(ev); drag = { kind: "node", n, dx: p.x - n.x, dy: p.y - n.y }; bpSel = n.id; osBox.querySelector(".bpinsp").innerHTML = inspectorHtml(); }
    else if (node) { bpSel = node.dataset.node; renderCanvas(); osBox.querySelector(".bpinsp").innerHTML = inspectorHtml(); return; }
    else if (wire) { bpSel = `link:${wire.dataset.link}`; drawLinks(); wire.classList.add("sel"); return; }
    else { drag = { kind: "pan", sx: ev.clientX - bpView.x, sy: ev.clientY - bpView.y }; if (bpSel) { bpSel = null; renderCanvas(); osBox.querySelector(".bpinsp").innerHTML = inspectorHtml(); } }
    c.setPointerCapture(ev.pointerId); ev.preventDefault();
  });
  c.addEventListener("pointermove", ev => {
    if (!drag) return;
    if (drag.kind === "pan") { bpView.x = ev.clientX - drag.sx; bpView.y = ev.clientY - drag.sy; c.querySelector(".bpworld").style.transform = `translate(${bpView.x}px, ${bpView.y}px) scale(${bpView.z})`; }
    else if (drag.kind === "node") { const p = toWorld(ev); drag.n.x = Math.round((p.x - drag.dx) / 10) * 10; drag.n.y = Math.round((p.y - drag.dy) / 10) * 10; const el = c.querySelector(`[data-node="${drag.n.id}"]`); el.style.left = `${drag.n.x}px`; el.style.top = `${drag.n.y}px`; drawLinks(); }
    else if (drag.kind === "wire") { const a = nodeById(drag.from); drawLinks({ a: portPos(a, "out", drag.port), b: toWorld(ev) }); }
  });
  c.addEventListener("pointerup", ev => {
    if (drag?.kind === "wire") {
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-node]"), to = hit?.dataset.node;
      if (to && to !== drag.from && !BLOCKS[nodeById(to).type].noIn) { bp.links = bp.links.filter(l => !(l.from === drag.from && l.port === drag.port)); bp.links.push({ from: drag.from, port: drag.port, to }); persistBp(); }
      drawLinks();
    } else if (drag?.kind === "node") persistBp();
    drag = null;
  });
  c.addEventListener("wheel", ev => { ev.preventDefault(); zoomBp(ev.deltaY < 0 ? 1.1 : 1 / 1.1, ev); }, { passive: false });
  c.addEventListener("dragover", ev => ev.preventDefault());
  c.addEventListener("drop", ev => { const t = ev.dataTransfer.getData("text/bp-block"); if (t) { ev.preventDefault(); const p = toWorld(ev); addNode(t, p.x - 100, p.y - 20); } });
}
function zoomBp(k, ev) {
  const c = osBox.querySelector(".bpcanvas"), r = c.getBoundingClientRect(), cx = ev ? ev.clientX - r.left : r.width / 2, cy = ev ? ev.clientY - r.top : r.height / 2;
  const z = Math.max(0.4, Math.min(1.8, bpView.z * k)); bpView.x = cx - (cx - bpView.x) * z / bpView.z; bpView.y = cy - (cy - bpView.y) * z / bpView.z; bpView.z = z; renderCanvas();
}
// zoom and pan so the whole graph fits the canvas
function fitBp() {
  const c = osBox.querySelector(".bpcanvas"); if (!c || !bp.nodes.length) return;
  const xs = bp.nodes.map(n => n.x), ys = bp.nodes.map(n => n.y), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) + NODE_W - x0, h = Math.max(...ys) + 120 - y0;
  const z = Math.max(0.4, Math.min(1, (c.clientWidth - 60) / w, (c.clientHeight - 60) / h));
  bpView = { z, x: (c.clientWidth - w * z) / 2 - x0 * z, y: (c.clientHeight - h * z) / 2 - y0 * z }; renderCanvas();
}
function addNode(type, x, y) {
  if (BLOCKS[type].unique && bp.nodes.some(n => n.type === type)) return;
  const c = osBox.querySelector(".bpcanvas"), r = c.getBoundingClientRect();
  const n = { id: nid(), type, x: Math.round((x ?? (r.width / 2 - bpView.x) / bpView.z - 110) / 10) * 10, y: Math.round((y ?? (r.height / 2 - bpView.y) / bpView.z - 40) / 10) * 10, props: type === "input" ? { required: "oui" } : type === "check" ? { onfail: "corriger et recommencer" } : type === "git" ? { action: "commiter" } : {} };
  // added after the selected block: wired to its first free output, Unreal style
  const sel = bpSel && nodeById(bpSel);
  if (sel && x === undefined) { const free = BLOCKS[sel.type].outs.find(p => !bp.links.some(l => l.from === sel.id && l.port === p)); if (free && !BLOCKS[type].noIn) { n.x = sel.x + 280; n.y = sel.y + (free === "else" || free === "b" ? 140 : 0); bp.links.push({ from: sel.id, port: free, to: n.id }); } }
  bp.nodes.push(n); bpSel = n.id; persistBp(); refreshBp();
}
function deleteSel() {
  if (!bpSel) return;
  if (bpSel.startsWith("link:")) bp.links.splice(+bpSel.slice(5), 1);
  else { const n = nodeById(bpSel); if (!n || BLOCKS[n.type].unique) return; bp.nodes = bp.nodes.filter(x => x !== n); bp.links = bp.links.filter(l => l.from !== n.id && l.to !== n.id); }
  bpSel = null; persistBp(); refreshBp();
}
osBox.addEventListener("dragstart", ev => { const b = ev.target.closest("[data-bp-add]"); if (b) ev.dataTransfer.setData("text/bp-block", b.dataset.bpAdd); });
osBox.addEventListener("input", ev => {
  if (!ev.target.closest(".bpapp")) return;
  const t = ev.target;
  if (t.dataset.bpMeta) { bp[t.dataset.bpMeta] = t.dataset.bpMeta === "name" ? t.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "").slice(0, 64) : t.value; if (t.dataset.bpMeta === "name" && t.value !== bp.name) { const pos = t.selectionStart; t.value = bp.name; t.setSelectionRange(pos, pos); } persistBp(); }
  if (t.dataset.bpProp) { const n = nodeById(bpSel); if (n) { n.props[t.dataset.bpProp] = t.value; persistBp(); const s = osBox.querySelector(`[data-node="${n.id}"] .bpsum`); if (s) s.textContent = clip(BLOCKS[n.type].sum(n.props), 70); } }
});
osBox.addEventListener("change", ev => {
  if (!ev.target.closest(".bpapp")) return;
  const t = ev.target;
  if (t.dataset.bpSet) { bp.settings[t.dataset.bpSet] = t.value; persistBp(); }
  if (t.dataset.bpHook) { bp.settings.hook = { ...(bp.settings.hook || {}), [t.dataset.bpHook]: t.value.trim() }; persistBp(); renderCanvas(); if (t.dataset.bpHook === "event") osBox.querySelector(".bpinsp").innerHTML = inspectorHtml(); }
  if (t.dataset.bpTool) { const set = new Set(bp.settings.tools); t.checked ? set.add(t.dataset.bpTool) : set.delete(t.dataset.bpTool); bp.settings.tools = AGENT_TOOLS.filter(x => set.has(x)); persistBp(); }
  if (t.dataset.bpProp && t.tagName === "SELECT") { const n = nodeById(bpSel); if (n) { n.props[t.dataset.bpProp] = t.value; persistBp(); renderCanvas(); } }
});
osBox.addEventListener("keydown", ev => {
  if (!osBox.querySelector(".bpapp") || ev.target.closest("input, textarea, select")) return;
  if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); deleteSel(); }
});
osBox.addEventListener("click", async ev => {
  if (!ev.target.closest(".bpapp")) return;
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.bpAdd) return addNode(b.dataset.bpAdd);
  if (b.dataset.bpKind) { bp.kind = b.dataset.bpKind; persistBp(); return refreshBp(true); }
  if (b.dataset.bpLoad) { bp = structuredClone(bpBook.list.find(x => x.id === b.dataset.bpLoad)); bpSel = null; bpModal = null; persistBp(); refreshBp(true); return fitBp(); }
  if (b.dataset.bpDrop) { bpBook.list = bpBook.list.filter(x => x.id !== b.dataset.bpDrop); saveBp(); return refreshBp(true); }
  if (b.dataset.bpNew) { const [k, t] = b.dataset.bpNew.split(":"); bp = newBp(k, t); bpSel = null; bpModal = null; persistBp(); refreshBp(true); return fitBp(); }
  const a = b.dataset.bp;
  if (a === "dup") { const n = nodeById(bpSel); if (!n) return; const m = { ...structuredClone(n), id: nid(), x: n.x + 30, y: n.y + 60 }; bp.nodes.push(m); bpSel = m.id; persistBp(); return refreshBp(); }
  if (a === "del") return deleteSel();
  if (a === "zin") return zoomBp(1.15); if (a === "zout") return zoomBp(1 / 1.15);
  if (a === "fit") return fitBp();
  if (a === "save") { const i = bpBook.list.findIndex(x => x.id === bp.id); if (i >= 0) bpBook.list[i] = structuredClone(bp); else bpBook.list.unshift(structuredClone(bp)); persistBp(); bpMsg = `💾 « ${bp.name} » enregistré`; refreshBp(true); setTimeout(() => { bpMsg = ""; }, 3000); return; }
  if (a === "open" || a === "preview") { bpModal = a; return refreshBp(true); }
  if (a === "closemodal") { bpModal = null; bpMsg = ""; return refreshBp(true); }
  if (a === "copy") { try { await navigator.clipboard.writeText(compileBp()); toast("BLUEPRINT", "Copié ✓", "Markdown dans le presse-papiers."); } catch (_) { toast("BLUEPRINT", "Copie impossible", ""); } return; }
  if (a === "publish" || a === "test") {
    bpModal = a; bpMsg = ""; refreshBp(true);
    if (!bpTargets) { try { bpTargets = DEMO ? [{ path: "~", label: "Global — ~/.claude (tous tes projets)", kind: "global" }, { path: "~/repos/demo", label: "~/repos/demo", kind: "repo", git: true, claude: true }] : await (await fetch("/api/blueprint/targets")).json(); } catch (_) { bpTargets = []; } refreshBp(true); }
    return;
  }
  if (a === "dotest") {
    const target = osBox.querySelector('input[name="bptarget"]:checked')?.value, example = osBox.querySelector(".bpexample")?.value || "";
    if (DEMO) { bpMsg = "Démo : rien n'est lancé."; return refreshBp(true); }
    try {
      const res = await fetch("/api/blueprint/publish", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
        body: JSON.stringify({ kind: bp.kind, name: bp.name, target, mode: "test", example, content: compileBp() }) });
      const out = await res.json(); bpMsg = out.ok ? `✓ ${out.output}` : `✗ ${out.error || out.output}`;
    } catch (err) { bpMsg = `✗ ${err.message}`; }
    return refreshBp(true);
  }
  if (a === "dopublish") {
    const pick = osBox.querySelector('input[name="bptarget"]:checked')?.value, mode = osBox.querySelector('input[name="bpmode"]:checked')?.value || "claude";
    const target = pick === "__custom" ? osBox.querySelector(".bpcustom").value.trim() : pick;
    if (!target) { bpMsg = "Choisis un dossier."; return refreshBp(true); }
    if (DEMO) { bpMsg = "Démo : rien n'est publié."; return refreshBp(true); }
    const send = async overwrite => (await fetch("/api/blueprint/publish", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
      body: JSON.stringify({ kind: bp.kind, name: bp.name, target, mode, overwrite, content: compileBp(), blueprint: bp, hook: bp.settings.hook }) }));
    try {
      const again = performance.now() < bpOverwriteArmed;  // second click within 6 s: overwrite
      bpOverwriteArmed = 0;
      const res = await send(again), out = await res.json();
      if (res.status === 409 && out.exists) { bpOverwriteArmed = performance.now() + 6000; bpMsg = `⚠️ ${out.error} — reclique sur Publier dans les 6 s pour l'écraser.`; return refreshBp(true); }
      bpMsg = out.ok ? `✓ ${out.output}` : `✗ ${out.error || out.output}`;
      if (out.ok) toast("BLUEPRINT", mode === "claude" ? "Claude écrit ton " + ({ skill: "skill", agent: "agent", hook: "hook" }[bp.kind]) : "Publié ✓", out.path || out.output);
    } catch (err) { bpMsg = `✗ ${err.message}`; }
    return refreshBp(true);
  }
});
let bpOverwriteArmed = 0;  // a second click on Publier confirms overwriting an existing file (no browser dialog)
