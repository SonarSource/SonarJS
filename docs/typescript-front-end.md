# Owned TypeScript front end and compiler providers

This implements the front-end ownership stage of the
[JS-2643 study](https://docs.google.com/document/d/18Qrl6y-29kRqc6NjZgKorSASN514QmoR_m0gndUb-7w/edit).
The compiler boundary supports direct JavaScript implementations and native compilers
accessed through an API. TS6 is the default reference provider in this PR. A provider
keeps its transport, remote handles, snapshots and lifecycle behind the same synchronous
interface consumed by the converter and rules.

## Parsing and linting

`packages/analysis/src/jsts/frontend/parser.ts` owns the parsing path used by the
bridge and Vue's delegated script parser. It selects a supplied program/source
file or creates a standalone source file, converts it with the adopted converter,
builds TypeScript-aware ESLint scopes and exposes parser services. ESLint continues
to assemble SourceCode and execute the same SonarJS and upstream rules.

The adopted converter retains the upstream AST and node-map conventions, including
asymmetric associations for methods and function expressions. Compiler nodes remain
available to typed rules and to helpers traversing declarations outside the analyzed
file. Dependency files do not need an ESTree merely to answer a checker query.

Normal project and IDE analyses continue to use SonarJS's existing program factory,
configuration policy, filesystem hosts and incremental program caches. Legacy
`project` callers use the same configuration layer and an explicit content overlay;
the upstream parser no longer owns watch programs on this path. Vue keeps its
existing untyped script delegation and source mappings.

## One compiler contract

The repository's `typescript` dependency is a local compatibility package. Every
consumer imports `typescript` as before, including upstream rules and helpers.
CommonJS, ESM and supported legacy subpaths resolve to the same interface. The
bridge bundler resolves compiler imports from this canonical package even if a
dependency could otherwise find another SDK copy.

`packages/typescript/contract.json` is the single definition of runtime exports,
operation ownership, optional capabilities and supported nested methods.
`tools/generate-typescript-exports.mjs` generates ESM exports and declarations from it.
`Program`, `TypeChecker`, builder programs and the factory expose only the supported
subset. Structural AST, type and symbol declarations retain reference compatibility
for existing rule dependencies; they are not a promise of the complete SDK API.
Conformance tests check their required methods on representative real objects.
Unknown top-level operations and missing required operations fail explicitly.
The facade validates and captures selected exports once; program and checker method
validation is cached by object identity and does not wrap individual checker queries.

`typescript/contract` exposes the generated `Provider` type and nested validation.
`compiler:check` assigns the selected implementation to that type using the reference
compiler at build time and validates generated declarations without `skipLibCheck`.
Private APIs absent from the reference declarations are explicitly marked at the
adapter boundary; their dynamic signatures still require runtime conformance tests.
This check does not prove semantic parity with the reference compiler.

`packages/typescript/providers/classic.cjs` alone loads the TS6 SDK. It supplies
the operations with an in-process TS6 implementation. Its server support is lazy
and preserves published-plugin compatibility tests using upstream project service.
The bridge itself owns program selection. Build-time `tsc` is a separate explicit
entry point into the reference compiler. The facade's peer-compatibility version
is synchronized with the reference dependency by the export generator.

The compiler's default declaration libraries are packaged from the selected
provider. The published ESLint plugin retains a normal npm TypeScript
dependency, rather than a path to the bridge's local package.

## Provider registration and selection

`packages/typescript/providers.json` owns the default provider and the registered
implementations, declaration-library locations, private SDK identities and optional
build metafiles. `selection.cjs` validates selection before any SDK is loaded;
`registry.cjs` loads only the chosen implementation. Set `SONARJS_TYPESCRIPT_BACKEND`
before process startup for source execution. Provider changes require a fresh analysis
worker: programs, node maps, types and caches must not cross provider boundaries.

`tools/compiler-provider-plugin.mjs` uses the same registry when bundling. Each
artifact contains one selected provider and its declaration resources. The selected
provider becomes that artifact's default, even when it differs from the source default.
A request for another backend fails instead of loading a reference SDK. Choose the
artifact's provider at build time with the same environment variable. Shipping one
artifact that can switch among several providers is a separate packaging extension.

The shared `compat/index.cjs` supplies versioned constants and stateless syntax helpers
for normalized objects. Its Apache provenance and reproducible sync/check command
are in `compat/NOTICE.md`. `contract.json` records operations owned by providers, such as configuration parsing,
filesystem access, scanners, module resolution and program creation. The generator and conformance tests use this
ownership boundary without importing any particular provider implementation.
The TS6 reference retains the SDK's syntax implementations; other providers can use
the shared adoption generated from the same pinned source. This layer loads no SDK.

## Capabilities and resource ownership

Every provider exports `{compiler, compilerVersion, ownsProgramResources, disposeProgram, close}` and may
supply diagnostic `timing()`. The registry explicitly declares `watchPrograms` and
`projectService` capabilities. These are optional compatibility paths for upstream
consumers; normal analysis uses SonarJS program selection. Disabled capabilities
need no provider stubs: the shared facade reports an explicit contract error if used.
Enabling a capability requires its exports to be present.

`typescript/lifecycle` exposes immutable provider metadata, including the actual
compiler version independently of the facade's npm/peer compatibility version.
It also owns program disposal and session shutdown. Providers declare whether they
own resources requiring explicit program release. TS6 leaves this false so batch
scopes neither retain its programs nor change their garbage-collection behavior.
Resource-owning providers use an async batch program scope, releasing created programs after linting and source-cache cleanup,
on success, cancellation and failure. Disposal attempts every program and preserves
the primary analysis error. IDE caches retain their programs until replacement,
eviction or clearing. Shared disposal is idempotent; a failed release may be retried.
Worker shutdown closes the selected compiler session before closing its parent port.
Providers must not use objects after release or carry them into another session.

## Adding another provider

A provider must normalize AST kinds/flags, compiler options,
utilities, checker/type/symbol behavior and object identities to this contract.
It must preserve the filesystem host's request-content and missing-path behavior,
default libraries, module resolution and program update/invalidation semantics.
Provider internals may use a different representation or lifecycle. Those details
must stay behind the contract; adding a provider must not create a second compiler
route for rules or helpers.

Use matched inputs and rule versions to compare ASTs, maps, scopes, parser services,
findings/messages/locations/fixes and selected programs. Exercise successive IDE
updates and the packaged bridge. A provider upgrade can change type semantics even
when object shapes match, so differences need explicit investigation.

The reusable provider suite runs against every registered implementation. It checks
configuration conversion, normalized constants, source/type/symbol identity, parent
relationships, host overlays, denied reads, edits, declaration resources and shared
CommonJS/ESM/legacy resolution. Packaging tests verify the artifact default, rejection
of unavailable providers and private SDK isolation. Existing frontend comparisons and
packaged bridge tests cover upstream typed rules and successive IDE requests.

This PR registers TS6 only. The [Vercel draft](https://github.com/SonarSource/SonarJS/pull/8209)
provides a second implementation and comparison evidence; its source imports, patches,
adapters remain outside this PR. The [TSGo IPC draft](https://github.com/SonarSource/SonarJS/pull/8219)
implements the same contract; see [the provider plan](tsgo-ipc-provider-plan.md).
Performance comparisons must account separately for compiler work, conversion,
scope analysis, rule execution and unassigned/GC time; an in-process implementation
removes a transport boundary but does not guarantee a faster complete analysis.

## Validation commands

After compiling and bundling, run the packaged bridge check with
`npx tsx --tsconfig packages/tsconfig.test.json tools/check-typescript-bundle.mts`.
It starts the standalone server, checks a typed finding and its fix alongside a
syntax-only finding, and verifies that a second IDE request observes edited content.

The upstream corpus command and upgrade procedure are documented in
`packages/analysis/src/jsts/frontend/vendor/README.md`. The bridge test suite and
ruling cover the existing SonarJS project/configuration/IDE paths; the corpus
check supplies a pinned converter and scope baseline.

## Shared host and provider tooling

Rule tests use the owned parser and selected provider, including direct parser
imports in individual rule tests. Hosts expose source text without constructing a
second AST and enumerate directories represented by submitted files. Recording and
replay preserve pipe traffic as transport rather than project filesystem data.
The common conformance suite also checks UNC config inheritance and dependencies,
JSDoc syntax/checker separation and empty module specifiers.

The provider registry declares optional `prepare`, `libraryDestination`,
`bundleLibraries`, `source` and `legacyModuleResolution` fields. `source` identifies
the module to validate when the runtime entry is generated. `compiler:prepare` runs the
selected preparation script without loading an unprepared runtime; bundle builds
pass `--all` for cross-platform assets. Recursive assets retain their declared
layout, and Java deployment preserves executable archive permissions. SDK license
collection and isolation tests discover registered private SDKs rather than naming
a specific implementation.

Set `legacyModuleResolution` to false only when the compiler lacks Classic/Node10.
The shared tsconfig policy then approximates them with Bundler/Preserve and legacy
package entry points. Providers supporting those modes keep their resolver. Source
redirects for project references default to disabled, preserving explicit overrides.
Projects and fixtures are unchanged.

`tools/compiler-comparison/compare.mjs` compares any registered candidate selected
through `SONARJS_TYPESCRIPT_BACKEND` with TS6, in sequential fresh processes with
alternating order. It records exact findings, analysis time and sampled process-tree
memory, including optional provider timing. JSON is canonical; `report.mjs` generates
the Markdown report. Provider measurements remain in the provider PRs.
