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
import { rule } from 'linting/eslint/rules/no-new-symbol';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('"Symbol" should not be used as a constructor', rule, {
  valid: [
    {
      code: `var sym = Symbol("foo");`,
    },
    {
      code: `
        var Symbol = function () {};
        var s = new Symbol();`,
    },
    {
      code: `
        function foo(Symbol) {
          var bar = new Symbol("bar");
        }`,
    },
    {
      code: `
        (function(Symbol) {
          function bar() {
            var baz = new Symbol("baz");
          }
        })(10);`,
    },
    {
      code: `
        class A {
          bar(Symbol) {
            var baz = new Symbol("baz");
          }
        }`,
    },
    {
      code: `
        function foo2(Symbol) {
          (s => new Symbol("baz"));
        }`,
    },
    {
      code: `
        var SymbolAlias = Symbol;
        var sym = new SymbolAlias("foo"); // FN`,
    },
    {
      code: `
        class Symbol {
        }
        
        var s = new Symbol();
      `,
    },
  ],
  invalid: [
    {
      code: `
        var sym =
          new Symbol("foo");`,
      errors: [
        {
          message:
            '{"message":"Remove this \\"new\\" operator.","secondaryLocations":[{"column":14,"line":3,"endColumn":20,"endLine":3}]}',
          line: 3,
          endLine: 3,
          column: 11,
          endColumn: 14,
        },
      ],
    },
    {
      code: `
        function foo(other) {
          var bar = new Symbol("bar");
        }`,
      errors: 1,
    },
  ],
});
