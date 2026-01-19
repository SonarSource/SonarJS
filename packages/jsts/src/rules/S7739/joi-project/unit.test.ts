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
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S7739', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname); // change current working dir to avoid the package.json lookup going up the tree
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S7739 skips joi validation schemas', rule, {
    valid: [
      {
        // Joi validation schemas use .then() method legitimately
        code: `
          import Joi from 'joi';
          const schema = Joi.object({ then: Joi.string() });
        `,
        filename: join(dirname, 'filename.ts'),
      },
    ],
    invalid: [
      {
        // Non-Joi code should still be flagged even with Joi as dependency
        code: `const schema = { then: function() { return this; } };`,
        filename: join(dirname, 'filename.js'),
        errors: [{ messageId: 'no-thenable-object' }],
      },
    ],
  });
});
