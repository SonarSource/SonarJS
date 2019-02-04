import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/process-argv";

ruleTester.run("Using command line arguments is security-sensitive", rule, {
  valid: [
    {
      code: `foo.bar`,
    },
    {
      code: `process.argvFoo`,
    },
    {
      code: `processFoo.argv`,
    },
    {
      code: `'process.argv'`,
    },
  ],
  invalid: [
    {
      code: `let x = process.argv;`,
      errors: [
        {
          message: "Make sure that command line arguments are used safely here.",
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 21,
        },
      ],
    },
    {
      code: `\`argument 0: \${process.argv[0]}\``,
      errors: 1,
    },
  ],
});
