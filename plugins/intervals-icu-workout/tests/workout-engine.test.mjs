import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkoutFromText } from "../scripts/lib/workout-engine.mjs";

test("builds a sweet spot workout from the target prompt", () => {
  const result = buildWorkoutFromText("Create 3x15 min sweet spot at 200 watts FTP", {
    date: "2026-04-20",
  });

  assert.equal(result.date, "2026-04-20");
  assert.equal(result.ftpWatts, 200);
  assert.equal(result.workout.name, "Sweet Spot 3x15");
  assert.equal(result.workout.steps[1].type, "set");
  assert.equal(result.workout.steps[1].repeat, 3);
  assert.equal(result.workout.steps[1].interval.power.low, 88);
  assert.equal(result.workout.steps[1].interval.power.high, 94);
  assert.match(result.serialized.description, /Warmup/);
  assert.match(result.serialized.description, /Main set/);
  assert.match(result.serialized.description, /Cooldown/);
  assert.equal(result.eventPayload.start_date_local, "2026-04-20T00:00:00");
});

test("builds an endurance workout from a total duration prompt", () => {
  const result = buildWorkoutFromText("Preview 90min endurance FTP 210", {
    date: "2026-04-20",
  });

  assert.equal(result.workout.name, "Endurance 90min");
  assert.equal(result.workout.steps[1].type, "steady");
  assert.equal(result.workout.steps[1].duration.value, 70);
  assert.equal(result.workout.steps[1].power.low, 56);
  assert.equal(result.workout.steps[1].power.high, 75);
});

test("resolves tomorrow relative to the provided base date", () => {
  const baseDate = new Date(Date.UTC(2026, 3, 18, 12, 0, 0));
  const result = buildWorkoutFromText("Create 5x4 VO2max FTP 260 tomorrow", {
    baseDate,
  });

  assert.equal(result.date, "2026-04-19");
  assert.equal(result.workout.name, "VO2max 5x4");
});

test("throws a helpful error when FTP is missing", () => {
  assert.throws(
    () => buildWorkoutFromText("Create 3x15 sweet spot tomorrow"),
    (error) => error && error.code === "missing_ftp",
  );
});
