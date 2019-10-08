import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/non-existent-operator";

ruleTester.run("JavaScript: Non-existent operators '=+', '=-' and '=!' should not be used", rule, {
  valid: [
    {
      code: `
        x = y;
        x += y;
        x = + y;
        x =
           + y;
        x=+y; // Ok - we accept this as some people don't like to use white spaces
        x = - y;
        x /=+ y;
        x = !y;
        let y = + 1;
        y = (!(y));
        const z = + 1;
        other =~ 1;
        `,
    },
  ],
  invalid: [
    {
      code: `x =+ y;`,
      errors: [
        {
          message: `Was "+=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 5,
        },
      ],
    },
    {
      code: `
      x =- y;`,
      errors: [
        {
          message: `Was "-=" meant instead?`,
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `x =! y;`,
      errors: [
        {
          message: `Was "!=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 5,
        },
      ],
    },
    {
      code: `const x =! y;`,
      errors: [
        {
          message: `Was "!=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 11,
        },
      ],
    },
    {
      code: `let x =! y;`,
      errors: [
        {
          message: `Was "!=" meant instead?`,
          line: 1,
          endLine: 1,
          column: 7,
          endColumn: 9,
        },
      ],
    },
  ],
});
