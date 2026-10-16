// Devs at their desks: arrival, questions, coffee breaks, sync with the sessions.

import { hub, provide } from "../hub.js";
import { ARRIVAL_GAP, COFFEE, DESKS, DOOR, HAIRS, LANE, QSPOTS, SKINS, TEAM, TICKET_RE, arrivals, chief, clip, ctx, doorFree, ents, firstLoad, fromDesk, hash, mmxQueue, toDesk, typeColor } from "../core/core.js";

/* ---------- entities ---------- */
export function lookFor(id, type) {
  const h = hash(id);
  return { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >> 3) % HAIRS.length], shirt: typeColor(type), style: (h >> 6) % 5, glasses: (h >> 9) % 4 === 0 };
}

// the chief never works himself: when the main session works with no subagent busy, a dev does it (id "chief" = main transcript)
function soloDev(session) {
  if (session?.merged) return null;
  const ch = session?.chief, subs = session?.agents || [];
  if (!ch || ch.finished || ch.idle >= 120 || subs.some(a => ["working", "asking", "blocked"].includes(a.status))) return null;
  return { ...ch, id: "chief", type: ch.agent || "claude", description: session.prompt || session.title, ticket: (session.prompt.match(TICKET_RE) || [null])[0],
    started: "", status: "working", question: null, solo: true };
}

export function sync(session) {
  const solo = soloDev(session);
  const agents = [...(session?.agents || []), ...(solo ? [solo] : [])].filter(a => a.status !== "gone");
  // a delivered dev leaves after a while, unless its MR still waits for a review (then it waits at its desk, up to 30 min)
  const visible = agents.filter(a => !(a.status === "done" && a.idle > (hub.awaitingReview(a, session) ? 1800 : 150))).slice(-DESKS.length);
  const keep = new Set(visible.map(a => a.id));
  for (const [id, e] of ents) {
    if (!keep.has(id) && !e.leaving) {
      if (e.queued) { ents.delete(id); continue; }  // gone before its turn to come in
      if (e.errand) hub.fileItems(e);
      e.path = e.seated ? [{ x: e.desk.x, y: e.desk.y + 28 }, { x: DOOR.x, y: e.desk.y + 28 }, DOOR] : [{ x: e.x, y: LANE }, { x: DOOR.x, y: LANE }, DOOR];
      e.leaving = true; e.seated = false; e.asking = false; e.pauseUntil = 0;
    }
  }
  for (const a of visible) {
    let e = ents.get(a.id);
    if (!e) {
      const used = new Set([...ents.values()].map(x => x.who).filter(Boolean));  // a dev walking out is still in the office
      const free = TEAM.filter(n => !used.has(n) && !hub.isVacant(n));  // a resigned dev's post is vacant (careers.js)
      if (!free.length) continue;
      const pool = free.filter(hub.devHasDesk).length ? free.filter(hub.devHasDesk) : free;  // a dev with a desk first (build.js)
      const who = free.includes(hub.crew.ids[a.id]) ? hub.crew.ids[a.id] : hub.bestDevFor(a, pool);  // the most skilled for this work (skills.js)
      hub.crew.ids[a.id] = who;
      const desk = DESKS[TEAM.indexOf(who)];
      const seat = { x: desk.x, y: desk.y + 22 };
      e = { agent: a, who, desk, look: { ...lookFor(who, a.type), team: true }, x: DOOR.x, y: DOOR.y, path: [], seated: false, leaving: false, picked: firstLoad,
        coffeeNext: performance.now() + 20000 };
      if (firstLoad) { e.x = seat.x; e.y = seat.y; e.seated = true; }
      else {
        // door → board (takes its ticket) → desk
        const bx = hub.BOARD_AT.x + 9 + (DESKS.indexOf(desk) % 5) * 9;  // under the TO DO column of the board (if one is bought)
        e.path = hub.BOARD_AT.x < -100 ? [{ x: DOOR.x, y: LANE }, ...toDesk(desk)]
          : [{ x: DOOR.x, y: LANE }, { x: bx, y: LANE }, { x: bx, y: 76, wait: 1100, pose: "pick", on: x => { x.picked = true; } }, { x: bx, y: LANE }, ...toDesk(desk)];
        if (hub.BOARD_AT.x < -100) e.picked = true;
        // agents launched together come in one after the other
        e.queued = true; arrivals.push(a.id);
      }
      ents.set(a.id, e);
    }
    e.agent = a;
    // a dev with a question walks to the tech lead, and back to its desk once answered
    if (a.status === "asking" && !e.asking && !e.leaving) {
      if (e.errand) hub.fileItems(e);
      const used = new Set([...ents.values()].filter(x => x.asking).map(x => x.spot));
      e.spot = QSPOTS.find(s => !used.has(s)) || QSPOTS[0];
      e.asking = true; e.picked = true; e.pauseUntil = 0; e.coffee = false; e.cup = false;
      if (e.queued) { e.queued = false; arrivals.splice(arrivals.indexOf(a.id), 1); }
      if (firstLoad) { e.x = e.spot.x; e.y = e.spot.y; e.path = []; }
      else e.path = [...(e.seated ? fromDesk(e.desk) : [{ x: e.x, y: LANE }]), { x: e.spot.x, y: LANE }, { ...e.spot }];
      e.seated = false;
    } else if (e.errand) {
      continue;  // walking to the cabinet: comes back to its desk by itself
    } else if (a.status !== "asking" && e.asking && !e.leaving) {
      e.asking = false; e.spot = null;
      e.path = [{ x: e.x, y: LANE }, ...toDesk(e.desk)];
    } else if (e.seated && !e.leaving && a.status === "done" && (hub.mate(e.who).fatigue >= 60 || hub.mate(e.who).cafe <= 30)  // a mission is finished before any break
      && !hub.focusMode && COFFEE.ok && performance.now() > (e.coffeeNext || 0) && !hub.Incident.get("coffee").on && ![...ents.values()].some(x => x.coffee)) goCoffee(e);
  }
  hub.firstLoad = false;
}

// a dev stuck or thinking for a while goes for a coffee (one at a time), then comes back to its desk
function goCoffee(e) {
  const back = toDesk(e.desk), seat = back.pop();
  e.coffee = true; e.seated = false;
  e.path = [...fromDesk(e.desk), { x: COFFEE.x, y: LANE },
    { ...COFFEE, wait: COFFEE.cup?.wait || 4500, pose: "coffee", on: x => {
      const c = COFFEE.cup || { cafe: 45, fatigue: -12, moral: 4 };  // the machine's tier (items/catalog2.js)
      x.cup = true; hub.smoke(COFFEE.x, 56, "#d5eeff"); hub.crewAdd(x.who, { cafe: c.cafe, fatigue: c.fatigue, moral: c.moral, ennui: -10 });
      if (c.tier >= 4) hub.addMoodlet?.(x.who, "latteart", "☕", "Un café de barista", 4, 40); else if (c.tier <= 1) hub.addMoodlet?.(x.who, "badcoffee", "🤢", "Café tiède de la machine filtre", -2, 20);
    } },
    { x: COFFEE.x, y: LANE }, ...back,
    { ...seat, on: x => { x.coffee = false; x.cup = false; x.coffeeNext = performance.now() + 120000; } }];
}

export function step(dt, t) {
  hub.stepFx(dt, t); hub.stepCat(dt, t); hub.stepCrew(dt); hub.stepNeeds(dt); hub.stepChief(dt, t); hub.stepOfficeLife(t); hub.stepLounge(dt, t); hub.stepSocial(dt, t); hub.stepBuild(t); hub.checkBirthdays(); hub.Happening.stepAll(dt, t); hub.stepDog(dt, t); hub.Incident.step(t);
  hub.Room.current().step(dt, t);
  if (mmxQueue.length && ![...ents.values()].some(e => e.errand)) hub.dispatch(mmxQueue.splice(0));
  while (arrivals.length && t >= doorFree) {  // let the next dev in once the previous one cleared the door
    const e = ents.get(arrivals.shift());
    if (!e?.queued) continue;
    e.queued = false; hub.doorFree = t + ARRIVAL_GAP;
    chief.wave = t + 2500; chief.until = t + 5000;
    chief.bubble = `${e.agent.ticket || clip(e.agent.description, 22)} → ${e.who} (${hub.skillTag(e.who, e.agent.type)}) !`;
  }
  for (const [id, e] of ents) {
    if (e.queued) continue;
    if (e.pauseUntil) { if (t < e.pauseUntil) continue; e.pauseUntil = 0; e.pose = ""; }
    if (!e.path.length) { if (e.leaving) ents.delete(id); continue; }
    hub.routeAhead(e.path, e.x, e.y, "office");  // around the furniture (world/route.js)
    const tgt = e.path[0], dx = tgt.x - e.x, dy = tgt.y - e.y, dist = Math.hypot(dx, dy), sp = 0.05 * dt;
    if (dist <= sp) {
      e.x = tgt.x; e.y = tgt.y; e.path.shift();
      if (tgt.on) tgt.on(e);
      if (tgt.wait) { e.pauseUntil = t + tgt.wait; e.pose = tgt.pose || ""; }
      if (!e.path.length && !e.leaving && !e.asking && !e.standup && !e.visiting) e.seated = true;
    } else { e.x += dx / dist * sp; e.y += dy / dist * sp; }
  }
}

// each frame: the room on screen draws itself (js/rooms/)
export function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  hub.Room.current().frame(t);
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get render() { return render; }, get soloDev() { return soloDev; } });
