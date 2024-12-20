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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S5842', () => {
  it('S5842', () => {
    const ruleTester = new RuleTester();
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
