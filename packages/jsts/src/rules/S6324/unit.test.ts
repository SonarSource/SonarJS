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
ruleTester.run('No control characters in regular expressions', rule, {
  valid: [
    {
      code: `/0/`,
    },
    {
      code: `/\\0/`,
    },
    {
      code: `/\\x20/`,
    },
    {
      code: `/\\u0020/`,
    },
    {
      code: `/\\u{001F}/`,
    },
    {
      code: `/\\cA/`,
    },
    {
      code: String.raw`new RegExp('\t')`,
    },
    {
      code: String.raw`new RegExp('\n')`,
    },
  ],
  invalid: [
    {
      code: `/\\x00/`,
      errors: [
        {
          message: 'Remove this control character.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 6,
        },
      ],
    },
    {
      code: `/\\u001F/`,
      errors: [
        {
          message: 'Remove this control character.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 8,
        },
      ],
    },
    {
      code: `/\\u{001F}/u`,
      errors: [
        {
          message: 'Remove this control character.',
          line: 1,
          endLine: 1,
          column: 2,
          endColumn: 10,
        },
      ],
    },
    {
      code: "var regex = new RegExp('\\x1f\\x1e')",
      errors: [
        {
          message: String.raw`Remove this control character.`,
          line: 1,
          endLine: 1,
          column: 25,
          endColumn: 29,
        },
        {
          message: String.raw`Remove this control character.`,
          line: 1,
          endLine: 1,
          column: 29,
          endColumn: 33,
        },
      ],
    },
    {
      code: "var regex = new RegExp('\\x1fFOO\\x00')",
      errors: 2,
    },
    {
      code: "var regex = new RegExp('FOO\\x1fFOO\\x1f')",
      errors: 2,
    },
    {
      code: "var regex = RegExp('\\x1f')",
      errors: 1,
    },
    {
      code: String.raw`const flags = ''; new RegExp("\\u001F", flags)`,
      errors: 1,
    },
  ],
});
