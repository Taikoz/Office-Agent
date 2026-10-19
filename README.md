# Agent Office

Un bureau en pixel art, dans ton navigateur, où tu vois travailler tes agents Claude Code en direct.

- **Le chef**, c'est toi (la session principale) : tu le pilotes à la souris.
- **Les devs**, ce sont tes sous-agents : chacun s'assoit à un bureau avec sa spécialité, et un clic montre son écran (code modifié + terminal).
- **Le tableau** suit les tickets : TO DO, EN COURS, BLOQUÉ, LIVRÉ.
- **La salle de repos** accueille les devs libres : ping-pong, baby-foot, fléchettes, arcade, besoins façon Sims, amitiés et cuisine : clic sur un dev = menu d'actions en cercle (discuter, blague, câlin, taquiner, dispute, cuisiner ensemble…), les devs se rendent visite et se lient d'amitié seuls, et on cuisine pour l'équipe (préparation, poêle, vapeur, plats servis à table, compétence cuisine, risque de feu).
- Et aussi : coûts estimés et budgets par mission, alertes navigateur, rapport du jour, recherche, XP, succès, quêtes et boutique.

Toutes tes sessions Claude Code sont réunies dans le même bureau.

**Tout reste en local.** Un petit serveur Python (bibliothèque standard uniquement) lit tes transcripts dans `~/.claude/projects` sans jamais les modifier. Il n'écoute que sur `127.0.0.1`, et aucune donnée ne quitte ta machine. Seule exception : la police VT323 est chargée depuis Google Fonts.

---

## 1. Prérequis

- **Claude Code**, avec la gestion des plugins (`/plugin`).
- **Python 3.9 ou plus récent** (`python3`, `python` ou `py -3`). Pour vérifier : `python3 --version` (sous Windows : `python --version`).
- **Un navigateur** : le bureau s'ouvre dans ton navigateur par défaut.
- Optionnel, pour lancer des agents depuis le bureau : un terminal graphique.
  - Linux : `gnome-terminal`, `konsole`, `x-terminal-emulator` ou `xterm`.
  - macOS : Terminal.
  - Windows : une nouvelle console s'ouvre.

### Sous Windows

Deux installations sont nécessaires avant le plugin :

1. **Git for Windows** — https://git-scm.com/download/win (options par défaut).
   - Sans git, `/plugin marketplace add` échoue : la commande clone le dépôt GitHub.
   - Avec git, Claude Code exécute aussi les hooks du plugin dans Git Bash.
2. **Python 3** — https://www.python.org/downloads/ : coche **« Add python.exe to PATH »** pendant l'installation.

Le plugin essaie `python3`, puis `python`, puis `py -3` : pas besoin de commande `python3`. Ferme et rouvre ensuite le terminal et Claude Code.

Vérification dans un nouveau terminal : `git --version` et `python --version` (ou `py -3 --version`).

Pour lancer un agent depuis le bureau sous Windows, il faut la version native de Claude Code (`claude.exe`). Avec une installation par npm, lance les agents depuis Claude Code.

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

### L'écran, façon Sims

La scène occupe toute la fenêtre ; le reste flotte par-dessus :

- **En haut** : le nom du bureau, les sessions, 📋 MISSIONS (panneau repliable à droite : agents en mission, conso, quêtes) et ☰ MENU (toutes les options ci-dessous, en menu déroulant).
- **En bas à gauche** : ton personnage (le chef), son humeur, sa file d'actions (l'action en cours avec sa progression, puis les ordres en attente ; clic = annuler) et l'argent du foyer (clic = relevé des salaires et dépenses).

### Le mode achat (🛒, bouton rond en bas à droite)

Un catalogue façon Sims : bureaux + ordinateur, lampes, réfrigérateurs, gazinières, plantes, posters, tapis, aquarium, jukebox, et la garde-robe (chapeaux, couronne). Chaque objet existe en plusieurs styles (pastilles de couleur). « Placer » : l'objet suit la souris, vert là où il rentre, clic pour le poser (clic droit ou Échap pour annuler) ; « Placement auto » le pose tout seul. Clic sur un objet de la scène en mode achat : changer son style, le déplacer, le vendre (75 % du prix).

Hors mode achat, les objets sont interactifs : lampe (allumer, éteindre ; elle éclaire le soir), frigo (encas, cuisiner), gazinière (cuisiner : il faut un frigo et une gazinière, la cuisine se fait devant la gazinière, où qu'elle soit), aquarium (nourrir), jukebox (musique), plante (arroser), bureau libre (lancer un agent, ou le chef y joue sur l'ordinateur).

Les bureaux sont des objets : un dev dont le bureau a été vendu travaille sur un carton avec un portable, son humeur chute et il le fait savoir. Le chef envoie en priorité les devs qui ont un bureau.

### Les compétences

Chaque mission livrée fait monter une compétence du dev qui l'a faite, selon le type d'agent : 💻 Développement, 🧪 Tests, 🛡️ Sécurité, 🔍 Review, 🧭 Pilotage, 📋 Organisation, 🔭 Exploration (niveaux 1 à 10 ; une mission complexe, avec tests verts et MR, fait monter plus vite). Pour chaque nouvel agent, le chef envoie le dev libre le plus compétent pour ce travail (puis le moins fatigué), et l'annonce dans sa bulle. L'expertise rapporte +5 % de salaire par niveau. Les compétences s'affichent sur les cartes EN MISSION, dans la fenêtre des besoins et sur la fiche du dev.

### La vie au bureau

- **Traits** : chaque membre de l'équipe a deux traits (gourmand, fêtard, solitaire, perfectionniste, caféinomane, bavard, zen, sportif, lève-tôt, ambitieux) qui changent ses besoins et ses réactions.
- **Humeurs (moodlets)** : des émotions temporaires pèsent sur l'humeur, la plupart venues du vrai travail des agents : tests rouges (déprime après 3 échecs d'affilée), tests enfin verts, CI cassée ou verte, MR ouverte, fusionnée ou refusée, bloqué, tourne en rond, mission livrée, heures sup le soir.
- **Envies** : chaque dev a trois envies du moment (manger un plat, jouer au baby-foot, discuter avec un collègue, livrer une mission, monter de niveau…). Une envie réalisée rapporte de l'argent et des points de satisfaction, qui achètent des récompenses (potion d'énergie, inspiration, journée spa, bonne humeur d'équipe) dans la fenêtre des besoins.
- **La journée** : l'équipe arrive à 8 h et rentre à 19 h (20 h le vendredi) ; seuls les devs en mission restent. La salle de repos est vide le soir et le week-end. Le vendredi à 17 h, afterwork (sur la terrasse si elle existe) ; après une semaine d'au moins 5 missions livrées, c'est la fête de la semaine, avec une prime d'équipe. Aperçu : `?hour=18&day=5` dans l'URL.
- **Événements** : coupure de courant (réarmer le disjoncteur au mur), visite d'un client (l'accueillir avant qu'il reparte : bonus), pizzas livrées, anniversaire de chaque dev (un jour par an : gâteau, et 🎁 dans son menu). Aperçu : `?event=power|client|pizza|birthday`.
- **Construction** (🏗️ dans le mode achat) : agrandir l'open space (10 puis 12 bureaux, avec des recrues), salle de réunion (réunir l'équipe autour de la table), terrasse, fenêtres sur n'importe quel mur. Une barre en haut passe d'une pièce à l'autre.
- **Bureau du chef** : son bureau près du podium ouvre ChiefOS (aussi dans le menu) : questions en attente, merge requests et leur CI, tickets, rapport du jour, comptes, équipe d'un coup d'œil.
- **Primes d'efficacité** : une mission rapide (moins de 15 min), sans erreur ou économe (moins de la moitié du budget) rapporte plus ; une mission qui a tourné en rond ou dépassé son budget, moins. Tant qu'un agent tourne en rond, il coûte § 10 par minute.

### Créer ton chef

☰ MENU → 👑 CRÉER TON CHEF (ou ✏️ près de son portrait, ou « Personnaliser » dans la fenêtre des besoins) : un éditeur façon Créer un Sim, avec un grand aperçu (de face ou de dos, debout, bras levés, au podium, assis). Visage (peau, barbe et sa couleur), cheveux (9 coupes, couleurs), tenue (smoking, costume, chemise, polo, sweat, t-shirt ; veste ou haut, cravate ou nœud papillon, pantalon, chaussures), accessoires (lunettes carrées, rondes ou solaires ; couronne si achetée, casquette, bonnet, feutre, casque-micro), et personnalité (deux traits au choix et une phrase fétiche qu'il dit quand l'équipe n'a besoin de rien). Chaque couleur a aussi un nuancier libre ; 🎲 tire un chef au hasard.

### Encore plus de vie

- **Carrières** : Junior → Confirmé → Senior → Expert → Lead, selon les missions livrées et la meilleure compétence. Une promotion est fêtée (gâteau) et augmente le salaire (+5 % par grade). Un dev malheureux depuis une heure pense à partir ; au bout de trois, il démissionne (jamais en pleine mission) : recrute quelqu'un dans ChiefOS → Équipe (§ 1 500).
- **Devs au travail** : clic sur un dev à son bureau → voir son écran, lui apporter un café, l'encourager, et s'il est bloqué ou tourne en rond, lui souffler une idée ou relancer l'agent avec une consigne.
- **Worktree séparé** : au lancement d'un agent (bureau libre, ticket glissé, 📅 Planning), choisis le projet ; dans un dépôt git, « 🌿 Worktree séparé » (coché par défaut) lance `claude --agent … --worktree <ticket>-<agent>` : l'agent travaille dans `.claude/worktrees/<nom>`, sur sa propre branche, et plusieurs agents en parallèle ne touchent plus les mêmes fichiers. Sa carte affiche 🌿 le worktree et ⎇ la branche, son bureau aussi ; 🔁 relancer reprend dans le même worktree. À la fin de la session, Claude Code propose de garder ou de supprimer le worktree. Pense à ignorer `.claude/worktrees/` dans le `.gitignore` du projet.
- **Permissions en attente** : quand un agent attend ton accord dans son terminal (hook `PermissionRequest` du plugin), le dev lève les bras avec une bulle 🔐, sa carte passe en tête et clignote (outil et commande attendus, depuis combien de temps), et une alerte part. Ça s'efface dès que tu as répondu (accordé, refusé ou interrompu) ; une commande autorisée qui tourne encore est reconnue dans la liste des processus. Le statut reste « au travail » : un agent qui t'attend n'est ni bloqué ni parti.
- **Relations** : rivaux (amitié ≤ −40) qui se piquent quand ils travaillent en même temps, binômes (≥ 70) qui se motivent, et un parrain pour chaque nouveau pendant deux semaines (il apprend plus vite).
- **Animaux** : Brume a faim et besoin de câlins, elle va manger à sa gamelle (à remplir) ; adopte Biscuit le chien (🐾 dans le mode achat) : il se promène, rend visite aux devs, et joue à la balle.
- **Salle de repos** : en plus du canapé, des jeux et de la cuisine, un coin karaoké (scène, enceintes, paroles à l'écran) et une table de jeu de société à deux ; les devs y vont seuls quand ils ont besoin de fun ou de social, et le chef aussi (clic dessus quand il est en salle de repos). Nouvelles envies : chanter au karaoké, faire un jeu de société.
- **Tout s'utilise, partout** : chaque objet acheté a au moins une action, dans chaque pièce (bureau, salle de repos, réunion, terrasse, salle de sport, bibliothèque). Le chef y va depuis n'importe quelle pièce, s'assoit ou se place devant, et le fait : s'asseoir sur un tabouret, bronzer sur un transat, se baigner dans le jacuzzi, lancer le barbecue, se réchauffer au brasero, écrire le menu sur l'ardoise, faire un vœu à la fontaine, regarder l'heure ou dehors, ranger, admirer… Les néons s'allument et s'éteignent d'un clic. L'effet sur ses besoins vient au plus une fois toutes les 5 minutes par objet.
- **Le bar, de A à Z** (🛒 → 🍸 Bar) : modules de comptoir (droit, angle, passage de barman) qui s'alignent, et dessus une tireuse à bière (30 pintes par fût), une station à cocktails, une caisse enregistreuse ; derrière, une étagère à bouteilles éclairée, un frigo sous comptoir, une machine à glaçons (cocktails frappés), des fûts de réserve ; des tabourets hauts, les néons BAR, OPEN et cocktail. Le chef tire une pression, prépare un cocktail, paie une tournée à tous ceux de la pièce, change le fût (le fût de réserve de la pièce, sinon § 60) et fait la caisse une fois par jour (§ 3 par verre servi). En salle de repos, les devs viennent boire un verre au comptoir ; sur la terrasse, l'afterwork se passe au comptoir et sur les tabourets.
- **Frigo et courses** : cuisiner prend les ingrédients du frigo (🍝 pâtes, 🍅 tomates, 🥩 viande, 🌾 farine, 🥚 œufs, 🥛 lait, 🧀 fromage, 🥕 légumes, 🍚 riz, 🍫 chocolat, 🧈 beurre). « 🛒 Faire les courses… » (frigo ou cuisine) achète avec les § ce qu'il faut pour une recette ; le contenu du frigo s'affiche au centre du menu. Les devs ne cuisinent que ce qu'il y a dans le frigo et réclament des courses quand il est vide.
- **Saisons et météo** : la terrasse suit la saison (neige, fleurs, barbecue, feuilles). ☰ MENU → MÉTÉO RÉELLE : les fenêtres montrent le vrai temps de ta ville (Open-Meteo, sans clé ; seules les coordonnées de la ville sont envoyées), la température s'affiche à côté de l'heure ; ville dans ChiefOS → Météo. Désactivé par défaut.

### Les outils du chef (ChiefOS)

ChiefOS ressemble à Ubuntu : barre du haut (Activités, date et heure, ⏻ pour fermer), dock à gauche, chaque outil dans une fenêtre (– réduit vers Activités, ▢ agrandit, × ferme), et Activités affiche la grille des applications avec une recherche (Entrée ouvre la première). Le dock ne garde que les applications principales (par défaut : Questions, Notifications, Terminal, GitLab, Navigateur, Blueprints, Tableau de bord, Planning, Réglages) ; l'application ouverte s'y ajoute le temps de l'utiliser. Pour le modifier : clic droit sur une icône (dock ou Activités) → épingler, retirer, monter, descendre ; glisser-déposer pour réordonner (ou depuis Activités pour épingler) ; ou ⚙️ Réglages → Dock (avec « Dock par défaut »).

- **🚨 Alertes** : un agent qui relit le même fichier en boucle, la même erreur chez plusieurs agents, une MR sans review depuis plus de 2 h, un agent qui tourne en rond ; chacune avec son action (relancer avec une consigne, lancer une review, voir l'écran). Toast et notification à l'apparition.
- **📅 Planning** : choisis des tickets du backlog et un agent pour chacun, le nombre d'agents à la fois, puis « Lancer la journée » : le chef les lance l'un après l'autre (le lancement habituel, avec un terminal), 2 min au moins entre deux, jamais plus que le nombre choisi.
- **🧾 Débriefs** : chaque mission livrée a sa fiche (mission, fichiers modifiés, commandes clés, erreurs, durée, coût, tests, MR), copiable en Markdown pour la MR ou le ticket ; aussi 🧾 sur la carte de la mission.
- **💸 Coûts** : coût, temps et issue des runs sur 30 jours, par ticket et par projet ; les « gouffres » (plus du double de la médiane, ou bloqués deux fois) sont signalés.
- **🗓️ Semaine** : le rapport de la semaine (livré, MR, To Verify, bloqués, temps, par jour), copiable en Markdown ; prêt le vendredi à 17 h (toast et notification).
- **⚙️ Réglages → GitLab** : l'adresse de ton GitLab (gitlab.com ou une instance d'entreprise) et un jeton personnel au droit `read_api` (lien « Créer un jeton » prérempli), testés à l'enregistrement. Le jeton reste sur ta machine (`~/.claude/agent-office/gitlab.json`, lisible par toi seul) : la page ne le revoit jamais et il n'est pas dans la sauvegarde ; le serveur interroge GitLab lui-même (lecture seule, cache 60 s).
- **🦊 GitLab** : tes merge requests en onglets (à relire, les miennes, assignées, toutes) avec recherche, CI, labels, commentaires, approbations, conflits. Clic sur une MR : sa page complète, avec le widget de fusion (pipeline, approbations, discussions, conflits, brouillon) et quatre onglets — Aperçu (description, relecteurs, assignés, labels), Discussions (fils sur le code ou généraux, résolus ou non, filtre « non résolues »), Pipeline (stages et jobs, la fin du log d'un job au clic) et Fichiers (fichiers modifiés, +/−, diff coloré). Actions : ouvrir dans GitLab, lancer une review, « Traiter les retours » (un agent reçoit les discussions non résolues), « Corriger la CI » (un agent reçoit le log du job en échec).
- **🔀 Merge requests** : celles des agents de la session, et un accès à 🦊 GitLab.
- **🧩 Blueprints** : crée un skill ou un agent Claude Code visuellement, façon Blueprint d'Unreal. Des blocs prêts à l'emploi (Départ « quand l'utiliser » et rôle, arguments, lire des fichiers, chercher dans le code, lire une page web, lancer une commande, modifier du code, créer un fichier, déléguer à un agent, utiliser un skill, demander à l'utilisateur, Git, vérifier ; condition si/sinon, pour chaque, en parallèle, arrêter ; fonctions et appels ; résultat et règles), reliés par des fils (sortie ● → entrée), sur un canevas à grille (déplacer, zoomer, recadrer ⤢, Suppr pour effacer). Un clic sur un bloc de la palette l'ajoute après le bloc choisi, déjà relié. Inspecteur à droite pour régler chaque bloc, et pour l'agent : modèle, couleur, outils. Modèles de départ (revue de MR, livrer un ticket), 💾 enregistrer / 📂 ouvrir, 👁 aperçu du Markdown généré (frontmatter compris). 🚀 Publier : choisis le `.claude` (global `~/.claude`, celui d'un projet récent, ou un autre dossier de ton home), puis « ✨ Laisser Claude l'écrire » (un `claude` interactif s'ouvre dans ce dossier, lit le blueprint et écrit `skills/<nom>/SKILL.md` ou `agents/<nom>.md` au bon format ; tu valides comme d'habitude) ou « ✍️ Écrire le brouillon directement ». Un fichier existant n'est écrasé qu'après un second clic.
  - **🪝 Hooks** : le troisième type de blueprint crée un hook Claude Code. Choisis l'événement (PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, SessionStart, Notification, PreCompact), le matcher (ex. `Bash`, `Edit|Write`) et un délai ; les blocs « Lire un champ de l'événement » (jq), « Commande shell », « Si (test shell) », « Message à Claude » et « Bloquer l'action » (code 2) produisent un script bash. L'aperçu montre le script et l'entrée ajoutée à `.claude/settings.json`. « Écrire directement » crée `.claude/hooks/<nom>.sh` (exécutable) et ajoute l'entrée une seule fois, après une copie de sauvegarde de `settings.json` (`~/.claude/agent-office/backups`). Modèle prêt à l'emploi : « pas de push sur main ». Il faut `jq` ; sous Windows, Claude Code lance les hooks avec Git Bash.
  - **🧪 Tester** : avant de publier, ouvre un `claude` dans le dossier choisi qui lit le brouillon (rien n'est écrit dans `.claude`), le suit une fois sur ton exemple (pour un hook : le script est lancé sur un événement d'exemple) et te dit ce qui est flou ou manquant.
- **💻 Terminal** : un vrai shell (ton `$SHELL`, avec tes droits) dans le dossier choisi (dossier personnel ou un projet récent), façon GNOME Terminal : onglets, couleurs, programmes plein écran (vim, htop, `claude`), copier-coller, raccourcis ✳ claude / git status. Les terminaux continuent de tourner si tu fermes ChiefOS ou recharges la page (6 au plus, fermés après 3 h sans activité). Linux et macOS ; pas sous Windows (pas de pseudo-terminal dans Python).
- **📝 Skills & agents** : les skills, agents et commandes déjà présents dans `~/.claude` et dans les `.claude` de tes projets récents, groupés par endroit, avec recherche et filtre. Modifier (Ctrl+S ; si le fichier a changé sur le disque entre-temps, rien n'est écrasé sans ton accord, et l'ancienne version est gardée dans `~/.claude/agent-office/backups`), aperçu, dupliquer sous un autre nom, corbeille (déplacé dans `~/.claude/agent-office/trash`, jamais effacé), ou « 🧩 Ouvrir en Blueprint » pour le retravailler en blocs.
- **🧠 MMX** : la mémoire MMX en entier : modules en onglets, recherche (texte, id, tag), filtre de priorité, fiche détaillée (priorité, confiance, source, liens), et les propositions en attente à valider une à une ou toutes.
- **📊 Tableau de bord** : sur 7, 30 ou 90 jours : runs, livrés, bloqués, coût et temps ; graphique par jour ; par type d'agent (taux de réussite, coût moyen, durée moyenne, erreurs) ; et pourquoi ils bloquent (permission, tests, délai, réseau, boucle…).
- **🔔 Notifications** : l'historique des toasts et alertes (gardé 30 jours, 400 au plus), filtrable (agents, bureau, outils) et cherchable, avec « Depuis ta dernière visite » (missions livrées et gains, notifications, questions en attente). Le nombre de non-lues s'affiche sur l'icône.
- **⏰ Planification** : des agents lancés à heure fixe (ex. chaque lundi à 9 h, `youtrack-board-cleaner` avec sa mission, dans le dossier choisi). Le serveur de l'Office les lance dans un terminal comme d'habitude (tu valides les permissions) ; il doit tourner à ce moment-là : une heure manquée de plus de 15 min est sautée. ▶ lance tout de suite ; pause, modification, journal des derniers lancements. Gardé dans `~/.claude/agent-office/schedules.json`.
- **🌐 Navigateur** (façon Firefox) : onglets, précédent / suivant / recharger / accueil, barre d'adresse (une adresse ou une recherche Google, Bing ou Wikipédia), favoris (☆, barre et tuiles de la page d'accueil), ↗ pour ouvrir la page dans un vrai onglet. Beaucoup de sites (GitLab, GitHub, DuckDuckGo…) interdisent d'être affichés dans une autre page : le serveur lit leurs en-têtes avant (`/api/framecheck`, protégé par le jeton) et le navigateur propose alors de les ouvrir dans un vrai onglet. Les pages sont isolées (iframe sandbox) ; aucun proxy, pour qu'aucune page tierce ne s'exécute sur l'origine du bureau. Les vidéos passent par le lecteur intégré de leur site : un lien YouTube (vidéo, Short, playlist, direct, avec `t=`), Vimeo, Spotify ou Twitch se lit dans le navigateur ; youtube.com lui-même (qui refuse les cadres) ouvre une page où coller un lien, avec les dernières vidéos vues.
- **🔴 Pipelines** : les pipelines rouges de tes projets récents (branche par défaut) et de tes MR, avec la fin du log du job en échec ; « 🔁 Relancer un agent avec ce log » préremplit une mission de correction.
- **Mémoire des échecs** : un agent bloqué, abandonné ou qui tourne en rond laisse sa cause (délai, permission, dépendance, tests, réseau, boucle) ; au lancement suivant du même type d'agent, le formulaire propose la consigne qui évite le piège (➕ Ajouter la consigne).

### La sauvegarde

La partie (argent, objets, constructions, amitiés, compétences, envies, humeurs…) est sauvegardée dans `~/.claude/agent-office/save.json` toutes les 30 secondes et à la fermeture de la page ; à l'ouverture, la sauvegarde la plus récente l'emporte (navigateur ou fichier). Menu : 💾 SAUVEGARDER, 📤 EXPORTER (un fichier à garder ou emporter sur une autre machine), 📥 IMPORTER.

### L'argent (§)

Chaque mission livrée par un agent rapporte un salaire au foyer, d'autant plus gros qu'elle est complexe : type d'agent, outils utilisés, fichiers modifiés, durée, tokens, tests verts, merge request (les erreurs en retirent un peu ; +10 % si le dev est de bonne humeur). La complexité est notée de ★ à ★★★★★. La carte de la mission affiche le salaire estimé pendant le travail, puis le montant versé ; à la livraison, le montant s'envole au-dessus du bureau du dev. L'argent paie la BOUTIQUE et les courses pour cuisiner. Gardé dans le navigateur, jamais en mode démo ; les missions déjà livrées à la première ouverture ne sont pas payées.
- **En bas au centre** : jour, date, heure, et le soleil ou la lune qui suit l'heure réelle.
- **En bas à droite** : le bouton rond 💎 BESOINS.

### Les options du menu

| Bouton | Rôle |
|---|---|
| 🕘 CHRONOLOGIE | Chronologie de la session (questions, tests, push, MR), au-dessus de l'horloge |
| 🧱 MUR | Toutes les sessions actives en mini-bureaux |
| 📊 STATS | Statistiques par spécialité |
| 💬 RÉPONSES | Journal des questions des agents et de tes réponses |
| 🔎 RECHERCHE | Qui a touché à quel fichier, quelle commande, sur 7 jours |
| 📋 RAPPORT | Ce que les agents ont fait aujourd'hui (copie en Markdown) |
| 👥 ÉQUIPE | Fatigue, ennui, moral ; modifier l'équipe |
| 🏆 SUCCÈS · 🛒 BOUTIQUE | Niveaux, succès ; la boutique ouvre le mode achat (ci-dessous) |
| 🎨 DÉCO | Murs, sol, bois des meubles, tapis, rideaux et porte, pour le bureau et la salle de repos (type + couleur, gardé dans le navigateur) |
| 💎 BESOINS (bouton rond en bas à droite) | Fenêtre façon Sims 4 : besoins du chef ou d'un dev, compétence cuisine, relations, foyer |
| 🔔 ALERTES | Notifications du navigateur : question, blocage, livraison, MR, boucle, budget dépassé |
| 🎯 FOCUS | Coupe les animations d'ambiance |
| 🔊 Sons | Sons 8-bit (coupés par défaut) |

### Raccourcis clavier

`?` aide · `A` question en attente · `M` mur · `S` stats · `R` rapport · `J` réponses · `/` recherche · `L` salle de repos · `B` besoins · `D` déco · `E` émotions · `F` focus · `Échap` fermer

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
| Windows : `Command 'git' not found` à l'ajout de la marketplace | Installe Git for Windows, rouvre Claude Code, relance `/plugin marketplace add Taikoz/Office-Agent`. |
| Windows : rien ne se passe, aucun serveur | Installe Python depuis python.org en cochant « Add python.exe to PATH », puis redémarre Claude Code. |
| « port déjà utilisé » ou mauvaise appli sur le port | Choisis un autre port : `{"port": 8790}` dans `~/.claude/agent-office.json`. |
| Aucun dev n'apparaît | Seules les sessions actives depuis moins de `window_minutes` s'affichent. Après un `/clear`, seules les nouvelles activités apparaissent. Vérifie que le projet n'est pas dans `exclude`. |
| « pas de terminal graphique disponible » au lancement d'un agent | Installe l’un des terminaux listés dans les prérequis. Sous Windows, il faut la version native de Claude Code (`claude.exe`). |
| Le bouton 🚀 Lancer échoue après un redémarrage du serveur | Recharge la page (F5) : le jeton de sécurité change à chaque démarrage. |
| Les notifications n'arrivent pas | Clique sur 🔔 ALERTES et autorise les notifications pour `127.0.0.1` dans le navigateur. |

Commandes utiles :

```
# sous Windows, remplace python3 par python ou py -3
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
- **Terminal et fichiers** : le terminal intégré, l'éditeur de skills et la planification passent par des routes protégées par le jeton, n'acceptent que des dossiers de ton dossier personnel, et l'éditeur ne touche qu'aux fichiers `skills/<nom>/SKILL.md`, `agents/<nom>.md` et `commands/<nom>.md` des `.claude` connus. Le serveur vérifie aussi l'en-tête `Host` (protection contre le DNS rebinding).

### Windows et macOS

| Fonction | Linux | macOS | Windows |
|---|---|---|---|
| 💻 Terminal intégré | ✅ | ✅ (pty, ton zsh) | ❌ message « indisponible » (pas de pseudo-terminal dans Python) |
| Lancer un agent / ✨ Laisser Claude l'écrire / 🧪 Tester / ⏰ Planification | ✅ gnome-terminal, konsole, xterm | ✅ Terminal.app (dans le bon dossier) | ✅ nouvelle console, avec `claude.exe` (version native) |
| 🪝 Hooks | ✅ | ✅ | ✅ avec Git Bash et `jq` |
| 📝 Skills & agents, 🧠 MMX, 📊, 🔔 | ✅ | ✅ | ✅ |

## Développement

```
cd app && python3 -I -m unittest discover -s tests   # tests
# front : web/index.html, web/css/*.css (un fichier par zone, chargés dans l'ordre), web/js/ en modules ES :
#   index.js importe tous les modules dans l'ordre où ils construisent le bureau (main.js en dernier) ; chaque module
#   importe ce qu'il utilise des modules chargés avant lui. Ce qu'il utilise d'un module chargé après lui (toujours
#   dans une fonction) et les variables qu'il modifie dans un autre module passent par hub (js/hub.js) : le module
#   propriétaire les fournit avec provide({ … }) en fin de fichier — la liste des dépendances qui restent à inverser.
# web/js/ : index.js (point d'entrée), main.js (démarrage), hub.js ; les systèmes par domaine :
#   core/ (état, /api/state, démo, premier lancement, notifications), agents/ (le vrai travail : devs au bureau,
#   lancement, questions, tickets, budgets, rapport, chronologie, écran du dev, MMX, stats), sims/ (jauges, besoins,
#   humeurs, envies, compétences, carrières, journée, argent, XP), social/ (relations, cuisine, gens, interactions,
#   autonomie), world/ (pièces, décor, mode achat et construction, chef, chat, animaux, saisons, boutique),
#   ui/ (HUD, raccourcis, panneau et clics, menu circulaire, file d'actions, ChiefOS, client GitLab) ;
# un dossier par famille d'éléments, chacun avec sa classe de base dans base.js et une sous-classe par élément :
#   svg/          SvgArt (StaticArt, Sprite, Figure) : les dessins, enregistrés dans ART / SPRITES. Ex. : ART.arcade.draw(x, y, { frame, playing })
#   apps/         OsApp : les applications de ChiefOS (render, mount, badge, live, click/input/change)
#   items/        Item (Appliance) : les objets du mode achat (CATALOG : état du dessin, menu, actions, dessin autour)
#   activities/   Activity : les activités de la salle de repos (ACTS : emplacements, pose, besoins, chef, envie, dessin)
#   incidents/    Incident : les incidents du bureau à régler d'un clic (panne, flaque, croissants, plante)
#   happenings/   Happening : les événements de la journée (coupure de courant, visite client, pizzas)
#   rooms/        Room : les pièces (bureau, salle de repos, réunion, terrasse, écran de mini-jeu) : dessin, clic, sol
#   games/        MiniGame : les mini-jeux (ping-pong, baby-foot, fléchettes) et le tournoi
#   save/         SaveSlot (Flag) : l'état gardé dans le navigateur (version, migrations) et le fichier de sauvegarde
claude plugin validate .                             # validation du plugin
```

Licence MIT — Adrien Quennehen.
