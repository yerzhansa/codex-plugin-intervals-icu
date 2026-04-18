#!/usr/bin/env node
import { buildWorkoutFromText } from "./lib/workout-engine.mjs";
import { createIntervalsEvent } from "./lib/intervals-api.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = { command };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = rest[index + 1];
    if (value && !value.startsWith("--")) {
      flags[key] = value;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  return flags;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || !["preview", "create"].includes(args.command)) {
    console.error("Usage: node workout-cli.mjs <preview|create> --request \"...\" [--date YYYY-MM-DD]");
    process.exitCode = 1;
    return;
  }

  if (typeof args.request !== "string" || !args.request.trim()) {
    console.error("--request is required.");
    process.exitCode = 1;
    return;
  }

  const preview = buildWorkoutFromText(args.request, {
    date: typeof args.date === "string" ? args.date : undefined,
  });

  if (args.command === "preview") {
    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  const created = await createIntervalsEvent(preview.eventPayload);
  console.log(JSON.stringify({ ...preview, createdEvent: created }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exitCode = 1;
});
