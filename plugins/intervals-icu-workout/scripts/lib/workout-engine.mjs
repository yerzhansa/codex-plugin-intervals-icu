const SIMPLE_STEP_TYPES = new Set([
  "warmup",
  "steady",
  "ramp",
  "interval",
  "rest",
  "recovery",
  "cooldown",
  "freeride",
]);

const ZONE_INTENSITY_MIDPOINTS = {
  1: 0.45,
  2: 0.65,
  3: 0.83,
  4: 0.91,
  5: 1.0,
  6: 1.13,
  7: 1.3,
};

const INTERVAL_WORKOUT_DEFINITIONS = {
  sweet_spot: {
    label: "Sweet Spot",
    aliases: [/\bsweet\s*spot\b/i, /\bsweetspot\b/i],
    workPower: { kind: "percent_ftp", low: 88, high: 94 },
    intervalCadence: { low: 85, high: 95 },
    recoveryMinutes: 4,
    warmup: {
      type: "warmup",
      duration: { value: 15, unit: "minutes" },
      power: { kind: "percent_ftp", low: 50, high: 65 },
    },
    cooldown: {
      type: "cooldown",
      duration: { value: 10, unit: "minutes" },
      power: { kind: "percent_ftp", value: 50 },
    },
  },
  tempo: {
    label: "Tempo",
    aliases: [/\btempo\b/i],
    workPower: { kind: "percent_ftp", low: 76, high: 90 },
    intervalCadence: { low: 85, high: 95 },
    recoveryMinutes: 5,
    warmup: {
      type: "warmup",
      duration: { value: 15, unit: "minutes" },
      power: { kind: "percent_ftp", low: 50, high: 65 },
    },
    cooldown: {
      type: "cooldown",
      duration: { value: 10, unit: "minutes" },
      power: { kind: "percent_ftp", value: 50 },
    },
  },
  threshold: {
    label: "Threshold",
    aliases: [/\bthreshold\b/i],
    workPower: { kind: "percent_ftp", low: 95, high: 105 },
    intervalCadence: { low: 90, high: 100 },
    recoveryMinutes: 5,
    warmup: {
      type: "warmup",
      duration: { value: 15, unit: "minutes" },
      power: { kind: "percent_ftp", low: 50, high: 65 },
    },
    cooldown: {
      type: "cooldown",
      duration: { value: 10, unit: "minutes" },
      power: { kind: "percent_ftp", value: 50 },
    },
  },
  vo2max: {
    label: "VO2max",
    aliases: [/\bvo2\s*max\b/i, /\bvo2max\b/i, /\bvo2\b/i],
    workPower: { kind: "percent_ftp", low: 106, high: 120 },
    intervalCadence: { low: 95, high: 105 },
    recoveryMinutes: null,
    warmup: {
      type: "warmup",
      duration: { value: 15, unit: "minutes" },
      power: { kind: "percent_ftp", low: 50, high: 70 },
    },
    cooldown: {
      type: "cooldown",
      duration: { value: 10, unit: "minutes" },
      power: { kind: "percent_ftp", value: 50 },
    },
  },
};

const STEADY_WORKOUT_DEFINITIONS = {
  endurance: {
    label: "Endurance",
    aliases: [/\bendurance\b/i, /\bz2\b/i],
    mainType: "steady",
    mainPower: { kind: "percent_ftp", low: 56, high: 75 },
    cadence: { low: 85, high: 95 },
    warmupMinutes: 10,
    cooldownMinutes: 10,
  },
  recovery: {
    label: "Recovery",
    aliases: [/\brecovery\b/i, /\beasy\s+spin\b/i],
    mainType: "steady",
    mainPower: { kind: "percent_ftp", value: 50 },
    cadence: { target: 90 },
    warmupMinutes: 5,
    cooldownMinutes: 5,
  },
};

function makeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function ensure(condition, code, message, details = {}) {
  if (!condition) throw makeError(code, message, details);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function toIsoLocalDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function resolveScheduledDate(rawDate, { baseDate = new Date() } = {}) {
  if (!rawDate) return toIsoLocalDate(baseDate);
  const value = String(rawDate).trim().toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value.includes("tomorrow")) return toIsoLocalDate(addDays(baseDate, 1));
  if (value.includes("today")) return toIsoLocalDate(baseDate);

  throw makeError(
    "unsupported_date",
    `Unsupported date '${rawDate}'. Use YYYY-MM-DD, today, or tomorrow.`,
    { rawDate },
  );
}

function extractDateToken(request) {
  const iso = request.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  if (/\btomorrow\b/i.test(request)) return "tomorrow";
  if (/\btoday\b/i.test(request)) return "today";
  return null;
}

export function extractFtpWatts(request) {
  const patterns = [
    /\bftp(?:\s*(?:is|=|at))?\s*(\d{2,3})(?:\s*(?:w|watts?))?\b/i,
    /\b(\d{2,3})(?:\s*(?:w|watts?))?\s*ftp\b/i,
  ];

  for (const pattern of patterns) {
    const match = request.match(pattern);
    if (!match) continue;
    const ftp = Number.parseInt(match[1], 10);
    ensure(Number.isInteger(ftp) && ftp >= 50 && ftp <= 600, "invalid_ftp", `FTP must be 50-600 watts, got ${match[1]}.`, { ftp: match[1] });
    return ftp;
  }

  return null;
}

function detectWorkoutTypeKey(request) {
  for (const [key, definition] of Object.entries(INTERVAL_WORKOUT_DEFINITIONS)) {
    if (definition.aliases.some((pattern) => pattern.test(request))) return key;
  }
  for (const [key, definition] of Object.entries(STEADY_WORKOUT_DEFINITIONS)) {
    if (definition.aliases.some((pattern) => pattern.test(request))) return key;
  }
  return null;
}

function parseDurationUnit(token) {
  if (!token) return "minutes";
  const lower = token.toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(lower)) return "seconds";
  return "minutes";
}

function parseRepeatStructure(request) {
  const match = request.match(/\b(\d{1,2})\s*x\s*(\d{1,3})(?:\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes))?\b/i);
  if (!match) return null;

  const repeat = Number.parseInt(match[1], 10);
  const value = Number.parseInt(match[2], 10);
  const unit = parseDurationUnit(match[3]);

  ensure(repeat >= 1 && repeat <= 20, "invalid_repeat", `Repeat count must be 1-20, got ${repeat}.`, { repeat });
  ensure(value > 0, "invalid_duration", `Interval duration must be positive, got ${value}.`, { value });

  return {
    repeat,
    duration: { value, unit },
  };
}

function parseTotalDuration(request) {
  const match = request.match(/\b(\d{1,3})(?:\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes))\b/i);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  const unit = parseDurationUnit(match[2]);
  ensure(value > 0, "invalid_duration", `Duration must be positive, got ${value}.`, { value });
  return { value, unit };
}

function toSeconds(duration) {
  return duration.unit === "seconds" ? duration.value : duration.value * 60;
}

function formatRepDurationForName(duration) {
  return duration.unit === "minutes" ? String(duration.value) : `${duration.value}s`;
}

function formatDurationForName(duration) {
  return duration.unit === "minutes" ? `${duration.value}min` : `${duration.value}s`;
}

function buildIntervalWorkout(typeKey, structure) {
  const definition = INTERVAL_WORKOUT_DEFINITIONS[typeKey];
  const recoveryDuration = definition.recoveryMinutes === null
    ? clone(structure.duration)
    : { value: definition.recoveryMinutes, unit: "minutes" };

  return {
    name: `${definition.label} ${structure.repeat}x${formatRepDurationForName(structure.duration)}`,
    steps: [
      clone(definition.warmup),
      {
        type: "set",
        repeat: structure.repeat,
        interval: {
          type: "interval",
          duration: clone(structure.duration),
          power: clone(definition.workPower),
          cadence: clone(definition.intervalCadence),
        },
        recovery: {
          type: "recovery",
          duration: recoveryDuration,
          power: { kind: "percent_ftp", value: 50 },
        },
      },
      clone(definition.cooldown),
    ],
  };
}

function buildSteadyWorkout(typeKey, totalDuration) {
  const definition = STEADY_WORKOUT_DEFINITIONS[typeKey];
  const warmupSeconds = definition.warmupMinutes * 60;
  const cooldownSeconds = definition.cooldownMinutes * 60;
  const mainSeconds = toSeconds(totalDuration) - warmupSeconds - cooldownSeconds;

  ensure(
    mainSeconds >= 5 * 60,
    "duration_too_short",
    `${definition.label} workouts need at least ${definition.warmupMinutes + definition.cooldownMinutes + 5} minutes total so there is room for a main block.`,
    { totalDuration },
  );

  const mainDuration = mainSeconds % 60 === 0
    ? { value: mainSeconds / 60, unit: "minutes" }
    : { value: mainSeconds, unit: "seconds" };

  return {
    name: `${definition.label} ${formatDurationForName(totalDuration)}`,
    steps: [
      {
        type: "warmup",
        duration: { value: definition.warmupMinutes, unit: "minutes" },
        power: { kind: "percent_ftp", low: 50, high: 65 },
      },
      {
        type: definition.mainType,
        duration: mainDuration,
        power: clone(definition.mainPower),
        cadence: clone(definition.cadence),
      },
      {
        type: "cooldown",
        duration: { value: definition.cooldownMinutes, unit: "minutes" },
        power: { kind: "percent_ftp", value: 50 },
      },
    ],
  };
}

function validateDuration(duration, path) {
  ensure(duration && typeof duration === "object", "invalid_duration", `${path}: duration is required.`);
  ensure(Number.isFinite(duration.value) && duration.value > 0, "invalid_duration", `${path}: duration.value must be positive.`, { duration });
  ensure(duration.unit === "minutes" || duration.unit === "seconds", "invalid_duration", `${path}: duration.unit must be 'minutes' or 'seconds'.`, { duration });
}

function validateCadence(cadence, path) {
  if (!cadence) return;
  const hasTarget = cadence.target !== undefined;
  const hasLow = cadence.low !== undefined;
  const hasHigh = cadence.high !== undefined;

  ensure(!(hasLow ^ hasHigh), "invalid_cadence", `${path}: cadence range requires both low and high.`, { cadence });
  if (hasLow && hasHigh) {
    ensure(cadence.low <= cadence.high, "invalid_cadence", `${path}: cadence.low cannot exceed cadence.high.`, { cadence });
  }
  ensure(hasTarget || (hasLow && hasHigh), "invalid_cadence", `${path}: cadence requires target or low/high.`, { cadence });
}

function validatePower(power, path) {
  if (!power) return;
  const hasValue = power.value !== undefined;
  const hasLow = power.low !== undefined;
  const hasHigh = power.high !== undefined;
  ensure(["watts", "percent_ftp", "zone"].includes(power.kind), "invalid_power", `${path}: unsupported power kind '${power.kind}'.`, { power });
  ensure(!(hasLow ^ hasHigh), "invalid_power", `${path}: power range requires both low and high.`, { power });
  ensure(hasValue || (hasLow && hasHigh), "invalid_power", `${path}: power requires value or low/high.`, { power });

  for (const key of ["value", "low", "high"]) {
    const value = power[key];
    if (value === undefined) continue;
    ensure(Number.isFinite(value) && value > 0, "invalid_power", `${path}: power.${key} must be positive.`, { power });
  }

  if (power.kind === "zone") {
    for (const key of ["value", "low", "high"]) {
      const value = power[key];
      if (value === undefined) continue;
      ensure(Number.isInteger(value) && value >= 1 && value <= 7, "invalid_power", `${path}: zone values must be integers 1-7.`, { power });
    }
  }
}

function validateSimpleStep(step, path) {
  ensure(step && typeof step === "object", "invalid_step", `${path}: step is required.`);
  ensure(SIMPLE_STEP_TYPES.has(step.type), "invalid_step", `${path}: unsupported step type '${step.type}'.`, { step });
  validateDuration(step.duration, path);
  validatePower(step.power, path);
  validateCadence(step.cadence, path);
}

function preValidateStep(step, path) {
  if (step.type === "set") {
    ensure(Number.isInteger(step.repeat) && step.repeat >= 1 && step.repeat <= 20, "invalid_repeat", `${path}: repeat must be an integer 1-20.`, { step });
    validateSimpleStep(step.interval, `${path}.interval`);
    validateSimpleStep(step.recovery, `${path}.recovery`);
    return;
  }
  validateSimpleStep(step, path);
}

function formatDuration(duration) {
  const seconds = Math.round(toSeconds(duration));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m${remainder}`;
}

function formatPower(power, isRamp, path) {
  if (!power) return null;
  const hasRange = power.low !== undefined && power.high !== undefined;
  const hasValue = power.value !== undefined;
  const prefix = isRamp ? "ramp " : "";

  if (isRamp) {
    ensure(hasRange, "invalid_power", `${path}: ramp steps require power.low and power.high.`, { power });
  }

  if (hasRange) {
    ensure(power.low <= power.high, "invalid_power", `${path}: power.low cannot exceed power.high.`, { power });
    if (power.kind === "zone") return `${prefix}Z${power.low}-Z${power.high}`;
    if (power.kind === "percent_ftp") return `${prefix}${power.low}-${power.high}%`;
    return `${prefix}${power.low}-${power.high}w`;
  }

  if (hasValue) {
    if (power.kind === "zone") return `Z${power.value}`;
    if (power.kind === "percent_ftp") return `${power.value}%`;
    return `${power.value}w`;
  }

  throw makeError("invalid_power", `${path}: power requires value or low/high.`, { power });
}

function formatCadence(cadence, path) {
  if (!cadence) return null;
  if (cadence.target !== undefined) return `${cadence.target}rpm`;
  if (cadence.low !== undefined && cadence.high !== undefined) {
    ensure(cadence.low <= cadence.high, "invalid_cadence", `${path}: cadence.low cannot exceed cadence.high.`, { cadence });
    return `${cadence.low}-${cadence.high}rpm`;
  }
  throw makeError("invalid_cadence", `${path}: cadence requires target or low/high.`, { cadence });
}

function formatStepLine(step, path) {
  const parts = [formatDuration(step.duration)];
  const power = formatPower(step.power, step.type === "ramp", path);
  const cadence = formatCadence(step.cadence, path);
  if (power) parts.push(power);
  if (cadence) parts.push(cadence);
  return `- ${parts.join(" ")}`;
}

function sectionLabelFor(type) {
  if (type === "warmup") return "Warmup";
  if (type === "cooldown") return "Cooldown";
  return "Main set";
}

function walkSimpleSteps(steps, visit) {
  const go = (step, multiplier) => {
    if (step.type === "set") {
      go(step.interval, multiplier * step.repeat);
      go(step.recovery, multiplier * step.repeat);
      return;
    }
    visit(step, multiplier);
  };

  for (const step of steps) go(step, 1);
}

function mid(a, b) {
  return a !== undefined && b !== undefined ? (a + b) / 2 : undefined;
}

function intensityFor(step, ftpWatts) {
  if (!step.power) return 0;
  const power = step.power;

  if (power.kind === "zone") {
    const zone = power.value ?? mid(power.low, power.high);
    if (zone === undefined) return undefined;
    const lo = ZONE_INTENSITY_MIDPOINTS[Math.floor(zone)];
    const hi = ZONE_INTENSITY_MIDPOINTS[Math.ceil(zone)];
    return lo !== undefined && hi !== undefined ? (lo + hi) / 2 : undefined;
  }

  if (power.kind === "percent_ftp") {
    const percent = power.value ?? mid(power.low, power.high);
    return percent === undefined ? undefined : percent / 100;
  }

  if (ftpWatts === undefined) return undefined;
  const watts = power.value ?? mid(power.low, power.high);
  return watts === undefined ? undefined : watts / ftpWatts;
}

function computeLoad(steps, ftpWatts) {
  let sum = 0;
  let anyPower = false;
  let wattsWithoutFtp = false;

  walkSimpleSteps(steps, (step, multiplier) => {
    const intensity = intensityFor(step, ftpWatts);
    if (intensity === undefined) {
      if (step.power?.kind === "watts") wattsWithoutFtp = true;
      return;
    }
    if (intensity > 0) anyPower = true;
    sum += toSeconds(step.duration) * multiplier * intensity * intensity;
  });

  if (wattsWithoutFtp || !anyPower) return undefined;
  return Math.round((sum / 3600) * 100);
}

function totalSeconds(steps) {
  let total = 0;
  walkSimpleSteps(steps, (step, multiplier) => {
    total += toSeconds(step.duration) * multiplier;
  });
  return Math.round(total);
}

export function serializeIntervalsWorkout(input, ftpWatts) {
  ensure(input && typeof input === "object", "invalid_workout", "Workout payload is required.");
  ensure(typeof input.name === "string" && input.name.trim(), "invalid_workout", "Workout name is required.", { input });
  ensure(Array.isArray(input.steps) && input.steps.length > 0, "invalid_workout", "Workout steps are required.", { input });

  input.steps.forEach((step, index) => preValidateStep(step, `steps[${index}]`));

  const lines = [];
  let currentLabel = null;

  input.steps.forEach((step, index) => {
    const label = sectionLabelFor(step.type);
    if (label !== currentLabel) {
      if (lines.length > 0) lines.push("");
      lines.push(label);
      currentLabel = label;
    }

    const path = `steps[${index}]`;
    if (step.type === "set") {
      lines.push(`${step.repeat}x`);
      lines.push(formatStepLine(step.interval, `${path}.interval`));
      lines.push(formatStepLine(step.recovery, `${path}.recovery`));
    } else {
      lines.push(formatStepLine(step, path));
    }
  });

  return {
    description: lines.join("\n"),
    movingTime: totalSeconds(input.steps),
    trainingLoad: computeLoad(input.steps, ftpWatts),
  };
}

export function buildWorkoutFromText(request, { date, baseDate = new Date() } = {}) {
  ensure(typeof request === "string" && request.trim(), "missing_request", "Workout request is required.");
  const normalizedRequest = request.trim();
  const workoutTypeKey = detectWorkoutTypeKey(normalizedRequest);
  ensure(
    workoutTypeKey,
    "unsupported_workout_type",
    "Could not determine the workout type. Supported types: sweet spot, tempo, threshold, VO2max, endurance, recovery.",
    { request: normalizedRequest },
  );

  const ftpWatts = extractFtpWatts(normalizedRequest);
  const scheduledDate = resolveScheduledDate(date ?? extractDateToken(normalizedRequest), { baseDate });

  let workout;
  if (workoutTypeKey in INTERVAL_WORKOUT_DEFINITIONS) {
    const structure = parseRepeatStructure(normalizedRequest);
    ensure(
      structure,
      "missing_structure",
      `Could not find an interval structure like 3x15 or 5x4 in '${normalizedRequest}'.`,
      { request: normalizedRequest },
    );
    ensure(
      ftpWatts !== null,
      "missing_ftp",
      `Could not find FTP in '${normalizedRequest}'. Include it like 'FTP 200' or '200w FTP'.`,
      { request: normalizedRequest },
    );
    workout = buildIntervalWorkout(workoutTypeKey, structure);
  } else {
    const totalDuration = parseTotalDuration(normalizedRequest);
    ensure(
      totalDuration,
      "missing_duration",
      `Could not find a duration like 90min or 45min in '${normalizedRequest}'.`,
      { request: normalizedRequest },
    );
    ensure(
      ftpWatts !== null,
      "missing_ftp",
      `Could not find FTP in '${normalizedRequest}'. Include it like 'FTP 200' or '200w FTP'.`,
      { request: normalizedRequest },
    );
    workout = buildSteadyWorkout(workoutTypeKey, totalDuration);
  }

  const serialized = serializeIntervalsWorkout(workout, ftpWatts ?? undefined);
  const eventPayload = {
    start_date_local: `${scheduledDate}T00:00:00`,
    category: "WORKOUT",
    name: workout.name,
    type: "Ride",
    moving_time: serialized.movingTime,
    description: serialized.description,
    ...(serialized.trainingLoad !== undefined ? { icu_training_load: serialized.trainingLoad } : {}),
  };

  return {
    request: normalizedRequest,
    date: scheduledDate,
    ftpWatts,
    workoutType: workoutTypeKey,
    workout,
    serialized,
    eventPayload,
  };
}
