# Native TypeScript integration

Current integration boundary: this directory is a private implementation of the
experimental TS7 provider in the [shared `typescript` module](../../../../../docs/ts7-benchmark/single-typescript-module.md).
SonarJS and its dependencies import that module; TS6 is the default provider.
The proposed service isolation described in the historical notes below has been
superseded by the single TypeScript-compatible contract.

## Current Ownership

- SonarJS and dependencies import the owned typescript module.
- The normal program factory controls roots/options/hosts and retained sessions.
- The builder always uses released typescript-eslint 8.71.1, as on master. There
  is no native parser selection or copied parser/converter pipeline.
- session.mjs owns Go process/snapshot/virtual filesystem lifetimes.
- packages/typescript/compat owns compiler object translation, diagnostics,
  identity caches, memoization and lazy batching. See its LICENSE and NOTICE.
- filesystem.mjs preserves request buffers, caches, archive hooks and policy.
- compatibility.mjs/native-transport.mjs keep synchronous native pipe access
  outside filesystem analysis hooks. Compiler routing belongs to the owned module.

The historical SDK-free service proposal has been superseded. See the shared
module document above for the current contract and validation status.

## IDE lifecycle

SonarLint must keep the native process and program state across analysis requests.
Request files are deltas, not complete project snapshots: omitted unsaved buffers
remain available, while `configuration.fsEvents` refreshes disk-backed files and
removes deleted paths. Directory events also invalidate known descendants.

Updates use `snapshot.update()` with a filesystem layer, targeted file notifications
and `ensurePrograms: true`. The synthetic project handle and API process survive;
unchanged requests retain the existing snapshot. Changed snapshots get fresh
compiler compatibility views and released-parser node maps so snapshot-bound type objects cannot leak between
requests. Unchanged native source identities are reused, not reparsed wholesale.
ESLint SourceCode is still released after every request.

The IDE cache is bounded to ten LRU sessions. Configuration/project resets, cache
eviction, fatal native failures and worker shutdown release their processes. It
does not silently fall back to a global invalidation/rebuild for ordinary edits.

The earlier stale targeted-update test forced case-sensitive paths on Windows.
With normal case-insensitive Windows semantics, targeted layer updates refresh
types correctly. Tests cover successive production SonarLint requests, direct and
imported type changes, omitted buffers, unchanged source identity, and dependency
edit/deletion/recreation. This is focused coverage, not a complete IDE regression
suite or proof of the native compiler's total incremental cost.

## Filesystem customization

`createNativePrograms(options, settings)` accepts `requestFiles`, `cwd`,
`skipOutsideNodeModules`, `fs` overrides using TS7's callback interface, and a
`fileSystem` created by `typescript-native/fs` for a full VFS or layer. Normal analysis
uses the existing SonarJS source context and filesystem archive hooks by default.
The provider uses standard compiler-host callbacks and getCurrentDirectory();
there is no extra SonarJS host method for native compiler metadata. We do not translate arbitrary legacy `getSourceFile`,
module-resolution or builder-host overrides automatically; the native callbacks
and snapshot FS are the new integration surface. Caller-provided callback
overrides are responsible for their own archive capture and metric accounting.

## Build and run

Node 24 is required for the synchronous resolution hooks. The server bootstrap
initializes the selected compiler before dynamically importing analysis code.
The native provider installs its transport compatibility hooks before loading the
SDK; normal TS6 ruling and test scripts do not preload those hooks. There are no production imports from
`tools/ts7-benchmark`.

```sh
npm run bbf
npm run ts7:test
npm run ts7:benchmark -- --rules all --runs 1
```

Benchmark tools now call this production session/factory and normal parser builder.
The fixture includes additional tests exercising the regular scanner and IDE
`analyzeProject` entry point, not just isolated parser calls.

## Remaining migration boundaries

- Vue retains the existing syntax-only analysis, even when a native program is
  available. Type-aware Vue analysis was already disabled before this migration;
  native Vue program-to-script mapping is not required for feature parity.
- No-program/type-disabled parsing still uses the established syntax-only parsers.
- Tsconfig/project-setting changes currently reset the native cache instead of
  reconfiguring the existing synthetic programs in place.
- The native process/library deployment and standalone CJS bridge bundle still
  need migration and verification; passing source analysis or `bbf` is not proof
  that the packaged scanner runtime is ready to ship.
- The build uses the repository's existing native-preview `tsgo`. A separate
  check with the newer root compiler currently reports selector-parser recursive
  type instantiation and rule callback inference errors; classic compiler type
  checking passed. This concerns compiling SonarJS, not the compiler used for
  analyzed projects (which is the pinned TS7 API).
- LITS issue-count/line parity is the initial gate, not complete message/fix/
  secondary-location/suppression parity. Full rule/ruling suites remain necessary.

Earlier timings and architecture notes describe the former tool-owned layout;
do not interpret them as measurements of the newly integrated source layout.

## Validation of This Layout

2026-10-13:

- `npm run bbf`: passed (normal native-preview build compiler).
- `npm run ts7:test`: 38 passed, including production factory/builder, scanner/IDE
  entry points, request replacement, caught unsupported members and record/replay.
- All-rule fixture: 11 identical issue lines across backends.
- 25 actual SonarJS source files, recommended rules, one run/backend: 19 identical
  issue lines; files, hashes and active rules matched. Analysis was 12.349 s classic
  versus 12.038 s native; one run is not evidence of a general performance change.
  Reports: `tools/ts7-benchmark/out/sonarjs-25-integrated/`.
- The ag-grid rerun did not start: the previous canonical source input's
  `its/sources/projects/ag-grid/tsconfig.json` is absent. Its invalid reports are
  retained in `out/ruling-ag-grid-20261013-integrated/`; earlier ag-grid results
  are historical, not fresh verification of this layout.

2026-10-15:

- Initialized the worktree's ruling submodule at its pinned revision and reran
  ag-grid through the integrated production factory/builder: three runs/backend,
  157 files, 6,524 identical issue lines; files, source hashes, active rules and
  repeat stability all matched. Median analysis: 14.569 s classic, 21.189 s native
  (1.454 ratio). See `docs/ts7-benchmark/ag-grid.md` for scope and artifacts.
- Removed the unnecessary native-program rejection for Vue: its existing
  syntax-only parser intentionally ignores supplied programs and tsconfigs.
  All 39 focused tests passed, including a regression for this behavior.
- Subsequent IDE lifecycle change: `npm run bbf` passed, final test compilation
  passed, and all 43 focused tests plus 8 tsconfig-cache tests passed. Coverage
  includes retained sessions across two real SonarLint requests, targeted type
  updates, unchanged native source identity, dependency deletion/recreation,
  directory events, bounded-cache eviction/reset and fatal-error cleanup.
  Logs: `tools/ts7-benchmark/out/ide-incremental-*`.

- Compiler upgraded to `7.1.0-dev.20261015.1`, retaining the same vendored
  typescript-eslint adapters. Build, all 43 TS7 tests, 6 raw tsconfig-cache tests
  and 8 tsconfig-store tests passed. Fresh before/after ag-grid batches retained
  all 6,524 issue lines across 12 workers; no absolute speedup was demonstrated.
  See the [upgrade report](C:/Users/victor.diez/projects/worktrees/SonarJS-ts7-benchmark/docs/ts7-benchmark/nightly-upgrade-20261015.md).
