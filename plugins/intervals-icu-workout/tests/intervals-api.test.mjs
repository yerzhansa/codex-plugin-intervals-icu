import test from "node:test";
import assert from "node:assert/strict";

import {
  createIntervalsEvent,
  readIntervalsConfigFromEnv
} from "../scripts/lib/intervals-api.mjs";

test("readIntervalsConfigFromEnv requires explicit athlete id input", () => {
  const config = readIntervalsConfigFromEnv({
    INTERVALS_API_KEY: "key-123",
    INTERVALS_BASE_URL: "https://intervals.icu"
  });

  assert.equal(config.apiKey, "key-123");
  assert.equal(config.athleteId, "");
  assert.equal(config.baseUrl, "https://intervals.icu");
});

test("createIntervalsEvent throws a helpful error when athlete id is missing", async () => {
  await assert.rejects(
    () => createIntervalsEvent({}, {
      apiKey: "key-123",
      athleteId: "",
      baseUrl: "https://intervals.icu"
    }),
    (error) => error?.code === "missing_athlete_id" &&
      /INTERVALS_ATHLETE_ID is not set/.test(error.message)
  );
});
