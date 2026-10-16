// ChiefOS → 💻 Terminal: real shells (office/terminal.py: a pseudo-terminal per tab, in a folder of your home), drawn by
// a small VT100/xterm emulator written here (no third-party script on a page that can run a shell): colours (16, 256,
// 24-bit), cursor moves, erasing, scroll regions, the alternate screen (vim, htop, claude's interface), bracketed paste.
// The page reads the output with a long poll and sends the keys; the shells keep running across page reloads.

import { hub, provide } from "../hub.js";
import { clip } from "../core/core.js";
import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { osApp, osBox, osOverview } from "../ui/chiefos.js";

/* ---------- the emulator ---------- */
const VT_BASE = ["#2e3436", "#cc0000", "#4e9a06", "#c4a000", "#3465a4", "#75507b", "#06989a", "#d3d7cf", "#555753", "#ef2929", "#8ae234", "#fce94f", "#729fcf", "#ad7fa8", "#34e2e2", "#eeeeec"];
function vtColor(n) {
  if (n < 16) return VT_BASE[n];
  if (n < 232) { const v = [0, 95, 135, 175, 215, 255], i = n - 16; return `rgb(${v[Math.floor(i / 36)]},${v[Math.floor(i / 6) % 6]},${v[i % 6]})`; }
  const g = 8 + (n - 232) * 10; return `rgb(${g},${g},${g})`;
}
class VT {
  constructor(rows, cols, reply) { this.reply = reply; this.resize(rows, cols, true); }
  blank() { return { ch: " ", fg: null, bg: null, b: 0, i: 0, u: 0, inv: 0, dim: 0 }; }
  line() { return Array.from({ length: this.cols }, () => this.blank()); }
  resize(rows, cols, init = false) {
    const fit = buf => { const out = (buf || []).slice(-rows).map(l => l.slice(0, cols).concat(Array.from({ length: Math.max(0, cols - l.length) }, () => this.blank()))); while (out.length < rows) out.push(Array.from({ length: cols }, () => this.blank())); return out; };
    this.rows = rows; this.cols = cols;
    if (init) { this.main = null; this.alt = null; this.history = []; this.x = this.y = 0; this.attr = this.blank(); this.saved = null; this.mode = { cursor: true, app: false, paste: false, wrap: true }; this.state = 0; this.seq = ""; this.wrapNext = false; this.newHistory = []; }
    this.main = fit(this.main); this.alt = fit(this.alt); this.buf = this.onAlt ? this.alt : this.main;
    this.top = 0; this.bot = rows - 1; this.x = Math.min(this.x, cols - 1); this.y = Math.min(this.y, rows - 1);
  }
  scrollUp(n = 1) {
    for (let k = 0; k < n; k++) {
      const gone = this.buf.splice(this.top, 1)[0];
      if (this.buf === this.main && this.top === 0) { this.history.push(gone); this.newHistory.push(gone); if (this.history.length > 3000) this.history.shift(); }
      this.buf.splice(this.bot, 0, this.line());
    }
  }
  scrollDown(n = 1) { for (let k = 0; k < n; k++) { this.buf.splice(this.bot, 1); this.buf.splice(this.top, 0, this.line()); } }
  lf() { if (this.y === this.bot) this.scrollUp(); else if (this.y < this.rows - 1) this.y++; }
  put(ch) {
    if (this.wrapNext && this.mode.wrap) { this.x = 0; this.lf(); }
    this.wrapNext = false;
    this.buf[this.y][this.x] = { ...this.attr, ch };
    if (this.x >= this.cols - 1) this.wrapNext = true; else this.x++;
  }
  erase(row, from, to) { for (let c = from; c < to; c++) this.buf[row][c] = { ...this.blank(), bg: this.attr.bg }; }
  write(text) {
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (this.state === 0) {
        if (c === 27) { this.state = 1; continue; }
        if (c === 13) { this.x = 0; this.wrapNext = false; } else if (c === 10 || c === 11 || c === 12) { this.lf(); this.wrapNext = false; }
        else if (c === 8) { this.x = Math.max(0, this.x - 1); this.wrapNext = false; } else if (c === 9) this.x = Math.min(this.cols - 1, (Math.floor(this.x / 8) + 1) * 8);
        else if (c >= 32 && c !== 127) this.put(ch);
      } else if (this.state === 1) {  // after ESC
        this.state = 0;
        if (ch === "[") { this.state = 2; this.seq = ""; } else if (ch === "]") { this.state = 3; this.seq = ""; }
        else if (ch === "(" || ch === ")" || ch === "*" || ch === "+") this.state = 4;
        else if (ch === "7") this.saved = { x: this.x, y: this.y, attr: { ...this.attr } }; else if (ch === "8" && this.saved) Object.assign(this, { x: this.saved.x, y: this.saved.y, attr: { ...this.saved.attr } });
        else if (ch === "M") { if (this.y === this.top) this.scrollDown(); else this.y = Math.max(0, this.y - 1); } else if (ch === "D") this.lf(); else if (ch === "E") { this.x = 0; this.lf(); }
        else if (ch === "c") this.resize(this.rows, this.cols, true);
      } else if (this.state === 2) {  // CSI
        if (c >= 0x40 && c <= 0x7e) { this.state = 0; this.csi(ch, this.seq); } else this.seq += ch;
      } else if (this.state === 3) {  // OSC, until BEL or ESC \
        if (c === 7 || (ch === "\\" && this.seq.endsWith("\x1b"))) { this.state = 0; const m = this.seq.match(/^[02];([^\x1b]*)/); if (m) this.title = m[1]; } else this.seq += ch;
      } else this.state = 0;  // charset designation: one character, ignored
    }
  }
  csi(f, raw) {
    const priv = /^[?>=]/.test(raw) ? raw[0] : "", p = raw.replace(/^[?>=]/, "").split(";").map(v => parseInt(v, 10)), n = (i, d = 1) => (p[i] > 0 ? p[i] : d);
    const clampY = () => { this.y = Math.max(0, Math.min(this.rows - 1, this.y)); }, clampX = () => { this.x = Math.max(0, Math.min(this.cols - 1, this.x)); };
    this.wrapNext = false;
    switch (f) {
      case "A": this.y -= n(0); clampY(); break; case "B": case "e": this.y += n(0); clampY(); break;
      case "C": case "a": this.x += n(0); clampX(); break; case "D": this.x -= n(0); clampX(); break;
      case "E": this.y += n(0); this.x = 0; clampY(); break; case "F": this.y -= n(0); this.x = 0; clampY(); break;
      case "G": case "`": this.x = n(0) - 1; clampX(); break; case "d": this.y = n(0) - 1; clampY(); break;
      case "H": case "f": this.y = n(0) - 1; this.x = n(1) - 1; clampY(); clampX(); break;
      case "J": { const m = p[0] || 0;
        if (m === 0) { this.erase(this.y, this.x, this.cols); for (let r = this.y + 1; r < this.rows; r++) this.erase(r, 0, this.cols); }
        else if (m === 1) { this.erase(this.y, 0, this.x + 1); for (let r = 0; r < this.y; r++) this.erase(r, 0, this.cols); }
        else { for (let r = 0; r < this.rows; r++) this.erase(r, 0, this.cols); if (m === 3) this.history = []; } break; }
      case "K": { const m = p[0] || 0; this.erase(this.y, m === 0 ? this.x : 0, m === 1 ? this.x + 1 : this.cols); break; }
      case "L": if (this.y >= this.top && this.y <= this.bot) for (let k = 0; k < n(0); k++) { this.buf.splice(this.bot, 1); this.buf.splice(this.y, 0, this.line()); } break;
      case "M": if (this.y >= this.top && this.y <= this.bot) for (let k = 0; k < n(0); k++) { this.buf.splice(this.y, 1); this.buf.splice(this.bot, 0, this.line()); } break;
      case "P": { const row = this.buf[this.y]; row.splice(this.x, n(0)); while (row.length < this.cols) row.push(this.blank()); break; }
      case "@": { const row = this.buf[this.y]; row.splice(this.x, 0, ...Array.from({ length: n(0) }, () => this.blank())); row.length = this.cols; break; }
      case "X": this.erase(this.y, this.x, Math.min(this.cols, this.x + n(0))); break;
      case "S": this.scrollUp(n(0)); break; case "T": if (!priv) this.scrollDown(n(0)); break;
      case "r": this.top = Math.max(0, n(0) - 1); this.bot = Math.min(this.rows - 1, n(1, this.rows) - 1); if (this.top >= this.bot) { this.top = 0; this.bot = this.rows - 1; } this.x = 0; this.y = 0; break;
      case "s": this.saved = { x: this.x, y: this.y, attr: { ...this.attr } }; break; case "u": if (this.saved) Object.assign(this, { x: this.saved.x, y: this.saved.y }); break;
      case "m": this.sgr(raw === "" ? [0] : p.map(v => (Number.isNaN(v) ? 0 : v))); break;
      case "n": if (p[0] === 6) this.reply(`\x1b[${this.y + 1};${this.x + 1}R`); else if (p[0] === 5) this.reply("\x1b[0n"); break;
      case "c": if (!priv) this.reply("\x1b[?1;2c"); break;
      case "h": case "l": if (priv === "?") for (const m of p) {
        const on = f === "h";
        if (m === 25) this.mode.cursor = on; else if (m === 1) this.mode.app = on; else if (m === 2004) this.mode.paste = on; else if (m === 7) this.mode.wrap = on;
        else if (m === 1049 || m === 47 || m === 1047) {
          if (on && !this.onAlt) { this.savedMain = { x: this.x, y: this.y }; this.onAlt = true; this.alt = Array.from({ length: this.rows }, () => this.line()); this.buf = this.alt; this.x = this.y = 0; }
          else if (!on && this.onAlt) { this.onAlt = false; this.buf = this.main; if (this.savedMain) Object.assign(this, this.savedMain); }
          this.top = 0; this.bot = this.rows - 1;
        }
      } break;
    }
  }
  sgr(p) {
    for (let i = 0; i < p.length; i++) {
      const v = p[i], a = this.attr;
      if (v === 0) this.attr = this.blank(); else if (v === 1) a.b = 1; else if (v === 2) a.dim = 1; else if (v === 3) a.i = 1; else if (v === 4) a.u = 1; else if (v === 7) a.inv = 1;
      else if (v === 22) { a.b = 0; a.dim = 0; } else if (v === 23) a.i = 0; else if (v === 24) a.u = 0; else if (v === 27) a.inv = 0;
      else if (v >= 30 && v <= 37) a.fg = vtColor(v - 30); else if (v >= 90 && v <= 97) a.fg = vtColor(v - 82); else if (v === 39) a.fg = null;
      else if (v >= 40 && v <= 47) a.bg = vtColor(v - 40); else if (v >= 100 && v <= 107) a.bg = vtColor(v - 92); else if (v === 49) a.bg = null;
      else if (v === 38 || v === 48) {
        const c = p[i + 1] === 5 ? vtColor(p[i + 2] || 0) : p[i + 1] === 2 ? `rgb(${p[i + 2] || 0},${p[i + 3] || 0},${p[i + 4] || 0})` : null;
        i += p[i + 1] === 5 ? 2 : p[i + 1] === 2 ? 4 : 0;
        if (v === 38) a.fg = c; else a.bg = c;
      }
    }
  }
}
// one line of cells → HTML runs of identical attributes
function vtLineHtml(cells, cursorX = -1) {
  let out = "", run = "", key = null;
  const style = c => { let fg = c.fg, bg = c.bg; if (c.inv) [fg, bg] = [bg || "#eeeeec", fg || "#300a24"]; return `${fg ? `color:${fg};` : ""}${bg ? `background:${bg};` : ""}${c.b ? "font-weight:700;" : ""}${c.i ? "font-style:italic;" : ""}${c.u ? "text-decoration:underline;" : ""}${c.dim ? "opacity:.7;" : ""}`; };
  const flush = () => { if (run) out += key ? `<span style="${key}">${run}</span>` : run; run = ""; };
  cells.forEach((c, x) => {
    const st = style(c), ch = c.ch === "<" ? "&lt;" : c.ch === "&" ? "&amp;" : c.ch === ">" ? "&gt;" : c.ch;
    if (x === cursorX) { flush(); key = null; out += `<span class="tcur">${ch}</span>`; return; }
    if (st !== key) { flush(); key = st; }
    run += ch;
  });
  flush();
  return out.replace(/\s+$/, m => m.length ? " " : "");
}

/* ---------- sessions: a tab per shell ---------- */
const terms = new Map();  // id → { vt, since, cwd, alive, decoder, pending, timer, polling }
export let termActive = null, termAvail = null, termTargets = null, termMsg = "";
const termHeaders = () => ({ "Content-Type": "application/json", "X-Office-Token": TOKEN });
async function termApi(path, body) {
  const res = await fetch(`/api/term/${path}`, body ? { method: "POST", headers: termHeaders(), body: JSON.stringify(body) } : { headers: { "X-Office-Token": TOKEN } });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
  return out;
}
function termSize() {
  const el = osBox.querySelector(".termscreen"); if (!el) return { rows: 30, cols: 100 };
  const probe = osBox.querySelector(".termprobe"), w = probe?.getBoundingClientRect().width / 10 || 8, h = probe?.getBoundingClientRect().height || 17;
  return { rows: Math.max(8, Math.floor((el.clientHeight - 16) / h)), cols: Math.max(20, Math.floor((el.clientWidth - 20) / w)) };
}
function addTerm(id, cwd, alive = true) {
  const { rows, cols } = termSize();
  const t = { vt: null, since: 0, cwd, alive, decoder: new TextDecoder("utf-8"), pending: "", timer: 0, polling: false };
  t.vt = new VT(rows, cols, data => termSend(id, data));
  terms.set(id, t);
  pollTerm(id);
  return t;
}
async function pollTerm(id) {
  const t = terms.get(id); if (!t || t.polling) return;
  t.polling = true;
  while (terms.has(id)) {
    try {
      const r = await termApi(`read?id=${encodeURIComponent(id)}&since=${t.since}`);
      t.since = r.next; t.alive = r.alive;
      if (r.data) { const bytes = Uint8Array.from(atob(r.data), c => c.charCodeAt(0)); t.vt.write(t.decoder.decode(bytes, { stream: true })); if (id === termActive) drawTerm(); }
      if (!r.alive) { t.vt.write("\r\n\x1b[2m[processus terminé]\x1b[0m\r\n"); if (id === termActive) drawTerm(); break; }
      if (osBox.hidden || osApp !== "terminal") await new Promise(res => setTimeout(res, 1500));  // nobody looks: slower
    } catch (err) { if (/inconnu/.test(err.message)) { t.alive = false; break; } await new Promise(res => setTimeout(res, 2000)); }
  }
  t.polling = false;
}
function termSend(id, data) {
  const t = terms.get(id); if (!t || !t.alive) return;
  t.pending += data;
  clearTimeout(t.timer);
  t.timer = setTimeout(() => { const d = t.pending; t.pending = ""; termApi("input", { id, data: d }).catch(err => { termMsg = err.message; drawTerm(); }); }, 8);
}
async function openTerm(cwd) {
  try {
    const { rows, cols } = termSize();
    const out = await termApi("open", { cwd, rows, cols });
    addTerm(out.id, out.cwd); termActive = out.id; termMsg = "";
  } catch (err) { termMsg = err.message; }
  renderTermApp();
}
async function closeTerm(id) { terms.delete(id); try { await termApi("close", { id }); } catch (_) { /* already gone */ } if (termActive === id) termActive = [...terms.keys()].at(-1) || null; renderTermApp(); }
let lastTermSize = "";
function fitTerm() {
  const t = terms.get(termActive); if (!t) return;
  const { rows, cols } = termSize(), key = `${rows}x${cols}`;
  if (key === lastTermSize && t.vt.rows === rows && t.vt.cols === cols) return;
  lastTermSize = key; t.vt.resize(rows, cols); termApi("resize", { id: termActive, rows, cols }).catch(() => {}); drawTerm();
}

/* ---------- drawing and keys ---------- */
function drawTerm() {
  const el = osBox.querySelector(".termscreen"), t = terms.get(termActive); if (!el || !t) return;
  const hist = el.querySelector(".termhist"), scr = el.querySelector(".termrows"), atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  if (t.vt.newHistory.length && !t.vt.onAlt) { hist.insertAdjacentHTML("beforeend", t.vt.newHistory.map(l => `<div>${vtLineHtml(l) || " "}</div>`).join("")); t.vt.newHistory = []; while (hist.childElementCount > 3000) hist.firstElementChild.remove(); }
  hist.hidden = t.vt.onAlt;
  scr.innerHTML = t.vt.buf.map((l, y) => `<div>${vtLineHtml(l, y === t.vt.y && t.vt.mode.cursor && document.activeElement === el ? t.vt.x : -1) || " "}</div>`).join("");
  if (atBottom) el.scrollTop = el.scrollHeight;
  const tab = osBox.querySelector(`[data-term-tab="${termActive}"] .tt`); if (tab && t.vt.title) tab.textContent = clip(t.vt.title, 28);
}
const KEYS = { Enter: "\r", Backspace: "\x7f", Tab: "\t", Escape: "\x1b", Delete: "\x1b[3~", Insert: "\x1b[2~", PageUp: "\x1b[5~", PageDown: "\x1b[6~",
  F1: "\x1bOP", F2: "\x1bOQ", F3: "\x1bOR", F4: "\x1bOS", F5: "\x1b[15~", F6: "\x1b[17~", F7: "\x1b[18~", F8: "\x1b[19~", F9: "\x1b[20~", F10: "\x1b[21~", F11: "\x1b[23~", F12: "\x1b[24~" };
function keyData(ev, t) {
  const arrows = { ArrowUp: "A", ArrowDown: "B", ArrowRight: "C", ArrowLeft: "D", Home: "H", End: "F" };
  if (arrows[ev.key]) return ev.ctrlKey ? `\x1b[1;5${arrows[ev.key]}` : `${t.vt.mode.app ? "\x1bO" : "\x1b["}${arrows[ev.key]}`;
  if (ev.key === "Tab" && ev.shiftKey) return "\x1b[Z";
  if (KEYS[ev.key]) return (ev.altKey ? "\x1b" : "") + KEYS[ev.key];
  if (ev.ctrlKey && !ev.altKey && ev.key.length === 1) {
    if (ev.shiftKey && /^[cv]$/i.test(ev.key)) return null;  // Ctrl+Shift+C / V: the browser's copy and paste
    const k = ev.key.toLowerCase(), code = k.charCodeAt(0);
    if (code >= 97 && code <= 122) return String.fromCharCode(code - 96);
    return { " ": "\x00", "[": "\x1b", "\\": "\x1c", "]": "\x1d", "/": "\x1f" }[k] ?? null;
  }
  if (ev.key.length === 1 && !ev.metaKey) return (ev.altKey ? "\x1b" : "") + ev.key;
  return null;
}
OsApp.listen("terminal", "keydown", ev => {
  const el = ev.target.closest?.(".termscreen"); if (!el) return;
  const t = terms.get(termActive); if (!t) return;
  const d = keyData(ev, t); if (d == null) return;
  ev.preventDefault(); ev.stopPropagation();
  el.scrollTop = el.scrollHeight;
  if (d === "\r" && hub.runCheat(t.line || screenCommand(t))) { t.line = ""; termSend(termActive, "\x15"); return; }  // the line is erased, not run
  t.line = typedLine(t.line ?? "", d);
  termSend(termActive, d);
});
// the command on the cursor's row, as the screen shows it (after the shell's prompt: ❯ $ # % » ›, a frame): what was typed
// even through the history, completion or a paste
function screenCommand(t) {
  const row = t.vt.buf[t.vt.y] || [], text = row.slice(0, t.vt.x).map(c => c.ch || " ").join("");
  return text.replace(/^.*[❯$#%»›➜]\s+/, "").replace(/^[^\p{L}\p{N}]+/u, "").trim();  // and the prompt's frame (╰─ …)
}
// the line being typed, as far as the page can tell: null once it cannot (arrows, history, completion, a paste)
function typedLine(line, d) {
  if (line === null) return d === "\r" || d === "\x03" || d === "\x15" ? "" : null;
  if (d === "\r" || d === "\x03" || d === "\x15") return "";
  if (d === "\x7f") return line.slice(0, -1);
  return d.length === 1 && d >= " " ? line + d : null;
}
OsApp.listen("terminal", "paste", ev => {
  if (!ev.target.closest?.(".termscreen")) return;
  const t = terms.get(termActive); if (!t) return;
  ev.preventDefault();
  const text = ev.clipboardData.getData("text").replace(/\r?\n/g, "\r");
  t.line = null;
  termSend(termActive, t.vt.mode.paste ? `\x1b[200~${text}\x1b[201~` : text);
});
OsApp.listen("terminal", "focusin", ev => { if (ev.target.closest?.(".termscreen")) drawTerm(); });
OsApp.listen("terminal", "focusout", ev => { if (ev.target.closest?.(".termscreen")) setTimeout(drawTerm, 0); });

/* ---------- the app ---------- */
function terminalAppHtml() {
  if (termAvail === null) { termInit(); return `<p class="muted">Ouverture…</p>`; }
  if (!termAvail) return `<div class="osrow"><b>💻 Terminal</b><span class="muted">${DEMO ? "Pas de terminal en mode démo." : "Indisponible sur ce système (Windows : pas de pseudo-terminal). Linux et macOS seulement."}</span></div>`;
  const tabs = [...terms.entries()].map(([id, t]) => `<div class="termtab${id === termActive ? " on" : ""}" data-term-tab="${id}"><span class="tt">${esc(t.cwd.split("/").pop() || "~")}</span>${t.alive ? "" : " ✝"}<button data-term-close="${id}" title="Fermer">×</button></div>`).join("");
  const targets = termTargets || [];
  return `<div class="termapp"><div class="termbar">${tabs}<select class="termcwd" aria-label="Dossier">${targets.map(t => `<option value="${esc(t.path)}">${esc(t.kind === "global" ? "~ (dossier personnel)" : t.label)}</option>`).join("")}</select><button data-term="new" title="Nouveau terminal dans ce dossier">＋ Terminal</button>
      ${termActive ? `<span class="termquick"><button data-term-type="claude\r" title="Lancer Claude Code ici">✳ claude</button><button data-term-type="git status\r">git status</button><button data-term-type="clear\r">clear</button></span>` : ""}<span class="muted termmsg">${esc(termMsg)}</span></div>
    ${termActive ? `<div class="termscreen" tabindex="0" contenteditable="false" spellcheck="false"><div class="termhist"></div><div class="termrows"></div></div>` : `<div class="termempty"><div class="brbig">💻</div><p>Choisis un dossier et ouvre un terminal.</p><p class="muted">Ton shell (${esc((navigator.platform || "").includes("Mac") ? "zsh" : "bash")}…), dans ce dossier, avec tes droits. Les terminaux continuent de tourner si tu fermes ChiefOS ou recharges la page.</p></div>`}
    <span class="termprobe">MMMMMMMMMM</span></div>`;
}
async function termInit() {
  if (DEMO) { termAvail = false; return renderTermApp(); }
  try {
    const [st, tg] = await Promise.all([termApi("list"), termTargets ? Promise.resolve(termTargets) : fetch("/api/blueprint/targets").then(r => r.json())]);
    termAvail = st.available; termTargets = tg;
    for (const s of st.sessions) if (!terms.has(s.id)) addTerm(s.id, s.cwd, s.alive);  // shells still running since the last visit
    termActive = termActive || [...terms.keys()].at(-1) || null;
  } catch (err) { termAvail = false; termMsg = err.message; }
  renderTermApp();
}
function renderTermApp() {
  const app = osBox.querySelector(".osapp"); if (!app || osApp !== "terminal" || osOverview) return;
  app.innerHTML = terminalAppHtml(); mountTerminal();
}
function mountTerminal() {
  const el = osBox.querySelector(".termscreen"); if (!el) return;
  const t = terms.get(termActive);
  if (t) { el.querySelector(".termhist").innerHTML = t.vt.history.slice(-1500).map(l => `<div>${vtLineHtml(l) || " "}</div>`).join(""); t.vt.newHistory = []; }
  lastTermSize = ""; fitTerm(); drawTerm(); el.focus();
}
OsApp.listen("terminal", "click", ev => {
  if (!ev.target.closest?.(".termapp")) return;
  const tab = ev.target.closest("[data-term-tab]"), b = ev.target.closest("button");
  if (b?.dataset.termClose) { ev.stopPropagation(); return closeTerm(b.dataset.termClose); }
  if (b?.dataset.term === "new") return openTerm(osBox.querySelector(".termcwd").value);
  if (b?.dataset.termType && termActive) { termSend(termActive, b.dataset.termType); return osBox.querySelector(".termscreen")?.focus(); }
  if (tab) { termActive = tab.dataset.termTab; return renderTermApp(); }
});
addEventListener("resize", () => { if (osApp === "terminal" && !osBox.hidden) fitTerm(); });
new ResizeObserver(() => { if (osApp === "terminal" && !osBox.hidden) fitTerm(); }).observe(document.getElementById("chiefos"));

class TerminalApp extends OsApp {
  constructor() { super("terminal", "💻", "Terminal", "#300a24"); }
  render() { return terminalAppHtml(); }
  mount() { mountTerminal(); }  // the shells' screens
}
new TerminalApp();

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get termTargets() { return termTargets; }, set termTargets(v) { termTargets = v; } });
