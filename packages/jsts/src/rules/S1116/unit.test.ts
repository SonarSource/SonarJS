/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Rule, RuleTester } from 'eslint';
import { rule } from './';
import { isProtectionSemicolon } from './decorator';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run('Extra semicolons should be removed', rule, {
  valid: [
    {
      code: `
        if (this.startDateTime > this.endDateTime) {
          ;[this.startDateTime, this.endDateTime] = [this.endDateTime, this.startDateTime]
        }
      `,
    },
    {
      code: `
        ;(function() {
        })();
      `,
    },
  ],
  invalid: [
    {
      code: `
        function foo() {
        };
      `,
      output: `
        function foo() {
        }
      `,
      errors: [
        {
          message: 'Unnecessary semicolon.',
        },
      ],
    },
    {
      code: `
        function foo() {
          const b = 0;
          ;foo()
        }
      `,
      output: `
        function foo() {
          const b = 0;
          foo()
        }
      `,
      errors: [
        {
          message: 'Unnecessary semicolon.',
        },
      ],
    },
  ],
});

it('no-extra-semi handles null nodes', () => {
  const context = {
    sourceCode: {
      getTokenBefore: jest.fn().mockReturnValue(null),
      getTokenAfter: jest.fn().mockReturnValue({ type: 'Punctuator', value: '[' }),
    },
  } as unknown as Rule.RuleContext;

  expect(isProtectionSemicolon(context, { type: 'BreakStatement' })).toBe(false);
  expect(isProtectionSemicolon(context, { type: 'EmptyStatement' })).toBe(false);
});
