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
      {
        // Chained joi calls - string().when() with {is, then} config
        code: `
          import Joi from 'joi';
          const schema = Joi.string().when('type', {
            is: 'email',
            then: Joi.string().email().required(),
          });
        `,
        filename: join(dirname, 'filename.ts'),
      },
      {
        // Joi alternatives().conditional() with switch cases containing {is, then}
        code: `
          import Joi from 'joi';
          const schema = Joi.alternatives().conditional('action', {
            switch: [
              { is: 'info', then: Joi.string() },
              { is: 'create', then: Joi.object().required() },
            ],
            otherwise: Joi.forbidden(),
          });
        `,
        filename: join(dirname, 'filename.ts'),
      },
      {
        // Joi with CommonJS require
        code: `
          const Joi = require('joi');
          const schema = Joi.string().when('field', {
            is: 'value',
            then: Joi.string().required(),
          });
        `,
        filename: join(dirname, 'filename.js'),
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
