"use strict";
// Office life driven by the real work: stand-up at the board while the lead plans, pair review at the author's desk,
// day/night light following the real hour.

/* stand-up: the main session plans (TodoWrite, plan mode) → the seated devs gather in front of the board */
const STANDUP_RE = /TodoWrite|plan/i, STANDUP_SPOTS = [34, 58, 82, 106, 130, 154, 178, 196].map(x => ({ x, y: 80 }));
const standup = { on: false, since: 0, until: 0 };

function stepStandup(t) {
  const ch = curSession()?.chief;
  const planning = !!ch && !ch.finished && ch.idle < 60 && STANDUP_RE.test(ch.action || "");
  if (planning && !standup.on && t > standup.until + 30000) {
    const devs = [...ents.values()].filter(e => e.seated && !e.leaving && !e.asking && !e.errand && !e.coffee && !e.visiting);
    if (devs.length < 2) return;
    Object.assign(standup, { on: true, since: t });
    devs.slice(0, STANDUP_SPOTS.length).forEach((e, i) => {
      const spot = STANDUP_SPOTS[i];
      e.standup = true; e.seated = false;
      e.path = [...fromDesk(e.desk), { x: spot.x, y: LANE }, { ...spot, on: x => { x.pose = "standup"; } }];
    });
    chief.wave = t + 3000; chief.until = t + 5000; chief.bubble = "Stand-up : on planifie !";
  }
  // ends 20 s after the planning stops, or after 1 min anyway
  if (cake) return;  // no stand-up during the cake
  if (standup.on && ((!planning && t - standup.since > 20000) || t - standup.since > 60000)) {
    standup.on = false; standup.until = t;
    for (const e of ents.values()) if (e.standup && !e.leaving) standupBack(e);
  }
}
function standupBack(e) {
  e.standup = false; e.pose = "";
  if (e.asking) return;
  e.path = [{ x: e.x, y: LANE }, ...toDesk(e.desk)];
}

/* pair review: an mr-reviewer working on the same ticket as another dev in the office goes and sits by their side */
function stepPairs(t) {
  for (const e of ents.values()) {
    const a = e.agent;
    if (a.type !== "mr-reviewer" || e.leaving || e.asking || e.standup) continue;
    const partner = a.ticket && [...ents.values()].find(p => p !== e && !p.leaving && p.seated && p.agent.ticket === a.ticket && p.agent.type !== "mr-reviewer");
    const wants = a.status === "working" && partner;
    if (wants && e.seated && !e.visiting && !e.coffee && t > (e.visitNext || 0)) {
      const d = partner.desk, spot = { x: d.x + 15, y: d.y + 23 };
      e.visiting = partner.agent.id; e.seated = false;
      e.path = [...fromDesk(e.desk), { x: aisle(d), y: LANE }, { x: aisle(d), y: d.y + 28 }, { x: spot.x, y: d.y + 28 },
        { ...spot, on: x => { x.pose = "pair"; } }];
    } else if (e.visiting && !e.path.length && (!wants || partner.agent.id !== e.visiting)) {
      const d = DESKS.find(x => Math.abs(x.x + 15 - e.x) < 1) || e.desk;
      e.pose = ""; e.visitNext = t + 60000;
      e.path = [{ x: e.x, y: d.y + 28 }, { x: aisle(d), y: d.y + 28 }, { x: aisle(d), y: LANE }, ...toDesk(e.desk),
        { ...toDesk(e.desk).pop(), on: x => { x.visiting = null; } }];
    }
  }
}
function pairBubble(e) {
  const p = ents.get(e.visiting);
  return p ? `🔍 relecture avec ${p.who || "le dev"}` : "🔍 relecture";
}

function stepOfficeLife(t) { if (view === "office" && !focusMode) { stepStandup(t); stepPairs(t); stepCake(t); } }

/* a dev whose MR waits for a review holds up a sign; drop its ticket on a free desk to launch the review */
function drawReviewSign(x, y, t) {
  const bob = Math.sin(t / 300) * 1.2;
  px(x - 0.5, y + bob, 1, 12, "#8d6a4a");
  px(x - 13, y - 9 + bob, 26, 10, "#fbaa08"); px(x - 12, y - 8 + bob, 24, 8, "#fff7b8");
  text("REVIEW ?", x, y - 7.6 + bob, "#0c2470", 4.6, "center");
}

/* day/night: the office darkens in the evening; occupied desks keep their lamp on */
function nightLevel() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  if (h >= 8 && h < 18) return 0;
  if (h >= 18 && h < 21) return 0.5 * (h - 18) / 3;
  if (h >= 6 && h < 8) return 0.5 * (8 - h) / 2;
  return 0.5;
}
function drawNight() {
  const n = focusMode ? 0 : nightLevel();
  if (!n) return;
  ctx.fillStyle = `rgba(6, 10, 40, ${n})`; ctx.fillRect(0, 0, cv.width, cv.height);
  for (const e of ents.values()) {
    if (e.leaving || e.queued) continue;
    const x = e.desk.x * S, y = (e.desk.y - 4) * S, r = 34 * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 214, 120, ${n * 0.55})`); g.addColorStop(1, "rgba(255, 214, 120, 0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}
