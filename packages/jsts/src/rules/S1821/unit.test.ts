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
import { rule } from './rule.js';
import { JavaScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTester = new JavaScriptRuleTester();

const messageId = 'removeNestedSwitch';

ruleTester.run('switch statements should not be nested', rule, {
  valid: [
    {
      code: `switch (x) {
        case 1: a; break;
        default: b;
      };`,
    },
  ],
  invalid: [
    {
      code: `switch (x) {
        case 1: a; break;
        case 2:
          switch (y) {
            case 3: c; break;
            default: d;
          };
          break;
        default: b;
    }`,
      errors: [
        {
          messageId,
          line: 4,
          endLine: 4,
          column: 11,
          endColumn: 17,
        },
      ],
    },
    {
      code: `switch (x) {
            case 1: a; break;
            case 2: {
              switch (y) {
                case 3: c; break;
                default: d;
              };
              switch (z) {
                case 3: c; break;
                default: d;
              };
              break;
            }
            default: b;
          }`,
      errors: [
        {
          messageId,
          line: 4,
          endLine: 4,
          column: 15,
          endColumn: 21,
        },
        {
          messageId,
          line: 8,
          endLine: 8,
          column: 15,
          endColumn: 21,
        },
      ],
    },
    {
      code: `switch (x) {
            case 1: a; break;
            case 2:
              switch (y) {
                case 3: c;
                default:
                  switch (z) {
                    case 4: d; break;
                    default: e;
                }
              }
              break;
            default: b;
          }`,
      errors: [
        {
          messageId,
          line: 4,
          endLine: 4,
          column: 15,
          endColumn: 21,
        },
        {
          messageId,
          line: 7,
          endLine: 7,
          column: 19,
          endColumn: 25,
        },
      ],
    },
    {
      code: `switch (x) {
            case 1: a;
            case 2: b;
            default:
              switch (y) {
                case 3: c;
                default: d;
              }
        }`,
      errors: [
        {
          messageId,
          line: 5,
          endLine: 5,
          column: 15,
          endColumn: 21,
        },
      ],
    },
    {
      code: `switch (x) {
            case 1:
              let isideFunction = () => {
                switch (y) {}
              }
          }`,
      errors: [
        {
          messageId,
          line: 4,
          endLine: 4,
          column: 17,
          endColumn: 23,
        },
      ],
    },
  ],
});
