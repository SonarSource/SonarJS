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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new DefaultParserRuleTester();

describe('S6958', () => {
  it('S6958', () => {
    ruleTester.run('no-literal-call', rule, {
      valid: [
        { code: 'foo();' },
        { code: 'obj.foo();' },
        { code: '(function() {})();' },
        { code: '(() => 0)();' },
        { code: 'foo``;' },
        { code: 'obj.foo``;' },
        { code: '(function() {})``;' },
        { code: '(() => 0)``;' },
      ],
      invalid: [
        {
          code: 'true();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 5,
            },
          ],
        },
        {
          code: 'true``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 5,
            },
          ],
        },
        {
          code: 'false();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 6,
            },
          ],
        },
        {
          code: 'false``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 6,
            },
          ],
        },
        {
          code: 'null();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 5,
            },
          ],
        },
        {
          code: 'null``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 5,
            },
          ],
        },
        {
          code: '100();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 4,
            },
          ],
        },
        {
          code: '100``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 4,
            },
          ],
        },
        {
          code: '"hello"();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 8,
            },
          ],
        },
        {
          code: '`hello```;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 8,
            },
          ],
        },
        {
          code: '/abc/();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 6,
            },
          ],
        },
        {
          code: '/abc/``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 6,
            },
          ],
        },
        {
          code: '[1,2,3]();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 8,
            },
          ],
        },
        {
          code: '[1,2,3]``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 8,
            },
          ],
        },
        {
          code: '({foo: 0})();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 2,
              endColumn: 10,
            },
          ],
        },
        {
          code: '({foo: 0})``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 2,
              endColumn: 10,
            },
          ],
        },
        {
          code: '`hello`();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 1,
              endColumn: 8,
            },
          ],
        },
        {
          code: '"hello"``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 1,
              endColumn: 8,
            },
          ],
        },
        {
          code: '(class A {})();',
          errors: [
            {
              messageId: 'asFunction',
              line: 1,
              column: 2,
              endColumn: 12,
            },
          ],
        },
        {
          code: '(class A {})``;',
          errors: [
            {
              messageId: 'asTagFunction',
              line: 1,
              column: 2,
              endColumn: 12,
            },
          ],
        },
      ],
    });
  });
});
