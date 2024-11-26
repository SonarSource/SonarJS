/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018 },
});

ruleTester.run('Braces and parentheses should be used consistently with arrow functions', rule, {
  valid: [
    {
      code: `// valid mandatory parentheses 
var foo = (a) => { foo(); }
var foo = (a /*some comment*/) => { foo(); }
var foo = (a, b) => { foo(); }
var foo = () => { foo(); }
var foo = (a = 1) => { foo(); }
var foo = (...xs) => xs

// tokens before parameter clause
var foo = async (x) => x
var foo = async (x:string) => x
var foo = <T>(x) => x
var foo = <T>(x: T) => x
var foo = async <T>(x: T) => x
var foo = async (x1: number, x2: number = 42) => (x1 + x2)
var foo = async (...xs) => xs
var foo = async /**/ (y) => y
var foo = async (/**/ y) => y
var foo = async (y /**/) => y
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
var bar = someFunctionTakingCallback(err => { console.log(err); })

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

// tokens before parameter clause
foo = async x => { return x; }
foo = async (x, y) => { return x; }
// parens cannot be omitted when generic clause is present
foo = <T>(x) => { return x; }
foo = async <T>(x) => { return x; }
foo = async <T>(x, y) => { return x; }
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
    {
      code: `x => x // parameter as the very first token`,
      options: [{ requireParameterParentheses: false, requireBodyBraces: false }],
    },
  ],
  invalid: [
    {
      code: `// invalid mandatory parentheses 
var foo = a => { foo(); }  // Noncompliant
var foo = async x => x
`,
      options: [{ requireParameterParentheses: true, requireBodyBraces: false }],
      errors: [
        {
          message: 'Add parentheses around the parameter of this arrow function.',
          line: 2,
          endLine: 2,
          column: 11,
          endColumn: 12,
        },
        {
          message: 'Add parentheses around the parameter of this arrow function.',
          line: 3,
          endLine: 3,
          column: 17,
          endColumn: 18,
        },
      ],
    },
    {
      code: `// invalid optional parentheses 
var foo = (a) => { foo(); /* comment */ } // Noncompliant
var foo = async (x) => x
`,
      options: [{ requireParameterParentheses: false, requireBodyBraces: false }],
      errors: [
        {
          message: 'Remove parentheses around the parameter of this arrow function.',
          line: 2,
          endLine: 2,
          column: 12,
          endColumn: 13,
        },
        {
          message: 'Remove parentheses around the parameter of this arrow function.',
          line: 3,
          endLine: 3,
          column: 18,
          endColumn: 19,
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
