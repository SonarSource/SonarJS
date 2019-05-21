import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/cookies";

ruleTester.run("Writing cookies is security-sensitive", rule, {
  valid: [
    {
      code: `document.foo`,
    },
    {
      code: `foo.cookie`,
    },
    {
      code: `response.setHeader()`,
    },
    {
      code: `response.setHeader('Content-Type', 'text/plain')`,
    },
    {
      code: `response.foo('Set-Cookie', x)`,
    },
    {
      code: `response.setHeader(SetCookie, x)`,
    },
    {
      code: `res.cookie("foo", "bar");`,
    },
    {
      code: `foo(req.cookies);`,
    },
    {
      code: `let x = document.cookie;`,
    },
    {
      code: `document.notCookie = 42`,
    },
    {
      code: `notDocument.cookie = 42`,
    },
    {
      code: `'express'; foo(req.cookies);`,
    },
  ],
  invalid: [
    {
      code: `document.cookie = 42;`,
      errors: [
        {
          message: "Make sure that cookie is written safely here.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 16,
        },
      ],
    },
    {
      code: `response.setHeader('Set-Cookie', x);`,
      errors: 1,
    },
    {
      code: `'express'; res.cookie("foo", "bar");`,
      errors: 1,
    },
  ],
});
