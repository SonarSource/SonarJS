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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('no-inverted-boolean-check', rule, {
  valid: [
    {
      code: `if (!x) {}`,
    },
    {
      code: `if (x == 1) {}`,
    },
    {
      code: `if (!(x + 1)) {}`,
    },
    {
      code: `if (+(x == 1)) {}`,
    },
    {
      code: `!x ? 2 : 3`,
    },
  ],
  invalid: [
    // `==` => `!=`
    {
      code: `if (!(x == 1)) {}`,
      errors: [
        {
          ...error('!=', `if (x != 1) {}`),
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 14,
        },
      ],
    },
    // `!=` => `==`
    {
      code: `if (!(x != 1)) {}`,
      errors: [error('==', `if (x == 1) {}`)],
    },
    // `===` => `!==`
    {
      code: `if (!(x === 1)) {}`,
      errors: [error('!==', `if (x !== 1) {}`)],
    },
    // `!==` => `===`
    {
      code: `if (!(x !== 1)) {}`,
      errors: [error('===', `if (x === 1) {}`)],
    },
    // `>` => `<=`
    {
      code: `if (!(x > 1)) {}`,
      errors: [error('<=', `if (x <= 1) {}`)],
    },
    // `<` => `>=`
    {
      code: `if (!(x < 1)) {}`,
      errors: [error('>=', `if (x >= 1) {}`)],
    },
    // `>=` => `<`
    {
      code: `if (!(x >= 1)) {}`,
      errors: [error('<', `if (x < 1) {}`)],
    },
    // `<=` => `>`
    {
      code: `if (!(x <= 1)) {}`,
      errors: [error('>', `if (x > 1) {}`)],
    },
    // ternary operator
    {
      code: `!(x != 1) ? 1 : 2`,
      errors: [error('==', `x == 1 ? 1 : 2`)],
    },
    // not conditional
    {
      code: `foo(!(x === 1))`,
      errors: [error('!==', `foo(x !== 1)`)],
    },
    {
      code: `let foo = !(x <= 4)`,
      errors: [error('>', `let foo = x > 4`)],
    },
    {
      code: `let foo = !!(a < b)`,
      errors: [error('>=', 'let foo = !(a >= b)')],
    },
  ],
});

function error(invertedOperator: string, output: string): NodeRuleTester.TestCaseError {
  return {
    messageId: 'useOppositeOperator',
    data: { invertedOperator },
    suggestions: [
      {
        messageId: 'suggestOperationInversion',
        output,
      },
    ],
  };
}
