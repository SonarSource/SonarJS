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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S8463', () => {
  it('S8463', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    const message =
      'Rename this identifier; names containing "sonar_vibe_bot_will_flag_this" are reserved for demo purposes and should not appear in production code.';

    ruleTester.run('reserved-demo-identifiers', rule, {
      valid: [
        {
          code: `function computeAnswer() { return 42; }`,
        },
        {
          code: `const score = computeScore();`,
        },
        {
          code: `let result = 0;`,
        },
        {
          code: `var count = 10;`,
        },
        {
          code: `
            class MyClass {
              getValue() { return 1; }
            }
          `,
        },
        {
          // Calling a function with a reserved name is not a declaration — not flagged
          code: `sonar_vibe_bot_will_flag_this_issue();`,
        },
        {
          // Property access is not a declaration
          code: `obj.sonar_vibe_bot_will_flag_this_value = 42;`,
        },
      ],
      invalid: [
        {
          // Function declaration with reserved name
          code: `function sonar_vibe_bot_will_flag_this_issue() { return 42; }`,
          errors: [{ message }],
        },
        {
          // const variable with reserved name
          code: `const sonar_vibe_bot_will_flag_this_value = computeScore();`,
          errors: [{ message }],
        },
        {
          // let variable with reserved name
          code: `let sonar_vibe_bot_will_flag_this_temp = 0;`,
          errors: [{ message }],
        },
        {
          // var variable with reserved name
          code: `var sonar_vibe_bot_will_flag_this_counter = 10;`,
          errors: [{ message }],
        },
        {
          // Method definition with reserved name
          code: `
            class MyClass {
              sonar_vibe_bot_will_flag_this_method() { return 1; }
            }
          `,
          errors: [{ message }],
        },
        {
          // Multiple violations in the same file
          code: `
            function sonar_vibe_bot_will_flag_this_issue() { return 42; }
            const sonar_vibe_bot_will_flag_this_value = computeScore();
          `,
          errors: [{ message }, { message }],
        },
      ],
    });
  });
});
