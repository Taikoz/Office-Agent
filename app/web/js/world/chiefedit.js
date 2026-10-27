// "Créer ton chef", Sims style (Create a Sim): a big live preview (face or back, several poses) and tabs to shape the
// chief — skin and beard, haircut and hair colour, outfit with its colours (tie, trousers, shoes), glasses and hat —
// and his personality (two traits, a catchphrase he says when the team is idle). Kept in this browser (and the save).

import { hub, provide } from "../hub.js";
import { CHIEF_NAME, chief } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { personSvg } from "../svg/people.js";
import { CHIEF_LOOK } from "./chief.js";
import { shop } from "./shop.js";
import { esc } from "../core/data.js";
import { sfx, toast } from "../sims/progress.js";
import { closePie } from "../ui/pie.js";
import { TRAITS, TRAIT_IDS, traitsOf } from "../sims/moods.js";

const CHIEF_DEFAULT = { skin: "#f1c7a3", hair: "#d8d8d8", shirt: "#1c1c24", style: 4, glasses: "square", outfit: "tux", tie: "#d64545", pants: "#2f3550", shoes: "#17141c", beard: "", beardColor: "", head: "", eyes: "", mouth: "", hat: undefined };
let chiefStyle = new SaveSlot("office-chieflook", { look: null, traits: [], phrase: "" }).data;
if (chiefStyle.look) Object.assign(CHIEF_LOOK, chiefStyle.look); else Object.assign(CHIEF_LOOK, { ...CHIEF_DEFAULT, glasses: CHIEF_LOOK.glasses ? "square" : "" });
const saveChiefStyle = () => SaveSlot.get("office-chieflook").save(chiefStyle);
// what is sold in the wardrobe (world/shop.js SHOP, its "chief": [key, value]): locked in the editor until bought
const PAID = { "hat|crown": "crown", "hat|wizard": "chief:wizard", "outfit|robe": "chief:robe", "scarf|*": "chief:scarf", "wand|*": "chief:wand",
  "outfit|flight": "chief:flight", "hat|helmet": "chief:helmet", "hat|visor": "chief:visor", "jetpack|*": "chief:jetpack",
  "outfit|vampire": "chief:vampire", "hat|tophat": "chief:tophat",
  "outfit|pirate": "chief:pirate", "hat|tricorne": "chief:tricorne", "glasses|patch": "chief:patch", "parrot|*": "chief:parrot",
  "outfit|kimono": "chief:kimono", "hat|kasa": "chief:kasa", "katana|*": "chief:katana",
  "outfit|hawaii": "chief:hawaii", "hat|straw": "chief:straw", "lei|*": "chief:lei" };
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
  sex: [["", "Homme"], ["f", "Femme"]],
  style: [[0, "Courts"], [1, "En pétard"], [2, "Mi-longs"], [3, "Houppe"], [4, "Raie de côté"], [5, "Chauve"], [6, "Longs"], [7, "Chignon"], [8, "Crête"]],
  head: [["", "Auto"], ["rond", "Rond"], ["carre", "Carré"], ["ovale", "Ovale"], ["coeur", "En cœur"]],
  eyes: [["", "Auto"], ["ronds", "Ronds"], ["grands", "Grands"], ["amande", "En amande"], ["points", "Points"], ["cils", "Avec cils"], ["fatigue", "Fatigués"]],
  mouth: [["", "Auto"], ["sourire", "Sourire"], ["grand_sourire", "Grand sourire"], ["neutre", "Neutre"], ["moue", "Moue"], ["levres", "Lèvres"]],
  beard: [["", "Rasé"], ["stubble", "3 jours"], ["short", "Courte"], ["full", "Fournie"], ["mustache", "Moustache"], ["goatee", "Bouc"]],
  outfit: [["tux", "Smoking"], ["suit", "Costume"], ["shirt", "Chemise"], ["polo", "Polo"], ["hoodie", "Sweat à capuche"], ["tshirt", "T-shirt"], ["robe", "Robe de sorcier"], ["flight", "Combinaison spatiale"], ["vampire", "Cape de vampire"], ["pirate", "Habit de capitaine"], ["kimono", "Kimono"], ["hawaii", "Chemise hawaïenne"]],
  glasses: [["", "Aucune"], ["square", "Carrées"], ["round", "Rondes"], ["sun", "Solaires"], ["patch", "Bandeau sur l'œil"]],
  hat: [["", "Aucun"], ["crown", "Couronne"], ["cap", "Casquette"], ["beanie", "Bonnet"], ["fedora", "Feutre"], ["headset", "Casque-micro"], ["party", "Fête"], ["wizard", "Chapeau pointu"], ["helmet", "Casque d'astronaute"], ["visor", "Visière holo"], ["tophat", "Haut-de-forme"], ["tricorne", "Tricorne"], ["kasa", "Kasa"], ["hachimaki", "Hachimaki"], ["straw", "Chapeau de paille"]],
  scarf: [["", "Aucune"], ["#8f2b2b,#d4a640", "Rouge et or"], ["#2f5d3a,#c9ccd6", "Vert et argent"], ["#22336a,#b08a5a", "Bleu et bronze"], ["#d4a640,#1c1c22", "Jaune et noir"]],
  wand: [["", "Sans"], ["1", "Baguette"]],
  jetpack: [["", "Sans"], ["1", "Jetpack"]],
  parrot: [["", "Sans"], ["1", "Perroquet"]],
  katana: [["", "Sans"], ["1", "Katana"]],
  lei: [["", "Sans"], ["1", "Collier de fleurs"]],
};
const CAS_TABS = [["face", "🙂", "Visage"], ["hair", "💇", "Cheveux"], ["outfit", "👔", "Tenue"], ["acc", "🕶️", "Accessoires"], ["perso", "✨", "Personnalité"]];
const POSES = [["stand", "Debout", {}], ["wave", "Bras levés", { arms: "up" }], ["lead", "Au podium", { arms: "baton" }], ["seat", "Assis", { seated: true, arms: "type" }]];
const casBox = document.getElementById("cas");
let cas = null;  // the draft being edited: { look, traits, phrase, tab, back, pose, smile }

export function openCas() {
  cas = { look: { ...CHIEF_LOOK }, traits: [...(chiefStyle.traits?.length === 2 ? chiefStyle.traits : traitsFromName(CHIEF_NAME))], phrase: chiefStyle.phrase || "", tab: "face", back: false, pose: "stand", smile: true };
  cas.prevOutfit = cas.look.outfit;
  casBox.hidden = false; closePie(); renderCas();
}
function closeCas() { casBox.hidden = true; cas = null; }
// the views of the preview and of the tiles (viewBoxes around the pixel-art person of svg/people.js, the feet at 0, 0:
// the head from -33 to -17, the shoulders at -16, the hips at -9)
const VIEW = { body: "-11 -36 22 37", head: "-9.5 -34 19 19", tileHead: "-8 -32.5 16 16", tileHat: "-8.5 -35.5 17 17", tileBody: "-10 -34 20 35", tileTorso: "-9 -22 18 15" };
const CLOSE_TABS = new Set(["face", "hair"]);
// an outfit's own colours: shown on its tile, put on when it is chosen (then free to recolour)
const OUTFIT_LOOK = { tux: { shirt: "#1c1c24", tie: "#d64545" }, suit: { shirt: "#2a3450", tie: "#c0303a" }, shirt: { shirt: "#e8e4dc" }, polo: { shirt: "#2f9e5a" }, hoodie: { shirt: "#8a4ad0" },
  tshirt: { shirt: "#3a7ad0" }, robe: { shirt: "#2a2350", tie: "#d4a640" }, flight: { shirt: "#e6e8ee", tie: "#00e5ff" }, vampire: { shirt: "#1c1c24", tie: "#8f1f2a" }, pirate: { shirt: "#1e2a4a", tie: "#8f1f2a" },
  kimono: { shirt: "#22336a", tie: "#c9a040" }, hawaii: { shirt: "#3ab8d8", tie: "#ff6a8a" } };
const hatOf = look => paidFor("hat", look.hat) ? "" : look.hat || "";
const figure = (state, viewBox, cls = "") => `<svg class="${cls}" viewBox="${viewBox}" preserveAspectRatio="xMidY${cls === "close" ? "Mid" : "Max"} meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${personSvg(state, { view: state.back ? "back" : "front" })}</svg>`;
function casPreview() {
  const pose = POSES.find(p => p[0] === cas.pose)[2], close = CLOSE_TABS.has(cas.tab) && !pose.seated;
  return figure({ look: cas.look, tux: true, smile: cas.smile, back: cas.back, hat: hatOf(cas.look), frame: 0, ...pose }, close ? VIEW.head : VIEW.body, close ? "close" : "");
}
// a choice shown as the chief wearing it (a haircut, a hat, an outfit…): a small drawing, its name; locked: to buy first
const tiles = (key, list, view, locked = () => "") => `<div class="ctiles">${list.map(([v, label]) => {
  const lock = locked(v), look = { ...cas.look, [key]: key === "style" ? +v : v, ...(key === "outfit" ? OUTFIT_LOOK[v] : {}) }, on = String(cas.look[key] ?? "") === String(v);
  const state = { look, tux: true, smile: true, hat: key === "hat" ? v : hatOf(cas.look) };
  return `<button class="ctile${on ? " on" : ""}${lock ? " locked" : ""}" data-cas-set="${key}" data-v="${v}"${lock ? ` disabled title="${esc(lock)}"` : ` title="${esc(label)}"`}>${figure(state, view)}<span>${esc(label)}</span>${lock ? `<i>🔒</i>` : ""}</button>`;
}).join("")}</div>`;
const swatches = (key, colors, custom = true) => `<div class="cswatch">${colors.map(c => `<button data-cas-set="${key}" data-v="${c}" class="${cas.look[key] === c ? "on" : ""}" style="--sw:${c}" title="${c}"></button>`).join("")}${custom ? `<label class="cpick" title="Couleur libre"><input type="color" data-cas-color="${key}" value="${/^#[0-9a-f]{6}$/i.test(cas.look[key] || "") ? cas.look[key] : "#888888"}">🎨</label>` : ""}</div>`;
const choices = (key, list, locked = () => "") => `<div class="cchoice">${list.map(([v, label]) => { const lock = locked(v); return `<button data-cas-set="${key}" data-v="${v}" class="${String(cas.look[key] ?? "") === String(v) ? "on" : ""}"${lock ? ` disabled title="${esc(lock)}"` : ""}>${esc(label)}${lock ? " 🔒" : ""}</button>`; }).join("")}</div>`;
const sec = (title, body, note = "") => `<section class="csec"><h4>${title}</h4>${body}${note ? `<p class="muted">${note}</p>` : ""}</section>`;
function casTabHtml() {
  const L = cas.look, o = L.outfit;
  if (cas.tab === "face") return sec("Sexe", tiles("sex", CAS.sex, VIEW.tileTorso)) + sec("Peau", swatches("skin", CAS.skin))
    + sec("Forme du visage", tiles("head", CAS.head, VIEW.tileHead)) + sec("Yeux", tiles("eyes", CAS.eyes, VIEW.tileHead))
    + sec("Bouche", tiles("mouth", CAS.mouth, VIEW.tileHead), "Auto : selon le sexe et l'humeur ; une bouche choisie reste neutre quand il fait la tête.") + (L.sex === "f" ? "" : sec("Barbe", tiles("beard", CAS.beard, VIEW.tileHead)))
    + (L.beard && L.sex !== "f" ? sec("Couleur de la barbe", swatches("beardColor", CAS.hair)) : "") + sec("Lunettes", tiles("glasses", CAS.glasses, VIEW.tileHead, lockedMsg("glasses")));
  if (cas.tab === "hair") return sec("Coupe", tiles("style", CAS.style, VIEW.tileHead)) + sec("Couleur", swatches("hair", CAS.hair));
  if (cas.tab === "outfit") {
    const main = o === "flight" ? "Combinaison" : o === "vampire" ? "Habit" : o === "pirate" ? "Redingote" : o === "kimono" ? "Kimono" : o === "hawaii" ? "Chemise" : o === "robe" ? "Robe" : o === "tux" || o === "suit" ? "Veste" : "Haut";
    const second = { tux: "Nœud papillon", robe: "Liseré", flight: "Bandes", vampire: "Doublure de la cape", pirate: "Ceinture", kimono: "Obi", hawaii: "Fleurs", suit: "Cravate" }[o];
    return sec("Tenue", tiles("outfit", CAS.outfit, VIEW.tileBody, lockedMsg("outfit"))) + sec(main, swatches("shirt", CAS.shirt)) + (second ? sec(second, swatches("tie", CAS.tie)) : "")
      + (["robe", "kimono"].includes(o) ? "" : sec("Pantalon", swatches("pants", CAS.pants))) + sec("Chaussures", swatches("shoes", CAS.shoes));
  }
  if (cas.tab === "acc") return sec("Chapeau", tiles("hat", CAS.hat, VIEW.tileHat, lockedMsg("hat"))) + sec("Écharpe", tiles("scarf", CAS.scarf, VIEW.tileTorso, lockedMsg("scarf")))
    + sec("Et aussi", `<div class="ctiles">${[["wand", "Baguette"], ["jetpack", "Jetpack"], ["parrot", "Perroquet"], ["katana", "Katana"], ["lei", "Collier de fleurs"]].map(([k, label]) => {
      const lock = paidFor(k, "1"), on = !!L[k], look = { ...L, [k]: on ? "" : "1" };
      return `<button class="ctile${on ? " on" : ""}${lock ? " locked" : ""}" data-cas-set="${k}" data-v="${on ? "" : "1"}"${lock ? ` disabled title="À acheter dans la garde-robe"` : ` title="${on ? "Retirer" : "Ajouter"} : ${esc(label)}"`}>${figure({ look: { ...L, [k]: "1" }, tux: true, smile: true, hat: hatOf(L), back: k === "jetpack" }, VIEW.tileBody)}<span>${esc(label)}</span>${lock ? "<i>🔒</i>" : on ? "<i>✓</i>" : ""}</button>`;
    }).join("")}</div>`, "Ce qui est verrouillé 🔒 s'achète dans la garde-robe (🛒 → 🎭 Thèmes).");
  return sec("Deux traits", `<div class="ctraits">${TRAIT_IDS.map(id => { const t = TRAITS[id]; return `<button data-cas-trait="${id}" class="${cas.traits.includes(id) ? "on" : ""}" title="${esc(t.desc)}"><b>${t.icon}</b>${esc(t.name)}</button>`; }).join("")}</div>`,
    cas.traits.map(id => `${TRAITS[id].icon} ${esc(TRAITS[id].desc)}`).join("<br>"))
    + sec("Phrase fétiche", `<input id="cas-phrase" maxlength="40" placeholder="J'attends tes ordres." value="${esc(cas.phrase)}" aria-label="Phrase fétiche">`, "Il la dit sur son podium quand l'équipe n'a besoin de rien.");
}
function renderCas() {
  if (!cas) return;
  const keep = casBox.querySelector(".copts")?.scrollTop || 0, sameTab = casBox.dataset.tab === cas.tab;
  casBox.innerHTML = `<div class="chead"><b>Créer ton chef</b><span class="cname">${esc(CHIEF_NAME)}</span><span class="ctraitbadges">${cas.traits.map(id => `<span>${TRAITS[id].icon} ${esc(TRAITS[id].name)}</span>`).join("")}</span><button class="x" data-cas="cancel" title="Annuler (Échap)">×</button></div>
    <div class="cbody">
      <div class="cstage"><div class="cpreview">${casPreview()}</div>
        <div class="cposes"><div class="cseg">${POSES.map(([id, label]) => `<button data-cas-pose="${id}" class="${cas.pose === id ? "on" : ""}">${label}</button>`).join("")}</div>
          <div class="cseg"><button data-cas="turn" title="Le tourner">↻ ${cas.back ? "De face" : "De dos"}</button><button data-cas="smile" class="${cas.smile ? "on" : ""}" title="Sourire">😊 Sourire</button></div></div></div>
      <div class="cpanel"><nav class="ctabs">${CAS_TABS.map(([id, ic, label]) => `<button data-cas-tab="${id}" class="${cas.tab === id ? "on" : ""}"><span>${ic}</span>${label}</button>`).join("")}</nav>
        <div class="copts">${casTabHtml()}</div></div></div>
    <div class="cfoot"><button data-cas="random">🎲 Aléatoire</button><button data-cas="reset">↺ Par défaut</button><span></span><button data-cas="cancel">Annuler</button><button data-cas="ok" class="ok">✓ Valider</button></div>`;
  casBox.dataset.tab = cas.tab;
  if (sameTab) casBox.querySelector(".copts").scrollTop = keep;  // a choice made: the list stays where it was
}
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
casBox.addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b || !cas || b.disabled) return;
  if (b.dataset.casSet) {
    const k = b.dataset.casSet; cas.look[k] = k === "style" ? +b.dataset.v : b.dataset.v;
    if (k === "sex" && b.dataset.v === "f") cas.look.beard = "";  // no beard for a woman
    if (k === "outfit" && cas.look.outfit !== cas.prevOutfit) Object.assign(cas.look, OUTFIT_LOOK[b.dataset.v] || {});
    cas.prevOutfit = cas.look.outfit; return renderCas();
  }
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
    const sex = rnd(CAS.sex)[0];
    cas.look = { sex, skin: rnd(CAS.skin), hair: rnd(CAS.hair), style: rnd(CAS.style)[0], outfit: rnd(CAS.outfit.filter(([v]) => !paidFor("outfit", v)))[0], shirt: rnd(CAS.shirt), tie: rnd(CAS.tie), pants: rnd(CAS.pants), shoes: rnd(CAS.shoes),
      head: "", eyes: "", mouth: "", beard: sex ? "" : rnd(CAS.beard)[0], beardColor: "", glasses: rnd(CAS.glasses.filter(([v]) => !paidFor("glasses", v)))[0], hat: rnd(CAS.hat.filter(([v]) => !paidFor("hat", v)))[0], scarf: "", wand: "", jetpack: "", parrot: "", katana: "", lei: "" };
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
