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
import { rule } from './';

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
});

ruleTester.run(`Calls to .call() and .apply() methods should not be redundant`, rule, {
  valid: [
    {
      code: `foo.apply(obj, args);`,
    },
  ],
  invalid: [
    {
      code: `foo.call(null);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant call()',
              output: `foo();`,
            },
          ],
        },
      ],
    },
    {
      code: `foo.call(null, a, b, c);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant call()',
              output: `foo(a, b, c);`,
            },
          ],
        },
      ],
    },
    {
      code: `obj.foo.call(obj);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant call()',
              output: `obj.foo();`,
            },
          ],
        },
      ],
    },
    {
      code: `obj.foo.call(obj, x, y, z);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant call()',
              output: `obj.foo(x, y, z);`,
            },
          ],
        },
      ],
    },
    {
      code: `foo.apply(null, []);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant apply()',
              output: `foo();`,
            },
          ],
        },
      ],
    },
    {
      code: `foo.apply(null, [1, 2, 3]);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant apply()',
              output: `foo(1, 2, 3);`,
            },
          ],
        },
      ],
    },
    {
      code: `obj.foo.apply(obj, []);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant apply()',
              output: `obj.foo();`,
            },
          ],
        },
      ],
    },
    {
      code: `obj.foo.apply(obj, [1, 2, 3]);`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Remove redundant apply()',
              output: `obj.foo(1, 2, 3);`,
            },
          ],
        },
      ],
    },
  ],
});
