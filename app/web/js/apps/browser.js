// ChiefOS → 🌐 Navigateur, Firefox style: tabs, back / forward / reload / home, an address bar (an address or a search),
// bookmarks (☆), and a home page with a search field and tiles. Pages are shown in a sandboxed frame; many sites forbid
// being shown inside another page (GitLab, GitHub, Google…): the server checks the headers first (/api/framecheck) and
// such a site gets a card to open it in a real browser tab instead. No proxy: a third-party page never runs on this
// origin (it could read the office's token).

import { CHIEF_NAME, data } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { esc } from "../core/data.js";
import { clockNow } from "../sims/days.js";
import { OsApp } from "./base.js";
import { osBox } from "../ui/chiefos.js";
import { glStatus } from "../ui/gitlab.js";

// search engines that accept being shown in a frame (DuckDuckGo, Mojeek… refuse it)
const BR_ENGINES = { google: ["Google", q => `https://www.google.com/search?igu=1&q=${encodeURIComponent(q)}`], bing: ["Bing", q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`],
  wikipedia: ["Wikipédia", q => `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`] };
let browserBook = new SaveSlot("office-browser", { bookmarks: null, engine: "google" }).data;
const BR_SEARCH = q => (BR_ENGINES[browserBook.engine] || BR_ENGINES.google)[1](q);
const saveBrowser = () => SaveSlot.get("office-browser").save(browserBook);
function defaultBookmarks() {
  const out = [{ title: "Agent Office (démo)", url: `${location.origin}/?demo=1`, icon: "🏢" }, { title: "Wikipédia", url: "https://fr.wikipedia.org/", icon: "📚" }, { title: "YouTube", url: "https://www.youtube.com/", icon: "▶️" },
    { title: "Claude Code", url: "https://docs.claude.com/fr/docs/claude-code/overview", icon: "✳️" }];
  if (glStatus?.url) out.splice(1, 0, { title: "GitLab : mes MR", url: `${glStatus.url}/dashboard/merge_requests?assignee_username=${encodeURIComponent(glStatus.user || "")}`, icon: "🦊" });
  if (data.links?.youtrack) out.splice(1, 0, { title: "YouTrack", url: `${data.links.youtrack}/issues`, icon: "🎫" });
  return out;
}
const bookmarks = () => browserBook.bookmarks || defaultBookmarks();
const br = { tabs: [{ id: 1, url: "about:home", hist: ["about:home"], idx: 0, state: "home", reason: "" }], active: 1, seq: 1 };
const brTab = () => br.tabs.find(t => t.id === br.active) || br.tabs[0];
const hostOf = url => { try { return new URL(url).host; } catch (_) { return url; } };
const titleOf = t => t.url === "about:home" ? "Nouvel onglet" : bookmarks().find(b => b.url === t.url)?.title || hostOf(t.url);
// what was typed → an address: about:, a URL (https added), or a search
function toUrl(input) {
  const v = input.trim();
  if (!v || v === "about:home") return "about:home";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(v) || /^localhost(:\d+)?(\/\S*)?$/.test(v)) return `${/^(localhost|127\.)/.test(v) ? "http" : "https"}://${v}`;
  return BR_SEARCH(v);
}
/* ---------- embeddable players: a site that refuses frames often has a player that accepts them ---------- */
const ytStart = t => { if (!t) return 0; const m = String(t).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
function ytEmbed(id, t, list) {
  const q = new URLSearchParams({ rel: "0" }); if (ytStart(t)) q.set("start", ytStart(t)); if (list) q.set("list", list);
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${q}`;
}
// the embeddable version of a known page (YouTube, Vimeo, Spotify, Twitch), or null
function embedOf(url) {
  let u; try { u = new URL(url); } catch (_) { return null; }
  const h = u.hostname.replace(/^(www|m|music)\./, ""), p = u.pathname;
  if (h === "youtube.com" || h === "youtube-nocookie.com") {
    if (p === "/watch" && u.searchParams.get("v")) return { kind: "youtube", id: u.searchParams.get("v"), src: ytEmbed(u.searchParams.get("v"), u.searchParams.get("t"), u.searchParams.get("list")) };
    const m = p.match(/^\/(shorts|live|embed)\/([\w-]{6,})/); if (m) return { kind: "youtube", id: m[2], src: ytEmbed(m[2], u.searchParams.get("t")) };
    if (p === "/playlist" && u.searchParams.get("list")) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(u.searchParams.get("list"))}` };
  }
  if (h === "youtu.be" && p.length > 1) return { kind: "youtube", id: p.slice(1), src: ytEmbed(p.slice(1), u.searchParams.get("t")) };
  if (h === "vimeo.com") { const m = p.match(/^\/(\d+)/); if (m) return { kind: "vimeo", src: `https://player.vimeo.com/video/${m[1]}` }; }
  if (h === "open.spotify.com" && /^\/(track|album|playlist|episode|show|artist)\//.test(p)) return { kind: "spotify", src: `https://open.spotify.com/embed${p}` };
  if (h === "twitch.tv") { const ch = p.split("/")[1]; if (ch && !["directory", "videos", "search"].includes(ch)) return { kind: "twitch", src: `https://player.twitch.tv/?channel=${encodeURIComponent(ch)}&parent=${location.hostname}` }; }
  return null;
}
const isYouTubeSite = url => { try { return /(^|\.)youtube\.com$/.test(new URL(url).hostname); } catch (_) { return false; } };
function rememberVideo(id) {
  if (!id) return;
  browserBook.videos = [id, ...(browserBook.videos || []).filter(v => v !== id)].slice(0, 12); saveBrowser();
}
async function brGo(input, tab = brTab(), push = true) {
  const url = toUrl(input);
  if (push) { tab.hist = tab.hist.slice(0, tab.idx + 1); tab.hist.push(url); tab.idx = tab.hist.length - 1; }
  tab.url = url; tab.reason = ""; tab.frameUrl = null;
  if (url === "about:home") { tab.state = "home"; return brRefresh(tab); }
  const emb = embedOf(url);
  if (emb) { tab.frameUrl = emb.src; tab.state = "frame"; tab.embed = emb.kind; if (emb.kind === "youtube") rememberVideo(emb.id); return brRefresh(tab); }  // players accept frames
  tab.embed = null;
  if (isYouTubeSite(url)) { tab.state = "youtube"; return brRefresh(tab); }  // the site refuses frames: our own YouTube page
  tab.state = "loading"; brRefresh(tab);
  let check = { embeddable: true };
  // never the office itself in a frame that may run scripts on its origin (it would hold the page's token)
  const self = (() => { try { const u = new URL(url); return u.port === location.port && /^(127\.0\.0\.1|localhost|\[::1\])$/.test(u.hostname); } catch (_) { return false; } })();
  if (self) check = { embeddable: false, reason: "le bureau lui-même : ouvre-le dans un vrai onglet" };
  else if (!DEMO) {
    try { check = await (await fetch(`/api/framecheck?url=${encodeURIComponent(url)}`, { headers: { "X-Office-Token": TOKEN } })).json(); } catch (_) { check = { embeddable: null }; }
  }
  if (tab.url !== url) return;  // navigated elsewhere meanwhile
  tab.state = check.embeddable === false ? "blocked" : "frame"; tab.reason = check.reason || "";
  brRefresh(tab);
}

/* ---------- drawing: the chrome (tabs, toolbar, bookmarks) is re-rendered alone, the pages stay loaded ---------- */
function brChromeHtml() {
  const t = brTab(), marked = bookmarks().some(b => b.url === t.url), secure = t.url.startsWith("https://");
  return `<div class="brtabs">${br.tabs.map(x => `<div class="brtab${x.id === br.active ? " on" : ""}" data-br-tab="${x.id}" title="${esc(x.url)}"><span class="brfav">${x.state === "loading" ? '<i class="brspin"></i>' : x.url === "about:home" ? "🏠" : x.embed === "youtube" || x.state === "youtube" ? "▶️" : x.embed === "spotify" ? "🎵" : x.embed === "twitch" ? "🟣" : x.embed === "vimeo" ? "🎬" : bookmarks().find(b => b.url === x.url)?.icon || "🌐"}</span><span class="brtt">${esc(titleOf(x))}</span><button data-br="close" data-id="${x.id}" title="Fermer l'onglet">×</button></div>`).join("")}
      <button class="brnew" data-br="new" title="Nouvel onglet">+</button></div>
    <div class="brbar"><button data-br="back"${t.idx > 0 ? "" : " disabled"} title="Précédent">←</button><button data-br="fwd"${t.idx < t.hist.length - 1 ? "" : " disabled"} title="Suivant">→</button>
      <button data-br="reload" title="Recharger">↻</button><button data-br="home" title="Accueil">⌂</button>
      <div class="brurl"><span class="brlock">${t.url === "about:home" ? "🔍" : secure ? "🔒" : "ⓘ"}</span><input class="braddr" value="${t.url === "about:home" ? "" : esc(t.url)}" placeholder="Rechercher ou saisir une adresse" aria-label="Adresse" spellcheck="false">
        <button data-br="mark" class="${marked ? "on" : ""}" title="${marked ? "Retirer des favoris" : "Ajouter aux favoris"}"${t.url === "about:home" ? " disabled" : ""}>${marked ? "★" : "☆"}</button></div>
      <button data-br="ext" title="Ouvrir dans un vrai onglet du navigateur"${t.url === "about:home" ? " disabled" : ""}>↗</button></div>
    <div class="brmarks">${bookmarks().map((b, i) => `<button data-br-go="${i}" title="${esc(b.url)}">${b.icon || "🌐"} ${esc(b.title)}</button>`).join("")}</div>`;
}
function brHomeHtml() {
  const hour = clockNow().getHours();
  return `<div class="brhome"><div class="brhello">${hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir"}, ${esc(CHIEF_NAME)} 👋</div>
    <div class="brsearch"><span>🔍</span><input class="brq" placeholder="Rechercher avec ${esc((BR_ENGINES[browserBook.engine] || BR_ENGINES.google)[0])} ou saisir une adresse" aria-label="Rechercher">
      <select class="brengine" aria-label="Moteur de recherche">${Object.entries(BR_ENGINES).map(([id, [l]]) => `<option value="${id}"${id === browserBook.engine ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="brtiles">${bookmarks().map((b, i) => `<div class="brtile" data-br-go="${i}" title="${esc(b.url)}"><span class="bric">${b.icon || "🌐"}</span><small>${esc(b.title)}</small><button data-br-unmark="${i}" title="Retirer">×</button></div>`).join("")}</div>
    <p class="muted brnote">Beaucoup de sites (GitLab, GitHub, Google…) refusent de s'afficher dans une autre page : ils s'ouvrent alors dans un vrai onglet.</p>
    ${browserBook.bookmarks ? `<button class="brreset" data-br="resetmarks">↺ Favoris par défaut</button>` : ""}</div>`;
}
function brViewHtml(t) {
  if (t.state === "home") return brHomeHtml();
  if (t.state === "blocked") return `<div class="brblocked"><div class="brbig">🙅</div><h3>${esc(hostOf(t.url))} refuse de s'afficher ici</h3>
    <p class="muted">Le site interdit d'être montré dans une autre page (${esc(t.reason)}) : c'est une protection, pas une panne.</p>
    <button data-br="ext" class="ubok">Ouvrir dans un vrai onglet ↗</button><p class="muted brsmall">${esc(t.url)}</p></div>`;
  if (t.state === "youtube") {
    const vids = browserBook.videos || [];
    return `<div class="brblocked bryt"><div class="brbig">▶️</div><h3>YouTube</h3>
      <p class="muted">Le site youtube.com refuse de s'afficher ici, mais ses <b>vidéos</b> oui : colle le lien d'une vidéo, d'un Short ou d'une playlist.</p>
      <div class="brsearch"><span>🔗</span><input class="brq" placeholder="https://www.youtube.com/watch?v=… ou https://youtu.be/…" aria-label="Lien YouTube"></div>
      ${vids.length ? `<h4>DERNIÈRES VIDÉOS</h4><div class="brvids">${vids.map(id => `<button data-br-video="${esc(id)}" title="Revoir"><img alt="" src="https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg"><span>▶</span></button>`).join("")}</div>` : ""}
      <button data-br="ext" class="ubok">Ouvrir youtube.com dans un vrai onglet ↗</button></div>`;
  }
  if (t.state === "loading") return `<div class="brloading"><i class="brspin big"></i><span class="muted">Connexion à ${esc(hostOf(t.url))}…</span></div>`;
  return "";
}
// one view per tab; the frame of a loaded tab is kept while others change
function brRefresh(tab) {
  const chrome = osBox.querySelector(".brchrome"); if (!chrome) return;
  chrome.innerHTML = brChromeHtml();
  const views = osBox.querySelector(".brviews");
  for (const t of br.tabs) {
    let v = views.querySelector(`[data-view="${t.id}"]`);
    if (!v) { v = document.createElement("div"); v.className = "brview"; v.dataset.view = t.id; views.append(v); }
    v.hidden = t.id !== br.active;
    if (tab && t !== tab) continue;
    if (t.state === "frame") {
      let f = v.querySelector("iframe");
      const src = t.frameUrl || t.url;
      if (!f || v.dataset.url !== src) {
        v.innerHTML = ""; f = document.createElement("iframe");
        f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
        // players (YouTube…) refuse to play without knowing the embedding origin: they get it, the other pages nothing
        f.setAttribute("referrerpolicy", t.frameUrl ? "strict-origin-when-cross-origin" : "no-referrer");
        f.setAttribute("allow", "autoplay; encrypted-media; fullscreen; picture-in-picture"); f.allowFullscreen = true;
        f.title = titleOf(t); f.src = src; v.dataset.url = src; v.append(f);
      }
    } else { v.innerHTML = brViewHtml(t); v.dataset.url = ""; }
  }
  for (const v of [...views.children]) if (!br.tabs.some(t => String(t.id) === v.dataset.view)) v.remove();
}
function browserAppHtml() { return `<div class="brapp"><div class="brchrome">${brChromeHtml()}</div><div class="brviews"></div></div>`; }
function mountBrowser() { const views = osBox.querySelector(".brviews"); if (views) { views.innerHTML = ""; brRefresh(); } }

/* ---------- events ---------- */
OsApp.listen("browser", "click", ev => {
  if (!ev.target.closest(".brapp")) return;
  const tabEl = ev.target.closest("[data-br-tab]"), b = ev.target.closest("[data-br], [data-br-go], [data-br-unmark]");
  if (b?.dataset.brUnmark !== undefined) { ev.stopPropagation(); const list = bookmarks(); list.splice(+b.dataset.brUnmark, 1); browserBook.bookmarks = list; saveBrowser(); return brRefresh(); }
  if (b?.dataset.brGo !== undefined) return brGo(bookmarks()[+b.dataset.brGo].url);
  const vid = ev.target.closest("[data-br-video]"); if (vid) return brGo(`https://www.youtube.com/watch?v=${vid.dataset.brVideo}`);
  if (b?.dataset.br) {
    const t = brTab(), a = b.dataset.br;
    if (a === "close") { ev.stopPropagation(); const id = +b.dataset.id; br.tabs = br.tabs.filter(x => x.id !== id); if (!br.tabs.length) br.tabs.push({ id: ++br.seq, url: "about:home", hist: ["about:home"], idx: 0, state: "home" }); if (br.active === id) br.active = br.tabs.at(-1).id; return brRefresh(); }
    if (a === "new") { br.tabs.push({ id: ++br.seq, url: "about:home", hist: ["about:home"], idx: 0, state: "home" }); br.active = br.seq; brRefresh(); return osBox.querySelector(".brq")?.focus(); }
    if (a === "back" && t.idx > 0) { t.idx--; return brGo(t.hist[t.idx], t, false); }
    if (a === "fwd" && t.idx < t.hist.length - 1) { t.idx++; return brGo(t.hist[t.idx], t, false); }
    if (a === "reload") { const v = osBox.querySelector(`[data-view="${t.id}"]`); if (v) v.dataset.url = ""; return brGo(t.url, t, false); }
    if (a === "home") return brGo("about:home");
    if (a === "ext" && t.url !== "about:home") return window.open(t.url, "_blank", "noopener");
    if (a === "resetmarks") { browserBook.bookmarks = null; saveBrowser(); return brRefresh(); }
    if (a === "mark" && t.url !== "about:home") {
      const list = bookmarks(), i = list.findIndex(x => x.url === t.url);
      if (i >= 0) list.splice(i, 1); else list.push({ title: hostOf(t.url), url: t.url, icon: "⭐" });
      browserBook.bookmarks = list; saveBrowser(); return brRefresh();
    }
    return;
  }
  if (tabEl) { br.active = +tabEl.dataset.brTab; brRefresh(); }
});
OsApp.listen("browser", "keydown", ev => {
  if (ev.key !== "Enter" || !ev.target.matches(".braddr, .brq")) return;
  ev.preventDefault(); brGo(ev.target.value);
});
OsApp.listen("browser", "focusin", ev => { if (ev.target.matches(".braddr")) ev.target.select(); });
OsApp.listen("browser", "change", ev => { if (ev.target.matches(".brengine")) { browserBook.engine = ev.target.value; saveBrowser(); brRefresh(); } });

class BrowserApp extends OsApp {
  constructor() { super("browser", "🌐", "Navigateur", "#0060df"); }
  render() { return browserAppHtml(); }
  mount() { mountBrowser(); }  // its pages live outside the HTML string
}
new BrowserApp();
