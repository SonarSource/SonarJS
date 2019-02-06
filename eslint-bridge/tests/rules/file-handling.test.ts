import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/file-handling";

ruleTester.run("Handling files is security-sensitive", rule, {
  valid: [
    {
      code: `
        const fs = require('fs');
        fs.createWriteStream('foo.txt');
        `,
    },
    {
      code: `
        const fs = require('myFs');
        fs.createWriteStream(userInput + ".txt");
        `,
    },
    {
      code: `
      import { rename } from 'fs'
      rename("foo.txt", "bar.txt")
      `,
    },
    {
      code: `
        const fs = require('fs');
        fs[getFunctionName()]('foo.txt');
        `,
    },
  ],
  invalid: [
    {
      code: `
        const fs = require('fs');
        fs.createWriteStream(userInput + ".txt");
        `,
      errors: [
        {
          message: "Make sure this file handling is safe here.",
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 29,
        },
      ],
    },
    {
      code: `
        const fs = require('fs');
        fs.openSync(userInput + ".txt", "r");`,
      errors: 1,
    },
    {
      code: `
        import { openSync } from 'fs'
        openSync(userInput + ".txt", "r");
      `,
      errors: 1,
    },
    {
      code: `
        import { rename } from 'fs'
        rename("foo.txt", userInput + ".txt");
      `,
      errors: 1,
    },
  ],
});
