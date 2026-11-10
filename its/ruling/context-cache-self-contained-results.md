# Self-contained PR context prototype - 10 November 2026

This prototype is published for discussion in [PR 8306](https://github.com/SonarSource/SonarJS/pull/8306).
It was developed and measured on `codex/pr-8306-self-contained-context`, based on
previous PR head `2d1ea7500b6ed71bcb1051d48d359b4e609d393f`.

## Current decision and measurement scope

The user authorized a prototype that sends all current input files to Node, with
Java's actual per-file sensor-cache decision. `file_status` remains independent:
SAME does not imply a cache hit. An optional `skip_analysis` flag suppresses rule
execution and file-result emission for a hit. Ordinary no-context PR requests still
send only misses.

Recording constructs programs until every eligible input has its first configured,
orphan, or no-program outcome. Filesystem contents and program selections come from
the current checkout. CI does not restore a reference SQAA context, and it neither
reads nor writes a whole-context entry through the sensor-cache API. Per-file result
caching, cached CPD/AST handling, and the scanner's no-op PR cache writers remain.
The snapshot and metadata formats consumed by SQAA are unchanged.

The user accepted the broader current orphan roots and their improved findings on
10 November 2026, and authorized completing this approach. This supersedes the
earlier prohibition on source reads and TS program construction solely for context.
No numeric time or memory budget or final merge acceptance has been agreed.

## Correctness checks

- All-cached configured, orphan and type-checking-disabled requests emit zero file
  results and make zero calls to the linter, while recording fresh contents and
  portable program/no-program outcomes without any baseline.
- SAME files with cache misses still produce analysis results. Existing SAME-file
  incremental rule filtering remains in effect.
- Removed imports can move cached files from a configured program to an orphan
  program. Replay succeeds from the new selection with the checkout absent.
- Added/deleted files and changed compiler options appear in fresh metadata.
- Overlapping configs retain normal first-program precedence. Referenced configs
  and independent configs are visited even when no file needs rule execution.
- Context initialization/persistence failures preserve successful analysis.
- Finalization passed 155 focused Node tests (two skipped) and 157 Java tests
  (none skipped), including real packaged-Node warm-cache recording/replay.
  TypeScript compilation, bridge packaging and fresh Node/Java protobuf generation passed.

A cached ambient declaration is now a root of its current orphan group. Consequently,
a changed file can report S2871 where a one-file ordinary incremental request cannot.
This is an accepted consequence of the broader root set; it supersedes the earlier
results-preservation requirement for this case. Sensor-cache invalidation
is otherwise unchanged: improvements in JS-2815 remain separate. The wildcard ambient
package discovery extension remains excluded and tracked in JS-2853.

## Measurement method

Both implementations use the same existing Vuetify corpus, Sonar way plus S1116,
Node 24.22.1, TypeScript 6.0.3 and Corretto Java 21.0.9. Each measurement suite copies the corpus;
no dependencies are installed. There are 1,585 JS/TS/JSX/TSX/Vue inputs. Declarations,
hidden paths and node_modules are not analysis inputs. Available declarations and
configs can still participate in TypeScript resolution.

The corpus was originally extracted from ruling submodule commit
`81a52e2c0180fc6e555b2c3efc44729fb46539d9`, according to the prior measurement
record. The extracted fixture has no independent Git metadata. The edited input
maps in both current measurements have identical canonical SHA-256:
`58cdca5ded1526f4828fd15ee6eb7db3c297f6e809b827ceef7baf59671ae6d0`.

The edit appends an empty statement to `packages/vuetify/src/util/anchor.ts`, without
changing imports or exports. Every PR reads its implementation's same immutable
full-branch per-file cache generation. Each pair requires 1,584 cache hits, no
analysis errors, and identical changed-file issues with/without context.

One warm-up pair is discarded; three measured pairs alternate order. Every sensor
starts a fresh Node process, with a shared test JVM and explicit GC outside timing.
Sensor time includes extraction, Node startup, local cache I/O, analysis, context
recording/serialization and attachment copies. It excludes fixture preparation,
indexing, verification, bridge shutdown, scanner bootstrap and backend/network I/O.
The Python wrapper samples simultaneous Java plus Node RSS every 100 ms. This is
local sensor integration, not a full scanner/backend or production CI benchmark.
The Windows workstation has an Intel Core Ultra 7 165H (16 cores, 22 logical
processors) and 63.5 GiB physical memory. It is not an isolated benchmark host.

The prototype also performs three full analyses of the edited checkout with fresh
write caches, then an all-cached PR using the last full generation. These full runs
are the repeated full-analysis control. Initial branch analyses are reported
separately and are not treated as comparable repeated full samples.

## Finalization measurements at a793efd871

The code revision is `a793efd871f7a0a14aed99127188941b30e89bbc`. The packaged
bridge SHA-256 is `7cae0db81f09066d25893d95152ee2f20cb500ed67b55a6e59fc098f99bae78c`.
The corpus and edited input map match the earlier prototype exactly. These measurements
include the JSX AST-cache correction and removal of dormant baseline machinery.

Each row uses three measured samples after a discarded warm-up pair, except the
full-analysis control, which uses three independent full runs. Context-on/off order
alternates within each PR group. One-file PRs use the original full-branch cache;
all-cached PRs use the final edited full-analysis cache. The all-cached group runs
after the full-analysis control, so comparisons between the two PR groups also
include run-order and cache-generation differences.

| Scenario                   | Median sensor seconds |       Range | Files analyzed | Cache hits | Programs constructed | Median peak Java + Node MiB |
| -------------------------- | --------------------: | ----------: | -------------: | ---------: | -------------------: | --------------------------: |
| One-file PR, context off   |                 12.07 | 11.78-13.14 |              1 |       1584 |                    3 |                        1342 |
| One-file PR, context on    |                 18.90 | 17.23-21.38 |              1 |       1584 |                    6 |                        1535 |
| Full edited checkout       |                 70.47 | 63.17-88.21 |           1585 |          0 |                    6 |                        2846 |
| All-cached PR, context off |                  9.46 |   8.59-9.60 |              0 |       1585 |                    0 |                        1057 |
| All-cached PR, context on  |                 24.67 | 24.07-24.88 |              0 |       1585 |                    6 |                        1515 |

The one-file context-enabled PR is 3.73 times faster than median full analysis.
Its median paired context-on minus context-off increment is 5.76 seconds
(individual increments: 9.31, 5.45, 5.76 seconds). The difference of medians is
6.83 seconds. The median peak RSS difference is 193 MiB.

For all-cached PRs the median paired increment is 15.42 seconds
(14.46, 16.07, 15.42 seconds), the difference of medians is 15.21 seconds,
and the median peak RSS difference is 458 MiB. Cached files execute zero rules.
Context still needs current source reads and construction of all six programs.
These costs remain subject to explicit performance acceptance.

The longer all-cached context-on time is not explained by program counts or
archive contents. Decoded program selections and all 1,608 recorded file contents
are identical between the one-file and all-cached contexts. One-file recording
adds six negative filesystem observations; the per-file sensor-cache read-size
difference is only 2,319 bytes. Do not infer that skipping an additional file is
intrinsically slower from the separately scheduled groups.

All three one-file pairs reused 1,584 inputs and matched their controls' two
changed-file issues. All-cached runs reused all 1,585 inputs and emitted no file
results. Full runs reported 714 issues. Manual verification of all eight PR
archives, including warm-ups, checked every current source content and all
1,585 program selections. Checkout-free replay matched 22 expected issues.

The full measurement run completed all analysis phases and the replay comparison but its Maven
test failed while restoring the source directory after replay, with a transient
Windows `AccessDeniedException`. The same move later succeeded without permission
changes. The completeness verifier then passed independently. The harness now
keeps the checkout hidden after replay and verifies captured artifacts directly;
no restoration move is needed. A separate 1,001-file smoke run passed the complete
harness, including all-cached pairs, replay, warning checks and completeness
verification. Its timings are not used in the Vuetify table.

Raw measurements, simultaneous RSS samples, logs and attachments are retained in
`its/ruling/target/bench-finalization-verified/`. The harness smoke artifacts are
in `its/ruling/target/bench-harness-smoke/`. These local fixtures have no installed
dependencies. No Cloud/Server test environment is available, so actual scanner
uploads and SQAA backend publication remain unverified.

### Why did the all-cached group appear slower?

A follow-up used the same immutable original full-branch cache for both PR cases,
interleaved their order, and changed only the appended statement and file status
outside timing. It discarded the first pair and retained three pairs:

| Scenario                  | Median sensor seconds |       Range |
| ------------------------- | --------------------: | ----------: |
| One-file PR, context on   |                 15.84 | 14.70-20.16 |
| All-cached PR, context on |                 20.95 | 16.36-23.87 |

The gap persisted in that suite, so the original cache-generation and group-order
confounders alone do not explain it. All eight contexts passed current-content
verification; every program selection was identical, with 1,584/1,585 cache hits
and two/zero emitted issues respectively.

A separate diagnostic run traced existing Node log milestones and process CPU time
through a local preload, without changing the packaged analyzer. Its two pairs
reversed the ordering:

| Pair | One-file PR seconds | All-cached PR seconds |
| ---- | ------------------: | --------------------: |
| 0    |               22.90 |                 20.24 |
| 1    |               19.47 |                 18.11 |

The traces put the variation within preparation/program construction; they show
no additional empty-result wait. For example, pair 0's root tsconfig construction
took 4.45 seconds with one changed file and 4.35 seconds with all files cached;
the docs config took 4.07 and 3.08 seconds respectively. The one-file run also
spent about 0.96 seconds analyzing its changed file. All four traced contexts
passed independent content and selection checks, and neither investigation test
reported warnings.

These small diagnostics do not establish a stable latency difference or its exact
runtime/host cause. In particular, do not claim that a one-file PR is inherently
faster, or choose a numeric budget from that ordering. Current recording still
constructs six programs in both cases, and cached files run zero rules. Collection's
real program/recording cost is established by the on/off controls; its precise
latency needs a more stable measurement environment before performance acceptance.

Investigation data are in `its/ruling/target/bench-interleaved/` and
`its/ruling/target/bench-interleaved-traced/`, with per-process/thread traces in
`.local-review/context-timing-traces/`. The temporary investigation test/preload
are retained under `.local-review/` and are not part of the PR.

## Historical prototype results

| Scenario                             | Median sensor seconds |       Range | Files analyzed | Programs constructed | Median peak Java + Node MiB |
| ------------------------------------ | --------------------: | ----------: | -------------: | -------------------: | --------------------------: |
| Published PR, no context             |                 14.90 | 14.52-16.54 |              1 |                    3 |                        1290 |
| Published PR, baseline context       |                 15.97 | 15.69-17.71 |              1 |                    3 |                        1431 |
| Prototype PR, no context             |                 12.81 | 11.35-17.82 |              1 |                    3 |                        1407 |
| Prototype PR, fresh context          |                 16.59 | 16.16-16.97 |              1 |                    6 |                        1502 |
| Prototype full analysis              |                 69.41 | 55.31-83.59 |           1585 |                    6 |                        2828 |
| Prototype all-cached PR (one sample) |                 24.08 | 24.08-24.08 |              0 |                    6 |                        1488 |

The prototype's context-enabled one-file PR is 4.18 times faster than the median full analysis and 3.33 times faster than the fastest full sample. The median paired with-minus-without increment is 3.36 seconds; individual paired increments are -1.22, 3.36, 5.62 seconds.

Timing variation is substantial, especially in full analysis and no-context controls. These are exploratory measurements, not an established performance limit or proof of equal latency to the published PR. Baseline and prototype suites ran at different times. The initial published full analysis (76.38 s) and initial prototype full analysis (58.94 s) are excluded from the repeated full control.

All PR pairs reused 1,584/1,585 files and reported the same two changed-file issues as their corresponding no-context control. Full analyses of the edited checkout reported 714 issues. The all-cached run reused 1,585/1,585 files, emitted zero file-analysis results, constructed six programs, and published context. Its duration is a single sample, not a median comparison against a no-context all-cached run.

The verifier checked all 1,585 current source contents and all 1,585 program selections in every PR snapshot, including the all-cached one. Each archive contains 1,608 recorded content files (3,179,191 bytes), including project/config/dependency observations. Checkout-free replay passed without context-fallback warnings. Published PR metadata also contains six programs, but only three are constructed during its one-file PR; the remaining selections are inherited.

Per-file cache reads are 3,092,958 bytes in both prototype PR modes. The published context mode reads 4,127,660 bytes, including its baseline snapshot: fresh recording removes 1,034,702 bytes of reference-context cache reads. The prototype rereads current source contents and constructs three additional programs instead. Total sensor timing does not isolate these costs from recording, serialization, local I/O and runtime effects.

### Controlled Node-only fixtures

One warm-up is excluded from each mode; the following are medians of three samples. These request timers exclude process startup/module loading and are not directly comparable with Java sensor times. Peak Node RSS includes startup. Each fixture has 1,000 inputs and uses only S2871.

| Fixture             | Mode    | Median request seconds |       Range | Files analyzed | Programs | Median peak Node MiB |
| ------------------- | ------- | ---------------------: | ----------: | -------------: | -------: | -------------------: |
| independent-configs | without |                  0.775 | 0.730-0.841 |              1 |        1 |                  469 |
| independent-configs | with    |                  1.618 | 1.585-1.692 |              1 |       10 |                  516 |
| independent-configs | full    |                  8.477 | 5.963-9.561 |           1000 |       10 |                 1242 |
| orphans             | without |                  0.567 | 0.559-0.588 |              1 |        1 |                  494 |
| orphans             | with    |                  1.552 | 1.502-1.587 |              1 |        1 |                  510 |
| orphans             | full    |                  6.951 | 6.516-7.796 |           1000 |        1 |                 1247 |

`without` analyzes one requested file, `with` analyzes one file while mapping all inputs and persisting context, and `full` analyzes all files and persists context. The independent-config case exposes the cost of visiting nine additional configs. The orphan case keeps one program but expands its roots from one to 1,000. Every sampled run verified its result count, expected S2871 findings and completion marker.

The direction is promising for Vuetify, but context recording has a real minimum cost even with no rule work. Agree an overhead budget before adopting this architecture; do not generalize these fixtures to large dependency installations or all monorepos.

Raw data: `its/ruling/target/bench-published/`, `its/ruling/target/bench-self-contained/`, and `its/ruling/target/program-mapping-self-contained/`. They retain measurements, logs, RSS samples and context artifacts. The published bridge package was preserved in `.local-review/published-2d1ea7500b.tgz`. Package SHA-256 values:

- `published-2d1ea7500b.tgz`: `48022abc59207bcae6c9d40f53144ad1db4ffec6f0d640f370606a7e49579e33`

- `sonarjs-1.0.0.tgz`: `46df5a50dc14993140aa5f129626dad04919693a60ea6006e1361bbcb90ab1b3`

The Maven license scan was skipped for these local runs because pre-existing untracked `.local-review/point3-design-*` fixtures lack headers; changed product sources retain their license headers. Compilation, focused tests, packaged bridge runs and context verification succeeded. No live Cloud/Server scanner upload or SQAA backend run was performed.

## Work remaining before merge

The measurements above describe the prototype before the final baseline-code cleanup
and JSX AST-cache correction; their revisions and results remain historical evidence.
The broader orphan roots and improved findings are accepted. Local finalization
checks and current measurements are recorded above. Actual Cloud/Server publication
remains unverified because no test environment is available; numeric overhead/memory
acceptance remains open. CI must be assessed on the latest pushed head.
Context publication remains conservative after
a runtime file error. The PR #8332 replay findings are assessed separately.
The implementation uses only SonarJS; no scanner-engine or SQAA code change is needed.
