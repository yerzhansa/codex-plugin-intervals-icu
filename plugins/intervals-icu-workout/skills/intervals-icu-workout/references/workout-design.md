# Workout Design Reference

This plugin uses deterministic defaults for common cycling workout types.

## Supported workout types

### Sweet Spot

- Main set: `88-94% FTP`
- Standard parser shape: `3x15`, `2x20`, `4x10`
- Default recovery: `4min @ 50% FTP`
- Default cadence: `85-95 rpm`

### Tempo

- Main set: `76-90% FTP`
- Standard parser shape: `2x20`, `3x15`
- Default recovery: `5min @ 50% FTP`
- Default cadence: `85-95 rpm`

### Threshold

- Main set: `95-105% FTP`
- Standard parser shape: `4x8`, `3x10`, `2x15`
- Default recovery: `5min @ 50% FTP`
- Default cadence: `90-100 rpm`

### VO2max

- Main set: `106-120% FTP`
- Standard parser shape: `5x4`, `4x5`, `6x3`
- Default recovery: equal to the interval duration at `50% FTP`
- Default cadence: `95-105 rpm`

### Endurance

- Total ride target: the requested total duration
- Main steady block: `56-75% FTP`
- Default warmup/cooldown: `10min + 10min`
- Default cadence: `85-95 rpm`

### Recovery

- Total ride target: the requested total duration
- Main steady block: `50% FTP`
- Default warmup/cooldown: `5min + 5min`
- Default cadence: `90 rpm`

## Intervals.icu mapping

The parser emits structured steps and then serializes them into the Intervals.icu text format:

- `warmup`
- `steady`
- `interval`
- `recovery`
- `cooldown`
- `set { repeat, interval, recovery }`

## Date handling

The first version supports:

- `YYYY-MM-DD`
- `today`
- `tomorrow`

If no date is provided, the plugin defaults to `today` in the local environment.
