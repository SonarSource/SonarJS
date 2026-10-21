# Compiler provider comparison

Candidate: tsgo-ipc. Node: v24.16.0. Repetitions: 3.
Measured: 2026-10-21. Host: Darwin 25.5.0 arm64.
Corpus commit: 81a52e2c0180fc6e555b2c3efc44729fb46539d9.
Versions: ts6 6.0.3, tsgo-ipc 7.1.0-beta.

Generated from the adjacent summary JSON by `tools/compiler-comparison/report.mjs`.

Providers run sequentially in fresh processes with alternating order. Times are median
project analysis times, excluding Node/module startup. Exact finding equality includes
messages, locations, secondaries and fixes. Project sources/configs are unchanged.

| Project    | Files | TS6 findings | Native findings | Exact matches | TS6 ms | Native ms | Ratio |
| ---------- | ----: | -----------: | --------------: | ------------: | -----: | --------: | ----: |
| backbone   |    23 |          648 |             648 |           648 |   1501 |      2405 | 1.60× |
| underscore |    17 |          348 |             348 |           348 |   1304 |      2037 | 1.56× |
| redux      |   132 |         1801 |            1801 |          1801 |   2363 |      2785 | 1.18× |
| ag-grid    |   163 |         6594 |            6595 |          6594 |   6519 |     10199 | 1.56× |
| rxjs       |   730 |         6249 |            6257 |          6249 |  12537 |     20977 | 1.67× |

Across 1065 files: 15640/15640 exact TS6 matches, 0 missing and 9 added findings.
Sum of project medians: 24.23s TS6, 38.40s native (1.59×).
This sample does not establish performance parity or incremental performance.

## Memory and IPC

Median sampled peak RSS includes Node, its launcher and the Go child. Samples every
100ms can miss short peaks. The JSON retains Node maxRSS separately. Memory sampling
uses POSIX `ps` and is unavailable on Windows.

| Project    | TS6 tree MiB | Native tree MiB | Native Go child MiB | Native requests |
| ---------- | -----------: | --------------: | ------------------: | --------------: |
| backbone   |          752 |            1009 |                 113 |            6127 |
| underscore |          731 |             935 |                 108 |            6295 |
| redux      |          910 |            1031 |                 108 |            7027 |
| ag-grid    |         1222 |            1641 |                 168 |           63151 |
| rxjs       |         2208 |            3014 |                 232 |           60067 |

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
node tools/compiler-comparison/compare.mjs /path/to/jsts-test-sources /tmp/tsgo-comparison 3 backbone underscore redux ag-grid rxjs
node tools/compiler-comparison/report.mjs /tmp/tsgo-comparison/summary.json /tmp/tsgo-comparison/summary.md
```

Select the candidate in `providers.json`. Avoid concurrent builds/tests while timing.
