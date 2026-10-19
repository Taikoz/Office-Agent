// The chief's action queue, Sims style (bottom-left): orders wait their turn; a click on one cancels it.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief } from "../core/core.js";
import { EAT_MS, convos, cooking, eaters, fire, stopCooking } from "../social/kitchen.js";
import { say } from "../social/people.js";
import { CONVO_MS, release } from "../social/interactions.js";

/* ---------- the chief's action queue (Sims style): orders wait their turn, a click on one cancels it ---------- */
export const actQueue = [];
let actSeq = 0;
export function enqueue(icon, label, fn, urgent = false) {
  if (actQueue.length >= 6) return say(CHIEF_NAME, "Une chose à la fois !");
  const it = { id: ++actSeq, icon, label, fn };
  if (urgent) { actQueue.unshift(it); cancelChiefTask(); } else actQueue.push(it);
}
// the chief is free when nothing of a task is still going on: no walk, no conversation, no dish on the stove, no plate
function chiefIdle() {
  return !chief.pendingSocial && !chief.lpath.length && !chief.path.length && !chief.svc && !chief.svcArrive && !chief.carry && !chief.pendingOffice && !convos.some(c => c.a === CHIEF_NAME || c.b === CHIEF_NAME)
    && cooking?.cook !== CHIEF_NAME && !eaters.has(CHIEF_NAME) && !(fire && fire.hero === CHIEF_NAME);
}
function stepActQueue(t) {
  if (chief.task && t > chief.task.started + 400 && chiefIdle()) chief.task = null;
  if (chief.task || !actQueue.length || hub.chiefBusyNow()) return;
  const it = actQueue.shift();
  chief.task = { ...it, started: t };
  it.fn();
}
function cancelChiefTask() {
  if (!chief.task) return;
  if (cooking?.cook === CHIEF_NAME) { say(CHIEF_NAME, "J'arrête la cuisine."); stopCooking(); }
  if (eaters.has(CHIEF_NAME)) eaters.delete(CHIEF_NAME);
  for (let i = convos.length - 1; i >= 0; i--) if (convos[i].a === CHIEF_NAME) release(convos.splice(i, 1)[0]);
  chief.pendingSocial = null;
  if (chief.room !== "office") { chief.lpath = []; chief.lspot = null; } else { chief.path = []; chief.at = "free"; }
  chief.task = null;
}
export function cancelAction(id) {
  if (chief.task?.id === id) return cancelChiefTask();
  const i = actQueue.findIndex(a => a.id === id); if (i >= 0) actQueue.splice(i, 1);
}
// what the chief is doing right now, for the action queue: the running order, else what his state says
export function chiefActivity() {
  if (chief.task) {
    const c = cooking?.cook === CHIEF_NAME && cooking.arrived ? Math.min(1, (performance.now() - cooking.start) / cooking.ms) : null;
    const e = eaters.get(CHIEF_NAME), ep = e?.sat ? Math.min(1, (performance.now() - e.start) / EAT_MS) : null;
    const cv2 = convos.find(x => x.a === CHIEF_NAME), cp = cv2 ? Math.min(1, (performance.now() - cv2.start) / CONVO_MS) : null;
    return { id: chief.task.id, icon: chief.task.icon, label: chief.task.label, progress: c ?? ep ?? cp };
  }
  const walking = chief.room !== "office" ? chief.lpath.length : chief.path.length;
  if (walking) return { icon: "🚶", label: "Se déplace" };
  if (chief.room === "lounge") {
    const a = chief.lspot?.act;
    return a?.task ? { icon: a.icon, label: a.task } : { icon: "🛋️", label: "Se détend en salle de repos" };
  }
  if (chief.room !== "office") return { meeting: { icon: "🤝", label: "En salle de réunion" }, terrace: { icon: "🌿", label: "Prend l'air sur la terrasse" }, gym: { icon: "🏋️", label: "En salle de sport" }, library: { icon: "📚", label: "À la bibliothèque" } }[chief.room] || { icon: "🧍", label: "Fait un tour" };
  if (chief.svc) return { icon: "🧰", label: "Entretien" };
  return { coffee: { icon: "☕", label: "Pause café" }, console: { icon: "🎮", label: "Joue à la console" }, pc: { icon: "💻", label: "Joue sur l'ordinateur" }, chiefos: { icon: "🖥️", label: "Sur ChiefOS" }, podium: { icon: "👑", label: "Dirige l'équipe" } }[chief.at] || { icon: "🧍", label: "Fait un tour" };
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get enqueue() { return enqueue; }, get stepActQueue() { return stepActQueue; } });
