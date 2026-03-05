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
- **`errors`**: Number of expected issues in an invalid case
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

## Upstream Sentinel Tests (Decorator Rules)

When `meta.ts` contains `implementation = 'decorated'`, add an upstream sentinel `describe` block **before** the main `describe` block in the test file.

1. Read `decorator.ts` to identify each distinct FP pattern being suppressed (conditions that trigger an early `return` instead of calling `context.report`)
2. Read `meta.ts` to find the `eslintId` (the upstream ESLint rule name)
3. Read `index.ts` to find the exact import pattern already in use:
   - ESLint core rules: `import { getESLintCoreRule } from '../external/core.js'` then `getESLintCoreRule('{ESLINT_ID}')`
   - Plugin rules: `import { rules } from '../external/{PLUGIN}.js'` then `rules['{ESLINT_ID}']`
4. Add the same import to the test file and obtain a reference to the upstream rule the same way
   - Never import directly from `eslint-plugin-*` packages or `eslint/use-at-your-own-risk` — always use the `external/` shims
5. Add a comment above the sentinel block explaining its purpose, then the block itself:
   ```typescript
   // Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
   // If this test starts failing (i.e., the upstream rule no longer reports these patterns),
   // it signals that the decorator can be safely removed.
   describe('S{RULE_ID} upstream sentinel', () => {
     it('upstream {ESLINT_ID} raises on {FP pattern description} that decorator suppresses', () => {
       const ruleTester = new DefaultParserRuleTester();
       ruleTester.run('{ESLINT_ID}', upstreamRule, {
         valid: [],
         invalid: [
           { code: `...`, errors: 1 }, // {pattern description} — suppressed by decorator, raised by upstream
           // one entry per distinct FP pattern
         ],
       });
     });
   });
   ```
6. Do NOT modify the tests for the decorated rule (imported from `./index.js`) — they remain exactly as written
