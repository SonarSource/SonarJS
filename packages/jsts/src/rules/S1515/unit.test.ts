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
import { rule } from './/index.ts';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run(`Functions should not be defined inside loops`, rule, {
  valid: [
    {
      code: `
      for (var i = 0; i < 10; i++) {
        funs[i] = function(i) {  // OK, no variable from outer scope is used
          return i;
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
      for (var i = 0; i < 10; i++) {
        funs[i] = function() {  // OK, no variable from outer scope is used
          var x = 42;
          var nested = function() {
            return x;
          }
          return nested;
        }
      }

      var x = 42;
      for (var i = 0; i < 10; i++) {
        funs[i] = function() {  // OK, x is at global scope
          var nested = function() {
            return x;
          }
          return nested;
        }
      }
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
      }`,
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

          $.each(a, function() {              // OK
            return i;
          });

          
          a.b.each(a, () => {              // OK
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
      }`,
    },
    {
      code: `
      var timeout = 5000;
      while (true) {
        new Promise((resolve) => setTimeout(resolve, timeout))
      }
      
      for (var i = 0;; i++) {
        funs[i] = function() {              // Noncompliant
          return i;
        };
      }
      `,
    },
    {
      code: `
      const object = {a: 1, b: 2, c: 3};
      for (const property in object) {
        funs[i] = function() {              // OK
              return property;
        };
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

          for (let j = 0; j < 13; j++) {
            var y = i;
            funs[i] = function() {              // Noncompliant
              return y;
            };
          }

          var x;
          while (x = foo()) {
            funs[i] = function() {              // Noncompliant
              return x;
            };
          }

          do {
            funs[i] = function() {              // Noncompliant
              return x;
            };
          } while (x = foo())


          const array1 = ['a', 'b', 'c'];
          for (var element of array1) {
            funs[i] = function() {              // Noncompliant
              return element;
            };
          }
          `,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure this function is not called after the loop completes.`,
            secondaryLocations: [
              {
                column: 10,
                line: 4,
                endColumn: 13,
                endLine: 4,
              },
            ],
          }),
          line: 5,
          endLine: 5,
          column: 23,
          endColumn: 31,
        },
        {
          message: JSON.stringify({
            message: `Make sure this function is not called after the loop completes.`,
            secondaryLocations: [
              {
                column: 10,
                line: 10,
                endColumn: 13,
                endLine: 10,
              },
            ],
          }),
          line: 12,
        },
        {
          message: JSON.stringify({
            message: `Make sure this function is not called after the loop completes.`,
            secondaryLocations: [
              {
                column: 10,
                line: 18,
                endColumn: 15,
                endLine: 18,
              },
            ],
          }),
          line: 19,
        },
        {
          message: JSON.stringify({
            message: `Make sure this function is not called after the loop completes.`,
            secondaryLocations: [
              {
                column: 12,
                line: 28,
                endColumn: 17,
                endLine: 28,
              },
            ],
          }),
          line: 25,
        },
        {
          message: JSON.stringify({
            message: `Make sure this function is not called after the loop completes.`,
            secondaryLocations: [
              {
                column: 10,
                line: 32,
                endColumn: 13,
                endLine: 32,
              },
            ],
          }),
          line: 33,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
          var funs = [];

          for (var i = 0; i < 13; i++) {
            funs[i] = () => {              // Noncompliant
              return i;
            };
          }
      `,
      errors: [
        {
          line: 5,
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
      for (var i = 0; i < 10; i++) {
        var x = 42;
        funs[i] = function() {  // Noncompliant, x is in the loop scope
          var nested = function() { // Noncompliant, also reported
            return x;
          }
          return nested;
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

              replace("a", function() {         // Noncompliant
                return i;
              });
            }
          }
          `,
      errors: 2,
    },
    {
      code: `
      while (true) {
        var timeout = 5000;
        new Promise((resolve) => setTimeout(resolve, timeout)) // Noncompliant
      }`,
      errors: 1,
    },
    {
      code: `   
      for (var i = 0; i < 10; i++) {
        funs[i] = (function() {             
          return function() {               // Noncompliant
            return i;
          };
        }(i));
      }
      
      for (var i = 0; i < 10; i++) {
          funs[i] = (function * () {       
              return function() {           // Noncompliant
                  return i;
              };
          }(i));
      }`,
      errors: [
        {
          line: 4,
        },
        {
          line: 12,
        },
      ],
    },
  ],
});
