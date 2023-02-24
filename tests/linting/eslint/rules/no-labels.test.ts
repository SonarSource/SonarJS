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
import { rule } from 'linting/eslint/rules/no-labels';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Labels should not be used', rule, {
  valid: [
    {
      code: `
      let x = doSomething();
      if (x <= 0) {
        doSomethingElse();
      }`,
    },
  ],
  invalid: [
    {
      code: `
      myLabel: {
        let x = doSomething();
        if (x > 0) {
          break myLabel;
        }
        doSomethingElse();
      }
`,
      errors: [
        {
          message: `Refactor the code to remove this label and the need for it.`,
          line: 2,
          endLine: 2,
          column: 7,
          endColumn: 14,
        },
      ],
    },
  ],
});
