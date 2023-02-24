/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

const ruleTesterTs = new TypeScriptRuleTester();
const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

import { rule } from 'linting/eslint/rules/values-not-convertible-to-numbers';

ruleTesterTs.run(
  'Values not convertible to numbers should not be used in numeric comparisons [TS]',
  rule,
  {
    valid: [
      {
        code: `42 > 41`,
      },
      {
        code: `
        const n1 = 42;
        const n2 = 0;
        n1 >= 0`,
      },
      {
        code: `
        const date = new Date();
        date > 42;
        `,
      },
      {
        code: `42 > NaN`, // FN,
      },
      {
        code: `"foo" > "hello"`,
      },
      {
        code: 'true > false',
      },
      {
        code: `
        const a = 42 === 42;
        const b = 'str';
        a < b;
        `,
      },
      {
        code: `42 > null`,
      },
      {
        code: `42 > unknown`,
      },
      {
        code: `
        const undef;
        undef > 42;`, // FN
      },
      {
        code: `"hello" <= new Object()`,
      },
      {
        code: `
        var undefinedVariable;
        var nan = undefinedVariable + 42;
        nan >= 42;`, // FN
      },
      {
        code: `
        let x = { };
        x.a >= 42;`, // FN
      },
    ],
    invalid: [
      {
        code: `new Object() > 0`,
        errors: [
          {
            message:
              'Re-evaluate the data flow; this operand of a numeric comparison could be of type Object.',
            line: 1,
            endLine: 1,
            column: 1,
            endColumn: 13,
          },
        ],
      },
      {
        code: `
        const obj1 = new Object();
        const obj2 = new Object();
        obj1 < obj2;`,
        errors: 2,
      },
      {
        code: `42 > undefined`,
        errors: [
          {
            message:
              'Re-evaluate the data flow; this operand of a numeric comparison could be of type undefined.',
          },
        ],
      },
      {
        code: `1 < function(){}`,
        errors: 1,
      },
      {
        code: `
        var array = [3,2];
        array > 42;`,
        errors: 1,
      },
      {
        code: `
        var obj = {};
        obj <= 42;`,
        errors: 1,
      },
    ],
  },
);

ruleTesterJs.run(
  'Values not convertible to numbers should not be used in numeric comparisons [JS]',
  rule,
  {
    valid: [{ code: `new Object() > 0` }], // no type information
    invalid: [],
  },
);
