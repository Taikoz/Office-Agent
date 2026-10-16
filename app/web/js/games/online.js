// Ping-pong, baby-foot and darts against another chief over the network (the phone's Défis), and their spectators.
// The challenger's page plays the match (games/pingpong.js, babyfoot.js, darts.js with match.net: the other side
// follows the other chief); twenty times a second each page sends its part through the network server (office/net.py
// relay): the challenger the match, the other one his line, his shots or his darts. Each player sees himself on the
// left, in yellow. A spectator reads the challenger's match as it is (office/net.py watch) and cheers (👏 🔥 …), seen
// by everyone in the match. The result goes to the weekly tournament (games/base.js logDuel). Échap gives up.

import { hub, provide } from "../hub.js";
import { H, W, px, text } from "../core/core.js";
import { MiniGame, logDuel, match } from "./base.js";
import { keysDown } from "./pingpong.js";
import { footState, footView } from "./babyfoot.js";
import { dartsAimAt, dartsNetStart, dartsState, dartsView } from "./darts.js";
import { call, net } from "../world/peers.js";
import { setView, view } from "../world/lounge.js";
import { sfx, toast } from "../sims/progress.js";

export const DUEL_GAMES = { pingpong: ["🏓", "ping-pong"], babyfoot: ["⚽", "baby-foot"], darts: ["🎯", "fléchettes"] };
export const CHEERS = { clap: "👏", wow: "😮", laugh: "😂", fire: "🔥", love: "❤️" };
const pending = new Map();  // gid → { pid, skin, at }: our challenges waiting for an answer
const gid = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, "0")).join("");
const say = (verb, to, rest) => call("chat", { sid: net.sid, kind: "duel", to, text: `${verb}:${rest}` });
const lookOf = pid => ({ skin: "#f1c7a3", hair: "#3a2a1a", shirt: "#2a4a8a", ...(net.peers.find(x => x.pid === pid)?.look || {}) });
let back = "lounge";  // the view to go back to after the match (the office we visit stays)

// the ball goes on between two updates
const ballOf = (v, m, t) => { const k = Math.min(80, t - m.viewAt); return v.b && [v.b[0] + (v.b[2] || 0) * k, v.b[1] + (v.b[3] || 0) * k]; };
// what each game sends (the challenger: his match; the other one: his part) and how a player (turned) or a spectator sees it
const NET = {
  pingpong: {
    state: m => ({ py: Math.round(m.py), ay: Math.round(m.ay), b: m.ball && [m.ball.x, m.ball.y, m.ball.vx, m.ball.vy].map(x => Math.round(x * 1000) / 1000) }),
    input: m => ({ py: Math.round(m.py) }),
    view: (v, m, t, turned) => {
      const b = ballOf(v, m, t);
      return turned ? { name: m.name, look: m.look, ps: v.as, as: v.ps, py: m.py, ay: v.py, ball: b && { x: 400 - b[0], y: b[1] }, over: v.over ? 1 : 0 }
        : { name: m.name, look: m.look, leftName: m.leftName, leftLook: m.leftLook, ps: v.ps, as: v.as, py: v.py, ay: v.ay ?? 116, ball: b && { x: b[0], y: b[1] }, over: v.over ? 1 : 0 };
    },
  },
  babyfoot: { state: (m, t) => footState(m, t), input: m => ({ py: Math.round(m.py), kick: m.kicks }), view: (v, m, t, turned) => footView({ ...v, b: ballOf(v, m, t) }, m, t, turned) },
  darts: { state: m => dartsState(m), input: m => ({ th: m.throws.slice(-6) }), view: (v, m, t, turned) => dartsView(v, m, turned) },
};

export async function challengeChief(pid, skin) {
  if (!net.sid || !DUEL_GAMES[skin]) return;
  const p = net.peers.find(x => x.pid === pid); if (!p) throw new Error("ce chef n'est plus là");
  if (p.status === "dnd") throw new Error(`${p.name} ne veut pas être dérangé`);
  if (p.duel) throw new Error(`${p.name} est déjà en partie`);
  const g = gid(); pending.set(g, { pid, skin, at: Date.now() });
  await say("invite", pid, `${skin}:${g}`);
  toast(`${DUEL_GAMES[skin][0]} DÉFI`, `Défi envoyé à ${p.name}`, "Son téléphone sonne…");
}

function enter() { back = view === "visit" ? "visit" : view === "game" ? "lounge" : view; hub.view = "game"; hub.closePanel?.(); hub.phoneClose?.(); sfx("achievement"); }
function start(g, skin, pid, name, lead) {
  const base = { name, look: lookOf(pid), ps: 0, as: 0, over: 0, cheers: [], net: { gid: g, pid, lead, in: { py: 116, kick: 0, th: [] }, kicked: 0, thrown: 0, seen: performance.now(), watching: 0 } };
  if (lead) { hub.match = { ...base, skin, ...MiniGame.get(skin).init() }; if (skin === "darts") dartsNetStart(); }
  else hub.match = { ...base, skin: "netview", real: skin, py: 116, kicks: 0, throws: [], view: null, viewAt: 0 };
  enter();
}
// watching a duel: the challenger's match (pid), against the other one
export function watchDuel(pid) {
  const p = net.peers.find(x => x.pid === pid), [g, skin, vs] = (p?.duel || "").split(":");
  if (!p || !g) throw new Error("plus de partie en cours");
  if (match) throw new Error("tu es déjà en partie");
  hub.match = { skin: "netview", real: skin, name: net.peers.find(x => x.pid === vs)?.name || "?", look: lookOf(vs), leftName: p.name, leftLook: lookOf(pid), ps: 0, as: 0, py: 116, kicks: 0, throws: [],
    view: null, viewAt: 0, cheers: [], net: { gid: g, pid, lead: false, watch: true, others: [pid, vs], seen: performance.now(), started: performance.now(), watching: 0 } };
  enter();
}
// a cheer from a spectator: to both players; shown here too
export function cheer(key) {
  const m = match; if (!m?.net?.watch || !CHEERS[key]) return;
  for (const to of m.net.others) say("cheer", to, `${m.net.gid}:${key}`).catch(() => {});
  m.cheers.push({ e: CHEERS[key], at: performance.now(), x: 60 + Math.random() * 280 });
}
// in the challenger's presence (world/peers.js): "gid:game:opponent", so the others can watch
hub.duelInfo = () => match?.net && !match.net.watch && match.net.lead && !match.over ? `${match.net.gid}:${match.skin}:${match.net.pid}` : "";

// a message about a duel (world/peers.js received)
hub.onDuelMsg = (m, t) => {
  const [verb, a, b] = m.text.split(":");
  if (verb === "cheer") { if (match?.net?.gid === a && CHEERS[b]) match.cheers.push({ e: CHEERS[b], at: t, x: 60 + Math.random() * 280 }); return; }
  if (verb === "invite") {
    if (match || net.ringing) return say("busy", m.from, b).catch(() => {});
    if (net.presence === "dnd") { say("decline", m.from, b).catch(() => {}); return toast("📱 DÉFI", `${m.name} t'a défié`, "Refusé : tu es en « ne pas déranger »."); }
    net.ringing = { kind: "duel", from: m.from, name: m.name, skin: a, gid: b, at: t }; hub.phoneRing?.();
    return;
  }
  const p = pending.get(a);
  if (verb === "accept" && p && p.pid === m.from) { pending.delete(a); return start(a, p.skin, m.from, m.name, true); }
  if ((verb === "decline" || verb === "busy") && p) { pending.delete(a); return toast("📱 DÉFI", `${m.name} ${verb === "busy" ? "est occupé" : "refuse le défi"}`, ""); }
  if (verb === "quit" && match?.net?.gid === a && !match.over && !match.net.watch) { toast("🏳️ ABANDON", `${m.name} abandonne`, "Victoire par forfait !"); finish(match, true, false); }
};
hub.answerDuel = async (r, yes) => {
  await say(yes ? "accept" : "decline", r.from, r.gid);
  if (yes) start(r.gid, r.skin, r.from, r.name, false);
};

// the end: by the score (both pages), by giving up (Échap: panel.js → endMatch → here), or the other one gone
function leaveGame() { hub.match = null; if (back === "visit" && net.visit) setView("visit"); else hub.view = back === "visit" ? "office" : back; }
function finish(m, won, tell) {
  if (m.net.watch) return leaveGame();
  if (tell) say("quit", m.net.pid, m.net.gid).catch(() => {});
  logDuel(`🌐 ${m.name}`, won, m.real || m.skin);
  leaveGame();
  toast(won ? "🏆 VICTOIRE" : "DÉFAITE", `${won ? "Tu bats" : "Battu par"} ${m.name}`, (m.real || m.skin) === "darts" ? "" : `${Math.max(m.ps, m.as)} — ${Math.min(m.ps, m.as)}`);
}
hub.netMatchEnd = m => {
  const gaveUp = !m.over && !m.overAt;  // Échap sets the score for the other one
  finish(m, gaveUp ? false : m.ps > m.as, gaveUp);
};

/* ---------- the screen of the other player, or of a spectator: the challenger's match ---------- */
function drawCheers(m, t) {
  m.cheers = (m.cheers || []).filter(c => t - c.at < 2200);
  for (const c of m.cheers) { const k = (t - c.at) / 2200; text(c.e, c.x, 200 - k * 150, "#fff", 12 * (1 - k * 0.3), "center"); }
  if (m.net.watching) text(`👀 ${m.net.watching} spectateur${m.net.watching > 1 ? "s" : ""}`, 396, 214, "#adadad", 4, "right");
}
class NetView extends MiniGame {
  constructor() { super("netview", "En ligne"); }
  step(m, dt, t) {
    if (!m.net.watch) {  // a player: his line, the mouse or ↑ / ↓, like at home
      if (m.mouseY != null) m.py = m.real === "babyfoot" ? m.mouseY : m.py + Math.max(-0.2 * dt, Math.min(0.2 * dt, m.mouseY - m.py));
      if (keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("z")) m.py -= 0.18 * dt;
      if (keysDown.has("ArrowDown") || keysDown.has("s")) m.py += 0.18 * dt;
      m.py = Math.max(40, Math.min(192, m.py));
    }
    const v = m.view; if (!v) return;
    if (m.net.watch) { m.ps = v.ps; m.as = v.as; } else { m.ps = v.as; m.as = v.ps; }
    if (v.over && !m.overAt) m.overAt = t + (m.real === "darts" ? 3200 : 2600);
    if (m.overAt && t > m.overAt) finish(m, m.ps > m.as, false);
  }
  render(m, t) {
    const v = m.view;
    if (!v) { px(0, 0, W, H, "#040c26"); text(m.net.watch ? `Connexion à la partie de ${m.leftName}…` : `Connexion à la partie avec ${m.name}…`, 200, 110, "#d5eeff", 7, "center"); return; }
    MiniGame.get(m.real).render(NET[m.real].view(v, m, t, !m.net.watch), t);
    if (m.net.watch) { px(0, 0, 70, 9, "#c0303a"); text("👀 SPECTATEUR", 35, 1.6, "#fff", 4.4, "center"); text("1 à 5 : encourager 👏 😮 😂 🔥 ❤️ · Échap : quitter", 200, 222, "#adadad", 4, "center"); }
    drawCheers(m, t);
  }
  click(m, p, t) {
    if (m.net.watch) return;
    if (m.real === "babyfoot") m.kicks++;
    if (m.real === "darts" && m.view) {  // our turn: up to three darts, thrown here, played on the challenger's page
      const v = NET.darts.view(m.view, m, t, true);
      if (v.turn === "p" && !v.next && !v.over && m.throws.length - (m.lastTurnThrows || 0) < 3) { const a = dartsAimAt(p, t); m.throws.push([m.throws.length + 1, Math.round(a.x * 10) / 10, Math.round(a.y * 10) / 10]); }
    }
  }
}
new NetView();
addEventListener("keydown", ev => {
  if (view !== "game" || match?.skin !== "netview") return;
  if (match.real === "babyfoot" && !match.net.watch && ev.key === " ") { ev.preventDefault(); if (!ev.repeat) match.kicks++; }
  if (match.net.watch && /^[1-5]$/.test(ev.key)) cheer(Object.keys(CHEERS)[+ev.key - 1]);
});
// the challenger's own screen gets the cheers too (rooms/game.js)
hub.drawNetOverlay = t => { const m = match; if (m?.net && !m.net.watch && m.skin !== "netview") drawCheers(m, t); };

/* ---------- twenty times a second: our part out, the other one's in ---------- */
let busy = false;
setInterval(async () => {
  const m = match; if (!m?.net || busy) return;
  if (!net.sid) { leaveGame(); return toast("RÉSEAU 🌐", "Déconnecté", "Partie annulée."); }
  const t = performance.now(), n = m.net, game = m.real || m.skin;
  busy = true;
  try {
    if (n.watch) {  // the match is over when its challenger no longer shows it
      if (!net.peers.find(x => x.pid === n.pid)?.duel?.startsWith(n.gid) && performance.now() - n.started > 3000) { toast("👀 SPECTATEUR", "La partie est finie", ""); return leaveGame(); }
      const out = await call("watch", { sid: net.sid, gid: n.gid, pid: n.pid });
      if (match === m && out.st) { n.seen = performance.now(); m.view = out.st; m.viewAt = performance.now(); }
    } else {
      if (game === "darts" && !n.lead && m.view) {  // a new turn of ours: three darts again
        const turn = `${m.view.round}:${m.view.turn}`;
        if (turn !== m.turnKey) { m.turnKey = turn; m.lastTurnThrows = m.throws.length; }
      }
      const st = n.lead ? { ps: m.ps, as: m.as, over: !!m.over, ...NET[game].state(m, t) } : NET[game].input(m);
      const out = await call("duel", { sid: net.sid, gid: n.gid, st });
      if (match !== m) return;
      n.watching = out.watching || 0;
      if (out.st) { n.seen = performance.now(); if (n.lead) n.in = { py: +out.st.py || 116, kick: +out.st.kick || 0, th: Array.isArray(out.st.th) ? out.st.th : [] }; else { m.view = out.st; m.viewAt = performance.now(); } }
    }
    if (performance.now() - n.seen > 12000 && !m.over && match === m) { toast("RÉSEAU 🌐", n.watch ? "La partie est finie" : `${m.name} ne répond plus`, n.watch ? "" : "Partie annulée."); leaveGame(); }
  } catch (_) { if (n.watch && performance.now() - n.seen > 4000 && match === m) leaveGame(); } finally { busy = false; }
}, 50);

provide({ get challengeChief() { return challengeChief; }, get watchDuel() { return watchDuel; } });
