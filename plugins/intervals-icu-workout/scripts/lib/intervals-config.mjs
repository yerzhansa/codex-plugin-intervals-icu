import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DEFAULT_BASE_URL = "https://intervals.icu";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getIntervalsConfigPath({
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  const codexHome = normalizeString(env.CODEX_HOME) || path.join(homeDir, ".codex");
  return path.join(codexHome, "plugins", "intervals-icu-workout", "config.json");
}

export async function readSavedIntervalsConfig(options = {}) {
  const configPath = getIntervalsConfigPath(options);

  try {
    const contents = await readFile(configPath, "utf8");
    const parsed = JSON.parse(contents);
    return {
      apiKey: normalizeString(parsed.apiKey),
      athleteId: normalizeString(parsed.athleteId),
      baseUrl: normalizeString(parsed.baseUrl),
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Could not parse saved Intervals.icu config at ${configPath}: ${error.message}`);
    }

    throw error;
  }
}

function readIntervalsConfigFromRawEnv(env = process.env) {
  return {
    apiKey: normalizeString(env.INTERVALS_API_KEY),
    athleteId: normalizeString(env.INTERVALS_ATHLETE_ID),
    baseUrl: normalizeString(env.INTERVALS_BASE_URL),
  };
}

export async function getIntervalsSetupStatus(options = {}) {
  const envConfig = readIntervalsConfigFromRawEnv(options.env);
  const savedConfig = await readSavedIntervalsConfig(options);
  const resolved = {
    apiKey: envConfig.apiKey || savedConfig?.apiKey || "",
    athleteId: envConfig.athleteId || savedConfig?.athleteId || "",
    baseUrl: envConfig.baseUrl || savedConfig?.baseUrl || DEFAULT_BASE_URL,
  };
  const missingFields = [];

  if (!resolved.apiKey) {
    missingFields.push("INTERVALS_API_KEY");
  }

  if (!resolved.athleteId) {
    missingFields.push("INTERVALS_ATHLETE_ID");
  }

  return {
    configured: missingFields.length === 0,
    missingFields,
    configPath: getIntervalsConfigPath(options),
    hasSavedConfig: Boolean(savedConfig),
    sources: {
      apiKey: envConfig.apiKey ? "environment" : savedConfig?.apiKey ? "saved_config" : "missing",
      athleteId: envConfig.athleteId ? "environment" : savedConfig?.athleteId ? "saved_config" : "missing",
      baseUrl: envConfig.baseUrl ? "environment" : savedConfig?.baseUrl ? "saved_config" : "default",
    },
  };
}

export async function resolveIntervalsConfig(options = {}) {
  const envConfig = readIntervalsConfigFromRawEnv(options.env);
  const savedConfig = await readSavedIntervalsConfig(options);

  return {
    apiKey: envConfig.apiKey || savedConfig?.apiKey || "",
    athleteId: envConfig.athleteId || savedConfig?.athleteId || "",
    baseUrl: envConfig.baseUrl || savedConfig?.baseUrl || DEFAULT_BASE_URL,
  };
}

export async function saveIntervalsConfig(
  {
    apiKey,
    athleteId,
    baseUrl,
  },
  options = {},
) {
  const configPath = getIntervalsConfigPath(options);
  const configDir = path.dirname(configPath);
  const existingConfig = (await readSavedIntervalsConfig(options)) ?? {};
  const nextConfig = {
    apiKey: normalizeString(apiKey) || existingConfig.apiKey || "",
    athleteId: normalizeString(athleteId) || existingConfig.athleteId || "",
    baseUrl: normalizeString(baseUrl) || existingConfig.baseUrl || DEFAULT_BASE_URL,
  };

  if (!nextConfig.apiKey || !nextConfig.athleteId) {
    const missingFields = [];
    if (!nextConfig.apiKey) missingFields.push("INTERVALS_API_KEY");
    if (!nextConfig.athleteId) missingFields.push("INTERVALS_ATHLETE_ID");
    throw Object.assign(
      new Error(`Cannot save setup yet. Missing ${missingFields.join(" and ")}.`),
      {
        code: "missing_setup_fields",
        details: { missingFields },
      },
    );
  }

  await mkdir(configDir, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
  await chmod(configPath, 0o600);

  return {
    configPath,
    savedFields: ["INTERVALS_API_KEY", "INTERVALS_ATHLETE_ID", "INTERVALS_BASE_URL"],
  };
}
