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
npm run setup
```

These commands will:

- symlink `plugins/intervals-icu-workout` into `~/plugins/intervals-icu-workout`
- create or update `~/.agents/plugins/marketplace.json`
- register the plugin under `Local Plugins`
- prompt for `INTERVALS_API_KEY` and `INTERVALS_ATHLETE_ID`, then save them to local plugin config

3. Fully restart Codex.
4. Open `Plugins`.
5. Choose the `Local Plugins` marketplace.
6. Install `Intervals.icu Workout`.

The checked-in `.agents/plugins/marketplace.json` remains a repo example for development, but the installer writes the user-local marketplace that the current desktop app reliably picks up.

## Credential setup

Recommended order:

1. `env vars manually`: Best for security. No secret goes into chat history, and you can keep credentials session-only or manage them with your shell / OS secret tools.
2. `npm run setup`: Best compromise. It prompts in the terminal, avoids chat history, and saves local plugin config to `~/.codex/plugins/intervals-icu-workout/config.json` with `0600` permissions.
3. `ask in chat`: Ask in chat if you want help, and Codex should tell you to run `npm run setup` or set environment variables manually.

### Environment variables

This does **not** mean "create a `.env` file in this repo". The plugin does not read a repo `.env` file automatically.

Manual environment variables means:

1. Open Terminal.
2. Run:

```bash
export INTERVALS_API_KEY=your-key
export INTERVALS_ATHLETE_ID=your-athlete-id
open -a Codex
```

3. Use Codex after it opens.

If Codex is already open, fully quit it first, then run those commands and reopen Codex.

If you want those variables available every time, add the same `export ...` lines to your shell profile such as `~/.zshrc`, open a new Terminal, and then start Codex from that Terminal.

- `INTERVALS_API_KEY`
- `INTERVALS_ATHLETE_ID`

Optional environment variables:

- `INTERVALS_BASE_URL` — defaults to `https://intervals.icu`

### Guided setup

```bash
npm run setup
```

Environment variables still override the saved config if you set both.

### Ask in chat

Ask in chat if you want help, but the plugin should direct you to `npm run setup` or tell you to set the variables in Terminal and reopen Codex. It should not ask you to paste secrets into chat.

## Local smoke tests

Preview without creating anything:

```bash
npm run preview -- --request "Create 3x15 sweet spot FTP 200 tomorrow"
```

Create the workout in Intervals.icu:

```bash
INTERVALS_API_KEY=your-key INTERVALS_ATHLETE_ID=your-athlete-id npm run create -- --request "Create 3x15 sweet spot FTP 200 tomorrow"
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
