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

const ruleTester = new StylelintRuleTester('keyframe-block-no-duplicate-selectors');

describe('keyframe-block-no-duplicate-selectors', () => {
  it('accepts unique selectors inside a keyframes block', () =>
    ruleTester.valid({
      code: `
@keyframes fade {
  from {}
  50% {}
  to {}
}`,
    }));

  it('accepts the same selector in different keyframes blocks', () =>
    ruleTester.valid({
      code: `
@keyframes fade-in {
  from {}
}

@keyframes fade-out {
  from {}
}`,
    }));

  it('detects duplicate percentage selectors in the same keyframes block', () =>
    ruleTester.invalid({
      code: `
@keyframes fade {
  0% {}
  50% {}
  0% {}
}`,
      errors: [
        {
          line: 5,
          column: 3,
          text: 'Duplicate keyframe selector "0%" (keyframe-block-no-duplicate-selectors)',
        },
      ],
    }));

  it('detects duplicate from selectors case-insensitively', () =>
    ruleTester.invalid({
      code: `
@keyframes fade {
  from {}
  FROM {}
}`,
      errors: [
        {
          line: 4,
          column: 3,
          text: 'Duplicate keyframe selector "FROM" (keyframe-block-no-duplicate-selectors)',
        },
      ],
    }));
});
