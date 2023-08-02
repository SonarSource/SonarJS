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
import { BabelRuleTester } from '../../../tools';
import { rule } from '@sonar/jsts/rules/declarations-in-global-scope';

const tsParserPath = require.resolve('@typescript-eslint/parser');
const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  parser: tsParserPath,
});
const ruleTesterwithBrowser = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  env: { es6: true, browser: true },
});
const ruleTesterCustomGlobals = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  globals: { angular: true, other: true },
});
const ruleTesterScript = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'script' },
});

const babelRuleTester = BabelRuleTester();
ruleTester.run('Variables and functions should not be declared in the global scope', rule, {
  valid: [
    {
      code: `
      x1 = 1;
      const x3 = 1;
      let x4 = 1;
            `,
    },
    {
      code: `
      obj.func3('f3', function() {
        obj.func4(func10());                 // OK
      });
            `,
    },
    {
      code: `
      window.func20 = function(days = 1) {}; // OK    
            `,
    },
    {
      code: `
      (function baz(arg) {})(1);             // OK
            `,
    },
    {
      code: `
      [a1, a2] = [1, 2];                     // FN
      [b1, b2, ...rest] = [1, 2, 3, 4];      // FN
      ({c1, c2} = {c1:1, c2:2});             // FN
            `,
    },
    {
      code: `
      window.bar2 = function() {};           // OK
      this.bar3 = function() {};             // OK
      self.bar4 = function() {};             // OK
            `,
    },
    {
      code: `
      function isNaN() {};                   // OK (isNaN is a builtin)
      window.isNaN = function() {};          // OK
      isNaN = function() {};
            `,
    },
    {
      code: `
      class MyClass {                        // OK
        constructor(x) {                     // OK
          this.x = x
        }
        meth() {}                            // OK
      }
            `,
    },
    {
      code: `
      if (x) {
        function func10() {}  // FN
      }
            `,
    },
    {
      code: `
      type A = number;
      class A {}

      let a : { <T>(x: T): number; }
            `,
    },
    {
      code: `
      var _ = require('lodash');
      `,
    },
  ],
  invalid: [
    {
      code: `
      var x2 = 1;
            `,
      errors: [
        {
          message:
            'Define this declaration in a local scope or bind explicitly the property to the global object.',
          line: 2,
          endLine: 2,
          column: 11,
          endColumn: 17,
        },
      ],
    },
    {
      code: `
      var x5;
      x5 = 1;
            `,
      errors: 1,
    },
    {
      code: `
      var y1, y2, y3;
            `,
      errors: 3,
    },
    {
      code: `
      var z1, z2 = 1;
            `,
      errors: 2,
    },
    {
      code: `
      if (!X1) var X1 = {};
            `,
      errors: 1,
    },
    {
      code: `
      var {d1, d2} = Ember;                  // Noncompliant x2
      const {e1, e2} = Ember;                // OK

      var foo1 = function() {};              // Noncompliant
      var foo2 = function fooo() {};         // Noncompliant
      var foo3 = (x => Math.sin(x));         // Noncompliant      
            `,
      errors: 5,
    },
    {
      code: `
      function bar1() {};
            `,
      errors: 1,
    },
    {
      code: `
      variableThenFunction = 1;              // FN
      function variableThenFunction(){};     // Noncompliant

      function functionThenVariable(){};     // Noncompliant
      functionThenVariable = 1;              // FN

            `,
      errors: 2,
    },
    {
      code: `
      if (x) {
        var func10 = 14;                 // Noncompliant
      } else {
        var func10 = function() {}             // OK (1 issue per name)
      }
            `,
      errors: [
        {
          message:
            'Define this declaration in a local scope or bind explicitly the property to the global object.',
          line: 3,
          endLine: 3,
          column: 13,
          endColumn: 24,
        },
      ],
    },
    {
      code: `
      export function exportedFunction(){};  // Noncompliant, this rule should not be used with ES2015 modules
            `,
      errors: 1,
    },
    {
      code: `
      function bat1() {                      // Noncompliant
        var x;                               // OK
        [a, b] = [1, 2];                     // OK
        [a, b, ...rest] = [1, 2, 3, 4];      // OK
        ({a, b} = {a:1, b:2});               // OK
        
        function bat2() {};                  // OK
      }
            `,
      errors: 1,
    },
    {
      code: `
      var HTMLElement; // FP (no globals configuration: see issue-2358)
            `,
      errors: 1,
    },
  ],
});

ruleTesterwithBrowser.run('No issue for variables in globals configuration', rule, {
  valid: [
    {
      code: `
      var HTMLElement;      
            `,
    },
  ],
  invalid: [
    {
      code: `
      var exports;  // commonjs global (not in configuration)
            `,
      errors: 1,
    },
  ],
});

ruleTesterScript.run('FNs with script source type', rule, {
  valid: [
    {
      code: `
      var x = 1; // FN
            `,
    },
  ],
  invalid: [],
});

ruleTesterCustomGlobals.run('No issue for custom globals', rule, {
  valid: [
    {
      code: `
      var angular = 1;
      var other = 2;
            `,
    },
  ],
  invalid: [],
});

babelRuleTester.run('Should not fail with Babel parser', rule, {
  valid: [
    {
      code: `
      /* @flow */
      export interface SimpleSet {
        has(key: string | number): boolean;
        add(key: string | number): mixed;
        clear(): void;
      }
            `,
    },
  ],
  invalid: [],
});
