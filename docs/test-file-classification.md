# Test-File Classification for Rule Selection

SonarJS decides which rules apply to a file before any rule runs. Rule implementations must not
inspect `context.filename` to decide whether they apply to test code.

## Classifications

Every analyzable file carries two file types:

- `fileType` is the scanner/path-derived type (`sonar.sources`, `sonar.tests` and their
  inclusions/exclusions). It drives metrics, coverage scope and other file artifacts.
- `ruleFileType` is the type used for rule selection. It starts from `fileType` and may promote a
  file to TEST based on its filename.

Both explicit request files (`packages/analysis/src/common/input-sanitize.ts`) and
filesystem-discovered files (`packages/analysis/src/file-stores/source-files.ts`) compute
`ruleFileType` through `getFileTypeForRules` in
`packages/analysis/src/common/rule-file-type.ts`.

On top of `ruleFileType`, the linter derives a narrower test-case signal through `isTestCaseFile`
in the same module: whether the filename declares test cases (`.test`, `.spec` or `.cy` before a
configured JS/TS suffix). Helpers under `__tests__/`, mocks and `.e2e` files are test-related, and
may be TEST, but are not test-case files.

Both signals share canonical definitions in `rule-file-type.ts`: the test-related markers are the
test-case markers plus `e2e` and `mock`, and suffixes come from the configured JS/TS suffixes,
falling back to the defaults in `configuration.ts`.

## `ruleFileType` Precedence

From highest to lowest:

1. An explicit TEST file type is kept. This covers request files sent as TEST and files under
   `sonar.tests` accepted by `sonar.test.inclusions`/`sonar.test.exclusions`.
2. A file under `sonar.tests` rejected by `sonar.test.inclusions` or `sonar.test.exclusions` keeps
   its file type. The test configuration explicitly scoped it out of tests.
3. A file under `sonar.sources` matching a non-empty `sonar.inclusions` keeps its file type. It was
   explicitly opted into MAIN.
4. An Angular `environment/environment.<marker>.<ext>` or `environments/environment.<marker>.<ext>`
   file keeps its file type when `@angular/core` is visible to it.
5. A test-related filename is promoted to TEST: `.test`, `.spec`, `.cy`, `.e2e` or `.mock` before a
   configured JS/TS suffix, or a path containing `__tests__/` or `__mocks__/`.
6. Any other file keeps its file type.

Configuring `sonar.tests` does not turn off step 5 for files outside the test paths. A colocated
`src/component.test.tsx` gets TEST rules even when `sonar.tests=tests`.

## Declaring Rule Applicability

- The RSPEC `scope` (`Main`, `Tests` or `All`) decides which `ruleFileType` a rule runs on. A
  `Tests` rule runs on every TEST file, including ordinary filenames such as `tests/login.js`.
- A `Main` rule does not run on files classified as TEST, so it needs no filename-based suppression
  for test code.
- A rule that only makes sense on files declaring test cases, not on helpers or mocks, exports
  `requiredTestCaseFile = true` from its `meta.ts`. The `filterTestCaseFile` linter filter then
  keeps it only for test-case files, on top of its scope. The signal is part of the linter
  configuration cache key, so files sharing a directory and extension get different rule sets.
  Today this applies to S2187 only.

Classification lives in `packages/analysis/src/common/rule-file-type.ts`, outside the rule helpers,
because it is a rule-selection concern. Rules must not import it or reimplement it.

## ESLint Plugin

`eslint-plugin-sonarjs` has no MAIN/TEST classification, and rules do not infer it from filenames.
Plugin users scope test rules with ESLint `files`/`ignores` globs, as documented in the plugin
README. A rule requiring test-case files would report every other file, so the plugin keeps it off
in the `recommended` config: `generateMeta` sets `meta.docs.recommended` to `false` for it.
