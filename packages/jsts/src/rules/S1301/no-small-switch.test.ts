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
import rule = require('../../src/rules/no-small-switch');

ruleTester.run('no-small-switch', rule, {
  valid: [
    { code: 'switch (a) { case 1: case 2: break; default: doSomething(); break; }' },
    { code: 'switch (a) { case 1: break; default: doSomething(); break; case 2: }' },
    { code: 'switch (a) { case 1: break; case 2: }' },
  ],
  invalid: [
    {
      code: 'switch (a) { case 1: doSomething(); break; default: doSomething(); }',
      errors: [
        {
          messageId: 'smallSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: 'switch (a) { case 1: break; }',
      errors: [
        {
          messageId: 'smallSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: 'switch (a) {}',
      errors: [
        {
          messageId: 'smallSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
  ],
});
