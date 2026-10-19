// The devs talk about their real work (🧠 DEVS BAVARDS in the menu, off by default): now and then, and after a test
// run, a push or an MR, a dev at work says a line written by a small model from what its agent really did (office/
// quips.py: the last steps, the file edited, the command that failed). The line shows in its desk's bubble and is said
// in its voice (world/sounds.js). Each line is a small model call on the user's Claude account: at most one every
// 20 s, a dev at most once every 75 s, and the server caps the day. Never in the demo.

import { hub } from "../hub.js";
import { ents } from "../core/core.js";
import { traitsOf, TRAITS } from "../sims/moods.js";
import { toast } from "../sims/progress.js";

const post = (path, body) => fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) }).then(r => r.json());
export const quipState = { on: false, used: 0, max: 0, engine: "" };
const lastSaid = new Map();  // agent id → when it last spoke (ms)
let busy = false;

const btn = document.getElementById("quipbtn");
function renderBtn() {
  btn.innerHTML = `🧠<span class="lbl"> DEVS BAVARDS : ${quipState.on ? "ON" : "OFF"}</span>`;
  btn.classList.toggle("on", quipState.on);
  btn.title = `Les devs commentent le vrai travail de leur agent (un petit modèle, Claude Haiku, sur ton compte Claude)${quipState.max ? ` — ${quipState.used}/${quipState.max} répliques aujourd'hui` : ""}`;
}
btn.onclick = async () => {
  if (DEMO) return toast("🧠 DEVS BAVARDS", "Pas en démo", "Il faut de vrais agents au travail.");
  let r;
  try { r = await post("/api/quips", { on: !quipState.on }); }
  catch (_) { r = { error: "serveur" }; }
  if (r.error || typeof r.on !== "boolean") return toast("🧠 DEVS BAVARDS", "Le serveur ne répond pas", "Il tourne sans doute une ancienne version : redémarre Agent Office (/office) puis recharge la page.");
  Object.assign(quipState, r);
  renderBtn();
  if (!quipState.on) return toast("🧠 DEVS BAVARDS", "Désactivé", "Les devs reprennent leurs phrases toutes faites.");
  if (quipState.engine === "none") return toast("🧠 DEVS BAVARDS", "Impossible", "Ni clé API ni commande claude sur cette machine.");
  toast("🧠 DEVS BAVARDS", "Activé", `Les devs commentent ce que fait vraiment leur agent : Claude Haiku via ${quipState.engine === "api" ? "ta clé API" : "ton compte Claude Code"}, ${quipState.max} répliques par jour au plus.`);
};
if (!DEMO) fetch("/api/quips").then(r => r.json()).then(s => { Object.assign(quipState, s); renderBtn(); }).catch(() => renderBtn());
else renderBtn();

// a line for one dev at its desk; id: the office's agent id ("<session>|<agent>")
async function quipFor(e) {
  const id = e.agent.id, cut = id.indexOf("|"); if (cut < 0 || busy) return;
  busy = true; lastSaid.set(id, performance.now());
  try {
    const traits = e.who ? traitsOf(e.who).map(k => TRAITS[k]?.name).filter(Boolean).join(", ") : "";
    const r = await post("/api/quip", { s: id.slice(0, cut), a: id.slice(cut + 1), who: e.who || "", traits });
    if (r.error === "off" || r.error === "limit") { quipState.on = r.error !== "off" && quipState.on; if (r.error === "limit") quipState.used = quipState.max; renderBtn(); }
    if (!r.line || r.same || !ents.has(id) || e.leaving) return;
    quipState.used++; renderBtn();
    e.fxKind = "quip"; e.fxMsg = `💬 ${r.line}`; e.fxUntil = performance.now() + 7000;
  } catch (_) { /* the server is restarting: next time */ } finally { busy = false; }
}
const atWork = e => e.seated && !e.leaving && !e.queued && ["working", "blocked", "asking"].includes(e.agent?.status);
// after a test run, a push, an MR (sims/progress.js react): the dev of that agent, once the cheer has shown
hub.quipNow = id => {
  if (!quipState.on || DEMO) return;
  setTimeout(() => { const e = ents.get(id); if (e && atWork(e) && performance.now() - (lastSaid.get(id) || 0) > 30000) quipFor(e); }, 3500);
};
// now and then: the dev at work who spoke the longest ago
setInterval(() => {
  if (!quipState.on || DEMO || document.hidden || busy) return;
  const now = performance.now(), e = [...ents.values()].filter(x => atWork(x) && now - (lastSaid.get(x.agent.id) || 0) > 75000)
    .sort((a, b) => (lastSaid.get(a.agent.id) || 0) - (lastSaid.get(b.agent.id) || 0))[0];
  if (e) quipFor(e);
}, 20000);
