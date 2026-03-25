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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

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
      ],
      invalid: [
        // Named imports should still be flagged
        {
          code: `import { named } from './foo';
export { named };`,
          output: `

export {named} from './foo';`,
          errors: 1,
        },
        {
          code: `import { named as alias } from './foo';
export { alias };`,
          output: `

export {named as alias} from './foo';`,
          errors: 1,
        },
        // Namespace imports should still be flagged
        {
          code: `import * as ns from './foo';
export { ns };`,
          output: `

export * as ns from './foo';`,
          errors: 1,
        },
      ],
    });
  });
});
