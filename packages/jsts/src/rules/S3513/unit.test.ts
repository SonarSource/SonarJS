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
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: { impliedStrict: false },
    sourceType: 'script',
  },
});

ruleTester.run(`"arguments" should not be accessed directly`, rule, {
  valid: [
    {
      code: `
function foo_ok1(a, b) {
  return a + b;
}

function foo_ok2(...args) {
  return args.join(', ');
}

function foo_ok3(...arguments) {
  return arguments.join(', ');
}

function foo_ok4() {
  console.log("hello!");
}

function foo_ok5(a) {
  if (arguments.length !== 1) { // OK, enforcing the number of arguments is not accessing arguments
    throw new Error('Require 1 and only 1 argument');
  }
  return a.join(', ');
}

var arguments = 1;  // OK, global
foo(arguments);
`,
    },
  ],
  invalid: [
    {
      code: `
function foo1() {
  foo(arguments);  // Noncompliant
}

const foo2 = function() {
  foo(arguments);  // Noncompliant
  foo(arguments[1]);
}
`,
      options: ['sonar-runtime'],
      errors: [
        {
          message: JSON.stringify({
            message: "Use the rest syntax to declare this function's arguments.",
            secondaryLocations: [],
          }),
          line: 3,
          endLine: 3,
          column: 7,
          endColumn: 16,
        },
        {
          message: JSON.stringify({
            message: "Use the rest syntax to declare this function's arguments.",
            secondaryLocations: [
              {
                message: 'Replace this reference to "arguments".',
                column: 6,
                line: 8,
                endColumn: 15,
                endLine: 8,
              },
            ],
          }),
          line: 7,
          endLine: 7,
          column: 7,
          endColumn: 16,
        },
      ],
    },
  ],
});
