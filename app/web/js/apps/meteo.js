// ChiefOS → 🌦️ Météo: the real weather of a city (Open-Meteo through seasons.js, opt-in, no key; only the city's
// coordinates leave this machine). A hero card tinted by the sky and the hour (big temperature, condition, feels like,
// high and low), the next 24 hours, the next 7 days with their range bar, a few tiles (humidity, wind, UV, sun, rain),
// then the settings: the city (search) and the switch. Off: what the office windows show instead (the tests' weather).

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { meteo, refreshMeteo, seasonLabel, setCity, toggleMeteo } from "../world/seasons.js";

// WMO weather codes → a French label and the kind of sky
const LABEL = { 0: "Ciel dégagé", 1: "Plutôt dégagé", 2: "Partiellement nuageux", 3: "Couvert", 45: "Brouillard", 48: "Brouillard givrant",
  51: "Bruine légère", 53: "Bruine", 55: "Bruine dense", 56: "Bruine verglaçante", 57: "Bruine verglaçante", 61: "Pluie faible", 63: "Pluie", 65: "Forte pluie",
  66: "Pluie verglaçante", 67: "Pluie verglaçante", 71: "Neige faible", 73: "Neige", 75: "Forte neige", 77: "Grains de neige", 80: "Averses", 81: "Averses", 82: "Fortes averses",
  85: "Averses de neige", 86: "Averses de neige", 95: "Orage", 96: "Orage et grêle", 99: "Orage et grêle" };
const kindOf = c => c == null ? "cloud" : c >= 95 ? "storm" : (c >= 71 && c <= 77) || c === 85 || c === 86 ? "snow" : c >= 51 ? "rain" : c >= 45 ? "fog" : c === 3 ? "cloud" : c >= 1 ? "partly" : "clear";

// the icons: one stroke style for every sky, coloured by CSS (.wxi-*)
const SUN = `<circle cx="12" cy="12" r="4.2" class="wxi-sun"/><g class="wxi-ray">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="12" y1="2.6" x2="12" y2="4.6" transform="rotate(${a} 12 12)"/>`).join("")}</g>`;
const MOON = `<path class="wxi-moon" d="M15.5 3.5a8 8 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z"/>`;
const CLOUD = (x = 0, y = 0) => `<path class="wxi-cloud" transform="translate(${x} ${y})" d="M7 19h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 11.5 3.75 3.75 0 0 0 7 19z"/>`;
function icon(kind, night = false, size = 24) {
  const body = {
    clear: night ? MOON : SUN,
    partly: `<g transform="translate(-3 -3) scale(.8)">${night ? MOON : SUN}</g>${CLOUD(2, 2)}`,
    cloud: CLOUD(0, -1),
    fog: `${CLOUD(0, -3)}<g class="wxi-fog"><line x1="5" y1="20" x2="19" y2="20"/><line x1="7" y1="23" x2="17" y2="23"/></g>`,
    rain: `${CLOUD(0, -3)}<g class="wxi-rain"><line x1="9" y1="18.5" x2="8" y2="22"/><line x1="13" y1="18.5" x2="12" y2="22"/><line x1="17" y1="18.5" x2="16" y2="22"/></g>`,
    snow: `${CLOUD(0, -3)}<g class="wxi-snow"><circle cx="9" cy="20" r="1"/><circle cx="13" cy="22" r="1"/><circle cx="16.5" cy="19.5" r="1"/></g>`,
    storm: `${CLOUD(0, -3)}<path class="wxi-bolt" d="M13 15.5l-3 4.5h3l-1.5 4 4.5-6h-3l1.5-2.5z"/>`,
  }[kind];
  return `<svg class="wxi" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

const deg = v => v == null ? "—" : `${Math.round(v)}°`;
const hour = iso => iso ? iso.slice(11, 16) : "";
const dayName = (iso, i) => i === 0 ? "Aujourd'hui" : new Date(`${iso}T12:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }).replace(".", "");
const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const uvLevel = u => u == null ? "" : u < 3 ? "faible" : u < 6 ? "modéré" : u < 8 ? "élevé" : u < 11 ? "très élevé" : "extrême";
const since = at => { const m = Math.round((Date.now() - at) / 60000); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`; };

// the demo (?demo=1): a plausible autumn day, so the screen is never empty
function demoForecast() {
  const base = new Date(); base.setMinutes(0, 0, 0);
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const temps = [14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 10, 11, 12, 13, 14, 15, 16, 16, 17, 16, 15, 14, 13, 13];
  return { now: { code: 2, temp: 14.2, feels: 12.6, humidity: 71, wind: 14, windDir: 225, day: true, rain: 0 },
    hours: temps.map((t, i) => { const d = new Date(base.getTime() + i * 3600e3); return { t: iso(d), temp: t, code: [2, 2, 3, 3, 61, 61, 3, 2, 1, 0][i % 10], pop: [10, 10, 20, 40, 70, 60, 30, 10, 0, 0][i % 10], day: d.getHours() > 7 && d.getHours() < 19 }; }),
    days: [[2, 17, 9, 30], [61, 15, 10, 80], [3, 14, 8, 40], [1, 16, 7, 10], [0, 18, 8, 0], [80, 13, 9, 70], [2, 15, 8, 20]].map(([code, max, min, pop], i) => {
      const d = new Date(base.getTime() + i * 86400e3); return { t: iso(d).slice(0, 10), code, max, min, pop, uv: 3 - i % 3, sunrise: `${iso(d).slice(0, 10)}T07:52`, sunset: `${iso(d).slice(0, 10)}T18:21` }; }) };
}

let draft = null, busy = false, msg = "";
function heroHtml(fc) {
  const n = fc.now, today = fc.days[0] || {}, k = kindOf(n.code);
  return `<section class="wxhero wx-${k}${n.day ? "" : " wx-night"}" aria-label="Temps actuel à ${esc(meteo.city)}">
    <div class="wxwhere"><b>${esc(meteo.city)}</b>${meteo.country ? `<span>${esc(meteo.country)}</span>` : ""}</div>
    <div class="wxnow">${icon(k, !n.day, 72)}<span class="wxtemp">${deg(n.temp)}</span></div>
    <div class="wxcond">${esc(LABEL[n.code] || "—")}</div>
    <div class="wxsub">Ressenti ${deg(n.feels)} · Max ${deg(today.max)} · Min ${deg(today.min)}</div>
    <div class="wxfoot"><span>${DEMO ? "Démo" : `Mis à jour ${since(meteo.at)}`}</span><button class="wxghost" data-meteo="refresh"${busy ? " disabled" : ""}>${busy ? "…" : "↻ Actualiser"}</button></div>
  </section>`;
}
function hoursHtml(fc) {
  return `<section class="wxcard"><h4>PROCHAINES 24 HEURES</h4><div class="wxhours" role="list">${fc.hours.map((h, i) => `<div class="wxhour" role="listitem">
    <small>${i === 0 ? "Maint." : hour(h.t)}</small>${icon(kindOf(h.code), !h.day, 26)}<b>${deg(h.temp)}</b><span class="wxpop">${h.pop >= 20 ? `${h.pop} %` : ""}</span></div>`).join("")}</div></section>`;
}
function daysHtml(fc) {
  const lo = Math.min(...fc.days.map(d => d.min)), hi = Math.max(...fc.days.map(d => d.max)), span = Math.max(1, hi - lo);
  return `<section class="wxcard"><h4>7 JOURS</h4>${fc.days.map((d, i) => `<div class="wxday"><span class="wxdn">${esc(dayName(d.t, i))}</span>
    <span class="wxdi">${icon(kindOf(d.code), false, 24)}<small class="wxpop">${d.pop >= 20 ? `${d.pop} %` : ""}</small></span>
    <span class="wxmin">${deg(d.min)}</span><span class="wxrange"><i style="left:${((d.min - lo) / span) * 100}%;right:${100 - ((d.max - lo) / span) * 100}%"></i></span><span class="wxmax">${deg(d.max)}</span></div>`).join("")}</section>`;
}
function tilesHtml(fc) {
  const n = fc.now, t = fc.days[0] || {};
  const tile = (label, value, sub = "", extra = "") => `<div class="wxtile"><small>${label}</small><b>${value}</b>${extra}<span>${sub}</span></div>`;
  const arrow = n.windDir == null ? "" : `<svg class="wxwind" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style="transform:rotate(${n.windDir + 180}deg)"><path d="M12 3l5 14-5-3-5 3z"/></svg>`;
  return `<section class="wxtiles">
    ${tile("Ressenti", deg(n.feels), n.feels != null && n.temp != null ? (n.feels < n.temp - 1 ? "le vent rafraîchit" : n.feels > n.temp + 1 ? "l'humidité réchauffe" : "comme la température") : "")}
    ${tile("Humidité", n.humidity == null ? "—" : `${n.humidity} %`, n.humidity >= 80 ? "air très humide" : n.humidity <= 35 ? "air sec" : "")}
    ${tile("Vent", n.wind == null ? "—" : `${Math.round(n.wind)} km/h`, n.windDir == null ? "" : `de ${COMPASS[Math.round(n.windDir / 45) % 8]}`, arrow)}
    ${tile("Indice UV", t.uv == null ? "—" : Math.round(t.uv), uvLevel(t.uv))}
    ${tile("Soleil", `${hour(t.sunrise)} → ${hour(t.sunset)}`, "lever et coucher")}
    ${tile("Pluie", t.pop == null ? "—" : `${t.pop} %`, n.rain ? `${n.rain} mm en ce moment` : "probabilité aujourd'hui")}
  </section>`;
}
function settingsHtml() {
  return `<section class="wxcard wxset"><h4>RÉGLAGES</h4>
    <div class="wxrow"><span><b>Météo réelle</b><small>Les fenêtres du bureau montrent le vrai temps de la ville. Open-Meteo, sans compte ; seules les coordonnées de la ville sont envoyées, toutes les 15 min.</small></span>
      <button class="wxswitch${meteo.on ? " on" : ""}" role="switch" aria-checked="${meteo.on}" data-meteo="toggle" aria-label="Météo réelle"><i></i></button></div>
    <div class="wxrow"><span><b>Ville</b><small>${esc(meteo.city)}${meteo.country ? `, ${esc(meteo.country)}` : ""}</small></span>
      <span class="wxcity"><input id="meteo-city" value="${esc(draft ?? "")}" placeholder="Rechercher une ville…" aria-label="Ville" autocomplete="off"><button data-meteo="city"${busy ? " disabled" : ""}>Changer</button></span></div>
    ${msg ? `<p class="muted" role="status">${esc(msg)}</p>` : ""}
    <div class="wxrow"><span><b>Saison au bureau</b><small>La terrasse suit la saison.</small></span><span class="wxseason">${seasonLabel()}</span></div></section>`;
}
function meteoAppHtml() {
  const fc = DEMO ? demoForecast() : meteo.fc;
  if (!meteo.on && !DEMO) {
    return `<div class="wx"><section class="wxhero wx-off"><div class="wxnow">${icon("partly", false, 64)}</div>
      <div class="wxcond">La météo réelle est désactivée</div><div class="wxsub">Les fenêtres du bureau montrent la météo des tests du jour : soleil quand ils passent, orage quand ils cassent.</div>
      <div class="wxfoot"><span></span><button class="wxcta" data-meteo="toggle">Activer pour ${esc(meteo.city)}</button></div></section>${settingsHtml()}</div>`;
  }
  if (!fc) {
    if (!busy && !meteo.error) { busy = true; refreshMeteo().finally(() => { busy = false; renderChiefOs(); }); }
    return `<div class="wx">${meteo.error ? `<div class="oserror" role="alert"><b>Prévisions indisponibles</b><span>${esc(meteo.error)}</span><div class="osacts"><button data-meteo="refresh">↻ Réessayer</button></div></div>`
      : `<p class="muted osloading" role="status">Lecture des prévisions de ${esc(meteo.city)}…</p>`}${settingsHtml()}</div>`;
  }
  return `<div class="wx"><div class="wxtop">${heroHtml(fc)}${tilesHtml(fc)}</div>${hoursHtml(fc)}${daysHtml(fc)}${settingsHtml()}</div>`;
}

async function run(fn) { busy = true; msg = ""; renderChiefOs(); try { await fn(); } finally { busy = false; renderChiefOs(); } }
class MeteoApp extends OsApp {
  constructor() { super("meteo", "🌦️", "Météo", "#3fa9f5"); }
  render() { return meteoAppHtml(); }
  click(b) {
    const act = b.dataset.meteo; if (!act) return false;
    if (act === "toggle") { toggleMeteo(); run(() => new Promise(r => setTimeout(r, 900))); }
    else if (act === "refresh") { meteo.error = ""; run(refreshMeteo); }
    else if (act === "city") {
      const name = document.getElementById("meteo-city")?.value.trim();
      if (!name) { msg = "Tape le nom d'une ville."; return renderChiefOs() || true; }
      draft = null; run(() => setCity(name));
    }
    return true;
  }
  input(ev) { if (ev.target.id === "meteo-city") draft = ev.target.value; }
}
new MeteoApp();
OsApp.listen("meteo", "keydown", ev => { if (ev.key === "Enter" && ev.target.id === "meteo-city") ev.target.closest(".wxcity")?.querySelector("button")?.click(); });
