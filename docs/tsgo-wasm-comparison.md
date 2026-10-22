# Compiler provider comparison

Candidate: tsgo-wasm. Node: v24.16.0. Repetitions: 3.
Measured: 2026-10-22. Host: Darwin 25.5.0 arm64.
Corpus commit: 81a52e2c0180fc6e555b2c3efc44729fb46539d9.
Versions: ts6 6.0.3, tsgo-wasm 7.1.0-dev.20261022.1.

Generated from the adjacent summary JSON by `tools/compiler-comparison/report.mjs`.

Providers run sequentially in fresh processes with alternating order. Times are median
project analysis times, excluding Node/module startup. Exact finding equality includes
messages, locations, secondaries and fixes. Project sources/configs are unchanged.

| Project    | Files | TS6 findings | Candidate findings | Exact matches | TS6 ms | Candidate ms | Ratio |
| ---------- | ----: | -----------: | -----------------: | ------------: | -----: | -----------: | ----: |
| backbone   |    23 |          648 |                648 |           648 |   1547 |         3307 | 2.14× |
| underscore |    17 |          348 |                348 |           348 |   1350 |         3081 | 2.28× |
| redux      |   132 |         1801 |               1801 |          1801 |   2493 |         4370 | 1.75× |
| ag-grid    |   163 |         6594 |               6595 |          6594 |   6780 |        14738 | 2.17× |
| rxjs       |   730 |         6249 |               6257 |          6249 |  12632 |        26813 | 2.12× |

Across 1065 files: 15640/15640 exact TS6 matches, 0 missing and 9 added findings.
Sum of project medians: 24.80s TS6, 52.31s candidate (2.11×).
This sample does not establish performance parity or incremental performance.

## Memory and IPC

Median sampled peak RSS includes Node and its child processes. Samples every
100ms can miss short peaks. The JSON retains Node maxRSS separately. Memory sampling
uses POSIX `ps` and is unavailable on Windows.

| Project    | TS6 tree MiB | Candidate tree MiB | Compiler child MiB | IPC requests |
| ---------- | -----------: | -----------------: | -----------------: | -----------: |
| backbone   |          769 |               1199 |                  0 |         6128 |
| underscore |          736 |               1120 |                  0 |         6296 |
| redux      |          915 |               1316 |                  0 |         7028 |
| ag-grid    |         1283 |               1958 |                  0 |        63153 |
| rxjs       |         2211 |               3393 |                  0 |        60070 |

## Differences

Full finding messages, secondary locations and fixes remain in the JSON.

| Project | Direction | File                                    | Line | Rule  |
| ------- | --------- | --------------------------------------- | ---: | ----- |
| ag-grid | added     | src/ts/headerRendering/headerRowComp.ts |  238 | S4325 |
| rxjs    | added     | src/Subscriber.ts                       |   81 | S4325 |
| rxjs    | added     | src/util/toSubscriber.ts                |   12 | S4325 |
| rxjs    | added     | src/observable/combineLatest.ts         |  157 | S4325 |
| rxjs    | added     | src/operator/concat.ts                  |  176 | S4325 |
| rxjs    | added     | src/operator/concat.ts                  |  182 | S4325 |
| rxjs    | added     | src/operator/merge.ts                   |  164 | S4325 |
| rxjs    | added     | src/operator/onErrorResumeNext.ts       |  109 | S4325 |
| rxjs    | added     | src/observable/dom/WebSocketSubject.ts  |  215 | S4325 |

## Reproduce

```sh
SONARJS_TYPESCRIPT_BACKEND=<candidate> node tools/compiler-comparison/compare.mjs /path/to/jsts-test-sources /tmp/compiler-comparison 3 backbone underscore redux ag-grid rxjs
node tools/compiler-comparison/report.mjs /tmp/compiler-comparison/summary.json /tmp/compiler-comparison/summary.md
```

Select the candidate with `SONARJS_TYPESCRIPT_BACKEND`. Avoid concurrent builds/tests while timing.
