import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/pseudo-random";

ruleTester.run("Using pseudorandom number generators (PRNGs) is security-sensitive", rule, {
  valid: [
    {
      code: `foo(x)`,
    },
    {
      code: `"Math.random()"`,
    },
    {
      code: `Math.foo()`,
    },
    {
      code: `Foo.random()`,
    },
  ],
  invalid: [
    {
      code: `let x = Math.random();`,
      errors: [
        {
          message: "Make sure that using this pseudorandom number generator is safe here.",
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 22,
        },
      ],
    },
    {
      code: `foo(Math.random())`,
      errors: 1,
    },
  ],
});
