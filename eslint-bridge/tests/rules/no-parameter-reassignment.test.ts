import { RuleTester } from "eslint";

import { rule } from "../../src/rules/no-parameter-reassignment";

const tsParserPath = require.resolve("@typescript-eslint/parser");
const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: "module" },
  parser: tsParserPath,
});

const NON_COMPLIANT_REGEX = /\/\/\sNoncompliant\s{{(\w+)}}/;
function invalidTest(code: string) {
  const errors = code.split("\n").reduce(
    (accumulator, currentLine, index) => {
      const res = NON_COMPLIANT_REGEX.exec(currentLine);
      if (res && res[1]) {
        const currentLine = index + 1;
        accumulator.push({
          message: `Introduce a new variable or use its initial value before reassigning "${
            res[1]
          }".`,
          line: currentLine,
          endLine: currentLine,
        });
      }
      return accumulator;
    },
    [] as RuleTester.TestCaseError[],
  );
  return {
    code: code,
    errors,
  };
}

ruleTester.run(
  "Function parameters, caught exceptions and foreach variables' initial values should not be ignored",
  rule,
  {
    valid: [
      {
        code: `
        function foo(p1, p2, p3, ... p4) {
          p1.prop1 = 42;
          foo(p2, p3);
          var x = p4 + 1;
          p1 = 3; // OK - variable was read before
          p2 = 3; // OK - variable was read before
          p3 = 3; // OK - variable was read before
          p4++; // OK - variable was read before
        }
        
        function bar({a: p1 = 1, p2 = 2}, [p3 = 3, p4 = 4], p5 = 5) {
          foo(p1, p2, p3, p4, p5);
          var p1 = 42; // OK - variable was read before
          foo(p2++); // OK - variable is updated based on previous value
          foo(++p3); // OK - variable is updated based on previous value
          p4--; // OK - variable is updated based on previous value
          p5 /= 2; // OK - variable is updated based on previous value
        }
        
        function foobar(opts?: any, p1: number, p2: number) {
          opts = opts || {}; // Ok - variable is on right side of assignment
          p1 += p1; // Ok - variable is on right side of assignment
          p2 = doSomething(p2); // Ok - variable is on right side of assignment
        }
        
        function myFunc1() {
          myFunc = () => "";
        }
        
        // Ok - reassignment inside IfStatement are not raised
        function myFunc2(p1) {
          if (someBoolean) {
            p1 = "defaultValue";
          }
        }
        
        // Ok - reassignment is based on arguments
        function myFunc3(p1) {
          p1 = arguments[1] || arguments[0];
        }
        
        var p1;
        p1 = 42;
        p1 = 3;
        foo(p1, p2);
        
        try {
          foo();
        } catch (e) {
          if (e === e1) {
            e = 0;
          } else {
            e = 1;
          }
          foo(e);
          e = 3;
        }
        
        for (var x in obj) {
          if (abc) {
            let a = x;
          } else {
            let y = 2 * x;
          }
          x = 3;
        }
        
        for (var var1 in obj)
          for (var var2 in obj2) {
            if (var1 === var2) {}
            var1 = 3;
          }
          
        for (var var1 in obj) {
          for (var var2 in obj2) {
            if (var1 === var2) {}
            var1 = 3;
          }
          var1 = 3;
          var2 = 3;
        } 
        
        // OK - only foreach loop are checked
        for (let c = 0, d = 1; c < 3; c++) {
          c = foo();
          d = foo();
        }`,
      },
    ],
    invalid: [
      {
        code: `
        function foo(p1) {
          p1 = 42;
        }`,
        errors: [
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p1".',
            line: 3,
            endLine: 3,
            column: 11,
            endColumn: 18,
          },
        ],
      },
      invalidTest(`
        function foo(p1) {
           if (someBoolean) {
            p1 = "defaultValue";
          }
          p1 = "newValue"; // Noncompliant {{p1}}
        }`),
      invalidTest(`
        function foo(p1) {
           while (someBoolean) {
            p1 = "defaultValue"; // Noncompliant {{p1}}
          }
        }`),
      invalidTest(`
        function bindingElements({a: p1 = 1, p2 = 2}, [p3 = 3, p4 = 4], p5 = 5) {
          p1 = 42; // Noncompliant {{p1}}
          p2 = 42; // Noncompliant {{p2}}
          p3 = 42; // Noncompliant {{p3}}
          p4 = 42; // Noncompliant {{p4}}
          p5 = 42; // Noncompliant {{p5}}
          p5 = 42;
        }`),
      invalidTest(`
        var arrow_function1 = (p1, p2) => {
          p2 = 42; // Noncompliant {{p2}}
          p1.prop1 = 42;
          foo(p1, p2);
        }
        
        var arrow_function2 = p1 => {
          p1 = 42; // Noncompliant {{p1}}
          foo(p1);
        }
        
        (function(p1) {
          p1 = 42; // Noncompliant {{p1}}
        })(1);`),
      invalidTest(`
        try {
          foo();
        } catch (e) {
          e = foo(); // Noncompliant {{e}}
        }
        
        try {
          foo();
        } catch ([e, e1, e2]) {
          e = foo(); // Noncompliant {{e}}
          e1 = foo(); // Noncompliant {{e1}}
          foo(e2);
        }`),
      invalidTest(`
        for (var x in obj) {
          for (let x in obj) {
            x = foo(); // Noncompliant {{x}}
          }
          x = foo(); // Noncompliant {{x}}
        }
        
        for (var [a, b] of obj) {
          a = foo(); // Noncompliant {{a}}
        }
        
        for (let {prop1, prop2} in obj) {
          prop1 = foo(); // Noncompliant {{prop1}}
        }
        
        for (let x of obj) {
          x = foo(); // Noncompliant {{x}}
        }
        
        var y = 1;
        y = 42;
        for (y of obj) {
          y = foo(); // Noncompliant {{y}}
        }
        
        var z;
        for (z in obj) {
          z = foo(); // Noncompliant {{z}}
        }
        
        for ([a, [b]] in obj) {
          a = foo(); // Noncompliant {{a}}
          b = foo(); // Noncompliant {{b}}
        }
        
        for ({a, b} in obj) {
          a = foo(); // Noncompliant {{a}}
          b = foo(); // Noncompliant {{b}}
        }`),
    ],
  },
);
