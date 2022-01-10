/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { rule } from 'rules/void-use';
import { RuleTesterTs } from '../RuleTesterTs';
const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new RuleTesterTs(false);

const testCases = {
  valid: [
    {
      code: `
            (function() {
            })()
            `,
    },
    {
      code: `
            void 0;
            `,
    },
    {
      code: `
            void (0);
            `,
    },
    {
      code: `
            void function() {
            }()
            `,
    },
    {
      code: `
            void (() => 42) ()
            `,
    },
  ],
  invalid: [
    {
      code: `
            foo(void 42);
            `,
      errors: [
        {
          message: `Remove this use of the \"void\" operator.`,
          line: 2,
          endLine: 2,
          column: 17,
          endColumn: 21,
        },
      ],
    },
  ],
};
ruleTesterJs.run('"void" should not be used JS', rule, testCases);
ruleTesterTs.run('"void" should not be used TS', rule, testCases);
