# Vercel upstream upgrade comparison

Measured 2026-11-13, Darwin 25.5.0 arm64, Node v24.16.0.
Generated from [the canonical JSON](vercel-ts7-upgrade-comparison.json) by `tools/compiler-comparison/upgrade-report.mjs`.

| Input                     | Before                                   | After                                    |
| ------------------------- | ---------------------------------------- | ---------------------------------------- |
| Vercel version            | 0.0.4                                    | 0.1.5                                    |
| Vercel revision           | 085c71ef7d10dcbe9f67fc38e5f1a778153f7151 | 04f804ff133a832c1aa7b30c625869ab2566c73d |
| Microsoft source revision | 2bd066d87f5bafd315be9f40889d0a60b9e58e0b | 3e9236361fa97a9e6c685f4833ac457ae2d8c50a |
| Declaration libraries     | 7.0.0-dev.20260707.2                     | 7.1.0-beta                               |
| @scriptc/threads          | 0.3.6                                    | 0.4.8                                    |
| Analyzer commit           | 9149c2544ba757e304c526c70fcdf71ad3d17b01 | e44b1115a5c90ab3d2ca722bff025e35e41cebf6 |

Rules, project sources and configurations are unchanged.
The update changes the Vercel compiler, its supporting threads package, matching declaration
libraries and provider compatibility code. It measures that complete update, rather than
isolating the effect of the upstream checker alone.

Each campaign uses 3 fresh sequential processes per provider/project, alternating
Vercel and TS6. The old campaign ran first, then the updated campaign. No builds or tests
ran concurrently with timing. Analysis excludes Node/module startup. Project-tree hashes
and individual timing/peak-RSS measurements are retained in the JSON.

| Project    | Old Vercel | Updated Vercel | Time change | Old / TS6 | Updated / TS6 | Change normalized to TS6 |
| ---------- | ---------: | -------------: | ----------: | --------: | ------------: | -----------------------: |
| backbone   |    1.557 s |        1.591 s |        2.2% |     1.07× |         1.07× |                    -0.0% |
| underscore |    1.347 s |        1.380 s |        2.4% |     1.07× |         1.07× |                    -0.3% |
| redux      |    2.341 s |        2.456 s |        4.9% |     1.03× |         1.04× |                     1.2% |
| ag-grid    |    6.930 s |        6.976 s |        0.7% |     1.10× |         1.09× |                    -0.4% |
| rxjs       |   12.812 s |       12.948 s |        1.1% |     1.05× |         1.09× |                     3.4% |

Sum of project medians: **24.987 s → 25.350 s (1.5% analysis time)**.
The TS6 control changed by -0.3%; normalizing both campaigns to TS6 gives 1.7%.
The updated provider shows no clear speedup for this in-process workload.
These are sums of medians, not a timed combined analysis. Three repetitions and sequential
campaigns do not establish statistical significance for small changes. Negative percentages
mean less analysis time. The benchmark does not measure incremental edits or native executables.

## Old and updated provider memory

Median analyzer Node maxRSS per project, reported by the operating system:

| Project    | Old Vercel MiB | Updated Vercel MiB |
| ---------- | -------------: | -----------------: |
| backbone   |            736 |                741 |
| underscore |            689 |                702 |
| redux      |            879 |                883 |
| ag-grid    |           1167 |               1186 |
| rxjs       |           2533 |               2473 |

The old and updated candidates produce exactly the same findings.

## Updated provider against TS6

Candidate: vercel. Node: v24.16.0. Repetitions: 3.
Measured: 2026-11-13. Host: Darwin 25.5.0 arm64.
Corpus commit: 81a52e2c0180fc6e555b2c3efc44729fb46539d9.
Versions: ts6 6.0.3, vercel 0.1.5.

Generated from the `after` campaign in the canonical JSON using `tools/compiler-comparison/report.mjs`.

Providers run sequentially in fresh processes with alternating order. Times are median
project analysis times, excluding Node/module startup. Exact finding equality includes
messages, locations, secondaries and fixes. Project sources/configs are unchanged.

| Project    | Files | TS6 findings | Candidate findings | Exact matches | TS6 ms | Candidate ms | Ratio |
| ---------- | ----: | -----------: | -----------------: | ------------: | -----: | -----------: | ----: |
| backbone   |    23 |          648 |                648 |           648 |   1492 |         1591 | 1.07× |
| underscore |    17 |          348 |                348 |           348 |   1295 |         1380 | 1.07× |
| redux      |   132 |         1801 |               1801 |          1801 |   2363 |         2456 | 1.04× |
| ag-grid    |   163 |         6594 |               6594 |          6594 |   6388 |         6976 | 1.09× |
| rxjs       |   730 |         6249 |               6249 |          6249 |  11926 |        12948 | 1.09× |

Across 1065 files: 15640/15640 exact TS6 matches, 0 missing and 0 added findings.
Sum of project medians: 23.46s TS6, 25.35s candidate (1.08×).
This sample does not establish performance parity or incremental performance.

## Memory and IPC

Median sampled peak RSS includes Node and its child processes. Samples every
100ms can miss short peaks. The JSON retains Node maxRSS separately. Memory sampling
uses POSIX `ps` and is unavailable on Windows.

| Project    | TS6 tree MiB | Candidate tree MiB | Compiler child MiB | IPC requests |
| ---------- | -----------: | -----------------: | -----------------: | -----------: |
| backbone   |          768 |                791 |                  0 |  unavailable |
| underscore |          727 |                753 |                  0 |  unavailable |
| redux      |          916 |                928 |                  0 |  unavailable |
| ag-grid    |         1208 |               1240 |                  0 |  unavailable |
| rxjs       |         2234 |               2512 |                  0 |  unavailable |

## Differences

Full finding messages, secondary locations and fixes remain in the JSON.

| Project | Direction | File | Line | Rule |
| ------- | --------- | ---- | ---: | ---- |

## Reproduce

```sh
SONARJS_TYPESCRIPT_BACKEND=<candidate> node tools/compiler-comparison/compare.mjs /path/to/jsts-test-sources /tmp/compiler-comparison 3 backbone underscore redux ag-grid rxjs
node tools/compiler-comparison/report.mjs /tmp/compiler-comparison/summary.json /tmp/compiler-comparison/summary.md
```

Select the candidate with `SONARJS_TYPESCRIPT_BACKEND`. Avoid concurrent builds/tests while timing.

Regenerate this report after updating the canonical JSON:

```sh
node tools/compiler-comparison/upgrade-report.mjs docs/vercel-ts7-upgrade-comparison.json docs/vercel-ts7-upgrade-comparison.md
```
