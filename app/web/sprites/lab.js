// Sprite lab: dress the base character with the pack (web/sprites/atlas.png, props.png, atlas.json) and watch it
// move. Items are stored once in their source colours; each one is recoloured here (source ramp → chosen variant).
"use strict";

const LABELS = { hair: "Cheveux", head: "Forme du visage", face: "Yeux", mouth: "Bouche", beard: "Barbe", top: "Haut", bottom: "Bas", shoes: "Chaussures",
  glasses: "Lunettes", hat: "Chapeau", extra: "Et aussi", prop: "Dans la main" };
const RAMP_LABELS = { skin: "Peau", hair: "Cheveux", beard: "Barbe", top: "Haut", tie: "Cravate", bottom: "Bas",
  shoes: "Chaussures", hat: "Chapeau", scarf: "Écharpe", scarf2: "Écharpe 2" };
const POSE_LABELS = { all: "DÉFILÉ", idle: "DEBOUT", walk_front: "MARCHE", walk_back: "DOS", sit: "ASSIS DOS",
  type_front: "TAPE", drink: "BOIT", read: "LIT", hold_front: "PORTE", reach: "JOUE", reach_back: "JOUE DOS",
  pour: "VERSE", talk: "PARLE", arms_up: "HOURRA", arms_up_back: "HOURRA DOS", baton: "CHEF" };
const SINGLE_OPTIONAL = new Set(["hair", "beard", "glasses", "hat"]);  // one at most, may be none
const MULTI = new Set(["extra"]);
const STORE = "sprite-lab-outfit-v3";

const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } },
  set(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* private window: not kept */ } },
};
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function main() {
  const stamp = "?" + Date.now();
  const [meta, atlas, propsImg] = await Promise.all([fetch("/static/sprites/atlas.json" + stamp).then(r => r.json()),
    loadImage("/static/sprites/atlas.png" + stamp), loadImage("/static/sprites/props.png" + stamp)]);
  const { w: W, h: H, frames: N } = meta;
  const items = meta.items;
  const byCat = {};
  for (const [id, it] of Object.entries(items)) (byCat[it.cat] ||= []).push(id);

  const defaults = () => ({
    wear: { ...Object.fromEntries(Object.entries(meta.default).map(([c, n]) => [c, `${c}/${n}`])), extra: [] },
    colors: Object.fromEntries(Object.entries(meta.ramps).map(([r, v]) => [r, v.source])),
    prop: null,
  });
  let outfit = store.get() || defaults();
  for (const [c, id] of Object.entries(outfit.wear)) if (!MULTI.has(c) && id && !items[id]) outfit.wear[c] = defaults().wear[c] || null;
  outfit.wear.extra = (outfit.wear.extra || []).filter(id => items[id]);
  if (outfit.prop && !meta.props[outfit.prop]) outfit.prop = null;

  // ---- recolouring, cached per item + colours
  const cache = new Map();
  function row(id, which = "row") {
    const it = items[id] || { row: 0, ramps: [] };
    const key = id + which + "|" + it.ramps.map(r => outfit.colors[r]).join(",");
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement("canvas");
    c.width = W * N; c.height = H;
    const g = c.getContext("2d");
    g.drawImage(atlas, 0, it[which] * H, W * N, H, 0, 0, W * N, H);
    const table = new Map();
    for (const r of it.ramps) {
      const ramp = meta.ramps[r], from = ramp.variants[ramp.source], to = ramp.variants[outfit.colors[r]] || from;
      from.forEach((hex, i) => { const k = hexToRgb(hex).join(); if (!table.has(k)) table.set(k, hexToRgb(to[i])); });
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
    cache.set(key, c);
    return c;
  }

  function worn(wear = outfit.wear) {
    const list = ["body"];
    for (const cat of meta.order.slice(1)) {
      if (MULTI.has(cat)) list.push(...(wear[cat] || []));
      else if (wear[cat]) list.push(wear[cat]);
    }
    return list;
  }

  function drawFrame(g, f, x, y, scale, list = worn(), { flip = false, prop = outfit.prop, shadow = true } = {}) {
    g.save();
    g.imageSmoothingEnabled = false;
    if (flip) { g.translate(x + W * scale, y); g.scale(-1, 1); } else g.translate(x, y);
    const blit = src => g.drawImage(src, f * W, 0, W, H, 0, 0, W * scale, H * scale);
    if (shadow) blit(row("shadow"));
    for (const id of list) if (items[id]?.behind != null) blit(row(id, "behind"));
    for (const id of list) blit(row(id));
    const p = prop && meta.props[prop], a = meta.anchors[f];
    if (p && !a.back) {
      const k = prop === "pot" ? (f - meta.poses.pour[0] >= 2 && f < meta.poses.pour[0] + meta.poses.pour[1] ? 1 : 0) : (f % 2) % p.frames, [hx, hy] = a[p.anchor] || a.hand;
      g.drawImage(propsImg, p.x + k * p.w, 0, p.w, p.h, (hx - p.grip[0]) * scale, (hy - p.grip[1]) * scale, p.w * scale, p.h * scale);
    }
    g.restore();
  }

  // ---- stage
  const hero = document.getElementById("hero"), hg = hero.getContext("2d");
  hero.width = W * 6; hero.height = H * 6;
  hero.style.width = hero.width + "px"; hero.style.height = hero.height + "px";
  const strip = document.getElementById("strip"), sg = strip.getContext("2d");
  const perRow = 20;
  strip.width = W * perRow; strip.height = H * Math.ceil(N / perRow);
  let pose = "all", tick = 0, flip = false;
  const posesEl = document.getElementById("poses");
  for (const p of Object.keys(POSE_LABELS).filter(p => p === "all" || meta.poses[p])) {
    const b = document.createElement("button");
    b.textContent = POSE_LABELS[p]; b.dataset.pose = p;
    b.onclick = () => { pose = p; tick = 0; posesEl.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); };
    if (p === pose) b.classList.add("on");
    posesEl.append(b);
  }
  function frameNow() {
    if (pose === "all") return tick % N;
    const [start, count] = meta.poses[pose];
    return start + (tick % count);
  }
  function render() {
    hg.clearRect(0, 0, hero.width, hero.height);
    drawFrame(hg, frameNow(), 0, 0, 6, worn(), { flip });
    sg.clearRect(0, 0, strip.width, strip.height);
    const list = worn();
    for (let f = 0; f < N; f++) drawFrame(sg, f, (f % perRow) * W, Math.floor(f / perRow) * H, 1, list);
  }
  setInterval(() => { tick++; render(); }, 1000 / (meta.fps || 6));

  // ---- wardrobe
  const wardrobe = document.getElementById("wardrobe");
  function changed() { store.set(outfit); buildWardrobe(); render(); }
  function choose(cat, id) {
    if (MULTI.has(cat)) {
      const set = new Set(outfit.wear[cat]);
      set.has(id) ? set.delete(id) : set.add(id);
      outfit.wear[cat] = [...set];
    } else outfit.wear[cat] = outfit.wear[cat] === id && SINGLE_OPTIONAL.has(cat) ? null : id;
    if (id && (!MULTI.has(cat) || outfit.wear[cat].includes(id))) Object.assign(outfit.colors, items[id].default);
    changed();
  }
  function thumb(id) {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const cat = items[id].cat, dressed = ["hat", "glasses", "beard", "extra"].includes(cat);
    const face = ["head", "face", "mouth"].filter(c => c !== cat).map(c => outfit.wear[c]).filter(Boolean);
    const list = ["body", ...(cat === "head" ? [] : face), ...(dressed ? [outfit.wear.top, outfit.wear.hair].filter(Boolean) : []), id];
    drawFrame(c.getContext("2d"), 0, 0, 0, 1, list, { prop: null });
    return c;
  }
  function propThumb(name) {
    const c = document.createElement("canvas"), p = meta.props[name];
    c.width = p.w; c.height = p.h;
    const g = c.getContext("2d");
    g.drawImage(propsImg, p.x, 0, p.w, p.h, 0, 0, p.w, p.h);
    c.style.cssText = `width:${p.w * 3}px;height:${p.h * 3}px`;
    return c;
  }
  function section(title, chips) {
    const box = document.createElement("div");
    box.className = "cat";
    box.innerHTML = `<h2>${title}</h2><div class="chips"></div>`;
    box.querySelector(".chips").append(...chips);
    return box;
  }
  function chip(on, label, title, art, onclick) {
    const b = document.createElement("button");
    b.className = "chip" + (on ? " on" : "");
    b.title = title;
    b.append(art, label);
    b.onclick = onclick;
    return b;
  }
  function buildWardrobe() {
    wardrobe.replaceChildren();
    for (const cat of ["head", "face", "mouth", "hair", "beard", "top", "bottom", "shoes", "glasses", "hat", "extra"]) {
      if (!byCat[cat]) continue;
      wardrobe.append(section(LABELS[cat], byCat[cat].map(id => chip(
        MULTI.has(cat) ? outfit.wear[cat].includes(id) : outfit.wear[cat] === id,
        id.split("/")[1].replace(/_/g, " "), id, thumb(id), () => choose(cat, id)))));
    }
    wardrobe.append(section(LABELS.prop, Object.keys(meta.props).map(name => chip(outfit.prop === name, name, name, propThumb(name),
      () => { outfit.prop = outfit.prop === name ? null : name; changed(); }))));
    const colors = document.createElement("div");
    colors.className = "cat";
    colors.innerHTML = "<h2>Couleurs</h2>";
    for (const [r, ramp] of Object.entries(meta.ramps)) {
      const line = document.createElement("div");
      line.className = "swatches";
      const label = document.createElement("span");
      label.textContent = RAMP_LABELS[r] || r;
      label.style.cssText = "width:110px;color:var(--muted)";
      line.append(label);
      for (const [name, tones] of Object.entries(ramp.variants)) {
        const b = document.createElement("button");
        b.title = name;
        b.style.background = `linear-gradient(135deg, ${tones[1]} 0 45%, ${tones[3]} 55%)`;
        if (outfit.colors[r] === name) b.className = "on";
        b.onclick = () => { outfit.colors[r] = name; changed(); };
        line.append(b);
      }
      colors.append(line);
    }
    wardrobe.append(colors);
  }

  // ---- tools
  const pick = a => a[Math.floor(Math.random() * a.length)];
  document.getElementById("flip").onclick = e => { flip = !flip; e.currentTarget.classList.toggle("on", flip); render(); };
  const bgs = ["", "dark", "check"];
  document.getElementById("bg").onclick = () => { hero.className = bgs[(bgs.indexOf(hero.className) + 1) % bgs.length]; };
  document.getElementById("reset").onclick = () => { outfit = defaults(); changed(); };
  document.getElementById("rand").onclick = () => {
    for (const cat of ["head", "face", "mouth", "top", "bottom", "shoes", "hair"]) if (byCat[cat]) outfit.wear[cat] = pick(byCat[cat]);
    for (const cat of ["beard", "glasses", "hat"]) outfit.wear[cat] = Math.random() < 0.3 && byCat[cat] ? pick(byCat[cat]) : null;
    outfit.wear.extra = (byCat.extra || []).filter(() => Math.random() < 0.15);
    for (const [r, ramp] of Object.entries(meta.ramps)) outfit.colors[r] = pick(Object.keys(ramp.variants));
    changed();
  };
  document.getElementById("copy").onclick = async e => {
    const b = e.currentTarget, text = JSON.stringify(outfit);
    try { await navigator.clipboard.writeText(text); b.textContent = "✓ COPIÉ"; }
    catch { prompt("Tenue :", text); }
    setTimeout(() => { b.textContent = "📋 COPIER"; }, 1500);
  };

  buildWardrobe();
  render();
}

main().catch(err => {
  document.querySelector("main").innerHTML =
    `<p class="hint">Atlas introuvable : lance <code>python3 -I app/sprites/tools/build_sprites.py</code> (${err.message}).</p>`;
});
