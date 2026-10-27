// The charts of ChiefOS (📊 Tableau de bord, 💸 Coûts…): plain SVG and HTML, no library. One quiet look everywhere —
// thin marks (bars ≤ 24px with a 4px rounded end, 2px lines, a 10% area wash), a 2px surface gap between stacked
// segments, hairline gridlines, a legend for two series or more, a value at the end of a line — and one hover layer:
// every mark carries data-tip, a JSON {t: title, r: [[label, value, colour]]} the tooltip builds with textContent.
// Colours (validated for colour blindness on the ChiefOS card surface, #1b2440): CH.done blue, CH.blocked orange,
// CH.money aqua; CH.other is the neutral « autres ».

import { esc } from "../core/data.js";

export const CH = { done: "#3987e5", blocked: "#d95926", money: "#199e70", other: "#4a5578" };

// the width a chart is drawn at: its window's, so 11px text stays 11px (the SVG then only scales a little)
export const chartWidth = (inset = 72) => Math.max(320, Math.round((document.querySelector("#chiefos .osapp")?.clientWidth || 790) - inset));
const tip = (t, rows) => esc(JSON.stringify({ t, r: rows }));
export const compact = v => Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : `${+(+v).toFixed(v % 1 ? 1 : 0)}`;
// a clean top for the axis (1, 2, 2.5, 5 × 10ⁿ) and its ticks
function nice(max, n = 4) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / n, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw);
  const top = Math.ceil(max / step) * step;
  return { top, ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(6)) };
}
// a bar whose top corners are rounded (r), square at the baseline
const barPath = (x, y, w, h, r) => { r = Math.min(r, w / 2, h); return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`; };

export const legend = items => `<div class="chlegend">${items.map(([label, color, kind = "rect"]) => `<span><i class="${kind}" style="--c:${color}"></i>${esc(label)}</span>`).join("")}</div>`;

/* columns over time, stacked: rows [{label, ...values}], stack [{key, label, color}] (bottom first) */
export function columns({ rows, stack, height = 200, fmt = compact, title = r => r.label, aria = "", width = chartWidth() }) {
  const W = width, H = height, L = 34, B = 22, T = 8, plotW = W - L - 4, plotH = H - B - T;
  const totals = rows.map(r => stack.reduce((s, k) => s + (r[k.key] || 0), 0)), { top, ticks } = nice(Math.max(0, ...totals));
  const band = plotW / Math.max(1, rows.length), bw = Math.max(3, Math.min(24, band * 0.62)), y = v => T + plotH - (v / top) * plotH;
  const every = Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 70)));
  const grid = ticks.map(t => `<line class="chgrid" x1="${L}" x2="${W - 4}" y1="${y(t)}" y2="${y(t)}"/><text class="chtick" x="${L - 6}" y="${y(t) + 3.5}" text-anchor="end">${fmt(t)}</text>`).join("");
  const cols = rows.map((r, i) => {
    const x = L + i * band + (band - bw) / 2, segs = stack.filter(k => r[k.key] > 0);
    let base = 0;
    const marks = segs.map((k, j) => {
      const v = r[k.key], y1 = y(base + v), h = Math.max(0, y(base) - y1 - (j ? 2 : 0)); base += v;  // a 2px gap above the segment below
      return j === segs.length - 1 ? `<path d="${barPath(x, y1, bw, h, 4)}" fill="${k.color}"/>` : `<rect x="${x}" y="${y1}" width="${bw}" height="${h}" fill="${k.color}"/>`;
    }).join("");
    const label = i % every === 0 || i === rows.length - 1 ? `<text class="chtick" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(r.short ?? r.label)}</text>` : "";
    return `<g class="chcol" tabindex="0" data-tip="${tip(title(r), stack.map(k => [k.label, fmt(r[k.key] || 0), k.color]))}"><rect class="chhit" x="${L + i * band}" y="${T}" width="${band}" height="${plotH}"/>${marks}</g>${label}`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${grid}<line class="chaxis" x1="${L}" x2="${W - 4}" y1="${y(0)}" y2="${y(0)}"/>${cols}</svg>`;
}

/* a line over time with its area wash, the last value labelled: rows [{label, value}] */
export function area({ rows, color = CH.money, height = 180, fmt = compact, tickFmt = fmt, name = "", aria = "", width = chartWidth() }) {
  const W = width, H = height, L = 34, R = 54, B = 22, T = 10, plotW = W - L - R, plotH = H - B - T;
  const { top, ticks } = nice(Math.max(0, ...rows.map(r => r.value)));
  const x = i => L + (rows.length < 2 ? plotW / 2 : (i / (rows.length - 1)) * plotW), y = v => T + plotH - (v / top) * plotH;
  const pts = rows.map((r, i) => [x(i), y(r.value)]), line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const last = pts.at(-1) || [L, y(0)], every = Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 70))), step = rows.length < 2 ? plotW : plotW / (rows.length - 1);
  const grid = ticks.map(t => `<line class="chgrid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="chtick" x="${L - 6}" y="${y(t) + 3.5}" text-anchor="end">${tickFmt(t)}</text>`).join("");
  const hits = rows.map((r, i) => `<g class="chpt" tabindex="0" data-tip="${tip(r.label, [[name, fmt(r.value), color]])}"><rect class="chhit" x="${x(i) - step / 2}" y="${T}" width="${step}" height="${plotH}"/>
    <line class="chcross" x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${y(0)}"/><circle class="chdot" cx="${x(i)}" cy="${y(r.value)}" r="4" fill="${color}"/></g>`).join("");
  const labels = rows.map((r, i) => i % every === 0 || i === rows.length - 1 ? `<text class="chtick" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(r.short ?? r.label)}</text>` : "").join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${grid}<line class="chaxis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
    ${rows.length ? `<path d="${line}L${last[0]} ${y(0)}L${pts[0][0]} ${y(0)}Z" fill="${color}" opacity=".12"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${hits}${rows.length ? `<circle class="chend" cx="${last[0]}" cy="${last[1]}" r="4" fill="${color}"/><text class="chval" x="${last[0] + 9}" y="${last[1] + 4}">${fmt(rows.at(-1).value)}</text>` : ""}${labels}</svg>`;
}

/* horizontal bars, one series or stacked: rows [{label (HTML allowed), key, values: {k: n}, meta, flag}], stack as columns */
export function bars({ rows, stack, fmt = compact, total = r => stack.reduce((s, k) => s + (r.values[k.key] || 0), 0), max, shown = total }) {
  const top = max ?? Math.max(1e-9, ...rows.map(total));
  return `<div class="chbars" role="list">${rows.map(r => {
    const t = total(r), segs = stack.filter(k => r.values[k.key] > 0);
    return `<div class="chbar" role="listitem" tabindex="0" data-tip="${tip(r.key ?? "", stack.map(k => [k.label, fmt(r.values[k.key] || 0), k.color]))}">
      <span class="chbl">${r.label}${r.flag || ""}</span>
      <span class="chbt"><span class="chbf" style="width:${(t / top) * 100}%">${segs.map(k => `<i style="flex:${r.values[k.key]};background:${k.color}"></i>`).join("")}</span></span>
      <b class="chbv">${fmt(shown(r))}</b>${r.meta ? `<small class="chbm">${r.meta}</small>` : ""}</div>`;
  }).join("")}</div>`;
}

/* a stat tile: label, value, an optional sparkline of the period (the last point in the accent) and a hint */
export function tile({ label, value, hint = "", spark = null, color = CH.done, tone = "" }) {
  let svg = "";
  if (spark && spark.length > 1) {
    const max = Math.max(1e-9, ...spark), w = 100, h = 26, pts = spark.map((v, i) => [(i / (spark.length - 1)) * w, h - 2 - (v / max) * (h - 4)]);
    svg = `<svg class="chspark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("")}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }
  return `<div class="chtile${tone ? ` ${tone}` : ""}"><small>${esc(label)}</small><b>${value}</b>${svg}${hint ? `<span>${hint}</span>` : ""}</div>`;
}

/* the data behind a chart, for whoever reads tables (or cannot see the colours) */
export const dataTable = (head, rows) => `<details class="chtable"><summary>Voir les données</summary><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;

/* the tooltip: one for the page, built with textContent from the mark's data-tip, on hover and on keyboard focus */
let box = null;
function show(el, x, y) {
  let spec; try { spec = JSON.parse(el.dataset.tip); } catch (_) { return; }
  box ||= Object.assign(document.createElement("div"), { className: "chtip", role: "tooltip" });
  if (!box.isConnected) document.body.append(box);
  box.replaceChildren();
  const t = document.createElement("div"); t.className = "chtipt"; t.textContent = spec.t; box.append(t);
  for (const [label, value, color] of spec.r) {
    const row = document.createElement("div"), key = document.createElement("i"), v = document.createElement("b"), l = document.createElement("span");
    key.style.background = color; v.textContent = value; l.textContent = label; row.append(key, v, l); box.append(row);
  }
  box.hidden = false;
  const r = box.getBoundingClientRect(), left = Math.min(window.innerWidth - r.width - 8, x + 14), top = y - r.height - 12 < 8 ? y + 16 : y - r.height - 12;
  box.style.left = `${Math.max(8, left)}px`; box.style.top = `${top}px`;
}
const hide = () => { if (box) box.hidden = true; };
document.addEventListener("pointermove", ev => { const el = ev.target.closest?.("#chiefos [data-tip]"); if (el) show(el, ev.clientX, ev.clientY); else hide(); });
document.addEventListener("focusin", ev => { const el = ev.target.closest?.("#chiefos [data-tip]"); if (el) { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); } });
document.addEventListener("focusout", hide);
