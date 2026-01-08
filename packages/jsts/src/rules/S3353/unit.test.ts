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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S3353', () => {
  it('S3353', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('prefer-const', rule, {
      valid: [
        {
          // Variable is reassigned
          code: `let x = 1; x = 2;`,
        },
        {
          // JS-124: Variable read in callback before assignment
          code: `
            let x;
            foo(() => { console.log(x); });
            x = 1;
          `,
        },
        {
          // Conditional assignment - can't be const
          code: `
            let x;
            if (condition) {
              x = 1;
            } else {
              x = 2;
            }
          `,
        },
      ],
      invalid: [
        {
          // Initialized and never reassigned - should use const
          code: `let x = 1; console.log(x);`,
          output: `const x = 1; console.log(x);`,
          errors: [{ message: "'x' is never reassigned. Use 'const' instead." }],
        },
      ],
    });
  });
});
