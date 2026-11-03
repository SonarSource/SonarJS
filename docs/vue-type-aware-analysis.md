# Type-aware analysis of Vue scripts

SonarJS owns Vue script Programs in both batch and IDE analysis. Templates and parser helpers
remain syntax-only. Full template typing, component export generation and Vue macro semantics
are outside this integration.

## Preparing the compiler representation

`packages/analysis/src/jsts/parsers/vue.ts` runs a cached syntax-only `vue-eslint-parser` pass.
Its inner parser attaches the received script text and parsing mode as an enumerable Symbol
service. Vue forwards the final script's services, so the adapter captures Vue's own setup,
combined-script and generic transformations, independently of auxiliary parser calls.

Vue selects the script language from `lang`, defaulting to JavaScript and using the setup
language for combined scripts. `program/file-representation.ts` selects the plain-file or Vue
strategy, including compiler text, script kind, reuse and SourceFile creation. The compiler
host owns reads, versions and invalidation, without performing Vue transformations itself.
JavaScript scripts retain JSDoc typing. Every Vue SourceFile has module
scope, including scripts without imports or exports. Host reads still return the raw SFC.

## Supplying and updating Programs

For non-generic scripts, the final inner parser receives a Program only when the prepared
SourceFile has exactly matching text, script language and JSX mode. Auxiliary parses and stale
Programs remain syntax-only. Generic scripts use the mapped services described below.
The inner parser retains a direct parser interface for consumers such as S125's comment analysis.

Script edits invalidate the compiler representation. Template/style edits can reuse the Program
when that representation is unchanged. Each host retains the raw contents it served and applies
supplied dependency edits once per request before reusing a builder. Shared SourceFile metadata
remains available across hosts. Scanner cleanup clears the projection and SourceFile caches;
IDE requests retain them for incremental updates.

Vue restores ESTree locations to the raw SFC while TypeScript nodes retain generated positions.
S1874 maps compiler diagnostics through those node maps and omits synthetic diagnostics without
a verified original location.

## Generic setup scripts

Vue's parser approximates generic setup parameters as aliases to their constraints: `T extends string`
becomes `type T = string`. SonarJS instead creates a compiler representation with a genuine generic
setup function. The parameters, constraints and defaults come from Vue's public `VGenericExpression`.
Only synthetic aliases absent from the final ESLint AST are removed. Ordinary script statements
remain at module scope; setup imports are hoisted outside the function. Simple typed ambient
variables become definitely assigned local bindings, so their types can refer to the parameters
without illegal ambient declarations inside a function. The function is async to allow setup await.

ESLint still receives Vue's unchanged AST, scope manager, tokens and restored SFC locations. The
final inner parse runs syntax-only, then maps its original TypeScript nodes to the semantic
SourceFile by node kind and mapped start/end offsets. Parser services delegate to that Program's
public type checker. This keeps generic relationships for S4325, S6571 and S4157, including indirect
references and dependent defaults, while retaining genuinely redundant findings and original fix
ranges. No rule-specific generic suppression is needed.

The cache compares compiler text as well as language and mode. A generic-default-only edit must
invalidate the Program even when Vue produces identical alias text. Supplied Programs are checked
against both representations before any typed services are exposed.

Unsupported projections remain syntax-only for the whole component. These include ambient
functions/classes, ambient destructuring, namespaces and exports inside setup. Any missing mapping for a
previously mapped surviving node also rejects typed services. This fallback preserves syntax
analysis without exposing constraint aliases as genuine generic types. Full Vue macro and
template semantics remain outside this integration.

## Compatibility

Compatibility tests cover service forwarding, ordinary/setup/combined scripts, generics,
JS/JSDoc/JSX/TSX, JSX retries, locations, module isolation and standard/builder updates. Keep
these tests when upgrading either parser. An upstream prepared-script API could replace the
extra syntax-only preparation pass. Explicit `disableTypeChecking` remains supported.
