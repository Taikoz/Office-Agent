// Shared state, constants (team, colors, desks), canvas helpers and resize.

import { hub, provide } from "../hub.js";

export const W = 400, H = 232;
// the size of each room's floor in the scene's units: x from 0 to w, y from the wall's foot (70) to h; the screen
// shows W × H of it at a time, the isometric view's camera moves over the rest (iso/engine.js)
export const ROOM = { office: { w: 560, h: 300 }, lounge: { w: 560, h: 300 }, terrace: { w: 600, h: 320 }, meeting: { w: 400, h: 232 }, gym: { w: 420, h: 270 }, library: { w: 400, h: 270 },
  visit: { w: 560, h: 300 } };  // visit: the room of another chief's office being visited (rooms/visit.js), sized each frame
export const roomSize = id => ROOM[id] || ROOM.meeting;
// a room resized (world/construct.js): the office's door stays at the right end of its back wall
export function setRoomSize(id, w, h) { if (!ROOM[id]) return; Object.assign(ROOM[id], { w, h }); if (id === "office") DOOR.x = w - 54; }
export const cv = document.getElementById("c");
// where the drawing goes: the scene's canvas, or another one for a while (withCtx: the isometric view paints its back
// layer and captures its pieces on other canvases, iso/pixi.js); raw.drawn: px() or text() painted something
export let ctx = cv.getContext("2d");
export const raw = { drawn: false };
export function withCtx(g, fn) { const was = ctx; ctx = g; try { return fn(); } finally { ctx = was; } }
export let booted = false;  // set by main.js once every script is loaded: input before that is ignored
export let S = 3, data = { sessions: [], tickets: {}, questions: [] }, current = "*", firstLoad = true;
export const ents = new Map();
export const chief = { bubble: "", wave: 0, lastAction: "", x: 282, y: 86, at: "podium", path: [], freeSince: 0, until: 0, coffeeUntil: 0, cup: false };
export let selected = null, detailTimer = null, build = null;

/* every session in one office: the pseudo-session ALL merges their agents (ids "<session>|<agent>"),
   the chief follows the session with a question, else the most recently active one */
export const ALL = "*";
let mergedFor = null, mergedCache = null;
function mergedSession() {
  if (mergedFor === data) return mergedCache;
  const ss = data.sessions, lead = ss.find(s => s.chief.question) || ss.slice().sort((a, b) => a.chief.idle - b.chief.idle)[0];
  mergedFor = data;
  mergedCache = lead ? { ...lead, id: ALL, merged: true, lead: lead.id, project: "toutes", title: "Toutes les sessions",
    agents: ss.flatMap(s => { const solo = hub.soloDev(s); return [...s.agents, ...(solo ? [solo] : [])].map(a => ({ ...a, id: `${s.id}|${a.id}` })); }) } : null;
  return mergedCache;
}
export function curSession() { return current === ALL ? mergedSession() : data.sessions.find(s => s.id === current) || null; }
/* [session id, agent id] of an agent shown in the current view */
export function agentRef(id) {
  if (current !== ALL) return [current, id];
  const i = id.indexOf("|");
  return i < 0 ? [mergedSession()?.lead, id] : [id.slice(0, i), id.slice(i + 1)];
}
/* agent detail, its id rewritten to the one of the current view (null when not found) */
export async function fetchAgent(id, opts) {
  const [s, a] = agentRef(id);
  if (DEMO) { const d = hub.demoDetail(a); if (d && d.id === a) d.id = id; return d; }
  const res = await fetch(`/api/agent?s=${encodeURIComponent(s)}&a=${encodeURIComponent(a)}`, opts);
  if (!res.ok) return null;
  const d = await res.json();
  if (d && d.id === a) d.id = id;
  return d;
}
export let mmx = null, mmxSeen = null, storeStamp = null, couriers = 0, drawerUntil = 0;
export const mmxQueue = [], inTransit = { entries: 0, pending: 0 }, recentIds = new Map();

const TYPE_COLORS = {
  "feature-builder": "#5aa9ff", "mr-reviewer": "#b48cff", "security-auditor": "#ff6b6b",
  "audit-security-code": "#ff8f6b",
  "tech-lead": "#fbaa08", "e2e-test-writer": "#51cf66", "board-cleaner": "#fbaa08", "Explore": "#9aa3b5", "Plan": "#7fd6d6", "general-purpose": "#d6a77f", "claude": "#e98fc4", "archiviste": "#c9a24b",
};
export const typeColor = t => TYPE_COLORS[t] || "#7fd6d6";
const SPECIALTIES = {
  "feature-builder": "DÉVELOPPEUR", "mr-reviewer": "REVIEWER", "security-auditor": "SÉCURITÉ", "audit-security-code": "AUDIT SÉCU",
  "tech-lead": "TECH LEAD", "e2e-test-writer": "TESTS E2E", "board-cleaner": "BOARD", "Explore": "EXPLORATION",
  "Plan": "ARCHITECTE", "general-purpose": "GÉNÉRALISTE", "claude": "GÉNÉRALISTE", "archiviste": "ARCHIVISTE",
};
// the user's agents (agent files + ~/.claude/agent-office.json), injected in the page by the server
for (const [name, a] of Object.entries(OFFICE_CFG.agents || {})) {
  if (a.color) TYPE_COLORS[name] = a.color;
  if (a.label) SPECIALTIES[name] = a.label;
}
const FEATURES = OFFICE_CFG.features || { mmx: false, youtrack: false, gitlab: false };
export let TICKET_RE = /\b[A-Z][A-Z0-9]+-\d{2,6}\b/;
try { if (OFFICE_CFG.ticket) TICKET_RE = new RegExp(OFFICE_CFG.ticket.replace(/^\(\?[a-z]+\)/, "")); } catch (_) { /* Python-only syntax: keep the default */ }
export const specialty = t => SPECIALTIES[t] || String(t || "agent").toUpperCase();
// colored name tag with the dev's specialty
export function badge(x, y, label, color) {
  font(4.2);
  const w = ctx.measureText(label).width / S + 3;
  px(x - w / 2, y, w, 5.6, color);
  text(label, x, y + 0.3, "#1c1c24", 4.2, "center");
}
// the team, created on first launch (setup.js): the chief (main session), one dev per desk, the office cat
const DEFAULT_TEAM = ["Alice", "Bruno", "Chloé", "David", "Emma", "Farid", "Gaëlle", "Hugo"];
export const CHIEF_NAME = OFFICE_CFG.chief || "Chef";
export const TEAM = [...DEFAULT_TEAM];
(OFFICE_CFG.team || []).forEach((n, i) => { if (i < TEAM.length) TEAM[i] = n; });
export const CAT_NAME = OFFICE_CFG.cat || "Brume";
export const SKINS = ["#f1c7a3", "#d9a47c", "#a8714f", "#7a4b32", "#f5d6bf"];
export const HAIRS = ["#2b1d14", "#5b3a20", "#c9a24b", "#8c2f1e", "#1c1c24", "#d8d8d8"];
export const DESKS = [];
for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) DESKS.push({ x: 100 + i * 120, y: 140 + r * 86 });  // laid out by construct.js
export const DOOR = { x: 506, y: 66 };                          // door to the break room (devs come from there and go back there)
export const LANE = 106;                                  // walkway between the podium and the first row of desks
export const QSPOTS = [{ x: 258, y: 101 }, { x: 306, y: 101 }, { x: 246, y: 106 }, { x: 318, y: 106 }];  // queue at the tech lead
export const CAB = { x: -999, y: -999, w: 22, h: 44, ok: false };  // the MMX filing cabinet bought (build.js; ok: there is one)
export const STAND = { x: 518, y: 246 };                        // where a dev stands to file a paper
export const COFFEE = { x: 465, y: 76 };                       // in front of the coffee machine
export const ARRIVAL_GAP = 2600;                                // ms between two devs coming in through the door
export const arrivals = [];                                    // ids waiting outside, in launch order
export let doorFree = 0;
export let DESK_SP = 120;                                       // desk spacing, 120 / 96 / 80 as the open space grows (construct.js)
export const aisle = d => d.x - DESK_SP / 2;
export const toDesk = d => [{ x: aisle(d), y: LANE }, { x: aisle(d), y: d.y + 28 }, { x: d.x, y: d.y + 28 }, { x: d.x, y: d.y + 22 }];
export const fromDesk = d => [{ x: d.x, y: d.y + 28 }, { x: aisle(d), y: d.y + 28 }, { x: aisle(d), y: LANE }];
export const STATE_COLORS = { "Submitted": "#9aa3b5", "Open": "#9aa3b5", "In Progress": "#fbaa08", "To review": "#b48cff",
  "To Verify": "#5aa9ff", "Verified": "#51cf66", "Done": "#51cf66", "Closed": "#51cf66" };

export function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
export function px(x, y, w, h, c) { raw.drawn = true; ctx.fillStyle = c; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(w * S), Math.ceil(h * S)); }
// a fill over the whole canvas, whatever its transform (the night, a power cut, a veil)
export function fillScreen(color) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = color; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); }
export function font(size) { ctx.font = `${Math.round(size * S)}px VT323, monospace`; }
export function text(t, x, y, c, size = 4, align = "left") {
  raw.drawn = true; font(size); ctx.fillStyle = c; ctx.textAlign = align; ctx.textBaseline = "top"; ctx.fillText(t, x * S, y * S);
}
export function clip(t, n) { t = (t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }

// the office fills the whole window, Sims style: the bars and panels float over it
export function resize() {
  const stage = document.getElementById("stage"), tl = document.getElementById("timeline");
  // the scene fills the window: as wide as it, the overflow cut at the bottom (floor, under the HUD), at most 15 % of
  // it; a window narrower than the scene keeps thin bars on the sides rather than cutting the doors
  const vw = stage.clientWidth, vh = stage.clientHeight, contain = Math.min(vw / W, vh / H);
  const w = Math.max(240, W * (vw / W >= vh / H ? Math.min(vw / W, contain * 1.15) : contain));
  cv.style.width = `${Math.round(w)}px`;
  tl.style.width = `${Math.round(Math.min(w, 900))}px`;  // the timeline floats above the clock
  S = Math.max(1.2, w / W);
  // pixels of the layers per CSS pixel: the device's, or fewer (ui/quality.js: a budget, the frames measured)
  const dpr = hub.renderRes?.(W * S, H * S) || window.devicePixelRatio || 1, up = (window.devicePixelRatio || 1) / dpr;
  document.body.classList.toggle("crisp", up > 1.01 && Math.abs(up - Math.round(up)) < 0.01);  // blown up ×2, ×3: sharp pixels; by 1.2: smooth, never uneven
  cv.width = Math.round(W * S * dpr); cv.height = Math.round(H * S * dpr);
  cv.style.height = `${Math.round(H * S)}px`;
  S *= dpr;
  ctx.imageSmoothingEnabled = false;
  try { hub.render(performance.now()); } catch (_) { /* first layout, before the scene exists */ }  // resizing clears the canvas: redraw now, even in a background tab
}
const stageObserver = new ResizeObserver(() => resize());  // the window
stageObserver.observe(document.getElementById("stage"));

// used by modules loaded before this one, or written by another module (js/hub.js)
provide({ get DESK_SP() { return DESK_SP; }, set DESK_SP(v) { DESK_SP = v; }, get booted() { return booted; }, set booted(v) { booted = v; }, get build() { return build; }, set build(v) { build = v; }, get couriers() { return couriers; }, set couriers(v) { couriers = v; }, get current() { return current; }, set current(v) { current = v; }, get data() { return data; }, set data(v) { data = v; }, get detailTimer() { return detailTimer; }, set detailTimer(v) { detailTimer = v; }, get doorFree() { return doorFree; }, set doorFree(v) { doorFree = v; }, get drawerUntil() { return drawerUntil; }, set drawerUntil(v) { drawerUntil = v; }, get firstLoad() { return firstLoad; }, set firstLoad(v) { firstLoad = v; }, get mmx() { return mmx; }, set mmx(v) { mmx = v; }, get mmxSeen() { return mmxSeen; }, set mmxSeen(v) { mmxSeen = v; }, get selected() { return selected; }, set selected(v) { selected = v; }, get storeStamp() { return storeStamp; }, set storeStamp(v) { storeStamp = v; } });
