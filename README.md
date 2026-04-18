# Codex Plugin: Intervals.icu Workout

A standalone Codex plugin repo for creating structured cycling workouts in [Intervals.icu](https://intervals.icu) from short natural-language prompts.

It is designed for prompts like:

- `Create 3x15 sweet spot FTP 200 today`
- `Schedule 5x4 VO2max FTP 260 tomorrow`
- `Preview a 90min endurance workout FTP 210`

## What the plugin includes

- A repo-scoped Codex marketplace at `.agents/plugins/marketplace.json`
- A local plugin at `plugins/intervals-icu-workout`
- An MCP server that exposes preview + create tools
- A Codex skill that nudges the model toward the right tool and prompt handling
- Deterministic workout parsing, structuring, and Intervals.icu event creation

## Install in Codex

1. Open this repo in Codex.
2. Open `Plugins`.
3. Choose the `Intervals.icu Local Plugins` marketplace.
4. Install `Intervals.icu Workout`.
5. Make sure `INTERVALS_API_KEY` is available in your Codex local environment.

Optional environment variables:

- `INTERVALS_ATHLETE_ID` — defaults to `0`
- `INTERVALS_BASE_URL` — defaults to `https://intervals.icu`

## Local smoke tests

Preview without creating anything:

```bash
npm run preview -- --request "Create 3x15 sweet spot FTP 200 tomorrow"
```

Create the workout in Intervals.icu:

```bash
INTERVALS_API_KEY=your-key npm run create -- --request "Create 3x15 sweet spot FTP 200 tomorrow"
```

Run tests:

```bash
npm test
```

## Supported first-pass prompt formats

The parser is intentionally narrow and deterministic in v0.1.0.

Supported workout types:

- sweet spot
- tempo
- threshold
- VO2max
- endurance
- recovery

Supported date phrases:

- `YYYY-MM-DD`
- `today`
- `tomorrow`

Supported structure examples:

- `3x15 sweet spot FTP 200`
- `4x8 threshold FTP 260 tomorrow`
- `90min endurance FTP 210`
- `45 min recovery FTP 190 today`
