/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

describe('S2137', () => {
  it('S2137', () => {
    ruleTester.run('Special identifiers should not be bound or assigned', rule, {
      valid: [
        {
          code: `eval("");`,
        },
        {
          code: `function foo(a){
                    arguments[0] = a;
                    a = arguments;
                }`,
        },
        {
          code: `var fun = function(){fun(arguments);}
                var f = new Function("arguments", "return 17;");
                var obj = { set p(arg) { } };`,
        },
        {
          code: `function fun() {
                var a = arguments.length == 0; // OK
                var b = arguments.length === 0; // OK
            }

            function fun(a) {  // OK
            }
            
            function fun(yield) {  // OK
            }
            `,
        },
        {
          code: `
        (function( global, undefined ) {
        })(this);
        `,
        },
        { code: 'var hasOwnProperty = Object.prototype.hasOwnProperty' },
        { code: 'const toString = Object.prototype.hasOwnProperty' },
        { code: 'function escape(html, encode) { return html; }' },
        { code: 'function unescape(html) { return html; }' },
        { code: 'const toString = {}.toString()' },
        {
          code: `// @flow
            function f(argWithFunctionType: (user) => void) {}
            `,
        },
      ],
      invalid: [
        {
          code: `eval = 42;
             function fun(){arguments++}`,
          errors: [
            {
              message: `Remove the modification of "eval".`,
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 5,
            },
            {
              message: `Remove the modification of "arguments".`,
              line: 2,
              endLine: 2,
              column: 29,
              endColumn: 38,
            },
          ],
        },
        {
          code: `function x(eval) { }
             var obj = { set p(arguments) { } }; `,
          errors: [
            {
              message: `Do not use "eval" to declare a parameter - use another name.`,
            },
            {
              message: `Do not use "arguments" to declare a parameter - use another name.`,
            },
          ],
        },
        {
          code: `
        let eval;
        function fun(){var arguments;}`,
          errors: [
            {
              message: `Do not use "eval" to declare a variable - use another name.`,
            },
            {
              message: `Do not use "arguments" to declare a variable - use another name.`,
            },
          ],
        },
        {
          code: `
        var y = function eval() { };
        function arguments() { }`,
          errors: [
            {
              message: `Do not use "eval" to declare a function - use another name.`,
            },
            {
              message: `Do not use "arguments" to declare a function - use another name.`,
            },
          ],
        },
        {
          code: `
        NaN = 42;
        Infinity = 42;
        undefined = 42;
        `,
          errors: [
            {
              message: `Remove the modification of "NaN".`,
            },
            {
              message: `Remove the modification of "Infinity".`,
            },
            {
              message: `Remove the modification of "undefined".`,
            },
          ],
        },
        {
          code: `
        function fun() {
            var c = (arguments = 0) == 0;
        }
        ++eval; 
        try { } catch (arguments) { }  // NO
        function fun(...eval) {} // NO
        function fun(arguments, ...a) {}
        var f = function(eval) {}
        const arguments = eval;
        var arrowFunction = (arguments) => {}`,
          errors: 8,
        },
        {
          code: `
        /**
         * Destructuring pattern in declaration
         */
         function fun ({eval}) {
            var {arguments, } = eval;
        }
         
         /**
         * Generator function
         */
         function* fun(eval) {
         }
         
         function foo(){
           let arguments = eval;
         }
        `,
          errors: 4,
        },
        {
          code: `
        function fun (eval = 1) { }
        function foo([arguments, eval]) { }
        `,
          errors: 3,
        },
        {
          code: `
        function foo() { var NaN; } 
        function foo() { var Infinity; }
        function foo() { var undefined; }
        
        function foo(undefined) { var x = undefined; }`,
          errors: 2,
        },
        {
          code: `
        function foo() { var NaN; } 
        function foo() { var Infinity; }
        function foo() { var undefined = 42; }
        
        function foo(undefined = 42) { var x = undefined; }`,
          errors: 4,
        },
        {
          code: `
      const {obj, ...eval} = foo();
    `,
          errors: 1,
        },
        {
          code: "String = 'hello world';",
          errors: 1,
        },
        {
          code: 'String++;',
          errors: 1,
        },
        {
          code: '({Object = 0, String = 0} = {});',
          errors: 2,
        },
        {
          code: 'Array = 1;',
          errors: 1,
        },
        {
          code: 'Number = 1;',
          errors: 1,
        },
        {
          code: `
        (function( global, undefined = 42) {
        })(this);
        `,
          errors: [
            {
              message: `Do not use "undefined" to declare a parameter - use another name.`,
              line: 2,
              endLine: 2,
              column: 28,
              endColumn: 37,
            },
          ],
        },
      ],
    });
  });
});
