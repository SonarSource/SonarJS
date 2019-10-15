import { RuleTester } from "eslint";
import { rule } from "../../src/rules/use-type-alias";

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: 2018 },
});

ruleTester.run("Type aliases should be used", rule, {
  valid: [
    {
      code: `type MyType = string | null | number;`,
      options: [],
    },
    {
      code: `
      type MyType = string | null | number;
      const another: MyType | undefined = "";`,
      options: [],
    },
    {
      code: `
      let x: number | string;
      let y: number | string;
      let z: number | string; // this fine because only 2 types in the union`,
      options: [],
    },
    {
      code: `
      interface A {
        name: string;
        a: number;
      }
      
      interface B {
        name: string;
        b: number;
      }
      
      interface C {
        name: string;
        b: number;
      }`,
      options: [],
    },
    {
      code: `
      // ok, ignore usage inside type alias
      type Alias = number | number[] | undefined;
      function one(x: number | number[] | undefined) {}
      function two(x: number | number[] | undefined) {}`,
      options: [],
    },
  ],
  invalid: [
    {
      code: `
      function foo(x: string | null | number) {}
      const bar: string | null | number = null;
      function zoo(): string | null | number {}
      `,
      options: [],
      errors: [
        {
          message:
            '{"message":"Replace this union type with a type alias.","secondaryLocations":[{"column":17,"line":3,"endColumn":39,"endLine":3},{"column":22,"line":4,"endColumn":44,"endLine":4}]}',
          line: 2,
          endLine: 2,
          column: 23,
          endColumn: 45,
        },
      ],
    },
    {
      code: `
      function foo(x: string & null & number) {}
      const bar: string & null & number = null;
      function zoo(): string & null & number {}
      `,
      options: [],
      errors: [
        {
          message:
            '{"message":"Replace this intersection type with a type alias.","secondaryLocations":[{"column":17,"line":3,"endColumn":39,"endLine":3},{"column":22,"line":4,"endColumn":44,"endLine":4}]}',
          line: 2,
          endLine: 2,
          column: 23,
          endColumn: 45,
        },
      ],
    },
  ],
});
