/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

describe('S104', () => {
  it('S104', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Too many lines in file', rule, {
      valid: [
        {
          code: `a;
             b;
             c;`,
          options: [{ maximum: 3 }],
        },
        {
          code: `a;

             b;
             // comment
             c;`,
          options: [{ maximum: 3 }],
        },
      ],
      invalid: [
        {
          code: `a;
      b;

      c;
      // comment
      d;`,
          options: [{ maximum: 3 }],
          errors: [
            {
              message: `This file has 4 lines, which is greater than 3 authorized. Split it into smaller files.`,
              line: 0,
              column: 1,
            },
          ],
        },
      ],
    });
  });
});
