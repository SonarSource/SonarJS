/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
import { ruleTester } from '../rule-tester';
import rule = require('../../src/rules/no-all-duplicated-branches');

ruleTester.run('no-all-duplicated-branches if', rule, {
  valid: [
    { code: "if (a) { first('const'); } else { first('var'); }" },
    { code: 'if (a) { first(); } else { second(); }' },
    { code: 'if (a) { first(); } else if (b) { first(); }' }, // ok, no `else`
    { code: 'if (a) { first(); } else if (b) { second(); }' },
    { code: 'if (a) { second(); } else if (b) { first(); } else { first(); }' },
    { code: 'if (a) { first(); } else if (b) { second(); } else { first(); }' },
    { code: 'if (a) { first(); } else if (b) { first(); } else { second(); }' },
    { code: 'if (a) { first(); second(); } else { second(); first(); }' },
    { code: 'if (a) { first(); second(); } else { first(); third(); }' },
    { code: 'if (a) { first(); second(); } else { first(); }' },
    {
      code: 'if (a) { first(); second(); } else if (b) { first(); second(); } else { first(); third(); }',
    },
    {
      code: `
      function render() {
        if (a) {
          return <p>foo</p>;
        } else {
          return <p>bar</p>;
        }
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  ],
  invalid: [
    {
      code: 'if (a) { first(); } else { first(); }',
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 1,
          column: 1,
          endColumn: 38,
        },
      ],
    },
    {
      code: 'if (a) { first(); } else if (b) { first(); } else { first(); }',
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 1,
          column: 1,
          endColumn: 63,
        },
      ],
    },
    {
      code: 'if (a) { first(); second(); } else { first(); second(); }',
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 1,
          column: 1,
          endColumn: 58,
        },
      ],
    },
    {
      code: 'if (a) { first(); second(); } else if (b) { first(); second(); } else { first(); second(); }',
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 1,
          column: 1,
          endColumn: 93,
        },
      ],
    },
  ],
});

ruleTester.run('no-all-duplicated-branches switch', rule, {
  valid: [
    {
      // Ok, no default
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 2:
        case 3:
          first();
          second();
      }`,
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 3:
          first();
          second();
          break;
        default:
          third();
      }`,
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 2:
          first();
          second();
          break;
        default:
      }`,
    },
  ],
  invalid: [
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        default:
          first();
          second();
      }`,
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 2,
          endLine: 10,
          column: 7,
          endColumn: 8,
        },
      ],
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          second();
          break;
        case 2:
          first();
          second();
          break;
        default:
          first();
          second();
      }`,
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 2,
          endLine: 14,
          column: 7,
          endColumn: 8,
        },
      ],
    },
    {
      code: `
      switch (a) {
        case 1:
          first();
          break;
        case 2:
          first();
          break;
        default:
          first();
      }`,
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 2,
          endLine: 11,
          column: 7,
          endColumn: 8,
        },
      ],
    },
    {
      code: `
      switch (a) {
        case 1:
        case 2:
          first();
          second();
          break;
        case 3:
          first();
          second();
          break;
        default:
          first();
          second();
      }`,
      errors: [
        {
          messageId: 'removeOrEditConditionalStructure',
          line: 2,
          endLine: 15,
          column: 7,
          endColumn: 8,
        },
      ],
    },
  ],
});

ruleTester.run('no-all-duplicated-branches conditional', rule, {
  valid: [{ code: 'a ? first : second;' }],
  invalid: [
    {
      code: 'a ? first : first;',
      errors: [
        {
          messageId: 'returnsTheSameValue',
          line: 1,
          column: 1,
          endColumn: 18,
        },
      ],
    },
  ],
});
