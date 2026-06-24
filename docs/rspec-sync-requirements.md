# RSPEC Sync Requirements

This document records the requirements for the SonarJS RSPEC sync and rule-data lifecycle.

It is intended to be the regression checklist for future performance or simplification work. If the
implementation changes, it still needs to satisfy the requirements below.

## Source

These requirements were distilled from the RSPEC sync and lifecycle PRs merged during 2026,
especially:

- `#6366` Re-enable `rspec-maven-plugin` for rule data generation
- `#6492` Replace `rspec-maven-plugin` with `sync-rspec` script
- `#6583` Generate built-in profiles from RSPEC metadata
- `#6608` Fix RSPEC pin bootstrap and artifact completeness
- `#7059` Re-enable `rspec-maven-plugin` for rule data generation
- `#7149` Track generated RSPEC JSON files
- `#7288` Fix Windows `.cmd` spawning in RSPEC scripts
- `#7292` Remove accidental `rspec.sha`
- `#7322` Add `ensure-rule-data` lifecycle for RSPEC outputs
- `#7323` Reduce CSS metadata duplication and sync CSS RSPEC data
- `#7353` Pretty-print JS profile aggregate JSON files

## Functional Requirements

### Canonical source of truth

- SonarJS must generate rule data from `SonarSource/rspec` for both JavaScript and CSS.
- RSPEC metadata must remain the source of truth for generated rule JSON and generated profiles.
- Generated profile content such as `defaultQualityProfiles` must come from RSPEC metadata rather
  than local hardcoded lists.
- For the normal local `npm run bbf` workflow, the already-present tracked rule JSON in the
  workspace is the build input for TypeScript metadata generation.
- Fetching the latest RSPEC revision must be an explicit refresh action rather than an implicit side
  effect of the normal local `bbf` flow.

### Command model

- The local developer-facing build path should separate “refresh RSPEC rule data” from “generate
  TypeScript metadata from the rule JSON already present in the workspace”.
- `npm run bbf` should be the fast local build path and should not implicitly perform RSPEC sync,
  Maven refresh, or remote freshness checks.
- SonarJS must provide one explicit SonarJS-owned command for refreshing RSPEC rule data.
- An explicit convenience command that combines refresh and build, such as `bbf:latest`, is
  acceptable but not required.
- Hidden user-facing layering such as `generate-meta`, `generate-meta:raw`, and
  `ensure-rule-data` is not itself a requirement; the important requirement is that the command
  surface be simple and hard to misuse.

### Local developer workflow

- A clean checkout after `npm ci` must be able to run the normal SonarJS `bbf` flow immediately
  from the tracked rule metadata already present in the workspace, and must also support an
  explicit rule-data refresh workflow when requested.
- Local developers must not need a manually managed sibling `rspec` checkout.
- The normal local `bbf` workflow should work without GitHub auth when the required rule metadata is
  already present in the workspace.
- Local auth must work with standard developer state, namely `gh auth login` and/or
  `GITHUB_TOKEN`, for the explicit RSPEC refresh workflow.
- The normal SonarJS workflow must have a SonarJS-owned explicit entrypoint for preparing or
  refreshing rule data.

### CI workflow

- CI must prepare RSPEC rule data once and reuse it in downstream jobs instead of fetching RSPEC in
  every job.
- The prepared artifact must be complete enough for downstream reuse.
- The explicit refresh path should follow the same pinning and freshness rules in local runs and CI,
  rather than having separate hidden lifecycle logic.
- CI must not rely on `npm run bbf` performing hidden RSPEC refresh.

### Idempotence and reuse

- Rule-data preparation must be idempotent for long-lived or repeated automation workflows,
  especially the FP fixes bot.
- Idempotence is not itself a primary requirement for the usual local developer workflow on
  unpinned `master`.
- CI clean checkouts do not rely on local idempotence as a primary requirement.
- Rerunning the preparation step on the same checkout with the same explicit requested RSPEC
  revision, or with the same already-prepared artifact state in a long-lived workspace, should
  reuse prepared outputs and skip unnecessary regeneration.
- In the normal local unpinned `bbf` workflow, reuse is the default: if the required rule metadata
  is already present, SonarJS should skip RSPEC sync entirely and should not check the remote tip.
- Within one explicit refresh run, SonarJS should reuse a single synced RSPEC checkout for both
  JavaScript and CSS generation instead of syncing the same RSPEC checkout twice.
- TypeScript metadata generation must be able to run directly from the already-present local rule
  JSON without first going through a hidden RSPEC sync lifecycle.

## Correctness Requirements

### Freshness and stale-state protection

- Explicit RSPEC refresh must not silently reuse stale pinned outputs from another workflow when the
  requested root `rspec.sha` changes.
- Prepared outputs used for automation reuse must still be attributable to the pin or explicit
  refresh action that produced them.
- The default local `bbf` flow does not need to decide freshness against remote RSPEC state; it only
  needs the required local metadata inputs to be present.

### Pinning

- Exact pinning of the RSPEC revision must be supported.
- The normal SonarJS lifecycle must support a shared root `rspec.sha`.
- SonarJS should speak in terms of a single RSPEC pin, not separate JavaScript and CSS pins.
- There is no valid requirement for JavaScript and CSS to resolve to different RSPEC revisions.
- A root `rspec.sha` is a temporary workflow input used for branch-specific development such as
  building against RSPEC changes that are not yet merged.
- That root `rspec.sha` must not be committed to `master`.
- When root `rspec.sha` is absent, the explicit refresh workflow should resolve the latest intended
  RSPEC revision.
- Generated per-language `rspec.sha` files may still exist as derived artifacts or compatibility
  outputs, but they must not represent independent user-visible pin inputs.
- Fresh-clone bootstrap must work when the requested pin is a raw commit SHA, not only a branch
  tip.

### Completeness and traceability

- Prepared outputs must include both JavaScript and CSS rule data.
- Prepared outputs must record which RSPEC revision produced them.
- The sync flow must remain traceable enough to explain which checkout and which RSPEC revision the
  prepared outputs belong to.

### Output compatibility

- Generated JSON and HTML must remain functionally equivalent to the expected output contract.
- Sync changes must not introduce semantic regressions in rule metadata, profile generation, or
  rendered rule descriptions.

### Cross-platform behavior

- The normal rule-data preparation path must work on supported developer platforms, including
  Windows.

## Repository and Lifecycle Requirements

### File roles

- Root `rspec.sha` is an input chosen by the user or workflow.
- If generated per-language `rspec.sha` files remain present for compatibility, they are derived
  outputs of the single logical RSPEC pin rather than distinct pin authorities.
- A repo-local lifecycle stamp such as `resources/rule-data-state.json` is not part of the desired
  simplified normal workflow contract.

### Tracked vs generated artifacts

- Generated RSPEC JSON under plugin resources is intentionally tracked in Git.
- Those tracked JSON files must remain in Git because the RSPEC site coverage tooling scans analyzer
  repositories across releases and `master` to build `covered_rules.json`, which in turn powers
  coverage state and “Covered since” information on the RSPEC site.
- Those tracked JSON files are retained both for RSPEC publication/historical coverage and as the
  normal local input for `bbf` when no explicit refresh is requested.
- Generated HTML files are build artifacts and are not required to be tracked in Git.
- Generated per-language `rspec.sha` files are build artifacts and are not required to be tracked
  in Git.
- Even though they are build artifacts, the generated per-language `rspec.sha` files may remain as
  compatibility outputs if needed, but they are not part of the intended user-visible pin model.

### CSS parity

- CSS is part of the same rule-data lifecycle as JavaScript, not a secondary or optional follow-up.

### Shared stack direction

- The preferred long-term direction is to use the shared `sonar-rule-api` and
  `rspec-maven-plugin` stack rather than maintain a permanent SonarJS-only sync implementation.

## Non-Requirements

The following were not justified as requirements by the PR history:

- Running RSPEC generation twice for the same revision is not a requirement.
- Running `grpc:generate-proto` twice during `bbf` is not a requirement.
- Keeping a SonarJS-specific `sync-rspec.ts` implementation forever is not a requirement.
- Checking the latest RSPEC head during every local `npm run bbf` is not a requirement.
- Keeping a repo-local lifecycle stamp such as `resources/rule-data-state.json` is not a
  requirement.
- Keeping separate JavaScript and CSS user-visible pin inputs is not a requirement.

## How To Use This Document

When changing the RSPEC sync implementation, verify that the new design still:

- works from a clean checkout after `npm ci`
- keeps the default local `bbf` path fast and offline when local metadata is already present
- provides one explicit RSPEC refresh path for latest or pinned workflows
- supports normal local auth without custom repo-specific setup
- prepares reusable outputs for both JavaScript and CSS
- keeps CI on a single explicit prepare-then-reuse path
- preserves the single-root-pin model and prevents stale pinned output reuse across pin changes
- preserves pinning, traceability, and output compatibility
