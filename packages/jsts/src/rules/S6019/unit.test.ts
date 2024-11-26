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
ruleTesterTs.run('Reluctant quantifiers followed by an optional', rule, {
  valid: [
    {
      code: `
      /a*?x/;
      /a*?[abc]/;
      /|x|a*x/;
      `,
    },
  ],
  invalid: [
    {
      code: `/a*?$/`,
      errors: [
        {
          message: `Remove the '?' from this unnecessarily reluctant quantifier.`,
          line: 1,
          column: 2,
          endLine: 1,
          endColumn: 5,
        },
      ],
    },
    {
      code: `/a*?x?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
        },
      ],
    },
    {
      code: `/a*?x*/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
        },
      ],
    },
    {
      code: `/a{5,25}?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 5 repetitions.`,
        },
      ],
    },
    {
      code: `/a*?|a*?x?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
          column: 2,
        },
        {
          message: `Fix this reluctant quantifier that will only ever match 0 repetitions.`,
          column: 6,
        },
      ],
    },
    {
      code: `/a+?(x)?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 1 repetition.`,
        },
      ],
    },
    {
      code: `/foo_a+?/`,
      errors: [
        {
          message: `Fix this reluctant quantifier that will only ever match 1 repetition.`,
        },
      ],
    },
  ],
});
