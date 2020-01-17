/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: { impliedStrict: false },
    sourceType: "script",
  },
});

import { rule } from "../../src/rules/arguments-usage";

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
      errors: [
        {
          message:
            '{"message":"Use the rest syntax to declare this function\'s arguments.","secondaryLocations":[]}',
          line: 3,
          endLine: 3,
          column: 7,
          endColumn: 16,
        },
        {
          message:
            '{"message":"Use the rest syntax to declare this function\'s arguments.","secondaryLocations":[{"column":6,"line":8,"endColumn":15,"endLine":8}]}',
          line: 7,
          endLine: 7,
          column: 7,
          endColumn: 16,
        },
      ],
    },
  ],
});
