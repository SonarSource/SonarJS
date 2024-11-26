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
ruleTester.run('Empty groups', rule, {
  valid: [
    {
      code: `/\\(\\)/`,
    },
    {
      code: `/(a)/`,
    },
    {
      code: `/(a|)/`,
    },
    {
      code: `/(a|b)/`,
    },
    {
      code: `/(\d+)/`,
    },
  ],
  invalid: [
    {
      code: `/()/`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 4,
        },
      ],
    },
    {
      code: `new RegExp("\\u{000000000061}()")`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 29,
          endColumn: 31,
        },
      ],
    },
    {
      code: `/(|)/`,
      errors: 1,
    },
    {
      code: `/(?:)/`,
      errors: 1,
    },
    {
      code: `new RegExp('')`, // parsed as /(?:)/
      errors: 1,
    },
    {
      // \u0009 is unicode escape for TAB
      code: `new RegExp('\\u0009(|)')`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 19,
          endColumn: 22,
        },
      ],
    },
    {
      code: `new RegExp('\\t(|)')`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 15,
          endColumn: 18,
        },
      ],
    },
    {
      code: `new RegExp('\\n(|)')`,
      errors: [
        {
          message: 'Remove this empty group.',
          line: 1,
          endLine: 1,
          column: 16,
          endColumn: 18,
        },
      ],
    },
  ],
});
