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

`packages/typescript/supported-exports.json` defines supported runtime exports.
`tools/generate-typescript-exports.mjs` derives ESM exports and declarations from
that list. Reference object types remain compatible with TypeScript declarations;
unsupported runtime operations are not declared or silently forwarded. Unknown
operations and missing provider operations fail explicitly.

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
are in `compat/NOTICE.md`. `compat/provider-operations.json` records operations owned
by providers, such as configuration parsing, filesystem access, scanners, module
resolution and program creation. The generator and conformance tests use this
ownership boundary without importing any particular provider implementation.
The TS6 reference retains the SDK's syntax implementations; other providers can use
the shared adoption generated from the same pinned source. This layer loads no SDK.

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
adapters and changed ruling expectations remain outside this PR. A planned TSGo IPC
provider will use the same contract; see [the follow-up plan](tsgo-ipc-provider-plan.md).
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
