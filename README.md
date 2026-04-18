# Codex Plugin: Intervals.icu Workout

A standalone Codex plugin repo for creating structured cycling workouts in [Intervals.icu](https://intervals.icu) from short natural-language prompts.

It is designed for prompts like:

- `Create 3x15 sweet spot FTP 200 today`
- `Schedule 5x4 VO2max FTP 260 tomorrow`
- `Preview a 90min endurance workout FTP 210`

## What the plugin includes

- A repo-scoped Codex marketplace example at `.agents/plugins/marketplace.json`
- A local plugin at `plugins/intervals-icu-workout`
- An MCP server that exposes preview + create tools
- A Codex skill that nudges the model toward the right tool and prompt handling
- Deterministic workout parsing, structuring, and Intervals.icu event creation

## Install in Codex

This can mostly be automated, but not by `git clone` alone:

- Git does not run repo setup code automatically after clone.
- Codex Desktop currently installs local plugins from user-local paths under `~/plugins` and `~/.agents/plugins/marketplace.json`, not directly from an arbitrary cloned repo.

So the repo now provides a one-command installer for the user-local registration step.

Recommended for new users on Codex Desktop:

1. Clone this repo locally.
2. Run:

```bash
npm run install:codex
```

This will:

- symlink `plugins/intervals-icu-workout` into `~/plugins/intervals-icu-workout`
- create or update `~/.agents/plugins/marketplace.json`
- register the plugin under `Local Plugins`

3. Fully restart Codex.
4. Open `Plugins`.
5. Choose the `Local Plugins` marketplace.
6. Install `Intervals.icu Workout`.
7. Make sure `INTERVALS_API_KEY` is available in your Codex local environment.

The checked-in `.agents/plugins/marketplace.json` remains a repo example for development, but the installer writes the user-local marketplace that the current desktop app reliably picks up.

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
