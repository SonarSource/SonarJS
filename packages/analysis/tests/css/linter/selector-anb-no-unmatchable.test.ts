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
import { describe, it } from 'node:test';
import { StylelintRuleTester } from '../tools/tester/tester.js';

const ruleTester = new StylelintRuleTester('selector-anb-no-unmatchable');

describe('selector-anb-no-unmatchable', () => {
  it('accepts nth-child selectors that can match an element', () =>
    ruleTester.valid({
      code: 'a:nth-child(1) {}',
    }));

  it('accepts repeating formulas that can reach a positive index', () =>
    ruleTester.valid({
      code: 'a:nth-of-type(2n+1) {}',
    }));

  it('accepts of-syntax selectors when the formula can match an element', () =>
    ruleTester.valid({
      code: 'a:nth-last-of-type(0n+1 of .item) {}',
    }));

  it('rejects zero-only nth-child selectors', () =>
    ruleTester.invalid({
      code: 'a:nth-child(0) {}',
      errors: [
        {
          text: 'Unmatchable An+B selector ":nth-child(0)" (selector-anb-no-unmatchable)',
          line: 1,
          column: 2,
        },
      ],
    }));

  it('rejects zero-only nth-last-child selectors', () =>
    ruleTester.invalid({
      code: 'a:nth-last-child(0n) {}',
      errors: [
        {
          text: 'Unmatchable An+B selector ":nth-last-child(0n)" (selector-anb-no-unmatchable)',
          line: 1,
          column: 2,
        },
      ],
    }));

  it('rejects zero-only nth-of-type selectors', () =>
    ruleTester.invalid({
      code: 'a:nth-of-type(0n+0) {}',
      errors: [
        {
          text: 'Unmatchable An+B selector ":nth-of-type(0n+0)" (selector-anb-no-unmatchable)',
          line: 1,
          column: 2,
        },
      ],
    }));

  it('rejects zero-only of-syntax selectors', () =>
    ruleTester.invalid({
      code: 'a:nth-last-of-type(0 of .item) {}',
      errors: [
        {
          text: 'Unmatchable An+B selector ":nth-last-of-type(0 of .item)" (selector-anb-no-unmatchable)',
          line: 1,
          column: 2,
        },
      ],
    }));
});
