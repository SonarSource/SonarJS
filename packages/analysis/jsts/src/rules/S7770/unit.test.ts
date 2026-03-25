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
import { describe } from 'node:test';

describe('S7770', () => {
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S7770 skips type predicate functions', rule, {
    valid: [
      {
        // Type predicate function - should not report
        code: `const isString = (x: unknown): x is string => Boolean(x);`,
      },
      {
        // Type predicate function expression - should not report
        code: `const isNumber = function(x: unknown): x is number { return Boolean(x); };`,
      },
      {
        // Regular valid code
        code: `const x = Boolean;`,
      },
    ],
    invalid: [
      {
        // Regular function without type predicate - should report
        code: `const toBoolean = (x: unknown) => Boolean(x);`,
        output: `const toBoolean = Boolean;`,
        errors: [{ messageId: 'prefer-native-coercion-functions' }],
      },
    ],
  });
});
