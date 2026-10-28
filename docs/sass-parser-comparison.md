# Sass parser alternatives

The `sass-parser` implementation is preserved in commit `eea7badd1` on
`codex/sass-parser-postcss`. The experimental statement parser is on
`codex/sass-statement-parser`. The branches are alternatives for review against `master`.

Both alternatives expose the same PostCSS syntax object and use the same Stylelint
configuration. CSS-only rules stay excluded from standalone Sass analysis. Neither
alternative evaluates variables, resolves imports, expands mixins, or emits compiled CSS.

## Design

The upstream variant parses the source with Dart Sass through `sass-parser`. Our
builder converts Sass statement spans to PostCSS nodes, using `postcss-scss` to retain
original token spelling. Two dependency patches correct the published types and disable
eager selector parsing, which otherwise rejects percentage keyframes. Error conversion
reads locations from Dart Sass diagnostic text.

The custom implementation lives under `packages/analysis/src/css/linter/sass/`,
with `index.ts` exporting the PostCSS syntax. It separates lexical scanning from indentation parsing:

- `SassStatementScanner` reads complete statement headers and indented comments. Its
  internal `HeaderScanner` uses explicit code, string, line-comment, and block-comment
  states. One lexical pass classifies each header and finds its boundaries, sharing
  quote, escape, and delimiter handling.
- `sass-statement-rules.ts` names the policies for declaration separators, continuation
  lines, and statements that allow children.
- `SassStatementParser` builds the indentation tree, then normalizes trailing comments,
  validates nested properties, and completes container source spans.
- `PostcssAstBuilder` maps these source-span descriptors into PostCSS nodes. Existing
  `postcss-scss` tokenization supplies declaration and at-rule fields.

Quoted strings, escapes, comments, matching delimiters, interpolation boundaries,
multiline selectors, and continued expressions stay supported. Scanner and tokenizer
errors refer to the original PostCSS input. No new runtime package is needed.
The architecture refactor preserves identical statement descriptors, PostCSS ASTs,
formatting, and source locations on all 226 corpus files.

Values remain strings in the mapped AST in both implementations. The upstream parser
internally builds expression ASTs; the custom parser does not. Recognizing matching delimiters
is different from validating Sass expressions or Sass-specific at-rule parameters.

## Measurements

Measured on Apple M5 Pro, darwin/arm64, Node v24.14.1.
The corpus contains 226 files and 407,527 source bytes.

| Measure                                   | sass-parser | Custom statements |
| ----------------------------------------- | ----------: | ----------------: |
| Isolated syntax bundle, minified          |     3.73 MB |          107.5 KB |
| Isolated syntax bundle, gzip              |    793.6 KB |           34.0 KB |
| CSS linter bundle, minified               |     8.85 MB |           5.17 MB |
| Full bridge bundle, minified              |    25.82 MB |          22.13 MB |
| Full bridge bundle, gzip                  |     6.56 MB |           5.78 MB |
| Full bridge bundle, Brotli                |     5.48 MB |           4.95 MB |
| Cold syntax-module load, median           |    110.5 ms |            3.2 ms |
| RSS increase after syntax-module load     |    67.57 MB |           1.11 MB |
| JS heap increase after syntax-module load |    14.28 MB |           0.36 MB |
| Warm parse, all 226 files, median         |     58.6 ms |           18.1 ms |
| Warm lint, all 226 files, median          |    439.7 ms |          365.3 ms |

The full bridge saves 3.69 MB uncompressed
(14.3%). The observed warm parsing median is
3.2 times faster. The warm lint median is
16.9% faster in this run. Lint sample ranges are
435.4 ms–452.3 ms versus 356.4 ms–405.6 ms.
These are single-machine samples, without confidence intervals or a significance test.

Validation: all 1,121 current CSS tests pass, application and test TypeScript checks pass,
and bundled standalone Sass and Vue diagnostics pass. The baseline passed 1,074 tests
before the custom-specific cases were added.

These are local measurements, not a performance guarantee. Warm timings exclude file IO
and use the same corpus and enabled rules for both variants. Parsing time excludes
stringification. Lint time includes parsing and the rules, with default options.
The custom parser performs less syntax validation, so the workloads are not semantically
identical. Cold loading measures the isolated syntax module, not full SonarJS startup.
RSS and heap deltas measure module loading only; allocator behavior makes them approximate.

The isolated syntax bundles include PostCSS and other shared parser dependencies. The
full bridge comparison captures the practical analyzer bundle impact. Sizes are decimal
bytes/KB/MB, before any Java/JAR packaging. Gzip uses level 9; Brotli uses quality 5.

## Compatibility findings

- Both variants parse and exactly reproduce all 226 corpus files. The corpus includes
  duplicated fixtures and local integration projects; it is not an exhaustive Sass
  specification suite.
- Both run the same 45 non-CSS-only rule bindings (excluding `no-empty-source`) without
  parsing diagnostics or linter exceptions on that corpus.
- The baseline reports 605 issues; the custom variant reports 604. The difference is one
  `block-no-redundant-nested-style-rules` warning at line 62 of Vuetify's `VBtn.sass`.
  Dart Sass expands `@at-root &` into an at-rule containing an implicit selector rule.
  The custom variant retains `&` as at-rule parameters, matching its source statement
  structure. This changes what the CSS rule sees. No claim is made here that either
  diagnostic is preferable; this needs a deliberate compatibility decision.
- ASTs differ in eight corpus files. Seven involve the `@at-root <selector>` representation.
  In `VColorPicker.sass`, the custom parser also separates a trailing selector comment
  into a comment node; the baseline includes it in the selector string. The remaining
  218 files have matching statement fields and source positions.
- Added regression cases cover operators across lines, `@use ... as *`, percentage
  values, protocol-relative URLs, comments after mixin calls or conditional headers,
  comment spelling inside maps, escaped CRLF strings, malformed delimiters, indentation,
  and original source locations for header-tokenizer errors.
- The custom variant preserves `//` spelling inside multiline values. The baseline
  stringifier converts that spelling to `/* ... */` for the dedicated map probe.
  Comments inside expressions still remain inside raw value text; neither mapping
  exposes them as separate comment nodes for metrics or suppression processing.

| Targeted probe                | sass-parser adapter                         | Custom statements         |
| ----------------------------- | ------------------------------------------- | ------------------------- |
| comment inside map            | Accepts; source spelling changes            | Accepts; source preserved |
| comment on conditional header | Rejects: this.proxyOf.nodes is not iterable | Accepts; source preserved |
| invalid annotation            | Rejects: Expected "important".              | Accepts; source preserved |
| missing arithmetic operand    | Rejects: Expected expression.               | Accepts; source preserved |
| invalid for clause            | Rejects: Expected "to" or "through".        | Accepts; source preserved |
| unquoted use URL              | Rejects: Expected string.                   | Accepts; source preserved |
| unbalanced expression         | Rejects: expected ")".                      | Rejects: expected ")".    |

These probes show why corpus acceptance alone is insufficient. A structural parser
can accept malformed expressions and at-rule parameters that Dart Sass rejects.
It is suitable for evaluating a lint-oriented approach, but not yet a replacement
for the official Sass grammar. Both variants also defer selector validation: the
upstream variant does so through its dependency patch.

## Maintenance tradeoffs

| Ownership / review surface                                           |            sass-parser variant |                                Custom statements |
| -------------------------------------------------------------------- | -----------------------------: | -----------------------------------------------: |
| Production adapter/parser source lines, including headers and blanks |                            371 |                                              772 |
| New direct runtime packages                                          |                              1 |                                                0 |
| Sass-specific dependency patches                                     |                              2 |                                                0 |
| Statement and expression grammar                                     |          Upstream Sass project | SonarJS statement scanner; no expression grammar |
| AST source-location adjustments                                      | Upstream spans adapted locally |                    Source spans computed locally |
| Expression AST available internally                                  |      Yes, discarded by adapter |                                               No |

The custom parser removes a large dependency and the two upstream patches, but moves
ownership of statement recognition and future Sass syntax changes into SonarJS.
Continued-expression detection is deliberately lexical; it does not implement operator
precedence or expression semantics. That boundary needs explicit tests as Sass evolves.
The line count measures review surface, not an estimate of maintenance hours.

The upstream variant benefits from official grammar development and could support future
expression-aware rules if its richer tree were retained. Its wrapper remains experimental,
and our adapter still needs to handle API gaps, source-span differences, and release updates.

Other variables worth tracking are false positives/negatives, parsing-error rates on real
projects, source-location accuracy, comment/directive behavior, diagnostics for invalid
inputs, initialization memory, malformed-input performance, and the effort required when
Sass introduces new syntax. The current tests do not establish exhaustive grammar
coverage, worst-case performance, or security/fuzzing coverage for either adapter.

## Reproducing the comparison

The benchmark script snapshots minified syntax, linter, and full bridge bundles, together
with the source revision and hashes. It then loads each variant in separate Node processes.
It runs three full-corpus warmups, fifteen parsing samples, seven lint samples, and seven
fresh-process syntax loads. Results include per-file AST hashes, lint issues, source
round trips, and targeted syntax probes.

With dependencies installed for the relevant variant:

```sh
node tools/benchmark-sass-parser.mjs capture sass-parser
node tools/benchmark-sass-parser.mjs capture statement-parser
node tools/benchmark-sass-parser.mjs compare sass-parser statement-parser
```

Run each `capture` on its corresponding checkout, not twice against the same source.
The benchmark script is added only on the custom branch. To reproduce both from separate
checkouts, copy the script into `tools/` in the baseline checkout first. Set
`SASS_BENCHMARK_DIR` to the same absolute output directory for both checkouts and for
`compare`. Each checkout needs its own matching `npm ci` installation. The script compiles
application sources before bundling. The local `its/sources` checkouts must contain the
same Sass corpus to reproduce these figures; corpus paths and contents are hashed.

Generated bundles and full raw results stay under `target/sass-comparison/` by default.
The compact measured snapshot is in `docs/sass-parser-comparison.json`. To repeat the CSS
regression checks:

```sh
node --import tsx --test --test-concurrency=4 packages/analysis/tests/css/**/*.test.ts packages/analysis/src/css/rules/**/unit.test.ts
node_modules/.bin/tsgo -p packages/tsconfig.app.json
node_modules/.bin/tsgo -p packages/tsconfig.test.json --noEmit
```

## Decision

The custom variant makes a substantial size reduction possible and is faster on this
corpus. The upstream variant offers stronger grammar validation and delegates language
evolution to the Sass project. Choosing the custom variant for production should depend
on broader conformance and diagnostic checks, especially the `@at-root` representation
and inputs accepted by the custom parser but rejected by Sass. These measurements do
not by themselves establish equivalent language support.
