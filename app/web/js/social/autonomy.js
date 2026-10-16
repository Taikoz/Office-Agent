// The team lives on its own: hungry devs eat or cook for everyone, lonely devs visit a friend.

import { hub, provide } from "../hub.js";
import { chief } from "../core/core.js";
import { mate } from "../sims/crew.js";
import { loungeSay, loungers, pick } from "../world/lounge.js";
import { focusMode } from "../ui/ux.js";
import { cookLevel, rel } from "./relations.js";
import { RECIPES, VISIT_ACT, convos, cooking, dish, eaters, fire, freeSeat, goEat, hasIngredients, nextAuto, nextVisit, socialFx, startCooking, steam, stepCooking, stepEaters, stepFire } from "./kitchen.js";
import { besideOf, here, idleMate, say, sendMate } from "./people.js";
import { autoVerb, startConvo, stepConvos } from "./interactions.js";

/* ---------- autonomy: hungry devs eat or cook, lonely devs visit a friend ---------- */
function stepAutonomy(t) {
  if (focusMode) return;
  const free = [...loungers.values()].filter(l => idleMate(l, t));
  if (dish?.portions) {  // food on the table: the hungriest come and eat
    const hungry = free.filter(l => mate(l.name).faim < 65).sort((a, b) => mate(a.name).faim - mate(b.name).faim)[0];
    if (hungry && freeSeat()) { say(hungry.name, pick(["Ça sent bon ici !", `Une part de ${dish.recipe.label.toLowerCase()} ?`, "J'arrive, j'arrive !"])); goEat(hungry.name); return; }
  }
  if (!dish && !cooking && !fire && t > nextAuto) {  // nothing to eat: a hungry dev cooks for everyone, sometimes with a friend
    const cook = free.filter(l => mate(l.name).faim < 40).sort((a, b) => mate(a.name).faim - mate(b.name).faim)[0];
    if (cook) {
      hub.nextAuto = t + 90000;
      const rs = RECIPES.filter(r => r.lvl <= cookLevel(cook.name) && hasIngredients(r));
      if (!rs.length) return loungeSay(cook.name, pick(["Le frigo est vide… quelqu'un fait les courses ? 🛒", "Plus rien dans le frigo 😩", "Chef, on a besoin de courses !"]));
      const buddy = free.filter(l => l !== cook && rel(cook.name, l.name) >= 30).sort((a, b) => rel(cook.name, b.name) - rel(cook.name, a.name))[0];
      startCooking(cook.name, rs[rs.length - 1 - Math.floor(Math.random() * Math.min(2, rs.length))], Math.random() < 0.5 ? buddy?.name || null : null);
      return;
    }
  }
  if (t > nextVisit && free.length >= 2) {  // a visit: the loneliest picks a friend (or a new face) and goes to talk
    hub.nextVisit = t + 14000 + Math.random() * 16000;
    const a = free.sort((p, q) => mate(p.name).social - mate(q.name).social)[0];
    if (mate(a.name).social > 75 && Math.random() < 0.6) return;
    const others = free.filter(l => l !== a && l.spot?.act !== VISIT_ACT);
    if (!others.length) return;
    const b = Math.random() < 0.7 ? others.sort((p, q) => rel(a.name, q.name) - rel(a.name, p.name))[0] : pick(others);
    b.busy = true; b.busyUntil = t + 30000;
    sendMate(a, besideOf(b), VISIT_ACT, 60000);
    a.visit = { to: b.name, verb: autoVerb(rel(a.name, b.name), mate(a.name)) };
  }
  for (const l of loungers.values()) {  // a visitor that arrived starts the conversation
    if (!l.visit || l.path.length) continue;
    const v = l.visit; l.visit = null;
    if (here(v.to)) startConvo(l.name, v.to, v.verb); else { l.busy = false; l.next = 0; }
  }
}

function stepSocial(dt, t) {
  if (chief.pendingSocial && chief.room === "lounge") { const fn = chief.pendingSocial; chief.pendingSocial = null; fn(); }
  if (hub.chiefBusyNow()) chief.pendingSocial = null;
  hub.stepActQueue(t); stepConvos(t); stepCooking(t, dt); stepFire(t, dt); stepEaters(t, dt); stepAutonomy(t);
  for (let i = socialFx.length - 1; i >= 0; i--) if (t - socialFx[i].born > socialFx[i].life) socialFx.splice(i, 1);
  for (let i = steam.length - 1; i >= 0; i--) if (t - steam[i].born > steam[i].life) steam.splice(i, 1);
  for (const l of loungers.values()) {  // nobody stays stuck waiting: busy only while involved in something
    if (l.called) { l.busy = false; l.visit = null; continue; }
    if (l.busy && t > (l.busyUntil || 0) && !l.visit && !eaters.has(l.name) && cooking?.cook !== l.name && cooking?.helper !== l.name
      && fire?.walker !== l.name && !convos.some(c => c.a === l.name || c.b === l.name)) l.busy = false;
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get stepSocial() { return stepSocial; } });
