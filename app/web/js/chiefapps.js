"use strict";
// More ChiefOS apps: 🧠 MMX (explore the memory, validate proposals), 📊 Tableau de bord (agents: cost and runs per day,
// success per kind of agent, causes of blocking), 🔔 Notifications (every toast and alert kept, filterable, and "since
// your last visit"), ⏰ Planification (scheduled agents run by the server, office/schedules.py).

/* ---------- 🧠 MMX ---------- */
const mx = { q: "", mod: "", p: 0, sel: null, msg: "", busy: false };
function mmxAppHtml() {
  if (!mmx) return `<p class="muted">Lecture de MMX…</p>`;
  if (mmx.disabled) return `<div class="osrow"><b>🧠 MMX</b><span class="muted">Mémoire MMX non configurée (clé « mmx » de ~/.claude/agent-office.json).</span></div>`;
  const q = mx.q.toLowerCase(), all = mmx.modules.flatMap(m => m.entries.map(e => ({ ...e, mod: m.id, modLabel: m.label })));
  const list = all.filter(e => (!mx.mod || e.mod === mx.mod) && (!mx.p || e.p >= mx.p) && (!q || `${e.id} ${e.d} ${(e.tags || []).join(" ")}`.toLowerCase().includes(q)))
    .sort((a, b) => (b.p || 0) - (a.p || 0) || String(b.updated || "").localeCompare(String(a.updated || "")));
  const e = all.find(x => x.id === mx.sel);
  return `<div class="mxapp"><div class="glbar"><span class="gllogo">🧠</span><b>MMX</b><span class="muted">${all.length} fiches · ${mmx.pending.length} proposition(s)</span>
      <input class="glsearch mxsearch" placeholder="Rechercher (texte, id, tag)…" value="${esc(mx.q)}" aria-label="Rechercher"></div>
    <nav class="gltabs">${[["", "Tout", all.length], ...mmx.modules.map(m => [m.id, m.label, m.entries.length])].map(([id, l, n]) => `<button data-mx-mod="${id}" class="${mx.mod === id ? "on" : ""}">${esc(l)} <span class="glcount">${n}</span></button>`).join("")}</nav>
    <div class="osacts"><span class="muted">Priorité min.</span>${[0, 3, 4, 5].map(p => `<button data-mx-p="${p}" class="${mx.p === p ? "ubok" : ""}">${p ? `p${p}+` : "toutes"}</button>`).join("")}</div>
    ${mmx.pending.length ? `<h4>PROPOSITIONS EN ATTENTE</h4>${mmx.pending.map(p => `<div class="osrow"><b>${esc(p.op || "?")} ${esc(p.target || p.id)}</b><span>${esc(clip(p.d || p.reason || "", 160))}</span><button data-mx-ok="${esc(p.id)}"${mx.busy ? " disabled" : ""}>Valider</button></div>`).join("")}
      <div class="osacts"><button data-mx-ok="__all" class="ubok"${mx.busy ? " disabled" : ""}>Tout valider</button><span class="muted">${esc(mx.msg)}</span></div>` : ""}
    <div class="mxgrid"><div class="gllist">${list.map(x => `<button class="glmr" data-mx-sel="${esc(x.id)}"><span class="mxp p${x.p || 0}">p${x.p ?? "?"}</span><span class="glmain"><b>${esc(x.id)} <small class="muted">${esc(x.t || "")}</small></b><small>${esc(clip(x.d || "", 140))}</small>
        <span class="gllabels">${(x.tags || []).slice(0, 6).map(t => `<span class="gllabel" style="--lc:#5e5c64">${esc(t)}</span>`).join("")}</span></span><span class="glmeta">${esc(x.updated || "")}</span></button>`).join("") || `<p class="muted glempty">Rien trouvé.</p>`}</div>
      ${e ? `<aside class="mxside"><b>${esc(e.id)}</b><span class="muted">${esc(e.modLabel)} · ${esc(e.t || "")} · ${esc(e.st || "")}</span><p>${esc(e.d || "")}</p>
        <div><small>PRIORITÉ</small> p${e.p ?? "?"} · <small>CONFIANCE</small> ${Math.round((e.c || 0) * 100)} % · <small>SOURCE</small> ${esc(e.s || "")}</div>
        <div class="gllabels">${(e.tags || []).map(t => `<span class="gllabel" style="--lc:#5e5c64">${esc(t)}</span>`).join("")}</div>
        ${(e.r || []).length ? `<div><small>LIENS</small> ${e.r.map(r => `<button data-mx-sel="${esc(r.id || r)}">${esc(r.id || r)}</button>`).join(" ")}</div>` : ""}
        <div class="muted">créée ${esc(e.created || "?")} · modifiée ${esc(e.updated || "?")}</div></aside>` : ""}</div></div>`;
}
async function mmxValidate(ids) {
  if (DEMO) { mx.msg = "Démo : rien n'est validé."; return renderChiefOs(); }
  mx.busy = true; renderChiefOs();
  try {
    const res = await fetch("/api/mmx/validate", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify({ ids }) });
    const out = await res.json(); mx.msg = out.ok ? "✓ Validé et appliqué." : `✗ ${out.output || out.error}`; pollMmx();
  } catch (err) { mx.msg = `✗ ${err.message}`; }
  mx.busy = false; setTimeout(renderChiefOs, 800);
}

/* ---------- 📊 Tableau de bord ---------- */
let dash = null, dashDays = 30;
function demoDash() {
  const perDay = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10); const runs = 2 + (i * 7) % 6; return { day: d, runs, done: runs - (i % 3), blocked: i % 3 === 0 ? 1 : 0, cost: +(runs * 1.7).toFixed(2), seconds: runs * 900 }; });
  return { days: 30, perDay, perType: [{ type: "feature-builder", runs: 21, done: 17, blocked: 3, cost: 52.1, avgCost: 2.48, avgMin: 31.5, rate: 81, errors: 40 }, { type: "mr-reviewer", runs: 14, done: 14, blocked: 0, cost: 8.4, avgCost: 0.6, avgMin: 6.2, rate: 100, errors: 3 }, { type: "e2e-test-writer", runs: 6, done: 3, blocked: 3, cost: 19.8, avgCost: 3.3, avgMin: 44, rate: 50, errors: 31 }],
    causes: [{ cause: "délai dépassé", n: 3 }, { cause: "tests", n: 2 }, { cause: "dépendance", n: 1 }] };
}
async function loadDash() {
  try { dash = DEMO ? demoDash() : await (await fetch(`/api/dashboard?days=${dashDays}`, { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { dash = { error: true }; }
  renderChiefOs();
}
function dashboardAppHtml() {
  if (!dash) { loadDash(); return `<p class="muted">Calcul sur ${dashDays} jours…</p>`; }
  if (dash.error) return `<p class="muted">Serveur injoignable.</p>`;
  const d = dash, tot = k => d.perDay.reduce((s, x) => s + x[k], 0), runs = tot("runs");
  const W = 640, H = 150, n = Math.max(1, d.perDay.length), bw = W / n, maxR = Math.max(1, ...d.perDay.map(x => x.runs)), maxC = Math.max(0.01, ...d.perDay.map(x => x.cost));
  const bars = d.perDay.map((x, i) => { const h = (x.runs / maxR) * (H - 30), hd = (x.done / maxR) * (H - 30); return `<g><title>${x.day} : ${x.runs} run(s), ${x.done} livré(s), ${x.blocked} bloqué(s), ${money(x.cost)}</title><rect x="${i * bw + 3}" y="${H - 18 - h}" width="${bw - 6}" height="${h}" rx="3" fill="#5e5c64"/><rect x="${i * bw + 3}" y="${H - 18 - hd}" width="${bw - 6}" height="${hd}" rx="3" fill="#2da160"/></g>`; }).join("");
  const line = d.perDay.map((x, i) => `${i ? "L" : "M"}${i * bw + bw / 2} ${H - 18 - (x.cost / maxC) * (H - 30)}`).join(" ");
  const labels = d.perDay.map((x, i) => i % Math.ceil(n / 8) === 0 ? `<text x="${i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${x.day.slice(5)}</text>` : "").join("");
  return `<div class="osacts"><b>📊 Agents sur</b>${[7, 30, 90].map(x => `<button data-dash="${x}" class="${dashDays === x ? "ubok" : ""}">${x} jours</button>`).join("")}</div>
    <div class="rstats"><div>runs<b>${runs}</b></div><div>livrés<b>${tot("done")} <small>(${runs ? Math.round(100 * tot("done") / runs) : 0} %)</small></b></div><div>bloqués<b>${tot("blocked")}</b></div><div>coût estimé<b>${money(tot("cost"))}</b></div><div>temps agents<b>${durH(tot("seconds"))}</b></div><div>coût moyen / run<b>${money(runs ? tot("cost") / runs : 0)}</b></div></div>
    <h4>PAR JOUR — runs (gris), livrés (vert), coût (orange)</h4>
    <svg class="dashchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Runs et coût par jour">${bars}<path d="${line}" fill="none" stroke="#e95420" stroke-width="2.5"/>${labels}</svg>
    <h4>PAR TYPE D'AGENT</h4>${d.perType.map(t => `<div class="osrow"><b>${esc(specialty(t.type))}</b><span><span class="dashrate"><i style="width:${t.rate}%;background:${t.rate >= 80 ? "#2da160" : t.rate >= 50 ? "#e9be74" : "#ec5941"}"></i></span> ${t.rate} % livrés · ${t.runs} run(s) · ${t.blocked} bloqué(s)</span><span class="muted">${money(t.avgCost)} / run · ${t.avgMin} min · ${t.errors} erreurs</span></div>`).join("") || `<p class="muted">Aucun run.</p>`}
    <h4>POURQUOI ILS BLOQUENT</h4>${d.causes.length ? d.causes.map(c => `<div class="osrow"><b>${esc(c.cause)}</b><span><span class="dashrate"><i style="width:${Math.round(100 * c.n / d.causes[0].n)}%;background:#ec5941"></i></span></span><span class="muted">${c.n} fois</span></div>`).join("") : `<p class="muted">Aucun blocage sur la période. 🎉</p>`}
    <p class="muted">Coûts estimés au tarif API. Détail par ticket : 💸 Coûts ; erreurs déjà vues : formulaire de lancement.</p>`;
}

/* ---------- 🔔 Notifications ---------- */
let notifBook = store("office-notifs", { list: [], seen: 0, lastVisit: 0 });
const saveNotifs = () => save("office-notifs", notifBook);
notifBook.list = notifBook.list.filter(n => Date.now() - n.t < 30 * 86400000);  // kept 30 days
const visitStart = Date.now(), prevVisit = notifBook.lastVisit || 0;
setInterval(() => { notifBook.lastVisit = Date.now(); saveNotifs(); }, 60000);
addEventListener("beforeunload", () => { notifBook.lastVisit = Date.now(); saveNotifs(); });
const toastBefore = toast;
toast = function (kicker, title, body, cls) {  // every toast is kept in the notification centre
  notifBook.list.unshift({ t: Date.now(), k: String(kicker || ""), title: String(title || ""), body: String(body || "") });
  notifBook.list = notifBook.list.slice(0, 400); saveNotifs();
  return toastBefore(kicker, title, body, cls);
};
const notifyBefore = notify;
notify = function (title, body, ...rest) {
  notifBook.list.unshift({ t: Date.now(), k: "NOTIFICATION", title: String(title || ""), body: String(body || "") });
  notifBook.list = notifBook.list.slice(0, 400); saveNotifs();
  return notifyBefore(title, body, ...rest);
};
const NOTIF_CATS = [["", "Tout"], ["agents", "Agents", /SALAIRE|MERGE|ALERTE|NOTIFICATION|PLANNING|LANCEMENT|DÉBRIEF|COMPÉTENCE|PROMOTION|DÉMISSION|RECRUTEMENT/], ["jeu", "Bureau", /ENVIE|AMITIÉ|CUISINE|BOUTIQUE|MODE ACHAT|CONSTRUCTION|AFTERWORK|FÊTE|ANNIVERSAIRE|VISITE|COUPURE|LIVRAISON|INCIDENT|RÉGLÉ|RÉCOMPENSE|ADOPTION|PARRAINAGE/], ["outils", "Outils", /GITLAB|BLUEPRINT|SAUVEGARDE|IMPORT|MÉTÉO|RAPPORT|SEMAINE|CHIEFOS/]];
const nf = { cat: "", q: "" };
const unreadNotifs = () => notifBook.list.filter(n => n.t > (notifBook.seen || 0)).length;
function notifsAppHtml() {
  const cat = NOTIF_CATS.find(c => c[0] === nf.cat), q = nf.q.toLowerCase();
  const list = notifBook.list.filter(n => (!cat?.[2] || cat[2].test(n.k)) && (!q || `${n.k} ${n.title} ${n.body}`.toLowerCase().includes(q)));
  const since = notifBook.list.filter(n => n.t > prevVisit && n.t < visitStart), paid = wallet.log.filter(l => !l.spend && l.t > prevVisit);
  const summary = prevVisit ? `<div class="nfsum"><b>Depuis ta dernière visite</b> (${new Date(prevVisit).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}) :
      ${paid.length} mission(s) livrée(s)${paid.length ? ` (+${fmtSim(paid.reduce((s, l) => s + l.total, 0))})` : ""} · ${since.length} notification(s) · ${data.questions?.length || 0} question(s) en attente</div>` : "";
  notifBook.seen = Date.now(); saveNotifs();
  return `${summary}<div class="glbar"><span class="gllogo">🔔</span><b>Notifications</b><span class="muted">${notifBook.list.length} gardées</span><input class="glsearch nfsearch" placeholder="Filtrer…" value="${esc(nf.q)}" aria-label="Filtrer"><button data-nf="clear" title="Tout effacer">🗑</button></div>
    <nav class="gltabs">${NOTIF_CATS.map(([id, l]) => `<button data-nf-cat="${id}" class="${nf.cat === id ? "on" : ""}">${l}</button>`).join("")}</nav>
    ${list.slice(0, 200).map(n => `<div class="osrow nfrow"><b><small class="muted">${esc(n.k)}</small><br>${esc(n.title)}</b><span class="muted">${esc(n.body)}</span><span class="muted">${new Date(n.t).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("") || `<p class="muted">Rien ici.</p>`}`;
}

/* ---------- ⏰ Planification ---------- */
let sched = null, schedEdit = null, schedMsg = "";
const DAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
async function loadSched() {
  try { sched = DEMO ? { items: [{ id: "d1", name: "Nettoyage du board", agent: "youtrack-board-cleaner", prompt: "Nettoie le board", cwd: "", days: [0], time: "09:00", enabled: true, last: "" }], log: [], agents: ["youtrack-board-cleaner", "security-auditor"] }
    : await (await fetch("/api/schedules", { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { sched = { items: [], log: [], agents: [], error: true }; }
  if (!termTargets && !DEMO) { try { termTargets = await (await fetch("/api/blueprint/targets")).json(); } catch (_) { termTargets = []; } }
  renderChiefOs();
}
async function schedAct(body) {
  if (DEMO) { schedMsg = "Démo : rien n'est enregistré."; return renderChiefOs(); }
  try {
    const res = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) });
    const out = await res.json(); if (!res.ok) throw new Error(out.error);
    sched = out; schedEdit = null; schedMsg = body.action === "run" ? "✓ Lancé." : "✓ Enregistré.";
  } catch (err) { schedMsg = `✗ ${err.message}`; }
  renderChiefOs();
}
function scheduleAppHtml() {
  if (!sched) { loadSched(); return `<p class="muted">Chargement…</p>`; }
  const e = schedEdit, agentsList = sched.agents || [];
  const form = e ? `<div class="schedform"><h4>${e.id ? "MODIFIER" : "NOUVELLE"} PLANIFICATION</h4>
      <div class="osrow"><b>Nom</b><span><input data-sf="name" value="${esc(e.name || "")}" placeholder="Nettoyage du board"></span><span></span></div>
      <div class="osrow"><b>Agent</b><span><select data-sf="agent">${agentsList.map(a => `<option${a === e.agent ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></span><span></span></div>
      <div class="osrow"><b>Mission</b><span><textarea data-sf="prompt" rows="3" placeholder="Ce que l'agent doit faire">${esc(e.prompt || "")}</textarea></span><span></span></div>
      <div class="osrow"><b>Dossier</b><span><select data-sf="cwd"><option value="">dossier de lancement habituel</option>${(termTargets || []).map(t => `<option value="${esc(t.path)}"${t.path === e.cwd ? " selected" : ""}>${esc(t.label)}</option>`).join("")}</select></span><span></span></div>
      <div class="osrow"><b>Quand</b><span class="schedays">${DAYS_FR.map((d, i) => `<label><input type="checkbox" data-sd="${i}"${(e.days || []).includes(i) ? " checked" : ""}> ${d}</label>`).join("")} à <input type="time" data-sf="time" value="${esc(e.time || "09:00")}"></span><span></span></div>
      <div class="osacts"><button data-sc="save" class="ubok">Enregistrer</button><button data-sc="cancel">Annuler</button></div></div>` : "";
  return `<div class="osacts"><b>⏰ Agents planifiés</b><button data-sc="new" class="ubok">＋ Nouvelle</button><span class="muted">${esc(schedMsg)}</span></div>
    <p class="muted">Le serveur de l'Office lance l'agent à l'heure dite (dans un terminal, tu valides les permissions comme d'habitude). Il doit tourner à ce moment-là : une heure manquée de plus de 15 min est sautée.</p>
    ${form}
    ${sched.items.map(i => `<div class="osrow"><b>${i.enabled ? "🟢" : "⚪"} ${esc(i.name)}</b><span>${esc(i.agent)} · ${i.days.map(d => DAYS_FR[d]).join(", ")} à ${esc(i.time)}${i.cwd ? ` · ${esc(i.cwd.replace(/^\/home\/[^/]+/, "~"))}` : ""}<br><small class="muted">${esc(clip(i.prompt, 120))}${i.last ? ` · dernier : ${esc(i.last)}` : ""}</small></span>
      <span class="osacts"><button data-sc="run" data-id="${esc(i.id)}" title="Lancer maintenant">▶</button><button data-sc="toggle" data-id="${esc(i.id)}">${i.enabled ? "Pause" : "Activer"}</button><button data-sc="edit" data-id="${esc(i.id)}">✏️</button><button data-sc="del" data-id="${esc(i.id)}">🗑</button></span></div>`).join("") || (e ? "" : `<p class="muted">Aucune planification.</p>`)}
    ${sched.log.length ? `<h4>DERNIERS LANCEMENTS</h4>${sched.log.slice(0, 15).map(l => `<div class="osrow"><b>${l.ok ? "✓" : "✗"} ${esc(l.name)}</b><span class="muted">${esc(l.output)} · ${esc(l.why)}</span><span class="muted">${new Date(l.t * 1000).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></div>`).join("")}` : ""}`;
}

/* ---------- events ---------- */
osBox.addEventListener("input", ev => {
  const t = ev.target;
  if (t.classList?.contains("mxsearch")) { mx.q = t.value; const p = t.selectionStart; renderChiefOs(); const s = osBox.querySelector(".mxsearch"); s.focus(); s.setSelectionRange(p, p); }
  if (t.classList?.contains("nfsearch")) { nf.q = t.value; const p = t.selectionStart; renderChiefOs(); const s = osBox.querySelector(".nfsearch"); s.focus(); s.setSelectionRange(p, p); }
  if (t.dataset?.sf && schedEdit) schedEdit[t.dataset.sf] = t.value;
});
osBox.addEventListener("change", ev => {
  const t = ev.target;
  if (t.dataset?.sf && schedEdit) schedEdit[t.dataset.sf] = t.value;
  if (t.dataset?.sd !== undefined && schedEdit) { const d = new Set(schedEdit.days || []); t.checked ? d.add(+t.dataset.sd) : d.delete(+t.dataset.sd); schedEdit.days = [...d].sort(); }
});
osBox.addEventListener("click", ev => {
  const b = ev.target.closest?.("button"); if (!b) return;
  if (b.dataset.mxMod !== undefined) { mx.mod = b.dataset.mxMod; return renderChiefOs(); }
  if (b.dataset.mxP !== undefined) { mx.p = +b.dataset.mxP; return renderChiefOs(); }
  if (b.dataset.mxSel) { mx.sel = b.dataset.mxSel; return renderChiefOs(); }
  if (b.dataset.mxOk) return mmxValidate(b.dataset.mxOk === "__all" ? mmx.pending.map(p => p.id) : [b.dataset.mxOk]);
  if (b.dataset.dash) { dashDays = +b.dataset.dash; dash = null; return renderChiefOs(); }
  if (b.dataset.nfCat !== undefined) { nf.cat = b.dataset.nfCat; return renderChiefOs(); }
  if (b.dataset.nf === "clear") { notifBook.list = []; saveNotifs(); return renderChiefOs(); }
  const sc = b.dataset.sc; if (!sc) return;
  if (sc === "new") { schedEdit = { name: "", agent: (sched.agents || [])[0], prompt: "", cwd: "", days: [0, 1, 2, 3, 4], time: "09:00", enabled: true }; return renderChiefOs(); }
  if (sc === "cancel") { schedEdit = null; return renderChiefOs(); }
  if (sc === "edit") { schedEdit = structuredClone(sched.items.find(i => i.id === b.dataset.id)); return renderChiefOs(); }
  if (sc === "save") return schedAct({ action: "save", item: schedEdit });
  if (sc === "del") return schedAct({ action: "delete", id: b.dataset.id });
  if (sc === "toggle") return schedAct({ action: "toggle", id: b.dataset.id });
  if (sc === "run") return schedAct({ action: "run", id: b.dataset.id });
});
