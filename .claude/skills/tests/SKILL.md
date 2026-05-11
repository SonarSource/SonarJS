---
name: tests
description: Provides JavaScript/TypeScript test file structure and patterns for SonarJS rule testing. Use when writing tests, understanding test structure, or debugging test failures.
---

# JavaScript/TypeScript Rule Test Structure

## Test File Location

Test files for rules are located alongside the rule implementation:

- `unit.test.ts` - Unit tests using the rule tester
- Test fixtures in `packages/analysis/src/jsts/rules/{RULE_ID}/fixtures/` (if applicable)

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

### Converting FP Reproducers to Failing Tests (TDD Style)

FP reproducers are entries in the `invalid` array for code that raises a false positive. They may have a comment inside the entry object documenting why it is an FP:

```typescript
invalid: [
  {
    // FP: rule incorrectly flags this pattern because...
    code: `const x = foo();`,
    errors: 1,
  },
]
```

To convert a reproducer to a failing test, move the entry from `invalid` to `valid`, remove the `errors` field, and remove any autofix expectations such as `output` or `suggestions`. Keep fields like `filename` and `options` if they are still needed for the test setup:

```typescript
// Before (reproducer — test passes because the issue IS raised and expected):
invalid: [{ code: `const x = foo();`, filename: 'fixture.ts', errors: 1, output: `foo()` }]

// After (failing test — test fails because the issue IS raised but valid is asserted):
valid: [{ code: `const x = foo();`, filename: 'fixture.ts' }]
```

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
          { code: `...`, errors: 1, output: `...` }, // include output if the upstream rule has autofix; omit if the rule is not fixable
          // one entry per distinct FP pattern
           // one entry per distinct FP pattern
         ],
       });
     });
   });
   ```
6. Do NOT modify the tests for the decorated rule (imported from `./index.js`) — they remain exactly as written

---

## Move test cases from invalid to valid when removing them — do not silently delete

**What**: Removing a test case from the `invalid` array (because the fix now suppresses it) without adding it to the `valid` array.

**Why**: The case is now valid — the rule no longer raises an issue on it — but the test suite contains no evidence of this. Future readers cannot tell whether the omission is intentional or an oversight, and a regression that re-introduces the false positive would go undetected.

**How**: When a previously-invalid test case becomes valid because of the fix, always move it to the `valid` array rather than deleting it. If the case was for a chained or compound expression where multiple assignments are involved (and all are now suppressed), add a comment explaining why all assignments are suppressed.
