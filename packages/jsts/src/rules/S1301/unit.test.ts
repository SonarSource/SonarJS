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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
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
          messageId: 'replaceSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: 'switch (a) { case 1: break; }',
      errors: [
        {
          messageId: 'replaceSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
    {
      code: 'switch (a) {}',
      errors: [
        {
          messageId: 'replaceSwitch',
          column: 1,
          endColumn: 7,
        },
      ],
    },
  ],
});
