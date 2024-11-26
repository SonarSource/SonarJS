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
import { rule } from './index.js';
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018 },
});
ruleTester.run('"switch" statements should have "default" clauses', rule, {
  valid: [
    {
      code: `
        switch (x) {
          case 0:
            break;
          default:
            break;
        }`,
    },
  ],
  invalid: [
    {
      code: `
        switch (x) {
          case 0:
            break;
        }`,
      errors: [
        {
          message: `Add a "default" clause to this "switch" statement.`,
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 15,
          suggestions: [
            {
              messageId: 'addDefault',
              output: `
        switch (x) {
          case 0:
            break;
          default: { throw new Error('Not implemented yet'); }
        }`,
            },
          ],
        },
      ],
    },
    {
      code: `
        switch (x) {
        }`,
      errors: [
        {
          line: 2,
          suggestions: [
            {
              output: `
        switch (x) {
        default: { throw new Error('Not implemented yet'); }
        }`,
            },
          ],
        },
      ],
    },
    {
      code: `
        type  T = 'foo' | 'bar'; // False negative due to missing type information
        const x = 'foo' as T;
        switch (x) {
          case 'foo':
            break;
          case 'bar':
            break;
        }
      `,
      errors: [{ line: 4 }],
    },
  ],
});

const typeAwareRuleTester = new TypeScriptRuleTester();
typeAwareRuleTester.run('"switch" statements should have "default" clauses', rule, {
  valid: [
    {
      code: `
        type  T = 'foo' | 'bar';
        const x = 'foo' as T;
        switch (x) {
          case 'foo':
            break;
          case 'bar':
            break;
        }
      `,
    },
    {
      code: `
      enum Direction {
        Up,
        Down
      }

      let dir: Direction;
      switch (dir) {
        case Direction.Up:
          doSomething();
          break;
        case Direction.Down:
          doSomethingElse();
          break;
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
        type  T = 'foo' | 'bar';
        const x = 'foo' as T;
        switch (x) {
          case 'foo':
            break;
        }
      `,
      errors: [
        {
          message: `Switch is not exhaustive. Cases not matched: "bar"`,
          line: 4,
          endLine: 4,
          column: 9,
          endColumn: 15,
          suggestions: [
            {
              messageId: 'addMissingCases',
              output: `
        type  T = 'foo' | 'bar';
        const x = 'foo' as T;
        switch (x) {
          case 'foo':
            break;
          case "bar": { throw new Error('Not implemented yet: "bar" case') }
        }
      `,
            },
          ],
        },
      ],
    },
  ],
});
