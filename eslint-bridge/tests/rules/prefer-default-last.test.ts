import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/prefer-default-last";

ruleTester.run('"default" clauses should be first or last', rule, {
  valid: [
    {
      code: `switch (true) {}`,
    },
    {
      code: `
        switch (z) {
          case "foo":
            console.log("Hello World")
            break;
          case "bar":
            console.log("42");
            break;
          default:
            console.log("Default message");
        }`,
    },
    {
      code: `
        switch (z) {
        case "foo":
            console.log("Hello World")
            break;
        }`,
    },
  ],
  invalid: [
    {
      code: `
        switch (x) {
          case 1:
            console.log("1");
          default:  //Nomcompliant
            console.log("0");
          case 2:
            console.log("2");
        }`,
      errors: [
        {
          message:
            'Move this "case default" clause to the beginning or end of this "switch" statement.',
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 18,
        },
      ],
    },

    {
      code: `
        switch (y) {
          default: //Nomcompliant
            console.log("Default message");
            break;
          case "foo":
            console.log("Hello World")
            break;
          case "bar":
            console.log("42");
            break;
        }`,
      errors: 1,
    },
  ],
});
