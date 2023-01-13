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
import { rule } from 'linting/eslint/rules/switch-without-default';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

const tests = {
  valid: [
    {
      code: `
        switch (param) {
          case 0:
            break;
          default:
            break;
        }`,
    },
  ],
  invalid: [
    {
      code: `
        switch (param) {
          case 0:
            break;
        }`,
      errors: [
        {
          message: `Add a "default" clause to this "switch" statement.`,
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 15,
        },
      ],
    },
  ],
};

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterJs.run('"switch" statements should have "default" clauses [js]', rule, tests);
ruleTesterTs.run('"switch" statements should have "default" clauses [ts]', rule, tests);
