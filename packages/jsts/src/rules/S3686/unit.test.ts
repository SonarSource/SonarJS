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

describe('S3686', () => {
  it('S3686', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Functions should not be called both with and without "new"', rule, {
      valid: [
        {
          code: `function foo(){ }
        foo();
        foo(1);`,
        },
        {
          code: `function foo(){ }
          new foo();
          new foo(1);`,
        },
        {
          code: `function bar() {
                function bar() {}
                var a = new bar();
            }
            var b = bar(); // OK`,
        },
        {
          code: `                
        Number(x);
        new Number(x);`,
        },
        {
          code: `const a = new A();
        a.foo();
        new a.foo();`,
        },
      ],
      invalid: [
        {
          code: `var x = external();
              x();
              x();
              var xx = new x();
              x();`,
          errors: [
            {
              message:
                '{"message":"Correct the use of this function; on line 3 it was called without \\"new\\".","secondaryLocations":[{"column":14,"line":3,"endColumn":15,"endLine":3}]}',
              line: 4,
              endLine: 4,
              column: 28,
              endColumn: 29,
            },
          ],
          options: ['sonar-runtime'],
        },
        {
          code: `function MyObj() { }
                var obj = new MyObj();
                MyObj(); // Noncompliant
                
                obj = new MyObj();
                MyObj();`,
          errors: [
            {
              message:
                '{"message":"Correct the use of this function; on line 2 it was called with \\"new\\".","secondaryLocations":[{"column":30,"line":2,"endColumn":35,"endLine":2}]}',
              line: 3,
              endLine: 3,
              column: 17,
              endColumn: 22,
            },
          ],
          options: ['sonar-runtime'],
        },
      ],
    });
  });
});
