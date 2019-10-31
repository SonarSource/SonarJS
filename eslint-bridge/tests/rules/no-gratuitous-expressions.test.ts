/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { rule } from "../../src/rules/no-gratuitous-expressions";

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: 2018, sourceType: "module" },
});

ruleTester.run("no-gratuitous-expressions", rule, {
  valid: [
    {
      code: `
      function bar(x: boolean) {
        if (x && y) {
        } else {
          if (x) {} // OK, else branch
        }
      }
      `,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          x = bar();
          if (x) { } 
        }
      }
      `,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          while (cond) {
            x = bar();
            if (x) { } 
          }
        }
      }
      `,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          nested();
          if (x) { } 
        }

        function nested() {
          x = bar();
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      function bar(x: boolean, z) {
        if (x && z) {
          if (y && x) {} // "x" always true
          if (y && z) {} // "z" always true
        }
      }`,
      errors: [
        {
          message: `{"message":"This always evaluates to truthy. Consider refactoring this code.","secondaryLocations":[{"message":"Evaluated here to be truthy","line":3,"column":12,"endLine":3,"endColumn":13}]}`,
          line: 4,
          column: 20,
          endLine: 4,
          endColumn: 21,
        },
        {
          message: `{"message":"This always evaluates to truthy. Consider refactoring this code.","secondaryLocations":[{"message":"Evaluated here to be truthy","line":3,"column":17,"endLine":3,"endColumn":18}]}`,
          line: 5,
          column: 20,
          endLine: 5,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          if (x) { // "x" always true
          }
        }
      }`,
      errors: [
        {
          message: `{"message":"This always evaluates to truthy. Consider refactoring this code.","secondaryLocations":[{"message":"Evaluated here to be truthy","line":3,"column":12,"endLine":3,"endColumn":13}]}`,
          line: 4,
          column: 15,
          endLine: 4,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
      function bar(x: boolean ) {
        x++;
        if (x) {
          if (x) { // Noncompliant
          }
        }
        x = foo();
      }`,
      errors: 1,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          if (!x) { // Noncompliant
          }
        }
      }`,
      errors: 1,
    },
    {
      code: `
      function bar(x: boolean) {
        if (!x) {
          foo(!x) // Noncompliant
        }
      }`,
      errors: 1,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          x = 42;
        } else {
          foo(!x) // Noncompliant
        }
      }`,
      errors: 1,
    },
    {
      code: `
      function bar(x: boolean) {
        if (x) {
          return foo() || x; // OK
        } else {
          x || bar(); // Noncompliant
          x || bar() || bar(); // Noncompliant
          bar() || x || bar(); // FN, not supported
        }
      }`,
      errors: 2,
    },
    {
      code: `
      function bar(x: boolean) {
        if (!!x) {
          x && foo(); // Noncompliant
        }
      }`,
      errors: 1,
    },
  ],
});
