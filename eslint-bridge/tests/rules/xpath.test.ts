import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/xpath";

ruleTester.run("Executing XPath expressions is security-sensitive", rule, {
  valid: [
    {
      code: `
        const xpath = require('xpath');
        xpath.parse(expr);`,
    },
    {
      code: `
        const xpath = require('x');
        xpath.select(expr);`,
    },
    {
      code: `
        const select = require('xpath').parse;
        select(expr);`,
    },
    {
      code: `
        import * as foo from 'xpath';
        foo.parse(expr);`,
    },
    {
      code: `a.selectNodesFoo(expr)`,
    },
    {
      code: `a.selectNodes(expr1, expr2)`,
    },
    {
      code: `document.evaluateFoo(userInput, xmlDoc, null, XPathResult.ANY_TYPE, null);`,
    },
    {
      code: `foo.evaluate(userInput, xmlDoc, null, XPathResult.ANY_TYPE, null);`,
    },
  ],
  invalid: [
    {
      code: `
        const xpath = require('xpath');
        xpath.select(expr);`,
      errors: [
        {
          message: "Make sure that executing this XPATH expression is safe.",
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 21,
        },
      ],
    },
    {
      code: `
        const xpath = require('xpath');
        xpath.select1(expr);`,
      errors: 1,
    },
    {
      code: `
        const select = require('xpath').select;
        select(expr);`,
      errors: 1,
    },
    {
      code: `
        import { select1 } from 'xpath';
        select1(expr);`,
      errors: 1,
    },
    {
      code: `
        import { evaluate } from 'xpath';
        evaluate(expr);`,
      errors: 1,
    },
    {
      code: `a.selectNodes(expr)`,
      errors: [
        {
          message: "Make sure that executing this XPATH expression is safe.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 14,
        },
      ],
    },
    {
      code: `a.b.selectNodes(expr)`,
      errors: 1,
    },
    {
      code: `a.b().SelectSingleNode(expr)`,
      errors: 1,
    },
    {
      code: `document.evaluate(userInput, xmlDoc, null, XPathResult.ANY_TYPE, null);`,
      errors: 1,
    },
    {
      code: `foo(document.evaluate)`,
      errors: 1,
    },
  ],
});
