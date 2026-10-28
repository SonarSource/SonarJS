# Type-aware analysis of Vue scripts

SonarJS supplies Vue script SourceFiles through the same `IncrementalCompilerHost` used by
batch Programs and IDE builder Programs. Templates and parser helpers use syntax-only parsing.
This restores script-level type-aware rules without delegating Program updates to typescript-eslint.

## Script representation

`packages/analysis/src/jsts/parsers/vue.ts` owns the representation shared by the compiler host
and the inner parser. On a cache miss it runs a syntax-only `vue-eslint-parser` pass. A custom
inner parser attaches an enumerable Symbol service containing its received script text and mode.
Vue forwards the final script result's services to the outer result, so this captures Vue's own
setup, combined-script and generic rewriting. It does not depend on which inner call runs last:
CSS expressions can be parsed after the script.

The host creates a SourceFile from that representation, with explicit TS/TSX ScriptKind, while
`readFile` continues to return the raw SFC. Internal `allowNonTsExtensions` enables `.vue` roots
in configured and orphan Programs. Projection and SourceFile caches are cleared with the raw
content cache after scanner analysis and retained for IDE requests.

The typed inner parser only supplies a Program for a SourceFile created from this representation,
with exactly matching text and JSX mode. It clears `programs`, `project` and `projectService`
for other calls. This matters because typescript-eslint accepts supplied SourceFiles by filename
without checking their text, and Vue's auxiliary parses use the same filename for different snippets.
Stale or incompatible Programs fall back to syntax-only parsing.

Raw edits invalidate projections. IDE builders can retain the Program when generated script text
and mode stay identical after a template/style edit. All supplied edits to Program members are
applied before reusing a builder, including changes to imported dependencies. Script changes
invalidate the SourceFile and rebuild the builder; analysis itself never patches Program text.
Each cached host synchronizes dependency edits once per request, using the context revision
rather than the files object's identity, so analyzing multiple files does not repeatedly scan
the entire request.

Vue remaps ESTree positions to the raw file, while mapped TypeScript nodes retain generated
positions. S1874 maps compiler suggestion diagnostics back through the node maps before reporting.
Synthetic diagnostics with no verified original location are omitted.

The compatibility tests exercise the services-forwarding contract, ordinary/setup/combined/reversed
scripts, generics, JS/JSX/TSX, JSX retries, empty scripts, locations, stale Programs and builder edits.
Keep these tests when upgrading either parser. A future upstream prepared-script API could remove
the extra syntax-only pass without duplicating Vue's transformations in SonarJS.

This is script analysis. Vue component export generation, full macro semantics and template type
checking are not provided by this adapter. Explicit `disableTypeChecking` remains supported.
Generic attributes are approximated as aliases of their constraints by Vue's parser. For example,
`generic="T extends unknown"` produces `type T = unknown`, which can make S4157 incorrectly
report a necessary `Option<T>` argument as the default `Option<unknown>`. This predates the
March 2024 removal of Vue typing: the same seven S4157 findings in ruling's `c-select.vue`
reproduce with the former dependency versions (vue-eslint-parser 9.3.2, typescript-eslint
6.14.0 and TypeScript 5.3.3). Ruling expectations retain these findings as a documented
upstream limitation.

## Vuetify performance and ruling changes

Run the existing ruling project in its own process from a checkout with dependencies, generated
metadata/protobuf files and the ruling source submodule prepared:

```sh
npx tsx --tsconfig packages/tsconfig.test.json --test packages/ruling/projects/vuetify.ruling.test.ts
```

Every ruling project writes `target/ruling-performance/<project>.json` before comparing expected
issues and prints a `RULING_PERFORMANCE` JSON line. CI uploads these reports in the
`js-ts-ruling-performance-<sha>` artifact even when expected issues differ. Vuetify's report contains:

- Elapsed file-store initialization plus project analysis time, excluding report writing/comparison.
  Filesystem-cache runs also include capture finalization; compare runs using the same mode.
- Peak process RSS and final heap usage in MiB. RSS includes runtime/module loading; final heap is
  sensitive to GC timing and is not a retained-memory measurement.
- Node version, OS and architecture, analyzed/Vue file counts, errors, parsing errors and issue count.
- Attempted, successful and failed Program creation counts from existing analysis telemetry.

For a before/after comparison, use the same Node/dependency versions, ruling source revision,
configuration and machine. Copy each report before the next run overwrites it. Use at least three
fresh processes per revision, run serially without other heavy workloads, and compare medians.
Keep the individual samples and revision identities. The CI ruling suite runs projects concurrently;
its reports are useful for trends, while controlled isolated reruns provide better regression estimates.

Check file/error counts alongside timings: skipping files or losing type information can otherwise
look like a speedup. Review issue differences separately; restoring types can both add findings and
remove unresolved-import false positives. A ruling mismatch still leaves its performance report.

The relevant baseline is current syntax-only Vue analysis. This measures the cost of restoring
types, rather than asserting a speedup over the much older watch-program implementation. The
old repeated snippet replacements are absent by construction, but type graph construction and
queries still cost CPU/memory, and the preparation pass adds syntax work per changed raw file/mode.
