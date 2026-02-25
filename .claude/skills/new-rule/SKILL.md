---
name: new-rule
description: Implement a new SonarJS rule from scratch. Use when creating a new rule, scaffolding rule files, or understanding the full rule implementation workflow.
disable-model-invocation: true
---

## Overview

New rules follow the pattern: RSPEC description → scaffold → implement → test → ruling.

## Step 1: Scaffold the Rule

```bash
npm run new-rule
```

This interactive script generates in `packages/jsts/src/rules/SXXXX/`:
- `index.ts` — rule export
- `rule.ts` — ESLint rule implementation (skeleton)
- `cb.fixture.js` — empty comment-based test fixture
- `cb.test.js` — test launcher

It also auto-generates (not tracked by git):
- Java check class `SXXXX.java`
- Updates `rules/rules.ts` and `rules/plugin-rules.ts`
- Updates `AllRules.java`

## Step 2: Configure the Java Check Class

In the generated Java class, verify:
- `@JavaScriptRule` and/or `@TypeScriptRule` annotations match target languages
- If rule has options, override `configurations()` method (see `/rule-options` skill)
- If rule targets test files, extend `TestFileCheck` instead of `Check`

## Step 3: Implement the Rule

### File Structure

| File | Purpose |
|------|---------|
| `rule.ts` | ESLint rule implementation |
| `meta.ts` | Manual metadata: `implementation`, `eslintId`, `schema`, re-exports `fields` |
| `config.ts` | Option definitions with `fields` array (if rule has options) |
| `generated-meta.ts` | Auto-generated from RSPEC — do not edit |

### Rule Template

```typescript
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

const messages = {
  errorKey: 'Error message to display',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      Identifier(node: estree.Identifier) {
        if (/* violation detected */) {
          context.report({ messageId: 'errorKey', node });
        }
      },
    };
  },
};
```

### Be Conservative

**Never report when uncertain.** False positives are worse than missed detections.

```typescript
const services = context.sourceCode.parserServices;
if (!isRequiredParserServices(services)) {
  return; // No type info — don't report
}
```

When in doubt: skip.

## Step 4: Check Shared Helpers

**Before writing any utility code**, check `packages/jsts/src/rules/helpers/`:

| File | Contains |
|------|----------|
| `ast.ts` | `isFunctionNode`, `isIdentifier`, `hasTypePredicateReturn`, AST traversal |
| `module.ts` | `isESModule`, `getImportDeclarations`, `getFullyQualifiedName` |
| `package-jsons/dependencies.ts` | `getDependencies`, `getReactVersion` |
| `index.ts` | Re-exports all helpers — check here first |

If a new utility would benefit multiple rules, add it to the appropriate helper file.

## Step 5: Generate Metadata

After setting up `meta.ts` and optionally `config.ts`:

```bash
npm run generate-meta
```

This creates/updates `generated-meta.ts` with `defaultOptions`, `sonarKey`, `scope`, `languages`.

## Step 6: Write Tests

See `/test-rule` skill for full testing documentation.

Quick start — write `cb.fixture.js`:
```javascript
someCleanCode();                            // no issue raised

someFaultyCode(); // Noncompliant {{message}}
//  ^^^^^^^^^^
```

Run:
```bash
npx tsx --test packages/jsts/src/rules/S1234/**/*.test.ts
```

## Step 7: Run Ruling

See `/ruling` skill. Required before merging new or modified rules.

## Rule Implementation Patterns

### Wrapping an ESLint Rule (`decorated`)

```typescript
// meta.ts
export const implementation = 'decorated';
export const eslintId = 'no-magic-numbers';
export const externalRules = [
  { externalPlugin: 'typescript-eslint', externalRule: 'no-magic-numbers' },
];
export * from './config.js';
```

### Original Rule

```typescript
// meta.ts
export const implementation = 'original';
export const eslintId = 'function-name';
export * from './config.js';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
export const schema = {
  type: 'array',
  items: [{ type: 'object', properties: { format: { type: 'string' } } }],
} as const satisfies JSONSchema4;
```

### RSPEC Tags

When creating the RSPEC PR:
- Tag `type-dependent` if the rule uses TypeScript type information
- Add `dependencies` field if rule requires a specific import (e.g., `'react'`, `'jest'`)
- Add `compatibleLanguages: ['js', 'ts']` as appropriate

## References

- Security Hotspot: [PR #3148](https://github.com/SonarSource/SonarJS/pull/3148)
- Rule with quickfix: [PR #3141](https://github.com/SonarSource/SonarJS/pull/3141)
- Wrapping ESLint rule: [PR #3134](https://github.com/SonarSource/SonarJS/pull/3134)
