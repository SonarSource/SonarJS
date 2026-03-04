---
name: tests
description: Provides JavaScript/TypeScript test file structure and patterns for SonarJS rule testing. Use when writing tests, understanding test structure, or debugging test failures.
---

# JavaScript/TypeScript Rule Test Structure

## Test File Location

Test files for rules are located alongside the rule implementation:
- `unit.test.ts` - Unit tests using the rule tester
- Test fixtures in `packages/jsts/src/rules/{RULE_ID}/fixtures/` (if applicable)

## Test Structure

Tests use the ESLint rule tester pattern with `valid` and `invalid` arrays:

```typescript
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1234', () => {
  it('S1234', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Rule description', rule, {
      valid: [
        {
          code: `
// Valid code that should NOT raise an issue
const x = 1;
          `,
        },
        {
          // False positive scenario: [brief description]
          // This should NOT raise an issue because [reason]
          code: `
const myVar = someFunction();
          `,
        },
      ],
      invalid: [
        {
          code: `
// Invalid code that SHOULD raise an issue
problematicCode();
          `,
          errors: 1,
        },
      ],
    });
  });
});
```

## Key Concepts

- **`valid` array**: Code that should NOT raise an issue (compliant code)
- **`invalid` array**: Code that SHOULD raise an issue (non-compliant code)
- **`errors`**: Number of expected issues in an invalid case, or an array of ESLint error objects (useful for asserting quickfixes and suggestions, e.g. `errors: [{ messageId: 'errorKey', suggestions: [...] }]`)
- **`options`**: Pass rule configuration options if needed

When fixing false positives, add test cases to the `valid` array - the false positive is code that should be treated as valid.

## Isolating Failing Test Cases

When tests fail and you need to identify which specific test case is causing the failure:

1. Create a backup of the test file
2. Comment out all cases from the `valid` and `invalid` arrays EXCEPT the one being tested
3. Record whether this specific test case passes or fails (the orchestration harness will run the tests)
4. Restore the test file from backup
5. Repeat for each suspect test case

This isolation technique helps identify exactly which test cases are failing when the test output is unclear.

**IMPORTANT**: Do NOT run unit tests directly. The orchestration harness will run them after each recipe step completes.

## Ruling Tests

Ruling tests (integration tests against real-world code) are in the separate SonarJS-Ruling repository.
