# Vercel TS7 comparison evidence

Local macOS arm64 run with Node v24.16.0, three fresh sequential processes per provider and project, alternating order. The runner reused the ruling configuration. Source revision and input-tree hashes, individual timings, peak RSS and determinism checks are in [vercel-ts7-comparison.json](vercel-ts7-comparison.json). No concurrent build or test workload ran during these measurements.

| Project    | Files | Findings (each) | Exact matches | TS6 median | Vercel median | Ratio |
| ---------- | ----: | --------------: | ------------: | ---------: | ------------: | ----: |
| underscore |    17 |             348 |           348 |    1.322 s |       1.459 s | 1.10× |
| backbone   |    23 |             648 |           648 |    1.497 s |       1.646 s | 1.10× |
| redux      |   132 |           1,801 |         1,801 |    2.303 s |       2.477 s | 1.08× |
| rxjs       |   730 |           6,249 |         6,249 |   12.241 s |      14.158 s | 1.16× |
| ag-grid    |   163 |           6,594 |         6,594 |    6.466 s |       7.310 s | 1.13× |

All 15,640 findings matched across 1,065 files, including messages, primary/secondary locations and fixes. There were no missing or added findings, parsing errors or file failures. All repeated runs produced identical findings. These projects include JavaScript and TypeScript; this sample does not establish parity on every supported project or configuration.

Vercel was 8–16% slower in these runs. Process peak RSS was higher: for the largest TypeScript sample, RxJS, its median was about 2.52 GiB versus 2.10 GiB for TS6. The provider currently rebuilds changed programs, so this cold whole-project comparison does not establish incremental-edit latency on large projects. Successive edit correctness is covered by the standalone bridge smoke test.

The source archive pin and adapter details are described in [vercel-ts7-provider.md](vercel-ts7-provider.md).
