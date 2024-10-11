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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import path from 'path';
import Module from 'node:module';
const require = Module.createRequire(import.meta.url);

const ruleTester = new NodeRuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

const options = [{ credentialWords: ['password', 'pwd', 'passwd'] }];

ruleTester.run('Hardcoded credentials should be avoided', rule, {
  valid: [
    {
      code: `let password = ""`,
      options,
    },
    {
      code: `let password = 'foo';`,
      filename: path.join('some', 'L10n', 'path', 'file.js'),
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
      options: [{ credentialWords: ['secret'] }],
      errors: 1,
    },
    {
      code: `let url = "https://example.com?token=hl2OAIXXZ60";`,
      options: [{ credentialWords: ['token'] }],
      errors: 1,
    },
    {
      code: `let password = 'foo';`,
      filename: path.join('some', 'random', 'path', 'file.js'),
      options,
      errors: 1,
    },
  ],
});
