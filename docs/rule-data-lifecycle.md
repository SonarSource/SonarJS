# RSPEC Rule-Data Lifecycle

This document explains how SonarJS prepares, reuses, and refreshes generated RSPEC rule data. It
focuses on the moving pieces that are easy to confuse in a reused workspace:

- `resources/rule-data-state.json`
- root `rspec.sha`
- Direct Maven pinning
- generated per-language `sonar-plugin/*/src/main/resources/rspec.sha`

## Lifecycle at a glance

### Input / Output

```text
          normal SonarJS path                    advanced/manual path
        +---------------------------+          +---------------------------+
        | root rspec.sha            |          | Direct Maven pinning      |
        | - shared explicit pin     |          | - explicit advanced       |
        |                           |          |   pinning                 |
        |                           |          |                           |
        +-------------+-------------+          +-------------+-------------+
                      |                                      |
                      v                                      v
        +---------------------------+          +---------------------------+
        | ensure-rule-data /        |          | direct mvn generation     |
        | generate-rule-data:maven  |          |                           |
        +-------------+-------------+          +-------------+-------------+
                      |                                      |
                      +------------------+-------------------+
                                         |
                                         v
        +-----------------------------------------+
        | prepared rule-data outputs              |
        | - sonar-plugin/**/rules/**/*.json       |
        | - sonar-plugin/**/rules/**/*.html       |
        | - generated per-language rspec.sha      |
        +-------------------+---------------------+
                            |
                            v
        +-----------------------------------------+
        | resources/rule-data-state.json          |
        | - version                               |
        | - step                                  |
        | - head                                  |
        | - rootRspecSha                          |
        +-----------------------------------------+
```

### State Graph

```text
                    +------------------------------+
                    | no prepared rule data        |
                    +--------------+---------------+
                                   |
                                   | ensure-rule-data
                                   v
                    +------------------------------+
                    | regenerate rule data         |
                    +--------------+---------------+
                                   |
                                   | write state stamp
                                   v
              +--------------------------------------------------+
              | prepared rule data exists and is consistent      |
              +----------------------+---------------------------+
                                     |
            +------------------------+------------------------+
            |                                                 |
            | same HEAD + same root pin                       | HEAD changed
            | outputs still present                           | or root pin changed
            |                                                 | or outputs missing
            v                                                 v
    +---------------------+                         +------------------------------+
    | reuse / skip        |                         | stale                        |
    +----------+----------+                         +--------------+---------------+
               |                                                   |
               | ensure-rule-data                                  | ensure-rule-data
               |                                                   |
               |                                                   | if stale stamp exists
               |                                                   | and no root rspec.sha:
               |                                                   | clear generated
               |                                                   | per-language pins
               |                                                   v
               |                                    +------------------------------+
               +----------------------------------->| regenerate rule data         |
                                                    +--------------+---------------+
                                                                   |
                                                                   | normal refresh uses:
                                                                   | - root rspec.sha
                                                                   | - generated pin fallback
                                                                   v
              +--------------------------------------------------+
              | prepared rule data exists and is consistent      |
              +--------------------------------------------------+
```

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

This file is intentionally different from `resources/rule-data-state.json`:

- `rspec.sha` expresses requested input: "build from this RSPEC revision"
- `rule-data-state.json` expresses observed freshness: "these prepared outputs match this checkout
  and this root pin"

The state file can tell SonarJS whether outputs are current, but it is not meant to replace the
user-controlled pin. Keeping those roles separate avoids mixing "what was requested" with "what was
last prepared".

### Direct Maven pinning

Direct Maven pinning means generating rule data by passing explicit Maven properties instead of
creating a root `rspec.sha` file.

Examples:

```bash
-Drspec.sha=<commit-sha>
```

or, for separate JavaScript and CSS revisions:

```bash
-Drspec.javascript.sha=<commit-sha>
-Drspec.css.sha=<commit-sha>
```

This is a supported advanced/manual workflow. It is not the normal GitHub CI path. It is supported
through the Maven profiles in `sonar-plugin/javascript-checks/pom.xml`.

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

It can still be useful directly for the normal SonarJS workflow, but ordinary SonarJS lifecycle
handling should go through `npm run ensure-rule-data`.

Direct Maven pinning is a separate advanced/manual workflow that bypasses `ensure-rule-data` and
invokes Maven with explicit `-Drspec...` properties.

## Reuse and refresh rules

Prepared rule data is reused only when all of these line up:

- the JavaScript rule-data directory exists
- the CSS rule-data directory exists
- the generated per-language `rspec.sha` files exist
- the lifecycle stamp matches the current checkout `HEAD`
- the lifecycle stamp matches the current root `rspec.sha` value

If any of those conditions stop matching, `ensure-rule-data` regenerates the rule data.

## Pin precedence

Within the normal SonarJS lifecycle, pin precedence is:

1. root `rspec.sha`
2. generated per-language `rspec.sha`
3. default RSPEC branch behavior from Maven configuration

In other words:

- root `rspec.sha` is the intentional shared pin
- generated per-language pins are fallback inputs when no root pin is present

Direct Maven pinning sits outside that precedence chain because it bypasses the normal SonarJS
wrapper and passes explicit Maven properties directly.

## Why the root pin and state file both exist

It may be tempting to collapse root `rspec.sha` into `resources/rule-data-state.json`, but they
serve different responsibilities:

- root `rspec.sha` is an input chosen by the user or workflow
- `rule-data-state.json` is a derived stamp written by SonarJS after preparation

In practice, that means:

- deleting the state file should only force SonarJS to re-check or regenerate prepared outputs
- changing root `rspec.sha` should deliberately change which RSPEC revision is used

As long as SonarJS supports an explicit shared RSPEC pin, the root `rspec.sha` file remains useful
even though the lifecycle stamp also records its current value.

The generated per-language `rspec.sha` files are a different story: they are primarily build
artifacts and Maven-facing fallback inputs. Those are more likely candidates for future
simplification than the root pin itself.

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

### Direct Maven pinning

If rule data was prepared outside `ensure-rule-data` with Direct Maven pinning, the generated
per-language pins may exist without a lifecycle stamp.

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
