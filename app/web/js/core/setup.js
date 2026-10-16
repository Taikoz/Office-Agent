// First launch: create the household, Sims style (the chief, 8 devs, the cat), name the office and add a logo if you
// want. Each dev's card shows the face and the two traits its name gives (they follow what is typed); a die per card,
// one for the whole team. Editable later from ÉQUIPE.

import { CHIEF_NAME, TEAM } from "./core.js";
import { esc } from "./data.js";
import { closePanel, panel } from "../ui/panel.js";
import { openOverlay } from "../agents/insight.js";
import { ART } from "../svg/base.js";
import { lookFor } from "../agents/entities.js";
import { TRAITS, traitsOf } from "../sims/moods.js";
import { CHIEF_LOOK } from "../world/chief.js";

const NAME_POOL = ["Alice", "Bruno", "Chloé", "David", "Emma", "Farid", "Gaëlle", "Hugo", "Inès", "Jules", "Karim", "Léa", "Malik", "Nina",
  "Oscar", "Paula", "Quentin", "Rose", "Sami", "Tess", "Ugo", "Vera", "Wassim", "Yasmine", "Zoé", "Louis", "Mina", "Noé", "Sarah", "Théo"];
const LOGO_MAX = 300_000, LOGO_PX = 512;
let setupLogo;  // undefined = keep the current logo, null = remove it, data URL = new logo

if (OFFICE_CFG.office) document.title = `${OFFICE_CFG.office} — Agent Office`;

/* ---------- the cards: a face (from the name, like in the office), the traits the name gives ---------- */
const face = (look, tux = false) => `<img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(ART.person.markup({ look, tux, smile: true })
  .replace(/viewBox="[^"]*" width="\d+" height="\d+"/, 'viewBox="-7 -25 14 16"'))}">`;
const devFace = name => face({ ...lookFor(name || "?", null), team: true });
const traitsChips = name => name ? traitsOf(name).map(id => `<span class="trait" title="${esc(TRAITS[id].desc)}">${TRAITS[id].icon} ${esc(TRAITS[id].name)}</span>`).join("") : `<span class="muted">un prénom…</span>`;
const devCard = (n, i) => `<div class="dev" data-i="${i}"><div class="face">${devFace(n)}</div><div class="body"><span class="desk">Bureau ${i + 1}</span>
  <input data-desk="${i}" maxlength="20" required value="${esc(n)}" aria-label="Prénom du dev du bureau ${i + 1}"><span class="traits">${traitsChips(n)}</span></div>
  <button type="button" class="dice" data-dice="${i}" title="Un autre prénom">🎲</button></div>`;
function refreshCard(i) {
  const card = document.querySelector(`#setup-team .dev[data-i="${i}"]`), name = card.querySelector("input").value.trim();
  card.querySelector(".face").innerHTML = devFace(name); card.querySelector(".traits").innerHTML = traitsChips(name);
}
const refreshSign = () => { document.getElementById("setup-sign").textContent = document.getElementById("setup-office").value.trim() || "Agent Office"; };
function freeName() {
  const used = new Set([...document.querySelectorAll("#setup-team input"), document.getElementById("setup-chief")].map(i => i.value.trim().toLowerCase()));
  const pool = NAME_POOL.filter(n => !used.has(n.toLowerCase()));
  return pool[Math.floor(Math.random() * pool.length)] || "Alex";
}

function openSetup(first) {
  document.getElementById("setup-title").textContent = first ? "BIENVENUE AU BUREAU" : "MODIFIER L'ÉQUIPE";
  document.getElementById("setup-intro").hidden = !first;
  document.getElementById("setup-go").textContent = first ? "C'EST PARTI ▶" : "ENREGISTRER";
  if (panel.classList.contains("open")) closePanel();
  document.getElementById("setup-chief").value = OFFICE_CFG.setup ? CHIEF_NAME : (OFFICE_CFG.chief && OFFICE_CFG.chief !== "Chef" ? OFFICE_CFG.chief : "");
  document.getElementById("setup-office").value = OFFICE_CFG.office || "";
  document.getElementById("setup-cat").value = OFFICE_CFG.cat || "";
  document.getElementById("setup-team").innerHTML = TEAM.map(devCard).join("");
  document.getElementById("setup-chief-face").innerHTML = face(CHIEF_LOOK, true);
  document.getElementById("setup-cat-face").innerHTML = `<img alt="" src="${ART.cat.url({ pose: "sit", frame: 0 })}">`;
  refreshSign();
  setupLogo = undefined;
  showLogo(OFFICE_CFG.logo);
  setupMsg("");
  openOverlay("setup", true);
  document.getElementById("setup-chief").focus();
}

function showLogo(src) {
  const box = document.getElementById("setup-preview");
  box.innerHTML = src ? `<img alt="Logo" src="${esc(src)}">` : `<span class="muted">ton logo</span>`;
}

function setupMsg(text, err) {
  const m = document.getElementById("setup-msg");
  m.textContent = text; m.classList.toggle("err", !!err);
}

const readAs = (file, how) => new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr[how](file); });

// raster images are shrunk to 512 px (PNG) so a photo of a logo still fits; an SVG is kept as is
async function logoFromFile(file) {
  if (file.type === "image/svg+xml") {
    if (file.size > LOGO_MAX) throw new Error("SVG trop lourd (300 ko max)");
    return readAs(file, "readAsDataURL");
  }
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("PNG, JPEG, WebP ou SVG seulement");
  const img = new Image();
  img.src = await readAs(file, "readAsDataURL");
  await img.decode();
  const k = Math.min(1, LOGO_PX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let url = c.toDataURL("image/png");
  if (url.length * 0.75 > LOGO_MAX) url = c.toDataURL("image/webp", 0.85);
  if (url.length * 0.75 > LOGO_MAX) throw new Error("image trop lourde, même réduite");
  return url;
}

document.getElementById("setup-file").onchange = async ev => {
  const file = ev.target.files[0];
  ev.target.value = "";
  if (!file) return;
  try { setupLogo = await logoFromFile(file); showLogo(setupLogo); setupMsg(""); }
  catch (err) { setupMsg(`Logo refusé : ${err.message || "image illisible"}`, true); }
};
document.getElementById("setup-nologo").onclick = () => { setupLogo = null; showLogo(null); };
document.getElementById("setup-close").onclick = () => openOverlay("setup", false);
document.getElementById("setup-dice").onclick = () => {
  const chief = document.getElementById("setup-chief").value.trim().toLowerCase();
  const pool = NAME_POOL.filter(n => n.toLowerCase() !== chief).sort(() => Math.random() - 0.5);
  document.querySelectorAll("#setup-team input").forEach((inp, i) => { inp.value = pool[i]; refreshCard(i); });
};
// a card follows its name as it is typed; its die draws another one
document.getElementById("setup-team").addEventListener("input", ev => { const i = ev.target.dataset.desk; if (i != null) refreshCard(+i); });
document.getElementById("setup-team").addEventListener("click", ev => { const b = ev.target.closest("[data-dice]"); if (!b) return; const i = +b.dataset.dice; document.querySelector(`#setup-team input[data-desk="${i}"]`).value = freeName(); refreshCard(i); });
document.getElementById("setup-office").addEventListener("input", refreshSign);

document.getElementById("setup-form").onsubmit = async ev => {
  ev.preventDefault();
  const body = {
    chief: document.getElementById("setup-chief").value.trim(),
    office: document.getElementById("setup-office").value.trim(),
    cat: document.getElementById("setup-cat").value.trim(),
    team: [...document.querySelectorAll("#setup-team input")].map(i => i.value.trim()),
  };
  if (setupLogo !== undefined) body.logo = setupLogo;
  const names = [body.chief, ...body.team].map(n => n.toLowerCase());
  if (new Set(names).size !== names.length) return setupMsg("Chaque membre de l'équipe doit avoir un prénom différent.", true);
  const go = document.getElementById("setup-go");
  go.disabled = true;
  try {
    const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": TOKEN }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.output || out.error || `erreur ${res.status}`);
    location.reload();  // names and logo are baked into sprites and saved stats: start fresh
  } catch (err) {
    setupMsg(`Pas enregistré : ${err.message}`, true);
    go.disabled = false;
  }
};

// from the ÉQUIPE panel (re-rendered often, hence the delegation)
document.addEventListener("click", ev => { if (ev.target.closest("#edit-team")) openSetup(false); });

if (!DEMO && !OFFICE_CFG.setup) openSetup(true);
