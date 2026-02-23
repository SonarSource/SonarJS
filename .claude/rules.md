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

Each rule in `packages/jsts/src/rules/SXXXX/` contains:

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
