import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/code-eval";

ruleTester.run("Dynamically executing code is security-sensitive", rule, {
  valid: [
    {
      code: `foo(x)`,
    },
    {
      code: `function foo(x){}\n foo(x);`,
    },
    {
      code: `eval()`,
    },
    {
      code: `eval(42)`,
    },
    {
      code: `eval("Hello")`,
    },
    {
      code: `eval(\`Hello\`)`,
    },
    {
      code: `Function()`,
    },
    {
      code: `new Function(42)`,
    },
    {
      code: `new Function('a', 42)`,
    },
    {
      code: `Function(42, 'x')`,
    },
    {
      code: `Function("Hello")`,
    },
    {
      code: `Function(\`Hello\`)`,
    },
  ],
  invalid: [
    {
      code: `eval(x);`,
      errors: [
        {
          message: "Make sure that this dynamic injection or execution of code is safe.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 5,
        },
      ],
    },
    {
      code: `eval(\`Hello \${x}\`)`,
      errors: 1,
    },
    {
      code: `Function(x)`,
      errors: 1,
    },
    {
      code: `new Function(x)`,
      errors: 1,
    },
    {
      code: `eval(42, x)`,
      errors: 1,
    },
    {
      code: `eval(x, 42)`,
      errors: 1,
    },
    {
      code: `new Function(a, x)`,
      errors: 1,
    },
    {
      code: `new Function('a', x)`,
      errors: 1,
    },
  ],
});
