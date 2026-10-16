// The mini-games of the break room, against a dev: each is a MiniGame (js/games/*.js) with its own match state (init),
// its rules (step), its screen (render) and its clicks. A match fills the "game" room (rooms/game.js); its result goes
// to the duels' log, which makes the weekly tournament on the break-room slate.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, clip, text } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { crewAdd } from "../sims/crew.js";
import { loungeSay, loungers } from "../world/lounge.js";

export class MiniGame {
  static all = new Map();  // id → game, the id being the break-room activity it is played on
  constructor(id, label) { Object.assign(this, { id, label }); MiniGame.all.set(id, this); }
  static get(id) { return MiniGame.all.get(id); }
  init() { return {}; }          // the match state of this game
  step(_m, _dt, _t) {}
  render(_m, _t) {}
  click(_m, _p, _t) {}
}

export let match = null;  // the match being played: { name, skin (the game's id), ps, as (scores), over, look, …its own state }
// the chief challenges a dev in the break room
// a challenge on a game bought (items/furniture.js): whoever plays at it, else someone free in the break room
export function duelAt(it, act) {
  const here = [...loungers.values()].filter(l => !l.called && !l.path.length);
  const opp = here.find(l => l.spot?.uid === it.uid) || here.find(l => l.spot?.act?.id === act.id) || here[Math.floor(Math.random() * here.length)];
  if (!opp) return hub.toast("SALLE DE REPOS", "Personne pour jouer", "Tout le monde est au bureau.");
  challenge(opp.name, act.id);
}
export function challenge(name, skin) {
  if (!loungers.has(name)) return;
  const game = MiniGame.get(skin) || MiniGame.get("pingpong");
  match = { name, skin: game.id, ps: 0, as: 0, over: 0, look: loungers.get(name).look, ...game.init() };
  hub.view = "game"; hub.closePanel(); loungeSay(name, "Prépare-toi à perdre !");
}
let duels = new SaveSlot("office-duels", { scores: {}, log: [] }).data;
// a duel in the weekly tournament (also against another chief over the network: games/online.js)
export function logDuel(name, won, skin) {
  duels.log = [...(duels.log || []), { t: Date.now(), name, won, skin }].filter(x => Date.now() - x.t < 35 * 86_400_000);
  SaveSlot.get("office-duels").save(duels);
}
export function endMatch() {
  if (match?.net) return hub.netMatchEnd?.(match);  // against another chief (games/online.js)
  const m = match, won = m.ps > m.as, sc = duels.scores[m.name] || { w: 0, l: 0 };
  if (won) { sc.w++; hub.countWeekly?.("duelwin"); } else sc.l++;
  duels.scores[m.name] = sc;
  logDuel(m.name, won, m.skin);
  crewAdd(m.name, won ? { moral: -3, ennui: -8 } : { moral: 8, ennui: -8 });
  hub.view = "lounge"; match = null;
  loungeSay(m.name, won ? `Revanche, ${CHIEF_NAME} ! 😤` : "GG chef, trop facile 😎");
  const l = loungers.get(m.name); if (l) l.lastDuel = won ? "lost" : "won";
}
/* weekly tournament: every duel counts, 3 points for the winner, 1 for the loser; last week's champion wears the cup */
function weekStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
function tournament(offsetWeeks = 0) {
  const from = weekStart(Date.now()) - offsetWeeks * 7 * 86_400_000, to = from + 7 * 86_400_000, pts = {};
  for (const x of duels.log || []) {
    if (x.t < from || x.t >= to) continue;
    const [win, lose] = x.won ? [CHIEF_NAME, x.name] : [x.name, CHIEF_NAME];
    pts[win] = (pts[win] || 0) + 3; pts[lose] = (pts[lose] || 0) + 1;
  }
  return Object.entries(pts).sort((a, b) => b[1] - a[1]);
}
const champion = () => tournament(1)[0]?.[0] || null;
// the tournament's slate bought (build.js), where it hangs (offscreen: none)
export const TOURNEY = { x: -999, y: -999 };
export function drawTournament(t, at = TOURNEY) {
  const { x, y } = at, w = 50, h = 48, rank = tournament(0);
  ART.slate.draw(x - 1, y - 1, { w, h });
  text("🏆 TOURNOI", x + w / 2, y + 1.5, "#fbaa08", 4.4, "center");
  text("cette semaine", x + w / 2, y + 7, "#adadad", 3.4, "center");
  if (!rank.length) text("aucun duel", x + w / 2, y + 22, "#d5eeff", 4, "center");
  rank.slice(0, 4).forEach(([name, p], i) => {
    text(`${i + 1}. ${clip(name, 8)}`, x + 3, y + 13 + i * 8, i ? "#d5eeff" : "#fbaa08", 4.2);
    text(String(p), x + w - 3, y + 13 + i * 8, "#f7f7f7", 4.2, "right");
  });
  const c = champion();
  if (c) text(`champion : ${clip(c, 9)}`, x + w / 2, y + h - 6, "#51cf66", 3.4, "center");
}

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get challenge() { return challenge; }, get duelAt() { return duelAt; }, get champion() { return champion; }, get duels() { return duels; }, get match() { return match; }, set match(v) { match = v; } });
