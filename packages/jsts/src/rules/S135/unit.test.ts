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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTesterJs = new DefaultParserRuleTester();
const ruleTesterTs = new RuleTester();

const testCases = {
  valid: [
    {
      code: `
            for (i = 0; i < 10; i++) {
              if (i % 3 == 0) {
                break;
              }
            }
            `,
    },
    {
      code: `
            for (i = 0; i < 10; i++) {
              switch (i) {
                case 0:
                  break;
                default:
                  break;
              }
            }
            `,
    },
    {
      code: `
            for (i = 0; i < 10; i++) {
              label1: if (i % 3 == 0) {
                break label1;
              }
              label2: if (i % 3 == 0) {
                break label2;
              }
            }
            `,
    },
  ],
  invalid: [
    {
      code: `
            for (i = 0; i < 10; i++) {
              if (i % 3 == 0) {
                break;
              }
              if (i % 3 == 0) {
                continue;
              }
            }
            `,
      errors: [
        {
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 16,
          message: JSON.stringify({
            message:
              'Reduce the total number of "break" and "continue" statements in this loop to use one at most.',
            secondaryLocations: [
              {
                message: '"break" statement.',
                column: 16,
                line: 4,
                endColumn: 22,
                endLine: 4,
              },
              {
                message: '"continue" statement.',
                column: 16,
                line: 7,
                endColumn: 25,
                endLine: 7,
              },
            ],
          }),
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
            label: for (i = 0; i < 10; i++) {
              for (j = 0; j < 10; j++) {
                break label;
              }
              if (i % 3 == 0) {
                break;
              }
            }
            `,
      errors: 1,
    },
    {
      code: `
            label: for (i = 0; i < 10; i++) {
              for (j = 0; j < 10; j++) {
                continue label;
              }
              if (i % 3 == 0) {
                break;
              }
            }
            `,
      errors: 1,
    },
    {
      code: `
            label: for (i = 0; i < 10; i++) {
              switch (i) {
                case 0:
                  break label;
                default:
                  break label;
              }
            }
            `,
      errors: 1,
    },
    {
      code: `
            for (i = 0; i < 10; i++) {
              (function() {
                for (i = 0; i < 10; i++) {
                  if (i % 3 == 0) {
                    break;
                  }
                  if (i % 3 == 0) {
                    break;
                  }
                }
              })();
              if (i % 3 == 0) {
                break;
              }
            }
            `,
      errors: 1,
    },
    {
      code: `
            for (i = 0; i < 10; i++) {
              (function*() {
                  for (i = 0; i < 10; i++) {
                      if (i % 3 == 0) {
                          break;
                      }
                      if (i % 3 == 0) {
                          break;
                      }
                  }
              })();
              if (i % 3 == 0) {
                  break;
              }
            }
            `,
      errors: 1,
    },
    {
      code: `
            for (i = 0; i < 10; i++) {
              if (i % 3 == 1) {
                break;
              }
              if (i % 3 == 2) {
                continue;
              }
              if (i % 3 == 0) {
                continue;
              }
            }
            `,
      errors: 1,
    },
    {
      code: `
            for (var property in obj) {
              if (foo()) continue;
              if (bar) continue;
            }
            `,
      errors: 1,
    },
    {
      code: `
            for (const elem of array) {
              if (foo()) continue;
              if (bar) continue;
            }
            `,
      errors: 1,
    },
  ],
};

describe('S135', () => {
  it('S135', () => {
    ruleTesterJs.run(
      'Loops should not contain more than a single "break" or "continue" statement JS',
      rule,
      testCases,
    );
    ruleTesterTs.run(
      'Loops should not contain more than a single "break" or "continue" statement TS',
      rule,
      testCases,
    );
  });
});
