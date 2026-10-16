# SonarJS TS7 benchmark

Runnable prototype for [JS-2643](https://sonarsource.atlassian.net/browse/JS-2643).
Current architecture: [one shared TypeScript module](../../docs/ts7-benchmark/single-typescript-module.md)
for SonarJS and dependencies; TS6 is the default provider, TS7 is experimental.
An [in-process WASM provider](../../docs/ts7-benchmark/wasm.md) is also runnable
with `--native-backend wasm` and a locally built, revision-matched compiler.
Use `--native-sdk <snapshot>` to compare the corresponding native IPC build.
The [agreed plan](../../docs/ts7-benchmark/plan.md) retains the original design
and records implementation findings. Run from this repository's worktree.

The [execution-path comparison](../../docs/ts7-benchmark/execution-paths.md)
diagrams master versus the current production integration, including the narrower
benchmark path and retained IDE sessions.

## Quick start

Dependencies are already installed in this worktree. For a fresh install use
`npm ci` with the configured trusted npm registry. Released typescript-eslint sees
the owned module's TS6 compatibility version, not the native SDK alias.
Node 24 is required (the harness uses synchronous module-resolution hooks).

```sh
npm run ts7:prepare
npm run ts7:test
npm run ts7:benchmark -- --rules all --runs 3
```

The default project is the included two-source-file fixture. To benchmark real SonarJS
sources with recommended rules:

```sh
npm run ts7:benchmark -- --project . --tsconfig packages/tsconfig.app.json --max-files 25 --runs 3
```

Omit `--max-files` to analyze every eligible root source. The limit affects files
linted, not program roots or dependencies. Programs remain full-sized.
For another project, supply its absolute directory and relative tsconfig path.
The worker always runs this worktree's SonarJS rule implementation.

## Inputs and reports

- `--project PATH`: project directory; defaults to the fixture.
- `--tsconfig PATH[,PATH]`: explicit configurations relative to the project.
- `--rules recommended|all|S1874,S4325,...`: recommended is the default. "All"
  means request all SonarJS rules; actual activation still follows SonarJS policy.
- `--rule-config PATH`: JSON array of SonarJS `RuleConfig` entries, overriding
  rule selection and allowing real rule parameters.
- `--runs N`: three by default; fresh workers, rotating backend order. For a
  balanced reversed block with N backends, use 2*N repetitions.
- `--backends ts6,ts7,wasm,wasm-direct`: compare selected providers in one run;
  requires TS6 and at least one other choice. The default remains a TS6/IPC pair.
  `--native-backend wasm` retains the older TS6/WASM pair and output names.
- `--max-files N`: analyze the first N sorted, eligible roots.
- `--fs callbacks|layer`: native callbacks by default; layer overlays selected
  source text while dependencies still use callbacks. This is not a full VFS.
- `--restrict-node-modules`: block outside-project node_modules resolution,
  with compiler library directories exempt.
- `--output PATH`: timestamped `tools/ts7-benchmark/out/` directory by default.
- `--profile`: benchmark-only per-method/phase/rule IPC aggregates, logical
  query counts inside batches, per-rule create/listener times, and per-file times.
- `--cpu-profile`: separate V8 sampling profile per worker (`*.cpuprofile`) and
  a top-self/top-inclusive summary in the worker JSON. Scope excludes module
  loading and cleanup; includes program setup, parsing, and rule execution.
- `--layer-profile`: exclusive sampled consumer/whole-TypeScript-layer/host/
  unattributed wall time, per phase, component, source and function. Writes the
  raw `*.ownership.cpuprofile` and exact host callback counts/returned bytes.
- `--allocation-profile`: separate diagnostic weighted JS allocation samples
  and GC events, including allocations collected during analysis.
- `--allocation-interval-bytes N`: 32768 by default; minimum 1024.
- `--sample-interval-us N`: 1000 by default; 100–10000. Smaller intervals add
  overhead. This changes sampling resolution, not an accuracy guarantee.
- `--calibrate`: pair every instrumented worker with a fresh uninstrumented
  control; alternate control/instrumented order between rounds.
- `--archive-mode record|replay` and `--archive-dir PATH`: actual SonarJS
  filesystem-hook archives, separately recorded for each backend/run.

Example record and strict replay, with identical run count and inputs:

```sh
npm run ts7:benchmark -- --rules recommended --runs 1 --archive-mode record --output tools/ts7-benchmark/out/record
npm run ts7:benchmark -- --rules recommended --runs 1 --archive-mode replay --archive-dir tools/ts7-benchmark/out/record/archives --output tools/ts7-benchmark/out/replay
```

Do not reuse an output directory with different inputs. Reports contain worker
configuration, logs, JSON metrics, a `summary.json`, and per-backend LITS-style
`<language>-<rule>.json` files (issue line arrays per file). Replay uses the actual
hook and fails on unrecorded compiler reads; compiler library directories are
passthrough, so archives are not hermetic compiler installations.

Exit 0 requires valid/stable runs and matching files, source hashes, active rules,
compiler inputs, issue line arrays, and complete normalized issue objects,
including messages, columns, secondary locations, fixes and suppressed issues.
Duplicate multiplicity is preserved; only issue ordering and root file paths
are normalized. Exit 2 signals failed parity
or unsupported/checker operations. Other failures are nonzero too; inspect logs.
A caught unsupported checker error still invalidates the native run.
The richer gate checks exercised outputs; it does not prove exhaustive semantic
equivalence or cover suppressions/fixes absent from the corpus. The harness does
not hide mismatches or replace failed native queries
with a classic checker.

## Performance instrumentation

For the full-layer comparison, build the matching WASM artifact first, set
`SONARJS_TS7_WASM` to its absolute directory, and run sequentially:

```sh
node tools/ts7-benchmark/benchmark.mjs --backends ts6,ts7,wasm,wasm-direct --rules all --runs 8 --layer-profile --calibrate --output tools/ts7-benchmark/out/layer-comparison
node tools/ts7-benchmark/compare-performance.mjs tools/ts7-benchmark/out/layer-comparison
```

The command defaults to the small fixture. Supply identical `--project`,
`--tsconfig`, `--rule-config` and filesystem policy for a real corpus. Results
include `comparison.md`, `comparison.json`, raw profiles, controls, diagnostic
differences, code/corpus/toolchain provenance and the candidate patch hash.
Output directories containing earlier results are rejected.

Use uninstrumented controls for end-to-end speed comparisons. The ownership view
uses the innermost source frame, including compiler-backed getters/iterators and
adapters, so a parser callback inside a compiler traversal remains consumer work,
and compiler reentry returns to the TS layer. Builtins inherit their nearest
classified caller. GC, unknown sources, long sampling gaps and the unsampled tail
remain visible. These are sampled elapsed-stack estimates, **not exact per-method
timings or CPU use**. Host callback durations and SDK timers are nested and must
not be added to those exclusive totals. Outside-layer parity is not automatically
accepted by the reporter. See [ownership accounting](../../docs/ts7-benchmark/ownership.md).
The [16 October comparison](../../docs/ts7-benchmark/ownership-20261016.md) records
the calibrated ag-grid results and the remaining outside-layer timing gap.

`--profile` can be combined with `--layer-profile` in a **separate diagnostic
run** to obtain query/rule counters and whole-layer attribution together. Pass
that directory as a second argument to `compare-performance.mjs` to verify its
result parity against the calibrated comparison. Collect allocation/GC evidence
separately before asserting causal ownership of an outside-layer difference.

Add `--allocation-profile` to a separate diagnostic run to collect weighted V8
allocation samples, including objects collected by minor and major GC, plus GC
event durations. `--allocation-interval-bytes` defaults to 32768 (minimum 1024).
Each `*.heapprofile.json` retains the raw heap sampling tree and GC events;
`allocations` in the worker report contains exclusive source ownership and the
largest allocation stacks. The comparison reporter includes allocation/GC
distributions when the second directory contains these diagnostics. These are
estimates of JS allocations, excluding Go allocations and WASM linear memory;
GC duration does not identify the allocator responsible for a pause. Keep these
runs separate from the controls used to compare speed.

Every benchmark worker binds the compiler gateway before resolving its static
consumer imports. Reports require a healthy shared facade and observed imports
from both SonarJS and typescript-eslint. Static production-import auditing and
runtime/bundle regressions also cover aliases and physical compiler checkouts
outside `node_modules`.

Every provider creates programs through the same production `createStandardProgram`
factory and `IncrementalCompilerHost`. Backend selection happens inside the owned
`ts.createProgram`; the worker never constructs private native programs directly.
The host uses the selected provider's standard-library directory.
`typescript/control` supplies optional instrumentation settings and copied program
metrics without exposing SDK APIs, raw programs or native sessions.

The [interface and allocation report](../../docs/ts7-benchmark/interface-20261016.md)
records the corrected common-factory comparison, isolated gateway experiment and
remaining consumer/GC gap. No rule or rule-helper changes were made for that work.

Run three independent modes with the same inputs and distinct output directories:

```sh
npm run ts7:benchmark -- --rules all --runs 3 --output tools/ts7-benchmark/out/baseline
npm run ts7:benchmark -- --rules all --runs 3 --profile --output tools/ts7-benchmark/out/metrics
npm run ts7:benchmark -- --rules all --runs 1 --cpu-profile --output tools/ts7-benchmark/out/cpu
```

`profile.methods` counts physical SDK exchanges, including `batchRequests`.
`profile.batches.methods` counts logical queries within batches, not additional
pipe exchanges. Batch counts have no individual-query latency measurement.
`profile.ruleMethods` attributes exchanges to the synchronously active outer
SonarJS rule callback (including its delegated helpers/rules); prefetch triggered
by that rule is charged to that rule, even if other rules later benefit.
Requests outside callbacks remain in phase/method totals, not rule totals.
`profile.matchesSdkTotals` must match request count, latency, and both byte
counters exactly for successful native runs; the hook sends no extra requests.

Rule `createMs`/`listenerMs` are inclusive wall times, not pure JavaScript CPU.
`exclusiveMs` excludes nested instrumented callbacks; IPC triggered by callbacks
is still included, so never add rule times to IPC times. File lint times include
ESLint traversal, rule selection, and issue transformation as well as callbacks.
SDK round-trip timing does not cover all JS request serialization, response
JSON parsing, AST materialization, or facade conversion; see the CPU profile.
Server processing and estimated transport overhead are available only as SDK
aggregates, not complete per-method/per-rule breakdowns.

Instrumentation changes allocation and callback overhead. Compare baseline
timings with baseline timings, not against instrumented modes. V8 samples also
include blocked synchronous pipe reads and GC, not just Node CPU consumption.
CPU `topSelf` aggregates identical function locations across stacks;
`topInclusive` retains individual stack frames and is not additive. Line/column
numbers in CPU frames are zero-based. Open the `.cpuprofile` in a compatible
DevTools profiler for flame graphs. Profiles can contain local source paths.
Inspector start/stop can itself appear in samples; do not attribute that work to
SonarJS. The profile duration may therefore slightly exceed measured analysis.

To compare complete runs and rank median method/rule costs:

```sh
node tools/ts7-benchmark/analyze-performance.mjs tools/ts7-benchmark/out/metrics tools/ts7-benchmark/out/baseline tools/ts7-benchmark/out/cpu
```

This writes `performance-summary.json` into the metrics directory and verifies
issue/file/source/rule parity across modes. The optional third directory adds
CPU-profile summaries. See the [ag-grid attribution results](../../docs/ts7-benchmark/ag-grid.md#performance-attribution-follow-up).

## Architecture

The active integration uses the [single owned TypeScript module](../../docs/ts7-benchmark/single-typescript-module.md).
Both backends use unchanged typescript-eslint 8.71.1, matching master.
The normal SonarJS factory supplies programs; the released parser supplies ESTree
conversion, maps and scopes. Native compiler translation is owned in
packages/typescript/compat (MIT provenance retained), not in a parser fork.
There is no PR fetch, native parser bundle or native:prepare step.

The ts7:prepare script generates module exports/compiler translation and SonarJS
metadata/protobuf files. Native programs and checker answers come from Go through
typescript-native/sync; local syntax/config utilities currently use private TS6.
Filesystem archive and retained IDE session handling live in production
packages/analysis/src/jsts/native. This directory contains the benchmark harness,
not a replacement analyzer.

## Source-built SDK comparisons

To test an upstream PR without replacing installed dependencies, build both its
base and head with the same Go toolchain and build flags in the upstream checkout:

```powershell
$env:PATH = 'C:\Users\victor.diez\sdk\go1.27.2\go\bin;' + $env:PATH
npx hereby build
npx hereby build:api
```

From this SonarJS worktree, snapshot each revision into a new ignored directory:

```powershell
node tools/ts7-benchmark/package-source-sdk.mjs C:/Users/victor.diez/projects/TypeScript tools/ts7-benchmark/out/my-experiment/base-sdk <exact-base-revision> base
$env:SONARJS_TS7_SDK = (Resolve-Path tools/ts7-benchmark/out/my-experiment/base-sdk).Path
$savedNodeOptions = $env:NODE_OPTIONS
$env:NODE_OPTIONS = ('--import=file:///C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/tools/ts7-benchmark/source-sdk.mjs ' + $savedNodeOptions).Trim()
try {
  npm run ts7:test
  npm run ts7:benchmark -- --project its/sources/projects/ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 3 --output tools/ts7-benchmark/out/my-experiment/base
} finally {
  $env:NODE_OPTIONS = $savedNodeOptions
  Remove-Item Env:SONARJS_TS7_SDK
}
```

Repeat for the PR head, using a separate SDK and output directory. Do not set this
loader while building upstream: that build needs its own development compiler.
The preload redirects native `typescript/*` exports (including package metadata),
not bare `typescript`, which remains the classic compatibility API. Child workers
inherit it through `NODE_OPTIONS`; the installed nightly and adapter stay unchanged.
The snapshot pairs the built JS SDK with its matching executable and all compiler
libraries, including `lib.d.ts`. Its only SDK runtime patch locates that copied
executable. Local `noembed` builds should be compared to matched local builds,
not attributed directly against differently packaged published binaries.

See [PR #64823 results](../../docs/ts7-benchmark/pr64823-source-build.md).

## Measurements and limits

Reports separate selection, program setup, parsing/prefetch, linting, and total
analysis. Worker wall time also includes module loading, report creation and
memory sampling. Native detail includes API initialization, option conversion,
snapshot creation, SDK IPC request/byte/time counts and callback metrics.

The SDK's server time can include waiting for nested JS filesystem callbacks;
`transportOverheadMs` is not the entire cost of choosing IPC. Callback totals
are part of request time, not additional disjoint durations. Parsing includes
prefetch and AST conversion. Node maximum RSS and an end-of-analysis Go RSS
sample are recorded. Combined sampled RSS is **not combined peak memory**.
Workers are fresh but OS filesystem caches are not reset: these are alternating
runs, not guaranteed cold-cache measurements.

Current scope is configured batch JS/JSX/TS/TSX root files and MAIN role.
No Vue extraction, orphan grouping, automatic scanner discovery, IDE updates,
program-selection archive restoration, or full scanner invocation is included.
Project references are passed through but complex reference graphs need separate
coverage. Archive library passthrough and compiler 6/7 libraries differ; parity
is not a claim that every transitive program input is identical.

The production SonarLint integration now retains native sessions across requests
and updates snapshots using filesystem layers and targeted notifications. The
earlier stale synthetic test forced case-sensitive paths on Windows; updates
work with the platform's normal case-insensitive semantics. Production tests
exercise successive IDE requests and dependency edits/deletion/recreation. This
batch benchmark does not measure IDE incremental performance.
Normal `npm run bbf` uses the integrated production preparation/build path.
Production packaging migration is not complete; see the native source README.

## Verified runs (2026-10-12)

- 27 tests pass, including real filesystem record/replay and parser/map regressions.
- Fixture, all-rule selection, three repeats: 11 issues at identical lines.
- SonarJS `packages/tsconfig.app.json`, 25 analyzed files, recommended profile,
  three repeats: 19 issues at identical lines; files, source text, active rules,
  and within-backend stability match. No unsupported/checker failures recorded.
- Callback-mode medians: classic analysis 6.436 s, native analysis 6.351 s (0.987x).
  Classic/native worker wall medians: 13.838 s / 14.115 s. Do not extrapolate
  these bounded results to a full scan or interpret them as a compiler speedup.
- The final native third run made 2,465 SDK requests and received about 16 MB;
  directory callbacks consumed 0.249 s after indexing (previously 16.53 s).
  Combined Node+Go sampled RSS was about 1.02 GB, not a combined peak.

Local reports: `out/sonarjs-25-final/summary.json` and
`out/fixture-all-final/summary.json`. Outputs are ignored by Git.

The source-layer variant also passed on the same 25-file sample:
`out/sonarjs-25-layer-final/summary.json` (one run; 19 matching issues).

The all-rule selection also passed on the real 25-file sample: 313 matching
issues, no unsupported/checker failures (`out/sonarjs-25-all-final/summary.json`).
This broader profile was measured once (classic 6.177 s, native 6.399 s).

## Ruling project run (2026-10-13)

[Ag-grid results](../../docs/ts7-benchmark/ag-grid.md): all 157 configured TS roots,
actual ruling rule parameters, three repetitions, 6,524 matching issues/lines.
Native median analysis 15.228 s vs classic 12.383 s (about 23% slower), with
noticeable timing variability. This is not the complete scanner ruling.

The run found and fixed S125's syntax-only comment-fragment parsing path; it uses
a temporary native program/VFS and the existing ESTree converter, not a classic
checker fallback. The all-rule archive integration test now exercises this path.
The complete updated test suite has 28 passing tests.
