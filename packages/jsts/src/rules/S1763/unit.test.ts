/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

describe('S1763', () => {
  it('S1763', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(`Decorated rule should provide suggestion`, rule, {
      valid: [
        {
          code: `
while (a()) {
  b();
  break;
}
`,
        },
      ],
      invalid: [
        {
          code: `
while (a()) {
  break;
  b();
}
`,
          errors: [
            {
              messageId: 'unreachableCode',
              suggestions: [
                {
                  output: `
while (a()) {
  break;
}
`,
                  desc: 'Remove unreachable code',
                },
              ],
            },
          ],
        },
        {
          code: `
while (a()) {
  b();
  break;
  c();
  d();
}
`,
          errors: [
            {
              messageId: 'unreachableCode',
              suggestions: [
                {
                  output: `
while (a()) {
  b();
  break;
}
`,
                  desc: 'Remove unreachable code',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
