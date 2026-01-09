# CLAUDE.md

This file provides guidance for Claude Code when working with the SonarJS repository.

## Project Overview

SonarJS is a static code analyzer for JavaScript, TypeScript, and CSS, developed by SonarSource. It provides:

- JavaScript and TypeScript rules with advanced pattern matching and control flow analysis
- CSS rules for style analysis
- Integration with SonarQube and SonarCloud
- An ESLint plugin (`eslint-plugin-sonarjs`)

## Project Structure

```
SonarJS/
├── packages/                    # TypeScript source code
│   ├── jsts/                    # JS/TS analyzer (main rules)
│   │   ├── src/rules/           # Rule implementations (S100-S7xxx)
│   │   └── tests/               # Unit tests
│   ├── css/                     # CSS analyzer
│   ├── bridge/                  # Node.js ↔ SonarQube bridge server
│   ├── shared/                  # Shared utilities
│   ├── html/                    # HTML/Vue template support
│   └── yaml/                    # YAML support
├── sonar-plugin/                # Maven-based Java plugin
│   ├── sonar-javascript-plugin/ # Main plugin artifact
│   ├── javascript-checks/       # Auto-generated Java check classes
│   ├── bridge/                  # Bridge JAR module
│   ├── api/                     # Plugin API definitions
│   ├── css/                     # CSS checker module
│   └── standalone/              # Standalone runner
├── its/                         # Integration tests
│   ├── plugin/                  # SonarQube plugin tests
│   └── ruling/                  # Ruling tests (third-party code analysis)
├── tools/                       # Build and generation scripts
└── lib/                         # Compiled bridge output (build artifact)
```

## Key Technologies

- **TypeScript** - Primary language for rule implementation
- **Java** - Plugin integration
- **Node.js** - Runtime
- **ESLint** - Base linting framework
- **Stylelint** - CSS linting
- **Maven** - Java plugin build
- **esbuild** - JavaScript bundler

## Build Commands

```bash
# Install dependencies
npm ci

# Fast JS/TS build (recommended for development)
npm run bbf                     # Compiles TypeScript, no tests
mvn install -DskipTests         # Complete build without Java tests

# Full builds
mvn clean install               # Complete build with all tests
npm run build:fast              # Fast build without tests
npm run plugin:build:fast       # Maven plugin only, no tests

# Generate code (after modifying rule metadata)
npm run generate-meta
npm run generate-java-rule-classes
npm run new-rule                # Scaffold a new rule
```

**Important for Claude:** Do not run full unit tests (`npm run bridge:test`) or ruling tests (`npm run ruling`) as they take a long time to complete. Run only specific tests for the rules you're working on.

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

## Rule Implementation Pattern

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

## Testing Patterns

### Comment-Based Tests

Create `*.fixture.js` or `*.fixture.ts` files:

```javascript
function example() {
  eval('code'); // Noncompliant {{Refactor this code to not use "eval".}}
  //^^^^
}

// Compliant case - no annotation needed
safeFunction();
```

With quick fixes:

```javascript
var x = 1; // Noncompliant [[qf1]] {{Use "let" or "const" instead of "var".}}
// fix@qf1 {{Replace "var" with "let"}}
// edit@qf1 {{let x = 1;}}
```

### Unit Tests (Primary)

Three RuleTesters are available in `packages/jsts/tests/tools/testers/rule-tester.ts`:

| RuleTester                 | Parser                             | Use When                                    |
| -------------------------- | ---------------------------------- | ------------------------------------------- |
| `DefaultParserRuleTester`  | ESLint default (espree)            | Pure JavaScript rules, no TS syntax         |
| `NoTypeCheckingRuleTester` | @typescript-eslint                 | JS/TS rules that don't need type info       |
| `RuleTester`               | @typescript-eslint + type-checking | Rules requiring TypeScript type information |

```typescript
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './rule.js';

const ruleTester = new NoTypeCheckingRuleTester();

describe('S1234', () => {
  it('should detect issues', () => {
    ruleTester.run('Rule description', rule, {
      valid: [{ code: 'validCode()' }],
      invalid: [
        {
          code: 'invalidCode()',
          errors: [{ messageId: 'errorKey' }],
        },
      ],
    });
  });
});
```

### Running Specific Tests

```bash
# Run tests for a single rule
npx tsx --test packages/jsts/src/rules/S1234/**/*.test.ts
```

## Code Style

- **Indentation:** 2 spaces
- **Line endings:** LF
- **Quotes:** Single quotes
- **Trailing commas:** Always
- **Print width:** 100 characters

Formatting is enforced automatically via pre-commit hooks.

## Shared Helpers

The `packages/jsts/src/rules/helpers/` folder contains shared utility functions for rule implementations. **Before writing utility code in a rule, check if a similar helper already exists.** If you need a new utility that could benefit other rules, add it to the appropriate helper file rather than keeping it in the rule.

Key helper files:

- `ast.ts` - AST traversal and node type checking (`isFunctionNode`, `isIdentifier`, `hasTypePredicateReturn`, etc.)
- `module.ts` - Module detection (`isESModule`, `getImportDeclarations`, `getFullyQualifiedName`, etc.)
- `package-jsons/dependencies.ts` - Dependency detection (`getDependencies`, `getReactVersion`, etc.)

## Important Notes

- `generated-meta.ts` files are auto-generated from RSPEC - do not edit manually
- Java check classes in `sonar-plugin/javascript-checks/` are auto-generated
- The bridge server (`packages/bridge/`) communicates with SonarQube via JSON-RPC over HTTP
- Rules use ESLint's visitor pattern - return an object with AST node type selectors
- **Keep this file up to date:** When making changes to build processes, project structure, or development workflows, update this file accordingly
