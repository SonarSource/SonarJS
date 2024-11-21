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
ruleTester.run('Regex with multiple spaces', rule, {
  valid: [
    {
      code: `/ /`,
    },
    {
      code: `/ {2}/`,
    },
    {
      code: `/ a /`,
    },
    {
      // will be reported by S5869
      code: `/[   ]/`,
    },
    {
      code: `
        / ( )/;
        /a | b/;
        / .* /;
        / \\w /;
        / . /;
        / \\b /;`,
    },
  ],
  invalid: [
    {
      code: `/a   b /`,
      errors: [
        {
          message: 'If multiple spaces are required here, use number quantifier ({3}).',
          line: 1,
          endLine: 1,
          column: 3,
          endColumn: 6,
          suggestions: [
            {
              desc: 'Use quantifier {3}',
              output: `/a {3}b /`,
            },
          ],
        },
      ],
    },
    {
      code: `/  a  /`,
      errors: 2,
    },
    {
      code: `/   */; /  +/; /  {2}/; /  ?/ `,
      errors: 4,
    },
    {
      code: `/(a  b)/ `,
      errors: 1,
    },
    {
      code: `
        /  ( )/;
        /a  | b/;
        /  .* /;
        /  \\w /;
        /  . /;
        /  \\b /;`,
      errors: 6,
    },
  ],
});
