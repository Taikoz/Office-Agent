// ChiefOS → ⚙️ Réglages: GitLab (gitlab.js), the dock (chiefos.js), shortcuts to the other settings.

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { dockSettingsHtml } from "../ui/chiefos.js";
import { meteo } from "../world/seasons.js";
import { plan } from "./planning.js";
import { glBusy, glDraftUrl, glMsg, glStatus } from "../ui/gitlab.js";

function settingsAppHtml() {
  if (!glStatus) return `<p class="muted">Chargement…</p>`;
  const st = glStatus, url = st.url || "https://gitlab.com";
  const create = `${url}/-/user_settings/personal_access_tokens?name=Agent%20Office&scopes=read_api`;
  return `<h4>GITLAB</h4>
    <div class="osrow"><b>État</b><span>${st.error ? `<span class="s-blocked">${esc(st.error)}</span>` : st.configured ? `✅ connecté en tant que <b>@${esc(st.user)}</b> sur ${esc(st.url)}` : "non relié"}</span><span>${st.configured ? `<button data-gl="forget">Oublier le jeton</button>` : ""}</span></div>
    <div class="osrow"><b>Adresse</b><span><input id="gl-url" value="${esc(glDraftUrl ?? st.url ?? "")}" placeholder="https://gitlab.com ou https://gitlab.mon-entreprise.fr" aria-label="Adresse GitLab"></span><span></span></div>
    <div class="osrow"><b>Jeton personnel</b><span><input id="gl-token" type="password" autocomplete="off" placeholder="${st.configured ? "•••••• enregistré (laisser vide pour le garder)" : "glpat-…"}" aria-label="Jeton GitLab"></span><span><a href="${esc(create)}" target="_blank" rel="noopener">Créer un jeton ↗</a></span></div>
    <div class="osacts"><button data-gl="save" class="ubok"${glBusy ? " disabled" : ""}>${glBusy ? "Vérification…" : "Enregistrer et tester"}</button><span class="muted">${esc(glMsg)}</span></div>
    <p class="muted">Droit <b>read_api</b> suffisant (lecture seule). Le jeton reste sur cette machine (<code>~/.claude/agent-office/gitlab.json</code>, lisible par toi seul) : la page ne le revoit jamais et il n'est pas dans la sauvegarde. Le serveur interroge GitLab lui-même.</p>
    ${dockSettingsHtml()}
    <h4>AUTRES RÉGLAGES</h4>
    <div class="osrow"><b>🌦️ Météo réelle</b><span class="muted">${meteo.on ? `activée · ${esc(meteo.city)}` : "désactivée"}</span><button data-os-app="meteo">Ouvrir</button></div>
    <div class="osrow"><b>📅 Agents en parallèle</b><span class="muted">${plan.max} à la fois pour le planning</span><button data-os-app="planning">Ouvrir</button></div>
    <div class="osrow"><b>💸 Budgets par mission</b><span class="muted">dans les statistiques</span><button data-gl="stats">Ouvrir</button></div>`;
}

class SettingsApp extends OsApp {
  constructor() { super("settings", "⚙️", "Réglages", "#77767b"); }
  render() { return settingsAppHtml(); }
}
new SettingsApp();
