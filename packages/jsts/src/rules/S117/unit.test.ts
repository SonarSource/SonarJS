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

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018 },
});

const DEFAULT_FORMAT = '^[_$A-Za-z][$A-Za-z0-9]*$|^[_$A-Z][_$A-Z0-9]+$';
const CUSTOM_FORMAT = '^[a-z][a-z0-9]+$';

ruleTester.run(
  'Local variable and function parameter names should comply with a naming convention',
  rule,
  {
    valid: [
      {
        code: `
        var foo;
        let lowerCamelCase;
        let _leadingUnderScore;
        let PascalCase;
        const UPPER_CASE = "UPPER_CASE";`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `let [ foo, [ bar, [ baz, [ qux = quux_quuz, ...corge ] ] ] ] = arr;`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `let { foo, foo_foo, bar: bar, bar_bar: bar, baz: { qux: { quux: Quux, quuz: { corge: Corge = grault_garply, ...waldo } } } } = obj;`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `declare var foo_bar: number // declare are ignored`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `
        try {} catch {}
        try {} catch (foo) {}
        try {} catch ([ foo ]) {}
        try {} catch ({ foo: Foo }) {}
        try {} finally {}`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `
        declare function f(foo_bar);
        function f(foo) {}
        function f(foo = 5) {}
        function f(...foo: number[]) {}
        function f([foo, bar]: number[]) {}
        function f({a: foo, b: bar}: {a: number, b: number}) {}
        foo => foo;
        let f = function (foo: number) {};`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `
        let foo = bar_baz`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `
        let custom;
        let custom1;`,
        options: [{ format: CUSTOM_FORMAT }],
      },
    ],
    invalid: [
      {
        code: `let foo_bar`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this local variable "foo_bar" to match the regular expression ${DEFAULT_FORMAT}.`,
            line: 1,
            endLine: 1,
            column: 5,
            endColumn: 12,
          },
        ],
      },
      {
        code: `
        var foo_foo;
        const bar_bar = 5;`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('foo_foo', 'local variable', DEFAULT_FORMAT),
          error('bar_bar', 'local variable', DEFAULT_FORMAT),
        ],
      },
      {
        code: `let [ foo_foo, [ bar_bar, [ baz_baz, ...qux_qux ] ] ] = arr;`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('foo_foo', 'local variable', DEFAULT_FORMAT),
          error('bar_bar', 'local variable', DEFAULT_FORMAT),
          error('baz_baz', 'local variable', DEFAULT_FORMAT),
          error('qux_qux', 'local variable', DEFAULT_FORMAT),
        ],
      },
      {
        code: `let { foo, bar: bar_bar, baz: { qux: { quux: quux_quux }, ...corge_corge } } = obj;`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('bar_bar', 'local variable', DEFAULT_FORMAT),
          error('quux_quux', 'local variable', DEFAULT_FORMAT),
          error('corge_corge', 'local variable', DEFAULT_FORMAT),
        ],
      },
      {
        code: `
        try {} catch (foo_bar1) {}
        try {} catch ([ foo_bar2 ]) {}
        try {} catch ({ foo: foo_bar3 }) {}`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('foo_bar1', 'parameter', DEFAULT_FORMAT),
          error('foo_bar2', 'parameter', DEFAULT_FORMAT),
          error('foo_bar3', 'parameter', DEFAULT_FORMAT),
        ],
      },
      {
        code: `
        function f(foo_bar1: number) {}
        function f(foo_bar2 = 5) {}
        function f(...foo_bar3: number[]) {}
        function f([foo_bar4, foo_bar5]: number[]) {}
        function f({a: foo_bar6, b: foo_bar7, foo_bar8}: {a: a_a, b: number}) {}
        foo_bar9 => foo_bar9;
        let f = function (foo_bar10: number) {};`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('foo_bar1', 'parameter', DEFAULT_FORMAT),
          error('foo_bar2', 'parameter', DEFAULT_FORMAT),
          error('foo_bar3', 'parameter', DEFAULT_FORMAT),
          error('foo_bar4', 'parameter', DEFAULT_FORMAT),
          error('foo_bar5', 'parameter', DEFAULT_FORMAT),
          error('foo_bar6', 'parameter', DEFAULT_FORMAT),
          error('foo_bar7', 'parameter', DEFAULT_FORMAT),
          error('foo_bar9', 'parameter', DEFAULT_FORMAT),
          error('foo_bar10', 'parameter', DEFAULT_FORMAT),
        ],
      },
      {
        code: `
        interface i {
          new(foo_bar1: number);
          m(foo_bar2: number);
        }`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('foo_bar1', 'parameter', DEFAULT_FORMAT),
          error('foo_bar2', 'parameter', DEFAULT_FORMAT),
        ],
      },
      {
        code: `
        class c {
          "foo_bar": number; // Compliant
          foo_bar1: number;
          constructor(foo_bar2: number, readonly foo_bar3: number) {}
          m(foo_bar4: number) {}
          n(foo_bar5: number)
        }`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          error('foo_bar1', 'property', DEFAULT_FORMAT),
          error('foo_bar2', 'parameter', DEFAULT_FORMAT),
          error('foo_bar3', 'parameter', DEFAULT_FORMAT),
          error('foo_bar4', 'parameter', DEFAULT_FORMAT),
          error('foo_bar5', 'parameter', DEFAULT_FORMAT),
        ],
      },
      {
        code: `let custom_format`,
        options: [{ format: CUSTOM_FORMAT }],
        errors: [error('custom_format', 'local variable', CUSTOM_FORMAT)],
      },
    ],
  },
);

function error(symbol: string, symbolType: string, format: string) {
  return {
    message: `Rename this ${symbolType} "${symbol}" to match the regular expression ${format}.`,
  };
}
