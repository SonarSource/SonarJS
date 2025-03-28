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

const ruleTester = new DefaultParserRuleTester();

describe('S1121', () => {
  it('S1121', () => {
    ruleTester.run('Assignments should not be made from within sub-expressions', rule, {
      valid: [
        {
          code: `let a = 0;`,
        },
        {
          code: `let a = 0, b = 1, c = 2;`,
        },
        {
          code: `let [a, b] = arr;`,
        },
        {
          code: `let {a, b} = obj;`,
        },
        {
          code: `a = 0;`,
        },
        {
          code: `function fun() { a = 0; }`,
        },
        {
          code: `a[i] = 0;`,
        },
        {
          code: `a.prop = 0;`,
        },
        {
          code: `(fun())[i] = 0;`,
        },
        {
          code: `a = b = c = 0;`,
        },
        {
          code: `a = 0, b = 0, c = 0;`,
        },
        {
          code: `({a, b} = obj);`,
        },
        {
          code: `([a, b] = arr);`,
        },
        {
          code: `for (var i = 0;;) {}`,
        },
        {
          code: `for (i = 0;;) {}`,
        },
        {
          code: `for (i = j = 0;;) {}`,
        },
        {
          code: `for (i, j = 0;;) {}`,
        },
        {
          code: `for (;; i = 0) {}`,
        },
        {
          code: `let f = a => b = a;`,
        },
        {
          code: `let f = a => (b = a);`,
        },
        {
          code: `
      while ((line = reader.readLine()) !== null) {
        doSomething();
      }
      `,
        },
        {
          code: `while (a = 0) {}`,
        },
        {
          code: `do {} while (a = 0);`,
        },
        {
          code: `a || (a = 0);`,
        },
        {
          code: `a && (a = 0);`,
        },
        {
          code: `if (a, b = 0) {}`,
        },
        {
          code: `for (; i, j = 0;);`,
        },
        {
          code: `for (; (j = i) === 0;);`,
        },
        {
          code: `let a = b = c = 0;`,
        },
        {
          code: `let a = (b = (c = 0));`,
        },
        {
          code: `let f = a => (a = (b = 0));`,
        },
      ],
      invalid: [
        {
          code: `if (a = 0) {}`,
          errors: [
            {
              message: `Extract the assignment of "a" from this expression.`,
              line: 1,
              endLine: 1,
              column: 7,
              endColumn: 8,
            },
          ],
        },
        {
          code: `if (a = b = 0) {}`,
          errors: 1,
        },
        {
          code: `if ((a = 0) && b) {}`,
          errors: 1,
        },
        {
          code: `if ((fun())[i] = 0) {}`,
          errors: 1,
        },
        {
          code: `(a = 0) ? b : c;`,
          errors: 1,
        },
        {
          code: `a ? b = 0 : c;`,
          errors: 1,
        },
        {
          code: `fun(a = 0);`,
          errors: 1,
        },
        {
          code: `fun(a = b = c = 0);`,
          errors: 1,
        },
        {
          code: `fun(a, b = 0);`,
          errors: 1,
        },
        {
          code: `for (; i = 0;);`,
          errors: 1,
        },
        {
          code: `for (; i = j = 0;);`,
          errors: 1,
        },
        {
          code: `let a = [ a = 0 ];`,
          errors: 1,
        },
        {
          code: `let a = { a: b = 0 };`,
          errors: 1,
        },
        {
          code: `let a = { [a = 0]: b };`,
          errors: 1,
        },
        {
          code: `function* foo() { yield (a = 0); }`,
          errors: 1,
        },
        {
          code: `-(a = 0);`,
          errors: 1,
        },
        {
          code: `(a = 0) % b;`,
          errors: 1,
        },
        {
          code: `a[b = 0];`,
          errors: 1,
        },
        {
          code: `(a = 0) ? b = 1 : c = 2`,
          errors: 3,
        },
        {
          code: `new C(a = 0);`,
          errors: 1,
        },
        {
          code: '`hello${a = 0}`',
          errors: 1,
        },
        {
          code: 'myTag`hello${a = 0}`',
          errors: 1,
        },
        {
          code: `class C { [a = 0]() {} }`,
          errors: 1,
        },
        {
          code: `async () => await (a = 0);`,
          errors: 1,
        },
        {
          code: `switch (a = 0) { case (b = 0): break; }`,
          errors: 2,
        },
        {
          code: `function foo() { return (a = 0); }`,
          errors: 1,
        },
        {
          code: `throw (a = 0);`,
          errors: 1,
        },
        {
          code: `for (;a = 0;) {}`,
          errors: 1,
        },
        {
          code: `(a = 0) || a;`,
          errors: 1,
        },
      ],
    });
  });
});
