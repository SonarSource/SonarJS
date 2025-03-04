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
import { rule } from './rule.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new RuleTester();

describe('S1066', () => {
  it('S1066', () => {
    ruleTester.run('no-collapsible-if', rule, {
      valid: [
        {
          code: `
      if (x) {
        console.log(x);
      }`,
        },
        {
          code: `
      if (x) {
        if (y) {}
          console.log(x);
      }`,
        },
        {
          code: `
      if (x) {
        console.log(x);
        if (y) {}
      }`,
        },
        {
          code: `
      if (x) {
        if (y) {}
      } else {}`,
        },
        {
          code: `
      if (x) {
        if (y) {} else {}
      }`,
        },
      ],

      invalid: [
        {
          code: `
      if (x) {
    //^^ > {{Merge this if statement with the nested one.}}
        if (y) {}
      //^^ {{Nested "if" statement.}}
      }`,
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message: 'Merge this if statement with the nested one.',
                  secondaryLocations: [
                    {
                      message: 'Nested "if" statement.',
                      column: 8,
                      line: 4,
                      endColumn: 10,
                      endLine: 4,
                    },
                  ],
                }),
              },
              line: 2,
              column: 7,
              endLine: 2,
              endColumn: 9,
            },
          ],
        },
        {
          code: `
      if (x)
        if(y) {}`,
          errors: [{ messageId: 'mergeNestedIfStatement' }],
        },
        {
          code: `
      if (x) {
        if(y) {
          if(z) {
          }
        }
      }`,
          errors: [
            { messageId: 'mergeNestedIfStatement' },
            { messageId: 'mergeNestedIfStatement' },
          ],
        },
      ],
    });
  });
});
