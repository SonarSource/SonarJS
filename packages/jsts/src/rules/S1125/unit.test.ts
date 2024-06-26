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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('no-redundant-boolean', rule, {
  valid: [
    { code: 'a === false;' },
    { code: 'a === true;' },
    { code: 'a !== false;' },
    { code: 'a !== true;' },
    { code: 'a == foo(true);' },
    { code: 'true < 0;' },
    { code: '~true;' },
    { code: '!foo;' },
    { code: 'if (foo(mayBeSomething || false)) {}' },
    { code: 'x ? y || false : z' },
  ],
  invalid: [
    {
      code: 'if (x == true) {}',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 14 }],
    },
    {
      code: 'if (x == false) {}',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 15 }],
    },
    {
      code: 'if (x || false) {}',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 15 }],
    },
    {
      code: 'if (x && false) {}',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 15 }],
    },

    {
      code: 'x || false ? 1 : 2',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 6, endColumn: 11 }],
    },

    {
      code: 'fn(!false)',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 5, endColumn: 10 }],
    },

    {
      code: 'a == true == b;',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 6, endColumn: 10 }],
    },
    {
      code: 'a == b == false;',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 11, endColumn: 16 }],
    },
    {
      code: 'a == (true == b) == b;',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 7, endColumn: 11 }],
    },

    {
      code: '!(true);',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 3, endColumn: 7 }],
    },
    {
      code: 'a == (false);',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 7, endColumn: 12 }],
    },

    {
      code: 'true && a;',
      errors: [{ messageId: 'removeUnnecessaryBoolean', column: 1, endColumn: 5 }],
    },
  ],
});
