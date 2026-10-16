// Late-bound names. A module imports what it uses from the modules loaded before it; what it uses from a module
// loaded after it (always inside functions, once everything has loaded), and the variables it writes in another
// module, go through `hub`: the owner module provides them, with a getter (and a setter when written), as it loads.
// Each `provide({ … })` at the end of a module lists them: the dependencies left to turn around.

export const hub = {};
export function provide(names) { Object.defineProperties(hub, Object.getOwnPropertyDescriptors(names)); }
