/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { rules } from '../external/unicorn.js';
import { decorate } from './decorator.js';
import type { Rule } from 'eslint';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S7763 upstream sentinel', () => {
  it('upstream prefer-export-from raises on default-import re-export patterns that decorator suppresses', () => {
    const upstreamRule = rules['prefer-export-from'];
    ruleTester.run('prefer-export-from', upstreamRule, {
      valid: [],
      invalid: [
        {
          // Default import re-exported as-is — suppressed by decorator (JS-888), raised by upstream
          code: `import foo from './foo';\nexport { foo };`,
          output: `\n\nexport {default as foo} from './foo';`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7763', () => {
  it('S7763 - prefer-export-from with default import exception', () => {
    ruleTester.run(`Use "export ... from" when re-exporting`, rule, {
      valid: [
        // Direct re-export - preferred pattern, should not be flagged
        { code: `export { default } from './foo';` },
        { code: `export { default as foo } from './foo';` },
        { code: `export { named } from './foo';` },
        // JS-888: Re-exporting default import should NOT be flagged
        // This allows giving meaningful names to default exports
        { code: `import foo from './foo';\nexport { foo };` },
        { code: `import { default as foo } from './foo';\nexport { foo };` },
        {
          code: `import { default as originalName } from './foo';\nexport { originalName as renamedExport };`,
        },
        // Default import re-exported as default
        { code: `import foo from './foo';\nexport default foo;` },
        // JS-1475: locally defined export is not a re-export candidate
        {
          code: `function processData() { return 42; }
export { processData };`,
        },
        // JS-1475: export const alias = defaultImport should NOT be flagged
        // Creating a named alias for a default import is intentional (meaningful naming)
        {
          code: `import foo from './foo';
export const bar = foo;`,
        },
        // JS-1475: export const with a local (non-imported) variable should NOT be flagged
        {
          code: `const localValue = 42;
export const exported = localValue;`,
        },
      ],
      invalid: [
        // Named imports should still be flagged
        {
          code: `import { named } from './foo';\nexport { named };`,
          output: `\n\nexport {named} from './foo';`,
          errors: 1,
        },
        {
          code: `import { named as alias } from './foo';\nexport { alias };`,
          output: `\n\nexport {named as alias} from './foo';`,
          errors: 1,
        },
        // Namespace imports should still be flagged
        {
          code: `import * as ns from './foo';\nexport { ns };`,
          output: `\n\nexport * as ns from './foo';`,
          errors: 1,
        },
        // JS-1475: export const alias = namedImport should still be flagged
        // `import {x}...; export const y = x` CAN be rewritten as `export { x as y } from '...'`
        {
          code: `import { updateStatus } from './status-service';\nexport const updateStatusHandler = updateStatus;`,
          output: `\n\nexport {updateStatus as updateStatusHandler} from './status-service';`,
          errors: 1,
        },
        // Namespace import alias should still be flagged
        // `import * as ns...; export const N = ns` CAN be rewritten as `export * as N from '...'`
        {
          code: `import * as _AllIcons from './svgs';\nexport const AllIcons = _AllIcons;`,
          output: `\n\nexport * as AllIcons from './svgs';`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7763 decorator edge cases', () => {
  // Test lines 67-68: fail-open for unknown report node shapes
  // The decorator reports as-is when the reported node type is unrecognized (defensive code for
  // upstream rule changes).
  it('reports as-is when reported node type is unrecognized (fail-open)', () => {
    const mockRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code' },
      create(context) {
        return {
          Program(node) {
            context.report({ node, message: 'mock report' });
          },
        };
      },
    };
    const decoratedMock = decorate(mockRule);
    ruleTester.run('fail-open', decoratedMock, {
      valid: [],
      invalid: [{ code: 'const x = 1;', errors: 1 }],
    });
  });

  // Test line 89: isNamedImportAlias returns false for FunctionDeclaration
  // The decorator suppresses ExportNamedDeclaration when its declaration is a FunctionDeclaration
  // (i.e., not a VariableDeclaration, so not a named import alias).
  it('suppresses ExportNamedDeclaration with FunctionDeclaration (not a named import alias)', () => {
    const mockRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code' },
      create(context) {
        return {
          ExportNamedDeclaration(node) {
            if (node.declaration?.type === 'FunctionDeclaration') {
              context.report({ node, message: 'mock report' });
            }
          },
        };
      },
    };
    const decoratedMock = decorate(mockRule);
    ruleTester.run('function-decl-suppressed', decoratedMock, {
      valid: [{ code: 'export function foo() {}' }],
      invalid: [],
    });
  });

  // Test lines 126 and 144: outer loop continue and return null in getImportKind
  // When the exported identifier is not found in any import declaration, getImportKind returns
  // null (line 144). Non-import body nodes (VariableDeclaration, ExportNamedDeclaration) cause
  // the outer loop to continue (line 126).
  it('suppresses when exported identifier is not found in any import (getImportKind returns null)', () => {
    const mockRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code' },
      create(context) {
        return {
          ExportSpecifier(node) {
            context.report({ node, message: 'mock report' });
          },
        };
      },
    };
    const decoratedMock = decorate(mockRule);
    ruleTester.run('null-import-kind', decoratedMock, {
      valid: [
        {
          // localVar is not imported: outer loop skips VariableDeclaration and ExportNamedDeclaration
          // (both trigger line 126 continue), then loop ends and returns null (line 144)
          code: 'const localVar = 1;\nexport { localVar };',
        },
      ],
      invalid: [],
    });
  });

  // Test line 130: inner loop continue in getImportKind when specifier doesn't match
  // When an import has multiple specifiers, the inner loop skips non-matching ones (line 130)
  // before finding the target.
  it('reports named import when import has multiple specifiers (inner loop continue)', () => {
    const mockRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code' },
      create(context) {
        return {
          ExportSpecifier(node) {
            if (node.local.type === 'Identifier' && node.local.name === 'named') {
              context.report({ node, message: 'mock report' });
            }
          },
        };
      },
    };
    const decoratedMock = decorate(mockRule);
    ruleTester.run('multi-specifier-inner-loop', decoratedMock, {
      valid: [],
      invalid: [
        {
          // import { a, named }: inner loop skips 'a' (line 130 continue) before matching 'named'
          code: 'import { a, named } from "./foo";\nexport { named };',
          errors: 1,
        },
      ],
    });
  });
});
