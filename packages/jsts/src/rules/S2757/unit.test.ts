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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run("Non-existent operators '=+', '=-' and '=!' should not be used", rule, {
  valid: [
    {
      code: `
        x = y;
        x += y;
        x = + y;
        x =
           + y;
        x=+y; // Ok - we accept this as some people don't like to use white spaces
        x = - y;
        x /=+ y;
        x = !y;
        let y = + 1;
        y = (!(y));
        const z = + 1;
        other =~ 1;
        `,
    },
  ],
  invalid: [
    {
      code: `x =+ y;`,
      errors: [
        {
          messageId: `useExistingOperator`,
          data: {
            operator: '+',
          },
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 5,
          suggestions: [
            {
              messageId: 'suggestExistingOperator',
              data: {
                operator: '+=',
              },
              output: `x += y;`,
            },
          ],
        },
      ],
    },
    {
      code: `
      x =- y;`,
      errors: [
        {
          messageId: `useExistingOperator`,
          data: {
            operator: '-',
          },
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `x =! y;`,
      errors: [
        {
          messageId: `useExistingOperator`,
          data: {
            operator: '!',
          },
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 5,
        },
      ],
    },
    {
      code: `const x =! y;`,
      errors: [
        {
          messageId: `useExistingOperator`,
          data: {
            operator: '!',
          },
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `let x =! y;`,
      errors: [
        {
          messageId: `useExistingOperator`,
          data: {
            operator: '!',
          },
          line: 1,
          endLine: 1,
          column: 7,
          endColumn: 9,
          suggestions: [],
        },
      ],
    },
  ],
});
