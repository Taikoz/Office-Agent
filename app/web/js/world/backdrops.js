// What is seen around a themed room in isometric view, behind its shell (iso/engine.js shell), instead of the plain
// night blue: a castle by a lake under the stars for the wizard school, deep space for the station, a moonlit
// graveyard for the manor, the open sea for the ship, Mount Fuji for the Japanese house, a tropical beach for the beach
// club. The room's theme: its walls, else its floor, else its door, else most of its themed furniture (3 or more).
// The landscape follows the real hour (svg/sky.js skyPhase); its still part is painted once per theme, hour and scale,
// what moves (stars, waves, petals, bats, gulls) is drawn each frame, and stands still in focus mode.

import { hub, provide } from "../hub.js";
import { H, S, W } from "../core/core.js";
import { SKY, skyPhase } from "../svg/sky.js";
import { THEME_DOORS, THEME_FLOORS, THEME_WALLS } from "./decor.js";

const rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function roomTheme(room) {
  const d = hub.decor?.[room]; if (!d) return null;
  for (const [list, k] of [[THEME_WALLS, "wall"], [THEME_FLOORS, "floor"], [THEME_DOORS, "door"]]) { const f = list.find(x => x[0] === d[k]); if (f) return f[2]; }
  const n = {};
  for (const it of hub.itemsIn?.(room) || []) { const th = hub.defOf(it.type)?.theme; if (th) n[th] = (n[th] || 0) + 1; }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 3 ? best[0] : null;
}

/* ---------- drawing helpers (scene units) ---------- */
function sky(g, stops, y1 = H) {
  const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, stops[0]); gr.addColorStop(0.55, stops[1]); gr.addColorStop(1, stops[2]);
  g.fillStyle = gr; g.fillRect(0, 0, W, y1);
}
function band(g, y0, y1, c0, c1) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); }
function disc(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function glow(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore();
}
function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
// a line of hills or mountains from left to right around y, filled down to the bottom
function ridge(g, y, amp, seed, col, step = 14) {
  g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W + step; x += step) g.lineTo(x, y - amp * (0.5 * Math.sin(x / 47 + seed) + 0.35 * Math.sin(x / 19 + seed * 3) + 0.3 * rnd(x + seed)));
  g.lineTo(W, H); g.closePath(); g.fill();
}
function cloud(g, x, y, s, col, a = 1) {
  g.save(); g.globalAlpha = a; g.fillStyle = col; g.beginPath();
  for (const [dx, dy, r] of [[0, 0, 6], [7, -3, 7], [15, 0, 6], [8, 2, 6], [-6, 2, 4], [21, 2, 4]]) { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); }
  g.fill(); g.restore();
}
function stars(g, n, yMax, seed, t, still, big = 0.5) {
  for (let i = 0; i < n; i++) {
    const x = rnd(i + seed) * W, y = rnd(i * 3.1 + seed) * yMax, tw = still ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin(t / (700 + rnd(i) * 900) + i));
    g.globalAlpha = tw * (0.5 + rnd(i * 7) * 0.5); g.fillStyle = "#fff8e8";
    const r = rnd(i * 5.3) < 0.12 ? big * 1.6 : big * 0.7; g.fillRect(x - r / 2, y - r / 2, r, r);
  }
  g.globalAlpha = 1;
}
function moon(g, x, y, r, col = "#f4f0d8") { glow(g, x, y, r * 3.2, col, 0.35); disc(g, x, y, r, col); g.globalAlpha = 0.12; disc(g, x - r * 0.3, y - r * 0.2, r * 0.25, "#6a6a70"); disc(g, x + r * 0.35, y + r * 0.3, r * 0.18, "#6a6a70"); g.globalAlpha = 1; }
function sun(g, x, y, r, col = "#fff2b0") { glow(g, x, y, r * 4, col, 0.45); disc(g, x, y, r, col); }
// the sun or the moon's height with the hour
const sunY = (h, top, bottom) => { const k = Math.max(0, Math.min(1, (h - 6) / 12)); return bottom - (bottom - top) * Math.sin(Math.PI * k); };
function gull(g, x, y, s, flap, col) {
  g.strokeStyle = col; g.lineWidth = 0.6; g.beginPath(); const f = flap ? 1.2 : -0.4;
  g.moveTo(x - 3 * s, y - f * s); g.quadraticCurveTo(x - 1.5 * s, y - 1.6 * s, x, y); g.quadraticCurveTo(x + 1.5 * s, y - 1.6 * s, x + 3 * s, y - f * s); g.stroke();
}
function bat(g, x, y, s, flap) {
  const u = flap ? -2 : 1.2; poly(g, [[x, y], [x - 2 * s, y + u * s], [x - 4.5 * s, y - 0.5 * s], [x - 2.5 * s, y + 0.5 * s], [x - 1 * s, y + 1.5 * s], [x, y + 0.8 * s], [x + 1 * s, y + 1.5 * s], [x + 2.5 * s, y + 0.5 * s], [x + 4.5 * s, y - 0.5 * s], [x + 2 * s, y + u * s]], "#0a0a10");
}
function palm(g, x, y, h, lean, col = "#1e3a1e", trunk = "#5a3a1e") {
  g.strokeStyle = trunk; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.4, y - h * 0.6, x + lean, y - h); g.stroke();
  const tx = x + lean, ty = y - h; g.fillStyle = col;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55, L = h * (0.22 + (i % 2) * 0.05), ex = tx + Math.cos(a) * L * 1.2, ey = ty + Math.sin(a) * L * 0.5 + L * 0.45;
    g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * L * 0.6, ty + Math.sin(a) * L - 3, ex, ey); g.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.6, tx, ty + 1.5); g.fill();
  }
  disc(g, tx, ty + 1, 1.6, "#3a2a14");
}
function deadTree(g, x, y, len, ang, depth, w) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  if (depth <= 0) return;
  deadTree(g, ex, ey, len * 0.72, ang - 0.45 - rnd(x + depth) * 0.3, depth - 1, w * 0.65);
  deadTree(g, ex, ey, len * 0.68, ang + 0.4 + rnd(y + depth) * 0.35, depth - 1, w * 0.65);
}

/* ---------- the themes: sky by hour, a still part, what moves ---------- */
const BACKDROPS = {
  // the wizard school: the castle across a lake, mountains, pines, the moon; stars, sparkles, a broom flying by
  magie: {
    sky: { night: ["#07071f", "#1c1240", "#3a2260"], dawn: ["#2a2a5a", "#9a5a8a", "#f0b080"], day: ["#3a5aa0", "#7a9ad0", "#e0d0a8"], dusk: ["#140e36", "#5a2464", "#d0784e"] },
    still(g, ph, h, dark) {
      if (dark) moon(g, 62, 34, 11); else sun(g, 70, sunY(h, 24, 90), 9, "#fff0c0");
      ridge(g, 112, 26, 1.3, dark ? "#221a46" : "#6a72a0", 10);
      this.castle(g, 322, 132, dark ? "#120e26" : "#3a3a58", dark);
      ridge(g, 148, 14, 4.1, dark ? "#141030" : "#4a5872", 12);
      band(g, 168, H, dark ? "#1a1640" : "#6a8ac0", dark ? "#070616" : "#2a3a6a");
      if (dark) { g.globalAlpha = 0.25; g.fillStyle = "#f4f0d8"; for (let y = 170; y < 226; y += 3) g.fillRect(56 + Math.sin(y) * 3, y, 12 - (y - 170) / 8, 0.8); g.globalAlpha = 1; }
      for (let i = 0; i < 26; i++) { const x = i * 16 + rnd(i) * 8, y = 172 + rnd(i * 2) * 4, s = 10 + rnd(i * 3) * 8; poly(g, [[x, y - s], [x - s * 0.35, y], [x + s * 0.35, y]], dark ? "#0a0a1a" : "#1e3a2e"); }
    },
    castle(g, x, yb, col, lit) {
      const towers = [[-8, 10, 46], [6, 14, 30], [22, 9, 58], [34, 16, 36], [52, 10, 50], [64, 12, 26]];
      g.fillStyle = col; g.fillRect(x - 6, yb - 24, 84, 24);
      for (const [dx, w, h] of towers) {
        g.fillStyle = col; g.fillRect(x + dx, yb - h, w, h);
        poly(g, [[x + dx - 1.5, yb - h], [x + dx + w / 2, yb - h - w * 1.6], [x + dx + w + 1.5, yb - h]], col);
        if (lit) for (let k = 0; k < 3; k++) if (rnd(dx * 7 + k) > 0.35) { g.fillStyle = "#ffd36a"; g.fillRect(x + dx + w / 2 - 0.8, yb - h + 5 + k * 8, 1.6, 2.6); }
      }
      g.strokeStyle = col; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 26.5, yb - 58 - 14); g.lineTo(x + 26.5, yb - 58 - 20); g.stroke();
      poly(g, [[x + 26.5, yb - 78], [x + 32, yb - 76.5], [x + 26.5, yb - 75]], "#c0303a");
    },
    move(g, t, ph, dark, still) {
      if (dark || ph === "dusk") stars(g, 80, 100, 3, t, still);
      if (still) return;
      for (let i = 0; i < 14; i++) { const k = ((t / 6000) + rnd(i)) % 1, x = rnd(i * 9) * W + Math.sin(t / 900 + i) * 4, y = 200 - k * 150; g.globalAlpha = Math.sin(Math.PI * k) * 0.7; disc(g, x, y, 0.6, "#ffe08a"); }
      g.globalAlpha = 1;
      const c = (t / 1000) % 40; if (c < 9) {  // a wizard on a broom crossing the sky
        const x = -20 + c / 9 * (W + 40), y = 48 + Math.sin(c * 2) * 6; g.strokeStyle = "#1a1020"; g.lineWidth = 0.9;
        g.beginPath(); g.moveTo(x - 7, y + 2); g.lineTo(x + 6, y - 1); g.stroke(); poly(g, [[x - 7, y + 2], [x - 11, y], [x - 11, y + 5]], "#5a3a1a");
        poly(g, [[x - 1, y], [x + 2, y], [x + 0.5, y - 6]], "#1a1020"); disc(g, x + 0.5, y - 2, 1, "#1a1020");
      }
    },
  },
  // the space station: deep space, nebulae, a ringed planet and a moon; stars drifting by, a comet, a blinking satellite
  scifi: {
    sky: { night: ["#020309", "#070a1e", "#120a28"], dawn: ["#020309", "#080a22", "#160c2c"], day: ["#03040c", "#0a0c26", "#180c2e"], dusk: ["#020309", "#080a20", "#1a0a2a"] },
    still(g) {
      glow(g, 90, 60, 110, "#c040ff", 0.4); glow(g, 300, 150, 130, "#20c0ff", 0.34); glow(g, 220, 40, 70, "#ff4080", 0.22);
      for (let i = 0; i < 220; i++) { g.globalAlpha = 0.25 + rnd(i * 4) * 0.4; g.fillStyle = "#cfe0ff"; g.fillRect(rnd(i + 50) * W, rnd(i * 2.7 + 50) * H, 0.45, 0.45); }
      g.globalAlpha = 1;
      const px = 46, py = 196, r = 62;  // the ringed planet
      g.save(); g.translate(px, py); g.rotate(-0.35);
      g.strokeStyle = "rgba(230,200,150,.35)"; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, r * 1.7, r * 0.34, 0, Math.PI, Math.PI * 2); g.stroke();
      g.restore();
      const pg = g.createLinearGradient(px - r, py - r, px + r, py + r); pg.addColorStop(0, "#e8a86a"); pg.addColorStop(0.5, "#a0583a"); pg.addColorStop(1, "#2a1020");
      disc(g, px, py, r, pg); g.save(); g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.clip(); g.globalAlpha = 0.18;
      for (let k = -4; k < 5; k++) { g.fillStyle = k % 2 ? "#fff0d0" : "#5a2a1a"; g.fillRect(px - r, py + k * 12 - 3, 2 * r, 5); }
      g.restore();
      g.save(); g.translate(px, py); g.rotate(-0.35); g.strokeStyle = "rgba(240,210,160,.55)"; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, r * 1.7, r * 0.34, 0, 0, Math.PI); g.stroke(); g.restore();
      disc(g, 340, 44, 11, "#9aa6b8"); disc(g, 344, 41, 11, "rgba(2,3,9,.55)");
      g.globalAlpha = 0.3; disc(g, 336, 47, 2, "#5a6478"); disc(g, 339, 40, 1.4, "#5a6478"); g.globalAlpha = 1;
    },
    move(g, t, ph, dark, still) {
      for (let i = 0; i < 60; i++) {  // nearer stars drift by
        const sp = 2 + rnd(i * 3) * 6, x = ((rnd(i) * W - (still ? 0 : t / 1000 * sp)) % W + W) % W, y = rnd(i * 1.7 + 9) * H;
        g.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t / 600 + i)); g.fillStyle = i % 9 ? "#ffffff" : "#8fe8ff"; g.fillRect(x, y, 0.9, 0.9);
        if (sp > 6.5 && !still) { g.globalAlpha *= 0.3; g.fillRect(x, y + 0.3, 3, 0.3); }
      }
      g.globalAlpha = 1;
      if (still) return;
      const c = (t / 1000) % 22; if (c < 2.2) { const k = c / 2.2, x = W + 20 - k * 260, y = 20 + k * 70; g.strokeStyle = "rgba(160,240,255,.7)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y - 5); g.stroke(); disc(g, x, y, 1, "#e8ffff"); }
      const sx = 250 + Math.sin(t / 9000) * 40, sy = 26 + Math.cos(t / 9000) * 8;  // a satellite
      g.fillStyle = "#8a96a8"; g.fillRect(sx - 1, sy - 1, 2, 2); g.fillStyle = "#2a5aa0"; g.fillRect(sx - 5, sy - 0.6, 3.5, 1.2); g.fillRect(sx + 1.5, sy - 0.6, 3.5, 1.2);
      if (Math.floor(t / 500) % 3 === 0) disc(g, sx, sy - 1.6, 0.6, "#ff4040");
    },
  },
  // the haunted manor: a big moon over the hills, a chapel with one lit window, dead trees, the graveyard and its
  // fence; fog drifting, bats, a flash of lightning now and then
  manoir: {
    sky: { night: ["#06090c", "#142222", "#2e3c36"], dawn: ["#1c1c2a", "#4a3a4a", "#8a6a5a"], day: ["#3a4450", "#5a6468", "#868c8a"], dusk: ["#120a1e", "#3a1c3a", "#7a4a3a"] },
    still(g, ph, h, dark) {
      moon(g, 322, 44, 22, dark ? "#f0ecc8" : "#d8d8c8");
      cloud(g, 300, 54, 1.4, "#0a0e10", 0.55); cloud(g, 40, 30, 1.1, "#0a0e10", 0.35);
      ridge(g, 122, 18, 2.2, dark ? "#101818" : "#2a3434", 12);
      const cx = 16, cy = 104; g.fillStyle = "#0a0f10";  // the chapel on the hill
      g.fillRect(cx, cy, 26, 14); poly(g, [[cx - 2, cy], [cx + 13, cy - 9], [cx + 28, cy]], "#0a0f10"); g.fillRect(cx + 18, cy - 20, 6, 20); poly(g, [[cx + 17, cy - 20], [cx + 21, cy - 30], [cx + 25, cy - 20]], "#0a0f10");
      g.fillStyle = "#ffcf5a"; g.fillRect(cx + 6, cy + 4, 2, 4); glow(g, cx + 7, cy + 6, 6, "#ffcf5a", 0.4);
      ridge(g, 150, 10, 5.4, dark ? "#0a1010" : "#1e2626", 10);
      g.strokeStyle = "#07090a";
      for (const [x, y, l] of [[30, 172, 18], [372, 168, 22], [140, 158, 11], [250, 160, 12]]) deadTree(g, x, y, l, -Math.PI / 2 + (rnd(x) - 0.5) * 0.3, 4, 2.6);
      band(g, 182, H, "#0c1210", "#040606");
      for (let i = 0; i < 14; i++) {  // tombstones and crosses
        const x = 8 + i * 29 + rnd(i) * 10, y = 196 + rnd(i * 3) * 18, tilt = (rnd(i * 5) - 0.5) * 0.25;
        g.save(); g.translate(x, y); g.rotate(tilt); g.fillStyle = "#2a3030";
        if (i % 3 === 1) { g.fillRect(-0.8, -9, 1.6, 9); g.fillRect(-3, -6.5, 6, 1.6); } else { g.fillRect(-3, -7, 6, 7); disc(g, 0, -7, 3, "#2a3030"); }
        g.restore();
      }
      g.strokeStyle = "#050707"; g.lineWidth = 0.6;  // the iron fence
      g.beginPath(); g.moveTo(0, 188); g.lineTo(W, 188); g.moveTo(0, 182); g.lineTo(W, 182); g.stroke();
      for (let x = 2; x < W; x += 5) { g.beginPath(); g.moveTo(x, 190); g.lineTo(x, 178); g.stroke(); poly(g, [[x - 1, 178], [x, 175.5], [x + 1, 178]], "#050707"); }
    },
    move(g, t, ph, dark, still) {
      if (dark) stars(g, 40, 90, 11, t, still, 0.4);
      for (let i = 0; i < 6; i++) {  // the fog
        const x = (((rnd(i) * W + (still ? 0 : t / 1000 * (3 + i))) % (W + 160)) + W + 160) % (W + 160) - 80, y = 150 + i * 13;
        g.save(); g.globalAlpha = 0.16; g.fillStyle = "#b8c8c0"; g.beginPath(); g.ellipse(x, y, 70, 6, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      if (still) return;
      for (let i = 0; i < 6; i++) { const a = t / (2200 + i * 300) + i * 1.3; bat(g, 322 + Math.cos(a) * (34 + i * 6), 48 + Math.sin(a * 1.4) * (16 + i * 2), 0.9, Math.floor(t / 110 + i) % 2); }
      const c = (t / 1000) % 26; if (c < 0.35) { g.globalAlpha = c < 0.12 || c > 0.22 ? 0.35 : 0.1; g.fillStyle = "#e8f0ff"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    },
  },
  // the pirate ship: the open sea to the horizon, an island with palms, clouds; waves, a ship on the horizon, gulls
  pirate: {
    sky: SKY,
    still(g, ph, h, dark) {
      if (dark) moon(g, 320, 36, 9); else sun(g, 300, sunY(h, 22, 104), 9);
      for (const [x, y, s] of [[40, 40, 1.4], [150, 26, 1], [230, 62, 1.2], [360, 84, 0.9]]) cloud(g, x, y, s, dark ? "#2a3460" : "#ffffff", dark ? 0.5 : 0.85);
      const sea = { night: ["#0e1e40", "#040a1a"], dawn: ["#3a5a8a", "#123050"], day: ["#2a6aa8", "#0e3a6a"], dusk: ["#3a3a6a", "#101a3a"] }[ph];
      band(g, 118, H, sea[0], sea[1]);
      g.fillStyle = dark ? "#1a2a1e" : "#2e5a2e"; g.beginPath(); g.ellipse(40, 119, 34, 6, 0, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = dark ? "#5a5030" : "#e8d4a0"; g.fillRect(8, 118, 64, 1.6);
      palm(g, 34, 115, 18, -6, dark ? "#0e1a10" : "#1e4a1e"); palm(g, 48, 116, 14, 5, dark ? "#0e1a10" : "#1e4a1e");
      if (!dark) { g.globalAlpha = 0.25; g.fillStyle = "#fff8d0"; const sx = 300; for (let y = 122; y < 200; y += 3) g.fillRect(sx - 6 - (y - 120) / 10, y, 12 + (y - 120) / 5, 0.7); g.globalAlpha = 1; }
      else { g.globalAlpha = 0.25; g.fillStyle = "#e8ecff"; for (let y = 122; y < 190; y += 3) g.fillRect(314, y, 12, 0.6); g.globalAlpha = 1; }
    },
    move(g, t, ph, dark, still) {
      if (dark) stars(g, 50, 100, 17, t, still);
      const k = still ? 0 : t / 1000;
      const sx = ((k * 3) % (W + 80)) - 40;  // a ship on the horizon
      poly(g, [[sx - 8, 117], [sx + 8, 117], [sx + 6, 119.5], [sx - 6, 119.5]], "#1a1410");
      g.fillStyle = "#1a1410"; g.fillRect(sx - 0.3, 104, 0.6, 13); poly(g, [[sx - 5, 106], [sx + 5, 106], [sx + 4, 115], [sx - 4, 115]], dark ? "#3a3a44" : "#e8e0c8");
      g.strokeStyle = dark ? "rgba(160,190,255,.25)" : "rgba(255,255,255,.45)"; g.lineWidth = 0.6;
      for (let r = 0; r < 18; r++) {
        const y = 124 + r * r * 0.35, sp = 0.5 + r * 0.25, len = 3 + r * 0.6;
        for (let i = 0; i < 8; i++) { const x = ((rnd(r * 31 + i) * W + k * sp * 6 + Math.sin(k + r) * 2) % W + W) % W; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y - 0.8, x + len, y); g.stroke(); }
      }
      if (!dark) for (let i = 0; i < 4; i++) gull(g, ((k * (8 + i * 2) + i * 90) % (W + 40)) - 20, 50 + i * 9 + Math.sin(k * 1.5 + i) * 3, 1, Math.floor(t / 260 + i) % 2, "#2a2a30");
    },
  },
  // the Japanese house: Mount Fuji, the red sun, a pagoda, misty hills, a lake, cherry branches; petals, ripples
  japon: {
    sky: { night: ["#0a0e26", "#1a2246", "#3a3860"], dawn: ["#5a6a9a", "#f0a8a0", "#fde0c0"], day: ["#86bce6", "#c4def0", "#f4e8d8"], dusk: ["#3a2a5a", "#c05a5a", "#f8b070"] },
    still(g, ph, h, dark) {
      if (dark) moon(g, 300, 42, 10, "#f8f0e0"); else { glow(g, 296, 58, 50, "#ff8060", 0.3); disc(g, 296, sunY(h, 40, 96), 15, ph === "day" ? "#e8402a" : "#f05030"); }
      for (const [y, a] of [[70, 0.25], [88, 0.18]]) { g.globalAlpha = a; g.fillStyle = "#ffffff"; g.fillRect(0, y, W, 2); g.globalAlpha = 1; }
      poly(g, [[-50, 146], [30, 84], [56, 62], [72, 62], [98, 84], [180, 146]], dark ? "#262c4a" : "#5a6890");  // Fuji
      poly(g, [[34, 81], [56, 62], [72, 62], [94, 81], [86, 86], [78, 80], [70, 88], [62, 79], [54, 87], [44, 80]], dark ? "#b8bcd0" : "#f8f8ff");
      g.globalAlpha = 0.5; ridge(g, 140, 10, 7.3, dark ? "#1a2038" : "#9ab0c8", 10); g.globalAlpha = 1;
      ridge(g, 156, 12, 2.9, dark ? "#141a2c" : "#5a7a6a", 12);
      const px = 344, pb = 156; g.fillStyle = dark ? "#0e0e18" : "#3a1e1a";  // the pagoda
      for (let k = 0; k < 4; k++) { const w = 26 - k * 5, y = pb - k * 11; g.fillRect(px - w / 3, y - 9, w * 2 / 3, 9); poly(g, [[px - w / 2 - 4, y - 8], [px + w / 2 + 4, y - 8], [px + w / 2, y - 11], [px - w / 2, y - 11]], dark ? "#0e0e18" : "#2a1410"); }
      g.fillRect(px - 0.5, pb - 56, 1, 12);
      band(g, 168, H, dark ? "#1a2040" : "#a8c8e0", dark ? "#060814" : "#4a6a8a");
      g.save(); g.globalAlpha = 0.3; g.translate(0, 336); g.scale(1, -1); poly(g, [[-50, 168], [56, 112], [72, 112], [180, 168]], dark ? "#262c4a" : "#5a6890"); g.restore();
      g.strokeStyle = dark ? "#1a0e0e" : "#3a2018"; g.lineCap = "round";
      const branch = (x, y, pts) => { g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y); for (const [a, b] of pts) g.lineTo(a, b); g.stroke(); for (const [a, b] of pts) for (let i = 0; i < 6; i++) disc(g, a + (rnd(a + i) - 0.5) * 14, b + (rnd(b + i) - 0.5) * 9, 2 + rnd(a * i) * 1.6, i % 3 ? "#ffb8c8" : "#ff8fb0"); };
      branch(-4, 8, [[18, 14], [36, 10], [52, 20], [64, 18]]); branch(W + 4, 120, [[384, 110], [372, 98], [378, 86]]);
      g.lineCap = "butt";
    },
    move(g, t, ph, dark, still) {
      if (dark) stars(g, 60, 90, 23, t, still);
      if (still) return;
      for (let i = 0; i < 24; i++) {  // falling petals
        const k = ((t / 9000) + rnd(i)) % 1, x = (rnd(i * 4) * W * 0.6 + k * 180 + Math.sin(t / 700 + i) * 8) % W, y = k * H;
        g.save(); g.translate(x, y); g.rotate(t / 400 + i); g.fillStyle = i % 2 ? "#ffc4d4" : "#ff9cba"; g.beginPath(); g.ellipse(0, 0, 1.4, 0.8, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) { const k = ((t / 3000) + i / 4) % 1, x = 60 + rnd(i * 13) * 280, y = 190 + rnd(i * 7) * 30; g.globalAlpha = 1 - k; g.beginPath(); g.ellipse(x, y, 2 + k * 10, 0.8 + k * 3, 0, 0, Math.PI * 2); g.stroke(); }
      g.globalAlpha = 1;
    },
  },
  // the beach club: a tropical sky, a turquoise sea, the sand, palms on each side; the surf, a sailing boat, gulls
  plage: {
    sky: { night: SKY.night, dawn: ["#4a70b0", "#f0a890", "#ffe0a8"], day: ["#2a9ad8", "#6ac8f0", "#c8f0ff"], dusk: ["#2b3a7e", "#d0607a", "#ffb060"] },
    still(g, ph, h, dark) {
      if (dark) moon(g, 90, 36, 9); else sun(g, 96, sunY(h, 24, 104), 11, ph === "day" ? "#fff6c0" : "#ffc070");
      for (const [x, y, s] of [[200, 30, 1.2], [300, 52, 0.9], [20, 70, 0.8]]) cloud(g, x, y, s, dark ? "#2a3460" : "#ffffff", dark ? 0.45 : 0.9);
      const sea = dark ? ["#0e2a4a", "#14405a"] : ph === "day" ? ["#1890c0", "#3ad0d0"] : ["#3a6aa0", "#5aa8b8"];
      band(g, 118, 186, sea[0], sea[1]);
      g.globalAlpha = dark ? 0.2 : 0.35; g.fillStyle = dark ? "#e8ecff" : "#fff8d0"; for (let y = 121; y < 180; y += 3) g.fillRect(90 - (y - 118) / 8, y, 12 + (y - 118) / 4, 0.7); g.globalAlpha = 1;
      band(g, 186, H, dark ? "#5a5440" : "#f2dca2", dark ? "#3a3426" : "#e0be7e");
      g.fillStyle = dark ? "rgba(0,0,0,.12)" : "rgba(150,110,60,.18)"; g.fillRect(0, 186, W, 4);
      for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(160,120,70,.35)"; g.fillRect(rnd(i * 3) * W, 192 + rnd(i * 5) * 38, 0.8, 0.5); }
      const leaf = dark ? "#0e1e14" : "#1e6a2e", trunk = dark ? "#2a1e12" : "#7a5430";
      palm(g, 16, 226, 74, 22, leaf, trunk); palm(g, 36, 228, 52, 12, leaf, trunk); palm(g, 386, 228, 70, -24, leaf, trunk); palm(g, 362, 230, 46, -8, leaf, trunk);
      poly(g, [[330, 214], [346, 212], [344, 216]], "#e8402a");  // a towel and a starfish on the sand
      g.fillStyle = "#e8402a"; g.fillRect(60, 210, 16, 6); g.fillStyle = "#fff"; for (let x = 62; x < 76; x += 4) g.fillRect(x, 210, 2, 6);
    },
    move(g, t, ph, dark, still) {
      if (dark) stars(g, 50, 100, 29, t, still);
      const k = still ? 0 : t / 1000;
      const bx = ((k * 4) % (W + 60)) - 30;  // a sailing boat
      poly(g, [[bx - 6, 120], [bx + 6, 120], [bx + 4, 122], [bx - 4, 122]], dark ? "#2a2a30" : "#ffffff");
      poly(g, [[bx, 108], [bx, 119], [bx + 6, 119]], dark ? "#3a3a44" : "#ffffff"); poly(g, [[bx - 0.5, 110], [bx - 0.5, 119], [bx - 5, 119]], dark ? "#3a3a44" : "#ff6a50");
      g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 0.6;
      for (let r = 0; r < 10; r++) { const y = 128 + r * 5.5; for (let i = 0; i < 6; i++) { const x = ((rnd(r * 17 + i) * W + k * (2 + r)) % W + W) % W; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2 + r * 0.3, y - 0.7, x + 4 + r * 0.6, y); g.stroke(); } }
      const sw = Math.sin(k * 0.9) * 3;  // the surf on the shore
      g.fillStyle = dark ? "rgba(200,220,255,.35)" : "rgba(255,255,255,.85)"; g.beginPath(); g.moveTo(0, 186 + sw);
      for (let x = 0; x <= W; x += 8) g.lineTo(x, 186 + sw + Math.sin(x / 13 + k * 2) * 1.4);
      g.lineTo(W, 182 + sw); for (let x = W; x >= 0; x -= 8) g.lineTo(x, 182 + sw + Math.sin(x / 11 - k * 2) * 1.2); g.fill();
      if (!dark) for (let i = 0; i < 3; i++) gull(g, ((k * (7 + i * 3) + i * 120) % (W + 40)) - 20, 44 + i * 10 + Math.sin(k * 1.3 + i) * 3, 1, Math.floor(t / 240 + i) % 2, "#3a3a40");
    },
  },
};

// the still part of a theme at this hour and scale, painted once
const cache = new Map();
function stillCanvas(id, ph, h, dark) {
  const key = `${id}|${ph}|${S}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = Math.ceil(W * S); c.height = Math.ceil(H * S);
    const g = c.getContext("2d"), B = BACKDROPS[id]; g.scale(S, S);
    sky(g, B.sky[ph] || B.sky.day); B.still(g, ph, h, dark);
    for (const k of cache.keys()) if (k.startsWith(`${id}|`)) cache.delete(k);  // one per theme: the hour changed
    cache.set(key, c);
  }
  return c;
}

// painted on the screen (the camera does not move it), the back layer's context under an identity transform
export function drawBackdrop(room, ctx, t = performance.now()) {
  const id = roomTheme(room), B = id && BACKDROPS[id]; if (!B) return false;
  const { h, phase } = skyPhase(), dark = phase === "night";
  ctx.imageSmoothingEnabled = false; ctx.drawImage(stillCanvas(id, phase, h, dark), 0, 0);
  ctx.save(); ctx.setTransform(S, 0, 0, S, 0, 0);
  try { B.move(ctx, t, phase, dark, !!hub.focusMode); } finally { ctx.restore(); }
  return true;
}
export const BACKDROP_THEMES = Object.keys(BACKDROPS);

provide({ get drawBackdrop() { return drawBackdrop; }, get roomTheme() { return roomTheme; } });
