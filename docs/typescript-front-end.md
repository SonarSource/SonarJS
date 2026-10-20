# Owned TypeScript front end and compiler providers

This implements the front-end ownership stage of the
[JS-2643 study](https://docs.google.com/document/d/18Qrl6y-29kRqc6NjZgKorSASN514QmoR_m0gndUb-7w/edit).
The immediate target is an in-process JavaScript compiler provider, matching the
execution model of the existing TS6 implementation. The provider boundary does
not require IPC, a worker process, remote handles or native snapshot identifiers.

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

`packages/typescript/providers/classic.cjs` is the only module loading the TS6 SDK.
The default provider now uses Vercel's TS7 port for parsing, binding and checking.
Set `SONARJS_TYPESCRIPT_BACKEND=ts6` before process startup to select the reference
provider for comparisons. The facade retains TS6 enums, utilities and declaration
libraries so existing consumers keep one compatible contract. Its server support is lazy
and preserves published-plugin compatibility tests using upstream project service.
The bridge itself owns program selection. Build-time `tsc` is a separate explicit
entry point into the reference compiler. The facade's peer-compatibility version
is synchronized with the reference dependency by the export generator.

The compiler's default declaration libraries are packaged from the selected
reference provider. The published ESLint plugin retains a normal npm TypeScript
dependency, rather than a path to the bridge's local package.

## Adding another provider

A future in-process provider must normalize AST kinds/flags, compiler options,
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

The Vercel provider and its validation are described in [vercel-ts7-provider.md](vercel-ts7-provider.md).
This does not establish TS6-free analysis or build tooling, or exact TS7 parity.
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
