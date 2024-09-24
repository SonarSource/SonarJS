/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './/index.ts';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tests/tools/index.ts';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTesterJs.run('"in" should not be used with primitive types [js]', rule, {
  valid: [
    {
      code: `unknown in 1; // not reported without type information`,
    },
  ],
  invalid: [],
});

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run(`"in" should not be used with primitive types [ts]`, rule, {
  valid: [
    {
      code: `1 in [1, 2, 3];`,
    },
    {
      code: `1 in new Number(1);`,
    },
    {
      code: `'prop' in { 'prop': 1 };`,
    },
  ],
  invalid: [
    {
      code: `unknown in 1;`,
      errors: [
        {
          message: `{\"message\":\"TypeError can be thrown as this operand might have primitive type.\",\"secondaryLocations\":[{\"column\":8,\"line\":1,\"endColumn\":10,\"endLine\":1}]}`,
          line: 1,
          column: 12,
          endLine: 1,
          endColumn: 13,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `unknown in 'str';`,
      errors: 1,
    },
    {
      code: `unknown in true;`,
      errors: 1,
    },
    {
      code: `unknown in null;`,
      errors: 1,
    },
    {
      code: `unknown in undefined;`,
      errors: 1,
    },
  ],
});
