/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
