import { RuleTester } from "eslint";
import { rule } from "../../src/rules/arguments-order";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("Parameters should be passed in the correct order", rule, {
  valid: [
    {
      code: `
        function f1(p1, p2, p3) {}
        function f2(p1, p2, p3) {}
        function f2() {}
        
        function withInitializer(p1="", p2="") {}
        function arrayBindingPattern([], p2) {}
        
        class A {
          method1(p1, p2) {}
        }
        
        function main() {
          f1(p1, p2, p3);
          f1(p1, p2, xxx);
          f1(p1, "p2", "x");
          unknown(p1, p3, p2);
          f2(p1, p3, p2);
          (function(p1, p2) {})(p1, p2);
          var a1 = new A();
          a1.method1(p1, p2);
          a1.method1(p2, p1); // FN - since we cannot resolve type in pure JS analysis
          withInitializer(p1, p2);
          arrayBindingPattern(p2, p1);
        }`,
    },
  ],
  invalid: [
    {
      code: `
        function f1(p1, p2, p3) {}
        f1(p2, p1, p3);`,
      errors: [
        {
          message: `{"message":"Arguments 'p2' and 'p1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","line":2,"column":20,"endLine":2,"endColumn":30}]}`,
          line: 3,
          endLine: 3,
          column: 12,
          endColumn: 22,
        },
      ],
    },
    {
      code: `
        (function(p1, p2) {})(p2, p1);`,
      errors: [
        {
          message: `{"message":"Arguments 'p2' and 'p1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","line":2,"column":18,"endLine":2,"endColumn":24}]}`,
          line: 2,
          endLine: 2,
          column: 31,
          endColumn: 37,
        },
      ],
    },
    {
      code: `
        function withInitializer(p1="", p2="") {}
        withInitializer(p2, p1);`,
      errors: [
        {
          message: `{"message":"Arguments 'p2' and 'p1' have the same names but not the same order as the function parameters.","secondaryLocations":[{"message":"Formal parameters","line":2,"column":33,"endLine":2,"endColumn":45}]}`,
          line: 3,
          endLine: 3,
        },
      ],
    },
  ],
});
