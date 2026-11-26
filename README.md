# Agent Office

**Watch your Claude Code agents work, live, in a pixel-art office in your browser.**

- **You are the chief.** Your main Claude Code session is the chief, and you move them around with the mouse.
- **Your subagents are the devs.** Each one sits at a desk. Click a dev to see their screen: the code they changed and the commands they ran.
- **The ticket board** tracks the work: TO DO, IN PROGRESS, BLOCKED, DELIVERED.
- **The break room** is where idle devs hang out: ping-pong, foosball, darts, arcade, karaoke, cooking, friendships and Sims-style needs.
- **ChiefOS**, the chief's computer, gathers your daily work tools: agent questions, merge requests and CI, tickets, deliveries to production, Sentry errors, costs, reports.
- **Also included:** estimated cost and budget per mission, browser alerts, search, XP, achievements, quests, a buy mode and themed decorations.

All your Claude Code sessions share the same office.

**Everything runs locally.** A small Python server (standard library only) reads your transcripts in `~/.claude/projects`. It never changes them, listens only on `127.0.0.1`, and sends no data off your machine. Exceptions: the VT323 font comes from Google Fonts, and the optional integrations (GitLab, Sentry, Slack, real weather, error analysis) call the services you connect.

> The office interface is in French. This README gives the French labels with their English meaning, for example **ÉQUIPE** (team).

---

## Contents

1. [Quick start](#1-quick-start)
2. [Requirements](#2-requirements)
3. [First run: create your team](#3-first-run-create-your-team)
4. [Using the office](#4-using-the-office)
5. [ChiefOS: the chief's tools](#5-chiefos-the-chiefs-tools)
6. [Office life (the game side)](#6-office-life-the-game-side)
7. [Your agents](#7-your-agents)
8. [Configuration (optional)](#8-configuration-optional)
9. [Update and uninstall](#9-update-and-uninstall)
10. [Troubleshooting](#10-troubleshooting)
11. [Privacy and security](#11-privacy-and-security)
12. [Development](#12-development)

---

## 1. Quick start

In Claude Code, run:

```
/plugin marketplace add Taikoz/Office-Agent
/plugin install agent-office@agent-office
```

Then **restart Claude Code** so it loads the plugin's hooks, and run:

```
/office
```

This prints the office URL (http://127.0.0.1:8765/ by default) and opens it in your browser.

No agents running yet? Open the demo: http://127.0.0.1:8765/?demo=1

## 2. Requirements

- **Claude Code** with plugin support (`/plugin`).
- **Python 3.9 or later**, available as `python3`, `python` or `py -3`. Check with `python3 --version` (on Windows: `python --version`).
- **A web browser.** The office opens in your default browser.
- **Optional:** a graphical terminal, to launch agents from the office.
  - Linux: `gnome-terminal`, `konsole`, `x-terminal-emulator` or `xterm`
  - macOS: Terminal
  - Windows: a new console window opens

### Windows setup

Install these two tools before the plugin:

1. **Git for Windows**: https://git-scm.com/download/win (default options are fine).
   `/plugin marketplace add` clones the GitHub repo, so it fails without git. Claude Code also uses Git Bash to run the plugin's hooks.
2. **Python 3**: https://www.python.org/downloads/
   During setup, tick **"Add python.exe to PATH"**.

You don't need a `python3` command: the plugin tries `python3`, then `python`, then `py -3`.

Then close and reopen your terminal and Claude Code. In the new terminal, check with `git --version` and `python --version` (or `py -3 --version`).

To launch agents from the office on Windows, you need the native Claude Code build (`claude.exe`). If you installed Claude Code with npm, launch agents from Claude Code instead.

### What works where

| Feature | Linux | macOS | Windows |
|---|---|---|---|
| 💻 Built-in terminal | ✅ | ✅ (pty, your shell) | ❌ shows "unavailable" (Python has no pseudo-terminal on Windows) |
| Launch an agent, ✨ let Claude write it, 🧪 test, ⏰ scheduling | ✅ gnome-terminal, konsole, xterm | ✅ Terminal.app, in the right folder | ✅ new console, with `claude.exe` (native build) |
| 🪝 Hooks | ✅ | ✅ | ✅ with Git Bash and `jq` |
| 📝 Skills & agents, 🧠 MMX, 📊 dashboard, 🔔 notifications | ✅ | ✅ | ✅ |

## 3. First run: create your team

The first time you open the office, a welcome screen asks for:

- your first name (you are the chief)
- the names of the 8 devs, one per desk (🎲 picks random names)
- a name for the office cat and a name for your office
- your logo, if you want one (PNG, JPEG, WebP or SVG, 300 KB max). It appears on the wall sign, in the header and in the browser tab.

Everything is saved in `~/.claude/agent-office/`. To change it later: **👥 ÉQUIPE** (team) → **« Modifier l'équipe et le logo »** (edit team and logo).

To design the chief's look: **☰ MENU → 👑 CRÉER TON CHEF** (create your chief), or ✏️ next to their portrait. It works like Create-a-Sim: face, hair, outfit, accessories, two personality traits and a catchphrase. 🎲 picks a random chief.

## 4. Using the office

### The office opens on its own

You don't need to start anything. When a Claude Code session launches a subagent (the `Agent` tool), the plugin starts the server and opens the office, unless it's already open in a tab. You can also open it at any time with `/office`.

If the office is open in several tabs, only the one you're looking at runs. The others sleep (no drawing, no requests) until you come back.

| In Claude Code | In the office |
|---|---|
| A subagent starts | A dev walks in through the break-room door and sits at a desk |
| The subagent finishes | The dev leaves |
| The main session works without a subagent | A dev comes in to work for the chief |
| An agent waits for a permission in its terminal | The dev raises their arms with a 🔐 bubble, their card jumps to the top and blinks, and an alert goes out. It clears as soon as you answer. |
| You run `/clear` | Old sessions are cleared from the office |

### Screen layout

The scene fills the window; everything else floats on top:

- **Top:** office name, sessions, **📋 MISSIONS** (collapsible right panel: agents on mission, usage, quests) and **☰ MENU** (all options).
- **Bottom left:** the chief, their mood, their action queue (current action with progress, then pending orders; click to cancel) and the household money (click for the salary and expense statement).
- **Bottom center:** day, date, time, and the sun or moon following the real time.
- **Bottom right:** the round **💎 BESOINS** (needs) button and the round **🛒** buy-mode button.

### What you can do

| Action | Result |
|---|---|
| Click a dev at their desk | See their screen: an editor with the diff of changed files and a terminal with their commands and output. **DÉTAILS** opens the side panel. You can also bring them a coffee, cheer them up, or, if they're stuck or going in circles, give them a hint or relaunch the agent with an instruction. |
| Read a card in the **EN MISSION** (on mission) panel | Status, current action, skills, estimated cost and salary, time left, MR link, alerts. |
| Click a free desk | Launch an agent: pick the project, the agent and its mission, click **🚀 Lancer** (launch), then confirm. A terminal opens with `claude --agent …`. |
| Drag a ticket from the board onto a free desk | Same as above, with the mission already filled in for that ticket. |
| Click a ticket on the board | See the ticket's history over the last 30 days. |
| Scroll a board column with more than 5 cards | Use ◀ ▶ or the mouse wheel to change pages. |
| Click the floor | The chief walks there. Objects (coffee machine, console, fridge, lamp…) each have their own actions. |
| Open the **SALLE DE REPOS** (break room, key `L`) | See the idle devs. Click one for a circular action menu: chat, joke, hug, tease, argue, cook together, or challenge them at ping-pong, foosball or darts. |

### Separate worktree per agent

When you launch an agent from the office (free desk, dragged ticket or 📅 Planning) in a git repo, **🌿 Worktree séparé** (separate worktree, checked by default) runs `claude --agent … --worktree <ticket>-<agent>`. The agent works in `.claude/worktrees/<name>` on its own branch, so parallel agents don't touch the same files.

- The card and the desk show 🌿 the worktree and ⎇ the branch.
- 🔁 Relaunch resumes in the same worktree.
- When the session ends, Claude Code offers to keep or remove the worktree.
- Add `.claude/worktrees/` to your project's `.gitignore`.

### Menu options

| Button | What it does |
|---|---|
| 🕘 CHRONOLOGIE (timeline) | Session timeline (questions, tests, push, MR), above the clock |
| 🧱 MUR (wall) | All active sessions as mini offices |
| 📊 STATS | Statistics per specialty |
| 💬 RÉPONSES (answers) | Log of agent questions and your answers |
| 🔎 RECHERCHE (search) | Who touched which file and ran which command, over 7 days |
| 📋 RAPPORT (report) | What the agents did today, copyable as Markdown |
| 👥 ÉQUIPE (team) | Fatigue, boredom and morale; edit the team |
| 🏆 SUCCÈS · 🛒 BOUTIQUE (achievements · shop) | Levels and achievements; the shop opens buy mode |
| 🎨 DÉCO | Walls, floor, furniture wood, rugs, curtains and door for the office and break room |
| 💎 BESOINS (needs) | Sims 4-style window: needs of the chief or a dev, cooking skill, relationships, household |
| 🔔 ALERTES (alerts) | Browser notifications: question, blocked agent, delivery, MR, agent going in circles, budget exceeded |
| 🎯 FOCUS | Turns off ambient animations |
| 🔊 Sons (sounds) | 8-bit sounds (off by default) |
| 💾 SAUVEGARDER · 📤 EXPORTER · 📥 IMPORTER | Save, export or import your game (see [Save](#save)) |
| 🌦️ MÉTÉO RÉELLE (real weather) | Windows show your city's real weather (off by default) |

### Keyboard shortcuts

| Key | Action | Key | Action |
|---|---|---|---|
| `?` | Help | `L` | Break room |
| `A` | Pending question | `B` | Needs |
| `M` | Wall | `D` | Decoration |
| `S` | Stats | `E` | Emotions |
| `R` | Report | `F` | Focus |
| `J` | Answers | `Esc` | Close |
| `/` | Search | | |

## 5. ChiefOS: the chief's tools

ChiefOS opens from the chief's desk (next to the podium) or from the menu. It looks like a desktop OS: a dock on the left, apps in windows, and **Activités** (activities), an iPhone-style home screen with search.

### Simple and advanced mode

**Simple mode (default)** opens on ☀️ **Aujourd'hui** (today): what's waiting for you, what's running, what was delivered. It only shows everyday work:

| App | What it shows |
|---|---|
| 📥 **À traiter** (to do) | Agent questions, alerts with their action, and unread work notifications, in one list, most urgent first |
| **Code & CI** | 🧭 Overview, then GitLab, Pipelines, Deliveries and Errors as tabs |
| **Tickets** | Tickets, Planning, Scheduling |
| **Bilan** (review) | Day, week, debriefs, dashboard, costs |
| ⚙️ **Réglages** (settings) | Mode, appearance, dock, integrations, performance |

**⚙️ Réglages → Mode : Avancé** (advanced) shows everything else: workshop, team, tools, and separate Questions / Alerts / Notifications. Settings also show how often you opened each app on this machine.

### Organizing apps

Apps are grouped in **folders**: Inbox, Code & CI, Work, Reports, Workshop, Team, Tools. As on an iPhone, in Activités:

- drag an app onto a folder to move it there, onto another app to create a folder, or out of an open folder to remove it
- click an open folder's name to rename it
- right-click → ungroup folder / remove from folder
- right-click an icon (dock or Activités) → pin, unpin, move up, move down; or drag and drop
- reset with ⚙️ Réglages → Dock → « Dossiers par défaut » / « Dock par défaut »

### Code & CI

- **🧭 Overview:** four color-coded counters (MRs to review, my MRs, red pipelines, production alerts), then **"À faire maintenant"** (do now): what's waiting for you, most urgent first, each with its action (fix CI with an agent, review, address feedback, see the error, merge). Below: CI status of your MRs, production errors per hour over 24 h, and the oldest waiting reviews.
- **🦊 GitLab:** your merge requests in tabs (to review, mine, assigned, all) with search, CI, labels, comments, approvals and conflicts. Click an MR for its full page: merge widget plus Overview, Discussions, Pipeline (stages, jobs, end of a job's log) and Files (colored diff). Actions: open in GitLab, start a review, **"Traiter les retours"** (an agent receives the unresolved discussions), **"Corriger la CI"** (an agent receives the failed job's log).
- **🔀 Merge requests:** the MRs of this session's agents.
- **🔴 Pipelines:** one card per red pipeline (project, branch, MR, job, stage, since when), the end of the log in a terminal view, **"Corriger avec un agent"** (fix with an agent) and a link to the job in GitLab.
- **🚚 Livraisons** (deliveries): every MR merged in the last 14 days, from merge to production: the first release tag containing it, its pipeline, then each environment running it (dev, staging, prod), read from your deployment repo (`deploy_repo`, Helm values). Tabs:
  - 🎫 Tickets: MRs grouped by ticket with their YouTrack state
  - 🧱 Services: each environment's tag, since when, how many MRs are waiting
  - 🚀 Next prod: what the next production release will ship, copyable as Markdown, with what to check first (migrations, new environment variables, config or build files, dependencies, Helm settings missing from prod)

  You get a notification when one of your MRs reaches staging or prod. Gaps are flagged (merged but not released after 2 days, not in staging after 3 days, not in prod after 7 days…). Read-only: it never deploys anything or changes a ticket.
- **🐞 Erreurs** (errors): your Sentry errors, read-only. Checked every 2 minutes, even with the app closed, for **spikes**, **new errors** and **errors after a production release**. Each alert notifies you once. Click an error, then **"Analyser avec Haiku 5"**: Claude Haiku gets the latest event (exception, code lines, environment, version; never the user, the request or breadcrumbs) and returns a summary, likely cause, fix, severity, priority, the right agent and a draft YouTrack Bug. **"Créer le ticket YouTrack"** asks for a second click, then creates the Bug once per Sentry error. **"Lancer l'agent"** opens a pre-filled launch form.
- **📁 Current project:** pick a GitLab project once and Overview, GitLab, Pipelines, Errors and generated apps all filter on it. ✕ goes back to all projects. The matching Sentry project is found automatically when possible, otherwise **"Associer"** (link) lets you choose.

### Tickets and planning

- **📅 Planning:** pick backlog tickets and an agent for each, how many agents may run at once, then **"Lancer la journée"** (start the day). The chief launches them one after another, at least 2 minutes apart.
- **⏰ Planification** (scheduling): agents launched at fixed times (e.g. every Monday at 9:00, `youtrack-board-cleaner` with its mission, in a chosen folder). The office server must be running then: a run missed by more than 15 minutes is skipped. ▶ runs it now. Saved in `~/.claude/agent-office/schedules.json`.

### Reports

- **📊 Tableau de bord** (dashboard): over 7, 30 or 90 days: runs, delivered, blocked, cost and time; per-day chart; per agent type (success rate, average cost and duration, errors); and why agents get blocked (permission, tests, timeout, network, loop…).
- **💸 Coûts** (costs): every conversation, main sessions and subagents, over 7, 30 or 90 days. Total and trend, 30-day projection, cache savings, subagent share; then cost per day, model, token type, project, agent, the most expensive conversations, and ticket "money pits" 🕳️ (more than twice the median, or blocked twice). All figures are estimates at API prices: on a subscription, nothing is billed per token.
- **🗓️ Semaine** (week): the weekly report (delivered, MRs, To Verify, blocked, time, per day), copyable as Markdown, ready on Friday at 5 pm.
- **🧾 Débriefs:** one sheet per delivered mission (mission, changed files, key commands, errors, duration, cost, tests, MR), copyable as Markdown for the MR or the ticket.
- **🚨 Alertes:** an agent re-reading the same file in a loop, the same error across several agents, an MR without review for more than 2 hours, an agent going in circles. Each comes with its action.
- **🔔 Notifications:** history of toasts and alerts (30 days, 400 max), filterable and searchable, with "since your last visit".
- **Failure memory:** a blocked, abandoned or looping agent leaves its cause. Next time you launch the same agent type, the form suggests the instruction that avoids the trap (➕ add the instruction).

Charts are plain SVG: hover or Tab on a bar for a tooltip, **"Voir les données"** (see data) for the table. Colors are checked for color blindness.

### Workshop and tools

- **🧩 Blueprints:** build a Claude Code skill, agent or hook visually, Unreal Blueprint style. Drag ready-made blocks (read files, search code, run a command, edit code, delegate to an agent, ask the user, if/else, for each, in parallel…), wire them together, set the model, color and tools, and preview the generated Markdown.
  - **🚀 Publier** (publish): pick the target `.claude` folder, then **"✨ Laisser Claude l'écrire"** (an interactive `claude` writes the file in the right format; you approve as usual) or write the draft directly. An existing file is overwritten only after a second click.
  - **🪝 Hooks:** pick the event, matcher and timeout; blocks produce a bash script. "Write directly" creates `.claude/hooks/<name>.sh` and adds the entry to `.claude/settings.json` (after backing it up). Needs `jq`.
  - **🧪 Tester** (test): a `claude` reads the draft, follows it once on your example, and tells you what is unclear or missing. Nothing is written to `.claude`.
- **📝 Skills & agents:** the skills, agents and commands in `~/.claude` and your recent projects' `.claude` folders. Edit (Ctrl+S; never overwrites a file changed on disk without asking, and keeps a backup), preview, duplicate, trash (moved, never deleted), or open as a Blueprint.
- **🧠 MMX:** the full MMX memory (if configured): modules, search, priority filter, details, and pending proposals to approve one by one or all at once.
- **💻 Terminal:** a real shell (your `$SHELL`) in your home folder or a recent project, with tabs, colors and full-screen programs (vim, htop, `claude`). Terminals keep running if you close ChiefOS or reload the page (6 max, closed after 3 hours idle). Linux and macOS only.
- **🌐 Navigateur** (browser): tabs, address bar, bookmarks. Sites that refuse to be framed (GitLab, GitHub…) are detected and offered in a real tab instead. YouTube, Vimeo, Spotify and Twitch links play in the built-in player.
- **🌦️ Météo** (weather): current conditions, details, next 24 hours and 7 days, from Open-Meteo (no key; only the city's coordinates are sent).

### Integrations

**⚙️ Réglages → 🔌 Intégrations** lists every external service: connected ones on one side, available ones on the other. For each: its state (connected, token refused, expired, insufficient rights, unreachable), the linked account, the apps that use it, and **Vérifier** (a real call), **Modifier** (edit) and **Déconnecter** (disconnect, two clicks). An expired token removes nothing: apps wait for you to reconnect.

| Service | You provide | Enables |
|---|---|---|
| GitLab | URL (gitlab.com or self-hosted) and a personal token with `read_api` only (a token that can write is refused) | GitLab, Pipelines, Deliveries, Overview |
| Sentry | URL, a token with `org:read`, `project:read`, `event:read`, organization, environments | Errors and their alerts |
| Slack | Token | Channel feed app |

Tokens are tested when saved, stored encrypted on your machine, never sent back to the page, and not included in the save file.

**Generated apps:** each service offers ready-made apps, no code needed (GitLab → MRs to review, My MRs, Red pipelines; Sentry → Today's errors, New errors; Slack → Channel feed). **"Créer l'application"** adds it to Activités. You can rename, disable or delete it in the same place.

### Appearance

ChiefOS has seven styles (**⚙️ Réglages → Général → Apparence**): ChiefOS (default), HOLO, Grimoire, Crypte, Galion, Zen and Tropical, each with its own opening sequence. In **Auto**, the style follows the chief's desk: placing a themed desk (holographic command post, headmaster's desk, organ, ship's wheel, sensei platform, lifeguard chair) switches to the matching style.

## 6. Office life (the game side)

Everything here is game only: it never affects your agents. Progress comes from your agents' real work.

### Skills, careers and money

- **Skills:** each delivered mission raises one skill of the dev who did it, depending on the agent type: 💻 Development, 🧪 Tests, 🛡️ Security, 🔍 Review, 🧭 Steering, 📋 Organization, 🔭 Exploration (levels 1 to 10; complex missions with green tests and an MR count more). For each new agent, the chief sends the free dev with the best matching skill, then the least tired one.
- **Careers:** Junior → Confirmed → Senior → Expert → Lead. A promotion means cake and a raise. A dev unhappy for an hour thinks about leaving; after three hours, they quit (never mid-mission). Hire someone in ChiefOS → Team (§ 1,500).
- **Money (§):** each delivered mission pays the household a salary based on its complexity (★ to ★★★★★): agent type, tools, changed files, duration, tokens, green tests, MR, mood. Fast, error-free or thrifty missions earn bonuses; looping or over-budget ones earn less, and an agent going in circles costs § 10 per minute. Money buys shop items and groceries. Missions delivered before your first visit aren't paid.

### People

- **Traits:** each team member has two traits (foodie, party animal, loner, perfectionist, coffee addict, chatty, zen, sporty, early bird, ambitious) that change their needs and reactions.
- **Needs and moods:** hunger, energy, fun, social, coffee and mood, Sims-style. Temporary moodlets mostly come from real agent work: red tests, green tests at last, broken or green CI, MR opened, merged or rejected, blocked, delivered, overtime.
- **Wants:** each dev has three current wants (eat a dish, play foosball, chat with a colleague, deliver a mission…). Fulfilling one earns money and satisfaction points, spent on rewards in the needs window.
- **Relationships:** devs visit each other and make friends on their own. Rivals bicker when they work at the same time; close pairs motivate each other; each newcomer gets a mentor for two weeks.
- **Pets:** Brume the cat needs food and cuddles. Adopt Biscuit the dog (🐾 in buy mode).

### The workday

- The team arrives at 8 am and leaves at 7 pm (8 pm on Friday); only devs on a mission stay. The break room is empty in the evening and at weekends.
- Friday at 5 pm: afterwork. After a week with at least 5 delivered missions, it's the weekly party with a team bonus.
- Random events: power cut (reset the breaker), client visit (greet them before they leave), pizza delivery, birthdays.
- Preview in the URL: `?hour=18&day=5`, `?event=power|client|pizza|birthday`, `?season=`.

### Buy and build mode (🛒)

- **Buy:** desks with computers, lamps, fridges, stoves, plants, posters, rugs, aquarium, jukebox, a full bar, the chief's wardrobe… Each item comes in several styles. **Placer** (place): the item follows the mouse, green where it fits, click to drop (right-click or Esc to cancel). Click a placed item to restyle, move or sell it (75% of the price).
- **Every item does something**, in every room: lamps light up, the fridge feeds people, the stove cooks, the jukebox plays, the bar serves drinks and cocktails.
- **Desks are items:** a dev whose desk was sold works on a cardboard box with a laptop, and isn't happy about it.
- **Cooking:** recipes use what's in the fridge. **"🛒 Faire les courses…"** (go shopping) buys the ingredients with §. Devs only cook what's in the fridge and ask for groceries when it's empty.
- **Build (🏗️):** extend the open space (10 then 12 desks, with new hires), meeting room, terrace, windows on any wall.

### Themes (🛒 → 🎭 Thèmes)

Six full collections: walls, windows, floors, rugs, lighting, seating, tables, desks, decorations and outfits. Many themed items show the real state of your agents:

| Theme | Examples tied to real work |
|---|---|
| 🪄 Wizard school | Floating candles, crystal ball, owl perch (send an owl to a dev), sorting hat |
| 🚀 Space station | Holographic table showing agent state, futuristic computers showing the dev's work, teleporters, robot assistant reporting on agents |
| 🦇 Haunted manor | Ghost jar (one ghost per blocked or looping agent), grandfather clock chiming CI status, raven croaking MRs waiting for review |
| 🏴‍☠️ Pirate ship | Chart table (one island per ticket in progress), treasure chest filling with each delivery, cannon salvo per merged MR, kraken barrel (one tentacle per red CI) |
| ⛩️ Japanese house | Tokonoma scroll writing the office mood in one kanji, daruma per agent, koi pond (golden carp per delivery), torii lighting up when all CIs are green |
| 🏖️ Beach club | Pool (a swimmer per working agent), sand castle washed away by red CI, swim flag green/orange/red by CI, DJ decks following agent activity |

The view outside a themed room follows the theme and the real time of day. The terrace also has a rooftop bar with Marcel the bartender, whose gossip comes from real blocked agents, red CIs and waiting MRs.

### Seasons and weather

The terrace follows the season (snow, flowers, barbecue, leaves). With **MÉTÉO RÉELLE** on, windows show your city's real weather and the temperature appears next to the clock.

### Save

Your game (money, items, buildings, friendships, skills, wants, moods…) is saved to `~/.claude/agent-office/save.json` every 30 seconds and when you close the page. On load, the most recent save wins (browser or file). Use **📤 EXPORTER** to move it to another machine.

## 7. Your agents

The office finds your agents automatically in:

- `~/.claude/agents/`
- each project's `.claude/agents/` folder
- your installed plugins

Built-in agents (Explore, Plan, general-purpose…) are recognized too.

Each agent uses the `color:` set in its file. To change an agent's label or color in the office, use the `agents` key in the [configuration](#8-configuration-optional).

### Let agents ask you questions in the office (optional)

An agent can ask you a question in the office and wait for your answer. Its dev walks over to the chief, and you answer in the office or straight from the notification.

Add an instruction like this to your agent files:

```
For a blocking question to the user, run:
python3 -I ~/.claude/agent-office/ask.py "Question?" --option "A" --option "B" --context "why" --from "ABC-123 build"
then read the line ANSWER: <answer>.
```

The path `~/.claude/agent-office/` stays the same across plugin versions.

## 8. Configuration (optional)

Everything works with the defaults. To customize, create `~/.claude/agent-office.json`. See `agent-office.example.json` for a full example.

### General

| Key | Purpose | Default |
|---|---|---|
| `port` | Server port | `8765` |
| `window_minutes` | How long an inactive session stays visible | `120` |
| `open_browser` | Open the browser automatically | `true` |
| `exclude` | Path fragments of projects never to show | `[]` |
| `ticket_regex` | Ticket ID format read from agent missions | `ABC-123` style |
| `chief_name`, `team` | Names suggested on first run (after that, the saved team is used) | `Chef`, default names |
| `agents` | Label and color per agent, e.g. `{"my-agent": {"label": "DEVELOPER", "color": "#5aa9ff"}}` | Name and color from the agent file |
| `phases` | Progress steps per agent: `[[label, regex], …]` | Exploration / Editing / Checks / Report |
| `launch_dir` | Folder where agents launched from the office start | `~` |
| `network` | `{"enabled": true}` allows ChiefOS → Network (office open on the internal network, discovery of other offices). Otherwise the server refuses it and listens on nothing but `127.0.0.1`. | `{"enabled": false}` |
| `integration_hosts` | Allowed hosts for integrations, e.g. `["gitlab.my-company.com", "*.my-company.com"]` | any |

### Tools and deliveries

| Key | Purpose | Default |
|---|---|---|
| `mmx` | Folder of an MMX memory: enables the filing cabinet and approval of proposals | off |
| `youtrack_tools`, `youtrack_backlog_query` | Folder with a `yt.py` client: YouTrack ticket state and the TO DO column (one query, or a list whose results are merged) | off |
| `gitlab_tools` | Folder with a `gl.py` client: CI and merge state of the agents' MRs | off |
| `audit_log` | Security audit `audit-log.json` file: findings earn XP | off |
| `to_verify_regex` | Command that counts as "ticket moved to To Verify" | `yt.py command … to verify` |
| `deploy_repo` | GitLab path of the deployment repo (e.g. `group/devops/k8s-deployments`): enables 🚚 Deliveries | off |
| `deploy_path` | Folder of the `<app>/<env>/*.yaml` values in that repo | `applications` |
| `deploy_ref` | Branch to read | default branch |
| `deploy_projects` | `{"<app>": "<GitLab project>"}` when the image path doesn't say which project builds it | `{}` |
| `deliveries_days` | Days of merged MRs to track (1 to 60) | `14` |

After changing the file, restart the server:

```
python3 -I ~/.claude/agent-office/office.py stop
```

then run `/office`.

## 9. Update and uninstall

```
/plugin marketplace update agent-office      # get the latest version
/plugin uninstall agent-office@agent-office  # uninstall
```

After an update, stop the server so it restarts on the new version:

```
python3 -I ~/.claude/agent-office/office.py stop
```

Your team, logo, save and settings stay in `~/.claude/agent-office/` and `~/.claude/agent-office.json`. Delete them to start from scratch.

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| The office doesn't open | Run `/office`. Check that `python3 --version` shows 3.9 or later. Read `~/.claude/agent-office/server.log`. |
| Windows: `Command 'git' not found` when adding the marketplace | Install Git for Windows, reopen Claude Code, run `/plugin marketplace add Taikoz/Office-Agent` again. |
| Windows: nothing happens, no server | Install Python from python.org with "Add python.exe to PATH" ticked, then restart Claude Code. |
| "Port already in use", or another app answers on the port | Pick another port: `{"port": 8790}` in `~/.claude/agent-office.json`. |
| No devs appear | Only sessions active in the last `window_minutes` are shown. After `/clear`, only new activity appears. Check that the project isn't listed in `exclude`. |
| "No graphical terminal available" when launching an agent | Install one of the terminals listed in [Requirements](#2-requirements). On Windows, use the native Claude Code build (`claude.exe`). |
| **🚀 Lancer** (launch) fails after a server restart | Reload the page (F5). The security token changes each time the server starts. |
| Notifications don't show up | Click **🔔 ALERTES** and allow notifications for `127.0.0.1` in your browser. |

Useful commands (on Windows, replace `python3` with `python` or `py -3`):

```
python3 -I ~/.claude/agent-office/office.py open     # start if needed and open the page
python3 -I ~/.claude/agent-office/office.py status   # server status
python3 -I ~/.claude/agent-office/office.py stop     # stop the server
```

## 11. Privacy and security

- **Read-only:** the server never changes your transcripts.
- **Local only:** it listens on `127.0.0.1` only, unless you enable `network`. It also checks the `Host` header (DNS rebinding protection).
- **Every API route needs the page token:** `/api/` routes (transcripts, MRs, memory, search…) require the page's token, which changes at each server start. The only exception is `/api/viewer` (version and idle state, used by the plugin).
- **Protected actions:** launching an agent, answering a question or approving MMX memory is accepted only from the office page (same origin plus token).
- **No background launches:** an agent launched from the office opens in an interactive terminal, and you approve each permission yourself, as usual.
- **Terminal and files:** the built-in terminal, the skills editor and scheduling only accept folders inside your home folder. The editor only touches `skills/<name>/SKILL.md`, `agents/<name>.md` and `commands/<name>.md` in known `.claude` folders.
- **Isolated page:** a strict Content Security Policy means only the office's own scripts run, never an MR title, log or message. No third-party page can frame the office or read its responses.
- **Private files:** `~/.claude/agent-office/` is `0700` and everything inside it `0600`.
- **Encrypted tokens:** GitLab, Sentry and Slack tokens are never stored in plain text. The key (`~/.local/share/agent-office/vault.key`, tied to the machine) lives outside `~/.claude`, so a copy of `~/.claude` opens nothing. A token is only sent to its own server; redirects to another host are refused. Every connect, disconnect and check is logged in `~/.claude/agent-office/integrations-audit.jsonl` (no tokens or field values).
- **Keep agents out of these folders** by adding this to `~/.claude/settings.json`:
  ```json
  "permissions": {"deny": ["Read(~/.claude/agent-office/**)", "Read(~/.local/share/agent-office/**)"]}
  ```
- **No internal network probing:** the browser's frame check only contacts public addresses (never this machine, the internal network or `169.254.169.254`, redirects included).
- **Rate limits respected:** a service that answers 429 isn't called again until its delay ends (Retry-After, or 60 s).
- **Error analysis:** "Analyser avec Haiku 5" sends only the exception, code lines, environment and version, using `ANTHROPIC_API_KEY` or, failing that, your `claude` subscription.
- **Grafana:** the session driving Chrome only receives the error's service, environment, version and time, never its message or route. Also restrict the Claude in Chrome extension to your Grafana (per-site permissions).
- **Costs are estimates:** they show the API-equivalent price, for reference only.

## 12. Development

```
cd app && python3 -I -m unittest discover -s tests   # run the tests
claude plugin validate .                             # validate the plugin
```

### Front-end layout

`app/web/index.html`, `app/web/css/*.css` (one file per area, loaded in order) and `app/web/js/` as ES modules.

- `index.js` imports every module in the order they build the office (`main.js` last). Each module imports what it needs from modules loaded before it.
- Anything a module needs from a module loaded **after** it (always inside a function), and any variable it changes in another module, goes through `hub.js`: the owning module exposes it with `provide({ … })` at the end of the file. That list is the dependencies still to invert.

Domain systems in `web/js/`:

| Folder | Contents |
|---|---|
| `core/` | State, `/api/state`, demo, first run, notifications |
| `agents/` | Real work: devs at desks, launching, questions, tickets, budgets, report, timeline, dev screen, MMX, stats |
| `sims/` | Gauges, needs, moods, wants, skills, careers, workday, money, XP |
| `social/` | Relationships, cooking, people, interactions, autonomy |
| `world/` | Rooms, decor, buy and build mode, chief, cat, pets, seasons, shop |
| `ui/` | HUD, shortcuts, panel and clicks, circular menu, action queue, ChiefOS, GitLab client |

One folder per element family, each with its base class in `base.js` and one subclass per element:

| Folder | Base class | Contents |
|---|---|---|
| `svg/` | `SvgArt` (`StaticArt`, `Sprite`, `Figure`) | Drawings, registered in `ART` / `SPRITES`, e.g. `ART.arcade.draw(x, y, { frame, playing })` |
| `apps/` | `OsApp` | ChiefOS apps (`render`, `mount`, `badge`, `live`, click/input/change) and their folders (`OsApp.SPACES`) |
| `items/` | `Item` (`Appliance`) | Buy-mode items (`CATALOG`: drawing state, menu, actions) |
| `activities/` | `Activity` | Break-room activities (`ACTS`: spots, pose, needs, chief, want, drawing) |
| `incidents/` | `Incident` | One-click office incidents (breakdown, puddle, croissants, plant) |
| `happenings/` | `Happening` | Daily events (power cut, client visit, pizza) |
| `rooms/` | `Room` | Rooms (office, break room, meeting room, terrace, mini-game screen): drawing, clicks, floor |
| `games/` | `MiniGame` | Mini-games (ping-pong, foosball, darts) and the tournament |
| `save/` | `SaveSlot` (`Flag`) | Browser state (version, migrations) and the save file |

ChiefOS design system: `app/web/css/11-chiefos-design.css` (color tokens, Inter font, spacing, radii, shadows, durations). Architecture notes: [`docs/ARCHITECTURE-chiefos.md`](docs/ARCHITECTURE-chiefos.md).

MIT License — Adrien Quennehen.
