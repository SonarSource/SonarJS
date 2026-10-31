# TypeScript Nightly Upgrade

Date: 2026-10-15. Status: upgraded, build and focused tests passed, ag-grid
issue-count/line parity retained. No demonstrated absolute performance improvement.

## Versions And Scope

| Component                | Before                                     | After                                      |
| ------------------------ | ------------------------------------------ | ------------------------------------------ |
| Native TypeScript        | `7.1.0-dev.20261012.1`                     | `7.1.0-dev.20261015.1`                     |
| Compiler gitHead         | `aa8149273b23401f0a79a5f0384c42de51888693` | `257e87406c6a8be277cb8cd5ef8d7b458a650390` |
| Classic comparator       | `typescript-classic@npm:typescript@6.0.3`  | Unchanged                                  |
| typescript-eslint        | `8.71.1`                                   | Unchanged                                  |
| Vendored native adapters | `30d55234e6d719d3386884c3eef5c3a6c9d255f3` | Unchanged                                  |

The worktree remains based on SonarJS `a2b9a58b22739f0a87f7edb3f78ce03dcf248a6e`
with the existing uncommitted production integration. This update did not rebase
SonarJS or change rule implementations. No runtime compatibility changes were
needed. The JS SDK and native platform binary were upgraded together; the lockfile
version changes are limited to TypeScript and its seven platform packages.

Installation used npm's configured Repox authentication, not raw HTTPS and not
public npmjs:

```powershell
npm install --save-exact --legacy-peer-deps --no-audit --no-fund typescript@7.1.0-dev.20261015.1 --registry=https://repox.jfrog.io/artifactory/api/npm/npm
```

`--legacy-peer-deps` is still necessary because released typescript-eslint does
not advertise TS7 support. No TLS or certificate checks were disabled.

The nightly includes the merged transport fix
[#64818](https://github.com/microsoft/TypeScript/pull/64818), configuration fix
[#64755](https://github.com/microsoft/TypeScript/pull/64755), and preceding
compiler optimizations such as conditional-type simplification caching
[#64648](https://github.com/microsoft/TypeScript/pull/64648). It does **not** include
the pending client/payload optimization
[#64823](https://github.com/microsoft/TypeScript/pull/64823). This is not a
benchmark of that PR or an arbitrary build of current master.

## Validation

- `npm run ts7:test`: 43 passed, including real scanner/IDE entry points, session
  retention, incremental snapshots, filesystem events, parser maps and archives.
- `npm run bbf`: passed, including native adapter provenance/hash checks and
  application/test compilation. As before, this build uses the separately pinned
  native-preview `tsgo`; the upgraded package is the compiler API used to analyze
  projects, not a change to the build compiler.
- Raw tsconfig-cache tests: 6 passed.
- Tsconfig-store discovery/invalidation tests: 8 passed.
- Native adapter provenance file hash unchanged before/after installation.
- Two ag-grid benchmark batches: all six workers in each batch valid and stable,
  with cross-backend issue-line parity.
- An additional cross-batch check compared all 12 workers against the first classic
  worker: files, source hashes, active rule configurations, issue-line arrays
  including duplicates, and program inputs all matched exactly.

These are focused checks, not the full rule suite, scanner ruling, packaged native
deployment, or complete message/fix/secondary-location/suppression parity.

## Benchmark Method

A fresh baseline was captured **before installing the upgrade**, using the same
current SonarJS code. Each compiler batch ran three classic and three native fresh
workers, alternating backend order. Both batches used:

- ag-grid 9.1.0, pinned source revision
  `81a52e2c0180fc6e555b2c3efc44729fb46539d9`;
- all 157 eligible roots, no file cap;
- the same 1,085 ruling rule/language configurations, 582 distinct rule keys;
- callback filesystem with outside-project node_modules restricted;
- no profiling or CPU sampling, no project dependency installation.

Within each batch, native/classic input and output parity passed. Across batches,
the comparison script also verified program inputs and diagnostic line arrays.
All 12 workers reported **6,524 identical issue lines**.

## Results

Median analysis phases in seconds; phase medians need not sum to median total.

| Phase            | Classic Before | Classic After | Native Before | Native After |
| ---------------- | -------------: | ------------: | ------------: | -----------: |
| Program setup    |          0.534 |         0.548 |         0.342 |        0.298 |
| Parsing          |          0.864 |         0.976 |         1.731 |        1.934 |
| Linting          |         12.410 |        13.323 |        16.159 |       16.583 |
| Analysis total   |         13.921 |        14.933 |        18.394 |       19.001 |
| Worker wall time |         24.224 |        26.450 |        29.193 |       30.389 |

Native median analysis increased **3.3%**, while the unchanged classic comparator
increased **7.3%**. The native/classic ratio fell from **1.321 to 1.272**, a **3.7%**
relative reduction. Native was approximately 27% slower than classic in the new
batch, compared with 32% in the fresh baseline batch.

This is **not proof of a compiler speedup or regression**. The batches ran
sequentially on an uncontrolled workstation, with only three samples per backend,
uncontrolled filesystem caches and changing machine load. The control itself
drifted materially. Faster program setup and a slightly better relative ratio
are observations, not causal attribution to specific upstream changes. No fresh
method-level IPC attribution was collected in this experiment.

The upgrade is retained because the tested API integration remains compatible and
the newer compiler fixes are available. A matched build of #64823 would be a
separate experiment, not a conclusion from these results.

## Reports And Reproduction

Ignored raw evidence directory:
`tools/ts7-benchmark/out/nightly-upgrade-20261015/`.
It contains before/after manifests, install/build/test logs, both benchmark batches,
and a cross-run comparison script plus `comparison.json`.

```powershell
npm run ts7:benchmark -- --project its/sources/projects/ag-grid --rule-config tools/ts7-benchmark/out/ruling-ag-grid-20261013-final/rules.json --restrict-node-modules --runs 3 --output tools/ts7-benchmark/out/another-unique-run
node tools/ts7-benchmark/out/nightly-upgrade-20261015/compare.mjs
```

Use a new output directory for each experiment. Reproducing the old batch requires
the exact old compiler and matching native binary; its saved reports alone are
not a live rerun. The comparison script checks the captured batches and does not
switch dependencies.

- [Cross-run comparison JSON](C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/tools/ts7-benchmark/out/nightly-upgrade-20261015/comparison.json)
- [Before summary](C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/tools/ts7-benchmark/out/nightly-upgrade-20261015/before/summary.json)
- [After summary](C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/tools/ts7-benchmark/out/nightly-upgrade-20261015/after/summary.json)
- [Execution-path diagrams](C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/docs/ts7-benchmark/execution-paths.md)
