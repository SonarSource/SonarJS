/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});
ruleTester.run(`"if ... else if" constructs should end with "else" clauses`, rule, {
  valid: [
    {
      code: `
      if (x == 0) {
        x = 42;
      }
      `,
    },
    {
      code: `
      if (x == 0)
        x = 42;
      `,
    },
    {
      code: `
      if (x == 0) {
        x = 42;
      } else {
        x = -42;
      }
      `,
    },
    {
      code: `
      if (x == 0)
        x = 42;
      else
        x = -42;
      `,
    },
    {
      code: `
      if (x == 0) {
        x == 42;
      } else {
        if (x == 1) {
          x == -42;
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      if (x == 0) {
        x = 42;
      } else if (x == 1) {
        x = -42;
      } else if (x == 2) {
        x = 0;
      }
      `,
      errors: [
        {
          messageId: 'addMissingElseClause',
          line: 6,
          endLine: 6,
          column: 9,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
      if (x == 0)
        x == 42;
      else
        if (x == 1)
          x == -42;
      `,
      errors: [
        {
          messageId: 'addMissingElseClause',
          line: 4,
          endLine: 5,
          column: 7,
          endColumn: 11,
        },
      ],
    },
  ],
});
