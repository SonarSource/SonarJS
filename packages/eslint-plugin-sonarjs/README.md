# eslint-plugin-sonarjs

SonarJS rules for ESLint to help developers produce [Clean Code](https://www.sonarsource.com/solutions/clean-code/) by detecting bugs and suspicious patterns.

## Prerequisites

- Node.js (see "engines" in `package.json`).
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

This plugin exposes to ESLint users almost all of the JS/TS rules from Sonar-\* products (aka [SonarJS](https://github.com/SonarSource/SonarJS)). We extracted the rules that are not available in ESLint core or other ESLint plugins to be beneficial for the ESLint community.

If you are a [SonarQube](https://www.sonarqube.org) or [SonarCloud](https://sonarcloud.io) user, to lint your code locally, we suggest using [SonarLint](https://www.sonarlint.org) IDE extension (available for VSCode, JetBrains IDEs and Eclipse). You can connect SonarLint to your SonarQube/SonarCloud project to synchronize rules configuration, issue statuses, etc.

## Contributing

Do you want to participate in the development of the project? Have a look at our [contributing](./docs/CONTRIBUTING.md) guide!
