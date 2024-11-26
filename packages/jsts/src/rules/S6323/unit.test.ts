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
ruleTester.run('Alternation with empty alternatives', rule, {
  valid: [
    {
      code: `/a/`,
    },
    {
      code: `/()/`,
    },
    {
      code: `/(?:)/`,
    },
    {
      code: `/a|b/`,
    },
    {
      code: `/a|b|c/`,
    },
    {
      // exception when used to make group optional
      code: `/(a|)/,/(?:a|)/`,
    },
  ],
  invalid: [
    {
      code: `/|/`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 3,
        },
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 3,
        },
      ],
    },
    {
      code: `/a|/`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 4,
        },
      ],
    },
    {
      code: `/|a/`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 3,
        },
      ],
    },
    {
      code: `/a|b|/`,
      errors: 1,
    },
    {
      code: `/a||b/`,
      errors: 1,
    },
    {
      code: `/||/`,
      errors: 3,
    },
    {
      code: `/(|)/`,
      errors: 1,
    },
    {
      code: `/(?:|)/;`,
      errors: 1,
    },
    {
      code: `/(a|)?/`,
      errors: 1,
    },
    {
      code: `/(a|)*/`,
      errors: 1,
    },
    {
      code: `/(a|){1,3}/`,
      errors: 1,
    },
    {
      code: `new RegExp('|')`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 13,
          endColumn: 14,
        },
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 13,
          endColumn: 14,
        },
      ],
    },
    {
      code: `new RegExp('a\\n(|)')`,
      errors: [
        {
          message: 'Remove this empty alternative.',
          line: 1,
          endLine: 1,
          column: 18,
          endColumn: 19,
        },
      ],
    },
  ],
});
