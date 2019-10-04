import { RuleTester } from "eslint";
import { rule } from "../../src/rules/max-union-size";
import * as path from "path";

const ruleTester = new RuleTester({
  parser: path.resolve(`${__dirname}/../../node_modules/@typescript-eslint/parser`),
  parserOptions: { ecmaVersion: 2018 },
});

const DEFAULT_THRESHOLD = 3;
const CUSTOM_THRESHOLD = 4;

ruleTester.run("Union types should not have too many elements", rule, {
  valid: [
    {
      code: `let smallUnionType: number | boolean | string;`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `let smallUnionType: number | boolean | string | any[];`,
      options: [CUSTOM_THRESHOLD],
    },
    {
      code: `function smallUnionType(a: number | boolean) {}`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `type T = A | B | C | D;`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        function okFn(a: T) {}`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        let okVarA : T;`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        let okFunctionType: (param: any) => T`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        let okTupleType: [string, T];`,
      options: [DEFAULT_THRESHOLD],
    },
    {
      code: `
        type T = A | B | C | D;
        interface okInterfaceDeclaration {
          prop: T;
        }`,
      options: [DEFAULT_THRESHOLD],
    },
  ],
  invalid: [
    {
      code: `let nokVarA: A | B | C | D`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
          line: 1,
          endLine: 1,
          column: 14,
          endColumn: 27,
        },
      ],
    },
    {
      code: `let nokVarA: A | B | C | D | E`,
      options: [CUSTOM_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${CUSTOM_THRESHOLD} elements.`,
          line: 1,
          endLine: 1,
          column: 14,
          endColumn: 31,
        },
      ],
    },
    {
      code: `function nokFn(a: A | B | C | D) {}`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `let nokFunctionType: (param: any) => A | B | C | D`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `let nokTupleType : [string, A | B | C | D];`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `interface nokInterfaceDeclaration {
        prop: A | B | C | D;
      }`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
    {
      code: `type U = (A | B | C | D) & E;`,
      options: [DEFAULT_THRESHOLD],
      errors: [
        {
          message: `Refactor this union type to have less than ${DEFAULT_THRESHOLD} elements.`,
        },
      ],
    },
  ],
});
