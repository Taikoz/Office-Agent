# Agent Office

Un bureau en pixel art, dans ton navigateur, où tu vois travailler tes agents Claude Code en direct.

- **Le chef**, c'est toi (la session principale) : tu le pilotes à la souris.
- **Les devs**, ce sont tes sous-agents : chacun s'assoit à un bureau avec sa spécialité, et un clic montre son écran (code modifié + terminal).
- **Le tableau** suit les tickets : TO DO, EN COURS, BLOQUÉ, LIVRÉ.
- **La salle de repos** accueille les devs libres : ping-pong, baby-foot, fléchettes, arcade, besoins façon Sims.
- Et aussi : coûts estimés et budgets par mission, alertes navigateur, rapport du jour, recherche, XP, succès, quêtes et boutique.

Toutes tes sessions Claude Code sont réunies dans le même bureau.

**Tout reste en local.** Un petit serveur Python (bibliothèque standard uniquement) lit tes transcripts dans `~/.claude/projects` sans jamais les modifier. Il n'écoute que sur `127.0.0.1`, et aucune donnée ne quitte ta machine. Seule exception : la police VT323 est chargée depuis Google Fonts.

---

## 1. Prérequis

- **Claude Code**, avec la gestion des plugins (`/plugin`).
- **Python 3.9 ou plus récent**, accessible avec la commande `python3`. Pour vérifier : `python3 --version`.
- **Un navigateur** : le bureau s'ouvre dans ton navigateur par défaut.
- Optionnel, pour lancer des agents depuis le bureau : un terminal graphique.
  - Linux : `gnome-terminal`, `konsole`, `x-terminal-emulator` ou `xterm`.
  - macOS : Terminal.

## 2. Installation

Dans Claude Code :

```
/plugin marketplace add Taikoz/Office-Agent
/plugin install agent-office@agent-office
```

Puis **redémarre Claude Code**, pour que les hooks du plugin soient chargés.

Pour vérifier que tout marche :

```
/office
```

La commande affiche l'URL du bureau (par défaut http://127.0.0.1:8765/) et l'ouvre dans le navigateur.

Pas encore d'agent sous la main ? Ouvre la démo : http://127.0.0.1:8765/?demo=1

## 3. Premier lancement : crée ton équipe

À la première ouverture, un écran d'accueil te demande :

- ton prénom (le chef) ;
- les prénoms des 8 devs, un par bureau (🎲 pour les tirer au sort) ;
- le nom du chat du bureau et un nom pour ton bureau ;
- si tu veux, ton logo (PNG, JPEG, WebP ou SVG, 300 ko max). Il s'affiche sur l'enseigne murale, dans l'en-tête et dans l'onglet.

Tout est enregistré dans `~/.claude/agent-office/`. Pour le modifier plus tard : 👥 **ÉQUIPE** → « Modifier l'équipe et le logo ».

## 4. Utilisation au quotidien

### Le bureau s'ouvre tout seul

Tu n'as rien à lancer. Dès qu'une session Claude Code démarre un sous-agent (outil `Agent`), le plugin démarre le serveur et ouvre le bureau, s'il n'est pas déjà ouvert dans un onglet. Tu peux aussi l'ouvrir à tout moment avec `/office`.

- Un **dev arrive** par la porte de la salle de repos et s'assoit à un bureau à chaque sous-agent lancé.
- Il **repart** une fois sa mission livrée.
- Une **session principale qui travaille sans sous-agent** apparaît aussi : un dev vient travailler à la place du chef.
- `/clear` dans Claude Code **vide le bureau** des anciennes sessions.

### Ce que tu peux faire

| Action | Effet |
|---|---|
| Clic sur un dev | Son écran : éditeur (diff des fichiers modifiés) et terminal (ses commandes et leur sortie). **DÉTAILS** ouvre le panneau latéral. |
| Carte dans la colonne **EN MISSION** (à droite) | Statut, action en cours, coût estimé, temps restant, lien de la MR, alertes. |
| Clic sur un **bureau libre** | Lance un agent : choisis l'agent et sa mission, puis 🚀 Lancer et confirme. Un terminal s'ouvre avec `claude --agent …`. |
| **Glisser un ticket** du tableau sur un bureau libre | Même chose, avec la mission préremplie pour ce ticket. |
| Clic sur un ticket du tableau | Son historique sur 30 jours. |
| Colonne de plus de 5 cartes | ◀ ▶ ou molette pour changer de page. |
| Clic sur le sol | Le chef y marche. Machine à café, console et porte REPOS ont chacune leur action. |
| **SALLE DE REPOS** (touche `L`) | Les devs libres. Clic sur un dev : discuter, offrir un café, ou le défier au ping-pong, au baby-foot ou aux fléchettes. |

### Les boutons de la barre du haut

| Bouton | Rôle |
|---|---|
| 🧱 MUR | Toutes les sessions actives en mini-bureaux |
| 📊 STATS | Statistiques par spécialité |
| 💬 RÉPONSES | Journal des questions des agents et de tes réponses |
| 🔎 RECHERCHE | Qui a touché à quel fichier, quelle commande, sur 7 jours |
| 📋 RAPPORT | Ce que les agents ont fait aujourd'hui (copie en Markdown) |
| 👥 ÉQUIPE | Fatigue, ennui, moral ; modifier l'équipe |
| 🏆 SUCCÈS · 🛒 BOUTIQUE | Niveaux, succès, déco achetée avec l'XP des agents |
| 🔔 ALERTES | Notifications du navigateur : question, blocage, livraison, MR, boucle, budget dépassé |
| 🎯 FOCUS | Coupe les animations d'ambiance |
| 🔊 Sons | Sons 8-bit (coupés par défaut) |

### Raccourcis clavier

`?` aide · `A` question en attente · `M` mur · `S` stats · `R` rapport · `J` réponses · `/` recherche · `L` salle de repos · `E` émotions · `F` focus · `Échap` fermer

### Tes agents et tes skills

Le bureau détecte tout seul les agents :

- de `~/.claude/agents/` ;
- du dossier `.claude/agents/` de tes projets ;
- de tes plugins installés.

Chaque agent prend la couleur (`color:`) définie dans son fichier. Pour changer son libellé ou sa couleur dans le bureau, voir la clé `agents` de la configuration.

Les agents intégrés (Explore, Plan, general-purpose…) sont reconnus aussi.

### Questions bloquantes posées dans le bureau (optionnel)

Un agent peut te poser une question dans le bureau et attendre ta réponse. Le dev va voir le chef, et tu réponds dans l'interface ou depuis la notification. Ajoute à tes agents une consigne de ce genre :

```
Pour une question bloquante à l'utilisateur, lance :
python3 -I ~/.claude/agent-office/ask.py "Question ?" --option "A" --option "B" --context "pourquoi" --from "ABC-123 build"
puis lis la ligne ANSWER: <réponse>.
```

Le chemin `~/.claude/agent-office/` ne change pas d'une version du plugin à l'autre.

## 5. Configuration (optionnelle)

Sans configuration, tout marche avec les valeurs par défaut. Pour personnaliser, crée `~/.claude/agent-office.json`. Un exemple complet est dans `agent-office.example.json`.

| Clé | Rôle | Défaut |
|---|---|---|
| `port`, `window_minutes`, `open_browser` | Port du serveur, durée d'affichage d'une session inactive, ouverture automatique du navigateur | `8765`, `120`, `true` |
| `exclude` | Fragments de chemin des projets à ne jamais afficher | `[]` |
| `ticket_regex` | Format des tickets lus dans la mission des agents | `ABC-123` |
| `chief_name`, `team` | Valeurs proposées au premier lancement (ensuite, c'est l'équipe enregistrée qui compte) | `Chef`, noms par défaut |
| `agents` | `{"mon-agent": {"label": "DÉVELOPPEUR", "color": "#5aa9ff"}}` | nom et couleur du fichier d'agent |
| `phases` | Étapes de progression par agent : `[[libellé, regex], …]` | Exploration / Modification / Vérification / Rapport |
| `launch_dir` | Dossier où s'ouvrent les agents lancés depuis le bureau | `~` |
| `mmx` | Dossier d'une mémoire MMX : active l'armoire et la validation des propositions | désactivé |
| `youtrack_tools`, `youtrack_backlog_query` | Dossier contenant un client `yt.py` : état des tickets YouTrack et colonne TO DO (une requête, ou une liste de requêtes dont les résultats sont fusionnés) | désactivé |
| `gitlab_tools` | Dossier contenant un client `gl.py` : état de la CI et de la fusion des MR ouvertes par les agents | désactivé |
| `audit_log` | Fichier `audit-log.json` d'audit sécurité : les failles trouvées donnent de l'XP | désactivé |
| `to_verify_regex` | Commande qui compte comme « ticket passé en To Verify » | `yt.py command … to verify` |

Après une modification, redémarre le serveur : `python3 -I ~/.claude/agent-office/office.py stop`, puis `/office`.

## 6. Mettre à jour et désinstaller

```
/plugin marketplace update agent-office      # récupère la dernière version
/plugin uninstall agent-office@agent-office  # désinstalle
```

Après une mise à jour, arrête le serveur pour qu'il redémarre sur la nouvelle version : `python3 -I ~/.claude/agent-office/office.py stop`.

Ton équipe, ton logo, tes scores et tes réglages restent dans `~/.claude/agent-office/` et `~/.claude/agent-office.json`. Supprime-les pour repartir de zéro.

## 7. Dépannage

| Problème | Solution |
|---|---|
| Le bureau ne s'ouvre pas | Lance `/office`. Vérifie que `python3 --version` donne 3.9 ou plus. Regarde `~/.claude/agent-office/server.log`. |
| « port déjà utilisé » ou mauvaise appli sur le port | Choisis un autre port : `{"port": 8790}` dans `~/.claude/agent-office.json`. |
| Aucun dev n'apparaît | Seules les sessions actives depuis moins de `window_minutes` s'affichent. Après un `/clear`, seules les nouvelles activités apparaissent. Vérifie que le projet n'est pas dans `exclude`. |
| « pas de terminal graphique disponible » au lancement d'un agent | Installe l'un des terminaux listés dans les prérequis. Sous Windows, lance les agents depuis Claude Code. |
| Le bouton 🚀 Lancer échoue après un redémarrage du serveur | Recharge la page (F5) : le jeton de sécurité change à chaque démarrage. |
| Les notifications n'arrivent pas | Clique sur 🔔 ALERTES et autorise les notifications pour `127.0.0.1` dans le navigateur. |

Commandes utiles :

```
python3 -I ~/.claude/agent-office/office.py open     # démarre si besoin et ouvre la page
python3 -I ~/.claude/agent-office/office.py status   # état du serveur
python3 -I ~/.claude/agent-office/office.py stop     # arrête le serveur
```

## 8. Confidentialité et sécurité

- **Lecture seule** : le serveur ne modifie jamais tes transcripts.
- **Local uniquement** : il écoute seulement sur `127.0.0.1`.
- **Actions protégées** : lancer un agent, répondre à une question ou valider la mémoire MMX n'est accepté que depuis la page du bureau (même origine + jeton propre à chaque démarrage).
- **Pas de lancement en arrière-plan** : un agent lancé depuis le bureau s'ouvre dans un terminal interactif, et tu valides toi-même chaque permission, comme d'habitude.
- **Coûts estimés** : ce sont des équivalents API, à titre indicatif.

## Développement

```
cd app && python3 -I -m unittest discover -s tests   # tests
claude plugin validate .                             # validation du plugin
```

Licence MIT — Adrien Quennehen.
