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
import { rule } from '../../src/rules/sonar-block-scoped-var';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Variables should be used in the blocks where they are declared', rule, {
  valid: [
    {
      code: `
        function fun() {

          if (cond) {
            let a = 42;
          }
          if (cond) {
            let a = 0;
          }

          var b = 42;
          if (cond) {
            foo(b);
          } else {
            bar(b);
          }

          var build;
          var f;
      
          try {
            build = 1;
          } catch (e) {
            f = build;
          }
        }
        `,
    },
  ],
  invalid: [
    {
      code: `
        function fun() {
          if (cond) {
            var a = 42;
          }
          if (cond) {
            var a = 0;
          }
        }
        `,
      errors: [
        {
          message: `{"message":"Consider moving declaration of 'a' as it is referenced outside current binding context.","secondaryLocations":[{"message":"Outside reference.","column":16,"line":7,"endColumn":17,"endLine":7}]}`,
          line: 4,
          endLine: 4,
          column: 17,
          endColumn: 18,
        },
      ],
    },
    {
      code: `
      function fun() {
        if (cond) {
          var a = 42; // nok
        }
        console.log(a);
      }
        `,
      errors: [
        {
          message: `{"message":"Consider moving declaration of 'a' as it is referenced outside current binding context.","secondaryLocations":[{"message":"Outside reference.","column":20,"line":6,"endColumn":21,"endLine":6}]}`,
          line: 4,
        },
      ],
    },
    {
      code: `
        function fun() {
          for (var i = 0; ;) {}
          foo(i);
          return i;
        }
        `,
      errors: [
        {
          message: `{"message":"Consider moving declaration of 'i' as it is referenced outside current binding context.","secondaryLocations":[{"message":"Outside reference.","column":14,"line":4,"endColumn":15,"endLine":4},{"message":"Outside reference.","column":17,"line":5,"endColumn":18,"endLine":5}]}`,
          line: 3,
          endLine: 3,
          column: 20,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
        function fun() {
          for (var i in smth) {}
          foo(i);

          for (var j of smth) {}
          foo(j);

          switch(42) {
            case 0:
              var k = 42;
          }
          foo(k);
        }
        `,
      errors: [
        {
          line: 3,
        },
        {
          line: 6,
        },
        {
          line: 11,
        },
      ],
    },
  ],
});
