# Vercel TS7 comparison evidence

Local macOS arm64 run with Node v24.16.0, three fresh sequential processes per provider and project, alternating order. The runner reused the ruling configuration. Source revision and input-tree hashes, individual timings, peak RSS and determinism checks are in [vercel-ts7-comparison.json](vercel-ts7-comparison.json). No concurrent build or test workload ran during these measurements.

| Project    | Files | Findings (each) | Exact matches | TS6 median | Vercel median | Ratio |
| ---------- | ----: | --------------: | ------------: | ---------: | ------------: | ----: |
| underscore |    17 |             348 |           348 |    1.304 s |       1.384 s | 1.06× |
| backbone   |    23 |             648 |           648 |    1.509 s |       1.598 s | 1.06× |
| redux      |   132 |           1,801 |         1,801 |    2.336 s |       2.485 s | 1.06× |
| rxjs       |   730 |           6,249 |         6,249 |   12.590 s |      13.473 s | 1.07× |
| ag-grid    |   163 |           6,594 |         6,594 |    6.605 s |       7.272 s | 1.10× |

All 15,640 findings matched across 1,065 files, including messages, primary/secondary locations and fixes. There were no missing or added findings, parsing errors or file failures. All repeated runs produced identical findings. These projects include JavaScript and TypeScript; this sample does not establish parity on every supported project or configuration.

The independent Vercel backend was 6–10% slower in these runs. Process peak RSS was higher: for the largest TypeScript sample, RxJS, its median was about 2.40 GiB versus 2.11 GiB for TS6. The provider currently rebuilds changed programs, so this cold whole-project comparison does not establish incremental-edit latency on large projects. Successive edit correctness is covered by the standalone bridge smoke test.

The source archive pin and adapter details are described in [vercel-ts7-provider.md](vercel-ts7-provider.md).

## Full corpus correctness follow-up

The existing 59 ruling projects were analyzed without modifying their sources or
configuration: 17,522 files, 625,804 findings and no compiler exceptions or failed
file results. The 137 files with parsing errors retain their existing parsing-error
expectations. Shared option normalization preserves `baseUrl` imports; the provider
also preserves obsolete import-assertion ASTs and well-known symbol identities.

Compared with the previous ruling snapshots, 18 entries are added and 134 are
missing out of 626,057 entries (over 99.97% retained). These counts compare rule,
file and line, including parsing errors; they do not assert exact message, secondary
location or fix parity for the whole corpus. The snapshots now record the experimental
TS7 results. Project fixtures remain unchanged.

The remaining differences are concentrated in JavaScript type-dependent checks:
63 missing default-object-stringification findings (S6551), deprecation diagnostics,
constant-condition checks and type-based refactoring suggestions. Ace accounts for
100 missing and 12 added entries. These remain draft provider limitations rather
than a claim that every changed finding is an improvement. Fresh, Oak, Vuetify and
Vitest retain their existing rule/file/line expectations after the compatibility fixes.

The [machine-readable corpus summary](vercel-ts7-corpus.json) records the input
revision and every changed snapshot. The follow-up used concurrent workers to
check correctness; its timings are not performance evidence. The sequential,
alternating measurements above remain the performance comparison.

## Independent provider follow-up

After removing all TS6 SDK delegation, the same 59 available corpus projects still
produce 625,804 findings across 17,522 files, with no failed analysis results and
the same 137 files with parsing errors. All current rule/file/line snapshots match
the earlier hybrid provider. The canonical corpus checkout does not contain the
ESLint project; it is excluded from these counts. Configuration compatibility
keeps obsolete option names from triggering fallback settings. No analyzed sources,
configurations or ruling snapshots were changed for this follow-up.

The five-project timings above were rerun on the independent provider with three
alternating fresh processes per backend. All 15,640 findings match exactly,
including messages, locations and fixes; every repetition is deterministic.
