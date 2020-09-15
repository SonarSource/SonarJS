/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { rule } from 'rules/no-global-declaration';
import { RuleTester } from 'eslint';

const tests = {
  valid: [
    {
      code: `const x = 1;`,
    },
    {
      code: `let x = 1;`,
    },
    {
      code: `
        let newWindow;
        window = newWindow;`,
    },
    {
      code: `
        let x3;
        const {x1, x2} = x3;`,
    },
    {
      code: `function isNaN() {};`,
    },
    {
      code: `isNaN = function() {};`,
    },
    {
      code: `(function foo(arg) {})(1);`,
    },
    {
      code: `
        class C {
          constructor(x) {
            this.x = x
          }
          m() {}
        }`,
    },
  ],
  invalid: [
    {
      code: `x = 1;`,
      errors: [
        {
          message: `Define this declaration in a local scope or bind explicitly the property to the global object.`,
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 2,
        },
      ],
    },
    {
      code: `var x = 1;`,
      errors: 1,
    },
    {
      code: `
        var x;
        x = 1;`,
      errors: 1,
    },
    {
      code: `var x1, x2, x3; `,
      errors: 3,
    },
    {
      code: `var x1, x2 = 1;`,
      errors: 2,
    },
    {
      code: `window = newWindow;`,
      errors: 1,
    },
    {
      code: `if (!x) var x = {};`,
      errors: 1,
    },
    {
      code: `[x1, x2] = [1, 2];`,
      errors: 2,
    },
    {
      code: `[x1, x2, ...rest] = [1, 2, 3, 4];`,
      errors: 3,
    },
    {
      code: `({a1, a2} = {a1:1, a2:2});`,
      errors: 2,
    },
    {
      code: `var {x1, x2} = x3;`,
      errors: 3,
    },
    {
      code: `const {x1, x2} = x3;`,
      errors: 1,
    },
    {
      code: `var foo = function() {}; `,
      errors: 1,
    },
    {
      code: `var foo = function bar() {};`,
      errors: 1,
    },
    {
      code: `var foo = (x => Math.sin(x));`,
      errors: 1,
    },
    {
      code: `function foo() {}`,
      errors: 1,
    },
    {
      code: `
        variableThenFunction = 1;
        function variableThenFunction(){};`,
      errors: 1,
    },
    {
      code: `
        function functionThenVariable(){};
        functionThenVariable = 1;`,
      errors: 1,
    },
    {
      code: `
        function foo() {
          var x;
          [a, b] = [1, 2];
          [c, d, ...rest] = [1, 2, 3, 4];
          ({e, f} = {e:1, f:2});
          function bar() {};
        }`,
      errors: 1,
    },
  ],
};

const ruleScriptTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'script' },
  env: { es6: true },
});
ruleScriptTester.run(
  'Variables and functions should not be declared in the global scope [script]',
  rule,
  tests,
);

const ruleModuleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  env: { es6: true },
});
ruleModuleTester.run(
  'Variables and functions should not be declared in the global scope [module]',
  rule,
  tests,
);
