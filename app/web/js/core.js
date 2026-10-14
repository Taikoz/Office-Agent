"use strict";
// Shared state, constants (team, colors, desks), canvas helpers and resize.

const W = 400, H = 232;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
let booted = false;  // set by main.js once every script is loaded: input before that is ignored
let S = 3, data = { sessions: [], tickets: {}, questions: [] }, current = "*", firstLoad = true;
const ents = new Map();
const chief = { bubble: "", wave: 0, lastAction: "", x: 222, y: 86, at: "podium", path: [], freeSince: 0, until: 0, coffeeUntil: 0, cup: false };
let selected = null, detailTimer = null, build = null;

/* every session in one office: the pseudo-session ALL merges their agents (ids "<session>|<agent>"),
   the chief follows the session with a question, else the most recently active one */
const ALL = "*";
let mergedFor = null, mergedCache = null;
function mergedSession() {
  if (mergedFor === data) return mergedCache;
  const ss = data.sessions, lead = ss.find(s => s.chief.question) || ss.slice().sort((a, b) => a.chief.idle - b.chief.idle)[0];
  mergedFor = data;
  mergedCache = lead ? { ...lead, id: ALL, merged: true, lead: lead.id, project: "toutes", title: "Toutes les sessions",
    agents: ss.flatMap(s => { const solo = soloDev(s); return [...s.agents, ...(solo ? [solo] : [])].map(a => ({ ...a, id: `${s.id}|${a.id}` })); }) } : null;
  return mergedCache;
}
function curSession() { return current === ALL ? mergedSession() : data.sessions.find(s => s.id === current) || null; }
/* [session id, agent id] of an agent shown in the current view */
function agentRef(id) {
  if (current !== ALL) return [current, id];
  const i = id.indexOf("|");
  return i < 0 ? [mergedSession()?.lead, id] : [id.slice(0, i), id.slice(i + 1)];
}
/* agent detail, its id rewritten to the one of the current view (null when not found) */
async function fetchAgent(id, opts) {
  const [s, a] = agentRef(id);
  if (DEMO) { const d = demoDetail(a); if (d && d.id === a) d.id = id; return d; }
  const res = await fetch(`/api/agent?s=${encodeURIComponent(s)}&a=${encodeURIComponent(a)}`, opts);
  if (!res.ok) return null;
  const d = await res.json();
  if (d && d.id === a) d.id = id;
  return d;
}
let mmx = null, mmxSeen = null, storeStamp = null, couriers = 0, drawerUntil = 0;
const mmxQueue = [], inTransit = { entries: 0, pending: 0 }, recentIds = new Map();

const TYPE_COLORS = {
  "feature-builder": "#5aa9ff", "mr-reviewer": "#b48cff", "security-auditor": "#ff6b6b",
  "audit-security-code": "#ff8f6b",
  "tech-lead": "#fbaa08", "e2e-test-writer": "#51cf66", "board-cleaner": "#fbaa08", "Explore": "#9aa3b5", "Plan": "#7fd6d6", "general-purpose": "#d6a77f", "claude": "#e98fc4", "archiviste": "#c9a24b",
};
const typeColor = t => TYPE_COLORS[t] || "#7fd6d6";
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
let TICKET_RE = /\b[A-Z][A-Z0-9]+-\d{2,6}\b/;
try { if (OFFICE_CFG.ticket) TICKET_RE = new RegExp(OFFICE_CFG.ticket.replace(/^\(\?[a-z]+\)/, "")); } catch (_) { /* Python-only syntax: keep the default */ }
const specialty = t => SPECIALTIES[t] || String(t || "agent").toUpperCase();
// colored name tag with the dev's specialty
function badge(x, y, label, color) {
  font(4.2);
  const w = ctx.measureText(label).width / S + 3;
  px(x - w / 2, y, w, 5.6, color);
  text(label, x, y + 0.3, "#1c1c24", 4.2, "center");
}
// the team, created on first launch (setup.js): the chief (main session), one dev per desk, the office cat
const DEFAULT_TEAM = ["Alice", "Bruno", "Chloé", "David", "Emma", "Farid", "Gaëlle", "Hugo"];
const CHIEF_NAME = OFFICE_CFG.chief || "Chef";
const TEAM = [...DEFAULT_TEAM];
(OFFICE_CFG.team || []).forEach((n, i) => { if (i < TEAM.length) TEAM[i] = n; });
const CAT_NAME = OFFICE_CFG.cat || "Brume";
const SKINS = ["#f1c7a3", "#d9a47c", "#a8714f", "#7a4b32", "#f5d6bf"];
const HAIRS = ["#2b1d14", "#5b3a20", "#c9a24b", "#8c2f1e", "#1c1c24", "#d8d8d8"];
const DESKS = [];
for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) DESKS.push({ x: 62 + i * 88, y: 122 + r * 62 });
const DOOR = { x: 366, y: 66 };                          // door to the break room (devs come from there and go back there)
const LANE = 98;                                   // walkway between the podium and the first row of desks
const QSPOTS = [{ x: 198, y: 101 }, { x: 246, y: 101 }, { x: 186, y: 106 }, { x: 258, y: 106 }];  // queue at the tech lead
const CAB = { x: 374, y: 146, w: 22, h: 44 };          // MMX filing cabinet, right of the desks
const STAND = { x: 366, y: 194 };                        // where a dev stands to file a paper
const COFFEE = { x: 325, y: 76 };                        // in front of the coffee machine
const ARRIVAL_GAP = 2600;                                // ms between two devs coming in through the door
const arrivals = [];                                    // ids waiting outside, in launch order
let doorFree = 0;
const aisle = d => d.x - 44;
const toDesk = d => [{ x: aisle(d), y: LANE }, { x: aisle(d), y: d.y + 28 }, { x: d.x, y: d.y + 28 }, { x: d.x, y: d.y + 22 }];
const fromDesk = d => [{ x: d.x, y: d.y + 28 }, { x: aisle(d), y: d.y + 28 }, { x: aisle(d), y: LANE }];
const STATE_COLORS = { "Submitted": "#9aa3b5", "Open": "#9aa3b5", "In Progress": "#fbaa08", "To review": "#b48cff",
  "To Verify": "#5aa9ff", "Verified": "#51cf66", "Done": "#51cf66", "Closed": "#51cf66" };

function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(w * S), Math.ceil(h * S)); }
function font(size) { ctx.font = `${Math.round(size * S)}px VT323, monospace`; }
function text(t, x, y, c, size = 4, align = "left") {
  font(size); ctx.fillStyle = c; ctx.textAlign = align; ctx.textBaseline = "top"; ctx.fillText(t, x * S, y * S);
}
function clip(t, n) { t = (t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; }

// the session tabs need room: when they get squeezed, the tool buttons drop their labels
function fitHeader() {
  const head = document.querySelector("header"), tabs = document.getElementById("tabs");
  head.classList.remove("compact");
  if (tabs.clientWidth < 320) head.classList.add("compact");
}
function resize() {
  fitHeader();
  // the office fills the stage; on a narrow screen the page scrolls, so only the width counts
  const stage = document.getElementById("stage"), narrow = matchMedia("(max-width: 1000px)").matches;
  const tl = document.getElementById("timeline"), tlH = tl.hidden ? 0 : tl.offsetHeight + 6;
  const availW = stage.clientWidth - 26, availH = narrow ? window.innerHeight * 0.75 : stage.clientHeight - 26 - tlH;
  const w = Math.max(240, Math.min(availW, availH * W / H));
  cv.style.width = `${Math.round(w)}px`;
  tl.style.width = `${Math.round(w) + 6}px`;  // the timeline lines up with the office
  S = Math.max(1.2, w / W);
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(W * S * dpr); cv.height = Math.round(H * S * dpr);
  cv.style.height = `${Math.round(H * S)}px`;
  S *= dpr;
  ctx.imageSmoothingEnabled = false;
  try { render(performance.now()); } catch (_) { /* first layout, before the scene exists */ }  // resizing clears the canvas: redraw now, even in a background tab
}
const stageObserver = new ResizeObserver(() => resize());  // window, side column, timeline height
stageObserver.observe(document.getElementById("stage")); stageObserver.observe(document.getElementById("timeline"));
