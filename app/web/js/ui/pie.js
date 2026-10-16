// The pie menu, Sims style: a ring of actions around the clicked person or object (social.js verbs, objects of the
// buy mode, the kitchen, the table, the dog, a dev at work).

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, H, W, cv, ents, specialty } from "../core/core.js";
import { mate, moodWord } from "../sims/crew.js";
import { chiefLoungeAct } from "../world/chief.js";
import { loungeSay, loungers, pick, view } from "../world/lounge.js";
import { challenge } from "../games/base.js";
import { esc } from "../core/data.js";
import { openPanel } from "./panel.js";
import { fmtSim, wallet } from "../sims/money.js";
import { cookLevel, rel, relLevel } from "../social/relations.js";
import { HELPER, HELP_ACT, RECIPES, cooking, dish, extinguish, fire, fridgeLine, goEat, recipeLock, shopFor, shopItems, startCooking } from "../social/kitchen.js";
import { besideOf, bond, chiefDo, chiefTo, here, say } from "../social/people.js";
import { INTERACTIONS, startConvo, workerAction, workerPieItems } from "../social/interactions.js";

/* ---------- the pie menu (Sims style): a ring of actions around the clicked person or object ---------- */
const pie = document.createElement("div");
pie.id = "pie"; pie.hidden = true; pie.setAttribute("role", "menu");
document.body.append(pie);
let pieCtx = null;
function pieItems(kind, target, sub) {
  if (kind === "worker") return workerPieItems(target);
  if (kind === "dog") return hub.dogPie();
  if (kind === "item") { const out = hub.itemPieItems(target, sub); if (sub) out.push(["back", "↩", "Retour"]); return out; }  // build.js
  const items = [];
  if (kind === "mate") {
    const r = rel(CHIEF_NAME, target);
    if (!sub) {
      if (hub.isBirthday(target)) items.push(["v:birthday", "🎁", "Bon anniversaire !"]);  // birthdays.js
      items.push(["v:talk", "💬", "Discuter"], ["s:amical", "😊", "Amical…"], ["s:drôle", "😂", "Drôle…"], ["s:méchant", "😠", "Méchant…"],
        ["s:cook", "🍳", "Cuisiner ensemble…"], ["s:duel", "🎮", "Défier…"], ["fiche", "📋", "Fiche"]);
      if (dish?.portions) items.splice(5, 0, ["invite", "🍽️", "Inviter à manger"]);
    } else if (sub === "cook") {
      for (const rc of RECIPES) items.push([`cook:${rc.id}`, rc.icon, rc.label, recipeLock(rc, Math.max(cookLevel(CHIEF_NAME), cookLevel(target)))]);
    } else if (sub === "duel") items.push(["duel:pingpong", "🏓", "Ping-pong"], ["duel:babyfoot", "⚽", "Baby-foot"], ["duel:darts", "🎯", "Fléchettes"]);
    else for (const [id, it] of Object.entries(INTERACTIONS)) {
      if (it.cat !== sub) continue;
      const lock = it.need !== undefined && r < it.need ? `${relLevel(it.need)[1].toLowerCase()} requis` : it.max !== undefined && r > it.max ? "pas fâchés" : "";
      items.push([`v:${id}`, it.icon, it.label, lock]);
    }
  } else if (kind === "kitchen") {
    if (fire) items.push(["fire", "🧯", "Éteindre le feu"]);
    else if (sub === "shop") items.push(...shopItems());
    else for (const rc of RECIPES) items.push([`cook:${rc.id}`, rc.icon, rc.label, recipeLock(rc, cookLevel(CHIEF_NAME))]);
    if (sub !== "shop") items.push(["s:shop", "🛒", "Faire les courses…"], ["snack", "☕", "Café / encas"]);
    if (dish?.portions) items.push(["eat", "🍽️", "Manger une part"]);
  } else if (kind === "table") {
    if (dish?.portions) items.push(["eat", "🍽️", `Manger (${dish.portions} part${dish.portions > 1 ? "s" : ""})`]);
    if (dish) items.push(["clear", "🧹", "Débarrasser"]);
    if (!dish) items.push(["kitchen", "🍳", "Aller cuisiner…"]);
  }
  if (sub) items.push(["back", "↩", "Retour"]);
  return items;
}
function pieCenter(kind, target) {
  if (kind === "worker") { const e = ents.get(target), a = e?.agent; return `<b>${esc(e?.who || "")}</b><span class="muted">${esc(specialty(a?.type))}${a?.ticket ? ` · ${esc(a.ticket)}` : ""}</span><span class="muted">${esc(moodWord(mate(e?.who || "")))}</span>`; }
  if (kind === "dog") return `<b>🐶 ${hub.DOG_NAME}</b><span class="muted">faim ${Math.round(hub.petBook.dog.faim)} · câlins ${Math.round(hub.petBook.dog.love)}</span>`;
  if (kind === "item") return hub.itemPieCenter(target);
  if (kind === "mate") {
    const r = rel(CHIEF_NAME, target), [, label, col] = relLevel(r), m = mate(target);
    return `<b>${esc(target)}</b><span style="color:${col}">${esc(label)}</span><span class="rbar"><i style="left:${r < 0 ? 50 + r / 2 : 50}%;width:${Math.abs(r) / 2}%;background:${col}"></i></span><span class="muted">${esc(moodWord(m))} · 🍳 niv. ${cookLevel(target)}</span>`;
  }
  if (kind === "kitchen") return `<b>Cuisine</b><span class="muted">${esc(CHIEF_NAME)} : 🍳 niv. ${cookLevel(CHIEF_NAME)}</span><span class="muted">💰 ${fmtSim(wallet.funds)}</span><span class="muted">🧊 ${fridgeLine()}</span>${cooking ? `<span class="muted">${esc(cooking.cook)} cuisine ${cooking.recipe.icon}</span>` : ""}`;
  return `<b>Table</b><span class="muted">${dish ? `${dish.recipe.icon} ${esc(dish.recipe.label)}${dish.burnt ? " (cramé)" : ""} · par ${esc(dish.cook)}` : "rien à manger"}</span>`;
}
function openPie(kind, target, p, sub = null) {
  pieCtx = { kind, target, p, sub, view };
  const items = pieItems(kind, target, sub), rect = cv.getBoundingClientRect();
  const cx = Math.max(150, Math.min(innerWidth - 150, rect.left + p.x / W * rect.width)), cy = Math.max(140, Math.min(innerHeight - 140, rect.top + p.y / H * rect.height));
  const rad = items.length > 6 ? 128 : 112;
  pie.style.left = `${cx}px`; pie.style.top = `${cy}px`;
  pie.innerHTML = `<div class="core">${pieCenter(kind, target)}</div>` + items.map(([id, icon, label, lock], i) => {
    const a = -Math.PI / 2 + i / items.length * Math.PI * 2;
    return `<button role="menuitem" data-pie="${esc(id)}" style="--x:${Math.round(Math.cos(a) * rad)}px;--y:${Math.round(Math.sin(a) * rad * 0.86)}px;--d:${i * 25}ms"${lock ? ` disabled title="${esc(lock)}"` : ""}><span class="ic">${icon}</span>${esc(label)}${lock ? `<small>${esc(lock)}</small>` : ""}</button>`;
  }).join("");
  pie.hidden = false;
  pie.querySelector("button:not([disabled])")?.focus({ preventScroll: true });
}
export function closePie() { pie.hidden = true; pieCtx = null; }
pie.addEventListener("click", ev => {
  const b = ev.target.closest("button[data-pie]"); if (!b || !pieCtx) return;
  const { kind, target, p } = pieCtx, id = b.dataset.pie;
  if (id === "back") return openPie(kind, target, p);
  if (id.startsWith("s:")) return openPie(kind, target, p, id.slice(2));
  closePie();
  pieAction(kind, target, id);
});
document.addEventListener("pointerdown", ev => { if (!pie.hidden && !pie.contains(ev.target) && ev.target !== cv) closePie(); });
addEventListener("keydown", ev => { if (ev.key === "Escape" && !pie.hidden) { ev.stopImmediatePropagation(); ev.preventDefault(); closePie(); } }, true);
// the pie closes when its room is left, its dev is called away or its object is sold — not otherwise
setInterval(() => {
  if (!pieCtx) return;
  if (view !== pieCtx.view || (pieCtx.kind === "mate" && !here(pieCtx.target)) || (pieCtx.kind === "item" && !hub.itemByUid(pieCtx.target))) closePie();
}, 500);

export function pieAction(kind, target, id) {
  if (kind === "worker") return workerAction(target, id);
  if (kind === "dog") return hub.dogAction(id);
  if (kind === "item") return hub.itemPieAction(target, id);
  if (id === "fiche") { loungeSay(target, pick(["Salut chef !", "Oui ?", "Hey !"])); return openPanel(`mate:${target}`); }
  if (id.startsWith("duel:")) return challenge(target, id.slice(5));
  if (id === "clear") { hub.dish = null; return say(CHIEF_NAME, "Hop, débarrassé."); }
  if (id === "kitchen") return openPie("kitchen", null, { x: 196, y: 60 });
  // everything else is an order for the chief: it joins his action queue (bottom-left), like in the Sims
  if (id === "snack") return hub.enqueue("☕", "Café / encas", () => chiefDo(() => chiefLoungeAct("kitchen")));
  if (id === "eat") return hub.enqueue("🍽️", "Manger", () => chiefDo(() => { if (!goEat(CHIEF_NAME)) say(CHIEF_NAME, "Plus de place à table…"); }));
  if (id === "fire") return hub.enqueue("🧯", "Éteindre le feu", () => chiefDo(() => chiefTo(HELPER, HELP_ACT, () => extinguish(CHIEF_NAME))), true);
  if (id === "invite") {
    return hub.enqueue("🍽️", `Manger avec ${target}`, () => chiefDo(() => { const l = loungers.get(target); if (!l || !dish?.portions) return; say(CHIEF_NAME, `${target}, viens manger !`); l.busy = false; if (goEat(target)) { bond(CHIEF_NAME, target, 3); if (dish?.portions) goEat(CHIEF_NAME); } }));
  }
  if (id.startsWith("shop:")) return shopFor(RECIPES.find(r => r.id === id.slice(5)));
  if (id.startsWith("cook:")) {
    const rc = RECIPES.find(r => r.id === id.slice(5)), helper = kind === "mate" ? target : null;
    return hub.enqueue(rc.icon, `Cuisiner : ${rc.label}${helper ? ` avec ${helper}` : ""}`, () => chiefDo(() => {
      if (cooking || fire) return say(CHIEF_NAME, "La cuisine est occupée.");
      const h = helper && here(helper) ? helper : null;
      if (h) { loungers.get(h).busy = false; say(h, "Avec plaisir, je coupe les légumes !", 2500); }
      startCooking(CHIEF_NAME, rc, h);
    }));
  }
  if (id.startsWith("v:")) {
    const verb = id.slice(2), it = INTERACTIONS[verb];
    return hub.enqueue(it.icon, `${it.label} · ${target}`, () => chiefDo(() => {
      const l = loungers.get(target); if (!l || l.called) return say(CHIEF_NAME, `${target} n'est plus là.`);
      l.busy = true; l.busyUntil = performance.now() + 30000;  // waits for the chief instead of wandering off
      chiefTo(besideOf(l), { id: "talk", label: `parle avec ${target}`, pose: {} }, () => startConvo(CHIEF_NAME, target, verb));
    }));
  }
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get closePie() { return closePie; }, get openPie() { return openPie; } });
