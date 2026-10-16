// Between offices: gifts and the guestbook (the phone's Cadeaux and Livre d'or).
// A gift is bought with our money and sent to a connected chief: coffees, croissants, pizzas, a cake, flowers (his
// whole team feels better) or a giant plant (it lands in his break room, free). The guestbook: whoever visits an
// office can sign it; its owner keeps the messages (in his save, like the gifts he got).

import { hub, provide } from "../hub.js";
import { ents } from "../core/core.js";
import { SaveSlot } from "../save/slot.js";
import { crewAdd } from "../sims/crew.js";
import { spend } from "../sims/money.js";
import { sfx, toast } from "../sims/progress.js";
import { call, net, sendChat } from "../world/peers.js";
import { giftPlace } from "../world/build.js";
import { loungeSay, loungers, pick } from "../world/lounge.js";

export const GIFTS = {
  coffee: { icon: "☕", label: "Tournée de cafés", price: 20, fx: { cafe: 30 }, thanks: "Merci pour les cafés ☕ !" },
  croissants: { icon: "🥐", label: "Croissants", price: 30, fx: { faim: 30, moral: 3 }, thanks: "Des croissants !! 🥐" },
  pizza: { icon: "🍕", label: "Pizzas", price: 60, fx: { faim: 50, social: 10 }, thanks: "Pizza party ! 🍕" },
  cake: { icon: "🎂", label: "Gâteau", price: 80, fx: { faim: 25, moral: 10 }, thanks: "Un gâteau, trop gentil 🎂" },
  flowers: { icon: "💐", label: "Bouquet de fleurs", price: 40, fx: { moral: 8 }, thanks: "Elles sentent bon 💐" },
  plant: { icon: "🪴", label: "Plante géante", price: 300, item: "plant", thanks: "Une nouvelle plante pour la salle de repos 🪴" },
};
const book = new SaveSlot("office-guestbook", { entries: [], gifts: [] }).data;
const save = () => SaveSlot.get("office-guestbook").save(book);
export const guestbook = () => book.entries;
export const giftsGot = () => book.gifts;

export async function sendGift(pid, id, note = "") {
  const g = GIFTS[id], p = net.peers.find(x => x.pid === pid);
  if (!g || !p) throw new Error("ce chef n'est plus là");
  if (!spend(g.price, `Cadeau pour ${p.name} : ${g.label}`)) return false;
  await call("chat", { sid: net.sid, kind: "gift", to: pid, text: id });
  if (note.trim()) await sendChat(note.trim().slice(0, 200), pid).catch(() => {});
  toast("🎁 CADEAU", `${g.icon} ${g.label} envoyé à ${p.name}`, note.trim() ? `« ${note.trim().slice(0, 60)} »` : "");
  return true;
}
// a gift for us (world/peers.js received): the whole team, or an object in the break room
hub.onGiftMsg = m => {
  const g = GIFTS[m.text]; if (!g) return;
  const team = [...new Set([...loungers.keys(), ...[...ents.values()].map(e => e.who).filter(Boolean)])];
  if (g.fx) for (const n of team) crewAdd(n, g.fx);
  const placed = g.item ? giftPlace(g.item, "lounge") || giftPlace(g.item, "office") : false;
  const free = [...loungers.values()].filter(l => !l.partyRoom); if (free.length) loungeSay(pick(free).name, g.thanks);
  book.gifts = [{ t: Date.now(), from: m.name, id: m.text }, ...book.gifts].slice(0, 50); save();
  toast("🎁 CADEAU", `${m.name} t'offre : ${g.icon} ${g.label}`, g.item ? (placed ? "Elle est dans ta salle de repos." : "Pas de place libre pour la poser…") : "Toute l'équipe en profite !");
  sfx("achievement");
};

/* ---------- the guestbook ---------- */
export async function signGuestbook(text) {
  if (!net.visit || !text.trim()) return;
  const send = () => call("chat", { sid: net.sid, kind: "guestbook", to: net.visit.pid, text: text.trim().slice(0, 200) });
  await send().catch(() => new Promise(r => setTimeout(r, 800)).then(send));  // just arrived: the server learns it with our next position
  toast("📖 LIVRE D'OR", `Signé chez ${net.visit.name}`, `« ${text.trim().slice(0, 60)} »`);
}
hub.onGuestbookMsg = m => {
  book.entries = [{ t: Date.now(), name: m.name, text: String(m.text).slice(0, 200) }, ...book.entries].slice(0, 100); save();
  toast("📖 LIVRE D'OR", `${m.name} a signé ton livre d'or`, `« ${String(m.text).slice(0, 60)} »`); sfx("commit");
};

provide({ get sendGift() { return sendGift; }, get signGuestbook() { return signGuestbook; } });
