# PR #64823 Source-Build Test

Date: 2026-10-15. Status: source builds and focused integration tests pass;
ag-grid issue-count/line parity retained. Smaller IPC payload demonstrated,
but no end-to-end speedup demonstrated in this experiment.

## Scope And Builds

Test [TypeScript #64823](https://github.com/microsoft/TypeScript/pull/64823)
against its exact merge base, using matched local source builds rather than a
published nightly versus a locally compiled PR.

| Component                    | Revision Or Version                        |
| ---------------------------- | ------------------------------------------ |
| TypeScript base              | `257e87406c6a8be277cb8cd5ef8d7b458a650390` |
| TypeScript PR head           | `6619cbaa989715a74dd2ce8fabd1e4535e5b1d36` |
| Go toolchain                 | `go1.27.2 windows/amd64`                   |
| Classic comparator           | `typescript-classic@npm:typescript@6.0.3`  |
| Released typescript-eslint   | `8.71.1`                                   |
| Vendored native adapter      | `30d55234e6d719d3386884c3eef5c3a6c9d255f3` |
| Installed nightly, unchanged | `typescript@7.1.0-dev.20261015.1`          |
| SonarJS worktree base        | `a2b9a58b22739f0a87f7edb3f78ce03dcf248a6e` |

SonarJS retains the existing uncommitted production integration. No rule or
adapter changes were needed for this PR. The process tracker now recognizes
`--api` invocations outside published `@typescript` package paths, allowing RSS
sampling of a source-built executable.

The canonical upstream clone is `C:\Users\victor.diez\projects\TypeScript`.
It was tested at detached base/head revisions and returned clean to `main`.
No upstream worktree or source patch was created.

Go is installed at `C:\Users\victor.diez\sdk\go1.27.2\go\bin\go.exe`.
The official ZIP SHA-256 was verified against Go's download metadata:
`1314008898bd40df77af4b014f777f08873dbdfbcd3d92308728ee03304fe04f`.
Build commands prepend this SDK to process-local `PATH`; the machine's default
Go installation and persistent environment were not changed.

Both revisions used:

```powershell
npx hereby build
npx hereby build:api
```

Binary metadata confirms Go 1.27.2, `-tags=noembed`, `CGO_ENABLED=0`, Windows amd64,
the expected `vcs.revision`, and `vcs.modified=false` for both snapshots.
Each immutable test package contains its matching JS SDK, Go executable, and all
116 declaration libraries, including `lib.d.ts`. The artifact-only `getExePath`
patch locates that executable; it does not change API behavior. The first base
smoke attempt exposed an omitted `lib.d.ts`; the helper was corrected and the
successful retry is retained separately from the failed log.

`source-sdk.mjs`, preloaded through `NODE_OPTIONS`, redirects `typescript/*`
exports and package metadata to the selected snapshot. It does not replace bare
classic compatibility imports. Workers inherit the selector. SDK and Go binary
must match because the PR changes wire handles. The first test-loader attempt
exposed CommonJS `require.resolve` handling; this was corrected before both
successful suites and all measured runs.

## Validation

| Check                                     |      Base |                        PR Head |
| ----------------------------------------- | --------: | -----------------------------: |
| Compiler and JS API builds                |      Pass |                           Pass |
| Focused SonarJS tests                     | 43 passed |                      43 passed |
| Raw tsconfig-cache and store tests        | 14 passed |                      14 passed |
| Upstream API tests                        |   Not run |                     962 passed |
| Upstream API benchmarks, single iteration |   Not run | Async, sync, generators passed |

The focused suite includes scanner/IDE entry points, retained IDE ownership,
incremental snapshots, dependency edits, callbacks, virtual filesystems,
record/replay, ESTree maps, TSX and deprecation diagnostics. This is not the full
SonarJS rule suite, complete scanner ruling or deployment validation.
Upstream generation briefly changed enum line endings; its formatter restored
a completely clean checkout without manual source restoration.

## Benchmark Method

- ag-grid 9.1.0 at `81a52e2c0180fc6e555b2c3efc44729fb46539d9`.
- All 157 eligible TypeScript roots, with no file cap.
- Existing 1,085 ruling rule/language configurations, 582 distinct rule keys.
- Callback filesystem with outside-project `node_modules` restricted.
- Three fresh workers per backend and SDK; backend order alternates within a batch.
- Base and PR batches run sequentially after build/tests, without profiling.
- Separate single-run profile batches measure IPC attribution, not baseline speed.

No project dependencies were installed. Neither compiler was substituted into
the installed package tree. OS filesystem caches and other workstation activity
are not controlled; three runs are not a statistical performance guarantee.
Source-built `noembed` results should not be equated with published binary runs.

## Results

All 12 uninstrumented workers are valid and cross-run parity passes: files,
source hashes, active rule configurations, issue-line arrays (including
duplicates), and program inputs exactly match the first classic worker.
Every worker reports **6,524 matching issue lines across 157 files**.
No unsupported-member or checker failures were recorded.

Median phase times in seconds. Individual phase medians need not sum to total.

| Phase            | Classic Base Batch | Classic PR Batch | Native Base | Native PR |
| ---------------- | -----------------: | ---------------: | ----------: | --------: |
| Program setup    |              0.460 |            0.534 |       0.321 |     0.357 |
| Parsing          |              0.842 |            0.903 |       1.804 |     2.089 |
| Linting          |             11.385 |           12.708 |      15.668 |    19.051 |
| Analysis total   |             12.917 |           14.300 |      17.924 |    21.584 |
| Worker wall time |             22.422 |           25.085 |      29.455 |    32.667 |

Native analysis increased **20.4%**; the unchanged classic control increased
**10.7%**. The native/classic ratio increased from **1.388 to 1.509**, an
**8.8% relative worsening**. Analysis ranges were 17.61-19.52 s for native base,
21.46-23.11 s for native PR, 12.53-13.92 s for classic base batch, and
13.04-15.78 s for classic PR batch.

This is a negative speed result for these captured runs, not evidence of a
speedup. The drifting control, sequential batches, workstation activity and
three samples prevent attributing a definitive regression to the PR. Dividing
by the control does not remove every source of noise. A reverse-order repeated
experiment on a quieter machine is needed before a causal performance claim.

### IPC And Memory

Native medians from the **uninstrumented** runs; MB below means decimal megabytes.

| Measurement                      |      Base |        PR |    Change |
| -------------------------------- | --------: | --------: | --------: |
| SDK requests                     |    23,976 |    23,976 | Unchanged |
| SDK bytes sent                   | 16.087 MB |  5.009 MB |    -68.9% |
| SDK bytes received               | 41.149 MB | 36.567 MB |    -11.1% |
| Combined SDK bytes               | 57.236 MB | 41.576 MB |    -27.4% |
| SDK round-trip total             |   3.973 s |   4.749 s |    +19.5% |
| SDK server time                  |   1.512 s |   1.647 s |     +8.9% |
| SDK estimated transport overhead |   2.461 s |   3.106 s |    +26.2% |
| Node maximum RSS                 |  977.2 MB |  964.9 MB |     -1.3% |
| Go end-of-analysis RSS sample    |  188.3 MB |  185.6 MB |     -1.4% |

All native workers fetched 269 source files and materialized 158,587 nodes;
the SDK's nodes-fetched counter was 338,656 on both revisions. Native API
process tracking found exactly one live compiler at end-of-analysis sampling
in every uninstrumented native worker.

The strongest demonstrated effect is **smaller messages, not fewer round trips**.
There is no new reduction in round trips for this SonarJS workload. Existing
semantic batching/prefetch remains important. IPC timings still rise with machine
load despite smaller messages; counts and payload bytes are more robust evidence
of the structural change than timings from this run.

SDK round-trip time does not include every client allocation, request-encoding,
JSON-decoding, AST-materialization or facade cost. Estimated transport overhead
is not pure OS pipe latency, and server time can include nested filesystem
callbacks. Memory samples are not allocation counts; Go is an endpoint sample,
not a peak, and these figures do not validate the author's allocation reduction
on a different workload. Do not sum overlapping IPC and phase timings.

### Separate Profile Check

One additional classic/native profile pair per SDK passed parity against the
same baseline reference, bringing the full comparison to **16 workers**.
Both native profiles report `matchesSdkTotals=true`. Both have the same 23,976
SDK requests, 405 batch calls containing 16,828 logical requests, and maximum
batch size 768. These profile timings are excluded from the baseline table.

Largest combined request/response byte savings in the profile samples:

| Endpoint              | Calls, Both Revisions | Base Payload | PR Payload |
| --------------------- | --------------------: | -----------: | ---------: |
| `getTypeAtLocations`  |                   137 |    13.443 MB |   4.255 MB |
| `batchRequests`       |                   405 |    10.031 MB |   6.904 MB |
| `getTypeAtLocation`   |                 6,973 |     2.301 MB |   0.868 MB |
| `getSymbolAtLocation` |                 8,835 |     8.158 MB |   6.749 MB |

The two remaining high-count single-location methods alone still make 15,808
calls. In the PR profile they account for approximately 2.38 s of measured
round trips. Smaller handles do not eliminate those request/response waits.
Further work could investigate caching/reusing answers or widening prefetch,
but changing query scheduling requires a separate correctness/performance test.
The existing API already supports batching; this PR does not lower the batch
or single-location request counts observed here.

The profile's native round-trip total fell from 4.816 s to 4.514 s, while
uninstrumented medians rose. This is another reason not to merge these samples
into one causal speed claim or interpret a single profile as stable performance.

## Evidence And Reproduction

Ignored raw artifacts: `tools/ts7-benchmark/out/pr64823-20261015/`.
They include build/test logs, install provenance, binary metadata, both SDKs,
worker reports, LITS issue-line files and comparison scripts.

See the [source-build commands](../../tools/ts7-benchmark/README.md#source-built-sdk-comparisons)
for selecting each SDK without changing dependencies. Recompute the baseline
cross-run comparison with:

```powershell
node tools/ts7-benchmark/out/pr64823-20261015/compare.mjs
node tools/ts7-benchmark/out/pr64823-20261015/compare-profiles.mjs
```

Issue-count/line parity is the initial agreed gate. It does not establish complete
message, secondary-location, fix, suggestion or suppression parity, nor IDE
incremental performance or complete transitive input equivalence between TS6/7.
