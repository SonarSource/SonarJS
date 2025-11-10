/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { NoTypeCheckingRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3001', () => {
  it('S3001', () => {
    const tests = {
      valid: [
        {
          code: `
        var obj = { a: 1, b: 1};
        delete obj.a;`,
        },
        {
          code: `
        var obj = { a: 1, b: 1};
        delete obj['a'];`,
        },
        {
          code: `
        var arr = [1, 2];
        delete arr[0];`,
        },
        {
          code: `
        var arr = [1, 2];
        var idx = 0;
        delete arr[idx];`,
        },
        {
          code: `
        glob = 5;
        delete glob;
      `,
        },
        {
          code: `
        fun = function () {};
        delete fun;
      `,
        },
        {
          code: `
        var obj = { a: possiblyUndefined() };
        delete obj?.a;`,
        },
      ],
      invalid: [
        {
          code: `
        var v = 1;
        delete v;`,
          errors: [
            {
              message: `Remove this "delete" operator or pass an object property to it.`,
              line: 3,
              endLine: 3,
              column: 9,
              endColumn: 17,
            },
          ],
        },
        {
          code: `
        function fun(p) {
          delete p;
        }`,
          errors: 1,
        },
        {
          code: `delete foo().bar();`,
          errors: 1,
        },
        {
          code: `
        var v = 1;
        delete v + 1;`,
          errors: 1,
        },
        {
          code: `
        var obj = { a: 1, b: 2};
        delete obj;`,
          errors: 1,
        },
      ],
    };

    const ruleTesterJs = new NoTypeCheckingRuleTester();
    const ruleTesterTs = new RuleTester();

    ruleTesterJs.run('"delete" should be used only with object properties [js]', rule, tests);
    ruleTesterTs.run('"delete" should be used only with object properties [ts]', rule, tests);
  });
});
