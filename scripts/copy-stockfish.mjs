import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "engine");
mkdirSync(dest, { recursive: true });

for (const name of ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"]) {
  copyFileSync(join(root, "node_modules", "stockfish", "bin", name), join(dest, name));
}

console.log("Copied Stockfish lite engine to public/engine");
