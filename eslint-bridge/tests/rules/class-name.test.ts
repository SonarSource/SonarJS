import { RuleTester } from "eslint";
import { rule } from "../../src/rules/class-name";
import * as path from "path";

const ruleTester = new RuleTester({
  parser: path.resolve(`${__dirname}/../../node_modules/@typescript-eslint/parser`),
  parserOptions: { ecmaVersion: 2018 },
});

const DEFAULT_FORMAT = /^[A-Z][a-zA-Z0-9]*$/;
const CUSTOM_FORMAT = /^[_A-Z][a-zA-Z0-9]*$/;

ruleTester.run("Class and interface names should comply with a naming convention", rule, {
  valid: [
    {
      code: `
      class MyClass {

      }

      var x = class y { // Compliant, rule doesn't check class expressions

      }

      interface MyInterface {

      }
      `,
      options: [{ format: DEFAULT_FORMAT }],
    },
    {
      code: `
      class _MyClass {

      }

      interface _MyInterface {

      }
      `,
      options: [{ format: CUSTOM_FORMAT }],
    },
  ],
  invalid: [
    {
      code: `
      class my_class {

      }
      `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          message: `Rename class "my_class" to match the regular expression /^[A-Z][a-zA-Z0-9]*$/.`,
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
      interface my_interface {

      }
      `,
      options: [{ format: DEFAULT_FORMAT }],
      errors: [
        {
          message: `Rename interface "my_interface" to match the regular expression /^[A-Z][a-zA-Z0-9]*$/.`,
          line: 2,
          endLine: 2,
          column: 17,
          endColumn: 29,
        },
      ],
    },
    {
      code: `
      class __MyClass {

      }
      `,
      options: [{ format: CUSTOM_FORMAT }],
      errors: [
        {
          message: `Rename class "__MyClass" to match the regular expression /^[_A-Z][a-zA-Z0-9]*$/.`,
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 22,
        },
      ],
    },
    {
      code: `
      interface __MyInterface {

      }
      `,
      options: [{ format: CUSTOM_FORMAT }],
      errors: [
        {
          message: `Rename interface "__MyInterface" to match the regular expression /^[_A-Z][a-zA-Z0-9]*$/.`,
          line: 2,
          endLine: 2,
          column: 17,
          endColumn: 30,
        },
      ],
    },
  ],
});
