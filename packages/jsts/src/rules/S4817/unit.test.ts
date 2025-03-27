/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4817', () => {
  it('S4817', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Executing XPath expressions is security-sensitive', rule, {
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
        import foo from 'xpath';
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
          code: `foo.evaluate(userInput, xmlDoc, null, foo);`,
        },
        {
          code: `
        const xpath = require('xpath');
        xpath.select('foo/bar');
        xpath.select1('foo/bar');
        xpath.evaluate('foo/bar');
        a.selectNodes('foo/bar');
        a.SelectSingleNode('foo/bar')`,
        },
      ],
      invalid: [
        {
          code: `
        const xpath = require('xpath');
        xpath.select(expr);`,
          errors: [
            {
              message: 'Make sure that executing this XPATH expression is safe.',
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
              message: 'Make sure that executing this XPATH expression is safe.',
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
          code: `foo.bar.evaluate(userInput, xmlDoc, null, XPathResult.STRING_TYPE);`,
          errors: 1,
        },
        {
          code: `foo(document.evaluate)`,
          errors: 1,
        },
      ],
    });
  });
});
