// The team in pixel art: the sprite pack (app/sprites/, built into web/sprites/atlas.png, props.png, atlas.json),
// everywhere a person is drawn (the isometric and the 2D office, portraits, the chief's editor, the faces of the HUD).
//
// pixelImage(state) → a canvas of the IsoAvatar box (svg/iso.js: 24×48 units around the feet, 1 unit of margin)
// pixelSvg(state, { view, mirror }) → the same as an SVG <image>, feet at (0, 0) (people.js personSvg)
// Both null only if the atlas could not be loaded (the module waits for it: the app starts once it is there).
// A look becomes an outfit of the pack (its hair style, outfit, beard, glasses, hat, scarf… pick the items, its
// colours the nearest variant of each ramp); a state (walking, seated, arms, talking, what the hand holds) a pose,
// a frame and a prop held at the hand. The sprites face down-right from the front and up-left from behind (rot 1
// and 3); rot 0 and 2 are the same frames mirrored.

import { ART } from "./base.js";
import { hub } from "../hub.js";

const PX = 1.6;                                   // sprite pixels per scene unit
const BOX = { x: -13, y: -41, w: 26, h: 50 };     // the IsoAvatar box with its margin, in units
const CW = Math.round(BOX.w * PX), CH = Math.round(BOX.h * PX);
// the crops of a face and of a bust (figures.js PORTRAIT_BOX / BUST_BOX) for these proportions: a bigger head
export const PORTRAIT_BOX = "-7.6 -30.6 15.2 14.4", BUST_BOX = "-9.5 -31 19 20";

let meta = null, atlas = null, props = null, loading = null;
const image = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function load() {
  // the index never from the cache; the images by its version (a rebuilt atlas is never mixed with an old index)
  loading ||= fetch("/static/sprites/atlas.json", { cache: "no-cache" }).then(r => r.json())
    .then(m => Promise.all([m, image(`/static/sprites/atlas.png?v=${m.version}`), image(`/static/sprites/props.png?v=${m.version}`)]))
    .then(([m, a, p]) => {
      meta = m; atlas = a; props = p;
      for (const art of [ART.person, ART.isoavatar]) art?.reset();  // the empty images made meanwhile go
    }, () => { loading = null; });  // tried again at the next drawing
  return loading;
}
// the app waits for the atlas (local, ~150 KB) before it starts: the portraits and other images cached once are
// never made empty; if it fails, the app starts anyway and the drawing tries again
await load();

/* ---------- a look → an outfit of the pack ---------- */
const HAIR_BY_STYLE = ["court", "herisse", "carre", "houppe", "raie", "chauve", "long", "chignon", "crete"];  // the editor's styles 0-8
const TOP_BY_OUTFIT = { tux: "smoking", suit: "costume", shirt: "chemise", polo: "polo", hoodie: "hoodie", tshirt: "tshirt", robe: "robe",
  flight: "pilote", vampire: "vampire", pirate: "pirate", kimono: "kimono", hawaii: "hawaii" };
const BEARD = { stubble: "3jours", short: "courte", full: "fournie", mustache: "moustache", goatee: "bouc" };
const GLASSES = { true: "carrees", square: "carrees", round: "rondes", sun: "soleil", patch: "bandeau" };
const HATS = { cap: "casquette", beanie: "bonnet", headset: "casque_micro", party: "fete", crown: "couronne", straw: "paille", kasa: "kasa",
  hachimaki: "hachimaki", tricorne: "tricorne", tophat: "haut_de_forme", fedora: "feutre", vr: "vr", helmet: "casque_astronaute",
  visor: "visiere", wizard: "sorcier" };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function nearest(ramp, hex) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex) || !meta.ramps[ramp]) return null;
  const c = rgb(hex);
  let best = null, d0 = Infinity;
  for (const [name, tones] of Object.entries(meta.ramps[ramp].variants)) {
    const t = rgb(tones[2]), d = (t[0] - c[0]) ** 2 + (t[1] - c[1]) ** 2 + (t[2] - c[2]) ** 2;
    if (d < d0) { d0 = d; best = name; }
  }
  return best;
}
const has = id => id && meta.items[id] ? id : null;
// a face of its own for everyone, the same every time: from the look (a woman: an oval or heart face, lashes, lips)
function hashOf(look) { let h = 7; for (const c of `${look.skin}|${look.hair}|${look.shirt}|${look.style}|${look.sex}`) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
const pick = (list, h) => list[h % list.length];
// the mouth: the chosen one (the chief's editor) when smiling, a neutral one when not; else from the sex and the mood
function mouthOf(look, s, fem, h) {
  const m = look.mouth;
  if (m === "levres" || (!m && fem)) return s.smile ? "levres" : "levres_neutre";
  if (m) return s.smile || m === "moue" || m === "neutre" ? m : "neutre";
  return s.smile ? pick(["sourire", "sourire", "grand_sourire"], h >> 4) : pick(["neutre", "neutre", "moue"], h >> 4);
}
// the team's shoes: the pair bought in the shop (world/shop.js), else the sneakers; the chief keeps his
const shoesOf = look => (look.team && hub.shop?.shoes) || "baskets";
// every pair of the pack (app/sprites/src/shoes/*.piskel), for the shop
export const shoeStyles = () => Object.keys(meta?.items || {}).filter(id => id.startsWith("shoes/")).map(id => id.slice(6));
// the shoes changed: the images already made go
export function resetPeople() {
  frames.clear(); urls.clear();
  for (const art of [ART.person, ART.isoavatar]) art?.reset();
}
function outfitOf(look = {}, s) {
  const fem = look.sex === "f", outfit = look.outfit || (s.tux ? "tux" : ""), h = hashOf(look);
  const [scarfA, scarfB] = look.scarf ? String(look.scarf).split(",") : [];
  const wear = [
    "body",
    has(`bottom/${fem && outfit === "robe" ? "jupe" : "pantalon"}`),
    has(`shoes/${shoesOf(look)}`) || has("shoes/baskets"),
    has(`top/${TOP_BY_OUTFIT[outfit] || "pull"}`),
    look.scarf && has("extra/echarpe"), look.lei && has("extra/collier"), look.parrot && has("extra/perroquet"),
    look.jetpack && has("extra/jetpack"), look.katana && has("extra/katana"),
    has(`head/${look.head || pick(fem ? ["ovale", "coeur"] : ["rond", "carre"], h)}`),
    has(`face/${look.eyes || (fem ? pick(["cils", "cils", "grands"], h >> 2) : pick(["ronds", "amande", "points", "ronds", "grands"], h >> 2))}`),
    has(`mouth/${mouthOf(look, s, fem, h)}`),
    !fem && BEARD[look.beard] && has(`beard/${BEARD[look.beard]}`),
    has(`hair/${HAIR_BY_STYLE[look.style ?? 0] || "court"}`),
    look.glasses && has(`glasses/${GLASSES[look.glasses]}`),
    s.hat && has(`hat/${HATS[s.hat]}`),
  ].filter(Boolean);
  const colors = {
    skin: nearest("skin", look.skin), hair: nearest("hair", look.hair), beard: nearest("beard", look.beardColor || look.hair),
    top: outfit === "tux" && !look.outfit ? "noir" : nearest("top", look.shirt), tie: nearest("tie", look.tie),
    bottom: nearest("bottom", look.pants), shoes: nearest("shoes", look.shoes),
    scarf: nearest("scarf", scarfA), scarf2: nearest("scarf2", scarfB),
  };
  for (const id of wear) for (const [r, v] of Object.entries(meta.items[id]?.default || {})) colors[r] ||= v;
  for (const [r, ramp] of Object.entries(meta.ramps)) colors[r] ||= ramp.source;
  return { wear, colors };
}

/* ---------- a state → a frame of the pack (and what the hand holds) ---------- */
const DRINK = { cup: 1, sip: 3, mic: 2, pint: 1, cocktail: 1, can: 1 };
const AT_CHEST = new Set(["tray", "plate", "papers"]);
const PROP_OF_HOLD = { sip: "cup" };  // what the hand holds → the prop drawn, when their names differ (else the same name)
function poseOf(s, back) {
  const P = meta.poses, f = (s.frame || 0) % 2, k = f + (s.breath ? 2 : 0), arms = s.arms || "down", h = s.hold || "";
  const at = (pose, i) => P[pose][0] + (i % P[pose][1]);
  if (back) {
    if (s.walk != null) return at("walk_back", Math.floor((s.walk % 8) * P.walk_back[1] / 8));
    if (arms === "up") return at("arms_up_back", k);                          // a ticket picked, the cabinet, darts, a cheer
    if (s.seated && arms === "type") return at("sit", k);                     // at a desk, at the console
    if (arms === "reach" || arms === "type") return at("reach_back", k);      // arcade, coffee machine, cooking, baby-foot
    return at("walk_back", 0);                                                // standing or seated at rest (sofa, meeting)
  }
  if (s.walk != null) return at("walk_front", Math.floor((s.walk % 8) * P.walk_front[1] / 8));
  if (h === "mic") return at("drink", 2);                                     // karaoke: the mic at the mouth
  if (h === "paddle") return at("reach", k);                                  // ping-pong
  if (arms === "up") return at("arms_up", k);
  if (arms === "baton") return at("baton", k);
  if (arms === "type" || (arms === "reach" && s.seated)) return at("type_front", k);
  if (h in DRINK) return at("drink", h === "sip" ? 3 : DRINK[h]);
  if (h === "book") return at("read", k);
  if (AT_CHEST.has(h)) return at("hold_front", k);
  if (h === "pour") return at("pour", 2 + f);
  if (arms === "reach") return at("reach", k);
  if (s.talk) return at("talk", 0 + (f ? 2 : 0));
  if (s.blink) return at("idle", 3);
  return at("idle", s.breath ? 2 : 0);
}
function propOf(s) {
  const h = s.hold || "";
  if (h) return meta.props[PROP_OF_HOLD[h] || h] ? PROP_OF_HOLD[h] || h : null;
  if (s.arms === "baton") return "baton";
  return s.look?.wand ? "wand" : null;
}

/* ---------- recoloured rows of the atlas, then composed frames ---------- */
const rows = new Map(), frames = new Map(), urls = new Map(), MAX = 600;
function remember(map, key, value) {
  if (map.size >= MAX) for (const k of [...map.keys()].slice(0, MAX / 10)) map.delete(k);
  map.set(key, value);
  return value;
}
function row(id, colors, which = "row") {
  const it = meta.items[id] || { row: 0, ramps: [] }, r = it[which], key = id + which + "|" + it.ramps.map(x => colors[x]).join(",");
  let c = rows.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = meta.w * meta.frames; c.height = meta.h;
  const g = c.getContext("2d");
  g.drawImage(atlas, 0, r * meta.h, c.width, meta.h, 0, 0, c.width, meta.h);
  const table = new Map();
  for (const x of it.ramps) {
    const ramp = meta.ramps[x], from = ramp.variants[ramp.source], to = ramp.variants[colors[x]] || from;
    from.forEach((h, i) => { const k = rgb(h).join(); if (!table.has(k)) table.set(k, rgb(to[i])); });
  }
  if (table.size) {
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      if (!d[p + 3]) continue;
      const t = table.get(d[p] + "," + d[p + 1] + "," + d[p + 2]);
      if (t) [d[p], d[p + 1], d[p + 2]] = t;
    }
    g.putImageData(img, 0, 0);
  }
  return remember(rows, key, c);
}

function compose(s, rot, shadow) {
  if (!meta) { load(); return null; }
  const back = rot >= 2, mirror = rot === 0 || rot === 2, f = poseOf(s, back), a = meta.anchors[f];
  const prop = back ? null : propOf(s);
  const key = JSON.stringify([s.look, s.hat || "", shoesOf(s.look || {}), !!s.tux, !!s.smile, f, mirror, !!s.seated, prop, shadow]);
  let c = frames.get(key);
  if (c) { frames.delete(key); frames.set(key, c); return c; }

  const { wear, colors } = outfitOf(s.look, s);
  c = document.createElement("canvas");
  c.width = CW; c.height = CH;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  const ox = Math.round(-BOX.x * PX) - meta.w / 2, oy = Math.round(-BOX.y * PX) - meta.feet;  // the sprite's corner
  // seated: the hips on the chair (4.4 units over the floor), the legs hidden
  const hips = meta.hips + (f >= meta.poses.sit[0] && f < meta.poses.sit[0] + meta.poses.sit[1] ? 5 : 0);
  const seatY = s.seated ? Math.round(-BOX.y * PX - 4.4 * PX) - hips - oy : 0;
  const cut = s.seated ? hips + 3 : meta.h;  // seated: the legs under the chair, desk or table, from both sides
  if (mirror) { g.translate(CW, 0); g.scale(-1, 1); }
  const blit = (src, sx, w, h, dx, dy) => g.drawImage(src, sx, 0, w, h, dx, dy, w, h);
  if (shadow && !s.seated) blit(row("shadow", colors), f * meta.w, meta.w, meta.h, ox, oy);
  for (const id of wear) if (meta.items[id].behind != null) blit(row(id, colors, "behind"), f * meta.w, meta.w, cut, ox, oy + seatY);
  for (const id of wear) blit(row(id, colors), f * meta.w, meta.w, cut, ox, oy + seatY);
  const p = prop && meta.props[prop];
  if (p) {
    const k = prop === "pot" ? ((f - meta.poses.pour[0]) >= 2 ? 1 : 0) : (f % 2) % p.frames;
    const [hx, hy] = a[p.anchor] || a.hand;
    g.drawImage(props, p.x + k * p.w, 0, p.w, p.h, ox + hx - p.grip[0], oy + seatY + hy - p.grip[1], p.w, p.h);
  }
  return remember(frames, key, c);
}

export const pixelImage = s => compose(s, s.rot || 0, true);

// for personSvg(): the people.js views → a rotation of the pack (people.js front = facing left, its back = up-left)
export function pixelSvg(s, { view = "front", mirror = false } = {}) {
  const back = view === "back", rot = back ? (mirror ? 2 : 3) : (mirror ? 1 : 0);
  const c = compose(s, rot, false);
  if (!c) return null;
  let url = urls.get(c);
  if (!url) { url = c.toDataURL(); if (urls.size >= MAX) urls.clear(); urls.set(c, url); }
  return `<image x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" href="${url}" style="image-rendering:pixelated" preserveAspectRatio="none"/>`;
}
