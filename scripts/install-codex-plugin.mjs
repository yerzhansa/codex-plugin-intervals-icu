import path from "node:path";
import { fileURLToPath } from "node:url";

import { installCodexDesktopPlugin } from "./lib/codex-desktop-install.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const result = await installCodexDesktopPlugin({ repoRoot });

console.log(`Linked plugin: ${result.pluginTargetPath} -> ${result.pluginSourcePath}`);
console.log(`Updated marketplace: ${result.marketplaceFile}`);
console.log("Restart Codex, then open Plugins -> Local Plugins -> Intervals.icu Workout.");
