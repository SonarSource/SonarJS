# Ag-grid TS7 benchmark

Date: 2026-10-13. Status: issue-count/line parity passed across three repeats.

For the newer owned TS6 adapter/gateway versus actual current master, see the
[2026-10-15 comparison](unified-ts6-master-ag-grid.md). The classic timings below belong
to the earlier comparator, not that new adapter.

## Inputs

- Ruling project: `ag-grid` 9.1.0, existing SonarJS ruling source checkout.
- Sources revision: `81a52e2c0180fc6e555b2c3efc44729fb46539d9`.
- SonarJS benchmark base: `a2b9a58b22739f0a87f7edb3f78ce03dcf248a6e`, plus uncommitted prototype changes.
- Compilers: TS6 6.0.3 comparator and TS7 7.1.0-dev.20261012.1 native API.
- All 157 eligible source roots in the project's `tsconfig.json`; no file cap.
- 1,085 actual ruling rule/language configurations, 582 distinct rule keys;
  generated using metadata scopes/languages/blacklisted extensions and the
  repository's pure `applyRulingConfig` helper (including S124/S1451/S1192 parameters).
- `--restrict-node-modules`: outside-project node_modules are blocked except compiler libraries.
- Local project node_modules absent. No install or source checkout modification performed.
- MAIN role only: tsconfig selects `src/ts`, not `spec` or prebuilt JavaScript.

This is the two-backend harness running a ruling project's configured TypeScript
sources. It is not the complete scanner ruling, nor a comparison against the
stored CI expected results (which include different discovery/file roles).

## Result

Both backends produced **6,524 issues at identical lines** in each of three fresh
worker runs. Files, source hashes, active rules, and within-backend stability all
matched. No recorded unsupported operations or checker failures.

| Median phase     |  Classic |   Native |
| ---------------- | -------: | -------: |
| Program setup    |  0.457 s |  0.260 s |
| Parsing/prefetch |  0.835 s |  1.489 s |
| Linting          | 10.983 s | 13.366 s |
| Total analysis   | 12.383 s | 15.228 s |
| Worker wall time | 20.226 s | 23.624 s |

Native/classic median analysis ratio: **1.230**, approximately **23% slower**.
Native analysis range: 13.726-21.148 s; classic: 12.187-13.127 s. The third native
run was notably slower. Three samples with an uncontrolled OS filesystem cache
are insufficient for a firm general-performance claim. Phase medians need not
sum to the median total.

Each native run made 23,976 SDK requests, sent about 13.97 MB and received about
39.95 MB. Median SDK round-trip total was 3.115 s, reported server time 1.222 s,
and reported transport overhead 1.893 s. These are SDK accounting categories,
not a complete isolation of IPC versus AST conversion/adapter costs. Nested
filesystem waits can be counted as server time. Filesystem callbacks were only
about 0.05-0.08 s in this project, unlike the original adapter's directory hotspot.
Combined Node+Go end-of-analysis RSS samples were approximately 1.22-1.24 GB;
these are samples, not combined peak memory.

## Gap found and fixed

The initial complete benchmark failed parity: classic 6,524 issues, native 6,487.
All 37 missing issues were S125 (commented-out code). S125 calls the current
parser's syntax-only `parse()` on fragments, whereas the initial owned-program
adapter only implemented `parseForESLint()` and required matching program text.

The adapter now implements a separate native syntax-only path. It creates and
disposes a temporary no-lib/no-resolve/no-emit native program in a full VFS,
retrieves syntactic diagnostics, and reuses the upstream native node adapter and
installed ESTree converter. It supplies ESLint's required tokens/comments/range/loc
and does not query a classic checker or mutate the main owned program.

An intermediate attempt lacked the mandatory tokens array and failed explicitly;
its report was preserved separately. After matching the parser contract, all 37
S125 findings matched at their original lines. Added a parser regression and an
actual S125 finding to the all-rule archive record/replay integration test.
The complete 28-test suite passed after these changes.

## Local artifacts and rerun

Final output: `tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/`.
Contains summary, six worker reports/configurations/logs, LITS-style JSON,
`rules.json`, `prepare-ruling.mjs`, and source/input provenance.

The summary's custom-rule metadata was annotated after the run to identify the
actual ruling configuration rather than the unused default profile label; no
measurement or parity fields were changed. Future runs emit that metadata directly.

From the benchmark worktree in cmd:

```bat
node --import ./packages/analysis/src/jsts/native/compatibility.mjs --import tsx tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/prepare-ruling.mjs
npm run ts7:benchmark -- --project C:\Users\victor.diez\projects\SonarJS\its\sources\projects\ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 3
```

Original failed reports remain in `out/ruling-ag-grid-20261013/` (S125 omissions)
and `out/ruling-ag-grid-20261013-fixed/` (intermediate missing-token failure).
Output directories are ignored by Git; this document preserves the main findings.

## Performance attribution follow-up

Date: 2026-10-13. Same project, ruling configuration, compiler versions and source
revision. No rule or adapter optimizations applied in this follow-up: only opt-in
benchmark instrumentation. All **14 worker runs** (six baseline, six metrics,
two CPU-profile) produced the same 6,524 issue lines, source hashes, file list,
and active rules. All native metrics runs exactly matched the SDK's request,
round-trip, and byte counters. Existing batching/generators were not changed.

### Modes and overhead

| Mode                               | Repeats/backend | Classic analysis | Native analysis |
| ---------------------------------- | --------------: | ---------------: | --------------: |
| Baseline, no extra instrumentation |               3 |  11.694 s median | 14.819 s median |
| Method/rule metrics                |               3 |  12.500 s median | 16.208 s median |
| CPU sampling only                  |               1 |         13.927 s |        16.720 s |

Baseline native/classic ratio: 1.267 (about 27% slower); ranges 9.858-13.377 s
classic and 14.471-16.719 s native. Baseline phase medians: program 0.435/0.228 s,
parse 0.739/1.436 s, lint 10.439/13.064 s (classic/native).

Metrics medians were about 7%/9% higher than baseline, classic/native. This is
an observed difference between separate runs, not a controlled estimate of
instrumentation overhead: OS cache, GC and machine load remain uncontrolled.
CPU profiling also affects timing. Do not compare these modes as performance
improvements or use their memory samples as uninstrumented memory measurements.

### Physical requests

Each native metrics run made **23,976 requests**, including 405 `batchRequests`
exchanges and 137 bulk `getTypeAtLocations` exchanges. Median client round-trip
total: **3.188 s**; SDK server processing: **1.275 s**; SDK estimated transport
overhead: **1.913 s**. About 13.97 MB sent and 39.96 MB received.

Per-method medians (client timing, not per-method server timing):

| Method                   | Exchanges/run | Round-trip total |
| ------------------------ | ------------: | ---------------: |
| getSymbolAtLocation      |         8,835 |          0.941 s |
| getTypeAtLocation        |         6,973 |          0.627 s |
| batchRequests            |           405 |          0.297 s |
| getSuggestionDiagnostics |           157 |          0.243 s |
| getTypeAtLocations       |           137 |          0.213 s |
| createSnapshot           |           102 |          0.210 s |
| getSignaturesOfType      |         1,913 |          0.127 s |
| getReturnTypeOfSignature |         1,297 |          0.088 s |
| getTypeOfSymbol          |         1,142 |          0.082 s |

Scalar symbol/type lookups represent 66% of exchanges and approximately 49% of
round-trip total. Phase attribution: program 4 requests/~0.174 s; parse 126/~0.034 s;
lint 23,846/~2.985 s. Individual phase medians need not sum to the total median.
ASTs of referenced files can be fetched while rules run; those requests are
correctly charged to lint rather than the main-file parse phase.

The 405 batch exchanges carry **16,828 logical queries**: 8,834 contextual-type,
6,733 resolved-signature, 1,153 signature-parameter, and 108 symbol-type queries.
Mean batch size: 41.6; maximum: 768. These counts do not include the nodes inside
the separate bulk `getTypeAtLocations` endpoint. There is no measured latency
for each individual query within a batch. Batching is already operational.

### Rule attribution

Largest increases in exclusive instrumented callback time (medians):

| Rule                          | Classic |  Native | Increase | Native client RTT | Exchanges |
| ----------------------------- | ------: | ------: | -------: | ----------------: | --------: |
| S2817: Web SQL                | 0.030 s | 0.779 s |  0.748 s |           0.577 s |     5,843 |
| S6544: misused promises       | 0.178 s | 0.749 s |  0.571 s |           0.478 s |     5,239 |
| S2077: SQL query review       | 0.054 s | 0.541 s |  0.487 s |           0.378 s |     2,872 |
| S4325: unnecessary assertions | 0.056 s | 0.360 s |  0.304 s |           0.256 s |     2,394 |
| S3801                         | 0.017 s | 0.204 s |  0.187 s |           0.123 s |       377 |
| S3579                         | 0.007 s | 0.157 s |  0.150 s |           0.119 s |     1,252 |
| S125: comment fragments       | 0.067 s | 0.172 s |  0.105 s |           0.071 s |       404 |

S2817's 5,843 requests are all symbol lookups. S2077 makes 2,868 symbol lookups
plus four source-file fetches. S6544 is primarily type/signature/return-type
queries. S4325's costs include dependent/batched prefetch, not just its 253
listener invocations. S1874 is faster with native suggestion diagnostics:
0.842 s classic versus 0.259 s native callback time.

Both backends execute **3,227,372 listener invocations**. Median sum of exclusive
create/listener times: 8.716 s classic versus 11.634 s native. IPC is included in
these rule times, so they cannot be added to IPC totals. Attribution means the
rule that triggered work: another rule can benefit from its warmed cache or
prefetch. This is not the marginal cost of enabling that rule.

### CPU sampling

Independent 1 ms-requested V8 profiles collected 9,985/12,015 samples, classic/native.
Sampling interval is not guaranteed (especially with synchronous I/O on Windows).
The native profile's leading aggregated self samples were native `read` (~2.629 s),
`stat` (~1.375 s), `open` (~0.814 s), and `writeBuffer` (~0.467 s). Inspect call stacks
to distinguish pipe reads from normal file I/O; these are wall samples including
wait, not proof of equivalent Node CPU consumption. GC self samples were about
0.365/0.396 s, classic/native. Profiler start/stop itself appears in inspector
`post` samples (~0.25-0.29 s); this is a profiling artifact, not analyzer work.

Shared non-IPC hotspots are import rules S3863 (`import/no-duplicates`, ~1.62 s
native callback time) and S7060 (`import/no-self-import`, ~1.36 s), approximately
three seconds combined on both backends. CPU stacks corroborate repeated import
resolution and filesystem probes; `no-duplicates`' resolver accounts for ~1.68 s
inclusive in the native CPU profile. Native filesystem callback metrics only
cover Go's callbacks, not this separate ESLint resolver I/O.

Local adaptation is visible too: native node-view getter self samples ~0.124 s,
memo-entry lookup ~0.113 s, converter `convertNode` ~0.085 s, `getChildren` ~0.070 s.
These are selected self hotspots, not complete adapter totals. Native parsing's
~0.7 s baseline increase, versus ~0.034 s parse-attributed RPC, warrants examining
node adaptation/ESTree conversion and materialization, not just pipe latency.

### Optimization priorities

1. **Syntax gates before semantic queries.** S2817 currently looks up the callee
   symbol before testing whether the callee could be `openDatabase`. Check that
   syntax first. S2077 computes an FQN for every call before checking whether its
   first argument is questionable SQL: evaluate that cheap argument predicate
   first. Both are concrete SonarJS candidates; preserve shadowing checks for
   actual candidates. Net savings require A/B parity/timing because shared caches
   may move some remaining lookups to other rules.
2. **Symbol prefetch using existing bulk support.** The installed API supports
   `checker.getSymbolAtLocation(nodes)` and `.gen(nodes)` (SDK declaration lines
   821-825). Test selective per-file symbol prefetch analogous to existing type
   prefetch. Tune candidates/thresholds; do not eagerly query every node or
   introduce a cache spanning unrelated snapshots. No new upstream endpoint is
   needed for this experiment.
3. **Import resolution caching.** Investigate repeated negative filesystem probes
   and resolver observations in S3863/S7060, with per-analysis invalidation and
   archive replay compatibility. This benefits both compilers and is separate
   from native IPC callback optimization.
4. **Adapter and type-prefetch tuning.** Profile conversion and cached wrapper
   reuse; A/B existing type-prefetch thresholds. Checker methods are already
   memoized, so a blanket second checker cache is not justified by these results.
5. **S125 syntax-only lifecycle.** Only ~0.1 s added callback time here; lower
   priority than symbol lookups or import resolution.

These are follow-up experiments, not implemented or proven speedups. Missing
upstream batching is not the blocker. Synchronous dependency chains still have
a real IPC cost, and richer aggregate endpoints could help after redundant work
has been eliminated.

### Reproduce attribution

Use the same command/input as above with separate output directories:

```bat
npm run ts7:benchmark -- --project C:\Users\victor.diez\projects\SonarJS\its\sources\projects\ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 3 --output tools/ts7-benchmark/out/ruling-ag-grid-20261013-baseline
npm run ts7:benchmark -- --project C:\Users\victor.diez\projects\SonarJS\its\sources\projects\ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 3 --profile --output tools/ts7-benchmark/out/ruling-ag-grid-20261013-metrics
npm run ts7:benchmark -- --project C:\Users\victor.diez\projects\SonarJS\its\sources\projects\ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 1 --cpu-profile --output tools/ts7-benchmark/out/ruling-ag-grid-20261013-cpu
node tools/ts7-benchmark/analyze-performance.mjs tools/ts7-benchmark/out/ruling-ag-grid-20261013-metrics tools/ts7-benchmark/out/ruling-ag-grid-20261013-baseline tools/ts7-benchmark/out/ruling-ag-grid-20261013-cpu
```

The analyzer writes `performance-summary.json` in the metrics directory, verifies
cross-mode parity, ranks method/rule medians, and includes CPU self/inclusive
hotspots. Raw reports retain complete per-rule/per-method attribution and file
timings; CPU directories contain both `.cpuprofile` files. Use new output
directories for subsequent experiments rather than overwriting this evidence.

## Integrated Production Path Rerun

Date: 2026-10-15. Initialized `its/sources/projects` with
`git submodule update --init --recursive`, checking out the pinned source revision
`81a52e2c0180fc6e555b2c3efc44729fb46539d9` inside the task worktree. No project
dependency installation was needed. Regenerated the same 1,085 ruling
rule/language configurations from this worktree's metadata.

This rerun uses the integrated SonarJS production factory, native session and
normal parser builder, rather than the earlier tool-owned adapter pipeline.
All six workers (three/backend) passed: **157 files and 6,524 identical issue
lines**, with matching source hashes, active rules and repeat stability. Metrics
and CPU profiling were disabled.

| Median phase   |  Classic |   Native |
| -------------- | -------: | -------: |
| Program setup  |  0.672 s |  0.376 s |
| Parsing        |  0.977 s |  1.966 s |
| Linting        | 12.784 s | 18.755 s |
| Total analysis | 14.569 s | 21.189 s |
| Worker wall    | 25.962 s | 30.904 s |

Native/classic analysis ratio: **1.454**, about **45% slower** in this local
sample. Analysis ranges: 14.370-14.991 s classic and 19.372-21.555 s native.
These are fresh measurements, not a controlled before/after comparison with the
older prototype timings; OS cache, machine load and the integration changed.
Phase medians need not sum to the median total. This remains harness-level
issue-count/line parity, not full scanner ruling or full diagnostic/fix parity.

Reports: `tools/ts7-benchmark/out/ruling-ag-grid-20261015-integrated/`.

```bat
npm run ts7:benchmark -- --project its/sources/projects/ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 3 --output tools/ts7-benchmark/out/ruling-ag-grid-20261015-integrated
```

Vue clarification: the pre-migration builder already omitted programs/tsconfigs
when invoking the Vue parser. The integrated builder now preserves that
syntax-only behavior even if a native program is supplied; native Vue mapping
is not a feature-parity requirement. The added regression passes as part of all
39 focused tests.

## October 15 Compiler Upgrade

The compiler was subsequently upgraded to `7.1.0-dev.20261015.1`, keeping the
native adapters and rules unchanged. A fresh before/after comparison retained
6,524 identical issue lines across all 12 workers. Native median analysis was
18.394 s before and 19.001 s after; the unchanged classic control also slowed,
and native/classic ratios were 1.321 and 1.272. This does not demonstrate an
absolute speedup. See the
[upgrade report](C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/docs/ts7-benchmark/nightly-upgrade-20261015.md)
for exact revisions, phase timings, validation and uncertainty.
