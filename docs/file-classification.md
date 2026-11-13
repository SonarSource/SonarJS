# File Classification for Rule Selection

This guideline is for contributors creating or changing SonarJS rules. It covers all file
classification used to decide whether a rule applies, including test, vendor and generated code.

## Rule Authoring Contract

File classification and rule applicability belong to the central analysis pipeline and linter.
Rule implementations must not classify files or decide their applicability from filenames, paths
or generated-file markers. They must not import classification helpers to perform those checks.
This applies to every new rule and every new kind of file classification.

Keep these responsibilities separate:

- The central analysis pipeline computes file facts. Shared classifiers and file stores may
  provide those facts before linting.
- Rule metadata declares applicability requirements, using RSPEC scope and supported fields in
  `meta.ts`.
- The linter applies those requirements through central filters before rules run.
- The rule examines the applicable file for the code issue it detects.

When creating or changing a rule:

1. Reuse an existing classification and metadata field when they express the requirement.
2. If a new classification is needed, implement it centrally and expose it to the linter. Add
   the metadata and filter needed to select affected rules. Do not add a rule-local classifier.
3. Include any classification that changes cached rule selection in the linter configuration
   cache key. Check files with different classifications in both processing orders.
4. Verify applicability through linter integration tests. A rule's direct RuleTester tests do
   not exercise central selection. Include applicable files, excluded files and unrelated rules.
5. Check inline ESLint configuration as well as initial rule selection. Inline directives must
   not bypass the new classification-based exclusion, including through alternate rule names.
6. Check whether the rule is exported by the public ESLint plugin before documenting any
   consumer impact. Keep consumer configuration examples in the plugin README.

## Main and Test Files

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

## Vendor Files

The linter also derives `isVendorFile` from
`packages/analysis/src/common/vendor-file-pattern.ts`. It recognizes directory segments such as
`vendor`, `vendors`, `external`, `externals`, `contrib`, `third-party` and `thirdparty`, plus known
JavaScript library distribution basenames and their supported version/build variants. A directory
named after a library is not sufficient: `src/semver/index.js` remains ordinary source, while
`src/semver/semver.js` is recognized as a library distribution.

This signal affects only rule selection. It does not exclude files from analysis or change their
MAIN/TEST classification, metrics or other artifacts.

## Generated Files

The generated-source subsystem provides the file classification; individual rules do not detect
generators themselves. With `detectGeneratedCode` enabled, `filterGeneratedSource` skips a rule
on generated files when its metadata declares `skipOnGeneratedSource = true`. See
[Generated Source Detection](generated-sources.md) for the detection mechanism.

## Linter Classification Context

The linter groups `isVendorFile`, `isTestCaseFile` and `isGeneratedSource` under
`RuleFilterContext.classification`. These signals describe the file; rule requirements remain in
metadata. Configuration options such as `detectGeneratedCode` stay separate from classification.
MAIN/TEST applicability uses the separate `fileType` field in that context.

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
  The inline ESLint configuration handler also enforces this metadata after remapping rule aliases,
  so `/* eslint no-var: "error" */` and `/* eslint sonarjs/S3504: "error" */` cannot reactivate
  S3504 on vendor files.

Shared filename classifiers live in `packages/analysis/src/common/`, outside the rule helpers.
Generated-source facts come from the central generated-source subsystem. The linter owns their
use for rule selection. Rules must not import or reimplement this classification logic.

## ESLint Plugin

`eslint-plugin-sonarjs` has no MAIN/TEST classification, and rules do not infer it from filenames.
Plugin users scope test rules with ESLint `files`/`ignores` globs, as documented in the plugin
README. A rule requiring test-case files would report every other file, so the plugin keeps it off
in the `recommended` config: `generateMeta` sets `meta.docs.recommended` to `false` for it.

The public plugin exports only original rules. For example, S3504 is decorated and is not
exported as `sonarjs/no-var`; ESLint core `no-var` is a separate rule. Check the public exports
when assessing the effect of central classification on plugin consumers. Do not add file
classification inside a rule to compensate for the plugin's lack of Sonar linter filtering.
