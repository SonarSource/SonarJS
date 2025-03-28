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

describe('S5850', () => {
  it('S5850', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Anchor precedence', rule, {
      valid: [
        {
          code: `/^(?:a|b|c)$/`,
        },
        {
          code: `/(?:^a)|b|(?:c$)/`,
        },
        {
          code: `/^abc$/`,
        },
        {
          code: `/a|b|c/`,
        },
        {
          code: `/^a$|^b$|^c$/`,
        },
        {
          code: `/^a$|b|c/`,
        },
        {
          code: `/a|b|^c$/`,
        },
        {
          code: `/^a|^b$|c$/`,
        },
        {
          code: `/^a|^b|c$/`,
        },
        {
          code: `/^a|b$|c$/`,
        },
        {
          code: `/^a|^b|c/`, // More likely intential as there are multiple anchored alternatives
        },
        {
          code: `/aa|bb|cc/`,
        },
        {
          code: `/^/`,
        },
        {
          code: `/^[abc]$/`,
        },
        {
          code: `/|/`,
        },
      ],
      invalid: [
        {
          code: `/^a|b|c$/`,
          errors: [
            {
              message:
                'Group parts of the regex together to make the intended operator precedence explicit.',
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 9,
            },
          ],
        },
        {
          code: `/^a|b|cd/`,
          errors: 1,
        },
        {
          code: `/a|b|c$/`,
          errors: 1,
        },
        {
          code: `/^a|(b|c)/`,
          errors: 1,
        },
        {
          code: `/(a|b)|c$/`,
          errors: 1,
        },
      ],
    });
  });
});
