import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, stat } from "node:fs/promises";

import {
  getIntervalsConfigPath,
  getIntervalsSetupStatus,
  readSavedIntervalsConfig,
  resolveIntervalsConfig,
  saveIntervalsConfig,
} from "../scripts/lib/intervals-config.mjs";

test("saveIntervalsConfig persists credentials into CODEX_HOME and resolveIntervalsConfig reads them back", async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), "intervals-config-"));
  const env = { CODEX_HOME: codexHome };

  const saved = await saveIntervalsConfig(
    {
      apiKey: "api-key-123",
      athleteId: "athlete-456",
    },
    { env },
  );

  const configPath = getIntervalsConfigPath({ env });
  const stored = await readSavedIntervalsConfig({ env });
  const resolved = await resolveIntervalsConfig({ env });
  const fileMode = (await stat(configPath)).mode & 0o777;

  assert.equal(saved.configPath, configPath);
  assert.deepEqual(stored, {
    apiKey: "api-key-123",
    athleteId: "athlete-456",
    baseUrl: "https://intervals.icu",
  });
  assert.deepEqual(resolved, stored);
  assert.equal(fileMode, 0o600);
});

test("environment variables override saved config for runtime use", async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), "intervals-config-"));

  await saveIntervalsConfig(
    {
      apiKey: "saved-key",
      athleteId: "saved-athlete",
      baseUrl: "https://saved.example",
    },
    { env: { CODEX_HOME: codexHome } },
  );

  const resolved = await resolveIntervalsConfig({
    env: {
      CODEX_HOME: codexHome,
      INTERVALS_API_KEY: "env-key",
      INTERVALS_ATHLETE_ID: "env-athlete",
      INTERVALS_BASE_URL: "https://env.example",
    },
  });

  assert.deepEqual(resolved, {
    apiKey: "env-key",
    athleteId: "env-athlete",
    baseUrl: "https://env.example",
  });
});

test("getIntervalsSetupStatus reports missing fields without exposing secrets", async () => {
  const codexHome = await mkdtemp(path.join(os.tmpdir(), "intervals-config-"));
  const status = await getIntervalsSetupStatus({ env: { CODEX_HOME: codexHome } });

  assert.equal(status.configured, false);
  assert.deepEqual(status.missingFields, ["INTERVALS_API_KEY", "INTERVALS_ATHLETE_ID"]);
  assert.equal(status.sources.apiKey, "missing");
  assert.equal(status.sources.athleteId, "missing");
  assert.equal(status.sources.baseUrl, "default");
  assert.equal(status.hasSavedConfig, false);
});
