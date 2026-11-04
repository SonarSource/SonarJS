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

Do not check `context.filename` to decide whether a rule applies to test code, and do not
reimplement the test-related filename heuristic, which is private to `common/filter/filter-path.ts`.
MAIN/TEST applicability is decided centrally before rules run: declare it through the RSPEC
`scope` instead. See [`docs/test-file-classification.md`](../docs/test-file-classification.md),
which also covers the S2187 test-case filename exception.

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
