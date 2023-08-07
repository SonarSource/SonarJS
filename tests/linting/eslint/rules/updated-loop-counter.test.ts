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
import { rule } from '@sonar/jsts/rules/updated-loop-counter';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Loop counter should not be updated inside loop', rule, {
  valid: [
    {
      code: `
      let fl = false;

      for (; i < m && !fl; i++) {
        fl = true;   // Compliant
        m = 10;      // Compliant
      }
      `,
    },
  ],
  invalid: [
    {
      code: `  
        for (var i = 0, j = 2; i < 5; i++) {
          i = 5;      // Noncompliant 
          j = 5;      // compliant, not in update section
        }
      `,
      errors: [
        {
          line: 3,
          column: 11,
          endColumn: 12,
          message: `{"message":"Remove this assignment of \\"i\\".","secondaryLocations":[{"message":"Counter variable update","column":38,"line":2,"endColumn":39,"endLine":2}]}`,
        },
      ],
    },
    {
      code: `
        for (var i; i < 5; i++) {
          i = 5;     // Noncompliant
        }
      `,
      errors: [{ line: 3 }],
    },
    {
      code: `
        var i;
        i = 0;
        for (; i < 5; i++) {
          i = 5;     // Noncompliant
        }
      `,
      errors: [{ line: 5 }],
    },
    {
      code: `
        var k, t, l, m;
        for (k = 0, t = 6, l = 2; k < 5; k++) {
          k = 5;      // Noncompliant
          l = 5;      // Compliant
        }

        for (m = 0; m < 5; m++) {
          m = 5;      // Noncompliant
        }
      `,
      errors: [{ line: 4 }, { line: 9 }],
    },
    {
      code: `
        var x = 5;

        for (x += 2; x < 5; x++) {
          x = 5;      // Noncompliant
        }
      `,
      errors: [
        {
          line: 5,
          message: `{"message":"Remove this assignment of \\"x\\".","secondaryLocations":[{"message":"Counter variable update","column":28,"line":4,"endColumn":29,"endLine":4}]}`,
        },
      ],
    },
    {
      code: `
      let i = 0, j = 0, k = 0;
      for (;; i++, --j) {
        i++;  // Noncompliant
        j++;  // Noncompliant
      }

      for (;; ++i, j--, k++) {
        i = 5; // Noncompliant
        j = 5; // Noncompliant
        k = 5; // Noncompliant
      }

      for (;; i+=2, j-=3, k*=5) {
        i++;  // Noncompliant
        j++;  // Noncompliant
        k++;  // Noncompliant
      }
      `,
      errors: 8,
    },
    {
      code: `
      for (var x = foo(); ; x=next()) {
        x = next(); // Noncompliant
      }
      `,
      errors: [{ line: 3 }],
    },
    {
      code: `
      function foo_of_loop(obj) {
        for (var prop1 of obj) {
          prop1 = 1      // Noncompliant
        }

        for (let prop2 of obj) {
          prop2 = 1      // Noncompliant
        }

        let prop3;
        for (prop3 of obj) {
          prop3 = 1      // Noncompliant
        }

      }
      `,
      errors: 3,
    },
    {
      code: `
      function foo_in_loop(obj) {
        for (var value1 in obj) {
          value1 = 1      // Noncompliant
        }

        for (const value2 in obj) {
          value2 = 1      // Noncompliant
        }

        let value3;
        for (value3 in obj) {
          value3 = 1      // Noncompliant
        }
      }
      `,
      errors: 3,
    },
    {
      code: `
      function description_sample_code() {
        var names = [ "Jack", "Jim", "", "John" ];
        for (var i = 0; i < names.length; i++) {
          if (!names[i]) {
            i = names.length;       // Noncompliant
          } else {
            console.log(names[i]);
          }
        }

        i = 42;  // Compliant, out of loop

        for (var name of names) {
          if (!name) {
            break;
          } else {
            console.log(name);
          }
        }

      }
      `,
      errors: [{ line: 6 }],
    },
    {
      code: `
      function same_counter_in_nested_loop(obj1, obj2) {
        for (var i in obj1) {
          for (i of obj2) {      // Noncompliant
            foo(i);
          }
        }
      }
      `,
      errors: [{ line: 4 }],
    },
    {
      code: `
      function assigned_several_times(obj) {
        for (var value in obj) {
          value = 1;      // Noncompliant
          value = 1;      // Noncompliant
        }
      }

      `,
      errors: 2,
    },
    {
      code: `
      function used_several_times(obj) {
        for (var i = 0; i < 10; i++) {
          for (var j = 0; j < 10; j++, i++) {  // Noncompliant
            i = 10;    // Noncompliant x2
          }
        }
      }
      `,
      errors: [
        {
          line: 4,
          column: 40,
          message: `{"message":"Remove this assignment of \\"i\\".","secondaryLocations":[{"message":"Counter variable update","column":32,"line":3,"endColumn":33,"endLine":3}]}`,
        },
        {
          line: 5,
          column: 13,
          message: `{"message":"Remove this assignment of \\"i\\".","secondaryLocations":[{"message":"Counter variable update","column":32,"line":3,"endColumn":33,"endLine":3}]}`,
        },
        {
          line: 5,
          column: 13,
          message: `{"message":"Remove this assignment of \\"i\\".","secondaryLocations":[{"message":"Counter variable update","column":39,"line":4,"endColumn":40,"endLine":4}]}`,
        },
      ],
    },
  ],
});
