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
import { StylelintRuleTester } from '../../../tools';
import { messages, rule } from 'linting/stylelint/rules/function-calc-no-invalid';

const ruleTester = new StylelintRuleTester(rule);
ruleTester.run('function-calc-no-invalid', {
  valid: [
    {
      description: 'single expression',
      code: '.foo {width: calc(100%);}',
    },
    {
      description: 'compound expression',
      code: '.foo {width: calc(100% - 80px + 60pt);}',
    },
    {
      description: 'division by 1',
      code: '.foo {width: calc(100% / 1);}',
    },
    {
      description: 'division by 0.1',
      code: '.foo {width: calc(100% / 0.1);}',
    },
    {
      description: 'division by 1px',
      code: '.foo {width: calc(100% / 1px);}',
    },
    {
      description: 'comma divider',
      code: '.foo {width: calc(100% + var(--text-color, 0px));}',
    },
  ],
  invalid: [
    {
      description: 'empty expression',
      code: '.foo {width: calc();}',
      errors: [{ text: messages.empty, line: 1, column: 7 }],
    },
    {
      description: 'space-only expression',
      code: '.foo {width: calc(   );}',
      errors: [{ text: messages.empty }],
    },
    {
      description: 'comment-only expression',
      code: '.foo {width: calc(/* this a comment */);}',
      errors: [{ text: messages.empty }],
    },
    {
      description: 'missing operator',
      code: '.foo {width: calc(100% 80px);}',
      errors: [{ text: messages.malformed }],
    },
    {
      description: 'division by 0',
      code: '.foo {width: calc(100% / 0);}',
      errors: [{ text: messages.divByZero }],
    },
    {
      description: 'division by 0.0',
      code: '.foo {width: calc(100% / 0.0);}',
      errors: [{ text: messages.divByZero }],
    },
    {
      description: 'division by 0px',
      code: '.foo {width: calc(100% / 0px);}',
      errors: [{ text: messages.divByZero }],
    },
    {
      description: 'sibling calc-s',
      code: '.foo {width: calc() + calc(100% / 0px);}',
      errors: [
        { text: messages.empty, line: 1, column: 7 },
        { text: messages.divByZero, line: 1, column: 7 },
      ],
    },
    {
      description: 'nested calc-s',
      code: '.foo {width: calc(100% / 0px + calc());}',
      errors: [{ text: messages.divByZero }, { text: messages.empty }],
    },
    {
      description: 'nested expressions',
      code: '.foo {width: calc(100 + ("foo" / (-0.9) * abs(80%) (70px+"bar")));}',
      errors: [{ text: messages.malformed }, { text: messages.malformed }],
    },
  ],
});
