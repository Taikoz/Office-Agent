// The comic strip of a mission (🎞️ on a delivered dev's card; made by itself when a dev delivers): 3 to 6 panels drawn from
// its real key moments — the ticket, the code, the first failure, the question to the chief, back to green, the MR —
// with the dev and the chief in their own looks. The texts are written by a small model when 🧠 DEVS BAVARDS is on
// (office/quips.py comic), else from templates. Saved as a PNG or copied, to paste in the MR or on Slack. Every comic is
// filed in the album (📚, 🎞️ ALBUM in the menu), one per mission, kept in this browser.

import { hub } from "../hub.js";
import { CHIEF_NAME, clip, ents, fetchAgent, specialty } from "../core/core.js";
import { ART } from "../svg/base.js";
import { lookTraits } from "../svg/figures.js";
import { lookFor } from "../agents/entities.js";
import { esc } from "../core/data.js";
import { crew } from "../sims/crew.js";
import { quipState } from "../agents/quips.js";
import { toast } from "../sims/progress.js";

const TEST_RE = /pytest|vitest|jest|npm (run )?test|playwright test|go test|cargo test|make test|ruff|lint|mypy|tsc/;
const base = f => String(f || "").split("/").pop();

/* ---------- the key moments of a mission, from its detail (/api/agent) ---------- */
function moments(d) {
  const out = [], term = d.terminal || [], events = d.events || [], files = [...new Set((d.edits || []).map(e => base(e.file)).filter(Boolean))];
  out.push({ kind: "ticket", hint: `${d.ticket || "une mission"} : ${clip(d.description || d.prompt || "", 120)}` });
  if (files.length) out.push({ kind: "code", hint: `${files.length} fichier(s) : ${files.slice(0, 3).join(", ")}`, file: files[0], n: files.length });
  const bugAt = term.findIndex(c => c.failed), bug = term[bugAt] || null, err = events.find(e => e.kind === "error");
  if (bug || err) out.push({ kind: "bug", hint: bug ? `${clip(bug.cmd, 60)} → ${clip(String(bug.out || "").split("\n").filter(Boolean).pop() || "échec", 90)}` : clip(err.label, 120) });
  const ask = events.find(e => e.tool === "AskUserQuestion" || /ask\.py/.test(e.label || ""));
  if (ask) out.push({ kind: "question", hint: clip(ask.label, 120) });
  const fix = bugAt >= 0 && term.slice(bugAt + 1).find(c => !c.failed && TEST_RE.test(c.cmd));
  if (fix) out.push({ kind: "fix", hint: `${clip(fix.cmd, 60)} passe` });
  const mr = d.game?.mr || term.some(c => /mr create|merge_request/.test(c.cmd));
  out.push(d.status === "done" ? { kind: mr ? "mr" : "done", hint: mr ? "la merge request est ouverte" : "mission livrée" } : { kind: "now", hint: clip(d.action || "en cours", 90) });
  return out.slice(0, 6);
}
const TEMPLATES = {
  ticket: m => [`${m.hint.split(" : ")[0]} tombe sur le bureau.`, "C'est parti ! 💪"],
  code: m => [m.n > 1 ? `${m.n} fichiers à retoucher.` : "Un fichier à retoucher.", `Allez, ${clip(m.file, 18)} !`],
  bug: () => ["Rien ne se passe comme prévu…", "Mais pourquoi ?! 😱"],
  question: () => ["Il faut l'avis du chef.", "Chef, on fait comment ?"],
  fix: () => ["Ça repasse au vert.", "Yes ! ✅"],
  mr: () => ["La merge request est ouverte.", "À la review ! 🔔"],
  done: () => ["Mission accomplie.", "Livré ✓"],
  now: () => ["À suivre…", "On y est presque."],
};

/* ---------- drawing ---------- */
const PW = 400, PH = 300, GUT = 16, HEAD = 74, FOOT = 34;
const SCENE = {  // backdrop colors, the dev's pose, the screen
  ticket: { bg: ["#ffe9a8", "#ffc94d"], pose: { arms: "down", hold: "ticket", smile: true }, desk: false },
  code: { bg: ["#cfe6ff", "#86b8ff"], pose: { seated: true, arms: "type" }, desk: true, screen: "#10243f", lines: "#7fd1ff" },
  bug: { bg: ["#ffc1c1", "#ff6b6b"], pose: { seated: true, arms: "up" }, desk: true, screen: "#3a0d14", lines: "#ff6b6b", fx: "!!" },
  question: { bg: ["#e2d4ff", "#a98bff"], pose: { arms: "down", rot: 1 }, chief: true },
  fix: { bg: ["#c9f7d5", "#51cf66"], pose: { seated: true, arms: "up", smile: true }, desk: true, screen: "#0d2a17", lines: "#7dff9a", fx: "✓" },
  mr: { bg: ["#ffe7b8", "#fbaa08"], pose: { arms: "up", smile: true }, chief: true, confetti: true, fx: "🔔" },
  done: { bg: ["#ffe7b8", "#fbaa08"], pose: { arms: "up", smile: true }, confetti: true, fx: "🎉" },
  now: { bg: ["#d9dde8", "#9aa3b5"], pose: { seated: true, arms: "type" }, desk: true, screen: "#10243f", lines: "#7fd1ff", fx: "…" },
};
const imgOf = url => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
const avatar = (look, o = {}) => imgOf(ART.isoavatar.url({ look: lookTraits(look), rot: o.rot || 0, frame: 0, seated: !!o.seated, arms: o.arms || "down", tux: !!o.tux, smile: !!o.smile, hat: o.hat || "", hold: o.hold || "", breath: 0, blink: false, talk: !!o.talk }));
function wrap(g, text, maxW) {
  const words = String(text).split(/\s+/), lines = [];
  let line = "";
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
// an avatar standing on (cx, foot): its box is 24 × 42 units around the feet, plus a unit of margin (svg/iso.js)
function put(g, img, cx, foot, S) { const h = 44 * S, w = h * img.naturalWidth / img.naturalHeight; g.drawImage(img, cx - w / 2, foot - (35 / 44) * h, w, h); }
function halftone(g, x, y, w, h, color) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = color; g.globalAlpha = 0.18;
  for (let j = 0; j < h; j += 10) for (let i = (j / 10) % 2 ? 5 : 0; i < w; i += 10) { const r = 1 + 2.2 * (j / h); g.beginPath(); g.arc(x + i, y + j, r, 0, 7); g.fill(); }
  g.restore();
}
async function panel(g, x, y, m, text, dev, chief) {
  const sc = SCENE[m.kind] || SCENE.now, [cap, say] = text;
  const grd = g.createLinearGradient(x, y, x, y + PH); grd.addColorStop(0, sc.bg[0]); grd.addColorStop(1, sc.bg[1]);
  g.fillStyle = grd; g.fillRect(x, y, PW, PH); halftone(g, x, y, PW, PH, "#000");
  g.fillStyle = "#00000022"; g.fillRect(x, y + PH * 0.72, PW, PH * 0.28);  // the floor
  const S = 4.2, A = await avatar(dev.look, { ...sc.pose, rot: sc.desk ? 1 : sc.pose.rot, tux: false }), cx = x + (sc.chief || sc.desk ? PW * 0.36 : PW * 0.5), foot = y + PH * 0.86;
  if (sc.desk) {  // the desk, its screen
    g.fillStyle = "#6d4a2e"; g.fillRect(x + PW * 0.18, y + PH * 0.62, PW * 0.64, 16); g.fillStyle = "#4b321f"; g.fillRect(x + PW * 0.22, y + PH * 0.62 + 16, 10, PH * 0.22); g.fillRect(x + PW * 0.74, y + PH * 0.62 + 16, 10, PH * 0.22);
    g.fillStyle = "#1b1b22"; g.fillRect(x + PW * 0.58, y + PH * 0.3, 112, 78); g.fillStyle = sc.screen; g.fillRect(x + PW * 0.58 + 6, y + PH * 0.3 + 6, 100, 64);
    g.fillStyle = sc.lines; for (let k = 0; k < 5; k++) g.fillRect(x + PW * 0.58 + 12 + (k % 2) * 8, y + PH * 0.3 + 14 + k * 11, 40 + ((k * 37) % 44), 4);
    g.fillStyle = "#1b1b22"; g.fillRect(x + PW * 0.58 + 50, y + PH * 0.3 + 78, 12, 12);
  }
  if (sc.desk) { g.fillStyle = "#2b2b33"; g.fillRect(cx - 34, foot - 58, 12, 58); g.fillRect(cx - 34, foot - 24, 56, 10); }  // the chair, seen from the side
  if (A) put(g, A, cx, foot, S);
  if (sc.chief && chief) { const C = await avatar(chief.look, { arms: m.kind === "mr" ? "up" : "down", tux: true, smile: true, rot: 3 }); if (C) put(g, C, x + PW * 0.66, foot, S); }
  if (sc.confetti) for (let k = 0; k < 40; k++) { g.fillStyle = ["#ff6b6b", "#51cf66", "#3bc4ff", "#fbaa08", "#b48cff"][k % 5]; g.fillRect(x + ((k * 97) % PW), y + 40 + ((k * 53) % (PH * 0.5)), 6, 10); }
  if (sc.fx) { g.font = `64px Bangers, Impact, sans-serif`; g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 6; g.textAlign = "center"; g.strokeText(sc.fx, x + PW * 0.82, y + PH * 0.32); g.fillText(sc.fx, x + PW * 0.82, y + PH * 0.32); g.textAlign = "left"; }
  // the caption, top left
  g.font = "bold 17px 'Comic Neue', 'Comic Sans MS', sans-serif";
  const cl = wrap(g, cap, PW - 40), cw = Math.min(PW - 16, Math.max(...cl.map(l => g.measureText(l).width)) + 20), ch = 12 + cl.length * 20;
  g.fillStyle = "#fff4b0"; g.fillRect(x + 8, y + 8, cw, ch); g.strokeStyle = "#111"; g.lineWidth = 2.5; g.strokeRect(x + 8, y + 8, cw, ch);
  g.fillStyle = "#111"; cl.forEach((l, i) => g.fillText(l, x + 18, y + 27 + i * 20));
  // the speech bubble, its tail to the dev's head
  g.font = "bold 18px 'Comic Neue', 'Comic Sans MS', sans-serif";
  const sl = wrap(g, say, 200), bw = Math.max(...sl.map(l => g.measureText(l).width)) + 28, bh = 16 + sl.length * 21;
  const bx = Math.min(x + PW - bw - 10, Math.max(x + 10, cx - bw / 2 + 40)), by = y + ch + 18;
  g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(bx, by, bw, bh, 18); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(bx + bw * 0.35, by + bh - 1); g.lineTo(cx + 4, foot - 32 * S); g.lineTo(bx + bw * 0.5, by + bh - 1); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.fillRect(bx + bw * 0.35 + 3, by + bh - 4, bw * 0.15 - 4, 5);
  g.fillStyle = "#111"; sl.forEach((l, i) => g.fillText(l, bx + 14, by + 24 + i * 21));
  g.strokeStyle = "#111"; g.lineWidth = 5; g.strokeRect(x, y, PW, PH);
}
async function draw(canvas, d, ms, texts, who) {
  await Promise.all(["24px Bangers", "bold 17px 'Comic Neue'"].map(f => document.fonts.load(f).catch(() => null)));
  const cols = ms.length <= 3 ? ms.length : ms.length === 4 ? 2 : 3, rows = Math.ceil(ms.length / cols), W = GUT + cols * (PW + GUT), H = HEAD + rows * (PH + GUT) + FOOT;
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fbf7ec"; g.fillRect(0, 0, W, H);
  g.font = "44px Bangers, Impact, sans-serif"; g.fillStyle = "#081746"; g.fillText(`LES AVENTURES DE ${who.toUpperCase()}`, GUT, 50);
  g.font = "bold 18px 'Comic Neue', sans-serif"; g.fillStyle = "#555"; g.textAlign = "right"; g.fillText(clip(`${d.ticket || ""} ${d.description || ""}`, 70), W - GUT, 46); g.textAlign = "left";
  const dev = { look: ents.get(d.id)?.look || { ...lookFor(who, d.type), team: true } }, chief = { look: hub.CHIEF_LOOK || lookFor(CHIEF_NAME, "chef") };
  for (let i = 0; i < ms.length; i++) await panel(g, GUT + (i % cols) * (PW + GUT), HEAD + Math.floor(i / cols) * (PH + GUT), ms[i], texts[i], dev, chief);
  g.font = "15px 'Comic Neue', sans-serif"; g.fillStyle = "#777"; g.fillText(`Agent Office · ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · ${specialty(d.type)}`, GUT, H - 12);
}

/* ---------- the album: every comic made, kept in this browser (IndexedDB; memory in the demo) ---------- */
// one per mission (the agent's id): made again later, it replaces the older one
const memAlbum = new Map();
let albumDb = null;
function adb() {
  if (DEMO || !("indexedDB" in window)) return null;
  albumDb ||= new Promise(res => { const r = indexedDB.open("office-comics", 1); r.onupgradeneeded = () => r.result.createObjectStore("comics", { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  return albumDb;
}
const req = r => new Promise(res => { r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
async function albumPut(rec) { const d = await adb(); if (!d) return memAlbum.set(rec.id, rec); await req(d.transaction("comics", "readwrite").objectStore("comics").put(rec)); }
async function albumAll() { const d = await adb(); return (d ? await req(d.transaction("comics").objectStore("comics").getAll()) || [] : [...memAlbum.values()]).sort((a, b) => b.t - a.t); }
async function albumDel(id) { const d = await adb(); if (!d) return memAlbum.delete(id); await req(d.transaction("comics", "readwrite").objectStore("comics").delete(id)); }

// a comic made from a mission, drawn aside, and filed in the album: { canvas, rec } (null when the mission is gone)
async function makeComic(id, onStep = () => {}) {
  const d = await fetchAgent(id).catch(() => null);
  if (!d) return null;
  const who = crew.ids[id] || specialty(d.type), ms = moments(d);
  let texts = ms.map(m => TEMPLATES[m.kind](m)), by = "textes génériques — active 🧠 DEVS BAVARDS pour des textes sur mesure";
  if (quipState.on && !DEMO) {
    onStep("Claude Haiku écrit les textes…");
    const cut = id.indexOf("|");
    try {
      const r = await (await fetch("/api/comic", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN },
        body: JSON.stringify({ s: id.slice(0, cut), a: id.slice(cut + 1), who, moments: ms.map(({ kind, hint }) => ({ kind, hint })) }) })).json();
      if (r.panels) { texts = r.panels.map(p => [p.caption, p.say]); by = "textes écrits par Claude Haiku"; }
    } catch (_) { /* the templates */ }
  }
  onStep("dessin en cours…");
  const canvas = document.createElement("canvas");
  await draw(canvas, d, ms, texts, who);
  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
  const rec = { id, who, ticket: d.ticket || "", mission: clip(d.description || "", 80), type: d.type, t: Date.now(), panels: ms.length, by, done: d.status === "done", blob };
  if (blob) await albumPut(rec);
  renderAlbum();
  return { canvas, rec };
}

/* ---------- the viewer ---------- */
const box = document.createElement("section");
box.id = "comic"; box.className = "overlay"; box.hidden = true; box.setAttribute("aria-label", "La BD de la mission");
box.innerHTML = `<div class="perfhead"><span>🎞️ LA BD DE LA MISSION <span class="muted" id="comic-src"></span></span>
  <button class="x" data-c="album" title="Toutes les BD">📚 Album</button><button class="x" data-c="copy" title="Copier l'image (à coller dans la MR ou sur Slack)">📋 Copier</button><button class="x" data-c="png" title="Enregistrer en PNG">⬇️ PNG</button><button class="x" data-c="close" title="Fermer (Échap)">×</button></div>
  <div class="comic-wrap"><canvas id="comic-cv" aria-label="BD de la mission"></canvas></div>`;
document.querySelector("main").append(box);
const cv = box.querySelector("#comic-cv"), src = box.querySelector("#comic-src");
let title = "mission";
box.addEventListener("click", async ev => {
  const c = ev.target.closest("[data-c]")?.dataset.c; if (!c) return;
  if (c === "close") return hub.openOverlay("comic", false);
  if (c === "album") return openAlbum();
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  if (c === "png") { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `bd-${title}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  if (c === "copy") try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("🎞️ BD", "Copiée ✓", "Colle-la dans la MR ou sur Slack."); } catch (_) { toast("🎞️ BD", "Copie impossible", "Le navigateur refuse : enregistre le PNG."); }
});
const label = rec => `${rec.who} · ${rec.panels} cases · ${new Date(rec.t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${rec.by}`;
async function show(image, rec) {
  cv.width = image.width; cv.height = image.height; cv.getContext("2d").drawImage(image, 0, 0);
  title = (rec.ticket || rec.who).replace(/[^\w-]+/g, "-"); src.textContent = label(rec);
}

// id: the office's agent id ("<session>|<agent>"); the last one asked for wins (each is drawn aside, then shown)
let openSeq = 0;
export async function openComic(id) {
  const my = ++openSeq;
  hub.openOverlay("comic", true); src.textContent = "dessin en cours…";
  const made = await makeComic(id, step => { if (my === openSeq) src.textContent = step; });
  if (my !== openSeq) return;
  if (!made) { const old = (await albumAll()).find(r => r.id === id); if (old) return openSaved(old); src.textContent = ""; return toast("🎞️ BD", "Mission introuvable", ""); }
  show(made.canvas, made.rec);
}
async function openSaved(rec) {
  const my = ++openSeq, bmp = await createImageBitmap(rec.blob).catch(() => null);
  if (!bmp || my !== openSeq) return;
  hub.openOverlay("comic", true); show(bmp, rec); bmp.close?.();
}
hub.openComic = openComic;
// a mission delivered (core/notify.js): its comic is made and filed in the album, and offered
hub.comicReady = async (id, who, ticket) => {
  const made = await makeComic(id).catch(() => null);
  hub.phoneBanner?.({ icon: "🎞️", title: `La BD de ${who} est dans l'album`, body: ticket ? `${ticket} : la mission en quelques cases` : "La mission en quelques cases", go: () => made ? openSaved(made.rec) : openComic(id) });
};

/* ---------- the album's page (🎞️ ALBUM in the menu, 📚 in the viewer) ---------- */
const albumBox = document.createElement("section");
albumBox.id = "album"; albumBox.className = "overlay"; albumBox.hidden = true; albumBox.setAttribute("aria-label", "Album des BD");
albumBox.innerHTML = `<div class="perfhead"><span>📚 L'ALBUM DES BD <span class="muted" id="album-n"></span></span><button class="x" data-a="close" title="Fermer (Échap)">×</button></div><div class="album-grid" id="album-grid"></div>`;
document.querySelector("main").append(albumBox);
const grid = albumBox.querySelector("#album-grid"), urls = [];
let shown = [];
async function renderAlbum() {
  if (albumBox.hidden) return;
  for (const u of urls.splice(0)) URL.revokeObjectURL(u);
  shown = await albumAll();
  albumBox.querySelector("#album-n").textContent = shown.length ? `${shown.length} BD · gardées dans ce navigateur` : "";
  grid.innerHTML = shown.length ? shown.map((r, k) => { const u = URL.createObjectURL(r.blob); urls.push(u);
    return `<figure class="acard"><button class="athumb" data-a="open" data-k="${k}" title="Ouvrir"><img src="${u}" alt="BD de ${esc(r.who)}"></button>
      <figcaption><b>${esc(r.who)}${r.ticket ? ` · ${esc(r.ticket)}` : ""}</b><span>${esc(r.mission)}</span><small>${new Date(r.t).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${r.done ? " · livrée ✓" : ""}</small></figcaption>
      <button class="adel" data-a="del" data-k="${k}" title="Retirer de l'album">🗑️</button></figure>`; }).join("")
    : `<p class="muted">Pas encore de BD. Elles arrivent à chaque mission livrée, ou avec 🎞️ BD sur la carte d'un dev.</p>`;
}
export async function openAlbum() { hub.openOverlay("album", true); await renderAlbum(); }
albumBox.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-a]"); if (!b) return;
  if (b.dataset.a === "close") return hub.openOverlay("album", false);
  const rec = shown[+b.dataset.k]; if (!rec) return;
  if (b.dataset.a === "open") return openSaved(rec);
  if (b.dataset.a === "del") { await albumDel(rec.id); renderAlbum(); }
});
hub.openAlbum = openAlbum;
document.getElementById("albumbtn").onclick = () => openAlbum();
