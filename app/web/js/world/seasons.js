// Seasons and real weather. The terrace follows the season (snow in winter, blossoms in spring, barbecue smoke in
// summer, falling leaves in autumn). Real weather is opt-in (☰ MENU → MÉTÉO RÉELLE, city in ChiefOS → Météo):
// it asks Open-Meteo (no key; only the city's coordinates are sent) every 15 minutes, and the windows show it
// instead of the weather of today's tests.

import { hub, provide } from "../hub.js";
import { H, W, px } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { toast } from "../sims/progress.js";
import { weather } from "../agents/events2.js";
import { focusMode } from "../ui/ux.js";
import { clockNow } from "../sims/days.js";

const seasonNow = (d = clockNow()) => ["hiver", "hiver", "printemps", "printemps", "printemps", "été", "été", "été", "automne", "automne", "automne", "hiver"][d.getMonth()];
export let meteo = new SaveSlot("office-meteo", { on: false, city: "Paris", lat: 48.8566, lon: 2.3522, code: null, temp: null, at: 0 }).data;
const saveMeteo = () => SaveSlot.get("office-meteo").save(meteo);
// Open-Meteo weather codes → the sky of the windows (art.js drawSky)
export function codeWeather(c) {
  if (c == null) return null;
  if (c >= 95) return "storm";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
  if (c >= 51) return "rain";
  if (c >= 3) return "cloud";
  return c >= 1 ? "sun" : "clear";
}
export const WEATHER_FR = { clear: "☀️ dégagé", sun: "🌤️ éclaircies", cloud: "☁️ nuageux", rain: "🌧️ pluie", storm: "⛈️ orage", snow: "❄️ neige" };
async function fetchMeteo(force = false) {
  if (!meteo.on || DEMO || (!force && Date.now() - meteo.at < 15 * 60000)) return;
  try {
    const r = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${meteo.lat}&longitude=${meteo.lon}&current=weather_code,temperature_2m`)).json();
    meteo.code = r.current?.weather_code ?? null; meteo.temp = r.current?.temperature_2m ?? null; meteo.at = Date.now(); saveMeteo();
  } catch (_) { /* offline: the tests' weather stays */ }
}
export async function setCity(name) {
  try {
    const r = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=fr`)).json();
    const g = r.results?.[0]; if (!g) return toast("MÉTÉO", "Ville introuvable", name);
    Object.assign(meteo, { city: g.name, lat: g.latitude, lon: g.longitude, at: 0 }); saveMeteo(); await fetchMeteo(true);
    toast("MÉTÉO", `Météo de ${g.name}`, meteo.code != null ? `${WEATHER_FR[codeWeather(meteo.code)]} · ${Math.round(meteo.temp)} °C` : "");
  } catch (_) { toast("MÉTÉO", "Service injoignable", "Réessaie plus tard."); }
}
const testsWeather = weather;  // events2.js: the weather of today's tests
hub.weather = function () { const w = meteo.on && codeWeather(meteo.code); return w || testsWeather(); };
export function toggleMeteo(on = !meteo.on) {
  meteo.on = on; saveMeteo(); renderMeteoBtn();
  if (on) { fetchMeteo(true); toast("MÉTÉO RÉELLE", `Activée : ${meteo.city}`, "Les fenêtres montrent le vrai temps (Open-Meteo, coordonnées de la ville seulement). Ville : ChiefOS → Météo."); }
}
function renderMeteoBtn() { const b = document.getElementById("meteobtn"); b.innerHTML = `🌦️<span class="lbl"> MÉTÉO RÉELLE : ${meteo.on ? "ON" : "OFF"}</span>`; b.classList.toggle("on", meteo.on); }
document.getElementById("meteobtn").onclick = () => toggleMeteo();
renderMeteoBtn(); fetchMeteo(); setInterval(fetchMeteo, 60000);
// the temperature next to the hour (hud.js clock)
setInterval(() => { const el = document.getElementById("clock-temp"); if (el) el.textContent = meteo.on && meteo.temp != null ? `${WEATHER_FR[codeWeather(meteo.code)].split(" ")[0]} ${Math.round(meteo.temp)}°` : ""; }, 5000);

/* ---------- the season on the terrace ---------- */
function drawSeasonTerrace(t) {
  const s = seasonNow(), still = focusMode;
  if (s === "hiver") {
    for (let x = 0; x < W; x += 3) px(x, 72 + Math.sin(x / 9) * 0.8, 3, 2.2, "#f4f6fb");  // snow on the deck's edge
    for (let i = 0; i < 40; i++) { const x = (i * 37 + (still ? 0 : t / (60 + i % 5 * 10))) % W, y = (i * 23 + (still ? 0 : t / 40)) % H; px(x, y, 1.2, 1.2, "#ffffff"); }
  } else if (s === "automne") {
    for (let i = 0; i < 14; i++) { const x = (i * 53 + (still ? 0 : t / 70)) % W, y = (i * 31 + (still ? 0 : t / 55)) % H; px(x + Math.sin(t / 400 + i) * 3, y, 2, 1.4, ["#e07a2f", "#c45a1f", "#d9a03a"][i % 3]); }
  } else if (s === "printemps") {
    for (const [x, y] of [[18, 192], [366, 192], [150, 84], [250, 84]]) for (let k = 0; k < 5; k++) px(x + k * 3, y - 2 - (k % 2) * 2, 2, 2, ["#ff9ec7", "#fff3b0", "#ffffff"][k % 3]);
  } else if (!still) for (let i = 0; i < 4; i++) px(334 + i * 5, 88 - ((t / 50 + i * 11) % 16), 2.4, 2.4, "rgba(230,230,235,.45)");  // summer: the barbecue is always on
}
export function seasonLabel() { return { hiver: "❄️ Hiver", printemps: "🌸 Printemps", "été": "☀️ Été", automne: "🍂 Automne" }[seasonNow()]; }

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get drawSeasonTerrace() { return drawSeasonTerrace; } });
