import { mkdir, lstat, readFile, realpath, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const LOCAL_MARKETPLACE_NAME = "local";
export const LOCAL_MARKETPLACE_DISPLAY_NAME = "Local Plugins";
export const PLUGIN_NAME = "intervals-icu-workout";
export const PLUGIN_RELATIVE_PATH = "./plugins/intervals-icu-workout";

export function buildPluginEntry() {
  return {
    name: PLUGIN_NAME,
    source: {
      source: "local",
      path: PLUGIN_RELATIVE_PATH
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Productivity"
  };
}

export function buildMarketplaceDefinition(existingDefinition) {
  const definition = existingDefinition && typeof existingDefinition === "object" && !Array.isArray(existingDefinition)
    ? { ...existingDefinition }
    : {};
  const plugins = Array.isArray(definition.plugins) ? [...definition.plugins] : [];
  const pluginEntry = buildPluginEntry();
  const existingIndex = plugins.findIndex((plugin) => plugin?.name === PLUGIN_NAME);

  if (existingIndex >= 0) {
    plugins[existingIndex] = pluginEntry;
  } else {
    plugins.push(pluginEntry);
  }

  return {
    ...definition,
    name: definition.name ?? LOCAL_MARKETPLACE_NAME,
    interface: {
      displayName: definition.interface?.displayName ?? LOCAL_MARKETPLACE_DISPLAY_NAME,
      ...(definition.interface ?? {})
    },
    plugins
  };
}

export function mergeMarketplaceJson(existingJson) {
  if (existingJson == null) {
    return buildMarketplaceDefinition();
  }

  if (Array.isArray(existingJson)) {
    const definitions = [...existingJson];
    const index = definitions.findIndex((definition) => definition?.name === LOCAL_MARKETPLACE_NAME);

    if (index >= 0) {
      definitions[index] = buildMarketplaceDefinition(definitions[index]);
    } else {
      definitions.push(buildMarketplaceDefinition());
    }

    return definitions;
  }

  if (typeof existingJson === "object") {
    return buildMarketplaceDefinition(existingJson);
  }

  throw new Error("Unsupported marketplace.json format. Expected an object or an array.");
}

async function ensureSymlink({ sourcePath, targetPath }) {
  try {
    const stat = await lstat(targetPath);

    if (stat.isSymbolicLink()) {
      const currentTarget = await realpath(targetPath);
      const desiredTarget = await realpath(sourcePath);

      if (currentTarget === desiredTarget) {
        return false;
      }

      await unlink(targetPath);
    } else {
      throw new Error(
        `Refusing to replace existing non-symlink path at ${targetPath}. Remove it manually or choose another location.`
      );
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  await symlink(sourcePath, targetPath);
  return true;
}

async function readMarketplaceJson(marketplaceFile) {
  try {
    const contents = await readFile(marketplaceFile, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Could not parse ${marketplaceFile}: ${error.message}`);
    }

    throw error;
  }
}

export async function installCodexDesktopPlugin({
  repoRoot,
  homeDir = os.homedir()
}) {
  const pluginSourcePath = path.join(repoRoot, "plugins", PLUGIN_NAME);
  const pluginTargetDir = path.join(homeDir, "plugins");
  const pluginTargetPath = path.join(pluginTargetDir, PLUGIN_NAME);
  const marketplaceDir = path.join(homeDir, ".agents", "plugins");
  const marketplaceFile = path.join(marketplaceDir, "marketplace.json");

  await mkdir(pluginTargetDir, { recursive: true });
  await mkdir(marketplaceDir, { recursive: true });

  const symlinkUpdated = await ensureSymlink({
    sourcePath: pluginSourcePath,
    targetPath: pluginTargetPath
  });

  const existingMarketplace = await readMarketplaceJson(marketplaceFile);
  const nextMarketplace = mergeMarketplaceJson(existingMarketplace);

  await writeFile(marketplaceFile, `${JSON.stringify(nextMarketplace, null, 2)}\n`, "utf8");

  return {
    pluginSourcePath,
    pluginTargetPath,
    marketplaceFile,
    symlinkUpdated
  };
}
