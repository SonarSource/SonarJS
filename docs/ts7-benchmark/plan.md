# SonarJS TypeScript 7 Benchmark Plan

Current architecture (2026-10-15): [one shared TypeScript module](single-typescript-module.md)
for SonarJS and all dependencies. TS6 is the default provider and TS7 IPC is experimental.
Both use released typescript-eslint 8.71.1; the compiler module translates native
objects to the existing contract. No parser fork or second SDK-free service is required.

Epic: [JS-2643](https://sonarsource.atlassian.net/browse/JS-2643).

The benchmark controls program creation, project selection and filesystem policy.
Scanner requests release native processes; IDE requests retain sessions and apply
file deltas. The [consumer inventory](typescript-consumer-inventory.md) records
owned compiler use. See the shared-module document for current tests and results.
The dated investigation details below record the original feasibility plan,
not the current parser/module implementation.

## Objective and agreed scope

Benchmark SonarJS using the TypeScript 7 native JS/IPC API instead of the classic
TypeScript 6 JS compiler. SonarJS retains control of program creation, project
selection, compiler options, filesystem policy, and snapshot replay. Reuse
@typescript-eslint's ESTree conversion and ESTree-to-TS / TS-to-ESTree node maps;
do not implement a second converter or mapping system.

Initially trust LITS output: compare issue counts and issue lines per rule and
file. Defer richer diagnostic/message/secondary-location comparisons. A matching
result is the initial parity gate, not a claim of complete semantic equivalence.
Start with batch .ts/.tsx analysis; IDE incremental behavior and Vue integration
are subsequent work. The user explicitly accepts breaking the classic backend in
this worktree while implementing the benchmark; preserve baseline revisions, not
a working TS6 runtime in the same checkout.

## Reference revisions and investigations

- SonarJS master: `a2b9a58b22739f0a87f7edb3f78ce03dcf248a6e`.
- TypeScript API inspection: `aa8149273b23401f0a79a5f0384c42de51888693`.
- typescript-eslint native PR [#12803](https://github.com/typescript-eslint/typescript-eslint/pull/12803):
  `30d55234e6d719d3386884c3eef5c3a6c9d255f3`, open/draft.
- [JS-1140](https://sonarsource.atlassian.net/browse/JS-1140): initial API investigation.
- [JS-1506](https://sonarsource.atlassian.net/browse/JS-1506): Go analyzer alternative.
- [JS-1379](https://sonarsource.atlassian.net/browse/JS-1379): tsgolint gRPC POC.

Live upstream revisions and package layouts can change. Pin an actually tested
compiler/parser pair rather than assuming the inspected heads work together.
The native preview currently used to build SonarJS is not proof that its runtime
API is suitable for this experiment. The parser draft still imports older native
package paths; current TypeScript source has different export paths.

## Feasibility verdict

The selected path is feasible without reimplementing ESTree conversion or node
mapping, but is not plug-and-play through a supported parser interface today.
The main prerequisite is a narrow context-injection change in the native parser.
No runnable prototype had been validated when this plan was agreed.

## Target architecture

```text
SonarJS project selection / effective compiler options
                       |
             SonarJS-owned TS7 snapshot
                       |
              native Project / Program
                       |
     typescript-eslint native adapters + converter
                       |
       ESTree + ESTree-to-TS maps + parserServices
                       |
              existing ESLint rules
```

### Program ownership and parser injection

TS7 supports explicit root files, compiler options, project references, and
program creation inside filesystem-backed snapshots. Do not delegate SonarJS's
configured/orphan selection to an upstream project service.

The draft native parser obtains `{ api, project, sourceFile }` through its own
project service. Patch only context acquisition to accept a SonarJS-owned native
project, retaining its adapters, AST converter, parser services, prefetch, and
cache behavior. Passing a raw native program to today's `parserOptions.programs`
does not activate the native conversion pipeline.

A pinned fork/patch is acceptable for a benchmark. Production requires an
upstream-supported injection interface or a consciously maintained integration.
Native contexts can be assembled from snapshot-created programs and public
snapshot project lookup; do not reach into private Program.project state.
Ensure the source text converted is the same text installed in the program.

### Rule communication shim

Extend the coordinated upstream compatibility adapters, rather than building an
independent checker-only shim or implementing the wire protocol. Rules inspect
not only checker methods but types, symbols, signatures, declarations, node kinds,
and identity. Preserve the same node adapter for mapping and checker operations.

The SonarJS layer should provide:

- Missing methods/properties actually exercised by SonarJS.
- Instrumentation and optional additional caching/batching.
- Explicit reporting of unsupported operations.

Keep rules unchanged initially where possible. Some helpers catch checker errors
and return conservative values; unsupported calls must be recorded out of band
and invalidate the benchmark, rather than silently reducing issue counts.

### Filesystem APIs and host correspondence

TS7 provides host-style filesystem callbacks plus full and layered virtual
filesystems. It is not a drop-in CompilerHost.

The callback surface is: `directoryExists`, `fileExists`,
`getAccessibleEntries`, `readFile`, `realpath`, `stat`, `writeFile`, `removeFile`.
When custom callbacks are supplied, configure every field using a function or
supported sentinel. `readFile` returning undefined means absent, not OS fallback.

| Current SonarJS behavior                       | TS7 adaptation                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Request content, then content cache, then disk | Preserve precedence in readFile or authoritative VFS layers                 |
| Custom existence checks                        | fileExists and directoryExists                                              |
| Directory traversal / glob filtering           | getAccessibleEntries supplies entries; Go traverses and filters             |
| Outside-root node_modules restrictions         | Apply policy consistently to reads, existence, and directory entries        |
| CWD / canonical case handling                  | API configuration with explicit recorded case sensitivity                   |
| Symlinks / canonical paths                     | realpath callbacks or VFS symlink definitions                               |
| Metadata                                       | stat callback                                                               |
| No emitted files                               | No-op write/remove configuration                                            |
| JS-created SourceFile cache                    | Not portable; Go owns parsing, use native snapshots/cache                   |
| Builder versions / oldProgram                  | Snapshot updates and lifetime management, not identical builder hosts       |
| Compiler library location                      | Explicit native library access/mount policy, not old JS getDefaultLib hooks |

Native snapshot updates exist. Do not infer that every classic watch/builder API
has a direct replacement. Translate effective compiler options deliberately;
do not assume classic and native numeric enums are interchangeable.

### Preserve existing filesystem snapshots and overloads

Keep the Node filesystem hook for JS dependencies. It continues handling Buffer,
URL, path, descriptor, synchronous, and asynchronous Node overloads. TS7 does not
need to expose every Node overload: adapt its smaller semantic filesystem surface
to the archive/content machinery. Go reads bypass Node monkey-patching, so route
compiler access explicitly through callbacks or supplied VFS facts.

SonarJS archives contain partial observations, not full filesystem copies:
unrecorded means unknown, not absent. They include operation-specific outcomes,
metadata, errors, directories, symlink observations, and missing-path facts.

- Full VFS: unspecified paths are absent. Suitable only for complete, closed datasets.
- Layered VFS: unspecified paths fall through to the base filesystem. An unrestricted
  disk base violates strict replay.
- Callbacks: SonarJS determines each outcome and can reject unknown observations.

Implementation progression:

1. Compatibility-first callbacks backed by request content, caches, archive
   observations, and explicitly allowed runtime/compiler libraries. Unknown
   project observations fail closed.
2. Hybrid optimization: preload trustworthy content, directory, and symlink facts
   into a VFS layer; retain archive-backed callbacks underneath.
3. Full VFS only for deliberately complete input datasets.

Explicit directory listings replace the underlying listing even in layers.
Never construct a supposedly complete directory listing from the subset of files
whose content was captured. Preserve recorded path/case normalization, negative
facts, and explicit library passthrough. VFS helpers do not by themselves encode
all archived metadata or operation-specific errors.

An existing TS6 archive may be insufficient for TS7 because it can request
different observations. Report those misses, do not silently read disk or return
missing. Determine whether to capture additional native observations in a separate
recording run before comparing strict replay timings.

Transport caveat: synchronous native IPC uses Node filesystem descriptors and
Windows named pipes. Add a narrow transport exemption to the hook, never blanket
disable replay restrictions. Verify pipe open/read/write/close behavior on Windows.

Callback exceptions abort the native request and are treated as unrecoverable by
the current synchronous channel. Record an out-of-band fatal replay error, dispose
the session, and fail the run even if a rule catches the ordinary exception.
Filesystem callbacks must serve facts only, not issue reentrant native API calls.

## Implementation phases and acceptance gates

### Phase 1: bootstrap and filesystem/program smoke test

- Save this plan and work on `codex/ts7-benchmark` in a dedicated worktree.
- Establish a pinned, installable native API package and parser source pair.
- Implement a small experimental native filesystem adapter without changing the
  filesystem hook itself.
- Exercise read/existence/directory/realpath/stat overrides and authoritative
  in-memory text, including empty files and absent files.
- Create a SonarJS-owned native program, obtain a source file/checker result, and
  dispose the snapshot/session.
- Verify unknown replay observations are fatal and transport operations are isolated.
- Add focused tests for behavior that can be validated without the upstream parser.

### Phase 2: parser injection and compatibility

- Patch the draft native parser context-acquisition seam.
- Verify both node maps and that checker calls accept the mapped node identities.
- Preserve upstream semantic prefetch and caching.
- Audit actual SonarJS checker/type/symbol/signature usage and report unsupported calls.
- Add a backend switch usable by batch/ruling entry points while reporting backend compatibility explicitly.
- Preserve configured/orphan selection, roots, references, effective options, and
  disposal boundaries.
- Use native getSourceFileNames for orchestration: the compatibility facade's
  getSourceFiles may fetch every AST merely to list filenames.

### Phase 3: correctness gate and baseline measurement

- Run the same projects, files, rule settings, and source text on both backends.
- Compare LITS issue counts and lines per rule/file; defer richer comparison.
- Reject runs with parser failures, unsupported adapter operations, or replay misses.
- Account for program membership and native versus classic bundled library differences.
- Run callback-correct native mode before optimizing with hybrid VFS.

### Phase 4: optimize and expand

- Add layered preloading and compare it with callback-only mode on identical input.
- Tune semantic prefetch/batching only after baseline costs and parity are known.
- Extend coverage to Vue and IDE snapshot updates separately.
- Seek upstream parser context injection rather than maintaining a converter fork.

## Measurement design

Measure classic and native modes separately and distinguish:

- Native process startup and program creation.
- AST transfer, JS materialization, and ESTree conversion.
- Rule execution and adapter work.
- Semantic request counts, bytes, round-trip time, and server processing time.
- Filesystem callback counts, time, and archive/cache hit/miss counts.
- Combined Node and Go memory, not only Node heap.
- Cold versus warm runs, repetition count, input/compiler/parser revisions.

Current native API supports timing collection and batching. Do not attribute every
round-trip duration to IPC alone: include server work and separately account for
nested filesystem callbacks and JS materialization.

Correctness does not imply performance parity. Upstream native rule benchmarks
have shown regressions despite prefetch/caching; measure SonarJS rather than
extrapolating compiler CLI speedups.

## Source evidence

- [Native parser pipeline](https://github.com/typescript-eslint/typescript-eslint/blob/30d55234e6d719d3386884c3eef5c3a6c9d255f3/packages/typescript-estree/src/native/parseAndGenerateNativeServices.ts)
- [TS7 filesystem API](https://github.com/microsoft/TypeScript/blob/aa8149273b23401f0a79a5f0384c42de51888693/packages/typescript/src/api/fs.ts)
- [TS7 API options](https://github.com/microsoft/TypeScript/blob/aa8149273b23401f0a79a5f0384c42de51888693/packages/typescript/src/api/options.ts)
- [TS7 synchronous API](https://github.com/microsoft/TypeScript/blob/aa8149273b23401f0a79a5f0384c42de51888693/packages/typescript/src/api/sync/api.ts)
- [Native filesystem implementation](https://github.com/microsoft/TypeScript/blob/aa8149273b23401f0a79a5f0384c42de51888693/tsc/internal/api/requestfilesystem/requestfilesystem.go)
- [Callback error propagation and transport](https://github.com/microsoft/TypeScript/blob/aa8149273b23401f0a79a5f0384c42de51888693/packages/typescript/src/api/syncChannel.ts)
- SonarJS: `packages/analysis/src/jsts/program/compilerHost.ts`, `factory.ts`,
  `analyzeWithProgram.ts`, `packages/analysis/src/jsts/builders/build.ts`,
  `packages/shared/src/fs-cache/`, `packages/ruling/lits.ts`.

## Working state

The canonical checkout has existing package-lock changes and untracked files;
they are not part of this task. Its fast-forward is blocked by those changes.
The dedicated worktree is based directly on current origin/master.
Keep unfinished prototype work in this worktree; do not remove it while it holds
uncommitted or unpushed work.

## Bootstrap results (2026-10-12)

- Installed root `typescript@next`, resolved and pinned to
  `7.1.0-dev.20261012.1`; gitHead matches the inspected API revision.
- Installed dependencies with `--legacy-peer-deps` because released
  typescript-eslint still declares a classic TypeScript peer range.
- Existing SonarJS package patches applied successfully (existing ESLint patch
  version mismatch warning remains).
- Added `npm run ts7:smoke` and `npm run ts7:test`.
- 17 focused tests pass: owned programs, imports, checker calls, filesystem
  callbacks, VFS, immutable snapshot updates, fatal callback errors, content
  precedence, empty files, path/case policy, symlinks, and BOM decoding.
- Layer updates of synthetic programs returned stale types with targeted
  `fileNotifications.changed`, including a same-configuration reconfigure attempt.
  `fileNotifications: { invalidateAll: true }` produced the expected updated type
  while preserving the old snapshot. Use full invalidation initially; efficient
  targeted invalidation remains unverified.
- One attempted remove-and-create update with targeted notifications crashed
  the native server in ProjectCollectionBuilder.HandleAPIRequest. This is not part
  of the passing path; reduce to an upstream reproducer before reporting a bug.
- At this bootstrap milestone, actual SonarJS filesystem-hook record/replay, transport exemption, parser
  injection, rule compatibility, and LITS parity are not yet implemented.

The smoke timings are not benchmark results: two tiny runs differ in filesystem
strategy and execute sequentially without statistical controls. Native processing
measurements may include time waiting for filesystem callbacks; callback metrics
are tracked separately to avoid calling all round-trip time transport overhead.

### Initial full SonarJS build status

`npm run bbf` currently fails during metadata generation, before compilation:
`tools/generate-eslint-meta.ts:114` still calls classic
`ts.createSourceFile(..., ts.ScriptTarget.Latest, ...)`; the root TS7 export is a
version module and no longer exposes that classic API. This is expected after the
approved runtime replacement. The generator must use native source parsing/AST
exports, while the parser and rules require the compatibility integration from
Phase 2. The focused native prototype is independently executable.

## Runnable milestone (2026-10-12)

The original phases above remain the design; this section supersedes the initial
bootstrap's incomplete status. See [the runnable guide](../../tools/ts7-benchmark/README.md)
for commands, inputs, architecture, and interpretation of metrics.

Implemented:

- `ts7:prepare`, `ts7:benchmark`, `ts7:test`, and `ts7:smoke` npm commands.
- Fresh classic/native workers using real SonarJS program selection, parsers,
  rule configuration, and Linter rather than a separate synthetic linter.
- SonarJS-owned native programs and native compiler-option conversion.
- Pinned upstream typescript-eslint native adapters with owned-context injection,
  existing ESTree conversion and identity-preserving maps, and caught-error tracking.
- S1874 suggestion diagnostics through the native Program endpoint.
- Actual filesystem hook record/replay and a narrowly exempted native pipe transport.
- Native callbacks plus optional source layer; fatal callbacks invalidate the run.
- LITS-style issue counts/line arrays, source hashes, file sets, active-rule
  comparisons, repeated-run stability, and JSON timing/IPC/callback/memory reports.
- Pinned local parser preparation with MIT attribution and integrity checks.

The classic alias is a comparator and compatibility vocabulary, not a native
checker fallback. Normal root TS7 production build compatibility is not restored;
benchmark preparation preloads the shim for the existing metadata generator.

Initial verification before the final directory-index optimization:

- Fixture recommended rules: four matching issues.
- Fixture all rules: eleven matching issues.
- Actual record and replay: matching issues and no unsupported operations.
- 25 SonarJS source files selected by `packages/tsconfig.app.json`: nineteen
  matching issues/lines. Single callback-mode run: classic 6.05 s versus native
  22.64 s (3.74x); native program setup 20.80 s, parsing 0.17 s, linting 1.41 s.
- 2,465 native SDK requests, approximately 16 MB response data; native callback
  directory checks consumed 16.53 s. The adapter was rescanning cached paths per
  directory probe; replaced with an incrementally maintained directory index.

These are bounded prototype results, not a full LITS ruling or stable performance
conclusion. Both compilers construct complete configured programs despite the
25-file lint limit. Native server timing includes nested filesystem waits; do not
attribute all measured request time to wire overhead. Repeated finalized runs
and their output locations are recorded below after verification.

Remaining: scanner/project discovery, orphan files, Vue, IDE snapshots, complete
reference-graph coverage, and richer issue parity. Targeted snapshot invalidation
remains unverified. Node+Go RSS is sampled, not a combined peak measurement.

### Finalized callback-mode verification

- 27 tests passed, including actual SonarJS archive record/replay, parser map
  identity, TSX, synthesized type nodes, suggestion diagnostics and directory-index growth.
- `out/fixture-all-final`: three all-rule fixture repeats, 11 matching issues.
- `out/sonarjs-25-final`: three recommended-rule repeats on 25 SonarJS source
  files, 19 matching issues. File/source/active-rule parity and run stability pass.
- Median analysis: classic 6.436 s, native 6.351 s (native/classic 0.987x).
  Program medians: classic 4.168 s, native 4.384 s. Parse medians: 0.530 s vs
  0.172 s. Lint medians: 1.384 s vs 1.483 s. Separately, median worker wall
  time was 13.838 s vs 14.115 s; module/preparation/report costs are not analysis.
- Native third run: 2,465 SDK requests; 4.591 s round-trip total; 4.386 s
  reported server time; 0.205 s reported transport overhead; 1.72 MB sent and
  15.98 MB received. Server time includes nested callback waits. Directory
  callbacks fell to 0.249 s after indexing. These overlapping metrics are not
  disjoint terms to add together or an isolation of all IPC costs.
- Native combined RSS sample approximately 1.02 GB; no combined peak measurement.

All output paths are relative to `tools/ts7-benchmark/`. These are fresh-worker
runs with an uncontrolled OS filesystem cache; small run count and bounded rule
coverage limit performance conclusions.

The real-source layer variant also passed: `out/sonarjs-25-layer-final`, one run, 19 matching issues. This overlays selected source text; dependencies remain callback-backed.

All-rule selection on the same real 25-file sample also passed: `out/sonarjs-25-all-final`, 313 matching issues, no unsupported/checker failures; one run, classic 6.177 s vs native 6.399 s.

## Ruling project milestone (2026-10-13)

See [ag-grid results](ag-grid.md) for the saved inputs, exact scope, rerun command,
initial failures, fix, timings, IPC counters, and limitations. All 157 configured
TS roots and actual ruling rule parameters passed three-repeat parity: 6,524
matching issues/lines. Native analysis median was 15.228 s vs classic 12.383 s
(about 23% slower). This is a source-project benchmark, not a full scanner ruling.

Added native syntax-only parsing for S125's secondary comment-fragment parses,
with proper ESLint tokens/comments/range/loc, isolated VFS/native programs,
syntactic diagnostics and disposal. No classic semantic fallback. The initial
37 S125 omissions and intermediate missing-token failure are preserved in
separate output directories. The revised 28-test suite passed, including S125
in the actual all-rule archive record/replay integration test.
