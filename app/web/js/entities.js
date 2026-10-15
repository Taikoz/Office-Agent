"use strict";
// Devs at their desks: arrival, questions, coffee breaks, sync with the sessions.

/* ---------- entities ---------- */
function lookFor(id, type) {
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

function sync(session) {
  const solo = soloDev(session);
  const agents = [...(session?.agents || []), ...(solo ? [solo] : [])].filter(a => a.status !== "gone");
  // a delivered dev leaves after a while, unless its MR still waits for a review (then it waits at its desk, up to 30 min)
  const visible = agents.filter(a => !(a.status === "done" && a.idle > (awaitingReview(a, session) ? 1800 : 150))).slice(-DESKS.length);
  const keep = new Set(visible.map(a => a.id));
  for (const [id, e] of ents) {
    if (!keep.has(id) && !e.leaving) {
      if (e.queued) { ents.delete(id); continue; }  // gone before its turn to come in
      if (e.errand) fileItems(e);
      e.path = e.seated ? [{ x: e.desk.x, y: e.desk.y + 28 }, { x: DOOR.x, y: e.desk.y + 28 }, DOOR] : [{ x: e.x, y: LANE }, { x: DOOR.x, y: LANE }, DOOR];
      e.leaving = true; e.seated = false; e.asking = false; e.pauseUntil = 0;
    }
  }
  for (const a of visible) {
    let e = ents.get(a.id);
    if (!e) {
      const used = new Set([...ents.values()].map(x => x.who).filter(Boolean));  // a dev walking out is still in the office
      const free = TEAM.filter(n => !used.has(n) && !isVacant(n));  // a resigned dev's post is vacant (careers.js)
      if (!free.length) continue;
      const pool = free.filter(devHasDesk).length ? free.filter(devHasDesk) : free;  // a dev with a desk first (build.js)
      const who = free.includes(crew.ids[a.id]) ? crew.ids[a.id] : bestDevFor(a, pool);  // the most skilled for this work (skills.js)
      crew.ids[a.id] = who;
      const desk = DESKS[TEAM.indexOf(who)];
      const seat = { x: desk.x, y: desk.y + 22 };
      e = { agent: a, who, desk, look: { ...lookFor(who, a.type), team: true }, x: DOOR.x, y: DOOR.y, path: [], seated: false, leaving: false, picked: firstLoad,
        coffeeNext: performance.now() + 20000 };
      if (firstLoad) { e.x = seat.x; e.y = seat.y; e.seated = true; }
      else {
        // door → board (takes its ticket) → desk
        const bx = 16 + (DESKS.indexOf(desk) % 5) * 9;  // under the TO DO column
        e.path = [{ x: DOOR.x, y: LANE }, { x: bx, y: LANE }, { x: bx, y: 76, wait: 1100, pose: "pick", on: x => { x.picked = true; } },
          { x: bx, y: LANE }, ...toDesk(desk)];
        // agents launched together come in one after the other
        e.queued = true; arrivals.push(a.id);
      }
      ents.set(a.id, e);
    }
    e.agent = a;
    // a dev with a question walks to the tech lead, and back to its desk once answered
    if (a.status === "asking" && !e.asking && !e.leaving) {
      if (e.errand) fileItems(e);
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
    } else if (e.seated && !e.leaving && a.status === "done" && (mate(e.who).fatigue >= 60 || mate(e.who).cafe <= 30)  // a mission is finished before any break
      && !focusMode && performance.now() > (e.coffeeNext || 0) && !events.coffee && ![...ents.values()].some(x => x.coffee)) goCoffee(e);
  }
  firstLoad = false;
}

// a dev stuck or thinking for a while goes for a coffee (one at a time), then comes back to its desk
function goCoffee(e) {
  const back = toDesk(e.desk), seat = back.pop();
  e.coffee = true; e.seated = false;
  e.path = [...fromDesk(e.desk), { x: COFFEE.x, y: LANE },
    { ...COFFEE, wait: 4500, pose: "coffee", on: x => { x.cup = true; smoke(COFFEE.x, 56, "#d5eeff"); crewAdd(x.who, { cafe: 45, fatigue: -12, moral: 4, ennui: -10 }); } },
    { x: COFFEE.x, y: LANE }, ...back,
    { ...seat, on: x => { x.coffee = false; x.cup = false; x.coffeeNext = performance.now() + 120000; } }];
}

function step(dt, t) {
  stepFx(dt, t); stepCat(dt, t); stepCrew(dt); stepNeeds(dt); stepChief(dt, t); stepOfficeLife(t); stepLounge(dt, t); stepSocial(dt, t); stepBuild(t); stepHappen(dt, t); stepDog(dt, t); stepEvents(t);
  if (view === "game") stepGame(dt, t);
  if (mmxQueue.length && ![...ents.values()].some(e => e.errand)) dispatch(mmxQueue.splice(0));
  while (arrivals.length && t >= doorFree) {  // let the next dev in once the previous one cleared the door
    const e = ents.get(arrivals.shift());
    if (!e?.queued) continue;
    e.queued = false; doorFree = t + ARRIVAL_GAP;
    chief.wave = t + 2500; chief.until = t + 5000;
    chief.bubble = `${e.agent.ticket || clip(e.agent.description, 22)} → ${e.who} (${skillTag(e.who, e.agent.type)}) !`;
  }
  for (const [id, e] of ents) {
    if (e.queued) continue;
    if (e.pauseUntil) { if (t < e.pauseUntil) continue; e.pauseUntil = 0; e.pose = ""; }
    if (!e.path.length) { if (e.leaving) ents.delete(id); continue; }
    const tgt = e.path[0], dx = tgt.x - e.x, dy = tgt.y - e.y, dist = Math.hypot(dx, dy), sp = 0.05 * dt;
    if (dist <= sp) {
      e.x = tgt.x; e.y = tgt.y; e.path.shift();
      if (tgt.on) tgt.on(e);
      if (tgt.wait) { e.pauseUntil = t + tgt.wait; e.pose = tgt.pose || ""; }
      if (!e.path.length && !e.leaving && !e.asking && !e.standup && !e.visiting) e.seated = true;
    } else { e.x += dx / dist * sp; e.y += dy / dist * sp; }
  }
}

function render(t) {
  const session = curSession();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (view === "lounge") return renderLounge(t);
  if (view === "game") return renderGame(t);
  if (view === "meeting") return renderMeeting(t);
  if (view === "terrace") return renderTerrace(t);
  drawRoom(t);
  drawBoard(session);
  drawRoomItems("office", t);
  drawNight();
  // chief on his podium
  const ch = session?.chief;
  art("podium", 210, 84.6, 24, 8.2, PODIUM_ART);
  drawConsole(t);
  const asking = [...ents.values()].filter(e => e.asking && !e.path.length);
  if (chief.room === "office") {
    const onPodium = chief.at === "podium" && !chief.path.length, walking = chief.path.length > 0;
    const waving = onPodium && !ch?.question && (t < chief.wave || (ch && !ch.finished && ch.idle < 20));
    const gaming = chief.at === "console" && !chief.path.length, asleep = gaming && ch?.idle > 900;
    if (!(["pc", "chiefos"].includes(chief.at) && !walking)) drawPerson(chief.x, chief.y, CHIEF_LOOK, { tux: true, frame: Math.floor(t / (walking ? 180 : gaming ? 140 : 250)), smile: !asleep,
      arms: waving ? "baton" : gaming && !asleep ? "type" : chief.at === "coffee" && !chief.path.length ? "up" : "down", back: gaming || (walking && chief.path[0].y < chief.y), seated: gaming });
    if (chief.cup) { px(chief.x + 4, chief.y - 13, 2.5, 3, "#f4f2ea"); px(chief.x + 4, chief.y - 13, 2.5, 0.8, "#6d4a2e"); }
    text(CHIEF_NAME.toUpperCase(), chief.x, chief.y + (onPodium ? 7 : 2), "#fbaa08", 4.6, "center");
    const cx = chief.x, cy = chief.y + 2;
    let say = "";
    if (ch?.question) { bubble(cx, cy - 25, `? ${clip(ch.question.question, 38)}`, "#fbaa08", "#081746"); say = null; }
    else if (asking.length) say = asking.length > 1 ? `${asking.length} questions → à toi de trancher !` : "Question de l'équipe → à toi !";
    else if (t < (chief.until || 0)) say = chief.bubble;
    else if (!session) say = "Personne au bureau.";
    else if (chief.at === "coffee") say = "☕ petite pause";
    else if (gaming) say = asleep ? "zZz…" : (t / 1000) % 14 < 3 ? "GG !" : "🎮 appelle-moi si besoin";
    else if (ch.finished || ch.idle > 120) say = ch.idle > 900 ? "zZz…" : "J'attends tes ordres.";
    else if (ents.get("chief")?.agent.solo) say = `${ents.get("chief").who} est dessus 👍`;
    else if (say !== null) say = clip(ch.action, 40);
    if (say) bubble(cx, cy - 25, say);
  } else {  // gone to the break room: a note on the podium
    text("☕ en pause", 222, 78, "#fbaa08", 4.4, "center");
    if (ch?.question) bubble(222, 72, `? ${clip(ch.question.question, 38)}`, "#fbaa08", "#081746");
  }

  const byDesk = new Map([...ents.values()].filter(e => !e.leaving).map(e => [e.desk, e]));
  for (const d of DESKS) drawDesk(d, byDesk.get(d), t);
  drawChiefPc(t);
  drawCake(t);
  drawCabinet(t, cv.classList.contains("hover-store"));
  drawEvents(t);
  drawCat(t);
  drawDog(t);
  const order = [...ents.values()].sort((a, b) => a.y - b.y);
  for (const e of order) {
    if (e.queued) continue;  // still waiting outside
    const a = e.agent, f = Math.floor(t / 180);
    if (selected === a.id) {
      const bob = Math.sin(t / 200) * 1.5, mx = e.seated ? e.desk.x : e.x, my = e.seated ? e.desk.y - 30 : e.y - 34;
      px(mx - 3, my + bob, 6, 2, "#fbaa08"); px(mx - 2, my + 2 + bob, 4, 1.5, "#fbaa08"); px(mx - 1, my + 3.5 + bob, 2, 1.5, "#fbaa08");
    }
    if (e.seated) {
      const st = a.status;
      const stuck = isStuck(a), pulling = stuck && Math.floor(t / 700) % 2 === 0;  // pulls its hair out, on and off
      const shake = st === "blocked" || pulling ? Math.sin(t / 40) * 0.5 : 0;
      const celebrate = st === "done" && a.idle < 20;
      px(e.x - 6, e.y - 6, 12, 3, "#3a3a48");
      const party = t < (e.fxUntil || 0) && ["pass", "mr", "boss", "verify"].includes(e.fxKind);
      drawPerson(e.x + shake, e.y, e.look, { seated: true, back: true, arms: celebrate || party || pulling ? "up" : st === "working" ? "type" : "down", frame: f });
      if (a.game?.boss) drawBoss(e.desk.x - 28 + (t - (e.bossHitAt || 0) < 180 ? 2 : 0), e.desk.y + 10, a.game.boss, t, t - (e.bossHitAt || 0) < 500);
      if (e.fxKind === "mr" && t < e.fxUntil) drawBell(e.desk.x + 13, e.desk.y - 24, t);
      badge(e.desk.x, e.desk.y + 23, e.who ? nameTag(e.who) : specialty(a.type), typeColor(a.type));
      if (a.ticket) text(a.ticket, e.desk.x, e.desk.y + 29.5, "#d5eeff", 4.2, "center");
      let msg = "", bg = "#f4f2ea", fg = "#1c1c24";
      if (st === "working") msg = a.idle > 45 ? "… réfléchit" : clip(a.action, 34);
      else if (st === "blocked") { msg = clip(a.lastError || "bloqué", 34); bg = "#ff6b6b"; }
      else if (st === "done") { msg = "Livré ✓"; bg = "#51cf66"; }
      if (stuck) { msg = Math.floor(t / 5000) % 2 ? "🤯 ça tourne en rond…" : clip(a.action, 30); bg = "#ff9f43"; }
      else if (collisionMap.has(a.id) && Math.floor(t / 4000) % 2 === 0) { const c = collisionMap.get(a.id); msg = `😠 ${crew.ids[c.other.id] || "quelqu'un"} touche à ${clip(shortFile(c.file), 18)} !`; bg = "#ff9f43"; }
      else if (ciFailed(a) && Math.floor(t / 5000) % 2 === 0) { msg = "😩 la CI a cassé"; bg = "#ff6b6b"; fg = "#fff"; }
      else if (overBudget(a) && st === "working" && Math.floor(t / 6000) % 3 === 0) { msg = `💸 ${money(a.game.cost)} : budget dépassé`; bg = "#ff6b6b"; fg = "#fff"; }
      const waitsReview = awaitingReview(a, session);
      const mood = st !== "blocked" && !stuck && !waitsReview && moodLine(e, t);
      if (mood) { msg = mood; bg = "#d5eeff"; }
      if (t < (e.fxUntil || 0)) { msg = e.fxMsg; bg = FX_BG[e.fxKind] || bg; fg = e.fxKind === "fail" ? "#fff" : "#1c1c24"; }
      if (waitsReview) drawReviewSign(e.desk.x + 12, e.desk.y - 20, t);
      else bubble(e.desk.x, e.desk.y - 16, msg, bg, fg);
    } else {
      const paused = !!e.pauseUntil, still = paused || !e.path.length;
      drawPerson(e.x, e.y, e.look, { frame: still ? 0 : f, back: ["pick", "file", "coffee", "standup", "pair"].includes(e.pose) || (!still && e.path[0].y < e.y),
        arms: e.pose === "pick" || e.pose === "file" ? "up" : "down" });
      if (e.errand && e.pose !== "file") {  // carries its papers to the MMX cabinet
        const n = Math.min(3, e.errand.items.length);
        for (let k = 0; k < n; k++) px(e.x + 3 + k * 0.8, e.y - 14 - k * 1.2, 5, 4, k % 2 ? "#fff7b8" : "#f4f2ea");
        if (!still) bubble(e.x, e.y - 24, `→ MMX : ${e.errand.label}`);
      } else if (e.cup) { px(e.x + 4, e.y - 13, 2.5, 3, "#f4f2ea"); px(e.x + 4, e.y - 13, 2.5, 0.8, "#6d4a2e"); }  // coffee cup
      else if (e.picked && !e.asking && !e.leaving && !still) px(e.x + 4, e.y - 13, 3.5, 3.5, "#fff7b8");  // carries its ticket
      if (e.pose === "coffee") bubble(e.x, e.y - 24, a.status === "blocked" ? "☕ je souffle un coup" : "☕ pause café", "#d6a77f");
      if (e.pose === "file") bubble(e.x, e.y - 24, e.errand?.pendingOnly ? `${e.errand.label} → à valider` : `Je range ${e.errand?.label || ""}`, "#51cf66");
      if (e.pose === "pick") bubble(e.x, e.y - 24, a.ticket ? `Je prends ${a.ticket}` : "Je prends ce ticket");
      if (e.pose === "alarm") bubble(e.x, e.y - 24, "🚨 faille critique !", "#ff6b6b", "#fff");
      if (e.pose === "cake" && Math.floor(t / 2500) % 3 === 0) bubble(e.x, e.y - 24, ["🎂 miam", "bravo !", "🎉"][hash(e.who || "") % 3], "#f4c2d7");
      if (e.pose === "pair" && Math.floor(t / 4000) % 3 === 0) bubble(e.x, e.y - 24, pairBubble(e), "#b48cff");
      if (e.asking && !e.path.length) {
        bubble(e.x, e.y - 24, `? ${clip(a.question?.question || "question", 30)}`, "#fbaa08", "#081746");
        if (a.ticket) text(a.ticket, e.x, e.y + 7.5, "#d5eeff", 4.2, "center");
      }
      badge(e.x, e.y + 2, e.who ? nameTag(e.who) : specialty(a.type), typeColor(a.type));
    }
  }
  drawHappenOffice(t);
  if (!ents.size && session) text("Aucun dev sur cette session — le chef travaille seul.", W / 2, 150, "#d5eeff", 5, "center");
  for (const e of ents.values()) if (!e.queued && !e.leaving) drawEmotion(e.who, e.seated ? e.x + 10 : e.x, e.seated ? e.y - 12 : e.y - 25, t);
  if (chief.room === "office") drawEmotion(CHIEF_NAME, chief.x, chief.y - (chief.at === "console" && !chief.path.length ? 18 : 25), t);
  drawFx(t);
  drawLaser(t);
  drawDrag(t);
  drawFloaters(t);
  drawCashFx(t);
  drawSeasonOver(t);
  drawAlarm(t);
  drawBuyOverlay("office", t);
}
