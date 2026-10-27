// One office at a time. The agent hook opens the page when no tab polled lately (bin/office.py viewed): a tab frozen
// by the browser, then another one, and the office ends up open three times, each one drawing, polling and holding
// its images. The tab in use (opened, shown or clicked last) says so to the others (BroadcastChannel): they fall
// asleep, nothing drawn nor polled, their images let go, a veil over them; a click on the veil wakes that one up.

import { hub, provide } from "../hub.js";
import { SvgArt } from "../svg/base.js";
import { PX } from "../iso/pixi.js";

const me = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let dormant = false, veil = null;
const chan = "BroadcastChannel" in window ? new BroadcastChannel("agent-office-tab") : null;

function sleep() {
  if (dormant) return;
  dormant = true;
  SvgArt.images.clear(); SvgArt.last.clear(); PX.release();  // the decoded images and their textures go
  veil ||= Object.assign(document.createElement("div"), { id: "onetab", innerHTML: "<div><b>🏢 Le bureau est ouvert dans un autre onglet</b><span>Cet onglet dort pour ne pas tout calculer deux fois.<br>Clique ici pour reprendre le bureau dans cet onglet.</span></div>" });
  veil.onclick = () => claim();
  document.body.append(veil);
}
function wake() {
  if (!dormant) return;
  dormant = false; veil?.remove();
  hub.wakeUp?.();  // main.js: a poll now, the frame clock reset
}
// this tab is the office from now on
function claim() { wake(); chan?.postMessage({ claim: me }); }

if (chan && !DEMO) {
  let awake = false;  // another tab answered that it is the office
  chan.onmessage = ev => {
    const m = ev.data || {};
    if (m.claim && m.claim !== me) sleep();
    else if (m.hello && !dormant) chan.postMessage({ here: me });
    else if (m.here) awake = true;
  };
  // opened on screen: this one is the office; opened behind (the hook's tab), it sleeps if another one is awake
  if (!document.hidden) claim();
  else { chan.postMessage({ hello: me }); setTimeout(() => { if (awake) sleep(); else claim(); }, 400); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) claim(); });  // the tab looked at is the office
  addEventListener("focus", () => claim());
  // a message missed (a tab frozen, a page prerendered): the tab in use says it again now and then
  setInterval(() => { if (!dormant && !document.hidden && document.hasFocus()) chan.postMessage({ claim: me }); }, 20000);
}

provide({ get dormant() { return dormant; } });
