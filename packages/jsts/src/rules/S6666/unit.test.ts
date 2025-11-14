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

describe('S6666', () => {
  it('S6666', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(`Spread syntax should be used instead of apply()`, rule, {
      valid: [
        {
          code: `foo.apply(obj, args);`,
        },
      ],
      invalid: [
        {
          code: `foo.apply(null, args);`,
          errors: [
            {
              messageId: 'preferSpread',
              suggestions: [
                {
                  desc: 'Replace apply() with spread syntax',
                  output: `foo(...args);`,
                },
              ],
            },
          ],
        },
        {
          code: `obj.foo.apply(obj, args);`,
          errors: [
            {
              messageId: 'preferSpread',
              suggestions: [
                {
                  desc: 'Replace apply() with spread syntax',
                  output: `obj.foo(...args);`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
