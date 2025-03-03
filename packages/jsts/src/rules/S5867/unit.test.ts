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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S5867', () => {
  it('S5867', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(`Regular expressions using Unicode constructs with the 'u' flag`, rule, {
      valid: [
        {
          code: `/\\u{1234}/u`,
        },
        {
          code: `/\\u{12346}/u`,
        },
        {
          code: `/\\p{Alpha}/u`,
        },
        {
          code: `/\\p{Script=Latin}/u`,
        },
        {
          code: `/\\P{Alpha}/u`,
        },
        {
          code: `/[\\p{Alpha}]/u`,
        },
        {
          code: `/\\p/`,
        },
        {
          code: `/\\p{/`,
        },
        {
          code: `/\\p{a/`,
        },
        {
          code: `/\\p{a=/`,
        },
        {
          code: `/\\p{a=b/`,
        },
        {
          code: `/a+/u`,
        },
        {
          code: `/\\u{12}/`,
        },
        {
          code: `/\\u{12,34}/`,
        },
      ],
      invalid: [
        {
          code: `/\\u{1234}/`,
          errors: [
            {
              message: JSON.stringify({
                message: `Enable the 'u' flag for this regex using Unicode constructs.`,
                secondaryLocations: [
                  { message: `Unicode character`, column: 1, line: 1, endColumn: 9, endLine: 1 },
                ],
              }),
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 11,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `/\\u{12346}/`,
          errors: 1,
        },
        {
          code: `/\\p{Alpha}/`,
          errors: [
            {
              message: JSON.stringify({
                message: `Enable the 'u' flag for this regex using Unicode constructs.`,
                secondaryLocations: [
                  { message: `Unicode property`, column: 1, line: 1, endColumn: 11, endLine: 1 },
                ],
              }),
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 12,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `/\\P{Alpha}/`,
          errors: 1,
        },
        {
          code: `/\\P{Script=Latin}/`,
          errors: 1,
        },
        {
          code: `/[\\p{Alpha}]/`,
          errors: 1,
        },
      ],
    });
  });
});
