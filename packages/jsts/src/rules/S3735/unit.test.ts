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
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tests/tools/index.ts';
import { rule } from './/index.ts';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

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
    {
      code: `
            const f = () => { return new Promise(() => {}); };
            void f(); // FP: should be ignored since 'f()' is a promise but we are missing type information
            `,
      errors: 1,
    },
  ],
};
ruleTesterJs.run('"void" should not be used JS', rule, testCases);
ruleTesterTs.run('"void" should not be used TS', rule, {
  valid: [
    {
      code: `void 0;`,
    },
    {
      code: `
            const p = new Promise(() => {});
            void p;
            `,
    },
    {
      code: `
            const f = () => { return new Promise(() => {}); };
            void f();
            `,
    },
  ],
  invalid: [
    {
      code: `void 42;`,
      errors: 1,
    },
  ],
});
