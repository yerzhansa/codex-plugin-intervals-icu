function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

export function readIntervalsConfigFromEnv(env = process.env) {
  const apiKey = env.INTERVALS_API_KEY?.trim() || "";
  const athleteId = env.INTERVALS_ATHLETE_ID?.trim() || "0";
  const baseUrl = env.INTERVALS_BASE_URL?.trim() || "https://intervals.icu";
  return { apiKey, athleteId, baseUrl };
}

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString("base64")}`;
}

export async function createIntervalsEvent(eventPayload, config = readIntervalsConfigFromEnv()) {
  if (!config.apiKey) {
    throw makeError(
      "missing_api_key",
      "INTERVALS_API_KEY is not set. Add it to your Codex local environment before creating workouts.",
    );
  }

  const url = `${config.baseUrl.replace(/\/$/, "")}/api/v1/athlete/${encodeURIComponent(config.athleteId)}/events`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(config.apiKey),
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
