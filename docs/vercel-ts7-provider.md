# In-process Vercel TS7 provider

The default SonarJS compiler provider parses, binds and checks with
[Vercel's TypeScript port of TypeScript-Go](https://github.com/vercel-labs/tsc-ts).
It runs synchronously inside the analyzer's Node process. It starts no compiler
subprocess, worker or RPC connection. Existing rules, the owned ESTree converter,
scope manager and program selection continue to consume the same `typescript`
contract introduced by #8206.

## Installation and ownership

The `tsc-ts-source` dependency in package.json is the sole source of the immutable
revision. The npm release available when implementing this change contained enums
and types but no program/checker runtime, so this draft uses a pinned public source
archive. `npm ci` builds the private provider with esbuild during postinstall.
`npm run generate-meta` and `npm run compiler:check` also rebuild it, including after
CI restores only `node_modules` from cache. Generated runtime and dependency metadata
are excluded from Git. Analysis executes no Go compiler, scriptc executable or native binary. Declaration
resources come from the pinned `@typescript/native-preview` distribution; its binary
is not copied to the analyzer package.

The source archive is a monorepo whose root lacks version/license metadata. The build
copies the compiler workspace's identity into its installed root manifest and npm's
generated installation inventory, and appends
the immutable revision to its version for SBOM attribution. The SBOM command rebuilds
the provider first so restored npm caches also receive this normalization. The provider build's
esbuild input metadata is retained in the bridge metafile so the normal bundled
dependency coverage check also covers the compiler and its publication library.
License regeneration copies the upstream license/notices and the adapters' MIT
license and attribution into the analyzer package. The generated compiler bundle is
excluded from analyzer coverage, like the vendored frontend; instrumenting upstream
compiler internals produces gigabytes of unrelated coverage data.

The adapters derive from typescript-eslint's native compiler experiment. Their
provenance is in `packages/typescript/providers/vercel/NOTICE.md`. Only this provider
imports Vercel's public/private compiler modules. The public checker is incomplete;
additional operations call the pinned compiler's functions with the same checker.
Changing the pin requires revalidating those private interfaces and source patches.

## Compatibility decisions

- The compiler contract validates every supported export when selecting a provider.
  `providers.json` is the canonical registry for the default, implementation, declaration-resource
  locations and optional build metadata. The shared infrastructure lives in #8206. The source loader loads only the selected provider. Packaging replaces it
  with a static loader for that provider and rejects requests for a different backend.
  Both compiler and bridge builds reject TS6 SDK inputs in a Vercel artifact.
- Vercel supplies JSON/configuration parsing, option conversion, root enumeration,
  scanners, module resolution, source parsing, binding and checking. Node filesystem
  callbacks and Vercel's matcher implement filesystem hosts. Its default-library
  selection uses the port's utility and TS7 declaration resources.
- SonarJS owns the normalized syntax contract. Its versioned enum values and small
  stateless syntax helpers are adopted from Apache-licensed TypeScript, with pinned
  source provenance and a reproducible sync/check script. They operate on normalized
  nodes without loading an SDK. Handwritten helpers complete the shared surface.
  The adoption deliberately retains established syntax semantics rather than depending
  on a second compiler implementation at runtime. `compiler:check` verifies generated
  constants and helpers against their provenance.
- TS6 remains a development dependency for reference comparisons, type declarations,
  the published ESLint plugin and compatibility generation. The Vercel provider never
  imports or delegates to it. Another backend must implement the complete contract;
  missing endpoints fail rather than falling back to a reference provider. IPC/WASM
  adapters can reuse shared syntax helpers but must preserve the synchronous contract.
- Node10 uses Vercel's resolver with legacy options preserved. Classic file/ancestor
  lookup reuses that resolver's extension, paths and symlink machinery. SonarJS's
  shared tsconfig normalization translates `baseUrl` into absolute `paths`
  substitutions for both providers, preserving explicit aliases and fallback order
  without editing projects. The same shared policy ignores unknown-option diagnostics
  only for settings that were already inert in TS6; it preserves the rest of the
  config instead of selecting fallback options. Other unknown options still fail.
- Asserted build-time source patches handle unknown file extensions (Vue), native
  configuration host callbacks/extra extensions, legacy resolution and deprecated
  interface heritage references. A stale patch fails the build. Constructor deprecation
  messages retain the classic contract. Parser diagnostics exclude program grammar
  checks and the obsolete import-assertion diagnostic so existing projects keep
  producing analyzable ASTs.
- Compiler AST kinds, flags, lists, tokens, types, symbols and signatures are adapted
  with stable identities per program. JSDoc is kept out of the lexical token stream
  while remaining available to checker queries. Host content overlays take precedence;
  missing reads return `null` to deny the port's implicit filesystem fallback.
- Existing SonarJS program caches retain unchanged programs. A changed program is
  rebuilt, rather than reusing semantic views across generations. Existing references
  to an older program stay valid. This draft does not implement TS7 incremental builders.
  The port's process-global default-library sharing cache is released after checker
  creation and diagnostics; each checker retains its own globals. This permits garbage
  collection of abandoned program views without disposing objects a caller still holds.
- Unsupported compiler operations and adapter failures raise `CompilerContractError`.
  They cannot silently select the TS6 parser/checker or trigger Babel fallback.
  Upstream project-service compatibility is tested separately in a TS6 child process;
  production analysis uses explicit programs and configurations.

The contract version remains compatible with TS6 because upstream helpers use it to
select their API behavior. It is not the backend's compiler version. Select
`SONARJS_TYPESCRIPT_BACKEND=ts6` or `vercel` before source startup (or before
bundling to select a packaged backend) to compare providers. A packaged artifact
defaults to its build-selected provider and rejects other backend selections;
any other value fails explicitly.

## Reproducing comparisons

After `npm ci` and `npm run bridge:compile`, run:

```sh
node tools/compiler-comparison/compare.mjs /path/to/jsts-test-sources \
  tools/compiler-comparison/results 3 underscore backbone redux rxjs ag-grid
```

The runner reuses the canonical ruling rules, exclusions and configuration. It
alternates providers in fresh sequential processes, times `analyzeProject` after
filesystem initialization, and records process peak RSS. Run without competing
builds/tests. It compares issue multisets including messages, locations, secondaries
and fixes, saves every discrepancy, checks repeated-run determinism, and reports
file failures and parsing errors. Source paths in findings are normalized to the
same project root. Inputs and measured results are recorded in the accompanying
[comparison evidence](vercel-ts7-comparison.md); measurements are local evidence, not a CI performance budget.

The full bridge test suite covers the existing analyzer and rule fixtures. The
shared conformance suite runs against both registered providers. Vercel-specific
provider regression test blocks every TS6 SDK import while exercising Vercel
source files, configuration parsing, typed programs, host overlays, denied reads and
successive edits. It also checks explicit reference selection, unknown-provider failure
and declaration-resource selection across script targets.
The packaged bridge check exercises typed/syntax findings, a fix and IDE updates:

```sh
npm run bridge:bundle
npx tsx --tsconfig packages/tsconfig.test.json tools/check-typescript-bundle.mts
```

The base PR also owns rule-test parser routing, virtual-directory hosts, common
conformance regressions, comparison tooling and provider preparation/asset hooks.
This provider declares `tools/build-vercel-typescript.mjs` as its preparation script
and retains legacy module resolution. The shared policy therefore preserves its
Classic/Node10 resolver. Existing project sources and recorded ruling expectations
are unchanged by the rebase.
