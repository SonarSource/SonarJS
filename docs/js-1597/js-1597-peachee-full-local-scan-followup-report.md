# JS-1597 Full Peach Local Scan Follow-Up Report

This report complements the earlier targeted-project report in
`docs/js-1597/js-1597-supported-tool-generated-detection-report.md`.

The earlier report focused on the previously selected supported-tool projects.
This follow-up adds findings from the completed 254-project `peach-local-scan`
run on the current `fix-generated-code-detection` branch.

## Executive Summary

- The current branch is conservative and looks good on precision.
- The local scan produced no observed generated-source false positives at the
  project/file-classification level.
- The main weakness is coverage, not overreach.
- The strongest observed false negatives are `fxa-auth-server` and
  `fxa-content-server`.
- Partial suppression is expected and currently behaves as implemented: generated
  files only skip rules with `skipOnGeneratedSource = true`.

## Full-Scan Findings

### Scan-level totals

From the completed local run:

- `254` projects scanned successfully
- `251` projects emitted generated-source observability lines
- `6` projects had at least one detected generated-source family
- `5` projects had tagged generated files
- `630` files were resolved as generated candidates
- `596` files were tagged as generated and analyzable
- `34` files were excluded by analysis scope
- `0` files were reported as out-of-scope

Interpretation:

- `0` out-of-scope files is the strongest precision signal from the run
- the current implementation appears conservative rather than noisy

### Detected projects

Observed generated-source detections:

| Project         | Family                                | Resolved | Tagged | Excluded | Notes                        |
| --------------- | ------------------------------------- | -------: | -----: | -------: | ---------------------------- |
| `apollo-client` | `@graphql-codegen/cli`                |      `2` |    `2` |      `0` | expected detection           |
| `apollo-server` | `@graphql-codegen/cli`                |      `1` |    `0` |      `0` | ignored because only `.d.ts` |
| `grpc-node`     | `proto-loader-gen-types`              |    `606` |  `577` |     `29` | largest direct impact        |
| `keystone`      | `@graphql-codegen/cli`                |      `4` |    `4` |      `0` | expected detection           |
| `nextjs`        | `@graphql-codegen/cli`                |      `8` |    `8` |      `0` | expected detection           |
| `rsschool-app`  | `@openapitools/openapi-generator-cli` |      `5` |    `5` |      `0` | expected detection           |
| `tape`          | `@graphql-codegen/cli`                |      `5` |    `0` |      `5` | detected but excluded        |

### Remaining issues on detected files

The tagged-file intersections with the fetched `issues.json` artifacts show:

| Project         | Tagged files | Remaining issues on tagged files | Main remaining rules                                                           |
| --------------- | -----------: | -------------------------------: | ------------------------------------------------------------------------------ |
| `apollo-client` |          `2` |                              `0` | none                                                                           |
| `keystone`      |          `4` |                              `0` | none                                                                           |
| `nextjs`        |          `8` |                              `4` | `typescript:S6571`                                                             |
| `rsschool-app`  |          `5` |                              `0` | none                                                                           |
| `grpc-node`     |        `577` |                             `63` | `typescript:S4323`, `typescript:S6598`, `typescript:S1128`, `typescript:S1874` |

Interpretation:

- suppression is selective, not full-file suppression
- this matches the implementation in
  `packages/analysis/src/jsts/linter/filters/filter-generated-source.ts`
- the current behavior is consistent with the design, not a malfunction

## False Negatives

### Strong supported-family false negatives

Two strong misses were confirmed:

- `fxa-auth-server`
- `fxa-content-server`

Both projects have:

- `@graphql-codegen/cli` in `package.json`
- a committed `libs/shared/cms/codegen.config.ts`
- committed generated files under `libs/shared/cms/src/__generated__/`
- the GraphQL invocation declared in Nx `project.json`, not in `package.json`

The current runtime discovery does not inspect `project.json`, so these
projects are missed even though the generated files are committed.

### Important nuance about `codegen.config.ts`

The current GraphQL detector fallback list includes:

- `codegen.yml`
- `codegen.yaml`
- `codegen.json`
- `codegen.ts`
- `codegen.js`

It does not include `codegen.config.*`.

That naming gap is real, but it is not the only blocker for the `fxa-*`
projects. Patch 2 alone does not fix those two strongest misses, because the
runtime discovery still never looks at the Nx `project.json` command that points
at `libs/shared/cms/codegen.config.ts`.

### Non-priority miss candidate

`adamant-im` contains OpenAPI generator evidence, but the current project shape
wraps generation in a custom script rather than exposing a direct
`openapi-generator-cli generate` task invocation. That looks like a larger,
separate enhancement and is not the recommended next patch.

## Precision Assessment

Current evidence points to good precision:

- no observed out-of-scope tagging
- no observed wrong-family tagging in the local run
- excluded files in `tape` and `grpc-node` were explainable by analysis scope
  rather than detector noise

Based on this run, the immediate priority should be improving narrow coverage
without broadening heuristics aggressively.

## Proposed Simple Adjustments

### Patch 1: inspect `project.json` task invocations

Proposed change:

- extend generated-source task discovery to read Nx-style `project.json`
  commands, especially `targets.*.options.command`

Why:

- this directly addresses the strongest observed false negatives
- it is the missing link for `fxa-auth-server` and `fxa-content-server`
- the test suite already contains a focused negative test documenting the
  current limitation

Expected effect:

- should fix the `fxa-*` GraphQL misses
- may also unlock other supported-family hits that are currently hidden behind
  Nx command wrappers

Estimated change size:

- production code: small to medium, roughly `80-140` lines
- tests: roughly `40-80` lines
- total patch size: roughly `120-220` lines

Risk:

- low to moderate
- localized to task discovery and test expectations
- needs careful narrowing so arbitrary `project.json` data is not overread as a
  command source

### Patch 2: support `codegen.config.*` fallback names

Proposed change:

- extend GraphQL fallback and watched config basenames to include:
  - `codegen.config.ts`
  - `codegen.config.js`
  - `codegen.config.mts`
  - `codegen.config.cts`
  - `codegen.config.mjs`
  - `codegen.config.cjs`

Why:

- this is the simplest low-risk fix
- the detector already parses these extensions when they are explicitly pointed
  to via `--config`
- the gap is only in fallback basename discovery and watched filename coverage

Expected effect:

- fixes same-directory GraphQL projects that rely on `codegen.config.*`
  fallback naming
- improves cache invalidation coverage for those filenames
- does not by itself fix the `fxa-*` misses

Estimated change size:

- production code: tiny, roughly `6-12` lines
- tests: roughly `20-50` lines
- total patch size: roughly `30-60` lines

Risk:

- low
- no heuristic broadening beyond a well-known GraphQL Codegen naming variant

### Optional later step: rule-level follow-up, not blanket suppression

After the discovery gaps are closed, the next useful review is a narrow
rule-level pass on the remaining generated-file issues, especially:

- `typescript:S6571` in detected `nextjs` files
- `typescript:S4323`
- `typescript:S6598`
- `typescript:S1128`
- `typescript:S1874` in detected `grpc-node` files

This should be handled as a deliberate rule review, not as blanket full-file
suppression.

## Recommendation

Recommended order:

1. land Patch 2 now because it is tiny and safe
2. decide separately on Patch 1, because Patch 1 is the change that actually
   addresses the strongest observed full-scan false negatives

That order keeps risk low while making it explicit that Patch 2 is an
incremental cleanup, not the full fix for the `fxa-*` misses.
