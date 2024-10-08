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
import { rule } from './index.js';
import Module from 'node:module';
const require = Module.createRequire(import.meta.url);

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run(`Function declarations should not be made within blocks`, rule, {
  valid: [
    {
      code: `
        if (x) {
          let foo;
          foo = function() {}      // OK
        }
      
        if (x) {
          // empty block
        }
      
        p => {
          var foo = function() {}; // OK
          function foo2() { } // OK
        };

        function doSomething() {
            function doAnotherThing() { } // OK
        } 
        
        class A {
            f() { // OK
                function nested() { } // OK
            }
        }`,
    },
  ],
  invalid: [
    {
      code: `
      if (x) {
        function foo() {
        }        
      }`,
      errors: [
        {
          message: `Do not use function declarations within blocks.`,
          line: 3,
          column: 18,
          endLine: 3,
          endColumn: 21,
        },
      ],
    },
  ],
});

const ruleTesterTS = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTesterTS.run(`Function declarations should not be made within blocks`, rule, {
  valid: [
    {
      code: `
        interface I {
            isOk(): boolean;
        }`,
    },
    {
      code: `
        namespace space {
            function f() {}
            export function f2() {}
        }`,
    },
  ],
  invalid: [
    {
      code: `
          namespace space {
            if (x) {
              function foo() {}        
            }
          }`,
      errors: 1,
    },
  ],
});
