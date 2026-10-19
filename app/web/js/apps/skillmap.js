// ChiefOS → 🗺️ Compétences: who knows what, from the real work of the last 30 days (office/knowhow.py). One dev = one
// kind of agent (ChiefOS → Équipe), so a dev's knowledge is its agent type's: the matrix dev × topic (projects, code
// zones, technologies, tools) credits every mission to the dev of its type, even when another dev came as a
// reinforcement (that one only borrowed the notes; the reinforcements are shown apart). A cell = missions on the
// topic, scored by how they went (delivered, tests, MR / blocked, errors, red CI, loops), plus the validated lessons.
// A click on a cell shows the evidence; on a topic, the dev to send. The chief also prefers the dev who knows the
// mission's topic for a reinforcement (skills.js bestDevFor), and a dev's card shows its 🥇🥈🥉 topics.

import { hub, provide } from "../hub.js";
import { TEAM, clip, data, devOfType, roleOf, specialty, typeColor } from "../core/core.js";
import { STATUS_FR, esc, ticketLink } from "../core/data.js";
import { SaveSlot } from "../save/slot.js";
import { crew } from "../sims/crew.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";

const CATS = { proj: "Projets", zone: "Zones de code", tech: "Technos", tool: "Outils" };
const MEDAL = ["🥇", "🥈", "🥉"];
const idSlot = new SaveSlot("office-knowhow-ids", { ids: {}, since: 0 });  // mission id → the dev who did it, beyond the crew's last 60 (reinforcements)
// reinforcements only exist since one dev = one agent type: before, the chief sent anyone
if (!idSlot.data.since) { idSlot.data.since = Date.now() / 1000; idSlot.save(); }
// the topics the chief excluded (a side project, noise): out of the matrix, the dev cards and the chief's pick
const hideSlot = new SaveSlot("office-knowhow-hidden", { topics: [] });
let km = null, loading = false, sel = null, topicSel = null, showHidden = false;
// excluding a project also excludes its code zones ("proj:CookMate" → "zone:CookMate/…")
function isHidden(key) {
  const h = hideSlot.data.topics; if (h.includes(key)) return true;
  const [cat, label] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  return cat === "zone" && h.includes(`proj:${label.split("/")[0]}`);
}
const topics = () => (km?.topics || []).filter(t => !isHidden(t.key));
function setHidden(key, on) {
  const h = hideSlot.data.topics.filter(k => k !== key); if (on) h.push(key);
  hideSlot.data.topics = h; hideSlot.save();
  if (on && topicSel && isHidden(topicSel)) topicSel = null;
  if (on && sel && isHidden(sel.topic)) sel = null;
}

function rememberIds() {
  const ids = idSlot.data.ids; let changed = false;
  for (const [id, who] of Object.entries(crew.ids || {})) if (ids[id] !== who) { ids[id] = who; changed = true; }
  const all = Object.keys(ids); if (all.length > 800) { for (const id of all.slice(0, all.length - 800)) delete ids[id]; changed = true; }
  if (changed) idSlot.save();
}

function demoKm() {
  const t = Date.now() / 1000, run = (id, type, topics, score, status, d) => ({ id, type, topics, score, status, why: score > 2 ? ["livré", "tests verts", "MR"] : ["bloqué"], description: d, ticket: "DEMO-1", mr: null, last: t - 3600 });
  const runs = [run("s|1", "feature-builder", { "proj:cogito": 1, "tech:React": 0.8, "tool:GitLab": 1 }, 4, "done", "Tri du tableau kanban"),
    run("s|2", "feature-builder", { "proj:portfolio-api": 1, "tech:Python": 1, "tool:Pytest": 1 }, 3, "done", "Endpoint de cotation"),
    run("s|3", "mr-reviewer", { "proj:cogito": 1, "tool:GitLab": 1 }, 2, "done", "Revue MR !42"),
    run("s|4", "guardian-test-writer", { "proj:cogito": 1, "tool:Playwright": 1, "tech:Tests": 1 }, -1, "blocked", "Tests e2e du tableau")];
  return { days: 30, runs, types: ["feature-builder", "mr-reviewer", "guardian-test-writer"], best: { "proj:cogito": "feature-builder", "tool:GitLab": "feature-builder" },
    topics: ["proj:cogito", "proj:portfolio-api", "tech:React", "tech:Python", "tech:Tests", "tool:GitLab", "tool:Pytest", "tool:Playwright"].map(k => ({ key: k, cat: k.split(":")[0], label: k.split(":")[1], weight: 1 })),
    cells: runs.flatMap(r => Object.entries(r.topics).map(([tp, w]) => ({ type: r.type, topic: tp, score: r.score * w + w, runs: 1, done: r.status === "done" ? 1 : 0, bad: r.score < 0 ? 1 : 0, lessons: 0 }))) };
}

async function load(force = false) {
  if (loading) return; loading = true;
  try { km = DEMO ? demoKm() : await (await fetch(`/api/knowhow${force ? "?force=1" : ""}`, { headers: { "X-Office-Token": TOKEN } })).json(); }
  catch (_) { km = { error: true }; }
  loading = false;
  if (DEMO && km.runs) { const ids = { "s|1": TEAM[0], "s|2": TEAM[0], "s|3": TEAM[1], "s|4": TEAM[2] }; Object.assign(idSlot.data.ids, ids); }
  renderChiefOs();
}

// the devs' cells: their agent type's (a type without a desk counts for the general-purpose dev)
function devCells() {
  const out = new Map();
  for (const c of km?.cells || []) {
    const who = devOfType(c.type); if (!who || isHidden(c.topic)) continue;
    const k = `${who}\n${c.topic}`, d = out.get(k) || { score: 0, runs: 0, done: 0, bad: 0, lessons: 0 };
    for (const f of ["score", "runs", "done", "bad", "lessons"]) d[f] += c[f] || 0;
    out.set(k, d);
  }
  return out;
}
// the missions a dev did for another one's agent type
function helps(name) {
  rememberIds();
  const ids = idSlot.data.ids;
  return (km?.runs || []).filter(r => ids[r.id] === name && devOfType(r.type) !== name && (r.last || 0) >= idSlot.data.since);
}
// the ranking of the devs on one topic
function devRank(topic, cells = devCells()) {
  return TEAM.map(n => [n, cells.get(`${n}\n${topic}`)?.score || 0]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
}

// topics as rows (readable labels, grouped by kind, the most worked first), devs as columns: no sideways scroll
function matrixHtml(cols, cells) {
  const max = Math.max(1, ...[...cells.values()].map(c => c.score));
  const total = t => cols.reduce((sum, n) => sum + Math.max(0, cells.get(`${n}\n${t.key}`)?.score || 0), 0);
  const groups = Object.keys(CATS).map(cat => [cat, topics().filter(t => t.cat === cat).sort((x, y) => total(y) - total(x))]).filter(([, l]) => l.length);
  const head = `<tr><th class="kmcorner"></th>${cols.map(n => `<th class="kmdev${sel?.row === n ? " on" : ""}" style="--kc:${typeColor(roleOf(n))}"><b>${esc(n)}</b><small>${esc(specialty(roleOf(n)))}</small></th>`).join("")}</tr>`;
  const row = t => {
    const best = devRank(t.key, cells)[0]?.[0];
    return `<tr class="${topicSel === t.key ? "on" : ""}"><th class="kmtopic-c"><button class="kmtopic" data-km-topic="${esc(t.key)}" title="${esc(t.label)} : qui envoyer ?">${esc(t.label)}</button><button class="kmhide" data-km-hide="${esc(t.key)}" title="Exclure ${esc(t.label)} de la carte${t.cat === "proj" ? " (et ses zones de code)" : ""}">✕</button></th>${cols.map(n => {
      const c = cells.get(`${n}\n${t.key}`);
      if (!c) return `<td class="kmempty">·</td>`;
      const k = Math.max(0, c.score) / max, lvl = k >= 0.6 ? "hi" : k >= 0.25 ? "mid" : "lo", on = sel && sel.row === n && sel.topic === t.key;
      return `<td><button class="kmcell ${lvl}${on ? " on" : ""}${best === n ? " best" : ""}" data-km-cell="${esc(n)}\n${esc(t.key)}" style="--k:${(0.18 + 0.82 * k).toFixed(2)}" title="${esc(n)} × ${esc(t.label)} : ${c.runs} mission(s), ${c.done} livrée(s)${c.bad ? `, ${c.bad} difficile(s)` : ""}${c.lessons ? `, ${c.lessons} leçon(s)` : ""}">${best === n ? "🥇 " : ""}${Math.round(c.score)}</button></td>`;
    }).join("")}</tr>`;
  };
  return `<div class="kmwrap"><table class="kmtable"><thead>${head}</thead>
    ${groups.map(([cat, l]) => `<tbody><tr class="kmcatrow"><th colspan="${cols.length + 1}">${CATS[cat]} <small>${l.length}</small></th></tr>${l.map(row).join("")}</tbody>`).join("")}</table></div>
    <p class="kmlegend muted"><span class="kmcell lo">faible</span><span class="kmcell mid">moyen</span><span class="kmcell hi">fort</span><span class="kmcell mid best">🥇</span> le plus calé du sujet · <span class="kmempty">·</span> jamais travaillé</p>`;
}

function evidenceHtml() {
  if (!sel) return "";
  const ids = idSlot.data.ids, topic = km.topics.find(t => t.key === sel.topic);
  const runs = km.runs.filter(r => r.topics[sel.topic] && devOfType(r.type) === sel.row).sort((a, b) => (b.last || 0) - (a.last || 0));
  const c = devCells().get(`${sel.row}\n${sel.topic}`) || {};
  return `<h4>${esc(sel.row)} (${esc(specialty(roleOf(sel.row)))}) × ${esc(topic?.label || sel.topic)}</h4>
    <p class="muted">Score ${Math.round(c.score || 0)} : ${c.runs || 0} mission(s), ${c.done || 0} livrée(s), ${c.bad || 0} difficile(s)${c.lessons ? `, ${c.lessons} leçon(s) validée(s) sur ce projet` : ""}.</p>
    ${runs.slice(0, 12).map(r => { const by = ids[r.id], helper = by && by !== sel.row && TEAM.includes(by) && (r.last || 0) >= idSlot.data.since;
      return `<div class="osrow"><b>${r.score >= 2 ? "✅" : r.score < 0 ? "⚠️" : "•"} ${esc(specialty(r.type))}${helper ? ` <small class="muted">📒 faite par ${esc(by)} avec ses notes</small>` : ""}</b><span>${r.ticket ? `${ticketLink(r.ticket)} ` : ""}${esc(clip(r.description, 110))}</span><span class="muted">${esc(STATUS_FR[r.status] || r.status)} · ${esc(r.why.join(", ") || "rien de notable")}${r.mr ? ` · <a href="${esc(r.mr)}" target="_blank" rel="noopener">MR</a>` : ""}</span></div>`; }).join("") || `<p class="muted">Aucune mission listée (le score vient des leçons validées).</p>`}`;
}

function topicHtml() {
  if (!topicSel) return "";
  const t = km.topics.find(x => x.key === topicSel); if (!t) return "";
  const devs = devRank(topicSel).slice(0, 3);
  return `<div class="osrow idrow kmadvice"><b>🎯 ${esc(t.label)} <small class="muted">${CATS[t.cat]}</small></b>
    <span>Le plus calé : ${devs.map(([n, s], i) => `${MEDAL[i]} <b>${esc(n)}</b> <small class="muted">${esc(specialty(roleOf(n)))}</small> (${Math.round(s)})`).join(" · ") || "personne n'y a encore travaillé"}</span></div>`;
}

function skillmapHtml() {
  if (!km) { load(); return `<p class="muted">Lecture des missions des 30 derniers jours…</p>`; }
  if (km.error) return `<p class="muted">Serveur injoignable (ou ancienne version : redémarre Agent Office).</p>`;
  if (!km.topics.length) return `<p class="muted">Pas encore assez de missions d'agents sur 30 jours pour dresser la carte.</p>`;
  const cells = devCells(), rows = TEAM.filter(n => topics().some(t => cells.has(`${n}\n${t.key}`)));
  const hidden = hideSlot.data.topics.map(k => km.topics.find(t => t.key === k) || { key: k, label: k.slice(k.indexOf(":") + 1), cat: k.split(":")[0] });
  const helpers = TEAM.map(n => [n, helps(n).length]).filter(([, k]) => k);
  return `<div class="kmapp">
    <p class="muted">${km.runs.length} missions d'agents sur ${km.days} jours. Un dev = un type d'agent : il est crédité de toutes les missions de son type. Une case = des missions sur ce sujet, notées selon leur issue (livré, tests verts, MR / bloqué, erreurs, CI rouge, boucle), plus les leçons validées. Clic sur une case : les preuves ; sur un sujet : qui envoyer ; ✕ : l'exclure de la carte.</p>
    ${rows.length ? matrixHtml(rows, cells) : `<p class="muted">Aucun dev n'a encore de mission de son type sur 30 jours.</p>`}
    ${topicHtml()}${evidenceHtml()}
    ${helpers.length ? `<h4>RENFORTS</h4><p class="muted">Missions faites pour un collègue occupé, avec ses notes (elles comptent pour lui) : ${helpers.map(([n, k]) => `<b>${esc(n)}</b> ×${k}`).join(" · ")}.</p>` : ""}
    ${hidden.length ? `<div class="kmhidden"><button class="lslink" data-km-hidden>${showHidden ? "▾" : "▸"} Exclus (${hidden.length})</button>${showHidden ? `<div>${hidden.map(t => `<button class="kmshow" data-km-show="${esc(t.key)}" title="Remettre sur la carte">${esc(t.label)} <small class="muted">${CATS[t.cat] || ""}</small> ↺</button>`).join("")}</div>` : ""}</div>` : ""}
    <div class="osacts"><button data-km-reload>↻ Recalculer</button></div></div>`;
}

class SkillMapApp extends OsApp {
  constructor() { super("skillmap", "🗺️", "Compétences", "#19b6ee"); }
  render() { return skillmapHtml(); }
  open() { if (km && !loading) load(); }
  click(b) {
    const d = b.dataset;
    if (d.kmCell) { const [row, topic] = d.kmCell.split("\n"); sel = sel?.row === row && sel?.topic === topic ? null : { row, topic }; }
    else if (d.kmHide) setHidden(d.kmHide, true);
    else if (d.kmShow) setHidden(d.kmShow, false);
    else if (d.kmHidden !== undefined) showHidden = !showHidden;
    else if (d.kmTopic) topicSel = topicSel === d.kmTopic ? null : d.kmTopic;
    else if (d.kmReload !== undefined) { load(true); return true; }
    else return false;
    renderChiefOs();
    return true;
  }
}
new SkillMapApp();

// the mission's topics, guessed before it has done anything: its session's project and the topics named in its mission
function missionTopics(a) {
  if (!km?.topics) return [];
  const s = data.sessions.find(x => a.id.startsWith(`${x.id}|`) || x.agents?.some(y => y.id === a.id));
  const proj = (s?.cwd || "").split("/").filter(Boolean).pop()?.toLowerCase() || "", text = `${a.description || ""} ${a.ticket || ""}`.toLowerCase();
  return topics().filter(t => (t.cat === "proj" && t.label.toLowerCase() === proj) || (t.label.length >= 4 && text.includes(t.label.toLowerCase().split("/").pop()))).map(t => t.key);
}
// for the chief's pick (skills.js): a bonus for the dev who already knows the mission's topics
function knowhowFor(name, a) {
  const topics = missionTopics(a); if (!topics.length) return 0;
  const cells = devCells();
  return Math.min(30, topics.reduce((sum, t) => sum + Math.max(0, cells.get(`${name}\n${t}`)?.score || 0), 0) * 2);
}
// a dev's best topics with its rank among the devs, for its card
function knowhowLine(name) {
  if (!km?.topics) return "";
  const cells = devCells(), mine = topics().map(t => [t, devRank(t.key, cells).findIndex(([n]) => n === name)]).filter(([, i]) => i >= 0 && i < 3).sort((x, y) => x[1] - y[1]).slice(0, 4);
  return mine.length ? `<p class="muted">Sujets : ${mine.map(([t, i]) => `${MEDAL[i]} ${esc(t.label)}`).join(" · ")}</p>` : "";
}

if (!DEMO) { setTimeout(load, 30000); setInterval(load, 15 * 60 * 1000); }
setInterval(rememberIds, 15000);
provide({ get knowhowFor() { return knowhowFor; }, get knowhowLine() { return knowhowLine; } });
