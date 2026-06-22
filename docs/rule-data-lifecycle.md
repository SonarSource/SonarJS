# RSPEC Rule-Data Lifecycle

This document explains how SonarJS prepares, reuses, and refreshes generated RSPEC rule data. It
focuses on the moving pieces that are easy to confuse in a reused workspace:

- `resources/rule-data-state.json`
- root `rspec.sha`
- generated per-language `sonar-plugin/*/src/main/resources/rspec.sha`

## Files and roles

### `resources/rule-data-state.json`

This ignored file is the lifecycle stamp written by `npm run ensure-rule-data`.

It records:

- the lifecycle version
- the generation step name
- the current SonarJS `HEAD`
- the current root `rspec.sha` value, if any

Its job is to answer:

> Do the prepared rule-data outputs belong to this checkout and this root RSPEC pin?

If the answer is yes, `ensure-rule-data` can skip regeneration. If the answer is no, it refreshes
rule data and writes a new stamp.

### Root `rspec.sha`

`rspec.sha` at the repository root is the explicit shared input pin.

If present, it means:

> Generate rule data from this exact RSPEC commit.

`ensure-rule-data` and the Maven wrapper treat this file as authoritative. It applies to both
JavaScript and CSS unless a direct Maven command overrides the per-language properties itself.

### Generated per-language `rspec.sha`

Prepared rule data also keeps generated pins in:

- `sonar-plugin/javascript-checks/src/main/resources/rspec.sha`
- `sonar-plugin/css/src/main/resources/rspec.sha`

These files record which RSPEC commit produced the prepared JavaScript and CSS rule data.

They are primarily outputs and provenance markers. They are not committed, and they can survive
branch switches because they are ignored build artifacts.

## Commands and responsibilities

### `npm run ensure-rule-data`

This is the SonarJS-owned lifecycle entrypoint.

It:

1. checks whether prepared rule data exists
2. compares it with `resources/rule-data-state.json`
3. regenerates when the prepared data is missing or stale
4. writes the refreshed lifecycle stamp

Use this command when you want rule data prepared for the current checkout.

### `npm run generate-meta`

This command now runs:

1. `npm run ensure-rule-data`
2. `npm run generate-meta:raw`

That means metadata generation always goes through the same rule-data freshness check first.

### `npm run generate-rule-data:maven`

This is the Maven wrapper that actually performs RSPEC generation and deployment.

It can still be useful directly, especially for explicit Maven pinning workflows, but ordinary
SonarJS lifecycle handling should go through `npm run ensure-rule-data`.

## Reuse and refresh rules

Prepared rule data is reused only when all of these line up:

- the JavaScript rule-data directory exists
- the CSS rule-data directory exists
- the generated per-language `rspec.sha` files exist
- the lifecycle stamp matches the current checkout `HEAD`
- the lifecycle stamp matches the current root `rspec.sha` value

If any of those conditions stop matching, `ensure-rule-data` regenerates the rule data.

## Pin precedence

Pin precedence is:

1. root `rspec.sha`
2. generated per-language `rspec.sha`
3. default RSPEC branch behavior from Maven configuration

In other words:

- root `rspec.sha` is the intentional shared pin
- generated per-language pins are fallback inputs when no root pin is present

## Why stale generated pins are dangerous

The generated per-language pins are ignored files, so they may remain in the workspace after a
branch switch or revision change.

If stale generated pins are reused as inputs for a new checkout, rule data can be regenerated from
an old RSPEC revision and then incorrectly treated as current for the new SonarJS `HEAD`.

To avoid that, `ensure-rule-data` clears generated per-language pins before regenerating only when
all of these are true:

- there is an existing lifecycle stamp
- that stamp is stale for the current checkout
- there is no root `rspec.sha`

This keeps the stale-checkout cleanup path while preserving legacy or direct Maven pinned outputs
that do not have a lifecycle stamp yet.

## Common scenarios

### Fresh checkout

There is no prepared rule data and no lifecycle stamp.

`npm run ensure-rule-data` regenerates rule data and writes a new `resources/rule-data-state.json`.

### Reused checkout on the same revision

Prepared rule data and the lifecycle stamp match the current checkout.

`npm run ensure-rule-data` skips regeneration.

### Switched branch or revision

Prepared rule data may still exist, but the lifecycle stamp no longer matches the current `HEAD`.

`npm run ensure-rule-data` regenerates rule data and writes a new stamp.

### Root RSPEC pin changed

The root `rspec.sha` value is part of the lifecycle stamp.

Changing that file makes the stamp stale, so `npm run ensure-rule-data` regenerates rule data for
the new explicit pin.

### Direct Maven per-language pinning

If rule data was prepared outside `ensure-rule-data`, for example with direct Maven
`-Drspec.javascript.sha=...` or `-Drspec.css.sha=...`, the generated per-language pins may exist
without a lifecycle stamp.

In that case `ensure-rule-data` does not delete those pins just because the stamp is absent. That
preserves legacy and directly pinned prepared outputs until SonarJS itself stamps a lifecycle state.

## CI artifact handoff

CI now prepares RSPEC rule data through `npm run ensure-rule-data` and uploads:

- prepared JavaScript rule data
- prepared CSS rule data
- generated per-language `rspec.sha`
- `resources/rule-data-state.json`

Downstream jobs download that artifact at the repository root so the prepared paths and lifecycle
stamp are restored exactly where `ensure-rule-data` and `generate-meta` expect them.
