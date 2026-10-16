// Video calls between chiefs (the phone's Visio), with no camera: the "video" is our avatar. Each side sees the other
// chief in big (his look, his hat), moving: he talks (the mouth moves with his voice), does an emote, says something
// (subtitles); ourselves in a small window. The voice goes straight from one browser to the other on the internal
// network (WebRTC, set up through the network server's relay: office/net.py rtc), with the microphone only during
// the call (refused: the call goes on, in text). Five times a second each side sends its state (talking, emote,
// what it wrote) through the duel relay. Nothing is recorded.

import { hub, provide } from "../hub.js";
import { CHIEF_NAME } from "../core/core.js";
import { esc } from "../core/data.js";
import { ART } from "../svg/base.js";
import { lookTraits } from "../svg/figures.js";
import { CHIEF_LOOK } from "./chief.js";
import { chiefHat } from "./chiefedit.js";
import { EMOTE_INFO, call, net } from "./peers.js";
import { sfx, toast } from "../sims/progress.js";

const box = document.createElement("section");
box.id = "visio"; box.hidden = true; box.setAttribute("aria-label", "Appel vidéo");
document.body.append(box);
let cur = null;  // { cid, pid, name, caller, status: ringing|live|ended, since, pc, mic, audio, ctx, levels, mine, theirs, muted }
const gid = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, "0")).join("");
const say = (verb, to, cid) => call("chat", { sid: net.sid, kind: "visio", to, text: `${verb}:${cid}` });
const QUICK = ["wave", "laugh", "love", "clap", "think", "cheers"];

/* ---------- the avatars: a chief from the chest up, as an image; cached per look and state ---------- */
const imgs = new Map();
function avatar(look, hat, state) {
  const key = `${JSON.stringify(look)}|${hat}|${state.smile}|${state.arms}|${state.frame}`;
  if (!imgs.has(key)) {
    const svg = ART.person.markup({ look, tux: true, smile: state.smile, hat, arms: state.arms, frame: state.frame }).replace(/viewBox="[^"]*" width="\d+" height="\d+"/, 'viewBox="-10 -29 20 22"');
    imgs.set(key, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    if (imgs.size > 200) imgs.delete(imgs.keys().next().value);
  }
  return imgs.get(key);
}
// how one side looks now: talking (the mouth opens and closes), an emote (arms), else at rest
function stateOf(talk, emo, t) {
  const f = Math.floor(t / 140) % 2;
  if (emo) return { smile: true, arms: emo === "dance" || emo === "clap" || emo === "wave" || emo === "laugh" ? (Math.floor(t / 220) % 2 ? "up" : "down") : "up", frame: 0 };
  return { smile: talk > 0.05 ? !!f : true, arms: "down", frame: 0 };
}

/* ---------- calling, answering, hanging up ---------- */
export async function callVisio(pid) {
  if (!net.sid) throw new Error("connecte-toi d'abord (Réseau)");
  if (cur) throw new Error("tu es déjà en appel");
  const p = net.peers.find(x => x.pid === pid); if (!p) throw new Error("ce chef n'est plus là");
  if (p.status === "dnd") throw new Error(`${p.name} ne veut pas être dérangé`);
  cur = { cid: gid(), pid, name: p.name, caller: true, status: "ringing", since: performance.now(), mine: { talk: 0, emo: "", emoAt: 0, say: "", sayId: 0 }, theirs: null, muted: false };
  await say("ring", pid, cur.cid);
  hub.phoneClose?.(); render(true);
}
hub.onVisioMsg = (m, t) => {
  const [verb, cid] = m.text.split(":");
  if (verb === "ring") {
    if (cur || net.ringing || hub.match) return say("busy", m.from, cid).catch(() => {});
    if (net.presence === "dnd") { say("decline", m.from, cid).catch(() => {}); return toast("📹 VISIO", `${m.name} a appelé`, "Refusé : tu es en « ne pas déranger »."); }
    net.ringing = { kind: "visio", from: m.from, name: m.name, cid, at: t }; hub.phoneRing?.();
    return;
  }
  if (!cur || cur.cid !== cid) return;
  if (verb === "accept" && cur.caller && cur.status === "ringing") live();
  else if (verb === "decline" || verb === "busy") { toast("📹 VISIO", `${cur.name} ${verb === "busy" ? "est déjà occupé" : "ne répond pas"}`, ""); hangUp(false); }
  else if (verb === "end") { toast("📹 VISIO", `${cur.name} a raccroché`, ""); hangUp(false); }
};
hub.answerVisio = async (r, yes) => {
  await say(yes ? "accept" : "decline", r.from, r.cid);
  if (!yes) return;
  cur = { cid: r.cid, pid: r.from, name: r.name, caller: false, status: "live", since: performance.now(), mine: { talk: 0, emo: "", emoAt: 0, say: "", sayId: 0 }, theirs: null, muted: false };
  hub.phoneClose?.(); live();
};
export function hangUp(tell = true) {
  const c = cur; if (!c) return;
  cur = null;
  if (tell) say("end", c.pid, c.cid).catch(() => {});
  try { c.pc?.close(); } catch (_) { /* closed */ }
  c.mic?.getTracks().forEach(tr => tr.stop());  // the microphone: only during the call
  if (c.audio) { c.audio.srcObject = null; c.audio.remove(); }
  c.ctx?.close().catch(() => {});
  box.hidden = true; box.innerHTML = ""; sfx("fail");
}

/* ---------- the voice: WebRTC on the internal network, its offer and answer through the relay ---------- */
const level = an => { if (!an) return 0; const a = new Uint8Array(an.fftSize); an.getByteTimeDomainData(a); let s = 0; for (const v of a) s += ((v - 128) / 128) ** 2; return Math.sqrt(s / a.length); };
const iceDone = pc => new Promise(res => { if (pc.iceGatheringState === "complete") return res(); const t = setTimeout(res, 2500); pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } }); });
async function live() {
  const c = cur; c.status = "live"; c.since = performance.now(); sfx("achievement"); render(true);
  try { c.ctx = new AudioContext(); } catch (_) { /* no audio here */ }
  c.note = "🎤 autorise le micro pour parler (sinon, écrivez-vous)"; render();
  const ask = navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).catch(() => null);
  c.mic = await Promise.race([ask, new Promise(r => setTimeout(() => r(null), 15000))]);  // no answer to the browser's question: in text
  if (!c.mic) ask?.then(s => s?.getTracks().forEach(tr => tr.stop()));
  c.note = "";
  if (cur !== c) { c.mic?.getTracks().forEach(tr => tr.stop()); return; }
  if (c.mic && c.ctx) { c.micAn = c.ctx.createAnalyser(); c.micAn.fftSize = 512; c.ctx.createMediaStreamSource(c.mic).connect(c.micAn); }
  if (!c.mic) c.note = "🎤 micro refusé : il ne t'entend pas, écris-lui";
  try {
    const pc = c.pc = new RTCPeerConnection({ iceServers: [] });  // the internal network: no outside server
    if (c.mic) for (const tr of c.mic.getTracks()) pc.addTrack(tr, c.mic); else pc.addTransceiver("audio", { direction: "recvonly" });
    pc.ontrack = e => {
      c.audio = Object.assign(document.createElement("audio"), { autoplay: true, hidden: true }); document.body.append(c.audio);
      const stream = e.streams[0] || new MediaStream([e.track]); c.audio.srcObject = stream; c.audio.play().catch(() => {});
      if (c.ctx) { c.theirAn = c.ctx.createAnalyser(); c.theirAn.fftSize = 512; c.ctx.createMediaStreamSource(stream).connect(c.theirAn); }
    };
    let mine = {};
    if (c.caller) { await pc.setLocalDescription(await pc.createOffer()); await iceDone(pc); mine = { type: "offer", sdp: pc.localDescription.sdp }; }
    for (let i = 0; i < 60 && cur === c && pc.connectionState !== "connected"; i++) {  // 30 s at most
      const out = await call("rtc", { sid: net.sid, gid: c.cid, st: mine }).catch(() => ({}));
      const o = out.st;
      if (!c.caller && o?.type === "offer" && !pc.remoteDescription) {
        await pc.setRemoteDescription({ type: "offer", sdp: o.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await iceDone(pc);
        mine = { type: "answer", sdp: pc.localDescription.sdp };
        continue;
      }
      if (c.caller && o?.type === "answer" && !pc.remoteDescription) await pc.setRemoteDescription({ type: "answer", sdp: o.sdp });
      await new Promise(r => setTimeout(r, 500));
    }
    if (cur === c && pc.connectionState !== "connected") c.note = "🔇 pas de voix (réseau) : écrivez-vous";
  } catch (_) { if (cur === c) c.note = "🔇 pas de voix ici : écrivez-vous"; }
  render(true);
}

/* ---------- the window ---------- */
const clock = ms => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
function render(full = false) {
  const c = cur; if (!c) return;
  box.hidden = false;
  const t = performance.now(), other = net.peers.find(p => p.pid === c.pid), th = c.theirs || {};
  const theirLook = lookTraits({ skin: "#f1c7a3", hair: "#3a2a1a", shirt: "#2a4a8a", ...(other?.look || {}) }), myLook = lookTraits(CHIEF_LOOK);
  const theirTalk = Math.max(level(c.theirAn), th.talk || 0), myTalk = c.muted ? 0 : level(c.micAn);
  c.mine.talk = Math.round(myTalk * 100) / 100;
  const theirEmo = th.emo && t - (c.theirsAt || 0) < 4000 ? th.emo : "", myEmo = c.mine.emo && t - c.mine.emoAt < 4000 ? c.mine.emo : "";
  if (full || !box.querySelector(".vbig")) {
    box.innerHTML = `<div class="vhead"><b>📹 ${esc(c.name)}</b><span class="vt"></span></div>
      <div class="vstage"><img class="vbig" alt=""><div class="vemo"></div><div class="vsub"></div><img class="vpip" alt=""><span class="vnote"></span></div>
      <div class="vctl">${c.status === "ringing" ? "" : `<button data-v="mute" title="Micro">🎤</button>${QUICK.map(k => `<button data-v="emo:${k}" title="${EMOTE_INFO[k][1]}">${EMOTE_INFO[k][0]}</button>`).join("")}
        <input id="v-in" maxlength="120" placeholder="Dire quelque chose…" aria-label="Message"><button data-v="send" title="Envoyer">↑</button>`}<button data-v="end" class="end" title="Raccrocher">✆</button></div>`;
  }
  box.querySelector(".vt").textContent = c.status === "ringing" ? "appel…" : clock(t - c.since);
  box.querySelector(".vbig").src = avatar(theirLook, other?.look?.hat || "", c.status === "ringing" ? { smile: true, arms: "down", frame: 0 } : stateOf(theirTalk, theirEmo, t));
  box.querySelector(".vpip").src = avatar(myLook, chiefHat() || "", stateOf(myTalk, myEmo, t));
  box.querySelector(".vbig").classList.toggle("talk", theirTalk > 0.05);
  box.querySelector(".vemo").textContent = theirEmo ? EMOTE_INFO[theirEmo]?.[0] || "" : "";
  box.querySelector(".vsub").textContent = th.say && t - (c.saidAt || 0) < 6000 ? th.say : "";
  box.querySelector(".vnote").textContent = c.status === "ringing" ? `Ça sonne chez ${c.name}…` : c.note || "";
  box.querySelector("[data-v=mute]")?.classList.toggle("off", c.muted);
}
box.addEventListener("click", ev => {
  const b = ev.target.closest("[data-v]"); if (!b || !cur) return;
  const v = b.dataset.v, c = cur;
  if (v === "end") return hangUp();
  if (v === "mute") { c.muted = !c.muted; c.mic?.getAudioTracks().forEach(tr => { tr.enabled = !c.muted; }); return render(); }
  if (v.startsWith("emo:")) { Object.assign(c.mine, { emo: v.slice(4), emoAt: performance.now() }); return; }
  if (v === "send") { const i = document.getElementById("v-in"); if (i.value.trim()) { Object.assign(c.mine, { say: i.value.trim().slice(0, 120), sayId: c.mine.sayId + 1 }); i.value = ""; } }
});
box.addEventListener("keydown", ev => { ev.stopPropagation(); if (ev.key === "Enter" && ev.target.id === "v-in") box.querySelector("[data-v=send]")?.click(); });

// five times a second: our state out, his in; the window follows
let busy = false;
setInterval(async () => {
  const c = cur; if (!c) return;
  if (!net.sid || !net.peers.some(p => p.pid === c.pid)) { toast("📹 VISIO", "Appel coupé", ""); return hangUp(false); }
  if (c.status === "ringing" && performance.now() - c.since > 30000) { toast("📹 VISIO", `${c.name} ne répond pas`, ""); return hangUp(); }
  render();
  if (c.status !== "live" || busy) return;
  busy = true;
  try {
    const m = c.mine, out = await call("duel", { sid: net.sid, gid: c.cid, st: { talk: m.talk, emo: performance.now() - m.emoAt < 4000 ? m.emo : "", say: m.say, sayId: m.sayId } });
    if (cur !== c || !out.st) return;
    const o = out.st, prev = c.theirs || {};
    if (o.emo && o.emo !== prev.emo) c.theirsAt = performance.now();
    if (o.sayId && o.sayId !== prev.sayId) c.saidAt = performance.now();
    c.theirs = { talk: Math.min(1, +o.talk || 0), emo: EMOTE_INFO[o.emo] ? o.emo : "", say: String(o.say || "").slice(0, 120), sayId: +o.sayId || 0 };
  } catch (_) { /* the next one */ } finally { busy = false; }
}, 200);

provide({ get callVisio() { return callVisio; }, get hangUp() { return hangUp; }, get inCall() { return !!cur; } });
