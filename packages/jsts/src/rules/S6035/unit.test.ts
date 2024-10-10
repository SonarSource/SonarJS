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
import { rule } from './index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Single-character alternation', rule, {
  valid: [
    {
      code: `const str = 'abc123';`,
    },
    {
      code: `const str = /[abc]/;`,
    },
    {
      code: `const re = /ab|cd/;`,
    },
    {
      code: `const re = /a|\\b|c/;`,
    },
    {
      code: `const re = /^|$/;`,
    },
    {
      code: `const re = /|/;`,
    },
    {
      code: `/(s)*/`,
    },
  ],
  invalid: [
    {
      code: `
          const re = /a|b|c/;
                   //^^^^^^^
        `,
      errors: [
        {
          message: 'Replace this alternation with a character class.',
          line: 2,
          endLine: 2,
          column: 23,
          endColumn: 28,
        },
      ],
    },
    {
      code: `const re = /a|(b|c)/;`,
      errors: [
        {
          message: 'Replace this alternation with a character class.',
          line: 1,
          endLine: 1,
          column: 15,
          endColumn: 20,
        },
      ],
    },
    {
      code: `const re = /abcd|(e|f)gh/;`,
      errors: 1,
    },
    {
      code: `const re = /(a|b|c)*/;`,
      errors: 1,
    },
    {
      code: `const re = /(?:a|b)/;`,
      errors: 1,
    },
    {
      code: `const re = /a(?=b|c)/;`,
      errors: 1,
    },
    {
      code: `const re = /a(?!b|c)/;`,
      errors: 1,
    },
    {
      code: `const re = /(?<=a|b)c/;`,
      errors: 1,
    },
    {
      code: `const re = /(?<!a|b)c/;`,
      errors: 1,
    },
    {
      code: `const re = /\d|x/;`,
      errors: 1,
    },
    {
      code: `const re = /\u1234|\u{12345}/u;`,
      errors: 1,
    },
  ],
});
