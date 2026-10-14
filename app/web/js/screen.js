"use strict";
// Dev screen: code diffs and terminal.

/* ---------- dev screen: code changes ---------- */
// Edit/Write calls from the transcript, shown as a diff on the dev's monitor. Follows the newest change until one is picked.
let scrPick = null, scrKey = "";
const editKey = (e, i) => `${i}:${e.t}:${e.file}`;
const base = f => f.split("/").pop() || f;

function lineDiff(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  if (A.length * B.length > 250000) return [...A.map(l => ["-", l]), ...B.map(l => ["+", l])];
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push([" ", A[i]]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", A[i++]]);
    else out.push(["+", B[j++]]);
  }
  while (i < n) out.push(["-", A[i++]]);
  while (j < m) out.push(["+", B[j++]]);
  return out;
}

function diffStats(e) {
  if (e.old === null) return { add: e.new.split("\n").length, del: 0 };
  const d = lineDiff(e.old, e.new);
  return { add: d.filter(x => x[0] === "+").length, del: d.filter(x => x[0] === "-").length };
}

function renderScreen(d) {
  const edits = d.edits || [];
  if (!edits.length) {
    scrKey = "";
    document.getElementById("scr-count").textContent = "éditeur";
    document.getElementById("scr-files").innerHTML = ""; document.getElementById("scr-path").textContent = "";
    document.getElementById("scr-code").innerHTML = `<div class="gap" data-s="">Aucune modification de code pour l'instant.</div>`;
    return;
  }
  const keys = edits.map(editKey);
  if (scrPick && !keys.includes(scrPick)) scrPick = null;
  const sel = scrPick || keys[keys.length - 1];
  const key = `${d.id}|${d.editCount}|${sel}`;
  if (key === scrKey) return;  // unchanged: keep the user's scroll position
  scrKey = key;
  document.getElementById("scr-count").textContent = `éditeur · ${d.editCount} modif.${d.editCount > edits.length ? ` (${edits.length} dernières)` : ""}`;
  const files = document.getElementById("scr-files");
  files.innerHTML = edits.map((e, i) => {
    const st = diffStats(e);
    return `<button data-k="${esc(keys[i])}" class="${keys[i] === sel ? "on" : ""} ${e.failed ? "failed" : ""}" title="${esc(e.file)} · ${hhmm(e.t)}${e.failed ? " · échec" : ""}">${esc(base(e.file))} <b>+${st.add}</b>${st.del ? ` <i>−${st.del}</i>` : ""}</button>`;
  }).reverse().join("");
  const e = edits[keys.indexOf(sel)];
  document.getElementById("scr-path").innerHTML = `${esc(e.file)} · ${esc(e.tool === "Write" ? "fichier écrit en entier" : e.tool)} · ${hhmm(e.t)}`
    + `${e.failed ? ` · <span class="warn">modification refusée (erreur de l'outil)</span>` : ""}${e.truncated ? ` · <span class="warn">tronqué</span>` : ""}`;
  const rows = e.old === null ? e.new.split("\n").map(l => ["+", l]) : lineDiff(e.old, e.new);
  // fold long unchanged runs, keep 3 lines of context around changes
  const keep = rows.map((r, i) => r[0] !== " " || rows.slice(Math.max(0, i - 3), i + 4).some(x => x[0] !== " "));
  const html = [];
  for (let i = 0; i < rows.length; i++) {
    if (!keep[i] && e.old !== null) {
      let j = i; while (j < rows.length && !keep[j]) j++;
      html.push(`<div class="gap" data-s="">… ${j - i} ligne(s) inchangée(s)</div>`); i = j - 1; continue;
    }
    const [s, l] = rows[i];
    html.push(`<div class="${s === "+" ? "add" : s === "-" ? "del" : ""}" data-s="${s === " " ? "" : s}">${esc(l)}</div>`);
  }
  const pre = document.getElementById("scr-code");
  pre.innerHTML = html.join("");
  pre.scrollTop = 0;
}

document.getElementById("scr-files").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-k]");
  if (!b) return;
  const all = [...document.querySelectorAll("#scr-files button")];
  scrPick = b === all[0] ? null : b.dataset.k;  // newest tab = follow live
  scrKey = ""; loadPc();
});

// terminal: every Bash call with its output; a new command is typed out, a running one shows a caret
let termSeen = 0, termAgent = null, typing = null;
function renderTerm(d) {
  const box = document.getElementById("term"), cmds = d.terminal || [];
  document.getElementById("term-title").textContent = `terminal · ${d.termCount || 0} commande(s)`;
  if (!cmds.length) { box.innerHTML = `<div class="desc">Aucune commande pour l'instant.</div>`; termSeen = 0; return; }
  const sig = `${d.termCount}|${cmds.map(c => c.out === null ? 0 : 1).join("")}`;
  if (box.dataset.sig === sig) return;
  const fresh = termAgent === d.id && d.termCount > termSeen ? d.termCount - termSeen : 0;
  box.dataset.sig = sig; termAgent = d.id; termSeen = d.termCount;
  const stick = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = cmds.map((c, i) => `<div class="cmd">${c.desc ? `<div class="desc"># ${esc(c.desc)}</div>` : ""}<span class="ps">${esc(clip(d.type, 20))}@${esc(d.ticket || "dev")}:<b>~/${esc(c.cwd)}</b>$ </span><span class="typed" data-i="${i}">${esc(c.cmd)}</span>${
    c.out === null ? `<span class="caret"></span>` : ""}${c.out ? `<div class="out ${c.failed ? "err" : ""}">${esc(c.out)}</div>` : ""}</div>`).join("");
  if (stick || fresh) box.scrollTop = box.scrollHeight;
  // type out the newest command(s) like a real shell
  clearInterval(typing);
  if (fresh && fresh <= 3 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const spans = [...box.querySelectorAll(".typed")].slice(-fresh);
    const texts = spans.map(sp => sp.textContent);
    spans.forEach(sp => { sp.textContent = ""; });
    let k = 0, pos = 0;
    typing = setInterval(() => {
      if (k >= spans.length) return clearInterval(typing);
      pos += 3; spans[k].textContent = texts[k].slice(0, pos);
      if (pos >= texts[k].length) { k++; pos = 0; }
      box.scrollTop = box.scrollHeight;
    }, 25);
  }
}
