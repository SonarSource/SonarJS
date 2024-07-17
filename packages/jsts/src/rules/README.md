# eslint-plugin-sonarjs [![npm version](https://badge.fury.io/js/eslint-plugin-sonarjs.svg)](https://badge.fury.io/js/eslint-plugin-sonarjs) [![Build Status](https://api.cirrus-ci.com/github/SonarSource/eslint-plugin-sonarjs.svg?branch=master)](https://cirrus-ci.com/github/SonarSource/eslint-plugin-sonarjs) [![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=eslint-plugin-sonarjs&metric=alert_status)](https://sonarcloud.io/dashboard?id=eslint-plugin-sonarjs) [![Coverage](https://sonarcloud.io/api/project_badges/measure?project=eslint-plugin-sonarjs&metric=coverage)](https://sonarcloud.io/dashboard?id=eslint-plugin-sonarjs)

SonarJS rules for ESLint to help developers produce [Clean Code](https://www.sonarsource.com/solutions/clean-code/) by detecting bugs and suspicious patterns.

## Rules

### Bug Detection :bug:

Rules in this category aim to find places in code that have a high chance of being bugs, i.e. don't work as intended.

- All branches in a conditional structure should not have exactly the same implementation ([`no-all-duplicated-branches`])
- Collection elements should not be replaced unconditionally ([`no-element-overwrite`])
- Empty collections should not be accessed or iterated ([`no-empty-collection`])
- Function calls should not pass extra arguments ([`no-extra-arguments`])
- Related "if/else if" statements should not have the same condition ([`no-identical-conditions`])
- Identical expressions should not be used on both sides of a binary operator ([`no-identical-expressions`])
- Return values from functions without side effects should not be ignored ([`no-ignored-return`]) (_uses-types_)
- Loops with at most one iteration should be refactored ([`no-one-iteration-loop`])
- The output of functions that don't return anything should not be used ([`no-use-of-empty-return-value`])
- Non-existent operators '=+', '=-' and '=!' should not be used ([`non-existent-operator`]) (:wrench: _fixable_)

### Code Smell Detection :pig:

Code Smells, or maintainability issues, are raised for places of code which might be costly to change in the future. These rules also help to keep the high code quality and readability. And finally, some rules report issues on different suspicious code patterns.

- Cognitive Complexity of functions should not be too high ([`cognitive-complexity`])
- "if ... else if" constructs should end with "else" clauses ([`elseif-without-else`]) (_disabled_)
- "switch" statements should not have too many "case" clauses ([`max-switch-cases`])
- Collapsible "if" statements should be merged ([`no-collapsible-if`])
- Collection sizes and array length comparisons should make sense ([`no-collection-size-mischeck`]) (:wrench: _fixable_, _uses-types_)
- String literals should not be duplicated ([`no-duplicate-string`])
- Two branches in a conditional structure should not have exactly the same implementation ([`no-duplicated-branches`])
- Boolean expressions should not be gratuitous ([`no-gratuitous-expressions`])
- Functions should not have identical implementations ([`no-identical-functions`])
- Boolean checks should not be inverted ([`no-inverted-boolean-check`]) (:wrench: _fixable_, _disabled_)
- "switch" statements should not be nested ([`no-nested-switch`])
- Template literals should not be nested ([`no-nested-template-literals`])
- Boolean literals should not be redundant ([`no-redundant-boolean`])
- Jump statements should not be redundant ([`no-redundant-jump`]) (:wrench: _fixable_)
- Conditionals should start on new lines ([`no-same-line-conditional`]) (:wrench: _fixable_)
- "switch" statements should have at least 3 "case" clauses ([`no-small-switch`])
- Collection and array contents should be used ([`no-unused-collection`])
- "catch" clauses should do more than rethrow ([`no-useless-catch`])
- Local variables should not be declared and then immediately returned or thrown ([`prefer-immediate-return`]) (:wrench: _fixable_)
- Object literal syntax should be used ([`prefer-object-literal`])
- Return of boolean expressions should not be wrapped into an "if-then-else" statement ([`prefer-single-boolean-return`]) (:wrench: _fixable_)
- A "while" loop should be used instead of a "for" loop ([`prefer-while`]) (:wrench: _fixable_)

[`cognitive-complexity`]: ./docs/rules/cognitive-complexity.md
[`elseif-without-else`]: ./docs/rules/elseif-without-else.md
[`max-switch-cases`]: ./docs/rules/max-switch-cases.md
[`no-all-duplicated-branches`]: ./docs/rules/no-all-duplicated-branches.md
[`no-collapsible-if`]: ./docs/rules/no-collapsible-if.md
[`no-collection-size-mischeck`]: ./docs/rules/no-collection-size-mischeck.md
[`no-duplicate-string`]: ./docs/rules/no-duplicate-string.md
[`no-duplicated-branches`]: ./docs/rules/no-duplicated-branches.md
[`no-element-overwrite`]: ./docs/rules/no-element-overwrite.md
[`no-empty-collection`]: ./docs/rules/no-empty-collection.md
[`no-extra-arguments`]: ./docs/rules/no-extra-arguments.md
[`no-gratuitous-expressions`]: ./docs/rules/no-gratuitous-expressions.md
[`no-identical-conditions`]: ./docs/rules/no-identical-conditions.md
[`no-identical-expressions`]: ./docs/rules/no-identical-expressions.md
[`no-identical-functions`]: ./docs/rules/no-identical-functions.md
[`no-ignored-return`]: ./docs/rules/no-ignored-return.md
[`no-inverted-boolean-check`]: ./docs/rules/no-inverted-boolean-check.md
[`no-nested-switch`]: ./docs/rules/no-nested-switch.md
[`no-nested-template-literals`]: ./docs/rules/no-nested-template-literals.md
[`no-one-iteration-loop`]: ./docs/rules/no-one-iteration-loop.md
[`no-redundant-boolean`]: ./docs/rules/no-redundant-boolean.md
[`no-redundant-jump`]: ./docs/rules/no-redundant-jump.md
[`no-same-line-conditional`]: ./docs/rules/no-same-line-conditional.md
[`no-small-switch`]: ./docs/rules/no-small-switch.md
[`no-use-of-empty-return-value`]: ./docs/rules/no-use-of-empty-return-value.md
[`no-unused-collection`]: ./docs/rules/no-unused-collection.md
[`no-useless-catch`]: ./docs/rules/no-useless-catch.md
[`non-existent-operator`]: ./docs/rules/non-existent-operator.md
[`prefer-immediate-return`]: ./docs/rules/prefer-immediate-return.md
[`prefer-object-literal`]: ./docs/rules/prefer-object-literal.md
[`prefer-single-boolean-return`]: ./docs/rules/prefer-single-boolean-return.md
[`prefer-while`]: ./docs/rules/prefer-while.md

## Prerequisites

- Node.js (>=16.x).
- ESLint 8.x or 9.x (peer dependency for the plugin).

## Usage

- If you don't have ESLint yet configured for your project, follow [these instructions](https://github.com/eslint/eslint#installation-and-usage).
- Install `eslint-plugin-sonarjs` using `npm` (or `yarn`) for your project or globally:

```sh
npm install eslint-plugin-sonarjs --save-dev # install for your project
npm install eslint-plugin-sonarjs -g         # or install globally
```

- Add `eslint-plugin-sonarjs` to the plugins of your ESLint config.

For ESLint 9: add `plugins` option to your `eslint.config.js` and include the recommended config to enable all rules:

```code
import sonarjs from "eslint-plugin-sonarjs";

[
  sonarjs.configs.recommended,
  {
    "plugins": {
      sonarjs,
    }
  }
]
```

For ESLint 8: add `plugins` option to your `.eslintrc` and `plugin:sonarjs/recommended-legacy` to the `extends` option to enable all recommended rules:

```json
{
  "plugins": ["sonarjs"],
  "extends": ["plugin:sonarjs/recommended-legacy"]
}
```

- or enable only some rules manually:

```json
{
  "rules": {
    "sonarjs/cognitive-complexity": "error",
    "sonarjs/no-identical-expressions": "error"
    // etc.
  }
}
```

- To allow each of the rules to fully perform, use `@typescript-eslint/parser` as a parser for ESLint ([like we do](https://github.com/SonarSource/eslint-plugin-sonarjs/blob/6e06d59a233e07b28fbbd6398e08b9b0c63b18f9/.eslintrc.js#L4)) and set the [parserOptions.project](https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/parser#parseroptionsproject) option. Thanks to it, type information is available, which is beneficial or even essential for some rules.

## Available Configurations

This plugin provides only a `recommended` configuration. Almost all rules are activated in this profile with a few exceptions (check the `disabled` tag in the rules list). The `recommended` configuration activates rules with `error` severity.
We include a `recommended-legacy` configuration to be backward compatible with ESLint v8, with the same rule configuration..

## ESLint and Sonar

This plugin exposes to ESLint users a subset of JS/TS rules from Sonar-\* products (aka [SonarJS](https://github.com/SonarSource/SonarJS)). We extracted the rules that are not available in ESLint core or other ESLint plugins to be beneficial for the ESLint community.

If you are a [SonarQube](https://www.sonarqube.org) or [SonarCloud](https://sonarcloud.io) user, to lint your code locally, we suggest using [SonarLint](https://www.sonarlint.org) IDE extension (available for VSCode, JetBrains IDEs and Eclipse). You can connect SonarLint to your SonarQube/SonarCloud project to synchronize rules configuration, issue statuses, etc.

## Contributing

Do you want to participate in the development of the project? Have a look at our [contributing](./docs/CONTRIBUTING.md) guide!
