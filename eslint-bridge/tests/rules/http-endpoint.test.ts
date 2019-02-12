import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/http-endpoint";

ruleTester.run("Exposing HTTP endpoints is security-sensitive", rule, {
  valid: [
    {
      code: `import * as express from 'foo'; app.listen(3000);`,
    },
    {
      code: `import * as express from 'foo'; listen(3000);`,
    },
    {
      code: `import * as exp from 'express'; app.use(foo);`,
    },
    {
      code: `import * as express from 'express'; app.listen;`,
    },
    {
      code: `foo('express'); app.listen(3000);`,
    },
    {
      code: `require('express'); app.use(3000);`,
    },
  ],
  invalid: [
    {
      code: `import { foo } from "http"; bar.listen(3000);`,
      errors: [
        {
          message: "Make sure that exposing this HTTP endpoint is safe here.",
          line: 1,
          endLine: 1,
          column: 33,
          endColumn: 39,
        },
      ],
    },
    {
      code: `
      import { createServer } from "http";
      createServer((req, res => {
        log();
        handle(req,res);
      })).listen(3000);
      //  ^^^^^^`,
      errors: [
        {
          message: "Make sure that exposing this HTTP endpoint is safe here.",
          line: 6,
          endLine: 6,
          column: 11,
          endColumn: 17,
        },
      ],
    },
    {
      code: `require('express'); app.listen(3000);`,
      errors: 1,
    },
    {
      code: `require('https'); server.listen(3000);`,
      errors: 1,
    },
    {
      code: `import * as exp from 'express'; app.listen(3000);`,
      errors: 1,
    },
  ],
});
