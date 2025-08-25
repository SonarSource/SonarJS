## 2025-08-25, Version 3.0.5

- [[JS-834](https://sonarsource.atlassian.net/browse/JS-834)] - Add missing tailwindCSS directive @theme to rule S4662
- [[JS-804](https://sonarsource.atlassian.net/browse/JS-804)] - Improve S2187: Add a few more test fqns
- [[JS-719](https://sonarsource.atlassian.net/browse/JS-719)] - Replace dependency jsx-ast-utils with jsx-ast-utils-x
- [[JS-685](https://sonarsource.atlassian.net/browse/JS-685)] - Modify S2301 (`no-selector-parameter`): Add exception when selector parameter is an object property

## 2025-06-26, Version 3.0.4

- [[ESLINTJS-74](https://sonarsource.atlassian.net/browse/ESLINTJS-74)] - ESLint plugin depends on `lodash.merge`

## 2025-06-17, Version 3.0.3

- [[JS-707](https://sonarsource.atlassian.net/browse/JS-707)] - S2068 should be case-insensitive and support "passphrase"
- [[JS-705](https://sonarsource.atlassian.net/browse/JS-705)] - S2699: On Typescript visit identify testing frameworks assertions
- [[JS-634](https://sonarsource.atlassian.net/browse/JS-634)] - Fix FP S6845 (`no-noninteractive-tabindex`): add recommended option to allow for `tabpanel` role
- [[JS-633](https://sonarsource.atlassian.net/browse/JS-633)] - Fix FP S3735 (`void-use`): detect correctly when used in front of promise calls
- [[JS-632](https://sonarsource.atlassian.net/browse/JS-632)] - Fix FP S6848 (`no-static-element-interactions`): add exceptions for <a> and <summary>
- [[JS-628](https://sonarsource.atlassian.net/browse/JS-628)] - Fix FP S2699 (`assertions-in-tests`): handle re-exports of assertions
- [[JS-625](https://sonarsource.atlassian.net/browse/JS-625)] - Fix FP S1848 (`constructor-for-side-effects`): Add exceptions for infrastructure-as-code constructors
- [[JS-33](https://sonarsource.atlassian.net/browse/JS-33)] - Fix FN S4123 (`no-invalid-await`): Remove in favor of `@typescript-eslint/await-thenable`

## 2025-02-13, Version 3.0.2

- [[ESLINTJS-70](https://sonarsource.atlassian.net/browse/ESLINTJS-70)] - Adapt ESLint plugin to new ESLint 9 types
- [[ESLINTJS-60](https://sonarsource.atlassian.net/browse/ESLINTJS-60)] - Use context.parser instead of Babel for rule S125

## 2024-12-05, Version 3.0.1

- [[ESLINTJS-64](https://sonarsource.atlassian.net/browse/ESLINTJS-64)] - Fix `Usage` section of the documentation
- [[ESLINTJS-61](https://sonarsource.atlassian.net/browse/ESLINTJS-61)] - Allow for wider margin of Typescript versions
- [[ESLINTJS-55](https://sonarsource.atlassian.net/browse/ESLINTJS-55)] - Create solution for release notes

## 2024-12-02, Version 3.0.0

- [[JS-359](https://sonarsource.atlassian.net/browse/JS-359)] - Create rule S6418 (`no-hardcoded-secrets`): Hard-coded secrets are security-sensitive

* [[ESLINTJS-65](https://sonarsource.atlassian.net/browse/ESLINTJS-65)] - Remove decorated rules from ESLint plugin
* [[ESLINTJS-58](https://sonarsource.atlassian.net/browse/ESLINTJS-58)] - Change homepage to point to README.md in rules folder
* [[ESLINTJS-57](https://sonarsource.atlassian.net/browse/ESLINTJS-57)] - Remove "sonar-" from eslint-plugin-sonarjs rule names

## 2024-10-18, Version 2.0.4

- [[ESLINTJS-62](https://sonarsource.atlassian.net/browse/ESLINTJS-62)] - Improve S3776: Do not increase complexity on short-circuiting and null coalescing

## 2024-09-23, Version 2.0.3

- [[ESLINTJS-56](https://sonarsource.atlassian.net/browse/ESLINTJS-56)] - Improve the performances of package manifest search
- [[ESLINTJS-53](https://sonarsource.atlassian.net/browse/ESLINTJS-53)] - Support ESLint 9
- [[ESLINTJS-50](https://sonarsource.atlassian.net/browse/ESLINTJS-50)] - "sonarjs/prefer-enum-initializers" fails with newer versions of typescript-eslint
- [[ESLINTJS-49](https://sonarsource.atlassian.net/browse/ESLINTJS-49)] - Rule `no-implicit-dependencies` doesn't work

## 2024-08-30, Version 2.0.2

- [[ESLINTJS-52](https://sonarsource.atlassian.net/browse/ESLINTJS-52)] - Argument of type 'Config' is not assignable to parameter of type 'ConfigWithExtends'
- [[ESLINTJS-51](https://sonarsource.atlassian.net/browse/ESLINTJS-51)] - The public APIs wrongly expose the internal helpers

## 2024-08-23, Version 2.0.1

- [[ESLINTJS-48](https://sonarsource.atlassian.net/browse/ESLINTJS-48)] - Add all the missing declared dependencies that prevent the plugin to be installed using yarn + pnpm
- [[ESLINTJS-47](https://sonarsource.atlassian.net/browse/ESLINTJS-47)] - `jsx-ast-utils` is missing from the list of dependencies of the package
- [[ESLINTJS-46](https://sonarsource.atlassian.net/browse/ESLINTJS-46)] - The plugin emits a warning when used with ESLint 8

## 2024-08-22, Version 2.0.0

- [[JS-194](https://sonarsource.atlassian.net/browse/JS-194)] - Provide eslint configurations based on Sonar way profile
- [[JS-191](https://sonarsource.atlassian.net/browse/JS-191)] - Expose all rules from SonarJS
