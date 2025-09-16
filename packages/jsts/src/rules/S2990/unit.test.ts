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
import { rule } from './index.js';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2990', () => {
  it('S2990', () => {
    const ruleTesterJS = new DefaultParserRuleTester();
    const ruleTesterTS = new NoTypeCheckingRuleTester();

    const testCases = {
      valid: [
        {
          code: `console.log(this);`,
        },
        {
          code: `
      function foo() {
        x = this.a    // OK
        var func = s => this.foo(s)   // OK
        var func1 = s => {return this.foo(s)} // OK
      }`,
        },
        {
          code: `
      var foo = function(){
        foo(this)
      }`,
        },
        {
          code: `var func = s => this.foo(s)`,
        },
        {
          code: `
      class C {
        constructor() {
          this.a = [];   // ok
        }
      
        method1(){
          this.a = [];  // ok
        }
      
        get getMethod() {
          return this.bones.length;  // ok
        }
      
        set setMethod(foo) {
          this.id = foo;  // ok
        }
      }`,
        },
      ],
      invalid: [
        {
          code: `console.log(this.prop);`,
          errors: [
            {
              message: `Remove the use of "this".`,
              line: 1,
              endLine: 1,
              column: 13,
              endColumn: 17,
              suggestions: [
                {
                  output: 'console.log(prop);',
                  desc: 'Remove "this"',
                },
                {
                  output: 'console.log(window.prop);',
                  desc: 'Replace "this" with "window" object',
                },
              ],
            },
          ],
        },
        {
          code: `this.a = function(){}`,
          errors: 1,
        },
        {
          code: `var x = this.a()`,
          errors: 1,
        },
        {
          code: `
      if (!this.JSON) {
        this.JSON = {}  
      }`,
          errors: 2,
        },
        {
          code: `this.foo = bar;`,
          errors: [
            {
              message: `Remove the use of "this".`,
              suggestions: [
                {
                  desc: 'Remove "this"',
                  output: 'foo = bar;',
                },
                {
                  desc: 'Replace "this" with "window" object',
                  output: 'window.foo = bar;',
                },
              ],
            },
          ],
        },
        {
          code: `this.foo.bar.baz = qux;`,
          errors: [
            {
              message: `Remove the use of "this".`,
              suggestions: [
                {
                  desc: 'Remove "this"',
                  output: 'foo.bar.baz = qux;',
                },
                {
                  desc: 'Replace "this" with "window" object',
                  output: 'window.foo.bar.baz = qux;',
                },
              ],
            },
          ],
        },
        {
          code: `this['f' + 'o' + 'o'] = bar;`,
          errors: [
            {
              message: `Remove the use of "this".`,
              suggestions: [],
            },
          ],
        },
      ],
    };

    ruleTesterJS.run('The global "this" object should not be used JavaScript', rule, testCases);
    testCases.valid.push(
      {
        code: `
  class C {
    prop = this.C
  }`,
      },
      {
        code: `
  const c = class C {
    prop = this.C
  }`,
      },
    );
    ruleTesterTS.run('The global "this" object should not be used TypeScript', rule, testCases);
  });
});
