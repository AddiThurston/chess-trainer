import { registerHooks } from "node:module";

// The worker runs the app's TypeScript directly with Node, which does not read tsconfig paths.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  },
});
