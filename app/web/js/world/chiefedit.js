// "Créer ton chef", Sims style (Create a Sim): a big live preview (face or back, several poses) and tabs to shape the
// chief — skin and beard, haircut and hair colour, outfit with its colours (tie, trousers, shoes), glasses and hat —
// and his personality (two traits, a catchphrase he says when the team is idle). Kept in this browser (and the save).

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { ART } from "../svg/base.js";
import { CHIEF_LOOK } from "./chief.js";
import { shop } from "./shop.js";
import { esc } from "../core/data.js";
import { sfx, toast } from "../sims/progress.js";
import { closePie } from "../ui/pie.js";
import { TRAITS, TRAIT_IDS, traitsOf } from "../sims/moods.js";

const CHIEF_DEFAULT = { skin: "#f1c7a3", hair: "#d8d8d8", shirt: "#1c1c24", style: 4, glasses: "square", outfit: "tux", tie: "#d64545", pants: "#2f3550", shoes: "#17141c", beard: "", beardColor: "", hat: undefined };
let chiefStyle = new SaveSlot("office-chieflook", { look: null, traits: [], phrase: "" }).data;
if (chiefStyle.look) Object.assign(CHIEF_LOOK, chiefStyle.look); else Object.assign(CHIEF_LOOK, { ...CHIEF_DEFAULT, glasses: CHIEF_LOOK.glasses ? "square" : "" });
const saveChiefStyle = () => SaveSlot.get("office-chieflook").save(chiefStyle);
// what is sold in the wardrobe (world/shop.js SHOP, its "chief": [key, value]): locked in the editor until bought
const PAID = { "hat|crown": "crown", "hat|wizard": "chief:wizard", "outfit|robe": "chief:robe", "scarf|*": "chief:scarf", "wand|*": "chief:wand",
  "outfit|flight": "chief:flight", "hat|helmet": "chief:helmet", "hat|visor": "chief:visor", "jetpack|*": "chief:jetpack",
  "outfit|vampire": "chief:vampire", "hat|tophat": "chief:tophat" };
export const paidFor = (key, v) => { if (!v) return ""; const id = PAID[`${key}|${v}`] || PAID[`${key}|*`]; return id && !shop.owned.includes(id) ? id : ""; };
const lockedMsg = key => v => paidFor(key, v) ? "À acheter dans la garde-robe" : "";
// the chief's hat: the one chosen in the editor (the paid ones only once bought), else the shop's crown toggle
export function chiefHat() {
  const h = CHIEF_LOOK.hat;
  if (h === undefined || h === null) return shop.crown && shop.owned.includes("crown") ? "crown" : "";
  return paidFor("hat", h) ? "" : h;
}
// put on (or take off) what was bought in the wardrobe: the look is kept as if chosen in the editor
export function wearChief(patch) {
  Object.assign(CHIEF_LOOK, patch);
  chiefStyle = { ...chiefStyle, look: { ...(chiefStyle.look || {}), ...CHIEF_LOOK } }; saveChiefStyle();
  hub.simPortraits?.clear(); hub.faceKey = ""; hub.renderSims?.();
}
// personality: the two traits chosen for the chief replace the ones drawn from his name (moods.js)
const traitsFromName = traitsOf;
hub.traitsOf = name => name === CHIEF_NAME && chiefStyle.traits?.length === 2 ? chiefStyle.traits : traitsFromName(name);
export const chiefPhrase = () => chiefStyle.phrase || "";

/* ---------- choices ---------- */
const CAS = {
  skin: ["#ffe0c4", "#f5d6bf", "#f1c7a3", "#e0ac83", "#d9a47c", "#c68a5c", "#a8714f", "#8a5a3c", "#7a4b32", "#5a3524"],
  hair: ["#1c1c24", "#2b1d14", "#5b3a20", "#8c2f1e", "#c9a24b", "#e8d08a", "#d8d8d8", "#f4f4f4", "#b48cff", "#4090d7", "#ff6b9a", "#51cf66"],
  shirt: ["#1c1c24", "#081746", "#2e3a59", "#5c3d27", "#3a3a48", "#8f2b46", "#2f6e3c", "#c9a24b", "#e6e2d8", "#f7f7f7", "#4090d7", "#ff6b6b", "#b48cff", "#fbaa08"],
  tie: ["#d64545", "#081746", "#fbaa08", "#51cf66", "#b48cff", "#1c1c24", "#e98fc4", "#f7f7f7"],
  pants: ["#2f3550", "#1c1c24", "#3a3a48", "#5c4632", "#c9b79c", "#2f6e3c", "#8f2b46", "#e6e2d8"],
  shoes: ["#17141c", "#5c3d27", "#f7f7f7", "#8f2b46", "#4090d7", "#fbaa08"],
  style: [[0, "Courts"], [1, "En pétard"], [2, "Mi-longs"], [3, "Houppe"], [4, "Raie de côté"], [5, "Chauve"], [6, "Longs"], [7, "Chignon"], [8, "Crête"]],
  beard: [["", "Rasé"], ["stubble", "3 jours"], ["short", "Courte"], ["full", "Fournie"], ["mustache", "Moustache"], ["goatee", "Bouc"]],
  outfit: [["tux", "Smoking"], ["suit", "Costume"], ["shirt", "Chemise"], ["polo", "Polo"], ["hoodie", "Sweat à capuche"], ["tshirt", "T-shirt"], ["robe", "Robe de sorcier"], ["flight", "Combinaison spatiale"], ["vampire", "Cape de vampire"]],
  glasses: [["", "Aucune"], ["square", "Carrées"], ["round", "Rondes"], ["sun", "Solaires"]],
  hat: [["", "Aucun"], ["crown", "Couronne"], ["cap", "Casquette"], ["beanie", "Bonnet"], ["fedora", "Feutre"], ["headset", "Casque-micro"], ["party", "Fête"], ["wizard", "Chapeau pointu"], ["helmet", "Casque d'astronaute"], ["visor", "Visière holo"], ["tophat", "Haut-de-forme"]],
  scarf: [["", "Aucune"], ["#8f2b2b,#d4a640", "Rouge et or"], ["#2f5d3a,#c9ccd6", "Vert et argent"], ["#22336a,#b08a5a", "Bleu et bronze"], ["#d4a640,#1c1c22", "Jaune et noir"]],
  wand: [["", "Sans"], ["1", "Baguette"]],
  jetpack: [["", "Sans"], ["1", "Jetpack"]],
};
const CAS_TABS = [["face", "🙂", "Visage"], ["hair", "💇", "Cheveux"], ["outfit", "👔", "Tenue"], ["acc", "🕶️", "Accessoires"], ["perso", "✨", "Personnalité"]];
const POSES = [["stand", "Debout", {}], ["wave", "Bras levés", { arms: "up" }], ["lead", "Au podium", { arms: "baton" }], ["seat", "Assis", { seated: true, arms: "type" }]];
const casBox = document.getElementById("cas");
let cas = null;  // the draft being edited: { look, traits, phrase, tab, back, pose, smile }

export function openCas() {
  cas = { look: { ...CHIEF_LOOK }, traits: [...(chiefStyle.traits?.length === 2 ? chiefStyle.traits : traitsFromName(CHIEF_NAME))], phrase: chiefStyle.phrase || "", tab: "face", back: false, pose: "stand", smile: true };
  casBox.hidden = false; closePie(); renderCas();
}
function closeCas() { casBox.hidden = true; cas = null; }
function casPreview() {
  const pose = POSES.find(p => p[0] === cas.pose)[2], hat = paidFor("hat", cas.look.hat) ? "" : cas.look.hat || "";
  const svg = ART.person.markup({ look: cas.look, tux: true, smile: cas.smile, back: cas.back, hat, frame: 0, ...pose });
  return `<img alt="Aperçu du chef" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/width="\d+" height="\d+"/, 'width="216" height="312"'))}">`;
}
const swatches = (key, colors, custom = true) => `<div class="cswatch">${colors.map(c => `<button data-cas-set="${key}" data-v="${c}" class="${cas.look[key] === c ? "on" : ""}" style="--sw:${c}" title="${c}"></button>`).join("")}${custom ? `<label class="cpick" title="Couleur libre"><input type="color" data-cas-color="${key}" value="${/^#[0-9a-f]{6}$/i.test(cas.look[key] || "") ? cas.look[key] : "#888888"}">🎨</label>` : ""}</div>`;
const choices = (key, list, locked = () => "") => `<div class="cchoice">${list.map(([v, label]) => { const lock = locked(v); return `<button data-cas-set="${key}" data-v="${v}" class="${String(cas.look[key] ?? "") === String(v) ? "on" : ""}"${lock ? ` disabled title="${esc(lock)}"` : ""}>${esc(label)}${lock ? " 🔒" : ""}</button>`; }).join("")}</div>`;
function casTabHtml() {
  const L = cas.look;
  if (cas.tab === "face") return `<h4>PEAU</h4>${swatches("skin", CAS.skin)}<h4>BARBE</h4>${choices("beard", CAS.beard)}${L.beard ? `<h4>COULEUR DE LA BARBE</h4>${swatches("beardColor", ["", ...CAS.hair].filter(Boolean))}` : ""}`;
  if (cas.tab === "hair") return `<h4>COUPE</h4>${choices("style", CAS.style)}<h4>COULEUR</h4>${swatches("hair", CAS.hair)}`;
  if (cas.tab === "outfit") return `<h4>TENUE</h4>${choices("outfit", CAS.outfit, lockedMsg("outfit"))}<h4>${L.outfit === "flight" ? "COMBINAISON" : L.outfit === "vampire" ? "HABIT" : L.outfit === "robe" ? "ROBE" : L.outfit === "tux" || L.outfit === "suit" ? "VESTE" : "HAUT"}</h4>${swatches("shirt", CAS.shirt)}
    ${["tux", "suit", "robe", "flight", "vampire"].includes(L.outfit) ? `<h4>${L.outfit === "tux" ? "NŒUD PAPILLON" : L.outfit === "robe" ? "LISERÉ" : L.outfit === "flight" ? "BANDES" : L.outfit === "vampire" ? "DOUBLURE DE LA CAPE" : "CRAVATE"}</h4>${swatches("tie", CAS.tie)}` : ""}<h4>PANTALON</h4>${swatches("pants", CAS.pants)}<h4>CHAUSSURES</h4>${swatches("shoes", CAS.shoes)}`;
  if (cas.tab === "acc") return `<h4>LUNETTES</h4>${choices("glasses", CAS.glasses)}<h4>CHAPEAU</h4>${choices("hat", CAS.hat, lockedMsg("hat"))}<h4>ÉCHARPE</h4>${choices("scarf", CAS.scarf, lockedMsg("scarf"))}<h4>BAGUETTE</h4>${choices("wand", CAS.wand, lockedMsg("wand"))}<h4>JETPACK</h4>${choices("jetpack", CAS.jetpack, lockedMsg("jetpack"))}`;
  return `<h4>DEUX TRAITS</h4><div class="ctraits">${TRAIT_IDS.map(id => { const t = TRAITS[id]; return `<button data-cas-trait="${id}" class="${cas.traits.includes(id) ? "on" : ""}" title="${esc(t.desc)}">${t.icon} ${esc(t.name)}</button>`; }).join("")}</div>
    <p class="muted">${cas.traits.map(id => `${TRAITS[id].icon} ${esc(TRAITS[id].desc)}`).join("<br>")}</p>
    <h4>PHRASE FÉTICHE</h4><input id="cas-phrase" maxlength="40" placeholder="J'attends tes ordres." value="${esc(cas.phrase)}" aria-label="Phrase fétiche">
    <p class="muted">Il la dit sur son podium quand l'équipe n'a besoin de rien.</p>`;
}
function renderCas() {
  if (!cas) return;
  casBox.innerHTML = `<div class="chead"><b>👑 Créer ton chef</b><span class="muted">${esc(CHIEF_NAME)}</span><button class="x" data-cas="cancel" title="Annuler (Échap)">×</button></div>
    <div class="cbody">
      <div class="cstage"><div class="cpreview${cas.back ? " back" : ""}">${casPreview()}</div>
        <div class="cposes"><button data-cas="turn" title="Tourner">↻ ${cas.back ? "De face" : "De dos"}</button>${POSES.map(([id, label]) => `<button data-cas-pose="${id}" class="${cas.pose === id ? "on" : ""}">${label}</button>`).join("")}<button data-cas="smile" class="${cas.smile ? "on" : ""}">${cas.smile ? "😊" : "😐"}</button></div>
        <div class="ctraitbadges">${cas.traits.map(id => `<span>${TRAITS[id].icon} ${esc(TRAITS[id].name)}</span>`).join("")}</div></div>
      <div class="cpanel"><nav class="ctabs">${CAS_TABS.map(([id, ic, label]) => `<button data-cas-tab="${id}" class="${cas.tab === id ? "on" : ""}"><span>${ic}</span>${label}</button>`).join("")}</nav>
        <div class="copts">${casTabHtml()}</div></div></div>
    <div class="cfoot"><button data-cas="random">🎲 Aléatoire</button><button data-cas="reset">↺ Par défaut</button><span></span><button data-cas="cancel">Annuler</button><button data-cas="ok" class="ok">✓ Valider</button></div>`;
}
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
casBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b || !cas || b.disabled) return;
  if (b.dataset.casSet) { const k = b.dataset.casSet; cas.look[k] = k === "style" ? +b.dataset.v : b.dataset.v; if (k === "hat") cas.look.hat = b.dataset.v; return renderCas(); }
  if (b.dataset.casTab) { cas.tab = b.dataset.casTab; return renderCas(); }
  if (b.dataset.casPose) { cas.pose = b.dataset.casPose; return renderCas(); }
  if (b.dataset.casTrait) {
    const id = b.dataset.casTrait;
    cas.traits = cas.traits.includes(id) ? cas.traits.filter(x => x !== id) : [...cas.traits, id].slice(-2);
    return renderCas();
  }
  const a = b.dataset.cas;
  if (a === "turn") { cas.back = !cas.back; return renderCas(); }
  if (a === "smile") { cas.smile = !cas.smile; return renderCas(); }
  if (a === "cancel") return closeCas();
  if (a === "reset") { cas.look = { ...CHIEF_DEFAULT }; cas.traits = [...traitsFromName(CHIEF_NAME)]; cas.phrase = ""; return renderCas(); }
  if (a === "random") {
    cas.look = { skin: rnd(CAS.skin), hair: rnd(CAS.hair), style: rnd(CAS.style)[0], outfit: rnd(CAS.outfit.filter(([v]) => !paidFor("outfit", v)))[0], shirt: rnd(CAS.shirt), tie: rnd(CAS.tie), pants: rnd(CAS.pants), shoes: rnd(CAS.shoes),
      beard: rnd(CAS.beard)[0], beardColor: "", glasses: rnd(CAS.glasses)[0], hat: rnd(CAS.hat.filter(([v]) => !paidFor("hat", v)))[0], scarf: "", wand: "", jetpack: "" };
    const ids = [...TRAIT_IDS].sort(() => Math.random() - 0.5); cas.traits = ids.slice(0, 2);
    return renderCas();
  }
  if (a === "ok") {
    if (cas.traits.length !== 2) { toast("CRÉER TON CHEF", "Choisis deux traits", "Onglet Personnalité."); cas.tab = "perso"; return renderCas(); }
    for (const k of Object.keys(CHIEF_LOOK)) delete CHIEF_LOOK[k];
    Object.assign(CHIEF_LOOK, cas.look);
    chiefStyle = { look: { ...cas.look }, traits: cas.traits, phrase: cas.phrase.trim() }; saveChiefStyle();
    hub.simPortraits.clear(); hub.faceKey = ""; hub.renderSims(); closeCas();
    chief.bubble = chiefPhrase() || "Nouveau look !"; chief.until = performance.now() + 3500; sfx("achievement");
    toast("CRÉER TON CHEF", `${CHIEF_NAME} a un nouveau look`, `${chiefStyle.traits.map(id => `${TRAITS[id].icon} ${TRAITS[id].name}`).join(" · ")}`);
  }
});
casBox.addEventListener("input", ev => {
  if (!cas) return;
  if (ev.target.id === "cas-phrase") cas.phrase = ev.target.value;
  if (ev.target.dataset.casColor) { cas.look[ev.target.dataset.casColor] = ev.target.value; const img = casBox.querySelector(".cpreview"); if (img) img.innerHTML = casPreview(); }
});
casBox.addEventListener("change", ev => { if (ev.target.dataset?.casColor) renderCas(); });
addEventListener("keydown", ev => { if (ev.key === "Escape" && !casBox.hidden) { ev.stopImmediatePropagation(); closeCas(); } }, true);
document.getElementById("casbtn").onclick = () => openCas();
document.getElementById("live-edit").onclick = ev => { ev.stopPropagation(); openCas(); };

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get chiefHat() { return chiefHat; }, get paidFor() { return paidFor; }, get wearChief() { return wearChief; } });
