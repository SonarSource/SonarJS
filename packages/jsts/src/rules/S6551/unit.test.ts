/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SÃ rl
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S6551', () => {
  it('S6551', () => {
    const ruleTester = new RuleTester();
    const code = `
      function maybeString(foo: string | {}) {
        foo.toString();
      }
    `;
    ruleTester.run('Objects and classes converted to strings should define toString', rule, {
      valid: [
        {
          code,
          filename: 'rule.test.ts',
        },
      ],
      invalid: [
        {
          code,
          filename: 'rule.ts',
          errors: 1,
        },
      ],
    });
  });
});
