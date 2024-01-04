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
import { JavaScriptRuleTester } from '../tools';
import { rule } from './';

const ruleTester = new JavaScriptRuleTester();
ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `let x = { a: 42, b: 42 }`,
    },
  ],
  invalid: [
    {
      code: `let x = { a: 42, a: 42 }`,
      errors: [
        { suggestions: [{ output: `let x = { a: 42 }`, desc: 'Remove this duplicate property' }] },
      ],
    },
    {
      code: `let x = { a: 42, a: 42, b: 42 }`,
      errors: [{ suggestions: [{ output: `let x = { a: 42, b: 42 }` }] }],
    },
    {
      code: `let x = { a: 42, b: 42, a: 42, }`,
      errors: [{ suggestions: [{ output: `let x = { a: 42, b: 42, }` }] }],
    },
    {
      code: `
let x = { 
  a: 42,
  a: 42
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
let x = { 
  a: 42
}`,
            },
          ],
        },
      ],
    },
    {
      code: `
let x = { 
  a: 42,
  get a() {
    return 42;
  },
}`,
      errors: [
        {
          suggestions: [
            {
              output: `
let x = { 
  a: 42,
}`,
            },
          ],
        },
      ],
    },
  ],
});
