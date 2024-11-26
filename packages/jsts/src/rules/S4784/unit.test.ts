/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

const message = 'Make sure that using a regular expression is safe here.';

ruleTester.run('Using regular expressions is security-sensitive', rule, {
  valid: [
    {
      // not enough of special symbols
      code: `str.match("(a+)b");`,
    },
    {
      // not enough of special symbols
      code: `str.match(/(a+)b/);`,
    },
    {
      // different method
      code: `str.foo("(a+)b+");`,
    },
    {
      // argument is not hardcoded literal
      code: `str.match(foo("(a+)b+"));`,
    },
    {
      // FN
      code: `const x = "(a+)b+"; str.match(x);`,
    },
    {
      // not enough length
      code: `str.match("++");`,
    },
    {
      // missing argument
      code: `str.match();`,
    },
  ],
  invalid: [
    {
      code: `str.match("(a+)+b");`,
      errors: [
        {
          message,
          line: 1,
          endLine: 1,
          column: 11,
          endColumn: 19,
        },
      ],
    },

    {
      code: `str.match("+++");`,
      errors: [{ message }],
    },
    {
      code: `str.match("***");`,
      errors: [{ message }],
    },
    {
      code: `str.match("{{{");`,
      errors: [{ message }],
    },
    {
      code: `str.match(/(a+)+b/);`,
      errors: [{ message }],
    },

    {
      code: `str.split("(a+)+b");`,
      errors: [{ message }],
    },
    {
      code: `str.search("(a+)+b");`,
      errors: [{ message }],
    },
    {
      code: `new RegExp("(a+)+b");`,
      errors: [{ message }],
    },

    {
      code: `/(a+)+b/;`,
      errors: [{ message }],
    },
  ],
});
