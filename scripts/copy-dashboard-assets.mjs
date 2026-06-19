import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = [
  ["src/dashboard/client.html", "dist/dashboard/client.html"],
  ["src/dashboard/styles.css", "dist/dashboard/styles.css"],
];

for (const [from, to] of assets) {
  const dest = join(root, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(root, from), dest);
}

