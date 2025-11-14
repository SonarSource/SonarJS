/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

describe('S3984', () => {
  it('S3984', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Exception should not be created without being thrown', rule, {
      valid: [
        {
          code: `foo(new Error());`,
        },
        {
          code: `foo(TypeError);`,
        },
        {
          code: `throw new Error();`,
        },
        {
          code: `new LooksLikeAnError().doSomething();`,
        },
      ],
      invalid: [
        {
          code: `new Error();`,
          errors: [
            {
              message: 'Throw this error or remove this useless statement.',
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 12,
              suggestions: [
                {
                  desc: 'Throw this error',
                  output: 'throw new Error();',
                },
              ],
            },
          ],
        },
        {
          code: `new TypeError();`,
          errors: 1,
        },
        {
          code: `new MyError();`,
          errors: 1,
        },
        {
          code: `new A.MyError();`,
          errors: 1,
        },
        {
          code: `new A(function () {
                new SomeError();
            });`,
          errors: 1,
        },
        {
          code: `(new MyException());`,
          errors: [
            {
              messageId: 'throwOrRemoveError',
              suggestions: [{ desc: 'Throw this error', output: 'throw (new MyException());' }],
            },
          ],
        },
      ],
    });
  });
});
