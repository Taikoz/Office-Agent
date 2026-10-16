// ChiefOS → 🌦️ Météo: the season, real weather on or off (Open-Meteo, seasons.js), the city.

import { esc } from "../core/data.js";
import { OsApp } from "./base.js";
import { renderChiefOs } from "../ui/chiefos.js";
import { WEATHER_FR, codeWeather, meteo, seasonLabel, setCity, toggleMeteo } from "../world/seasons.js";

function meteoAppHtml() {
  const w = meteo.on && codeWeather(meteo.code);
  return `<div class="rstats"><div>saison<b>${seasonLabel()}</b></div><div>fenêtres<b>${meteo.on ? `météo réelle` : "météo des tests"}</b></div>${w ? `<div>${esc(meteo.city)}<b>${WEATHER_FR[w]} · ${Math.round(meteo.temp)} °C</b></div>` : ""}</div>
    <div class="osrow"><b>Météo réelle</b><span class="muted">Open-Meteo, sans clé ; seules les coordonnées de la ville sont envoyées, toutes les 15 min.</span><button data-meteo="toggle">${meteo.on ? "Désactiver" : "Activer"}</button></div>
    <div class="osrow"><b>Ville</b><span><input id="meteo-city" value="${esc(meteo.city)}" aria-label="Ville"></span><button data-meteo="city">Changer</button></div>`;
}

class MeteoApp extends OsApp {
  constructor() { super("meteo", "🌦️", "Météo", "#3fa9f5"); }
  render() { return meteoAppHtml(); }
  click(b) {
    if (!b.dataset.meteo) return false;
    if (b.dataset.meteo === "toggle") toggleMeteo();
    else setCity(document.getElementById("meteo-city").value.trim() || "Paris");
    setTimeout(renderChiefOs, 600);
    return true;
  }
}
new MeteoApp();
