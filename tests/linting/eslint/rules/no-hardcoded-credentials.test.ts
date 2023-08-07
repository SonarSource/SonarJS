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
import { rule } from '@sonar/jsts/rules/no-hardcoded-credentials';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

const options = ['password', 'pwd', 'passwd'];

ruleTester.run('Hardcoded credentials should be avoided', rule, {
  valid: [
    {
      code: `let password = ""`,
      options,
    },
  ],
  invalid: [
    {
      code: `let password = "foo";`,
      options,
      errors: [
        {
          message: 'Review this potentially hardcoded credential.',
          line: 1,
          endLine: 1,
          column: 16,
          endColumn: 21,
        },
      ],
    },
    {
      code: `let password = 'foo';`,
      options,
      errors: 1,
    },
    {
      code: `
      let my_pwd;
      my_pwd = "foo";
      `,
      options,
      errors: 1,
    },
    {
      code: `let credentials = { user: "foo", passwd: "bar" };`,
      options,
      errors: 1,
    },
    {
      code: `let url = "https://example.com?password=hl2OAIXXZ60";`,
      options,
      errors: 1,
    },
    {
      code: `let secret = "foo"`,
      options: ['secret'],
      errors: 1,
    },
    {
      code: `let url = "https://example.com?token=hl2OAIXXZ60";`,
      options: ['token'],
      errors: 1,
    },
  ],
});
