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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';

const ruleTester = new JavaScriptRuleTester();

function invalidTest(code: string) {
  const line = code.split('\n').findIndex(str => str.includes('// Noncompliant')) + 1;
  return {
    code,
    errors: [
      {
        messageId: 'unusedCollection',
        line,
        endLine: line,
      },
    ],
  };
}

ruleTester.run('Collection contents should be used', rule, {
  valid: [
    {
      code: `
      function okUnused() {
          let x = [1, 2];
      }
      function ok1() {
          let x = [];
          return x;
      }

      function ok2() {
          let x = [1, 2];
          console.log(x[0]);
      }
      function ok3() {
        let x = [1, 2], y: number;
        y = x[1];
      }

      function ok4() {
          let x = [1, 2];
          x.forEach(element => console.log(element));
      }

      function ok5() {
          let x = [1, 2];
          for (let i in x) {
              console.log(i);
          }
      }

      function ok6() {
          let x = [1, 2];
          x = x.concat(3, 4);
      }

      function ok7() {
          let x = [1, 2];
          x.concat(3, 4);
      }

      function ok8() {
          let x = [1, 2];
          function foo() {return x;}
          let y = foo();
          y.push(1);
          return x;
      }`,
    },
    {
      code: `
      function parameterUpdated(p) {
          p.push(1);
      }

      function propertyUpdated() {
          let a = {x};
          a.x.push(1);
          return a;
      }

      export const EXPORTED_ARRAY = [];

      function ok9() {
          let x = [1, 2];
          x = EXPORTED_ARRAY;
          x.push(1);
      }

      function ok10() {
          let {x} = {x: EXPORTED_ARRAY};
          x.push(1);
      }

      function ok11() {
          const foo = [ [1, 2],  [3, 4]];
          for (const bar of foo) {
              bar.push(42);
          }
          return foo;
      }

      function ok12() {
        const foo = [ [1, 2],  [3, 4]];
        let bar: number[];
        for (bar of foo) {
            bar.push(42);
        }
        return foo;
      }
      export class Foo {
        myArray: string[] = [];
        fn() {
          this.myArray.push(""); // OK for properties
        }
      }`,
    },
    {
      code: `
      function nok() {
        let array = new Uint16Array(2); // FN
        array[1] = 43;
      }

      function ok(buffer) {
          let bufferView = new Uint16Array(buffer);
          bufferView[1] = 43;
      }`,
    },
    {
      code: `var subgoups = [], sub; //both are compliant
        subgroups.push(sub = []); //sub is used here
        sub.push(node);
        return subgroups;
      `,
    },
    {
      code: `
        let array = [];
        for (let i in array) {  // used here
          console.log(i);
        }`,
    },
    {
      code: `
        export const array = [];

        array.push(1);
      `,
    },
    {
      code: `export const collection = new Map()`,
    },
    {
      code: `
        const a = {foo: false};
        const xs = [a];
        xs[0].foo = true;
      `,
    },
  ],
  invalid: [
    {
      code: `
      function nok() {
        let x = [1, 2];
        x.push(1);
        x = [];
        x[1] = 42;
        x[2] += 42;
        x.pop();
        x.reverse();
          }`,
      errors: [
        {
          messageId: 'unusedCollection',
          line: 3,
          column: 13,
          endLine: 3,
          endColumn: 14,
        },
      ],
    },
    invalidTest(`function nok2() {
          let arrayConstructor = new Array(); // Noncompliant
          arrayConstructor[1] = 42;
      }
      `),
    invalidTest(`function nok3() {
          let arrayWithoutNew = Array(); // Noncompliant
          arrayWithoutNew[1] = 42;
      }
      `),
    invalidTest(`function nok4() {
          let x: number[]; // Noncompliant
          x = new Array();
          x[1] = 42;
      }`),
    invalidTest(`function nok41() {
        let x; // Noncompliant
        x = [];
        x.push("a");
    }`),
    invalidTest(`function nok5() {
          let myMap = new Map(); // Noncompliant
          myMap.set(1, "foo1");
          myMap.clear();
      }`),
    invalidTest(`function nok6() {
          let mySet = new Set(); // Noncompliant
          mySet.add("foo1");
          mySet.delete("foo1");
          mySet = new Set();
      }`),
    invalidTest(`function nok7() {
          let mySet = new WeakSet(); // Noncompliant
          mySet.add({});
          mySet.delete({});
      }`),
    invalidTest(`function nestedFunctionInVarDeclaration() {
        var x = [], // Noncompliant
            f = function() {
              x = [];
            }
        x.push();
      }`),
  ],
});
