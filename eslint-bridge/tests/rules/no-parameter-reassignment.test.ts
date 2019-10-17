import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/no-parameter-reassignment";

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
          p2++; // OK - variable was read before
          ++p3; // OK - variable was read before
          p3--; // OK - variable was read before
          --p4; // OK - variable was read before
        }
        
        var p1;
        p1 = 42;
        p1 = 3;
        foo(p1, p2);
        
        try {
          foo();
        } catch (e) {
          foo(e);
          e = 3;
        }
        
        for (var x in obj) {
          if (abc) {
            x = foo();
          } else {
            let y = 2 * x;
          }
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
      {
        code: `
        function foo(p1) {
          foo(p1++);
        }`,
        errors: [
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p1".',
            line: 3,
            endLine: 3,
            column: 15,
            endColumn: 17,
          },
        ],
      },
      {
        code: `
        function bindingElements({a: p1 = 1, p2 = 2}, [p3 = 3, p4 = 4], p5 = 5) {
          p1 = 42;
          p2 = 42;
          p3 = 42;
          p4 = 42;
          p5 = 42;
        }`,
        errors: [
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p1".',
            line: 3,
            column: 11,
            endLine: 3,
            endColumn: 18,
          },
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p2".',
            line: 4,
            column: 11,
            endLine: 4,
            endColumn: 18,
          },
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p3".',
            line: 5,
            column: 11,
            endLine: 5,
            endColumn: 18,
          },
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p4".',
            line: 6,
            column: 11,
            endLine: 6,
            endColumn: 18,
          },
          {
            message: 'Introduce a new variable or use its initial value before reassigning "p5".',
            line: 7,
            column: 11,
            endLine: 7,
            endColumn: 18,
          },
        ],
      },
      {
        code: `
        var arrow_function1 = (p1, p2) => {
          p2 = 42;
          p1.prop1 = 42;
          foo(p1, p2);
        }
        
        var arrow_function2 = p1 => {
          p1 = 42;
          foo(p1);
        }
        
        (function(p1) {
          p1 = 42;
        })(1);`,
        errors: 3,
      },
      {
        code: `
        try {
          foo();
        } catch (e) {
          e = foo();
        }
        
        try {
          foo();
        } catch ([e1, e2]) {
          e1 = foo();
          foo(e2);
        }`,
        errors: 2,
      },
      {
        code: `
        for (var x in obj) {
          x = foo(); // Noncompliant
        }
        
        for (var [a, b] of obj) {
          a = foo(); // Noncompliant
        }
        
        for (let {prop1, prop2} in obj) {
          prop1 = foo(); // Noncompliant
        }
        
        for (let x of obj) {
          x = foo(); // Noncompliant
        }
        
        var y = 1;
        y = 42;
        for (y of obj) {
          y = foo(); // Noncompliant
        }
        
        var z;
        for (z in obj) {
          z = foo(); // Noncompliant
        }
        
        for ([a, [b]] in obj) {
          a = foo(); // Noncompliant
          b = foo(); // Noncompliant
        }
        
        for ({a, b} in obj) {
          a = foo(); // Noncompliant
          b = foo(); // Noncompliant
        }`,
        errors: 10,
      },
    ],
  },
);
