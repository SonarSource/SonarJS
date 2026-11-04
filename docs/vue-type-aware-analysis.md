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
language for combined scripts. The compiler host creates a JS/JSX or TS/TSX SourceFile from
that representation. JavaScript scripts retain JSDoc typing. Every Vue SourceFile has module
scope, including scripts without imports or exports. Host reads still return the raw SFC.

## Supplying and updating Programs

The final inner parser receives a Program only when the prepared SourceFile has exactly matching
text, script language and JSX mode. Auxiliary parses and stale Programs remain syntax-only.
The inner parser retains a direct parser interface for consumers such as S125's comment analysis.

Script edits invalidate the compiler representation. Template/style edits can reuse the Program
when that representation is unchanged. Each host retains the raw contents it served and applies
supplied dependency edits once per request before reusing a builder. Shared SourceFile metadata
remains available across hosts. Scanner cleanup clears the projection and SourceFile caches;
IDE requests retain them for incremental updates.

Vue restores ESTree locations to the raw SFC while TypeScript nodes retain generated positions.
S1874 maps compiler diagnostics through those node maps and omits synthetic diagnostics without
a verified original location.

## Generic limitations and compatibility

Vue's parser approximates generic setup parameters as aliases to their constraints: `T extends unknown`
becomes `type T = unknown`. This loses the actual generic relationship and can cause incorrect
S4157 removal fixes, including indirect uses such as `Option<typeof value>` when `value: T`.
S4157 is therefore disabled for the entire component when a script declares Vue generics. This
also skips genuinely redundant type arguments. Other type-aware rules remain enabled, with the
underlying generic approximation still applying. Precise generic support requires a different
compiler representation.

Compatibility tests cover service forwarding, ordinary/setup/combined scripts, generics,
JS/JSDoc/JSX/TSX, JSX retries, locations, module isolation and standard/builder updates. Keep
these tests when upgrading either parser. An upstream prepared-script API could replace the
extra syntax-only preparation pass. Explicit `disableTypeChecking` remains supported.
