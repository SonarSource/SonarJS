import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/label-position";

ruleTester.run('Only "while", "do", "for" and "switch" statements should be labelled', rule, {
  valid: [
    {
      code: `
        loop1:
        for (var i = 0; i < 5; i++) {
          continue loop1;
        }`,
    },
    {
      code: `loop1: for (index in myArray) {}`,
    },
    {
      code: `loop1: for (val of myArray) {}`,
    },
    {
      code: `loop1: while (i < 10) {}`,
    },
    {
      code: `loop1: do {} while (i < 10)`,
    },
    {
      code: `mySwitch: switch(x) { default: break mySwitch; }`,
    },
  ],
  invalid: [
    {
      code: `
        invalidLabel:
      //^^^^^^^^^^^^
        if (myBool) {}`,
      errors: [
        {
          message: 'Remove this "invalidLabel" label.',
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 21,
        },
      ],
    },
    {
      code: `invalidLabel: let x = 0;`,
      errors: 1,
    },
  ],
});
