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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/function-inside-loop";

ruleTester.run(`Functions should not be defined inside loops`, rule, {
  valid: [
    {
      code: `
      for (var i = 0; i < 10; i++) {
        funs[i] = function(i) {  // OK, no variable from outer scope is used
          return i;
        }
      }

      for (var i = 0; i < 10; i++) {
        funs[i] = function() {  // OK, no variable from outer scope is used
          var x = 42;
          var nested = function() {
            return x;
          }
      
          return nested;
        }
      }

      for (var i = 0; i < 13; i++) {}
      funs[i] = function() { //OK, not in loop
        return i;
      };
      `,
    },
    {
      code: `
      for (let i = 0; i < 13; i++) {
        funs[i] = function() {              // Ok, 'let' declaration
          return i;
        };
      }
      `,
    },
    {
      code: `
      function value_written_once() {

        var constValue = 42;
        for (let i = 0; i < 13; i++) {
          funs[i] = function() {              // Ok, unchanged value is referenced
            return constValue;
          };
        }
      }
      `,
    },
    {
      code: `
      class A {
      
        foo() {}
      
        bar() {
          while(true) {
             var x = () => {
                this.foo();   // ok to use method
             };
          }
        }
      }
      `,
    },
    {
      code: `
      function some_callbacks_ok() {
        for (var i = 0; i < 13; i++) {
      
          str.replace("a", function() {         // OK
            return i;
          });
      
          arr.forEach(function() {              // OK
            return i;
          });
      
          arr.filter(function() {              // OK
            return i;
          });
      
          arr.map(function() {              // OK
            return i;
          });
      
          arr.find(function() {              // OK
            return i;
          });
      
          arr.findIndex(function() {              // OK
            return i;
          });
      
          arr.every(function() {              // OK
            return i;
          });
      
          arr.some(function() {              // OK
            return i;
          });
      
          arr.reduce(function() {              // OK
            return i;
          });
      
          arr.reduceRight(function() {              // OK
            return i;
          });
      
          arr.sort(function() {              // OK
            return i;
          });
        }
      }
      `,
    },
    {
      code: `
      function iife_ok() {
        for (var i = 0; i < 13; i++) {
      
          (function() {         // OK
            return i;
          })();

          (function() {         // OK
            return i;
          }).call(this);
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
          var funs = [];

          for (var i = 0; i < 13; i++) {
            funs[i] = function() {              // Noncompliant
              return i;
            };
          }

          for (var i = 0; i < 13; i++) {
            funs[i] = () => {              // Noncompliant
              return i;
            };
          }
          
          for (var i = 0; i < 10; i++) {
            funs[i] = (function() {            // Noncompliant
              return function() {               // OK
                return i;
              };
            }(i));
          }
          
          for (var i = 0; i < 10; i++) {
              funs[i] = (function * () {       // Noncompliant
                  return function() {           // OK
                      return i;
                  };
              }(i));
          }
      `,
      errors: [
        {
          message: `Define this function outside of a loop.`,
          line: 5,
          endLine: 5,
          column: 23,
          endColumn: 31,
        },
        {
          message: `Define this function outside of a loop.`,
          line: 11,
          endLine: 11,
          column: 26,
          endColumn: 28,
        },
      ],
    },
    {
      code: `
      function value_written_once() {

        for (let i = 0; i < 13; i++) {
          var constValue = i + 42;
          funs[i] = function() {              // Noncompliant, written inside loop
            return constValue;
          };
        }
      
        var notConst = 42;
        for (let i = 0; i < 13; i++) {
          notConst++;
          funs[i] = function() {              // Noncompliant, written inside loop
            return notConst;
          };
        }
      
      }
      `,
      errors: 2,
    },
    {
      code: `
    function some_callbacks_not_ok() {
      for (var i = 0; i < 13; i++) {
        arr.unknown(function() {              // Noncompliant
          return i;
        });
      }
    }
    `,
      errors: 1,
    },
  ],
});

const ruleTesterTS = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: "module" },
  parser: require.resolve("@typescript-eslint/parser"),
});

ruleTesterTS.run("Functions should not be defined inside loops", rule, {
  valid: [
    {
      code: `
      while (true) {
        new Promise((resolve) => setTimeout(resolve, 5000))
        await ping()
      }
      `,
    },
  ],
  invalid: [],
});
