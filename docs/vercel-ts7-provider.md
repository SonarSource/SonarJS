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
are excluded from Git. No Go compiler, scriptc executable or native binary is needed.

The source archive is a monorepo whose root lacks version/license metadata. The build
copies the compiler workspace's identity into its installed root manifest and npm's
generated installation inventory, and appends
the immutable revision to its version for SBOM attribution. The SBOM command rebuilds
the provider first so restored npm caches also receive this normalization. The provider build's
esbuild input metadata is retained in the bridge metafile so the normal bundled
dependency coverage check also covers the compiler and its publication library.
License regeneration copies the upstream license/notices and the adapters' MIT
license and attribution into the analyzer package.

The adapters derive from typescript-eslint's native compiler experiment. Their
provenance is in `packages/typescript/providers/vercel/NOTICE.md`. Only this provider
imports Vercel's public/private compiler modules. The public checker is incomplete;
additional operations call the pinned compiler's functions with the same checker.
Changing the pin requires revalidating those private interfaces and source patches.

## Compatibility decisions

- TS6 remains the source of the contract's constants, syntax/configuration utilities,
  filesystem host and bundled declaration libraries. It remains the build compiler
  and the published ESLint plugin's dependency. This is not a TS6-free implementation.
- TS7 removed Node10 and Classic resolution. Those configurations retain the TS6
  module-resolution utility. Resolved files are still parsed, bound and checked by
  Vercel. Modern configurations use Vercel's resolver.
- Three asserted build-time source patches handle unknown file extensions (Vue),
  the legacy resolution hook and deprecated interface heritage references. A stale
  patch fails the build. Constructor deprecation messages retain the classic contract.
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
`SONARJS_TYPESCRIPT_BACKEND=ts6` or `vercel` before startup to compare providers;
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
provider regression test blocks TS6 compiler entry points while exercising Vercel
source files, typed programs, host overlays, denied reads and successive edits.
The packaged bridge check exercises typed/syntax findings, a fix and IDE updates:

```sh
npm run bridge:bundle
npx tsx --tsconfig packages/tsconfig.test.json tools/check-typescript-bundle.mts
```
