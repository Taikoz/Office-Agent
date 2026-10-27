# ChiefOS : environnement de développement unifié et plateforme d'intégrations

Audit de l'existant, architecture cible et plan de migration. Document vivant : chaque phase livrée met à jour la section « État ».

## 1. Audit de l'existant (phase 1)

### Stack

- **Serveur** : `app/server.py` + package `app/office/` (Python, bibliothèque standard uniquement), lié à `127.0.0.1`.
  - Toute lecture `/api/*` exige le jeton de la page (`X-Office-Token`), sauf `/api/viewer`.
  - Tout POST exige en plus l'en-tête `Host` local et l'`Origin` de la page.
  - Routes : un seul fichier, `office/routes.py` (`make_handler`).
- **Front** : modules ES dans `app/web/js/`, sans build.
  - ChiefOS = `ui/chiefos.js` (fenêtre, dock, dossiers) + une classe `OsApp` par application dans `apps/*.js`.
  - Registre : `OsApp.all`. Rangement : `ORDER`, `DEFAULT_SPACES` (dossiers façon iPhone), mode simple / avancé (`SIMPLE`).
- **Persistance** :
  - `~/.claude/agent-office/` (`STATE_DIR`) : réglages, jetons scellés, sauvegarde.
  - `localStorage` (`SaveSlot`) : préférences de la page.
  - Les transcripts de Claude Code sont lus en lecture seule.
- **Secrets** (`office/vault.py`) :
  - Jetons scellés au repos (encrypt-then-MAC). La clé est hors de `~/.claude`, liée à la machine.
  - `open_authed()` refuse toute redirection vers un autre hôte : le jeton ne quitte jamais son service.
- **Tests** : `python3 -I -m unittest discover -s tests` (131 tests ; `test_integrations.py` pour le registre).

### Intégrations existantes

| Service | Module serveur | Authentification | Applications ChiefOS |
|---|---|---|---|
| GitLab | `office/gitlab.py` (+ `deliveries.py`, `pipelines.py` via `gl.py`) | Jeton personnel `read_api` ; un jeton qui peut écrire est refusé | 🧭 Vue d'ensemble (`codehome`), 🦊 GitLab, 🔀 MR (masquée), 🔴 Pipelines, 🚚 Livraisons |
| Sentry | `office/sentry.py` | Jeton d'API (`org:read`, `project:read`, `event:read`) | 🐞 Erreurs (+ alertes, analyse Haiku, ticket YouTrack après confirmation) |
| Slack | `office/slack.py` | Token de bot (`xoxb-`) + un channel | 🆘 Support |
| YouTrack | `tickets.py` via `yt.py` (outil externe) | Hors Agent Office | Tableau, 🎫 Tickets |

Chaque module a déjà le même contrat implicite : `load` / `save` / `forget` / `status` / `api` / `safe`, une erreur lisible en français, un cache, et un `status()` qui ne renvoie jamais le jeton. Cela vient d'une copie, pas d'un contrat partagé.

### Doublons et problèmes

1. **Trois formulaires de connexion écrits à la main** (`settings.js` pour GitLab, `support.js` pour Slack, `errors.js` pour Sentry), avec trois routes `/api/<service>/config`. Ajouter un service oblige à toucher `routes.py`, `settings.js` et une nouvelle app.
2. **Trois routes d'aiguillage GET** quasi identiques dans `routes.py`.
3. **État de connexion pauvre** : `configured` vrai ou faux. Un jeton expiré ou révoqué n'apparaît qu'au premier appel qui échoue, dans l'app qui l'a fait.
4. **Les mêmes MR à plusieurs endroits** : Vue d'ensemble, 🦊 GitLab, 🔀 MR (déjà masquée pour ça) et les cartes des agents.
5. **Pas de contexte projet partagé** : chaque app filtre ses projets seule (GitLab = projets récents, Sentry = toute l'organisation).
6. **Pas de génération d'applications** : `blueprint.js` génère des skills et agents Claude Code (Markdown), pas des apps ChiefOS. À ne pas confondre.

### Ce qui est réutilisé tel quel

- `vault.py` (stockage des secrets), les clients API des trois modules, leurs caches et leurs messages d'erreur.
- `OsApp`, les dossiers (`SPACES`), le mode simple / avancé, `codehome.js` (déjà la vue « ce qui t'attend » du code).
- Le contrôle jeton + `Host` + `Origin` de `routes.py`.

## 2. Architecture cible (phase 2)

Les couches demandées sont des responsabilités, pas des services : tout reste dans le serveur local.

| Responsabilité | Où |
|---|---|
| Integration Registry | `office/integrations.py` : `Connector`, `register()`, `catalogue()` |
| Connection Manager | `office/integrations.py` : `configure()`, `check()`, `disconnect()`, `connection()` ; secrets dans `vault.py` |
| Integration Runtime | Les modules fournisseur (`gitlab.py`…) : client, cache, erreurs ; `integrations.run()` n'exécute que les lectures déclarées |
| Normalized Data Layer | Plus tard, et seulement pour ce qui se croise : projet, dépôt, MR, pipeline, erreur. Pas de modèle unique forcé |
| Application Registry | `office/apps.py` (phase 5) : applications générées, persistées dans `STATE_DIR/apps.json` |
| App Generator | Gabarits déclaratifs (liste, tableau, détail) × lectures déclarées du connecteur ; pas de code généré |
| ChiefOS Shell | `ui/chiefos.js` + `OsApp` (inchangés) ; une classe `GeneratedApp` affiche toute app générée |
| Shared UI | `ui/gitlab.js` (`glError`, `notConfigured`…) généralisés en composants d'état de connexion |
| Permissions & Audit | Jeton de page + `Origin` (existant) ; lectures déclarées seulement ; journal des connexions / déconnexions (phase 6) |

### Contrat d'un connecteur

Ce qu'un connecteur déclare :

- son identité ;
- ses `AuthMethod`, chacune avec ses `Field` (url, secret, text, list), ses scopes et l'adresse où créer le jeton ;
- ses `Capability`, chacune avec son domaine et l'opération de lecture qui la sert ;
- ses `reads` (op → fonction) et ses `writes` (aucun pour l'instant) ;
- les apps intégrées qui utilisent sa connexion.

`register()` refuse un domaine inconnu ou une capacité dont l'opération n'est pas implémentée : on ne peut pas déclarer ce qui n'existe pas.

Les états d'une connexion : `connected`, `not_configured`, `invalid`, `expired`, `insufficient`, `unreachable`, `error`. Ils sont tirés du code HTTP derrière l'erreur du fournisseur, et de la date d'expiration du jeton quand le service la donne (GitLab).

OAuth 2.0 / PKCE : le contrat le prévoit (`AuthMethod.id`), mais aucun connecteur ne l'implémente encore. Il demandera :

- un `redirect_uri` local `http://127.0.0.1:<port>/oauth/callback` ;
- un `state` et un `code_verifier` gardés côté serveur ;
- le stockage du refresh token dans le vault.

À faire seulement quand un fournisseur l'exige (Notion, Linear…).

### Domaines de ChiefOS (navigation cible)

Chaque fonction a un seul emplacement principal ; ailleurs, elle n'apparaît qu'en widget ou en lien.

| Domaine | Emplacement principal | Contenu actuel réutilisé |
|---|---|---|
| Code & versions | dossier « Code & CI » → Vue d'ensemble | `codehome`, 🦊 GitLab (MR, review, diff) |
| CI/CD & livraisons | même dossier | 🔴 Pipelines, 🚚 Livraisons |
| Monitoring & incidents | même dossier | 🐞 Erreurs (Sentry) |
| Qualité | onglet à créer quand une source existe (SonarQube, couverture) ; rien d'inventé d'ici là | — |
| Communication | « À traiter » | 🆘 Support (Slack) |
| Statistiques | « Bilan » | 📊 Tableau de bord, 💸 Coûts, rapports |
| Intégrations | ⚙️ Réglages → 🔌 Intégrations (remplace « Connexions ») | les trois formulaires actuels |

### Workflow de génération (phase 5)

1. Intégrations → choisir un service → formulaire généré depuis `AuthMethod.fields`.
2. Enregistrer → `configure()` → vérification → état.
3. Le hub liste les gabarits compatibles : chaque gabarit demande une capacité, et seuls ceux dont le connecteur a la lecture sont proposés.
4. « Créer l'application » enregistre `{id, connecteur, gabarit, op, nom, icône, réglages}` dans `apps.json`.
5. ChiefOS charge `apps.json` et instancie une `GeneratedApp` par entrée.
6. Les données passent par `/api/integrations/run`, qui n'exécute que les lectures déclarées.
7. Connexion révoquée : l'app reste installée et affiche l'état et le bouton « Reconnecter ». Elle n'est jamais supprimée automatiquement.

## 3. Migration

- Les fichiers `gitlab.json`, `sentry.json` et `slack.json` restent ceux d'aujourd'hui : le registre les lit par les modules existants, il n'y a aucune donnée à migrer.
- Les routes `/api/gitlab|sentry|slack/*` restent : les apps actuelles continuent de marcher pendant la transition. Elles seront retirées seulement quand plus aucune app ne les appelle.
- Les identifiants d'applications (`codehome`, `gitlab`, `errors`, `support`…) et les dossiers enregistrés par l'utilisateur ne changent pas.

## 4. Plan et état

| Phase | Contenu | État |
|---|---|---|
| 1 Audit | Ce document, section 1 | ✅ |
| 2 Architecture | Section 2 | ✅ |
| 4 Socle d'intégrations | `office/integrations.py`, routes `/api/integrations*`, tests | ✅ (serveur) |
| 4b Integration Hub (front) | `ui/integrations.js` : Réglages → 🔌 Intégrations remplace les trois formulaires ; événement `office:integration` pour que les apps relisent leur état | ✅ |
| 5 Génération d'apps | `View` (modèle déclaré par le connecteur : lecture, colonnes, mise en forme des lignes, paramètres) ; `office/apps.py` (registre `apps.json`, création, renommage, activation, suppression, données) ; `apps/generated.js` (une fenêtre générique) ; création depuis 🔌 Intégrations | ✅ |
| 3 Centralisation | `ui/project.js` : le projet en cours (chemin GitLab), choisi une fois, filtre Vue d'ensemble, GitLab, Pipelines, Erreurs (compteurs compris) et les applications générées (`View.scope`) ; projet Sentry associé par règle (slug ou service = fin du chemin) ou choisi ; 🔀 MR (masquée) retirée des apps de la connexion GitLab | ✅ |
| 6 Sécurité | Journal `integrations-audit.jsonl` (connexion, déconnexion, vérification, apps ; jamais une valeur) ; `integration_hosts` (liste blanche optionnelle, à l'enregistrement et avant chaque appel) ; pause après un 429 (Retry-After, 60 s sinon) ; anciennes routes `/api/<service>/config` retirées | ✅ |
| 7 Validation | Parcours réels avec de vrais jetons, anciennes apps | en continu |

### Limites connues

- **Adresses internes** : un GitLab ou un Sentry auto-hébergé est souvent sur un réseau privé ; les bloquer casserait l'usage normal. La protection actuelle :
  - seul l'utilisateur (page + jeton) configure une adresse ;
  - le jeton ne suit aucune redirection vers un autre hôte.

  Une liste blanche d'hôtes optionnelle existe : `integration_hosts` dans `agent-office.json`.
- **Programme local** : un programme qui tourne sous le compte de l'utilisateur peut lire les jetons, comme le serveur (voir `vault.py`).
