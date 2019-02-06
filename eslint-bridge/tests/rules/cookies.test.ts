import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
import { rule } from "../../src/rules/cookies";

ruleTester.run("Using cookies is security-sensitive", rule, {
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
  ],
  invalid: [
    {
      code: `let x = document.cookie;`,
      errors: [
        {
          message: "Make sure that this cookie is used safely.",
          line: 1,
          endLine: 1,
          column: 9,
          endColumn: 24,
        },
      ],
    },
    {
      code: `document.cookie = 42;`,
      errors: 1,
    },
    {
      code: `response.setHeader('Set-Cookie', x);`,
      errors: 1,
    },
    {
      code: `'express'; res.cookie("foo", "bar");`,
      errors: 1,
    },
    {
      code: `'express'; foo(req.cookies);`,
      errors: 1,
    },
  ],
});
