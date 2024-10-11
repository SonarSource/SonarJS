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

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Using pseudorandom number generators (PRNGs) is security-sensitive', rule, {
  valid: [
    {
      code: `foo(x)`,
    },
    {
      code: `"Math.random()"`,
    },
    {
      code: `Math.foo()`,
    },
    {
      code: `Foo.random()`,
    },
  ],
  invalid: [
    {
      code: `let x = Math.random();`,
      errors: [
        {
          message: 'Make sure that using this pseudorandom number generator is safe here.',
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 22,
        },
      ],
    },
    {
      code: `foo(Math.random())`,
      errors: 1,
    },
    {
      code: `let random = Math.random; foo(random());`,
      errors: 1,
    },
  ],
});
