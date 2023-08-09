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
import { rule } from '../../src/rules/cookies';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run('Writing cookies is security-sensitive', rule, {
  valid: [
    {
      code: `document.foo`,
    },
    {
      code: `foo.cookie`,
    },
    {
      code: `response.setHeader()`,
    },
    {
      code: `response.setHeader('Content-Type', 'text/plain')`,
    },
    {
      code: `response.foo('Set-Cookie', x)`,
    },
    {
      code: `response.setHeader(SetCookie, x)`,
    },
    {
      code: `res.cookie("foo", "bar");`,
    },
    {
      code: `foo(req.cookies);`,
    },
    {
      code: `let x = document.cookie;`,
    },
    {
      code: `document.notCookie = 42`,
    },
    {
      code: `notDocument.cookie = 42`,
    },
    {
      code: `'express'; foo(req.cookies);`,
    },
  ],
  invalid: [
    {
      code: `document.cookie = 42;`,
      errors: [
        {
          message: 'Make sure that cookie is written safely here.',
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 16,
        },
      ],
    },
    {
      code: `response.setHeader('Set-Cookie', x);`,
      errors: 1,
    },
    {
      code: `'express'; res.cookie("foo", "bar");`,
      errors: 1,
    },
  ],
});
