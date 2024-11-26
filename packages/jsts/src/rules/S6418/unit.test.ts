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
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './rule.js';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('Rule S6418 - hardcoded-secrets', rule, {
  valid: [],
  invalid: [
    // we're verifying that given a broken RegExp, the rule still works.
    {
      code: `
      secret = '9ah9w8dha9w8hd98h';
      `,
      options: [
        {
          'secret-words': 'sel/\\',
          'randomness-sensibility': 0.5,
        },
      ],
      errors: 1,
    },
  ],
});
