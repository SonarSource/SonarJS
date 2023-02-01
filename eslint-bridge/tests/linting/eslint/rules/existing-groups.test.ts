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
import { rule } from 'linting/eslint/rules/existing-groups';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';

const typeAwareRuleTester = new TypeScriptRuleTester();
typeAwareRuleTester.run('Existing regular expression groups', rule, {
  valid: [
    {
      code: `replace()`,
    },
    {
      code: `'str'.replace()`,
    },
    {
      code: `'str'[replace]()`,
    },
    {
      code: `'str'.search()`,
    },
    {
      code: `[].replace()`,
    },
    {
      code: `'str'.replaceAll(/(\d+)/, '$1')`,
    },
    {
      code: `'str'.replace(/(\d+)/, '$1')`,
    },
    {
      code: `'str'.replace(/(\d+)\s(\d+)/, '$1, $2, $1')`,
    },
    {
      code: `'str'.replace(/(?<first>\w+)/, '$<first>')`,
    },
    {
      code: `'str'.replace(/(?<first>\w+)\s(?<second>\w+)/, '$<first>, $<second>, $<first>')`,
    },
    {
      code: `'str'.replace(/(\d+)\s(?<first>\w+)/, '$1, $<first>')`,
    },
    {
      code: `'str'.replace(/(?<abc123_>\w+)/, '$<abc123_>')`,
    },
    {
      code: `'str'.replace(/str/, 'abc')`,
    },
    {
      code: `'str'.replace(/str/, substr)`,
    },
    {
      code: `'str'.replace(pattern, 'abc')`,
    },
    {
      code: `'str'.replace(new RegExp('(\d+)'), '$1')`,
    },
    {
      code: `'str'.replace(new RegExp('(\d'), '$1')`,
    },
  ],
  invalid: [
    {
      code: `'str'.replaceAll(/(\d+)/, '$0')`,
      errors: [
        {
          message: 'Referencing non-existing group: $0.',
          line: 1,
          column: 26,
        },
      ],
    },
    {
      code: `'str'.replace(/(\d+)/, '$0')`,
      errors: [
        {
          message: 'Referencing non-existing group: $0.',
          line: 1,
          column: 23,
        },
      ],
    },
    {
      code: `'str'.replace(/(\d+)/, '$2')`,
      errors: [
        {
          message: 'Referencing non-existing group: $2.',
          line: 1,
          column: 23,
        },
      ],
    },
    {
      code: `'str'.replace(/(\d+)\s(\d+)/, '$0 $1 $2 $3')`,
      errors: [
        {
          message: 'Referencing non-existing groups: $0, $3.',
          line: 1,
          column: 28,
        },
      ],
    },
    {
      code: `'str'.replace(/(?<first>\w+)/, '$<second>')`,
      errors: [
        {
          message: 'Referencing non-existing group: $<second>.',
          line: 1,
          column: 31,
        },
      ],
    },
    {
      code: `'str'.replace(/(?<first>\w+)\s(?<second>\w+)/, '$<first> $<third> $<second> $<fourth>')`,
      errors: [
        {
          message: 'Referencing non-existing groups: $<third>, $<fourth>.',
          line: 1,
          column: 45,
        },
      ],
    },
    {
      code: `'str'.replace(/(?<first>\w+)/, '$0 $<first> $<second>')`,
      errors: [
        {
          message: 'Referencing non-existing groups: $0, $<second>.',
          line: 1,
          column: 31,
        },
      ],
    },
    {
      code: `'str'.replaceAll(new RegExp('(\d+)'), '$0')`,
      errors: [
        {
          message: 'Referencing non-existing group: $0.',
          line: 1,
          column: 38,
        },
      ],
    },
    {
      code: `
        const pattern = '(\d+)';
        'str'.replaceAll(new RegExp(pattern), '$0')`,
      errors: [
        {
          message: 'Referencing non-existing group: $0.',
          line: 3,
          column: 47,
        },
      ],
    },
    {
      code: `
        const pattern = /(\d+)/;
        'str'.replaceAll(pattern, '$0')`,
      errors: [{ message: 'Referencing non-existing group: $0.' }],
    },
  ],
});

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Existing regular expression groups reports nothing without types', rule, {
  valid: [
    {
      code: `'str'.replace(/(\d+)/, '$1')`,
    },
    {
      code: `'str'.replace(/(\d+)/, '$0')`,
    },
  ],
  invalid: [],
});
