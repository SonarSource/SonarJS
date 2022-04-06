/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { StylelintRuleTester } from '../../StylelintRuleTester';
import { rule } from 'rules/stylelint/function-calc-no-invalid';

const tester = new StylelintRuleTester(rule);
tester.run('function-calc-no-invalid', {
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
      description: 'missing space before non-sign operator',
      code: '.foo {width: calc(100%* 80px);}',
    },
    {
      description: 'missing space after non-sign operator',
      code: '.foo {width: calc(100% /1);}',
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
  ],
  invalid: [
    {
      description: 'empty expression',
      code: '.foo {width: calc();}',
      errors: [{ message: 'Expected a valid expression' }],
    },
    {
      description: 'space-only expression',
      code: '.foo {width: calc(   );}',
      errors: [{ message: 'Expected a valid expression' }],
    },
    {
      description: 'comment-only expression',
      code: '.foo {width: calc(/* this a comment */);}',
      errors: [{ message: 'Expected a valid expression' }],
    },
    {
      description: 'missing operator',
      code: '.foo {width: calc(100% 80px);}',
      errors: [{ message: 'Expected a valid expression' }],
    },
    {
      description: 'missing space before operator',
      code: '.foo {width: calc(100%- 80px);}',
      errors: [{ message: 'Expected space before "-" operator' }],
    },
    {
      description: 'missing space after operator',
      code: '.foo {width: calc(100% -80px);}',
      errors: [{ message: 'Expected space after "-" operator' }],
    },
    {
      description: 'missing spaces surrounding operator',
      code: '.foo {width: calc(100%-80px);}',
      errors: [
        { message: 'Expected space before "-" operator' },
        { message: 'Expected space after "-" operator' },
      ],
    },
    {
      description: 'division by 0',
      code: '.foo {width: calc(100% / 0);}',
      errors: [{ message: 'Unexpected division by zero' }],
    },
    {
      description: 'division by 0.0',
      code: '.foo {width: calc(100% / 0.0);}',
      errors: [{ message: 'Unexpected division by zero' }],
    },
    {
      description: 'division by 0px',
      code: '.foo {width: calc(100% / 0px);}',
      errors: [{ message: 'Unexpected division by zero' }],
    },
  ],
});
