// SVG of the HTML interface (not drawn on the canvas).

import { ART, SvgArt } from "./base.js";

// the clock of the bottom bar (hud.js): the sun crosses the dial from 7 h to 20 h, the moon the rest of the time,
// the sky follows the hour. Inner SVG of the #clock-dial element: ART.dial.body(date)
class ClockDialArt extends SvgArt {
  constructor() { super("dial", 64, 34, { outline: false, pad: 0 }); }
  body(d) {
    const h = d.getHours() + d.getMinutes() / 60, day = h >= 7 && h < 20;
    const k = day ? (h - 7) / 13 : ((h + 24 - 20) % 24) / 11, a = Math.PI * (1 - k), x = 32 + Math.cos(a) * 24, y = 30 - Math.sin(a) * 22;
    const sky = h < 6 || h >= 21 ? ["#1d1b33", "#2f2a4d"] : h < 8 ? ["#f39c6b", "#ffd59e"] : h < 18 ? ["#6cb6e8", "#bfe3f7"] : h < 21 ? ["#e8835b", "#7a4f8f"] : ["#1d1b33", "#2f2a4d"];
    const stars = day ? "" : [[10, 8], [22, 4], [44, 6], [54, 12], [16, 16]].map(([sx, sy], i) => `<circle cx="${sx}" cy="${sy}" r=".9" fill="#fff" opacity="${0.4 + (i % 3) * 0.25}"/>`).join("");
    const body = day
      ? `<circle cx="${x}" cy="${y}" r="6.5" fill="#ffd43b" opacity=".35"/><circle cx="${x}" cy="${y}" r="4.6" fill="#ffd43b"/><circle cx="${x - 1.4}" cy="${y - 1.4}" r="1.5" fill="#fff7c2"/>`
      : `<circle cx="${x}" cy="${y}" r="4.4" fill="#f4f1e6"/><circle cx="${x + 2}" cy="${y - 1.2}" r="3.8" fill="${sky[0]}"/>`;
    return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
      <clipPath id="dome"><path d="M2 32A30 30 0 0 1 62 32Z"/></clipPath></defs>
      <path d="M2 32A30 30 0 0 1 62 32Z" fill="url(#sky)"/><g clip-path="url(#dome)">${stars}${body}</g>
      <path d="M8 30A24 22 0 0 1 56 30" fill="none" stroke="#fff" stroke-opacity=".25" stroke-dasharray="1.5 2"/>
      <rect x="0" y="30" width="64" height="4" rx="2" fill="#4a7a3a"/>`;
  }
}
ART.dial = new ClockDialArt();
