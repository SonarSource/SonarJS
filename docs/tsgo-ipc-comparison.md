# TypeScript 7.1 beta IPC comparison

Measured on October 21, 2026 with Node v24.16.0, macOS ARM64, TS6 6.0.3 and
native TypeScript 7.1.0-beta. Corpus: `SonarSource/jsts-test-sources` commit
`81a52e2c0180fc6e555b2c3efc44729fb46539d9`. No corpus sources, configs or ruling snapshots changed.

Each provider ran in a fresh process, sequentially with alternating order, three
times per project. Timings below are median project analysis times, excluding
Node/module startup. Finding equality includes messages, locations, secondaries and
fixes. Findings were deterministic across the three runs and both providers had zero
analysis/parse errors.

| Project    | Files | TS6 findings | Native findings | Exact matches | TS6 ms | Native ms | Ratio |
| ---------- | ----: | -----------: | --------------: | ------------: | -----: | --------: | ----: |
| backbone   |    23 |          648 |             648 |           648 |   1508 |      2463 | 1.63× |
| underscore |    17 |          348 |             348 |           348 |   1332 |      2084 | 1.56× |
| redux      |   132 |         1801 |            1802 |          1801 |   2378 |      2835 | 1.19× |
| ag-grid    |   163 |         6594 |            6595 |          6594 |   6680 |     10536 | 1.58× |
| rxjs       |   730 |         6249 |            6257 |          6249 |  12732 |     21838 | 1.72× |

All **15,640** TS6 findings match exactly across **1,065** files. Native adds **10**
findings. The sum of median analysis times is 24.63s versus 39.76s
(1.61×). This sample supports close finding parity, not performance parity.

## Added findings

- Redux: one S3827 at `src/createStore.js:30`, the unresolved JSDoc return type
  `Store`. The difference is in JSDoc resolution/diagnostics.
- ag-grid: one S4325 at `src/ts/headerRendering/headerRowComp.ts:238`, the
  `<null>floatingFilterParams` assertion.
- RxJS: eight S4325 findings in `Subscriber.ts`, `util/toSubscriber.ts`,
  `observable/combineLatest.ts`, `operator/concat.ts` (two), `operator/merge.ts`,
  `operator/onErrorResumeNext.ts` and `observable/dom/WebSocketSubject.ts`.

The assertion differences need deeper semantic triage before production use; they
are retained rather than suppressing rules or changing analyzed projects. Full
locations, messages and fixes are in the [raw results](tsgo-ipc-comparison.json).

## Memory and IPC

Memory below is the median sampled peak RSS of each analysis process tree, including
Node, its launcher and the Go child. Samples are taken every 100ms and can miss short
peaks. The raw results retain Node maxRSS separately; Node maxRSS is not total native
provider memory.

| Project    | TS6 tree MiB | Native tree MiB | Native Go child MiB | Native requests |
| ---------- | -----------: | --------------: | ------------------: | --------------: |
| backbone   |          759 |            1006 |                 110 |           6,127 |
| underscore |          731 |             945 |                 107 |           6,295 |
| redux      |          929 |            1041 |                 106 |           7,022 |
| ag-grid    |         1188 |            1597 |                 166 |          63,151 |
| rxjs       |         2197 |            3119 |                 226 |          60,067 |

There is no memory improvement in this implementation. Public client timing includes
server and transport time, bytes and materialized-node counts. The remaining time
also includes local facade/AST work, frontend conversion and rule execution. These
cold-project measurements do not establish successive-edit or incremental performance.

## Reproduce

```sh
node tools/compiler-comparison/compare.mjs /path/to/jsts-test-sources /tmp/tsgo-comparison 3 backbone underscore redux ag-grid rxjs
```

Select the candidate in `providers.json`; the tool compares it to `ts6`. Avoid
concurrent builds/tests while timing. POSIX process-tree sampling uses `ps`; the
current tool leaves total process-tree memory unavailable on Windows.
