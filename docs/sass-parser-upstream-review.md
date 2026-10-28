# Upstream Sass adapter review

Review fixes for PR #8264 retain `sass-parser` as the grammar implementation. The
adapter remains responsible for mapping that tree into the source-oriented PostCSS
representation used by Stylelint.

## Components

All Sass adapter code lives in `packages/analysis/src/css/linter/sass/`:

- `index.ts` exposes the PostCSS syntax, invokes `sass-parser`, maps parser errors,
  and stringifies the resulting tree as indented Sass.
- `sass-source.ts` removes the common base indentation from embedded style blocks
  before invoking Dart Sass. It maps parsed offsets and diagnostic columns back to
  the original source. Standalone Sass is passed through without dedenting.
- `sass-header.ts` identifies a trailing statement comment without confusing quoted
  strings, escapes, URLs or comments inside expressions with that boundary. It does
  not parse or validate Sass grammar.
- `postcss-ast-builder.ts` creates ordinary PostCSS nodes, preserving original token
  spelling, formatting, comment locations and source spans. `postcss-scss` supplies
  header fields and raw selector/value spelling.

## Defects fixed

- Trailing `//` comments on nested media/include/conditional/property headers no
  longer swallow synthetic braces or crash the adapter. Comments are represented
  separately with their original locations, including NOSONAR processing.
- Selector comments are excluded from the semantic selector text while retained for
  source round trips. Multiline selectors and expression comments keep their spelling.
- Embedded Vue/HTML Sass blocks may have a base indent. Dedenting does not change
  the PostCSS input, issue locations or emitted source. Module directives remain at
  the Sass root, so this also supports embedded `@use` without a synthetic wrapper rule.
- `@at-root &` retains its selector in the at-rule parameters. Dart Sass's implicit
  selector child is flattened rather than exposed as a nonexistent nested source rule.
- Header-tokenizer errors refer to the original PostCSS input, not a temporary fragment.
- Multiline comments preserve CRLF, blank lines and trailing whitespace. Each complete
  comment is read once rather than repeatedly rescanning a growing span.

The shared rule adjustments from the custom-parser review also apply here: mixin/include
bodies provide deferred selector scope (S8776), import-placement restrictions use CSS-only
routing (S8778), and interpolated `calc()` expressions are not validated before Sass
expands them (S5362). Ordinary calculations, root nesting errors and CSS import-placement
errors retain positive regression controls.

## Validation and ruling

- All **1,102 CSS tests** pass; application/test TypeScript checks and the bridge build pass.
- All **226 standalone Sass files** parse and round-trip exactly.
- All **1,113 Sass/Vue files** in the local ace, bulma and vuetify ruling checkouts lint
  without parsing diagnostics or linter exceptions.
- All **161 files** referenced by the original ruling diff were re-linted with default
  ruling configurations. The 22 new Vue parsing failures disappear, restoring 15 rule
  findings; the false positives from mixin scope, interpolated calculations, import
  placement and the implicit at-root selector disappear.
- On those 161 files, the resulting diagnostics match the corrected custom parser,
  including rule IDs, messages and source positions. This is corpus compatibility,
  not a claim that the parsers implement identical grammar validation.

The original ruling report showed 494 removals and 475 additions against `master`.
Most remaining changes are intentional consequences of recovering previously failing
files and correcting the old PostCSS representation. Ruling expectations have not been
automatically accepted; CI must regenerate its report before those changes are reviewed.

The two existing dependency patches remain necessary: published type paths and eager
selector parsing for percentage keyframes. No additional dependency patch was introduced.
