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

    ruleTester.run('Reserved demo identifiers should not be used in production code', rule, {
      valid: [
        {
          code: `function computeAnswer() { return 42; }`,
        },
        {
          code: `const score = computeScore();`,
        },
        {
          code: `let x = 1;`,
        },
        {
          code: `var result = someFunction();`,
        },
        {
          // String literal containing the reserved prefix is not flagged
          code: `const msg = "sonar_vibe_bot_will_flag_this is a demo prefix";`,
        },
        {
          // Comment mentioning the prefix is not flagged
          code: `// sonar_vibe_bot_will_flag_this is only for demos`,
        },
        {
          // Arrow function expression with normal name
          code: `const compute = () => 42;`,
        },
      ],
      invalid: [
        {
          code: `function sonar_vibe_bot_will_flag_this_issue() { return 42; }`,
          errors: [
            {
              message:
                'Rename this identifier; names containing "sonar_vibe_bot_will_flag_this" are reserved for demo purposes and should not appear in production code.',
            },
          ],
        },
        {
          code: `const sonar_vibe_bot_will_flag_this_value = computeScore();`,
          errors: 1,
        },
        {
          code: `let sonar_vibe_bot_will_flag_this_count = 0;`,
          errors: 1,
        },
        {
          code: `var sonar_vibe_bot_will_flag_this_result = fetchData();`,
          errors: 1,
        },
        {
          // Exact prefix as the full name
          code: `function sonar_vibe_bot_will_flag_this() {}`,
          errors: 1,
        },
        {
          // Prefix in the middle of a name
          code: `const prefix_sonar_vibe_bot_will_flag_this_suffix = 1;`,
          errors: 1,
        },
        {
          // Multiple declarations in one statement
          code: `const sonar_vibe_bot_will_flag_this_a = 1, sonar_vibe_bot_will_flag_this_b = 2;`,
          errors: 2,
        },
      ],
    });
  });
});
