# Shared TypeScript Module Versus Master

Date: 2026-10-15.

This measures the [single-module design](single-typescript-module.md), not the
retired TypeScriptService experiment (removed from this branch).

## Setup

Five fresh-process pairs, alternating order, against master
`54ed0347accda1232bb85b625b5167f3817bd729`. The candidate is the uncommitted
`codex/ts7-benchmark` worktree, based on
`a2b9a58b22739f0a87f7edb3f78ce03dcf248a6e`.

Both run Node 24.19.0, TypeScript 6.0.3, typescript-eslint 8.71.1 and ESLint
9.39.5. Each side uses its actual production config processing, program factory,
`IncrementalCompilerHost`, parser builder and Linter. There is no candidate
service/preparation wrapper or replacement rule implementation.

The project is the existing ag-grid checkout at test-sources revision
`81a52e2c0180fc6e555b2c3efc44729fb46539d9`: all 157 eligible non-declaration
roots, 1,085 frozen rule/language configurations and 582 distinct keys. Source
text is supplied to both hosts. Lint context is MAIN/CHANGED/DEFAULT with module
kind `module`, no generated-code filtering or scanner-specific extra settings.
Node dependency signal is absent; TypeScript signal is `2.2.x`.

This is the same bounded corpus and issue-line gate as the previous comparison,
not a full scanner ruling or diagnostic/fix comparison. Master has unrelated
changes since the candidate's base, including S7781; this is not a controlled
single-variable microbenchmark of facade overhead.

## Results

All five pairs passed every parity gate: **6,524 issue locations in 157 files**,
identical rule/file/line multisets, selected sources and hashes, compiler options,
roots, program membership/content, active rules, versions and dependency signals.
Each run was also compared with the first master run. No errors were recorded.

Every candidate report records `provider: ts6` and `sameFacade: true`, with
58 SonarJS importer URLs and 90 typescript-eslint importer URLs intercepted.
The harness fails if either consumer group is absent. This demonstrates routing
for these runs; it is not exhaustive API-operation coverage for every dependency.

| Measurement      | Master Median | Shared Module Median |
| ---------------- | ------------: | -------------------: |
| Configuration    |       0.075 s |              0.055 s |
| Program creation |       0.660 s |              0.644 s |
| Parsing          |       1.148 s |              1.337 s |
| Linting          |      15.797 s |             16.345 s |
| Core phases      |      17.562 s |             18.263 s |
| Worker wall time |      30.193 s |             28.659 s |
| Peak Node RSS    |       916 MiB |            1,006 MiB |

The core-median ratio is **1.040**, wall-median ratio **0.949**, and peak-RSS
ratio **1.098**. Core ranges are 15.397-19.926 s for master and
14.093-20.716 s for the module. Wall ranges are 26.044-31.707 s and
23.620-32.790 s respectively. Paired core ratios range from 0.725 to 1.345;
their median is 1.058. Keep all samples: this shared-workstation run is too noisy
to establish exact performance parity or a reliable speedup. No Go IPC is involved
in this TS6 comparison.

## Evidence And Limits

Ignored raw evidence:
`tools/ts7-benchmark/out/unified-ts6-ag-grid-five-20261015/`.
It contains provenance, the exact timed candidate patch/untracked snapshot,
all reports/configs/logs, `compilerRouting` observations, parity and summary JSON.
The harness is `tools/ts7-benchmark/compare-ts6-master.mjs`.

Subsequent native-parser routing and IDE-cache lifetime fixes are validated by
separate tests. The timed worker does not exercise request-boundary IDE cleanup
or standalone packaging. Its TS6 production factory/build/linter path is the
one measured here. Historical failed test runs remain in `out` for diagnosis;
they are not benchmark samples.

Final validation passed 338 source tests and 15 compiled module/native tests.
It includes the focused module/native/FS suite, the original TS6 program,
builder, scanner and SonarLint tests, bridge compilation, bundled parser/checker
execution, compiled module/native tests and standalone TS6 server startup.
Full repository tests, scanner ruling, message/fix parity, complete TS7 Host
compatibility, standalone TS7 packaging and WASM remain separate gates.
