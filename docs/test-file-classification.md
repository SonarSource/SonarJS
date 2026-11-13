# File Classification for Rule Selection

SonarJS decides which rules apply to a file before any rule runs. Rule implementations must not
inspect filenames to decide whether they apply to test or vendor code.

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

## Vendor Files

The linter also derives `isVendorFile` from
`packages/analysis/src/common/vendor-file-pattern.ts`. It recognizes directory segments such as
`vendor`, `vendors`, `external`, `externals`, `contrib`, `third-party` and `thirdparty`, plus known
JavaScript library distribution basenames and their supported version/build variants. A directory
named after a library is not sufficient: `src/semver/index.js` remains ordinary source, while
`src/semver/semver.js` is recognized as a library distribution.

This signal affects only rule selection. It does not exclude files from analysis or change their
MAIN/TEST classification, metrics or other artifacts. The existing filename patterns are unchanged.

The linter groups `isVendorFile`, `isTestCaseFile` and `isGeneratedSource` under
`RuleFilterContext.classification`. These signals describe the file; rule requirements remain in
metadata. Configuration options such as `detectGeneratedCode` stay separate from classification.

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

- A rule that should not run on copied third-party code exports `skipOnVendorFile = true` from
  its `meta.ts`. The `filterVendorFile` linter filter disables it for vendor files. Rules without
  this flag, including bundle rules without Sonar metadata, remain eligible. Today this applies
  to S3504 only. The vendor signal is part of the linter configuration cache key, so a library
  distribution and ordinary source in the same directory cannot reuse the wrong rule set.

Classification lives in `packages/analysis/src/common/`, outside the rule helpers, because it is a
rule-selection concern. Rules must not import it or reimplement it.

## ESLint Plugin

`eslint-plugin-sonarjs` has no MAIN/TEST classification, and rules do not infer it from filenames.
Plugin users scope test rules with ESLint `files`/`ignores` globs, as documented in the plugin
README. A rule requiring test-case files would report every other file, so the plugin keeps it off
in the `recommended` config: `generateMeta` sets `meta.docs.recommended` to `false` for it.

The plugin also has no central vendor classification. S3504 (`sonarjs/no-var`) therefore runs on
vendor files when enabled in ESLint; it no longer suppresses reports based on the filename. Plugin
users can turn it off for their vendor paths with `files`/`ignores` configuration, as shown in the
plugin README. SonarQube continues to skip S3504 on vendor files through metadata-driven filtering.
The rule's ambient-declaration and var-heavy-file behavior is unchanged in both integrations.
