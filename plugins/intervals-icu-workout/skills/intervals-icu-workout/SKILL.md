---
name: intervals-icu-workout
description: Create or preview structured cycling workouts in Intervals.icu from natural-language prompts. Use when the user wants a workout added to Intervals.icu, scheduled on a date, or previewed before saving.
---

# Intervals.icu Workout

Use this skill when the user wants Codex to turn a workout request into an Intervals.icu workout.

## Use the MCP tools

Prefer the bundled MCP tools over manual shell commands:

- `intervals_get_setup_status` to check whether create is configured on this machine
- `intervals_preview_workout` for draft, preview, or "what would this look like?" requests
- `intervals_create_workout` for explicit create, add, schedule, save, or push requests

## Decision rules

- If the user is explicitly asking to create or schedule a workout in Intervals.icu, call `intervals_create_workout`.
- If the user is still deciding, or asks to preview, inspect, or verify the workout first, call `intervals_preview_workout`.
- Before the first create on a machine, use `intervals_get_setup_status`. If setup is missing, tell the user to run `npm run setup` in the plugin repo or set `INTERVALS_API_KEY` and `INTERVALS_ATHLETE_ID` manually in their Codex local environment, then retry.
- If the request implies an intensity-based workout type but omits FTP, ask one short follow-up question for FTP.
- If the user does not specify a date, default to today in the local environment.
- Keep athlete-facing coaching cues in the chat reply. Do not try to stuff narrative into the tool payload.
- Do not ask the user to paste API keys into chat.

## Supported first version

The parser is deterministic and intentionally narrow in v0.1.0.

It currently handles prompts like:

- `Create 3x15 sweet spot FTP 200 today`
- `Schedule 5x4 VO2max FTP 260 tomorrow`
- `Preview 90min endurance FTP 210`
- `Add 45min recovery FTP 190 on 2026-04-20`

## Reference

For the workout defaults and mappings used by the parser, see:

- `references/workout-design.md`
