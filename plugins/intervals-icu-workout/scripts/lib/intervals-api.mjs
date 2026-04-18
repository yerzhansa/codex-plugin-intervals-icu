import { resolveIntervalsConfig } from "./intervals-config.mjs";

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export function readIntervalsConfigFromEnv(env = process.env) {
  const apiKey = env.INTERVALS_API_KEY?.trim() || "";
  const athleteId = env.INTERVALS_ATHLETE_ID?.trim() || "";
  const baseUrl = env.INTERVALS_BASE_URL?.trim() || "https://intervals.icu";
  return { apiKey, athleteId, baseUrl };
}

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`;
}

export async function createIntervalsEvent(eventPayload, config) {
  const resolvedConfig = config ?? await resolveIntervalsConfig();

  if (!resolvedConfig.apiKey) {
    throw makeError(
      "missing_api_key",
      "INTERVALS_API_KEY is not set. Run npm run setup in the plugin repo, or set it in Terminal before opening Codex and then try again.",
    );
  }

  if (!resolvedConfig.athleteId) {
    throw makeError(
      "missing_athlete_id",
      "INTERVALS_ATHLETE_ID is not set. Run npm run setup in the plugin repo, or set it in Terminal before opening Codex and then try again.",
    );
  }

  const url = `${resolvedConfig.baseUrl.replace(/\/$/, "")}/api/v1/athlete/${encodeURIComponent(resolvedConfig.athleteId)}/events`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(resolvedConfig.apiKey),
    },
    body: JSON.stringify(eventPayload),
  });

  const bodyText = await response.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = bodyText;
  }

  if (!response.ok) {
    throw makeError(
      "intervals_api_error",
      `Intervals.icu returned ${response.status} while creating the workout event.`,
      { status: response.status, body },
    );
  }

  return {
    status: response.status,
    body,
  };
}
