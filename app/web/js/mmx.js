"use strict";
// MMX cabinet: entries carried by devs, store panel, validation.

/* ---------- MMX storage ---------- */
// A new MMX entry (applied) or proposal (pending) = a paper a dev carries to the cabinet.
function mmxIds(d) {
  return { entries: new Set(d.modules.flatMap(m => m.entries.map(e => e.id))), pending: new Set(d.pending.map(p => p.id)) };
}

async function pollMmx() {
  let d;
  try { d = DEMO ? demoMmx() : await (await fetch("/api/mmx", { cache: "no-store" })).json(); } catch (_) { return; }
  d.count = d.modules.reduce((n, m) => n + m.entries.length, 0);
  const ids = mmxIds(d);
  if (mmxSeen) {
    const items = [...[...ids.entries].filter(i => !mmxSeen.entries.has(i)).map(id => ({ id, kind: "entries" })),
      ...d.pending.filter(p => !mmxSeen.pending.has(p.id)).map(p => ({ id: p.target ? `${p.id} (${p.target})` : p.id, kind: "pending" }))];
    for (const it of items) { inTransit[it.kind]++; recentIds.set(it.id.split(" ")[0], Date.now()); }
    if (items.length) mmxQueue.push(...items);
  }
  mmxSeen = ids; mmx = d;
  if (selected === "store" && storeStamp !== d.stamp) renderStore();
}

function dispatch(items) {
  const label = items.length > 1 ? `${items.length} fiches` : items[0].id;
  const errand = { items, label, pendingOnly: items.every(i => i.kind === "pending") };
  // the dev who wrote it (its last action mentions MMX) brings it, else the archivist comes in
  const dev = [...ents.values()].find(e => e.seated && !e.leaving && !e.asking && /mmx|propos/i.test(e.agent.action || ""));
  const file = { ...STAND, wait: 1500, pose: "file", on: x => { drawerUntil = performance.now() + 1500; setTimeout(() => fileItems(x), 1400); } };
  if (dev) {
    const d = dev.desk, yy = d.y + 28;
    dev.seated = false; dev.errand = errand;
    dev.path = [{ x: d.x, y: yy }, { x: STAND.x, y: yy }, file, { x: STAND.x, y: yy }, { x: d.x, y: yy }, { x: d.x, y: d.y + 22 }];
    return;
  }
  const id = `mmx-courier-${++couriers}`;
  ents.set(id, { agent: { id, type: "archiviste", ticket: null, status: "working" }, desk: null, courier: true, leaving: true, seated: false,
    look: { skin: SKINS[couriers % SKINS.length], hair: HAIRS[(couriers * 3) % HAIRS.length], shirt: "#c9a24b" }, errand,
    x: DOOR.x, y: DOOR.y, path: [{ x: DOOR.x, y: LANE }, file, { x: DOOR.x, y: LANE }, { ...DOOR }] });
}

function fileItems(e) {
  if (!e.errand) return;
  for (const it of e.errand.items) inTransit[it.kind] = Math.max(0, inTransit[it.kind] - 1);
  e.errand = null;
}

function clearScene() {
  evSeen.clear(); particles.length = 0; planes.length = 0;
  ents.clear(); firstLoad = true; arrivals.length = 0; doorFree = 0;
  mmxQueue.length = 0; inTransit.entries = 0; inTransit.pending = 0;
}

const MOD_ORDER = ["MOD-PREFERENCES", "MOD-PROFILE", "MOD-PROJECTS", "MOD-KNOWLEDGE", "MOD-RELATIONS", "MOD-ARCHIVE"];
function renderStore() {
  if (!mmx) return;
  storeStamp = mmx.stamp;
  const q = document.getElementById("store-q").value.trim().toLowerCase();
  const match = (...f) => !q || f.join(" ").toLowerCase().includes(q);
  const isNew = id => Date.now() - (recentIds.get(id) || 0) < 120000;
  const open = new Set([...document.querySelectorAll("#store-list details[open]")].map(x => x.dataset.id));
  const entry = e => `<details data-id="${esc(e.id)}" class="${isNew(e.id) ? "new" : ""}"${open.has(e.id) ? " open" : ""}>
    <summary><b>${esc(e.id)}</b> p${esc(e.p)} · ${esc(clip(e.d, 70))}</summary><p>${esc(e.d)}</p>
    <div class="meta">${[e.tags?.length ? `tags : ${e.tags.join(", ")}` : "", e.r?.length ? `liens : ${e.r.join(", ")}` : "",
      `source : ${e.s ?? "?"} · confiance ${e.c ?? "?"} · ${e.st || ""}`, e.updated || e.created ? `maj ${e.updated || e.created}` : ""].filter(Boolean).map(esc).join("<br>")}</div></details>`;
  const pend = mmx.pending.filter(p => match(p.id, p.target, p.op, p.reason, p.d));
  const all = mmx.pending.map(p => p.id).join(",");
  let html = pend.length ? `<h3>À VALIDER (${pend.length}) ${mmx.pending.length > 1 ? `<button class="ok" data-ids="${esc(all)}">Tout valider</button>` : ""}</h3>`
    + pend.map(p => `<details class="pend" data-id="${esc(p.id)}"${open.has(p.id) ? " open" : ""}>
    <summary><button class="ok" data-ids="${esc(p.id)}" title="Approuver et appliquer dans MMX">Valider</button><b>${esc(p.id)}</b> ${esc(p.op)} ${esc(p.target || "")} · ${esc(p.status)}</summary>${p.d ? `<p>${esc(p.d)}</p>` : ""}
    <div class="meta">${esc(p.reason || "")}${p.created ? `<br>proposé le ${esc(p.created)}` : ""}</div></details>`).join("") : "";
  const mods = mmx.modules.slice().sort((a, b) => MOD_ORDER.indexOf(a.id) - MOD_ORDER.indexOf(b.id));
  for (const m of mods) {
    const es = m.entries.filter(e => match(e.id, e.d, ...(e.tags || [])));
    if (es.length) html += `<h3>${esc(m.label.toUpperCase())} (${es.length})</h3>` + es.map(entry).join("");
  }
  document.getElementById("store-list").innerHTML = html || `<p class="muted">${q ? "Aucun résultat." : "Rien de stocké."}</p>`;
  document.getElementById("p-title").textContent = `Archives MMX · ${mmx.count} fiche(s)`;
}
document.getElementById("store-q").addEventListener("input", renderStore);

// Valider = mmx.py approve + apply on the server. First click arms the button, second confirms.
document.getElementById("store-list").addEventListener("click", ev => {
  const b = ev.target.closest("button.ok");
  if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  if (!b.classList.contains("confirm")) {
    document.querySelectorAll("#store-list button.confirm").forEach(x => { x.classList.remove("confirm"); x.textContent = x.dataset.text; });
    b.dataset.text = b.textContent; b.classList.add("confirm");
    const n = b.dataset.ids.split(",").length;
    b.textContent = n > 1 ? `Confirmer (${n}) ?` : "Confirmer ?";
    return;
  }
  validateMmx(b.dataset.ids.split(","));
});

async function validateMmx(ids) {
  const msg = document.getElementById("store-msg");
  document.querySelectorAll("#store-list button.ok").forEach(x => { x.disabled = true; });
  msg.className = "muted"; msg.textContent = `Validation de ${ids.join(", ")}…`;
  let res = null;
  if (DEMO) { demoApplied.push(...ids); res = { ok: true, output: `${ids.length} proposition(s) appliquée(s) (démo)` }; }
  else try {
    const r = await fetch("/api/mmx/validate", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
      body: JSON.stringify({ ids }) });
    res = r.status === 403 ? { ok: false, output: "Refusé — page à recharger ?" } : await r.json();
  } catch (err) { res = { ok: false, output: `serveur injoignable (${err.message})` }; }
  msg.className = res.ok ? "done" : "err";
  msg.textContent = res.ok ? `✓ ${res.output.split("\n").pop()}` : `Échec — rien n'est enregistré :\n${res.output || res.error || ""}`;
  storeStamp = null;
  await pollMmx();
  if (storeStamp === null) renderStore();
}
