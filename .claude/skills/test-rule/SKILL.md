---
name: test-rule
description: Write and run tests for a SonarJS rule. Use when working on rule tests, writing test fixtures, or running unit tests for a specific rule.
---

## Running Tests

```bash
npx tsx --test packages/jsts/src/rules/S1234/**/*.test.ts
```

Replace `S1234` with the actual rule number. Do not run the full test suite (`npm run bridge:test`) — it takes too long.

## RuleTester Selection

| RuleTester | Use When |
|------------|----------|
| `DefaultParserRuleTester` | Pure JavaScript rules, no TypeScript syntax |
| `NoTypeCheckingRuleTester` | JS/TS rules that don't need type information |
| `RuleTester` | Rules requiring TypeScript type information |
| `RuleTester` with `@babel/eslint-parser` | Legacy JavaScript or Babel-specific syntax (e.g. Flow types, decorator proposals) |

## Comment-Based Tests (preferred)

Test files are named `*.fixture.*` (e.g., `cb.fixture.js`, `cb.fixture.ts`) and live in the rule folder.

### Basic Syntax

```javascript
some.clean.code();                          // no issue
some.faulty.code(); // Noncompliant {{Message to assert}}
//   ^^^^^^
```

The `// ^^^^^^` underline marks the primary location (optional but recommended).

### With Quick Fixes

```javascript
some.faulty.code(); // Noncompliant [[qf1]] {{Message}}
// fix@qf1 {{Suggestion description}}
// edit@qf1 [[sc=1;ec=5]] {{replacement text}}
```

For ESLint fixes (not suggestions), use `!` suffix: `[[qf1!]]`. ESLint fixes must **not** have a `fix@` comment.

### Secondary Locations

```javascript
context.report({
  node,
  message: toEncodedMessage(message, [secondaryNode], ['secondary message']),
});
```

In fixture:
```javascript
primary.node();     // Noncompliant {{primary message}}
secondary.node();   // ^^^^^^^^^^^^^^< {{secondary message}}
```

Arrow direction: `<` means secondary is after primary; `>` means secondary is before primary.

### Line Reference Modifiers

```javascript
// Noncompliant@+1 {{message}}   ← issue is on next line
some.faulty.code();

// Noncompliant@-1               ← issue is on previous line
some.faulty.code();
some.faulty.code(); // Noncompliant@2  ← absolute line number
```

### Rule Options in Tests

Add a `cb.options.json` file in the rule folder:
```json
[7, { "ignoreIIFE": true }]
```

### Package.json Dependency Testing

```javascript
process.chdir(__dirname); // use local package.json for dependency detection
```

## ESLint RuleTester Format

For rules needing TypeScript type checking:

```typescript
import { RuleTester } from '../../../tests/tools/sonar-rule-tester.js';

const ruleTester = new RuleTester();
ruleTester.run('rule-name', rule, {
  valid: [
    { code: 'valid code here' },
  ],
  invalid: [
    {
      code: 'invalid code here',
      errors: [{ messageId: 'errorKey' }],
    },
  ],
});
```

## Quick Fix Operation Syntax

| Syntax | Effect |
|--------|--------|
| `// edit@qf [[sc=1;ec=5]] {{text}}` | Replace column 1–5 with text |
| `// edit@qf {{whole line replacement}}` | Replace entire line |
| `// add@qf {{new line content}}` | Add new line after issue line |
| `// del@qf` | Delete the line |
| `// add@qf@+1 {{content}}` | Add after line+1 |

## Multiple Issues / Multiple Quick Fixes

```javascript
// Three issues, fix for 1st and 3rd:
code(); // Noncompliant [[qf1,,qf3]] {{msg1}} {{msg2}} {{msg3}}
// edit@qf1 {{fix for msg1}}
// edit@qf3 {{fix for msg3}}

// Or with explicit index:
code(); // Noncompliant [[qf1,qf3=2]] {{msg1}} {{msg2}} {{msg3}}
```
