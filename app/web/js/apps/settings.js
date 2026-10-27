// ChiefOS → ⚙️ Réglages: GitLab (gitlab.js), the dock (chiefos.js), shortcuts to the other settings.

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { OS_SKINS, dockSettingsHtml, osSkin, resetUsage, setOsAdvanced, setOsSkin, usageBook } from "../ui/chiefos.js";
import { SaveSlot } from "../save/slot.js";
import { meteo } from "../world/seasons.js";
import { plan } from "./planning.js";
import { glBusy, glDraftUrl, glMsg, glStatus } from "../ui/gitlab.js";
import { quality, setQuality } from "../ui/quality.js";
import { slackClick, supportSettingsHtml } from "./support.js";
import { sentryClick, sentrySettingsHtml } from "./errors.js";
import { renderChiefOs } from "../ui/chiefos.js";

const skinNow = () => SaveSlot.get("office-osskin")?.data.skin || "auto";
const Q = [["auto", "Auto", "30 images/s, la résolution s'adapte à ta machine"], ["high", "Haute", "60 images/s, tous les pixels de l'écran"], ["eco", "Économie", "20 images/s, moins de pixels, sans flou"]];
function perfHtml() {
  const res = Math.round((document.getElementById("c").width / document.getElementById("c").getBoundingClientRect().width) * 100);
  return `<h4>PERFORMANCES</h4>
    <div class="osrow"><b>Qualité</b><span class="qbtns">${Q.map(([id, label, hint]) => `<button data-q="${id}" class="${quality.mode === id ? "on" : ""}" title="${hint}">${label}</button>`).join("")}</span><span class="muted">${Q.find(q => q[0] === quality.mode)[2]}</span></div>
    <div class="osrow"><b>Maintenant</b><span class="muted">${quality.fps || "—"} images/s · résolution ${res} %${quality.capped ? ` · ${quality.cap} images/s max (${quality.why})` : ""}</span><span></span></div>`;
}

// the mode, and which apps really serve (opened how often, last when): to decide what the simple mode keeps
function modeHtml() {
  const apps = [...OsApp.all.values()].filter(a => !a.hidden && !a.away()), u = id => usageBook.apps[id] || { n: 0, last: 0 };
  const rows = apps.sort((a, b) => u(b.id).n - u(a.id).n).map(a => `<div class="osrow"><b>${a.icon} ${esc(a.label)}</b><span class="muted">${u(a.id).n} ouverture${u(a.id).n > 1 ? "s" : ""}${u(a.id).last ? ` · dernière le ${new Date(u(a.id).last).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}</span><span class="muted">${OsApp.SIMPLE.has(a.id) ? "mode simple" : "mode avancé"}</span></div>`).join("");
  return `<h4>MODE</h4>
    <div class="osrow"><b>Applications</b><span class="qbtns"><button data-os-advanced="0" class="${OsApp.advanced ? "" : "on"}" title="Aujourd'hui, À traiter, Code & CI, Tickets, Bilan, Réglages">Simple</button><button data-os-advanced="1" class="${OsApp.advanced ? "on" : ""}" title="toutes les applications : atelier, équipe, outils…">Avancé</button></span>
      <span class="muted">${OsApp.advanced ? "toutes les applications" : `${OsApp.SIMPLE.size} applications pour le travail de tous les jours`}</span></div>
    <details><summary>Utilisation depuis le ${new Date(usageBook.since).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} (sur cette machine)</summary>${rows}
      <div class="osacts"><button data-os-usage="reset">↺ Remettre à zéro</button></div></details>`;
}

// the sections, in a side list: one screen at a time instead of one long page
const SECTIONS = [["general", "🧩", "Général", "Mode, apparence de ChiefOS et dock"], ["links", "🔌", "Connexions", "GitLab, Slack et Sentry : jetons en lecture seule, chiffrés sur cette machine"],
  ["perf", "⚡", "Performances", "Images par seconde et résolution du bureau"], ["more", "⋯", "Autres réglages", "Les réglages qui vivent dans leur application"]];
let section = "general";
function settingsAppHtml() {
  if (!glStatus) return `<p class="muted osloading" role="status">Chargement…</p>`;
  const [, , title, sub] = SECTIONS.find(s => s[0] === section);
  return `<div class="setwrap"><nav class="setnav" aria-label="Sections des réglages">${SECTIONS.map(([id, icon, label]) => `<button data-set="${id}" class="${id === section ? "on" : ""}"${id === section ? ' aria-current="page"' : ""}><span aria-hidden="true">${icon}</span>${label}${id === "links" && linksBroken() ? `<b class="osbadge" title="Une connexion est en erreur">!</b>` : ""}</button>`).join("")}</nav>
    <div class="setpane"><div class="sethead"><b>${title}</b><span class="muted">${sub}</span></div>${PANES[section]()}</div></div>`;
}
const linksBroken = () => !!glStatus?.error;
const PANES = {
  general: () => `${modeHtml()}${skinHtml()}${dockSettingsHtml()}`,
  links: () => `${gitlabHtml()}${supportSettingsHtml()}${sentrySettingsHtml()}`,
  perf: () => perfHtml(),
  more: () => moreHtml(),
};
function gitlabHtml() {
  const st = glStatus, url = st.url || "https://gitlab.com";
  const create = `${url}/-/user_settings/personal_access_tokens?name=Agent%20Office&scopes=read_api`;
  return `<h4>GITLAB</h4>
    <div class="osrow"><b>État</b><span>${st.error ? `<span class="s-blocked">${esc(st.error)}</span>` : st.configured ? `✅ connecté en tant que <b>@${esc(st.user)}</b> sur ${esc(st.url)}` : "non relié"}</span><span>${st.configured ? `<button data-gl="forget">Oublier le jeton</button>` : ""}</span></div>
    <div class="osrow"><b>Adresse</b><span><input id="gl-url" value="${esc(glDraftUrl ?? st.url ?? "")}" placeholder="https://gitlab.com ou https://gitlab.mon-entreprise.fr" aria-label="Adresse GitLab"></span><span></span></div>
    <div class="osrow"><b>Jeton personnel</b><span><input id="gl-token" type="password" autocomplete="off" placeholder="${st.configured ? "•••••• enregistré (laisser vide pour le garder)" : "glpat-…"}" aria-label="Jeton GitLab"></span><span><a href="${esc(create)}" target="_blank" rel="noopener">Créer un jeton ↗</a></span></div>
    <div class="osacts"><button data-gl="save" class="ubok"${glBusy ? " disabled" : ""}>${glBusy ? "Vérification…" : "Enregistrer et tester"}</button><span class="muted">${esc(glMsg)}</span></div>
    <p class="muted">Droit <b>read_api</b> suffisant (lecture seule). Un jeton qui peut écrire est refusé. Il reste sur cette machine, chiffré (<code>~/.claude/agent-office/gitlab.json</code>, lisible par toi seul) : la page ne le revoit jamais et il n'est pas dans la sauvegarde. Le serveur interroge GitLab lui-même.</p>
`;
}
function skinHtml() {
  return `<h4>APPARENCE DE CHIEFOS</h4>
    <div class="osrow"><b>Style</b><span class="qbtns">${[["auto", "Auto", "celui du bureau du chef : HOLO au poste de commandement holographique, Grimoire au bureau du directeur, Crypte à l'orgue du maître des lieux, Galion à la barre du capitaine, Zen à l'estrade du sensei, Tropical au poste du maître-nageur, ChiefOS sinon"], ...OS_SKINS]
      .map(([id, label, hint]) => `<button data-skin="${id}" class="${skinNow() === id ? "on" : ""}" title="${hint}">${label}</button>`).join("")}</span><span class="muted">${OS_SKINS.find(s => s[0] === osSkin())[1]} actif</span></div>`;
}
function moreHtml() {
  return `<h4>DANS LEUR APPLICATION</h4>
    <div class="osrow"><b>🌦️ Météo réelle</b><span class="muted">${meteo.on ? `activée · ${esc(meteo.city)}` : "désactivée"}</span><button data-os-app="meteo">Ouvrir</button></div>
    <div class="osrow"><b>📅 Agents en parallèle</b><span class="muted">${plan.max} à la fois pour le planning</span><button data-os-app="planning">Ouvrir</button></div>
    <div class="osrow"><b>💸 Budgets par mission</b><span class="muted">dans les statistiques</span><button data-gl="stats">Ouvrir</button></div>`;
}

class SettingsApp extends OsApp {
  constructor() { super("settings", "⚙️", "Réglages", "#77767b"); }
  render() { return settingsAppHtml(); }
  goTo(id) { if (SECTIONS.some(s => s[0] === id)) section = id; }
  click(b) {
    if (b.dataset.sl) { slackClick(b); return true; }  // Slack · Support (apps/support.js)
    if (b.dataset.se) { sentryClick(b); return true; }  // Sentry · Erreurs (apps/errors.js)
    if (b.dataset.set) { section = b.dataset.set; renderChiefOs(); return true; }
    if (b.dataset.skin) { setOsSkin(b.dataset.skin); return true; }
    if (b.dataset.osUsage === "reset") { resetUsage(); return true; }
    if (!b.dataset.q) return false; setQuality(b.dataset.q); renderChiefOs(); return true;
  }
}
new SettingsApp();
