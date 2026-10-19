// ChiefOS applications. Each one is an OsApp: its icon, name and dock color, what it shows (render), what it does once
// shown (mount, for the apps whose DOM holds state), its badge, whether it refreshes by itself, and its events.
// The apps register themselves in OsApp.all (js/apps/*.js); ChiefOS (chiefos.js) only draws the desktop around them.

import { hub } from "../hub.js";

export class OsApp {
  static all = new Map();  // id → app
  // order of the Activités grid (an app not listed comes last)
  static ORDER = ["questions", "alerts", "support", "gitlab", "browser", "blueprint", "terminal", "skills", "ideas", "lessons", "skillmap", "process", "mmx", "dashboard", "notifs", "schedule", "planning",
    "mr", "pipes", "tickets", "debriefs", "report", "week", "costs", "money", "team", "network", "messages", "meteo", "settings"];
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
