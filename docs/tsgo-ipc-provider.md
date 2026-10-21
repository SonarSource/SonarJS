# TSGo IPC provider (experimental)

This draft implements the [provider plan](tsgo-ipc-provider-plan.md) with the public
synchronous API shipped in `typescript@7.1.0-beta` (published October 20, 2026).
The npm alias `typescript-go` pins the JavaScript client and matching Go executable.
The shared infrastructure PR keeps TS6 as its default; this provider PR selects
`tsgo-ipc` so ordinary analyzer tests exercise it. Vercel's provider is independent.

## Execution and compatibility

Analyzer code and dependencies importing `typescript` receive SonarJS's owned
facade. Program creation, configuration parsing, module resolution and type queries
use the native SDK. The provider imports only its public `/sync`, `/ast` and `/fs`
entry points. It has no TS6 runtime fallback. TS6 remains installed for the reference
provider and contract declarations, and can be selected explicitly for comparisons.

The synchronous JavaScript API communicates with a Go child through stdio. This is
an in-process JavaScript interface for callers, but compilation and checking run in
the child. A lazy session is shared within each analyzer process. Programs own
immutable snapshots created through `API.createSnapshot`; AST, type, symbol and
signature proxies preserve identity within each program. Checker queries are
memoized within that snapshot. Objects from different programs cannot be mixed.

SonarJS's existing compatibility module owns constants and stateless syntax
operations. The adapter maps native enum names and AST/type shapes to that contract.
The facade advertises contract version **6.0.3**, which typescript-eslint understands;
this does not describe the underlying compiler. The native SDK and executable are
both **7.1.0-beta**, and their versions are verified before starting the child.
Upstream rules receive native-backed programs/checkers and facade syntax helpers.
A regression test runs an external typed rule while blocking TS6 runtime imports.

Supported operations cover the owned parser, analyzer and currently enabled rules:
programs, diagnostics, AST traversal, checker queries, configuration parsing,
module resolution, scanners/comments and filesystem helpers. Watch programs,
TypeScript server APIs and abstract builders fail explicitly. This is not a complete
implementation of the TypeScript compiler API. The semantic-builder wrapper creates
a fresh program; it does not provide incremental builder behavior.

## Filesystem and lifetime

Native filesystem callbacks use the analyzer's host, including request overlays and
its node_modules access policy. They do not fall back to arbitrary server disk reads
when the host denies access. `getSourceFileText` supplies overlays without invoking
another native parse from inside a synchronous callback. Reentry is rejected.
The recording/replay filesystem hook passes transport pipes through without treating
the protocol as project data; ordinary unknown descriptors still fail.

`program.dispose()` releases its remote snapshot and rejects later checker/program
queries. A finalizer provides best-effort cleanup for abandoned programs. Decoded
local syntax remains readable after release. Closing a session invalidates all its
programs; the next new program creates a fresh session. Detected EOF, broken pipes,
closed descriptors and native failures invalidate the session without silently
retrying stale operations. Tests cover explicit disposal, imported overlays,
old/new snapshot isolation, simulated transport failure and actual child death on
POSIX. Windows runs the portable transport tests; actual child-kill coverage is
still needed there.

The public sync client blocks in `readSync` and offers no request timeout or
cancellation. A hung child can therefore block its analyzer worker. This remains a
production-readiness gap. IDE edits currently create fresh snapshots rather than
using `snapshot.update`; correctness is exercised, but incremental performance
parity is not established.

## Configuration policy

Cross-version changes live in the existing shared tsconfig option policy. Removed
`baseUrl` behavior is represented through paths. Removed Classic/Node10 resolution
is approximated with Bundler/Preserve, retaining legacy package entry points by
defaulting package exports/imports resolution to false. Classic's bare local-name
lookup is not reproduced exactly. The analyzed fixtures, project tsconfigs and
ruling snapshots are unchanged.

## Packaging and use

`packages/typescript/providers.json` owns the provider entry, SDK alias, library
destinations and supported platforms. `npm run compiler:prepare` installs host
assets under `target/tsgo-ipc/native`; `node tools/prepare-tsgo-provider.mjs --all`
prepares all registered platforms. A bridge bundle prepares all six: macOS, Linux
and Windows, each on ARM64 and x64. The native executable requires adjacent standard
library declarations, which are copied together with license/notice files. The Java
bundle extractor preserves executable archive modes for scanner deployment.

All Maven plugin classifiers share this universal bridge archive, including those
that embed only one Node.js runtime. The native executables increase the packaged
plugin sizes; the Maven size checks include that overhead. Distributing only the
host compiler in each platform classifier would require splitting the shared bridge
archive and is not implemented in this draft.

Off-host platform packages are fetched with the configured npm registry and checked
against the committed package-lock integrity before extraction. SDK/package versions
must match. The bundle contains one selected provider plus its native assets and
excludes the TS6 SDK. The source tree retains the TS6 reference provider.

```sh
npm ci
npm run bridge:compile
npm run bridge:bundle
npx tsx tools/check-typescript-bundle.mts
```

Set `SONARJS_TYPESCRIPT_BACKEND=ts6` before loading the facade to use the reference
provider, or `tsgo-ipc` for this provider. Provider selection is fixed per process.

## Validation and measurements

The independent TS6/native comparison is recorded in
[tsgo-ipc-comparison.md](tsgo-ipc-comparison.md). The comparison tool keeps project
sources and rule versions fixed and compares full findings, including messages,
locations, secondary locations and fixes. It runs providers sequentially in fresh
processes and alternates order. Native IPC timing and sampled process-tree memory
include the Go child; Node-only RSS is also retained separately.

The frontend comparison accepted/rejected all 908 upstream fixtures identically
(583 accepted, 325 rejected). Both frontend implementations use the selected native
compiler in that test: it checks frontend behavior, not independent TS6/native AST
parity. Packaged smoke tests cover typed/syntax findings, fixes, successive IDE edits
and existing baseUrl projects.

Final local checks on macOS ARM64: compilation and compiler-contract checks passed;
the compiled bridge suite passed 2,960 tests with one skipped; Knip
(`--no-gitignore`), formatting, the bundled smoke test, 75 TS6 configuration tests,
and all four Java bundle deployment tests passed. Linux CI also passed the full
coverage suite with 2,960 passing tests. Windows CI exposed pipe detection and
virtual-path normalization differences; fixes require a fresh Windows run.

The benchmark summary JSON is the canonical measurement artifact. Its Markdown
report is generated with `tools/compiler-comparison/report.mjs`. The nine added
findings are S4325 assertion warnings that still need deeper semantic triage before
production use. Rules are not suppressed to match the baseline.
