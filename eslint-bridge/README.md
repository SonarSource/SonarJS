
# ESLint bridge

## Test

The ESLint bridge has unit tests that use [ESLint's RuleTester API](https://eslint.org/docs/developer-guide/nodejs-api#ruletester).

### Comment-based tests

We implemented a new format to write unit tests for ESLint using a more readable format.

- You can launch them using: `npm run ntest`
- You can run a single one using: `npm run ntest -- -t="your-rule"` (the `--` double dash is necessary)
