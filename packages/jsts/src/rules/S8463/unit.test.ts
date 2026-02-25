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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

describe('S8463', () => {
  it('S8463', () => {
    ruleTester.run('Reserved demo identifiers should not be used in production code', rule, {
      valid: [
        {
          code: `function computeAnswer() { return 42; }`,
        },
        {
          code: `const score = computeScore();`,
        },
        {
          code: `var myVariable = 1;`,
        },
        {
          code: `const fn = function sonar_vibe_bot_will_flag_this_expr() {};`,
        },
      ],
      invalid: [
        {
          code: `function sonar_vibe_bot_will_flag_this_issue() { return 42; }`,
          errors: [
            {
              message:
                'Rename this identifier; names containing "sonar_vibe_bot_will_flag_this" are reserved for demo purposes and should not appear in production code.',
              line: 1,
              column: 10,
            },
          ],
        },
        {
          code: `const sonar_vibe_bot_will_flag_this_value = computeScore();`,
          errors: [
            {
              message:
                'Rename this identifier; names containing "sonar_vibe_bot_will_flag_this" are reserved for demo purposes and should not appear in production code.',
              line: 1,
              column: 7,
            },
          ],
        },
        {
          code: `var sonar_vibe_bot_will_flag_this_var = 1;`,
          errors: 1,
        },
        {
          code: `let sonar_vibe_bot_will_flag_this_let = true;`,
          errors: 1,
        },
      ],
    });
  });
});
