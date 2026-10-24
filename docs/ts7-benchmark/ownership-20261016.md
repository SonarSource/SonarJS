# Whole-layer ag-grid comparison, 16 October 2026

This records the calibrated comparison for [JS-2643](https://sonarsource.atlassian.net/browse/JS-2643)
and [PR #8184](https://github.com/SonarSource/SonarJS/pull/8184), following section
16 of the [investigation document](https://docs.google.com/document/d/1G1qxZZReN8ZYEv_C4_wCgfD7_yBQC_ohxMr9IucDaNQ/edit).
The [ownership methodology](ownership.md) defines the exclusive sampled buckets,
host callback treatment, calibration and limits.

## Inputs and scope

- Apple M2 Pro, 10 logical CPUs, 32 GiB RAM, macOS Darwin 25.5.0, Node 24.16.0.
- SonarJS PR head `d72a6726edaab801b995399520eedfbe11b690c1`, plus the accounting
  implementation recorded by each run's candidate patch and source hashes.
- ag-grid 9.1.0 at jsts-test-sources revision
  `81a52e2c0180fc6e555b2c3efc44729fb46539d9`: all 157 selected files, 1,085
  rule/language configurations generated from the existing ruling helper.
- Private TS6 6.0.3, revision `050880ce59e30b356b686bd3144efe24f875ebc8`.
- Native SDK/compiler 7.1.0-dev.20261015.1 and WASM source revision
  `257e87406c6a8be277cb8cd5ef8d7b458a650390`; released parser 8.71.1.
- Native uses the published macOS arm64 executable, built with Microsoft's Go
  1.27.2 toolset. Its embedded revision matches the package, but its build metadata
  reports `vcs.modified=true`. WASM was built locally with standard Go 1.27.2 and
  the checked-in SonarJS overlay. This is a matching-revision comparison, not a
  reproducible-build or identical-toolchain claim.
- The same production `build` parser route, selected roots/options/references,
  source buffers, frozen rule configurations, and restricted node_modules policy
  apply to every backend. Compiler standard libraries remain exempt from that
  filesystem restriction.

Eight rounds rotate backend positions and then reverse the block. Each sampled
worker has an adjacent fresh control; their order alternates. Sampling requests
1 ms intervals. Tests, builds and other benchmarks were kept out of this batch.
This measures cold analysis in fresh Node workers, with filesystem/OS caches left
warm; it does not measure retained IDE updates or a cold machine. Analysis
excludes provider module initialization, cleanup, rich diagnostic normalization
and profile processing; raw reports retain initialization and worker-wall times
separately. Controls retain the existing SDK/Go timing facility but have no rule,
host or V8 profiling wrappers.

## Packaging correction

An initial smoke run produced 6,524 findings for TS6/IPC but 6,316 for both WASM
bridges. The npm SDK keeps its standard library declarations in its platform
package. The previous WASM builder copied only the SDK, leaving `sdk/lib` without
those declarations. The builder now resolves the SDK's own executable location,
checks the platform version/revision, copies the declarations, and records their
hashes. Both WASM bridges then recovered all missing findings and passed the full
normalized diagnostic comparison. A production-path test resolves an array
method's return type to prevent this omission from passing a syntax-only fixture.

The first timing batch was stopped after profiles exposed rich-diagnostic sorting
inside the analysis interval. That reporting work now runs after measurement.
Only the restarted batch is used below. Earlier smoke/interrupted artifacts remain
available for investigation and are excluded from the reported distributions.

## Results and calibrated timing

All accepted workers preserve the same 157 files and 6,524 findings, including
full normalized messages, primary/secondary locations, fixes and suppressions.
Source hashes, active rules, roots/options/references and cross-mode diagnostics
match. This covers the exercised corpus; it is not exhaustive semantic parity.

The original eight-round batch has one instrumentation-only failure: TS6 round
5's V8 profile contains a -41 µs timestamp delta. Its findings still match. The
post-processor now orders reconstructed timestamped events, exposes inversion
statistics and rejects inversions exceeding one sampling interval. This change
and saving the analysis timeline occur outside the measured analysis interval.
The affected **entire control/sample pair** was rerun after the batch. The report
uses those two valid retry workers for TS6 round 5 and retains the other 62
original workers. The original batch remains marked failed; a separate assembled
directory records every source report and hash in `manifest.json`. No valid
timing outlier was discarded. The repair pair ran at the end, so the accepted
sample has a small departure from the intended balanced order.

Eight accepted pairs per backend; seconds as median [min–max]:

| Backend      | Control analysis       | Sampled analysis       | Sampled consumer    | Sampled whole TS layer | Unattributed        | Paired sampled/control ratio |
| ------------ | ---------------------- | ---------------------- | ------------------- | ---------------------- | ------------------- | ---------------------------- |
| TS6          | 5.704 [5.592–5.844]    | 5.918 [5.800–6.118]    | 4.282 [4.214–4.403] | 1.317 [1.243–1.349]    | 0.331 [0.303–0.366] | 1.04 [1.01–1.06]             |
| IPC          | 6.668 [6.573–6.716]    | 6.864 [6.827–6.958]    | 4.465 [4.412–4.486] | 2.029 [1.934–2.086]    | 0.398 [0.369–0.438] | 1.03 [1.02–1.05]             |
| WASM syscall | 11.351 [11.106–11.715] | 11.498 [11.272–12.378] | 4.889 [4.784–5.119] | 5.577 [5.492–5.943]    | 0.999 [0.911–1.317] | 1.02 [0.97–1.08]             |
| WASM direct  | 13.264 [12.255–15.077] | 12.953 [12.425–15.254] | 5.540 [5.324–6.083] | 5.350 [5.189–5.976]    | 2.052 [1.830–3.195] | 1.02 [0.86–1.18]             |

Control medians put IPC about 17% above TS6, WASM syscall about 70% above IPC,
and WASM direct about 17% above syscall. Profiling ratios below one and the wide
direct-bridge range expose scheduling/GC/run variance; they are not negative
profiler overhead. Do not subtract one global overhead correction. Per-column
medians need not sum, while each worker's exclusive accounting reconciles.

Sampled phase medians in seconds:

| Backend      | Program creation | Parse | Lint   |
| ------------ | ---------------- | ----- | ------ |
| TS6          | 0.256            | 0.675 | 4.947  |
| IPC          | 0.070            | 1.086 | 5.714  |
| WASM syscall | 0.488            | 1.273 | 9.713  |
| WASM direct  | 0.483            | 1.634 | 10.784 |

The complete layer is materially larger than the SDK request timer. IPC's
sampled layer includes approximately 1.459 s in SDK frames, 0.446 s in owned
facade/adapters, 0.072 s in private TS6 helpers and 0.023 s in native integration.
WASM syscall additionally exposes about 4.090 s in WASM execution and 0.248 s in
the Go host shim; the direct variant shows 3.908 s and 0.029 s respectively.
These are component medians, not independent additive measurements.

Nested SDK/Go timers from the **controls**, milliseconds by median:

| Backend      | SDK exchanges | Round trip | Go handler | Boundary remainder |
| ------------ | ------------- | ---------- | ---------- | ------------------ |
| IPC          | 23,728        | 968        | 553        | 415                |
| WASM syscall | 23,728        | 4,642      | 2,755      | 1,878              |
| WASM direct  | 23,728        | 4,141      | 3,373      | 801                |

The direct bridge reduces the measured boundary remainder by about 57% here,
but total analysis gets slower. SDK/Go medians have separate scopes and do not
exactly subtract; they overlap the whole-layer buckets. A lower remainder is
insufficient evidence to change the default bridge.

## Remaining outside-layer gap

The separate one-round diagnostic run also passes full result parity and SDK
counter reconciliation. Every backend invokes 3,227,372 rule listeners, with
identical per-rule creation/listener count vectors. All Go variants have the
same per-method query counts and batch counters: 405 batches containing 16,828
logical queries. These are queries inside batches, not an exhaustive count of
all semantic operations or cache accesses.

Selected SDK costs from that diagnostic run, milliseconds (single observations,
with extra instrumentation; use the control table above for runtime comparisons):

| Method                     | Calls | IPC | WASM syscall | WASM direct |
| -------------------------- | ----- | --- | ------------ | ----------- |
| `getSymbolAtLocation`      | 8,835 | 215 | 759          | 493         |
| `batchRequests`            | 405   | 158 | 784          | 781         |
| `getSuggestionDiagnostics` | 157   | 134 | 714          | 678         |
| `getTypeAtLocations`       | 137   | 117 | 594          | 745         |

The generated report includes per-method counts/bytes and per-rule callback
timings. Rule "exclusive" timers only subtract nested SDK round trips and still
contain facade/adapters, lazy work and conversion. They are not outside-layer
consumer measurements.

Sampled consumer medians exceed TS6 by 0.184 s for IPC, 0.607 s for syscall and
1.258 s for direct. **JS-side timing parity is not accepted.** The report has not
explained these gaps causally, and no cost is relabeled as compiler work merely
to make them disappear.

The IPC source differences are spread across module helpers, rule listeners,
traversal and parser utilities (largest individual median increases around
8–15 ms). WASM syscall's larger increases include ESLint's linter (+42 ms),
S4165 (+31 ms), Unicorn listener dispatch (+30 ms), esquery (+25 ms) and ESTree
conversion (+25 ms). Direct includes S4165 (+101 ms), ESLint's linter (+79 ms),
S1854 (+59 ms) and esquery (+49 ms). These identify paths to investigate;
sampling does not establish their cause or statistical significance.

V8 GC remains unattributed: median observed residency is 0.258 s for TS6, 0.331 s
for IPC, 0.893 s for syscall and 1.910 s for direct. Go/WASM runtime GC remains
inside WASM execution. This is not causal allocator attribution. The next
experiment should collect allocation/GC and per-path CPU evidence for those
consumer paths, keeping results, listener/query counts and compiler inputs fixed.
Object shapes, JIT effects and backend allocation pressure remain hypotheses.

Filesystem workloads also remain visible: each provider makes 204 `readFile`
calls. TS6 returns 3,989,834 UTF-8 bytes; all Go variants return 4,033,500.
IPC makes 285 `fileExists`, 143 `directoryExists` and 46 `realpath` callbacks;
WASM has roughly 187–188, 29 and zero respectively. Some WASM existence counts
vary between runs. Equal finding counts do not imply identical filesystem work.
Exact per-worker counts, bytes and inclusive host durations are retained; the
inclusive host duration must not be added to sampled exclusive totals.

## Validation

- All 89 focused TS7/provider/benchmark tests passed with the WASM artifact enabled.
- All 15 selected production and channel tests passed with the direct WASM bridge.
- Bridge compilation and bundling passed; changed sources pass formatting and
  whitespace checks.
- The assembled calibrated report and separate diagnostics pass full normalized
  result parity; SDK counters reconcile. The original failed profiler sample is
  preserved, as described above.

## Reproduction and raw evidence

Raw evidence is under ignored `tools/ts7-benchmark/out/` directories:

- `ownership-ag-grid-final-v2/`: original calibrated controls, sampled reports,
  raw V8 profiles, compiler/corpus/machine provenance and candidate patch. Its
  summary retains the instrumentation failure described above.
- `ownership-ag-grid-retry/`: the valid replacement TS6 pair, plus an IPC pair
  used to verify cross-backend parity after the timestamp fix.
- `ownership-ag-grid-comparison/`: the 64 accepted reports, source/hash manifest,
  assembly script and generated `comparison.json` / `comparison.md`.
- `ownership-ag-grid-diagnostics/`: separate instrumented query/rule diagnostics.
- `ownership-ag-grid-rules.json`: the frozen ruling configurations, SHA-256
  `dad8468dd5e96a0c73c7a855fff9eb6423b81ad330a6f42f3293f2c1ecf57f5b`.

The rule configurations come from `ts6-comparison-worker.mjs`'s `prepare` backend,
which extracts and executes the repository's pure `applyRulingConfig` helper.
They can also be recovered from any saved worker configuration's `ruleConfig`
field. No separate copy of the ruling policy is maintained.

After dependency preparation and a matching WASM build, set `CORPUS` to the
ag-grid checkout and `SONARJS_TS7_WASM` to the artifact directory, then run:

```sh
node tools/ts7-benchmark/benchmark.mjs --backends ts6,ts7,wasm,wasm-direct --runs 8 --rule-config tools/ts7-benchmark/out/ownership-ag-grid-rules.json --project "$CORPUS" --restrict-node-modules --layer-profile --calibrate --output tools/ts7-benchmark/out/ownership-ag-grid-final-v2
node tools/ts7-benchmark/benchmark.mjs --backends ts6,ts7,wasm,wasm-direct --runs 1 --rule-config tools/ts7-benchmark/out/ownership-ag-grid-rules.json --project "$CORPUS" --restrict-node-modules --profile --layer-profile --output tools/ts7-benchmark/out/ownership-ag-grid-diagnostics
node tools/ts7-benchmark/compare-performance.mjs tools/ts7-benchmark/out/ownership-ag-grid-final-v2 tools/ts7-benchmark/out/ownership-ag-grid-diagnostics
```

For this recorded run, the comparison's first argument is instead
`tools/ts7-benchmark/out/ownership-ag-grid-comparison`, assembled by its saved
`assemble.mjs` script using the retry policy documented above. A fresh run with
the corrected post-processor can use its original output directory directly.

Use fresh output names for another run. The harness refuses to overwrite earlier
results. Diagnostic timings are collected separately and do not replace control
timings. Historical Windows measurements used other hardware and an earlier
benchmark route; they cannot establish a speedup or regression against this run.
