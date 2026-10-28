# Sass parser review follow-up

This records the fixes prompted by Gitar and the first ruling report on PR #8265.
The original comparison JSON remains a historical snapshot; its hashes and issue totals
describe the implementation before these fixes.

## Parser fixes

- **Compact declarations:** numeric, quoted and variable values such as `margin:0` and
  `width:$size` are recognized as declarations. Ambiguous values such as `color:#ggg`
  are resolved after child indentation is known. Trailing comments do not make them
  selectors. Identifier-valued forms such as `a:hover` and `color:red` remain selectors,
  matching the upstream parser's distinction. This avoids the overbroad interpretation
  that every colon without whitespace must become a declaration.
- **Commented selector lists:** `a, // note` continues onto the next selector line.
  `postcss-scss` supplies a comment-free selector for rules and retains its original
  spelling for stringification.
- **Indented multiline comments:** merged comment text comes from its complete source
  span. CRLF, internal blank lines, trailing spaces and suppression locations survive
  round trips.
- **Embedded indentation:** `postcss-html` passes the containing document when parsing
  a style block. The statement parser uses that block's initial indent as its base
  without rewriting source text or shifting diagnostics. Standalone Sass still rejects
  initial indentation, consistent with the official parser.
- **Benchmark discovery:** Node's built-in globbing replaces the external `rg` command.
  It finds the same 226 files and the same corpus hash as the original measurement.

## Rule behavior exposed by successful parsing

Once previously failing files parse, existing CSS rules can encounter Sass constructs
they did not previously analyze. These are handled separately from statement parsing:

- **S8776:** mixin definitions and include bodies are valid deferred scoping contexts.
  The Stylelint configuration adds `mixin` and `include` to its at-rule exceptions while
  preserving configured exceptions. A root `&` outside such a context still reports.
- **S8778:** import-placement restrictions apply to CSS, while Sass permits imports
  after other statements. The rule uses the existing CSS-only routing, including its
  filtering for embedded Sass. Plain CSS still reports invalid import placement.
- **S5362:** an interpolated `calc()` cannot be validated before Sass expands it.
  That calculation is skipped, while ordinary calculations in the same file continue
  to report malformed expressions and division by zero.

## Ruling audit

The original report contained 494 removed findings and 474 added findings. All 161 files
referenced by that diff were re-linted with the default ruling configurations. The
22 newly failing Vue files now parse, recovering 15 rule findings: four specificity
findings and eleven `!important` findings.

The remaining difference from this branch's `master` baseline in those 161 files is:

| Rule                              | Removed |   Added | Review explanation                                                                      |
| --------------------------------- | ------: | ------: | --------------------------------------------------------------------------------------- |
| S2260                             |      93 |       0 | Old parsing failures disappear; no new parsing failures remain.                         |
| S4653                             |     279 |       0 | Old unknown-unit findings were on six SVG data-URL lines.                               |
| S4667                             |      22 |       0 | Files containing directives/mixins are represented as nonempty trees.                   |
| S4670                             |      53 |       0 | Mixin calls such as `+mobile` become at-rules rather than type selectors.               |
| S8757                             |       9 |       0 | Valid `!important` is recognized rather than reported as an unknown annotation.         |
| S4664                             |      15 |     118 | Corrected selector nesting/grouping changes specificity analysis.                       |
| S4666                             |      10 |      43 | Mixin calls cease to be duplicate selectors; successfully parsed selectors are checked. |
| S9423                             |       0 |     157 | `!important` is exposed consistently, including restored Vue coverage.                  |
| S1874, S4657, S4658, S4659, S9440 |       0 |       9 | Additional findings from successfully analyzed source.                                  |
| **Total**                         | **481** | **327** | These are local results for the affected files, not a replacement CI report.            |

Specificity and duplicate-selector diagnostics still use Stylelint's interpretation of
the mapped statement tree. They do not evaluate mixin expansion or the final compiled
CSS. The parser does not claim compiler-level validation of those findings.

An additional scan of every `.sass` and `.vue` file in the local ace, bulma and vuetify
ruling checkouts covered **1,113 files with zero parsing diagnostics or linter exceptions**.
This catches embedded styles omitted by the original standalone Sass benchmark.

Ruling expectations have not been automatically accepted. CI should regenerate its
report from the corrected implementation before any expectation update is reviewed.

## Updated measurements

Same machine and 226-file corpus as the original comparison. The upstream bundle is
the saved baseline; the custom bundle includes these review fixes. Both still parse
and exactly reproduce all 226 standalone Sass files.

| Measure                          | Saved upstream adapter | Reviewed custom parser |
| -------------------------------- | ---------------------: | ---------------------: |
| Isolated syntax bundle, minified |                3.73 MB |               108.2 KB |
| Full bridge, minified            |               25.82 MB |               22.13 MB |
| Cold syntax-module load, median  |                99.5 ms |                 3.2 ms |
| Warm parse, corpus median        |                58.7 ms |                21.4 ms |
| Warm lint, corpus median         |               437.5 ms |               404.5 ms |

Lint measurements include the reviewed rule behavior above; they no longer isolate
the parser choice. The baseline retains its old mixin-scoping and calculation checks.
Both runs exclude the current CSS-only rules and `no-empty-source`. The recorded issue
counts are 584 upstream and 477 custom, reflecting those policy differences as well
as the previously documented `@at-root` representation difference. The original
605-versus-604 comparison remains in the historical snapshot.

These are local samples without a statistical significance test. Generated raw bundles
and results remain in ignored `target/sass-comparison/`, using the label
`statement-parser-reviewed` for the new capture.

Validation: all 1,138 CSS tests, application/test TypeScript checks and the full bridge
build pass. Regression cases cover every Gitar finding, embedded source locations,
the ruling false positives above, and positive controls showing that real diagnostics
remain enabled.
