// Pizzas delivered for the team: they wait on the break-room table (social.js).

import { hub } from "../hub.js";
import { TEAM } from "../core/core.js";
import { sfx, toast } from "../sims/progress.js";
import { RECIPES, dish } from "../social/kitchen.js";
import { addMoodlet } from "../sims/moods.js";
import { atHome } from "../sims/days.js";
import { Happening } from "./base.js";

class PizzaDelivery extends Happening {
  constructor() { super("pizza"); }
  get on() { return !!dish; }  // something is already on the table
  start(t) {
    const pizza = RECIPES.find(r => r.id === "pizza");
    hub.dish = { recipe: pizza, portions: 8, burnt: false, cook: "le livreur", at: t };
    for (const n of TEAM) if (!atHome(n)) addMoodlet(n, "pizza", "🍕", "Pizzas offertes", 4, 60);
    toast("LIVRAISON 🍕", "Des pizzas pour l'équipe !", "Elles attendent sur la table de la salle de repos.");
    sfx("achievement");
  }
}
new PizzaDelivery();
