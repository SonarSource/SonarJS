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

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: 2018 },
});
import { rule } from "../../src/rules/arrow-function-convention";

ruleTester.run("Braces and parentheses should be used consistently with arrow functions", rule, {
  valid: [
    {
      code: `// valid mandatory parentheses 
var foo = (a) => { foo(); }
var foo = (a /*some comment*/) => { foo(); }
var foo = (a, b) => { foo(); }
var foo = () => { foo(); }
var foo = (a = 1) => { foo(); }
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: false }],
    },
    {
      code: `// valid optional parentheses
var foo = a => { foo(); }
var foo = (a /*some comment*/) => { foo(); }
var foo = (a :string) => { foo(); }
var foo = (a) :string => { foo(); }
var foo = (a :string): boolean => { foo(); }
var foo = (a, b) => { foo(); }
var foo = () => { foo(); }
var foo = (a = 1) => { foo(); }

// array
foo = ([a, b]) => { return a + b; };
// array elision
foo = ([, a, , , b]) => { return a, b; };
// object
foo = ({a, b}) => { return a + b; };
// array in object
foo = ({a: [x, y]}) => { return x + y; };
// object in array
foo = ([{a}]) => { return a; };
foo = ([{a, b: y}]) => { return a + y; };
`,
      options: [{ requireParameterParentheses: false, requireBodyBraces: true }],
    },
    {
      code: `// valid mandatory braces 
var foo = (a, b) => { return a; }
var foo = (a, b) => { foo(); }
var foo = (a, b) => { return; }
var foo = (a, b) => { }
var foo = (a, b) => { foo(); return a;}
var foo = (a, b) => { return {}; }
var foo = (a, b) => {
  return Foo()
    .Bar();
}
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: true }],
    },
    {
      code: `// valid optional braces 
var foo = (a, b) => a;
var foo = (a, b) => a + b;
var foo = (a, b) => foo(a, b);
var foo = (a, b) => { foo(); }
var foo = (a, b) => { return; }
var foo = (a, b) => { }
var foo = (a, b) => { foo(); return a;}
var foo = (a, b) => { return {}; }  // OK, can't shorthand object literal
var foo = (a, b) => {   // OK, ignore multiline return
  return Foo()
    .Bar();
}
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: false }],
    },
  ],
  invalid: [
    {
      code: `// invalid mandatory parentheses 
var foo = a => { foo(); }  // Noncompliant
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: false }],
      errors: [
        {
          message: "Add parentheses around the parameter of this arrow function.",
          line: 2,
          endLine: 2,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `// invalid optional parentheses 
var foo = (a) => { foo(); /* comment */ } // Noncompliant
`,
      options: [{ requireParameterParentheses: false, requireBodyBraces: false }],
      errors: [
        {
          message: "Remove parentheses around the parameter of this arrow function.",
          line: 2,
          endLine: 2,
          column: 12,
          endColumn: 13,
        },
      ],
    },
    {
      code: `// invalid mandatory braces
var foo = (a, b) => a + b;         // Noncompliant
var foo = (a, b) => foo(a, b);     // Noncompliant
var foo = (a, b) => a;             // Noncompliant
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: true }],
      errors: [
        {
          message: 'Add curly braces and "return" to this arrow function body.',
          line: 2,
          endLine: 2,
          column: 21,
          endColumn: 26,
        },
        {
          message: 'Add curly braces and "return" to this arrow function body.',
          line: 3,
          endLine: 3,
          column: 21,
          endColumn: 30,
        },
        {
          message: 'Add curly braces and "return" to this arrow function body.',
          line: 4,
          endLine: 4,
          column: 21,
          endColumn: 22,
        },
      ],
    },
    {
      code: `// invalid optional braces
var foo = (a, b) => { return a; }    // Noncompliant
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: false }],
      errors: [
        {
          message: 'Remove curly braces and "return" from this arrow function body.',
          line: 2,
          endLine: 2,
          column: 21,
          endColumn: 34,
        },
      ],
    },
  ],
});
