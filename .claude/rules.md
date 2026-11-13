# Rule Development Guidelines

## Being Conservative

**"Being conservative" means NOT reporting when uncertain.** Only report issues when confident they are real problems. False positives frustrate users more than missed detections.

- When type information is unavailable, don't report
- When a condition cannot be determined, don't report
- When version/dependency detection fails, don't report

```typescript
// Example: skip reporting without type info
const services = context.sourceCode.parserServices;
if (!isRequiredParserServices(services)) {
  return; // Be conservative - don't report
}
```

## Rule Structure

Each rule in `packages/analysis/src/jsts/rules/SXXXX/` contains:

| File                | Purpose                                 |
| ------------------- | --------------------------------------- |
| `index.ts`          | Main export                             |
| `rule.ts`           | ESLint rule implementation              |
| `meta.ts`           | Rule metadata (messages, descriptions)  |
| `generated-meta.ts` | Auto-generated from RSPEC (do not edit) |
| `unit.test.ts`      | Unit tests                              |
| `cb.fixture.*`      | Comment-based test fixtures             |

## Rule Implementation

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

File classification and rule applicability must be handled centrally by the analysis pipeline
and linter for every rule. Do not classify test, vendor, generated or other file categories
inside a rule, whether through filenames, paths, content markers or classification helpers.
Declare requirements through RSPEC `scope` and supported metadata such as `requiredTestCaseFile`,
`skipOnVendorFile` and `skipOnGeneratedSource`. If a new category is needed, add central
classification and linter filtering, including cache and inline-configuration coverage. See
[`docs/file-classification.md`](../docs/file-classification.md) for the rule authoring contract.

## Testing

### RuleTesters

| RuleTester                 | Use When                                    |
| -------------------------- | ------------------------------------------- |
| `DefaultParserRuleTester`  | Pure JavaScript rules, no TS syntax         |
| `NoTypeCheckingRuleTester` | JS/TS rules that don't need type info       |
| `RuleTester`               | Rules requiring TypeScript type information |

### Running Tests

```bash
npx tsx --test packages/analysis/src/jsts/rules/S1234/**/*.test.ts
```

## Shared Helpers

Check `packages/analysis/src/jsts/rules/helpers/` before writing utilities:

- `ast.ts` - AST traversal and node type checking
- `module.ts` - Module detection, `getFullyQualifiedName`
- `package-jsons/dependencies.ts` - Dependency detection
