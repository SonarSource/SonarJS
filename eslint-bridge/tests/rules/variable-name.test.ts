import { RuleTester } from "eslint";
import { rule } from "../../src/rules/variable-name";
import * as path from "path";

const ruleTester = new RuleTester({
  parser: path.resolve(`${__dirname}/../../node_modules/@typescript-eslint/parser`),
  parserOptions: { ecmaVersion: 2018 },
});

const DEFAULT_FORMAT = "^[_$A-Z][$A-Za-z0-9]*$|^[_$a-z][$A-Za-z0-9]*$|^[_$A-Z0-9][_$A-Z0-9]+$";
const CUSTOM_FORMAT = "^[a-z][a-z0-9]+$";

ruleTester.run(
  "Local variable and function parameter names should comply with a naming convention",
  rule,
  {
    valid: [
      {
        code: `
        let foo;
        let lowerCamelCase;
        let _leadingUnderScore;
        let PascalCase;
        let UPPER_CASE;`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `let [ foo, [ bar, [ baz, ...qux ] ] ] = arr;`,
        options: [{ format: DEFAULT_FORMAT }],
      },
      {
        code: `let { foo, bar: bar, baz: { qux: { quux: Quux }, ...corge } } = obj;`,
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
        try {} catch ({ foo: Foo }) {}`,
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
        code: `let [ foo_foo, [ bar_bar, [ baz_baz, ...qux_qux ] ] ] = arr;`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this local variable "foo_foo" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this local variable "bar_bar" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this local variable "baz_baz" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this local variable "qux_qux" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
        ],
      },
      {
        code: `let { foo, bar: bar_bar, baz: { qux: { quux: quux_quux }, ...corge_corge } } = obj;`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this local variable "bar_bar" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this local variable "quux_quux" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this local variable "corge_corge" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
        ],
      },
      {
        code: `
        try {} catch (foo_bar1) {}
        try {} catch ([ foo_bar2 ]) {}
        try {} catch ({ foo: foo_bar3 }) {}`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this parameter "foo_bar1" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar2" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar3" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
        ],
      },
      {
        code: `
        function f(foo_bar1: number) {}
        function f(foo_bar2 = 5) {}
        function f(...foo_bar3: number[]) {}
        function f([foo_bar4, foo_bar5]: number[]) {}
        function f({a: foo_bar6, b: foo_bar7, foo_bar8}: {a: number, b: number}) {}
        foo_bar9 => foo_bar9;
        let f = function (foo_bar10: number) {};`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this parameter "foo_bar1" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar2" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar3" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar4" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar5" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar6" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar7" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar9" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar10" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
        ],
      },
      {
        code: `
        interface i {
          m(foo_bar: number);
        }`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this parameter "foo_bar" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
        ],
      },
      {
        code: `
        class c {
          "foo_bar": number;
          foo_bar1: number;
          constructor(foo_bar2: number, readonly foo_bar3: number) {}
          m(foo_bar4: number) {}
          n(foo_bar5: number)
        }`,
        options: [{ format: DEFAULT_FORMAT }],
        errors: [
          {
            message: `Rename this property "foo_bar1" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar2" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar3" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar4" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
          {
            message: `Rename this parameter "foo_bar5" to match the regular expression ${DEFAULT_FORMAT}.`,
          },
        ],
      },
      {
        code: `let custom_format`,
        options: [{ format: CUSTOM_FORMAT }],
        errors: [
          {
            message: `Rename this local variable "custom_format" to match the regular expression ${CUSTOM_FORMAT}.`,
          },
        ],
      },
    ],
  },
);
