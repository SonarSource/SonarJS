/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run(`"switch" statements should not contain non-case labels`, rule, {
  valid: [
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          break;
      }
      `,
    },
    {
      code: `
      l: while (b) {}
      `,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          function f() {
            l: while (b) {}
          }
      }
      `,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          let f = function () {
            l: while (b) {}
          }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          l: while (b) {}
      }
      `,
      errors: [
        {
          message: `Remove this misleading "l" label.`,
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          if (b) {
            l: while (v) {}
          }
      }
      `,
      errors: 1,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          switch (l) {
            case 0:
            case 1:
              l: while (b) {}
          }
      }
      `,
      errors: 1,
    },
    {
      code: `
      switch (k) {
        case 0:
        case 1:
          l: while (b) {}
          switch (j) {
            case 0:
            case 1:
              m: while (v) {}
          }
      }
      `,
      errors: 2,
    },
  ],
});
