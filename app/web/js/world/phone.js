// The phone, while connected to other chiefs (ChiefOS → Réseau): a button by the household (bottom left) opens it;
// its contacts are the connected chiefs, "Inviter" calls one of them to our office. A call coming in rings: accept
// and we go to the caller's office (world/peers.js startVisit), or decline.

import { hub } from "../hub.js";
import { esc } from "../core/data.js";
import { clockNow } from "../sims/days.js";
import { answerCall, invite, net } from "./peers.js";
import { sfx, toast } from "../sims/progress.js";

const btn = document.createElement("button");
btn.id = "phonebtn"; btn.hidden = true; btn.title = "Téléphone : inviter un collègue dans ton bureau"; btn.textContent = "📱";
const box = document.createElement("section");
box.id = "phone"; box.hidden = true; box.setAttribute("aria-label", "Téléphone");
document.body.append(btn, box);
let calling = new Map(), key = "";  // pid → when we called (the button waits a little)

function render() {
  const t = clockNow(), hh = t.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }), r = net.ringing;
  const k = `${hh}|${r?.from || ""}|${net.peers.map(p => p.pid + p.visiting).join(",")}|${[...calling.keys()].join(",")}`;
  if (k === key) return; key = k;
  box.innerHTML = `<div class="bar"><span>${hh}</span><span>📶 🔋</span></div>` + (r
    ? `<div class="ring"><div class="pulse">📞</div><b>${esc(r.name)}</b><span>t'invite dans son bureau</span>
       <div class="acts"><button data-answer="no" class="no">Refuser</button><button data-answer="yes" class="yes">Accepter</button></div></div>`
    : `<h4>Contacts</h4><div class="contacts">${net.peers.length ? net.peers.map(p => `<div class="contact"><span class="av">${esc(p.name.slice(0, 1).toUpperCase())}</span><b>${esc(p.name)}<small>${p.visiting === net.pid ? "chez toi" : p.visiting ? "en visite" : "dans son bureau"}</small></b>
        ${p.visiting === net.pid ? `<span class="here">✓ ici</span>` : calling.has(p.pid) ? `<span class="muted">appel…</span>` : `<button data-call="${esc(p.pid)}">📞 Inviter</button>`}</div>`).join("") : `<p class="muted">Personne d'autre n'est connecté.</p>`}</div>
       <p class="muted foot">Inviter : son téléphone sonne, et s'il accepte, il arrive dans ton bureau.</p>`);
}
function toggle(open = box.hidden) { box.hidden = !open; btn.classList.toggle("on", open); if (open) { key = ""; render(); } }
btn.onclick = () => toggle();
box.addEventListener("click", async ev => {
  const c = ev.target.closest("[data-call]"), a = ev.target.closest("[data-answer]");
  try {
    if (c) { const pid = c.dataset.call; calling.set(pid, Date.now()); render(); await invite(pid); toast("📱 TÉLÉPHONE", "Ça sonne…", `Invitation envoyée à ${net.peers.find(p => p.pid === pid)?.name || "ton collègue"}.`); sfx("commit"); }
    if (a) { const yes = a.dataset.answer === "yes"; await answerCall(yes); btn.classList.remove("ringing"); if (yes) toggle(false); else render(); }
  } catch (err) { toast("📱 TÉLÉPHONE", "Échec", err.message); }
});
// a call coming in (world/peers.js): the phone rings and opens
hub.phoneRing = () => { btn.classList.add("ringing"); sfx("achievement"); toggle(true); };
setInterval(() => {
  btn.hidden = !net.sid; if (!net.sid) { box.hidden = true; return; }
  for (const [pid, at] of calling) if (Date.now() - at > 20000) calling.delete(pid);  // a call unanswered: try again
  if (net.ringing && performance.now() - net.ringing.at > 30000) { net.ringing = null; btn.classList.remove("ringing"); }  // missed
  if (!net.ringing) btn.classList.remove("ringing");
  if (!box.hidden) render();
}, 500);
