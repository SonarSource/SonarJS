/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { rule } from '../../src/rules/destructuring-assignment-syntax';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Destructuring syntax should be used for assignments', rule, {
  valid: [
    {
      code: `function foo(obj1, obj2, arr1, arr2) {
        var e = obj1.e;     // OK, different objects
        var d = obj2.d;
        foo();

        var ee = obj1.e;     // OK, different names
        var dd = obj1.d;

        foo();

        var f = obj1.f;     // OK, different declarations
        const g = obj1.g;

        foo();

        var {a1, b2} = obj1;

        foo();

        var k = obj1.k;   // OK, just one

        foo();

        let one4 = arr1[0], two4 = arr1[100];  // OK

        foo();

        let one5 = arr1[x], two5 = arr1['prop'];  // OK

        foo();

        let one2 = arr1[0], two2 = arr2[1];  // OK

        foo();

        var [one3, two3] = arr1;

        foo();

        var t, r;
        t = obj1.t;  // OK, destructuring can appear in declaration only
        r = obj1.r;
    }`,
    },
  ],
  invalid: [
    {
      code: `function foo(obj1, obj2) {
            var c = obj1.c;     // Noncompliant
            var d = obj1.d;     // Secondary location

            foo();

            var a = obj2.a, b = obj2.b;   // Noncompliant, secondary at the same line

            foo();

            var n = obj1.n;     // Noncompliant
            var m = obj1.m, l = obj1.l; // Secondary location x2

            foo();

            var x = obj1.prop.x, y = obj1.prop.y; // Noncompliant
          }`,
      errors: [
        {
          message: `{\"message\":\"Use destructuring syntax for these assignments from \\\"obj1\\\".\",\"secondaryLocations\":[{\"message\":\"Replace this assignment.\",\"column\":16,\"line\":3,\"endColumn\":26,\"endLine\":3}]}`,
          line: 2,
          endLine: 2,
          column: 17,
          endColumn: 27,
        },
        {
          message: `{\"message\":\"Use destructuring syntax for these assignments from \\\"obj2\\\".\",\"secondaryLocations\":[{\"message\":\"Replace this assignment.\",\"column\":28,\"line\":7,\"endColumn\":38,\"endLine\":7}]}`,
          line: 7,
          endLine: 7,
          column: 17,
          endColumn: 27,
        },
        {
          message: `{\"message\":\"Use destructuring syntax for these assignments from \\\"obj1\\\".\",\"secondaryLocations\":[{\"message\":\"Replace this assignment.\",\"column\":16,\"line\":12,\"endColumn\":26,\"endLine\":12},{\"message\":\"Replace this assignment.\",\"column\":28,\"line\":12,\"endColumn\":38,\"endLine\":12}]}`,
          line: 11,
          endLine: 11,
          column: 17,
          endColumn: 27,
        },
        {
          message: `{\"message\":\"Use destructuring syntax for these assignments from \\\"obj1.prop\\\".\",\"secondaryLocations\":[{\"message\":\"Replace this assignment.\",\"column\":33,\"line\":16,\"endColumn\":48,\"endLine\":16}]}`,
          line: 16,
        },
      ],
    },
    {
      code: `function foo(arr1, arr2) {
                const one1 = arr1[0];   // Noncompliant
                const two1 = arr1[1];
                const three1 = arr1[2];

                foo();

                let one = arr1[0], two = arr1[1];  // Noncompliant
            }`,
      errors: [
        {
          message: `{\"message\":\"Use destructuring syntax for these assignments from \\\"arr1\\\".\",\"secondaryLocations\":[{\"message\":\"Replace this assignment.\",\"column\":22,\"line\":3,\"endColumn\":36,\"endLine\":3},{\"message\":\"Replace this assignment.\",\"column\":22,\"line\":4,\"endColumn\":38,\"endLine\":4}]}`,
          line: 2,
        },
        {
          line: 8,
        },
      ],
    },
    {
      code: `// switch cases
                switch (a) {
                case 1:
                    var x = obj.x;  // Noncompliant
                    var y = obj.y;
                    break;
                default:
                    var c = obj.c, d = obj.d; // Noncompliant
                }`,
      errors: [
        {
          line: 4,
        },
        {
          line: 8,
        },
      ],
    },
    {
      code: `// global scope
            var obj = foo();
            var a = obj.a, b = obj.b; // Noncompliant`,
      errors: [
        {
          line: 3,
        },
      ],
    },
  ],
});
