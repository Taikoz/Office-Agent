// ChiefOS applications. Each one is an OsApp: its icon, name and dock color, what it shows (render), what it does once
// shown (mount, for the apps whose DOM holds state), its badge, whether it refreshes by itself, and its events.
// The apps register themselves in OsApp.all (js/apps/*.js); ChiefOS (chiefos.js) only draws the desktop around them.

import { hub } from "../hub.js";

export class OsApp {
  static all = new Map();  // id → app
  // order of the Activités grid (an app not listed comes last)
  static ORDER = ["questions", "alerts", "notifs", "support", "messages", "gitlab", "mr", "pipes", "deliveries", "tickets", "planning", "schedule", "report", "week", "debriefs", "dashboard", "costs",
    "skills", "blueprint", "lessons", "ideas", "process", "skillmap", "mmx", "team", "money", "network", "terminal", "browser", "meteo", "settings"];
  // spaces: the apps grouped in folders, like an iPhone (chiefos.js): one folder icon in the dock or Activités opens the
  // folder, its apps then show in tabs in the window; an app outside every folder stands alone. The user moves apps
  // between folders, makes new ones and renames them (saved by chiefos.js, which calls setSpaces); these are the defaults
  static DEFAULT_SPACES = [
    ["inbox", "Boîte de réception", ["questions", "alerts", "notifs", "support", "messages"]],
    ["code", "Code & CI", ["gitlab", "mr", "pipes", "deliveries"]],
    ["work", "Travail", ["tickets", "planning", "schedule"]],
    ["reports", "Bilans", ["report", "week", "debriefs", "dashboard", "costs"]],
    ["workshop", "Atelier", ["skills", "blueprint", "lessons", "ideas", "process", "skillmap", "mmx"]],
    ["crew", "Équipe", ["team", "money", "network"]],
    ["tools", "Outils", ["terminal", "browser", "meteo"]],
  ].map(([id, label, apps]) => ({ id, label, apps }));
  static SPACES = [];
  // { id, label, apps } → a space: the tint is its first app's, the icon its first app's (where a single icon is needed)
  static setSpaces(list) {
    OsApp.SPACES = list.map(({ id, label, apps }) => ({ id, label, apps: [...apps], space: true,
      get tint() { return OsApp.appsOf(this)[0]?.tint || "#77216f"; }, get icon() { return OsApp.appsOf(this)[0]?.icon || "📁"; } }));
  }
  static space(id) { return OsApp.SPACES.find(s => s.id === id); }
  static spaceOf(appId) { return OsApp.SPACES.find(s => s.apps.includes(appId)); }
  // the apps of a space shown right now (hidden and away ones left out)
  static appsOf(space) { return space.apps.map(id => OsApp.get(id)).filter(a => a && !a.hidden && !a.away()); }
  static list() { const rank = id => (OsApp.ORDER.indexOf(id) + 1) || 999; return [...OsApp.all.values()].filter(a => !a.hidden && !a.away()).sort((a, b) => rank(a.id) - rank(b.id)); }
  static get(id) { return OsApp.all.get(id); }
  // events of an app's window, for the apps that wire them in their own module: handler(ev) runs only while that app
  // is the one shown (chiefos.js dispatches). ids: one app or several sharing the handler
  static handlers = new Map();  // id → { type: [handler] }
  static listen(ids, type, handler) {
    for (const id of [].concat(ids)) {
      const h = OsApp.handlers.get(id) || {}; (h[type] ||= []).push(handler); OsApp.handlers.set(id, h);
    }
  }
  static EVENTS = ["click", "input", "change", "keydown", "paste", "focusin", "focusout", "dragstart"];

  // live: re-rendered every 3 s while open (lists that follow the agents); forms and long pages stay still;
  // hidden: neither in Activités nor in the dock (opened some other way)
  constructor(id, icon, label, tint, { live = false, hidden = false } = {}) {
    Object.assign(this, { id, icon, label, tint, live, hidden });
    OsApp.all.set(id, this);
  }
  away() { return false; }     // hidden for now (Messages: only while connected)
  render() { return ""; }      // the HTML inside the window
  mount() {}                   // after render: DOM built outside the HTML string (pages, canvas, terminals)
  open() {}                    // the user opens it (from the dock, Activités or a link)
  badge() { return 0; }        // number on the icon
  // events inside the window while this app is shown (also: OsApp.listen); click: the button clicked, true when handled
  click(_button, _ev) { return false; }
  input(_ev) {}
  change(_ev) {}
  // re-renders the window, keeping the caret of the text field `selector` (a search typed in)
  refreshKeeping(selector) {
    const el = hub.osBox.querySelector(selector), pos = el?.selectionStart;
    hub.renderChiefOs();
    const again = hub.osBox.querySelector(selector);
    if (again && pos != null) { again.focus(); again.setSelectionRange(pos, pos); }
  }
}
