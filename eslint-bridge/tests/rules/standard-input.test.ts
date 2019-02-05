import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/standard-input";

ruleTester.run("Reading the Standard Input is security-sensitive", rule, {
  valid: [
    {
      code: `foo.bar`,
    },
    {
      code: `process.stdout`,
    },
    {
      code: `processFoo.stdin`,
    },
    {
      code: `'process.stdin'`,
    },
  ],
  invalid: [
    {
      code: `let x = process.stdin;`,
      errors: [
        {
          message: "Make sure that reading the standard input is safe here.",
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 22,
        },
      ],
    },
    {
      code: `process.stdin.on('readable', () => {});`,
      errors: 1,
    },
  ],
});
