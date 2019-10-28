import { RuleTester } from "eslint";
import * as path from "path";
import { rule } from "../../src/rules/arguments-order";

const tsParserPath = require.resolve("@typescript-eslint/parser");
const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: path.resolve(`${__dirname}/../fixtures/rule-tester-project/tsconfig.json`),
  },
  parser: tsParserPath,
});
const placeHolderFilePath = path.resolve(`${__dirname}/../fixtures/rule-tester-project/file.ts`);

ruleTester.run("Parameters should be passed in the correct order", rule, {
  valid: [
    {
      filename: placeHolderFilePath,
      code: `
        const a = 1, b = 2, c = 3, d = 4, x = "", y = 5;
        
        export function sameType(a: number, b: number, c = 3) {}
        sameType(a, b, c);
        
        sameType(a, b, d);
        
        sameType(d, d, d);
        sameType(a, a, a);
        sameType(42, a, c);
        sameType(a, d, b);
        
        function differentTypes(x: string, y: number, z = 42) {}
        
        function okForDifferentTypes(x: number, y: string) {
          differentTypes(y, x);
        }
        
        unknown(a, b);
        
        class A {
            constructor(x: string, y: number, z = 42) {};
            sameType(a: number, b: number, c = 3) {};
            differentTypes(x: string, y: number, z = 42) {}
        }
        
        class B extends A {
            constructor(x: string, y: number, z = 42) {
                super(x, y, z);
            };
            
            constructor(x: string, y: number, z = 42) {
                super("y", x, z);
            };
        }
        
        new A(a, b, c);
        new A(y, x);
        new A().sameType(a, b, c);
        new A().sameType(a, b, d);
        new A().sameType(d, d, d);
        new A().sameType(a, a, a);
        new A().sameType(42, a, c);
        new A().sameType(a, d, b);
        new A().differentTypes(y, x);`,
    },
  ],
  invalid: [
    {
      filename: placeHolderFilePath,
      code: `
        function differentTypes(x: string, y: number, z = 42) {}
        function nokForSameType(z: number, y: number) {
          differentTypes("hello", z, y);
        }`,
      errors: [
        {
          message: `{"message":"Arguments 'z' and 'y' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","line":2,"column":32,"endLine":2,"endColumn":60}]}`,
          line: 4,
          endLine: 4,
          column: 26,
          endColumn: 39,
        },
      ],
    },
    {
      filename: placeHolderFilePath,
      code: `
        interface A {
          prop1: number
        }
        function objectType(a1: A, a2: A) {
          ((a1: A, a2: A) => {})
                                (a2, a1);
        }`,
      errors: [
        {
          message: `{"message":"Arguments 'a2' and 'a1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","line":6,"column":12,"endLine":6,"endColumn":24}]}`,
          line: 7,
          endLine: 7,
          column: 34,
          endColumn: 40,
        },
      ],
    },
    {
      filename: placeHolderFilePath,
      code: `
        const from = 1, length = 2;
        const standardMethod = "str".substr(length, from);`,
      errors: [
        {
          message: `{"message":"Arguments 'length' and 'from' have the same names but not the same order as the function parameters.","secondaryLocations":[]}`,
          line: 3,
          endLine: 3,
          column: 45,
          endColumn: 57,
        },
      ],
    },
    {
      filename: placeHolderFilePath,
      code: `
        export function sameType(a: number, b: number, c = 3) {}
        const a = 1, b = 2, c = 3, d = 4;
        
        sameType(b, a, d);
        sameType(b, a, c);
        sameType(c, 2, a);
        sameType(b, a);
        sameType(42, c, b);`,
      errors: 5,
    },
    {
      filename: placeHolderFilePath,
      code: `
      /**
       * @param a number
       * @param b string
       */
      function withJsDoc(a, b){}
      withJsDoc(b, a);`,
      errors: 1,
    },
    {
      filename: placeHolderFilePath,
      code: `
        class A {
            constructor(x: string, y: number, z = 42) {};
            sameType(a: number, b: number, c = 3) {};
            differentTypes(x: string, y: number, z = 42) {}
        }
        
          class B extends A {
              constructor(x: string, y: number, z = 42) {
                  super(x, z, y);
              };
          }
        
        new A(a, z, y);
        new B("", z, y);
        new A().sameType(b, a, d);
        new A().sameType(b, a, c);
        new A().sameType(c, 2, a);
        new A().sameType(b, a);
        new A().sameType(42, c, b)
        new A().differentTypes("hello", z, y);`,
      errors: 9,
    },
  ],
});
