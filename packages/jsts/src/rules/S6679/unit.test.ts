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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S6679', () => {
  it('S6679', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('Number.isNaN() should be used to check for NaN value', rule, {
      valid: [{ code: `x > x` }, { code: `x < x` }, { code: `x >= x` }, { code: `x <= x` }],
      invalid: [
        {
          code: `x === x`,
          errors: [
            {
              message: "Use 'Number.isNaN()' to check for 'NaN' value",
              suggestions: [
                {
                  desc: `Replace self-compare with Number.isNaN()`,
                  output: `!Number.isNaN(x)`,
                },
              ],
            },
          ],
        },
        {
          code: `x == x`,
          errors: [
            {
              message: "Use 'Number.isNaN()' to check for 'NaN' value",
              suggestions: [
                {
                  desc: `Replace self-compare with Number.isNaN()`,
                  output: `!Number.isNaN(x)`,
                },
              ],
            },
          ],
        },
        {
          code: `x !== x`,
          errors: [
            {
              message: "Use 'Number.isNaN()' to check for 'NaN' value",
              suggestions: [
                {
                  desc: `Replace self-compare with Number.isNaN()`,
                  output: `Number.isNaN(x)`,
                },
              ],
            },
          ],
        },
        {
          code: `x != x`,
          errors: [
            {
              message: "Use 'Number.isNaN()' to check for 'NaN' value",
              suggestions: [
                {
                  desc: `Replace self-compare with Number.isNaN()`,
                  output: `Number.isNaN(x)`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
