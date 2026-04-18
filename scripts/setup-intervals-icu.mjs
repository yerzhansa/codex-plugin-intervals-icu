import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  getIntervalsSetupStatus,
  saveIntervalsConfig,
} from "../plugins/intervals-icu-workout/scripts/lib/intervals-config.mjs";

async function promptVisible(question) {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const status = await getIntervalsSetupStatus();

  if (status.configured) {
    console.log("Intervals.icu setup already exists on this machine.");
    console.log("Leave a field blank to keep the current saved value.");
  } else {
    console.log("Set up local Intervals.icu credentials for this plugin.");
    console.log("Values are stored in ~/.codex/plugins/intervals-icu-workout/config.json with 0600 permissions.");
  }

  const apiKey = await promptVisible("Intervals API key" + (status.hasSavedConfig ? " (leave blank to keep current)" : "") + ": ");
  const athleteId = await promptVisible("Intervals athlete ID" + (status.hasSavedConfig ? " (leave blank to keep current)" : "") + ": ");
  const baseUrl = await promptVisible("Intervals base URL (optional, leave blank for default): ");

  const saved = await saveIntervalsConfig({
    apiKey,
    athleteId,
    baseUrl,
  });

  console.log(`Saved setup to ${saved.configPath}`);
  console.log("Future create requests will use this saved config unless environment variables override it.");
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exitCode = 1;
});
