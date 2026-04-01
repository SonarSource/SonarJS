/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S5842', () => {
  it('S5842', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Regular expression repetitions matching the empty string', rule, {
      valid: [
        {
          code: `/x*|/`,
        },
        {
          code: `/x*/`,
        },
        {
          code: `/x?/`,
        },
        {
          code: `/(?:x|y)*/`,
        },
        {
          code: `/(?:x+)+/`,
        },
        {
          code: `/(?:x+)*/`,
        },
        {
          code: `/(?:x+)?/`,
        },
        {
          code: `/((x+))*/`,
        },
      ],
      invalid: [
        {
          code: `/(?:)*/`,
          errors: 1,
        },
        {
          code: `/(?:)?/`,
          errors: 1,
        },
        {
          code: `/(?:)+/`,
          errors: 1,
        },
        {
          code: `/()*/`,
          errors: 1,
        },
        {
          code: `/()?/`,
          errors: 1,
        },
        {
          code: `/()+/`,
          errors: 1,
        },
        {
          code: `/xyz|(?:)*/`,
          errors: 1,
        },
        {
          code: `/(?:|x)*/`,
          errors: 1,
        },
        {
          code: `/(?:x|)*/`,
          errors: 1,
        },
        {
          code: `/(?:x|y*)*"/`,
          errors: 1,
        },
        {
          code: `/(?:x*|y*)*/`,
          errors: 1,
        },
        {
          code: `/(?:x?|y*)*/`,
          errors: 1,
        },
        {
          code: `/(?:x*)*/`,
          errors: 1,
        },
        {
          code: `/(?:x?)*/`,
          errors: 1,
        },
        {
          code: `/(?:x*)?/`,
          errors: 1,
        },
        {
          code: `/(?:x?)?/`,
          errors: 1,
        },
        {
          code: `/(?:x*)+/`,
          errors: 1,
        },
        {
          code: `/(?:x?)+/`,
          errors: 1,
        },
        {
          code: `/(x*)*/`,
          errors: 1,
        },
        {
          code: `/((x*))*/`,
          errors: 1,
        },
        {
          code: `/(?:x*y*)*/`,
          errors: 1,
        },
        {
          code: `/(?:())*"/`,
          errors: 1,
        },
        {
          code: `/(?:(?:))*/`,
          errors: 1,
        },
        {
          code: `/(())*/`,
          errors: 1,
        },
        {
          code: `/(()x*)*/`,
          errors: 1,
        },
        {
          code: `/(()|x)*/`,
          errors: 1,
        },
        {
          code: `/($)*/`,
          errors: 1,
        },
        {
          code: `/(\\b)*/`,
          errors: 1,
        },
        {
          code: `/((?!x))*/`,
          errors: 1,
        },
      ],
    });
  });
});
