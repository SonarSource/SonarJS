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
import { rules } from '../external/unicorn.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S7763 upstream sentinel', () => {
  it('upstream prefer-export-from raises on export-const-alias patterns that decorator suppresses', () => {
    const upstreamRule = rules['prefer-export-from'];
    ruleTester.run('prefer-export-from', upstreamRule, {
      valid: [],
      invalid: [
        {
          // export const alias = importedThing — suppressed by decorator, raised by upstream
          code: `import { updateStatus } from './status-service';
export const updateStatusHandler = updateStatus;`,
          output: `

export {updateStatus as updateStatusHandler} from './status-service';`,
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
        // JS-1475: export const alias = importedThing should NOT be flagged
        {
          code: `import { updateStatus } from './status-service';
export const updateStatusHandler = updateStatus;`,
        },
        // Multiple export const aliases (constants/adapter file pattern)
        {
          code: `import { getEscalationStatusQuery } from './escalation-queries';
import { updateEscalationStatusMutation } from './escalation-mutations';
export const escalationStatusQuery = getEscalationStatusQuery;
export const escalationStatusMutation = updateEscalationStatusMutation;`,
        },
        // Adapter/facade: locally-defined public names for imported implementations
        {
          code: `import { readFile } from './file-reader';
import { writeFile } from './file-writer';
export const load = readFile;
export const save = writeFile;`,
        },
        // Locally defined export is not a re-export candidate
        {
          code: `function processData() { return 42; }
export { processData };`,
        },
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
