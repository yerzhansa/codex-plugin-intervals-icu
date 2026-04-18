#!/usr/bin/env node
import readline from "node:readline";
import { buildWorkoutFromText } from "./lib/workout-engine.mjs";
import { createIntervalsEvent } from "./lib/intervals-api.mjs";
import { getIntervalsSetupStatus } from "./lib/intervals-config.mjs";

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "intervals-icu-workout",
  version: "0.1.0",
};

const TOOL_DEFINITIONS = [
  {
    name: "intervals_get_setup_status",
    title: "Check Intervals.icu setup",
    description:
      "Check whether the plugin already has the Intervals.icu API key and athlete id needed to create workouts on this machine.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "intervals_preview_workout",
    title: "Preview Intervals.icu workout",
    description:
      "Parse a natural-language cycling workout request into structured steps and an Intervals.icu workout description without creating an event.",
    inputSchema: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description: "Natural-language request like 'Create 3x15 sweet spot FTP 200 tomorrow'.",
        },
        date: {
          type: "string",
          description: "Optional date override. Use YYYY-MM-DD, today, or tomorrow.",
        },
      },
      required: ["request"],
      additionalProperties: false,
    },
  },
  {
    name: "intervals_create_workout",
    title: "Create Intervals.icu workout",
    description:
      "Parse a natural-language cycling workout request and create the structured workout event in Intervals.icu.",
    inputSchema: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description: "Natural-language request like 'Create 3x15 sweet spot FTP 200 tomorrow'.",
        },
        date: {
          type: "string",
          description: "Optional date override. Use YYYY-MM-DD, today, or tomorrow.",
        },
      },
      required: ["request"],
      additionalProperties: false,
    },
  },
];

const INSTRUCTIONS = [
  "Use intervals_get_setup_status when you need to know whether create is configured on this machine.",
  "If setup is missing and the user wants to create a workout, tell them to run npm run setup in the plugin repo or set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID in Terminal before reopening Codex.",
  "Do not ask the user to paste secrets into chat.",
  "Use intervals_preview_workout for draft or preview requests.",
  "Use intervals_create_workout only when the user clearly wants the workout created in Intervals.icu.",
  "This server currently supports sweet spot, tempo, threshold, VO2max, endurance, and recovery prompts.",
  "If FTP is missing for an intensity-based workout, ask for FTP instead of guessing.",
  "If no date is specified, the server defaults to today in the local environment.",
].join(" ");

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respond(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function respondError(id, code, message, data) {
  const payload = { jsonrpc: "2.0", id, error: { code, message } };
  if (data !== undefined) payload.error.data = data;
  send(payload);
}

function toolResult(text, structuredContent, isError = false) {
  return {
    content: [{ type: "text", text }],
    structuredContent,
    isError,
  };
}

function coerceString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw Object.assign(new Error(`${field} must be a non-empty string.`), {
      code: "invalid_arguments",
      details: { field },
    });
  }
  return value.trim();
}

function summarizePreview(preview) {
  const minutes = Math.round(preview.serialized.movingTime / 60);
  const load = preview.serialized.trainingLoad === undefined ? "n/a" : String(preview.serialized.trainingLoad);
  return `Previewed ${preview.workout.name} for ${preview.date} (${minutes} min, estimated load ${load}).`;
}

async function callTool(name, args = {}) {
  if (name === "intervals_get_setup_status") {
    const status = await getIntervalsSetupStatus();
    const text = status.configured
      ? "Intervals.icu setup is ready for create requests on this machine."
      : `Intervals.icu setup is incomplete. Missing ${status.missingFields.join(" and ")}. Run npm run setup in the plugin repo or set them in Terminal, then reopen Codex.`;
    return toolResult(text, status, false);
  }

  if (name === "intervals_preview_workout") {
    const request = coerceString(args.request, "request");
    const date = typeof args.date === "string" ? args.date : undefined;
    const preview = buildWorkoutFromText(request, { date });
    return toolResult(summarizePreview(preview), preview, false);
  }

  if (name === "intervals_create_workout") {
    const request = coerceString(args.request, "request");
    const date = typeof args.date === "string" ? args.date : undefined;
    const preview = buildWorkoutFromText(request, { date });
    const created = await createIntervalsEvent(preview.eventPayload);
    return toolResult(
      `Created ${preview.workout.name} for ${preview.date} in Intervals.icu.`,
      { ...preview, createdEvent: created },
      false,
    );
  }

  throw Object.assign(new Error(`Unknown tool '${name}'.`), {
    code: "unknown_tool",
    details: { name },
  });
}

async function handleRequest(message) {
  const { id, method, params = {} } = message;

  if (method === "initialize") {
    respond(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: SERVER_INFO,
      instructions: INSTRUCTIONS,
    });
    return;
  }

  if (method === "ping") {
    respond(id, {});
    return;
  }

  if (method === "tools/list") {
    respond(id, { tools: TOOL_DEFINITIONS });
    return;
  }

  if (method === "tools/call") {
    try {
      const name = coerceString(params.name, "name");
      const result = await callTool(name, params.arguments ?? {});
      respond(id, result);
    } catch (error) {
      const payload = {
        error: error.code ?? "tool_error",
        message: error.message,
        details: error.details ?? {},
      };
      respond(id, toolResult(error.message, payload, true));
    }
    return;
  }

  respondError(id, -32601, `Method not found: ${method}`);
}

async function handleMessage(message) {
  if (Array.isArray(message)) {
    for (const item of message) {
      await handleMessage(item);
    }
    return;
  }

  if (!message || typeof message !== "object") return;

  if (typeof message.method === "string" && message.id !== undefined) {
    await handleRequest(message);
    return;
  }

  if (typeof message.method === "string") {
    return;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const message = JSON.parse(trimmed);
    await handleMessage(message);
  } catch (error) {
    respondError(null, -32700, "Parse error", { message: error.message });
  }
});
