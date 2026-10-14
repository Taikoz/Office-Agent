"use strict";
// Stats HUD per specialty.

/* ---------- performance ---------- */
const perfBox = document.getElementById("perf"), perfDays = document.getElementById("perf-days");
let perfTimer = null;
const dur = s => s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;

function renderSessionPerf() {
  const s = curSession(), ag = s?.agents || [];
  const sum = f => ag.reduce((n, a) => n + (a[f] || 0), 0);
  const first = ag.map(a => Date.parse(a.started)).filter(Boolean).sort()[0];
  const cells = [["devs", ag.length], ["livrés", ag.filter(a => a.status === "done").length], ["bloqués", ag.filter(a => a.status === "blocked").length],
    ["questions", ag.filter(a => a.status === "asking").length + (s?.chief.question ? 1 : 0)], ["tokens", k(sum("tokens") + (s?.chief.tokens || 0))],
    ["outils", sum("tools")], ["erreurs", sum("errors")], ["durée", first ? dur((Date.now() - first) / 1000) : "—"]];
  document.getElementById("perf-session").innerHTML = `<div style="grid-column:1/-1;border:0;padding:0" class="muted">CETTE SESSION</div>` +
    cells.map(([l, v]) => `<div><small>${l}</small>${esc(v)}</div>`).join("");
}

async function loadPerf() {
  let p;
  try { p = DEMO ? demoPerf() : await (await fetch(`/api/perf?days=${perfDays.value}`, { cache: "no-store" })).json(); }
  catch (err) { document.getElementById("perf-rows").innerHTML = `<tr><td colspan="8" class="muted">serveur injoignable</td></tr>`; return; }
  renderStats(p);
  const maxAvg = Math.max(1, ...p.types.map(t => t.seconds / t.runs));
  document.getElementById("perf-rows").innerHTML = p.types.map(t => {
    const avg = t.seconds / t.runs, closed = t.done + t.gone;
    return `<tr><td><span class="tag" style="background:${typeColor(t.type)}" title="${esc(t.type)}">${esc(specialty(t.type))}</span></td><td>${t.runs}</td>
      <td>${t.done}${closed ? ` <span class="muted">(${Math.round(100 * t.done / closed)} %)</span>` : ""}</td><td>${t.gone}</td>
      <td><span class="mini" style="width:${Math.round(60 * avg / maxAvg)}px"></span>${dur(avg)}</td>
      <td>${k(Math.round(t.tokens / t.runs))}</td><td>${Math.round(t.tools / t.runs)}</td><td>${(t.errors / t.runs).toFixed(1)}</td></tr>`;
  }).join("") || `<tr><td colspan="8" class="muted">Aucun sous-agent sur la période.</td></tr>`;
}

// HUD: period totals, records, then one card per specialty (meters scaled on the best/worst type of the period).
const pct = (a, b) => b ? Math.round(100 * a / b) : null;
function bucketLabel(p, i, n) {
  const d = new Date(Date.now() - (n - 1 - i) * p.bucket * 1000);
  return p.bucket < 86400 ? `${d.getHours()} h` : d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function spark(p, t) {
  const daily = t.daily || [], n = daily.length, max = Math.max(1, ...daily), w = 100 / Math.max(1, n);
  return `<div class="meter" style="margin-top:4px;grid-template-columns:1fr auto"><span>activité par ${p.bucket < 86400 ? "heure" : "jour"}</span><span>max ${Math.max(0, ...daily)}</span></div><svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label="Activité de ${esc(specialty(t.type))}">${daily.map((v, i) =>
    `<rect class="${v ? "" : "zero"}" x="${i * w + w * 0.12}" width="${w * 0.76}" y="${v ? 30 - Math.max(3, 28 * v / max) : 28}" height="${v ? Math.max(3, 28 * v / max) : 2}"><title>${esc(bucketLabel(p, i, n))} : ${v} run(s)</title></rect>`).join("")}</svg>`;
}
function renderStats(p) {
  const T = p.types, sum = f => T.reduce((n, t) => n + (t[f] || 0), 0);
  const runs = sum("runs"), done = sum("done"), closed = done + sum("gone");
  document.getElementById("perf-global").innerHTML = `<div style="grid-column:1/-1;border:0;padding:0" class="muted">SUR LA PÉRIODE</div>` +
    [["runs", runs], ["livrés", closed ? `${done} (${pct(done, closed)} %)` : done], ["en cours", sum("active")], ["durée moy.", runs ? dur(sum("seconds") / runs) : "—"],
      ["tokens", k(sum("tokens"))], ["erreurs / run", runs ? (sum("errors") / runs).toFixed(1) : "—"], ["spécialités", T.length]]
      .map(([l, v]) => `<div><small>${l}</small>${esc(v)}</div>`).join("");
  const best = (f, ok = () => true) => T.filter(ok).sort((a, b) => f(b) - f(a))[0];
  const rec = [["le plus sollicité", best(t => t.runs), t => `${t.runs} runs`],
    ["le plus fiable", best(t => t.done / (t.done + t.gone), t => t.done + t.gone >= 2), t => `${pct(t.done, t.done + t.gone)} % livrés`],
    ["le plus rapide", best(t => -t.seconds / t.runs, t => t.done > 0 && t.seconds > 0), t => dur(t.seconds / t.runs)],
    ["le plus économe", best(t => -t.tokens / t.runs), t => `${k(Math.round(t.tokens / t.runs))} tokens/run`]].filter(r => r[1]);
  document.getElementById("perf-records").innerHTML = rec.length ? `<div class="stats">${rec.map(([l, t, f]) =>
    `<div><small>${l}</small><b style="color:${typeColor(t.type)}">${esc(specialty(t.type))}</b> <span class="muted">${esc(f(t))}</span></div>`).join("")}</div>` : "";
  const live = {};
  for (const s of data.sessions) for (const a of s.agents) if (a.status === "working" || a.status === "asking") live[a.type] = (live[a.type] || 0) + 1;
  const mx = f => Math.max(1e-9, ...T.map(f));
  const per = { sec: t => t.seconds / t.runs, tok: t => t.tokens / t.runs, err: t => t.errors / t.runs, tools: t => t.tools / t.runs, cost: t => (t.cost || 0) / t.runs };
  const meter = (label, frac, value) => `<div class="meter"><span>${label}</span><span class="track"><i style="width:${Math.round(100 * Math.min(1, frac))}%"></i></span><span>${esc(value)}</span></div>`;
  document.getElementById("perf-cards").innerHTML = T.map(t => {
    const cl = t.done + t.gone, rel = cl ? t.done / cl : 0, g = game?.xp?.[t.type];
    return `<div class="acard" style="--c:${typeColor(t.type)}">
      <div class="top"><b>${esc(specialty(t.type))}</b><span class="lvl" title="${g ? `${g.xp} XP au total` : ""}">NIV. ${g ? g.level : 1}</span></div>
      ${g ? meter("xp", (g.xp - g.from) / (g.to - g.from), `${g.xp - g.from}/${g.to - g.from}`) : ""}
      <div class="sub">${esc(t.type)} · ${t.runs} run(s)${live[t.type] ? ` · <span class="live">${live[t.type]} au travail</span>` : ""}</div>
      ${meter("fiabilité", rel, cl ? `${pct(t.done, cl)} %` : "—")}
      ${meter("durée moy.", per.sec(t) / mx(per.sec), dur(per.sec(t)))}
      ${meter("tokens/run", per.tok(t) / mx(per.tok), k(Math.round(per.tok(t))))}
      ${meter("coût/run", per.cost(t) / mx(per.cost), money(per.cost(t)))}
      ${meter("outils/run", per.tools(t) / mx(per.tools), Math.round(per.tools(t)))}
      ${meter("erreurs/run", per.err(t) / mx(per.err), per.err(t).toFixed(1))}
      ${spark(p, t)}</div>`;
  }).join("") || `<p class="muted">Aucun sous-agent sur la période.</p>`;
}

function togglePerf(show) {
  if (show) closeOverlays();
  perfBox.hidden = !show;
  document.getElementById("perfbtn").classList.toggle("on", show);
  try { localStorage.setItem("office-perf", show ? "1" : ""); } catch (_) { /* storage blocked: keep default */ }
  clearInterval(perfTimer);
  if (show) { renderSessionPerf(); renderBudgets(); loadPerf(); perfTimer = setInterval(loadPerf, 30000); }
  resize();
}
document.getElementById("perfbtn").onclick = () => togglePerf(perfBox.hidden);
perfDays.onchange = loadPerf;
document.getElementById("perf-close").onclick = () => togglePerf(false);
