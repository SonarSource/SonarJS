import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/no-nested-template-literals";

ruleTester.run("Template literals should not be nested", rule, {
  valid: [
    {
      code: "let nestedMessage = `${count} ${color}`;",
    },
    {
      code: "let message = `I have ${color ? nestedMessage : count} apples`;",
    },
  ],
  invalid: [
    {
      code:
        "let message = `I have ${color ? `${x ? `indeed 0` : count} ${color}` : count} apples`;",
      errors: [
        {
          message: `Refactor this code to not use nested template literals.`,
          line: 1,
          endLine: 1,
          column: 33,
          endColumn: 69,
        },
        {
          message: `Refactor this code to not use nested template literals.`,
          line: 1,
          endLine: 1,
          column: 40,
          endColumn: 50,
        },
      ],
    },
    {
      code: "let message = `I have ${color ? `${count} ${color}` : count} apples`;",
      errors: 1,
    },
    {
      code:
        "let message = `I have ${color ? `${x ? `indeed ${0}` : count} ${color}` : count} apples`;",
      errors: 2,
    },
    {
      code:
        "function tag(strings, ...keys) {console.log(strings[2]);}\n" +
        "let message1 = tag`I have ${color ? `${count} ${color}` : count} apples`;\n" +
        "let message2 = tag`I have ${color ? tag`${count} ${color}` : count} apples`;",
      errors: 2,
    },
    {
      code: "let message = `I have ${color ? `${count} ${color}` : `this is ${count}`} apples`;",
      errors: 2,
    },
    {
      code: "let message = `I have ${`${count} ${color}`} ${`this is ${count}`} apples`;",
      errors: 2,
    },
  ],
});
