# Upstream Sass adapter review

PR [#8264](https://github.com/SonarSource/SonarJS/pull/8264) uses `sass-parser` to
recognize indented Sass grammar and maps its statements into source-oriented PostCSS
nodes for Stylelint. Expression ASTs built upstream are not exposed to our CSS rules;
the current analysis uses statement structure, original text and source locations.

## Components

All Sass adapter code lives in `packages/analysis/src/css/linter/sass/`:

- `index.ts` invokes `sass-parser`, maps parser errors to PostCSS diagnostics and
  stringifies the mapped tree as indented Sass.
- `sass-source.ts` dedents embedded style blocks for Dart Sass and maps offsets and
  diagnostic columns back to the original source. Standalone files are not dedented.
- `sass-header.ts` finds trailing statement comments without confusing strings,
  escapes, URLs or expression comments with that boundary. It does not validate grammar.
- `postcss-ast-builder.ts` maps statements into ordinary PostCSS nodes and retains
  spelling, formatting, comments and source spans. `postcss-scss` tokenizes headers.

## Representation fixes

- Trailing `//` comments on media/include/conditional/property headers cannot swallow
  synthetic braces or crash the adapter. Comments retain their source locations,
  including NOSONAR processing. This also covers the earlier Gitar review finding.
- Selector comments stay out of selector text but remain available for round trips.
- Embedded Sass supports base indentation and root-level `@use` without a synthetic
  wrapper rule. Locations and emitted source still refer to the original document.
- `@at-root &` retains its selector in at-rule parameters. Dart Sass's implicit selector
  child is flattened so rules do not inspect a nonexistent nested source rule.
- Empty nested properties follow the existing SCSS convention: `font:` is a PostCSS
  **rule**, containing a `family: Arial` declaration. Stylelint recognizes this as a
  nested property and avoids a false unknown-property finding. Value-bearing properties
  remain SCSS nested declarations. No unknown-property rule change is needed.
- Header-tokenizer errors refer to the original input. Multiline comments preserve CRLF,
  blank lines and trailing whitespace without repeatedly rescanning their source span.

Tests assert AST hierarchy, selectors, values, original locations and round trips for
multiline `@for`, `@each`, `@if`, `@while`, `@use` and interpolated `@at-root` headers.
Nested-property tests compare real Sass/SCSS lint results. Positive controls retain
invalid-color and duplicate-property findings inside mixins.

## Dependency and patch maintenance

SonarJS maintainers changing the CSS/Sass adapter or its dependencies are responsible
for these patches, compatibility tests and their removal when upstream fixes ship.
Treat `sass-parser@0.5.3` and `sass@1.107.1` as a tested pair. The direct parser dependency
is exact; a scoped npm override pins its transitive compiler. The lockfile records the
pair, and `npm ls sass-parser sass` verifies what is installed.

The 0.5.3 upgrade changes the parser's dependencies to Sass `^1.107.1` and PostCSS
`8.5.31`; its published runtime and declaration files are identical to 0.5.1. Both
0.5.2 and 0.5.3 [report no user-visible changes](https://github.com/sass/dart-sass/blob/main/pkg/sass-parser/CHANGELOG.md). Sass 1.107 adds deprecation-selection
options, and 1.107.1 corrects the embedded protocol version. These do not add analysis
capabilities to this adapter. Both integration defects below remain in the published
packages, so both patches are retained and rebased for the new exact pair.

| Patch                     | Reason and tracking                                                                                                                                                                                                                                                                                                                                                               | Removal criterion                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `sass-parser+0.5.3.patch` | Published declaration paths point at absent `dist/types` instead of `dist/lib`. Upstream: [dart-sass#2907](https://github.com/sass/dart-sass/issues/2907).                                                                                                                                                                                                                        | The published package resolves its types without the patch and both TypeScript checks pass.                                      |
| `sass+1.107.1.patch`      | The internal parser entry enables eager CSS-selector parsing, rejecting valid percentage keyframe selectors. The adapter needs statement spans rather than selector ASTs. Local tracking: [review item 3](https://github.com/SonarSource/SonarJS/pull/8264#pullrequestreview-5710704011). No matching upstream issue was found; an upstream reproduction still needs to be filed. | The unpatched parser accepts percentage lists such as `0%, 50%`, preserves spans, and the adapter/Stylelint contract tests pass. |

The compiler patch edits generated JavaScript and is the larger maintenance risk: a
successful textual application alone does not establish compatibility. For any update:

1. Review upstream parser/compiler changes and select an exact compatible pair. Update
   the override and lockfile together; rebase or remove both versioned patches as needed.
2. Run a clean `npm ci` to verify patch application and inspect `npm ls sass-parser sass`.
3. Run both TypeScript checks, the CSS suite and production bridge bundle. Focused contracts
   cover percentage-keyframe ASTs and linting, diagnostic locations with CRLF/path spaces,
   embedded dedenting, multiline directives and original source round trips.
4. Re-lint the Sass/embedded corpus and review the CSS ruling delta. Remove each patch
   only after its unpatched replacement passes the relevant contracts.

This does not require waiting for a stable upstream release. It makes the experimental
integration and the cost of future upgrades explicit.

## Ruling review

The [report reviewed on 2026-11-05](https://github.com/SonarSource/SonarJS/pull/8264#issuecomment-6476028087)
contains **574 removals and 327 additions**. The committed CSS expectations reproduce
those totals against the PR's original merge base. The earlier 494/475 report describes
an older implementation and should not be used to assess the current change.

| Category                   | Reviewed change                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recovered analysis         | 93 removed S2260 entries: the review identified 81 parser warnings and 12 analyzer exceptions. Previously failing files account for 305 of the 327 additions.                                                                                                                                                                                                                               |
| Representation corrections | The remaining 388 removals and 22 additions concern files that already produced analysis: data URLs remain declaration values (279 S4653 removals), mixin shorthand remains an at-rule instead of a selector, source directives prevent false empty-source reports, and `!important` is separated from values. Duplicate-selector/block locations also change with the corrected hierarchy. |
| S8776 configuration        | 20 removals in SCSS: console 5, desktop 9, vuetify 6. Mixin/include bodies receive selector scope later, so their `&` references are allowed. Root `&` still triggers the rule in CSS, SCSS and Less.                                                                                                                                                                                       |
| S8778 applicability        | 73 removals: 70 Less imports in ant-design and 3 SCSS imports in console. Import-placement restrictions are now CSS-only, including filtering embedded non-CSS blocks. Imports can legally follow other statements in these preprocessors. CSS import-placement checks remain enabled.                                                                                                      |
| S5362 implementation       | Interpolated `calc()` values are deferred until Sass expansion. This is a rule implementation change, distinct from the configuration/applicability adjustments above. It contributes no entries to this ruling delta; regression tests cover interpolation and invalid ordinary calculations.                                                                                              |

The 305 additions on recovered files include deprecated properties, duplicate selectors
and blocks, `!important`, transition declarations, and the ace legacy-property sample.
Other additions include source `!important` and animation-name findings now visible to
unchanged rules. Representative source snippets from every changed rule category were
reviewed; matching expectations alone is not proof that every finding is correct.
The review's known root-`&`, escaped-selector and deeper nested-property limitations
also reproduce on master and remain outside this migration's scope.

Expectations **have already been updated**. After the nested-property fix and master
merge, all **197 affected files** were re-linted with the current default CSS ruling
configuration. Their rule IDs and line-number multisets match the committed expectations;
there were no linter exceptions. No further expectation changes were necessary.

## Validation on 2026-11-05

- The full CSS suite passes **1,198 tests**, including the SCSS/Less applicability controls.
- Application and test TypeScript checks pass; the production bridge bundle builds.
- A real request through the bundled gRPC server and analysis worker reports no
  nested-property false positive and still detects an invalid color on its original line.
- All **221 standalone Sass files** in the available ace, bulma and vuetify checkouts
  parse and round-trip exactly. This is the local checkout count, not the earlier
  independent review's 226-file corpus.
- All 197 files affected by the committed CSS ruling changes match their expectations,
  as described above. This is a focused CSS rerun, not a full multi-language ruling run.

## Actual analyzer startup measurement

The 2026-11-03 benchmark used the complete production Node server and analysis worker,
with upstream head `44eac180` and custom head `c7dfb992`. On an Apple M5 Pro (48 GiB),
Node 24.14.1, 15 fresh processes per variant after two warmups, alternating order and
warm filesystem caches, median wall-clock times were:

| Milestone from process spawn  |   Upstream |     Custom | Upstream difference |
| ----------------------------- | ---------: | ---------: | ------------------: |
| gRPC server listening         |   867.2 ms |   766.2 ms |           +101.0 ms |
| First empty analysis response | 1,662.8 ms | 1,458.2 ms |           +204.6 ms |

The milestones are cumulative, not additive. The response confirms the worker handles
a real request; it includes transport and empty-project initialization. JVM/scanner
startup, downloading/extracting the analyzer and real project analysis are excluded.
The full minified bundles were 25,825,724 and 22,131,175 bytes respectively. These results
measure the earlier pinned heads, not the subsequently merged master dependencies.
They provide analyzer-level context beyond isolated parser loading; they are not a
prediction of total scan overhead for every project.
