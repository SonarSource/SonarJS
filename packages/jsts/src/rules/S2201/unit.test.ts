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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2201', () => {
  it('2201', () => {
    const ruleTester = new RuleTester();

    ruleTester.run(
      'Return values from functions without side effects should not be ignored',
      rule,
      {
        valid: [],
        invalid: [
          {
            code: `
      function methodsOnMath() {
        let x = -42;
        Math.abs(x);
      }`,
            errors: [
              {
                messageId: `returnValueMustBeUsed`,
                data: { methodName: 'abs' },
                line: 4,
                endLine: 4,
                column: 9,
                endColumn: 20,
              },
            ],
          },
        ],
      },
    );
  });
});
