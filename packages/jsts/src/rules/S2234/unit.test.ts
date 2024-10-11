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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const eslintRuleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
eslintRuleTester.run('Parameters should be passed in the correct order', rule, {
  valid: [
    {
      code: `
        function f1(p1, p2, p3) {}
        function f2(p1, p2, p3) {}
        function f2() {}
        
        function withInitializer(p1="", p2="") {}
        function arrayBindingPattern([], p2) {}
        
        class A {
          method1(p1, p2) {}
        }
        
        function main() {
          f1(p1, p2, p3);
          f1(p1, p2, xxx);
          f1(p1, "p2", "x");
          unknown(p1, p3, p2);
          f2(p1, p3, p2);
          (function(p1, p2) {})(p1, p2);
          var a1 = new A();
          a1.method1(p1, p2);
          a1.method1(p2, p1); // FN - since we cannot resolve type in pure JS analysis
          withInitializer(p1, p2);
          arrayBindingPattern(p2, p1);
        }`,
    },
    {
      code: `
      function f(p1, p2) {}
      if (p1 < p2) {
        f(p2, p1);
      }
      if (p1.value() < p2.value()) {
        f(p2, p1);
      }
      if (p1.doesSomething(p2)) {
        f(p2, p1);
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function f1(p1, p2, p3) {}
        f1(p2, p1, p3);`,
      errors: [
        {
          message: `{"message":"Arguments 'p2' and 'p1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","column":20,"line":2,"endColumn":30,"endLine":2}]}`,
          line: 3,
          endLine: 3,
          column: 12,
          endColumn: 22,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        (function(p1, p2) {})(p2, p1);`,
      errors: [
        {
          message: `{"message":"Arguments 'p2' and 'p1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","column":18,"line":2,"endColumn":24,"endLine":2}]}`,
          line: 2,
          endLine: 2,
          column: 31,
          endColumn: 37,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        function withInitializer(p1="", p2="") {}
        withInitializer(p2, p1);`,
      errors: [
        {
          message: `{"message":"Arguments 'p2' and 'p1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","column":33,"line":2,"endColumn":45,"endLine":2}]}`,
          line: 3,
          endLine: 3,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      function f(p1, p2) {}
      if (p1 = p2) {
        f(p2, p1);
      }
      if (p1 << p2) {
        f(p2, p1);
      }
      if ([].doesSomething(p2)) {
        f(p2, p1);
      }
      if (p1.doesSomething(p2, p3)) {
        f(p2, p1);
      }
      if (doesSomething(p1, p2)) {
        f(p2, p1);
      }
      `,
      errors: 5,
    },
  ],
});

const typeScriptRuleTester = new TypeScriptRuleTester();
typeScriptRuleTester.run('Parameters should be passed in the correct order', rule, {
  valid: [
    {
      code: `
        const a = 1, b = 2, c = 3, d = 4, x = "", y = 5;
        
        export function sameType(a: number, b: number, c = 3) {}
        sameType(a, b, c);
        
        sameType(a, b, d);
        
        sameType(d, d, d);
        sameType(a, a, a);
        sameType(42, a, c);
        sameType(a, d, b);
        
        function differentTypes(x: string, y: number, z = 42) {}
        
        function okForDifferentTypes(x: number, y: string) {
          differentTypes(y, x);
        }
        
        unknown(a, b);
        
        class A {
            constructor(x: string, y: number, z = 42) {};
            sameType(a: number, b: number, c = 3) {};
            differentTypes(x: string, y: number, z = 42) {}
        }
        
        class B extends A {
            constructor(x: string, y: number, z = 42) {
                super(x, y, z);
            };
            
            constructor(x: string, y: number, z = 42) {
                super("y", x, z);
            };
        }
        
        new A(a, b, c);
        new A(y, x);
        new A().sameType(a, b, c);
        new A().sameType(a, b, d);
        new A().sameType(d, d, d);
        new A().sameType(a, a, a);
        new A().sameType(42, a, c);
        new A().sameType(a, d, b);
        new A().differentTypes(y, x);`,
    },
  ],
  invalid: [
    {
      code: `
        function differentTypes(x: string, y: number, z = 42) {}
        function nokForSameType(z: number, y: number) {
          differentTypes("hello", z, y); // Noncompliant
        }`,
      errors: [
        {
          message: `{"message":"Arguments 'z' and 'y' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","column":32,"line":2,"endColumn":60,"endLine":2}]}`,
          line: 4,
          endLine: 4,
          column: 26,
          endColumn: 39,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        interface A {
          prop1: number
        }
        function objectType(a1: A, a2: A) {
          ((a1: A, a2: A) => {})
                                (a2, a1); // Noncompliant
        }`,
      errors: [
        {
          message: `{"message":"Arguments 'a2' and 'a1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","column":12,"line":6,"endColumn":24,"endLine":6}]}`,
          line: 7,
          endLine: 7,
          column: 34,
          endColumn: 40,
        },
      ],
      options: ['sonar-runtime'],
    },
    invalid(`
        const from = 1, length = 2;
        const standardMethod = "str".substr(length, from); // Noncompliant
        `),
    invalid(`
        export function sameType(a: Number, b: number, c = 3) {}
        const a = 1, c = 3, d = 4;
        const b: Number = 2;
        
        sameType(b, a, d); // Noncompliant
        sameType(b, a, c); // Noncompliant
        sameType(c, 2, a); // Noncompliant
        sameType(b, a); // Noncompliant
        sameType(42, c, b); // Noncompliant
        `),
    invalid(`
      /**
       * @param a number
       * @param b string
       */
      function withJsDoc(a, b){}
      withJsDoc(b, a); // Noncompliant
      `),
    invalid(`
        class A {
            constructor(x: string, y: number, z = 42) {};
            sameType(a: number, b: number, c = 3) {};
            differentTypes(x: string, y: number, z = 42) {}
        }
        
          class B extends A {
              constructor(x: string, y: number, z = 42) {
                  super(x, z, y); // Noncompliant
              };
          }
        
        new A(a, z, y); // Noncompliant
        new B("", z, y); // Noncompliant
        new A().sameType(b, a, d); // Noncompliant
        new A().sameType(b, a, c); // Noncompliant
        new A().sameType(c, 2, a); // Noncompliant
        new A().sameType(b, a); // Noncompliant
        new A().sameType(42, c, b) // Noncompliant
        new A().differentTypes("hello", z, y); // Noncompliant
        `),
  ],
});

function invalid(code: string) {
  const errors: NodeRuleTester.TestCaseError[] = [];
  const lines = code.split('\n');
  for (let i = 1; i <= lines.length; i++) {
    const line = lines[i - 1];
    if (line.includes('// Noncompliant')) {
      errors.push({
        line: i,
        endLine: i,
      });
    }
  }
  return {
    code: code,
    errors,
    options: ['sonar-runtime'],
  };
}
