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

describe('S6660', () => {
  it('S6660', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run("'If' statement should not be the only statement in 'else' block", rule, {
      valid: [
        {
          code: `
        if (condition) {
          doSomething();
        }
      `,
        },
      ],
      invalid: [
        {
          code: `
        if (condition1) {
          // ...
        } else {
          if (condition2) {
            // ...
          }
        }
      `,
          output: `
        if (condition1) {
          // ...
        } else if (condition2) {
            // ...
          }
      `,
          errors: [
            {
              message: "'If' statement should not be the only statement in 'else' block",
              line: 5,
              endLine: 5,
              column: 11,
              endColumn: 13,
            },
          ],
        },
        {
          code: `
        if (condition3) {
          // ...
        } else {
          if (condition4) {
            // ...
          } else {
            // ...
          }
        }
      `,
          output: `
        if (condition3) {
          // ...
        } else if (condition4) {
            // ...
          } else {
            // ...
          }
      `,
          errors: [
            {
              message: "'If' statement should not be the only statement in 'else' block",
              line: 5,
              endLine: 5,
              column: 11,
              endColumn: 13,
            },
          ],
        },
      ],
    });
  });
});
