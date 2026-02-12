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
  ruleTester.run('S7739 skips yup validation schemas', rule, {
    valid: [
      {
        // Yup validation schemas use .then() method legitimately
        code: `
          import * as yup from 'yup';
          const schema = yup.object({ then: yup.string() });
        `,
        filename: join(dirname, 'filename.ts'),
      },
      {
        // Chained yup calls - string().when() with {is, then} config
        code: `
          import * as yup from 'yup';
          const schema = yup.string().when('hasName', {
            is: true,
            then: (schema) => schema.required(),
          });
        `,
        filename: join(dirname, 'filename.ts'),
      },
      {
        // Chained yup calls inside object shape definition
        // This is the most common real-world pattern from the Jira ticket
        code: `
          import * as yup from 'yup';
          const formSchema = yup.object().shape({
            age: yup.number().required(),
            parentalConsent: yup.bool().when('age', {
              is: (age) => age < 18,
              then: (schema) => schema.required(),
              otherwise: (schema) => schema.optional(),
            }),
          });
        `,
        filename: join(dirname, 'filename.ts'),
      },
      {
        // Multiple chained .when() calls with {is, then} in same shape
        code: `
          import * as yup from 'yup';
          const schema = yup.object().shape({
            a1: yup.string().when('a2', {
              is: undefined,
              then: (schema) => schema.required(),
            }),
            a2: yup.string().when('a1', {
              is: undefined,
              then: (schema) => schema.required(),
            }),
          });
        `,
        filename: join(dirname, 'filename.ts'),
      },
      {
        // Yup .when() with array of dependencies
        code: `
          import * as yup from 'yup';
          const schema = yup.object().shape({
            value: yup.number().when(['unknownDep', 'knownDep'], {
              is: true,
              then: (s) => s.required(),
            }),
          });
        `,
        filename: join(dirname, 'filename.ts'),
      },
    ],
    invalid: [
      {
        // Non-Yup code should still be flagged even with Yup as dependency
        code: `const schema = { then: function() { return this; } };`,
        filename: join(dirname, 'filename.js'),
        errors: [{ messageId: 'no-thenable-object' }],
      },
    ],
  });
});
