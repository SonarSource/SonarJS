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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S3735', () => {
  it('S3735', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    const ruleTesterTs = new RuleTester();

    ruleTesterJs.run('"void" should not be used JS', rule, {
      valid: [
        {
          code: `
            (function() {
            })()
            `,
        },
        {
          code: `
            void 0;
            `,
        },
        {
          code: `
            void (0);
            `,
        },
        {
          code: `
            void function() {
            }()
            `,
        },
        {
          code: `
            void (() => 42) ()
            `,
        },
        {
          code: `
            const f = () => {};
            void f(); // FN: should raise since 'f()' is not a promise but we are missing type information`,
        },
      ],
      invalid: [
        {
          code: `void 42;`,
          errors: [
            {
              message: `Remove this use of the \"void\" operator.`,
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 5,
            },
          ],
        },
      ],
    });

    ruleTesterTs.run('"void" should not be used TS', rule, {
      valid: [
        {
          code: `void 0;`,
        },
        {
          code: `
            const p = new Promise(() => {});
            void p;
            `,
        },
        {
          code: `
            const f = () => { return new Promise(() => {}); };
            void f();
            `,
        },
      ],
      invalid: [
        {
          code: `void 42;`,
          errors: 1,
        },
      ],
    });
  });
});
