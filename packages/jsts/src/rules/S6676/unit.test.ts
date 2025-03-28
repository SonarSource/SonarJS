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

describe('S6676', () => {
  it('S6676', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(`Calls to .call() and .apply() methods should not be redundant`, rule, {
      valid: [
        {
          code: `foo.apply(obj, args);`,
        },
      ],
      invalid: [
        {
          code: `foo.call(null);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant call()',
                  output: `foo();`,
                },
              ],
            },
          ],
        },
        {
          code: `foo.call(null, a, b, c);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant call()',
                  output: `foo(a, b, c);`,
                },
              ],
            },
          ],
        },
        {
          code: `obj.foo.call(obj);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant call()',
                  output: `obj.foo();`,
                },
              ],
            },
          ],
        },
        {
          code: `obj.foo.call(obj, x, y, z);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant call()',
                  output: `obj.foo(x, y, z);`,
                },
              ],
            },
          ],
        },
        {
          code: `foo.apply(null, []);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant apply()',
                  output: `foo();`,
                },
              ],
            },
          ],
        },
        {
          code: `foo.apply(null, [1, 2, 3]);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant apply()',
                  output: `foo(1, 2, 3);`,
                },
              ],
            },
          ],
        },
        {
          code: `obj.foo.apply(obj, []);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant apply()',
                  output: `obj.foo();`,
                },
              ],
            },
          ],
        },
        {
          code: `obj.foo.apply(obj, [1, 2, 3]);`,
          errors: [
            {
              messageId: 'unnecessaryCall',
              suggestions: [
                {
                  desc: 'Remove redundant apply()',
                  output: `obj.foo(1, 2, 3);`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
