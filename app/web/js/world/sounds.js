// What the office sounds like, beyond the ambiance (world/ambience.js, its buses and its synths):
//  - the effects: softer sounds replace the 8-bit ones (a marimba for the tests that pass, a "plouf" for those that
//    fail, a bell for an MR, a fanfare for a delivery…), and the agents' events get theirs: a doorbell for a question,
//    two low notes for a blocked dev, a broken CI, a dev turning in circles; the security alarm wails while it lasts;
//  - the voices: each person who speaks (a bubble appears) babbles in their own voice, Sims style (pitch and pace of
//    their own, higher when excited, rising on a question, lower when cross); the cat meows, the dog barks;
//  - the objects of the room on screen: the aquarium's bubbles, the fountain, the fire, the clock, Newton's cradle,
//    the 3D printer, the copier, the microwave, the sink and the dishwasher, the TV while someone sits on the sofa,
//    the arcade and the pinball, the coffee machine when someone takes a coffee, the doors;
//  - the break-room games: the ping-pong ball, the baby-foot, the darts, the dice, the pages, the karaoke, the pan;
//  - the steps of everyone walking: parquet in the office, muffled on the break room's carpet.
// hub.snd(kind, { pan, room }) plays one (false when the sound is not ready: sims/progress.js sfx falls back on 8-bit).

import { hub } from "../hub.js";
import { CHIEF_NAME, W, chief, ents, hash } from "../core/core.js";
import { Activity } from "../activities/base.js";
import { cat } from "./cat.js";
import { cooking } from "../social/kitchen.js";
import { burst, duck, graph, midi, mix, onTick, pick, rnd, scene, tone } from "./ambience.js";

const panOf = x => Math.max(-0.8, Math.min(0.8, (x / W) * 2 - 1));
const live = () => { const A = graph(); return A && hub.soundOn && A.ctx.state === "running" ? A : null; };
const now = () => graph().ctx.currentTime + 0.02;
// a bell: inharmonic partials that ring out
const bell = (dest, at, f, v = 0.05, d = 1.4, pan = 0) => { for (const [k, g] of [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]]) tone(dest, at, { f: f * k, v: v * g, a: 0.003, d: d / Math.sqrt(k), pan }); };
// a marimba note: a sine and its fourth harmonic, short
const mallet = (dest, at, f, v = 0.06, pan = 0) => { tone(dest, at, { f, v, a: 0.004, d: 0.45, pan }); tone(dest, at, { f: f * 4, v: v * 0.25, a: 0.002, d: 0.08, pan }); };
const brass = (dest, at, notes, d, v = 0.03) => { for (const n of notes) for (const det of [0.997, 1.003]) tone(dest, at, { f: midi(n) * det, type: "sawtooth", v, a: 0.04, d, lp: 1800 }); };

/* ---------- the kit ---------- */
const KIT = {
  tap: (o, A, t) => tone(A.fx, t, { f: 1400, f2: 900, v: 0.025, a: 0.002, d: 0.04, pan: o.pan }),
  commit: (o, A, t) => { tone(A.fx, t, { f: 900, f2: 620, v: 0.05, a: 0.002, d: 0.07, pan: o.pan }); burst(A.fx, t, { f: 3000, q: 2, v: 0.015, d: 0.02, pan: o.pan }); },
  pass: (o, A, t) => [72, 76, 79, 84].forEach((n, i) => mallet(A.fx, t + i * 0.08, midi(n), 0.05)),
  fail: (o, A, t) => { tone(A.fx, t, { f: 320, f2: 110, type: "triangle", v: 0.09, a: 0.01, d: 0.45 }); burst(A.fx, t + 0.18, { kind: "brown", type: "lowpass", f: 300, v: 0.25, a: 0.01, d: 0.4 }); },
  push: (o, A, t) => { burst(A.fx, t, { kind: "pink", f: 1200, q: 0.7, v: 0.08, a: 0.12, d: 0.15 }); tone(A.fx, t + 0.22, { f: 700, f2: 1400, v: 0.04, a: 0.005, d: 0.08 }); },
  mr: (o, A, t) => { bell(A.fx, t, 880, 0.05); bell(A.fx, t + 0.18, 1318, 0.04); },
  verify: (o, A, t) => { bell(A.fx, t, 1046, 0.04, 1); bell(A.fx, t + 0.12, 1568, 0.035, 1.2); },
  boss: (o, A, t) => { brass(A.fx, t, [60, 64, 67], 0.18); brass(A.fx, t + 0.2, [60, 64, 67], 0.18); brass(A.fx, t + 0.42, [65, 69, 72], 0.9, 0.035); },
  level: (o, A, t) => { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => mallet(A.fx, t + i * 0.06, midi(n), 0.045)); KIT.achievement(o, A, t + 0.45); },
  achievement: (o, A, t) => { for (let i = 0; i < 7; i++) tone(A.fx, t + i * 0.05, { f: rnd(1800, 4200), v: 0.018, a: 0.002, d: 0.25, pan: rnd(-0.6, 0.6) }); bell(A.fx, t, 1318, 0.03, 1); },
  cash: (o, A, t) => { burst(A.fx, t, { f: 2500, q: 3, v: 0.06, d: 0.03 }); bell(A.fx, t + 0.06, 2093, 0.035, 0.6); bell(A.fx, t + 0.12, 2637, 0.035, 0.8); },
  meow: (o, A, t) => meow(A, t, o.pan),
  // the agents' events (core/notify.js)
  question: (o, A, t) => { bell(A.fx, t, 659, 0.06, 1.2); bell(A.fx, t + 0.42, 523, 0.06, 1.6); },  // ding… dong
  blocked: (o, A, t) => { tone(A.fx, t, { f: 196, type: "triangle", v: 0.09, a: 0.01, d: 0.3 }); tone(A.fx, t + 0.32, { f: 185, type: "triangle", v: 0.09, a: 0.01, d: 0.5 }); },
  ci: (o, A, t) => { KIT.fail(o, A, t); for (let i = 0; i < 5; i++) tone(A.fx, t + 0.4 + i * 0.07, { f: rnd(500, 900), f2: rnd(1200, 1800), v: 0.02, a: 0.003, d: 0.05 }); },
  stuck: (o, A, t) => tone(A.fx, t, { f: 600, f2: 150, type: "triangle", v: 0.06, a: 0.01, d: 0.9 }),
  deliver: (o, A, t) => { brass(A.fx, t, [67], 0.12); brass(A.fx, t + 0.13, [67], 0.12); brass(A.fx, t + 0.26, [67], 0.12); brass(A.fx, t + 0.4, [63, 67, 72], 0.25); brass(A.fx, t + 0.7, [65, 70, 74], 0.25); brass(A.fx, t + 1, [67, 72, 76], 1.1, 0.035); },
  alarm: (o, A, t) => { for (let i = 0; i < 4; i++) tone(A.fx, t + i * 0.45, { f: i % 2 ? 660 : 880, type: "square", v: 0.03, a: 0.02, d: 0.4, lp: 2500 }); },
  // the world: on the ambiance bus, heard only in the room on screen
  door: (o, A, t) => { burst(A.amb, t, { kind: "brown", type: "lowpass", f: 400, v: 0.25, a: 0.005, d: 0.18, pan: o.pan }); burst(A.amb, t + 0.05, { f: 3200, q: 4, v: 0.04, d: 0.02, pan: o.pan }); tone(A.amb, t, { f: 240, f2: 180, type: "sawtooth", v: 0.006, a: 0.1, d: 0.3, lp: 900, pan: o.pan }); },
  pong: (o, A, t) => { tone(A.fx, t, { f: 1250, v: 0.06, a: 0.001, d: 0.05, pan: o.pan }); burst(A.fx, t, { f: 4000, q: 2, v: 0.02, d: 0.01, pan: o.pan }); },
  kick: (o, A, t) => { burst(A.fx, t, { kind: "brown", type: "lowpass", f: 900, v: 0.3, a: 0.002, d: 0.06, pan: o.pan }); tone(A.fx, t, { f: 700, v: 0.03, a: 0.001, d: 0.03, pan: o.pan }); },
  wall: (o, A, t) => burst(A.fx, t, { f: 1800, q: 1.5, v: 0.05, a: 0.001, d: 0.04, pan: o.pan }),
  dart: (o, A, t) => { burst(A.fx, t, { kind: "brown", type: "lowpass", f: 600, v: 0.35, a: 0.001, d: 0.05, pan: o.pan }); burst(A.fx, t, { f: 2600, q: 3, v: 0.03, d: 0.02, pan: o.pan }); },
  ding: (o, A, t) => bell(A.fx, t, 1760, 0.05, 1.2),
};
hub.snd = (kind, o = {}) => {
  const A = live(); if (!A || !KIT[kind] || (o.room && o.room !== scene().room)) return false;
  try { KIT[kind](o, A, now()); } catch (_) { return false; }
  return true;
};

/* ---------- the voices ---------- */
const VOWELS = [[730, 1090], [400, 1950], [290, 2250], [480, 880], [330, 760], [570, 1600]];  // a, é, i, o, ou, è
// a small room around the voices (a short soft reverb), made once
function roomOf(A) {
  if (!A.room) {
    const c = A.ctx.createConvolver(), len = Math.floor(A.ctx.sampleRate * 0.9), ir = A.ctx.createBuffer(2, len, A.ctx.sampleRate), g = A.ctx.createGain();
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    c.buffer = ir; g.gain.value = 0.2; c.connect(g).connect(A.vox); A.room = c;
  }
  return A.room;
}
// a person's voice, from their name, always the same: low or high, a pace, the vowels they lean on
const voiceOf = who => { const h = hash(String(who || "?")), high = h % 2; return { f0: high ? 185 + (h >> 3) % 70 : 105 + (h >> 3) % 50, rate: 0.085 + ((h >> 5) % 5) * 0.015, bias: h % VOWELS.length }; };
// one phrase in one breath: a soft tone (triangle and sine) with a vibrato and some breath, gliding from syllable to
// syllable through two vowel formants, the volume dipping between them (no hard cut), in a small room
function speak(A, who, msg, x, { sing = false, tv = false } = {}) {
  const ctx = A.ctx, t = now(), pan = panOf(x), v0 = voiceOf(tv ? `tv${Math.floor(Math.random() * 4)}` : who);
  const cross = /[😠😩🚨💸⛔]|!!/.test(msg), excited = !cross && /!|🎉|🍻|bravo|GG/i.test(msg), ask = /\?\s*$/.test(msg);
  const pitch = cross ? 0.88 : excited ? 1.12 : 1, n = Math.max(2, Math.min(sing ? 6 : 8, Math.round(msg.length / 6))), scale = [60, 62, 64, 67, 69, 72];
  const sy = Array.from({ length: n }, (_, i) => ({
    d: sing ? rnd(0.28, 0.5) : v0.rate * rnd(0.85, 1.35) * (cross ? 0.9 : 1),
    f: sing ? midi(pick(scale) - 12 + (v0.f0 > 160 ? 12 : 0)) : v0.f0 * pitch * rnd(0.94, 1.08) * (ask && i === n - 1 ? 1.3 : 1) * (i === n - 1 && !ask ? 0.92 : 1),
    vw: VOWELS[(v0.bias + Math.floor(Math.random() * 3)) % VOWELS.length], gap: sing ? 0.03 : rnd(0.005, 0.03),
  }));
  const node = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; };
  const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const tri = ctx.createOscillator(), sine = ctx.createOscillator(), vib = ctx.createOscillator(), breath = ctx.createBufferSource();
  tri.type = "triangle"; vib.frequency.value = sing ? 5.5 : rnd(4.5, 6); breath.buffer = A.buf.pink;
  const vibG = gain(sy[0].f * (sing ? 0.025 : 0.012)); vib.connect(vibG); vibG.connect(tri.frequency); vibG.connect(sine.frequency);
  const f1 = node("bandpass", sy[0].vw[0], 4), f2 = node("bandpass", sy[0].vw[1], 6), body = node("lowpass", 700), env = gain(0), soft = node("lowpass", 3200), bG = gain(0.3), f2G = gain(0.7), bodyG = gain(0.5);
  tri.connect(f1); tri.connect(f2); breath.connect(bG); bG.connect(f1); bG.connect(f2); sine.connect(body).connect(bodyG).connect(env); f1.connect(env); f2.connect(f2G).connect(env);
  let out = env.connect(soft);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; out = out.connect(p); }
  if (tv) out.connect(node("highpass", 450)).connect(A.amb);
  else { out.connect(A.vox); out.connect(roomOf(A)); }
  const peak = (tv ? 0.07 : 0.12) * (excited ? 1.15 : 1);
  for (const o of [tri, sine]) o.frequency.setValueAtTime(sy[0].f, t);
  let at = t;
  for (const s of sy) {
    for (const o of [tri, sine]) o.frequency.setTargetAtTime(s.f, at, sing ? 0.04 : 0.025);
    f1.frequency.setTargetAtTime(s.vw[0], at, 0.03); f2.frequency.setTargetAtTime(s.vw[1], at, 0.03);
    env.gain.setTargetAtTime(peak, at, 0.025); env.gain.setTargetAtTime(peak * 0.3, at + s.d * 0.75, 0.03);
    if (!sing && Math.random() < 0.3) burst(tv ? A.amb : A.vox, at, { f: rnd(1800, 3500), q: 1, v: peak * 0.2, a: 0.004, d: 0.03, pan });  // a soft consonant
    at += s.d + s.gap;
  }
  env.gain.setTargetAtTime(0, at, 0.06);
  if (!tv && !sing) duck(at - t + 0.4);
  for (const o of [tri, sine, vib]) { o.start(t); o.stop(at + 0.5); }
  breath.start(t, Math.random() * 3); breath.stop(at + 0.5);
}
function meow(A, t, pan = 0) {
  const o = A.ctx.createOscillator(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.18); o.frequency.linearRampToValueAtTime(480, t + 0.55);
  f.type = "bandpass"; f.Q.value = 5; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1600, t + 0.2); f.frequency.linearRampToValueAtTime(700, t + 0.55);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(f).connect(g); if (A.ctx.createStereoPanner) { const p = A.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(A.vox); } else g.connect(A.vox);
  o.start(t); o.stop(t + 0.65);
}
function woof(A, t, pan) { for (const k of [0, 0.22]) { tone(A.vox, t + k, { f: 320, f2: 170, type: "sawtooth", v: 0.08, a: 0.005, d: 0.12, lp: 1100, pan }); burst(A.vox, t + k, { f: 700, q: 1, v: 0.06, d: 0.1, pan }); } }
function snore(A, t, pan) { burst(A.vox, t, { kind: "pink", type: "lowpass", f: 500, v: 0.08, a: 0.5, d: 0.7, pan }); tone(A.vox, t, { f: 70, v: 0.03, a: 0.5, d: 0.6, pan }); }

// a bubble drawn (world/scene.js bubble): a new one makes its speaker talk; one person at a time per 4 s
const heard = new Map();  // speaker → { msg, seen, spoke }
let lastVoices = [];
hub.onBubble = (x, y, msg, who) => {
  const A = live(); if (!A || who === null || !(mix.voice ?? 0.7)) return;
  const key = who || msg, ms = performance.now(), h = heard.get(key);
  heard.set(key, { msg, seen: ms, spoke: h?.spoke || 0 });
  if (h && h.msg === msg && ms - h.seen < 1500) return;  // the same bubble, still shown
  if (ms - (h?.spoke || 0) < 4000 || /^\d|^→|^[✓!?]$/.test(msg)) return;
  lastVoices = lastVoices.filter(t => ms - t < 1000); if (lastVoices.length >= 2) return;  // not a choir
  lastVoices.push(ms); heard.get(key).spoke = ms;
  const t = now(), pan = panOf(x);
  if (who === "cat") return meow(A, t, pan);
  if (who === "dog") return woof(A, t, pan);
  if (/^zZz/.test(msg)) return snore(A, t, pan);
  speak(A, who, msg.replace(/\p{Extended_Pictographic}/gu, ""), x);
};
setInterval(() => { const ms = performance.now(); for (const [k, h] of heard) if (ms - h.seen > 60000) heard.delete(k); }, 30000);

/* ---------- the room on screen: its objects, its games, its steps ---------- */
const next = new Map();  // what → when it sounds again (audio time)
const due = (key, t, gap) => { if ((next.get(key) || 0) > t) return false; next.set(key, t + gap); return true; };
const loops = new Map();  // a looped noise per name, its level following the room
function loopBed(A, name, kind, make) {
  if (!loops.has(name)) {
    const s = A.ctx.createBufferSource(), g = A.ctx.createGain(); g.gain.value = 0;
    s.buffer = A.buf[kind]; s.loop = true; make(A.ctx).reduce((a, n) => a.connect(n), s).connect(g).connect(A.amb); s.start(0, Math.random() * 3);
    loops.set(name, g);
  }
  return loops.get(name);
}
const filt = (type, f, q = 0.7) => ctx => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
function bed(A, name, v, kind, ...chain) { const g = loopBed(A, name, kind, ctx => chain.map(c => c(ctx))); if (g._v !== v) { g._v = v; g.gain.setTargetAtTime(v, A.ctx.currentTime, 0.5); } }

const usersOf = it => hub.usersOf ? hub.usersOf(it) : 0;
function objects(A, s, t) {
  const items = hub.itemsIn ? hub.itemsIn(s.room) : [], ms = Date.now();
  let water = 0, fire = 0, hum = 0;
  for (const it of items) {
    const p = panOf(it.x ?? W / 2), k = `${it.uid}`;
    switch (it.type) {
      case "aquarium": if (due(k, t, rnd(0.4, 1.6))) tone(A.amb, t, { f: rnd(250, 500), f2: rnd(900, 1500), v: 0.012, a: 0.005, d: 0.06, pan: p }); hum += 0.002; break;
      case "fountain": water += 0.02; break;
      case "fireplace": case "firepit": fire += 0.025; if (due(k, t, rnd(0.08, 0.5))) burst(A.amb, t, { f: rnd(1500, 5000), q: 2, v: rnd(0.01, 0.04), a: 0.001, d: 0.012, pan: p }); break;
      case "wallclock": if (due(k, t, 1)) burst(A.amb, t, { f: 3500, q: 6, v: 0.012, a: 0.001, d: 0.015, pan: p }); break;
      case "newton": if (due(k, t, 0.52)) tone(A.amb, t, { f: 2900, v: 0.01, a: 0.001, d: 0.03, pan: p }); break;
      case "printer3d": if (it.printUntil > ms && due(k, t, 0.12)) tone(A.amb, t, { f: pick([330, 440, 494, 587, 660]), type: "square", v: 0.004, a: 0.005, d: 0.1, lp: 1500, pan: p }); break;
      case "copier": case "printer": if (it.busyUntil > ms && due(k, t, 1.1)) { tone(A.amb, t, { f: 160, type: "sawtooth", v: 0.02, a: 0.2, d: 0.8, lp: 700, pan: p }); burst(A.amb, t + 0.9, { f: 2000, q: 1, v: 0.02, d: 0.05, pan: p }); } break;
      case "microwave": if (it.heatUntil > ms) hum += 0.012; break;
      case "ksink": if (it.waterUntil > ms) water += 0.06; break;
      case "kdish": if (it.runUntil > ms) water += 0.025; break;
      case "tvunit": case "walltv": if ((it.type === "walltv" || items.some(o => hub.defOf(o.type).act === "sofa" && usersOf(o) > 0)) && due(k, t, rnd(1.5, 3.5))) {
        if (Math.random() < 0.15) [72, 76, 79].forEach((n, i) => tone(A.amb, t + i * 0.12, { f: midi(n), type: "square", v: 0.006, a: 0.005, d: 0.1, lp: 2500, pan: p }));  // a jingle
        else speak(A, "tv", "la télé parle un peu", it.x ?? W / 2, { tv: true });
      } break;
      case "arcade": if (usersOf(it) && due(k, t, rnd(0.1, 0.4))) tone(A.amb, t, { f: rnd(300, 1500), f2: rnd(200, 2000), type: "square", v: 0.008, a: 0.002, d: 0.08, lp: 3000, pan: p }); break;
      case "pinball": if (usersOf(it) && due(k, t, rnd(0.2, 0.7))) Math.random() < 0.5 ? burst(A.amb, t, { f: 1200, q: 2, v: 0.04, d: 0.03, pan: p }) : bell(A.amb, t, rnd(1200, 2400), 0.012, 0.3, p); break;
      default: if (/^fridge/.test(it.type)) hum += 0.0015;
    }
  }
  bed(A, "water", water, "white", filt("bandpass", 2400, 0.6), filt("lowpass", 5000));
  bed(A, "fire", fire, "brown", filt("lowpass", 350));
  bed(A, "applhum", hum, "pink", filt("bandpass", 120, 4));
}
function games(A, s, t) {
  if (s.room !== "lounge") return;
  const n = id => Activity.get(id)?.users() || 0;
  if (n("pingpong") >= 2) { const ms = performance.now(), k = Math.floor(ms / 700); if (next.get("pong") !== k) { next.set("pong", k); hub.snd("pong", { pan: k % 2 ? 0.3 : -0.3 }); } }
  if (n("babyfoot") >= 1 && due("foot", t, rnd(0.25, 0.9))) hub.snd(Math.random() < 0.6 ? "kick" : "wall", { pan: rnd(-0.4, 0.4) });
  if (n("darts") >= 1 && due("darts", t, rnd(2, 4))) hub.snd("dart", { pan: -0.5 });
  if (n("boardgame") >= 1 && due("dice", t, rnd(5, 9))) for (let i = 0; i < 5; i++) burst(A.amb, t + i * rnd(0.04, 0.09), { f: rnd(2000, 4000), q: 3, v: 0.03, a: 0.001, d: 0.02 });
  if (n("read") >= 1 && due("page", t, rnd(6, 12))) burst(A.amb, t, { kind: "pink", f: 3000, q: 0.5, v: 0.03, a: 0.05, d: 0.25 });
  if (n("karaoke") >= 1 && due("sing", t, rnd(2.5, 4))) speak(A, [...hub.loungers.values()].find(l => l.spot?.act?.id === "karaoke")?.name || CHIEF_NAME, "la la la la la la", W / 2, { sing: true });
  bed(A, "sizzle", cooking ? 0.03 : 0, "white", filt("highpass", 3000), filt("lowpass", 9000));
}
// the coffee machine: grinding, the coffee running, the steam (once per coffee, in the office)
const brewing = new Set();
function coffee(A, s, t) {
  const now2 = new Set();
  if (s.room === "office") {
    for (const e of ents.values()) if (e.pose === "coffee" && !e.path?.length) now2.add(e.who || e.agent?.id);
    if (chief.room === "office" && chief.at === "coffee") now2.add(CHIEF_NAME);
  }
  for (const w of now2) if (!brewing.has(w)) {
    burst(A.amb, t, { kind: "pink", f: 900, q: 1.5, v: 0.05, a: 0.05, d: 1.1, pan: 0.5 });  // grinding
    for (let i = 0; i < 14; i++) burst(A.amb, t + 1.2 + i * 0.16, { f: rnd(500, 1100), q: 4, v: 0.025, a: 0.01, d: 0.12, pan: 0.5 });  // the coffee runs
    burst(A.amb, t + 3.6, { type: "highpass", f: 4000, v: 0.03, a: 0.1, d: 0.8, pan: 0.5 });  // steam
  }
  brewing.clear(); for (const w of now2) brewing.add(w);
}
// the steps: one every few units walked, by whoever moves in the room on screen
const lastAt = new WeakMap(), CHIEF_LOUNGE = {};  // the chief's steps in the break room have their own count
function steps(A, s, t) {
  const soft = s.room === "lounge" || s.room === "library", walkers = [];
  if (s.room === "office") { for (const e of ents.values()) walkers.push([e, e.x, e.y]); if (chief.room === "office") walkers.push([chief, chief.x, chief.y]); }
  else if (s.room === "lounge") { for (const l of hub.loungers?.values() || []) walkers.push([l, l.x, l.y]); if (chief.room === "lounge") walkers.push([CHIEF_LOUNGE, chief.lx, chief.ly]); }
  else if (chief.room === s.room) walkers.push([CHIEF_LOUNGE, chief.lx, chief.ly]);  // a built room (world/chief.js)
  let n = 0;
  for (const [o, x, y] of walkers) {
    if (x == null) continue;
    const p = lastAt.get(o); lastAt.set(o, { x, y, acc: p ? p.acc + Math.hypot(x - p.x, y - p.y) : 0 });
    const q = lastAt.get(o);
    if (q.acc < 7 || n >= 3) continue;
    q.acc = 0; n++;
    burst(A.amb, t + rnd(0, 0.05), { kind: soft ? "brown" : "pink", type: "lowpass", f: soft ? 300 : rnd(700, 1000), v: soft ? 0.05 : 0.07, a: 0.003, d: soft ? 0.06 : 0.05, pan: panOf(x) });
  }
}
// the security alarm (agents/events2.js): the siren while it lasts
function siren(A, t) {
  const al = hub.alarm; if (!al || performance.now() > al.until) return;
  if (due("siren", t, 0.9)) { tone(A.fx, t, { f: 660, f2: 990, type: "square", v: 0.025, a: 0.02, d: 0.42, lp: 2200 }); tone(A.fx, t + 0.45, { f: 990, f2: 660, type: "square", v: 0.025, a: 0.02, d: 0.42, lp: 2200 }); }
}
// the cat: a purr when she sleeps in the room on screen
function purr(A, s) { bed(A, "purr", s.room === "office" && cat.mode === "sleep" ? 0.02 : 0, "brown", filt("bandpass", 60, 2)); }

let lastRoom = "";
onTick.push((s, t) => {
  const A = graph();
  if (lastRoom && s.room !== lastRoom) KIT.door({ pan: 0.6 }, A, t);  // we go through a door
  lastRoom = s.room;
  objects(A, s, t); games(A, s, t); coffee(A, s, t); steps(A, s, t); siren(A, t); purr(A, s);
});
