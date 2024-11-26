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

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Values should not be uselessly incremented', rule, {
  valid: [
    {
      code: `i = j++;`,
    },
    {
      code: `i = ++i;`,
    },
    {
      code: `i++;`,
    },
    {
      code: `function f1() {
              let i = 1;
              i++;
            }`,
    },
    {
      code: `let outside = 1;
             function f1() {
               return outside++;
             }`,
    },
    {
      code: `function f1() {
              let i = 1;
              return ++i;
            }`,
    },
  ],
  invalid: [
    {
      code: `i = i++;`,
      errors: [
        {
          message: 'Remove this increment or correct the code not to waste it.',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 8,
        },
      ],
    },
    {
      code: `i = i--; `,
      errors: [
        {
          message: 'Remove this decrement or correct the code not to waste it.',
        },
      ],
    },
    {
      code: `function f1() {
              let i = 1;
              return i++;
            }`,
      errors: [
        {
          message: 'Remove this increment or correct the code not to waste it.',
        },
      ],
    },
  ],
});
