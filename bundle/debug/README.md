# pkg debug single files

This folder contains small scripts that were used to debug some issues that we encountered when investigating the ESLint-bridge binary usage.

## hello.js

simple hello world

```bash
./node_modules/.bin/pkg ./debug/hello.js -t=node18-macos-arm64 -o=./dist/hello-bin

./dist/hello-bin
```

## hello-require.js

Tests the passing of CLI args and the loading of an external file

This requires that you install `lodash` somewhere reachable for `required-file.js`

```bash
./node_modules/.bin/pkg ./debug/hello-require.js -t=node18-macos-arm64 -o=./dist/hello-require

./dist/hello-require [absolute path to "./debug/required-file.js"]
```

## hello-rule.js

Used to test linting a file with an eslint rule.
Concretely, it was used to test the execution of the UCFG generating rule that is created by sonar-security [here](https://github.com/SonarSource/sonar-security/blob/5c3495aefc2beb0b661a805d387f4b73e069e2fc/frontend/js/bundle/esbuild.js#L4).

This requires that you install `eslint` somewhere reachable for `required-file.js`

```bash
./node_modules/.bin/pkg ./debug/hello-rule.js -t=node18-macos-arm64 -o=./dist/hello-rule

./dist/hello-require [absolute path to rule]
```
