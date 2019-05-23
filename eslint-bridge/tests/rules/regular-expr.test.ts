import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/regular-expr";

const message = "Make sure that using a regular expression is safe here.";

ruleTester.run("Using regular expressions is security-sensitive", rule, {
  valid: [
    {
      // not enough of special symbols
      code: `str.match("(a+)b");`,
    },
    {
      // different method
      code: `str.foo("(a+)b+");`,
    },
    {
      // argument is not hardcoded literal
      code: `str.match(foo("(a+)b+"));`,
    },
    {
      // FN
      code: `const x = "(a+)b+"; str.match(x);`,
    },
    {
      // not enough length
      code: `str.match("++");`,
    },
    {
      // missing argument
      code: `str.match();`,
    },
  ],
  invalid: [
    {
      code: `str.match("(a+)+b");`,
      errors: [
        {
          message,
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 19,
        },
      ],
    },

    {
      code: `str.match("+++");`,
      errors: [{ message }],
    },
    {
      code: `str.match("***");`,
      errors: [{ message }],
    },
    {
      code: `str.match("{{{");`,
      errors: [{ message }],
    },
    {
      code: `str.match(/(a+)+b/);`,
      errors: [{ message }],
    },

    {
      code: `str.split("(a+)+b");`,
      errors: [{ message }],
    },
    {
      code: `str.search("(a+)+b");`,
      errors: [{ message }],
    },
    {
      code: `new RegExp("(a+)+b");`,
      errors: [{ message }],
    },

    {
      code: `/(a+)+b/;`,
      errors: [{ message }],
    },
  ],
});
