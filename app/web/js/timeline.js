"use strict";
// Session timeline under the office: one lane per agent (start → end), with questions, tests, pushes and MRs.

const TL_MARKS = {
  ask: ["?", "#fbaa08", "question"], tests_fail: ["✗", "#ff6b6b", "tests rouges"], tests_pass: ["✓", "#51cf66", "tests verts"],
  push: ["↑", "#5aa9ff", "push"], mr: ["★", "#fbaa08", "merge request"], to_verify: ["▶", "#7fd6d6", "To Verify"],
};

function renderTimeline(session) {
  const box = document.getElementById("timeline");
  const now = data.now || Date.now() / 1000;
  const rows = (session?.agents || []).filter(a => a.game?.first)
    .map(a => ({ name: crew.ids[a.id] || specialty(a.type), color: typeColor(a.type), start: a.game.first,
      end: a.status === "working" || a.status === "asking" || a.status === "blocked" ? now : a.game.last || now,
      done: a.status === "done", events: a.game.timeline || [], id: a.id }));
  const cg = session?.chief?.game;
  if (cg?.first) rows.unshift({ name: CHIEF_NAME, color: "#fbaa08", start: cg.first, end: now, events: cg.timeline || [], id: "chief" });
  const shown = rows.slice(-7);
  box.hidden = !shown.length;
  if (!shown.length) return;
  const t0 = Math.min(...shown.map(r => r.start)), t1 = Math.max(now, t0 + 60), width = box.clientWidth || 800;
  const L = 86, R = width - 10, X = t => L + (R - L) * (t - t0) / (t1 - t0), RH = 15, H0 = 16;
  const hm = t => new Date(t * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  let svg = `<text x="${L}" y="11" class="ax">${hm(t0)}</text><text x="${R}" y="11" class="ax" text-anchor="end">maintenant · ${hm(t1)}</text>`;
  shown.forEach((r, i) => {
    const y = H0 + i * RH, x0 = X(r.start), x1 = Math.max(x0 + 3, X(r.end));
    svg += `<g class="row" data-id="${esc(r.id)}"><text x="4" y="${y + 10}" class="nm">${esc(clip(r.name, 11))}</text>`
      + `<rect x="${x0}" y="${y + 3}" width="${x1 - x0}" height="8" fill="${r.color}" opacity=".45"><title>${esc(r.name)} · ${hm(r.start)} → ${r.done ? hm(r.end) : "en cours"}</title></rect>`;
    for (const ev of r.events) {
      const m = TL_MARKS[ev.kind];
      if (!m || !ev.t) continue;
      svg += `<text x="${X(ev.t)}" y="${y + 11}" text-anchor="middle" fill="${m[1]}" class="mk">${m[0]}<title>${esc(r.name)} · ${m[2]}${ev.n ? ` (${ev.n})` : ""} · ${hm(ev.t)}</title></text>`;
    }
    if (r.done) svg += `<text x="${x1 + 2}" y="${y + 11}" fill="#51cf66" class="mk">✔<title>livré · ${hm(r.end)}</title></text>`;
    svg += "</g>";
  });
  box.innerHTML = `<svg width="${width}" height="${H0 + shown.length * RH + 2}" role="img" aria-label="Chronologie de la session">${svg}</svg>`;
}
document.getElementById("timeline").addEventListener("click", ev => {
  const row = ev.target.closest("[data-id]"); if (row) openPanel(row.dataset.id);
});
