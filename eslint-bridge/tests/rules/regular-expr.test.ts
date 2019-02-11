import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/regular-expr";

ruleTester.run("Using regular expressions is security-sensitive", rule, {
  valid: [
    {
      code: `str.replace("foo", str); str.replace('foo', str);`,
    },
    {
      code: `let regex = /ab+c/; `,
    },
    {
      code: `str.split();`,
    },
    {
      code: `foo.test();`,
    },
    {
      code: `foo.test(p1, p2);`,
    },
    {
      code: `/abc/.test(p1);`,
    },
    {
      code: `/abc/g.test(p1);`,
    },
    {
      code: `/./.test(p1);`,
    },
    {
      code: `/^\\w$/.test(p1);`,
    },
    {
      code: `str.replace(/abc/, str);`,
    },
  ],
  invalid: [
    {
      code: `str.replace(regex, str);`,
      errors: [
        {
          message: "Make sure that using a regular expression is safe here.",
          line: 1,
          endLine: 1,
          column: 13,
          endColumn: 18,
        },
      ],
    },
    {
      code: `regex.test(str);`,
      errors: [
        {
          message: "Make sure that using a regular expression is safe here.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 6,
        },
      ],
    },
    {
      code: `str.replace(/ab+c/, str);`,
      errors: 1,
    },
    {
      code: `str.replace(/[a-d]/, str);`,
      errors: 1,
    },
    {
      code: `regex.exec(str);`,
      errors: 1,
    },
    {
      code: `foo.test("str");`,
      errors: 1,
    },
  ],
});
