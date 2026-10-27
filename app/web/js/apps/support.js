// ChiefOS → 🆘 Support: the messages of a Slack channel (the support one), read-only, through the server (office/slack.py:
// the bot token stays there, entered in ChiefOS → Réglages). Who wrote, when, the text, its thread and reactions, a
// link to open it in Slack. A badge counts the new ones; a new message pops up (toast) even when the app is closed.

import { esc } from "../core/data.js";
import { hub } from "../hub.js";
import { OsApp } from "./base.js";
import { osApp, renderChiefOs } from "../ui/chiefos.js";
import { sfx, toast } from "../sims/progress.js";

let st = null, data = null, err = "", busy = false, msg = "", draft = { token: "", channel: "" }, notified = 0, loading = false;
let seen = 0;
try { seen = +localStorage.getItem("office-support-seen") || 0; } catch (_) { /* storage blocked */ }
const demo = () => typeof DEMO !== "undefined" && DEMO;
const get = what => fetch(`/api/slack/${what}`, { headers: { "X-Office-Token": TOKEN } }).then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.error || `HTTP ${r.status}`); return b; });
const REACT = { eyes: "👀", white_check_mark: "✅", heavy_check_mark: "✔️", "+1": "👍", thumbsup: "👍", heart: "❤️", fire: "🔥", tada: "🎉", raised_hands: "🙌", pray: "🙏",
  rocket: "🚀", warning: "⚠️", x: "❌", joy: "😂", sob: "😭", eyes_closed: "😑", point_up: "☝️", ok_hand: "👌", bug: "🐛", rotating_light: "🚨", hourglass: "⏳", white_circle: "⚪" };

async function loadStatus() { try { st = await get("status"); } catch (e) { st = { configured: false, error: e.message }; } }
async function loadMessages(quiet = false) {
  if (loading || !st?.configured) return;
  loading = true;
  try {
    data = await get("messages"); err = "";
    const fresh = data.messages.filter(m => m.t > Math.max(seen, notified));
    if (fresh.length && notified && !(osApp === "support" && !hub.osBox?.hidden)) {  // not at the first load: what came since
      const last = fresh.at(-1);
      toast("🆘 SUPPORT", `#${data.channel} · ${last.name}`, last.text.slice(0, 90)); sfx("commit");
    }
    notified = Math.max(notified, ...data.messages.map(m => m.t), 1);
  } catch (e) { err = e.message; } finally { loading = false; }
  if (!quiet && osApp === "support") renderChiefOs();
}
const markSeen = () => { if (!data?.messages.length) return; seen = Math.max(seen, ...data.messages.map(m => m.t)); try { localStorage.setItem("office-support-seen", String(seen)); } catch (_) { /* storage blocked */ } };

// Slack's text, readable and safe: escaped first, then *bold*, _italic_, `code`, links
function rich(text) {
  return esc(text).replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/(^|\s)\*([^*\n]+)\*/g, "$1<b>$2</b>").replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>")
    .replace(/https?:\/\/[^\s<)"]+/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u.length > 50 ? `${u.slice(0, 47)}…` : u}</a>`).replace(/\n/g, "<br>");
}
const when = t => { const d = new Date(t * 1000), today = new Date().toDateString() === d.toDateString(); return today ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };

function html() {
  if (demo()) return `<p class="muted">Pas de Slack en mode démo.</p>`;
  if (!st) { loadStatus().then(() => { loadMessages(); renderChiefOs(); }); return `<p class="muted osloading" role="status">Chargement…</p>`; }
  if (!st.configured) return `<div class="osempty"><span class="osemptyic" aria-hidden="true">🆘</span><b>Aucun channel de support relié</b><span>Relie ton channel Slack de support pour voir ses messages ici.</span><div class="osacts"><button class="primary" data-os-app="settings" data-os-section="links">Relier Slack</button></div></div>`;
  if (!data && !err) { loadMessages(); return `<p class="muted osloading" role="status">Chargement de #${esc(st.channel)}…</p>`; }
  const list = (data?.messages || []).map(m => `<div class="supmsg${m.t > seen ? " new" : ""}"><span class="av${m.bot ? " bot" : ""}">${m.bot ? "🤖" : esc(m.name.slice(0, 1).toUpperCase())}</span>
      <div><div class="who"><b>${esc(m.name)}</b><small>${when(m.t)}</small>${m.link ? `<a href="${esc(m.link)}" target="_blank" rel="noopener noreferrer" title="Ouvrir dans Slack">↗</a>` : ""}</div>
      <div class="txt">${rich(m.text) || '<span class="muted">(pièce jointe)</span>'}</div>
      ${m.files.length ? `<div class="muted">📎 ${m.files.map(esc).join(" · ")}</div>` : ""}
      ${m.replies || m.reactions.length ? `<div class="meta">${m.replies ? `<span>💬 ${m.replies} réponse${m.replies > 1 ? "s" : ""}</span>` : ""}${m.reactions.map(r => `<span>${REACT[r.name] || `:${esc(r.name)}:`} ${r.count}</span>`).join("")}</div>` : ""}</div></div>`).join("");
  return `<div class="suphead"><b>#${esc(data?.channel || st.channel)}</b><span class="muted">${esc(data?.team || st.team)} · lecture seule · mis à jour ${data ? new Date(data.at * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</span><button data-sup="reload">↻</button></div>
    ${err ? `<p class="err">⚠️ ${esc(err)}</p>` : ""}
    <div class="suplist" id="suplist">${list || `<p class="muted">Aucun message récent.</p>`}</div>`;
}

class SupportApp extends OsApp {
  constructor() { super("support", "🆘", "Support", "#e0457e", { live: true }); }
  render() { const h = html(); markSeen(); return h; }
  mount() { const l = document.getElementById("suplist"); if (l) l.scrollTop = l.scrollHeight; }
  badge() { return data ? data.messages.filter(m => m.t > seen).length : 0; }
  click(b) {
    if (b.dataset.sup === "reload") { data = null; err = ""; renderChiefOs(); return true; }
    return false;
  }
}
new SupportApp();

/* ---------- ChiefOS → Réglages: the token and the channel ---------- */
export function supportSettingsHtml() {
  const s = st || {};
  if (!st) loadStatus().then(() => { if (osApp === "settings") renderChiefOs(); });
  return `<h4>SLACK · SUPPORT</h4>
    <div class="osrow"><b>État</b><span>${s.error ? `<span class="s-blocked">${esc(s.error)}</span>` : s.configured ? `✅ #${esc(s.channel)} sur ${esc(s.team)} (bot @${esc(s.bot)})` : "non relié"}</span><span>${s.configured ? `<button data-sl="forget">Oublier</button>` : ""}</span></div>
    <div class="osrow"><b>Token du bot</b><span><input id="sl-token" type="password" autocomplete="off" value="${esc(draft.token)}" placeholder="${s.configured ? "•••••• enregistré (laisser vide pour le garder)" : "xoxb-…"}" aria-label="Token Slack"></span><span><a href="https://api.slack.com/apps" target="_blank" rel="noopener">Créer une app Slack ↗</a></span></div>
    <div class="osrow"><b>Channel</b><span><input id="sl-channel" value="${esc(draft.channel || (s.configured ? `#${s.channel}` : ""))}" placeholder="#support ou C0123456789" aria-label="Channel Slack"></span><span></span></div>
    <div class="osacts"><button data-sl="save" class="ubok"${busy ? " disabled" : ""}>${busy ? "Vérification…" : "Enregistrer et tester"}</button><span class="muted">${esc(msg)}</span></div>
    <p class="muted">Lecture seule : rien n'est jamais envoyé dans Slack. Droits du bot : <b>channels:history</b> (<b>groups:history</b> pour un channel privé), <b>channels:read</b> / <b>groups:read</b>, <b>users:read</b> ; puis invite-le dans le channel (<code>/invite @ton-bot</code>). Le token reste sur cette machine (<code>~/.claude/agent-office/slack.json</code>, lisible par toi seul) : la page ne le revoit jamais et il n'est pas dans la sauvegarde.</p>`;
}
export async function slackClick(b) {
  const act = b.dataset.sl; if (!act) return false;
  if (act === "save") { draft.token = document.getElementById("sl-token")?.value || ""; draft.channel = document.getElementById("sl-channel")?.value || ""; }
  busy = true; msg = ""; renderChiefOs();
  try {
    const r = await fetch("/api/slack/config", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(act === "forget" ? { forget: true } : { token: draft.token, channel: draft.channel }) });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    st = body; data = null; draft = { token: "", channel: "" }; msg = act === "forget" ? "Slack oublié." : `✅ #${body.channel} relié : les messages sont dans ChiefOS → Support.`;
    if (st.configured) loadMessages(true);
  } catch (e) { msg = `⚠️ ${e.message}`; } finally { busy = false; renderChiefOs(); }
  return true;
}

// in the background: new messages every minute (a badge, a toast), only when Slack is linked
setTimeout(async () => { if (demo()) return; await loadStatus(); loadMessages(true); }, 3000);
setInterval(() => { if (!demo() && st?.configured) loadMessages(true); }, 60000);
