import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, realpath } from "node:fs/promises";

import {
  installCodexDesktopPlugin,
  mergeMarketplaceJson
} from "../../../scripts/lib/codex-desktop-install.mjs";

test("mergeMarketplaceJson appends or replaces the plugin entry without dropping other plugins", () => {
  const merged = mergeMarketplaceJson({
    name: "local",
    interface: {
      displayName: "Custom Local Plugins"
    },
    plugins: [
      {
        name: "something-else",
        source: {
          source: "local",
          path: "./plugins/something-else"
        }
      },
      {
        name: "intervals-icu-workout",
        source: {
          source: "local",
          path: "./wrong/path"
        }
      }
    ]
  });

  assert.equal(merged.interface.displayName, "Custom Local Plugins");
  assert.equal(merged.plugins.length, 2);
  assert.deepEqual(
    merged.plugins.find((plugin) => plugin.name === "intervals-icu-workout"),
    {
      name: "intervals-icu-workout",
      source: {
        source: "local",
        path: "./plugins/intervals-icu-workout"
      },
      policy: {
        installation: "AVAILABLE",
        authentication: "ON_INSTALL"
      },
      category: "Productivity"
    }
  );
});

test("installCodexDesktopPlugin creates the symlink and marketplace file in the user home", async () => {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "codex-plugin-repo-"));
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "codex-plugin-home-"));
  const pluginSourcePath = path.join(repoRoot, "plugins", "intervals-icu-workout");

  await mkdir(pluginSourcePath, { recursive: true });

  const result = await installCodexDesktopPlugin({ repoRoot, homeDir });
  const linkedTarget = await realpath(result.pluginTargetPath);
  const marketplaceJson = JSON.parse(await readFile(result.marketplaceFile, "utf8"));

  assert.equal(linkedTarget, await realpath(pluginSourcePath));
  assert.equal(result.symlinkUpdated, true);
  assert.equal(marketplaceJson.name, "local");
  assert.equal(marketplaceJson.interface.displayName, "Local Plugins");
  assert.equal(marketplaceJson.plugins[0].name, "intervals-icu-workout");
});
