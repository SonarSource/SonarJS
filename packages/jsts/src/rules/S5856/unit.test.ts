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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('Malformed regular expressions', rule, {
  valid: [
    {
      code: `new RegExp("\\\\(\\\\[");`,
    },
    {
      code: `new RegExp("\\\\(\\\\[", "g");`,
    },
    {
      code: `str.match("\\\\(\\\\[");`,
    },
    {
      code: `str.replace("([", "{");`,
    },
    {
      code: `'xxx'.match();`,
    },
    {
      code: `foo.match('[');`,
    },
    {
      code: `
        new RegExp();
        new RegExp('foo', 4);
      `,
    },
  ],
  invalid: [
    {
      code: `new RegExp("([");`,
      errors: [
        {
          message: 'Invalid regular expression: /([/: Unterminated character class',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 17,
        },
      ],
    },
    {
      code: `'xxx'.match("([");`,
      errors: [
        {
          message: 'Invalid regular expression: /([/: Unterminated character class',
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 18,
        },
      ],
    },
    {
      code: `new RegExp("\\\\(\\\\[", "a");`,
      errors: [
        {
          message: "Invalid flags supplied to RegExp constructor 'a'",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 26,
        },
      ],
    },
  ],
});
