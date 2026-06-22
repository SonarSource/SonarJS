Strategy: implement S8907 as an original, non-fixable rule with one `CallExpression` visitor and a SonarJS-owned method catalog. Do not import either upstream plugin.

Context: JS-1011 and RSPEC target JavaScript and TypeScript. The upstream `you-dont-need` plugin is useful as catalog inspiration, but its one-rule-per-method model, import-level reports, and simple `_`/`lodash` name checks do not fit SonarJS. `eslint-plugin-lodash-es` is also not a good base: it is lodash-es-focused, broad, and fix-heavy.

In scope:

- Use `getFullyQualifiedName()` plus cheap syntactic prefilters to detect actual calls from `lodash`, `lodash-es`, and `underscore`.
- Keep upstream-style forbidden import filtering: only accept whole-library calls and exact method entry points equivalent to `lodash/<method>`, `lodash-es/<method>`, and `lodash.<method>`. Reject nested paths such as `lodash/fp/map`, `lodash/map/fp`, or `lodash.map/fp`.
- Cover namespace/default calls such as `_.map()` and `lodash.map()`.
- Cover named imports such as `import { map } from "lodash"; map(...)`.
- Cover subpath/modular imports such as `lodash/map` and `lodash.map`, including camel-case normalization like `lodash.clonedeep`.
- Cover common `require` and destructured `require` forms.
- Keep the first-pass catalog conservative: Jira/RSPEC examples, simple array/collection/string/object helpers, and direct type checks.
- Use per-method ES gates, not rule-level `requiredEcmaVersion`.

Selected catalog:

- Array and collection helpers: `all`, `any`, `collect`, `concat`, `contains`, `detect`, `drop`, `dropRight`, `each`, `every`, `fill`, `filter`, `find`, `findIndex`, `flatten`, `foldl`, `foldr`, `forEach`, `includes`, `indexOf`, `inject`, `join`, `lastIndexOf`, `map`, `reduce`, `reduceRight`, `reverse`, `select`, `slice`, `some`, `takeRight`, and `uniq`.
- Object helpers: `assign`, `entries`, `extendOwn`, `keys`, `pairs`, `toPairs`, and `values`.
- String helpers: `endsWith`, `padEnd`, `padStart`, `repeat`, `replace`, `split`, `startsWith`, `toLower`, `toUpper`, and `trim`.
- Function and type helpers: `bind`, `isArray`, `isFinite`, `isInteger`, and `isNaN`.

Catalog value review:

- Definitely keep: `all`, `any`, `assign`, `collect`, `concat`, `detect`, `drop`, `dropRight`, `each`, `entries`, `every`, `extendOwn`, `fill`, `filter`, `find`, `findIndex`, `flatten`, `foldl`, `foldr`, `forEach`, `indexOf`, `inject`, `isArray`, `isInteger`, `join`, `keys`, `lastIndexOf`, `map`, `pairs`, `reduce`, `reduceRight`, `reverse`, `select`, `slice`, `some`, `takeRight`, `toPairs`, `uniq`, and `values`.
- Unclear value: `bind`, `contains`, `endsWith`, `includes`, `isFinite`, `isNaN`, `padEnd`, `padStart`, `repeat`, `replace`, `split`, `startsWith`, `toLower`, `toUpper`, and `trim`.
- Rationale: the definitely-keep group has familiar native array/object/type replacements and should be useful even with cautious wording. The unclear group may be noisy without type checking because the native replacement can depend on the runtime receiver (`contains`/`includes`), or because Lodash/Underscore coercion/nullish handling is often the reason the helper was used (`String` and strict `Number` helpers), or because function binding semantics can be subtle (`bind`).

Out of scope:

- `lodash/fp`, because argument order and currying change semantics.
- Global unresolved `_`, even if lodash is a dependency.
- Computed members like `_["map"]`.
- Import-only reports.
- Chained wrapper calls such as `_.chain(items).map(...)`, because the native replacement would need to account for the wrapper pipeline.
- Broad transformations such as `get`, `size`, `throttle`, `unionBy`, `omit`, `defaults`, `castArray`, `capitalize`, `isDate`, and `isArrayBuffer`.
- Language-expression-only predicates such as `isNil`, `isNull`, `isUndefined`, `isString`, and `isFunction`; they are useful refactors, but not recommendations to use a standard API.
- Positional helpers `first` and `head`, because the native replacement is either indexing syntax or `Array.prototype.at(0)`, and Underscore's arity differs.
- `last`, because S7755 already handles `_.last`, `lodash.last`, and `underscore.last`.
- `cloneDeep`, because S7784 owns `_.cloneDeep`/`lodash.cloneDeep` to `structuredClone`.

Issue location and messages:

- Report on the method identifier when present: `map` in `_.map`, the imported callee `map`, or the full callee for `require("lodash/map")(...)`.
- Use the exact library family detected from the resolved import in messages: `lodash`, `lodash-es`, or `underscore.js`.
- Use direct wording for close matches: `Use Array.isArray() instead of isArray() from lodash.`
- Use cautious wording for non-identical behavior: `Consider Array.prototype.map() instead of map() from lodash-es; check that the behavior is equivalent because the library also accepts objects and nullish values.`
- For nontrivial substitutions, keep the cautious behavior check but include a concrete usage example, such as "Consider Set instead of uniq() from lodash; for example, use `[...new Set(values)]`. Check that the behavior is equivalent because the library handles nullish values differently from the native API."

Quickfixes:

- Do not add quickfixes in the first implementation. Metadata says quickfix is unknown, and even safe-looking cases have traps: shadowed `undefined`, repeated side effects in `isNil`, and import cleanup.

Testing:

- Cover RSPEC/Jira examples.
- Add one positive per catalog entry or method family.
- Add representative import forms: namespace, named import, subpath import, `lodash.*`, `require`, and destructured `require`.
- Add ES gate tests for ES2015, ES2016, ES2017, and ES2019 thresholds.
- Add negative tests for global `_`, local shadowing, `lodash/fp`, unsupported methods, computed calls, `last`, and `cloneDeep`.
- Assert cautious wording for null-safe, object-collection, coercion, and mutation-risk methods.

Verification:

- Run focused S8907 tests.
- Regenerate metadata and Java rule classes.
- Run a fast TypeScript build.
- Run ruling, inspect every diff, and sync only expected changes.
