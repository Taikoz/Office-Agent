"use strict";
// Agent Office service worker: only handles notification clicks (no fetch interception, no cache).
// An option button answers the question right away (same origin + the page's token); a plain click opens the office.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

async function pages() { return self.clients.matchAll({ type: "window", includeUncontrolled: true }); }
async function tell(msg) { for (const c of await pages()) c.postMessage(msg); }

async function answer(d, i) {
  const text = d.options[i];
  try {
    const res = await fetch("/api/answer", { method: "POST", headers: { "Content-Type": "application/json", "X-Office-Token": d.token },
      body: JSON.stringify({ id: d.question, answer: text }) });
    await self.registration.showNotification(res.ok ? "✓ Réponse envoyée" : "Réponse non envoyée", {
      tag: `ans:${d.question}`,
      body: res.ok ? `« ${text} » — l'agent reprend.` : `Erreur ${res.status} : réponds depuis Agent Office (page rechargée ou serveur relancé ?).` });
    if (res.ok) await tell({ type: "answered", id: d.question });
  } catch (err) {
    await self.registration.showNotification("Réponse non envoyée", { tag: `ans:${d.question}`, body: `Serveur injoignable (${err.message}).` });
  }
}

self.addEventListener("notificationclick", event => {
  const n = event.notification, d = n.data || {};
  n.close();
  event.waitUntil((async () => {
    if (event.action?.startsWith("opt:") && d.question) return answer(d, +event.action.slice(4));
    const page = (await pages()).find(c => new URL(c.url).pathname === "/");
    if (page) { await page.focus(); page.postMessage({ type: "open", session: d.session, agent: d.agent }); }
    else await self.clients.openWindow("/");
  })());
});
