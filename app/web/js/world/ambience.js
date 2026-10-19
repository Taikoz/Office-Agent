// The sound of the office, synthesized live with Web Audio (no file). Four buses, each with its slider in the sound
// panel (🔊 bottom right, by ACHAT), remembered in this browser:
//  - Ambiance: the room tone of the room on screen (office: ventilation and the hum of the lights; break room: the
//    murmur of the team; terrace: the wind), keyboards typing (one per agent at work, quieter from another room),
//    the weather of the windows (rain, storm and its thunder, wind; heard through the glass indoors), the birds by
//    day and the crickets at night.
//  - Musique: a generative lo-fi (electric piano, bass, soft drums, vinyl crackle): one tune by day, a slower one in
//    the evening, a livelier one in buy mode; it follows the work (drums, a tense note while someone is stuck) and
//    stops in focus mode. A jukebox switched on plays its station instead (jazz, synthwave, chiptune), from where it
//    stands (shop.js pressJukebox).
//  - Voix: the babble of the people when a bubble appears; Effets: the events, the objects (world/sounds.js).
// The browser keeps audio silent until a first click: the graph is built then. A hidden tab goes quiet, except the
// effects (a question rings even with the tab behind).

import { hub } from "../hub.js";
import { ents } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { skyPhase } from "../svg/sky.js";
import { STATIONS, jukebox } from "./shop.js";
import { setSound } from "../sims/progress.js";

const mixSlot = new SaveSlot("office-mix", { music: 0.45, amb: 0.7, voice: 0.7, sfx: 0.8 });
export const mix = hub.mix = mixSlot.data;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const midi = n => 440 * 2 ** ((n - 69) / 12);
let A = null;  // the audio graph, built at the first click
export const graph = () => A;

/* ---------- the graph ---------- */
function noise(ctx, kind) {
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else if (kind === "pink") { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11; }
    else d[i] = w;
  }
  return buf;
}
function build() {
  const ctx = hub.audio = hub.audio || new AudioContext();
  const gain = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const filt = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const lfo = (rate, depth, param) => { const o = ctx.createOscillator(), d = gain(depth); o.frequency.value = rate; o.connect(d).connect(param); o.start(); };
  const master = gain(0), amb = gain(0), mus = gain(0), vox = gain(0), fx = gain(mix.sfx), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  amb.connect(master); vox.connect(master); (pan ? mus.connect(pan) : mus).connect(master); master.connect(ctx.destination); fx.connect(ctx.destination);
  A = { ctx, master, amb, mus, vox, fx, pan, buf: { white: noise(ctx, "white"), pink: noise(ctx, "pink"), brown: noise(ctx, "brown") }, beds: {}, keys: [], next: {}, song: null, step: 0, at: 0 };
  // a looped noise through its filters: a bed whose level follows the scene
  const loop = (kind, ...chain) => { const s = ctx.createBufferSource(), out = gain(0); s.buffer = A.buf[kind]; s.loop = true; chain.reduce((a, n) => a.connect(n), s).connect(out).connect(amb); s.start(0, Math.random() * 3); return out; };
  const windF = filt("bandpass", 520, 0.8); lfo(0.07, 280, windF.frequency);
  const murmur = gain(0.6); lfo(0.4, 0.4, murmur.gain);
  const hum = ctx.createOscillator(), humG = gain(0); hum.frequency.value = 120; hum.connect(humG).connect(amb); hum.start();
  Object.assign(A.beds, { tone: loop("brown", filt("lowpass", 240)), hum: humG, wind: loop("pink", windF), rain: loop("white", filt("highpass", 900), filt("lowpass", 6500)),
    murmur: loop("pink", filt("bandpass", 480, 1.3), murmur) });
}
export function unlock() {
  if (!hub.soundOn) return;
  try { if (!A) build(); if (A.ctx.state === "suspended") A.ctx.resume(); } catch (_) { /* no audio here */ }
}
addEventListener("pointerdown", unlock, true); addEventListener("keydown", unlock, true);
export const level = (node, v, tc = 0.6) => { if (node._v === v) return; node._v = v; node.gain.setTargetAtTime(v, A.ctx.currentTime, tc); };
function out(dest, node, pan) {
  if (pan && A.ctx.createStereoPanner) { const p = A.ctx.createStereoPanner(); p.pan.value = pan; node.connect(p).connect(dest); } else node.connect(dest);
}
// a short burst of filtered noise: a key, a hi-hat, a snare, thunder, a crackle
export function burst(dest, at, { kind = "white", type = "bandpass", f = 3000, q = 1, v = 0.05, a = 0.002, d = 0.04, pan = 0 }) {
  const s = A.ctx.createBufferSource(), fl = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
  s.buffer = A.buf[kind]; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  out(dest, s.connect(fl).connect(g), pan); s.start(at, Math.random() * 3, a + d + 0.05);
}
// a tone with its envelope: a bird, a cricket, a note, a kick
export function tone(dest, at, { f, f2, type = "sine", v = 0.05, a = 0.01, d = 0.3, pan = 0, lp = 0 }) {
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + a + d);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), at + a); g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  let n = o.connect(g); if (lp) { const fl = A.ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; n = n.connect(fl); }
  out(dest, n, pan); o.start(at); o.stop(at + a + d + 0.05);
}

/* ---------- the ambiance ---------- */
const ROOMS = { office: { tone: 0.05, hum: 0.004 }, lounge: { tone: 0.04, murmur: 0.035 }, meeting: { tone: 0.035, hum: 0.003 }, terrace: { wind: 0.07 }, gym: { tone: 0.04, hum: 0.003 }, library: { tone: 0.025 } };
const ROOM_FR = { office: "Bureau", lounge: "Salle de repos", meeting: "Salle de réunion", terrace: "Terrasse", gym: "Salle de sport", library: "Bibliothèque" };
const WEATHER_FR = { rain: "pluie", storm: "orage", snow: "neige", cloud: "nuages" };
export function scene() {
  const room = hub.view === "game" ? "lounge" : ROOMS[hub.ISO?.room] ? hub.ISO.room : "office";
  return { room, out: room === "terrace", w: typeof hub.weather === "function" ? hub.weather() : "clear", phase: skyPhase().phase,
    typing: [...ents.values()].filter(e => e.agent?.status === "working" && !e.leaving).length,
    tense: [...ents.values()].some(e => !e.leaving && ["blocked", "asking"].includes(e.agent?.status)) };
}
function ambiance(s, t) {
  const base = ROOMS[s.room], wet = s.out ? 1 : 0.35;  // the weather, through the windows indoors
  level(A.beds.tone, base.tone || 0); level(A.beds.hum, base.hum || 0); level(A.beds.murmur, base.murmur || 0);
  level(A.beds.wind, (base.wind || 0) + (s.w === "storm" ? 0.05 : s.w === "snow" ? 0.03 : 0) * wet);
  level(A.beds.rain, (s.w === "rain" ? 0.05 : s.w === "storm" ? 0.09 : 0) * wet, 2);
  // keyboards: one typist per agent at work (up to 5), a burst of keys then a pause
  const near = s.room === "office" ? 1 : 0.15, n = Math.min(s.typing, 5);
  for (let i = 0; i < n; i++) {
    if (A.keys[i] > t) continue;
    let at = Math.max(t, A.keys[i] || 0) + 0.05; const pan = n > 1 ? (i / (n - 1)) * 1.2 - 0.6 : 0;
    for (let k = Math.floor(rnd(4, 18)); k > 0; k--) {
      const space = Math.random() < 0.12;
      burst(A.amb, at, { f: space ? 1300 : rnd(2200, 4200), q: 1.6, v: rnd(0.02, 0.045) * near * (space ? 1.4 : 1), d: rnd(0.02, 0.04), pan });
      at += rnd(0.06, 0.17);
    }
    if (Math.random() < 0.2) burst(A.amb, at + 0.3, { f: 5200, q: 3, v: 0.03 * near, d: 0.015, pan });  // the mouse
    A.keys[i] = at + rnd(0.6, 4);
  }
  const fair = ["clear", "sun", "cloud"].includes(s.w), loud = s.out ? 1 : 0.3;
  if ((s.phase === "day" || s.phase === "dawn") && fair && t >= (A.next.bird || 0)) {  // a bird sings outside
    let at = t + 0.05; const f = rnd(2600, 4200), pan = rnd(-0.8, 0.8);
    for (let k = Math.floor(rnd(2, 6)); k > 0; k--) { tone(A.amb, at, { f: f * rnd(0.9, 1.1), f2: f * rnd(1.2, 1.5), v: 0.02 * loud, a: 0.01, d: rnd(0.05, 0.12), pan }); at += rnd(0.08, 0.18); }
    A.next.bird = t + rnd(3, s.phase === "dawn" ? 6 : 12);
  }
  if (s.phase === "night" && fair && t >= (A.next.cricket || 0)) {  // crickets
    for (let k = 0; k < 3; k++) tone(A.amb, t + 0.05 + k * 0.045, { f: 4600, v: 0.008 * (s.out ? 1 : 0.35), a: 0.004, d: 0.018, pan: -0.4 });
    A.next.cricket = t + rnd(0.8, 1.2);
  }
  if (s.w === "storm" && t >= (A.next.thunder || t + 1)) {  // thunder: a crack, then the rumble
    burst(A.amb, t + 0.05, { type: "lowpass", f: 2000, v: 0.12 * (s.out ? 1 : 0.6), a: 0.01, d: 0.35 });
    burst(A.amb, t + 0.15, { kind: "brown", type: "lowpass", f: rnd(150, 400), v: 0.5 * (s.out ? 1 : 0.6), a: rnd(0.05, 0.3), d: rnd(2.5, 5) });
    A.next.thunder = t + rnd(12, 35);
  } else if (s.w === "storm" && !A.next.thunder) A.next.thunder = t + rnd(3, 10);
}

/* ---------- the music: generative, in styles ---------- */
// The background tunes (lo-fi: by day, in the evening, in buy mode) and the jukebox stations. It follows the office:
// softer drums when nobody works, fuller with three agents or more, a tense note while someone is blocked or asks.
const SONGS = {
  day: { name: "🎶 Lo-fi du jour", style: "lofi", bpm: 76, swing: 0.16, mel: 0.25, drums: 1, chords: [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]], scale: [72, 74, 76, 79, 81, 84] },
  night: { name: "🌙 Lo-fi du soir", style: "lofi", bpm: 64, swing: 0.2, mel: 0.16, drums: 0.6, chords: [[57, 60, 64, 67, 71], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]], scale: [69, 72, 74, 76, 79, 81] },
  buy: { name: "🛒 Mode achat", style: "lofi", bpm: 104, swing: 0.1, mel: 0.4, drums: 1.1, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]], scale: [72, 74, 76, 79, 81, 84, 86] },
  jazz: { name: "🎷 Jazz du bureau", style: "jazz", bpm: 96, swing: 0.33, mel: 0.3, drums: 1, chords: [[62, 65, 69, 72, 76], [55, 59, 65, 69, 76], [60, 64, 67, 71, 74], [57, 61, 64, 67, 70]], scale: [72, 74, 75, 76, 79, 81, 84] },
  synth: { name: "🌆 Synthwave", style: "synth", bpm: 100, swing: 0, mel: 0.5, drums: 1, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], scale: [69, 72, 74, 76, 79, 81] },
  chip: { name: "👾 Chiptune", style: "chip", bpm: 140, swing: 0, mel: 0.75, drums: 1, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], scale: [72, 74, 76, 77, 79, 81, 83, 84] },
};
const STYLES = {
  lofi(b, ch, at, s16, song, x) {
    const M = A.mus, dr = song.drums * x.energy;
    if (b === 0 || b === 10) for (const n of ch) {  // electric piano: the chord, slightly rolled
      const at2 = at + rnd(0, 0.025);
      tone(M, at2, { f: midi(n), v: 0.03, a: 0.01, d: b ? 1.1 : 2.2, lp: 2000 }); tone(M, at2, { f: midi(n) * 2, v: 0.006, a: 0.005, d: 0.4 });
    }
    if (b === 0 || b === 8) tone(M, at, { f: midi(ch[0] - 12), type: "triangle", v: 0.08, a: 0.01, d: s16 * 6, lp: 500 });  // bass
    if (b === 0 || b === 7 || b === 10) tone(M, at, { f: 110, f2: 42, v: 0.16 * dr, a: 0.003, d: 0.16 });  // kick
    if (b === 4 || b === 12) burst(M, at, { f: 1800, q: 0.8, v: 0.045 * dr, d: 0.12 });  // snare
    if (b % 2 === 0 || x.busy) burst(M, at, { type: "highpass", f: 7000, v: (b % 4 ? 0.01 : 0.018) * dr * (b % 2 ? 0.6 : 1), d: 0.03 });  // hi-hat
    if (b % 2 === 0 && Math.random() < song.mel * x.calm) tone(M, at, { f: midi(pick(song.scale)), type: "triangle", v: 0.022, a: 0.02, d: s16 * 3, lp: 2500 });  // a melody note
    if (Math.random() < 0.25) burst(M, at + rnd(0, s16), { f: rnd(3000, 8000), q: 2, v: rnd(0.004, 0.012), a: 0.001, d: 0.006 });  // vinyl crackle
  },
  jazz(b, ch, at, s16, song, x) {
    const M = A.mus, dr = song.drums * x.energy;
    if (b % 4 === 0) tone(M, at, { f: midi(ch[[0, 2, 1, 3][b / 4] % ch.length] - 24), type: "triangle", v: 0.09, a: 0.01, d: s16 * 3.5, lp: 600 });  // walking bass
    if ([0, 6, 8, 14].includes(b)) burst(M, at, { type: "highpass", f: 6000, q: 0.5, v: (b % 8 ? 0.012 : 0.02) * dr, d: 0.18 });  // the ride
    if (b === 4 || b === 12) burst(M, at, { f: 2200, q: 0.5, v: 0.012 * dr, a: 0.02, d: 0.1 });  // brushes
    if ((b === 3 || b === 10) && Math.random() < 0.8) for (const n of ch.slice(1)) tone(M, at, { f: midi(n), v: 0.018, a: 0.01, d: 0.5, lp: 2400 });  // the comping
    if (b % 2 === 0 && Math.random() < song.mel * x.calm) { const f = midi(pick(song.scale)); tone(M, at, { f, v: 0.03, a: 0.005, d: s16 * 5 }); tone(M, at, { f: f * 4, v: 0.004, a: 0.005, d: 0.2 }); }  // vibraphone
  },
  synth(b, ch, at, s16, song, x) {
    const M = A.mus, dr = song.drums * x.energy;
    if (b % 2 === 0) tone(M, at, { f: midi(ch[0] - 24), type: "sawtooth", v: 0.05, a: 0.005, d: s16 * 1.6, lp: 420 });  // the driving bass
    if (b === 0) for (const n of ch) for (const det of [0.996, 1.004]) tone(M, at, { f: midi(n) * det, type: "sawtooth", v: 0.012, a: 0.6, d: s16 * 15, lp: 1400 });  // the pad
    tone(M, at, { f: midi(ch[b % ch.length] + 12), type: "square", v: 0.008, a: 0.003, d: s16 * 0.8, lp: 2200 });  // the arpeggio
    if (b % 4 === 0) tone(M, at, { f: 120, f2: 40, v: 0.17 * dr, a: 0.003, d: 0.2 });
    if (b === 4 || b === 12) { burst(M, at, { f: 1500, q: 0.6, v: 0.06 * dr, d: 0.35 }); }  // the big snare
    if (b % 2 === 1) burst(M, at, { type: "highpass", f: 8000, v: 0.008 * dr, d: 0.03 });
    if (b % 4 === 2 && Math.random() < song.mel * x.calm) tone(M, at, { f: midi(pick(song.scale)), type: "sawtooth", v: 0.016, a: 0.02, d: s16 * 3.5, lp: 1800 });
  },
  chip(b, ch, at, s16, song, x) {
    const M = A.mus, dr = song.drums * x.energy;
    if (b % 2 === 0) tone(M, at, { f: midi(ch[0] - 12 + (b % 4 ? 7 : 0)), type: "triangle", v: 0.07, a: 0.002, d: s16 * 1.5 });
    tone(M, at, { f: midi(ch[b % ch.length] + 12), type: "square", v: 0.006, a: 0.002, d: s16 * 0.7 });
    if (b % 8 === 0) burst(M, at, { type: "lowpass", f: 300, v: 0.12 * dr, a: 0.002, d: 0.08 });
    if (b % 8 === 4) burst(M, at, { f: 2500, q: 0.5, v: 0.05 * dr, d: 0.07 });
    if (Math.random() < song.mel * x.calm) tone(M, at, { f: midi(pick(song.scale)), type: "square", v: 0.014, a: 0.002, d: s16 * 0.9 });
  },
};
const songNow = () => jukebox.playing ? SONGS[STATIONS[jukebox.station]?.id] || SONGS.jazz
  : document.body.classList.contains("buy-on") ? SONGS.buy : ["night", "dusk"].includes(skyPhase().phase) ? SONGS.night : SONGS.day;
const musicOn = () => jukebox.playing || (mix.music > 0 && !hub.focusMode);  // a jukebox switched on plays even in focus mode
function music(s, t) {
  if (!musicOn()) { A.song = null; return; }
  const song = songNow();
  if (A.song !== song || A.at < t) { A.song = song; A.step = 0; A.at = t + 0.1; }
  const s16 = 60 / song.bpm / 4, x = { energy: s.typing ? s.typing >= 3 ? 1.2 : 1 : 0.55, busy: s.typing >= 3, calm: s.tense ? 0.4 : 1 };
  while (A.at < t + 0.3) {
    const st = A.step % 64, ch = song.chords[Math.floor(st / 16)], b = st % 16, at = A.at + (b % 2 ? s16 * song.swing : 0);
    STYLES[song.style](b, ch, at, s16, song, x);
    if (s.tense && b === 0) tone(A.mus, at, { f: midi(ch[0] + 6), v: 0.014, a: 0.3, d: s16 * 12, lp: 1200 });  // someone is stuck: a tritone under the chord
    A.step++; A.at += s16;
  }
}

const warned = new Set();
export const onTick = [];  // world/sounds.js: (scene, time) each 100 ms while the sound plays
setInterval(() => {
  if (!A || A.ctx.state !== "running") return;
  const live = hub.soundOn && !document.hidden, t = A.ctx.currentTime;
  level(A.master, live ? 1 : 0, 0.3);
  if (!live) { A.song = null; return; }
  const sp = jukebox.playing && hub.spatial ? hub.spatial(jukebox.type) : { gain: 1, pan: 0 };
  level(A.amb, mix.amb * (hub.focusMode ? 0.5 : 1), 0.3); level(A.vox, mix.voice ?? 0.7, 0.3);
  level(A.mus, musicOn() ? Math.max(mix.music, jukebox.playing ? 0.3 : 0) * sp.gain : 0, 0.8);
  if (A.pan && A.pan._v !== sp.pan) { A.pan._v = sp.pan; A.pan.pan.setTargetAtTime(sp.pan, t, 0.5); }
  let s; try { s = scene(); } catch (_) { return; }  // a frame without the world ready
  for (const fn of [ambiance, music, ...onTick]) try { fn(s, t); } catch (err) { if (!warned.has(fn)) { warned.add(fn); console.warn("[son]", err); } }  // one part failing leaves the others
}, 100);

/* ---------- the sound panel ---------- */
const btn = document.createElement("button");
btn.id = "mixbtn"; btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "mix"); btn.title = "Son : musique, ambiance, effets";
const panel = document.createElement("section");
panel.id = "mix"; panel.hidden = true; panel.setAttribute("aria-label", "Son");
document.body.append(btn, panel);
const SLIDERS = [["music", "🎵", "Musique"], ["amb", "🏢", "Ambiance"], ["voice", "🗣️", "Voix"], ["sfx", "🔔", "Effets"]];
function nowPlaying() {
  if (!hub.soundOn) return "Son coupé.";
  if (!A || A.ctx.state !== "running") return "Clique n'importe où pour lancer le son.";
  const s = scene(), bits = [ROOM_FR[s.room]];
  if (s.typing) bits.push(`${s.typing} clavier${s.typing > 1 ? "s" : ""}`);
  if (WEATHER_FR[s.w]) bits.push(WEATHER_FR[s.w]);
  bits.push(s.phase === "night" ? "grillons" : ["day", "dawn"].includes(s.phase) && ["clear", "sun", "cloud"].includes(s.w) ? "oiseaux" : "");
  const m = jukebox.playing ? `📻 ${songNow().name}` : hub.focusMode ? "🎯 Focus : pas de musique" : mix.music > 0 ? `${songNow().name}${s.tense ? " · tendu" : ""}` : "Musique coupée";
  return `${m}<br>🏢 ${bits.filter(Boolean).join(" · ")}`;
}
function render() {
  btn.innerHTML = hub.soundOn ? "🔊" : "🔇"; btn.classList.toggle("off", !hub.soundOn);
  if (panel.hidden) return;
  panel.innerHTML = `<div class="mixhead"><b>SON</b><button class="sw${hub.soundOn ? " on" : ""}" data-sw role="switch" aria-checked="${hub.soundOn}" aria-label="Son"><i></i></button></div>
    ${SLIDERS.map(([k, ic, label]) => `<label class="mixrow"><span>${ic} ${label}</span><input type="range" min="0" max="100" step="5" value="${Math.round((mix[k] ?? 0.7) * 100)}" data-mix="${k}"${hub.soundOn ? "" : " disabled"}><output>${Math.round((mix[k] ?? 0.7) * 100)}</output></label>`).join("")}
    <p class="mixnow">${nowPlaying()}</p>`;
}
function toggle(open = panel.hidden) { panel.hidden = !open; btn.classList.toggle("on", open); btn.setAttribute("aria-expanded", String(open)); render(); }
btn.onclick = ev => { ev.stopPropagation(); toggle(); };
panel.addEventListener("click", ev => { if (ev.target.closest("[data-sw]")) { setSound(!hub.soundOn); unlock(); } });
panel.addEventListener("input", ev => {
  const k = ev.target.dataset.mix; if (!k) return;
  mix[k] = ev.target.value / 100; mixSlot.save(mix); ev.target.nextElementSibling.textContent = ev.target.value;
  if (k === "sfx" && A) level(A.fx, mix.sfx, 0.05);
});
panel.addEventListener("change", ev => { if (ev.target.dataset.mix === "sfx") hub.sfx("commit"); });  // hear the new level
panel.addEventListener("keydown", ev => { ev.stopPropagation(); if (ev.key === "Escape") toggle(false); });
document.addEventListener("pointerdown", ev => { if (!panel.hidden && !panel.contains(ev.target) && ev.target !== btn) toggle(false); });
hub.onSound = () => render();
setInterval(() => { const p = panel.querySelector(".mixnow"); if (p) p.innerHTML = nowPlaying(); }, 1000);
render();
